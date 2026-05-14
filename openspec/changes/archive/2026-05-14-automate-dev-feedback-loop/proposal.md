## Why

Today Claude's UI-feature loop dumps mechanical work on the user: "run `npm run dev` in another terminal", "open the console and paste the errors", "send me a screenshot", "paste the cargo output". The user is forced to act as a clipboard between Claude and the dev tools — every one of those steps is automatable. The result is wasted human attention on terminal-mediated work, and silent regressions when Claude declares a UI change "complete" without ever reading the console it produced.

The only inputs that genuinely need a human are four: **visual fidelity**, **window chrome**, **animation feel**, **perceived performance**. Everything else is deterministic observation Claude can do itself.

Two design constraints further shape this change:

1. **Tauri shell (macOS WKWebView) does not expose CDP.** Historically that has been why Claude was blind in the Tauri-shell surface. The workaround: forward observable signals (any-level console output / network requests / resource errors / CSP violations / Performance API metrics) out of the webview to a log file via dev-only Svelte + Tauri command plumbing, and let Claude actively retrieve screenshots and DOM state through dev-only Tauri commands.

2. **Human interruptions should be batched, not streamed.** Stopping the user mid-execute to ask "does this look right?" wastes both Claude's execute momentum and the user's attention. All human verification belongs at the phase-end `/gsd-verify-work` gate — packaged once as a Visual Review HTML document, not asked question-by-question through chat.

This change makes the second point a **GSD upstream workflow rule**, not a mneme-local convention — so all r1ckyIn projects inherit the same discipline once landed, and the change feeds a future upstream PR to `gsd-build/get-shit-done`.

## What Changes

This change is **cross-repo cross-cutting**. It spans two scopes:

### A. mneme-side additions (project-local code)

- **Full-spectrum dev-only Svelte forwarder** at `src/lib/dev/console-forwarder.ts` (and registered in `src/routes/+layout.svelte` under `import.meta.env.DEV`). Intercepts `console.log/info/debug/warn/error` across all five levels, `window.onerror`, `unhandledrejection`, resource load failures (`<img>` / `<script>` / `<link>` `error` events with capture=true), CSP violations, `fetch` + `XMLHttpRequest`, and `PerformanceObserver` metrics (LCP / FCP / CLS / longtask). Each signal goes through a Tauri command and lands in `.dev-logs/{console,network,perf}.log`. The full file tree is stripped from production builds.

- **Dev-only Tauri Rust commands** at `src-tauri/src/commands/dev.rs` (`#[cfg(debug_assertions)]`-gated, fully absent from release binaries):
  - `dev_log_console_entry` / `dev_log_network_entry` / `dev_log_perf_entry` — three log-append handlers with 100 ms debounced batched writer and 10 MB rotation.
  - `dev_capture_screenshot(scope: "webview" | "window")` — captures the current Tauri window to `.dev-logs/screenshots/<ISO-ts>.png` via Tauri 2 `WebviewWindow::capture()` (primary) or macOS-native `screencapture -l/-R` (fallback).
  - `dev_query_state()` — invokes the Svelte-side `globalThis.__mnemeDevSnapshot__()` via Tauri's script-evaluation API and returns `{ url, title, viewport, performance, dom_summary, computed_styles, ts }` as JSON.
  - **All five commands also expose a CLI invocation mode** (via a tiny dev-only Rust binary or by being callable through `tauri invoke <name>`), so external processes — specifically the GSD SDK — can reach them through the npm-script bridge without an in-app round trip.

- **npm script bridge** in `package.json`: `gsd-dev-screenshot` / `gsd-dev-snapshot` / `gsd-dev-scan-logs` scripts that wrap the Tauri CLI invocations. This is the cross-project protocol GSD SDK uses to call into each project's Tauri capability without project-specific code.

- `.dev-logs/` added to `.gitignore`; `.dev-logs/README.md` documents its contents. Tauri capabilities registered via the SSOT path (`scripts/gen-capabilities.ts` → `src-tauri/capabilities/default.json` regenerated).

### B. GSD upstream additions (workflow + SDK + template)

These edits live in `~/.claude/get-shit-done/`, not in the mneme repo. The change includes them because they are the rule layer that makes A meaningful, and because the design intent is to feed an upstream PR to `gsd-build/get-shit-done` once dogfood proves the loop holds.

- **`workflows/verify-work.md` — three patches:**
  1. Expand `automated_ui_verification` step (already present, covers Chromium / Playwright-MCP) to add a Tauri-shell branch: `gsd-sdk query verify.scan-signals` + `verify.capture-screenshot` + `verify.query-dom-state`.
  2. Replace the default `present_test` path with a new `package_manual_review` step: instead of asking the user one test at a time in conversation, generate a single Visual Review HTML at `.planning/handoff/<date>-phase-<N>-verify.html`, present its path, wait for the user's batch response.
  3. New `<critical_rules>` block forbidding any question that would have the user read the console, run a terminal command, inspect the DOM, or paste a log — those signals MUST be obtained through the SDK handlers instead.

- **`templates/visual-review.html` — new file.** The 4-bucket Visual Review HTML template all projects share. Header has a `Claude has auto-verified` reassurance checklist (console / network / resource errors / CSP / performance / automated checks); body has four `<section data-bucket="visual|window|motion|perf">` slots. Forbidden tags (`hybrid` / `terminal` / `console` / `dom-check` / `log-paste` / `command-run`) are documented inline and validated by SDK.

- **`lib/sdk/handlers/verify-*.{ts,js}` — eight new SDK query handlers** registered under `gsd-sdk query verify.*`:
  - `verify.start-dev-loop <phase> [--surface chromium|tauri]` — start dev server in background, write PID/port to `.dev-logs/`, return startup state.
  - `verify.stop-dev-loop` — kill PID, unlink state files.
  - `verify.scan-signals --since <iso-ts>` — grep `.dev-logs/{console,network,perf}.log` + `tauri.log`, return structured issue list (severity-tagged).
  - `verify.capture-screenshot --surface <s>` — calls the project's npm-script bridge (Tier D) or, for Chromium surface, `mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot`. Returns PNG path.
  - `verify.query-dom-state --surface <s>` — same bridge model. Returns the DOM/perf JSON snapshot.
  - `verify.render-review-html --phase <N> --auto-verified <yaml> --buckets <yaml>` — renders `templates/visual-review.html` to `.planning/handoff/<date>-phase-<N>-verify.html` with the auto-verified checklist and 4-bucket question sections filled.
  - `verify.parse-review-response --path <p>` — parses the user's reply to the review HTML (which they may edit in place or summarize in chat) into structured issues.
  - `verify.validate-html --path <p>` — enforces that the HTML's `data-bucket` attributes are all in the allowed 4 and no forbidden tag (`hybrid` / `terminal` / `console` / `dom-check` / etc.) appears.

### Out of this change (deferred to a separate future phase)

- **Hook-level hard enforcement** (originally Tier C in scoping). A `PreToolUse` shell guard that grep-scans Claude's drafted Write content for forbidden keywords and BLOCKS the tool call. Soft constraint (Claude self-regulating per verify-work workflow + SDK `verify.validate-html` rejecting non-conforming HTML) is judged sufficient for v1; hook-level hard enforcement re-evaluated after 3-5 verify cycles. If escalation is needed, a dedicated phase `mneme-or-r1ckyin-NN-verify-do-not-ask-hardening` covers it.

- **Visual Review HTML response parsing UX.** v1 has the user reply free-form in chat; `verify.parse-review-response` does best-effort extraction. A richer in-HTML form-submission UX (the HTML POSTs structured JSON back) is out of scope.

## Capabilities

### New Capabilities
- `dev-feedback-loop`: the cross-repo contract for who-does-what in the verify-work-anchored UI loop — Claude owns dev-server lifecycle and full-spectrum signal capture (Chromium via chrome-devtools-mcp, Tauri shell via Svelte forwarder + Tauri commands), automated check execution, Tauri-window screenshotting, DOM/state querying, and Visual Review HTML packaging; the human owns only the four-bucket judgments (visual / window / motion / perf), batched once per `/gsd-verify-work` invocation, never streamed mid-execute.

### Modified Capabilities
*(none — this is the first openspec change in the repo)*

## Impact

### mneme repo

- **New files**: `src/lib/dev/console-forwarder.ts`, `src/lib/dev/snapshot-selectors.ts`, `src-tauri/src/commands/dev.rs`, `.dev-logs/.gitkeep`, `.dev-logs/README.md`. Possibly a small Rust binary or shell stubs under `scripts/` for the CLI invocation mode of Tauri dev commands.
- **Modified files**: `.gitignore` (`.dev-logs/` entry), `package.json` (3 new `gsd-dev-*` scripts), `src/routes/+layout.svelte` (forwarder install under `import.meta.env.DEV`), `scripts/gen-capabilities.ts` (register 5 new commands), `src-tauri/capabilities/default.json` (regenerated, not hand-edited), `tauri.conf.json` (confirm devtools enabled in dev, default).
- **CLAUDE.md** registers the new dev-loop behavior under a brief pointer entry (one row in the Skills/Patterns table; **not** as a project-local skill anymore — the rule lives in GSD upstream).
- **`.planning/dependencies.md`**: new "External dev tools (MCP servers + macOS CLIs)" group registering `chrome-devtools-mcp`, `playwright` MCP, `screencapture`, `lsof`, `tee` (minimum macOS Ventura 13.4).
- **`.planning/PROJECT.md`**: untouched (no KP/KD added; this is a workflow improvement, not a product decision).

### GSD upstream (~/.claude/get-shit-done/)

- **New files**: `templates/visual-review.html`, 8 handler files under `lib/sdk/handlers/verify-*.{ts,js}`.
- **Modified files**: `workflows/verify-work.md` (3 patches).
- **Not modified by this change**: SDK CLI entry router (the new `verify.*` handlers register through whatever existing discovery mechanism the SDK uses; if the SDK uses an explicit allow-list, that list gets one line added per handler).

### Cross-r1ckyIn-project (downstream consumers of upstream patch)

UniBoard / Borealis Fabrics / New Sight / ClaudePulse all gain access to the upgraded verify-work behavior the moment they next `/gsd-update --sync` (or equivalent pull). Each downstream project needs to add the npm-script bridge (Tier D) for its specific stack to actually call Tauri / Electron / web commands — this is a per-project follow-up task, **not** part of this Phase 01.1.

### Risks

- **Cross-repo coordination**: changes to `~/.claude/get-shit-done/` are user-global, not version-controlled in the mneme repo. The task list MUST treat upstream edits as discrete steps and the dogfood validation MUST verify both halves work together.
- **SDK handler registration discovery**: if the SDK requires explicit allow-list registration for new handlers, missing that step silently breaks all 8 new `verify.*` queries. Need to inspect the SDK's handler discovery mechanism during task 4 implementation.
- **CLI invocation mode for Tauri commands**: Tauri's default expectation is that commands are called from inside the JS frontend via `invoke()`. Exposing the same commands to external CLI processes (the npm-script bridge) may require a small dev-only Rust binary or a clever shell pipe through the running dev server. Implementation path TBD during task 5.
- **Tauri 2 capture API stability**: `WebviewWindow::capture()` is the preferred primary path for `dev_capture_screenshot`; if the API is not stable in the pinned Tauri version, the macOS-native `screencapture` fallback is the canonical path. Choice gets locked during smoke test, recorded in SUMMARY.md.

## Implementation lane

This change is executed through the **GSD workflow** under Phase 01.1 (`dev-feedback-loop-infrastructure`, inserted into ROADMAP via `/gsd-phase --insert 1`). Standard lane: `/gsd-plan-phase 01.1` consumes this openspec change's four artifacts as the SPEC contract, then `/gsd-execute-phase 01.1` → `/gsd-code-review` → `/gsd-verify-work 01.1` (which itself uses the new patched verify-work workflow — bootstrapping consideration: the patched verify-work runs against the very change that patches it, so the patch must be applied early in execute to be self-validating) → `/gsd-ship 01.1`. After ship, `/opsx:archive` writes `specs/dev-feedback-loop/spec.md` to `openspec/specs/dev-feedback-loop/spec.md` as the cross-phase SSOT. `/opsx:apply` is bypassed entirely.
