// src-tauri/src/lib.rs — Tauri builder + subprocess lifecycle (D-10 hook union).
//
// Closes T-1-01 (zombie subprocess accumulation on Cmd+Q) by:
//   1. Storing spawned PIDs in a SessionRegistry HashMap (extension-friendly per RESEARCH §8 Risk 1).
//   2. Killing the entire process GROUP (not just the PID) via nix::killpg(getpgid(pid), SIGTERM)
//      → 2s grace → SIGKILL.
//   3. Hooking BOTH WindowEvent::CloseRequested and RunEvent::ExitRequested
//      (Tauri issue #9198: ExitRequested unreliable on some macOS versions).

mod session;

pub use session::{ChildHandle, SessionId, SessionRegistry};

use std::fs;
use std::thread;
use std::time::Duration;

use nix::sys::signal::{killpg, Signal};
use nix::unistd::{getpgid, Pid};
use tauri::{Manager, RunEvent, State, WindowEvent};

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
pub fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    if let Ok(pgid) = getpgid(Some(pid)) {
        let _ = killpg(pgid, Signal::SIGTERM);
        thread::sleep(Duration::from_secs(2));
        let _ = killpg(pgid, Signal::SIGKILL);
    }
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
// Tauri builder — hook union per D-10 (T-1-01 + T-1-18 mitigation).
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SessionRegistry::new())
        .invoke_handler(tauri::generate_handler![
            register_session_pid,
            clear_session_pid,
            stop_session
        ])
        .setup(|_app| {
            // Auto-create ~/.mneme/scratch/ on first launch (REQ-10 --add-dir target).
            // Idempotent — create_dir_all silently no-ops if path exists.
            if let Some(home) = home::home_dir() {
                let _ = fs::create_dir_all(home.join(".mneme/scratch"));
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Red-button close on the title bar dispatches WindowEvent::CloseRequested.
            // We do NOT call api.prevent_close() — let the window close after we
            // kill children. See Tauri issue #9198 for why we also need the
            // RunEvent::ExitRequested handler below (some macOS versions silently
            // skip one or the other).
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                window.app_handle().state::<SessionRegistry>().kill_all();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            // Cmd+Q on macOS dispatches NSApplicationTerminate which Tauri 2
            // surfaces as RunEvent::ExitRequested. CloseRequested handler may
            // OR may not have already run; kill_all() is idempotent (drain_all
            // empties the map on first call, second invocation is a no-op).
            if matches!(event, RunEvent::ExitRequested { .. }) {
                app.state::<SessionRegistry>().kill_all();
            }
        });
}
