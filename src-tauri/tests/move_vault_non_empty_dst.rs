// src-tauri/tests/move_vault_non_empty_dst.rs — Phase 2 Wave-4 (Plan 02-07).
// CYCLE-3 iter-1 BLK-1 — pins the empty-destination guard added to move_vault.
//
// Codex cycle-2 H2 (REVIEWS.md L254 + L657): pre-existing files in new_root were
// silently absorbed into the migrated vault and indexed as if they belonged to
// it. The fix is a pre-copy `count_and_sum(&canon_dst)` walk in `move_vault`
// that rejects the move when dst is non-empty. This integration test asserts
// the predicate `count_and_sum` is wired correctly so the guard can never
// silently degrade to (0, 0) on a non-empty tree.
//
// Why not test `move_vault` directly: it takes `tauri::State<'_, Arc<VaultIndex>>`,
// requiring an in-process AppHandle. The test instead pins the load-bearing
// predicate that the in-app guard depends on. The guard wiring itself is
// audited by grep gates in scripts/audit-capabilities.sh — see the
// `destination not empty` / `count_and_sum(&canon_dst)` markers in lib.rs.

use std::fs;
use tempfile::tempdir;

#[test]
fn count_and_sum_observes_pre_existing_files_in_dst() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    let dst = root.join("new_vault");

    // Plant an UNRELATED file in dst BEFORE any move attempt. This is exactly
    // the case the pre-copy guard catches.
    fs::create_dir_all(&dst).unwrap();
    let leftover = dst.join("leftover.txt");
    fs::write(&leftover, b"pre-existing").unwrap();

    let result = mneme_lib::count_and_sum_for_test(&dst).expect("walk dst");
    assert_eq!(
        result,
        (1usize, b"pre-existing".len() as u64),
        "dst pre-walk must observe the leftover file (this fact is what the move_vault guard depends on)"
    );

    // The guard predicate inside move_vault refuses when `dst_pre != (0, 0)`.
    assert!(
        result != (0, 0),
        "guard predicate must trip on a non-empty dst"
    );

    // Leftover untouched.
    assert_eq!(fs::read(&leftover).unwrap(), b"pre-existing");
}

#[test]
fn count_and_sum_treats_empty_directory_as_zero() {
    let td = tempdir().expect("tempdir");
    let dst = td.path().join("fresh_empty_vault");
    fs::create_dir_all(&dst).unwrap();
    // An empty directory MUST be (0, 0) so a freshly-created dst is accepted.
    let result = mneme_lib::count_and_sum_for_test(&dst).expect("walk empty dst");
    assert_eq!(
        result,
        (0usize, 0u64),
        "empty dst directory must be accepted by the move_vault pre-copy guard"
    );
}
