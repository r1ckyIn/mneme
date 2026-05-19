// src-tauri/tests/reconcile_lazy_delete.rs — Phase 2 Wave 2 (Plan 02-04) Task 2.
// Wave-0 stub replaced with real assertions per PLAN.md Task 2 RED step.
// Covers:
//   - REQ-13 acceptance (SPEC L65 + L141): reconcile removes rows for files
//     that no longer exist on disk (lazy delete pass).
//   - REQ-13 reconcile idempotency: running reconcile twice on unchanged disk
//     state leaves row count + delete count stable.
//
// The reconcile() impl is added to vault_index.rs in Task 2 GREEN.
use std::fs;
use tempfile::tempdir;

use mneme_lib::vault_index::{VaultFileRow, VaultIndex};

#[test]
fn removes_row_for_missing_file_on_reconcile() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    let db_path = vault.join(".mneme/vault-index.db");

    // Build a small on-disk vault.
    fs::create_dir_all(vault.join("courses/COMP3221/_source/lectures")).unwrap();
    let real_files = [
        vault.join("courses/COMP3221/_source/lectures/lec1.pdf"),
        vault.join("courses/COMP3221/_source/lectures/lec2.pdf"),
    ];
    for f in &real_files {
        fs::write(f, b"x").unwrap();
    }

    let idx = VaultIndex::init(&db_path).unwrap();

    // Seed the index with an extra row that does NOT exist on disk.
    idx.insert(&VaultFileRow {
        path: vault
            .join("courses/COMP3221/_source/lectures/ghost.pdf")
            .to_string_lossy()
            .to_string(),
        course: Some("COMP3221".into()),
        kind: "_source".into(),
        size_bytes: 1,
        mtime_iso: "2026-05-15T10:00:00+00:00".into(),
        indexed_at_iso: "2026-05-15T10:00:00+00:00".into(),
    })
    .unwrap();

    let summary = idx.reconcile(vault).expect("reconcile");
    assert!(
        summary.scanned >= 2,
        "expected >=2 scanned, got {}",
        summary.scanned
    );
    assert!(
        summary.inserted >= 2,
        "expected 2 real files inserted, got {}",
        summary.inserted
    );
    assert_eq!(summary.deleted, 1, "expected ghost row deleted");

    // The 2 real files now in index; the ghost gone.
    assert_eq!(idx.count_all().unwrap(), 2);
}

#[test]
fn reconcile_is_idempotent() {
    let td = tempdir().expect("tempdir");
    let vault = td.path();
    let db_path = vault.join(".mneme/vault-index.db");
    fs::create_dir_all(vault.join("courses/COMP3221/_source/lectures")).unwrap();
    fs::write(
        vault.join("courses/COMP3221/_source/lectures/lec1.pdf"),
        b"x",
    )
    .unwrap();

    let idx = VaultIndex::init(&db_path).unwrap();
    let _first = idx.reconcile(vault).unwrap();
    let count_after_first = idx.count_all().unwrap();
    let second = idx.reconcile(vault).unwrap();
    let count_after_second = idx.count_all().unwrap();

    assert_eq!(
        count_after_first, count_after_second,
        "row count must be stable across re-reconcile"
    );
    assert_eq!(second.deleted, 0, "second pass must not delete anything");
}
