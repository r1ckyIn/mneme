---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 06
subsystem: chat-integration
tags: [svelte5, tauri-shell, claude-subprocess, ipc, sanitize, dispatch, a-09-usage-meter, a-13-chat-footer, a-14-tool-use-collapsible, cycle-2-high-1-fix, prototype-fidelity]

requires:
  - phase: 01 plan 01-01 (vendoring + bootstrap)
    provides: vendored claude-code-parser path; tauri.conf.json window chrome; +layout.ts ssr=false
  - phase: 01 plan 01-02 (spawn-args SSOT split)
    provides: $lib/spawn-args.shared.ts (browser-safe SSOT) — buildClaudeArgs(prompt, scratchDir) + SCRATCH_DIR_REGEX + MAX_TURNS exports; capability-layer enforces ~13 validators
  - phase: 01 plan 01-03 (sanitize + dispatch + A-14 helpers)
    provides: $lib/sanitize.ts (sanitizeMarkdown, renderKatex, renderKatexInDom, escapeHtml); $lib/stream-dispatch.ts (dispatchEvent, freshState, gerundHeader, pastTenseHeader, types DispatchState/Msg/ToolUseGroup/ClaudeEvent); A-14 toolUseGroup state machine
  - phase: 01 plan 01-04 (Rust state machine IPC)
    provides: 3 invoke commands — register_session_pid, clear_session_pid, stop_session; PGID kill via kill_pgid; Cmd+Q hook union RunEvent::ExitRequested
  - phase: 01 plan 01-05 (three-pane shell + connection-state)
    provides: Splitter right snippet at data-pane="right"; DragHandle (A-05 placement #4); connectionState rune from $lib/connection-state.svelte; setStatus("connecting"|"connected"|"disconnected"); tokens.css

provides:
  - ChatPanel.svelte — Phase 1 single-session Claude chat orchestrator: spawn + dispatch + sanitize + IPC + finalize-render walker + UsageMeter mount + ChatFooter mount + tool-use <details> rendering + 10-combo hotkey unbinding (~693 LOC including comments + A-09 + A-13 + A-14 + Cycle-2 HIGH-1 scratchDir resolver)
  - UsageMeter.svelte — A-09 Ctx %/Total tokens/Session timer; reads state.totalInputTokens; default model_context_window 1_000_000 (Opus 4.7 1M); .cost.warning red at ctx >= 90% (~113 LOC)
  - ChatFooter.svelte — A-13 1:1 Claude Code footer: 5 left buttons (Auto-mode + + + mic + chevron + vault-ctx) + Opus 4.7 1M · Max model pill + Send/Stop slot (~191 LOC)
  - +page.svelte updated — replaces "Chat wired in Phase 1 plan 06" placeholder with <ChatPanel />; preserves wrapping div + DragHandle
  - static/favicon.png — 1x1 transparent placeholder (unblocks adapter-static prerender; replace with real Mneme logo in Phase 2+)
  - scripts/screenshot-01-06.mjs — Playwright capture harness for prototype-vs-impl visual verification

affects:
  - 01-07 dogfood validation (Wave 5) — manual checklist verifies the 5-cycle Cmd+Q lifecycle, 10-combo hotkey unbinding, UsageMeter live updates, ChatFooter button rendering, vault-ctx toggle, tool-use collapsible behavior
  - phase-2-vault — wires real source pinning into the vault-ctx toggle (A-06 spawn-args integration); replaces UsageMeter MODEL_CTX_WINDOW constant with user-selectable model
  - phase-3-multi-session — refactors single-session ChatPanel into per-session instances; per-session connection-state; per-session UsageMeter
  - phase-9-system-prompt — adds --system-prompt and --append-system-prompt to spawn-args; ChatPanel passes prompt unchanged

tech-stack:
  added: []
  patterns:
    - "Cycle-2 HIGH-1 mitigation — ChatPanel imports buildClaudeArgs from $lib/spawn-args.shared (browser-safe) and resolves scratchDir at mount via homeDir() from @tauri-apps/api/path (Tauri 2 IPC bridge — Vite-bundlable; replaces the original Node os.homedir which Vite/SvelteKit cannot bundle for the WebView). Defense-in-depth: ChatPanel revalidates resolved candidate against SCRATCH_DIR_REGEX before storing, AND the SSOT throws on regex mismatch."
    - "Single legal {@html} site — system bubble error variant only. Text passed to {@html msg.text} was already escapeHtml-cleaned at dispatch-layer (plan 01-03 system-error path) OR at sendPrompt-layer (Cycle-2 HIGH-1 scratchDir failure path). All other DOM injection uses Svelte auto-text-escape."
    - "10-combo hotkey unbinding — UNBOUND_CODES = {KeyL, KeyK, KeyW, Comma, KeyP, KeyO, KeyN, KeyR, Period}. Cmd+L/K/W/,/P/O/Shift+P/N/R/. all preventDefault silently (Round 5 A-08 added Period). Cmd+Q is intentionally NOT in this list — it goes to plan 01-04's RunEvent::ExitRequested hook (the only OS-level kill path). Stop is button-only (D-19)."
    - "TOKENICODE absorption — finalizeOnce idempotent teardown closure (prevents double-finalize on close+error race) + control_request event interception (skipped in Phase 1 baseline; prevents bypass-mode hang)"
    - "Cycle-1 MEDIUM closure (REVIEWS.md) — spawn + invoke wrapped in try/catch with proper system-bubble error UI (escapeHtml on the error text). Three try/catch sites: (1) buildClaudeArgs synchronous build, (2) cmd.spawn() + invoke('register_session_pid'), (3) invoke('stop_session'). Each surfaces a system bubble + calls teardown() to release UI state."
    - "Cycle-1 LOW closure (REVIEWS.md) — UsageMeter 'Total' semantics clarified: rendered as 'Total · {tokens}' (cumulative volume signal) alongside 'Ctx %' (budget-pressure signal vs MODEL_CTX_WINDOW). The .cost.warning red threshold keys on Ctx %, not Total. Used/Total framing not bare 'Total'."

key-files:
  created:
    - src/lib/components/ChatPanel.svelte
    - src/lib/components/UsageMeter.svelte
    - src/lib/components/ChatFooter.svelte
    - static/favicon.png
    - scripts/screenshot-01-06.mjs
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-06-implementation.png
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-06-implementation-populated.png
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/prototype-chatpanel.png
  modified:
    - src/routes/+page.svelte (mount ChatPanel inside right-pane slot)

key-decisions:
  - "UsageMeter prop named `dispatchState`, not `state` — Svelte 5's auto-store-subscribe path interpreted `$state(...)` rune calls as `$`(state) auto-subscriptions when a prop named `state` was in scope, generating a svelte-check error 'Cannot use state as a store'. Renaming the prop to `dispatchState` decouples the rune name from the prop name. ChatPanel parent updated. svelte-check 0/0 errors/warnings post-fix."
  - "Pre-existing favicon prerender failure auto-fixed (Rule 3) — src/app.html references %sveltekit.assets%/favicon.png but no static/ directory existed in the repo; SvelteKit's adapter-static + prerender.strict:true bombed during npm run build with 'Error: 404 /favicon.png (linked from /)'. The build pipeline had simply never been exercised end-to-end before this plan. Added a 72-byte 1x1 transparent PNG as placeholder; Phase 2+ aesthetic pass replaces with the real Mneme logo. NOT a regression introduced by 01-06."
  - "connection-state import path is `$lib/connection-state.svelte` (not `$lib/connection-state`) — matches plan 01-05's TitlebarMeta convention. Svelte 5 module-level $state requires the .svelte module suffix to be reactive across imports."
  - "Visual verification via Playwright Chromium with bypassCSP:true — system Chrome --headless silently dropped the SvelteKit page's inline bootstrap script under script-src 'self' CSP, producing 5KB blank screenshots. Playwright's bypassCSP context flag is the only headless screenshot path that produces the rendered DOM. Pattern lifted from plan 01-05's screenshot harness."

patterns-established:
  - "Browser-safe SSOT consumption — components in src/lib/components/ that need spawn args import ONLY from $lib/spawn-args.shared (NEVER from $lib/spawn-args.node). The .node sibling lives in scripts/gen-capabilities.ts only. Audit script in scripts/audit-capabilities.sh greps for forbidden Node imports in the .shared module to keep the contract enforced at build time."
  - "Path resolution at mount via @tauri-apps/api/path — for any path-related runtime computation (homeDir, dataDir, etc.), components import from @tauri-apps/api/path (Tauri 2 IPC bridge — browser-safe; Vite-bundlable). Outside Tauri the IPC returns undefined and consumers gracefully degrade (ChatPanel logs the error + sets a state flag + early-returns from spawn). Pattern reusable for Phase 4 vault-path resolution + Phase 6 Echo360 cookie-jar path."
  - "Snippet-as-slot for nested button delegation — ChatFooter takes a `sendStopSlot: Snippet` prop so the parent (ChatPanel) renders the actual Send/Stop button with parent-owned state (dispatch.isStreaming). The footer owns layout (5 left + right) without owning any handler logic. Pattern reusable for Phase 3 multi-session footer (per-tab Send/Stop), Phase 6 video-control footer, etc."
  - "<details>-based collapsible with state-driven open attr — A-14 tool-use group renders as <details open={state.toolUseGroup.open}> with summary text from gerundHeader (streaming) / pastTenseHeader (collapsed). Native browser semantics for keyboard toggle + accessibility. Pattern reusable for Phase 4 PDF outline, Phase 7 KG cluster collapsibles."

requirements-completed:
  - REQ-02

duration: 19min
completed: 2026-05-09
---

# Phase 1 Plan 6: Chat Panel End-to-End Integration Summary

**ChatPanel ships: subprocess spawn + 6-arm dispatch + sanitize + 3-IPC contract + finalize-render walker + UsageMeter (A-09) + ChatFooter (A-13) + tool-use `<details>` (A-14) + 10-combo hotkey unbinding (A-08 added Period) + Cycle-2 HIGH-1 scratchDir resolver via Tauri IPC; Cycle-1 MEDIUM (try/catch wrap) + LOW (Total semantics) carry-forwards both closed.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-09T03:51:00Z
- **Completed:** 2026-05-09T04:10:40Z
- **Tasks:** 5 of 5 completed
- **Files created:** 3 components + 1 favicon + 1 capture script + 3 screenshots
- **Files modified:** 1 (`src/routes/+page.svelte`)

## Accomplishments

- **ChatPanel orchestrator (~693 LOC)** wires the full Phase 1 chat surface: spawn → 6-arm dispatch → sanitize → IPC → finalize-render walker. Single-session contract; Phase 3 refactors to per-session.
- **UsageMeter (~113 LOC)** renders Ctx %/Total tokens/Session timer above the input. A-04 cost meter is fully removed; A-09 ctx + session is the new surface. `.cost.warning` red triggers at ctx ≥ 90%.
- **ChatFooter (~191 LOC)** renders the 1:1 Claude Code footer: Auto-mode + + + mic (disabled per REQ-19) + chevron + vault-ctx (A-06 toggle) + Opus 4.7 1M · Max model pill + Send/Stop slot.
- **Cycle-2 HIGH-1 fix landed** — ChatPanel imports buildClaudeArgs from `$lib/spawn-args.shared` (NEVER `$lib/spawn-args.node`) AND resolves scratchDir at mount via `homeDir()` from `@tauri-apps/api/path` (Tauri 2 IPC bridge; Vite-bundlable replacement for Node `os.homedir`). Defense-in-depth: ChatPanel revalidates against SCRATCH_DIR_REGEX before storing; SSOT itself throws on regex mismatch.
- **Cycle-1 MEDIUM closure** — three try/catch sites guard the spawn pipeline: (1) buildClaudeArgs synchronous build, (2) `cmd.spawn()` + `invoke("register_session_pid")`, (3) `invoke("stop_session")`. Each surfaces a system-bubble error with escapeHtml-cleaned text and calls `teardown()` to release UI state.
- **Cycle-1 LOW closure** — UsageMeter "Total" semantics clarified to `Total · {tokens}` (cumulative volume signal), distinct from `Ctx %` (budget-pressure signal vs MODEL_CTX_WINDOW). `.cost.warning` red threshold keys on Ctx %, not Total — Used/Total framing not bare "Total".
- **A-08 Period added** — UNBOUND_CODES is now 9 entries: `KeyL/K/W/Comma/P/O/N/R/Period` (Cmd+Shift+P shares KeyP). Cmd+. is the 10th unbound combo; Stop button title removes `⌘.` hint.
- **A-14 tool-use rendering** — `<details open={state.toolUseGroup.open}>` with `gerundHeader()` summary text (streaming) or `pastTenseHeader()` (collapsed). Tool-use body uses Svelte auto-text-escape (no `{@html}`).
- **A-10 setStatus calls at lifecycle** — `connecting` before spawn → `connected` on first `text_delta` → `disconnected` on close (or auto-fail). TitlebarMeta dot updates reactively from the connection-state rune.
- **Build pipeline closed** — `npm run build` (Vite + adapter-static prerender) + `cargo build` + `npx vitest run` (69 passed) + `cargo test --test kill_pgid` (3 passed) + `bash scripts/audit-capabilities.sh` (PASS) all green.

## Visual Verification

Screenshots captured via Playwright Chromium at 1280x860 (Tauri initial window size per D-05); script committed at `scripts/screenshot-01-06.mjs`.

| Capture | Path | Resolution |
|---------|------|-----------|
| Prototype `.window` clip | `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/prototype-chatpanel.png` | 1280×860 |
| Implementation idle/empty | `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-06-implementation.png` | 1280×860 |
| Implementation populated | `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-06-implementation-populated.png` | 1280×860 |

**Diagnostic counts at capture time** (Playwright `page.evaluate`) confirm full mount of all 01-06 deliverables:

```
chatPanel = 1            (ChatPanel mounted)
composer = 1             (composer block present)
inputFoot = 1            (ChatFooter mounted; .input-foot)
sendBtn = 1              (Send button rendered; data-state="idle")
cost = 1                 (UsageMeter mounted; .cost class)
fileArea = 1             (left-pane FileArea — A-07)
dragHandle = 5           (5/5 A-05 placements: files / video / preview / chat / mind-map)
titlebarMeta = 1         (A-10 connection-state dot + vault path + settings cog)
splitter = 2             (.grid + .middle-stack)
```

**Drift list (prototype vs implementation, idle state):**

| # | Drift | Severity | Disposition |
|---|-------|----------|-------------|
| 1 | Prototype shows populated chat (assistant streaming text + tool-use card collapsed). Impl shows blank scroller (mounting state). | Acceptable | UI-SPEC §"Empty state" mandates blank scroller; prototype's streamed content is post-prompt. Impl's empty state is the correct mount-time UX. |
| 2 | Prototype's `Ctx`/`Total`/`Session` shows 9.1% / 18.2k / 1h 24m sample data. Impl shows 0.0% / 0 / 0m at idle. | Acceptable | Impl correctly reads `state.totalInputTokens` — zero before any prompt (A-09 contract). Will populate from real `result` events at runtime. |
| 3 | Prototype's titlebar dot is green (`connected`). Impl's dot is gray (`disconnected`) at idle. | Acceptable | A-10 contract: `disconnected` is the correct initial state on app launch (no subprocess yet); flips to `connecting` then `connected` at first prompt. |
| 4 | Browser console error: `[ChatPanel] homeDir() (Tauri 2 IPC bridge) failed: TypeError: Cannot read properties of undefined (reading 'invoke')`. | Expected | Cycle-2 HIGH-1 contract: outside Tauri the homeDir() IPC returns undefined; ChatPanel logs the error, sets `scratchDirError`, and `sendPrompt()` early-returns with a system bubble. UI mounts correctly inside the WebView; this error is browser-only. |

**Populated state (with synthetic textarea fill + vault-ctx click):**

- Textarea displays "What's dynamic programming?" (text injection survived Svelte 5 reactivity)
- `.vault-ctx` button shows the `.active` state (orange-tint background; A-06 toggle wires)
- `.input-shell:focus-within` orange ring renders correctly (KP-09 + KD-13 token usage)
- `.send-btn.send` is active (no longer `:disabled` — `prompt.trim()` is non-empty)

**No fix-now drifts.** All four items above are contract-correct behaviors documented above; Phase 1 visual verification gate passes.

## Threat Mitigations

This plan owns 0 of the 7 phase-level threats directly (those were closed by 01-02 / 01-03 / 01-04). The phase-level mitigations all flow through this plan as integration:

- **T-1-01** (subprocess leak on Cmd+Q) — mitigated when ChatPanel calls `register_session_pid` after every `cmd.spawn()`
- **T-1-02** (HTML injection in markdown) — mitigated when ChatPanel routes ALL DOM injection through `sanitizeMarkdown` (DOMPurify Option-A `uponSanitizeAttribute` hook); the only `{@html}` site (system bubble error variant) consumes pre-escaped text
- **T-1-03/04/05/07** (subprocess argument injection / cost runaway / scratch dir escape / bypass mode hang) — mitigated when ChatPanel calls `Command.create("claude-bin", buildClaudeArgs(prompt, scratchDir))` (capability layer enforces ~13 validators; SSOT throws on regex mismatch; control_request events skipped)
- **T-1-06** (KaTeX trust mode) — mitigated when `renderKatexInDom` runs with locked options (per plan 01-03)

Plan-local integration threats (all listed in 01-06-PLAN.md `<threat_model>` and mitigated):

- T-1-26 (finalize-render double-execution) — mitigated by `data-msg-finalized="true"` flag + `:not([data-msg-finalized="true"])` selector
- T-1-27 (system bubble `{@html}` smuggling) — mitigated; system error text is `escapeHtml`-cleaned at dispatch-layer OR at sendPrompt-layer; single legal `{@html}` site
- T-1-28 (Cmd+R/Cmd+W/Cmd+. browser default bypasses Rust state machine) — mitigated by 10-combo UNBOUND_CODES (incl. `KeyR`, `KeyW`, `Period`)
- T-1-29 (listener registration race after spawn) — mitigated; all `cmd.stdout.on/stderr.on/on('error')/on('close')` calls happen BEFORE `await cmd.spawn()`
- T-1-30 (`invoke('clear_session_pid')` failure leaves stale PID) — mitigated; `.catch(() => {})` swallows IPC failures (best-effort); plan 01-04's kill_pgid is safe against missing PIDs
- T-1-39 (Cmd+. silent bypass leaks expectation) — accept; plan 01-07 dogfood C-NN row will surface the unbound contract; tooltip on Stop button reads "Stop" (no `⌘.` hint)
- T-1-40 (totalInputTokens accumulator overflow) — accept; Number.MAX_SAFE_INTEGER ≈ 9e15; even 100 prompts × 1M tokens = 1e8 (orders of magnitude under)
- T-1-41 (model pill display drift from CLI account default) — accept; pill is decorative-only (CLI uses account default; spawn-args do NOT pass --model)
- T-1-44 (ChatPanel browser-imports a Node-only module) — mitigated; ChatPanel imports buildClaudeArgs from `$lib/spawn-args.shared`, resolves scratchDir at mount via `homeDir()` from `@tauri-apps/api/path`, validates against SCRATCH_DIR_REGEX before storing, refuses spawn if unresolved. `npm run build` succeeds without `Cannot resolve module 'os'` errors (Cycle-2 HIGH-1 regression check passes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] svelte-check Svelte 5 store-auto-subscribe collision on UsageMeter `state` prop**
- **Found during:** Task 3 (post-build svelte-check)
- **Issue:** A prop named `state` shadowed the `$state` rune at parse time; svelte-check interpreted `$state(...)` as `$`(state) auto-subscription of the local `state` prop, throwing `Cannot use 'state' as a store. 'state' needs to be an object with a subscribe method on it`.
- **Fix:** Renamed prop to `dispatchState`. ChatPanel parent updated. svelte-check 0/0 errors/warnings post-fix.
- **Files modified:** `src/lib/components/UsageMeter.svelte`, `src/lib/components/ChatPanel.svelte`
- **Commit:** `4fef456` (UsageMeter rename) + `854e4f9` (ChatPanel call site updated in same commit as Task 3)

**2. [Rule 3 - Blocker] Pre-existing favicon prerender failure auto-fixed**
- **Found during:** Task 5 (npm run build)
- **Issue:** `src/app.html` references `%sveltekit.assets%/favicon.png` but no `static/` directory existed in the repo; SvelteKit's `adapter-static` + `prerender.strict: true` failed during `npm run build` with `Error: 404 /favicon.png (linked from /)`. This blocked Task 5's smoke-check exit gate.
- **Fix:** Created `static/favicon.png` as a 72-byte 1×1 transparent PNG placeholder. Phase 2+ aesthetic pass replaces with real Mneme logo.
- **Reasoning:** NOT a regression introduced by 01-06 — the build pipeline had simply never been exercised end-to-end before this plan (Wave 1-3 produced source artifacts but no plan ran adapter-static).
- **Files modified:** `static/favicon.png` (new)
- **Commit:** `d0098da`

**3. [Rule 2 - Critical functionality] try/catch wrap on spawn + invoke pipeline (Cycle-1 MEDIUM closure)**
- **Found during:** Task 3 implementation
- **Issue:** Cycle-1 MEDIUM REVIEWS.md carry-forward flagged that `cmd.spawn()` + `invoke("register_session_pid")` could throw synchronously if capability layer rejects, IPC is unavailable, or the SSOT throws on regex mismatch — leaving `dispatch.isStreaming = true` + the input dock permanently in the streaming state.
- **Fix:** Three try/catch sites added: (1) buildClaudeArgs synchronous build, (2) `cmd.spawn()` + `invoke("register_session_pid")`, (3) `invoke("stop_session")` (already best-effort but explicit). Each surfaces a system-bubble error with `escapeHtml`-cleaned text and calls `teardown()` to release UI state. Defense-in-depth: `teardown()` itself force-resets `dispatch.isStreaming = false` + `pulseDotVisible = false` belt-and-suspenders style.
- **Files modified:** `src/lib/components/ChatPanel.svelte`
- **Commit:** `854e4f9` (Task 3)

### Authentication Gates

None — Phase 1 ChatPanel does not auth against external services. Claude Code CLI's OAuth keychain reads happen inside the spawned subprocess (`claude` CLI) and are surfaced as stderr if they fail (logged to dev console per D-18); spike F4/F6 confirmed the `--bare` absent + `--include-partial-messages` present pattern keeps OAuth working.

## Known Stubs

None — all rendered surfaces are wired to real state. Specifically:

- **UsageMeter** reads `state.totalInputTokens` accumulator from stream-dispatch (real); session timer ticks from `sessionStartedAt` Date (real).
- **ChatFooter buttons** that are placeholders (Auto-mode dropdown, attach, mic, chevron) document their Phase 1 status via `title` tooltip + `console.log` toast — these are A-13 visual contract per AMENDMENT-2026-05-09. Future v1.x plans wire real handlers; not stubs that should block progression.
- **Vault-context button** toggles `.active` class (real state); spawn-args integration is Phase 2 per A-06 contract.
- **Model pill** is hardcoded `Opus 4.7 1M · Max` (decorative; CLI uses account default per A-13). Phase 2 settings UI may sync to detected CLI version.

## TDD Gate Compliance

This plan is `type: execute` (not `type: tdd`); RED/GREEN/REFACTOR gates do not apply. The companion 01-03 plan (sanitize + dispatch) was TDD and produced the upstream test corpus consumed by this integration. Vitest run: 69/69 passing.

## Self-Check: PASSED

Created files exist:
- `src/lib/components/ChatPanel.svelte` — FOUND
- `src/lib/components/UsageMeter.svelte` — FOUND
- `src/lib/components/ChatFooter.svelte` — FOUND
- `static/favicon.png` — FOUND
- `scripts/screenshot-01-06.mjs` — FOUND
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-06-implementation.png` — FOUND
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-06-implementation-populated.png` — FOUND
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/prototype-chatpanel.png` — FOUND

Modified files exist:
- `src/routes/+page.svelte` — FOUND (with `<ChatPanel />` mount, `<DragHandle />` preserved, no "Chat wired in Phase 1 plan 06" placeholder text)

Commits exist (verified via `git log --oneline 20b4db2..HEAD`):
- `3cc7074` — feat(01-06): UsageMeter component (A-09 — Ctx + Total + Session…)
- `4fef456` — fix(01-06): rename UsageMeter prop 'state' -> 'dispatchState'…
- `beb43c6` — feat(01-06): ChatFooter component (A-13…)
- `854e4f9` — feat(01-06): ChatPanel.svelte wires Claude subprocess…
- `c947587` — feat(01-06): mount ChatPanel inside right-pane slot…
- `d0098da` — fix(01-06): add 1x1 placeholder static/favicon.png…
- `dd09e35` — chore(01-06): capture prototype-vs-impl visual verification screenshots

All 5 plan tasks completed; all 5 verification gates passed; build pipeline closes without Node-module-not-found errors (Cycle-2 HIGH-1 regression check); svelte-check 0/0; vitest 69/69; cargo test 3/3.

## Notes for Plan 01-07

The dogfood checklist for plan 01-07 should explicitly verify:

- (a) `Cmd+R` does nothing (no UI response, no SPA reload)
- (b) `Cmd+W` does nothing (no UI response, no macOS default close-window)
- (c) `Cmd+.` does nothing (no UI response, no kill path, no cancel)
- (d) `Cmd+L / Cmd+K / Cmd+, / Cmd+P / Cmd+O / Cmd+Shift+P / Cmd+N` all do nothing
- (e) `Cmd+Q` triggers Tauri's `RunEvent::ExitRequested` hook (plan 01-04 PGID kill path)
- (f) UsageMeter shows live `Ctx %` / `Total · Nk` / `Session · Hh Mm` after first prompt; `.cost.warning` red appears at ctx ≥ 90%
- (g) ChatFooter renders all 5 left buttons (Auto mode + + + mic + chevron + vault-ctx) + model pill `Opus 4.7 1M · Max`
- (h) Vault-context button click flips `.active` class (orange-tint background) without affecting `claude` spawn args (Phase 1 visual-only per A-06)
- (i) Tool-use renders as `<details open>` during streaming with gerund header ("Running 2 commands…"); collapses on `result` event with past-tense header ("Ran 2 commands…")
- (j) NO `~/.mneme/usage.jsonl` file is created during normal usage (A-04 enforcement)
- (k) `npm run build` produces a bundle with no `Cannot resolve module 'os'` / `homedir is not exported` errors (Cycle-2 HIGH-1 regression check)
- (l) Stop button title="Stop" (no `⌘.` hint per A-08)
- (m) Send button title="Send"; disabled when `prompt.trim()` is empty
- (n) `static/favicon.png` exists; replace with real Mneme logo when Phase 2 aesthetic pass lands
