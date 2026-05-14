# multi-session

> **能力域**：多 chat 会话 sidebar — 每会话一个 claude subprocess，独立 system prompt + vault scope；`--resume <session-id>` 跨 app 重启恢复。**真实学习场景多线程并行**，单会话强制 context 污染。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 3
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-12** — Multi-session sidebar

**核心动机**：真实学习有平行线（"explain matrix decomp" + "debug 我的 COMP3221 assignment" + "summarize 这节 lecture"），单会话强制 context 污染。Claude Desktop App April 2026 redesign 也围绕这个重建。

---

## 评估过的备选（What we considered）

| 候选 | 性质 | 决定 |
|------|------|------|
| **当前方案：collapsible sidebar + 每会话独立 subprocess + --resume 恢复** | 类 Claude Desktop / Cursor / VS Code multi-terminal pattern | ✅ 已采用（REQ-12） |
| **Tab 分页式** | 节省空间，单页焦点 | ❌ 否决 — 撞 layout-shell 三栏；多 task 切换不够 visible |
| **单会话 + 上下文压缩** | 复用同一 subprocess，定期 summarize | ❌ 否决 — Anthropic context cache 复用率高，多 subprocess 反而省 token；并行 task 混在一起污染 |
| **ChatGPT 式 sidebar**（每会话独立 history，但**共享单进程**） | UI 模式同，底层不同 | ❌ 否决 — 我们要的是**真正独立 vault scope + system prompt** |
| **n 个独立窗口**（每个 chat 一个 Tauri window） | 极致隔离 | ❌ 否决 — multi-window 状态管理负担大；single-user 场景过设计 |
| **不做 multi-session，每次重启** | 最简 | ❌ 否决 — 学习场景常需"上次那个还没问完的话题" |

---

## 否决理由（Why we said no）

- **Tab 分页**：违反 NotebookLM 心智模型（用户依赖三栏）
- **单会话**：context 污染 + cost 反而更高（多 subprocess 共享 prompt cache）
- **ChatGPT 共享进程**：失去每 session 独立 `--add-dir` / `--append-system-prompt` 的能力（这是 per-course-rules / vault scope 切换的基础）
- **多窗口**：跟 layout-shell single-window 容器化设计冲突

---

## 实施约束（Constraints when implementing）

### 1. Session 数据模型

每个 session 含：
- `id` UUID（claude `--resume` 用同款 id）
- `name` 自动生成（first user message 前 50 char 截断）+ 用户可改
- `created` / `last_active` 时间戳
- `course_scope` 可选 — `[COMP3221, MATH1062, *]`（影响 `--add-dir` scope）
- `system_prompt_addon` 拼接的 per-course-rules（per-course-rules spec 提供）
- `subprocess_pid` 当前活跃 PID（kill 后清空）
- `status` `active` / `idle` / `dead`

### 2. 与 claude-subprocess 的协作

- **每 session 一个独立 subprocess** — spawn 时带：
  - `--resume <session-id>`（恢复历史）
  - `--add-dir <vault-scope>`（vault-storage 提供的 scope）
  - `--append-system-prompt <per-course-rules concat>`（per-course-rules 提供）
- 会话切换 → 不 kill 已 spawn subprocess（保持热），仅 UI focus 切换
- 后台 subprocess idle > N 分钟 → 进入 sleep mode（释放 RAM 但不 kill）
- 超过 max 并发数 → LRU evict 最久 idle 的 subprocess（可恢复 via `--resume`）

### 3. 预热协作（claude-subprocess §6 延伸）

- App 启动预热 **1 个** default subprocess（最常用 session）
- 用户切换或新建 session → 现 spawn（不预热多个，资源 budget）
- 未来如多 session 切换频繁 → warm pool 触发条件评估（reaccess trigger）

### 4. UI 渲染（layout-shell 子 pane）

- collapsible **左侧 sidebar**（可改位置 — layout-shell 自定义）
- session list 项：name + course chip + last_active relative time + status dot
- 操作（鼠标，无快捷键 — interaction-paradigm）：
  - 单击 → 切换
  - 右键 → 重命名 / 删除 / duplicate
  - 拖拽 → 重排
  - 顶部"+" → 新建（弹 modal 询问 course scope）
- 视觉遵守 visual-design-system（thread）

### 5. 资源 budget（待 Phase 3 实测）

- 单 subprocess 内存占用：基线 + per-message overhead 待测
- 并发上限：默认 **5 个 active**（settings-ui 可改）
- 超过 → LRU evict + 用户提示

### 6. 跨重启恢复

- session list 持久化到 `~/.mneme/sessions.json`
- App 启动后 sidebar 显示历史 sessions（subprocess 未 spawn）
- 用户点击未恢复的 session → 触发 spawn + `--resume <id>`
- 7 天未 active 的 session → 提示用户归档 / 删除

### 7. 与其他 spec 的契约边界

- **claude-subprocess** — 每 session 一进程；预热契约延伸
- **vault-storage** — `course_scope` 配置查 vault 目录
- **agentic-search** — 每 session 独立 `--add-dir`
- **per-course-rules** — `course_scope` 决定哪些 rules 注入
- **memory-engine** — 每 session 写入触发 fact extraction → KG 更新
- **memory-engine § proactive-recall**（KP-07 承诺并入 memory-engine） — session 切换 / 新开是关键**触发时机**：进入新 session 时，AI 主动浮出上 session 的相关 context（"上次你卡在 graph 第 3 题"）
- **layout-shell** — sidebar 是 layout 容器内的一个 pane（可折叠 / 可改位置）
- **settings-ui** — 并发上限 / idle sleep 时长 / 自动清理策略 入口
- **anchored-mode** — 每 session 独立 free/anchored 状态
- **onboarding**（seed）— 首次启动时新建第一个 session（默认 course scope = `*`）

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| 并发 subprocess 内存崩（5 个 > 2GB） | 改为 hot session 1 个 + 其他 stateless serialize |
| Claude Code 出原生 multi-session（无需 `--resume` 重建） | 评估直接复用 |
| 用户实测 session 数总在 1-2 个 | 砍 sidebar，回归单会话 |
| `--resume` 协议变化 | 适配 |
| proactive-recall 验收指标连续 2 周低于 90%（KP-07） | 触发时机算法重设 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 3 — Multi-Session + Editor（command-palette 已 retired）

**关键文档**：
- PROJECT.md REQ-12
- foundation-decisions.md（无直接引用，REQ-12 是 FEATURES research 后补的 v1）
- claude-subprocess.md §6 预热约束 + §8 contract — multi-session 部分

**关联 OSS 依赖**：
- 无第三方 multi-session 库 — Svelte 5 `$state` runes 自建

**关联横切 spec**：
- **visual-design-system**（thread）— sidebar UI 遵守 KD-13
- **interaction-paradigm**（thread）— 鼠标交互，无快捷键

**关联其他 spec**：
- 见 §7 — 跟 9 个 spec 协作（multi-session 是 v1 内最"中央"的 spec 之一）

**后续 phase 关联**：
- Phase 7+ — memory-engine 接入 session 切换事件流（proactive-recall 触发时机）
- Phase 8 — per-course-rules 在 session course_scope 改变时重新拼 `--append-system-prompt`
- Phase 9 — anchored-mode 状态绑定到 session 而非全局

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 3 · 2/2 完成*
