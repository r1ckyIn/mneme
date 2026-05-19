// src-tauri/tests/move_vault_symlink_guard.rs
//
// Phase 2 Plan 02-13 Task 2 — CR-03 invariant pin (REVIEW.md L73-114).
//
// Pins the symlink-resolve invariant that the move_vault canon_src/canon_dst
// fix depends on. CR-03's fix itself is GREP-GATE-DRIVEN (Task 4 audits
// lib.rs for raw `&src` / `&dst` residue after canonicalize) because move_vault
// requires `tauri::State<'_, Arc<VaultIndex>>` and cannot be exercised from a
// plain integration test harness — same architectural constraint that
// move_vault_non_empty_dst.rs documents at its top.
//
// These tests PASS on first run by design — they document POSIX canonicalize
// semantics. A failure here would signal that the underlying stdlib invariant
// has shifted (e.g. fs::canonicalize stopped following symlinks, or
// walkdir::WalkDir started ignoring symlinks differently) and the CR-03 fix
// in move_vault would need re-audit.
//
// Attack vector (from REVIEW.md L73-114): user picks `~/new-vault-link` as
// the new vault root, where `new-vault-link` is a symlink pointing at
// `/tmp/empty/`. The empty-dst guard at lib.rs L509 walks `canon_dst`
// (resolves the link → `/tmp/empty/`, sees 0 files → passes). But the
// pre-fix code then called `safe_copy_vault(&src, &dst)` with the raw
// path — `walkdir::WalkDir::new(dst)` would follow the link too, but
// `index.reconcile(&dst)` stored the raw user-string `~/new-vault-link`
// in the index, so after `rm ~/new-vault-link` the next launch's reconcile
// against the user-string path fails and the vault appears empty.
//
// The fix (Plan 02-13 Task 3) is to substitute `&canon_src` / `&canon_dst`
// for ALL post-canonicalize operations. That makes the raw vs canon
// distinction irrelevant because both predicates and operations walk the
// SAME canonicalized target.

use std::fs;
use std::os::unix::fs::symlink;

use tempfile::tempdir;

#[test]
fn canon_dst_resolves_symlink_to_target() {
    let td = tempdir().expect("tempdir");
    let root = td.path();

    // Two targets: one empty, one with content.
    let target_empty = root.join("target_empty");
    let target_full = root.join("target_full");
    fs::create_dir_all(&target_empty).unwrap();
    fs::create_dir_all(&target_full).unwrap();
    let leftover = target_full.join("leftover.txt");
    fs::write(&leftover, b"contents").unwrap();

    // Symlinks pointing AT each target.
    let link_empty = root.join("link_empty");
    let link_full = root.join("link_full");
    symlink(&target_empty, &link_empty).expect("create link_empty");
    symlink(&target_full, &link_full).expect("create link_full");

    // POSIX canonicalize-follows-symlinks invariant.
    let canon_link_empty = fs::canonicalize(&link_empty).expect("canonicalize link_empty");
    let canon_link_full = fs::canonicalize(&link_full).expect("canonicalize link_full");
    let canon_target_empty = fs::canonicalize(&target_empty).expect("canonicalize target_empty");
    let canon_target_full = fs::canonicalize(&target_full).expect("canonicalize target_full");
    assert_eq!(
        canon_link_empty, canon_target_empty,
        "canonicalize(link_empty) MUST equal canonicalize(target_empty) — symlink resolved"
    );
    assert_eq!(
        canon_link_full, canon_target_full,
        "canonicalize(link_full) MUST equal canonicalize(target_full) — symlink resolved"
    );

    // count_and_sum_for_test walks the canonicalized target. This is the
    // load-bearing invariant for move_vault's empty-dst guard: when the user
    // picks a symlink at dst, the guard sees ITS TARGET's contents, not the
    // link itself.
    assert_eq!(
        mneme_lib::count_and_sum_for_test(&link_empty).expect("walk link_empty"),
        (0usize, 0u64),
        "link_empty resolves to target_empty (0 files); guard passes"
    );
    let (full_count, full_bytes) =
        mneme_lib::count_and_sum_for_test(&link_full).expect("walk link_full");
    assert_eq!(
        full_count, 1usize,
        "link_full resolves to target_full (1 file); guard MUST trip"
    );
    assert_eq!(
        full_bytes,
        b"contents".len() as u64,
        "link_full's leftover.txt bytes counted"
    );
}

#[test]
fn canon_predicate_consistency_guard() {
    let td = tempdir().expect("tempdir");
    let root = td.path();

    // Source vault scenario.
    let src = root.join("src");
    fs::create_dir_all(&src).unwrap();
    let src_file = src.join("file.txt");
    fs::write(&src_file, b"source-contents").unwrap();
    let canon_src = fs::canonicalize(&src).expect("canonicalize src");

    // Destination symlink: link_dst → empty_target/.
    let empty_target = root.join("empty_target");
    fs::create_dir_all(&empty_target).unwrap();
    let link_dst = root.join("link_dst");
    symlink(&empty_target, &link_dst).expect("create link_dst");
    let canon_link_dst = fs::canonicalize(&link_dst).expect("canonicalize link_dst");

    // Disk-bomb guard property: canonicalized dst must NOT start with
    // canonicalized src. Raw path also wouldn't, but the canonicalized check is
    // what the move_vault guard actually relies on after Task 3's fix.
    assert!(
        !canon_link_dst.starts_with(&canon_src),
        "canon_link_dst MUST NOT be a descendant of canon_src; otherwise disk-bomb guard would trip"
    );

    // Loop-back assertion: count_and_sum on the link path equals count_and_sum
    // on the canonical target path. THIS is the property the move_vault fix
    // relies on — using canon_dst everywhere makes raw vs canon equivalent
    // because both walk the same physical target.
    let raw_walk =
        mneme_lib::count_and_sum_for_test(&link_dst).expect("count_and_sum_for_test(link_dst)");
    let canon_walk = mneme_lib::count_and_sum_for_test(&canon_link_dst)
        .expect("count_and_sum_for_test(canon_link_dst)");
    assert_eq!(
        raw_walk, canon_walk,
        "raw + canon walks MUST agree (both follow the symlink to the same target)"
    );
    assert_eq!(
        raw_walk,
        (0usize, 0u64),
        "empty_target has 0 files; both walks return (0, 0) — guard passes correctly"
    );
}
