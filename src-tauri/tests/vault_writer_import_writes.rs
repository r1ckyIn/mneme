// src-tauri/tests/vault_writer_import_writes.rs — Phase 2 Wave-1 (02-02 Task 1).
// Owns: vault_writer::write_to_vault Import-ctx success path under _source/.
// Maps to: REQ-03 acceptance (SPEC L45, L136).

use std::fs;
use tempfile::tempdir;

#[test]
fn import_ctx_writes_to_source() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/_source/lectures")).unwrap();
    let target = root.join("courses/COMP3221/_source/lectures/lec1.pdf");
    let token = mneme_lib::vault_writer::import_handle();
    mneme_lib::vault_writer::write_to_vault(
        &target,
        b"pdf-bytes",
        mneme_lib::vault_writer::WriteContext::Import(token),
    )
    .expect("import write must succeed");
    assert_eq!(fs::read(&target).unwrap(), b"pdf-bytes");
}
