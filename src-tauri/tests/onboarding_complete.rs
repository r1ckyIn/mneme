// src-tauri/tests/onboarding_complete.rs — Phase 2 Wave 2 (RED).
// Wave-0 stub was `#[ignore] panic!`; Plan 02-03 Task 2 replaces it with
// the full SPEC REQ-08 acceptance scenario:
//   - First launch: file absent → default load (step=1, completed_at=None).
//   - User progresses to step 5; state saved + reloaded.
//   - User Finishes; complete_in sets ISO-8601 `completed_at`.
//   - Subsequent launch: load returns state with `completed_at.is_some()`
//     (the boolean gate for `+layout.svelte` to skip the wizard route).
// Also covers Pitfall 1 — after save_to returns, the `.json.tmp` sibling
// MUST be absent (atomic temp+rename invariant).
//
// This file fails to compile until Plan 02-03 Task 2 GREEN lands
// `onboarding::OnboardingState`, `onboarding::load_from`, `onboarding::save_to`,
// `onboarding::complete_in`.

use mneme_lib::onboarding;
use tempfile::tempdir;

#[test]
fn finish_sets_completed_at_iso_and_relaunch_skips() {
    let td = tempdir().expect("tempdir");
    let path = td.path().join("onboarding-state.json");

    // First launch — state file absent → default load gives current_step = 1
    // and completed_at = None.
    let initial = onboarding::load_from(&path).expect("default load");
    assert_eq!(initial.current_step, 1);
    assert!(initial.completed_at.is_none());

    // User progresses through steps; finally completes.
    let after_step5 = onboarding::OnboardingState {
        current_step: 5,
        vault_path: "/Users/qy/StudyVault".to_string(),
        courses_added: vec!["COMP3221".to_string()],
        completed_at: None,
    };
    onboarding::save_to(&path, &after_step5).expect("step5 save");

    let resumed = onboarding::load_from(&path).expect("resume load");
    assert_eq!(resumed.current_step, 5);
    assert_eq!(resumed.courses_added, vec!["COMP3221"]);
    assert!(resumed.completed_at.is_none());

    // Finish.
    let completed = onboarding::complete_in(&path).expect("complete");
    assert!(
        completed.completed_at.is_some(),
        "completed_at must be Some after complete"
    );
    let iso = completed.completed_at.as_ref().unwrap();
    // Quick ISO-8601 shape check (RFC-3339 contains 'T' separator + ':' in time).
    assert!(
        iso.contains('T') && iso.contains(':'),
        "expected ISO-8601: {iso}"
    );

    // Subsequent launch — load returns completed state.
    let after_relaunch = onboarding::load_from(&path).expect("post-finish load");
    assert!(
        after_relaunch.completed_at.is_some(),
        "relaunch must see completed_at = Some — gate for skip-wizard"
    );
}

#[test]
fn killed_midcycle_state_file_either_absent_or_valid() {
    // We can't actually SIGKILL inside a unit test, but we can verify the file
    // shape invariant: after save_to returns, the canonical file is either
    // (a) absent (pre-write) or (b) valid parseable JSON (post-rename).
    // No "half-written {current_step:" state.
    let td = tempdir().expect("tempdir");
    let path = td.path().join("onboarding-state.json");

    for step in 1..=6 {
        let state = onboarding::OnboardingState {
            current_step: step,
            vault_path: String::new(),
            courses_added: vec![],
            completed_at: None,
        };
        onboarding::save_to(&path, &state).expect("save");
        // Tmp file MUST NOT be present after save returns.
        let tmp = path.with_extension("json.tmp");
        assert!(!tmp.exists(), "tmp must be renamed");
        // Final file MUST parse cleanly.
        let loaded = onboarding::load_from(&path).expect("load after save");
        assert_eq!(loaded.current_step, step);
    }
}
