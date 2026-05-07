# Mneme

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri)](https://tauri.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-adapter--static-FF3E00?style=flat-square&logo=svelte)](https://kit.svelte.dev)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-subprocess-D97757?style=flat-square)](https://claude.ai/code)
[![Status](https://img.shields.io/badge/Status-Phase%200-success?style=flat-square)](.planning/STATE.md)

> Personal AI-native desktop learning app — Tauri 2 shell wrapping local Claude Code, three-pane UI (course files / video / chat), AI-native knowledge graph + FSRS-6 review. macOS-only, single-user, MIT-licensed.

---

## English

### What This Is

Mneme is a locally-run desktop app for one user (myself) that combines: **Obsidian-style** local-first markdown vault (full data ownership), **NotebookLM-style** source-grounded chat with citations, **Claude Code's** agent capabilities (MCP, web access, tool use, hooks, skills) running as a subprocess inside a GUI shell, **Heptabase / mind-map style** spatial thinking layer for humans, **GraphRAG-style** knowledge graph layer for the AI, **Anki / FSRS-6** spaced repetition driving review of concepts (not flashcards), and **Echo360 lecture video** integration via embedded webview.

The core value: wrap the user's Claude Code (with all its tools, MCPs, memory) in a desktop GUI that turns chat sessions into a continuously-growing local knowledge graph + browsable markdown vault, indexed against actual lecture content. The whole loop — *learn → AI teaches → notes captured automatically → reviewed via FSRS* — must feel like one product, not five glued together.

Built for USYD CS S1 2026 personal use. Terminal can't render LaTeX/code blocks visually; Obsidian is occupied by another workstream; NotebookLM lacks local + agent capabilities; Claude Code Desktop App exists but is dev-focused, not learning-focused.

### Architecture

Three-pane main UI:

- **Left:** Course file tree (lectures, tutorials, assignments, notes, concepts)
- **Middle:** Video player + course material preview (PDF/PPT switchable)
- **Right:** Claude conversation (streaming, with markdown / LaTeX / code blocks rendered after stream)
- **Top bar:** Course-level mind-map that updates as conversation produces new concepts

Stack: Tauri 2 + SvelteKit (`adapter-static`) + `tauri-plugin-shell` + `marked` + KaTeX + DOMPurify + Svelte 5 runes. See [`.planning/PROJECT.md`](.planning/PROJECT.md) §"Key Decisions" for the locked stack rationale.

### Quickstart

```bash
# Clone
gh repo clone r1ckyIn/mneme
cd mneme

# Install (Phase 1 onwards — Phase 0 is naming/branding only, no production code yet)
cd .planning/spikes/002-tauri-claude-shell/app
npm install
npm run tauri dev
```

### Status

| Phase | Plans Complete | Status |
|-------|----------------|--------|
| 0. Identity & Branding Lock | 1/4 | In progress |
| 1. Tauri Shell Foundation + Subprocess Hardening | 0/0 | Not started |
| 2. Vault + Canvas/Ed Sync + Onboarding | 0/0 | Not started |
| 3. Multi-Session + Command Palette + Editor | 0/0 | Not started |
| 4. Document Ingestion (PDF + Office → markdown) | 0/0 | Not started |
| 5. Echo360 Spike Resolution | 0/0 | Not started |
| 5.5. KG Memory Project Survey + Dogfood (RQ-01) | 0/0 | Not started |
| 6. Echo360 Video + Bilingual Captions | 0/0 | Not started |
| 7. Knowledge Graph + Three-Tier Memory | 0/0 | Not started |
| 8. Mind-Map View + Per-Course Rules | 0/0 | Not started |
| 9. Anchored Mode + Citations API | 0/0 | Not started |
| 10. FSRS-6 Reviews + Focus Mode | 0/0 | Not started |

### Open-source posture (OOS-01 amended)

This is a **single-user personal codebase** published as a portfolio piece. The repo may be cloned and forked under MIT for personal use; **multi-user, collaboration, hosted SaaS, and commercialization remain explicitly out of scope** per [`.planning/PROJECT.md`](.planning/PROJECT.md) OOS-01.

---

## 中文

### 这是什么

Mneme 是一个本地运行、单用户使用的桌面应用，融合了：**Obsidian 风格**的本地优先 markdown vault（完整数据所有权）、**NotebookLM 风格**的带引用源对话、**Claude Code** 的 agent 能力（MCP、网络访问、工具使用、hooks、skills）作为子进程运行在 GUI 壳内、**Heptabase / 思维导图风格**的人类空间思考层、**GraphRAG 风格**的 AI 知识图谱层、**Anki / FSRS-6** 间隔重复驱动概念复习（不是抽认卡）、以及通过嵌入式 webview 集成的 **Echo360 课程视频**。

核心价值：把用户的 Claude Code（连同其所有工具、MCP、记忆）包裹进一个桌面 GUI，让对话会话持续生长为本地知识图谱 + 可浏览的 markdown vault，并对应实际课件内容索引。整条循环 —— *学习 → AI 讲解 → 笔记自动捕获 → 通过 FSRS 复习* —— 必须感觉像一个产品，而不是五个拼凑出来的。

为 USYD CS S1 2026 个人使用而建。终端无法可视化渲染 LaTeX/代码块；Obsidian 被另一工作流占用；NotebookLM 缺乏本地 + agent 能力；Claude Code Desktop App 存在但偏向开发场景，不是学习场景。

### 架构

三栏主界面：

- **左：** 课程文件树（讲座、习题课、作业、笔记、概念）
- **中：** 视频播放器 + 课件预览（PDF/PPT 可切换）
- **右：** Claude 对话（流式输出，markdown / LaTeX / 代码块在流结束后渲染）
- **顶栏：** 当前课程的思维导图，对话产生新概念时实时更新

技术栈与英文版相同。详见 [`.planning/PROJECT.md`](.planning/PROJECT.md) §"Key Decisions"。

### 快速开始

```bash
# Clone
gh repo clone r1ckyIn/mneme
cd mneme

# 安装（Phase 1 起 — Phase 0 仅命名+品牌锁定，尚无生产代码）
cd .planning/spikes/002-tauri-claude-shell/app
npm install
npm run tauri dev
```

### 项目状态

| 阶段 | 完成计划 | 状态 |
|------|---------|------|
| 0. 身份与品牌锁定 | 1/4 | 进行中 |
| 1. Tauri 壳基础 + 子进程加固 | 0/0 | 未开始 |
| 2. Vault + Canvas/Ed 同步 + Onboarding | 0/0 | 未开始 |
| 3. 多会话 + 命令面板 + 编辑器 | 0/0 | 未开始 |
| 4. 文档摄入（PDF + Office → markdown） | 0/0 | 未开始 |
| 5. Echo360 Spike 验证 | 0/0 | 未开始 |
| 5.5. KG Memory 项目调研 + Dogfood（RQ-01） | 0/0 | 未开始 |
| 6. Echo360 视频 + 双语字幕 | 0/0 | 未开始 |
| 7. 知识图谱 + 三级记忆 | 0/0 | 未开始 |
| 8. 思维导图视图 + 每课程规则 | 0/0 | 未开始 |
| 9. Anchored 模式 + 引用 API | 0/0 | 未开始 |
| 10. FSRS-6 复习 + 专注模式 | 0/0 | 未开始 |

### 开源策略（OOS-01 修订后）

这是一个**单用户个人代码库**，作为作品集发布。仓库可在 MIT 许可下被克隆与 fork 用于个人使用；**多用户、协作、托管 SaaS 与商业化仍明确排除在范围之外**，详见 [`.planning/PROJECT.md`](.planning/PROJECT.md) OOS-01。

---

> **Codename history**: this project was developed under codename `learn-os` until 2026-05-07.
> **项目代号历史**：此项目曾以代号 `learn-os` 开发至 2026-05-07。
