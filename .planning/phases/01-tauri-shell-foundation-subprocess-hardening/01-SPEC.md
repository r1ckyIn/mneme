# Phase 1: Tauri Shell Foundation + Subprocess Hardening — Specification

**Created:** 2026-05-07
**Ambiguity score:** 0.16 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

Promote the spike-002 single-pane proof-of-concept into a hardened production three-pane Tauri app at the repo root that satisfies REQ-01 (three-pane resizable shell), REQ-02 (Claude CLI subprocess), and REQ-10 (agentic search default with `--add-dir` scope), with all four CRITICAL pitfalls (zombies, capability wildcards, cost runaway, streaming XSS) closed before any user dogfooding.

## Background

**Validated foundation (do NOT redo):** Spike 002 at `.planning/spikes/002-tauri-claude-shell/app/` ships a working Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell app that streams `claude` subprocess output through marked + KaTeX + DOMPurify. The single `+page.svelte` already implements: JSONL line buffering, 6-event-type dispatch, raw-monospace-during-stream → finalized-markdown-on-`result` pattern, and tool-use round-trip rendering.

**Gap from spike to production:**

1. Spike is single-pane (800×600 window). Production requires three resizable panes (file tree / preview / chat) plus a top-bar reservation for the Phase 8 mind-map.
2. Spike has `productName: "app"` and `identifier: "dev.mneme.spike"`. Production must flip to `productName: "Mneme"`, `identifier: "dev.mneme.app"` (Phase 0 D-10 / D-14 locks).
3. Spike has no subprocess cleanup — Cmd+Q leaves zombie `claude` processes (PITFALLS Pitfall 1, CRITICAL).
4. Spike `capabilities/default.json` has `args: true` on both `shell:allow-spawn` and `shell:allow-execute` — a wildcard that lets any caller pass any argument to `claude` (PITFALLS Pitfall 2, CRITICAL).
5. Spike has no cost meter and no daily cap — first call burns ~$0.55–0.67 in `cache_creation`, agentic loops can cost $5+ per question (PITFALLS Pitfall 3, CRITICAL).
6. Spike DOMPurify allowlist is permissive (relies on default deny-list); production needs an explicit ADD_TAGS / ADD_ATTR allowlist with `script`/`iframe`/`object`/`embed` and all `on*` attributes denied. KaTeX `trust: false`, `strict: true`, no user macros (PITFALLS Pitfall 4, CRITICAL).
7. No `--add-dir`, no `--max-turns`, no `--exclude-dynamic-system-prompt-sections` — Claude wanders the filesystem and burns tokens on auto-loaded user `CLAUDE.md` (REQ-10 violation).
8. No `claude-code-parser` typed parsing — current code uses ad-hoc inline `JSON.parse` of NDJSON (KD-12 says vendor it under `vendor/`).
9. No KP-09 / KD-13 visual aesthetic — spike defaults to system colors / sans-serif.

**Production lives at the repo root.** Spike sources stay in `.planning/spikes/` for reference. Phase 1 creates a fresh `src/`, `src-tauri/`, `vendor/`, `package.json`, `Cargo.toml`, `tauri.conf.json` layout under `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/`, lifting locked patterns from the spike but rebuilding window/pane/capability/cost-meter scaffolding from scratch.

## Requirements

1. **Three-pane resizable shell with persistent split positions**: Production app renders three primary panes plus reserved top-bar.
   - Current: spike has a single full-window chat (800×600); no panes; no top bar
   - Target: window with `<header>` reservation (top bar, empty placeholder for Phase 8 mind-map), then a three-column layout — left (course file tree placeholder, "Vault wired in Phase 2"), middle (PDF preview placeholder, "Select a file to preview"), right (Claude chat from spike). Each pane has a drag handle (`cursor: col-resize`); min-width 200 px per pane; column widths persisted to `localStorage` key `mneme.layout.split` and restored on next launch
   - Acceptance: launch app → drag middle/right divider → quit → relaunch → divider position is unchanged within 1 px; all three panes render their placeholder/active content; window minimum size 1024×600 enforced

2. **Production identity carryover (Phase 0 → Phase 1)**: `tauri.conf.json` reflects locked Phase 0 decisions.
   - Current: spike has `productName: "app"`, `identifier: "dev.mneme.spike"`, window title `"app"`
   - Target: production `tauri.conf.json` has `productName: "Mneme"`, `identifier: "dev.mneme.app"`, window title `"Mneme"`; production icons sourced from `icon-assets/icon.icns` (Phase 0 deliverable) copied into `src-tauri/icons/`
   - Acceptance: `grep -c '"productName": "Mneme"' src-tauri/tauri.conf.json` returns 1; `grep -c '"identifier": "dev.mneme.app"' src-tauri/tauri.conf.json` returns 1; macOS Dock shows `Mneme` after `npm run tauri build`; window title bar reads `Mneme`

3. **Claude subprocess streams cleanly with stack-locked patterns**: REQ-02 productionized.
   - Current: spike streams correctly with chunky-text-during-stream → finalized-markdown-on-`result`, but uses inline NDJSON parsing
   - Target: subprocess invocation always passes `--print --permission-mode bypassPermissions --output-format stream-json --include-partial-messages --verbose --max-turns 30 --add-dir <scratch-or-vault> <prompt>` (no `--bare`; `--max-turns` and `--add-dir` are NEW additions); JSONL parsing routed through vendored `claude-code-parser` (copied from `udhaykumarbala/claude-code-parser` MIT into `vendor/claude-code-parser/`, NOT an npm dep, per KD-12); chunky monospace during stream; finalized `marked` + KaTeX + DOMPurify on `result` only
   - Acceptance: integration test sends prompt "what is 2+2"; receives `text_delta` events streamed (chunky monospace visible); on `result` event, message converts to rendered markdown; `result.total_cost_usd` is captured and persisted; message count of NDJSON events parsed matches `lastEventCount` reported by spike pattern

4. **Subprocess lifecycle is clean — zero zombies after quit cycles**: PITFALLS Pitfall 1 closed.
   - Current: Cmd+Q leaves orphan `claude` processes (and any `claude`-spawned tools) running indefinitely
   - Target: Rust backend stores spawned `Child` in `tauri::State<Mutex<Option<CommandChild>>>`; both `WindowEvent::CloseRequested` and macOS `RunEvent::ExitRequested` handlers send SIGTERM, wait 2 s, then SIGKILL if still alive
   - Acceptance: launch → start session → press Cmd+Q → within 2 s `ps aux | grep "[c]laude --print"` returns 0 rows; repeat 5 times → 0 orphans cumulatively; debug log line `[shutdown] killed N child PIDs in Mms` printed to stderr on each quit

5. **Cost meter visible + hard daily cap blocks runaway**: PITFALLS Pitfall 3 closed (REQ-13 prerequisite).
   - Current: no cost surface in UI; no spend tracking; no kill switch
   - Target: chat header shows `$<current_session> · $<cumulative_today>` updating from each `result.total_cost_usd`; cumulative cost persisted append-only to `~/.mneme/usage.jsonl` (one line per `result` event with timestamp + cost + session id); config file `~/.mneme/config.json` provides `daily_cost_cap_usd` (default `10.00`); when `cumulative_today >= daily_cost_cap_usd`, new subprocess spawns are refused and a modal shows "Daily cap reached — resets at midnight local time"; running session is allowed to finish; cap resets at local-time midnight via on-spawn check (no background timer required)
   - Acceptance: send a prompt → header updates with cost ≥ $0.0 within 1 s of `result`; `cat ~/.mneme/usage.jsonl` shows one new line per session; manually set `daily_cost_cap_usd: 0.01` in config and restart → first prompt completes (current session bypasses cap); second new session prompt → modal blocks spawn and `claude-bin` is NOT spawned (verified by `ps`)

6. **Capability hardening: explicit window names + per-arg validators + no wildcards**: PITFALLS Pitfall 2 closed.
   - Current: `capabilities/default.json` has `windows: ["main"]` ✓ but `shell:allow-spawn` and `shell:allow-execute` both have `args: true` (anything goes)
   - Target: rewrite `capabilities/default.json` so `shell:allow-spawn` / `shell:allow-execute` declare exact `args: [{validator: "^--print$"}, {validator: "^--permission-mode$"}, {validator: "^bypassPermissions$"}, ...]` matching the 11 fixed flags Phase 1 needs; no `args: true`; no `*` in any window or scope; CI/pre-commit script `scripts/audit-capabilities.sh` greps for `"args": true` and `"\\*"` in `capabilities/*.json` and exits non-zero if found
   - Acceptance: `grep -c '"args": true' src-tauri/capabilities/default.json` returns 0; `grep -c '"\\*"' src-tauri/capabilities/default.json` returns 0; `bash scripts/audit-capabilities.sh` exits 0; attempting to spawn `claude` with an arg outside the allowlist (e.g. `--bare`) fails at the Tauri permission layer with a logged denial

7. **Streaming XSS hardening: explicit DOMPurify allowlist + KaTeX safe mode**: PITFALLS Pitfall 4 closed.
   - Current: spike DOMPurify call uses `ADD_TAGS` + `ADD_ATTR` for KaTeX MathML/SVG but does not explicitly deny `script`/`iframe`/`object`/`embed`/`on*`; KaTeX called with `throwOnError: false` only (no `trust`, no `strict`, no macro lockdown); KaTeX errors are passed back as raw `e.message` (XSS-via-error possible)
   - Target: shared `src/lib/sanitize.ts` exports `sanitizeMarkdown(html)` and `renderKatex(src)` — both use DOMPurify with explicit `FORBID_TAGS: ["script","iframe","object","embed","form","input","style"]`, `FORBID_ATTR: [/^on/i, "srcdoc", "formaction", "src"]` (except inside whitelisted `<img>`); KaTeX called with `trust: false`, `strict: true`, `macros: {}`, `maxExpand: 1000`; KaTeX render errors pass `e.message` through `escapeHtml()` before display; live-stream chunks render as plain monospace `<pre>` text only (no `marked.parse` mid-stream); KaTeX pinned at `^0.16.45` (≥ 0.16.21 PITFALLS floor); a CSP meta tag `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'` set in `app.html`
   - Acceptance: integration test feeds malicious payload `<img src=x onerror=alert(1)>\n\n$\\href{javascript:alert(2)}{x}$` → both renders inert (no alert fires; `onerror` stripped; `\href` produces literal text not link); KaTeX version in `package-lock.json` is ≥ 0.16.21; `app.html` contains the CSP meta tag

8. **Agentic search default with vault-scope `--add-dir`**: REQ-10 productionized for Phase 1.
   - Current: spike has no `--add-dir`; Claude can read anywhere in user's filesystem
   - Target: every `claude` spawn passes `--add-dir <SCRATCH_DIR>` where `SCRATCH_DIR = ~/.mneme/scratch/` (auto-created on first launch); this is a Phase 1 placeholder that Phase 2 will swap with the configurable vault root (REQ-06); spawn also passes `--exclude-dynamic-system-prompt-sections` to drop user CLAUDE.md auto-load (saves ~107k cache_creation tokens per session)
   - Acceptance: subprocess command (visible in debug log on spawn) contains `--add-dir /Users/<user>/.mneme/scratch` and `--exclude-dynamic-system-prompt-sections`; first prompt of a fresh session shows `result.usage.cache_creation_input_tokens` < 20,000 (vs spike's 107k); attempting to read a file outside the scratch dir from chat ("read /etc/hosts") returns an empty/permission-error response from Claude

9. **KP-09 + KD-13 visual aesthetic anchors applied at shell level**: locked design family established before UI-phase fills the rest.
   - Current: spike uses default browser styling (system fonts, white background, blue links)
   - Target: shell-level CSS variables in `src/app.css` define `--mneme-orange: #d97757`, `--mneme-cream: #faf9f5` (light bg), `--mneme-text: #141413` (light fg), `--mneme-warm-dark: #2b2a27` (dark bg); body uses serif (`font-family: "Iowan Old Style", "Apple Garamond", Georgia, serif`) — explicitly NOT Arial / NOT Inter; border default `1px solid rgba(20,20,19,0.08)` (8% opacity); transition default `cubic-bezier(0.165, 0.85, 0.45, 1)`; multi-layer soft shadow `box-shadow: 0 1px 2px rgba(20,20,19,0.04), 0 4px 12px rgba(20,20,19,0.06)`; full font/component palette deferred to `/gsd-ui-phase 1`
   - Acceptance: `grep -c "#d97757" src/app.css` ≥ 1; `grep -c "Iowan Old Style\\|Apple Garamond\\|Georgia" src/app.css` ≥ 1; `grep -c "Arial\\|Inter" src/app.css` returns 0; visual smoke test: launch app → background is cream (`#faf9f5`), borders are barely-visible warm gray, no pure-black text

## Boundaries

**In scope:**
- Production-quality Tauri 2 app at repo root (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/`, `src-tauri/`, `vendor/`, `package.json`, `Cargo.toml`, `tauri.conf.json`)
- Three-column resizable layout shell (file-tree placeholder / preview placeholder / chat); top-bar reservation; localStorage split persistence
- Single Claude chat session (one active subprocess at a time; "new chat" button clears history and starts fresh)
- Streaming subprocess pipeline carried over from spike with stack-locked patterns + `--max-turns 30` + `--add-dir <scratch>` + `--exclude-dynamic-system-prompt-sections`
- Subprocess lifecycle (Cmd+Q SIGTERM → 2 s → SIGKILL; zero zombies)
- Cost meter (current + cumulative today) + JSON config + JSONL usage log + daily cap kill-switch + cap-reached modal
- Capability hardening (explicit window names; per-arg shell validators; KaTeX ≥ 0.16.21; DOMPurify allowlist; CSP)
- `vendor/claude-code-parser/` (KD-12) — local copy of `udhaykumarbala/claude-code-parser` MIT, used for typed JSONL event parsing
- KP-09 + KD-13 shell-level color tokens, serif body, motion curve, soft borders/shadows in `src/app.css`
- `scripts/audit-capabilities.sh` CI guard for `args: true` / `"*"` in capabilities
- Production `productName: "Mneme"`, `identifier: "dev.mneme.app"`, icon copied from `icon-assets/icon.icns`

**Out of scope:**
- Vault directory structure (PARA, course-root, `_source/_inbox/courses/shared/`) — that is Phase 2 (REQ-06)
- Configurable vault path picker — Phase 1 hardcodes `~/.mneme/scratch/`; Phase 2 (REQ-14 settings UI) makes it user-configurable
- Real file tree for left pane — Phase 2 reads vault and renders course folders; Phase 1 is a static placeholder
- PDF rendering for middle pane — Phase 2 sets up `_source/` policy; Phase 4 wires Marker for PDFs; Phase 1 is a static placeholder
- Top-bar mind-map — Phase 8 (REQ-07) wires Cytoscape.js; Phase 1 reserves the empty `<header>` only
- Multi-session sidebar / spawn / switch / rename / close — Phase 3 (REQ-12); Phase 1 has exactly one session at a time
- Command palette (Cmd+P / Cmd+O / Cmd+Shift+P) — Phase 3 (REQ-11)
- Settings UI / Cmd+, panel — Phase 2 (REQ-14); Phase 1 reads `~/.mneme/config.json` directly (manual edit)
- Canvas / Ed sync, sync status surface — Phase 2 (REQ-03 / REQ-13)
- Onboarding wizard — Phase 2 (REQ-16)
- Echo360 webview / iframe / second window — Phase 5 (spike) / Phase 6 (REQ-04 / REQ-05)
- Citations API / anchored mode — Phase 9 (REQ-08)
- Document ingestion (Marker, markitdown) — Phase 4 (REQ-18)
- Block editor (Tiptap) — Phase 3 (REQ-12-adjacent)
- Knowledge graph / three-tier memory — Phase 7 (REQ-07; gated by Phase 5.5)
- FSRS / review focus mode — Phase 10 (REQ-09 / REQ-15)
- Voice input — REQ-19 v1.x candidate, gated by Intel Mac CPU latency spike
- Auto-update / signed installer / notarization — separate v1.x ship-prep phase (not yet scheduled)
- Full font palette / component library / dark-mode tokens / motion timing for components beyond root — `/gsd-ui-phase 1` (UI-SPEC.md is the contract for that)
- TOKENICODE / opcode pattern study — RQ-03 absorbed into `/gsd-plan-phase 1`, not Phase 1 SPEC

## Constraints

- **Stack lock (KD-01)**: Tauri 2 + SvelteKit + `@sveltejs/adapter-static` + `tauri-plugin-shell`; no SSR server; no other frontend framework
- **Lib lock (KD-02)**: `marked`, `katex` (≥ 0.16.21), `dompurify`, Svelte 5 runes
- **Toolchain (KD-03)**: Rust ≥ 1.88 pinned in `rust-toolchain.toml`
- **Identity (Phase 0 D-10 / D-14)**: production `productName: "Mneme"`, `identifier: "dev.mneme.app"`, window title `"Mneme"` — irreversible after Phase 1 ships
- **Vendoring (KD-12)**: `claude-code-parser` is copied into `vendor/`, NOT installed via npm — upstream is unmaintained
- **No `--bare`** (spike F4 / F6): incompatible with OAuth subscription auth; subscription billing is the only legal cost model for personal use
- **No multi-LLM provider** (OOS-08): only the local `claude` CLI is supported
- **Local-first (KP-01)**: no cloud syncing of usage logs, costs, or chat history; everything under `~/.mneme/` stays local
- **OSS adoption note (KP-02)**: every dependency must be MIT/Apache-2.0/MPL-2.0; no AGPL/proprietary library shipped (opcode is study-only per Phase 0 OSS lessons)
- **macOS-only target**: Intel Mac (user's MacBook Pro 2019, macOS Ventura 13.4); no Windows/Linux build paths in Phase 1
- **Cost discipline**: every `claude` spawn passes `--max-turns 30` and `--add-dir <scratch>` and `--exclude-dynamic-system-prompt-sections`; no exception
- **Visual aesthetic (KP-09 / KD-13)**: 4 mandatory color anchors + serif body + cubic-bezier motion + soft 8% borders + multi-layer soft shadow set at root level; full token palette in `/gsd-ui-phase 1`
- **Existing pitfall ownership**: Phase 1 closes Pitfalls 1, 2, 3, 4 (CRITICAL); Pitfall 6 (vault soft-lock) is Phase 3; Pitfall 5 (embedding lock-in) is Phase 7

## Acceptance Criteria

- [ ] `npm run tauri dev` launches a window titled "Mneme" with three resizable columns + top-bar reservation; window minimum 1024×600
- [ ] Drag any column divider, quit (Cmd+Q), relaunch → split positions restored within 1 px (localStorage round-trip)
- [ ] `tauri.conf.json` declares `productName: "Mneme"` and `identifier: "dev.mneme.app"`; macOS Dock shows "Mneme" after `npm run tauri build`
- [ ] Submit prompt "what is 2+2" → chunky monospace text streams during `text_delta` events → on `result` event, message converts to rendered markdown via `marked` + KaTeX + DOMPurify
- [ ] After submitting one prompt and pressing Cmd+Q, `ps aux | grep "[c]laude --print"` returns 0 rows within 2 s; repeat 5×, cumulative orphan count is 0
- [ ] Chat header displays `$<current> · $<today>` updating after each `result` event; `~/.mneme/usage.jsonl` gains one line per session result
- [ ] With `daily_cost_cap_usd: 0.01` in config, second new-session spawn is blocked with a modal; first session's `claude-bin` process is NOT spawned (verified by `ps`)
- [ ] `grep -c '"args": true' src-tauri/capabilities/default.json` returns 0; `bash scripts/audit-capabilities.sh` exits 0
- [ ] Malicious payload `<img src=x onerror=alert(1)>` and `$\href{javascript:alert(2)}{x}$` render inert (no alert dialog, no `onerror` attr in DOM, `\href` produces literal text)
- [ ] Subprocess command line (visible in dev-mode debug log) contains `--max-turns 30 --add-dir /Users/<user>/.mneme/scratch --exclude-dynamic-system-prompt-sections`
- [ ] Fresh session's first prompt has `result.usage.cache_creation_input_tokens` < 20,000 (down from spike's ~107k)
- [ ] `src/app.css` contains `#d97757`, `#faf9f5`, `#141413`, `#2b2a27`, a serif font-family, and `cubic-bezier(0.165, 0.85, 0.45, 1)`; contains zero references to `Arial` or `Inter`
- [ ] `vendor/claude-code-parser/` exists with `LICENSE` (MIT) and at least one `.ts` source file copied from upstream; `package.json` has zero references to `claude-code-parser` as a dependency
- [ ] KaTeX version in `package-lock.json` ≥ 0.16.21; DOMPurify config explicitly forbids `script`, `iframe`, `object`, `embed`, and `on*` attributes
- [ ] `app.html` declares CSP `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'`
- [ ] Production `src-tauri/icons/` contains assets sourced from repo-root `icon-assets/` (not the spike's placeholder)
- [ ] `rust-toolchain.toml` pins Rust ≥ 1.88

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                  |
|--------------------|-------|------|--------|------------------------------------------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Three-pane shell + 4 critical pitfalls + 3 REQs all named explicitly    |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | 16 explicit out-of-scope items with phase pointers                      |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Stack/lib/toolchain locks; identity locks; vendoring; cost discipline   |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 16 pass/fail checks (file greps, ps counts, ps round-trip, render tests)|
| **Ambiguity**      | 0.16  | ≤0.20| ✓      | Gate passed                                                             |

## Interview Log

| Round | Perspective    | Question summary                                  | Decision locked                                                                            |
|-------|----------------|---------------------------------------------------|--------------------------------------------------------------------------------------------|
| 0     | (auto-mode)    | Initial scoring from ROADMAP + REQS + spike state | Goal 0.78 / Boundary 0.55 / Constraint 0.75 / Acceptance 0.72 — boundary below minimum     |
| 1     | Researcher     | What exists today vs target state?                | Spike 002 is single-pane chat; production needs three-pane + 4 critical pitfalls closed     |
| 2     | Simplifier     | Irreducible core for Phase 1?                     | One chat session + three placeholders + zombie cleanup + cost cap + capability hardening    |
| 3     | Boundary Keeper| What is NOT in Phase 1?                           | Vault config, real file tree, real PDF preview, multi-session, palette, settings UI, mind-map, Echo360, citations, doc ingestion, block editor, KG, FSRS, voice — all explicit downstream phases |
| 3     | Boundary Keeper| `--add-dir` target without vault?                 | `~/.mneme/scratch/` placeholder; Phase 2 swaps with real vault root                          |
| 3     | Boundary Keeper| Cost cap config without settings UI?              | `~/.mneme/config.json` (manual edit), `~/.mneme/usage.jsonl` for log; Phase 2 wires the UI   |
| 3     | Boundary Keeper| Visual aesthetic depth for Phase 1?               | Shell-level CSS tokens only (4 colors + serif + motion curve + borders/shadows); component-level palette deferred to `/gsd-ui-phase 1` |
| 4     | Failure Analyst| What goes wrong if requirements ship loose?       | Zombies burn quota silently; capability wildcards open future-Echo360 attack surface; cost runaway from cache miss + agent loops; XSS from streaming markdown bypass — all 4 must close BEFORE dogfooding |
| 5     | Seed Closer    | Any remaining undecided territory?                | claude-code-parser vendoring path (KD-12 confirms `vendor/`, not npm); split persistence (localStorage chosen over Tauri Store plugin — simpler, no extra dep); cost cap reset semantics (on-spawn check, no background timer) |

[Auto-mode: all decisions made by Claude based on ROADMAP.md success criteria + REQUIREMENTS.md REQ-01/02/10 + PITFALLS.md Pitfalls 1-4 + spike-findings-mneme skill + Phase 0 D-10/D-14 identity locks + KD-12 vendoring rule + KP-09/KD-13 visual aesthetic. User instruction "work without stopping for clarifying questions" honored.]

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Spec created: 2026-05-07*
*Next step: /gsd-discuss-phase 1 — implementation decisions (file layout, IPC patterns, exact validator regex set, cost meter UI shape, vendoring mechanics, RQ-03 TOKENICODE/opcode pattern absorption)*
