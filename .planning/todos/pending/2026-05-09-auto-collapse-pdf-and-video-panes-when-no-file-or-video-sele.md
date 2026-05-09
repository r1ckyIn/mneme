---
created: 2026-05-09T13:08:38.356Z
title: Auto-collapse PDF and video panes when no file or video selected
area: ui
files:
  - src/routes/+page.svelte
  - src/lib/components/FilePreview.svelte
  - src/lib/components/LectureVideo.svelte
  - src/lib/components/Splitter.svelte
---

## Problem

Phase 01 三栏布局（课件/视频/对话）当前无论用户是否选中 PDF 或视频，PDF 栏和 video 栏都占据**固定宽度**。空状态下：
- 屏幕空间被两个空白栏浪费
- 对话栏被挤窄，影响主要交互（Claude 流式输出）
- 视觉上让人误以为"内容在加载中"，不知道是因为没选文件

期望：**默认折叠**两个空状态栏，只在用户选中文件/视频时才展开。

## Solution

行为契约：
1. `selectedFile === null` → PDF 栏折叠（width=0 或 width=collapse-indicator-width，~32px 显示一个折叠把手）
2. `currentVideo === null` → video 栏同理
3. 用户选中文件/视频 → 该栏自动展开到**上次手动调整的宽度**（持久化到 localStorage，key 形如 `mneme.splitter.pdf` / `mneme.splitter.video`）
4. 折叠态用户点击折叠把手 → 强制展开（即使没选内容，进入"空状态预览"）
5. 同时折叠两栏时，对话栏占满剩余宽度，无 splitter handle

实现要点：
- `Splitter.svelte` 组件需新增 prop：`collapsed: boolean`、`collapsedWidth: number`、`expandedWidth: number`、`onExpand: () => void`
- 折叠态 splitter 不响应 drag，但保留点击展开
- 过渡动画 ~200ms（KP-09 Anthropic/Claude 家族的"克制有反馈"风格）
- 持久化用 `connection-state.svelte.ts` 同款的 svelte 5 rune 模式

边界情况：
- 启动时 selectedFile/currentVideo 都为 null → 两栏折叠，对话栏全宽
- 用户拖宽 PDF 栏后取消选中 → 记住宽度，下次选中时还原
- 折叠态 PDF/video 栏内的 ChatFooter / TitlebarMeta 是否仍可见？需检查 `+page.svelte` 当前 grid 逻辑

涉及 Phase：当前 Phase 01（三栏布局基础），但这条行为可作为 Phase 01-N 的子任务，或独立 Phase 02 micro-fix。
