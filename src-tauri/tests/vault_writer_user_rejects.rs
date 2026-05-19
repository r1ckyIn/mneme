// src-tauri/tests/vault_writer_user_rejects.rs — Phase 2 Wave-1 (02-02 Task 1).
// Owns: vault_writer::write_to_vault User-ctx rejection (real canonicalize gate).
// Maps to: REQ-03 acceptance (SPEC L45, L136).

use std::fs;
use tempfile::tempdir;

#[test]
fn user_ctx_refuses_source_write() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/_source/lectures")).unwrap();
    let target = root.join("courses/COMP3221/_source/lectures/lec1.pdf");
    let err = mneme_lib::vault_writer::write_to_vault(
        &target,
        b"bytes",
        mneme_lib::vault_writer::WriteContext::User,
    )
    .unwrap_err();
    assert!(matches!(
        err,
        mneme_lib::vault_writer::VaultWriterError::WriteToSourceForbidden
    ));
    assert!(
        !target.exists(),
        "file must NOT exist after rejected User write"
    );
}

#[test]
fn user_ctx_accepts_notes_write() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/notes")).unwrap();
    let target = root.join("courses/COMP3221/notes/foo.md");
    mneme_lib::vault_writer::write_to_vault(
        &target,
        b"hello",
        mneme_lib::vault_writer::WriteContext::User,
    )
    .expect("notes write must succeed");
    assert_eq!(fs::read(&target).unwrap(), b"hello");
}
