// src-tauri/tests/folder_batch_one_level.rs — Phase 2 Wave 2 (Plan 02-04) Task 2.
// Wave-0 stub replaced with real assertions per PLAN.md Task 2 RED step.
// Covers:
//   - REQ-06 acceptance (SPEC L60 + L140): folder batch import is single-level;
//     nested sub-folders are skipped (Plan 05 import_controller will emit the
//     per-file note for each skipped subdir).
//   - Hidden files (.DS_Store) are skipped from the enumeration helper.
//
// The enumerate_folder_one_level() helper is added to vault_index.rs in Task 2
// GREEN. Plan 05 (import_controller.rs) consumes this helper for folder batch.
use std::fs;
use tempfile::tempdir;

use mneme_lib::vault_index::enumerate_folder_one_level;

#[test]
fn imports_top_level_skips_nested_with_note() {
    let td = tempdir().expect("tempdir");
    let folder = td.path();

    // Top level: 3 files + 1 sub-dir.
    fs::write(folder.join("a.pdf"), b"a").unwrap();
    fs::write(folder.join("b.pdf"), b"b").unwrap();
    fs::write(folder.join("c.md"), b"c").unwrap();
    fs::create_dir(folder.join("nested")).unwrap();
    // File INSIDE the sub-dir — must NOT be returned in files vec.
    fs::write(folder.join("nested/d.pdf"), b"d").unwrap();

    let (files, skipped_subdirs) = enumerate_folder_one_level(folder).unwrap();

    let mut file_names: Vec<String> = files
        .iter()
        .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
        .collect();
    file_names.sort();
    assert_eq!(
        file_names,
        vec!["a.pdf".to_string(), "b.pdf".to_string(), "c.md".to_string()]
    );

    let mut skip_names: Vec<String> = skipped_subdirs
        .iter()
        .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
        .collect();
    skip_names.sort();
    assert_eq!(skip_names, vec!["nested".to_string()]);
}

#[test]
fn skips_hidden_files() {
    let td = tempdir().expect("tempdir");
    let folder = td.path();
    fs::write(folder.join("real.pdf"), b"x").unwrap();
    fs::write(folder.join(".DS_Store"), b"junk").unwrap();
    let (files, _) = enumerate_folder_one_level(folder).unwrap();
    let names: Vec<String> = files
        .iter()
        .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
        .collect();
    assert_eq!(names, vec!["real.pdf".to_string()]);
}
