# Phase 1: Tauri Shell Foundation + Subprocess Hardening — Specification

**Created:** 2026-05-07
**Ambiguity score:** 0.08 (gate: ≤ 0.20)
**Requirements:** 6 locked
**Amendment:** 2026-05-09 — Round 5 prototype handoff alignment (12 deltas A-04 through A-15) — see [`01-AMENDMENT-2026-05-09.md`](./01-AMENDMENT-2026-05-09.md). Where this SPEC.md conflicts with the amendment, **the amendment wins** until next milestone re-sync.

**Amendment:** 2026-05-14 — Plan 01-12 dogfood gap closure (3 deltas A-16 / A-17 / A-18) — see [`01-AMENDMENT-2026-05-14.md`](./01-AMENDMENT-2026-05-14.md). The numbered patch list below extends the 4-entry list originally drafted in `01-CONTEXT.md` L36-42 ("SPEC.md amendments required by this discussion — plan-phase to apply as a SPEC patch") with items 5 + 6, propagating the AMENDMENT-2026-05-14 contract changes (A-16 + A-17 + A-18) into the authoritative SPEC layer per plan 01-13 (wave 10, pure-docs follow-on to plan 01-12).

**SPEC.md amendments required by this discussion** — plan-phase to apply as a SPEC patch (items 1-4 sourced from `01-CONTEXT.md` L36-42; items 5 + 6 added by plan 01-13 referencing plan 01-12 commit `4e46e81`):

5. **REQ-2 spawn-args (2026-05-14 plan 01-12 commit `4e46e81`)**: add `--resume <session_id>` (optional, present on prompts 2+ within a single app launch) and `--append-system-prompt <CHAT_RENDERING_HINTS>` (always present on every prompt). See `01-AMENDMENT-2026-05-14.md` A-16 + A-17. Full `--system-prompt` replacement remains BANNED at audit checks 4b + 9 — Phase 9 REQ-17 per-course rules scope.
6. **REQ-5 sanitize (2026-05-14 plan 01-12 commit `4e46e81`)**: dogfood-checklist expectation — Claude reply to math prompt MUST contain rendered KaTeX only, no ASCII-fallback line; heading hierarchy h1/h2/h3 must render at ≥2px scale step apart; `<hr>` renders as a 1px soft-border separator. See `01-AMENDMENT-2026-05-14.md` A-17 + A-18.

## Goal

Bootstrap a from-scratch production Tauri 2 app at the repo root (lifting only the locked patterns from spike-002), wired with a single-session Claude chat that satisfies REQ-01 (three-pane resizable shell), REQ-02 (Claude CLI subprocess), and REQ-10 (agentic search default with `--add-dir` scope), while closing the three CRITICAL pitfalls relevant to Phase 1 (zombies / capability wildcards / streaming XSS). Delivery threshold is `npm run tauri dev` runnable — no `.app` packaging, no codesign, no notarization in this phase.

## Background

**Validated foundation (lift only locked patterns, do NOT bulk-copy):** Spike 002 at `.planning/spikes/002-tauri-claude-shell/app/` proved Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell + marked + KaTeX + DOMPurify + claude subprocess streaming work end-to-end. The locked patterns to lift:
- `+page.svelte` JSONL line buffering + 6-event-type dispatch
- Raw-monospace-during-stream → finalized-markdown-on-`result` rendering pattern
- Tool-use round-trip rendering pattern
- DOMPurify + KaTeX call sites (to be hardened further per Pitfall 4)

The spike app stays untouched in `.planning/spikes/` for reference; production code is created **fresh** at the repo root via `npm create tauri-app` then point-port these locked patterns.

**Gap from spike to production:**

1. Spike is single-pane 800×600. Production needs three resizable columns (file-tree placeholder / preview placeholder / chat) plus a top-bar reservation for Phase 8 mind-map.
2. Spike has `productName: "app"`, `identifier: "dev.mneme.spike"`, default Tauri icons. Production must declare `productName: "Mneme"`, `identifier: "dev.mneme.app"`, icons from `icon-assets/icon.icns` (Phase 0 D-10 / D-14 locks).
3. Spike has no Cmd+Q child cleanup — orphan `claude` processes survive (PITFALLS Pitfall 1, CRITICAL).
4. Spike `capabilities/default.json` has `args: true` on both `shell:allow-spawn` and `shell:allow-execute` — wildcards (PITFALLS Pitfall 2, CRITICAL).
5. Spike DOMPurify call uses `ADD_TAGS` + `ADD_ATTR` for KaTeX MathML/SVG but does **not** explicitly deny `script`/`iframe`/`object`/`embed`/`on*`; KaTeX called without `trust: false` / `strict: true` / macro lockdown; KaTeX errors passed back as raw `e.message` (XSS-via-error possible) (PITFALLS Pitfall 4, CRITICAL).
6. No `--max-turns`, no `--add-dir`, no `--exclude-dynamic-system-prompt-sections` — Claude wanders user filesystem and burns ~107k cache_creation tokens loading the user's global `CLAUDE.md` on every fresh session (REQ-10 violation).
7. No `claude-code-parser` typed parsing — current code uses ad-hoc inline `JSON.parse` (KD-12 says vendor it under `vendor/`).

**Cost machinery framing correction (Round 4):** PITFALLS Pitfall 3 ("$500+ in 7 days") was framed for **API key billing**. Phase 1 runs the user's already-OAuth'd `claude` CLI under their **monthly subscription** (Pro/Max), where there is no per-call billing — only Anthropic's rate limits. `result.total_cost_usd` reflects a **theoretical API equivalent**, not a real charge. Therefore Phase 1 ships **only `--max-turns 30`** as the agent-loop guard (real mechanism); cost meter / daily cap / `~/.mneme/usage.jsonl` / `~/.mneme/config.json` are **out of scope** in this phase (no real bill to cap).

## Requirements

1. **Three-pane resizable shell with persistent split positions and placeholder content**: REQ-01 productionized.
   - Current: spike is single 800×600 chat pane; no panes, no top bar
   - Target: window with `<header>` reservation (top bar, empty placeholder for Phase 8 mind-map) above a three-column layout. Left pane = static plain-text placeholder reading "Vault wired in Phase 2". Middle pane = static plain-text placeholder reading "Select a file to preview". Right pane = active Claude chat (lifting spike `+page.svelte` patterns). Each pane is separated by drag handles (`cursor: col-resize`); min-width 200 px per pane; window minimum 1024×600. Column widths persisted via localStorage key `mneme.layout.split` and restored on next launch.
   - Acceptance: launch app → drag middle/right divider → Cmd+Q → relaunch → divider position is unchanged within 1 px; all three panes render their placeholder/active content; resize below 1024×600 is blocked by Tauri window config.

2. **Claude subprocess streams cleanly with hardened spawn args and typed JSONL parsing**: REQ-02 + REQ-10 productionized.
   - Current: spike streams correctly with chunky-text-during-stream → finalized-markdown-on-`result`; uses inline NDJSON parsing; no `--max-turns`, no `--add-dir`, no `--exclude-dynamic-system-prompt-sections`
   - Target: every `claude` spawn passes `--print --permission-mode bypassPermissions --output-format stream-json --include-partial-messages --verbose --max-turns 30 --add-dir <SCRATCH_DIR> --exclude-dynamic-system-prompt-sections <prompt>` where `SCRATCH_DIR = ~/.mneme/scratch/` (auto-created on first launch — Phase 2 will swap with the configurable vault root via REQ-06). NO `--bare` (spike F4/F6: incompatible with OAuth subscription auth). JSONL parsing routed through vendored `claude-code-parser` (copy from `udhaykumarbala/claude-code-parser` MIT into `vendor/claude-code-parser/`, NOT an npm dependency, per KD-12) for typed event dispatch. Chunky monospace `<pre>` text during stream; finalized `marked` + KaTeX + DOMPurify on `result` only.
   - Acceptance: integration test sends prompt "what is 2+2"; receives streaming `text_delta` events (chunky monospace visible during stream); on `result` event, message converts to rendered markdown via `marked` + KaTeX + DOMPurify; subprocess command line (visible in dev-mode debug log) contains `--max-turns 30`, `--add-dir /Users/<user>/.mneme/scratch`, and `--exclude-dynamic-system-prompt-sections`; fresh session's first prompt has `result.usage.cache_creation_input_tokens` < 20,000 (down from spike's ~107k); reading a file outside scratch dir from chat ("read /etc/hosts") returns empty/permission-error from Claude.

3. **Subprocess lifecycle clean — zero zombies after Cmd+Q**: PITFALLS Pitfall 1 closed.
   - Current: Cmd+Q leaves orphan `claude` processes (and any `claude`-spawned tools) running indefinitely; ~107k tokens of cache_creation + agentic loops can burn quota silently
   - Target: Rust backend stores spawned `Child` in `tauri::State<Mutex<Option<CommandChild>>>` keyed by session; both `WindowEvent::CloseRequested` and macOS `RunEvent::ExitRequested` handlers send SIGTERM, wait 2 s, then SIGKILL if still alive; debug log line printed on each quit
   - Acceptance: launch → submit a prompt → press Cmd+Q during or after stream → within 2 s `ps aux | grep "[c]laude --print"` returns 0 rows; repeat 5 quit cycles → cumulative orphan count is 0; debug log contains `[shutdown] killed N child PIDs in Mms` per cycle.
   - **Out-of-scope clarification**: this requirement covers **only Cmd+Q-triggered cleanup**. Subprocess "stuck mid-stream" (network drop, Anthropic 5xx hang) is **not** part of Phase 1 zombie definition — defer to AI integration phase.

4. **Capability hardening: explicit window names + per-arg validators + no wildcards + CI guard**: PITFALLS Pitfall 2 closed.
   - Current: `capabilities/default.json` has `windows: ["main"]` ✓ (good) but `shell:allow-spawn` and `shell:allow-execute` both have `args: true` (anything goes); no audit script
   - Target: rewrite `src-tauri/capabilities/default.json` so `shell:allow-spawn` / `shell:allow-execute` declare exact `args: [{validator: "^--print$"}, {validator: "^--permission-mode$"}, {validator: "^bypassPermissions$"}, {validator: "^--output-format$"}, {validator: "^stream-json$"}, {validator: "^--include-partial-messages$"}, {validator: "^--verbose$"}, {validator: "^--max-turns$"}, {validator: "^30$"}, {validator: "^--add-dir$"}, {validator: "^/Users/[^/]+/\\.mneme/scratch$"}, {validator: "^--exclude-dynamic-system-prompt-sections$"}, {validator: ".+"}]` (the last `.+` validator is for the prompt argument; all positional args before it are exact-match regex). No `args: true`. No `*` in any window name or asset scope. CI/pre-commit script `scripts/audit-capabilities.sh` greps for `"args": true` and `"\\*"` in `capabilities/*.json` and exits non-zero on hit.
   - Acceptance: `grep -c '"args": true' src-tauri/capabilities/default.json` returns 0; `grep -c '"\\*"' src-tauri/capabilities/default.json` returns 0; `bash scripts/audit-capabilities.sh` exits 0; attempting to spawn `claude` with an arg outside the allowlist (e.g. `--bare`) fails at the Tauri permission layer with a logged denial.

5. **Streaming XSS hardening: explicit DOMPurify allowlist + KaTeX safe mode + CSP**: PITFALLS Pitfall 4 closed.
   - Current: spike DOMPurify call uses `ADD_TAGS` + `ADD_ATTR` for KaTeX MathML/SVG but does not explicitly deny `script`/`iframe`/`object`/`embed`/`on*`; KaTeX called with only `throwOnError: false`; KaTeX errors passed back as raw `e.message`
   - Target: shared `src/lib/sanitize.ts` exports `sanitizeMarkdown(html)` and `renderKatex(src)`. Both use DOMPurify with explicit `FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style"]`, `FORBID_ATTR: [/^on/i, "srcdoc", "formaction"]`. KaTeX called with `trust: false`, `strict: true`, `macros: {}`, `maxExpand: 1000`. KaTeX render errors pass `e.message` through `escapeHtml()` before display. Live-stream chunks render as plain monospace `<pre>` text only (no `marked.parse` mid-stream). KaTeX pinned at `^0.16.45` (≥ 0.16.21 PITFALLS floor). CSP meta tag in `app.html`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'`.
   - Acceptance: integration test feeds malicious payload `<img src=x onerror=alert(1)>\n\n$\\href{javascript:alert(2)}{x}$` → both render inert (no alert dialog fires; `onerror` attribute absent from rendered DOM; `\href` produces literal text not a clickable link); KaTeX version in `package-lock.json` ≥ 0.16.21; `app.html` contains the CSP meta tag.

6. **Single-session semantics with minimal hotkey surface**: locked Phase 1 interaction model.
   - Current: spike has implicit single session with `Enter` to send; no other hotkeys; no explicit history policy
   - Target: exactly one active chat session at a time. App launch always opens to a **blank chat** (no rendering of previous-session bubbles, no `--resume` of any prior session). The only hotkeys Phase 1 implements are: `Cmd+Q` (triggers Pitfall 1 cleanup path) and `Enter` in the chat input (sends prompt). NO `Cmd+P / Cmd+O / Cmd+Shift+P` (Phase 3, REQ-11). NO `Cmd+,` (Phase 2, REQ-14). NO `Cmd+L` clear / `Cmd+K` interrupt / `Cmd+N` new session / `Cmd+R` reload. No "new chat" UI button (a fresh chat requires app relaunch).
   - Acceptance: launch → submit a prompt → Cmd+Q → relaunch → chat panel is empty (no prior bubbles rendered); pressing `Cmd+L` / `Cmd+K` / `Cmd+,` / `Cmd+P` does nothing (no UI response, no error log); pressing `Enter` in chat input sends a prompt; Tauri capability config grants only the spawn/execute pair needed for Cmd+Q cleanup, no additional shortcut bindings.

## Boundaries

**In scope:**
- Production Tauri 2 project freshly bootstrapped at repo root (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/`, `src-tauri/`, `vendor/`, `package.json`, `Cargo.toml`, `tauri.conf.json`, `rust-toolchain.toml`) via `npm create tauri-app`, then point-port the locked patterns from spike-002
- Three-column resizable layout shell with top-bar reservation, drag handles, localStorage split persistence
- Static plain-text placeholders in left pane ("Vault wired in Phase 2") and middle pane ("Select a file to preview")
- Single Claude chat session (one active subprocess at a time; launch always blank; no "new chat" button)
- Streaming subprocess pipeline lifted from spike with `--max-turns 30` + `--add-dir <SCRATCH>` + `--exclude-dynamic-system-prompt-sections`
- Subprocess lifecycle (Cmd+Q SIGTERM → 2 s → SIGKILL; zero zombies after 5 cycles)
- Capability hardening: explicit window names, per-arg shell validators (~13 exact-regex validators), KaTeX ≥ 0.16.21, DOMPurify explicit FORBID_TAGS/FORBID_ATTR, CSP meta tag
- `vendor/claude-code-parser/` — local copy of `udhaykumarbala/claude-code-parser` MIT for typed JSONL event parsing (KD-12)
- `~/.mneme/scratch/` directory — auto-created on first launch as `--add-dir` target placeholder
- `scripts/audit-capabilities.sh` CI/pre-commit guard for `args:true` / `"*"` in capabilities
- Production identity: `productName: "Mneme"`, `identifier: "dev.mneme.app"`, icons sourced from `icon-assets/icon.icns` (Phase 0 D-10/D-14)

**Out of scope:**
- `npm run tauri build` packaging / `.app` bundle / DMG / codesign / notarization — separate v1.x ship-prep phase (NOT scheduled in current ROADMAP)
- Vault directory structure (PARA, course-root, `_source/_inbox/courses/shared/`) — Phase 2 (REQ-06)
- Configurable vault path picker — Phase 1 hardcodes `~/.mneme/scratch/`; Phase 2 (REQ-14 settings UI) makes it user-configurable
- Real file tree for left pane — Phase 2 reads vault and renders course folders; Phase 1 is a static plain-text placeholder
- PDF rendering for middle pane — Phase 2 sets up `_source/` policy; Phase 4 wires Marker; Phase 1 is a static plain-text placeholder
- Top-bar mind-map — Phase 8 (REQ-07) wires Cytoscape.js; Phase 1 reserves an empty `<header>` only
- Multi-session sidebar / session spawn / switch / rename / close — Phase 3 (REQ-12); Phase 1 is strictly single-session
- Command palette (Cmd+P / Cmd+O / Cmd+Shift+P) — Phase 3 (REQ-11)
- Settings UI / Cmd+, panel — Phase 2 (REQ-14); Phase 1 has no settings UI and no config file
- Canvas / Ed sync, sync status surface — Phase 2 (REQ-03 / REQ-13)
- First-run onboarding wizard / claude OAuth status check / setup prompt — Phase 2 (REQ-16); Phase 1 assumes user already has `claude` CLI installed and OAuth-authenticated. If `claude` is missing or unauthenticated, the first prompt simply errors in chat with the raw subprocess error message (Phase 1 does NOT detect the cause or guide setup)
- Echo360 webview / iframe / second window — Phase 5 (spike) / Phase 6 (REQ-04 / REQ-05)
- Citations API / anchored mode — Phase 9 (REQ-08)
- Document ingestion (Marker, markitdown) — Phase 4 (REQ-18)
- Block editor (Tiptap) — Phase 3 (REQ-12 area)
- Knowledge graph / three-tier memory — Phase 7 (REQ-07; gated by Phase 5.5)
- FSRS / review focus mode — Phase 10 (REQ-09 / REQ-15)
- Voice input — REQ-19 v1.x candidate (gated by Intel Mac CPU latency spike)
- **Cost meter (current/today $) / daily cost cap / `~/.mneme/usage.jsonl` / `~/.mneme/config.json`** — **DELETED from Phase 1** per Round 4 framing correction: under OAuth subscription, there is no per-call billing to cap; `result.total_cost_usd` is theoretical not real. Real loop guard is `--max-turns 30` (Requirement #2)
- **Subprocess "stuck mid-stream" watchdog / timeout detection** — defer to AI integration phase (Phase 5.5 / 7-area). Phase 1 zombie cleanup covers only Cmd+Q-triggered orphans, NOT runtime hangs
- **Visual aesthetic system (KP-09 + KD-13 token palette / font stack / component styles)** — defer entirely to `/gsd-ui-phase 1`. Phase 1 does NOT touch `src/app.css` defaults; the launched app will look like a default browser-styled SvelteKit page. KP-09/KD-13 lock applies starting at the next phase that touches UI styling
- Cross-startup chat history persistence — single-session semantics: launch is always blank. Multi-session + history come together in Phase 3 (`--resume <session-id>` mechanism)
- Hotkeys beyond `Cmd+Q` and `Enter` — `Cmd+L` (clear), `Cmd+K` (interrupt), `Cmd+N` (new chat), `Cmd+R` (reload), `Cmd+,` (settings), `Cmd+P/O/Shift+P` (palette) all NOT implemented in Phase 1
- Window position / window size persistence (only column dividers persist) — defer to Phase 2 (REQ-14 settings)
- Attachment paste / drag-drop in chat input — defer (no specific phase yet; v1.x candidate)
- TOKENICODE / opcode community pattern study — RQ-03 absorbed into `/gsd-plan-phase 1` research, NOT a Phase 1 SPEC requirement

## Constraints

- **Stack lock (KD-01)**: Tauri 2 + SvelteKit + `@sveltejs/adapter-static` + `tauri-plugin-shell`; no SSR server; no other frontend framework
- **Frontend lib lock (KD-02)**: `marked`, `katex` (≥ 0.16.21 — PITFALLS floor), `dompurify`, Svelte 5 runes
- **Toolchain lock (KD-03)**: Rust ≥ 1.88 pinned in `rust-toolchain.toml`
- **Identity lock (Phase 0 D-10 / D-14)**: production `productName: "Mneme"`, `identifier: "dev.mneme.app"`, window title `"Mneme"`, icons sourced from `icon-assets/icon.icns` — irreversible after Phase 1 ships
- **Vendoring lock (KD-12)**: `claude-code-parser` is copied into `vendor/claude-code-parser/`, NOT installed via npm — upstream is unmaintained, MIT license; carry attribution
- **Subprocess auth (spike F4 / F6, KP-04)**: NEVER pass `--bare` — incompatible with OAuth subscription auth; subscription billing is the only legal cost model for personal use (KP-04 compliance)
- **Single LLM provider (OOS-08)**: only the local `claude` CLI is supported; no OpenAI/Gemini/Ollama parallel paths
- **Local-first (KP-01)**: nothing under `~/.mneme/` is uploaded; no telemetry beyond debug logs in dev mode
- **OSS license (KP-02)**: every runtime dependency must be MIT/Apache-2.0/MPL-2.0; no AGPL/proprietary library shipped (opcode is study-only per Phase 0 OSS lessons)
- **Platform target**: macOS Intel only (user's MacBook Pro 2019, macOS Ventura 13.4); no Windows / Linux build paths in Phase 1
- **Cost discipline**: every `claude` spawn passes `--max-turns 30` AND `--add-dir <SCRATCH>` AND `--exclude-dynamic-system-prompt-sections` — these three are the spawn-arg contract; no exception
- **Visual aesthetic deferred (KP-09 / KD-13)**: Phase 1 does NOT define color tokens / typography / motion / shadows / borders; full system locked starting at `/gsd-ui-phase 1`. Phase 1 may emit unstyled / browser-default UI
- **Pitfall ownership map**: Phase 1 closes Pitfalls 1, 2, 4 (CRITICAL, all in REQ-3/4/5); Pitfall 3 (cost runaway) is **structurally not applicable** under OAuth subscription mode and is reduced to `--max-turns 30` (Requirement #2); Pitfall 6 (vault soft-lock) is Phase 3; Pitfall 5 (embedding lock-in) is Phase 7; Pitfall 7 (Echo360 cookie) is Phase 5
- **Pre-existing user environment assumptions** (Phase 1 does not validate; failures surface as raw subprocess errors): `claude` CLI installed and on `$PATH`; `claude` already OAuth-authenticated; user's `~/.npm-global` is `npm config get prefix` (per global solo-dev rule); macOS Ventura 13.4 or compatible

## Acceptance Criteria

- [ ] `npm run tauri dev` from repo root launches a window titled "Mneme" with three resizable columns + top-bar reservation + window minimum 1024×600
- [ ] Drag any column divider, Cmd+Q, relaunch → split positions restored within 1 px (localStorage round-trip)
- [ ] `tauri.conf.json` declares `productName: "Mneme"` AND `identifier: "dev.mneme.app"`; `src-tauri/icons/` contents are sourced from repo-root `icon-assets/icon.icns` (verify via file size or SHA against source)
- [ ] Submit prompt "what is 2+2" → chunky monospace `<pre>` text streams during `text_delta` events → on `result` event, message converts to rendered markdown via `marked` + KaTeX + DOMPurify
- [ ] Subprocess command line (visible in dev-mode debug log on spawn) contains `--max-turns 30`, `--add-dir /Users/<user>/.mneme/scratch`, `--exclude-dynamic-system-prompt-sections`; does NOT contain `--bare`
- [ ] Fresh session's first prompt has `result.usage.cache_creation_input_tokens` < 20,000 (down from spike's ~107k)
- [ ] After submitting a prompt and pressing Cmd+Q, `ps aux | grep "[c]laude --print"` returns 0 rows within 2 s; repeat 5 quit cycles → cumulative orphan count is 0
- [ ] Debug log contains `[shutdown] killed N child PIDs in Mms` line on each Cmd+Q
- [ ] `grep -c '"args": true' src-tauri/capabilities/default.json` returns 0; `grep -c '"\\*"' src-tauri/capabilities/default.json` returns 0
- [ ] `bash scripts/audit-capabilities.sh` exits 0; attempting to spawn `claude --bare` returns a Tauri permission denial in the log
- [ ] Malicious payload `<img src=x onerror=alert(1)>` and `$\href{javascript:alert(2)}{x}$` render inert (no alert dialog fires; rendered DOM has no `onerror` attribute; `\href` produces literal text)
- [ ] KaTeX version in `package-lock.json` ≥ 0.16.21; DOMPurify config explicitly forbids `script`, `iframe`, `object`, `embed`, and any `on*` attribute
- [ ] `app.html` contains CSP meta tag `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'`
- [ ] `vendor/claude-code-parser/` contains a `LICENSE` (MIT) and at least one `.ts` source file copied from upstream; `package.json` has zero references to `claude-code-parser` as a dependency
- [ ] `rust-toolchain.toml` pins Rust ≥ 1.88
- [ ] `~/.mneme/scratch/` is auto-created if missing on first launch
- [ ] After Cmd+Q + relaunch, chat panel is empty (no rendering of any previous-session bubbles)
- [ ] Pressing `Cmd+L` / `Cmd+K` / `Cmd+,` / `Cmd+P` / `Cmd+O` / `Cmd+Shift+P` produces no UI response and no error log entry (these hotkeys are NOT bound)
- [ ] Pressing `Enter` in the chat input sends the prompt (default browser textarea behavior is preserved)
- [ ] No file at `~/.mneme/usage.jsonl` is created (cost logging out of scope); no file at `~/.mneme/config.json` is created (settings out of scope)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                               |
|--------------------|-------|------|--------|-------------------------------------------------------------------------------------|
| Goal Clarity       | 0.92  | 0.75 | ✓      | 6 requirements named explicitly; cost framing corrected; visual deferred             |
| Boundary Clarity   | 0.95  | 0.70 | ✓      | 22+ explicit out-of-scope items, each with downstream phase pointer                  |
| Constraint Clarity | 0.90  | 0.65 | ✓      | Stack/lib/toolchain/identity/vendoring/spawn-arg-contract all locked                |
| Acceptance Criteria| 0.90  | 0.70 | ✓      | 19 pass/fail checks (file greps, ps round-trip, render tests, log assertions)        |
| **Ambiguity**      | 0.08  | ≤0.20| ✓      | Gate passed by significant margin                                                    |

## Interview Log

| Round | Perspective    | Question summary                              | Decision locked                                                                  |
|-------|----------------|-----------------------------------------------|----------------------------------------------------------------------------------|
| 0     | (initial)      | Score from ROADMAP + REQS + spike alone       | 0.30 ambiguity; Boundary 0.55 below 0.70 minimum                                  |
| 1     | Researcher     | Code starting point?                          | From-scratch `npm create tauri-app` + point-port spike's locked patterns          |
| 1     | Researcher     | Phase 0 identity handling in SPEC?            | Constraint section, not a requirement (Acceptance verifies via grep)              |
| 1     | Researcher     | Delivery threshold?                           | `npm run tauri dev` runnable; no `.app` packaging / codesign in Phase 1           |
| 2     | Simplifier     | Left/middle pane placeholder thickness?       | Plain-text static placeholders; no logic, no file reading                         |
| 2     | Simplifier     | Visual aesthetic depth in Phase 1?            | NOT locked — full KP-09/KD-13 deferred to `/gsd-ui-phase 1`; `app.css` untouched   |
| 3     | Boundary Keeper| Cross-launch chat history?                    | NOT preserved — every launch is blank; multi-session + history is Phase 3         |
| 3     | Boundary Keeper| Hotkeys beyond Cmd+Q + Enter?                 | NONE — Cmd+L/K/N/R/,/P/O/Shift+P all explicitly out of scope                      |
| 3     | Boundary Keeper| Subprocess stuck-mid-stream = zombie?         | NO — Phase 1 zombie defn = Cmd+Q-triggered only; runtime hangs deferred to AI phase|
| 4     | Failure Analyst| Daily cost cap "exit" UX?                     | **N/A — entire cost cap deleted**: PITFALLS Pitfall 3 framed for API key billing; OAuth subscription has no per-call charges. Phase 1 keeps only `--max-turns 30` |
| 4     | Failure Analyst| First-run user not OAuth'd?                   | Phase 1 assumes pre-authenticated; failure shows raw subprocess error in chat; OAuth setup is Phase 2 first-run wizard |

[Total 4 rounds executed; user opted not to run Round 5 Seed Closer at gate=0.08, deeming remaining decisions HOW-level (plan-phase concerns, not WHAT-level SPEC concerns).]

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Spec created: 2026-05-07*
*Next step: /gsd-discuss-phase 1 — implementation decisions (HTML structure, IPC patterns, exact validator regex set, claude-code-parser version + extraction approach, KaTeX/DOMPurify exact malicious-payload test set, RQ-03 TOKENICODE/opcode pattern absorption)*
