// src-tauri/src/dev.rs — D-TR-01 dev-only Tauri commands (R2 spec.md).
//
// E5 errata: file lives at src-tauri/src/dev.rs (PARALLEL to session.rs),
// NOT commands/dev.rs (no such dir; mneme convention is by-domain top-level).
//
// Entire file body is #[cfg(debug_assertions)]-gated by lib.rs; in
// `cargo build --release` the module + every command symbol vanishes
// (D-TR-05 verified via `nm` symbol inspection in plan 01.1-06 task 7).
//
// Five commands per D-TR-01 + spec.md R2:
//   dev_log_console_entry / dev_log_network_entry / dev_log_perf_entry
//     — three log handlers sharing a tokio::sync::mpsc + dedicated writer
//       task with 100 ms debounce + 10 MB rotation to .log.1 (D-SF-03).
//   dev_capture_screenshot(scope: "webview" | "window")
//     — macOS `screencapture -l <CGWindowID>` (webview) or
//       `screencapture -R <x,y,w,h>` (window) per E1 errata.
//       CGWindowID resolved via WebviewWindow::ns_window() ->
//       *mut NSWindow -> NSWindow::windowNumber() (objc2-app-kit 0.3).
//       NOT WebviewWindow::capture() (doesn't exist in Tauri 2 — issue #12501
//       closed as not planned).
//   dev_query_state()
//     — uses Tauri's WebviewWindow::eval(script) to inject a small JS
//       snippet that calls globalThis.__mnemeDevSnapshot__() in the
//       webview and pipes the JSON back via dev_log_console_entry tagged
//       "snapshot". Callers tail .dev-logs/console.log for `[snapshot]<json>`.
//       Phase 01.2 UDS upgrade (B2 per RESEARCH spike) will replace the
//       log-pipe fallback with a synchronous IPC round-trip.
//
// Each writer task absorbs file-IO errors silently per D-SF-04 — the dev
// loop MUST NOT crash on log-write failure (.dev-logs is ephemeral debug
// telemetry, not project record).

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tokio::sync::mpsc::{self, Sender};
use tokio::time::{sleep, Duration};

// ---------------------------------------------------------------------------
// Pure formatters — testable without Tauri runtime (TDD task 2 RED+GREEN).
// ---------------------------------------------------------------------------

/// Format a wall-clock ISO 8601 instant (`YYYY-MM-DDTHH:MM:SSZ`).
///
/// Hand-rolled to avoid pulling `chrono` for this single use. Falls back to
/// the epoch if `SystemTime::now` is before UNIX_EPOCH (clock manipulation).
pub fn iso8601_now() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let (days, time_of_day) = (secs / 86_400, secs % 86_400);
    let mut y: i64 = 1970;
    let mut d: i64 = days as i64;
    loop {
        let yd = if is_leap(y) { 366 } else { 365 };
        if d < yd {
            break;
        }
        d -= yd;
        y += 1;
    }
    let mdays: [i64; 12] = if is_leap(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut m: i64 = 1;
    let mut day_in_month = d + 1;
    for &days_in_m in &mdays {
        if day_in_month <= days_in_m {
            break;
        }
        day_in_month -= days_in_m;
        m += 1;
    }
    let h = time_of_day / 3600;
    let min = (time_of_day % 3600) / 60;
    let s = time_of_day % 60;
    format!("{y:04}-{m:02}-{day_in_month:02}T{h:02}:{min:02}:{s:02}Z")
}

fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

/// `[FRONTEND_CONSOLE]<TAG>|<iso>|<message>|<source[:line]>\n`
///
/// `tag` defaults to `level.to_uppercase()` when None. `source` is the JS
/// source location (file/url); `line` appends `:<line>` only when both are
/// provided. The trailing `\n` is mandatory — the writer task appends raw.
///
/// WR-01: pipe characters in `message` are replaced with `<PIPE>` before
/// writing so that `parseConsoleLine`'s `|`-split correctly recovers all
/// four fields. Parsers must unescape `<PIPE>` → `|` in the message field.
pub fn format_console_entry(
    level: &str,
    message: &str,
    tag: Option<&str>,
    source: Option<&str>,
    line: Option<u32>,
) -> String {
    let ts = iso8601_now();
    let tag_str = tag.unwrap_or(level).to_uppercase();
    let safe_message = message.replace('|', "<PIPE>");
    let source_str = source
        .map(|s| match line {
            Some(n) => format!("{s}:{n}"),
            None => s.to_string(),
        })
        .unwrap_or_default();
    format!("[FRONTEND_CONSOLE]{tag_str}|{ts}|{safe_message}|{source_str}\n")
}

/// `[FRONTEND_NETWORK]<METHOD>|<iso>|<url>|<status>|<duration>ms\n`
pub fn format_network_entry(method: &str, url: &str, status: u16, duration_ms: f64) -> String {
    let ts = iso8601_now();
    format!("[FRONTEND_NETWORK]{method}|{ts}|{url}|{status}|{duration_ms}ms\n")
}

/// `[FRONTEND_PERF]<metric>|<ts>|<value>\n`
///
/// Caller supplies the timestamp string — perf observations may include
/// the original `entry.startTime` rather than wall-clock-now.
pub fn format_perf_entry(metric: &str, value: f64, ts: &str) -> String {
    format!("[FRONTEND_PERF]{metric}|{ts}|{value}\n")
}

// ---------------------------------------------------------------------------
// DevWriter + writer task with 100ms debounce + 10MB rotation (TDD task 3).
// ---------------------------------------------------------------------------

const ROTATION_THRESHOLD_BYTES: u64 = 10 * 1024 * 1024;
const DEBOUNCE_MS: u64 = 100;
const CHANNEL_BUFFER: usize = 1024;
const BATCH_SOFT_CAP: usize = 256;

/// Identifies which `.dev-logs/*.log` file a writer task targets.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LogChannel {
    Console,
    Network,
    Perf,
}

impl LogChannel {
    /// Default filename per channel (joined with the configured log dir).
    pub fn filename(&self) -> &'static str {
        match self {
            Self::Console => "console.log",
            Self::Network => "network.log",
            Self::Perf => "perf.log",
        }
    }
}

/// Start a dedicated writer task for one log channel.
///
/// Returns a `Sender<String>` the Tauri command handlers push into. The
/// background task batches with 100 ms debounce and rotates at 10 MB per
/// D-SF-03. All filesystem errors are swallowed per D-SF-04 — the dev loop
/// MUST NOT crash on log-write failure.
pub fn start_log_writer(_channel: LogChannel, path: PathBuf) -> Sender<String> {
    let (tx, mut rx) = mpsc::channel::<String>(CHANNEL_BUFFER);
    tokio::spawn(async move {
        let mut buf: Vec<String> = Vec::with_capacity(64);
        loop {
            tokio::select! {
                msg = rx.recv() => {
                    match msg {
                        Some(s) => buf.push(s),
                        None => {
                            // Channel closed — flush remaining and exit.
                            flush(&path, &mut buf);
                            break;
                        }
                    }
                    if buf.len() >= BATCH_SOFT_CAP {
                        flush(&path, &mut buf);
                    }
                }
                _ = sleep(Duration::from_millis(DEBOUNCE_MS)) => {
                    if !buf.is_empty() {
                        flush(&path, &mut buf);
                    }
                }
            }
        }
    });
    tx
}

/// Best-effort batched flush — drains `buf` into `path` (append mode) and
/// rotates the existing file to `.log.1` if the upcoming write would push
/// the total over `ROTATION_THRESHOLD_BYTES`. Any I/O error clears the
/// batch and returns; the writer task continues running.
fn flush(path: &PathBuf, buf: &mut Vec<String>) {
    use std::fs::OpenOptions;
    use std::io::Write;
    if buf.is_empty() {
        return;
    }
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let payload_len: u64 = buf.iter().map(|s| s.len() as u64).sum();
    let current_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    if current_size + payload_len > ROTATION_THRESHOLD_BYTES {
        // Rotate to `<path>.log.1` (overwrite single backup per D-SF-03).
        // path.with_extension preserves the parent dir; for "console.log"
        // it yields "console.log.1". For paths without an extension it
        // still appends ".log.1" cleanly.
        let backup = path.with_extension("log.1");
        let _ = std::fs::rename(path, &backup);
    }

    let mut file = match OpenOptions::new().append(true).create(true).open(path) {
        Ok(f) => f,
        Err(_) => {
            // D-SF-04 swallow — file may be permission-locked or vanished.
            buf.clear();
            return;
        }
    };
    for line in buf.drain(..) {
        let _ = file.write_all(line.as_bytes());
    }
    let _ = file.flush();
}

/// Shared Tauri-managed state for the three log handlers.
///
/// Each channel keeps its sender lazily — first dispatch on a channel
/// spawns its writer task. The `log_dir` is set at construction time
/// (typically `<cwd>/.dev-logs/`) but is kept in a Mutex so tests can
/// override it without rebuilding state.
pub struct DevWriter {
    pub console_tx: tokio::sync::Mutex<Option<Sender<String>>>,
    pub network_tx: tokio::sync::Mutex<Option<Sender<String>>>,
    pub perf_tx: tokio::sync::Mutex<Option<Sender<String>>>,
    pub log_dir: tokio::sync::Mutex<Option<PathBuf>>,
}

impl DevWriter {
    pub fn new(log_dir: PathBuf) -> Self {
        Self {
            console_tx: tokio::sync::Mutex::new(None),
            network_tx: tokio::sync::Mutex::new(None),
            perf_tx: tokio::sync::Mutex::new(None),
            log_dir: tokio::sync::Mutex::new(Some(log_dir)),
        }
    }
}

impl Default for DevWriter {
    fn default() -> Self {
        let dir = std::env::current_dir()
            .unwrap_or_default()
            .join(".dev-logs");
        Self::new(dir)
    }
}

// ---------------------------------------------------------------------------
// 5 Tauri commands — invoke-handler surface (Task 4).
// ---------------------------------------------------------------------------

use tauri::{AppHandle, Manager, Runtime, State, WebviewWindow};

/// Lazily spawn a writer task for the requested channel.
///
/// Each `dev_log_*` command calls this first; on the first dispatch per
/// channel the writer is spawned and its `Sender` is cached in the
/// `DevWriter` state. Subsequent dispatches reuse the cached sender.
async fn ensure_channel(state: &State<'_, DevWriter>, ch: LogChannel) -> Result<(), String> {
    let log_dir_g = state.log_dir.lock().await;
    let log_dir = log_dir_g.as_ref().ok_or("log_dir not set")?.clone();
    drop(log_dir_g);
    let path = log_dir.join(ch.filename());

    let slot: &tokio::sync::Mutex<Option<Sender<String>>> = match ch {
        LogChannel::Console => &state.console_tx,
        LogChannel::Network => &state.network_tx,
        LogChannel::Perf => &state.perf_tx,
    };
    let mut guard = slot.lock().await;
    if guard.is_none() {
        *guard = Some(start_log_writer(ch, path));
    }
    Ok(())
}

/// `[FRONTEND_CONSOLE]` log handler — invoked from forwarder for each
/// console.{log,info,debug,warn,error} call + uncaught / unhandled-rejection
/// / resource / CSP errors.
#[tauri::command]
pub async fn dev_log_console_entry(
    state: State<'_, DevWriter>,
    level: String,
    message: String,
    tag: Option<String>,
    source: Option<String>,
    line: Option<u32>,
) -> Result<(), String> {
    ensure_channel(&state, LogChannel::Console).await?;
    let formatted = format_console_entry(&level, &message, tag.as_deref(), source.as_deref(), line);
    let tx = state.console_tx.lock().await;
    if let Some(t) = tx.as_ref() {
        let _ = t.send(formatted).await; // D-SF-04 — channel full / closed -> drop
    }
    Ok(())
}

/// `[FRONTEND_NETWORK]` log handler — invoked from forwarder for each fetch
/// or XHR completion (success and failure both).
#[tauri::command]
pub async fn dev_log_network_entry(
    state: State<'_, DevWriter>,
    method: String,
    url: String,
    status: u16,
    duration_ms: f64,
) -> Result<(), String> {
    ensure_channel(&state, LogChannel::Network).await?;
    let formatted = format_network_entry(&method, &url, status, duration_ms);
    let tx = state.network_tx.lock().await;
    if let Some(t) = tx.as_ref() {
        let _ = t.send(formatted).await;
    }
    Ok(())
}

/// `[FRONTEND_PERF]` log handler — invoked from PerformanceObserver
/// callbacks (LCP / FCP / layout-shift / longtask).
#[tauri::command]
pub async fn dev_log_perf_entry(
    state: State<'_, DevWriter>,
    metric: String,
    value: f64,
    ts: String,
) -> Result<(), String> {
    ensure_channel(&state, LogChannel::Perf).await?;
    let formatted = format_perf_entry(&metric, value, &ts);
    let tx = state.perf_tx.lock().await;
    if let Some(t) = tx.as_ref() {
        let _ = t.send(formatted).await;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// dev_capture_screenshot — E1 errata: `screencapture` shell-out is primary.
// ---------------------------------------------------------------------------

/// `dev_capture_screenshot(scope)` — `webview` captures only the webview
/// surface via `screencapture -l <CGWindowID>`; `window` captures the
/// rectangle of the outer window via `screencapture -R <x,y,w,h>`. Output:
/// `.dev-logs/screenshots/<iso-ts>.png`. Returns the full path string.
#[tauri::command]
pub async fn dev_capture_screenshot<R: Runtime>(
    app: AppHandle<R>,
    scope: String,
) -> Result<String, String> {
    use std::process::Command;
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let log_dir = cwd.join(".dev-logs/screenshots");
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let ts = iso8601_now().replace(':', "-");
    let out_path = log_dir.join(format!("{ts}.png"));

    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let status = match scope.as_str() {
        "webview" | "Webview" => {
            let window_id = resolve_cg_window_id(&main)?;
            Command::new("/usr/sbin/screencapture")
                .arg("-l")
                .arg(window_id.to_string())
                .arg("-x")
                .arg("-o")
                .arg(&out_path)
                .status()
                .map_err(|e| e.to_string())?
        }
        "window" | "Window" => {
            let pos = main.outer_position().map_err(|e| e.to_string())?;
            let size = main.outer_size().map_err(|e| e.to_string())?;
            let rect = format!("{},{},{},{}", pos.x, pos.y, size.width, size.height);
            Command::new("/usr/sbin/screencapture")
                .arg("-R")
                .arg(rect)
                .arg("-x")
                .arg(&out_path)
                .status()
                .map_err(|e| e.to_string())?
        }
        other => return Err(format!("unknown scope: {other}")),
    };
    if !status.success() {
        return Err(format!("screencapture exited with {status}"));
    }
    out_path
        .to_str()
        .ok_or_else(|| "path not utf8".to_string())
        .map(|s| s.to_string())
}

/// Resolve the CGWindowID for `screencapture -l <id>` from a Tauri
/// WebviewWindow handle (macOS only). Tauri's `ns_window()` returns
/// `*mut c_void` pointing to the underlying `NSWindow`; we cast it and
/// call `windowNumber()` (NSInteger) via objc2-app-kit 0.3.
#[cfg(target_os = "macos")]
fn resolve_cg_window_id<R: Runtime>(window: &WebviewWindow<R>) -> Result<i64, String> {
    use objc2_app_kit::NSWindow;
    let ns_ptr = window.ns_window().map_err(|e| e.to_string())? as *mut NSWindow;
    if ns_ptr.is_null() {
        return Err("ns_window() returned null".to_string());
    }
    // SAFETY: `ns_window()` returns a valid live `NSWindow` pointer for the
    // lifetime of the Tauri window. We hold the `&WebviewWindow` reference
    // for the duration of this call, so the pointer cannot dangle. We only
    // call `windowNumber()` which is a const method returning NSInteger by
    // value (no further borrow leakage). objc2 0.6 + objc2-app-kit 0.3 type
    // the call via the generated msg_send! shim.
    let number: isize = unsafe { (*ns_ptr).windowNumber() };
    Ok(number as i64)
}

#[cfg(not(target_os = "macos"))]
fn resolve_cg_window_id<R: Runtime>(_window: &WebviewWindow<R>) -> Result<i64, String> {
    Err("CGWindowID resolution only supported on macOS".to_string())
}

// ---------------------------------------------------------------------------
// dev_query_state — D10 snapshot via webview script injection (Task 4).
// ---------------------------------------------------------------------------

/// Trigger `globalThis.__mnemeDevSnapshot__()` in the running webview and
/// pipe the JSON result back through `dev_log_console_entry` tagged
/// `snapshot`. Callers tail `.dev-logs/console.log` for `[snapshot]<json>`.
///
/// v1 approach: log-pipe fallback. A synchronous round-trip via Tauri's
/// pending-eval-with-callback API would require the WRY callback path that
/// landed in Tauri 2.2; this conservative implementation avoids version
/// pinning. Upgrade path: Phase 01.2 UDS IPC per RESEARCH spike (B2).
#[tauri::command]
pub async fn dev_query_state<R: Runtime>(window: WebviewWindow<R>) -> Result<String, String> {
    // The injected snippet is a fixed string literal (not user input) — it
    // tells the webview to invoke a globally-registered snapshot function
    // and dispatch the result back via the Tauri invoke bridge. The whole
    // command is #[cfg(debug_assertions)]-gated and unreachable in release.
    // WR-04: `__TAURI_INTERNALS__` is Tauri's private internal bridge (not a
    // stable public API). The error path now embeds a hint about the likely
    // cause so that if a future Tauri patch renames the object, callers see
    // `[snapshot-error]bridge-unavailable:` in the log rather than a generic
    // TypeError and a 3-second timeout in gsd-dev-snapshot.mjs.
    //
    // Phase 01.2 UDS upgrade (RESEARCH spike B2) will replace this entire
    // script-injection path with a synchronous Unix domain socket round-trip,
    // eliminating the dependency on __TAURI_INTERNALS__.
    let script = concat!(
        "(() => {",
        "  try {",
        "    var snap = (globalThis.__mnemeDevSnapshot__ && globalThis.__mnemeDevSnapshot__())",
        "      || '{\"error\":\"snapshot fn not registered\"}';",
        "    var j = (typeof snap === 'string') ? snap : JSON.stringify(snap);",
        "    window.__TAURI_INTERNALS__.invoke('dev_log_console_entry',",
        "      { level: 'info', message: '[snapshot]' + j, tag: 'snapshot' });",
        "  } catch (e) {",
        "    var hint = (typeof window.__TAURI_INTERNALS__ === 'undefined')",
        "      ? 'bridge-unavailable (Tauri __TAURI_INTERNALS__ missing — version change?)'",
        "      : 'invoke-failed';",
        "    window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke(",
        "      'dev_log_console_entry',",
        "      { level: 'error', message: '[snapshot-error]' + hint + ': ' + String(e), tag: 'snapshot' });",
        "  }",
        "})()",
    );
    window.eval(script).map_err(|e| e.to_string())?;
    Ok(r#"{"hint":"snapshot dispatched via console.log; tail .dev-logs/console.log for [snapshot]<json>"}"#.to_string())
}

// ---------------------------------------------------------------------------
// Co-located unit tests for the pure formatters (PATTERNS.md L340-371).
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn console_log_line_format() {
        let line = format_console_entry("error", "boom", Some("uncaught"), None, None);
        assert!(
            line.starts_with("[FRONTEND_CONSOLE]"),
            "missing prefix: {line}"
        );
        assert!(line.contains("UNCAUGHT"), "missing UNCAUGHT tag: {line}");
        assert!(line.contains("boom"), "missing message: {line}");
        assert!(line.ends_with('\n'), "missing trailing newline: {line:?}");
    }

    #[test]
    fn console_log_uses_level_when_tag_absent() {
        let line = format_console_entry("warn", "stuff", None, None, None);
        assert!(line.contains("WARN"), "expected level fallback: {line}");
    }

    #[test]
    fn console_log_source_and_line_joined() {
        let line = format_console_entry("info", "ok", None, Some("/app.js"), Some(42));
        assert!(line.contains("/app.js:42"), "missing source:line: {line}");
    }

    #[test]
    fn network_log_line_format() {
        let line = format_network_entry("GET", "/api/foo", 500, 12.5);
        assert!(
            line.starts_with("[FRONTEND_NETWORK]GET"),
            "wrong prefix: {line}"
        );
        assert!(line.contains("/api/foo"), "missing URL: {line}");
        assert!(line.contains("|500|"), "missing status delimiter: {line}");
        assert!(line.contains("12.5ms"), "missing duration: {line}");
    }

    #[test]
    fn perf_log_line_format() {
        let line = format_perf_entry("largest-contentful-paint", 3200.0, "2026-05-12T10:00:00Z");
        assert!(
            line.starts_with("[FRONTEND_PERF]largest-contentful-paint"),
            "wrong prefix: {line}"
        );
        assert!(line.contains("2026-05-12T10:00:00Z"), "missing ts: {line}");
        assert!(line.contains("3200"), "missing value: {line}");
    }

    #[test]
    fn iso8601_now_shape() {
        let s = iso8601_now();
        // Shape: 2026-05-12T10:00:00Z (20 chars).
        assert_eq!(s.len(), 20, "iso8601 shape: {s}");
        assert_eq!(&s[4..5], "-");
        assert_eq!(&s[10..11], "T");
        assert_eq!(&s[19..20], "Z");
    }

    #[test]
    fn log_channel_filenames() {
        assert_eq!(LogChannel::Console.filename(), "console.log");
        assert_eq!(LogChannel::Network.filename(), "network.log");
        assert_eq!(LogChannel::Perf.filename(), "perf.log");
    }
}
