// src-tauri/tests/import_controller_validates_course_category.rs
//
// Phase 2 Plan 02-05 Task 1 GREEN — cycle-2 cluster #7 invariant at integration
// level: `start_import_inner` validates `course` + `category` BEFORE spawning
// the tokio task. Invalid inputs return Err WITHOUT registering an op_id.
//
// The same invariant is exercised by the inline unit test
// `invalid_course_or_category_rejected_before_spawn` in
// `src-tauri/src/import_controller.rs`. This integration-level mirror lets
// `cargo test --tests` (which only runs files under `tests/`) catch the
// regression too, and proves the validation surface is reachable through the
// crate's public API (`mneme_lib::import_controller::start_import_inner`).
//
// Maps to: cycle-2 cluster #7 (Plan 02-05 traversal RED) +
//          RESEARCH STRIDE T7 SQL injection defense.

use std::sync::Arc;

use mneme_lib::import_controller::{start_import_inner, ImportController};
use mneme_lib::vault_index::VaultIndex;
use mneme_lib::vault_writer::create_vault_scaffold;
use tempfile::tempdir;

#[tokio::test]
async fn rejects_invalid_course_or_category_before_spawn() {
    let td = tempdir().unwrap();
    let vault = td.path().to_path_buf();
    create_vault_scaffold(&vault).unwrap();

    let controller = Arc::new(ImportController::new());
    let db = vault.join(".mneme/vault-index.db");
    let idx = Arc::new(VaultIndex::init(&db).unwrap());

    // No-op emit closure — we only care about the Err return + clean registry.
    let emit_fn = |_n: &str, _v: serde_json::Value| {};

    // Invalid category (typo).
    let err = start_import_inner(
        vec![],
        None,
        "lecturez".to_string(), // typo
        vault.clone(),
        controller.clone(),
        idx.clone(),
        emit_fn,
    )
    .await
    .unwrap_err();
    assert!(
        err.contains("invalid category"),
        "expected `invalid category` in err, got: {err}"
    );

    // Registry must be untouched.
    let reg_len = controller.registry.lock().await.len();
    assert_eq!(reg_len, 0, "no op_id registered after invalid category");

    // Invalid course code.
    //
    // W6 fix (Phase 02.1 02.1-04): old assertion used "not-a-course" which the
    // `^[A-Z]{4}\d{4}$` regex correctly rejected — but the new minimal
    // `validate_course_code` validator (CONTEXT D-03) ACCEPTS it (alphanumeric
    // + hyphen, no path separator). That prior reject-case pinned regex
    // overdefense. Real path-poison sentinels ("../etc", "a/b", "\0nul") still
    // reject under the new validator AND would have been rejected by the old
    // regex.
    let err2 = start_import_inner(
        vec![],
        Some("../etc".to_string()),
        "lectures".to_string(),
        vault.clone(),
        controller.clone(),
        idx.clone(),
        emit_fn,
    )
    .await
    .unwrap_err();
    assert!(
        err2.contains("invalid course code"),
        "expected `invalid course code` in err, got: {err2}"
    );

    let reg_len2 = controller.registry.lock().await.len();
    assert_eq!(reg_len2, 0, "no op_id registered after invalid course");
}
