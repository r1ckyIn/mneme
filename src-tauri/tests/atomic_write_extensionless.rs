// src-tauri/tests/atomic_write_extensionless.rs
//
// WR-002 (Phase 02.1 02.1-REVIEW.md): atomic_write extensionless tmp-name pin.
//
// Regression pin for the `atomic_write` tmp-name shape fixed in Phase 02.1
// (commit 55805ad — `src-tauri/src/vault_writer.rs` lines 244-265). The
// previous formulation `path.with_extension(format!("{ext}.tmp"))` produced
// `foo..tmp` (double dot) for extensionless inputs because `with_extension`
// treats `.tmp` as a literal extension; the fix switched to
// `set_file_name(format!("{name}.tmp"))` so every input shape gets exactly
// one separating dot:
//   "foo.pdf"  -> "foo.pdf.tmp"
//   "INDEX.md" -> "INDEX.md.tmp"
//   "Makefile" -> "Makefile.tmp"   (previously "Makefile..tmp")
//
// The inline #[cfg(test)] module in vault_writer.rs already pins this against
// the private `atomic_write` directly. This integration-level mirror drives
// the contract through the PUBLIC API (`write_to_vault` with
// `WriteContext::User` in a non-_source/ location) so the invariant is also
// reachable from `cargo test --tests` (which only runs files under tests/).
// Mirrors the pattern used by `import_controller_validates_course_category.rs`
// which integration-mirrors the inline cluster-#7 test for `start_import_inner`.
//
// Contract pinned:
//   1. write_to_vault with an extensionless basename succeeds and lands the
//      bytes at the requested path (no `Makefile..tmp` artifact survives).
//   2. No file in the parent directory contains the double-dot substring
//      `..` after a successful write.
//   3. Standard extensions (`foo.pdf`, `INDEX.md`) still round-trip without
//      regression.

use std::fs;
use tempfile::tempdir;

use mneme_lib::vault_writer::{write_to_vault, WriteContext};

#[test]
fn write_to_vault_extensionless_basename_lands_at_real_name_with_no_double_dot_artifact() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    // Use a non-_source/ destination so the User-ctx guard accepts the write.
    fs::create_dir_all(root.join("courses/COMP3221/notes")).unwrap();

    let extensionless = root.join("courses/COMP3221/notes/Makefile");
    write_to_vault(&extensionless, b"target rule\n", WriteContext::User)
        .expect("extensionless write through public API must succeed");

    // 1) Real target file exists at the requested path with the expected bytes.
    assert_eq!(
        fs::read(&extensionless).unwrap(),
        b"target rule\n",
        "extensionless file must land at its real name (no '..' suffix)"
    );

    // 2) No `..tmp` (double-dot) artifact survives in the parent directory.
    //    Pre-fix, the tmp file would have been `Makefile..tmp` and although
    //    the rename would have moved it to the wrong final name, scanning the
    //    parent for a double-dot is the canonical post-write assertion the
    //    inline private-fn test uses.
    let parent = extensionless.parent().expect("parent dir");
    let entries: Vec<String> = fs::read_dir(parent)
        .unwrap()
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    for name in &entries {
        assert!(
            !name.contains(".."),
            "no double-dot artifact expected in {parent:?}, found {name:?} — WR-002 contract violated"
        );
    }

    // 3) Only the requested basename should appear in the parent.
    assert_eq!(
        entries,
        vec!["Makefile".to_string()],
        "expected exactly one entry 'Makefile' in {parent:?}, got {entries:?}"
    );
}

#[test]
fn write_to_vault_standard_extension_still_round_trips() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/notes")).unwrap();

    // Standard `.pdf` extension — regression check that the WR-002 fix did
    // NOT break extension-bearing inputs.
    let pdf = root.join("courses/COMP3221/notes/lec1.pdf");
    write_to_vault(&pdf, b"pdf bytes", WriteContext::User).expect("pdf write");
    assert_eq!(fs::read(&pdf).unwrap(), b"pdf bytes");

    // INDEX.md — the most common course-folder file.
    let md = root.join("courses/COMP3221/notes/INDEX.md");
    write_to_vault(&md, b"# title\n", WriteContext::User).expect("md write");
    assert_eq!(fs::read(&md).unwrap(), b"# title\n");

    // No double-dot artifact in either case.
    let parent = pdf.parent().expect("parent dir");
    let entries: Vec<String> = fs::read_dir(parent)
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
