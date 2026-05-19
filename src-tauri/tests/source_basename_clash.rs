// src-tauri/tests/source_basename_clash.rs
//
// Phase 2 Plan 02-05 Task 1 GREEN — cycle-2 cluster #8 invariant at integration
// level: re-importing a source file whose basename already exists under
// `<course>/_source/<category>/` is rejected with a `source-clash:<path>`
// reason. Failure is recorded in `ImportDoneEvent.failures`; the batch
// CONTINUES (does NOT abort). The existing file's bytes are UNCHANGED — no
// silent overwrite.
//
// The same invariant is exercised by the inline unit test
// `source_basename_clash_records_failure_and_continues` in
// `src-tauri/src/import_controller.rs`. This integration-level mirror lets
// `cargo test --tests` catch the regression and proves the failure path is
// reachable through `mneme_lib`'s public API.
//
// Maps to: cycle-2 cluster #8 (no silent overwrite).
// Cross-ref: src/lib/components/ImportHistoryModal.svelte (02-11) reads
// `failures[].reason` to surface the friendly Chinese error.

use std::os::unix::fs::PermissionsExt;
use std::sync::{Arc, Mutex as StdMutex};

use mneme_lib::import_controller::{start_import_inner, ImportController};
use mneme_lib::vault_index::VaultIndex;
use mneme_lib::vault_writer::{create_course, create_vault_scaffold};
use tempfile::tempdir;

#[tokio::test]
async fn source_basename_clash_records_failure_and_continues() {
    let td = tempdir().unwrap();
    let vault = td.path().to_path_buf();
    create_vault_scaffold(&vault).unwrap();
    create_course(&vault, "COMP3221").unwrap();

    // Plant an existing 0o444 file at the destination basename (simulates a
    // previously imported source file already locked).
    let existing = vault.join("courses/COMP3221/_source/lectures/lec1.pdf");
    std::fs::write(&existing, b"orig").unwrap();
    std::fs::set_permissions(&existing, std::fs::Permissions::from_mode(0o444)).unwrap();

    // Source files for re-import: 1 clash + 1 success.
    let src_dir = td.path().join("src");
    std::fs::create_dir_all(&src_dir).unwrap();
    let clash_src = src_dir.join("lec1.pdf"); // same basename → clash
    let ok_src = src_dir.join("lec2.pdf");
    std::fs::write(&clash_src, b"new").unwrap();
    std::fs::write(&ok_src, b"new2").unwrap();

    // Capture-emit closure mirroring the public API signature.
    let captured: Arc<StdMutex<Vec<(String, serde_json::Value)>>> =
        Arc::new(StdMutex::new(Vec::new()));
    let cap = captured.clone();
    let emit_fn = move |n: &str, v: serde_json::Value| {
        cap.lock().unwrap().push((n.to_string(), v));
    };

    let controller = Arc::new(ImportController::new());
    let db = vault.join(".mneme/vault-index.db");
    let idx = Arc::new(VaultIndex::init(&db).unwrap());

    start_import_inner(
        vec![clash_src.clone(), ok_src.clone()],
        Some("COMP3221".to_string()),
        "lectures".to_string(),
        vault.clone(),
        controller.clone(),
        idx.clone(),
        emit_fn,
    )
    .await
    .unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // Existing file's bytes UNCHANGED (no silent overwrite). This is the
    // load-bearing security invariant — the user's source files cannot be
    // clobbered by a re-import that targets the same basename.
    assert_eq!(
        std::fs::read(&existing).unwrap(),
        b"orig",
        "clash-path file must NOT be overwritten"
    );

    // Done event records 1 failure with `source-clash:` reason; 1 success.
    let events = captured.lock().unwrap().clone();
    let done = events
        .iter()
        .find(|(n, _)| n == "import:done")
        .expect("done event");
    assert_eq!(
        done.1["succeeded"].as_u64().unwrap(),
        1,
        "ok file should succeed"
    );
    assert_eq!(
        done.1["failed"].as_u64().unwrap(),
        1,
        "clash file should fail"
    );
    let failures = done.1["failures"].as_array().unwrap();
    assert_eq!(failures.len(), 1);
    let reason = failures[0]["reason"].as_str().unwrap();
    assert!(
        reason.starts_with("source-clash:"),
        "expected source-clash: prefix, got {reason:?}"
    );
}
