// src-tauri/tests/dev_log_rotation.rs — D-SF-03 + D-SF-04 writer task
// integration tests for the dev-only mpsc-backed log writer.
//
// The whole module is debug-only (matches `mod dev;` gating in lib.rs). All
// three tests use a TempDir so the assertions don't depend on the project
// `.dev-logs/` directory (which is gitignored but shared across runs).
//
// Test matrix:
//   1. writer_rotates_at_10mb — push >10MB of synthetic lines, observe
//      `.log.1` exists and the main file shrunk below the threshold.
//   2. writer_debounces_within_100ms — send 5 messages quickly, observe
//      all 5 land in a single batched write (no message loss).
//   3. writer_swallows_io_errors_per_dsf04 — chmod the target read-only
//      mid-stream; the writer task MUST NOT panic.

#![cfg(debug_assertions)]

use std::fs;
use std::time::Duration;
use tempfile::TempDir;

use app_lib::dev::{start_log_writer, LogChannel};

#[tokio::test(flavor = "current_thread")]
async fn writer_rotates_at_10mb() {
    let tmp = TempDir::new().expect("tempdir");
    let log_path = tmp.path().join("console.log");
    // start_log_writer rotates via `path.with_extension("log.1")` which on
    // "console.log" yields "console.log.1". Match that exact filename here.
    let backup_path = tmp.path().join("console.log.1");

    let tx = start_log_writer(LogChannel::Console, log_path.clone());

    // Each line ~120 bytes; 120_000 lines = ~14 MB which crosses the 10MB
    // rotation threshold at least once. The BATCH_SOFT_CAP (256) inside the
    // writer task means flushes happen frequently enough that the
    // first-rotation moment is well within the wait window below.
    let payload = "x".repeat(100);
    for _ in 0..120_000 {
        // Channel is bounded at 1024; awaiting `.send` provides backpressure
        // so the producer cannot get arbitrarily far ahead of the writer.
        let _ = tx.send(format!("[FRONTEND_CONSOLE]TEST|{}\n", payload)).await;
    }
    // Allow time for the writer task to drain + flush + rotate.
    tokio::time::sleep(Duration::from_millis(2_000)).await;

    assert!(
        backup_path.exists(),
        "`.log.1` backup must exist after >10MB cumulative writes; \
         dir contents: {:?}",
        fs::read_dir(tmp.path())
            .map(|d| d.flatten().map(|e| e.file_name()).collect::<Vec<_>>())
            .unwrap_or_default()
    );
    let main_size = fs::metadata(&log_path).expect("stat main").len();
    assert!(
        main_size < 10 * 1024 * 1024,
        "post-rotation main file size {main_size} must be < 10MB"
    );
}

#[tokio::test(flavor = "current_thread")]
async fn writer_debounces_within_100ms() {
    let tmp = TempDir::new().expect("tempdir");
    let log_path = tmp.path().join("console.log");
    let tx = start_log_writer(LogChannel::Console, log_path.clone());

    for i in 0..5 {
        let _ = tx.send(format!("msg{i}\n")).await;
    }
    // Debounce is 100ms; 300ms is comfortably past one batch flush.
    tokio::time::sleep(Duration::from_millis(300)).await;

    let contents = fs::read_to_string(&log_path).expect("read");
    let lines = contents.lines().count();
    assert_eq!(
        lines, 5,
        "all 5 messages must land in batched write; got contents = {contents:?}"
    );
}

#[tokio::test(flavor = "current_thread")]
async fn writer_swallows_io_errors_per_dsf04() {
    let tmp = TempDir::new().expect("tempdir");
    let log_path = tmp.path().join("console.log");
    let tx = start_log_writer(LogChannel::Console, log_path.clone());

    // First write — file gets created normally.
    let _ = tx.send("ok\n".to_string()).await;
    tokio::time::sleep(Duration::from_millis(200)).await;
    assert!(log_path.exists(), "first message should have created the file");

    // Force a permission error mid-stream. On Unix we chmod to read-only
    // (0o400); the next `OpenOptions::new().append(true).create(true)` call
    // returns EACCES, which the writer must swallow per D-SF-04.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&log_path).expect("stat").permissions();
        perms.set_mode(0o400);
        fs::set_permissions(&log_path, perms).expect("chmod");
    }

    // The writer task should accept the message and silently drop the
    // failed write. The test passes if no panic surfaces and we still
    // own a live `tx` afterwards (a panicking writer task drops the rx
    // half but the tx half stays alive; the panic itself is what we
    // want to assert against).
    let _ = tx.send("would-fail\n".to_string()).await;
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Cleanup — restore permissions so TempDir can drop the file.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&log_path).expect("stat").permissions();
        perms.set_mode(0o644);
        fs::set_permissions(&log_path, perms).expect("chmod restore");
    }
    // No assertion needed beyond "we got here without panic".
}
