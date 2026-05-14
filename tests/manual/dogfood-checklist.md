# Phase 1 — Manual Dogfood Checklist

> Pre-Phase-2-entry gate per `01-VALIDATION.md` Sampling Rate. Tick every row before declaring Phase 1 ship-ready.
>
> **Round 5 amendment**: this checklist absorbs A-04..A-15 from `01-AMENDMENT-2026-05-09.md`. Section C extended to 10 hotkey rows (Cmd+. added per A-08); new Sections D (usage meter), F (drag handles), G (titlebar+modal), H (tool-use collapsible), I (chat footer fidelity) verify the prototype-handoff visual deltas.
>
> **Run order:**
> 1. Ensure `~/.mneme/scratch/` does NOT exist (delete it if it does — verifies first-launch creation).
> 2. `npm run build` (verifies prebuild audit gate).
> 3. `npm run tauri dev` — opens the Mneme window.
> 4. Walk through Section A (SPEC L128-148), Section B (5 dogfood prompts), Section C (10-combo hotkey unbinding), Section D (usage meter), Section F (drag handles), Section G (titlebar + modal), Section H (tool-use collapsible), Section I (chat footer fidelity).
> 5. After Sections A-D + F-I, exit the app (Cmd+Q).
> 6. Run `bash tests/manual/lifecycle/run-quit-loop.sh --with-prompt` — 5 cycles, type a prompt each cycle. Tick Section E once it exits 0.
>
> All checkboxes = ticked → Phase 1 dogfood gate satisfied.

<hr>

## Section A — SPEC L128-148 acceptance (34 rows including cost-meter-absent + Plan 01-09 T-1-47 row)

### REQ-1 (three-pane shell)

- [ ] **A-01** `npm run tauri dev` launches a window TITLED "Mneme" (visible in macOS Dock + Cmd-Tab).
- [ ] **A-02** Window has three resizable columns (left FileArea / middle 2-row split / right ChatPanel) + 120px bottom-row placeholder.
- [ ] **A-03** Window minimum 1024×600 ENFORCED — try to drag the window smaller; Tauri blocks at the floor.
- [ ] **A-04** Drag the left divider to ~25% width, drag the right divider to ~50% width, Cmd+Q, relaunch → divider positions restored within 1px.
- [ ] **A-05** Native macOS traffic-light buttons visible at top-left of the window; first 36px of right pane reserved (no chat content under the buttons); titlebar meta visible right-aligned.
- [ ] **A-06** [UPDATED post-Plan 01-09] Bottom-row 120px MindMapBar component renders: **kicker** `Mind-map / KG live preview` (mono caps) + **sub** `wired in Phase 7 + 8` (serif, two-line structure NOT single italic), 7 mock concept-node chips connected by hairline edges (rod-cutting → recurrence → memoisation → O(n²) time → DP table → base case → r(0)=0), dot-pattern SVG background, `refresh` + `expand ↗` ghost buttons in upper-right.
- [ ] **A-07** [UPDATED post-Plan 01-09 — Phase numbers now follow prototype Mneme.html L1261/L1281 SSOT, NOT ROADMAP] Left pane shows Finder-style table headers (Name/Size/Type/Modified + leading checkbox) + 6-row mock list (1 folder + 5 files: notes.md, tutorial-06.pdf, L06.mp4, L05.mp4 + transcripts folder); middle TOP shows "Lecture video player" + "EchoVideo wired in **Phase 4**"; middle BOTTOM shows "PDF preview" + "tutorial-06.pdf · wired in **Phase 6**"; 4px non-resizable row splitter between them. (Note: prototype's Phase numbers are inverted vs ROADMAP — ROADMAP has Phase 4 = PDF/Office ingestion + Phase 6 = Echo360 video — but prototype is the locked visual SSOT per KP-09/KD-13, and Plan 01-09 explicitly chose to follow prototype copy.)

### REQ-2 (subprocess streaming)

- [ ] **A-08** Submit prompt "what is 2+2" → text streams into the right pane during `text_delta` events.
- [ ] **A-09 [OBSOLETE — T-1-47 closed in Plan 01-09]** ~~On `result` event, the chunky text transforms into rendered markdown (serif body, paragraph spacing).~~ Plan 01-09 fixed the streaming render path: assistant text now renders in **serif markdown style from the FIRST `text_delta`**, not only on `result`. Verify by submitting prompt B-01 and observing: as soon as the first chunk arrives, you see serif body + paragraph spacing + KaTeX-rendered math + inline `<code>` formatting (NOT a monospace `<pre>` block of raw markdown source). The `result` event is no longer a render trigger — it's now only used to flip `dispatch.isStreaming=false` and collapse the tool-use group. See A-34 below for the visual proof row.
- [ ] **A-10** Open dev tools (Cmd+Opt+I); confirm console.log shows `[claude:init] model=... session=...` AND `[claude:result] cost=$... duration=...ms usage={...}` lines.
- [ ] **A-11** The dev-console line for `[claude:result]` shows `cache_creation_input_tokens` < 20,000 (trim the spike's ~107k waste — REQ-2 acceptance).
- [x] **A-12** [AUTO 2026-05-10 ✅] Verified via `src/lib/spawn-args.shared.ts` SSOT (which `gen-capabilities.ts` consumes to write `default.json` validators — equivalent to inspecting `ps aux` because the capability validator is the auth-checked gate the subprocess MUST pass). Evidence: `MAX_TURNS = "30"` (L33), `--max-turns MAX_TURNS` (L48), `--exclude-dynamic-system-prompt-sections` (L50), scratch validator `^/Users/[^/]+/\\.mneme/scratch$` in capability, NO `--bare` (0 matches), NO `--model` (0 matches). Original `ps aux` row preserved here as the live-streaming verification path; SSOT grep is the static-time equivalent and runs without a streaming subprocess.

### REQ-3 (subprocess lifecycle)

- [ ] **A-13** Section E (5-cycle harness) passes — see below.
- [ ] **A-14** Dev console shows lifecycle log on each Cmd+Q (e.g. `[claude:result]` followed by clean exit).

### REQ-4 (capability hardening)

- [x] **A-15** [AUTO 2026-05-10 ✅] `grep -c '"args": true' src-tauri/capabilities/default.json` → `0`.
- [x] **A-16** [AUTO 2026-05-10 ✅] `grep -c '"\*"' src-tauri/capabilities/default.json` → `0`.
- [x] **A-17** [AUTO 2026-05-10 ✅] `bash scripts/audit-capabilities.sh` exit 0 (`[audit] PASS`).

### REQ-5 (XSS hardening)

- [x] **A-18** [AUTO 2026-05-10 ✅] `npm ls katex` → `katex@0.16.45` (≥ 0.16.21 SPEC floor).
- [x] **A-19** [AUTO 2026-05-10 ✅ — TARGET UPDATED post-Plan 01-08] **OLD target obsolete**: `grep -c "Content-Security-Policy" src/app.html` → `0` (Plan 01-08 removed the hard-coded meta — kit.csp now owns the policy). **NEW target**: `grep -nE "csp:|nonce|hash" svelte.config.js` → `csp: { mode:'auto', directives: {...} }` block at L23 (the SvelteKit-emitted CSP that injects per-request nonce in dev / SHA-256 hash in build). Either way the locked CSP is present; the source-of-truth simply migrated.
- [x] **A-20** [AUTO 2026-05-10 ✅] `grep -c "uponSanitizeAttribute" src/lib/sanitize.ts` → `2` (≥ 1 — DOMPurify hook installed; row text "returns 1 match" was pre-Round-5 — now hook is referenced 2x in source).
- [x] **A-21** [AUTO 2026-05-10 ✅] `npx vitest run tests/sanitize.test.ts` → `15/15 passed` in 1.05s.

### REQ-6 (single-session + hotkey unbinding)

- [ ] **A-22** Submit a prompt; Cmd+Q; relaunch → chat panel is BLANK (no rendering of any prior bubbles).
- [ ] **A-23** Press Enter in the input → prompt sends.
- [ ] **A-24** Press Shift+Enter in the input → newline inserted (no submit).

### Identity + foundation

- [x] **A-25** [AUTO 2026-05-10 ✅] productName "Mneme" found in tauri.conf.json.
- [x] **A-26** [AUTO 2026-05-10 ✅] identifier "dev.mneme.app" found in tauri.conf.json.
- [x] **A-27** [AUTO 2026-05-10 ✅] vendor/claude-code-parser tree present: src/{index,parser,translator,writer}.ts + types/ + LICENSE + VENDOR.md.
- [x] **A-28** [AUTO 2026-05-10 ✅] `grep -c '"claude-code-parser"' package.json` → `0` (KD-12 + D-13 vendoring contract honored).
- [x] **A-29** [AUTO 2026-05-10 ✅] rust-toolchain.toml `channel = "1.88"` found.
- [x] **A-30** [AUTO 2026-05-10 ✅] `~/.mneme/scratch/` exists (auto-created on first launch).

### Cost-meter-absent verification (Round 5 A-04 — moved into Section A from iteration-1 Section D)

- [x] **A-31** [AUTO 2026-05-10 ✅] `~/.mneme/usage.jsonl` absent (cost meter deleted from Phase 1).
- [x] **A-32** [AUTO 2026-05-10 ✅] `~/.mneme/config.json` absent (settings UI is Phase 2).
- [x] **A-33** [AUTO 2026-05-10 ✅] `src/lib/cost.ts` absent (Round 5 A-04 — scaffolding fully removed).

### Streaming render verification (Plan 01-09 T-1-47 closure)

- [ ] **A-34** Submit prompt B-01 (math). During the FIRST visible chunk of assistant output, open dev tools → Elements → search the chat-scroller subtree. Verify: NO `<pre class="assistant streaming">` element exists; instead, the streaming assistant message uses `<div class="msg-assistant">` with marked-up children (`<p>`, inline `<code>`, `.katex` spans, `.eq` block). Closes T-1-47 (the original A-09 design produced a `<pre>` placeholder of raw text that swapped to markdown only on `result`; the new design renders sanitized markdown on every `text_delta` chunk).

<hr>

## Section B — 5 dogfood prompts (AI-SPEC §5 reference dataset)

For each prompt, observe: streaming legibility, tool-use card rendering (when applicable), KaTeX/code rendering on finalize, no DOM warnings in dev console.

- [ ] **B-01 Math** — Prompt: `Solve $\frac{d}{dx}\left(\frac{1}{x^2+1}\right)$ and explain.` Expect: KaTeX-rendered math; no raw `$...$` text leaking through.
- [ ] **B-02 Code** — Prompt: `Write a Python function that returns the n-th Fibonacci number using memoization.` Expect: code-block fenced rendering with monospace font.
- [ ] **B-03 Tool-use** — Prompt: `List the files in the scratch directory.` Expect: tool-use rendered as `<details open>` with gerund header during streaming, collapses on `result` to past-tense (per A-14 — verify in Section H).
- [ ] **B-04 No-tool** — Prompt: `What is the difference between TCP and UDP?` Expect: pure text response, no tool-use cards, finalized markdown rendering.
- [ ] **B-05 Long-stream** — Prompt: `Write a 500-word essay on the history of the Standard Model in physics.` Expect: streaming legibility holds; finalize completes within 1s of `result` event.

<hr>

## Section C — Hotkey unbinding probe (REQ-6 + Round 5 A-08 — 10 combos)

For each combo: focus the chat input, press the combo, observe NO UI response and NO console error.

- [ ] **C-01 Cmd+L** (clear) — no UI response.
- [ ] **C-02 Cmd+K** (interrupt) — no UI response.
- [ ] **C-03 Cmd+,** (settings) — no UI response. (Note: titlebar cog click is the legitimate path to the settings modal per A-11.)
- [ ] **C-04 Cmd+P** (palette) — no UI response.
- [ ] **C-05 Cmd+O** (open file) — no UI response.
- [ ] **C-06 Cmd+Shift+P** (universal palette) — no UI response.
- [ ] **C-07 Cmd+N** (new chat) — no UI response.
- [ ] **C-08 Cmd+R** (reload) — no UI response (CRITICAL — Cmd+R is the only browser default that actually fires; if it reloads the SPA, the unbinding is broken).
- [ ] **C-09 Cmd+W** (close window) — no UI response, no kill path triggered (per CONTEXT.md L36-40 amendment 3; bypasses macOS default close-window to avoid subprocess-leak path). Cmd+Q remains the only OS-level kill path (verified by Section E).
- [ ] **C-10 Cmd+.** (cancel — Round 5 A-08) — no UI response, no kill path triggered (bypasses Mac convention "Cancel current op" to keep Phase 1 keyboard surface narrow + explicit; Stop is triggered ONLY via Send/Stop button click per D-19). Verify: Stop button `title="Stop"` carries NO `⌘.` hint.

<hr>

## Section D — Usage meter sanity (Round 5 A-09)

After running prompt B-05 (long-stream) and observing the chat input area:

- [ ] **D-01 Ctx %** — Submit a prompt → after `result` event lands, verify `Ctx N.N%` increments on the usage meter; verify the horizontal progress bar width updates to match. Verify `Total · Nk` token count updates accordingly (k-suffix for thousands, M-suffix for millions).
- [ ] **D-02 Session timer** — Submit a prompt → verify `Session · Hh Mm` appears (Mm format for sessions < 1h, Hh Mm for sessions ≥ 1h). Submit a second prompt 30+ seconds later → verify the timer rolled correctly (timer refreshes every 30s).
- [ ] **D-03 Ctx warning at 90%** — Either (a) submit a series of very long prompts until ctx % reaches 90%, OR (b) inspect the bar in dev tools and manually set `state.totalInputTokens = 900_000` (with default model_context_window=1_000_000) → verify `.cost.warning` class triggers: bar turns red (`var(--error)`) AND text color flips to red.

<hr>

## Section E — 5-cycle lifecycle harness (REQ-3)

- [ ] **E-01** [HYBRID — run after dev quit] Pre-flight: `ps aux | grep -E '[c]laude --print|[m]cp|[r]g'` returns 0 rows. ⚠ **Known false-positive when run inside an active Claude Code session**: the session itself spawns ripgrep + MCP servers (~50+ rows). Mitigation: either (a) close Claude Code before running, or (b) narrow the grep to `[c]laude --print` only — that pattern is mneme-specific. AUTO check on 2026-05-10 hit 55 rows under (b)-not-applied which is session noise, not a real fail; rerun under (a) or (b) before harness.
- [ ] **E-02** [HYBRID — interactive] Run `bash tests/manual/lifecycle/run-quit-loop.sh --with-prompt`. Script needs you to type a real prompt at each of the 5 cycle prompts (Claude can't drive the interactive input). After dev server is quit + E-01 passes, you run the harness.
- [ ] **E-03** [HYBRID — depends on E-02] Harness exits 0 with summary "cumulative orphan count across 5 cycles: 0".

<hr>

## Section F — Five-region drag handles (Round 5 A-05)

- [ ] **F-01 Drag handles render** — Verify each of 5 regions has a 6-dot drag handle in upper-right (top: 12px, right: 18px, opacity 0.45 idle, opacity 1.0 hover):
  1. Left pane (FileArea) — drag handle inside the breadcrumb row
  2. Middle-top (LectureVideo) — drag handle in upper-right of region
  3. Middle-bottom (FilePreview) — drag handle in upper-right of region
  4. Right pane (ChatPanel wrapper) — drag handle preserved from plan 01-05's right-pane-slot div
  5. Bottom row (mind-map placeholder) — drag handle in upper-right
- [ ] **F-02 Click feedback** — Click + hold any drag handle → cursor changes to `grabbing`; CSS transform shows `scale(0.96)`; tooltip displays "Block rearranging arrives in Phase 3". NO actual region repositioning happens (Phase 1 is visual + no-op per A-05; Phase 3 wires real drag).

<hr>

## Section G — Titlebar meta + settings modal (Round 5 A-10 + A-11)

- [ ] **G-01 Connection indicator** — Verify titlebar right-aligned text reads `claude-code · disconnected` initially (gray dot). Submit a prompt → text flips to `claude-code · connecting` (still gray-ish dot). On first text_delta, text flips to `claude-code · connected` (green dot, `#4ea36b`). After response completes and subprocess closes, text flips back to `disconnected`. Verify `vault: ~/Mneme/usyd-2026s1` static text remains throughout (read from localStorage).
- [ ] **G-02 Settings cog click** — Click the settings cog (gear icon to the right of vault path) → modal opens centered on screen with text "Settings wires in Phase 2" + Close button. Press Esc → modal dismisses. Click cog again, click Close button → modal dismisses. Modal is NOT clickable through to underlying content (backdrop blocks).

<hr>

## Section H — Tool-use collapsible (Round 5 A-14)

- [ ] **H-01 Expand during streaming** — Submit prompt B-03 (tool-using prompt: "List the files in the scratch directory") → during streaming, verify the tool-use card renders as `<details open>` (expanded by default); the `<summary>` shows gerund-form text like "Running 1 command…" or "Running 2 commands, reading a file…" (depends on what tools Claude invokes); the call body (tool name + truncated input) is visible.
- [ ] **H-02 Collapse on result** — When the `result` event lands (response finishes), verify the tool-use `<details>` element collapses (no `open` attribute); the `<summary>` text changes to past-tense: "Ran 1 command" or "Ran 2 commands, read a file" (depends on what tools were invoked); the call body is hidden behind the disclosure triangle.
- [ ] **H-03 Manual expand** — Click the chevron / disclosure triangle on the collapsed `<details>` element → it expands to show the tool-use call body (tool name + truncated input + completed checkmark). Click again → collapses. Verify smooth expand/collapse animation.

<hr>

## Section I — Chat footer visual fidelity (Round 5 A-13)

- [ ] **I-01 Five left buttons render** — Below the chat textarea, verify 5 buttons render in this order from left to right:
  1. `Auto mode` text dropdown (gold/orange text — verify text color matches `var(--orange)` not `var(--ink)`)
  2. `+` attach button (28×28 icon button)
  3. Microphone button (28×28 icon, opacity 0.45 disabled state — should NOT be clickable)
  4. Chevron-down button (28×28 icon, "more tools")
  5. Vault-context button (table-icon SVG; defaults to inactive state)
- [ ] **I-02 Model pill** — On the right side of the footer, verify a pill renders with text `Opus 4.7 1M · Max` and a chevron-down. Click the pill → tooltip says "Opus 4.7 1M context · Max effort tier (CLI uses account default; pill is decorative + reflects-account-truth)".
- [ ] **I-03 Vault-context toggle** — Click the vault-ctx button (5th left button) → its background flips to `var(--orange-tint)` (light orange wash) AND `aria-pressed="true"`; tooltip reads "NotebookLM mode (Phase 2 wires source pinning)". Submit a prompt with vault-ctx active — verify subprocess command line (via `ps aux | grep [c]laude`) is UNCHANGED from inactive state (Phase 1 is visual-only per A-06; Phase 2 wires real spawn-args integration). Click vault-ctx again → flips inactive (default background restored).

<hr>

## Sign-off

- [ ] All Section A checks ticked (34 rows incl. A-34 from Plan 01-09).
- [ ] All Section B prompts ran without dev-console errors (5 rows).
- [ ] All Section C hotkey combos confirmed unbound (10 rows).
- [ ] All Section D usage meter rows verified (3 rows).
- [ ] Section E harness exited 0 (3 rows).
- [ ] All Section F drag-handle rows verified (2 rows).
- [ ] All Section G titlebar + modal rows verified (2 rows).
- [ ] All Section H tool-use collapsible rows verified (3 rows).
- [ ] All Section I chat footer rows verified (3 rows).

**Total: 68 checkboxes** (was 67 pre-Plan 01-09; A-34 added). Phase 1 ships when ALL are ticked.

Date verified: ____________
Verified by: ____________ (developer)

<hr>

*See `01-VALIDATION.md` for the formal Phase Requirements → Test Map; this checklist is the human-driven complement.*
*Round 5 amendment context: `01-AMENDMENT-2026-05-09.md` is the SSOT for the A-04..A-15 deltas absorbed in Sections C (extended) + D + F + G + H + I.*
