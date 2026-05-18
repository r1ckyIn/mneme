// src-tauri/tests/vault_index_count.rs — Phase 2 Wave 2 (Plan 02-04) Task 1.
// Wave-0 stub replaced with real assertions per PLAN.md Task 1 RED step.
// Covers:
//   - REQ-13 acceptance (SPEC L141): row count matches imported files.
//   - REQ-13 acceptance (SPEC L142): DB file < 1MB after fresh install.
//   - REQ-13 (vault index data source): CRUD round-trip + idempotent re-init.
//   - SCHEMA + WAL pragma proof via a SECOND rusqlite::Connection::open
//     (CYCLE-3 priority #9: integration tests cannot reach private `locked_conn()`;
//     SQLite WAL mode supports multi-connection reads on the same DB file).
use std::fs;
use tempfile::tempdir;

use mneme_lib::vault_index::{VaultFileRow, VaultIndex};

#[test]
fn init_creates_schema_and_applies_wal_pragmas() {
    let td = tempdir().expect("tempdir");
    let db_path = td.path().join("vault-index.db");
    let _idx = VaultIndex::init(&db_path).expect("init");

    // CYCLE-3 priority #9: integration tests CANNOT reach private `locked_conn()`
    // (Codex cycle-2 H1 — `pub(crate)` is invisible from src-tauri/tests/*). The
    // fix: open a SECOND rusqlite Connection to the same DB path. SQLite WAL mode
    // supports multi-connection read; the schema introspection queries are
    // read-only so there is no write contention with the VaultIndex instance.
    let conn = rusqlite::Connection::open(&db_path).expect("open second conn for introspection");

    let table: String = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='vault_files'",
            [],
            |row| row.get(0),
        )
        .expect("vault_files table");
    assert_eq!(table, "vault_files");

    let index_name: String = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='vault_files_course_idx'",
            [],
            |row| row.get(0),
        )
        .expect("vault_files_course_idx");
    assert_eq!(index_name, "vault_files_course_idx");

    let journal: String = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap();
    assert_eq!(journal.to_lowercase(), "wal");
}

#[test]
fn insert_get_delete_count_round_trip() {
    let td = tempdir().expect("tempdir");
    let db_path = td.path().join("vault-index.db");
    let idx = VaultIndex::init(&db_path).unwrap();
    let row = VaultFileRow {
        path: "/v/courses/COMP3221/_source/lectures/lec1.pdf".to_string(),
        course: Some("COMP3221".to_string()),
        kind: "_source".to_string(),
        size_bytes: 12345,
        mtime_iso: "2026-05-15T10:00:00+00:00".to_string(),
        indexed_at_iso: "2026-05-15T10:00:05+00:00".to_string(),
    };
    idx.insert(&row).unwrap();
    let got = idx.get(&row.path).unwrap().expect("row");
    assert_eq!(got, row);
    assert_eq!(idx.count_all().unwrap(), 1);
    idx.delete(&row.path).unwrap();
    assert_eq!(idx.count_all().unwrap(), 0);
    assert!(idx.get(&row.path).unwrap().is_none());
}

#[test]
fn count_all_matches_after_five_inserts_and_db_under_1mb() {
    let td = tempdir().expect("tempdir");
    let db_path = td.path().join("vault-index.db");
    let idx = VaultIndex::init(&db_path).unwrap();
    for i in 0..5 {
        idx.insert(&VaultFileRow {
            path: format!("/v/courses/COMP3221/_source/lectures/lec{i}.pdf"),
            course: Some("COMP3221".to_string()),
            kind: "_source".to_string(),
            size_bytes: 1000 * (i as i64 + 1),
            mtime_iso: format!("2026-05-15T10:00:0{i}+00:00"),
            indexed_at_iso: "2026-05-15T10:01:00+00:00".to_string(),
        })
        .unwrap();
    }
    assert_eq!(idx.count_all().unwrap(), 5);
    let bytes = fs::metadata(&db_path).unwrap().len();
    assert!(bytes < 1024 * 1024, "DB file is {bytes}B, must be < 1MB");
}

#[test]
fn list_courses_returns_distinct_sorted_skipping_null() {
    let td = tempdir().expect("tempdir");
    let db_path = td.path().join("vault-index.db");
    let idx = VaultIndex::init(&db_path).unwrap();
    for (path, course) in [
        ("/v/courses/COMP3221/_source/a.pdf", Some("COMP3221")),
        ("/v/courses/COMP3221/_source/b.pdf", Some("COMP3221")),
        ("/v/courses/INFO1110/_source/c.pdf", Some("INFO1110")),
        ("/v/_inbox/free.pdf", None),
    ] {
        idx.insert(&VaultFileRow {
            path: path.into(),
            course: course.map(String::from),
            kind: if course.is_some() {
                "_source"
            } else {
                "_inbox"
            }
            .into(),
            size_bytes: 100,
            mtime_iso: "2026-05-15T10:00:00+00:00".into(),
            indexed_at_iso: "2026-05-15T10:00:00+00:00".into(),
        })
        .unwrap();
    }
    let courses = idx.list_courses().unwrap();
    assert_eq!(
        courses,
        vec!["COMP3221".to_string(), "INFO1110".to_string()]
    );
}

#[test]
fn init_is_idempotent_on_existing_db() {
    let td = tempdir().expect("tempdir");
    let db_path = td.path().join("vault-index.db");
    let idx1 = VaultIndex::init(&db_path).unwrap();
    idx1.insert(&VaultFileRow {
        path: "/v/x".into(),
        course: None,
        kind: "other".into(),
        size_bytes: 1,
        mtime_iso: "t".into(),
        indexed_at_iso: "t".into(),
    })
    .unwrap();
    drop(idx1);
    let idx2 = VaultIndex::init(&db_path).unwrap();
    assert_eq!(idx2.count_all().unwrap(), 1);
}
