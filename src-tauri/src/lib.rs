// src-tauri/src/lib.rs — Tauri builder + subprocess lifecycle (D-10 hook union).
//
// Closes T-1-01 (zombie subprocess accumulation on Cmd+Q) by:
//   1. Storing spawned PIDs in a SessionRegistry HashMap (extension-friendly per RESEARCH §8 Risk 1).
//   2. Killing the entire process GROUP (not just the PID) via nix::killpg(getpgid(pid), SIGTERM)
//      → 2s grace → SIGKILL.
//   3. Hooking BOTH WindowEvent::CloseRequested and RunEvent::ExitRequested
//      (Tauri issue #9198: ExitRequested unreliable on some macOS versions).
//
// Phase 2 Plan 02-07 — bridge wave:
//   - 16 new #[tauri::command] handlers wired into BOTH the debug + release
//     invoke_handler branches (config / onboarding / vault scaffold / import
//     controller / vault index / vault move / file pickers / claude auth stub).
//   - State holders (ConfigState + Arc<VaultIndex> + Arc<ImportController>)
//     managed at builder time so commands can access them via tauri::State<T>.
//   - tauri-plugin-dialog registered for the macOS NSOpenPanel pickers.

mod session;

// Phase 2 cycle-3 cluster 1C — Wave-0 skeleton registration so HIGH-severity
// path-traversal + symlink integration tests under src-tauri/tests/ can compile.
// Wave 1 (02-02 Task 1) overwrites the body of vault_writer.rs with the real
// canonicalize-parent + symlink-resolve guard; the public surface stays stable.
pub mod vault_writer;

// Phase 2 cycle-3 cluster 1C — interface-first wave-safety pre-declarations.
// Wave 1 (02-02 Task 1) lands placeholder .rs files; Waves 2/3 (Plans 02-03 /
// 02-04 / 02-05) OVERWRITE the placeholders with full implementations. By
// declaring all modules here at the start of Wave 1 we avoid lib.rs file-merge
// conflicts when parallel waves ship their .rs bodies. Names sorted alphabetically
// per rustfmt — Plan ownership: config + onboarding -> Plan 02-03; vault_index ->
// Plan 02-04; import_controller -> Plan 02-05.
pub mod config;
pub mod import_controller;
pub mod onboarding;
pub mod vault_index;

#[cfg(debug_assertions)]
pub mod dev;

pub use session::{ChildHandle, SessionId, SessionRegistry};

use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use nix::sys::signal::{killpg, Signal};
use nix::unistd::{getpgid, Pid};
use tauri::{Emitter, Manager, RunEvent, State, WindowEvent};

// ---------------------------------------------------------------------------
// kill_pgid — load-bearing for REQ-3.
// ---------------------------------------------------------------------------
//
// PUBLIC because the integration test (src-tauri/tests/kill_pgid.rs) calls it.
//
// Pid::from_raw takes i32; CommandChild::pid() returns u32. The `as i32` cast
// is safe for any realistic POSIX PID (RESEARCH §4.3 line 213) — no `unsafe`.
//
// SIGKILL is sent UNCONDITIONALLY after the 2s SIGTERM grace. If the process
// group is already dead, killpg returns ESRCH which we drop with `let _ =`.
// Adding a TOCTOU "is it still alive?" check is forbidden — that introduces
// a race window where a slow-exiting child could be missed (T-1-19).
//
// If getpgid fails (ESRCH for already-dead pid), we silently no-op — that is
// the only valid path for a self-exited process group.
//
// BL-01 fix (2026-05-14): the SIGTERM → 2s sleep → SIGKILL sequence USED to run
// synchronously on the Tauri event-loop thread. On Cmd+Q the WebView could not
// repaint and macOS showed a "Mneme is not responding" beach-ball after ~800ms.
// We now detach the sleep+SIGKILL leg onto a worker thread so the caller
// returns immediately after the initial SIGTERM. The kernel still delivers
// SIGKILL within the same 2s window because `std::thread::spawn` is a
// fire-and-forget detached thread. Test invariant preserved: `kill_pgid()`
// returns immediately, and within 2.5s the whole process group is dead
// (kill_pgid_eradicates_whole_process_group still passes — it waits 2.5s after
// the call returns, exactly the asynchronous timing this fix relies on).
pub fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    let Ok(pgid) = getpgid(Some(pid)) else {
        return;
    };
    let _ = killpg(pgid, Signal::SIGTERM);
    // Detach the SIGKILL leg — caller returns immediately; the kernel still
    // delivers SIGKILL on the same 2s timer. Avoids blocking the Tauri event
    // loop on Cmd+Q. Multiple kill_pgid calls (Phase 3 multi-session) now
    // execute in parallel rather than serial 2s waits.
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(2));
        let _ = killpg(pgid, Signal::SIGKILL);
    });
}

// ---------------------------------------------------------------------------
// Tauri commands — frontend ↔ Rust IPC for session lifecycle.
// ---------------------------------------------------------------------------

#[tauri::command]
fn register_session_pid(state: State<SessionRegistry>, pid: u32) {
    // Phase 1 always uses SessionId = 1 (single-session). Phase 3 will pass
    // a generated id from the frontend.
    state.register(1, ChildHandle { pid });
}

#[tauri::command]
fn clear_session_pid(state: State<SessionRegistry>) {
    // Called on natural close (cmd.on("close") relay) — releases the slot
    // without killing (the subprocess already exited).
    let _ = state.drain_one(1);
}

#[tauri::command]
fn stop_session(state: State<SessionRegistry>) {
    // D-19 Stop button — invokes the same kill path as Cmd+Q but the app
    // keeps running. Already-streamed text in the chat panel is preserved
    // by plan 01-06's UI code.
    state.kill_all();
}

// ---------------------------------------------------------------------------
// Phase 2 — config + onboarding commands (Plan 02-07 Task 1).
// ---------------------------------------------------------------------------
//
// All thin map_err wrappers over the underlying Rust modules. Each command is
// async to satisfy the requirement that tauri::State<'_, Arc<...>> lifetimes
// drop at the .await point — sync commands holding tauri::State across an
// await are rejected by the Tauri 2 macro. The underlying module calls are
// blocking; we keep them blocking inside the async body (no spawn_blocking)
// because per-call latency is sub-millisecond for atomic JSON read/write.

#[tauri::command]
async fn load_config() -> Result<config::Config, String> {
    config::load().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_config(state: config::Config) -> Result<(), String> {
    config::save(&state).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_onboarding_state() -> Result<onboarding::OnboardingState, String> {
    onboarding::load().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_onboarding_state(state: onboarding::OnboardingState) -> Result<(), String> {
    onboarding::save(&state).map_err(|e| e.to_string())
}

#[tauri::command]
async fn complete_onboarding() -> Result<onboarding::OnboardingState, String> {
    onboarding::complete().map_err(|e| e.to_string())
}

// B3 fix (Phase 02.1 02.1-02) — claude_auth_check via subprocess probe.
// Replaces the previous `~/.claude/.credentials.json` file-existence probe.
//
// WHY SUBPROCESS (D-02 / CONTEXT lines 98-124):
//   The old file probe was a dogfood-killer for fresh macOS Claude Code
//   installs. Real Claude Code stores credentials in the macOS keychain
//   (`Security.framework`), NOT in `~/.claude/.credentials.json`. The file
//   never exists on these systems → `claude_auth_check` always returned
//   `found=false` → onboarding Step 2 disabled the Continue button → user
//   blocks at the second onboarding step with no recovery path. See
//   UI-REVIEW.md L148 (B3) for the dogfood reproduction.
//
//   `claude --version` exiting 0 is the single source of truth for "CLI is
//   usable end-to-end" — PATH ok + keychain ok + binary ok. Probing the
//   keychain directly only checks one of three. Cost: ~100ms one-shot at
//   onboarding Step 2 (already shows "Checking…" copy real estate).
//
// WHY PURE HELPER SPLIT (probe_claude_binary):
//   Tauri's `#[tauri::command] async fn` cannot be called directly from
//   `#[test]` without spinning up an AppHandle. Splitting the logic into a
//   sync `pub fn probe_claude_binary() -> ClaudeAuthStatus` + a thin async
//   wrapper makes the test trivial AND keeps the Tauri command boundary
//   stable for the Step2AuthCheck frontend (continues to call
//   `invoke<ClaudeAuthStatus>("claude_auth_check")` unchanged).
//
// WHY NO PER-IMPORT OVERHEAD:
//   The probe runs once at onboarding Step 2 only — not on every import.
//   ~100ms cost is amortized over the entire app session (re-imports do
//   NOT re-run the probe).
//
// WR-01 ENV_BROKEN CONTRACT (preserved from gap-closure 02-13):
//   - `Ok(success)`  → found=true,  env_broken=false (CLI usable)
//   - `Ok(failure)`  → found=false, env_broken=false (CLI installed but errored)
//   - `Err(NotFound)`→ found=false, env_broken=false (user simply hasn't installed
//                      claude yet — NOT a system break; user remediation is
//                      "install Claude Code from claude.ai/code")
//   - `Err(other)`   → found=false, env_broken=true  (EPERM on PATH directory,
//                      etc. — distinct UX remediation: "your environment is
//                      misconfigured — open Terminal and run `echo $HOME`")
//   Frontend Step2AuthCheck reads `env_broken` to pick the remediation message.
//   Dropping the NotFound arm (collapsing it into the generic Err) would
//   re-introduce false env_broken on missing-binary systems → WR-01 regression.
//   Audit gate 9 in scripts/audit-capabilities.sh pins all 4 arms.
//
// CAPABILITY SURFACE:
//   `claude --version` is allow-listed via a NEW `claude-version-probe`
//   entry in src-tauri/capabilities/default.json (single arg, regex
//   ^--version$, no wildcard). The SSOT lives in
//   src/lib/spawn-args.shared.ts (CLAUDE_VERSION_PROBE_ARGS). The two
//   existing chat-subprocess entries (claude-bin-fresh / claude-bin-resume)
//   are UNCHANGED.
//
// Citation: B3 fix (Phase 02.1 02.1-02): replaces file probe; closes
// UI-REVIEW.md L148 dogfood blocker. RED test
// src-tauri/tests/inspector_keychain_detect.rs from Wave 0 02.1-01 turns
// GREEN with this change.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ClaudeAuthStatus {
    pub found: bool,
    pub version: Option<String>,
    /// WR-01 fix (gap-closure 02-13, preserved by B3 fix 02.1-02):
    /// distinguishes a broken HOME / PATH environment from
    /// credentials-missing. The frontend Step2AuthCheck surfaces a distinct
    /// "environment misconfigured — open Terminal and run `echo $HOME`"
    /// message instead of the standard "Claude CLI not detected" copy. A
    /// missing `claude` binary (NotFound) is NOT env_broken — that's a
    /// "user has not installed Claude Code yet" path.
    pub env_broken: bool,
}

/// Best-effort version extraction from `claude --version` stdout. The
/// command typically writes `2.0.42 (Claude Code)` or similar; we return
/// the first whitespace-separated token if it looks like a version (any
/// ASCII digit or '.' present). Returns None on parse failure — version is
/// informational only and NOT load-bearing for the `found` gate.
pub fn parse_version_from_stdout(stdout: &[u8]) -> Option<String> {
    let s = std::str::from_utf8(stdout).ok()?;
    let first_line = s.lines().next()?.trim();
    if first_line.is_empty() {
        return None;
    }
    // Take the first whitespace-separated token (the version literal).
    let candidate = first_line.split_whitespace().next()?;
    if candidate.chars().any(|c| c.is_ascii_digit() || c == '.') {
        Some(candidate.to_string())
    } else {
        None
    }
}

/// Pure sync probe — invokes `claude --version` and maps the result to a
/// `ClaudeAuthStatus`. Public so the integration test in
/// `src-tauri/tests/inspector_keychain_detect.rs` can call it directly
/// without standing up a Tauri AppHandle.
///
/// See the module-level comment block above for the 4-arm match contract
/// + WR-01 env_broken disposition rationale.
pub fn probe_claude_binary() -> ClaudeAuthStatus {
    let output = std::process::Command::new("claude")
        .arg("--version")
        .output();
    match output {
        Ok(o) if o.status.success() => ClaudeAuthStatus {
            found: true,
            version: parse_version_from_stdout(&o.stdout),
            env_broken: false,
        },
        Ok(_) => ClaudeAuthStatus {
            found: false,
            version: None,
            env_broken: false,
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => ClaudeAuthStatus {
            found: false,
            version: None,
            env_broken: false,
        },
        Err(_) => ClaudeAuthStatus {
            found: false,
            version: None,
            env_broken: true,
        },
    }
}

#[tauri::command]
async fn claude_auth_check() -> Result<ClaudeAuthStatus, String> {
    Ok(probe_claude_binary())
}

// ---------------------------------------------------------------------------
// Phase 2 — vault scaffold + course + index commands.
// ---------------------------------------------------------------------------

#[tauri::command]
async fn vault_create_scaffold(root: String) -> Result<(), String> {
    vault_writer::create_vault_scaffold(Path::new(&root)).map_err(|e| e.to_string())
}

#[tauri::command]
async fn course_create(root: String, code: String) -> Result<(), String> {
    vault_writer::create_course(Path::new(&root), &code).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_courses(
    index: tauri::State<'_, Arc<vault_index::VaultIndex>>,
) -> Result<Vec<String>, String> {
    index.list_courses().map_err(|e| e.to_string())
}

// CR-04 fix (gap-closure 02-14): emit reconcile:progress per file +
// reconcile:done on completion. ReconciliationOverlay.svelte listeners at
// lines 21-34 already subscribe; previously dead because no Rust path emitted.
// UI-SPEC §8.9 N/M counter is now functional.
//
// The closure mirrors the start_import emit pattern (let _ = Emitter::emit)
// so a webview teardown mid-reconcile drops the error and keeps the
// reconcile pass running. ≤100 files at ≤200ms per D-14 budget = ≤100
// sub-millisecond emit calls per reconcile; UI-side render throttles to
// ~10 fps per UI-SPEC §8.9.
#[tauri::command]
async fn reconcile_vault_index(
    root: String,
    index: tauri::State<'_, Arc<vault_index::VaultIndex>>,
    app: tauri::AppHandle,
) -> Result<vault_index::ReconcileSummary, String> {
    let app_for_emit = app.clone();
    let emit_progress = move |current: usize, total: usize| {
        let _ = Emitter::emit(
            &app_for_emit,
            "reconcile:progress",
            serde_json::json!({ "current": current, "total": total }),
        );
    };
    let summary = index
        .reconcile_with_progress(Path::new(&root), emit_progress)
        .map_err(|e| e.to_string())?;
    let _ = Emitter::emit(&app, "reconcile:done", ());
    Ok(summary)
}

// ---------------------------------------------------------------------------
// Phase 2 — import commands.
// ---------------------------------------------------------------------------
//
// start_import bridges from the Tauri command surface into
// import_controller::start_import_inner. The inner takes an
// `emit_fn: Fn(&str, serde_json::Value)` so the controller stays
// AppHandle-agnostic (testable with a closure capture). The wrapper here
// substitutes the real Tauri emit.

#[tauri::command]
async fn start_import(
    paths: Vec<String>,
    course: Option<String>,
    category: String,
    vault_root: String,
    controller: tauri::State<'_, Arc<import_controller::ImportController>>,
    index: tauri::State<'_, Arc<vault_index::VaultIndex>>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let path_bufs: Vec<std::path::PathBuf> =
        paths.into_iter().map(std::path::PathBuf::from).collect();
    let app_for_emit = app.clone();
    let emit_fn = move |evt_name: &str, payload: serde_json::Value| {
        // Tauri emit can fail if the webview is torn down mid-batch; we drop
        // the error since the controller-side task continues processing.
        let _ = Emitter::emit(&app_for_emit, evt_name, payload);
    };
    import_controller::start_import_inner(
        path_bufs,
        course,
        category,
        std::path::PathBuf::from(vault_root),
        controller.inner().clone(),
        index.inner().clone(),
        emit_fn,
    )
    .await
}

#[tauri::command]
async fn cancel_import(
    operation_id: String,
    controller: tauri::State<'_, Arc<import_controller::ImportController>>,
) -> Result<(), String> {
    import_controller::cancel_import_inner(controller.inner().clone(), &operation_id).await
}

#[tauri::command]
async fn get_recent_imports() -> Result<Vec<serde_json::Value>, String> {
    // Phase 2 returns empty — recent-20 lives in frontend import-state.svelte.ts.
    // Phase 3 may add backend persistence; placeholder ensures the IPC surface
    // is stable.
    Ok(Vec::new())
}

// ---------------------------------------------------------------------------
// Phase 2 — file pickers (NSOpenPanel via tauri-plugin-dialog).
// ---------------------------------------------------------------------------
//
// CYCLE-2 cluster #9 — 02-11 ImportDialog (Cmd+I) calls open_file_picker;
// 02-09 Step 3 vault picker calls open_folder_picker. Returns absolute path
// strings so the frontend can hand them straight to start_import / save_config
// without an additional translation.
//
// tauri-plugin-dialog 2.7 exposes async helpers via callback-style FnOnce.
// We bridge the callback to an mpsc::channel so the async wrapper can `await`
// a single recv. The receiver thread is the tokio runtime; the dialog runs
// on the macOS UI thread internally.

use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn open_file_picker(app: tauri::AppHandle, multiple: bool) -> Result<Vec<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Vec<String>>();
    if multiple {
        app.dialog().file().pick_files(move |paths| {
            let vec = paths
                .unwrap_or_default()
                .into_iter()
                .map(|p| p.to_string())
                .collect::<Vec<_>>();
            let _ = tx.send(vec);
        });
    } else {
        app.dialog().file().pick_file(move |path| {
            let v = path.map(|p| vec![p.to_string()]).unwrap_or_default();
            let _ = tx.send(v);
        });
    }
    // The dialog callback runs on the macOS UI thread; the recv blocks the
    // tokio executor only until the user closes the picker. mpsc::recv yields
    // an Err if the sender drops without sending — treat as "user cancelled
    // without selecting" (empty Vec).
    Ok(rx.recv().unwrap_or_default())
}

#[tauri::command]
async fn open_folder_picker(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Option<String>>();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });
    Ok(rx.recv().unwrap_or(None))
}

// ---------------------------------------------------------------------------
// Phase 2 — vault move (REQ-11 SPEC L84-85).
// ---------------------------------------------------------------------------
//
// Safe-copy semantics:
//   - ALWAYS copy (never `fs::rename`) — RESEARCH Pitfall 3 EXDEV on APFS
//     cross-mount. `safe_copy_vault` recursively copies preserving 0o444
//     mode on files under any `_source/` ancestor.
//   - CYCLE-2 cluster #10 — canonicalize src + dst BEFORE the copy and
//     refuse if dst == src OR dst.starts_with(src) OR src.starts_with(dst).
//     Disk-bomb guard: copying a vault into itself would exhaust storage.
//   - CYCLE-3 iter-1 BLK-1 — pre-copy empty-destination guard:
//     `count_and_sum(&canon_dst)` must return (0, 0) BEFORE the copy starts.
//     Catches Codex H2 (REVIEWS.md L254): pre-existing files in new_root
//     would otherwise be silently absorbed into the migrated vault.
//   - CYCLE-3 iter-1 BLK-1 — INDEPENDENT post-copy walk of dst is the
//     verification source of truth (NOT the tuple returned by
//     safe_copy_vault). Compares against src totals captured BEFORE the copy.
//   - CR-03 fix (gap-closure 02-13): canon_src / canon_dst used CONSISTENTLY
//     across safe_copy_vault + count_and_sum(verify) + index.reconcile. Prior
//     cycle mixed raw &src/&dst with canon_* guards, surfacing a
//     symlink-at-dst attack vector documented in REVIEW.md L73-114. Pinned by
//     src-tauri/tests/move_vault_symlink_guard.rs (CR-03 invariant).
//   - Old vault is left intact on success — user deletes manually in Finder
//     (T-2-09 by-design).

#[derive(Debug, Clone, serde::Serialize)]
pub struct MoveVaultSummary {
    pub files_copied: usize,
    pub bytes_copied: u64,
    pub old_root_preserved: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultMoveError {
    #[error("walkdir: {0}")]
    Walk(#[from] walkdir::Error),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("count mismatch: src={src} dst={dst}")]
    CountMismatch { src: usize, dst: usize },
    #[error("byte mismatch: src={src} dst={dst}")]
    ByteMismatch { src: u64, dst: u64 },
}

/// Recursive copy preserving 0o444 mode on files under any `_source/` ancestor.
/// Returns (file_count_at_dst, bytes_copied). On error, does NOT clean up the
/// partial dst tree — caller decides whether to user-prompt or roll back.
///
/// This is public so the integration test in src-tauri/tests/vault_move_safe_copy.rs
/// can drive it directly without standing up a full Tauri AppHandle.
pub fn safe_copy_vault(src: &Path, dst: &Path) -> Result<(usize, u64), VaultMoveError> {
    use std::os::unix::fs::PermissionsExt;

    let mut files = 0usize;
    let mut bytes = 0u64;
    fs::create_dir_all(dst)?;
    for entry in walkdir::WalkDir::new(src) {
        let entry = entry?;
        let rel = entry.path().strip_prefix(src).unwrap_or(entry.path());
        let target = dst.join(rel);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&target)?;
        } else if entry.file_type().is_file() {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(entry.path(), &target)?;
            let len = entry.metadata()?.len();
            bytes += len;
            files += 1;
            // If source was under any `_source/`, lock the destination 0o444.
            let path_s = entry.path().to_string_lossy();
            if path_s.contains("/_source/") {
                fs::set_permissions(&target, fs::Permissions::from_mode(0o444))?;
            }
        }
        // Symlinks ignored — Phase 2 vault scaffold contains none.
    }
    Ok((files, bytes))
}

/// Walk `root` and report (file_count, total_bytes). Used both pre-copy (as
/// the empty-destination guard) and post-copy (as the independent verifier
/// against the src totals captured before the copy).
///
/// `pub` so the integration test
/// `src-tauri/tests/move_vault_non_empty_dst.rs` can pin the predicate the
/// in-app guard depends on (CYCLE-3 iter-1 BLK-1).
pub fn count_and_sum(root: &Path) -> Result<(usize, u64), VaultMoveError> {
    let mut files = 0usize;
    let mut bytes = 0u64;
    for entry in walkdir::WalkDir::new(root) {
        let entry = entry?;
        if entry.file_type().is_file() {
            bytes += entry.metadata()?.len();
            files += 1;
        }
    }
    Ok((files, bytes))
}

/// Test-friendly accessor — keeps the integration-test import surface stable
/// even if `count_and_sum` is refactored. Plan 02-07 BLK-1 specifies this
/// thin wrapper so future internal renames don't break the move_vault_non_empty_dst
/// test.
pub fn count_and_sum_for_test(root: &Path) -> Result<(usize, u64), VaultMoveError> {
    count_and_sum(root)
}

#[tauri::command]
async fn move_vault(
    old_root: String,
    new_root: String,
    index: tauri::State<'_, Arc<vault_index::VaultIndex>>,
) -> Result<MoveVaultSummary, String> {
    let src = std::path::PathBuf::from(&old_root);
    let dst = std::path::PathBuf::from(&new_root);

    // CYCLE-2 cluster #10 — disk-bomb guard.
    // If dst is the same as src OR a descendant of src, safe_copy_vault would
    // recursively copy the vault into itself, exhausting disk space + corrupting
    // the source. Canonicalize both BEFORE the check (resolves symlinks + ..).
    // src MUST exist (we're about to copy from it); if dst doesn't exist yet we
    // canonicalize the parent + join basename to get the path it WILL resolve to.
    let canon_src = src
        .canonicalize()
        .map_err(|e| format!("src canonicalize: {e}"))?;
    let canon_dst: std::path::PathBuf = if dst.exists() {
        dst.canonicalize()
            .map_err(|e| format!("dst canonicalize: {e}"))?
    } else {
        let parent = dst
            .parent()
            .ok_or_else(|| "dst has no parent".to_string())?;
        let canon_parent = parent
            .canonicalize()
            .map_err(|e| format!("dst.parent canonicalize: {e}"))?;
        match dst.file_name() {
            Some(name) => canon_parent.join(name),
            None => canon_parent,
        }
    };
    if canon_dst == canon_src {
        return Err(format!(
            "vault_move refused: new_root ({}) equals old_root ({}) after canonicalize",
            canon_dst.display(),
            canon_src.display()
        ));
    }
    if canon_dst.starts_with(&canon_src) {
        return Err(format!(
            "vault_move refused: new_root ({}) is a descendant of old_root ({}); copy would recurse into itself",
            canon_dst.display(),
            canon_src.display()
        ));
    }
    if canon_src.starts_with(&canon_dst) {
        return Err(format!(
            "vault_move refused: old_root ({}) is a descendant of new_root ({}); copy would overwrite source ancestor",
            canon_src.display(),
            canon_dst.display()
        ));
    }

    // CYCLE-3 iter-1 BLK-1 — empty-destination guard.
    //
    // Walk the destination tree BEFORE invoking safe_copy_vault. If `dst` already
    // exists AND contains any files (count or bytes != 0), refuse the move. Pre-
    // existing files in `new_root` would otherwise be silently absorbed into the
    // migrated vault and indexed as if they belonged to it — a data-integrity
    // bug surfaced by Codex cycle-2 H2 (REVIEWS.md L254). Note: a freshly-created
    // empty directory IS allowed (count_and_sum returns (0, 0) on an empty tree).
    // If the canonicalized dst does not exist yet, walkdir yields zero entries
    // so count_and_sum returns (0, 0) — safe-by-default. We treat a non-existent
    // dst as "empty" without panicking.
    let dst_pre = if canon_dst.exists() {
        count_and_sum(&canon_dst).map_err(|e| format!("dst pre-check: {e}"))?
    } else {
        (0usize, 0u64)
    };
    if dst_pre != (0, 0) {
        return Err(format!(
            "destination not empty: dst already contains {} file(s) totalling {} bytes — refusing to absorb pre-existing files into the migrated vault",
            dst_pre.0, dst_pre.1
        ));
    }

    // CYCLE-3 iter-1 BLK-1 — capture src totals BEFORE the copy. We compare
    // these against an INDEPENDENT post-copy walk of `dst` below.
    //
    // CR-03 fix (gap-closure 02-13): use canon_src/canon_dst for ALL post-guard
    // ops. Prior code mixed raw &src/&dst with canon_* guard, allowing a
    // symlink-at-dst attack vector (REVIEW.md L73-114) where canon_dst would
    // resolve a link to /tmp/empty (guard passes) but raw &dst written via
    // walkdir would land bytes at the link target while index.reconcile(&dst)
    // stored the user-string. After `rm ~/new-vault-link` the next launch's
    // reconcile would fail and the vault would appear empty. canon_* is the
    // single source of truth from here on.
    let (src_files, src_bytes) =
        count_and_sum(&canon_src).map_err(|e| format!("src pre-walk: {e}"))?;

    // 1) Copy. `safe_copy_vault` returns its own counters; we keep them only
    //    for diagnostic logging — the source of truth for verification is the
    //    INDEPENDENT post-copy `count_and_sum(&canon_dst)` walk below.
    let (sc_files, sc_bytes) =
        safe_copy_vault(&canon_src, &canon_dst).map_err(|e| e.to_string())?;

    // 2) CYCLE-3 iter-1 BLK-1 — INDEPENDENT post-copy walk of dst.
    //    Do NOT trust the tuple returned by `safe_copy_vault`. Re-walk
    //    canon_dst from scratch and compare against the src totals captured
    //    BEFORE the copy. This catches: (a) post-copy fs mutations (race with
    //    a concurrent process that scribbled into dst between copy + verify);
    //    (b) any drift between what safe_copy_vault thought it wrote and
    //    what's actually on disk now. Both are tail-risk but free to defend
    //    against.
    let (dst_files, dst_bytes) =
        count_and_sum(&canon_dst).map_err(|e| format!("dst post-walk: {e}"))?;
    if dst_files != src_files {
        return Err(format!(
            "count mismatch after copy: src={src_files} dst={dst_files} (safe_copy_vault reported {sc_files})"
        ));
    }
    if dst_bytes != src_bytes {
        return Err(format!(
            "byte mismatch after copy: src={src_bytes} dst={dst_bytes} (safe_copy_vault reported {sc_bytes})"
        ));
    }

    // 3) Rebuild the index against the new location.
    //    For the index rebuild we do not WAL-checkpoint or re-init the DB;
    //    reconcile walks the new tree and inserts new rows + deletes any
    //    old-path rows. Walking canon_dst (rather than raw &dst) prevents the
    //    symlink-vs-target inconsistency documented in CR-03.
    let _ = index.reconcile(&canon_dst).map_err(|e| e.to_string())?;

    // 4) Old vault preserved by design — return success.
    Ok(MoveVaultSummary {
        files_copied: dst_files, // independent post-walk count is the source of truth
        bytes_copied: dst_bytes,
        old_root_preserved: canon_src.exists(),
    })
}

// ---------------------------------------------------------------------------
// Tauri builder — hook union per D-10 (T-1-01 + T-1-18 mitigation).
// ---------------------------------------------------------------------------
//
// Phase 01.1 adds dev-only commands gated by #[cfg(debug_assertions)]. The
// `tauri::generate_handler!` macro does NOT accept `#[cfg]` between entries,
// so the builder must be split into two top-level branches (debug + release).
// Setup + window-event + run-event hooks stay identical across branches.
//
// Phase 2 Plan 02-07 adds:
//   - tauri-plugin-dialog plugin (NSOpenPanel pickers).
//   - State holders: ConfigState (not used as State<T> yet — config commands
//     read/write JSON directly via the module; the wrapper lives here so we
//     can move to in-memory caching if Phase 3 needs it), Arc<VaultIndex>,
//     Arc<ImportController>.
//   - 16 Phase 2 commands appended to BOTH debug + release branches.

/// Wrapper struct that owns a `RwLock<Config>` — currently unused by the
/// Phase 2 command surface (each command re-reads JSON on every call to
/// satisfy the "one Config write happens at a time" atomicity guarantee
/// without crossing await points). Kept as a builder-managed state holder
/// so a future Phase 3 in-memory cache can swap in without an API break.
pub struct ConfigState {
    pub inner: tokio::sync::RwLock<config::Config>,
}

impl ConfigState {
    pub fn new(cfg: config::Config) -> Self {
        Self {
            inner: tokio::sync::RwLock::new(cfg),
        }
    }
}

// ---------------------------------------------------------------------------
// SPEC-GAP-1 (settings-ui.md §2 L59) — macOS native menu construction.
// ---------------------------------------------------------------------------
//
// Plan 02-07 Task 3 (2026-05-16 replan). Built at builder `setup()` time so the
// menu attaches BEFORE the first window paints. The Mneme submenu sits at the
// left of the menu bar (where macOS expects the app menu).
//
// Item ids are load-bearing — the `on_menu_event` closure matches by id and
// emits the named Tauri event `menu:open-settings`. The frontend listener
// (Plan 12, ChatPanel-adjacent) consumes that event and dispatches the same
// custom `mneme:open-settings` event the cog click + Cmd+, key listener
// already emit, so the downstream code path stays single. The Wave-0 test
// `src-tauri/tests/menu_preferences_emits_event.rs` pins the dispatch
// contract (id="preferences" emits "menu:open-settings"; other ids emit
// nothing) so a future menu refactor cannot silently drift.
fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

    let preferences = MenuItemBuilder::with_id("preferences", "Preferences...")
        .accelerator("Cmd+,")
        .build(app)?;
    let about = PredefinedMenuItem::about(app, Some("About Mneme"), None)?;
    let hide = PredefinedMenuItem::hide(app, Some("Hide Mneme"))?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit Mneme"))?;

    let app_submenu = SubmenuBuilder::new(app, "Mneme")
        .item(&about)
        .item(&sep1)
        .item(&preferences)
        .item(&sep2)
        .item(&hide)
        .item(&quit)
        .build()?;

    MenuBuilder::new(app).item(&app_submenu).build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Pre-load config so vault_path is available to commands. unwrap_or_default
    // covers the first-launch case where ~/.mneme/config.json does not exist;
    // load_from returns Config::default() in that case (config.rs L78-79).
    let cfg = config::load().unwrap_or_default();

    // Initialise vault-index DB at ~/.mneme/vault-index.db. The Arc is shared
    // between the builder-managed state and any Phase 2 command that takes
    // tauri::State<'_, Arc<VaultIndex>>.
    let db_path = home::home_dir()
        .map(|h| h.join(".mneme").join("vault-index.db"))
        .unwrap_or_else(|| std::path::PathBuf::from("./vault-index.db"));
    if let Some(parent) = db_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let vault_index = Arc::new(vault_index::VaultIndex::init(&db_path).expect("vault_index init"));

    let import_controller = Arc::new(import_controller::ImportController::new());

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // Phase 2 Plan 02-07 — NSOpenPanel pickers for Cmd+I + vault path Browse.
        .plugin(tauri_plugin_dialog::init())
        .manage(SessionRegistry::new())
        // Phase 2 Plan 02-07 — state holders for the new command surface.
        .manage(ConfigState::new(cfg))
        .manage(vault_index.clone())
        .manage(import_controller.clone());

    #[cfg(debug_assertions)]
    let builder = {
        // Resolve `.dev-logs/` under cwd at startup so Tauri-managed state
        // has a stable target before the first forwarder dispatch.
        let dev_log_dir = std::env::current_dir()
            .unwrap_or_default()
            .join(".dev-logs");
        let _ = fs::create_dir_all(&dev_log_dir);
        builder
            .manage(dev::DevWriter::new(dev_log_dir))
            .invoke_handler(tauri::generate_handler![
                // Phase 1 + 01.1 — session lifecycle.
                register_session_pid,
                clear_session_pid,
                stop_session,
                // Phase 2 — config + onboarding.
                load_config,
                save_config,
                load_onboarding_state,
                save_onboarding_state,
                complete_onboarding,
                claude_auth_check,
                // Phase 2 — vault + index.
                vault_create_scaffold,
                course_create,
                list_courses,
                reconcile_vault_index,
                // Phase 2 — import.
                start_import,
                cancel_import,
                get_recent_imports,
                // Phase 2 — file pickers (NSOpenPanel).
                open_file_picker,
                open_folder_picker,
                // Phase 2 — vault move.
                move_vault,
                // Phase 01.1 — dev-only handlers.
                dev::dev_log_console_entry,
                dev::dev_log_network_entry,
                dev::dev_log_perf_entry,
                dev::dev_capture_screenshot,
                dev::dev_query_state,
            ])
    };

    #[cfg(not(debug_assertions))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        // Phase 1 + 01.1 — session lifecycle.
        register_session_pid,
        clear_session_pid,
        stop_session,
        // Phase 2 — config + onboarding.
        load_config,
        save_config,
        load_onboarding_state,
        save_onboarding_state,
        complete_onboarding,
        claude_auth_check,
        // Phase 2 — vault + index.
        vault_create_scaffold,
        course_create,
        list_courses,
        reconcile_vault_index,
        // Phase 2 — import.
        start_import,
        cancel_import,
        get_recent_imports,
        // Phase 2 — file pickers.
        open_file_picker,
        open_folder_picker,
        // Phase 2 — vault move.
        move_vault,
    ]);

    builder
        .setup(|app| {
            // Phase 1 — auto-create ~/.mneme/scratch/ on first launch
            // (REQ-10 --add-dir target). Idempotent — create_dir_all silently
            // no-ops if path exists.
            if let Some(home) = home::home_dir() {
                let _ = fs::create_dir_all(home.join(".mneme/scratch"));
            }

            // Phase 2 Plan 02-07 Task 3 (SPEC-GAP-1) — build + install the
            // macOS native menu. The two installs live in the same closure
            // per cycle-3 priority #11 (SINGLE merged setup hook); chaining
            // multiple `.setup()` calls on a Tauri builder silently keeps only
            // the last one, so the Phase 1 scratch carryover MUST stay inside
            // this body whenever menu install is added.
            let menu = build_app_menu(app.handle())?;
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            // SPEC-GAP-1 (settings-ui.md §2 L59) — match by id and emit the
            // named Tauri event. The frontend listener in Plan 12 dispatches
            // the same mneme:open-settings custom event the cog click + Cmd+,
            // key listener already emit — single downstream code path.
            if event.id().as_ref() == "preferences" {
                let _ = app.emit("menu:open-settings", ());
            }
        })
        .on_window_event(|window, event| {
            // Red-button close on the title bar dispatches WindowEvent::CloseRequested.
            // We do NOT call api.prevent_close() — let the window close after we
            // kill children. See Tauri issue #9198 for why we also need the
            // RunEvent::ExitRequested handler below (some macOS versions silently
            // skip one or the other).
            //
            // Phase 2 Plan 02-07 — drain in-flight imports BEFORE the existing
            // SessionRegistry kill. cancel_all() flips every CancellationToken
            // so spawned tokio tasks observe the cancel on their next
            // yield_now / await point and break out of the per-file loop.
            // import tasks are detached `tokio::spawn` tasks, so this call is
            // fire-and-forget — the kill_pgid drain that follows runs in
            // parallel with their teardown. No wait is needed because each
            // import task already drains its own registry entry before exiting.
            //
            // WR-003 fix (Phase 02.1 02.1-REVIEW): detach cancel_all via
            // tauri::async_runtime::spawn so the caller returns immediately
            // and the Tauri event loop is never blocked — mirrors the BL-01
            // discipline established in kill_pgid (lines 80-94). The token
            // flips inside cancel_all are themselves race-free; spawned tasks
            // observe them on their next yield. If cancel_all ever grows a
            // slow await (e.g. flushing import progress to disk on shutdown),
            // this detach is what keeps Cmd+Q from showing a spinning beach
            // ball. kill_all() still runs synchronously because it ALREADY
            // detaches its SIGTERM→SIGKILL leg via kill_pgid's thread::spawn.
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                let app = window.app_handle();
                let controller = app.state::<Arc<import_controller::ImportController>>();
                let c = controller.inner().clone();
                tauri::async_runtime::spawn(async move {
                    c.cancel_all().await;
                });
                app.state::<SessionRegistry>().kill_all();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            // Cmd+Q on macOS dispatches NSApplicationTerminate which Tauri 2
            // surfaces as RunEvent::ExitRequested. CloseRequested handler may
            // OR may not have already run; kill_all() is idempotent (drain_all
            // empties the map on first call, second invocation is a no-op).
            //
            // Phase 2 Plan 02-07 — mirror the import-controller drain. cancel_all
            // is idempotent: a second call after CloseRequested already flipped
            // every token is a no-op (each token's cancel() is itself idempotent
            // per tokio_util::sync::CancellationToken's contract).
            //
            // WR-003 fix (Phase 02.1 02.1-REVIEW): same detach as the
            // CloseRequested handler above — see that block's note for the
            // full rationale. The kernel still observes the token flips on
            // the next tokio yield; detaching keeps the Cmd+Q path off the
            // Tauri event loop in line with BL-01.
            if matches!(event, RunEvent::ExitRequested { .. }) {
                let controller = app.state::<Arc<import_controller::ImportController>>();
                let c = controller.inner().clone();
                tauri::async_runtime::spawn(async move {
                    c.cancel_all().await;
                });
                app.state::<SessionRegistry>().kill_all();
            }
        });
}
