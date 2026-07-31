# layout-shell

> **能力域**：app 整体布局壳 — **用户可自定义**，不是固定三栏。提供拖动按钮调整各 pane 位置 / 大小 / 显隐。layout-shell 是其他所有 UI spec（editor / mindmap-viz / settings-ui / fsrs-review / anchored-mode / multi-session sidebar 等）的容器。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 1 实装中
**实现状态**：**partial** — Phase 1 已重新设计并实装拖动按钮；window-drag blocker 未解决（STATE.md `.continue-here.md` H1-H4 hypotheses 待验证）

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-01 ⚡待改写** — 原文是"三栏可拖拽 UI"，已被改写为"用户自定义可拖拽布局"（默认仍是三栏作为初始布局，但用户可改）

**Phase 1 进展**：
- 默认 1280×860 窗口（D-01..D-21）
- 三栏 30/40/30 + 底部 mind-map placeholder（PROJECT.md REQ-01 原版）
- 拖动按钮已加（用户图反馈：6 点拖动 handles 在每个区域）
- 窗口 chrome：`decorations:true + titleBarStyle:Overlay + hiddenTitle:true`（匹配 Claude Desktop screenshot）
- **未解决**：window 不可从边缘拖动（Tauri 2 macOS bug，4 个 fix 尝试均未通过 — `.continue-here.md`）

---

## 评估过的备选（What we considered）

| 候选 | 主要属性 | 决定 |
|------|---------|------|
| **当前方案：用户自定义可拖拽三栏（含默认布局）** | 默认三栏 30/40/30 + 底部 mind-map placeholder，用户可调整 pane 位置/大小/显隐 | ✅ 已采用（Phase 1 实装） |
| **固定三栏不可调** | 简单稳定，无 layout state 管理 | ❌ 否决 — 用户 Phase 1 体验后判定不够灵活 |
| **Tab 分页式（每栏一个 tab）** | 节省屏幕空间，单页焦点 | ❌ 否决 — 违反"like NotebookLM mental model"（user 心智依赖 NotebookLM 三栏） |
| **全屏单页 + 弹出面板** | 极简，每次只看一个 | ❌ 否决 — 违反 Core Value Dimension 2 "one product feel"（多任务并行学习需要同屏） |
| **Top-bar mind-map 默认显示** | 顶部脑图栏占据空间 | 📝 改为 **底部 placeholder**（D-01 决定 — 顶 bar 不该被 mind-map 占，留给 traffic-light + tab） |
| **可自由拖拽窗口位置（拆分式如 Obsidian）** | 完全用户主导布局 | ❌ 否决 — 复杂度过高，不符合 single-user 场景 |

---

## 否决理由（Why we said no）

- **固定三栏**：Phase 1 实际跑下来用户体验到 13" 屏幕局促，且不同任务（review / 写作 / 看课件）侧重不同 pane — 必须可调
- **Tab 分页**：违反 NotebookLM 心智模型；多 chat session（multi-session spec）会撞模型
- **Obsidian 式自由拆分**：实现复杂度爆炸，single-user 场景过设计

---

## 实施约束（Constraints when implementing）

### 1. 默认布局（locked by Phase 1 D-01）

- 三栏 grid：**30% / 40% / 30%**（左课件 / 中视频+预览 / 右 chat）
- 底部行：mind-map placeholder（占满底部条，**不是顶部** — D-01 翻转 PROJECT.md 原版"顶部 mind-map"）
- 顶部行：traffic-light（macOS native）+ 70px titlebar-spacer + tab/breadcrumb 区
- 初始窗口：1280 × 860

### 2. 拖动机制（Phase 1 实装中）

- 每个 pane 边缘有拖动 handle（6 点拖动按钮）
- pane 之间分隔条可拖动调整宽度
- pane 可折叠 / 展开（按 handle）
- 拖动反馈：`cursor: grab` / `grabbing`（已在 src/routes/+page.svelte 加）

**待解决** — window-drag blocker：
- titlebar 区域应能拖动整个窗口（macOS 标准行为）
- 4 个 fix 尝试均未通过（H1 Tauri JS bridge / H2 HMR de-armed / H3 decorations strategy / H4 capability permission）
- 下次 session 走 `.continue-here.md` H1 优先验证

### 3. 状态持久化

- pane 宽度 / 折叠状态 / 显隐状态 → `localStorage` key 类似 `mneme.layout.v1`
- 也可暴露给 settings-ui（用户可重置布局）
- 持久化粒度：per-window（multi-session 创建新会话时继承当前 window 布局）

### 4. 窗口 chrome（locked by Phase 1 D-01）

- `decorations: true`（macOS native window chrome）
- `titleBarStyle: Overlay`（traffic-light 覆盖在内容上）
- `hiddenTitle: true`（不显示窗口标题）
- 70px `.titlebar-spacer`（防 traffic-light 跟内容撞）

### 5. 跨 pane 状态边界

- 各 pane 内容是其他 spec 的责任（editor / mindmap-viz / fsrs-review 等）
- layout-shell **只管布局容器**，不管 pane 内容
- pane 之间数据流走全局 store（Svelte 5 `$state` runes），不走 prop drilling

### 6. 横切约束遵守

- **visual-design-system**（thread）— 所有 UI surface 遵守 KP-09 + KD-13：
  - 米 `#faf9f5` 背景
  - 8% 软边分隔
  - serif body
  - cubic-bezier 动画
  - 像素级复刻 `/Users/qinyuan/Downloads/mneme/project/Mneme.html` prototype
- **interaction-paradigm**（thread）— 鼠标优先 + Cmd+Q 唯一全局热键：
  - 所有 layout 调整通过鼠标拖动按钮，不绑 keyboard shortcut
  - 折叠 / 展开走鼠标点击

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| 用户实测自定义布局太复杂没人用（仅停在默认） | 回归固定三栏 + 砍拖动按钮 |
| 屏幕尺寸变化（接外接显示器 → 4K）| 布局变体增加（13" / 24" / 27" 默认值） |
| pane 数量超 4 个（如加 voice-input 面板） | 重新设计 — 4 pane 以上 grid 不友好 |
| 多 monitor 支持需求 | 砍掉 single-window 约束，加 detach pane |
| Tauri 2 出现致命窗口 bug 阻塞拖动 | 评估 fallback（native menu bar layout swap）|

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 1 — Tauri Shell Foundation + Subprocess Hardening
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md` D-01 layout 决策原文
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/.continue-here.md` — window-drag blocker 4 hypotheses

**关联待办**：
- `.planning/todos/pending/2026-05-09-auto-collapse-pdf-and-video-panes-when-no-file-or-video-sele.md` — pane 自动折叠（无文件/无视频时）

**关联 OSS 依赖**：
- `.planning/dependencies.md` Group 1（frontend）— vanilla CSS Grid（无第三方布局库）

**关联横切 spec**：
- **visual-design-system**（thread）— 设计 token + Mneme.html prototype 复刻契约
- **interaction-paradigm**（thread）— 鼠标优先 + Cmd+Q

**关联其他 spec**：
- **claude-subprocess** — 不直接关联（subprocess 是后端进程，layout 是前端容器）
- **editor / mindmap-viz / fsrs-review / anchored-mode / multi-session / settings-ui / onboarding** — 所有 UI spec 都是 layout-shell 的内容；layout-shell 容器它们
- **whiteboard**（seed）— 未来如启用，是 layout 的一个 pane

**后续 phase 关联**：
- Phase 2（settings + onboarding）— layout 重置入口、首次启动默认布局
- Phase 3（multi-session）— sidebar pane 加入
- Phase 10（fsrs-review）— review focus mode 收起三栏 → 全屏单概念视图（layout-shell 必须支持 "fullscreen mode" 切换）

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 1 · 2/2 完成*
