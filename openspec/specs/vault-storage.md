# vault-storage

> **能力域**：本地 markdown + YAML frontmatter vault，PARA + course-root 结构。**所有用户数据的物理归宿** — 离线、可 grep、AI 友好、可被其他工具读懂（Obsidian / Cursor / git）。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 2
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-06** — Markdown vault (PARA + course-root structure)
- **KP-01** — Local-first（所有数据本地，offline-functional）
- **KP-03**（数据层） — AI-native data model（frontmatter 的 embeddings / 时间戳 / provenance / confidence 是 first-class）

**核心：纯 markdown + YAML frontmatter。无专有二进制格式。**

---

## 评估过的备选（What we considered）

| 候选 | 性质 | 决定 |
|------|------|------|
| **当前方案：markdown + YAML frontmatter, PARA + course-root** | `_system/` `_inbox/` `courses/<CODE>/` `shared/` 顶层；每课程 `_source/` `notes/` `concepts/` `practice/` `INDEX.md` | ✅ 已采用（REQ-06 locked） |
| **Obsidian vault 当目标格式** | 全套 Obsidian 兼容（含 `.obsidian/` 配置） | 📝 部分采纳 — `[[wiki-link]]` 跨课程概念引用借用，但**不绑 Obsidian 配置**（vault 用户也可 cd 进 Cursor 编辑） |
| **SQLite 单文件** | 性能高、ACID、查询强 | ❌ 否决 — 违反 KP-01 markdown 透明度、不可 grep、AI 不友好（要 SQL） |
| **自定义 JSON 格式** | 灵活可演化 | ❌ 否决 — 违反 markdown 通用性、Obsidian / Cursor 无法读 |
| **Notion / 数据库式存储** | 块编辑器原生 | ❌ 否决 — 锁定厂商、违反 KP-01 |
| **Roam Research 大纲式** | 双向链接更结构化 | ❌ 否决 — 不是 markdown 标准，AI 不友好 |
| **git submodule per course** | 每课程独立版本控制 | ❌ 否决 — 过度复杂，single-user 用不到 |

---

## 否决理由（Why we said no）

- **SQLite / 自定义格式**：违反 KP-01 markdown 透明度。设计原则是 "vault 必须可被任何 markdown 工具打开" — 防止 mneme 退役后用户数据被困
- **完整 Obsidian 绑定**：耦合度过高，未来切其他 markdown 编辑器（Cursor / VS Code）会绊脚；只借语法不绑配置
- **多 vault 嵌套**：single-user 场景过设计
- **git per course**：commit 噪音 + 学习成本高 + 跟 vault 整体备份冲突

---

## 实施约束（Constraints when implementing）

### 1. 目录结构（locked by REQ-06）

```
~/StudyVault/                       ← 默认 vault root（settings-ui 可改）
├── _system/                        ← 隐藏，AI 工具读写区
│   ├── memory/                     ← memory-engine 三层 memory 导出（OBSIDIAN_AUTO_EXPORT 等价位置）
│   └── fsrs/                       ← fsrs-review 历史 jsonl
├── _inbox/                         ← Claude 生成草稿待整理
├── courses/
│   └── <COURSE_CODE>/              ← 例如 COMP3221 / MATH1062
│       ├── _source/                ← ⚠ 只读 mirror — external-import 唯一 writer
│       │   ├── lectures/
│       │   ├── tutorials/
│       │   ├── assignments/
│       │   └── announcements.md
│       ├── notes/                  ← 用户/AI 写作区
│       ├── concepts/               ← 一文件一概念（fsrs-review 单元）
│       ├── practice/               ← 习题 / 模拟题
│       ├── whiteboards/            ← whiteboard spec 持久化（如启用）
│       ├── .mneme/                 ← per-course-rules 配置
│       │   └── rules/
│       └── INDEX.md                ← 自动维护的课程总览
└── shared/                         ← 跨课程概念
```

### 2. 文件格式契约

- **每个 .md 文件必须 YAML frontmatter**（即使为空 `--- ---`）
- frontmatter 标准字段（视文件类型扩展）：
  ```yaml
  ---
  type: note | concept | practice | source-mirror
  created: 2026-05-14T...
  updated: 2026-05-14T...
  course: COMP3221
  tags: [bfs, graph]
  fsrs:           # 仅 concept 类型有
    difficulty: 5.4
    stability: 12.3
    state: 2
    reps: 5
    lapses: 1
    due: 2026-05-20T10:00:00Z
    last_review: 2026-05-08T10:00:00Z
  ---
  ```
- 内联数学：`$...$` / `$$...$$` KaTeX 兼容
- 代码块：标准 markdown fence + 语言标识

### 3. `_source/` 写保护（locked）

- **唯一 writer**：external-import（手动导入 / UniBoard 桥）+ document-ingestion（PDF/Office → md 转换）
- 用户 / Claude 在 chat / editor 中**不能**写 `_source/`（应用层拦截 + 文件系统层 readonly attr）
- 违反 → Pitfall 20 触发（vault corruption via concurrent writes）

### 4. 跨课程概念

- `shared/<concept-slug>.md` 存放跨课程概念
- 课程内文件用 `[[shared/<concept>]]` 或 `[[../shared/<concept>]]` 引用
- 概念被多课程引用时自动 promote 到 `shared/`（auto-promote 策略 deferred — v2+）
- v1：用户手动 mv 到 `shared/`，Claude 维护引用

### 5. INDEX.md 自动维护

- 每课程 INDEX.md 由 Claude / 后台 cron 维护，**用户不直接编辑**
- 内容：周进度、最近活动、待复习 concepts、未读 announcements、错题集
- 用户标记冲突 → 应用层 merge 提示

### 6. 默认 vault path

- 首次启动默认 `~/StudyVault/`（onboarding seed 配置）
- 用户可改（settings-ui Vault category）
- 移动 vault → 全 vault re-index（应用层任务，settings-ui 触发）

### 7. 与其他 spec 的契约边界

- **agentic-search** — vault root 是 `--add-dir` 唯一授权 scope
- **external-import** — 唯一 writer of `_source/`（连同 document-ingestion 协作）
- **document-ingestion** — 把 import 来的 PDF/Office 输出落 `_source/<原名>.md`
- **editor** — 编辑 `notes/` / `concepts/` / `practice/` / `shared/` 文件（不碰 `_source/`）
- **memory-engine** — `_system/memory/` 子目录是 KG 三层 memory 的导出归宿
- **fsrs-review** — `_system/fsrs/history.jsonl` 是 review 历史；frontmatter `fsrs:` 字段是单概念 schedule state
- **per-course-rules** — 读 `courses/<COURSE>/.mneme/rules/`
- **multi-session** — 每 session 可独立设 vault subset scope（默认 vault 全集）
- **whiteboard**（seed）— scenes 落 `courses/<COURSE>/whiteboards/<topic>.excalidraw.json`

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| 用户决定迁移到非 markdown 编辑器 | KP-01 markdown 透明度原则重评 |
| vault 规模 > 10K 文件 + grep 性能崩 | 引入 ripgrep + indexed search（不动 markdown 格式） |
| 多用户 / 协作需求出现 | 加 sync 层（违反 OOS-01，需要重新讨论） |
| Obsidian 推出 mneme-friendly plugin 生态 | 评估是否更紧密绑定 |
| `_source/` 写保护拦不住边界条件（如 git pull 改文件） | 加 file-watch + auto-revert + sync controller 仲裁 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 2 — Vault + Canvas/Ed Sync + Onboarding（注：Canvas/Ed 部分已被 external-import 重写为"走自成生态"）

**关键文档**：
- PROJECT.md REQ-06 + KP-01 + KP-03
- PROJECT.md OOS-06（不做手画 mind-map — auto-generated from KG，KG 数据流回 vault `_system/memory/`）
- foundation-decisions.md §5 — AI-native 双层数据架构

**关联 OSS 依赖**：
- 无第三方 vault 库 — 纯 fs 操作 + js-yaml 或等价 frontmatter 解析

**关联横切 spec**：
- 无直接关联（这是数据存储契约，无 UI）

**关联其他 spec**：
- 见 §7 契约边界（与 8 个 spec 协作）

**后续 phase 关联**：
- Phase 2 — onboarding 选 vault path + 创建初始目录结构
- Phase 4 — document-ingestion 落 `_source/`
- Phase 7 — memory-engine 写 `_system/memory/`
- Phase 8 — per-course-rules 读 `.mneme/rules/`
- Phase 10 — fsrs-review 读概念 frontmatter + 写 `_system/fsrs/`

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 2 · 1/2*
