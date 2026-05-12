> **Execution order rationale**: Groups 5-7 (GSD upstream) land BEFORE groups 1-4 (mneme-side) so the patched verify-work workflow can self-validate when `/gsd-verify-work 01.1` runs against this very phase. The SDK handlers and HTML template must exist before mneme-side capability needs them.

## 1. mneme: `.dev-logs/` scaffold

- [x] 1.1 Add `.dev-logs/` to `.gitignore` (single new line; verify no existing entry)
- [x] 1.2 Create `.dev-logs/.gitkeep` + `.dev-logs/README.md` (explains contents: `dev-server.pid`, `dev-server.port`, `tauri.log`, `console.log`, `network.log`, `perf.log` + `.log.1` rotation backups, `screenshots/` subdirectory; all gitignored)

## 2. mneme: Svelte full-spectrum forwarder

- [x] 2.1 Create `src/lib/dev/console-forwarder.ts` exporting `installConsoleForwarder()` that monkey-patches `console.log/info/debug/warn/error` (5 levels, original references preserved via closure capture)
- [x] 2.2 Add `window.onerror` + `window.onunhandledrejection` handlers writing tag `uncaught` / `unhandled-rejection`
- [x] 2.3 Add capture=true `window.addEventListener('error', ...)` for resource-load failures (`<img>` / `<script>` / `<link>` etc.) with tag `resource-error`
- [x] 2.4 Add `document.addEventListener('securitypolicyviolation', ...)` with tag `csp`
- [x] 2.5 Add global `fetch` wrap preserving original reference (method / url / status / duration → `dev_log_network_entry`)
- [x] 2.6 Add `XMLHttpRequest.prototype.open` + `send` monkey-patch (same fields, same log)
- [x] 2.7 Add `PerformanceObserver` for `largest-contentful-paint` / `paint` (FCP) / `layout-shift` / `longtask` → `dev_log_perf_entry`
- [x] 2.8 In `src/routes/+layout.svelte`, add `import.meta.env.DEV`-guarded import + call to `installConsoleForwarder()`
- [x] 2.9 Under the same dev-only guard, register `globalThis.__mnemeDevSnapshot__()` returning `{ url, title, viewport, performance, dom_summary, computed_styles, ts }`. The KD-13-relevant selector set lives at `src/lib/dev/snapshot-selectors.ts` (separate file imported here)
- [x] 2.10 Run `npm run build` and grep dist output for `installConsoleForwarder` / `__mnemeDevSnapshot__` / `[FRONTEND_CONSOLE]` / `[FRONTEND_NETWORK]` / `[FRONTEND_PERF]` — all must be absent
- [x] 2.11 Dev-mode smoke test: throw `Error('forwarder smoke')` in a component → confirm 200 ms appearance in `.dev-logs/console.log`; intentional `fetch('/bad-url')` → see entry in `.dev-logs/network.log`; intentional `<img src="/missing.png">` → see `resource-error` entry

## 3. mneme: Tauri Rust dev commands + CLI invocation mode

- [x] 3.0 **Spike**: investigate CLI invocation paths for Tauri 2 commands. Try in order until one works: (a) `tauri invoke <name>` CLI native, (b) custom dev-only binary `src-tauri/src/bin/dev_invoke.rs` exposing the commands, (c) `node -e` calling Tauri JS API. Record decision in `.planning/phases/01.1-.../01.1-SUMMARY.md` once committed
- [x] 3.1 Create `src-tauri/src/commands/dev.rs` (entire file `#[cfg(debug_assertions)]`-gated)
- [x] 3.2 Implement `dev_log_console_entry(level, message, tag, source, line)` — append to `.dev-logs/console.log`
- [x] 3.3 Implement `dev_log_network_entry(method, url, status, duration_ms)` — append to `.dev-logs/network.log`
- [x] 3.4 Implement `dev_log_perf_entry(metric, value, ts)` — append to `.dev-logs/perf.log`
- [x] 3.5 Three log commands share a 100 ms debounced batch-write worker (`tokio::sync::mpsc` + dedicated writer task) using `OpenOptions::new().append(true).create(true)`; before each append, if file > 10 MB rename to `<file>.log.1` (overwriting prior backup) and start fresh
- [x] 3.6 Implement `dev_capture_screenshot(scope: ScreenshotScope) -> Result<String, String>` (enum `Webview` | `Window`): primary Tauri 2 `WebviewWindow::capture()`, fallback macOS `screencapture -l/-R`; output `.dev-logs/screenshots/<ISO-ts>.png`
- [x] 3.7 Implement `dev_query_state() -> Result<String, String>` via Tauri's script-evaluation API invoking `JSON.stringify(globalThis.__mnemeDevSnapshot__())`
- [x] 3.8 Wire chosen CLI invocation mechanism (per 3.0 spike result) for all five commands — verify each is callable from shell and returns valid output to stdout
- [x] 3.9 Register all five commands via SSOT path — extend `scripts/gen-capabilities.ts`, regenerate `src-tauri/capabilities/default.json`, confirm SSOT-drift audit passes; do NOT hand-edit `default.json`
- [x] 3.10 Add `.catch(() => {})` around every invoke call in the Svelte forwarder (group 2) so log-write failures never crash forwarder execution
- [x] 3.11 Release-build verification: build release binary, confirm `dev.rs` symbols absent (`cargo bloat` or equivalent)

## 4. mneme: npm-script bridge

- [x] 4.1 Add `gsd-dev-screenshot` script to `package.json` accepting `--surface webview|window` arg, invoking the CLI mechanism from 3.0, printing PNG path to stdout
- [x] 4.2 Add `gsd-dev-snapshot` script invoking the state-query CLI mode, printing JSON to stdout
- [x] 4.3 Add `gsd-dev-scan-logs` script accepting `--since <iso-ts>` arg, greps `.dev-logs/{console,network,perf}.log` + `tauri.log` for entries newer than the timestamp, prints structured JSON issue list to stdout
- [x] 4.4 Each script MUST exit non-zero with structured stderr error JSON when the dev server is not running (`{"error": "dev server not running", "hint": "..."}`)
- [x] 4.5 Smoke test each script standalone (dev server up, dev server down) — confirms both happy path and structured error path

## 5. GSD upstream: `verify-work.md` three patches

- [x] 5.0 Back up `~/.claude/get-shit-done/workflows/verify-work.md` to `verify-work.md.bak` (so the change is revertable)
- [x] 5.1 **Patch 1**: expand `automated_ui_verification` step (existing, lines ~89-123) to detect Tauri-shell capability (probe via `npm run gsd-dev-screenshot --dry-run` or equivalent) and add a Tauri branch calling `verify.scan-signals` + `verify.capture-screenshot --surface tauri` + `verify.query-dom-state --surface tauri`
- [x] 5.2 **Patch 2**: insert new step `package_manual_review` between `automated_ui_verification` and `present_test`. Logic per design D12 patch 2: group queued-for-manual items by 4-bucket → `verify.render-review-html` → `verify.validate-html` → present path to user → wait for response → `verify.parse-review-response`. The existing `present_test` path remains as fallback
- [x] 5.3 **Patch 3**: add new `<critical_rules>` block at workflow top with 5 rules (no asking console/terminal/log/DOM; data-bucket whitelist; concrete anchors; reassurance header; fresh HTML each run)
- [x] 5.4 Verify patched workflow still parses (no markdown structural break)

## 6. GSD upstream: SDK eight `verify.*` handlers

- [x] 6.0 Read GSD SDK source to determine handler registration mechanism (auto-discovery by file naming OR explicit allow-list in router). Document the answer in 01.1-SUMMARY.md once known
- [x] 6.1 Implement `verify.start-dev-loop <phase> [--surface chromium|tauri]` — start dev server in background, write PID/port files to `.dev-logs/`, return JSON state
- [x] 6.2 Implement `verify.stop-dev-loop` — read PID file, `kill -TERM`, unlink state files
- [x] 6.3 Implement `verify.scan-signals [--since <iso-ts>]` — for the current project, shell out to `npm run gsd-dev-scan-logs --since <ts>` and return structured issue list
- [x] 6.4 Implement `verify.capture-screenshot --surface <s>` — Chromium: call `mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot`; Tauri: shell out to `npm run gsd-dev-screenshot --surface <window|webview>`; return path
- [x] 6.5 Implement `verify.query-dom-state --surface <s>` — analogous structure to 6.4 but using `gsd-dev-snapshot` for Tauri / chrome-devtools-mcp evaluate for Chromium
- [x] 6.6 Implement `verify.render-review-html --phase <N> --auto-verified <yaml> --buckets <yaml>` — read `templates/visual-review.html` (group 7), fill the header and 4-bucket slots, write to `.planning/handoff/<date>-phase-<N>-verify.html`, return path
- [x] 6.7 Implement `verify.parse-review-response --path <p>` — read the file (which the user may have annotated or replied alongside), best-effort extract structured issues; supports free-form text input via an LLM-extraction sub-call
- [x] 6.8 Implement `verify.validate-html --path <p>` — parse HTML, assert every `<section>` has `data-bucket` in `visual|window|motion|perf`, scan for forbidden tags (`hybrid`/`terminal`/`console`/`dom-check`/`log-paste`/`command-run`), exit non-zero with structured error JSON on failure
- [x] 6.9 Register all 8 handlers per mechanism discovered in 6.0
- [x] 6.10 Smoke test each handler by invoking `gsd-sdk query verify.<name> --help` (or equivalent) and confirming the handler is found and parameters validate

## 7. GSD upstream: `visual-review.html` template

- [x] 7.1 Create `~/.claude/get-shit-done/templates/visual-review.html` with: header slot (Task / Surface / "Claude has auto-verified" checklist) + four `<section data-bucket="visual|window|motion|perf">` slots
- [x] 7.2 Add inline top-of-file documentation comment listing forbidden buckets (`hybrid` / `terminal` / `console` / `dom-check` / `log-paste` / `command-run`) and forbidden phrasings ("open DevTools", "run ps aux", "paste the log", etc.)
- [x] 7.3 Add 4 example `<article>` question blocks (one per bucket) inside HTML comments showing the expected fill pattern for `verify.render-review-html`
- [x] 7.4 Apply default KD-13-family visual styling (warm palette, serif, soft borders); accept per-project override at `templates/visual-review.local.html` if dropped

## 8. mneme: dependencies + CLAUDE.md registration

- [x] 8.1 In `.planning/dependencies.md` add new group "External dev tools (MCP servers + macOS CLIs)" listing `chrome-devtools-mcp`, `playwright` MCP, `screencapture`, `lsof`, `tee` (minimum macOS Ventura 13.4); cross-reference this openspec change name
- [x] 8.2 In mneme `CLAUDE.md`, under `## Patterns` (or equivalent existing section, NOT `## Skills`), add a one-row pointer entry: "`dev-feedback-loop` — verify-work-anchored UI dev loop. Rule layer in GSD upstream (`~/.claude/get-shit-done/workflows/verify-work.md`); mneme-side capability via `src/lib/dev/console-forwarder.ts` + `src-tauri/src/commands/dev.rs` + `gsd-dev-*` npm scripts. See `openspec/changes/automate-dev-feedback-loop/` for full spec."

## 9. Dogfood validation (bootstrapping)

- [x] 9.1 Identify a small Phase 1 remainder UI sub-task (likely within `01-07 Task 4 VISUAL` rows that can be done piecemeal) to serve as the first dogfood target after Phase 01.1 ships
- [x] 9.2 Run `/gsd-verify-work 01.1` on the just-completed Phase 01.1 itself (bootstrapping: the patched workflow runs against the phase that patched it). This is the canonical self-test
- [x] 9.3 Verify end-to-end: `automated_ui_verification` detects mneme's npm-script bridge → Tauri branch runs → `verify.scan-signals` returns issue list → `verify.render-review-html` produces a 4-bucket HTML → `verify.validate-html` passes → user receives one HTML path, replies once
- [x] 9.4 Collect findings: Did Claude ever attempt to ask a forbidden question? Did the HTML accidentally contain a `hybrid`/`terminal`/etc. bucket? Was `verify.parse-review-response` extraction reliable on the user's free-form reply?
- [x] 9.5 Apply one tuning pass to either the GSD upstream files (patches / handlers / template) OR the mneme-side code based on findings — but NOT changing the openspec spec itself unless a Requirement was genuinely wrong
- [x] 9.6 Record findings in `.planning/notes/dev-feedback-loop-audit-202605.md`: what worked, what tuned, residual risk for Tier C hook escalation trigger

## 10. Wrap-up

- [x] 10.1 Run `openspec validate automate-dev-feedback-loop --strict` and confirm all four artifacts parse
- [x] 10.2 Commit on a feature branch `chore/openspec-automate-dev-feedback-loop` (cross-cutting, not a ROADMAP-business phase). Note: GSD upstream files in `~/.claude/get-shit-done/` are user-global and not in this repo — they need their own commit history if user maintains GSD as a git checkout, OR a brief note in 01.1-SUMMARY.md recording the diff manually
- [x] 10.3 Open PR for the mneme-repo portion (groups 1-4 + 8 + 9 changes)
- [x] 10.4 After merge, run `/opsx:archive` to write `specs/dev-feedback-loop/spec.md` into `openspec/specs/dev-feedback-loop/spec.md` as the cross-phase SSOT
- [ ] 10.5 (Future) draft upstream PR to `gsd-build/get-shit-done` containing groups 5, 6, 7 (verify-work.md patches + 8 SDK handlers + visual-review.html template). This is a follow-up after mneme dogfood proves the loop holds — explicitly NOT part of Phase 01.1's `done` criterion
