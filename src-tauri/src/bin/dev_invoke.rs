// src-tauri/src/bin/dev_invoke.rs — D-TR-03 + E2 errata: dev-only CLI for
// invoking dev-feedback-loop commands from outside the running app.
//
// Build:
//   cd src-tauri && cargo build --bin dev-invoke --features dev-invoke
//
// Run:
//   target/debug/dev-invoke <command> [args...]
//
// Examples:
//   target/debug/dev-invoke dev_capture_screenshot webview
//   target/debug/dev-invoke dev_query_state
//
// Why this binary exists (E2 errata):
//   Tauri 2's CLI has 17 subcommands; `invoke` is NOT one of them. The
//   GSD SDK's npm-script bridge (plan 01.1-07) needs a host-shell entry
//   point that can reach `dev_*` functionality without an in-app round
//   trip. This binary takes argv and either (a) shells out to the same
//   syscalls the in-app Tauri command would (screencapture for the
//   webview surface) or (b) drops a request file the running app picks
//   up and replays via its own webview script-injection pipeline.
//
// Gating layers (defense in depth):
//   #![cfg(debug_assertions)] at file top — the body of `main` only
//                                            compiles in debug builds.
//   [[bin]] required-features = ["dev-invoke"] — release-profile builds
//                                                of the workspace never
//                                                opt into the feature,
//                                                so cargo build --release
//                                                does not even attempt
//                                                to compile this binary.

#![cfg(debug_assertions)]

use std::env;
use std::process::{Command, ExitCode};

const SCREENCAPTURE_BIN: &str = "/usr/sbin/screencapture";

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!(
            r#"{{"error":"usage: dev-invoke <command> [args...]","commands":["dev_capture_screenshot","dev_query_state","dev_log_console_entry","dev_log_network_entry","dev_log_perf_entry"]}}"#
        );
        return ExitCode::from(2);
    }

    let cmd = &args[1];
    let rest: Vec<String> = args.iter().skip(2).cloned().collect();

    let result: Result<String, String> = match cmd.as_str() {
        "dev_capture_screenshot" => {
            let scope = rest.first().cloned().unwrap_or_else(|| "webview".to_string());
            cli_capture_screenshot(&scope)
        }
        "dev_query_state" => {
            // Without a webview accessible from this fresh process we
            // cannot directly invoke the script-injection bridge that
            // the in-app command uses. Drop a request file the running
            // app polls (Phase 01.2 UDS upgrade replaces this fallback).
            let res = (|| -> Result<(), String> {
                let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
                let dev_logs = cwd.join(".dev-logs");
                std::fs::create_dir_all(&dev_logs).map_err(|e| e.to_string())?;
                std::fs::write(dev_logs.join("snapshot.request"), "1")
                    .map_err(|e| e.to_string())?;
                Ok(())
            })();
            match res {
                Ok(()) => Ok(
                    r#"{"hint":"snapshot request file written; tail .dev-logs/console.log for [snapshot] line"}"#
                        .to_string(),
                ),
                Err(e) => Err(e),
            }
        }
        "dev_log_console_entry" | "dev_log_network_entry" | "dev_log_perf_entry" => Err(format!(
            "{cmd} via CLI is not a v1 path — invoke from inside the running Tauri app"
        )),
        other => Err(format!("unknown command: {other}")),
    };

    match result {
        Ok(s) => {
            println!("{s}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            // Escape the error string into JSON for the SDK consumer.
            eprintln!(r#"{{"error":"{}"}}"#, e.replace('\\', "\\\\").replace('"', "\\\""));
            ExitCode::from(1)
        }
    }
}

/// CLI-mode screenshot — resolves the frontmost mneme window via osascript
/// then shells out to /usr/sbin/screencapture. Mirrors the in-app
/// `dev_capture_screenshot` E1 path; the only difference is the CGWindowID
/// resolution (osascript vs in-process objc2-app-kit) because this binary
/// runs in a fresh process with no Tauri context.
fn cli_capture_screenshot(scope: &str) -> Result<String, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let log_dir = cwd.join(".dev-logs/screenshots");
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let ts = app_lib::dev::iso8601_now().replace(':', "-");
    let out_path = log_dir.join(format!("{ts}.png"));

    match scope {
        "webview" | "window" | "Webview" | "Window" => {
            // osascript fallback to resolve the frontmost mneme window id.
            // This is intentionally simple — Phase 01.2's UDS path will
            // replace it with a synchronous IPC call to the running app.
            let osa_script = r#"tell application "System Events"
              try
                tell process "mneme"
                  return id of window 1
                end tell
              on error
                return -1
              end try
            end tell"#;
            let win_id_output = Command::new("osascript")
                .arg("-e")
                .arg(osa_script)
                .output()
                .map_err(|e| format!("osascript not available: {e}"))?;
            if !win_id_output.status.success() {
                return Err(format!(
                    "osascript failed: {}",
                    String::from_utf8_lossy(&win_id_output.stderr).trim()
                ));
            }
            let win_id = String::from_utf8_lossy(&win_id_output.stdout).trim().to_string();
            if win_id == "-1" || win_id.is_empty() {
                return Err("mneme window not frontmost (start cargo tauri dev first)".to_string());
            }
            let status = Command::new(SCREENCAPTURE_BIN)
                .arg("-l")
                .arg(&win_id)
                .arg("-x")
                .arg("-o")
                .arg(&out_path)
                .status()
                .map_err(|e| e.to_string())?;
            if !status.success() {
                return Err(format!("screencapture exited with {status}"));
            }
            out_path
                .to_str()
                .ok_or_else(|| "path not utf8".to_string())
                .map(|s| s.to_string())
        }
        other => Err(format!("unknown scope: {other}")),
    }
}
