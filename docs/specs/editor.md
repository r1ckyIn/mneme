# editor

> **能力域**：Tiptap v3 块编辑器 + slash 菜单 + markdown round-trip。**底层存储仍是 markdown 文件**（vault-storage 负责），编辑器只是 UI 层 — 可独立替换，不锁死 user 在 mneme 内。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 3
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **KD-09** — Tiptap as block editor; markdown as storage
- **REQ-06（书写侧）** — vault 是 markdown，编辑器对 markdown round-trip 无损

**核心论点**：Notion 块编辑 UX + Obsidian markdown 通用 = 两者最佳。Tiptap 是 ProseMirror-based headless 编辑器，**自己不渲染**，但是给 Svelte 用 Tiptap 是 React-eco 主流方案的最干净 fit（Vue / React / Svelte 都能 bind）。

---

## 评估过的备选（What we considered）

| 候选 | License | 主要属性 | 决定 |
|------|---------|---------|------|
| **当前方案：Tiptap v3 + `tiptap-markdown` (aguingand) + 自实现 slash menu** | MIT | Tiptap v3 stable，markdown round-trip 由 community lib 解决（官方在 Tiptap Pro 付费） | ✅ 已采用（KD-09） |
| **BlockNote** | MPL-2.0 | Notion-style 预构建（基于 Tiptap） | ❌ 否决 — React-only，Svelte 嵌入开销 > 自建 slash menu |
| **Slate.js** | MIT | 底层编辑器框架 | ❌ 否决 — 太底层，会重做 Tiptap 一半 |
| **Quill** | BSD-3 | 老牌，文档全 | ❌ 否决 — markdown 支持弱、UX 老气 |
| **Lexical (Meta)** | MIT | 新一代，性能好 | ❌ 否决 — 生态小、Notion-style 模式少 |
| **直接 textarea + markdown 预览** | n/a | 最简单 | ❌ 否决 — 违反"power-user 编辑体验"心智模型；slash menu / 表格 / 双向链接 都没有 |
| **CodeMirror 6** | MIT | 代码编辑器底子 | ❌ 否决 — 不是 prose editor，不适合长文写作 |

---

## 否决理由（Why we said no）

- **BlockNote / Slate / Lexical**：要么 React-only（Svelte 嵌入复杂）、要么生态薄。Tiptap 是 ProseMirror eco 中 headless + 框架无关 的 sweet spot。
- **textarea + 预览**：违反 Notion-style 用户预期 — slash menu 是核心 UX
- **Tiptap 官方 markdown extension**：付费（Tiptap Pro），用 aguingand `tiptap-markdown` 社区版替代

---

## 实施约束（Constraints when implementing）

### 1. 核心依赖（locked by KD-09）

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@tiptap/core` | ^3 | 核心 |
| `@tiptap/starter-kit` | v3.22.5 | bold/italic/code/headings/lists/blockquote/hr/history/paragraph/doc/text |
| `@tiptap/extension-mention` + `extension-suggestion` | latest | 双向链接 `[[wiki-link]]` + slash menu 基座 |
| `@tiptap/extension-task-list` + `task-item` | latest | assignment 待办 |
| `@tiptap/extension-link` | latest | 超链接 |
| `@tiptap/extension-image` | latest | 截图、公式截图（数学渲染另走 KaTeX） |
| `@tiptap/extension-code-block-lowlight` + `lowlight` + `highlight.js` | latest | 语法高亮 |
| `@tiptap/extension-table` 全家桶 | latest | 表格 |
| `tiptap-markdown` (aguingand) | MIT | markdown round-trip — `getMarkdown()` + `setContent(markdown)` |
| `@aarkue/tiptap-math-extension` | MIT | KaTeX 数学（**不**做 first-class block，见 §3） |

### 2. Slash 菜单（自实现）

- 基于 `@tiptap/extension-suggestion`（官方 backbone）
- Svelte 5 popup 渲染（不用 Tippy.js 等）
- ~50-80 LOC 自定义 extension（参考 Tiptap 官方 experiment 示例）
- 触发：`/` 起手
- 内容：headings / bullet list / numbered list / task / code / table / image / mention / 数学块 / horizontal rule

### 3. 数学渲染（locked decision — paint-time only）

- **不做 first-class block** — 已知 community math extension issue #2946：markdown round-trip 时 delimiter re-trigger input rules，破坏体验
- 数学**作为 raw markdown 文本存储**（`$...$` / `$$...$$`）
- 渲染时 DOM 走一遍 KaTeX `renderToString` paint-time（跟 claude-subprocess 流式渲染同一机制）
- 编辑时显示 raw markdown（无 inline preview），失焦后 paint 一次
- 用户痛点：编辑数学时不够 WYSIWYG — 接受这个 trade-off 直到 Tiptap math 生态成熟

### 4. Markdown round-trip 契约

- 写入：`editor.commands.setContent(<markdown string>)` 自动解析为 Tiptap doc
- 读出：`editor.storage.markdown.getMarkdown()` 输出 markdown 字符串
- **核心契约**：写入 vault 文件的 markdown，再读回来，doc 内容**位元一致**（无格式漂移）
- 验证：每次保存前后跑一次 round-trip diff，不一致警告

### 5. 与 vault-storage 的协作

- editor 不直接操作文件 — 通过 vault-storage 抽象层
- `_source/` 文件**只读**（应用层禁止 editor 写入）
- 写操作：`<notes/concepts/practice/shared>/<file>.md`
- frontmatter 由 vault-storage 维护（editor 不碰 YAML，只编辑 body）
- 保存策略：debounce 1.5s 自动保存（不需要 Cmd+S）

### 6. 双向链接

- `[[wiki-link]]` 跨文件引用（borrow Obsidian 语法）
- 输入 `[[` 触发 file picker（基于 `extension-suggestion`）
- 渲染时解析为可点击链接 → 跳转到目标文件
- `shared/` 概念 用 `[[shared/<concept>]]` 引用
- Broken link（目标不存在）→ 红色提示，提议"创建?"

### 7. 横切约束遵守

- **visual-design-system**（thread）— 编辑器主题继承 KD-13 美学（serif body、米背景、cubic-bezier）；像素级复刻 prototype
- **interaction-paradigm**（thread）— 鼠标优先；slash menu 是允许的 *局部* 快捷键（不是 global hotkey，是 context-specific），跟 interaction-paradigm "Cmd+Q 唯一全局热键" 不冲突

### 8. 与 claude-subprocess 的协作

- editor 写出的 markdown 会被 Claude 通过 `--add-dir` 读到（agentic-search 路径）
- Claude 可以 propose patches → editor 渲染 diff 让用户确认（v2+ 功能，v1 仅显示 Claude 输出）

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| Tiptap v4 breaking | 升级或回退到 v3 LTS |
| 出现 Svelte-native 同级编辑器（成熟） | 评估迁移成本 |
| markdown round-trip 实测漂移率 > 5% | `tiptap-markdown` 替换 / 自实现 |
| 用户实测数学编辑体验不可接受 | 重评 first-class math block（等 Tiptap math 生态成熟）|
| Notion 推出 markdown export 兼容标准 | 跟进 |
| `[[wiki-link]]` 渲染性能在大 vault 崩 | 引入 link index cache |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 3 — Multi-Session + Command Palette + Editor（注：command-palette 已 retired，本 phase 实施只剩 editor + multi-session）

**关键文档**：
- PROJECT.md KD-09 — Tiptap + markdown 决策
- STACK.md §6 — Tiptap 完整 extension 清单

**关联 OSS 依赖**：
- `docs/dependencies.md` Group 2（editor）

**关联横切 spec**：
- **visual-design-system**（thread）— 编辑器视觉
- **interaction-paradigm**（thread）— slash menu 是 context-specific 允许例外

**关联其他 spec**：
- **vault-storage** — 文件读写抽象（editor 不直接动 fs）
- **claude-subprocess** — Claude propose patches 落 editor 渲染（v2+）
- **agentic-search** — editor 写出的内容会被 agentic 搜到
- **per-course-rules** — 编辑 `.mneme/rules/*.md` 也走 editor
- **memory-engine** — 写入触发 fact extraction（streaming-into-mindmap 是 v2+）

**后续 phase 关联**：
- Phase 7+ — memory-engine 接 editor 写入事件流
- Phase 8 — per-course-rules 用 editor 写 rules
- Phase 10 — fsrs-review 不走 editor（focus mode 独立 UI）

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 3 · 1/2*
