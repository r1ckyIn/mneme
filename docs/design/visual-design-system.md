---
slug: visual-design-system
title: Mneme UI 设计 → 实现工作流 + KP-09 / KD-13 美学锁
status: open
created: 2026-05-14
updated: 2026-05-14
---

# Thread: Visual Design System

## Goal

维护两件事：

1. **UI 设计 → 实现的工作流契约** — user 先在 Claude Design Lab 出 HTML 原型 → Claude Code agent **像素级复刻**到 Svelte 5 实现。复刻不偏离原型；如要偏离需 user 确认。
2. **KP-09 + KD-13 美学锁的 quick reference** — 跨 UI spec 必须遵守的设计 token + 字体 + 动效 + 边界规则。

这条 thread 不是 spec（不会 archive 到 `docs/specs/`） — 是**持续演化的工作流契约**。每次新 UI phase 启动前先读这里，确认当前 prototype 状态。

## Context

### 工作流（user 决定 2026-05-14）

```
user 在 Claude Design Lab 设计 HTML 原型
   ↓
我（Claude Code）拿原型 → 像素级复刻成 Svelte 5 + Tauri
   ↓
diff 对比 → 如有偏离 → 询问 user 确认 OR 调整复刻
```

- user 不希望我自由设计 UI — 我的角色是**精确复刻**
- 原型迭代多轮（如截图显示 "三都改好" 的迭代），每轮我跟着新原型 update 实现
- 复刻成本 vs 美学保真之间 — 永远选美学保真（KP-09 视觉是 product 一致性的 anchor）

### 当前 prototype 文件（唯一视觉 SSOT — 锁定 2026-05-15）

- **prototype 仓 / 唯一 SSOT 入口**：`docs/design/prototypes/`（2026-07-31 自 `~/Downloads/Mneme 3/` 整体收编入 repo——Downloads 被清理也不再丢 SSOT）
- **bundle 内含 8 个 HTML**（全部按 KD-13 + tokens.css 渲染）：
  - `Mneme.html` — 三栏主壳（1840 LOC，Phase 1 视觉原型）
  - `Mneme Onboarding.html` — 6 步引导向导（Phase 2 REQ-08）
  - `Mneme Settings.html` — 8 类目设置面板（Phase 2 REQ-10）
  - `Mneme Import Dialog.html` — 导入对话框 + 重复子对话框（Phase 2 REQ-05/06/08）
  - `Mneme Dropzone Overlay.html` — 整窗 dropzone（Phase 2 REQ-05）
  - `Mneme Status Pill.html` — TitlebarMeta 状态 pill 4 态（Phase 2 REQ-09）
  - `Mneme Import History.html` — 最近 20 条历史 modal（Phase 2 REQ-09）
  - `Mneme Reconciliation.html` — 启动 indexing overlay（Phase 2 REQ-07 / D-14）
- **bundle README**：无（原 zip 的 README 与 bundle 不同级、未随收编进 repo；bundle 结构以本文件此段为准）

**锁定规则**：
- 这是 Phase 2 + 后续所有未明确换 SSOT 的 phase 的**唯一视觉参考源**。任何 spec / context / executor 实现的"美学参照"指针都指向这里。
- 用户在 Claude Design Lab 再次迭代产出 `Mneme 4` / `Mneme 5` 时，**不要自动替换 SSOT 指针** — 用户显式确认 ratify 新版本后才能移指针，否则保留 Mneme 3 锁。
- **冻结建议**（未做）：phase ship 前把当时锁的 bundle 拷贝到 `docs/design/handoff-<phase>-<date>/`，避免 user Downloads 目录被清理后 SSOT 指针变 404。当前 Phase 2 还未 ship，按需启动该归档。

每次 UI phase 启动前确认 SSOT bundle 是否更新 — user 通常会通知 / 在 chat 显式 ratify。

### KD-13 美学锁 quick reference

> 完整 SSOT 在 `docs/design/anthropic-claude-aesthetic-deep-dive_zh.md` + `docs/design/claude-aesthetic-ui-libraries-gallery.html`。这里只列 **mandatory locks**。

**色彩**：
- `#d97757` 橙（terra cotta — primary accent）
- `#faf9f5` 米（背景，**禁纯白**）
- `#141413` 文字（**禁纯黑**）
- `#2b2a27` 暖深（dark mode 背景，**禁冷灰**）

**字体**：
- Body / 阅读文本：serif（`'Iowan Old Style', 'Apple Garamond', 'Georgia', 'Songti SC', 'Source Han Serif SC'`）
- UI 标签 / code：`ui-monospace, 'SF Mono', Menlo, monospace`
- **禁 Arial / Inter**（Anthropic 内部判定"廉价 AI 感"）

**动效**：
- 标准 ease：`cubic-bezier(0.165, 0.85, 0.45, 1)`
- 按钮 press：`active:scale-[0.96]`（Phase 1 ratified 项目级 0.96，覆盖 Anthropic 0.98 基线）
- 哲学：克制 + 有目的；不炫技

**边界**：
- 边框：~8% 黑透明（`rgba(20, 20, 19, 0.08)`） — **无硬线**
- 阴影：多层软阴（`0 0.25rem 1.25rem rgba(0,0,0,0.035)` 类）

### 推荐 OSS 起点（不直接用，端口 CSS variables）

- shadcn.io/theme/claude（端口 CSS variables；mneme 是 Svelte 不是 React）
- anthropics/skills/brand-guidelines（first-party SSOT，冲突时它赢）
- tweakcn（shade 扩展）

### Phase 1 D-22 visual contract pointer

`git-history:.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md` D-22 已确立：
- **SSOT 0'** — Live Anthropic Product UI 覆盖文档快照
- **`--error` Semantic Lock = `#c15f3c`** — form-isolation 契约，防漂移到非 error 消费者

## References

- **唯一视觉 SSOT bundle**：`docs/design/prototypes/`（锁定 2026-05-15 — 8 HTML，详见上面"当前 prototype 文件"段）
- prototype 主壳：`docs/design/prototypes/Mneme.html`（1840 LOC，line ranges in tokens.css 仍有效 — 内容未变，只是路径换）
- KP-09 + KD-13 全文：PROJECT.md（项目内）
- 设计 SSOT 深度：`docs/design/anthropic-claude-aesthetic-deep-dive_zh.md`
- OSS gallery：`docs/design/claude-aesthetic-ui-libraries-gallery.html`
- Phase 1 D-22：`git-history:.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md`
- Phase 2 UI 设计契约：`git-history:.planning/phases/02-vault-canvas-ed-sync-onboarding/02-UI-SPEC.md`（spec 与 bundle 冲突时 spec 胜，见该文件顶部 Implementation Note 表）
- 历史前身路径：`/Users/qinyuan/Downloads/mneme/project/Mneme.html`（Phase 1 时期 single-file 原型，2026-05-15 起被 Mneme 3 bundle 取代；不要再用）

## Next Steps

- 每次 UI phase 启动前打开 `docs/design/prototypes/` 下对应 surface HTML 对照当前迭代版本
- 复刻完成后跑 visual diff（playwright screenshot vs prototype 截图）
- 如 user 在 Claude Design Lab 又迭代（产出 Mneme 4+） → user 显式 ratify 后，更新本文档的"当前 prototype 文件"段 + UI-SPEC.md / CONTEXT.md / tokens.css / CLAUDE.md 顶部 header 里的 SSOT 路径
- 跟踪 D-22 `--error` semantic lock 是否被新组件破坏（visual-design-system rule）
- 未来如要为 dark mode / 高对比模式扩展色板 — **不动 4 个 mandatory color**，只加扩展层

---

*Thread created 2026-05-14 from OpenSpec stage-2 batch 7 decision (user chose thread over抽 spec for visual-design-system).*
