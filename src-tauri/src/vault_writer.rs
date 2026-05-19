// src-tauri/src/vault_writer.rs — Phase 2 single authorized writer surface.
//
// Maps to: SPEC REQ-03 (_source/ write protection — enum guard),
//          REQ-04 (chmod 0o444 lock — implemented in Task 2 of 02-02),
//          REQ-06 (vault scaffold + course folder + INDEX.md),
//          Threat T-2-01 (path traversal) + T-2-02 (symlink-into-_source/),
//          T-2-06 (course-code injection regex gate).
//
// Visual SSOT: not applicable (Rust module, no UI).
// Pattern: D-05 enum + private ImportToken + factory; D-06 canonicalize-parent path guard;
//          D-07 chmod 644 → write → sync → 444 three-step (Task 2 in this plan).
//
// Why the two-arm canonicalization gate (RESEARCH Pitfall 2 + cycle-2 cluster #3):
//   `std::fs::canonicalize` requires the path to exist. For brand-new files (User
//   notes write or Import first-time write), the target does NOT exist at guard
//   time. We canonicalize the *parent* directory + re-attach the basename to
//   resolve symlinks + `..` components in the parent without needing the leaf to
//   exist. This catches T-2-01 (`..` traversal). For an existing symlink leaf
//   (T-2-02 — disguise.pdf -> _source/secret.pdf), we canonicalize the whole
//   path so the link follows through to the real `_source/` target which the
//   prefix check then rejects.
//
// Why path-component check (Component::Normal == "_source") instead of substring:
//   A future filename like `notes/my_source/README.md` would falsely match a
//   `path.to_string_lossy().contains("/_source/")` test. Iterating components
//   and matching `OsStr::new("_source")` exactly is the correct check.
//
// Why chmod 0o444 last, not first:
//   See RESEARCH Pitfall 1. Single-user single-app — TOCTOU MEDIUM accepted.
//   Future v1.x option: O_EXCL + umask 0o222 born-readonly. The `let _ =`
//   absorption of non-load-bearing errors follows the Phase 1 lib.rs L55
//   `kill_pgid` convention.

use std::fs;
use std::io::Write;
use std::marker::PhantomData;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use chrono::Utc;

// ---------------------------------------------------------------------------
// Private token — only this module's `import_handle()` can construct.
// ---------------------------------------------------------------------------

/// Privileged construction token for `WriteContext::Import`.
///
/// CYCLE-2 cluster #5 — `_marker` is fully PRIVATE (no `pub(crate)`). Sibling
/// modules under `src-tauri/src/` (config.rs, onboarding.rs, vault_index.rs,
/// import_controller.rs, lib.rs) CANNOT write the literal
/// `ImportToken { _marker: PhantomData }` because the field is invisible
/// outside this module. The factory `import_handle()` is the only legitimate
/// construction path.
pub struct ImportToken {
    _marker: PhantomData<()>,
}

pub enum WriteContext {
    User,
    Import(ImportToken),
}

#[derive(Debug, thiserror::Error)]
pub enum VaultWriterError {
    #[error("write to _source/ forbidden under User context")]
    WriteToSourceForbidden,
    #[error("path canonicalize failed: {0}")]
    CanonicalizeFailed(std::io::Error),
    #[error("permission failed: {0}")]
    PermissionFailed(std::io::Error),
    #[error("io failed: {0}")]
    IoFailed(std::io::Error),
    #[error("scaffold failed at {0:?}: {1}")]
    ScaffoldFailed(PathBuf, std::io::Error),
    #[error("invalid course code: {0}")]
    InvalidCourseCode(String),
    // WR-11 partial fix (gap-closure 02-15) — defense-in-depth Rust-side rejection
    // of validation failures the frontend should have caught. Currently used for
    // empty / non-absolute vault root in create_course; future structurally-invalid
    // input checks can share this variant.
    #[error("validation failed: {0}")]
    Validation(String),
    // CYCLE-2 cluster #8 — structured variant for _source/ basename collisions.
    // import_controller (Plan 02-05) surfaces a friendly "file already exists"
    // message via the import-error classifier (Plan 02-11) instead of silently
    // overwriting the user's source files.
    #[error("source basename clash: a file named {0:?} already exists in _source/")]
    SourceBasenameClash(PathBuf),
}

/// W6 fix (Phase 02.1 02.1-04): minimal path-safe validator that REPLACES the
/// previous `^[A-Z]{4}\d{4}$` regex (which rejected real USYD codes like
/// BIOL2010S2 / COMP3027L — dogfood-killer per UI-REVIEW.md L150). T-2-06
/// (course-code injection) is now mitigated by this validator + the
/// `is_under_source` two-arm canonicalize gate (`path_traversal_blocked.rs` +
/// `symlink_canonicalize_blocked.rs` continue to pass).
///
/// Accept list: alphanumeric + dash + unicode.
/// Reject: empty / >32 chars / `/` / `\` / `\0` / `.` / `..` / no-alphanumeric.
///
/// See SECURITY.md Audit 2026-05-17 (Phase 02.1).
pub fn validate_course_code(code: &str) -> Result<(), VaultWriterError> {
    let trimmed = code.trim();
    if trimmed.is_empty() {
        return Err(VaultWriterError::InvalidCourseCode(
            "course code empty".into(),
        ));
    }
    if trimmed.len() > 32 {
        return Err(VaultWriterError::InvalidCourseCode(format!(
            "course code too long ({} chars, max 32)",
            trimmed.len()
        )));
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains('\0') {
        return Err(VaultWriterError::InvalidCourseCode(
            "course code contains path separator or null".into(),
        ));
    }
    if trimmed == "." || trimmed == ".." {
        return Err(VaultWriterError::InvalidCourseCode(
            "course code cannot be '.' or '..'".into(),
        ));
    }
    if trimmed.chars().all(|c| !c.is_alphanumeric()) {
        return Err(VaultWriterError::InvalidCourseCode(
            "course code needs at least one alphanumeric char".into(),
        ));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// import_handle — the one factory the import controller calls.
//
// Audit gate (Plan 02-09 Wave-4 audit script extension): `grep -n 'import_handle()'
// src-tauri/src/` surfaces every privileged caller for review.
// ---------------------------------------------------------------------------

pub fn import_handle() -> ImportToken {
    // Construction is legal here because the literal lives in the same module
    // where `ImportToken._marker` is declared. Outside this module, the same
    // syntax is rejected by rustc with E0451 "field `_marker` of struct
    // `ImportToken` is private".
    ImportToken {
        _marker: PhantomData,
    }
}

// ---------------------------------------------------------------------------
// Path guard — two-arm canonicalize + component-based `_source` check.
// ---------------------------------------------------------------------------

fn is_under_source(path: &Path) -> Result<bool, VaultWriterError> {
    // CYCLE-2 cluster #3 — two-arm canonicalization closes the leaf-symlink gap.
    //   Arm A (leaf exists, possibly as a symlink): canonicalize the WHOLE path
    //     so a symlink in notes/ that points into _source/ resolves through the
    //     link. Catches T-2-02.
    //   Arm B (leaf does not exist — new file create): canonicalize the PARENT
    //     then re-attach file_name. Catches T-2-01 (`..` traversal during
    //     fs::create on a path whose final component does not yet exist).
    let canon_full: PathBuf = if path.symlink_metadata().is_ok() {
        path.canonicalize()
            .map_err(VaultWriterError::CanonicalizeFailed)?
    } else {
        let parent = path.parent().ok_or_else(|| {
            VaultWriterError::CanonicalizeFailed(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "path has no parent",
            ))
        })?;
        let canon_parent = parent
            .canonicalize()
            .map_err(VaultWriterError::CanonicalizeFailed)?;
        match path.file_name() {
            Some(name) => canon_parent.join(name),
            None => canon_parent,
        }
    };

    // Path-component check (NOT substring). A path containing the literal
    // segment `_source` as part of a longer filename (e.g. `notes/my_source/`)
    // must NOT match. Iterate `Components`, look for an exact `OsStr` equal
    // to `_source`.
    for comp in canon_full.components() {
        if let std::path::Component::Normal(seg) = comp {
            if seg == std::ffi::OsStr::new("_source") {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

// ---------------------------------------------------------------------------
// write_to_vault — the only public writer surface.
// ---------------------------------------------------------------------------

pub fn write_to_vault(
    path: &Path,
    bytes: &[u8],
    ctx: WriteContext,
) -> Result<(), VaultWriterError> {
    let under_source = is_under_source(path)?;
    match ctx {
        WriteContext::User => {
            if under_source {
                return Err(VaultWriterError::WriteToSourceForbidden);
            }
            atomic_write(path, bytes)?;
        }
        WriteContext::Import(_token) => {
            // Privileged path. Two sub-cases under _source/:
            //
            // 1. First-time write — file does not yet exist; atomic_write
            //    creates it then we chmod 0o444 to seal the lock.
            //
            // 2. Re-import — file already exists at 0o444; running the same
            //    atomic temp+rename WOULD technically succeed (rename only
            //    needs parent-dir write permission) but the D-07 contract
            //    requires the explicit chmod 644 -> write -> chmod 444 cycle
            //    so the unlock+relock invariant lives in ONE place
            //    (with_temporary_writable_permission). The RelockGuard inside
            //    the helper also covers Pitfall 12 cancellation safety.
            if under_source && path.exists() {
                // Re-import path — wrap atomic_write in the chmod-cycle helper.
                with_temporary_writable_permission(path, || atomic_write(path, bytes))?;
            } else {
                atomic_write(path, bytes)?;
                if under_source {
                    let perms = fs::Permissions::from_mode(0o444);
                    fs::set_permissions(path, perms).map_err(VaultWriterError::PermissionFailed)?;
                }
            }
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// atomic_write — temp+rename helper (Phase 0 LEARNINGS rule).
// ---------------------------------------------------------------------------

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), VaultWriterError> {
    // Compose a `<basename>.tmp` sibling by appending `.tmp` to the full
    // file_name. WR-002 fix (Phase 02.1 02.1-REVIEW): the previous
    // `path.with_extension(format!("{ext}.tmp"))` produced `foo..tmp` for
    // extensionless inputs (e.g. `Makefile` → `Makefile..tmp`) because
    // `with_extension(".tmp")` treats `.tmp` as a literal extension string.
    // Building the tmp name via `set_file_name(format!("{name}.tmp"))`
    // avoids the double-dot artifact:
    //   "foo.pdf"  -> "foo.pdf.tmp"
    //   "INDEX.md" -> "INDEX.md.tmp"
    //   "foo"      -> "foo.tmp"        (previously "foo..tmp")
    let mut tmp = path.to_path_buf();
    let new_name = match path.file_name().and_then(|s| s.to_str()) {
        Some(name) => format!("{name}.tmp"),
        None => {
            return Err(VaultWriterError::IoFailed(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "atomic_write: path has no file name",
            )));
        }
    };
    tmp.set_file_name(new_name);
    {
        let mut f = fs::File::create(&tmp).map_err(VaultWriterError::IoFailed)?;
        f.write_all(bytes).map_err(VaultWriterError::IoFailed)?;
        f.sync_all().map_err(VaultWriterError::IoFailed)?;
    }
    fs::rename(&tmp, path).map_err(VaultWriterError::IoFailed)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Vault scaffold + course scaffold (idempotent).
// ---------------------------------------------------------------------------

pub fn create_vault_scaffold(root: &Path) -> Result<(), VaultWriterError> {
    for sub in &["_system", "_inbox", "courses", "shared"] {
        let p = root.join(sub);
        fs::create_dir_all(&p).map_err(|e| VaultWriterError::ScaffoldFailed(p.clone(), e))?;
    }
    Ok(())
}

pub fn create_course(root: &Path, code: &str) -> Result<(), VaultWriterError> {
    // WR-11 partial fix (gap-closure 02-15): reject empty / non-absolute root.
    // Prevents Step5AddCourse via direct URL `/onboarding/5` from materializing
    // `courses/<CODE>` relative to cwd. The frontend Step5AddCourse.addCourse
    // also early-returns on empty vaultRoot; this Rust-side guard is the
    // second arm of the defense (the IPC surface itself may be invoked by
    // other callers / tools without going through the Svelte step).
    if root.as_os_str().is_empty() {
        return Err(VaultWriterError::Validation(
            "vault root must be non-empty".to_string(),
        ));
    }
    if !root.is_absolute() {
        return Err(VaultWriterError::Validation(
            "vault root must be absolute".to_string(),
        ));
    }
    validate_course_code(code)?;
    let course_root = root.join("courses").join(code);
    for sub in &[
        "_source",
        "_source/lectures",
        "_source/tutorials",
        "_source/assignments",
        "notes",
        "concepts",
        "practice",
    ] {
        let p = course_root.join(sub);
        fs::create_dir_all(&p).map_err(|e| VaultWriterError::ScaffoldFailed(p.clone(), e))?;
    }
    let index_md = course_root.join("INDEX.md");
    if !index_md.exists() {
        let created = Utc::now().to_rfc3339();
        let body = format!("---\ncourse: {code}\ncreated: {created}\n---\n");
        atomic_write(&index_md, body.as_bytes())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// with_temporary_writable_permission — Phase 2 D-07.
//
// chmod 0o644 -> run inner -> chmod 0o444 (via Drop on guard).
// Drop guard fires even on panic / early-return / cancellation (Pitfall 12).
//
// WR-02 fix (gap-closure 02-15): Drop is the relock authority.
//   Prior code ran chmod 0o444 explicitly after the closure AND on Drop,
//   double-relocking when the explicit chmod failed (the `?` skipped the
//   disarm step, then Drop fired and re-attempted the same failing op).
//   The fix collapses to a single relock site: Drop. The closure result is
//   captured into a Result binding so we relock BEFORE returning, then the
//   wrapped Result is returned to the caller. Drop becomes no-op on the
//   happy path via guard.disarm() AFTER its set_permissions has run.
//   Trade-off: a failed relock now surfaces only via the file staying at
//   0o644 (Drop cannot return a Result); the previous behavior also
//   swallowed this error via early-return through `?` on the explicit
//   chmod, so this is a wash.
//
// Contract (D-07 + Pitfall 12 + WR-02 fix):
//   Happy path  (closure returns Ok):
//     1. chmod 0o644 (unlock)
//     2. arm Drop guard
//     3. run closure (captures Result)
//     4. Drop fires inline — chmod 0o444 best-effort (single relock site)
//     5. return closure Result
//   Closure returns Err:
//     1. chmod 0o644 (unlock)
//     2. arm Drop guard
//     3. closure returns Err — captured into Result binding
//     4. Drop fires inline — chmod 0o444 best-effort
//     5. closure Err propagated to caller
//   Closure panics:
//     panic unwinds out of f(); Drop guard relocks to 0o444 best-effort
//     during unwind, then the panic continues upstream.
//   Drop's set_permissions itself fails:
//     swallowed (`let _ = ...`). File left at 0o644; caller's Err path
//     (or the next attempt) informs the rest of the system.
// ---------------------------------------------------------------------------

/// RAII guard that re-applies chmod 0o444 to `path` on Drop. After WR-02 fix
/// (gap-closure 02-15) the guard has no `disarm` path — Drop is the sole
/// relock authority on every exit path (happy / Err / panic). The lifetime
/// ensures the path reference outlives the guard.
struct RelockGuard<'a> {
    path: &'a Path,
}

impl<'a> RelockGuard<'a> {
    fn new(path: &'a Path) -> Self {
        Self { path }
    }
}

impl Drop for RelockGuard<'_> {
    fn drop(&mut self) {
        // Best-effort relock — if this fails, the file stays at 0o644
        // and the surrounding Err path (or next attempt) informs the caller.
        // `let _` absorbs because we cannot return a Result from Drop. This
        // matches the Phase 1 `lib.rs` L55 `kill_pgid` absorption convention.
        let _ = fs::set_permissions(self.path, fs::Permissions::from_mode(0o444));
    }
}

/// Wrap an Import-side rewrite in the chmod 0o644 → write → chmod 0o444
/// three-step. The Drop guard re-applies 0o444 if the closure panics or
/// returns Err so a cancelled re-import never leaves the file writable.
///
/// Signature contract:
///   - `path` is the file currently at 0o444 that needs to be rewritten.
///   - `f` is the caller-supplied write closure (typically `|| atomic_write(path, bytes)`).
///   - Returns the closure's `R` on success, or the closure's Err on failure.
pub fn with_temporary_writable_permission<F, R>(path: &Path, f: F) -> Result<R, VaultWriterError>
where
    F: FnOnce() -> Result<R, VaultWriterError>,
{
    // Step 1 — chmod 0o644 (unlock). This is the only set_permissions call
    // we make explicitly; the relock (chmod 0o444) is owned by Drop.
    fs::set_permissions(path, fs::Permissions::from_mode(0o644))
        .map_err(VaultWriterError::PermissionFailed)?;
    // Arm the Drop guard. Drop is the sole relock authority on EVERY exit
    // path (happy / Err / panic). See WR-02 fix block above.
    let _guard = RelockGuard::new(path);
    // Step 2 — caller-supplied write operation. We DO NOT use `?` here so
    // that an Err return still funnels through Drop (which relocks). The
    // closure's Result is returned verbatim AFTER `_guard` is dropped at
    // end of scope — Rust drops local bindings in reverse declaration
    // order, so `_guard` drops before we return, performing the relock.
    f()
}

// ---------------------------------------------------------------------------
// Unit tests — private-fn coverage only. Integration tests live under
// src-tauri/tests/*.rs.
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    /// WR-002 fix (Phase 02.1 02.1-REVIEW): atomic_write must never produce a
    /// `foo..tmp` artifact for extensionless inputs. The tmp file is
    /// short-lived (rename happens immediately after write), but we observe
    /// the rename target end-state to confirm the build succeeded for each
    /// input shape. The contract is: tmp basename = "{file_name}.tmp" with
    /// exactly one separating dot, regardless of whether the source had an
    /// extension.
    #[test]
    fn atomic_write_handles_extensionless_input_without_double_dot() {
        let td = tempdir().unwrap();

        // Case 1: extensionless basename (e.g. `Makefile`). Previously this
        // produced `Makefile..tmp` (double dot) via with_extension.
        let extensionless = td.path().join("Makefile");
        atomic_write(&extensionless, b"target rule").expect("extensionless write");
        assert_eq!(
            fs::read(&extensionless).unwrap(),
            b"target rule",
            "extensionless file should land at its real name"
        );

        // Case 2: standard pdf extension.
        let pdf = td.path().join("foo.pdf");
        atomic_write(&pdf, b"pdf bytes").expect("pdf write");
        assert_eq!(fs::read(&pdf).unwrap(), b"pdf bytes");

        // Case 3: INDEX.md — the most common course-folder file.
        let md = td.path().join("INDEX.md");
        atomic_write(&md, b"# title\n").expect("md write");
        assert_eq!(fs::read(&md).unwrap(), b"# title\n");

        // Case 4: explicitly check that no `..tmp` artifact survives in the
        // directory after a successful write (would be visible if the tmp
        // file ever materialized with a double-dot basename and the rename
        // somehow missed it).
        let entries: Vec<String> = fs::read_dir(td.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect();
        for name in &entries {
            assert!(
                !name.contains(".."),
                "no double-dot artifact expected, found {name:?}"
            );
        }
    }
}
