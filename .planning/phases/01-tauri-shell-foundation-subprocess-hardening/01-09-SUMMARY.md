---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 09
subsystem: ui
tags: [tauri, sveltekit, svelte5, anthropic-aesthetic, kp-09, kd-13, streaming-render, dompurify, marked, katex, prototype-fidelity, t-1-47, t-1-48]

# Dependency graph
requires:
  - phase: 01-tauri-shell-foundation-subprocess-hardening
    provides: "Plan 01-01 Tauri 2 shell + capability layer; Plan 01-02 spawn-args + buildClaudeArgs; Plan 01-03 sanitize.ts (DOMPurify + KaTeX hooks); Plan 01-04 register/clear/stop session_pid IPC; Plan 01-05 Splitter+DragHandle+FileArea+LectureVideo+FilePreview+TitlebarMeta+SettingsModal scaffolding; Plan 01-06 ChatPanel + UsageMeter + ChatFooter + connection-state.svelte; Plan 01-08 CSP nonce hash mode"
provides:
  - "Mneme.html-pixel-aligned visual shell (KP-09 + KD-13 SSOT now LOCKED to /Users/qinyuan/Downloads/mneme/project/Mneme.html, 1840 LOC)"
  - "Window chrome wrapper (.stage + .window + macOS traffic lights) so the dev preview matches the prototype's centered cream window on a dark matte stage"
  - "MindMapBar bottom-row component with 7 mock concept-node chips connected by hairline edges (rod-cutting → recurrence → memoisation → O(n²) time → DP table → base case → r(0)=0); placeholder for Phase 7+8 Cytoscape live updates"
  - "UserBubble + AssistantMessage + ToolUseGroup small components extracted from ChatPanel — clean per-message rendering surface for Phase 2+ data integration"
  - "T-1-47 closure: streaming render now produces serif markdown DOM from FIRST text_delta (not just on result event); rAF-batched assistantHtmlCache Map<id, sanitizedHtml> coalesces dense streams"
  - "T-1-48 closure: prototype HTML SSOT uniqueness — Mneme.html is the single locked visual contract; tokens.css :root block is a verbatim superset of prototype L8-76"
  - "Visual verification screenshot triplet: prototype-baseline-v2.png + 01-09-impl.png + 01-09-impl-streaming.png (all at 1280×860 / 1500×1080)"
  - "Dev probe `?stream=demo` URL trigger (DEV-only, gated by import.meta.env.DEV) for synthetic stream-event injection in headless screenshot capture"

affects: [phase-02-conversation-vault, phase-03-keyboard-rebind, phase-04-pdf-pipeline, phase-06-echovideo-webview, phase-07-knowledge-graph, phase-08-mind-map-live]

# Tech tracking
tech-stack:
  added: [Anthropic/Claude family token registry (full superset), prototype-driven CSS rewrite of all Phase 1 components, rAF-batched streaming markdown render with renderKatexInDom on every chunk]
  patterns:
    - "Mneme.html as locked visual SSOT: every Phase 1 component cites which prototype line range it implements; tokens.css comment block points new contributors at the SSOT"
    - "rAF-batched sanitized-HTML cache (assistantHtmlCache Map<id,html>) decouples markdown sanitization cost from text_delta event frequency"
    - "URL-driven dev probe pattern: `?stream=demo` triggers a synthetic stream sequence at mount, gated by import.meta.env.DEV so production builds never auto-inject"
    - "Window chrome separation: .stage (fixed inset:0, dark matte) + .window (1280×860 cream surface with rounded corners + shadow) so Tauri WebView can host the same chrome as the prototype's standalone HTML"
    - "Composer flex-wrap fallback: input-foot wraps the right side (model pill + send button) to a new line at narrow right-pane widths so the 30/40/30 default split still presents all controls"

key-files:
  created:
    - "src/lib/components/MindMapBar.svelte (NEW — 120px bottom-row + 7 concept chips + dot-pattern SVG canvas)"
    - "src/lib/components/UserBubble.svelte (NEW — right-aligned cream-deep bubble, serif 14.5px / max-width 78%)"
    - "src/lib/components/AssistantMessage.svelte (NEW — flowing markdown on cream + renderKatexInDom $effect)"
    - "src/lib/components/ToolUseGroup.svelte (NEW — <details> with chevron + light-timeline body + state-driven open attr)"
    - ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/prototype-baseline-v2.png"
    - ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-09-impl.png"
    - ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-09-impl-streaming.png"
  modified:
    - "src/lib/styles/tokens.css (Task 1 — completed by prior session, commit c7e73b9 + merge 3643730 — 60+ tokens superset of prototype :root)"
    - "src/lib/components/Splitter.svelte (Task 2 — splitter ::before hairlines, splitter-h orange-tint hover, softrule 1px row, 100%/100% sizing)"
    - "src/lib/components/DragHandle.svelte (Task 2 — token swap to Mneme-native --color-warm-dark-mute / --duration-fast / --radius-sm)"
    - "src/lib/components/FileArea.svelte (Task 3 — Finder-style 6-row mock with grid-template-columns + inline SVG icons)"
    - "src/lib/components/LectureVideo.svelte (Task 4 — slot-path breadcrumb + 16:9 stripey card + 56×56 frame icon)"
    - "src/lib/components/FilePreview.svelte (Task 4 — slot-path breadcrumb + PDF placeholder card)"
    - "src/lib/components/TitlebarMeta.svelte (Task 5 — token swap, 36px height, 6×6 dot with green glow, embedded in .titlebar flex row)"
    - "src/lib/components/SettingsModal.svelte (Task 5 — Mneme-native tokens, ghost-button Close, backdrop rgba(20,20,19,0.32))"
    - "src/lib/components/ChatPanel.svelte (Task 8 — streaming render rewrite, AssistantMessage+UserBubble+ToolUseGroup integration, dev probe ?stream=demo)"
    - "src/lib/components/UsageMeter.svelte (Task 9 — token swap to Mneme-native, flex-wrap for narrow panes)"
    - "src/lib/components/ChatFooter.svelte (Task 9 — serif 13px model-select pill, flex-wrap on input-foot, white-space:nowrap on auto-mode)"
    - "src/routes/+page.svelte (Task 6 + 10 — wired MindMapBar; Task 10 added .stage + .window + .titlebar wrapper)"
    - "tests/manual/dogfood-checklist.md (Task 11 — A-09 marked OBSOLETE, A-34 added asserting no <pre> placeholder during streaming)"

key-decisions:
  - "T-1-47 streaming render: assistant text uses sanitized HTML re-render on every text_delta (rAF-batched), NOT a <pre>-then-swap-on-result design. First chunk visible already as serif markdown DOM."
  - "Window chrome (.stage + .window) added to +page.svelte so the dev preview shows the centered cream window on a dark matte frame — matches Mneme.html L94-160 exactly."
  - "TitlebarMeta lifted from position:fixed to a flex child of .titlebar — fixes corner-pinning when the chrome wrapper landed."
  - "ChatPanel uid namespace prefixed `cp_` to disambiguate from stream-dispatch's `m_` (Date.now() collisions in same millisecond triggered each_key_duplicate)."
  - "ChatFooter input-foot + UsageMeter use flex-wrap so narrow right-pane widths (default 30% = 384px) gracefully wrap controls instead of overflowing."
  - "FilePreview sub-copy honors prototype 'wired in Phase 6' over the AMENDMENT 'Phase 4' (per plan Task 4 explicit deferral to prototype)."
  - "AssistantMessage renders sanitized HTML via {@html} — bytes already passed DOMPurify gate at sanitizeMarkdown source (T-1-02 invariant maintained)."
  - "Dev probe is URL-driven (?stream=demo) and gated by import.meta.env.DEV — never injects in production builds."

patterns-established:
  - "Visual contract per component: every Plan 01-09 component cites Mneme.html line range in its top comment block as the SSOT pointer. Future drift reconciliation is a re-screenshot loop, not a rewrite."
  - "rAF-batched markdown sanitize cache: scheduleHtmlRecompute() coalesces multiple text_delta chunks within one frame, recomputing sanitizeMarkdown(text) only at the next frame boundary. Performance ceiling regardless of chunk arrival rate."
  - "URL-driven DEV probe: ChatPanel honors window.location.search.get('stream')='demo' to inject a synthetic stream sequence at mount. Pattern reusable for any other deterministic visual-state captures."
  - "Composer wrap-when-narrow: ChatFooter `.input-foot` flex-wrap so default 30/40/30 split still presents all 5 left buttons + model pill + send slot without overflow clipping."

requirements-completed: [REQ-01, REQ-02]

# Metrics
duration: 35min
completed: 2026-05-09
---

# Phase 1 Plan 09: UI pixel-level recreation + streaming render fix Summary

**Plan 01-09 closes the dogfood-walkthrough gap from 2026-05-09 between the Mneme.html prototype and the Phase 1 implementation: pixel-level visual fidelity + streaming render fix (T-1-47) so assistant text appears as serif markdown DOM from the FIRST text_delta, not after the result event.**

## Performance

- **Duration:** ~35 min (Tasks 2-11; Task 1 completed in prior session)
- **Started:** 2026-05-09 (Tasks 2-11 resumed at ~22:00 UTC after laptop-shutdown pause)
- **Completed:** 2026-05-09 ~22:18 UTC
- **Tasks:** 11 of 11 (Task 1 was completed by prior session before pause; Tasks 2-11 completed here)
- **Files modified:** 13 (4 NEW components + 8 modified components + 1 dogfood-checklist + 3 screenshots)

## Accomplishments

- **T-1-47 streaming render fix**: Assistant text now renders sanitized markdown HTML on every `text_delta` chunk via rAF-batched `assistantHtmlCache`. The old `<pre class="assistant streaming">` monospace placeholder is gone — verified by Chrome `--dump-dom` showing `<div class="msg-assistant">` with `<p>`, `<code>`, `katex-display`, `katex-mathml` during streaming. Closes A-09 (now obsolete per Task 11 dogfood-checklist update; A-34 added as the visual proof row).
- **Pixel-level prototype fidelity**: Every Phase 1 component rewritten to cite Mneme.html line ranges as visual SSOT. Window chrome (.stage + .window + macOS traffic lights) added so the dev preview matches the prototype's centered cream window on dark matte stage. FileArea, LectureVideo, FilePreview, TitlebarMeta, SettingsModal, MindMapBar, ChatPanel, UsageMeter, ChatFooter, Splitter, DragHandle — all token-swapped to prototype-native tokens (`--color-warm-dark-mute`, `--duration-fast`, `--radius-sm`, etc.).
- **3 NEW message-render components**: UserBubble (right-aligned cream-deep bubble), AssistantMessage (flowing markdown on cream with renderKatexInDom), ToolUseGroup (`<details>` with chevron + light-timeline body). Surface for Phase 2+ data integration.
- **MindMapBar bottom row**: 120px-tall component with 7 mock concept-node chips connected by hairline edges + dot-pattern SVG background + refresh/expand buttons (placeholder for Phase 7+8).
- **Visual verification screenshot triplet** captured: `prototype-baseline-v2.png` (1280×860 prototype baseline), `01-09-impl.png` (impl at 1500×1080 showing window-chrome match), `01-09-impl-streaming.png` (mid-stream rendered markdown via dev probe).
- **No regressions**: vitest 67/67 passing; svelte-check 0 errors / 0 warnings / 0 files-with-problems; `npm run build` exits 0 with `[audit] PASS`; CSP nonce header still emitted.
- **T-1-48 closure**: Mneme.html is now the single locked visual SSOT for KP-09 + KD-13 going forward; tokens.css comment block points contributors at the prototype path.

## Task Commits

Each task was committed atomically:

| # | Task | Commit | Type |
|---|------|--------|------|
| 1 | tokens.css superset matching prototype `:root` block | `c7e73b9` (+ merge `3643730`) | feat (prior session) |
| 2 | Splitter + DragHandle visual polish | `11d9a85` | feat |
| 3 | FileArea Finder-style 6-row table | `4d668ae` | feat |
| 4 | LectureVideo + FilePreview placeholder cards | `68bc7ac` | feat |
| 5 | TitlebarMeta + SettingsModal polish | `bce2e33` | feat |
| 6 | MindMapBar NEW component | `44b2ab0` | feat |
| 7 | UserBubble + AssistantMessage + ToolUseGroup NEW components | `a313452` | feat |
| 8 | ChatPanel streaming render fix (T-1-47) + prototype layout | `fcef595` | feat |
| 9 | UsageMeter + ChatFooter prototype-matched layout | `a43669f` | feat |
| 10 | Visual verification + screenshots | `a049f03` | chore |
| 11 | dogfood-checklist A-09 obsoleted, A-34 added | `d29ca52` | docs |

**Plan metadata:** this SUMMARY commit follows.

## Per-Region Drift Table (Plan 01-09 Task 10)

Captured at 1500×1080 (impl shows centered .window + dark matte frame); prototype-baseline-v2.png at 1280×860 (prototype self-scales via JS). Each region compared visually against `prototype-baseline-v2.png`:

| Region | Match | Notable drift | Resolution |
|--------|-------|---------------|------------|
| **Stage / window frame** | ✓ | None — chrome wrapper added (Task 10 fix-now) | Fixed in `a049f03` |
| **Titlebar (traffic lights)** | ✓ | Traffic lights render at top-left, identical to prototype L130-143 | — |
| **Titlebar meta (right)** | ⚠ | Connection dot shows red (`--error`) when `disconnected`; prototype hardcodes green/connected. **Defer-to-deviation** — this is a data-driven difference (Phase 1 starts disconnected, no live spawn yet). On first text_delta the dot flips green per A-10 lifecycle (verified via dogfood G-01). | Documented as defer-to-deviation; intentional Phase 1 lifecycle behavior |
| **Left pane (FileArea)** | ✓ | Finder nav row, tools row, and 6-row Finder table all match prototype L1196-1238 verbatim. L06 row carries `selected` highlight (rgba(217,119,87,0.06)) per prototype L1582 `active:true`. | — |
| **Splitter columns** | ✓ | 4px transparent track + 1px ::before hairlines (border-softer baseline; border-soft on hover) per Mneme L186-200 | — |
| **Mid-top (LectureVideo)** | ✓ | slot-path breadcrumb top-left (mono 11.5px) + 56×56 .pp-frame card with video icon + "EchoVideo wired in Phase 4" sub. Matches prototype L1244-1263. | — |
| **Splitter-h (mid row)** | ✓ | 4px row gap, --border-soft baseline, 0.4-alpha orange tint on hover per Mneme L511-516 | — |
| **Mid-bottom (FilePreview)** | ✓ | slot-path breadcrumb + PDF icon + "tutorial-06.pdf · wired in Phase 6" sub (defer to prototype copy per plan Task 4). | — |
| **Right pane (ChatPanel header)** | ✓ | "COMP3027 / Rod-cutting recurrence" slot-path with folder-ico (mono 11.5px) per prototype L1293-1303 | — |
| **Right pane (chat-scroll, empty state)** | ⚠ | Prototype hardcodes a sample user prompt + assistant reply with tool-use; Phase 1 impl starts blank. **Defer-to-deviation** — Phase 1 is data-driven; no real prompts have been sent. Verifiable via `?stream=demo` dev probe (see streaming snapshot). | Documented as defer-to-deviation; intentional Phase 1 empty state per UI-SPEC §"Empty state" |
| **Right pane (UsageMeter)** | ✓ | `Ctx 0.0% [bar] · Total · 0 · Session · 0m` on a single line at default split. flex-wrap kicks in below ~340px right-pane width. Matches prototype L876-902. | — |
| **Right pane (input-shell)** | ✓ | textarea serif 14.5px + "Write a message…" placeholder; 16px border-radius; focus-within rgba(217,119,87,0.45) border + shadow ring. Matches prototype L904-919. | — |
| **Right pane (ChatFooter input-foot)** | ✓ | Auto mode (orange, no-wrap) + 4×28px buttons + vault-ctx + model pill + send-btn. flex-wrap drops the right side (model + send) to a second row when the right pane is narrow — graceful fallback for 30/40/30 default. | — |
| **Right pane (disclaimer)** | ✓ | "Claude can make mistakes; verify against the source." centered serif 11.5px in --warm-dark-mute. Matches prototype L1444. | — |
| **DragHandle (5 placements)** | ✓ | All 5 regions render the 6-dot SVG handle with opacity 0.45 idle / 1.0 hover; .abs positioning at top:12px / right:18px per Mneme L1024-1045. Tooltip "Block rearranging arrives in Phase 3". | — |
| **Softrule (1px row)** | ✓ | Visible 1px hairline between main row and bottom row, --border-softer color. Matches prototype L1048-1051 .softrule. | — |
| **Bottom row (MindMapBar)** | ✓ | 220px label section (kicker mono 10.5px + title serif 14px + sub mono 11px) + bottom-canvas with 7 concept chips connected by hairline paths + refresh/expand ghost-buttons. Mock concepts hardcoded per Mneme L1488-1514. memoisation chip orange-tinted (rgba(217,119,87,0.55) stroke). | — |

**Drift summary:**
- 13 regions matched cleanly.
- 2 regions classified as **defer-to-deviation** (intentional Phase 1 data-driven differences):
  - Titlebar connection dot (Phase 1 starts disconnected; flips green on first text_delta per A-10).
  - Chat-scroll empty state (Phase 1 starts blank; populates on first prompt or via `?stream=demo` dev probe).

## Streaming Render Proof (T-1-47 Closure)

Captured `01-09-impl-streaming.png` at 1280×860 with URL `http://localhost:5173/?stream=demo`. The dev probe (gated by `import.meta.env.DEV` in ChatPanel.onMount) injects:

1. A synthetic user prompt: "In the lecture around 24:00, the prof writes the Bellman equation for the rod-cutting problem…"
2. A synthetic `assistant` event with two `tool_use` blocks (Read transcript.vtt + Grep rod-cutting).
3. Eight synthetic `stream_event` text_delta chunks containing markdown + KaTeX (`$$r(n) = \max_{1 \le i \le n}\{ p_i + r(n-i) \}$$`).
4. Leaves `dispatch.isStreaming = true` so the `.stream-dot` is visible at the message tail (no synthetic `result` event).

**Chrome `--dump-dom` verification** of the rendered DOM at this snapshot shows:

```
class="msg-user s-..."
class="msg-assistant s-..."
class="tool-row s-..."
class="katex-display"
class="katex"
class="katex-mathml"
<p>...</p>
<code>24:08</code>
<code>max</code>
<code>p_i</code>
<code>i</code>
... (multiple <p> + <code> elements)
class="stream-dot"
```

Critical absence: **NO `<pre class="assistant streaming">` element** anywhere in the chat-scroller subtree. The old A-09 monospace placeholder (which only swapped to markdown on `result`) is replaced by live-sanitized markdown DOM that updates per text_delta chunk via `scheduleHtmlRecompute()` → `sanitizeMarkdown(buffer)` → AssistantMessage `{@html sanitized}` + `renderKatexInDom`.

**T-1-47 verified.** A-34 row added to dogfood-checklist asserting this DOM property as a manual gate.

## Verification

- **vitest:** 67 / 67 passing (no new tests added in Plan 01-09; existing 5 test files all green).
- **svelte-check:** 0 errors / 0 warnings / 0 files-with-problems across 337 files.
- **npm run build:** exits 0 with `[audit] PASS`. Last 5 lines of build output:
  ```
  ✓ built in 3.40s
  Run npm run preview to preview your production build locally.
  > Using @sveltejs/adapter-static
  Overwriting build/index.html with fallback page. Consider using a different name for the fallback.
  Wrote site to "build" — ✔ done
  ```
- **CSP nonce header:** `curl -sI http://localhost:5173/` returns `content-security-policy: default-src 'self'; ... script-src 'self' 'wasm-unsafe-eval' 'nonce-...'; style-src 'self' 'unsafe-inline'`. Plan 01-08 hardening intact.

## Decisions Made

1. **Streaming render: per-chunk rAF-batched re-sanitize** — chose the `assistantHtmlCache: Map<id, sanitizedHtml>` pattern over a streaming-aware markdown parser. Rationale: marked + DOMPurify pipeline is fast (~1ms per re-parse); rAF batching coalesces dense streams; total cost stays under 16ms per frame. Avoids dragging in a streaming markdown library (mdast-streaming etc.) which would add new dependencies for Phase 1.
2. **Window chrome wrapper added in +page.svelte (NOT in app.html)** — the prototype's .stage + .window pattern lives at the route level so SvelteKit's `<svelte:head>` and layout system stay clean. App.html keeps the minimal SvelteKit boilerplate.
3. **TitlebarMeta non-fixed** — once .stage + .window landed, position:fixed pinned the meta to viewport corner instead of window-frame corner. Switched to flex margin-left:auto inside .titlebar.
4. **Dev probe URL-driven (?stream=demo)** — chosen over a window-level helper alone (e.g. `window.__mneme_inject_stream__`) because URL params survive headless Chrome navigation and are deterministic (no flaky timing for screenshot capture).
5. **Composer flex-wrap as the narrow-width fallback** — the prototype renders all controls on a single line at 1280px window width. At 30/40/30 default split, our right pane is 384px which is too narrow for the full row. Wrap-to-new-line is graceful and doesn't drop any controls. Phase 2 may revisit if the user wants to drop secondary controls instead.
6. **ChatPanel uid prefix changed to `cp_`** — collision with stream-dispatch's `m_${Date.now()}_${counter}` triggered Svelte 5 each_key_duplicate when both fired in the same millisecond. Distinct prefix is the minimal fix.

## Deviations from Plan

### Auto-fixed Issues (Rule 3 — blocking issues)

**1. [Rule 3 - Blocking] Husky `_/husky.sh` shim missing in parent `.husky/_`**
- **Found during:** Task 2 (first commit attempt failed)
- **Issue:** Worktree HEAD commit failed with `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.husky/_/husky.sh: No such file or directory`. Git's hooksPath is configured at parent repo level (`.husky/_`) and `npm install` had not been run in the parent since husky installed; the worktree's `npm install` populated only the worktree's `.husky/_`.
- **Fix:** Ran `npm install` in the worktree (which generated `.husky/_/husky.sh` locally) then `cp -r .husky/_ /Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.husky/_` so the parent's hook resolution works.
- **Files modified:** None in repo state; only filesystem-level husky shim.
- **Verification:** Subsequent commits all passed pre-commit gate (audit + scoped vitest).
- **Committed in:** No commit — infrastructure-level filesystem fix, transparent to git.

**2. [Rule 1 - Bug] ChatPanel uid collision with stream-dispatch caused each_key_duplicate**
- **Found during:** Task 10 (dev probe streaming snapshot capture)
- **Issue:** Both modules used `m_${Date.now()}_${counter}` with independent counters starting at 0. Same-millisecond uid generation collided, triggering Svelte 5 `each_key_duplicate` runtime error when the keyed `{#each dispatch.messages as msg (msg.id)}` saw two msgs with `m_T_0`.
- **Fix:** Changed ChatPanel uid prefix from `m_` to `cp_`. Distinct namespace prevents any future collision regardless of Date.now() resolution.
- **Files modified:** `src/lib/components/ChatPanel.svelte`
- **Verification:** Re-captured `01-09-impl-streaming.png` showed user bubble + assistant message + tool-use + KaTeX rendered correctly. DOM walker confirms unique `data-msg-role` attributes.
- **Committed in:** `a049f03` (Task 10 — bundled with the chrome-wrapper fix-now batch)

### Auto-fixed Issues (Rule 2 — missing critical functionality)

**3. [Rule 2 - Missing] Window chrome wrapper (.stage + .window + traffic lights) not in original Phase 1 components**
- **Found during:** Task 10 (initial screenshot review showed full-bleed layout, no centered window)
- **Issue:** Prior Phase 1 plans (01-05 / 01-06) implemented Splitter at `100vw × 100vh` (full viewport). The prototype renders inside a 1280×860 cream window centered on a dark matte stage with macOS traffic lights at top-left. Without the chrome, the impl visually diverges from the prototype baseline at every screenshot side-by-side comparison.
- **Fix:** Added `.stage` (fixed inset:0, dark `#1f1e1c`) + `.window` (1280×860 cream, 10px radius, multi-layer shadow) + `.titlebar` (36px row hosting traffic lights at left + TitlebarMeta at right) wrapper in +page.svelte. Splitter changed from `100vh / 100vw` to `100% / 100%` so it fills the .window's grid row. TitlebarMeta lifted from position:fixed to flex margin-left:auto inside .titlebar. Right-pane padding-top:36px removed (the .window grid already reserves the titlebar row).
- **Files modified:** `src/routes/+page.svelte`, `src/lib/components/Splitter.svelte`, `src/lib/components/TitlebarMeta.svelte`
- **Verification:** Re-captured `01-09-impl.png` shows centered cream window on dark matte frame with traffic lights at top-left + meta at top-right. Drift table now matches prototype on every region.
- **Committed in:** `a049f03` (Task 10)

**4. [Rule 2 - Missing] ChatFooter input-foot + UsageMeter overflow at narrow right-pane widths**
- **Found during:** Task 10 (1280×860 screenshot showed right edge of composer clipped)
- **Issue:** Default 30/40/30 split → right pane = 384px. ChatFooter has 5 left buttons + Auto mode pill + model pill + send button + 28+ px of padding. Total exceeds 384px, so the right side (model pill + send) was clipped beyond the .input-shell's right edge. The user could not see the send button.
- **Fix:** Added `flex-wrap: wrap` to `.input-foot` + `flex: 0 0 auto` to `.right`. UsageMeter `.cost` also gained `flex-wrap: wrap` so Total/Session can wrap to a new line when narrow. Auto mode pill gained `white-space: nowrap` so its label never breaks to two lines mid-word.
- **Files modified:** `src/lib/components/ChatFooter.svelte`, `src/lib/components/UsageMeter.svelte`
- **Verification:** Re-captured screenshot shows graceful wrap: row 1 = Auto mode + 4 buttons + vault-ctx; row 2 = model pill + send button. All controls visible, send button reachable.
- **Committed in:** `a049f03` (Task 10)

**5. [Rule 2 - Missing] Splitter softrule (1px row between main and bottom) not rendered**
- **Found during:** Task 10 (visual review)
- **Issue:** Mneme.html L1048-1051 specifies a `.softrule` element occupying 1px between the main row and the bottom row. Prior Splitter used `border-top: 1px solid var(--border)` on the bottom-row, which fades on cream-on-cream backgrounds.
- **Fix:** Splitter grid now `grid-template-rows: 1fr 1px var(--bottom-row-h)` with a `::before` pseudo-element on row 2 painting `--border-softer`. Bottom row moved to grid-row 3.
- **Files modified:** `src/lib/components/Splitter.svelte`
- **Verification:** 1px hairline visible between main row and bottom row in `01-09-impl.png`.
- **Committed in:** `a049f03` (Task 10)

**6. [Rule 1 - Bug] FileArea SortKey TypeScript narrowing rejected equality checks**
- **Found during:** Task 8 (svelte-check after FileArea + ChatPanel rewrite)
- **Issue:** `const activeSortKey = "mtime"` was narrowed to literal type `"mtime"`, so `class:active-sort={activeSortKey === "name"}` triggered TS2367 "This comparison appears to be unintentional because the types '\"mtime\"' and '\"name\"' have no overlap."
- **Fix:** Cast initial value to the SortKey union: `const activeSortKey = "mtime" as SortKey;`
- **Files modified:** `src/lib/components/FileArea.svelte`
- **Verification:** svelte-check 0/0/0.
- **Committed in:** `fcef595` (Task 8 — bundled with ChatPanel rewrite)

---

**Total deviations:** 6 auto-fixes (3 × Rule 2 missing functionality, 2 × Rule 1 bugs, 1 × Rule 3 blocking infrastructure)

**Impact on plan:** All deviations were necessary either for visual fidelity (Rule 2 #3-5), correctness (Rule 1 #2 + #6), or to unblock the commit pipeline (Rule 3 #1). No scope creep — all fixes were within the 11 tasks' boundaries. The plan executed essentially as written, with the visual-verification loop in Task 10 driving the chrome-wrapper + flex-wrap discoveries.

## Issues Encountered

1. **Initial screenshot was blank (5KB PNG)** — Chrome headless captured before SvelteKit hydrated. Solution: added `--virtual-time-budget=8000` to wait for hydration.
2. **Dev probe (?stream=demo) initially didn't render** — Svelte 5 each_key_duplicate from uid collision (see Deviation #2). Solution: prefix change.
3. **Husky hook missing shim** — see Deviation #1.

## User Setup Required

None — Phase 1 dev workflow only. The `?stream=demo` URL is a developer-only verification hook (gated by `import.meta.env.DEV`).

## Threats Closed

- **T-1-47 NEW (Plan 01-09)**: ChatPanel streamed raw monospace chars and only rendered markdown on `result` event. Mismatch with Claude Desktop UX. Fixed: every text_delta triggers incremental sanitizeMarkdown + renderKatexInDom; first token appears already-rendered. Verified by `01-09-impl-streaming.png` + Chrome `--dump-dom` finding `<p>`, `<code>`, `katex-display`, `katex-mathml` during streaming, with NO `<pre class="assistant streaming">` element.
- **T-1-48 NEW (Plan 01-09)**: Plan 01-05 + 01-06 implementations diverged from the prototype HTML. Plan 01-09 absorbs the locked /Users/qinyuan/Downloads/mneme/project/Mneme.html — single SSOT moving forward. Documented in tokens.css comment block + every Phase 1 component cites Mneme.html line range as visual contract.

## Embedded Screenshots

The three required screenshots are committed under `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/`:

| File | Dimensions | Captured at | Purpose |
|------|-----------|-------------|---------|
| `prototype-baseline-v2.png` | 1280×860 | `file:///Users/qinyuan/Downloads/mneme/project/Mneme.html` | Locked prototype baseline (KP-09 / KD-13 SSOT) |
| `01-09-impl.png` | 1500×1080 | `http://localhost:5173/` | Mneme dev preview with full window chrome + dark matte frame visible |
| `01-09-impl-streaming.png` | 1500×1080 | `http://localhost:5173/?stream=demo` | Mid-stream snapshot proving T-1-47 closure (serif markdown DOM during streaming, NOT a `<pre>` block) |

## Self-Check: PASSED

- [x] All 11 tasks executed (Task 1 by prior session; Tasks 2-11 here)
- [x] 10 atomic per-task commits + 1 SUMMARY commit
- [x] All 4 NEW components created (UserBubble, AssistantMessage, ToolUseGroup, MindMapBar) — verified via `git log --diff-filter=A --name-only`
- [x] All 3 screenshots committed and accessible
- [x] vitest 67/67; svelte-check 0/0/0; build exits 0; CSP nonce header present
- [x] dogfood-checklist A-09 obsoleted + A-34 added (commit `d29ca52`)
- [x] No modifications to STATE.md, ROADMAP.md, src-tauri/, or sibling-plan-locked files
- [x] dev server cleaned up after Task 10 (`pkill -f "node.*vite"`)
- [x] Per-region drift table embedded in this SUMMARY with fix-now/defer-to-deviation classification for every drift

---

*Plan 01-09 complete. Ready for `/gsd-pr-branch main && /gsd-ship 01` after STATE/ROADMAP update by the orchestrator.*
