# Mneme Backlog

> 唯一工作队列。一行一条，按优先级排列；细节链到 seed / spec / reference。工单开工时从这里取，完成后划掉。目标定义（2026-07-31 grilling 定案）：**14 个 phase 全量交付；近期关键路径 = 自用 dogfood 先行，获客分发在后**。

## 0. 零号工单 — 环境复活（一切之前）

- [ ] `npm ci` + `cargo build`（src-tauri）+ `npm run tauri dev` 真启动——73 天没碰，先证明它还活着（vitest 290 / cargo 73 / svelte-check 0 err 是 2026-05-19 的基线，跑一遍确认没烂）

## 1. Dogfood 解锁（我天天用得上的最短路径）

- [ ] Phase 1 尾巴：47 行 dogfood checklist VISUAL 半程（`tests/manual/dogfood-checklist.md`）+ CSP `connect-src ipc:` gap（原 01-11）
- [ ] G-02 ImportStatusPill 移出 titlebar → 底部 toast（用户 2026-05-18 明确要求，seed `2026-05-18-import-toast-titlebar-cleanup.md`）
- [ ] Onboarding Back 按钮 + Cmd+R 重触发（seed `2026-05-18-onboarding-back-button-v1x.md`——B3 dogfood 证明 Step 2 无法在 app 内重验）
- [ ] external-import spec 落笔（手动 + UniBoard 桥；seed `2026-05-14-spec-external-import-self-ecosystem.md` 的 4 个开放问题要答）
- [ ] onboarding spec 落笔（6 步定形，Step 4/5 按自成生态改；seed `2026-05-14-spec-onboarding-first-run-wizard.md`）

## 2. Phase 3 — Multi-Session + 命令面板 + 编辑器（下一个功能 phase）

设计输入：`docs/reference/phase03/`（03-UI-SPEC APPROVED + 03-RESEARCH 验证事实 + 03-CONTEXT 决策 D-01..D-10）。旧 GSD PLAN×7 已删——工单从 spec/UI-SPEC 直接开，走 tdd。

- [ ] Session 状态机 + rusqlite 元数据 + `--resume` 懒恢复（D-04/05；JSONL 路径与 fork 语义见 03-RESEARCH）
- [ ] Session sidebar（右 ChatPanel 内嵌、默认折叠 28px、PUSH 展开 240px——D-03a）
- [ ] 命令面板（Bits UI Command + fuzzysort；Cmd+P/O/Shift+P——REQ-11 复活版）
- [ ] Tiptap 编辑器 + markdown round-trip（REQ-06 后半；`specs/editor.md`）
- [ ] Soft-lock（PreToolUse hook + lockfile，D-09）+ 2-subprocess ceiling（D-10）
- [ ] I1 import history size column（backend 持久化配套，seed `2026-05-18-import-history-size-column.md`）

## 3. 后续 phases（定义见 `docs/reference/ROADMAP-2026-05.md`，逐个开工时重切）

- [ ] Phase 4 — Document Ingestion（PDF MinerU + Office markitdown，REQ-18）
- [ ] Phase 5 — Echo360 spike（**gate**：过 → Phase 6；不过 → 重设计 REQ-04/05）
- [ ] Phase 5.5 — KG memory 4-project survey + 1 周 dogfood（**gate** → Phase 7，RQ-01）
- [ ] Phase 6 — Echo360 video + 双语 VTT（REQ-04/05）
- [ ] Phase 7 — KG + 三层 memory（REQ-07，KD-10 在此解锁）
- [ ] Phase 8 — Mind-map + per-course rules（REQ-17）
- [ ] Phase 9 — Anchored mode + Citations API（REQ-08；free 模式 Sources 行为见 seed `2026-05-07-spec-claude-free-mode…`）
- [ ] Phase 10 — FSRS-6 review + focus mode（REQ-09/15；thea 仅作 UX study）
- [ ] **Phase 15（新增 2026-07-31）— 分发工程**：Apple Developer 账号 + code signing + notarization + 更新通道 + crash 上报。**门：自用 dogfood 通过后才开工**（获客顺序，OOS-01 修订版）

## 4. Spec 待写（触发条件到了再写）

- [ ] caption-bilingual（等 Echo360 spike）· voice-input（等 Intel STT latency spike）· whiteboard（等 Phase 8 稳定）· fsrs-review（Phase 10 前）· REQ-01 layout-shell 改写（可拖拽布局）

## 5. 小项 / 清理

- [ ] `gsd-dev-*` npm scripts 改名 `dev-*`（GSD 层已删，脚本名遗留；scripts/*.mjs 同步）
- [ ] husky v10 兼容：删 `.husky/pre-commit` 旧 shim（seed `2026-05-11-husky-v10-compat…`）
- [ ] PDF/video 空栏自动折叠（seed `2026-05-09-auto-collapse…`）
- [ ] PDF 标注/编辑（seed `2026-05-09-built-in-pdf-editor…`，候选 PDF.js EditorTool）
- [ ] UniBoard → Mneme handoff 机制（等 UniBoard 侧"可移交工作单元"定义，seed `2026-05-09-cross-project-handoff…`）
- [ ] License 复审：MIT vs 获客/商业化诉求是否冲突（OOS-01 修订的连带项）
- [ ] AgentShield runtime 决定关闭或重评（原顾虑是 GSD hooks 共存，前提已随 GSD 删除消失）
