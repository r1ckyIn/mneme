// src-tauri/tests/symlink_canonicalize_blocked.rs
// Phase 2 Wave-0 — T-2-02 symlink HIGH-severity (RESEARCH L1157).
// CYCLE-2 cluster #4 + cluster #3: RUNNABLE test (NOT #[ignore]). This FAILS
// against the Wave-0 substring-only skeleton (because the symlink leaf path
// string does NOT contain `/_source/` until canonicalize resolves the link).
// Wave 1 (02-02) MUST add the two-arm canonicalize gate to turn this GREEN.

use std::fs;
use std::os::unix::fs::symlink;
use tempfile::tempdir;

#[test]
fn rejects_symlink_pointing_into_source() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    fs::create_dir_all(vault.join("courses/COMP3221/_source")).unwrap();
    fs::create_dir_all(vault.join("courses/COMP3221/notes")).unwrap();
    let target = vault.join("courses/COMP3221/_source/secret.pdf");
    fs::write(&target, b"orig").unwrap();
    let link = vault.join("courses/COMP3221/notes/disguise.pdf");
    symlink(&target, &link).unwrap();
    let err = mneme_lib::vault_writer::write_to_vault(
        &link,
        b"new",
        mneme_lib::vault_writer::WriteContext::User,
    )
    .unwrap_err();
    assert!(
        matches!(
            err,
            mneme_lib::vault_writer::VaultWriterError::WriteToSourceForbidden
        ),
        "expected WriteToSourceForbidden after canonicalize, got {:?}",
        err
    );
    // CYCLE-2 cluster #3 extra invariant: the _source target's bytes must NOT have
    // been overwritten. Adds defense against accidental rename/overwrite behavior.
    let target_bytes = fs::read(&target).unwrap();
    assert_eq!(
        target_bytes, b"orig",
        "_source/secret.pdf must NOT be overwritten through the symlink"
    );
    // Symlink itself must still exist (i.e. not replaced by a regular file).
    let meta = fs::symlink_metadata(&link).unwrap();
    assert!(
        meta.file_type().is_symlink(),
        "symlink leaf was replaced with a regular file"
    );
}
