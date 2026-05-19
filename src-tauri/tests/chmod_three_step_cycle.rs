// src-tauri/tests/chmod_three_step_cycle.rs — Phase 2 Wave-1 (02-02 Task 2).
// Owns: vault_writer with_temporary_writable_permission three-step
// (chmod 644 -> write -> chmod 444). Verifies re-import preserves 0o444 lock.
// Maps to: REQ-04 acceptance (SPEC L49).

use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;

#[test]
fn reimport_unlocks_writes_relocks() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/_source/lectures")).unwrap();
    let target = root.join("courses/COMP3221/_source/lectures/lec1.pdf");

    // First import.
    let t1 = mneme_lib::vault_writer::import_handle();
    mneme_lib::vault_writer::write_to_vault(
        &target,
        b"v1",
        mneme_lib::vault_writer::WriteContext::Import(t1),
    )
    .unwrap();
    assert_eq!(
        fs::metadata(&target).unwrap().permissions().mode() & 0o777,
        0o444
    );

    // Re-import — must unlock, write new bytes, relock.
    let t2 = mneme_lib::vault_writer::import_handle();
    mneme_lib::vault_writer::write_to_vault(
        &target,
        b"v2",
        mneme_lib::vault_writer::WriteContext::Import(t2),
    )
    .expect("re-import must succeed");
    assert_eq!(fs::read(&target).unwrap(), b"v2");
    assert_eq!(
        fs::metadata(&target).unwrap().permissions().mode() & 0o777,
        0o444,
        "expected re-locked 0o444 after re-import"
    );
}
