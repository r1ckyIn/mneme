# mneme

> Personal desktop learning app wrapping local Claude Code, for USYD CS S1 2026 coursework. Codename `mneme` — final name + icon locked Phase 0.

> **2026-05-14 — Slim Index Edition.** 详细 capability 内容已散到 `openspec/specs/*.md`。本文档保留 **5 维度身份层** + **KP/KD/REQ/OOS/RQ 编号锚点**。原 815 行版本可 `git restore` 找回（commit 前 PROJECT.md）。

---

## What This Is

本地运行的桌面 app（单用户 = 自己），组合：

- **Obsidian-style** local-first markdown vault（数据完全本机）
- **NotebookLM-style** source-grounded chat + 引用（anchored mode）
- **Claude Code** agent capabilities（MCP / web / tool use / hooks / skills）作为 subprocess 跑在 GUI 壳内
- **Heptabase / mind-map style** 空间思考层 — 给人看
- **GraphRAG-style** 知识图谱层 — 给 AI 看
- **Anki / FSRS-6** spaced repetition on 概念页（非卡片）
- **Echo360 lecture video** 嵌入 webview（USyd-specific）

三栏主 UI：课件（左）· 视频 + 课材预览（中）· Claude 对话（右）。底部行：当前课程 live mind-map（**Phase 1 D-01 重新设计后用户可拖拽自定义布局，不固定三栏**）。

---

## Core Value — 5 维度复合身份

> **Re-framed 2026-05-07**（`/gsd-explore`）：Core Value **不是单句**，是 5 维度复合。每个维度非协商性 — 失任一维度退化成不同产品。所有决策必走 5 维度过滤。

### Dim 1 — 产品哲学（9 KP，非协商）

见下方 **§ Key Principles**。每条 KP 一行索引 + 详细位置。

### Dim 2 — 用户体验承诺（5 promises）

1. **"懂我" AI**（KP-07）— agent memory + KG + 主动召回；AI 主动浮出 last-session 进展 / 跨周前置 / 反复出错（不被问也讲）— 详 `openspec/specs/memory-engine.md` § Proactive Recall
2. **学习闭环** — learn → AI teaches → notes captured → FSRS review，一个产品感不是五个 app 粘合
3. **双模式** — *free Claude as teacher* + *anchored Claude as textbook search*（REQ-08）；同 UI 一键切；竞品都不组合
4. **一个产品感** — 三栏 UI（REQ-01）交互一致
5. **Power-user UX** — multi-session sidebar（REQ-12）+ 鼠标优先交互（interaction-paradigm thread）

### Dim 3 — 架构底盘（13 KD，不可逆锁定）

见下方 **§ Key Decisions**。每条 KD 一行索引 + spec 文件路径。

### Dim 4 — 边界（8 OOS，刻意排除）

见下方 **§ Out of Scope**。说"不"的精度跟说"是"的精度一样是身份。

### Dim 5 — 落地上下文（用户 / 时机 / 设备）

- **用户**：USYD CS 学生，S1 2026，4 门课（数学 + 编程重）
- **时机**：terminal 渲不出 LaTeX；Obsidian 被占；NotebookLM 缺本地 + agent；Claude Code Desktop 是开发不是学习
- **设备**：MacBook Pro 2019 Intel，macOS Ventura 13.4，single-user
- **identity**：`dev.mneme.app`

---

**One-sentence 摘要**（**不**替代 5 维度；单独引用丢 80% identity）：

> mneme 给一个用户（我）一份 **local-first + AI-native** 个人学习基础设施，end-experience 是 *"this AI truly understands me"* — 主动浮出我在哪、卡在哪、知识怎么连，而不只是回答我问的。

---

**Critical caveat — REQ sample-size 谦逊（2026-05-07 added）**：

18 v1+v1.x REQ 来自 **n=2** 样本（用户 + partner）。Foundation（Dim 1 KP + Dim 3 KD）必须 **对哪个特性集赢中立** — Application 层 phase 可被替换 / 补充 / 退役（FSRS / anchored / mindmap / etc.）随观察更优学习方法累积。**Ongoing observation 线 RQ-05**（非阻塞）。

---

## Requirements（19 REQ — 索引到 spec）

> 详细内容、评估过的备选、否决理由、实施约束、重评触发条件 **全部在 spec 文件**。

### v1 — MVP（ship-and-use-daily）

| REQ | Capability | spec / 位置 |
|-----|-----------|-------------|
| **REQ-01** ⚡待改写 | 用户自定义可拖拽布局（原三栏） | `openspec/specs/layout-shell.md` |
| **REQ-02** | Tauri 壳 spawn local claude CLI subprocess | `openspec/specs/claude-subprocess.md` |
| **REQ-03** ⚡待改写 | 自成生态 import — 手动 + UniBoard 桥（原 Canvas+Ed 拉取） | seed → `.planning/todos/pending/2026-05-14-spec-external-import-self-ecosystem.md` |
| **REQ-06** | Markdown vault + Tiptap 编辑器 | `openspec/specs/vault-storage.md` + `openspec/specs/editor.md` |
| **REQ-10** | Agentic search default（不上 vector DB） | `openspec/specs/agentic-search.md` |
| ~~REQ-11~~ ⛔ retired → OOS-09b | (was Cmd+P/O/Shift+P 命令面板) | `.planning/threads/interaction-paradigm.md` |
| **REQ-12** | Multi-session sidebar | `openspec/specs/multi-session.md` |
| **REQ-13** ⚡待改写 | Import 状态 surface（合并到 external-import） | 同 REQ-03 seed |
| **REQ-14** | Settings / preferences UI | `openspec/specs/settings-ui.md` |
| **REQ-16** | First-run onboarding wizard | seed → `.planning/todos/pending/2026-05-14-spec-onboarding-first-run-wizard.md` |

### v1.x — post-MVP

| REQ | Capability | spec / 位置 |
|-----|-----------|-------------|
| **REQ-04** | Echo360 webview + USYD SSO | `openspec/specs/echo360-video.md`（**spike-gated** by KD-11） |
| **REQ-05** | Caption-bilingual VTT | note → `.planning/todos/pending/2026-05-14-spec-caption-bilingual-vtt.md`（depends echo360 spike） |
| **REQ-07** | KG + 三层 memory + mind-map | `openspec/specs/memory-engine.md` + `openspec/specs/mindmap-viz.md`（**BLOCKED by RQ-01**） |
| **REQ-08** | Anchored mode + Citations API | `openspec/specs/anchored-mode.md`（P1 UI 已实装） |
| **REQ-09 + REQ-15** | FSRS-6 concept review + focus mode | seed → `.planning/todos/pending/2026-05-14-spec-fsrs-review-concept-page.md`（等 thea spike） |
| **REQ-17** | Per-course system prompts | `openspec/specs/per-course-rules.md` |
| **REQ-18** | Document → markdown（PDF MinerU + Office markitdown） | `openspec/specs/document-ingestion.md` |
| **REQ-19** | Voice input via OSS STT | seed → `.planning/todos/pending/2026-05-14-spec-voice-input-oss-stt.md`（等 Intel Mac CPU STT latency spike） |

---

## Out of Scope（8 OOS — 刻意排除）

| OOS | Exclusion | Why |
|-----|-----------|-----|
| **OOS-01** | Multi-user / collab / commercialization（OSS portfolio release 允许） | Personal use；surface 10x |
| **OOS-02** | Mobile（iOS / Android） | Desk learning + Tauri Mobile 复杂 |
| **OOS-03** | Custom-built vector DB / RAG | 替代 REQ-10 agentic search；窄场景 vector 留口给 memory-engine 内部 |
| **OOS-04** | Audio / video overview generation | Claude 不擅长；passive listening 反 math/CS 学习 |
| **OOS-05** | Manual flashcard authoring（Anki-style） | 替代 REQ-09 concept-page FSRS |
| **OOS-06** | Manual mind-map drawing | Auto-generated from KG（mindmap-viz 派生）|
| **OOS-07** | Plugin / extensibility API | Claude Code skills 已是 |
| **OOS-08** | Multi-LLM-provider | KP-04 兼容性问题 |
| ~~OOS-09~~ | ~~Voice/audio dictation input~~ | **Lifted 2026-05-07 → REQ-19** |
| **OOS-09b** (added 2026-05-11) | Cmd+P/O/Shift+P 命令面板 + 多全局快捷键 | replaced by `interaction-paradigm` thread（鼠标优先 + Cmd+Q 唯一全局热键 + Cmd+, OS 例外） |

---

## Key Principles（9 KP — 非协商性）

| KP | Principle | One-line |
|----|-----------|----------|
| **KP-01** | Local-first | 所有数据本地 disk；offline-functional；no auto cloud |
| **KP-02** | 50% OSS-driven | 半数 surface area 社区验证 OSS；Phase 1 D-08 阈值 ≥1k★ + multi-maintainer + clean + active + permissive |
| **KP-03** | AI-native data model | Embeddings + 图 + confidence + provenance + timestamps 是 first-class（不是 plugin） |
| **KP-04** | Compliant subprocess wrapping | 用户自己 claude CLI + 自己订阅；no token theft；per Anthropic 2026.02 ToS |
| **KP-05** | UI initial design via Claude Design | 首版 prompt-to-prototype（不走 Figma 拖鼠标）；与 KP-09 协同 |
| **KP-06** | Reject reinvented wheels | Fork-and-extend 优于 write-from-scratch |
| **KP-07** | Proactive contextual recall（"懂我"） | AI 主动浮出历史 context；验收 ≥3次/session ≥90% relevance — 见 `openspec/specs/memory-engine.md` § Proactive Recall |
| **KP-08** | OSS dependency tracking + upstream monitoring | 每个 OSS 进 `.planning/dependencies.md` + post-v1 自动 upstream check |
| **KP-09** | Aesthetic family — Anthropic/Claude visual identity | Warmth + accessibility + restraint；详 `.planning/threads/visual-design-system.md` + SSOT `.planning/references/design/` |

---

## Key Decisions（13 KD — 不可逆锁定）

| KD | Decision | spec / 位置 |
|----|----------|-------------|
| **KD-01** | Stack: Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell | `openspec/specs/claude-subprocess.md` |
| **KD-02** | Frontend: marked + KaTeX + DOMPurify + Svelte 5 runes | `openspec/specs/claude-subprocess.md` + `openspec/specs/editor.md` |
| **KD-03** | Rust ≥ 1.88（pinned `rust-toolchain.toml`） | `openspec/specs/claude-subprocess.md` |
| **KD-04** | Echo360 via Tauri webview + persistent USYD SSO cookie | `openspec/specs/echo360-video.md` |
| **KD-05** | Citations API for anchored mode | `openspec/specs/anchored-mode.md` |
| **KD-06** | FSRS-6 via ts-fsrs（open-spaced-repetition org，MIT） | seed → `.planning/todos/pending/2026-05-14-spec-fsrs-review-concept-page.md` |
| **KD-07** | No vector DB by default；agentic search replaces RAG | `openspec/specs/agentic-search.md` |
| **KD-08** | Cytoscape mind-map + Excalidraw whiteboard + KG always-on | `openspec/specs/mindmap-viz.md` + seed → `.planning/todos/pending/2026-05-14-spec-whiteboard-excalidraw-canvas.md` |
| **KD-09** | Tiptap block editor；markdown as storage | `openspec/specs/editor.md` |
| **KD-10** | Three-tier memory architecture — **library DEFERRED until Phase 5.5** | `openspec/specs/memory-engine.md`（BLOCKED） |
| **KD-11** | Phase entry gate — Echo360 spike must pass before Phase 6 | `openspec/specs/echo360-video.md` |
| **KD-12** | `claude-code-parser` (MIT) vendored，NOT npm dep | `openspec/specs/claude-subprocess.md` |
| **KD-13** | Visual aesthetic system locked to Anthropic/Claude（per KP-09） | `.planning/threads/visual-design-system.md`（thread 而非 spec — 持续演化的工作流契约 + 美学锁 quick reference） |

---

## Open Questions（5 RQ）

| RQ | Question | Status | Gate / 触发 |
|----|----------|--------|------------|
| **RQ-01** | Memory project survey（Mem0 / Cognee / Zep+Graphiti / agentmemory） | **BLOCKING** | Phase 7 entry — 4-project dogfood report；详 `openspec/specs/memory-engine.md` |
| **RQ-02** | PDF → markdown library | ✓ **resolved** | → REQ-18 + `openspec/specs/document-ingestion.md`（MinerU 主选，2026-05-11 user 翻转 STACK 原推荐 Marker） |
| **RQ-03** | Claude Code subprocess GUI wrapper community impls | ✓ **resolved** | Absorbed into Phase 1（TOKENICODE pattern study + claude-code-parser vendored per KD-12） |
| **RQ-04** | GSD `graphify` skill reuse decision | Open | Resolved 在 `openspec/specs/memory-engine.md` Phase 7 design 时 |
| **RQ-05** | Learning-method epistemic humility | **Open, non-blocking** | Ongoing throughout v1 ship + 3-month dogfood；findings → new REQ / OOS / KP candidates |

---

## Cross-cutting（thread / 横切约束 — 不属任何 phase）

| Thread | Scope | 文件 |
|--------|-------|------|
| **visual-design-system** | UI 设计 → 实现工作流契约（user prototypes in Claude Design Lab → 我像素级复刻）+ KP-09 / KD-13 美学锁 quick reference + Mneme.html prototype 路径跟踪 | `.planning/threads/visual-design-system.md` |
| **interaction-paradigm** | 鼠标优先 + Cmd+Q 唯一全局热键 + 4 个窄场景例外候选跟踪（voice-input Cmd+Shift+V / fsrs-review 1234 / multi-session Cmd+K / fsrs-review Esc） | `.planning/threads/interaction-paradigm.md` |

---

## Evolution

本文档在 phase transitions + milestone boundaries 演化。

**After each phase transition**（`/gsd-transition`）：
1. REQ invalidated → 移到 OOS + reason
2. REQ validated → ✓ + phase ref
3. New REQ emerged → 加 Active + 在合适 trigger 抽 spec
4. KD 新增 → append + 创建 spec 或 update existing
5. "What This Is" 漂移 → update

**After each milestone**（`/gsd-complete-milestone`）：
1. Full review
2. Core Value 5-dim 仍是 right priority？
3. OOS 理由仍 valid？

**Slim Index Edition 维护规则**：本文档**不**重复 spec 内容。新增 KP/KD/REQ/OOS/RQ 同步在 4 处（PROJECT.md L3 header range + spec 文件 + STATE.md + CLAUDE.md `Recent additions`），详见 CLAUDE.md "Sync checklist when adding a new KP / KD / REQ / OOS / RQ"。

---

*Last updated: 2026-05-14 — OpenSpec stage-3 slim down（815 行 → ~150 行索引）。详细 capability 内容已移到 `openspec/specs/*.md`（13 个 capability spec）+ `.planning/threads/`（2 个横切 thread）+ `.planning/todos/pending/2026-05-14-spec-*`（4 个 seed + 1 个 note）。本文档保持 5 维度身份层 + 编号锚点索引。原 815 行版本可通过 `git show <commit-before-slim>:` 找回。*
