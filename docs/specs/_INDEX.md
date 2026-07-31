# Mneme Capability Spec Index

> **2026-07-31 修订**（GSD/OpenSpec 层删除，specs 迁至 `docs/specs/`，见 ADR-0001）：① **command-palette 复活**（REQ-11 restored，鼠标优先范式作废——下文所有"鼠标优先 / interaction-paradigm 约束"引用一律按作废读，横切 C 归档于 `docs/reference/notes/interaction-paradigm-2026-05.md`）；② 身份权威 = `docs/PRODUCT.md`（原 PROJECT.md）；③ phase 状态改由 `BACKLOG.md` 跟踪。
>
> 旧状态：草案 v0.3（2026-05-11）。基于 v0.2 用户反馈追加调整：command-palette 砍（已被上方修订推翻）+ **claude-subprocess 加预热约束**（解决 Phase 1 实测的冷启动）+ **新增横切 C interaction-paradigm**（已归档）。
>
> **目的**：把 PROJECT.md 这本厚手册按"能力（capability）"切分。每个 spec 文件描述一个能跨 phase、独立演进的能力域，包含：现状 / 评估过的备选 / 否决理由 / 实施约束 / 重新评估触发条件。Phase/工单状态由 `BACKLOG.md` 负责；spec 负责"能力是什么、为什么这样、什么时候可以换"。

---

## 切分概览（v0.4 — 2026-05-14）

**18 个 feature spec**（#08 command-palette 已 retired）+ **3 个横切 spec（约束 / 承诺）** + **1 个工作流工具 spec**（2026-05-14 新增 dev-feedback-loop）= 22 个文件。

### Feature 域 spec（19 个）

| # | Spec | 覆盖项 | v1 / v1.x | 当前 phase | Status |
|---|------|--------|-----------|-----------|--------|
| 1 | **claude-subprocess** | REQ-02 · KD-01 · KD-02 · KD-03 · KP-04 · KD-12 | v1 | Phase 1 EXECUTING | partial — spike 002 validated |
| 2 | **agentic-search** | REQ-10 · KD-07 | v1 | Phase 1 | hypothesis |
| 3 | **vault-storage** | REQ-06 · KP-01 · KP-03(data) | v1 | Phase 2 | hypothesis |
| 4 | **external-import** ⚡改 | REQ-03(改写) · REQ-13(改写) · UniBoard handoff todo | v1 | Phase 2 | hypothesis — **走自成生态，不接 Canvas/Ed API** |
| 5 | **document-ingestion** ⚡改 | REQ-18 · KP-02 | v1 | Phase 4 | hypothesis — **PDF 主选 MinerU** |
| 6 | **editor** | KD-09 · REQ-06(书写侧) | v1 | Phase 3 | hypothesis |
| 7 | **layout-shell** ⚡拆 | REQ-01 · 用户自定义可拖拽布局 | v1 | Phase 1 实装中 | partial |
| 8 | **command-palette** ♻️ 复活 2026-07-31 | REQ-11 restored | v1 | Phase 3 | 设计权威 = `docs/reference/phase03/03-UI-SPEC.md`（APPROVED）；spec 文件待写 |
| 9 | **multi-session** ⚡拆 | REQ-12 | v1 | Phase 3 | hypothesis |
| 10 | **settings-ui** ⚡拆 | REQ-14 | v1 | Phase 2 | hypothesis |
| 11 | **onboarding** ⚡拆 | REQ-16 | v1 | Phase 2 | hypothesis |
| 12 | **echo360-video** | REQ-04 · KD-04 · KD-11 | v1.x | Phase 5→6 | gated by spike |
| 13 | **caption-bilingual** | REQ-05 | v1.x | Phase 6 | hypothesis |
| 14 | **memory-engine** | REQ-07 · KD-10 · KP-03 · KP-07(data) · RQ-01 | v1.x | Phase 5.5→7 | **BLOCKED** by RQ-01 |
| 15 | **mindmap-viz** ⚡拆 | KD-08(mind-map) · REQ-07(视觉) | v1.x | Phase 8 | hypothesis |
| 16 | **whiteboard** ⚡拆 | KD-08(Excalidraw) | v1.x | Phase 8 后置 | hypothesis |
| 17 | **anchored-mode** | REQ-08 · KD-05 | v1.x | Phase 9 (切换 UI 已 Phase 1 实装) | partial — UI ready |
| 18 | **per-course-rules** | REQ-17 | v1.x | Phase 8 | hypothesis |
| 19 | **fsrs-review** | REQ-09 · REQ-15 · KD-06 | v1.x | Phase 10 | hypothesis |

### 横切 spec（3 个）

| Spec | 性质 | 覆盖项 | 适用范围 |
|------|------|--------|----------|
| **visual-design-system** | 约束 spec | KP-09 · KD-13 | 所有 UI spec 必须遵守 |
| **proactive-recall** | 体验承诺 spec | KP-07 | memory-engine + multi-session + per-course-rules 协同（**或合进 memory-engine — 待用户定**） |
| **interaction-paradigm** ⚡新 | 约束 spec | 鼠标优先 · Cmd+Q 唯一全局热键 | 所有 UI spec + subprocess 退出路径 |

### 工作流工具 spec（1 个，2026-05-14 新增）

> 不是产品能力 / 不是用户可见 surface —— 是 mneme 开发流程本身的工具基础设施。Phase 01.1 ship + archive 后从 OpenSpec change `automate-dev-feedback-loop` 折出。

| Spec | 性质 | 覆盖项 | 适用范围 |
|------|------|--------|----------|
| **dev-feedback-loop** ⚡新 | 工作流工具 spec | R1-R9（Svelte forwarder + Tauri dev commands + npm bridge + 8 verify.* SDK handlers + verify-work workflow patches + visual-review.html template + ephemeral handoff HTML 契约 + validate-html 强制 4-bucket） | `/gsd-verify-work` 自动化路径；mneme 对 GSD upstream 的反向贡献候选；Phase 01.1 + Living visual contract 的产物 |

---

## 暂不切的能力（保留观察）

| 候选 | 为什么不切 |
|------|-----------|
| **voice-input** | REQ-19 v1.x 候选，STT 库 / phase 都未定，等 Intel Mac CPU latency spike |
| **oss-dependency-tracking** | KP-08 已有 `docs/dependencies.md`，是 ops 流程不是产品能力 |

---

## 19 + 2 spec 详细切分

> 每条只列"它包含什么 + 为啥这样切"，正文在审阅通过后逐个抽出。

### 1. claude-subprocess ⚡【加预热约束】

**它是什么**：Tauri 2 壳通过 `tauri-plugin-shell` 启动本机 `claude` CLI 子进程，stream-json 解析、tool-use roundtrip、subprocess 生命周期。整个项目的命脉。

**覆盖**：REQ-02 · KD-01 · KD-02 · KD-03 · KP-04 · KD-12

**Phase 1 finding (2026-05-11)**：实测发现 app 启动后 claude 子进程**不预热** → 用户首条消息冷启动慢。**新增实施约束**：app 启动时即 spawn 一个 idle subprocess（不阻塞 UI），处于待命状态；用户首次发送时直接 attach 到已暖好的进程，避免 spawn 延迟。这条约束进 Phase 1 收尾或 Phase 2 plan 时落地。

**评估过的备选**：opcode (AGPL ⛔) · TOKENICODE (Apache-2.0, 强参考) · claude-code-gui (MIT, file-tail) · claude-code-sdk-ts · Electron 替代

**重评触发**：Anthropic 发布官方 stream-json SDK / Tauri 2 致命缺陷

---

### 2. agentic-search（无变化）

**它是什么**：默认靠 `claude --add-dir <vault>` 让模型自己 grep/glob，不上 vector DB。故意的非架构决策。

**覆盖**：REQ-10 · KD-07 · 与 OOS-03 划界

**评估过的备选**：Mem0 vector-first · sqlite-vec + Ollama 本地 vector · Cognee GraphRAG · pgvector

**重评触发**：某类查询实测不达标 / Claude Code 自己改 RAG

---

### 3. vault-storage（无变化）

**它是什么**：Markdown + YAML frontmatter 本地 vault，PARA + course-root 结构，`_source/` 写保护。

**覆盖**：REQ-06 · KP-01 · KP-03(data)

**评估过的备选**：Obsidian 当目标格式 · SQLite 单文件 · 自定义 JSON

**重评触发**：用户迁移到非 markdown 编辑器 / vault >10K 文件 grep 崩

---

### 4. external-import ⚡【改写】

**它是什么**：**走自成生态** — 不接 Canvas/Ed API、不调外部 MCP。两个入口：
1. **手动文件导入**：用户拖拽 / 文件选择器 / 文件夹批量
2. **UniBoard 桥接**：从用户另一个项目（FastAPI+Next.js+Supabase+Claude API 的 web 端 GPA dashboard）导入文件 / 任务 / 笔记切片

**覆盖**：
- REQ-03（**待改写** — 不再是"Canvas/Ed 拉取 + 增量同步"，改为"手动 import + UniBoard 桥"）
- REQ-13（**待改写** — 不再是"sync status"，改为"手动 import 进度 / UniBoard 桥状态"）
- 接入 STATE.md 已有 todo `docs/reference/seeds/2026-05-09-cross-project-handoff-from-uniboard-to-mneme-via-claude-code.md`

**为啥这样改**：
- 用户已有 UniBoard 项目（web 端 GPA 看板），轻量在线消费 ↔ Mneme 本地重加工 形成闭环
- 不接 Canvas/Ed → 不被学校 API 改版 / 切换学校绑死
- 跟 KP-01 local-first 更彻底兼容（Canvas API 必须联网）

**评估过的备选（含已否决的原方案）**：
- ~~Canvas + Ed MCP（7th iteration）~~ — 用户 2026-05-11 决定**不接入外部 API/MCP**，走自成生态
- ~~纯 Canvas API 不走 MCP~~ — 同上原因否决
- 纯手动 import — 不够，有 UniBoard 已沉淀内容需复用

**实施约束（待 Phase 2 + UniBoard handoff todo 解决时细化）**：
- 手动 import：拖拽 / 文件选择器 / 文件夹批量；多格式（PDF/Office/markdown/text）入口
- UniBoard 桥需先回答 4 个问题（todo 里已记录）：
  1. **移交单元**：笔记 / AI 对话 / 课程切片
  2. **传输协议**：deep link / 共享 Supabase / MCP 桥接
  3. **链接兼容**：`[[wiki-link]]` 跨项目可解析？
  4. **离线可用**：KP-01 — UniBoard 离线时 Mneme 应能用已 import 的快照
- import 结果落到 `_source/` 还是别的子目录待定（vault-storage spec 协调）

**重评触发**：UniBoard 移交单元定义大变 / 用户决定接入 Canvas API（不太可能）/ UniBoard 项目废弃

---

### 5. document-ingestion ⚡【改 PDF 引擎】

**它是什么**：手动 / UniBoard 导入的 PDF/Office 文档转 markdown 落入 vault。

**覆盖**：REQ-18 · KP-02

**主选**：
- **PDF → MinerU（本地）**（user 2026-05-11 实测判定 MinerU 更准确）
- **Office (docx/xlsx/pptx/html) → markitdown subprocess**
- `.md` / `.txt` → 直通

**评估过的备选**：
- **Marker (datalab-to/marker)** — STACK.md 原主选，被换下。理由：用户实测 MinerU 在自己课件场景准确率更高。Marker 留作 fallback（如果 MinerU 在某些 PDF 类型上失效）
- PyMuPDF4LLM（AGPL ⛔，数学弱）
- Docling IBM（输出结构过重）
- Nougat（abandoned）
- LlamaParse（cloud-only ⛔）

**实施约束**：
- MinerU 本地推理 — Intel Mac CPU 速度待 Phase 4 实测
- subprocess 边界 — 进程隔离，license 干净（MinerU AGPL-3.0 当 CLI 调用不污染主项目，与 Marker GPL-3.0 同理）
- 错误回流：转换失败 surface 到 UI（与 external-import 的进度状态 spec 协同）

**重评触发**：MinerU 在用户实际课件准确率低于预期 → 回退 Marker / markitdown 停更 / Anthropic 发布原生文档摄取 API

---

### 6. editor（无变化）

**它是什么**：Tiptap v3 块编辑器 + slash 菜单 + markdown round-trip。

**覆盖**：KD-09 · REQ-06(书写侧)

**实施约束**：math 走 KaTeX paint-time 不做 first-class block / `tiptap-markdown` (aguingand) 替代 Tiptap Pro

**评估过的备选**：BlockNote (React-only) · Slate.js · Quill · Lexical

**重评触发**：Tiptap v4 breaking / Svelte-native 同级编辑器出现

---

### 7. layout-shell ⚡【新拆 1/5】

**它是什么**：app 整体布局壳。**用户可自定义** — 不是固定三栏。提供拖动按钮调整各 pane 位置 / 大小 / 显隐。Phase 1 已重新设计并实装拖动按钮。

**覆盖**：REQ-01（**待改写** — 不再固定三栏，改"用户自定义的可拖拽布局"）

**为啥从 shell-ux 拆出**：布局是 app 容器的物理基础，独立演进意义最大（用户 Phase 1 已经迭代过一次设计）；多会话 / 命令面板 / 设置 是各自独立的功能层，混在一起没必要。

**实施约束**：
- 拖动按钮已实装（Phase 1）— 用户可调整布局
- 默认布局：保留三栏作为默认值（左课件 / 中视频+预览 / 右 chat），但用户可改
- 持久化：布局状态存 `localStorage` 或 settings
- 视觉系统：遵守 visual-design-system 横切约束（KD-13 不变）

**评估过的备选**：
- 固定三栏不可调（用户 Phase 1 体验后判定不够灵活）
- tab 分页式（违反"NotebookLM 心智模型"）
- 全屏单页（违反"three-pane 一产品感"）

**重评触发**：用户实测自定义布局太复杂没人用 → 回归固定布局 / 屏幕尺寸变化（13" → 外接显示器）触发布局变体

---

### 8. ~~command-palette~~ ⛔【RETIRED · 2026-05-11】

**状态**：砍。REQ-11 移到 OOS（Out of Scope）。

**为啥砍**：user 2026-05-11 反馈"所有交互除 Cmd+Q 以外都用鼠标"。命令面板 + 多快捷键违背鼠标优先的交互范式。

**替代**：新增横切 spec C **interaction-paradigm**，明确"鼠标优先 · Cmd+Q 唯一全局快捷键"作为所有 UI spec 必须遵守的约束。

**重新启用触发**：用户实测多会话切换 / 长 vault 浏览鼠标低效 → 重开窄场景快捷键讨论（不是立刻重启命令面板）。

---

### 9. multi-session ⚡【新拆 3/5】

**它是什么**：多 chat 会话 sidebar — 每会话一个 claude subprocess，独立 system prompt + vault scope；`--resume` 跨重启恢复。

**覆盖**：REQ-12

**实施约束**：每会话独立 subprocess（资源 budget 待测） / 会话名自动生成可改 / 与 claude-subprocess 的生命周期管理协同

**评估过的备选**：tab 分页 · 单会话 + 上下文压缩 · ChatGPT 式 sidebar

**重评触发**：并发 subprocess 内存崩 / Claude Code 自带 multi-session

---

### 10. settings-ui ⚡【新拆 4/5】

**它是什么**：设置面板 — General / Vault / Sync / Claude / Privacy / Appearance / Keybindings / Advanced 分类。

**覆盖**：REQ-14

**实施约束**：Cmd+, 入口 · 每项可自解释（无外部文档依赖）· cost cap kill switch · 主题切换（受 visual-design-system 约束）

**评估过的备选**：仅 JSON 配置文件（不够 self-discoverable）· 散落在各 pane 内嵌（找不到）

**重评触发**：设置项 >50 时考虑搜索 / 分组重构

---

### 11. onboarding ⚡【新拆 5/5】

**它是什么**：首次启动向导 — 6 步引导（Welcome → Claude Code auth → Vault path → import 入口 → 课程选择 → 首次 import）。

**覆盖**：REQ-16

**为啥独立**：onboarding 一次性体验，独立演进 / 可以彻底 redesign 而不影响其他 spec。

**实施约束**：可取消可恢复（`~/.mneme/onboarding-state.json`）· 与 external-import spec 协同（第 4 步入口指向 manual import / UniBoard 桥）· 走 visual-design-system

**评估过的备选**：不做 onboarding（"future-me 6 个月后"重新踩坑）· 全自动检测无引导（学校 API 探测在 external-import 新方案下不需要了）

**重评触发**：onboarding 完成率低 / 步骤改超 8 步 → 重设计

---

### 12. echo360-video（无变化）

**它是什么**：Tauri webview + USYD SSO + Keychain cookie 持久。USyd 特化差异化。

**覆盖**：REQ-04 · KD-04 · KD-11(gate)

**Gate**：`/gsd-spike echo360-webview-auth` 必须先通过

**评估过的备选**：OAuth client credentials（学生没权限）· LTI 1.3 token 直拿 · 外开浏览器 + deep link（fallback）· HLS 抓流（ToS ⛔）

**重评触发**：spike 失败 / Echo360 全面禁第三方 cookie / USYD 切换平台

---

### 13. caption-bilingual（无变化）

**它是什么**：Echo360 VTT → Claude API 翻译 → 双语 VTT → HTML5 `<track>` 渲染 + 字幕全文进入 vault grep 索引。

**覆盖**：REQ-05

**评估过的备选**：node-webvtt · srt-vtt-parser · Read Frog/FluentRead（GPLv3 只学不抄）· 自写 parser

**重评触发**：Claude API 翻译成本超预算 → macOS native / 本地小模型

---

### 14. memory-engine（无变化）

**它是什么**：三层记忆（working/episodic/long-term）+ KG（concept nodes + edges + confidence + provenance + timestamps）。v1.x 最复杂能力。

**覆盖**：REQ-07 · KD-10(库未锁) · KP-03 · KP-07(data) · RQ-01

**BLOCKED**：Phase 5.5 RQ-01 4-project 调研 + 1 周 dogfood 才能进 Phase 7

**评估中候选**：agentmemory（fallback）· Cognee · Zep+Graphiti · Mem0 · Letta · SimpleMem

**重评触发**：RQ-01 调研结果 / Anthropic 原生 memory

---

### 15. mindmap-viz ⚡【拆 1/2】

**它是什么**：课程结构默认视图 — Cytoscape.js mind-map，从 memory-engine 的 KG 派生。

**覆盖**：KD-08(mind-map 部分) · REQ-07(视觉)

**为啥从 mindmap-whiteboard 拆出**：mind-map 和 whiteboard 是**不同功能**（用户 2026-05-11 反馈）— mind-map 是 KG 派生的结构化视图（强关联课程概念），whiteboard 是用户自由画布（弱结构）。共享 KG 数据源不等于共享 spec，独立演进意义更大。

**实施约束**：
- Cytoscape.js v3.33.3 · `dagre` 课程 DAG · `cose-bilkent` 自由聚类
- KG 派生 — 与 OOS-06（手画 mind-map）划界
- 实时流入：新 fact → `cy.add()` + 增量布局（不全量 re-layout）

**评估过的备选**：vis-network · Sigma.js · D3-graphviz · React Flow

**重评触发**：Cytoscape v4 breaking / 性能 >1K 节点崩

---

### 16. whiteboard ⚡【拆 2/2】

**它是什么**：用户自由画布 — Excalidraw v0.18.1，周末整合 / 跨主题视觉拼接。

**覆盖**：KD-08(whiteboard 部分)

**为啥独立**：v1.x 后置功能，与 mindmap-viz 完全不同用例 — mindmap 是"AI 给你看 KG"，whiteboard 是"你画给自己看"。

**实施约束**：
- Excalidraw MIT — 拒绝 tldraw v4 proprietary
- React-only → Svelte host (`svelte-react` 或 `createRoot()` in `onMount`)
- 持久化：scenes 落 `courses/<CODE>/whiteboards/<topic>.excalidraw.json`
- 字体自宿主（Tauri-bundled）

**评估过的备选**：tldraw v4 (proprietary ⛔) · Konva/Fabric.js（太底层）· WBO（server-required ⛔）

**重评触发**：Excalidraw 协议变 / 用户实测白板用不上 → 砍

---

### 17. anchored-mode ⚡【加注：UI 已 Phase 1 实装】

**它是什么**：聊天面板 free ↔ anchored 切换。Anchored 走 Anthropic Citations API，回答每句附 `[file.md:42]` 可点击引用。NotebookLM 核心 USP + free 模式覆盖。

**覆盖**：REQ-08 · KD-05

**Phase 1 进展**：前端切换按钮已实装（用户图中 ↘ / 📋 那对图标就是这俩模式的 toggle）。Phase 9 完成后端 Citations API 接入 + sources panel + 引用点击跳转。

**关联待办**：free 模式 source 展示 + 三源冲突场景化（todo `docs/reference/seeds/2026-05-07-spec-claude-free-mode-source-display-and-conflict-resolution-req-08.md`）

**评估过的备选**：自建 RAG + vector（违反 KD-07）· 只做 anchored 不做 free（需 free 教师模式）

**重评触发**：Citations API 改版 / anchored 成本超预算 → chunking 重设

---

### 18. per-course-rules（无变化）

**它是什么**：`.mneme/rules/<rule>.md`（YAML + markdown）→ 开聊时 enabled 规则 concat 到 `--append-system-prompt`。差异化小投入大回报。

**覆盖**：REQ-17

**评估过的备选**：全局 `~/.claude/CLAUDE.md` · 启动时手动 `--system-prompt` · Cursor `.cursor/rules` MDC（参考设计）

**重评触发**：Anthropic 改 `--append-system-prompt` / Claude Code 出原生 per-project rules

---

### 19. fsrs-review（无变化）

**它是什么**：FSRS-6 在概念页（不是卡片）上 — daily-due `(graph weakness × FSRS due-ness)` → 单概念全屏 → AI 现场出题 → 1/2/3/4 回流。

**覆盖**：REQ-09 · REQ-15 · KD-06 · 与 OOS-05 划界（不做手建 flashcard）

**评估过的备选**：SM-2 · fsrs-rs Rust port · Obsidian SR plugin · Anki desktop · thea.study（cloud SaaS ⛔ 但 AI 出题算法值 Phase 10 spike）

**重评触发**：FSRS-7 / AI 出题质量差 / 用户实测每天 due 太多

---

### 横切 A：visual-design-system（无变化）

**Anthropic / Claude 美学家族**。SSOT `docs/design/`。

**Mandatory locks**：`#d97757` 橙 + `#faf9f5` 米 + `#141413` 文字 + `#2b2a27` 暖深 · serif body / 禁 Arial+Inter · ease `cubic-bezier(0.165, 0.85, 0.45, 1)` · active:scale 0.96 · 8% 软边 + 多层软影

**约束哪些 spec**：layout-shell · editor · mindmap-viz · whiteboard · fsrs-review · anchored-mode · command-palette · settings-ui · onboarding · external-import · per-course-rules — 所有 UI

---

### 横切 B：proactive-recall（待用户决定）

**KP-07"懂我"承诺** — AI 不只是"你问→它答"，要**主动浮出**相关历史（"上周二卡在 graph 第 3 题，跟这周 BFS 关联"）。

**横切到 3 个 spec**：memory-engine（数据）· multi-session（触发时机）· per-course-rules（注入策略）

**验收**：≥3次/会话，≥90% 相关度

**⚠ 待你决定**：保持独立横切 spec / 还是并进 memory-engine？

---

### 横切 C：interaction-paradigm ⚡【新增 2026-05-11】

**它是什么**：交互范式约束 — **鼠标优先**（点击 / 拖拽 / 滚动 / 右键菜单）；全局快捷键**只启用 Cmd+Q**（subprocess drain 用，KP-04 合规）。其他热键不绑。

**为啥这样**：user 2026-05-11 反馈"所有交互除 Cmd+Q 以外都用鼠标"。最小化学习成本，最大化 trackpad 友好度。

**约束哪些 spec**：layout-shell · editor · mindmap-viz · whiteboard · fsrs-review · anchored-mode · settings-ui · onboarding · external-import · per-course-rules · multi-session · claude-subprocess(Cmd+Q drain) — 所有 UI + subprocess 退出路径

**与 voice-input REQ-19 协同**：REQ-19 之前约束"与 command-palette 快捷键不冲突"。command-palette 砍掉后，voice-input 的快捷键约束改为"与 Cmd+Q 不冲突"。如果未来 voice-input 落地，重新讨论是否破例启用 `Cmd+Shift+V`。

**重评触发**：用户实测鼠标在多会话切换 / 长 vault 浏览 / FSRS review 1/2/3/4 评分等高频窄场景低效 → 启用窄场景快捷键（不是全面回归键盘优先）

---

### 工作流工具：dev-feedback-loop ⚡【新增 2026-05-14 · Phase 01.1 ship + archive 折出】

**它是什么**：自动化 `/gsd-verify-work` 的 UI 验证流——把"open DevTools / paste log / 跑 cargo / inspect DOM"路由用户的旧路径替换为 SDK-handler 驱动的自动化。**不是产品能力**，是 mneme 开发流程本身的工具基础设施。

**覆盖**：R1-R9（见 `docs/specs/dev-feedback-loop/spec.md`）
- R1: 全谱 Svelte console-forwarder（8 信号类，DEV-only，prod 完全 strip）
- R2: 5 个 Tauri Rust dev commands（`#[cfg(debug_assertions)]` gated，release-binary clean）
- R3: 3 个 npm-script 桥（gsd-dev-screenshot/snapshot/scan-logs，D-BR-02 错误信封）
- R4: execute-phase 静默规则（不在执行中提问）
- R5: verify-work.md 工作流 3 patches（critical_rules + package_manual_review + Tauri 分支）
- R6: 8 个 verify.* SDK handlers（TS + CJS dual-surface）
- R7: visual-review.html 4-bucket 模板（**已切到 Living 视觉契约 cycle 2 之后**）
- R8: 用户单回合（一个 HTML 路径 + 一次回复）
- R9: 渲染输出经 verify.validate-html 通过（4 桶 whitelist + forbidden phrasing 黑名单）

**关键产物**：
- mneme 侧：`src/lib/dev/` (forwarder + selectors)、`src-tauri/src/dev.rs` + `bin/dev_invoke.rs`、`scripts/gsd-dev-*.mjs`、`.dev-logs/` 标准、`docs/design/living-visual-contract.md`
- GSD upstream 侧：`~/.claude/get-shit-done/workflows/verify-work.md` 3 patches、`~/.claude/get-shit-done/templates/visual-review.html`、`@gsd-build/sdk` 8 个 verify.* handlers + CJS shim
- 开发流程标准：dogfood self-test → audit notes → followup table → upstream PR draft

**E1-E6 errata**（实施过程中发现 v3 design 假设错误，已修正）：见 `git-history:.planning/changes/archive/2026-05-14-automate-dev-feedback-loop/design.md` v3.1 errata block。

**Living 视觉契约（cycle 2 引入）**：详见 `docs/design/living-visual-contract.md`。Scope = "工具型 HTML only"（决定: option **b 双轨永久**，2026-05-14 用户拍板）。mneme 主 App UI 仍走 KD-13 / visual-design-system 横切 spec。

**Followup（不阻塞 archive，已记在各自文件）**：
- F1 SDK regex 跳 HTML 注释 → upstream PR 待发（`upstream-pr-gsd-build-followup.md`）
- HG-02 `dev_invoke dev_query_state` proper IPC bridge → 下一个合适 phase（phase 3 multi-session 或 phase 7 KG）
- IN-01 Cargo `tokio` cfg-gate → 下一个改 src-tauri/Cargo.toml 的 phase 顺手
- D-DF-02 第二轮非自指 dogfood → Phase 1 resume 时启动

**评估过的备选**：纯手动 dogfood checklist（user fatigue 2026-05-11 触发本 spec）/ playwright MCP attach 到 Tauri WKWebView（不可行，CDP vs Webkit Inspector Protocol 不兼容）

**重评触发**：Anthropic 发布 Claude Code 原生 verify 工具 / GSD upstream 接受 PR 后 mneme-side 简化为依赖

---

## 下一步路径

**阶段 2（5-7 小时，可拆 session）**：
1. 你确认 v0.3 切分 OK + 可稍后再决定 proactive-recall 归属
2. 优先抽 v1 + 当前 phase 关联：**claude-subprocess**（含预热约束）/ layout-shell / vault-storage / agentic-search / external-import（改动大，先把 REQ-03/REQ-13 改写定调）/ document-ingestion / editor
3. 后抽 v1.x（memory-engine 等 Phase 5.5）
4. 每个 spec 独立 commit

**阶段 3（1-2 小时）**：PROJECT.md 瘦身到 ~5-8KB 索引页

---

*生成于 2026-05-11 · v0.3 已纳入用户 v0.2 审阅反馈（command-palette 砍 + subprocess 预热 + 新增 interaction-paradigm 横切）。*
