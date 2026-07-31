# Phase 02: Vault + Manual Import + Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 02-vault-canvas-ed-sync-onboarding
**Areas discussed:** Onboarding wizard 实现形态, vault_writer.rs API shape + Import-token 工厂封装, 手动 import 对话框 UX + drop-zone 范围, Import + reconciliation 运行时模型
**Mode:** `--analyze` overlay (trade-off table before each question) + plain-Chinese Socratic (per `feedback_plain_chinese_in_discuss` memory written mid-session)

---

## Area selection (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| A. Onboarding wizard 实现形态 | 全屏 route vs 弹窗 vs 半屏 sidesheet；6 步组件拆分；视觉 SSOT (prototype-first vs freehand) | ✓ |
| B. 手动 import 对话框 UX + drop-zone 范围 | drop-zone 范围；course picker 控件；dialog 位置 + remember-last | ✓ |
| C. vault_writer.rs API shape + Import-token 工厂封装 | enum + factory vs trait + zero-sized type vs PhantomData newtype；re-import same-name UX | ✓ |
| D. Import + reconciliation 运行时模型 | startup 阻塞 vs 后台；folder batch Cancel 行为 | ✓ |

**User's choice:** all 4 areas selected.
**Notes:** none — user picked all without filtering.

---

## Area A — Onboarding wizard 实现形态

### A-1 · Wizard 容器形态

| Option | Description | Selected |
|--------|-------------|----------|
| A1 · 全屏 SvelteKit route `/onboarding/[step]` | 整个 webview 接管；36px overlay titlebar 仍可见；SPEC REQ-8 "main UI is NOT reachable" 物理隔离实现 | ✓ |
| A2 · 弹窗盖住主 UI（`<dialog>` 模式） | 复用 SettingsModal native `<dialog>`；esc 禁掉 + click-through prevention 自实现 | |
| A3 · 半屏 sidesheet 接管右栏 | 6 步塞不进 380px；SPEC "main UI is NOT reachable" 难实现 | |

**User's choice:** A1
**Notes:** 用户初次问"看不懂大白话讲一下"——切到大白话后通过；触发了 `feedback_plain_chinese_in_discuss` memory 永久 default 设置。

### A-2 · 6 步组件拆分

| Option | Description | Selected |
|--------|-------------|----------|
| AA2 · 主走廊 + 6 间房子组件 | Onboarding.svelte 主壳 + Step1Welcome/Step2AuthCheck/...6 个独立文件 | ✓ |
| AA1 · 单文件 switch | Onboarding.svelte 内 `{#if step === N}` 切换；500+ LOC 单文件 | |
| AA3 · nested route 6 个网页 | `/onboarding/welcome` / `/onboarding/auth` 等 6 个独立路由 | |

**User's choice:** AA2
**Notes:** 选项已被 memory 触发后用大白话重讲（公寓装修 6 间房 / 屏风 / URL 切换三个类比）。

### A-3 · 三个 UI 区块视觉走哪个路径

| Option | Description | Selected |
|--------|-------------|----------|
| AC3 · onboarding 原型先 + settings/import freehand | 用户在 Claude Design Lab 出 onboarding 6 步 HTML，我像素级复刻；settings + import 直接 KD-13 token 自由设计 | ✓ |
| AC1 · 三块全原型先 | 用户出 3 份 HTML 原型；阻塞 Phase 2 半天到 1 天 | |
| AC2 · 三块全 freehand | 都不出原型，直接 KD-13 token 写；返工概率中等 | |

**User's choice:** AC3
**Notes:** 触发 D-04 BLOCKING 前置条件 — `/gsd-plan-phase 2` 必须 detect onboarding 原型，缺则 HALT。

---

## Area C — vault_writer.rs API shape + Import-token 工厂封装

### C-1 · vault_writer.rs 结构

| Option | Description | Selected |
|--------|-------------|----------|
| C1 · enum + 私有 token + HR 工厂函数 | `WriteContext { User, Import(ImportToken) }` + `import_handle()` factory | ✓ |
| C2 · trait + 两个 zero-sized writer 类 | `trait VaultWriter` + UserWriter / ImportWriter | |
| C3 · token newtype + PhantomData 强类型 | `ImportToken { _phantom: PhantomData<NotSend> }` 防恶意代码；mneme 单用户 YAGNI | |

**User's choice:** C1
**Notes:** 用户初次 reply "做这个的目的是什么，你给了我比喻但是我没理解 area 是做什么的" —— 我跳过了"area 在解决什么问题"直接进选项；重新讲清楚"为啥要 vault_writer + 古籍区图书馆类比"后通过。这是这次 session 第二个"用户没理解 → 我重讲"的循环；进 Memory `feedback_plain_chinese_in_discuss` 已经覆盖 root cause（默认就该用大白话）。

### C-2 · Re-import 同名文件 UX

| Option | Description | Selected |
|--------|-------------|----------|
| CR2 · 弹窗三选项 + 批量 Apply-to-all checkbox | Replace / Skip / Rename (-1 -2 后缀) 三选项；batch import 多一个 "Apply to all N remaining" checkbox | ✓ |
| CR1 · 默默覆盖 | 直接 chmod 644 → write → chmod 444；toast 提示 | |
| CR3 · 不让覆盖，让用户去 Finder 删 | 违反 SPEC L49（明说支持 re-import）；UX 烂 | |

**User's choice:** CR2
**Notes:** 推荐项被采纳。

---

## Area B — 手动 import 对话框 UX + drop-zone 范围

### B-1 · 拖文件进来时 hit-target

| Option | Description | Selected |
|--------|-------------|----------|
| BD3 · 整窗 overlay + DataTransfer.types 区分文件/文本 | 拖文件 → 整窗 overlay；拖文本/链接 → 让 chat input 接管（v1.x 备用）；靠 DataTransfer.types | ✓ |
| BD1 · 整窗 overlay（不区分类型） | 拖什么都整窗进 import；封死未来 chat 文本拖拽 | |
| BD2 · 仅左栏接受 | hit-target 只有 30% 窗宽 ~380px | |

**User's choice:** BD3
**Notes:** 推荐项被采纳。

### B-2 · course picker 控件

| Option | Description | Selected |
|--------|-------------|----------|
| BC2 · 自适应 0/1-3/4-10/10+ 四档 | 0 课堵 / 1-3 radio / 4-10 dropdown / 10+ typeahead | ✓ |
| BC1 · 永远 dropdown | UI 一致；1 课多此一举 / 20 课找慢 | |
| BC3 · 永远 typeahead | UI 一致；1-3 课时打字不如点 | |

**User's choice:** BC2
**Notes:** 推荐项被采纳。

### B-3 · dialog 位置 + remember-last

| Option | Description | Selected |
|--------|-------------|----------|
| BL2 · 屏幕中央 + 记忆上次（推荐项） | course / category 自动填上次的，可改 | |
| BL1 · 屏幕中央 + 不记忆 | 每次重置 course=空 / category=_inbox | ✓ |
| BL3 · drag-drop 跟随鼠标 | 违反 macOS 模态对话框惯例 + Tauri 实现复杂 | |

**User's choice:** BL1（用户反推 Recommended BL2）
**Notes:** 用户先回 "没理解" → 我把 B-3 拆成两件事重讲 (位置 vs 记忆)，并加便利店店员类比；二次回应选 BL1。理由推断（非用户口述）：偏向"防换课忘改默认"的稳健性 over "连续 import 同课少点一下" 的便利性。Per-import friction +1 click 接受。

---

## Area D — Import + reconciliation 运行时模型

### D-1 · app 启动 reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| DR2 · 后台 tokio task + Phase 2 静默 | UI 立刻可用；Phase 3 Cmd+P 上线时再加 'index ready' 事件；vault > 1000 文件无 regression | |
| DR1 · 阻塞启动 + 进度 spinner | "Indexing 23/100" 满屏；vault 成长后每次开 app 转 1-2 秒 | ✓ |
| DR3 · spawn-and-forget | 同 DR2 但不发任何事件；Phase 3 Cmd+P 多绕路 | |

**User's choice:** DR1（用户反推 Recommended DR2）
**Notes:** 显式 override Recommended。理由推断：偏向 "app 启动 = 索引一致" invariant；Phase 2 vault 后置 onboarding-小，DR1 体验损失为零。**触发 escalation gate**：Phase 2 dogfood 测 vault > 500 文件且 reconciliation > 1000ms 时，重评 DR2 v1.x。已写入 D-14 + `<deferred>` Deferred to v1.x 行。

### D-2 · folder batch Cancel 行为

| Option | Description | Selected |
|--------|-------------|----------|
| D2-B · Cancel + 已写入保留 | Status pill: "4 / 10 imported · cancelled"；用户去 Finder 删错拖 | ✓ |
| D2-C · Cancel + 全部 rollback | 反向 chmod 644 + 删除；rollback 失败模式复杂 + 把"想要的"也删了 | |
| D2-A · 没 Cancel，启动了必须跑完 | 实现最简单但 UX 烂 | |

**User's choice:** D2-B
**Notes:** 推荐项被采纳。

---

## Area selection round-2 (explore more vs proceed)

**Question:** "我们讨论了 4 块。你还有不清楚的灰色地带要探吗，还是准备进 CONTEXT.md？"
**User's choice:** "准备进 CONTEXT.md"

---

## Claude's Discretion

User did NOT explicitly delegate any decision to Claude in this session. Items where SPEC + D-01..D-21 leave fine-grain choices to planner/executor:
- Exact tokio task structure for import controller (single task per operation vs task pool)
- SQLite migration mechanism (single CREATE TABLE IF NOT EXISTS for v1; schema_version reserved)
- Splitter localStorage key namespace (continue Phase 1 `mneme.<area>.<field>` convention)
- Course CODE format regex (`^[A-Z]{4}\d{4}$` likely; planner reviews vs USYD reality)
- Status pill animation curve (KD-13 `cubic-bezier(0.165, 0.85, 0.45, 1)` ease, ~200ms; no separate UI-phase)

---

## Deferred Ideas

(Full list in `02-CONTEXT.md` `<deferred>` and `<deferred_blocking>` sections — repeated here for audit completeness.)

### Deferred to v1.x (post-Phase-2)
- DR2 background reconciliation (escalation: vault > 500 files measured in dogfood)
- Chat input text/link drag-drop (BD3 leaves the path open)
- Vault path move progress bar (>1000 files trigger)
- Onboarding back-button (forward-only in v1)

### Deferred to later phases
- UniBoard bridge import path
- Cost-cap kill switch (subscription model — explicitly removed)
- File-watch live updates
- Theme dark-mode actual switching
- Course rename / vault delete-and-replace / soft-delete trash
- Settings categories: General / Sync / Claude / Privacy / Keybindings-override

### BLOCKING prerequisite for plan-phase
- Onboarding HTML prototype (6 steps) produced in Claude Design Lab. `/gsd-plan-phase 2` HALTs if missing. Settings + import dialog do NOT have this prerequisite (freehand-allowed per AC3).

### Mid-session memory written
- `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-mneme/memory/feedback_plain_chinese_in_discuss.md` — permanent default for all future Socratic GSD commands; plain-Chinese + everyday analogy is now baseline.
