# Stack Research — mneme Layered Libraries

> **2026-05-14 — Slim Index Edition.** 详细内容（评估过的备选 / 否决理由 / 实施约束 / 重评触发条件）**全部已散到 `openspec/specs/*.md`** 每个 capability 的对应小节。原 677 行版本可 `git show <commit-before-slim>:.planning/research/STACK.md` 找回。
>
> **Researched**: 2026-05-06（原版）· **Decisions applied**: 2026-05-07 / 2026-05-11 / 2026-05-14
> **Status**: 索引页 — capability 详情走 spec 文件
> **License boundary**: 个人使用（KP-01 + OOS-01）但 AGPL 仍 caution（未来 OSS portfolio release 可能；AGPL **read-only reference，never copy/fork**）

---

## Capability 索引（10 个层）

> ⚠ **STACK 原推荐已被 user 决策翻转或调整的，标记 ⚡ — 看 spec 文件为准。**

| # | Capability | 当前主选 | License | spec 详情 |
|---|-----------|----------|---------|----------|
| 1 | PDF → AI-friendly markdown | ⚡ **MinerU 本地**（2026-05-11 user 翻转，原推荐 Marker 降为 fallback） | AGPL-3.0（subprocess 调用不污染） | `openspec/specs/document-ingestion.md` |
| 2 | Persistent agent memory + KG | ⚡ **未锁定 — RQ-01 4 选 1**（Cognee / Zep+Graphiti / Mem0 / agentmemory；原 STACK 推荐 agentmemory PRIMARY 已被 user 降为 fallback 2026-05-07）| Apache-2.0（候选共同 license） | `openspec/specs/memory-engine.md`（BLOCKED） |
| 3 | Mind-map / graph viz | **Cytoscape.js v3.33.3 + dagre/cose-bilkent** | MIT | `openspec/specs/mindmap-viz.md` |
| 4 | Whiteboard / spatial canvas | ⚡ **Excalidraw v0.18.1**（不是 tldraw — tldraw v4 proprietary，2026-05-07 KD-08 修正） | MIT | seed → `.planning/todos/pending/2026-05-14-spec-whiteboard-excalidraw-canvas.md` |
| 5 | FSRS-6 spaced repetition | **ts-fsrs v5.3.2**（open-spaced-repetition 官方 TS port） | MIT | seed → `.planning/todos/pending/2026-05-14-spec-fsrs-review-concept-page.md` |
| 6 | Tiptap 块编辑器 + slash menu | **`@tiptap/starter-kit` v3.22.5** + `tiptap-markdown`（aguingand 社区版替代 Tiptap Pro）+ 自实现 slash via `@tiptap/extension-suggestion` | MIT | `openspec/specs/editor.md` |
| 7 | Claude Code subprocess GUI 参考实现 | **vendored `claude-code-parser` (MIT)**（KD-12 — **不** npm install）+ TOKENICODE pattern study（Apache-2.0）+ opcode 只读参考（AGPL ⛔） | mixed | `openspec/specs/claude-subprocess.md` |
| 8 | Echo360 lecture video 集成 | **Tauri webview + persistent USYD SSO cookie**（KD-04）— **无现成 OSS**，自实现 | n/a | `openspec/specs/echo360-video.md`（**spike-gated** by KD-11） |
| 9 | VTT parse + 双语字幕渲染 | **`subtitle` v4.2.2** + Claude API 翻译 + HTML5 `<track>` | MIT | note → `.planning/todos/pending/2026-05-14-spec-caption-bilingual-vtt.md` |
| 10 | Local SQLite + sqlite-vec + Ollama（**未来** vector 路径 — agentic-search 默认不上 vector） | **rusqlite + sqlite-vec v0.1.9 + Ollama + `nomic-embed-text`** | Apache-2.0 / MIT (dual) | `openspec/specs/agentic-search.md` §3（KD-07 留口 + vector 仅窄场景留给 memory-engine 内部）|

---

## Combined Installation Manifest

> 安装命令 + 版本锁定见各 spec 文件 § 实施约束 + `.planning/dependencies.md`（KP-08 dependency registry）。本段保留 high-level 入口：

**Frontend (npm; SvelteKit project)**:
```
ts-fsrs · cytoscape + extensions · @excalidraw/excalidraw · @tiptap/* · subtitle ·
claude-code-parser (vendored, NOT npm install — KD-12)
```

**Already locked from spikes**:
```
marked · katex · dompurify · @tauri-apps/api · @tauri-apps/plugin-shell
```

**Rust (Cargo.toml; Tauri backend) — vector 路径 deferred**:
```
rusqlite · sqlite-vec · tauri-plugin-http (for Ollama HTTP)
```

**System tools (pre-install)**:
```
mineru CLI (PDF, AGPL)  ·  markitdown CLI (Office, MIT)  ·
marker-pdf (PDF fallback, GPL-3.0 + AI Pubs)  ·  ollama (vector path)
```

详细安装步骤 + 版本注释见对应 spec § 实施约束。

---

## License Posture Summary

| License | Examples | 策略 |
|---------|----------|------|
| **MIT** | ts-fsrs, Excalidraw, Cytoscape, Tiptap, subtitle, sqlite-vec, claude-code-parser | ✅ Adopt freely |
| **Apache-2.0** | agentmemory, Cognee, Mem0, TOKENICODE, sqlite-vec dual, Ollama | ✅ Adopt freely |
| **MPL-2.0** | dompurify, BlockNote | ✅ OK（file-level copyleft only）|
| **GPL-3.0**（subprocess 调用） | Marker (PDF 数学 fallback) | ✅ OK via subprocess（process boundary） |
| **AGPL-3.0**（subprocess 调用） | MinerU (PDF 主选), PyMuPDF4LLM (rejected) | ✅ OK via subprocess（同 GPL）— **DO NOT** link/fork |
| **AGPL-3.0**（直接 link/fork） | opcode, claudecodeui | ⛔ **READ-ONLY REFERENCE** — never copy/fork/link |
| **Proprietary** | tldraw v4.x | ⛔ **AVOID** — rejected for Excalidraw |
| **BSL-1.1** | CodePilot | ⚠ 个人使用 OK，treat as reference 不入依赖 |
| **Custom AI Pubs**（Marker 模型权重） | Marker Chandra | ✅ 个人 / 研究免费 |

**Cardinal rule**：未来 OSS portfolio release（OOS-01 注：允许）需 mneme binary 完全 MIT/Apache 干净 — **build like we'll publish**。

---

## Fork-and-Extend Candidates (KP-06)

> 每个候选的"extend what"详情在对应 spec § 评估过的备选 / 实施约束。

| Capability | 最近 OSS foundation | License | 主选 → spec |
|------------|---------------------|---------|-------------|
| 三栏 Tauri 壳 | TOKENICODE (`yiliqi78/TOKENICODE`) | Apache-2.0 | `claude-subprocess.md` + `layout-shell.md`（pattern study only — 不直接 fork） |
| Agent memory + KG | RQ-01 4 候选（未锁定） | Apache-2.0（候选共同） | `memory-engine.md` |
| stream-json parser | claude-code-parser（`udhaykumarbala`） | MIT | `claude-subprocess.md`（**vendored**，不 fork，KD-12） |
| 双语字幕 batcher | Read Frog (`mengxi-ream/read-frog`) | GPLv3 ⚠ | note caption-bilingual（**study only**，clean-room with `subtitle` + Claude API） |
| FSRS Obsidian-style review | `st3v3nmw/obsidian-spaced-repetition-recall` | TBD | seed fsrs-review（study only — 我们的 concept-page-as-review-unit 是 novel） |

**无 fork target**：Echo360 webview auth · Excalidraw vault 持久化 · 三栏 resize 协调 — 纯合成任务。

---

## Stack Patterns by Variant

| 场景 | 变体策略 |
|------|---------|
| **On-device LLM offline mode** | 加 `llama.cpp` via Rust bindings + 量化 8B 模型 — 当前**不推荐**（Intel Mac CPU 推理过慢）；deferred 到 Apple Silicon 硬件 refresh |
| **未来 OSS 开源 release** | 当前 stack MIT/Apache 干净 — Marker subprocess 隔离 license / Excalidraw 替代 tldraw 保选项 / 需 LICENSE 第三方归属文档 |
| **Anthropic 出官方 stream-json SDK** | 从 vendored claude-code-parser 迁移 — drop-in replacement（KD-12 重评触发） |

---

## Sources

> 完整 source 列表 + URL + license confirm 引用见各 spec § 相关 phase 与文档 / OSS 依赖。本段保留主要 ecosystem references：

**Verified via Context7 / npm registry / GitHub direct（2026-05-06）**：
- ts-fsrs v5.3.2 · Excalidraw v0.18.1 · Cytoscape v3.33.3 · Marker v1.10.2 · Tiptap v3.22.5 · sqlite-vec v0.1.9

**Authoritative ecosystem comparisons (2026)**：
- [PDF-to-Markdown 2026 (themenonlab)](https://themenonlab.blog/blog/best-open-source-pdf-to-markdown-tools-2026)
- [AI Agent Memory Comparison 2026](https://explore.n1n.ai/blog/ai-agent-memory-comparison-2026-mem0-zep-letta-cognee-2026-04-23)
- [Cytoscape vs vis-network vs Sigma 2026 (PkgPulse)](https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-2026)
- [Claude Code stream-json custom UI (BSWEN 2026-03)](https://docs.bswen.com/blog/2026-03-21-stream-json-custom-ui-claude-code/)

**License verified（GitHub LICENSE 文件）**：
- opcode AGPL-3.0 · tldraw proprietary v4 · agentmemory Apache-2.0 · Marker GPL-3.0 + AI Pubs

**Reference implementations**：
- opcode（AGPL — 只读）· TOKENICODE（Apache-2.0，强参考）· claude-code-gui（MIT, file-tail mode）· claude-code-parser（MIT, vendored per KD-12）· graphify by safishamsi（MIT, KG batch rebuild candidate）

完整外部 URL 列表见原 STACK.md（slim 前 commit）或各 spec § Sources。

---

*Last updated: 2026-05-14 — OpenSpec stage-3 follow-on slim down（677 行 → ~80 行 索引）。详细内容已散到 `openspec/specs/*.md`（13 capability spec）+ `.planning/todos/pending/2026-05-14-spec-*`（4 seed + 1 note）。原研究上下文 / 各候选详细评估保留在 spec § 评估过的备选 + § 否决理由。*
