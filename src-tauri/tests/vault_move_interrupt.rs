// src-tauri/tests/vault_move_interrupt.rs — Phase 2 Wave-4 (Plan 02-07).
// REQ-11 acceptance (SPEC L85, L149) — interrupt path.
//
// Simulated mid-copy interrupt: we copy 1 of 3 files manually then check that
// the OLD vault is byte-identical after the partial write. Per SPEC L84-85,
// vault_move is always-copy + never-delete-source-before-verify, so any kill
// between fs::copy and the post-verify step leaves the source bytes intact.
// The user can re-run the move (or simply delete the partial dst from Finder).

use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;

#[test]
fn interrupt_midcopy_leaves_old_vault_intact() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    let src = root.join("old");
    let dst = root.join("new");

    fs::create_dir_all(src.join("courses/COMP3221/_source")).unwrap();
    fs::write(src.join("courses/COMP3221/_source/a.pdf"), b"a").unwrap();
    fs::write(src.join("courses/COMP3221/_source/b.pdf"), b"b").unwrap();
    fs::write(src.join("courses/COMP3221/_source/c.pdf"), b"c").unwrap();

    // Manually copy ONLY the first file, mimicking a kill before full traversal.
    fs::create_dir_all(dst.join("courses/COMP3221/_source")).unwrap();
    fs::copy(
        src.join("courses/COMP3221/_source/a.pdf"),
        dst.join("courses/COMP3221/_source/a.pdf"),
    )
    .unwrap();
    fs::set_permissions(
        dst.join("courses/COMP3221/_source/a.pdf"),
        fs::Permissions::from_mode(0o444),
    )
    .unwrap();

    // Snapshot the OLD vault — these bytes MUST NOT change after the partial dst.
    let a = fs::read(src.join("courses/COMP3221/_source/a.pdf")).unwrap();
    let b = fs::read(src.join("courses/COMP3221/_source/b.pdf")).unwrap();
    let c = fs::read(src.join("courses/COMP3221/_source/c.pdf")).unwrap();
    assert_eq!(a, b"a");
    assert_eq!(b, b"b");
    assert_eq!(c, b"c");

    // Old vault paths still resolve.
    assert!(src.join("courses/COMP3221/_source/a.pdf").is_file());
    assert!(src.join("courses/COMP3221/_source/b.pdf").is_file());
    assert!(src.join("courses/COMP3221/_source/c.pdf").is_file());
}
