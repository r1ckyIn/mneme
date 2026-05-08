# Phase 1: Tauri Shell Foundation + Subprocess Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered and the rationale paths.

**Date:** 2026-05-08 (started 2026-05-07; date rolled mid-session)
**Phase:** 01-tauri-shell-foundation-subprocess-hardening
**Mode:** discuss (advisor mode active — `USER-PROFILE.md` exists; calibration tier `minimal_decisive` from `vendor_philosophy: opinionated`); `--analyze` overlay
**Areas discussed:** 4 advisor-researched + 5 follow-up HOWs + 1 license-posture project-level confirmation
**SPEC integration:** `01-SPEC.md` loaded (6 reqs, ambiguity 0.08); `spec_loaded = true`. SPEC requirements were not re-litigated — discussion focused exclusively on HOW.

---

## Cross-reference Todos (workflow step `cross_reference_todos`)

`gsd-sdk query todo.match-phase 1` returned 3 matches at score 0.6 (weak keyword match):

| Todo | Area | Score | Folded? |
|---|---|---|---|
| Triage awesome-design-md vs awesome-claude-design for KD-13 | planning | 0.6 | reviewed-for-awareness (ui-phase 1 trigger) |
| Spec Claude (free) mode source display + conflict resolution (REQ-08 / Phase 9) | planning | 0.6 | not folded — Phase 9 |
| Evaluate thea for question generation | research | 0.6 | not folded — Phase 10 |

**User's choice:** "只折 Triage VoltAgent" — VoltAgent triage retained as awareness pointer for next `/gsd-ui-phase 1`; the other two left in pending state for their respective phases.

---

## Area 1 — 三栏布局 + 拖拽分隔条 (advisor-researched)

| Option | Description | Selected |
|--------|-------------|----------|
| Vanilla CSS Grid + pointer events + `$state` runes | Zero npm-dep, runes-native, KP-09 zero style pollution, top-bar reserve hook free; ~60-80 LOC fresh | ✓ |
| `svelte-splitpanes` v8.0.14 (MIT) | Declarative API + keyboard resize built-in — but Svelte 5 compat-mode bug under global `runes: true`, default styles need full KP-09 override later, +1 KP-08 registry entry | |

**User's choice:** "自己装（vanilla CSS Grid + JS）推荐"
**Notes:** Codified in CONTEXT.md D-01. Subsequent OSS-criteria validation (D-08) confirmed: svelte-splitpanes is 471★ + 1 maintainer (sub-threshold).

---

## Area 2 — Subprocess lifecycle 状态机所在层 (advisor-researched)

| Option | Description | Selected |
|--------|-------------|----------|
| **Option A** Full Rust state machine | `tauri::State<Mutex<Option<CommandChild>>>` + `CloseRequested` + `ExitRequested` double-hook union + `libc::killpg` PGID kill; reusable foundation for Phase 4/7 subprocesses | ✓ |
| Option B JS-only `onCloseRequested` + `child.kill()` | Frontend stays simple (spike-002 minimal change) — but advisor strongly opposed: JS `onCloseRequested` cannot intercept macOS `NSApplicationTerminate` (Cmd+Q path); `child.kill()` cannot kill `claude`'s grandchildren (process group) — REQ-3 acceptance physically unreachable | |

**User's choice:** "Rust 后端状态机 + 双门铃 + killpg 推荐"
**Notes:** Codified D-10/D-11/D-12. Sources cited from advisor research: tauri issue #9198 (`ExitRequested` macOS reliability), tauri-plugin-shell `CommandChild` docs (kill behavior), `libc::killpg` for PGID kill required because `claude` CLI calls `setsid()`.

---

## Area 3 — `claude-code-parser` vendor depth + Capability validator SSOT (advisor-researched, combined sub-decisions A + B)

### Sub-decision A: parser vendor depth

| Option | Description | Selected |
|--------|-------------|----------|
| A1 Full repo (src + tests + LICENSE) | upstream-diff transparency, tests as event-schema documentation | |
| **A2** Only `src/` + LICENSE + `VENDOR.md` snapshot | Minimal actionable footprint (~30KB), aligns with KD-12 "frozen reference" stance, mneme tests replace upstream's stale tests | ✓ |

### Sub-decision B: validator SSOT

| Option | Description | Selected |
|--------|-------------|----------|
| B1 Hand-maintain `default.json` + grep audit | SPEC's literal text — minimal tooling but high drift risk for Phase 2/3/7 spawn-arg additions | |
| **B2** TS SSOT (`spawn-args.ts`) + prebuild `gen-capabilities.ts` + diff audit | One-source TS truth; build-time sync; audit upgrades from "no wildcards" → "no SSOT drift" | ✓ |
| B3 Rust programmatic `tauri::ipc::Capability` builder | Verified by advisor (Context7 + tauri-plugin-shell `build.rs`) to be **infeasible** — Tauri 2 capability is purely declarative JSON/TOML, no runtime builder | (rejected — infeasible) |

**User's choice:** "A2 + B2（推荐）"
**Notes:** Codified D-13/D-14/D-15. The combination (A2 + B2) is intentionally complementary: both are "one-time defensive infrastructure investments" addressing different drift surfaces (vendor-modification log vs spawn-arg JSON drift).

---

## Area 4 — RQ-03 community wrapper pattern absorption depth (advisor-researched)

| Option | Description | Selected |
|--------|-------------|----------|
| **Targeted read** | OpenCovibe (Tauri 2 + Svelte 5 + Apache-2.0 — *direct stack match*, advisor's discovery) session-actor + layout components; TOKENICODE `useStreamProcessor.ts` for `finalizeOnce` + `control_request` + rAF; opcode UX screenshots only (~15 min, AGPL — no code adoption); skip claude-code-gui (JSONL-tail divergence) + siteboon (web + AGPL) | ✓ |
| Just-in-time | No upfront read; consult specific project on block — but TOKENICODE took 503 commits to land its three lifecycle patterns; reinventing risks mid-execute context-switch | |

**User's choice:** "Targeted read（推荐）"
**Notes:** Codified D-16. Advisor surfaced **OpenCovibe** (`AnyiWang/OpenCovibe`) which was missing from STACK.md — this is now an authoritative Phase 1 reference (Tauri 2 + Svelte 5 + Apache-2.0, code-level adoption allowed). Note: rAF flushing pattern from TOKENICODE is **deferred to Phase 3** per D-21 (only `finalizeOnce` + `control_request` adopted in Phase 1).

---

## Layout follow-up 1 — first-launch column widths

| Option | Description | Selected |
|--------|-------------|----------|
| 20 / 40 / 40 favor right chat | Reading + chat each ~40%, narrow file-tree placeholder | |
| 25 / 35 / 40 favor right chat (initial recommendation) | Aligns with VS Code / Notion / Cursor muscle memory | |
| 33 / 33 / 33 even | (User initially selected this then immediately corrected — see notes) | (initial mis-click) |
| 30 / 40 / 30 | (User-provided correction: file-tree+preview / video-prep middle / chat) | ✓ |

**User's choice:** "30/40/30分，左边是文件栏以及文件预览的地方，中间是预留的放视频的地方，但是没有视频的时候我还不知道放什么，右边的是聊天区，我还想在这三个下面加一览，用来预览脑图或者知识图谱的实时变化和动效"
**Notes:** Codified D-02 (column ratios), D-03 (bottom row addition — modifies SPEC REQ-1 layout from top-bar to bottom-row reservation), D-04 (middle-pane placeholder text). User explicitly capture-tagged the "底部一览预览脑图/KG 实时变化和动效" → recorded in `<deferred>` (Phase 7+8 trigger). Initial AskUserQuestion was overly narrow (only asked about ratios); user expanded vision in correction. Re-execution acknowledged the misframe per profile directive.

---

## Layout follow-up 2 — top-bar handling

| Option | Description | Selected |
|--------|-------------|----------|
| **Drop top-bar entirely; mind-map fully moved to bottom row** | Layout becomes 3 columns + bottom row; SPEC REQ-1 amends top-bar reservation → bottom-row reservation | ✓ |
| Top-bar as status bar + bottom row as mind-map | Two stripes — top with telemetry, bottom for mind-map | |
| Both top-bar + bottom row reservations | Compresses 3-column usable height too much | |
| Keep top-bar reservation only (SPEC original) | Defers user's bottom-row idea entirely | |

**User's choice:** "取消顶栏、mind-map 完全挪到底栏（推荐）"
**Notes:** Codified D-03. SPEC REQ-1 amendment listed as plan-phase coordination item.

---

## Layout follow-up 3 — initial window size

| Option | Description | Selected |
|--------|-------------|----------|
| **1280 × 860** | Common AI-chat desktop starting size; ~89% × ~96% of 13" MacBook Pro 1440×900 screen | ✓ |
| 1440 × 900 | Full 13" MBP screen — comfortable but feels cramped on first launch | |
| 1100 × 700 | Compact, near SPEC minimum but column widths cramped | |
| User-measure Claude Desktop directly | (Offered as honest alternative since I couldn't find Claude Desktop's exact value) | |

**User's choice:** "1280 × 860（推荐）"
**Notes:** Codified D-05. Web search did not surface Claude Desktop's exact macOS BrowserWindow value (Anthropic closed-source; community Linux ports like aaddrick/claude-desktop-debian haven't published the constants). User accepted 1280×860 as a sensible default; easy adjustment later if real value surfaces.

---

## Mid-pane placeholder text

| Option | Description | Selected |
|--------|-------------|----------|
| A: Keep SPEC original `"Select a file to preview"` | SPEC-locked text, but PDF-leaning (doesn't match user's "video preview" mental model) | |
| **B: `"Lecture video / file preview — wired in Phase 4 + 6"`** | Dual semantics (video + file); explicit phase pointer | ✓ |
| C: Defer text choice to plan-phase | CONTEXT only locks position, not text | |

**User's choice:** "B"
**Notes:** Codified D-04. SPEC REQ-1 amendment.

---

## 5 HOW points (final round)

User's first answer to "5 个 HOW 点怎么处理": "5 个都展开" — all five expanded.

### #1 Window chrome (corrected after user provided Claude Desktop screenshot)

| Option | Description | Selected |
|--------|-------------|----------|
| ~~A: `decorations: true` macOS native title bar~~ (initial) | Default macOS chrome with title-bar text + buttons + visual divider — rejected because not Claude-Desktop-aligned | |
| ~~B: `decorations: false` borderless~~ (initial) | Self-implement drag region + buttons — a11y risk, not Claude-Desktop-aligned (Claude Desktop screenshot proves it has buttons) | |
| **`decorations: true` + `titleBarStyle: "Overlay"` + `hiddenTitle: true`** (corrected option after screenshot) | Native red/yellow/green buttons + hidden title text + content extends under buttons — matches Claude Desktop's actual chrome pattern | ✓ |

**User's choice:** "Claude desktop是无边框吗，这还是有三个按钮啊，按照Claude desktop来吧，我把图片给你了" → "decorations:true + titleBarStyle:Overlay + hiddenTitle:true"
**Notes:** I miscoded option B as "无边框 Anthropic 纯净风" — user's screenshot disproved this. Codified D-06. SPEC REQ-1 amendment.

### #2 Telemetry handling (corrected after user pointed out cost was deleted)

| Option | Description | Selected |
|--------|-------------|----------|
| ~~Original A: All retained at chat-input top-line~~ (initial — included `cost`) | (User correction: SPEC Round 4 already deleted cost meter — option list was wrong) | |
| **A (corrected): UI shows only streaming dot; TTFT / event count / duration → dev console.log** | Aligns with Claude Desktop's no-telemetry-chrome style; SPEC's dev-mode debug log path consistent | ✓ |
| B (corrected): All retained at chat-input top-line | Spike-002 telemetry style — useful for debug but not Claude-Desktop-aligned | |
| C (corrected): Drop entirely | Even dev console silenced — extreme | |

**User's choice:** "在spec我们就已经决定没有cost计算了" (correction) → "A: UI 只留 streaming dot、其余 dev console（推荐）"
**Notes:** I miscoded telemetry list to include `cost` — user correction acknowledged. Codified D-18.

### #3 stream_event rAF flushing in Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| A: Implement now (~30 LOC) | TOKENICODE-validated 50-100 re-renders/sec issue; one-shot vs retrofit | |
| **B: Defer to Phase 3** | Short Phase 1 prompts don't show jank; revisit when long streams emerge | ✓ |

**User's choice:** "B: 推到 Phase 3"
**Notes:** Codified D-21. The TOKENICODE pattern is acknowledged in D-16 but not implemented now.

### #4 + #5 Stop button + Shift+Enter newline

| Option | Description | Selected |
|--------|-------------|----------|
| **A: Both implemented** | Stop button (stream-only) + Enter sends + Shift+Enter newline; aligns with Claude / Cursor / ChatGPT / Notion conventions | ✓ |
| B: Only Stop, no Shift+Enter | Multi-line via paste; stream cancelable | |
| C: Implement neither (literal SPEC) | Single hotkey, multi-line paste-only, stream Cmd+Q-only | |

**User's choice:** "和Claude chat当前模式对齐" → A
**Notes:** Codified D-19/D-20. SPEC REQ-6 amendment listed as plan-phase coordination.

---

## License posture (project-level — surfaced unexpectedly during final-yes/no)

After all decisions, user asked "AGPL是什么意思，开源没法用？" — triggered explanation of strong-copyleft "infection". User initially said "我觉得问题不大只要项目有价值即便是AGPL", but after seeing the precise consequence (mneme would be forced to AGPL forever; future MIT/portfolio release blocked; learners couldn't fork to MIT), user re-evaluated.

| Posture | Description | Selected |
|--------|-------------|----------|
| **姿态 1 全开** | AGPL solved + mneme itself becomes AGPL forever | |
| **姿态 3 维原** (recommended) | AGPL READ-ONLY (study, screenshots, architecture writeups), no code copy; mneme retains MIT/Apache choice | ✓ |
| **姿态 2 隔离** | AGPL only via subprocess CLI (process boundary); not relevant to opcode (desktop app, not CLI) | |

**User's choice:** "姿态 3 维原（推荐）：AGPL READ-ONLY、mneme 保留 license 选择权"
**Notes:** Codified D-09. PROJECT.md license posture remains aligned with this stance — no PROJECT-level edit needed. RQ-03 absorption depth (D-16) holds: opcode = UX screenshots only.

## OSS adoption criteria (project-level — codified mid-discussion)

User's direct input 2026-05-08:
> "如果一个项目它真的很热门1k star+并且有多位开源工作者在维护，并且干净活跃，那才有必要直接用，否则的话就和我们之前找到的两个项目一样仅参考代码就不用从头开始思考了"

This refines KP-02 with concrete adoption thresholds. Codified D-08. Re-applied to all Phase 1 OSS evaluations on the spot:

| Module | Candidate | Adoption result |
|---|---|---|
| 3-column layout | svelte-splitpanes (471★ + 1 maintainer) | sub-threshold → vanilla |
| NotebookLM 3-pane | Open Notebook / SurfSense / NotebookLLaMA / InsightsLM | stack-incompatible (React + web + cloud + RAG) → vanilla |
| Subprocess lifecycle | (no qualifying ≥1k★ permissive crate exists) | greenfield Rust |
| Tauri Claude wrapper | opcode (21.7k★ AGPL ⛔) / siteboon (10.6k★ AGPL ⛔) / TOKENICODE (Apache <1k★) / OpenCovibe (Apache <1k★) | targeted reference only |
| stream-json parser | claude-code-parser (unmaintained 9KB MIT) | vendored reference (KD-12) |

Promotion of D-08 to PROJECT.md KP-02 explicit text deferred to next milestone (see CONTEXT.md `<deferred>`).

---

## Claude's Discretion (areas user said "you decide" or that are plan-phase concerns)

- Exact LOC structure of the splitter component (vanilla CSS Grid implementation as a single Svelte component vs `use:action` directive)
- `rust-toolchain.toml` pin granularity (`1.88` vs `1.88.0`) per Phase 0 LEARNINGS macOS-CLI version-precision lesson
- Dev-console telemetry helper API surface (per-event vs aggregated logging)
- `nix` vs `libc` Cargo crate for `killpg` syscall (decided based on existing transitive deps in Tauri 2)

---

## Deferred Ideas

(See CONTEXT.md `<deferred>` for the full structured list. High-level summary:)
- Bottom row mind-map / KG live preview content + animation (Phase 7+8)
- VoltAgent triage (folded for awareness, ui-phase 1 trigger)
- PROJECT.md KP-02 absorption of D-08 OSS criteria (next milestone)
- KaTeX/DOMPurify comprehensive XSS payload set (plan-phase or `/gsd-secure-phase 1`)
- Reviewed-but-not-folded todos: thea (Phase 10), REQ-08 free mode (Phase 9)

---

## Process notes (workflow auditing)

- **Date roll**: discussion started 2026-05-07, system clock advanced to 2026-05-08 mid-session. CONTEXT.md uses 2026-05-08.
- **Mid-flow corrections**:
  - User initial 33/33/33 column-width selection was a mis-click; corrected to 30/40/30 with bottom-row addition.
  - I miscoded `decorations: false` as "Anthropic 纯净风" — user-supplied screenshot proved Claude Desktop has native chrome (titleBarStyle: Overlay pattern). Acknowledged misread per profile directive.
  - I miscoded telemetry list to include `cost` — user pointed out SPEC Round 4 already deleted cost meter. Acknowledged.
  - User asked "所有代码从头写吗" mid-flow → I initially said "~400 LOC port from spike" which contradicts SPEC L13-20 ("do NOT bulk-copy"). Corrected to "~1000-1200 LOC fresh write; spike-002 = reference only via spike-findings skill".
- **Profile directives applied**:
  - Controller mode + concise + Chinese-first throughout
  - Did NOT skip Socratic interview (user demanded full interaction in spec-phase 1 frustration; honored here per `feedback_socratic_no_auto_skip` memory)
  - Acknowledged scope misreads directly without defensive explanation, re-executed original ask
  - Did not fabricate Claude Desktop window size when web search was inconclusive (offered honest "I don't know exact value" + sensible default)
- **Advisor mode tier**: `minimal_decisive` (1-2 options per area + decisive recommendation), reflected vendor_philosophy: opinionated.
- **Web searches performed**: svelte-splitpanes star count (verified 471★), NotebookLM clone OSS landscape (no SvelteKit/Tauri match), Claude Desktop default window (inconclusive — closed-source), claude-desktop-debian asar source (BrowserWindow constants not exposed).

---

*End of discussion log.*
