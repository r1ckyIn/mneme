// src-tauri/tests/course_scaffold.rs — Phase 2 Wave-1 (02-02 Task 1).
// Owns: vault_writer::create_course creates 4 _source/ subdirs + notes/concepts/practice + INDEX.md (idempotent).
// Maps to: REQ-02 acceptance (SPEC L40, L134) + REQ-06.

use std::fs;
use tempfile::tempdir;

#[test]
fn creates_course_dirs_and_index_md_idempotent() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    mneme_lib::vault_writer::create_vault_scaffold(root).unwrap();

    mneme_lib::vault_writer::create_course(root, "COMP3221").expect("first add");
    let course_root = root.join("courses/COMP3221");
    for sub in &[
        "_source",
        "_source/lectures",
        "_source/tutorials",
        "_source/assignments",
        "notes",
        "concepts",
        "practice",
    ] {
        assert!(course_root.join(sub).is_dir(), "missing {}", sub);
    }
    let index_path = course_root.join("INDEX.md");
    assert!(index_path.is_file(), "missing INDEX.md");
    let raw = fs::read_to_string(&index_path).unwrap();
    assert!(
        raw.contains("course: COMP3221"),
        "frontmatter missing course"
    );
    assert!(raw.contains("created: "), "frontmatter missing created");

    // Mark INDEX.md so we can detect overwrite.
    let first_index = raw.clone();
    // Idempotent re-add MUST NOT overwrite INDEX.md.
    mneme_lib::vault_writer::create_course(root, "COMP3221").expect("idempotent re-add");
    let second_index = fs::read_to_string(&index_path).unwrap();
    assert_eq!(
        first_index, second_index,
        "INDEX.md was overwritten on re-add"
    );
}

#[test]
fn rejects_invalid_course_code() {
    // W6 fix (Phase 02.1 02.1-04): the old regex `^[A-Z]{4}\d{4}$` rejected
    // "abc" because of case/digit mismatch. The replacement
    // `validate_course_code` minimal validator (per CONTEXT D-03) accepts
    // "abc" (3 alphanumeric chars, no path separator) — that prior assertion
    // pinned the dogfood-killer behavior. Use a real path-poison sentinel
    // ("../etc") that BOTH the old regex AND the new minimal validator agree
    // to reject; the rejection now happens at the validator layer rather than
    // at the regex prefilter. is_under_source is the actual security wall.
    let td = tempdir().expect("tempdir");
    let root = td.path();
    mneme_lib::vault_writer::create_vault_scaffold(root).unwrap();
    let err = mneme_lib::vault_writer::create_course(root, "../etc").unwrap_err();
    assert!(matches!(
        err,
        mneme_lib::vault_writer::VaultWriterError::InvalidCourseCode(_)
    ));
}
