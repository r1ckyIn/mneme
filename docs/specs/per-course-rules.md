# per-course-rules

> **能力域**：每门课的 `.mneme/rules/<rule>.md`（YAML frontmatter + markdown body）→ 开聊时 enabled 规则 concat 到 `--append-system-prompt`。**差异化小投入大回报** — 无学习应用做这事。

---

## 现状（What it is now）

**阶段**：v1.x
**Phase**：Phase 8
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-17** — Per-course system prompts via `.mneme/rules/`

**核心论点**：Cursor `.cursor/rules` 模式 + Claude Code `~/.claude/CLAUDE.md` 模式启发。Costs 极低（一个 prompt 拼接），回报大（Claude 知道每门课的 persona 不用每次重述）。

---

## 评估过的备选（What we considered）

| 候选 | 主要属性 | 决定 |
|------|---------|------|
| **当前方案：`courses/<COURSE>/.mneme/rules/<rule>.md` + YAML frontmatter + `--append-system-prompt` 拼接** | per-course context、可启用 / 禁用、可优先级排序 | ✅ 已采用（REQ-17） |
| **全局 `~/.claude/CLAUDE.md`** | 一份配置走天下 | ❌ 否决 — 不分课粒度太粗（MATH 跟 COMP 写代码风格不同）|
| **启动时手动 `--system-prompt`** | 每次聊天前手动指定 | ❌ 否决 — 不可持久化、用户体验差 |
| **Cursor `.cursor/rules` MDC 原版** | 被参考的设计 | 📝 借鉴语法（YAML + markdown） |
| **Claude Code 原生 per-project rules** | 如果 Anthropic 出 | ❌ 当前不存在 — 未来如出现，评估迁移 |
| **session 级 rules**（每 session 独立） | 比 per-course 更细 | ❌ 否决 — 用户实际场景一门课一个 persona 够用 |

---

## 否决理由（Why we said no）

- **全局 CLAUDE.md**：颗粒度太粗
- **每次手动**：违反 controller 模式下"配置一次即生效"
- **session 级**：过度灵活，user 实际不需要

---

## 实施约束（Constraints when implementing）

### 1. 文件结构（locked by REQ-17）

```
~/StudyVault/courses/<COURSE_CODE>/.mneme/rules/
├── proof-style.md       # 例：MATH1062 数学证明风格
├── code-style.md        # 例：COMP3221 Java 代码风格
└── lecture-summary.md   # 例：所有课通用的 lecture 总结模板
```

每个 rule 文件：
```yaml
---
enabled: true            # 默认 true
priority: 10             # 高优先级先拼（数字越小越前）
applies_to: [assignment, notes, review]   # 哪些 context 触发
description: 简短描述（settings-ui 显示用）
created: 2026-05-14T...
---

# Rule body
Prefer formal proofs with explicit lemmas; show counterexamples when
stating necessity vs sufficiency.
```

### 2. 拼接逻辑

- 进入 chat session 时（multi-session 协作）：
  1. 读 session 的 `course_scope`（如 `[COMP3221]` 或 `[*]` 全集）
  2. 扫该课程（或多课程）的 `.mneme/rules/`
  3. 过滤 `enabled: true`
  4. 按 `priority` 升序 + `applies_to` 匹配当前 context
  5. concat body（用 `\n\n---\n\n` 分隔）
  6. 传给 claude subprocess `--append-system-prompt "<concat>"`

### 3. context 标识

- `applies_to` 支持的 context tag：
  - `assignment` — 用户开 chat 时打开 assignment 文件
  - `notes` — 编辑 notes
  - `review` — fsrs-review 模式
  - `concept` — 在 concept 页 chat
  - `*` — 全部

context 由前端推断（active file / 当前 view）传给 multi-session spec，session 用这个决定拼哪些 rules。

### 4. UI 入口（与 settings-ui 协作）

- settings-ui Advanced category 加 "Per-Course Rules" subpanel
- 可查看 / 启用 / 禁用 / 改优先级 / 编辑 rule（走 editor）
- 不在 settings 改 rule body 时，用 editor 打开 `.mneme/rules/<rule>.md`

### 5. debug 入口（与未来 dev mode 协作）

- chat 输入特殊命令 `/rules` → AI 显示当前 session 拼接的 rules（顺序 + 内容）
- 帮 user 调"哪条 rule 实际起作用"
- 不是全局快捷键，是 chat 输入内的 slash 命令（不撞 interaction-paradigm）

### 6. proactive-recall 注入策略（memory-engine § Proactive Recall 协作）

per-course-rules 是 proactive-recall 的**注入策略层**：

```yaml
---
enabled: true
priority: 20
applies_to: [*]
recall_trigger: session_start | new_topic | error_correction
recall_query: |
  Pull from KG the user's recent recurring mistakes in graph algorithms
  and surface ≥1 if relevant.
---
```

- `recall_trigger` 字段定义"什么时候激活召回"
- `recall_query` 是 prompt 模板给 memory-engine
- multi-session spec 检测 trigger 事件 → memory-engine 跑 query → 结果回流到 chat（作为 AI 主动浮出的内容）

### 7. precedence 仲裁

- per-course rule 跟 user `~/.claude/CLAUDE.md` 冲突时：**per-course rule 赢**（更具体）
- per-course rule 跟 mneme 内置规则（如"不要泄露 secret"）冲突：**内置 win**（安全 fall-through）
- 内置规则清单：privacy filter / cost cap warning / 不写 `_source/`

### 8. 与其他 spec 的契约

- **vault-storage** — 文件读路径
- **claude-subprocess** — `--append-system-prompt` 注入入口
- **multi-session** — session 切换时重新拼接
- **memory-engine § Proactive Recall** — `recall_trigger` + `recall_query` 协作
- **editor** — 编辑 rule body
- **settings-ui** — UI 管理入口

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| Anthropic 改 `--append-system-prompt` 行为 | 替换 API 调用方式 |
| Claude Code 出原生 per-project rules | 评估迁移（保留 mneme-extension 字段如 `recall_trigger`） |
| 用户实测多 rule 冲突无法 debug | 加 debug overlay（已 covered §5） |
| rule body 总和过 100K tokens 超 system prompt budget | 加 chunking / 摘要策略 |
| precedence 仲裁实际冲突频发 | 重设规则优先级语义 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 8 — Mind-Map View + Per-Course Rules

**关键文档**：
- PROJECT.md REQ-17

**关联 OSS 依赖**：
- 无（纯 fs + frontmatter 解析）

**关联横切 spec**：
- **visual-design-system**（thread）— settings-ui rule manager 视觉
- **interaction-paradigm**（thread）— UI 鼠标交互

**关联其他 spec**：
- 见 §8

**后续 phase 关联**：
- Phase 7 完成后才完整（依赖 memory-engine 跑 recall_query）
- Phase 8 内完成 rule manager UI + 拼接逻辑

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 6 · 2/3*
