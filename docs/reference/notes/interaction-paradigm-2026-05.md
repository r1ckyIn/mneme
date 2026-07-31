---
slug: interaction-paradigm
title: 鼠标优先 + Cmd+Q 唯一全局热键 + 窄场景例外跟踪
status: superseded (2026-07-31)
created: 2026-05-14
updated: 2026-07-31
---

> **⚰️ 2026-07-31 作废归档**：鼠标优先范式整体作废，REQ-11 命令面板复活，键盘快捷键按 macOS/品类惯例设计（受众扩展决定，见 `docs/PRODUCT.md` 修订块 + `docs/adr/0001`）。仍然有效的仅剩：**Cmd+Q 必须 drain 子进程**（KP-04 合规，权威在 `docs/specs/claude-subprocess.md`）。下文全部为历史记录。

# Thread: Interaction Paradigm

## Goal

维护 mneme 的交互范式约定：**鼠标优先**（点击 / 拖拽 / 滚动 / 右键菜单），全局快捷键**只启用 Cmd+Q**（subprocess drain，KP-04 合规）+ **Cmd+,**（macOS native settings 标准约定，例外）。其他全局热键不绑。

这条 thread 跟踪：
1. 范式本身的演化（如未来窄场景启用快捷键）
2. 已确立的例外清单
3. context-specific 交互（如 editor 的 `/` slash menu — 不是全局热键，是 context-specific 允许）

## Context

### 范式确立（user 决定 2026-05-11）

原 REQ-11 命令面板（Cmd+P / Cmd+O / Cmd+Shift+P）已 **retired**。user 反馈："所有交互除 Cmd+Q 以外都是用鼠标交互"。

理由：
- 最小化学习成本
- 最大化 trackpad 友好度
- 单用户场景不需要 power-user 快捷键学习曲线

### 已确立的例外

| 例外 | 理由 | 状态 |
|------|------|------|
| **Cmd+Q** | subprocess drain + KP-04 合规相关；macOS native | 永久启用 |
| **Cmd+,** | macOS native settings 标准；OS 级约定不算"应用快捷键" | 永久启用（settings-ui §2）|
| **Cmd+I** | macOS standard semantic for file picker invocation；mneme 内无其他用途 | Locked 2026-05-16（Phase 2 D-13 / external-import）|
| **editor `/` slash menu** | context-specific（仅在 editor 内触发，非全局）| 允许（editor §2）|

**2026-05-16 — Cmd+I added (Phase 2 D-13)**: Cmd+I 加入为"鼠标优先 + Cmd+Q 唯一全局热键"的第 5 条窄场景例外（含 Cmd+Q / Cmd+, / editor `/` 共 4 条 + 本次新增）。触发 `@tauri-apps/plugin-dialog::open({ multiple: true, directory: false })` 走 import 流程；mneme 内没有其他动作绑 Cmd+I，独占语义。监听者在 `src/routes/+page.svelte`（页面级，单一 owner — 不放 +layout.svelte 避免 onboarding 路由也吃到）。

### 窄场景例外候选（未启用，跟踪中）

| 候选 | 用例 | 重评条件 |
|------|------|---------|
| **Cmd+Shift+V**（voice-input REQ-19）| 高频窄场景：长 prompt 语音输入 | voice-input 落地时 user 单独批准 |
| **1/2/3/4**（fsrs-review 评分） | review focus mode 单概念全屏，鼠标点击四个按钮 vs 键盘 1234 | fsrs-review 实测 mouse 评分体验差时启用 |
| **Cmd+K** session 切换 | 多 session 频繁切 mouse-only 可能低效 | 用户实测多 session 切换鼠标低效时启用 |
| **Esc** review focus mode 退出 | review focus 标准退出键 | fsrs-review phase 实测时决定 |

**核心原则**：每个例外**单独决定**，不全面回归键盘优先。

### 跟范式相关的横切设计

- claude-subprocess §2 — Cmd+Q drain workflow（要正确触发 subprocess kill）
- settings-ui §2 — Cmd+, 是允许的 OS native 入口
- editor §2 — slash menu 是 context-specific，不算违反
- voice-input（REQ-19，未落地）— 如启用要带 Cmd+Shift+V 协商

### 鼠标优先的具体期望

- **点击**：所有 action 通过按钮 / 链接
- **拖拽**：布局调整（layout-shell）/ 列表重排（multi-session sidebar）/ mind-map 节点（mindmap-viz）/ 文件 import（external-import）
- **滚动**：自然 scroll；不绑 keyboard 翻页
- **右键菜单**：alternative action 入口（rename / delete / duplicate / 操作变种）

## References

- 决策来源 memory：`feedback_mneme_mouse_first_interaction.md`
- retired spec：`openspec/specs/_INDEX.md` v0.3 — command-palette retired 记录
- 关联 spec：claude-subprocess.md §2 / settings-ui §2 / editor §2 / fsrs-review §X（未抽）
- L2 CLAUDE.md "v1.40 已删除命令对照" 表 — 注：另一个误导（`/gsd-phase` subcommand）已修，但 `/gsd-workspace` 行待验证（reference_gsd_phase_command_syntax 末尾）

## Next Steps

- 跟踪以下 4 个窄场景例外候选，**不主动启用**，等 user 实测触发：
  1. voice-input Cmd+Shift+V
  2. fsrs-review 1/2/3/4 评分键
  3. multi-session Cmd+K 切换
  4. fsrs-review Esc 退出
- 每个新增 UI spec 落地前对照本 thread 确认无新增全局热键
- 如 user 提"试试加 X 快捷键" → 先在本 thread Context 添新条目记录，不直接改 spec
- 当**已确立的例外**累积到 ~6-7 个 → 重新评估是否要 mini command palette（不是回归 Cmd+P，是窄场景 surfaces 集合）。当前 4 条（Cmd+Q / Cmd+, / Cmd+I / editor `/`），距阈值还有 2-3 条。

---

*Thread created 2026-05-14 from OpenSpec stage-2 batch 7 decision (user chose thread over抽 spec for interaction-paradigm — keeps the rule evolvable rather than locked spec). 2026-05-16 update — Phase 2 D-13 promoted Cmd+I from candidate to locked exception.*
