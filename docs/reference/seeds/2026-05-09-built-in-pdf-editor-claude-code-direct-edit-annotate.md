---
created: 2026-05-09T13:08:38.356Z
title: Built-in PDF editor — Claude Code direct edit/annotate
area: planning
files: []
---

## Problem

当前 mneme 的 PDF 是**只读预览**（Phase 01 FilePreview.svelte 用 PDF.js 渲染），用户和 Claude Code 都不能在 PDF 上：
- 自由画线 / 高亮 / 划重点
- 加文本框 / 注释 / 公式
- 让 Claude Code 通过工具调用自动生成结构化标注（如"在第 3 页关键定义周围加红框"）

学习场景里 PDF 标注是核心需求（lecture slides / 论文 / 教材），缺这个功能 mneme 就退化成"PDF 查看器 + 旁边一个对话框"，不能闭环。

## Solution

TBD — 候选方案三选一：

**Option A: 嵌入 PDF.js Editor** ⭐ 最快
- pdf.js 自 v4.x 起提供 `EditorTool` API（freehand / text / ink / stamp 模式）
- 优点：复用现有 PDF.js 渲染管线，零额外依赖
- 缺点：标注存储格式（FDF / XFA / pdf.js JSON）需要决定

**Option B: 嵌入 + 自建编辑层**
- 保留 PDF.js 渲染，自己用 Excalidraw/Konva 在上层覆盖一个画板，标注存到侧车 JSON（`*.pdf.annotations.json`）
- 优点：源 PDF 不被修改（KP-01 数据所有权清晰）；标注可独立版本控制 / 同步 / 导出
- 缺点：导出/分享时需要"烧录"标注到 PDF（pdf-lib）

**Option C: Tauri Rust 后端 + muPDF / pdf-lib**
- Claude Code tool call → Tauri command → Rust 写 PDF 文件
- 优点：可以做高精度操作（裁剪/重排页面）
- 缺点：实时编辑反馈差，UX 不如前端 canvas

**Claude Code 集成接口**：
- 暴露 MCP tool / Tauri command：`pdf_annotate(file, page, type, bbox, content)`
- 让 Claude Code 在对话里能"我帮你在第 5 页框出 FSRS-6 公式" → 直接落到 PDF 上
- 这是 mneme 区别于 Obsidian/NotebookLM 的关键 wedge（KP-04 把 Claude Code 当做 deep agent）

**决策依据**（待研究）：
- 用户是否需要标注 PDF **原文件**（合并打印 / 分享给同学）→ Option A 或 C
- 还是只在 mneme 内消费（vault 私有）→ Option B 最干净

涉及 Phase：可能是 Phase 6（Claude 集成）或单独的"PDF 标注"phase，需 RoadMap 增条目。
