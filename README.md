# Mneme

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri)](https://tauri.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-adapter--static-FF3E00?style=flat-square&logo=svelte)](https://kit.svelte.dev)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-subprocess-D97757?style=flat-square)](https://claude.ai/code)
[![Backlog](https://img.shields.io/badge/Roadmap-BACKLOG.md-success?style=flat-square)](BACKLOG.md)

> AI-native desktop learning app — a Tauri 2 shell that wraps **your own local Claude Code CLI**, grows a local-first markdown vault + knowledge graph out of your chat sessions, and drives concept review with FSRS-6. macOS, local-first, your data never leaves your disk.

---

## English

### What This Is

Mneme combines, in one desktop app: an **Obsidian-style** local-first markdown vault (full data ownership), **NotebookLM-style** source-grounded chat with citations (anchored mode), **Claude Code's** full agent capabilities (MCP, web, tool use, hooks, skills) running as a subprocess inside a GUI shell, a **mind-map layer** for humans and a **knowledge-graph layer** for the AI, **FSRS-6** spaced repetition on concept pages (not flashcards), and **Echo360 lecture video** in an embedded webview.

The end-experience it optimizes for: *"this AI truly understands me"* — proactively surfacing where you are, where you struggle, and how your knowledge connects, instead of only answering what you ask. The whole loop — *learn → AI teaches → notes captured → reviewed via FSRS* — feels like one product, not five glued together.

**Compliance by construction**: Mneme spawns *your* `claude` CLI under *your* subscription. No token proxying, no credential harvesting, no bundled model access.

### Status (2026-07-31)

Shipped: Tauri shell + streaming Claude chat (markdown/KaTeX/sanitized), local vault with hardened writer (path-canonicalization + symlink guards), manual file import, 6-step onboarding wizard, settings panel. Test baseline: 290 vitest + 73 cargo + svelte-check clean.

In progress next: multi-session sidebar, command palette, Tiptap editor. Full queue: [`BACKLOG.md`](BACKLOG.md); product identity: [`docs/PRODUCT.md`](docs/PRODUCT.md).

Currently **dogfood-stage** software: built first for the author's own coursework, distribution to other users planned after it survives daily use. Expect sharp edges.

### Quickstart (from source)

Requires: macOS, Node ≥ 20, Rust ≥ 1.88, and a working [`claude` CLI](https://claude.com/claude-code) on `PATH` (your own subscription).

```bash
gh repo clone r1ckyIn/mneme && cd mneme
npm ci
npm run tauri dev
```

### Architecture

- **Left** course file tree · **Middle** video + material preview · **Right** Claude chat (streaming) · **Bottom** live course mind-map — final layout will be user-draggable (REQ-01 rework pending)
- Stack: Tauri 2 + SvelteKit (`adapter-static`) + `tauri-plugin-shell` + marked + KaTeX + DOMPurify + Svelte 5 runes; `rusqlite` vault index; vendored MIT `claude-code-parser`
- Docs map: [`docs/PRODUCT.md`](docs/PRODUCT.md) (identity) · [`docs/specs/`](docs/specs/_INDEX.md) (capability specs) · [`CONTEXT.md`](CONTEXT.md) (glossary) · [`docs/design/`](docs/design/) (visual SSOT) · [`docs/adr/`](docs/adr/) (decisions)

---

## 中文

### 这是什么

Mneme 在一个桌面应用里组合：**Obsidian 风格**本地优先 markdown vault（数据完全属于你）、**NotebookLM 风格**带引用的 source-grounded 对话（anchored 模式）、**Claude Code** 完整 agent 能力（MCP / 联网 / 工具 / hooks / skills）以子进程形式跑在 GUI 壳内、给人看的**思维导图层** + 给 AI 看的**知识图谱层**、概念页（非卡片）上的 **FSRS-6** 间隔重复、以及嵌入 webview 的 **Echo360 课程视频**。

它优化的终局体验是：*"这个 AI 真的懂我"*——主动浮出你在哪、卡在哪、知识怎么连，而不只是回答你问的。整条循环——*学习 → AI 讲解 → 笔记自动沉淀 → FSRS 复习*——是一个产品，不是五个 app 粘合。

**合规即架构**：Mneme 拉起的是*你自己的* `claude` CLI、*你自己的*订阅。不代理 token、不碰凭证、不捆绑模型访问。

### 状态（2026-07-31）

已交付：Tauri 壳 + Claude 流式对话（markdown/KaTeX/消毒渲染）、加固写入的本地 vault（路径规范化 + symlink 防护）、手动文件导入、6 步首次启动向导、设置面板。测试基线：vitest 290 + cargo 73 + svelte-check 零错误。

下一步：多会话侧栏、命令面板、Tiptap 编辑器。完整队列见 [`BACKLOG.md`](BACKLOG.md)；产品身份见 [`docs/PRODUCT.md`](docs/PRODUCT.md)。

当前处于 **dogfood 阶段**：先为作者自己的课程学习而建，扛过日常真实使用后再向其他用户分发。会有毛刺。

### 快速开始（源码运行）

需要：macOS、Node ≥ 20、Rust ≥ 1.88、`PATH` 上有可用的 [`claude` CLI](https://claude.com/claude-code)（你自己的订阅）。

```bash
gh repo clone r1ckyIn/mneme && cd mneme
npm ci
npm run tauri dev
```

---

> **Codename history**: developed under codename `learn-os` until 2026-05-07. · 项目曾以代号 `learn-os` 开发至 2026-05-07。
