// src-tauri/tests/chmod_lock_enforced.rs — Phase 2 Wave-1 (02-02 Task 2).
// Owns: vault_writer chmod 0o444 lock after Import write + PermissionDenied
// on subsequent raw fs::write + User-ctx guard rejection.
// Maps to: REQ-04 acceptance (SPEC L137).

use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;

#[test]
fn imported_file_is_mode_0o444_and_user_write_returns_eaccess() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/_source/lectures")).unwrap();
    let target = root.join("courses/COMP3221/_source/lectures/lec1.pdf");
    let token = mneme_lib::vault_writer::import_handle();
    mneme_lib::vault_writer::write_to_vault(
        &target,
        b"pdf",
        mneme_lib::vault_writer::WriteContext::Import(token),
    )
    .unwrap();
    let mode = fs::metadata(&target).unwrap().permissions().mode();
    assert_eq!(
        mode & 0o777,
        0o444,
        "expected 0o444, got {:o}",
        mode & 0o777
    );

    // Raw fs::write bypassing vault_writer should be denied by POSIX.
    let denied = fs::write(&target, b"hijack");
    assert!(denied.is_err());
    assert_eq!(
        denied.unwrap_err().kind(),
        std::io::ErrorKind::PermissionDenied,
        "expected PermissionDenied"
    );

    // vault_writer guard with User context rejects before the write attempt.
    let err = mneme_lib::vault_writer::write_to_vault(
        &target,
        b"hijack",
        mneme_lib::vault_writer::WriteContext::User,
    )
    .unwrap_err();
    assert!(matches!(
        err,
        mneme_lib::vault_writer::VaultWriterError::WriteToSourceForbidden
    ));
}
