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

这条 thread 不是 spec（不会 archive 到 `openspec/specs/`） — 是**持续演化的工作流契约**。每次新 UI phase 启动前先读这里，确认当前 prototype 状态。

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

### 当前 prototype 文件

- **主原型**：`/Users/qinyuan/Downloads/mneme/project/Mneme.html`（Claude Design Lab 当前迭代）
- **prototype 仓**：`/Users/qinyuan/Downloads/mneme/`
- **prototype README**：`/Users/qinyuan/Downloads/mneme/README.md`

每次 UI phase 启动前确认 Mneme.html 是否有更新 — user 可能在 Design Lab 又迭代了。

### KD-13 美学锁 quick reference

> 完整 SSOT 在 `.planning/references/design/anthropic-claude-aesthetic-deep-dive_zh.md` + `.planning/references/design/claude-aesthetic-ui-libraries-gallery.html`。这里只列 **mandatory locks**。

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

`.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md` D-22 已确立：
- **SSOT 0'** — Live Anthropic Product UI 覆盖文档快照
- **`--error` Semantic Lock = `#c15f3c`** — form-isolation 契约，防漂移到非 error 消费者

## References

- prototype 主文件：`/Users/qinyuan/Downloads/mneme/project/Mneme.html`
- prototype 仓：`/Users/qinyuan/Downloads/mneme/`
- KP-09 + KD-13 全文：PROJECT.md（项目内）
- 设计 SSOT：`.planning/references/design/anthropic-claude-aesthetic-deep-dive_zh.md`
- OSS gallery：`.planning/references/design/claude-aesthetic-ui-libraries-gallery.html`
- Phase 1 D-22：`.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md`
- 用户反馈 memory：`reference_openspec_gsd_workflow.md`（关联 Mneme 美学复刻 workflow）

## Next Steps

- 每次 UI phase 启动前打开 Mneme.html 对照当前迭代版本（最新一轮叫"三都改好"）
- 复刻完成后跑 visual diff（playwright screenshot vs prototype 截图）
- 如 Mneme.html 在 Claude Design Lab 又迭代 → user 通知后我重新对照 → 增量更新实现
- 跟踪 D-22 `--error` semantic lock 是否被新组件破坏（visual-design-system rule）
- 未来如要为 dark mode / 高对比模式扩展色板 — **不动 4 个 mandatory color**，只加扩展层

---

*Thread created 2026-05-14 from OpenSpec stage-2 batch 7 decision (user chose thread over抽 spec for visual-design-system).*
