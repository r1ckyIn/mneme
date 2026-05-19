// src-tauri/tests/path_traversal_blocked.rs
// Phase 2 Wave-0 — T-2-01 path traversal HIGH-severity (RESEARCH L1156).
// CYCLE-2 cluster #4: RUNNABLE test (NOT #[ignore]). Wave-0 skeleton in
// src-tauri/src/vault_writer.rs has a substring-only check that catches `..`
// traversal because the unresolved string still contains `/_source/`.
// Wave 1 (02-02) HARDENS this with two-arm canonicalize-parent.

use std::fs;
use tempfile::tempdir;

#[test]
fn rejects_dotdot_in_user_write_path() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    fs::create_dir_all(vault.join("courses/COMP3221/_source/lectures")).unwrap();
    fs::create_dir_all(vault.join("courses/COMP3221/notes")).unwrap();
    let evil = vault.join("courses/COMP3221/notes/../_source/lectures/evil.pdf");
    let err = mneme_lib::vault_writer::write_to_vault(
        &evil,
        b"evil",
        mneme_lib::vault_writer::WriteContext::User,
    )
    .unwrap_err();
    assert!(
        matches!(
            err,
            mneme_lib::vault_writer::VaultWriterError::WriteToSourceForbidden
        ),
        "expected WriteToSourceForbidden, got {:?}",
        err
    );
    // Defense-in-depth: file must NOT have been created.
    assert!(
        !evil.exists(),
        "file must NOT exist after rejected User write"
    );
}
