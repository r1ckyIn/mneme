// src-tauri/tests/vault_scaffold.rs — Phase 2 Wave-1 (02-02 Task 1).
// Owns: vault_writer::create_vault_scaffold creates 4 top-level dirs idempotently.
// Maps to: REQ-01 acceptance (SPEC L132) + REQ-06.

use tempfile::tempdir;

#[test]
fn creates_four_top_level_dirs_idempotently() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    mneme_lib::vault_writer::create_vault_scaffold(root).expect("first scaffold");
    for sub in &["_system", "_inbox", "courses", "shared"] {
        assert!(root.join(sub).is_dir(), "missing {}", sub);
    }
    // Idempotent re-call.
    mneme_lib::vault_writer::create_vault_scaffold(root).expect("idempotent re-scaffold");
}
