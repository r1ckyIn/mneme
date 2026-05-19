// src-tauri/src/vault_index.rs — Phase 2 Plan 02-04 (Wave 2): rusqlite-backed
// vault file index. Maps to SPEC REQ-13 (~/.mneme/vault-index.db; filesystem is
// SSOT, index is an optimization; reconciliation on startup rebuilds from disk
// reality per D-14).
//
// Public surface (locked by 02-04-PLAN.md <interfaces>):
//   - VaultIndex { conn: Mutex<Connection> }
//   - VaultFileRow { path, course, kind, size_bytes, mtime_iso, indexed_at_iso }
//   - ReconcileSummary { inserted, deleted, scanned }
//   - VaultIndexError (thiserror enum wrapping sqlite + io + walkdir)
//   - VaultIndex::init / insert / get / delete / count_all / list_courses /
//     list_all_paths / reconcile
//   - classify_kind / extract_course / now_iso / enumerate_folder_one_level
//
// Design invariants:
//   1. EVERY query uses `params![]` macro — T-2-07 SQL injection mitigation.
//      Audit gate (PLAN.md): `! grep -nE 'format!\([^)]*\b(SELECT|INSERT|...)\b'`.
//   2. Threading: `std::sync::Mutex<Connection>` (NOT tokio::sync::Mutex).
//      RESEARCH Pitfall 11 — rusqlite is sync-only; the `Connection` itself is
//      `!Send` on some configs. We wrap in `std::sync::Mutex` because no `.await`
//      EVER crosses the lock (all callers run synchronous CRUD). Phase 1 WR-01
//      poisoned-mutex tolerance: `unwrap_or_else(|p| p.into_inner())` recovers
//      a poisoned lock so a panic during one operation does not brick the index.
//   3. WAL pragma ORDER (RESEARCH L583-587 + Pitfall 4): journal_mode=WAL →
//      synchronous=NORMAL → busy_timeout=5000ms → wal_autocheckpoint=1000.
//      WAL torn-page recovery is intentionally handled by D-14 reconcile() on
//      startup rather than rusqlite's recovery machinery.
//   4. `locked_conn` helper is NOT exposed (cycle-3 priority #9). Integration
//      tests under `src-tauri/tests/` cannot reach `pub(crate)`; they open a
//      SECOND `rusqlite::Connection::open(&db_path)` for read-only introspection.
//      SQLite WAL mode permits multi-connection reads on the same DB file.
//   5. Hidden directories (`.mneme/`, `.git/`, `.DS_Store`) MUST be pruned
//      BEFORE descent via `walkdir::WalkDir::filter_entry`. Otherwise reconcile
//      would self-index `vault-index.db-wal` etc. (cycle-3 priority #9).
//   6. `enumerate_folder_one_level` uses `fs::read_dir` (max depth 1) so REQ-06
//      single-level folder import never recurses into nested sub-dirs.

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use chrono::Utc;
use rusqlite::{params, Connection};

/// rusqlite-backed file index. One DB per vault; opened at startup, reused for
/// the app lifetime. CRUD is synchronous; the `Mutex<Connection>` serialises
/// concurrent callers (Phase 2 single-user means contention is effectively zero,
/// but the Mutex is required so the struct is `Sync` for Tauri State<T>).
pub struct VaultIndex {
    conn: Mutex<Connection>,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultIndexError {
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("walkdir: {0}")]
    Walk(#[from] walkdir::Error),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultFileRow {
    pub path: String,
    pub course: Option<String>,
    pub kind: String,
    pub size_bytes: i64,
    pub mtime_iso: String,
    pub indexed_at_iso: String,
}

// Phase 2 Plan 02-07 — Serialize is required because `reconcile_vault_index`
// returns this struct across the Tauri IPC boundary. The shape is stable
// snake_case JSON consumed by the frontend ReconciliationOverlay (Plan 02-08).
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Serialize)]
pub struct ReconcileSummary {
    pub inserted: usize,
    pub deleted: usize,
    pub scanned: usize,
}

impl VaultIndex {
    /// Open (or create) the SQLite DB at `db_path`. Idempotent — re-init on an
    /// existing DB preserves rows (CREATE TABLE IF NOT EXISTS). Applies the
    /// WAL-mode pragma stack in the canonical order documented in RESEARCH.
    pub fn init(db_path: &Path) -> Result<Self, VaultIndexError> {
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(db_path)?;
        // Pragma order matters (RESEARCH L583-587 + Pitfall 4):
        //   1. journal_mode=WAL enables WAL files (.db-wal + .db-shm).
        //   2. synchronous=NORMAL is safe under WAL (full sync only on
        //      checkpoint; per-write fsync skipped).
        //   3. busy_timeout=5000ms covers transient contention.
        //   4. wal_autocheckpoint=1000 prevents .db-wal growing unbounded.
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "busy_timeout", 5000_i32)?;
        conn.pragma_update(None, "wal_autocheckpoint", 1000_i32)?;
        // Schema is idempotent — CREATE IF NOT EXISTS preserves data across
        // re-init. Future schema migrations would add a schema_version column +
        // ALTER TABLE; Phase 2 v1 is single-version.
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS vault_files (
                path TEXT PRIMARY KEY,
                course TEXT,
                kind TEXT,
                size_bytes INTEGER,
                mtime_iso TEXT,
                indexed_at_iso TEXT
            );
            CREATE INDEX IF NOT EXISTS vault_files_course_idx ON vault_files(course);
            "#,
        )?;
        Ok(VaultIndex {
            conn: Mutex::new(conn),
        })
    }

    /// Run a closure against the locked Connection. Phase 1 WR-01 poisoned-mutex
    /// tolerance: if a prior call panicked while holding the lock, we recover
    /// the inner Connection rather than propagating the poison upward (the DB
    /// state is consistent even when caller-state is not — SQLite transactions
    /// either commit or roll back).
    fn with_conn<F, R>(&self, f: F) -> Result<R, VaultIndexError>
    where
        F: FnOnce(&Connection) -> Result<R, VaultIndexError>,
    {
        let guard = self.conn.lock().unwrap_or_else(|p| {
            eprintln!("[vault_index] mutex poisoned — recovering inner state");
            p.into_inner()
        });
        f(&guard)
    }

    /// Insert or replace a row. `INSERT OR REPLACE` makes re-indexing a known
    /// path idempotent (reconcile() relies on this when mtime / size change).
    pub fn insert(&self, row: &VaultFileRow) -> Result<(), VaultIndexError> {
        self.with_conn(|c| {
            c.execute(
                r#"INSERT OR REPLACE INTO vault_files
                   (path, course, kind, size_bytes, mtime_iso, indexed_at_iso)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6)"#,
                params![
                    row.path,
                    row.course,
                    row.kind,
                    row.size_bytes,
                    row.mtime_iso,
                    row.indexed_at_iso
                ],
            )?;
            Ok(())
        })
    }

    /// Fetch a single row by path. Returns Ok(None) if absent.
    pub fn get(&self, path: &str) -> Result<Option<VaultFileRow>, VaultIndexError> {
        self.with_conn(|c| {
            let mut stmt = c.prepare(
                r#"SELECT path, course, kind, size_bytes, mtime_iso, indexed_at_iso
                   FROM vault_files WHERE path = ?1"#,
            )?;
            let mut rows = stmt.query(params![path])?;
            if let Some(r) = rows.next()? {
                Ok(Some(VaultFileRow {
                    path: r.get(0)?,
                    course: r.get(1)?,
                    kind: r.get(2)?,
                    size_bytes: r.get(3)?,
                    mtime_iso: r.get(4)?,
                    indexed_at_iso: r.get(5)?,
                }))
            } else {
                Ok(None)
            }
        })
    }

    /// Remove a row. No-op if the path is not indexed (DELETE on missing row
    /// is not an error in SQLite).
    pub fn delete(&self, path: &str) -> Result<(), VaultIndexError> {
        self.with_conn(|c| {
            c.execute("DELETE FROM vault_files WHERE path = ?1", params![path])?;
            Ok(())
        })
    }

    /// Total row count. Used by REQ-13 acceptance (5 inserts → count == 5).
    pub fn count_all(&self) -> Result<i64, VaultIndexError> {
        self.with_conn(|c| {
            let n: i64 = c.query_row("SELECT COUNT(*) FROM vault_files", [], |row| row.get(0))?;
            Ok(n)
        })
    }

    /// Distinct course codes, ASC sorted, NULL-course rows skipped. Phase 3
    /// Cmd+P / Settings VaultCategory use this for the course selector list.
    pub fn list_courses(&self) -> Result<Vec<String>, VaultIndexError> {
        self.with_conn(|c| {
            let mut stmt = c.prepare(
                "SELECT DISTINCT course FROM vault_files \
                 WHERE course IS NOT NULL ORDER BY course ASC",
            )?;
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            let mut out = Vec::new();
            for r in rows {
                out.push(r?);
            }
            Ok(out)
        })
    }

    /// All indexed paths (for reconcile lazy-delete pass).
    pub fn list_all_paths(&self) -> Result<Vec<String>, VaultIndexError> {
        self.with_conn(|c| {
            let mut stmt = c.prepare("SELECT path FROM vault_files")?;
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            let mut out = Vec::new();
            for r in rows {
                out.push(r?);
            }
            Ok(out)
        })
    }

    // CYCLE-3 priority #9 — `locked_conn` helper is intentionally NOT exposed.
    // Integration tests under `src-tauri/tests/` cannot reach `pub(crate)`. The
    // vault_index_count.rs test opens a SECOND `rusqlite::Connection::open(&db_path)`
    // instead — SQLite WAL mode permits multi-connection reads on the same DB
    // file. This keeps the internal `Mutex<Connection>` fully private.

    // `reconcile()` is defined in Task 2's impl block below.
}

/// Classify a vault file by its path prefix under the vault root. Phase 2
/// recognises:
///   - `_source` (immutable course-source files, chmod 0o444)
///   - `notes`, `concepts`, `practice` (user-editable course sub-directories)
///   - `INDEX` (per-course INDEX.md)
///   - `_inbox`, `_system`, `shared` (top-level non-course directories)
///   - `other` (anything else — fallback)
///
/// Path matching uses substring on the canonical relative path; this is
/// deliberate (Phase 2 doesn't need byte-perfect classification, only enough
/// to feed Cmd+P kind filters in Phase 3).
pub fn classify_kind(path: &Path, vault_root: &Path) -> String {
    let rel = path.strip_prefix(vault_root).unwrap_or(path);
    let s = rel.to_string_lossy();
    if s.contains("/_source/") || s.ends_with("/_source") {
        return "_source".into();
    }
    if s.contains("/notes/") || s.ends_with("/notes") {
        return "notes".into();
    }
    if s.contains("/concepts/") || s.ends_with("/concepts") {
        return "concepts".into();
    }
    if s.contains("/practice/") || s.ends_with("/practice") {
        return "practice".into();
    }
    if s.ends_with("INDEX.md") {
        return "INDEX".into();
    }
    if s.starts_with("_inbox") {
        return "_inbox".into();
    }
    if s.starts_with("_system") {
        return "_system".into();
    }
    if s.starts_with("shared") {
        return "shared".into();
    }
    "other".into()
}

/// Extract the course code from a vault path. Returns `Some(code)` only when
/// the path lives under `courses/<CODE>/...`; everything else (top-level
/// `_inbox`, `_system`, `shared`) returns `None` so `list_courses()` correctly
/// skips them.
pub fn extract_course(path: &Path, vault_root: &Path) -> Option<String> {
    let rel = path.strip_prefix(vault_root).ok()?;
    let mut components = rel.components();
    let first = components.next()?;
    if first.as_os_str() != "courses" {
        return None;
    }
    Some(components.next()?.as_os_str().to_string_lossy().to_string())
}

/// Current time as RFC-3339 ISO string. Used as `indexed_at_iso` and as the
/// fallback for `mtime_iso` when a file's system mtime is unreadable.
pub fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

// ============================================================================
// Reconciliation + folder-batch helper (Plan 02-04 Task 2 GREEN)
// ============================================================================

impl VaultIndex {
    /// Reconcile the index against the on-disk vault tree.
    ///
    /// Behavior (D-14):
    ///   1. Walk `vault_root` recursively; insert rows for files NOT yet indexed.
    ///   2. Delete rows for paths in the index but missing on disk (lazy delete).
    ///   3. Idempotent — running twice on unchanged disk state preserves the
    ///      row set and reports `deleted == 0` on the second pass.
    ///
    /// Hidden-directory prune (cycle-3 #9): `walkdir::WalkDir::filter_entry`
    /// removes any entry whose basename starts with `.` BEFORE descent. This
    /// keeps `~/.mneme/vault-index.db-wal`, `.git/`, `.DS_Store` etc. from
    /// being self-indexed. Per-file `.`-prefix guard inside the loop is
    /// defense-in-depth for orphan dotfiles at the vault root.
    ///
    /// Canonicalization: each on-disk path is canonicalized (resolves macOS
    /// `/var → /private/var` symlinks etc.) so the stored paths are stable
    /// across `/var` / `/private/var` aliases. Existing index rows with
    /// non-canonical paths are pruned by the lazy-delete pass (they are not
    /// present in the on-disk canonical set).
    ///
    /// Returns a `ReconcileSummary` with counts for telemetry (Phase 3 Cmd+P
    /// debug overlay) — never fails the reconcile pass for individual file IO
    /// errors; unreadable files are silently skipped.
    ///
    /// Back-compat: this is the no-op-callback wrapper around
    /// `reconcile_with_progress`. Existing tests (`reconcile_lazy_delete.rs`,
    /// `vault_index_count.rs`) and internal callers continue to work unchanged.
    pub fn reconcile(&self, vault_root: &Path) -> Result<ReconcileSummary, VaultIndexError> {
        self.reconcile_with_progress(vault_root, |_, _| {})
    }

    /// Reconcile variant that invokes `on_progress(current, total)` after every
    /// file is processed (counted by `summary.scanned`).
    ///
    /// CR-04 fix (gap-closure 02-14): per-file progress callback enables
    /// ReconciliationOverlay N/M counter (UI-SPEC §8.9). Tauri command wrapper
    /// in lib.rs passes a closure that emits reconcile:progress + reconcile:done
    /// events. Pre-scan adds ~2x walk time vs single-walk; on a 100-file vault
    /// that is ≤100ms total (well under D-14's 200ms SPEC budget). D-14
    /// escalation trigger (>500 files OR >1000ms in dogfood) is unaffected.
    ///
    /// Contract:
    /// - `total` is computed from a single pre-scan pass using the same
    ///   filter as the main loop (hidden-entry prune + is_file() count).
    /// - `current` increments to match `summary.scanned` after each entry
    ///   that contributes to the count (i.e. visible files at any descent
    ///   level under `vault_root`).
    /// - On an empty vault `total == 0` and the callback never fires.
    /// - Files whose `canonicalize()` fails are STILL counted in `current`
    ///   (consistent with `summary.scanned` semantics in the existing impl).
    pub fn reconcile_with_progress<F>(
        &self,
        vault_root: &Path,
        on_progress: F,
    ) -> Result<ReconcileSummary, VaultIndexError>
    where
        F: Fn(usize, usize),
    {
        let mut summary = ReconcileSummary::default();
        let now = now_iso();

        // CYCLE-3 priority #9 — prune hidden DIRECTORIES before descent. The
        // cycle-2 version only filtered hidden FILES, so `.mneme/` and `.git/`
        // subtrees got walked + their internal files (vault-index.db-wal, .pack
        // files, etc.) indexed. The cycle-3 filter prevents self-indexing of
        // the SQLite WAL/SHM files.
        //
        // Important: `filter_entry` is evaluated on EVERY entry including the
        // walk root. macOS `tempfile::tempdir()` uses a `.tmpXXX` prefix by
        // default (starts with `.`), and a real-world vault root could also
        // sit under `~/Library/Containers/.../Documents/.../StudyVault` where
        // some ancestor in the resolved path happens to start with `.`. We
        // therefore exempt the root entry (`depth() == 0`) from the hidden
        // check — the user explicitly pointed at it, so trust the choice.
        fn is_hidden_entry(e: &walkdir::DirEntry) -> bool {
            e.depth() > 0 && e.file_name().to_str().is_some_and(|s| s.starts_with('.'))
        }

        // Per-file inclusion predicate (`is_file()` plus defense-in-depth
        // hidden guard, matching the main loop predicate exactly so the
        // pre-scan `total` agrees with the main-loop iteration count).
        fn counts_for_progress(p: &Path, is_file: bool) -> bool {
            if !is_file {
                return false;
            }
            !p.file_name()
                .is_some_and(|n| n.to_string_lossy().starts_with('.'))
        }

        // Pre-scan to compute `total` (cheap stat-only walk; ≤50ms on 100
        // files per D-14). The main loop below reuses the same filter so the
        // count and the iteration agree.
        let total: usize = walkdir::WalkDir::new(vault_root)
            .into_iter()
            .filter_entry(|e| !is_hidden_entry(e))
            .filter_map(Result::ok)
            .filter(|entry| counts_for_progress(entry.path(), entry.file_type().is_file()))
            .count();

        let mut on_disk: HashSet<String> = HashSet::new();
        let walker = walkdir::WalkDir::new(vault_root)
            .into_iter()
            .filter_entry(|e| !is_hidden_entry(e));

        for entry in walker.filter_map(Result::ok) {
            if !entry.file_type().is_file() {
                continue;
            }
            let p = entry.path();
            // Defense-in-depth: skip hidden files (e.g. orphans created outside
            // a .git/ subdir we already pruned).
            if p.file_name()
                .is_some_and(|n| n.to_string_lossy().starts_with('.'))
            {
                continue;
            }
            summary.scanned += 1;
            // Fire the per-file callback BEFORE the canonicalize / insert step
            // so a canonicalize Err still gets observed by the UI. `current =
            // summary.scanned` (1-indexed); `total` is the pre-scan count.
            on_progress(summary.scanned, total);
            let canonical = match p.canonicalize() {
                Ok(c) => c,
                Err(_) => continue,
            };
            let path_str = canonical.to_string_lossy().to_string();
            on_disk.insert(path_str.clone());

            // If already indexed, skip (cheap path); otherwise insert.
            if self.get(&path_str)?.is_some() {
                continue;
            }
            let meta = match fs::metadata(&canonical) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let mtime_iso = meta
                .modified()
                .ok()
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Utc> = t.into();
                    dt.to_rfc3339()
                })
                .unwrap_or_else(|| now.clone());
            let kind = classify_kind(&canonical, vault_root);
            let course = extract_course(&canonical, vault_root);
            self.insert(&VaultFileRow {
                path: path_str,
                course,
                kind,
                size_bytes: meta.len() as i64,
                mtime_iso,
                indexed_at_iso: now.clone(),
            })?;
            summary.inserted += 1;
        }

        // Lazy-delete pass: any indexed path NOT on disk → drop.
        // This also prunes any stale non-canonical row left behind from
        // earlier non-canonical inserts (e.g., test-seeded ghost rows).
        let all = self.list_all_paths()?;
        for p in all {
            if !on_disk.contains(&p) {
                self.delete(&p)?;
                summary.deleted += 1;
            }
        }

        Ok(summary)
    }
}

/// Enumerate a single-level folder for REQ-06 folder-batch import.
///
/// Returns `(files_at_depth_1, subdirs_skipped)` — top-level files are imported
/// by Plan 05's import controller; nested sub-dirs are reported separately so
/// the controller can emit a per-file note (D-04 single-level only — explicit
/// SPEC L60 + L140 contract; nested batches are deferred to v1.x).
///
/// Hidden files (`.DS_Store`, etc.) are skipped from both vectors — the macOS
/// Finder convention is that `.`-prefixed entries are filesystem bookkeeping
/// the user does not intend to import.
///
/// Symlinks are silently skipped (neither file nor dir entry type) — vault
/// import has no use case for symlink-following at this layer.
pub fn enumerate_folder_one_level(
    folder: &Path,
) -> Result<(Vec<PathBuf>, Vec<PathBuf>), VaultIndexError> {
    let mut files = Vec::new();
    let mut skipped_subdirs = Vec::new();
    for entry in fs::read_dir(folder)? {
        let entry = entry?;
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        // Hidden-file skip — `.DS_Store` would pollute the import list.
        if name_str.starts_with('.') {
            continue;
        }
        let ftype = entry.file_type()?;
        if ftype.is_file() {
            files.push(entry.path());
        } else if ftype.is_dir() {
            skipped_subdirs.push(entry.path());
        }
        // Symlinks etc. silently skipped.
    }
    Ok((files, skipped_subdirs))
}
