// src-tauri/tests/inspector_keychain_detect.rs
//
// Phase 02.1 Plan 02.1-01 Task 1 RED — B3 contract (UI-REVIEW.md L148 / CONTEXT D-02).
//
// Wave 0 RED, Wave 1 02.1-02 GREEN. `probe_claude_binary()` is the pure sync helper
// Wave 1 will add to `src-tauri/src/lib.rs`; the existing `#[tauri::command]
// async fn claude_auth_check` will then call it. This test pins:
//   (1) success path returns `found == true` AND `env_broken == false`,
//   (2) the `ClaudeAuthStatus` serde shape preserves the `env_broken` field
//       (load-bearing for the Step2AuthCheck frontend which reads that key
//       to distinguish "claude not installed" from "$HOME is broken").
//
// Test 2 (`probe_claude_binary_handles_missing_binary_gracefully`) is marked
// `#[ignore]` because `std::env::set_var("PATH", "/nonexistent")` races with
// parallel cargo-test threads (PATH is process-global). The NotFound branch of
// the production code is instead covered by the grep gate in 02.1-02 Task 3
// which asserts the match arm exists in `lib.rs::probe_claude_binary`. Run the
// ignored test manually via:
//     cargo test --test inspector_keychain_detect -- --ignored
// in a shell where PATH does not contain a `claude` binary.
//
// RED signal: this file FAILS TO BUILD on current main because
// `mneme_lib::probe_claude_binary` does not exist yet. Wave 1 02.1-02 adds the
// pub fn, the file builds, Test 1 + Test 3 pass, and the gate flips GREEN.
//
// Maps to: B3 in UI-REVIEW.md L148; CONTEXT D-02 (lines 98-124).

use mneme_lib::{probe_claude_binary, ClaudeAuthStatus};

#[test]
fn probe_claude_binary_returns_found_when_subprocess_exits_zero() {
    // Skip when `claude` is not on PATH (local-only dogfood-driven contract;
    // NOT a CI gate). The audit gate in 02.1-02 will fail the build if anyone
    // removes the production code that satisfies this test, so the contract
    // remains pinned even when the local box lacks the binary.
    let claude_on_path = std::process::Command::new("which")
        .arg("claude")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if !claude_on_path {
        eprintln!(
            "skipping probe_claude_binary_returns_found_when_subprocess_exits_zero: \
             `claude` not on PATH (acceptable for CI; install Claude Code locally to run)"
        );
        return;
    }

    let status = probe_claude_binary();
    assert!(
        status.found,
        "expected found=true when `claude --version` exits 0, got {status:?}"
    );
    assert!(
        !status.env_broken,
        "expected env_broken=false when subprocess succeeded, got {status:?}"
    );
    // NOTE: we intentionally do NOT assert on `status.version`. D-02 marks
    // `parse_version` as nice-to-have, not contract — Wave 1 may leave version
    // as None and that is still a valid GREEN.
}

#[test]
#[ignore = "races std::env::set_var with parallel tests; run with --ignored on a clean PATH"]
fn probe_claude_binary_handles_missing_binary_gracefully() {
    // Force NotFound by emptying PATH. SAFETY of restore: we use a guard struct
    // with a Drop impl so the original PATH is restored even on panic. The race
    // with other parallel tests is what makes this #[ignore]'d.
    struct PathGuard {
        original: Option<std::ffi::OsString>,
    }
    impl Drop for PathGuard {
        fn drop(&mut self) {
            match self.original.take() {
                // SAFETY: process-global mutation — the #[ignore] gate forces
                // this test to run on its own thread, eliminating the race.
                Some(p) => unsafe { std::env::set_var("PATH", p) },
                None => unsafe { std::env::remove_var("PATH") },
            }
        }
    }
    let _guard = PathGuard {
        original: std::env::var_os("PATH"),
    };
    // SAFETY: see above — #[ignore] gate ensures serial execution.
    unsafe { std::env::set_var("PATH", "/nonexistent") };

    let status = probe_claude_binary();
    assert!(
        !status.found,
        "expected found=false when claude binary not on PATH, got {status:?}"
    );
    assert!(
        !status.env_broken,
        "NotFound is a normal 'user has not installed claude yet' path; \
         env_broken should stay false (it is reserved for $HOME / spawn errors), \
         got {status:?}"
    );
}

#[test]
fn claude_auth_status_serde_shape_pins_env_broken_field() {
    // Pure compile-time + serde-output assertion. The Step2AuthCheck frontend
    // reads `env_broken` from this exact key — a future refactor that renames
    // the field would break the frontend at runtime. This test catches that
    // rename before it reaches user devtools.
    //
    // This test PASSES on first run today (the struct already has env_broken
    // from the 02-13 WR-01 fix). It is included here to document the
    // load-bearing serde shape so Wave 1 02.1-02 (which rewrites the body of
    // claude_auth_check) cannot accidentally change the struct fields.
    let status = ClaudeAuthStatus {
        found: true,
        version: None,
        env_broken: false,
    };
    let json = serde_json::to_string(&status).expect("serialize ClaudeAuthStatus");
    assert!(
        json.contains("\"env_broken\":false"),
        "expected serialized JSON to contain \"env_broken\":false, got: {json}"
    );
    assert!(
        json.contains("\"found\":true"),
        "expected serialized JSON to contain \"found\":true, got: {json}"
    );
}
