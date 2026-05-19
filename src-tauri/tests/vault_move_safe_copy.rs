// src-tauri/tests/vault_move_safe_copy.rs — Phase 2 Wave-4 (Plan 02-07).
// REQ-11 acceptance (SPEC L85, L148).
//
// Drives `safe_copy_vault` directly so we test the recursive-copy contract
// without standing up a full Tauri AppHandle. The wrapper command
// `move_vault` adds the disk-bomb + empty-dst guards on top of this primitive.

use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;

use mneme_lib::safe_copy_vault;

#[test]
fn move_copies_tree_preserves_source_chmod_and_old_vault() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    let src = root.join("old");
    let dst = root.join("new");

    // Build a small vault under src.
    fs::create_dir_all(src.join("_inbox")).unwrap();
    fs::create_dir_all(src.join("courses/COMP3221/_source/lectures")).unwrap();
    fs::create_dir_all(src.join("courses/COMP3221/notes")).unwrap();
    let s1 = src.join("_inbox/x.pdf");
    let s2 = src.join("courses/COMP3221/_source/lectures/lec1.pdf");
    let s3 = src.join("courses/COMP3221/notes/note.md");
    fs::write(&s1, b"x").unwrap();
    fs::write(&s2, b"lec").unwrap();
    fs::write(&s3, b"note").unwrap();
    // Plant 0o444 on the _source/ file as the import flow would.
    fs::set_permissions(&s2, fs::Permissions::from_mode(0o444)).unwrap();

    let (files, bytes) = safe_copy_vault(&src, &dst).expect("safe_copy");
    assert_eq!(files, 3);
    assert_eq!(bytes, (b"x".len() + b"lec".len() + b"note".len()) as u64);

    // Old vault preserved.
    assert!(s1.exists());
    assert!(s2.exists());
    assert!(s3.exists());

    // Dst tree mirrors src.
    let d1 = dst.join("_inbox/x.pdf");
    let d2 = dst.join("courses/COMP3221/_source/lectures/lec1.pdf");
    let d3 = dst.join("courses/COMP3221/notes/note.md");
    assert!(d1.is_file());
    assert!(d2.is_file());
    assert!(d3.is_file());

    // 0o444 preserved on the _source/ file at the new location.
    let mode = fs::metadata(&d2).unwrap().permissions().mode() & 0o777;
    assert_eq!(
        mode, 0o444,
        "expected 0o444 at new _source/ location, got {mode:o}"
    );

    // notes/ file is plain-writable at new location.
    let mode_notes = fs::metadata(&d3).unwrap().permissions().mode() & 0o777;
    assert_ne!(
        mode_notes & 0o222,
        0,
        "notes/ file must remain writable at new location"
    );
}
