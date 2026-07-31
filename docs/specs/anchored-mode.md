# anchored-mode

> **能力域**：聊天面板 free ↔ anchored 切换。Anchored 模式把用户勾选的 vault 文件作为 documents 传给 Anthropic Citations API，回答每句都附 `[file.md:42]` 可点击引用。**NotebookLM 核心 USP + free 模式覆盖**。

---

## 现状（What it is now）

**阶段**：v1.x
**Phase**：Phase 9（后端实施）· Phase 1（前端切换 UI **已实装**）
**实现状态**：**partial — UI ready** — Phase 1 chat panel 切换按钮已实装（↘ / 📋 一对图标）；Phase 9 实施 Citations API 后端 + sources panel + 引用点击跳转

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-08** — Anchored mode (sources panel + answers cite back to file:line)
- **KD-05** — Citations API for anchored mode

**核心论点**：朋友的洞察"学习用 Claude（free 教师模式）/ 复习用 NotebookLM（anchored textbook 模式）"映射成同 UI、一键切换。两个 competitor 都没做的组合。

---

## 评估过的备选（What we considered）

| 候选 | 主要属性 | 决定 |
|------|---------|------|
| **当前方案：Citations API + free/anchored 切换** | Anthropic 官方（2026.01 release）· documents 输入 · 结构化 spans 输出 | ✅ 已采用（KD-05） |
| **自建 RAG + vector embedding** | 完全自控 | ⛔ 违反 KD-07（agentic search 默认）+ KP-06（reject reinvented wheels）|
| **完全只做 anchored 不做 free** | 简化 | ❌ 否决 — 用户场景需要 free 教师模式（"想问没看过的东西"）|
| **完全只做 free 不做 anchored** | 简化 | ❌ 否决 — 失去 NotebookLM USP + 学习场景 source-of-truth 校对 |
| **第三方 RAG 框架（LlamaIndex）** | 现成 | ❌ 否决 — 锁定生态 + 跟 Anthropic Citations 重复 |
| **用 anchored 模式当全局默认**（无 free） | 一种 NotebookLM-only | ❌ 否决 — 学习场景需要 free 探索 |

---

## 否决理由（Why we said no）

- **自建 RAG**：违反 KD-07 + KP-06
- **只 anchored**：失去探索性学习
- **只 free**：失去 source-grounded 校对

---

## 实施约束（Constraints when implementing）

### 1. UI 切换（Phase 1 已实装）

- 聊天面板顶部 toggle：free ⇄ anchored 一对图标按钮
- 切换状态绑定到当前 session（multi-session 协作） — 不是全局
- 视觉遵守 visual-design-system（KD-13 美学 + Mneme.html prototype 复刻）

### 2. Free 模式行为

- 标准 claude subprocess + agentic search（默认行为）
- 可用 tools：grep/glob/cat 全 vault scope
- 注：free 模式 source 展示 + 三源冲突场景化是 todo `2026-05-07-spec-claude-free-mode-...`，进 Phase 9 plan 时细化
- 三源（内置知识 / 网搜最新 / vault 勾选文献）冲突时显式展示 + 给场景建议

### 3. Anchored 模式行为

- 用户先在 sources panel **勾选** vault 文件（multi-select checkbox）
- chat 发送时：
  1. 拼装 Citations API request — 文件作为 `documents`
  2. 走 Anthropic API（不走 claude CLI subprocess，独立通路 — **重要**：anchored 不依赖 claude-subprocess spec）
  3. 收到结构化 spans → 渲染答案 + 每句末尾 `[file.md:42]` 链接
- 链接点击 → vault 文件打开到该行（editor 协作）
- session 范围：anchored 状态绑 session，不污染其他 session

### 4. Sources panel UI

- 默认折叠在 chat panel 左侧（或上方，根据 layout-shell 配置）
- 显示已勾选文件列表 + 文件大小 + 总 token 估算
- 警告：超过 200K tokens 时提示"成本将上升"（与 settings-ui cost cap 协作）
- 鼠标交互（interaction-paradigm 遵守）

### 5. Cost 控制（与 claude-subprocess §7 协作）

- Citations API 比标准 chat 贵（per-document 是 cache_creation 费率）
- 单次 anchored query 估算 token usage 显示给 user
- 超 settings-ui 设的 cost cap → 触发 kill switch（subprocess kill 等价 — 但这里是 API request abort）

### 6. 与 claude-subprocess 的差异（重要）

- **anchored 模式不通过 claude-subprocess** — 直接走 Anthropic Citations API
- 用户 API key（不是 OAuth subscription token） — 这是 KD-05 路径独立于 KP-04 套壳合规
- 用户在 settings-ui 配置 API key（Privacy / Claude category）
- 如果用户无 API key → anchored 模式 disabled + 提示配置

### 7. 与 memory-engine 协作（v2+ 增强）

- v1 anchored 是纯文件 → Citations API（无 KG 参与）
- v2+ 可让 memory-engine 推荐 "你可能想 anchor 哪些 file"（基于 KG / 历史 / current chat topic）

### 8. 横切约束遵守

- **visual-design-system**（thread）— sources panel + citation hover preview + 切换按钮遵守 KD-13
- **interaction-paradigm**（thread）— 鼠标交互；点击 citation 跳转 vault 文件（不绑快捷键）

### 9. 与其他 spec 的契约

- **claude-subprocess** — **不依赖**（独立 API 通路）；free 模式走 subprocess，anchored 不走
- **multi-session** — 切换状态 per-session
- **vault-storage** — anchored sources 必须是 vault 文件
- **editor** — 点击 citation 跳转到行
- **settings-ui** — API key 配置 + cost cap
- **layout-shell** — sources panel pane 配置
- **memory-engine**（v2+） — source 推荐

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| Citations API 改版（spans 格式 / 计费） | 适配 |
| anchored 成本实测超预算 | chunking 策略 / 默认 anchor 文件数上限 |
| 用户实测 free 模式更高频，anchored 沦为冷功能 | UI 重设（如默认 free / 砍 sources panel）|
| Anthropic 出更便宜的 anchored 替代 API | 评估替代 |
| 朋友"学习用 Claude / 复习用 NotebookLM" 洞察不再成立 | 重评 free/anchored 双模式必要性 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 9 — Anchored Mode + Citations API（后端实施）
- Phase 1 — 前端切换 UI 已实装

**关键文档**：
- PROJECT.md REQ-08 + KD-05
- `docs/reference/seeds/2026-05-07-spec-claude-free-mode-source-display-and-conflict-resolution-req-08.md` — free 模式 source 展示 + 三源冲突场景化（进 Phase 9 plan 时细化）

**关联 OSS 依赖**：
- Anthropic SDK（如有 npm 包） — `docs/dependencies.md` 待填入

**关联横切 spec**：
- **visual-design-system**（thread）— Phase 1 已按 Mneme.html prototype 落地
- **interaction-paradigm**（thread）

**关联其他 spec**：
- 见 §9

**后续 phase 关联**：
- Phase 9 完成后端 + sources panel 实施
- Phase 7+ memory-engine — v2+ source 推荐

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 6 · 3/3 完成*
