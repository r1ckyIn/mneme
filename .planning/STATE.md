---
gsd_state_version: 1.0
milestone: v5.3.2
milestone_name: milestone
status: unknown
last_updated: "2026-05-12T11:30:00.000Z"
progress:
  total_phases: 13
  completed_phases: 1
  total_plans: 24
  completed_plans: 13
  percent: 54
---

# mneme Project State

> Project memory — the source of truth for "where am I right now and what's next?". Updated automatically by GSD commands; read by Claude on session start.

---

## Project Reference

**Name**: Mneme (codename `learn-os` retired 2026-05-07)
**Core value**: **5-dimension composite** (re-framed 2026-05-07 per `/gsd-explore` session — see PROJECT.md "Core Value" section for full structure: philosophy / experience / architecture / boundaries / landing context). One-line summary (does NOT replace 5-dim structure): *local-first + AI-native personal learning infrastructure whose end-experience is "this AI truly understands me" — proactively surfacing where I am, where I struggle, and how knowledge connects, rather than only answering what I ask*. ⚠ Quoting this single sentence alone loses ~80% of identity.
**Stack (locked by spike 002)**: Tauri 2 + SvelteKit (`adapter-static`) + `tauri-plugin-shell` + `marked` + KaTeX + DOMPurify + Svelte 5 runes
**User**: USYD CS S1 2026 student, MacBook Pro 2019 Intel, macOS Ventura 13.4
**Granularity**: fine (11 phases mapping 18 v1+v1.x requirements)
**Mode**: interactive

---

## Current Position

Phase: 01 (tauri-shell-foundation-subprocess-hardening) — **PAUSED** (paused_for_exploration since 2026-05-11 19:48 +1000)

> ⚠ **Authoritative current state is `.planning/HANDOFF.json`** (`status: paused_for_exploration`, plan `01-07 + 01-10`, task 4/5, timestamp `2026-05-11T09:46:39Z`). This Current Position block is a hand-patched summary after `.planning/forensics/report-20260512-102126.md` exposed that `/gsd-pause-work` does not sync STATE.md (upstream GSD workflow spec gap — see report Finding 1).

**Phase 1 actual progress** (per HANDOFF.json + `.planning/phases/01-.../.continue-here.md`): plans 01-01..01-09 + 01-10 H4 capability fix all shipped (~88% of Phase 1 complete); remaining work = 01-07 Task 4 VISUAL half (47-row dogfood checklist, paused mid-walkthrough) + 01-10 SUMMARY + deferred 01-11 (CSP `connect-src ipc:` gap closure via `/gsd-execute-phase 1 --gaps-only`) + 01-13 (proposed milestone-level `test-foundation` plan — outcome of the `/gsd-explore test-automation` session that triggered the pause).

**Pause rationale**: user fatigue on the 47-row manual visual checklist after 17/18 AUTO rows completed; opened `/gsd-explore test-automation` Socratic session to design AI-takeover of mechanical dogfood steps. That exploration produced `openspec/changes/automate-dev-feedback-loop/` (proposal + design + spec + tasks, validate strict ✓). Next planned action is `/gsd-phase insert 1.5` to lift the openspec change into a cross-cutting Phase 1.5, run `/gsd-plan-phase 1.5` consuming the four openspec artifacts as SPEC input, then `/gsd-execute-phase 1.5` → ship → `/gsd-resume-work` back into Phase 1 dogfood + SUMMARY.

```
[████████████████░░░░] ~80% (Phase 1 alone ~88%; milestone-level 8/11 plans)
```

---

## Phase Map (overview)

```
Phase 0   ─ Identity & Branding Lock                    [complete]
Phase 1   ─ Tauri Shell Foundation + Hardening          [paused ~88%]
Phase 1.1 ─ Dev Feedback Loop Infrastructure (INSERTED) [pending; gates Phase 1 resume + all future UI work]
Phase 2   ─ Vault + Canvas/Ed Sync + Onboarding         [pending]
Phase 3  ─ Multi-Session + Cmd Palette + Editor        [pending]
Phase 4  ─ Document Ingestion (PDF/Office → md)        [pending]
Phase 5  ─ Echo360 Spike Resolution                    [pending; gates Phase 6]
Phase 5.5 ─ KG Memory Project Survey (RQ-01)           [pending; gates Phase 7]
Phase 6  ─ Echo360 Video + Bilingual Captions          [pending]
Phase 7  ─ Knowledge Graph + Three-Tier Memory         [pending]
Phase 8  ─ Mind-Map View + Per-Course Rules            [pending]
Phase 9  ─ Anchored Mode + Citations API               [pending]
Phase 10 ─ FSRS-6 Reviews + Focus Mode                 [pending]
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 1 / 11 |
| v1 requirements satisfied | 0 / 10 |
| v1.x requirements satisfied | 0 / 8 |
| Spikes validated | 2 (001 stream-json-recon, 002 tauri-claude-shell) |
| Spikes pending | 1 (echo360-webview-auth, scheduled in Phase 5) |
| Research questions resolved | 1 / 5 (RQ-02 resolved via REQ-18; RQ-01/03/04 still open; RQ-05 ongoing non-blocking) |
| Research questions blocking phase entry | 1 (RQ-01 → Phase 7) |
| v1.x candidates lifted from OOS | 1 (REQ-19 voice input — was OOS-09, lifted 2026-05-07) |

---

## Accumulated Context

### Roadmap Evolution

- Phase 01.1 inserted after Phase 1: dev-feedback-loop-infrastructure (URGENT)
- Phase 01.1 planned 2026-05-12 via `/gsd-plan-phase 01.1 --research --tdd`: CONTEXT + RESEARCH + PATTERNS + 10 PLAN.md (~57 tasks, 7 waves, 12 TDD test tasks), anchored to OpenSpec `automate-dev-feedback-loop` (tasks.md authoritative WHAT per CONTEXT D-PG-01). Design.md patched with v3.1 Errata E1-E6 (no `WebviewWindow::capture()` → `screencapture -l`; no `tauri invoke` CLI → `dev_invoke` binary; SDK is npm pkg not file-drop dir → 6 concrete files across `@gsd-build/sdk` + CJS shim; port 5173 strictPort fail-loud not 1420 fallback 1421; `src-tauri/src/dev.rs` parallel to `session.rs` not `commands/`; Safari 16 LCP try/catch). plan-checker verdict APPROVE / HIGH confidence; 5 non-blocking execute-time concerns flagged (C1 busy-wait → must-fix, C2 nm positive-control → should-fix, C3 playwright devDep → must-fix, C4 vitest regex → info, C5 objc2 MSRV → info).

### Locked Decisions (KD-01 through KD-13)

See PROJECT.md for full text. Quick reference:

- **KD-01**: Stack — Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell (spike 002 validated)
- **KD-02**: Frontend libs — marked + KaTeX + DOMPurify + Svelte 5 runes
- **KD-03**: Rust toolchain ≥ 1.88 (pinned in `rust-toolchain.toml`)
- **KD-04**: Echo360 via Tauri webview + persistent USYD SSO cookie (subject to Phase 5 spike outcome)
- **KD-05**: Citations API for anchored mode (Anthropic Jan 2025 official)
- **KD-06**: FSRS-6 via `ts-fsrs` (open-spaced-repetition org, MIT)
- **KD-07**: No vector DB by default; agentic search replaces RAG
- **KD-08**: Cytoscape.js (default mind-map) + Excalidraw (whiteboard, v2+); knowledge-graph always-on AI-side
- **KD-09**: Tiptap as block editor; markdown as storage
- **KD-10**: Three-tier memory architecture — **library choice DEFERRED until Phase 5.5**
- **KD-11**: Phase entry gate — Echo360 spike must pass before Phase 6 implementation
- **KD-12**: `claude-code-parser` (MIT) vendored in `vendor/`, NOT npm dependency
- **KD-13**: Visual aesthetic system locked to Anthropic/Claude family (per KP-09; full spec deferred to `.planning/references/design/`)

### Active Open Questions (research/questions.md)

- **RQ-01** [BLOCKING for Phase 7]: Memory project survey → resolved in Phase 5.5
- **RQ-03**: GUI wrapper community implementations → absorbed into Phase 1 hardening (TOKENICODE pattern study during plan-phase 1)
- **RQ-04**: GSD `graphify` skill reuse decision → resolved within Phase 7 design
- **RQ-05** [ongoing, non-blocking]: Learning-method epistemic humility — informal observation of higher-achieving students' learning methods (sample n=2 → broaden); findings feed new REQ candidates / OOS revisions / new KP candidates throughout v1 ship + 3-month dogfood window

### Critical Pitfalls Tracked (research/PITFALLS.md)

Phase-by-phase pitfall ownership (must be addressed during the named phase):

| Pitfall | Severity | Owner Phase |
|---------|----------|-------------|
| 1. Subprocess zombies on Cmd+Q | CRITICAL | Phase 1 |
| 2. Capability wildcard window grants | CRITICAL | Phase 1 (default), Phase 6 (Echo360 iframe isolation) |
| 3. API cost runaway from cache miss + agent loops | CRITICAL | Phase 1 (cost meter + caps), Phase 9 (anchored chunking) |
| 4. Markdown XSS via streaming sanitization gap | CRITICAL | Phase 1 |
| 5. Embedding model lock-in / re-embed cost | HIGH | Phase 7 |
| 6. Vault corruption via concurrent writes | HIGH | Phase 3 (soft-lock + Tiptap mtime guard) |
| 7. Echo360 cookie/iframe + USYD SSO failure | HIGH | Phase 5 (spike) |
| 8. KG hallucinated edges + course leakage | HIGH | Phase 7 |
| 9. FSRS Hard misuse + concept calibration drift | HIGH | Phase 10 |
| 10. Solo-dev abandonment at 30% | HIGH | Roadmap structure (front-loaded shipping; v1 = phases 1-4) |

### Key Principles (KP-01 through KP-09)

Honored across the roadmap; no phase contradicts:

- KP-01 Local-first
- KP-02 50% open-source rule (each phase has explicit OSS adoption note)
- KP-03 AI-native data model
- KP-04 Compliant subprocess wrapping (no token extraction)
- KP-05 UI initial design via Claude Design
- KP-06 Reject reinvented wheels
- **KP-07 Proactive contextual recall** ("懂我" experience commitment — added 2026-05-07; AI proactively surfaces session context unprompted; acceptance ≥3/session, ≥90% relevance — gates REQ-07 acceptance)
- **KP-08 OSS dependency tracking + upstream monitoring** (added 2026-05-07; every adopted OSS library registered in `.planning/dependencies.md`; post-v1 automated upstream check at per-row cadence)
- **KP-09 Aesthetic family — inherit Anthropic/Claude visual identity** (added 2026-05-07; warmth over modernity, accessibility over exclusivity, thoughtful restraint over flashy showmanship; full SSOT in `.planning/references/design/`; locked specs in KD-13)

### Project Skills (auto-loaded)

- `spike-findings-mneme` — Implementation patterns + constraints + gotchas from spikes 001 + 002 (CONVENTIONS, claude-subprocess findings, tauri-shell-ui findings). Auto-loaded during all implementation work.

### Existing Validated Foundation

Spike 002 produced a runnable end-to-end demo (Tauri 2 + SvelteKit + claude subprocess + streaming chat with markdown + KaTeX + tool-use roundtrip). Phase 1's job is to **extend and harden** this validated seed — not redo it. Specifically:

- Source: `.planning/spikes/sources/002-tauri-claude-shell/app/src/routes/+page.svelte`
- Locked patterns documented in `spike-findings-mneme/references/{claude-subprocess.md, tauri-shell-ui.md}`
- Phase 1 success criteria explicitly assume this seed; do NOT re-validate the basic subprocess+streaming pattern

### Pending Todos

9 pending — captured during sessions, surface at appropriate phase:

- **Evaluate thea for question generation** (research, 2026-05-07, **product REJECTED · algorithm-layer worth a Phase 10 spike**) — thea.study (closed cloud SaaS, K-12) fails KP-01/KP-02/KD-06/form-factor as a dependency. Separately, the *algorithm* — AI takes source material → produces good concept-review items — is a real engineering problem mneme also has to solve in Phase 10 (REQ-09 concept review, not flashcard). Recommended path: when approaching Phase 10, promote to `/gsd-spike concept-review-item-generation` (½–1 day timebox; black-box probe of thea + Claude API prompt-pipeline experiment against a real USYD lecture). File: `.planning/todos/pending/2026-05-07-evaluate-thea-for-question-generation.md`. Surface trigger: before `/gsd-discuss-phase 10`.

- **Triage awesome-design-md vs awesome-claude-design for KD-13** (planning, 2026-05-07, **deferred to UI-phase entry**) — User surfaced `VoltAgent/awesome-design-md` (generic parent, has small `design-md/claude/` folder); the specialized sibling `VoltAgent/awesome-claude-design` (68 templates, MIT) is **already** in `dependencies.md` Group 10 last-checked today. VoltAgent's DESIGN.md format is **executable scaffold prompts** (a third axis vs the existing theory deep-dive + visual gallery). Decision deferred — at first `/gsd-ui-phase N` run, diff both VoltAgent sources, cross-check tokens against the deep-dive SSOT (Anthropic `brand-guidelines` wins ties), then either drop parent / add as Group 10 row / copy chosen DESIGN.md into Group 9 as Tertiary executable prompt. File: `.planning/todos/pending/2026-05-07-triage-awesome-design-md-vs-awesome-claude-design-for-kd-13.md`. Surface trigger: before first `/gsd-ui-phase`.

- **Spec Claude (free) mode source display + conflict resolution behavior (REQ-08 / Phase 9)** (planning, 2026-05-07, **defer to Phase 9 plan stage**) — REQ-08 lock 了 free ↔ anchored 切换机制，但 free 一侧的具体行为未规范。User 提出三条 free 模式细化：(1) 底部带 `Sources:` 列表（介于 NotebookLM 只讲书本 vs DeepSeek 放飞之间的中间路线，参考 Claude Code 搜资料时的形态）；(2) 3-tier 综合顺序——内置知识 → 网搜最新 → 用户左栏勾选的参考文献；(3) 冲突场景化——三源分歧时显式呈现并按场景给出建议（"考试按课件来 / 现实按最新来"，以税法为例）。不修改 REQ-08 锁定文本，进入 `/gsd-plan-phase 9` 时把这三条加进 Success Criteria + system prompt 注入策略。可能涉及 REQ-17（per-course rules）协同。File: `.planning/todos/pending/2026-05-07-spec-claude-free-mode-source-display-and-conflict-resolution-req-08.md`. Surface trigger: before `/gsd-discuss-phase 9` 或 `/gsd-plan-phase 9`.

- **Cross-project handoff from UniBoard to Mneme via Claude Code** (planning, 2026-05-09, **deferred — 等 UniBoard 工作单元定义明确**) — Anthropic 已有 Claude design (Web) → Claude Code (本地) 的 handoff 模式；同一思路扩展到 UniBoard (FastAPI+Next.js+Supabase+Claude API) → Mneme (本地 Tauri vault)，让"轻量在线消费 + 重量本地深加工"形成闭环。设计前需先回答：移交单元是什么（笔记/AI对话/课程切片）/ 传输协议（deep link / 共享 Supabase / MCP 桥接）/ 链接兼容（`[[wiki-link]]` 跨项目可解析）/ KP-01 离线可用。File: `.planning/todos/pending/2026-05-09-cross-project-handoff-from-uniboard-to-mneme-via-claude-code.md`. Surface trigger: 当 UniBoard 项目"可移交单元"概念落地后回头设计 Mneme 接收端。

- **Built-in PDF editor — Claude Code direct edit/annotate** (planning, 2026-05-09, **defer to Phase 6 plan stage 或新增 PDF-annotation phase**) — 当前 PDF 仅只读预览（Phase 01 FilePreview.svelte + PDF.js）；学习场景需要 freehand / highlight / text annotation，且 Claude Code 通过 tool call 能自动加结构化标注（区别 Obsidian/NotebookLM 的关键 wedge，KP-04）。三选一：(A) PDF.js Editor API 嵌入（最快）/ (B) Excalidraw 覆盖 + 侧车 JSON（KP-01 数据所有权清晰）/ (C) Tauri Rust + pdf-lib/muPDF（精度高 UX 差）。决策依据：标注是否需要烧录到原 PDF（A/C）还是 vault 私有（B）。需暴露 MCP/Tauri command `pdf_annotate(file, page, type, bbox, content)`。File: `.planning/todos/pending/2026-05-09-built-in-pdf-editor-claude-code-direct-edit-annotate.md`. Surface trigger: before `/gsd-discuss-phase 6` 或 ROADMAP 增 PDF-annotation 独立 phase 时。

- **Auto-collapse PDF/video panes when no file/video selected** (ui, 2026-05-09, **可作 Phase 01-N 子任务或 Phase 02 micro-fix**) — Phase 01 三栏布局当前无论是否选中文件/视频都占固定宽度，挤窄对话栏 + 浪费空白。期望：`selectedFile === null` 折叠 PDF 栏；`currentVideo === null` 折叠 video 栏；持久化展开宽度（`localStorage` `mneme.splitter.{pdf,video}`）；折叠把手 ~32px 可点击展开；过渡 ~200ms（KP-09 克制有反馈）。需 `Splitter.svelte` 增 `collapsed` / `collapsedWidth` / `expandedWidth` / `onExpand` props。Files: `src/routes/+page.svelte`、`src/lib/components/{FilePreview,LectureVideo,Splitter}.svelte`. File: `.planning/todos/pending/2026-05-09-auto-collapse-pdf-and-video-panes-when-no-file-or-video-sele.md`. Surface trigger: Phase 01 window-drag blocker 解锁、走 dogfood 阶段时；或独立 Phase 02 micro-fix 启动时。

- **Husky v10 compat — remove deprecated hook shim** (tooling, 2026-05-11, **跨 phase 维护、不阻塞当前 paused-for-exploration**) — `.husky/pre-commit` 顶部仍有旧式 shebang + `_/husky.sh` source 两行，husky v9 兼容、v10 会 fail。每次 commit 都打 deprecation warning（commit `c96ada6` 触发）。修复：删掉那两行（v9 不需要 shim，hook 本身即可执行），grep `.husky/` 全目录确认其它 hook 文件无同样问题，跑空 commit 验证 hook 仍触发 + 无 warning。装这个 hook 的 plan 是 01-07 Task 1（Husky pre-commit + lifecycle harness），现在不处理的话下次升级 husky 会把 audit + scoped vitest 两道 SSOT 守门一起冲掉。File: `.planning/todos/pending/2026-05-11-husky-v10-compat-remove-deprecated-hook-shim.md`. Surface trigger: Phase 1 收尾或 Phase 2 启动前顺手处理。

- **Decide AgentShield runtime monitor enablement** (infrastructure / workflow-upgrade, 2026-05-11, **defer to post-phase-01 ship + first OpenSpec lifecycle dry-run**) — 2026-05-11 三层工作流升级（GSD + OpenSpec + ECC）安装了 `ecc-agentshield@1.5.0` CLI 但故意**没装** runtime monitor（PreToolUse hook）。原因：GSD 自己已有多个 PreToolUse 相关 hooks（`gsd-prompt-guard.js` / `gsd-read-guard.js` / `gsd-workflow-guard.js` / `gsd-validate-commit.sh`）；再加一个不同 owner 的 PreToolUse hook 与 GSD 协同行为未测。Decision input：phase-01 dogfood 期间是否真撞上 secret leak / wildcard permission / 恶意 skill 等 AgentShield 会拦的事故。三选一：(1) 装 runtime 接受协同风险；(2) 保持 CLI-only + 周期性 `agentshield scan --path ~/.claude`；(3) hybrid（`ECC_HOOK_PROFILE=minimal` 或 `ECC_DISABLED_HOOKS=...` 选择性 gate）。Recommended default: (2) 除非 phase-01 出现 specific incident。Baseline scan 已存档：`~/.claude/ecc/agentshield-baseline.json`。File: `.planning/todos/pending/2026-05-11-post-phase-01-agentshield-runtime-decision.md`. Surface trigger: phase-01 ship 完成 + 第一次 `/opsx:propose → /opsx:apply → /opsx:archive` 跑通后。

- **Trigger workflow sync to all r1ckyIn projects** (infrastructure / workflow-upgrade / cross-project, 2026-05-11, **gates on Mneme phase 2-3 ship + AgentShield runtime decision**) — 2026-05-11 三层工作流升级以 Mneme 为试点，其他 r1ckyIn 项目（UniBoard / borealis-fabrics / new-sight / ClaudePulse）暂未同步。当 Mneme dogfood 至少 2-3 phase 且 `/context` 占用稳定 < 15%、AgentShield runtime 决策已定后，启动全量同步。完整策略 + per-project checklist + rollback plan + 风险笔记见 `~/claude/r1ckyIn_GitHub/WORKFLOW-SYNC-STRATEGY.md`。配套 audit report 见 `~/claude/r1ckyIn_GitHub/CLAUDE-MD-SYNC-AUDIT-2026-05-11.md`。Sync 顺序：Tier 0 (L2 SSOT 更新) → Tier 1 (ClaudePulse → UniBoard → borealis → new-sight) → Tier 2 (optional)。总耗时预估 ≈ 3 小时跨 2-3 个 session。File: `.planning/todos/pending/2026-05-11-trigger-workflow-sync-to-all-projects.md`. Surface trigger: Mneme 第 2-3 个 phase ship 完成后。

---

## Session Continuity

**Last GSD command**: `/gsd-pause-work` (2026-05-11 19:48 — paused for `/gsd-explore test-automation` Socratic session). Earlier pause 2026-05-09 ~22:50 (window-drag blocker) was resolved via plan 01-10 H4 capability fix (commit `fcd939a`); the Last action description below is from that earlier pause and is **historical** (preserved for the window-drag debugging trail). For the current 2026-05-11 pause state see `.planning/HANDOFF.json` and `.planning/phases/01-.../.continue-here.md`. For why STATE.md was 3 days stale see `.planning/forensics/report-20260512-102126.md`.
**Last action**: Phase 1 paused mid-debug. 8 of 9 plans done (01-01..06 + 01-08 + 01-09); 01-07 dogfood checkpoint blocked. After plan 01-09 (UI pixel-level recreation + streaming render fix) merged successfully, dogfood walkthrough surfaced two Tauri-specific bugs: (1) traffic-light ghost halo from prototype's fake `.tl` DOM colliding with real macOS overlay traffic-lights — FIXED via commit `d84c1ad` (removed fake DOM, added 70px `.titlebar-spacer`). (2) Window not draggable from any edge ("钉死在屏幕上") — UNRESOLVED. Four fix attempts tried in this session: added `data-tauri-drag-region` on `.titlebar` (Tauri 2 syntax, replacing prototype's Electron-only `-webkit-app-region: drag`); added explicit JS fallback in `+page.svelte` onMount that imports `@tauri-apps/api/window` getCurrentWindow() and binds a global mousedown listener calling `startDragging()`; marked `.stage` as drag-region true and `.window` as drag-region "false" so matte bezel + titlebar resolve as drag targets while inner content opts out; added `cursor: grab/grabbing` for visual feedback. None solved the bug — user reports drag still fails on all edges. Hypotheses for next session in `.continue-here.md` (H1 Tauri JS bridge missing in dev webview / H2 HMR de-armed listener / H3 decorations:true+Overlay flaky on Tauri 2 macOS / H4 missing core:window:allow-start-dragging permission). User's MacBook 13" hits the `@media (max-width: 1340px)` fallback so `.stage` matte bezel is invisible (window 100vw × 100vh) — only the 36px titlebar is theoretically draggable, and even that doesn't work.

**Earlier context (preserved for completeness)**: Phase 1 cross-AI plan review converged at HIGH=0 after cycle 2 (Codex, commit `f74c6e0`). 5 MEDIUMs + 1 LOW from cycle 1 carried forward and were absorbed during execution (PGID test mismatch in 01-04, A-10 connection state non-reactive in 01-05, ChatPanel try/catch in 01-06, ToolUseGroup state leak in 01-03+01-06, A-09 "Total" semantics LOW in 01-06). Plans 01-08 (CSP nonce) and 01-09 (UI pixel recreation + streaming render) added as gap closures during execution. T-1-46/47/48 closed; T-1-49 (window drag) NEW — to be opened when root-caused next session.

**Prior plan-phase 1 lineage**: Phase 1 CONTEXT.md + DISCUSSION-LOG.md written at `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/` (commit `c00101b`). **21 implementation decisions** captured (D-01 through D-21) covering: layout (vanilla CSS Grid + 30/40/30 columns + bottom-row mind-map placeholder + `decorations:true + titleBarStyle:Overlay + hiddenTitle:true` matching Claude Desktop screenshot + initial 1280×860), subprocess lifecycle (full Rust state machine + `CloseRequested + ExitRequested` double-hook union + `libc::killpg` PGID kill — required for REQ-3 acceptance), parser vendor depth (A2 src+LICENSE+VENDOR.md only, drop tests), capability validator SSOT (B2: TS `spawn-args.ts` + prebuild `gen-capabilities.ts` + diff audit; B3 Rust programmatic verified infeasible), RQ-03 community absorption (Targeted read of OpenCovibe Tauri 2 + Svelte 5 + Apache-2.0 same-stack match — was missing from STACK.md, advisor's discovery — plus TOKENICODE `useStreamProcessor.ts` for `finalizeOnce` + `control_request`, opcode UX screenshots only), telemetry (UI streaming dot only + dev console.log for TTFT/event count/duration), Stop button + Shift+Enter (Claude chat alignment), rAF flushing deferred to Phase 3. **Two new project-level criteria codified**: D-08 OSS adoption thresholds (≥1k★ + multi-maintainer + clean + active + permissive) refining KP-02; D-09 AGPL READ-ONLY posture re-confirmed (mneme retains MIT/Apache choice — 姿态 3 over 1/2). **SPEC.md amendments needed in plan-phase**: REQ-1 (top-bar→bottom-row layout, window chrome fields, initial size, mid-pane placeholder text), REQ-6 (Stop button + Shift+Enter beyond literal Cmd+Q+Enter). Phase 1 LOC estimate: ~1000-1200 fresh write (spike-002 reference-only, NOT bulk-copied).
**Next recommended action**: Read `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/.continue-here.md` first — it documents the window-drag blocker, all 4 attempted fixes, and 4 prioritized hypotheses (H1 Tauri JS bridge / H2 HMR de-armed / H3 decorations strategy / H4 capability permission) for next-session debug. Recommended path: launch `npm run tauri dev`, open Mneme devtools (⌘+⌥+I), run the H1 test snippet to check whether `window.__TAURI_INTERNALS__` exists and `getCurrentWindow().startDragging()` works directly. If H1 root-causes the bug, open plan 01-10 (gap closure) and route through `/gsd-execute-phase 1 --gaps-only`. After drag works, walk the 73-row dogfood checklist (or open `~/Downloads/mneme-dogfood-checklist.html` for the 中文 version) to close 01-07. Uncommitted state: `src/routes/+page.svelte` has the JS fallback + cursor visual feedback (will be committed as WIP at pause time).

**Session boundaries**:

- v1 ship target = Phases 0-4 complete (Tauri shell + vault + sync + multi-session + doc ingestion). After Phase 4, dogfood in real S1 2026 coursework before starting Phase 5.
- Differentiator layer (Phases 7-10) starts only after v1 dogfooding proves the basic loop is used daily — anti-abandonment discipline per Pitfall 10.

---

## Notes for Future-Self

- Codename `learn-os` was retired 2026-05-07; final name is `Mneme` (Phase 0 complete).
- **Phase 1 productName + window title contract**: `Mneme` (per Phase 0 D-14, no view-aware suffix).
- **Phase 1 production tauri.conf.json bundle identifier**: `dev.mneme.app` (per Phase 0 D-10; spike 002 keeps `.spike` suffix per RESEARCH.md Q4).
- **Phase 1 production icon source**: copy `icon-assets/icon.icns` into `src-tauri/icons/` (the entire iconset folder is at repo root for re-runnability).
- The roadmap deliberately puts the spike (Phase 5) and research-resolution (Phase 5.5) as standalone phases between v1 (Phases 0-4) and v1.x (Phases 6-10). This is intentional — each is a real piece of work that needs scope discipline (`/gsd-spike` budget = 2 days, RQ-01 dogfood budget = 1 week).
- If Phase 5 spike INVALIDATES the WKWebView path, Phase 6 MUST be replanned before entry — likely shifting to "external browser + deep links" or "persistent per-domain webview instance" alternatives. Update KD-04 in PROJECT.md at that point.
- `_source/` write-policy enforcement (Sync Controller is the only writer) is set up in Phase 2 and reused throughout Phase 4 (document ingestion outputs go to `_source/`). Don't relax this — PITFALLS Pitfall 20.
- **Foundation-first re-framing (2026-05-07)**: PROJECT.md Core Value is now a 5-dimension composite (not a single sentence); ROADMAP.md adds a Layer Architecture overlay (Foundation / Application / Replacement) on top of existing phase numbers; KP-07 (proactive contextual recall) + KP-08 (OSS dependency tracking) are new non-negotiable principles; OOS-09 (voice input) lifted to REQ-19 v1.x candidate; RQ-05 (learning-method epistemic humility) opened as ongoing non-blocking research line; `.planning/dependencies.md` created as KP-08 registry. The deepest reason behind this re-framing: current 18 REQs derive from n=2 sample (user + partner) — foundation must be agnostic to which feature set wins so REQ collection can evolve as observation of higher-achieving students' learning methods accumulates.
- **Visual aesthetic family lock (2026-05-07)**: KP-09 + KD-13 added to inherit the Anthropic/Claude visual identity (warmth/restraint/serif). Two reference files copied into `.planning/references/design/` as SSOT (deep-dive zh + OSS UI gallery HTML). PROJECT.md REQ-01 acceptance, ROADMAP.md driving constraints, and `.planning/dependencies.md` Groups 9 + 10 all updated to point to KP-09 / KD-13 / reference files. Mandatory locks: `#d97757` orange + `#faf9f5` cream + `#141413` text + `#2b2a27` warm dark; serif body, ban Arial/Inter; ease `cubic-bezier(0.165, 0.85, 0.45, 1)`; soft 8% borders; multi-layer soft shadows. Full token palette + OSS gallery deferred to reference files (not duplicated in PROJECT.md). Recommended starting OSS: shadcn.io/theme/claude (port CSS variables only — mneme is Svelte not React) + anthropics/skills/brand-guidelines (first-party SSOT) + tweakcn (shade extension).
- **Phase 1 cross-AI plan review converged at HIGH=0 (2026-05-09)**: 2-cycle Codex CLI review concluded successfully. Cycle 1 (commit `ac07c43`) raised 2 HIGH (spawn-args Node↔Browser conflict + lifecycle harness skipping Cmd+Q) + 5 MEDIUM + 1 LOW. Cycle-2 replan (commit `f74c6e0`) absorbed both HIGHs via `.shared`/`.node` SSOT split (browser-safety grep-guards in Vitest tests + audit checks 7a/7b/8) and AppleScript-driven Cmd+Q harness (pre-assert claude --print PID > 0; post-assert drain to 0 within 2.5s; aborts without osascript). Two new threat rows codify the regressions (T-1-44 spawn-args bundling, T-1-45 lifecycle harness false-positive). Cycle 2 verdict: HIGH=0, no new regressions; 5 MEDIUM + 1 LOW carried forward as opportunistic absorption during `/gsd-execute-phase 1`. Convergence loop exits successfully — no cycle 3. REVIEWS.md preserves both cycle narratives + transition table for future audits.
- **Phase 1 4-piece contract alignment audit (2026-05-08)**: SPEC + CONTEXT + AI-SPEC + UI-SPEC fully aligned across 6 dimensions (horizontal facts / SPEC amendments / AI-SPEC pickups / OOS boundaries / OSS policy D-08-D-09 / Foundation-Application layering). 4 audit findings resolved: (1) **KD-13 active-scale ratified 0.98 → 0.96 project-wide** (PROJECT.md L762 + references/design/anthropic-claude-aesthetic-deep-dive_zh.md L59 both updated to 0.96; UI-SPEC's clearer-feedback choice wins, deep-dive notes Anthropic's 0.98 as historical baseline) — affects all future ui-phase N decisions; (2) **D-22 Visual Contract Pointer added to CONTEXT.md** (pointer-style, no token duplication; ratifies UI-SPEC's two cross-phase rules: SSOT 0' = Live Anthropic Product UI overrides documentation snapshots, and `--error` Semantic Lock = `#c15f3c` form-isolation contract preventing drift into non-error consumers); (3) **SPEC REQ-6 amendment list extended**: Cmd+W appended to unbound hotkeys list (single-window single-session Phase 1 makes Cmd+W functionally redundant with Cmd+Q; explicit unbinding avoids subprocess-leak path that bypasses Rust PGID-kill); (4) **UI-SPEC self-fixes verified** (commit `2fd7f6e`): nix attribution corrected (D-11 slot in CONTEXT.md, finalization in AI-SPEC §4) + 6 ui-checker sign-off checkboxes synced to body. CONTEXT.md D-11 deliberately NOT promoted to D-11.1 — preserves discuss → plan-phase decision-time-line integrity. **Phase 1 discuss-phase outcomes (2026-05-08)**: 21 implementation decisions (D-01..D-21) + D-22 visual contract pointer captured in `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md`. Two project-level criteria are new: **D-08** codifies KP-02 OSS adoption thresholds (≥1k★ + multi-maintainer + clean + active + permissive) — proposed to amend PROJECT.md KP-02 at next milestone; **D-09** re-confirms AGPL READ-ONLY posture (mneme retains MIT/Apache license choice). **SPEC patches needed in `/gsd-plan-phase 1`**: REQ-1 (drop top-bar `<header>`, add bottom-row mind-map reservation, window chrome fields, initial 1280×860, mid-pane placeholder text "Lecture video / file preview — wired in Phase 4 + 6"), REQ-6 (Stop button + Shift+Enter beyond literal Cmd+Q + Enter — aligns with Claude / Cursor / ChatGPT / Notion conventions). RQ-03 absorption finalized as **Targeted read** mode (OpenCovibe Tauri 2 + Svelte 5 + Apache-2.0 same-stack match — code-level adoption allowed; TOKENICODE `useStreamProcessor.ts` `finalizeOnce` + `control_request` patterns; opcode AGPL screenshots only). rAF flushing deferred to Phase 3.

---

*Last updated: 2026-05-09 — Phase 1 cross-AI plan review converged at HIGH=0 (cycle 2 Codex re-review verdict: HIGH-1 RESOLVED + HIGH-2 RESOLVED + 0 NEW HIGH; 5 MEDIUM + 1 LOW carried forward). Convergence loop exits successfully — `/gsd-execute-phase 1` is the next gate. Prior: 2026-05-09 — `/gsd-plan-phase 1 --reviews` cycle-2 replan (commit `f74c6e0`) absorbing cycle-1 HIGHs; 2026-05-09 — `/gsd-review --phase 1 --codex` cycle 1 (commit `ac07c43`). 2026-05-08 — Phase 1 4-piece contract alignment audit complete (4 findings resolved: KD-13 active-scale 0.96 project-wide, D-22 visual contract pointer added, SPEC REQ-6 Cmd+W → unbound list, UI-SPEC self-fix verified). 2026-05-08 — `/gsd-ui-phase 1` complete (UI-SPEC approved); `/gsd-ai-integration-phase 1` complete (AI-SPEC); `/gsd-discuss-phase 1 --analyze` complete (commit `c00101b`). 2026-05-07 — `/gsd-explore` aesthetic family lock + foundation-first re-framing + `/gsd-plan-phase 0` complete + `/gsd-spec-phase 1` complete.*
