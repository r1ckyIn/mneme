// Phase 2 Plan 02-14 Task 1 GREEN — CR-04 (REVIEW.md L117-141). Pins per-file
// progress callback contract for VaultIndex::reconcile_with_progress. The base
// reconcile() variant remains; this test exercises the new closure-accepting
// variant that the lib.rs Tauri command wraps with an Emitter::emit closure
// (CR-04 backend half — frontend listener block in ReconciliationOverlay.svelte
// is unchanged).
//
// Mirrors reconcile_lazy_delete.rs tempdir + vault setup. SQLite WAL mode lets
// the test open a SECOND read-only connection if introspection is needed (we
// don't here — assertions all run through the on_progress closure captures
// and the returned ReconcileSummary).

use std::fs;
use std::sync::{Arc, Mutex as StdMutex};
use tempfile::tempdir;

use mneme_lib::vault_index::VaultIndex;
use mneme_lib::vault_writer::create_vault_scaffold;

#[test]
fn reconcile_with_progress_invokes_callback_per_file() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    let db_path = vault.join(".mneme/vault-index.db");

    // Build a small on-disk vault with 3 known user files under a course.
    fs::create_dir_all(vault.join("courses/COMP3221/_source/lectures")).unwrap();
    let real_files = [
        vault.join("courses/COMP3221/_source/lectures/lec1.pdf"),
        vault.join("courses/COMP3221/_source/lectures/lec2.pdf"),
        vault.join("courses/COMP3221/_source/lectures/lec3.pdf"),
    ];
    for f in &real_files {
        fs::write(f, b"x").unwrap();
    }

    let idx = VaultIndex::init(&db_path).unwrap();

    // Capture every (current, total) pair fired by the closure.
    let captures: Arc<StdMutex<Vec<(usize, usize)>>> = Arc::new(StdMutex::new(Vec::new()));
    let captures_for_cb = Arc::clone(&captures);
    let on_progress = move |current: usize, total: usize| {
        captures_for_cb.lock().unwrap().push((current, total));
    };

    let summary = idx
        .reconcile_with_progress(vault, on_progress)
        .expect("reconcile_with_progress");

    let observed = captures.lock().unwrap().clone();
    assert!(
        observed.len() >= 3,
        "expected >=3 progress callbacks for 3 files, got {} ({:?})",
        observed.len(),
        observed
    );
    for (current, total) in &observed {
        assert!(
            *current >= 1 && current <= total,
            "expected 1 <= current <= total per callback, got ({}, {})",
            current,
            total
        );
    }
    let (last_current, last_total) = observed.last().expect("at least one observation");
    assert_eq!(
        last_current, last_total,
        "final callback must have current == total ({}, {})",
        last_current, last_total
    );
    assert!(
        summary.scanned >= 3,
        "summary.scanned should reflect the 3 real files, got {}",
        summary.scanned
    );
}

#[test]
fn reconcile_with_progress_matches_summary_counts() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    let db_path = vault.join(".mneme/vault-index.db");

    fs::create_dir_all(vault.join("courses/COMP3221/_source/lectures")).unwrap();
    fs::create_dir_all(vault.join("courses/INFO1110/notes")).unwrap();
    fs::write(
        vault.join("courses/COMP3221/_source/lectures/lec1.pdf"),
        b"abc",
    )
    .unwrap();
    fs::write(
        vault.join("courses/COMP3221/_source/lectures/lec2.pdf"),
        b"abcd",
    )
    .unwrap();
    fs::write(vault.join("courses/INFO1110/notes/week1.md"), b"# w1").unwrap();

    let idx = VaultIndex::init(&db_path).unwrap();

    let captures: Arc<StdMutex<Vec<(usize, usize)>>> = Arc::new(StdMutex::new(Vec::new()));
    let captures_for_cb = Arc::clone(&captures);
    let on_progress = move |current: usize, total: usize| {
        captures_for_cb.lock().unwrap().push((current, total));
    };

    let summary = idx
        .reconcile_with_progress(vault, on_progress)
        .expect("reconcile_with_progress");

    let observed = captures.lock().unwrap().clone();
    let max_current = observed.iter().map(|(c, _)| *c).max().unwrap_or(0);
    assert_eq!(
        summary.scanned, max_current,
        "summary.scanned ({}) must equal max observed current ({})",
        summary.scanned, max_current
    );
}

#[test]
fn reconcile_with_progress_empty_vault_stays_consistent() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    let db_path = vault.join(".mneme/vault-index.db");

    // Scaffold the vault skeleton but write NO user files.
    create_vault_scaffold(vault).expect("scaffold");

    let idx = VaultIndex::init(&db_path).unwrap();

    let captures: Arc<StdMutex<Vec<(usize, usize)>>> = Arc::new(StdMutex::new(Vec::new()));
    let captures_for_cb = Arc::clone(&captures);
    let on_progress = move |current: usize, total: usize| {
        captures_for_cb.lock().unwrap().push((current, total));
    };

    let summary = idx
        .reconcile_with_progress(vault, on_progress)
        .expect("reconcile_with_progress");

    let observed = captures.lock().unwrap().clone();

    // Required invariant: summary.scanned equals callback count.
    assert_eq!(
        summary.scanned,
        observed.len(),
        "callback count ({}) must match summary.scanned ({})",
        observed.len(),
        summary.scanned
    );

    // If any captures fired, they must agree on a single `total` for this run
    // (total is the pre-scan count — constant within one reconcile pass).
    if let Some((_, first_total)) = observed.first() {
        for (_, t) in &observed {
            assert_eq!(
                t, first_total,
                "total must be consistent across all callbacks in one run"
            );
        }
    }
    // Empty-vault case: summary.scanned == 0 means captures may be empty —
    // both states are accepted.
}
