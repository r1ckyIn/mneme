# .dev-logs/ — Dev feedback loop signal sink

Phase 01.1 scaffold (OpenSpec change `automate-dev-feedback-loop` group 1).

This directory captures **dev-only** observable signals so Claude can verify
changes without asking the user to read terminal output, paste logs, or open
DevTools. The contents are ephemeral debug telemetry, gitignored by design.

## Tracked files (in this directory, committed to git)

| File | Purpose |
|---|---|
| `.gitkeep` | Empty marker preserving the directory in git |
| `README.md` | This document |

## Ignored files (created at dev runtime; gitignored)

| File | Writer | Purpose |
|---|---|---|
| `dev-server.pid` | `verify.start-dev-loop` SDK handler | Process group id of the running Vite/Tauri dev server |
| `dev-server.port` | `verify.start-dev-loop` SDK handler | Port number (always `5173` per E4 errata — `strictPort: true` in `vite.config.ts`) |
| `tauri.log` | `cargo tauri dev` stdout/stderr via `tee` | Full Tauri runtime log stream |
| `console.log` | `dev_log_console_entry` Tauri command | Frontend console + uncaught errors + rejections + resource errors + CSP violations (8 signal classes per D-SF-02 + R6 errata) |
| `network.log` | `dev_log_network_entry` Tauri command | `fetch` + `XMLHttpRequest` request/response events |
| `perf.log` | `dev_log_perf_entry` Tauri command | `PerformanceObserver` LCP (Safari-fallback-aware) + FCP + CLS + longtask |
| `<file>.log.1` | Rust writer task (D-SF-03) | Single rotation backup; overwritten at 10 MB threshold |
| `screenshots/<iso-ts>.png` | `dev_capture_screenshot` Tauri command | Window or webview captures via `screencapture -l/-R` per E1 errata |

## How it surfaces

`/gsd-verify-work <phase>` invokes `gsd-sdk query verify.scan-signals` which
greps these files and returns a structured issue list. Execute-phase runs in
silence — signals accumulate here without interrupting the user. See
`openspec/changes/automate-dev-feedback-loop/` for the full design.
