## ADDED Requirements

### Requirement: Full-spectrum dev-only Svelte forwarder (mneme-side)

A dev-only Svelte module at `src/lib/dev/console-forwarder.ts` SHALL forward all observable frontend signals through Tauri commands into three log files under `.dev-logs/`. Required signal coverage:

- `console.log` / `console.info` / `console.debug` / `console.warn` / `console.error` — **all five levels**
- `window.onerror`, `window.onunhandledrejection`
- Resource load failures (`<img>` / `<script>` / `<link>` `error` events captured with `capture=true`)
- CSP violations (`securitypolicyviolation` events)
- `fetch` and `XMLHttpRequest` (method, url, status, duration)
- Performance API metrics (LCP / FCP / CLS / longtask via `PerformanceObserver`)

Console-class signals (console + uncaught + rejection + resource + CSP) write to `.dev-logs/console.log` with tag prefixes (`log`, `info`, `debug`, `warn`, `error`, `uncaught`, `unhandled-rejection`, `resource-error`, `csp`). Network signals write to `.dev-logs/network.log`. Performance signals write to `.dev-logs/perf.log`. All three files are 100 ms debounce-batched on the Rust side and rotate to `.log.1` at 10 MB (single backup).

The module MUST be guarded by `import.meta.env.DEV` and MUST be completely absent from production builds.

#### Scenario: Uncaught error inside a Svelte effect

- **WHEN** during dev a Svelte `$effect` throws an uncaught error
- **THEN** the forwarder catches it via `window.onerror` and a line of shape `[FRONTEND_CONSOLE]uncaught|<iso-ts>|<message>|<source>:<line>` appears in `.dev-logs/console.log`

#### Scenario: All-level console output captured

- **WHEN** during dev application code calls `console.log("payload", obj)` (any of the 5 levels)
- **THEN** the monkey-patched wrapper writes a line of shape `[FRONTEND_CONSOLE]<level>|<iso-ts>|<message>|<source>:<line>` to `.dev-logs/console.log` AND the original `console.<level>` still prints to the dev runtime (chain preserved via closure-captured reference)

#### Scenario: Failed fetch captured

- **WHEN** during dev application code's `fetch('/api/foo')` returns status 500
- **THEN** the global `fetch` wrapper writes a line of shape `[FRONTEND_NETWORK]GET|/api/foo|500|<duration_ms>ms` to `.dev-logs/network.log`

#### Scenario: Image 404 captured

- **WHEN** during dev a page contains `<img src="/missing.png">` that fails to load with 404
- **THEN** the capture=true `error` listener on `window` writes a line tagged `resource-error` to `.dev-logs/console.log` containing resource type and URL

#### Scenario: CSP violation captured

- **WHEN** during dev an inline script is blocked by CSP
- **THEN** the `securitypolicyviolation` event handler writes a line tagged `csp` to `.dev-logs/console.log` with `violatedDirective` and `blockedURI`

#### Scenario: LCP captured

- **WHEN** during dev a page loads and `PerformanceObserver` records LCP = 3200ms
- **THEN** the forwarder writes a line containing the LCP value to `.dev-logs/perf.log`

#### Scenario: Production build stripped

- **WHEN** `npm run build` runs to produce a release artifact
- **THEN** the bundled JS contains no references to `installConsoleForwarder`, `__mnemeDevSnapshot__`, or any `[FRONTEND_CONSOLE]` / `[FRONTEND_NETWORK]` / `[FRONTEND_PERF]` tag (verified by grep over `dist/`)

### Requirement: Dev-only Tauri commands with CLI invocation mode (mneme-side)

The Tauri Rust side SHALL provide five dev-only commands under `src-tauri/src/commands/dev.rs`, all guarded by `#[cfg(debug_assertions)]`:

1. `dev_log_console_entry(level, message, tag, source, line)` — append to `.dev-logs/console.log`
2. `dev_log_network_entry(method, url, status, duration_ms)` — append to `.dev-logs/network.log`
3. `dev_log_perf_entry(metric, value, ts)` — append to `.dev-logs/perf.log`
4. `dev_capture_screenshot(scope: "webview" | "window") -> path` — capture window to `.dev-logs/screenshots/<ISO-ts>.png`, primary via Tauri 2 `WebviewWindow::capture()`, fallback via macOS-native `screencapture -l/-R`
5. `dev_query_state() -> json string` — invoke Svelte-side `globalThis.__mnemeDevSnapshot__()` via Tauri's script-evaluation API and return the serialized snapshot

Additionally, the screenshot and state-query commands SHALL be reachable through a **CLI invocation mode** so external processes (the GSD SDK via the npm-script bridge) can invoke them without an in-app round trip. The CLI mechanism (custom dev binary, `tauri invoke` CLI, or equivalent) is chosen during implementation spike.

#### Scenario: Claude obtains screenshot of Tauri window without asking user

- **WHEN** Claude (running through verify-work) needs the current Tauri window image for a Visual Review HTML
- **THEN** Claude invokes the SDK handler `verify.capture-screenshot --surface tauri`, which calls the npm-script bridge, which invokes `dev_capture_screenshot` via CLI, which returns a PNG path under `.dev-logs/screenshots/`. **The user is never asked to take a screenshot.**

#### Scenario: Claude verifies KD-13 token landed without asking user to inspect DOM

- **WHEN** Claude needs to confirm that `.chat-input`'s `background-color` resolves to `var(--surface-warm)`
- **THEN** Claude invokes `verify.query-dom-state --surface tauri`, parses `computed_styles[".chat-input"].background-color` from the returned JSON, and compares directly. **The user is never asked to open DevTools → Computed.**

#### Scenario: Primary screenshot API unavailable

- **WHEN** `dev_capture_screenshot`'s primary path (Tauri 2 capture API) fails
- **THEN** the command automatically falls back to macOS-native `screencapture` CLI without surfacing the failure to the SDK caller; SUMMARY.md records the fallback engagement for this session

#### Scenario: Production build absence of all five commands

- **WHEN** a release build is produced
- **THEN** `dev.rs` is absent from the binary (verified by `cargo bloat` or equivalent symbol inspection — no `dev_capture_screenshot`, `dev_query_state`, `dev_log_*` symbols present)

### Requirement: npm-script bridge for cross-project capability exposure (mneme-side, cross-project protocol)

The mneme `package.json` SHALL declare three `gsd-dev-*` npm scripts that bridge GSD SDK handler invocations to project-specific implementation:

- `gsd-dev-screenshot` — accepts `--surface webview|window` arg, invokes `dev_capture_screenshot` via CLI mode, prints PNG path to stdout
- `gsd-dev-snapshot` — invokes `dev_query_state` via CLI mode, prints JSON snapshot to stdout
- `gsd-dev-scan-logs` — accepts `--since <iso-ts>` arg, greps `.dev-logs/*.log` and `.dev-logs/tauri.log` for issues newer than the timestamp, prints structured JSON issue list to stdout

These scripts form the **convention** GSD SDK relies on. Downstream r1ckyIn projects (UniBoard / Borealis / etc.) each implement these same three scripts pointing at their own stack-specific commands (Puppeteer for Next.js, etc.).

#### Scenario: SDK invokes screenshot via npm bridge

- **WHEN** GSD SDK `verify.capture-screenshot --surface tauri` runs in the mneme project root
- **THEN** the SDK shells out to `npm run gsd-dev-screenshot -- --surface window`, parses stdout for the PNG path, returns it to the verify-work workflow

#### Scenario: Bridge script fails gracefully when dev server is down

- **WHEN** any `gsd-dev-*` script is invoked while no Tauri dev server is running
- **THEN** the script exits non-zero with a structured error message on stderr (`{"error": "dev server not running", "hint": "run gsd-sdk query verify.start-dev-loop first"}`), the SDK handler propagates the error, and verify-work step `automated_ui_verification` either starts the dev server itself or marks the Tauri-shell branch as `unavailable` in the run report

### Requirement: Execute-phase silence (cross-cutting workflow rule)

During `/gsd-execute-phase <N>`, Claude SHALL NOT present any verification question, Summary block, or Visual Review HTML to the user. Internal automated checks and `.dev-logs/` writes continue, but all user-facing verification surfaces are suppressed until `/gsd-verify-work <N>` is invoked.

#### Scenario: Execute-phase plan completion message stays minimal

- **WHEN** Claude completes a plan during `/gsd-execute-phase 01.1`
- **THEN** the completion message names the plan, lists tasks done, and indicates next-wave or verify-work readiness — but contains NO Summary block, NO Visual Review HTML reference, NO question to the user. Verification-grade information stays in `.dev-logs/` for verify-work to consume

#### Scenario: Execute-phase encounters a console error

- **WHEN** during execute Claude makes a Svelte change that triggers `console.error` in `.dev-logs/console.log`
- **THEN** Claude internally notes the error (it may inform Claude's own next-step decision, e.g. add a fix task) but does NOT interrupt the user with "I saw an error, please confirm". The error surfaces in the verify-work scan once execute is complete

#### Scenario: Execute-phase asks user to run a command

- **WHEN** during execute Claude is about to phrase a request like "please run `npm test` and tell me the result"
- **THEN** Claude self-rejects per workflow rules and runs the command itself via Bash, recording the result internally. The "ask user to run" path is forbidden

### Requirement: verify-work workflow three patches (GSD upstream)

`~/.claude/get-shit-done/workflows/verify-work.md` SHALL be patched at three discrete locations:

1. **Expand `automated_ui_verification` step** to detect Tauri-shell capability (via `npm run gsd-dev-screenshot --dry-run` or equivalent existence probe) and add a Tauri branch calling `verify.scan-signals` + `verify.capture-screenshot --surface tauri` + `verify.query-dom-state --surface tauri` in addition to the existing Chromium / Playwright-MCP branch.
2. **Insert new step `package_manual_review`** between `automated_ui_verification` and `present_test`. This step takes the "queued for manual review" items, groups by 4-bucket (visual / window / motion / perf), calls `verify.render-review-html` to produce a single HTML at `.planning/handoff/<date>-phase-<N>-verify.html`, calls `verify.validate-html` to enforce structure, presents the path to the user, waits for response, and routes the response through `verify.parse-review-response`.
3. **Add a new `<critical_rules>` block** at the top of the workflow with 5 rules: (a) no asking user to open DevTools / read console / run terminal commands / paste logs / inspect DOM during verify-work; (b) HTML `data-bucket` values limited to `visual / window / motion / perf`, forbidden tags `hybrid / terminal / console / dom-check / log-paste / command-run`; (c) HTML questions must have concrete anchors (screenshot / GIF / selector / locked-value comparison); (d) HTML header must include "Claude has auto-verified" reassurance checklist; (e) each verify run produces a fresh HTML — never amend prior.

The original `present_test` conversational path remains as a fallback for edge cases (no UI surface, MCP-unavailable degradation, very small phase with one or zero items).

#### Scenario: verify-work routes a Tauri-only phase to Tauri branch

- **WHEN** `/gsd-verify-work 01.1` runs on a phase whose SUMMARY.md indicates Tauri-shell touches (window chrome, IPC, dev commands)
- **THEN** patch 1's logic detects Tauri capability and invokes the Tauri branch of `automated_ui_verification`, producing structured issue list + Tauri-window screenshot + DOM snapshot all without user interaction

#### Scenario: verify-work generates Visual Review HTML for batched judgment

- **WHEN** `automated_ui_verification` completes with 5 items "queued for manual review" (e.g. 3 visual concerns, 1 window-chrome concern, 1 perceived-perf concern)
- **THEN** patch 2's `package_manual_review` step calls `verify.render-review-html` → file at `.planning/handoff/<2026-05-12>-phase-01.1-verify.html` containing 3 `data-bucket="visual"` sections + 1 `data-bucket="window"` + 1 `data-bucket="perf"`, then presents the path to the user

#### Scenario: verify-work rejects forbidden question phrasing

- **WHEN** during verify-work Claude drafts a question of the form "please open DevTools and check the console for errors"
- **THEN** patch 3's `<critical_rules>` block makes Claude self-reject the phrasing; Claude instead invokes `verify.scan-signals` and obtains the console state itself

### Requirement: GSD SDK eight `verify.*` query handlers (GSD upstream)

`~/.claude/get-shit-done/lib/sdk/handlers/` SHALL contain eight new handler modules registered under `gsd-sdk query verify.*`:

1. `verify.start-dev-loop <phase> [--surface chromium|tauri]` — start dev server in background, write PID/port to `.dev-logs/`, return startup state
2. `verify.stop-dev-loop` — kill PID, unlink state files
3. `verify.scan-signals [--since <iso-ts>]` — grep `.dev-logs/{console,network,perf}.log` and `tauri.log`, return structured issue list (severity-tagged)
4. `verify.capture-screenshot --surface <s>` — for Chromium: call `chrome-devtools-mcp__take_screenshot`; for Tauri: shell out to `npm run gsd-dev-screenshot`; return PNG path
5. `verify.query-dom-state --surface <s>` — analogous, return DOM/perf JSON snapshot
6. `verify.render-review-html --phase <N> --auto-verified <yaml> --buckets <yaml>` — render `templates/visual-review.html` with the provided data, write to `.planning/handoff/<date>-phase-<N>-verify.html`, return path
7. `verify.parse-review-response --path <p>` — extract structured issues from the user's reply (free-form text accepted)
8. `verify.validate-html --path <p>` — assert that every `<section>` has `data-bucket` in `visual / window / motion / perf` and no forbidden tag appears

#### Scenario: All eight handlers callable from CLI

- **WHEN** a user or workflow invokes `gsd-sdk query verify.start-dev-loop 01.1 --surface tauri`
- **THEN** the SDK locates the handler, executes it, returns valid JSON to stdout (or a structured error if the handler is missing — failing loud, not silently no-op)

#### Scenario: `verify.validate-html` rejects forbidden bucket

- **WHEN** a Visual Review HTML at `.planning/handoff/.../X.html` contains a `<section data-bucket="terminal">`
- **THEN** `verify.validate-html --path X.html` exits non-zero with structured error `{ "error": "forbidden_bucket", "found": ["terminal"], "allowed": ["visual","window","motion","perf"] }`; the `package_manual_review` step halts and Claude must rewrite the HTML

### Requirement: Visual Review HTML template at GSD upstream (GSD upstream)

`~/.claude/get-shit-done/templates/visual-review.html` SHALL be a single shared HTML template all r1ckyIn projects use. Template structure:

1. **Header section** with a "Claude has auto-verified" checklist (console / network / resource errors / CSP / performance / automated checks), values filled by the renderer.
2. **Four `<section data-bucket="visual|window|motion|perf">` slots**, each accepting zero or more `<article>` question blocks with `<img>`/`<video>` anchor + question text + expected-response hint.
3. **Inline documentation block** at file top listing forbidden buckets (`hybrid`, `terminal`, `console`, `dom-check`, `log-paste`, `command-run`) and forbidden phrasings ("open DevTools", "run ps aux", "paste the log", etc.).
4. **Visual style** mirrors mneme's KD-13 family by default (Anthropic-warm palette) but accepts per-project override via `templates/visual-review.local.html` if a project drops one.

#### Scenario: Template renders with all four buckets populated

- **WHEN** `verify.render-review-html` is called with auto-verified data and bucket items spanning visual + motion + perf (no window items)
- **THEN** the rendered HTML contains the visual + motion + perf `<section>`s populated with question articles, the window `<section>` either omitted or rendered empty with a note "no window-chrome concerns this run"

### Requirement: Visual Review HTML is ephemeral

Each `/gsd-verify-work <N>` run SHALL produce a fresh Visual Review HTML at `.planning/handoff/<date>-phase-<N>-verify.html`. The file MUST be gitignored (via the pre-existing `.planning/handoff/` rules or a specific entry added by this change). After the user responds and the workflow records the response, the file MAY be retained on disk for debugging but MUST NOT be treated as part of the project record. Prior verify runs' HTML files MUST NOT accumulate as baselines — every run starts fresh.

#### Scenario: Second verify run produces a new HTML, does not amend prior

- **WHEN** `/gsd-verify-work 01.1` runs a second time on the same phase after fix-and-retry
- **THEN** a NEW HTML file is generated with the current timestamp; the prior file is not modified or referenced

#### Scenario: HTML file not committed to git

- **WHEN** `git status` runs after a verify cycle
- **THEN** the new `.planning/handoff/<date>-phase-NN-verify.html` appears as untracked (or is matched by an existing `.gitignore` entry); it does not appear in `git add -A` proposals as a tracked change

### Requirement: Human handoff bounded to four buckets (cross-cutting)

The verify-work workflow + `verify.validate-html` + template SHALL collectively enforce that every question presented to the human falls into one of four buckets: **visual fidelity**, **window chrome**, **animation feel**, **perceived performance**. Question count is unrestricted per run but Claude MUST NOT ask the user to read the console, run a terminal command, paste a log, perform DOM inspection, or run any CLI such as `ps aux` / `lsof` / `cargo test`.

#### Scenario: Three motion questions in one HTML

- **WHEN** a phase touches three different animations (panel slide, button press, list reorder), all needing motion-feel judgment
- **THEN** the rendered HTML contains three `<article>` blocks under the same `<section data-bucket="motion">`, each with its own GIF anchor and question — not three separate HTML files, not three separate verify-work runs

#### Scenario: Claude self-rejects a forbidden question during render

- **WHEN** during `verify.render-review-html` Claude is about to include a question "please run `cargo test --release` and confirm exit 0"
- **THEN** Claude self-rejects per critical_rules patch 3 and either (a) runs the command itself and re-classifies the result as auto-verified, or (b) drops the question if it had no place in the human-judgment layer
