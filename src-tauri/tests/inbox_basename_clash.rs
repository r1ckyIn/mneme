// src-tauri/tests/inbox_basename_clash.rs
//
// Phase 2 Plan 02-13 Task 1 RED — CR-02 (REVIEW.md L44-69).
//
// Maps to D-11: `_inbox/` is the COMMON default destination for any Import
// (no course selected OR `category == "_inbox"` even when a course is set).
// Prior to this plan, the basename-clash check in import_controller.rs was
// gated by `routes_to_source = category_task != "_inbox" && course_task.is_some()`,
// which silently SKIPPED the check for every `_inbox`-bound import.
//
// This file is the integration-level mirror of `source_basename_clash.rs` for
// the `_inbox` catch-all path. Test 2 covers the (Some(course), category=`_inbox`)
// corner case where `compute_dest`'s match falls through to the `_inbox` arm
// despite a course being selected.
//
// Failure prefix contract: `dest-clash:<path>` (NOT `source-clash:` — those two
// prefixes distinguish "would clobber a `_source/` file (chmod 0o444 — locked)"
// from "would clobber a file in the universal `_inbox/` default destination
// (writable POSIX permissions, nothing else would catch the overwrite)").

use std::sync::{Arc, Mutex as StdMutex};

use mneme_lib::import_controller::{start_import_inner, ImportController};
use mneme_lib::vault_index::VaultIndex;
use mneme_lib::vault_writer::{create_course, create_vault_scaffold};
use tempfile::tempdir;

#[tokio::test]
async fn inbox_basename_clash_records_failure_and_continues() {
    let td = tempdir().unwrap();
    let vault = td.path().to_path_buf();
    create_vault_scaffold(&vault).unwrap();

    // Plant an existing file in `_inbox/` at the destination basename. NOTE:
    // `_inbox/` files are NOT chmod 0o444 (the lock only fires for paths under
    // any `/_source/` ancestor per vault_writer.rs:189-192). So POSIX cannot
    // save us — the clash check is the ONLY thing standing between the user
    // and silent overwrite.
    let existing = vault.join("_inbox/notes.pdf");
    std::fs::write(&existing, b"orig").unwrap();

    // Source files for re-import: 1 clash + 1 success.
    let src_dir = td.path().join("src");
    std::fs::create_dir_all(&src_dir).unwrap();
    let clash_src = src_dir.join("notes.pdf"); // same basename → clash
    let ok_src = src_dir.join("report.pdf");
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
        None,
        "_inbox".to_string(),
        vault.clone(),
        controller.clone(),
        idx.clone(),
        emit_fn,
    )
    .await
    .unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // Existing file's bytes UNCHANGED (no silent overwrite). This is the
    // load-bearing security invariant — the user's `_inbox/` files cannot be
    // clobbered by a re-import that targets the same basename.
    assert_eq!(
        std::fs::read(&existing).unwrap(),
        b"orig",
        "_inbox clash-path file must NOT be overwritten"
    );

    // Done event records 1 failure with `dest-clash:` reason; 1 success.
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
        reason.starts_with("dest-clash:"),
        "expected dest-clash: prefix (NOT source-clash:), got {reason:?}"
    );
}

#[tokio::test]
async fn inbox_clash_with_course_some_still_blocks() {
    // D-11 corner case: user selected a course (`Some("COMP3221")`) BUT
    // category fell back to `"_inbox"`. `compute_dest`'s match arm
    // `(Some(c), cat) if cat != "_inbox"` does NOT match (cat == "_inbox"),
    // so the `_ =>` arm routes to `<vault>/_inbox/<file>` — NOT to
    // `<vault>/courses/COMP3221/_source/`. This corner case used to bypass the
    // clash check because `routes_to_source` evaluated to false (the gate
    // demanded BOTH cat != "_inbox" AND course.is_some()).
    let td = tempdir().unwrap();
    let vault = td.path().to_path_buf();
    create_vault_scaffold(&vault).unwrap();
    create_course(&vault, "COMP3221").unwrap();

    // Plant an existing file in `_inbox/` at the destination basename.
    let existing = vault.join("_inbox/lec1.pdf");
    std::fs::write(&existing, b"orig").unwrap();

    let src_dir = td.path().join("src");
    std::fs::create_dir_all(&src_dir).unwrap();
    let clash_src = src_dir.join("lec1.pdf");
    std::fs::write(&clash_src, b"new").unwrap();

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
        vec![clash_src.clone()],
        Some("COMP3221".to_string()),
        "_inbox".to_string(),
        vault.clone(),
        controller.clone(),
        idx.clone(),
        emit_fn,
    )
    .await
    .unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // _inbox file UNCHANGED.
    assert_eq!(
        std::fs::read(&existing).unwrap(),
        b"orig",
        "_inbox clash-path file must NOT be overwritten even when course is set"
    );

    // Crucially, the file did NOT land at courses/COMP3221/_source/lectures/.
    // We `create_course` above so the parent tree exists — the assertion that
    // the file is absent has teeth only when the parent path is real.
    let wrong_dest = vault.join("courses/COMP3221/_source/lectures/lec1.pdf");
    assert!(
        !wrong_dest.exists(),
        "file must NOT have landed under _source/lectures/ — compute_dest routed to _inbox"
    );

    let events = captured.lock().unwrap().clone();
    let done = events
        .iter()
        .find(|(n, _)| n == "import:done")
        .expect("done event");
    assert_eq!(done.1["succeeded"].as_u64().unwrap(), 0);
    assert_eq!(done.1["failed"].as_u64().unwrap(), 1);
    let failures = done.1["failures"].as_array().unwrap();
    assert_eq!(failures.len(), 1);
    let reason = failures[0]["reason"].as_str().unwrap();
    assert!(
        reason.starts_with("dest-clash:"),
        "expected dest-clash: prefix (universal-clash, not source-clash:), got {reason:?}"
    );
}
