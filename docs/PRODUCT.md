# Mneme — 产品身份文档

> 本文件是产品身份的唯一权威（WHAT 层顶点）。前身 `.planning/PROJECT.md`（GSD 时代）已随该层删除，全文可在 git 历史找回。
>
> **2026-07-31 修订**（本文件诞生日，随 [ADR-0001](adr/0001-matt-only-dev-workflow.md) 工作流切换落笔）：
> ① 受众扩展 — 单用户自用 → **自用优先 + 获客分发**（Dim 5 + OOS-01 改写）；
> ② REQ-11 命令面板**复活**，"鼠标优先 + Cmd+Q 唯一热键"范式作废（OOS-09b 删除）；
> ③ REQ-03/13 定形为**自成生态导入**（手动 + UniBoard 桥），Mneme 永不直连 Canvas/Ed API。

---

## What This Is

本地运行的桌面 app，组合：

- **Obsidian-style** local-first markdown vault（数据完全本机）
- **NotebookLM-style** source-grounded chat + 引用（anchored mode）
- **Claude Code** agent capabilities（MCP / web / tool use / hooks / skills）作为 subprocess 跑在 GUI 壳内
- **Heptabase / mind-map style** 空间思考层 — 给人看
- **GraphRAG-style** 知识图谱层 — 给 AI 看
- **Anki / FSRS-6** spaced repetition on 概念页（非卡片）
- **Echo360 lecture video** 嵌入 webview（USyd-specific）

主 UI：课件（左）· 视频 + 课材预览（中）· Claude 对话（右）· 底部 live mind-map。布局最终形态待 REQ-01 改写（用户可拖拽自定义，不固定三栏）。

---

## Core Value — 5 维度复合身份

> 每个维度非协商性——失任一维度退化成不同产品。所有决策必走 5 维度过滤。单句摘要不替代 5 维度（单独引用丢 80% identity）。

### Dim 1 — 产品哲学（9 KP，非协商）

见下方 § Key Principles。

### Dim 2 — 用户体验承诺（5 promises）

1. **"懂我" AI**（KP-07）— agent memory + KG + 主动召回；AI 主动浮出 last-session 进展 / 跨周前置 / 反复出错（不被问也讲）— 详 `specs/memory-engine.md` § Proactive Recall
2. **学习闭环** — learn → AI teaches → notes captured → FSRS review，一个产品感不是五个 app 粘合
3. **双模式** — *free Claude as teacher* + *anchored Claude as textbook search*（REQ-08）；同 UI 一键切
4. **一个产品感** — 布局与交互一致（REQ-01）
5. **Power-user UX** — multi-session sidebar（REQ-12）+ 命令面板（REQ-11，2026-07-31 复活）+ 键盘快捷键按 macOS/品类惯例设计

### Dim 3 — 架构底盘（13 KD，不可逆锁定）

见下方 § Key Decisions。

### Dim 4 — 边界（OOS，刻意排除）

见下方 § Out of Scope。说"不"的精度跟说"是"的精度一样是身份。

### Dim 5 — 落地上下文（2026-07-31 改写）

- **首要用户**：我——USYD CS 学生，S2 2026 真实课程 dogfood 是一切功能的验收场
- **次级受众**：其他学生用户——**自用验证通过后分发获客**（顺序不可倒置：先"我用着不错"，再给别人）
- **设备底线**：MacBook Pro 2019 Intel，macOS Ventura 13.4（性能预算按此校准）
- **identity**：`dev.mneme.app`

**One-sentence 摘要**：mneme 是 **local-first + AI-native** 个人学习基础设施，end-experience 是 *"this AI truly understands me"* —— 主动浮出我在哪、卡在哪、知识怎么连，而不只是回答我问的。

**REQ sample-size 谦逊条款**：现有 REQ 来自 n=2 样本。Foundation（KP + KD）必须对特性集保持中立——Application 层可替换/退役；获客后真实用户反馈是新的需求来源，但每条仍走 5 维度过滤。

---

## Requirements（索引）

> 详细验收、备选、否决理由在 spec 文件（`docs/specs/`）；未写 spec 的挂 seed（`docs/reference/seeds/`）。历史快照：`docs/reference/REQUIREMENTS-2026-05.md`。

### v1 — MVP（ship-and-use-daily）

| REQ | Capability | spec / 状态 |
|-----|-----------|-------------|
| **REQ-01** ⚡待改写 | 用户自定义可拖拽布局（原三栏） | `specs/layout-shell.md`（改写进 BACKLOG） |
| **REQ-02** | Tauri 壳 spawn local claude CLI subprocess | `specs/claude-subprocess.md` |
| **REQ-03** | 自成生态导入：手动上传 + UniBoard 桥（**不接 Canvas/Ed API**，2026-05-11 决定、2026-07-31 确认） | spec 待写 → seed `2026-05-14-spec-external-import-self-ecosystem.md` |
| **REQ-06** | Markdown vault + Tiptap 编辑器 | `specs/vault-storage.md` + `specs/editor.md` |
| **REQ-10** | Agentic search default（不上 vector DB） | `specs/agentic-search.md` |
| **REQ-11** | 命令面板 Cmd+P / Cmd+O / Cmd+Shift+P（**2026-07-31 复活**，曾于 2026-05-11 retire） | `docs/reference/phase03/03-UI-SPEC.md`（APPROVED）为设计权威 |
| **REQ-12** | Multi-session sidebar | `specs/multi-session.md` |
| **REQ-13** | Import 状态 surface（合并进 REQ-03 自成生态导入） | 同 REQ-03 seed |
| **REQ-14** | Settings / preferences UI | `specs/settings-ui.md` |
| **REQ-16** | First-run onboarding wizard | spec 待写 → seed `2026-05-14-spec-onboarding-first-run-wizard.md` |

### v1.x — post-MVP

| REQ | Capability | spec / 位置 |
|-----|-----------|-------------|
| **REQ-04** | Echo360 webview + USYD SSO | `specs/echo360-video.md`（**spike-gated** by KD-11） |
| **REQ-05** | Caption-bilingual VTT | seed `2026-05-14-spec-caption-bilingual-vtt.md`（depends echo360 spike） |
| **REQ-07** | KG + 三层 memory + mind-map | `specs/memory-engine.md` + `specs/mindmap-viz.md`（**BLOCKED by RQ-01**） |
| **REQ-08** | Anchored mode + Citations API；free 模式也带 Sources（见 seed `2026-05-07-spec-claude-free-mode-source-display…`） | `specs/anchored-mode.md` |
| **REQ-09 + REQ-15** | FSRS-6 concept review + focus mode | seed `2026-05-14-spec-fsrs-review-concept-page.md` |
| **REQ-17** | Per-course system prompts | `specs/per-course-rules.md` |
| **REQ-18** | Document → markdown（PDF MinerU + Office markitdown） | `specs/document-ingestion.md` |
| **REQ-19** | Voice input via OSS STT | seed `2026-05-14-spec-voice-input-oss-stt.md`（等 Intel Mac STT latency spike） |

---

## Out of Scope（刻意排除）

| OOS | Exclusion | Why |
|-----|-----------|-----|
| **OOS-01**（2026-07-31 改写） | Multi-user 协作 / 托管 SaaS 仍排除（产品形态 = 单机单用户实例）。**分发给其他用户 + 商业化不再排除**——前置门：自用 dogfood 验证通过。分发工程（签名/公证/更新通道）见 BACKLOG "Phase 15" | 获客决定（2026-07-31）；协作是另一个产品 |
| **OOS-02** | Mobile（iOS / Android） | Desk learning + Tauri Mobile 复杂 |
| **OOS-03** | Custom-built vector DB / RAG | 替代 REQ-10 agentic search；窄场景 vector 留口给 memory-engine 内部 |
| **OOS-04** | Audio / video overview generation | Claude 不擅长；passive listening 反 math/CS 学习 |
| **OOS-05** | Manual flashcard authoring（Anki-style） | 替代 REQ-09 concept-page FSRS |
| **OOS-06** | Manual mind-map drawing | Auto-generated from KG（mindmap-viz 派生） |
| **OOS-07** | Plugin / extensibility API | Claude Code skills 已是 |
| **OOS-08** | Multi-LLM-provider | KP-04 兼容性问题 |
| ~~OOS-09~~ | ~~Voice/audio dictation input~~ | Lifted 2026-05-07 → REQ-19 |
| ~~OOS-09b~~ | ~~命令面板 + 多全局快捷键~~ | **删除 2026-07-31**——鼠标优先范式作废，REQ-11 复活（历史见 `docs/reference/notes/interaction-paradigm-2026-05.md`） |

---

## Key Principles（9 KP — 非协商性）

| KP | Principle | One-line |
|----|-----------|----------|
| **KP-01** | Local-first | 所有数据本地 disk；offline-functional；no auto cloud |
| **KP-02** | 50% OSS-driven | 半数 surface area 社区验证 OSS；阈值 ≥1k★ + multi-maintainer + clean + active + permissive |
| **KP-03** | AI-native data model | Embeddings + 图 + confidence + provenance + timestamps 是 first-class |
| **KP-04** | Compliant subprocess wrapping | 用户自己 claude CLI + 自己订阅；no token theft；per Anthropic ToS |
| **KP-05** | UI initial design via Claude Design | 首版 prompt-to-prototype；与 KP-09 协同 |
| **KP-06** | Reject reinvented wheels | Fork-and-extend 优于 write-from-scratch |
| **KP-07** | Proactive contextual recall（"懂我"） | AI 主动浮出历史 context；验收 ≥3次/session ≥90% relevance — `specs/memory-engine.md` |
| **KP-08** | OSS dependency tracking | 每个 OSS 进 `docs/dependencies.md` + post-v1 upstream check |
| **KP-09** | Aesthetic family — Anthropic/Claude visual identity | Warmth + accessibility + restraint；SSOT `docs/design/` |

---

## Key Decisions（13 KD — 不可逆锁定）

| KD | Decision | spec / 位置 |
|----|----------|-------------|
| **KD-01** | Stack: Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell | `specs/claude-subprocess.md` |
| **KD-02** | Frontend: marked + KaTeX + DOMPurify + Svelte 5 runes | `specs/claude-subprocess.md` + `specs/editor.md` |
| **KD-03** | Rust ≥ 1.88（pinned `rust-toolchain.toml`） | `specs/claude-subprocess.md` |
| **KD-04** | Echo360 via Tauri webview + persistent USYD SSO cookie | `specs/echo360-video.md` |
| **KD-05** | Citations API for anchored mode | `specs/anchored-mode.md` |
| **KD-06** | FSRS-6 via ts-fsrs（open-spaced-repetition org，MIT） | seed `2026-05-14-spec-fsrs-review-concept-page.md` |
| **KD-07** | No vector DB by default；agentic search replaces RAG | `specs/agentic-search.md` |
| **KD-08** | Cytoscape mind-map + Excalidraw whiteboard + KG always-on | `specs/mindmap-viz.md` + seed whiteboard |
| **KD-09** | Tiptap block editor；markdown as storage | `specs/editor.md` |
| **KD-10** | Three-tier memory architecture — **library DEFERRED until Phase 5.5** | `specs/memory-engine.md`（BLOCKED） |
| **KD-11** | Phase entry gate — Echo360 spike must pass before Phase 6 | `specs/echo360-video.md` |
| **KD-12** | `claude-code-parser` (MIT) vendored in `vendor/`，NOT npm dep | `specs/claude-subprocess.md` |
| **KD-13** | Visual aesthetic system locked to Anthropic/Claude（per KP-09） | `docs/design/visual-design-system.md` + prototypes SSOT `docs/design/prototypes/` |

---

## Open Questions（RQ）

| RQ | Question | Status | Gate / 触发 |
|----|----------|--------|------------|
| **RQ-01** | Memory project survey（Mem0 / Cognee / Zep+Graphiti / agentmemory） | **BLOCKING** | Phase 7 entry — 4-project dogfood report；详 `specs/memory-engine.md` |
| **RQ-02** | PDF → markdown library | ✓ resolved | → REQ-18（MinerU 主选） |
| **RQ-03** | Claude Code subprocess GUI wrapper community impls | ✓ resolved | Phase 1 已吸收 |
| **RQ-04** | graphify 复用决策 | Open | Phase 7 design 时解 |
| **RQ-05** | Learning-method epistemic humility | Open, non-blocking | Ongoing；findings → new REQ / OOS / KP candidates |
| （thea） | 出题软件 thea 评估 | ✓ resolved 2026-05-07 | REJECT as dependency；STUDY-ONLY for Phase 10 UX（`docs/reference/seeds/2026-05-07-evaluate-thea…`） |

---

## Evolution

本文档只在身份级决策时修订（受众 / KP / KD / REQ / OOS / RQ 的增删改），每次修订：顶部修订块加一行 + 相应表格就地改 + 值得记录的权衡写 ADR。GSD 时代的 4 处同步 checklist 作废——现在只有本文件一个身份权威。
