// src-tauri/tests/course_code_validation.rs
//
// Phase 02.1 Plan 02.1-01 Task 2 RED — W6 contract (UI-REVIEW.md L150 / CONTEXT D-03).
//
// Wave 0 RED, Wave 1 02.1-04 GREEN. `validate_course_code()` is the minimal
// path-safe validator that REPLACES `VALID_COURSE_CODE` regex in vault_writer.rs
// AND `VALID_COURSE_RE` regex in import_controller.rs (both call sites swap to
// the same validator).
//
// Defense rationale (per CONTEXT D-03): path traversal (T-2-01) and symlink
// (T-2-02) attacks are already closed by `vault_writer::is_under_source` two-arm
// canonicalize gate (verified by `path_traversal_blocked.rs` +
// `symlink_canonicalize_blocked.rs` — both passing). The regex
// `^[A-Z]{4}\d{4}$` was overdefense; the cost of rejecting real USYD codes
// (COMP3027L / BIOL2010S2 / MATH1062 / cs-101) exceeded the marginal benefit
// of a redundant string-level wall. SECURITY.md follow-up note (added by 02.1-04)
// captures that T6 (IPC arg injection) is now mitigated by `validate_course_code`
// + existing `Path::join` semantics (no shell) — residual risk unchanged at LOW.
//
// RED signal: this file FAILS TO BUILD on current main because
// `mneme_lib::vault_writer::validate_course_code` does not exist yet. Wave 1
// 02.1-04 adds the pub fn per the D-03 signature, the file builds, all 4 tests
// pass, and the gate flips GREEN.
//
// Test strategy: parameterized via plain Vec (no `rstest` dev-dep added).
//
// Maps to: W6 in UI-REVIEW.md L150; CONTEXT D-03 (lines 125-157).

use mneme_lib::vault_writer::{validate_course_code, VaultWriterError};

#[test]
fn validate_course_code_accepts_usyd_real_codes() {
    let cases = vec![
        "COMP3027",                         // standard USYD undergrad
        "COMP3027L",                        // USYD lab-suffix variant — current regex REJECTS this
        "BIOL2010S2", // USYD semester-suffix variant — current regex REJECTS this
        "MATH1062",   // standard
        "INFO1110",   // standard
        "STAT1003",   // standard
        "XYZ",        // 3-char code (D-03 allows arbitrary alnum length 1..=32)
        "cs-101",     // lowercase + hyphen — current regex REJECTS this
        "日本語1",    // unicode alphanumeric — current regex REJECTS this
        "a1",         // 2-char alnum mix
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", // 32 chars exactly — boundary OK
    ];
    for code in cases {
        let r = validate_course_code(code);
        assert!(
            r.is_ok(),
            "expected Ok(()) for {code:?}, got {r:?} — D-03 contract violated"
        );
    }
}

#[test]
fn validate_course_code_rejects_invalid_inputs() {
    let cases = vec![
        "",                                  // empty
        "   ",                               // whitespace only (trims to empty)
        "../etc",                            // path traversal sentinel
        "/abs/path",                         // absolute path attempt
        "a/b",                               // forward slash separator
        "a\\b",                              // backslash separator (Windows-style)
        "\0nul",                             // embedded NUL byte
        ".",                                 // single-dot relative path
        "..",                                // parent-dir traversal
        "!!!",                               // no alphanumeric char
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", // 33 chars — overlength boundary
    ];
    for code in cases {
        let r = validate_course_code(code);
        assert!(
            matches!(r, Err(VaultWriterError::InvalidCourseCode(_))),
            "expected Err(InvalidCourseCode(_)) for {code:?}, got {r:?}"
        );
    }
}

#[test]
fn validate_course_code_trims_surrounding_whitespace() {
    // Accept: surrounding whitespace trims away, the body is alnum.
    let r = validate_course_code("  COMP3027  ");
    assert!(
        r.is_ok(),
        "expected Ok for whitespace-padded valid code, got {r:?}"
    );

    // Reject: after trim, the body is a path separator.
    let r = validate_course_code("  /  ");
    assert!(
        matches!(r, Err(VaultWriterError::InvalidCourseCode(_))),
        "expected Err for trimmed value '/', got {r:?}"
    );

    // Reject: after trim, the body is empty.
    let r = validate_course_code("   ");
    assert!(
        matches!(r, Err(VaultWriterError::InvalidCourseCode(_))),
        "expected Err for whitespace-only, got {r:?}"
    );
}

#[test]
fn validate_course_code_length_boundary() {
    // 32 char: Accept (boundary).
    let thirty_two = "A".repeat(32);
    let r = validate_course_code(&thirty_two);
    assert!(
        r.is_ok(),
        "expected Ok for 32-char code (boundary), got {r:?}"
    );

    // 33 char: Reject with InvalidCourseCode("course code too long").
    let thirty_three = "A".repeat(33);
    let r = validate_course_code(&thirty_three);
    match r {
        Err(VaultWriterError::InvalidCourseCode(msg)) => {
            assert!(
                msg.to_lowercase().contains("too long"),
                "expected error message to mention 'too long', got {msg:?}"
            );
        }
        other => panic!("expected Err(InvalidCourseCode 'too long') for 33-char, got {other:?}"),
    }

    // 1 char "A": Accept (D-03 explicitly: "needs at least one alphanumeric
    // char" — a single alnum passes).
    let r = validate_course_code("A");
    assert!(
        r.is_ok(),
        "expected Ok for single alnum char 'A', got {r:?}"
    );
}
