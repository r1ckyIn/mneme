# mindmap-viz

> **能力域**：课程结构默认视图 — Cytoscape.js mind-map，**从 memory-engine 的 KG 派生**。强结构化视图（区别于 whiteboard 的自由画布）。

---

## 现状（What it is now）

**阶段**：v1.x
**Phase**：Phase 8
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **KD-08**（mind-map 部分）— Cytoscape.js (default) + Excalidraw (whiteboard, toggle); knowledge-graph (always-on, AI-side)
- **REQ-07**（视觉侧）— Dual-layer data: KG + mind-map / whiteboard

**核心论点**：mind-map 是 AI **给人看** 的 KG。和 whiteboard（用户自由画）完全不同用例 — 因此 mind-map 和 whiteboard 拆成两个 spec（user 2026-05-11 决定）。

---

## 评估过的备选（What we considered）

| 候选 | License | 主要属性 | 决定 |
|------|---------|---------|------|
| **当前方案：Cytoscape.js v3.33.3 + dagre/cose-bilkent extensions** | MIT | 算法库最全 · 500k weekly downloads · 250KB gzipped | ✅ 已采用（KD-08） |
| **vis-network** | MIT / Apache-2.0 | 物理 simulation 强、学习曲线低 | ❌ 否决 — 算法库小、styling 不够灵活 |
| **Sigma.js + graphology** | MIT | 100K+ 节点性能强 | ❌ 否决 — 单 semester ~1K 节点，过度优化 |
| **D3-graphviz** | BSD-3 | 静态 SVG | ❌ 否决 — 不交互，不适合 live mind-map |
| **React Flow / Reaflow** | MIT | 漂亮，diagram editor | ❌ 否决 — React-only · diagram editor 不是 KG viz |
| **手画 mind-map** | n/a | 用户自己画 | ⛔ OOS-06 排除（auto-generated from KG，否则创建 parallel source-of-truth）|

---

## 否决理由（Why we said no）

- **vis-network / Sigma**：算法库小，做不到 fsrs-review 需要的"graph weakness × FSRS due-ness"加权
- **D3-graphviz**：静态，不能 live streaming-into-mindmap（REQ-07 流式入图）
- **React-only 库**：mneme 是 Svelte，集成成本 > 自己用 Cytoscape
- **手画 mind-map**：OOS-06 明确排除 — 双源真相反模式

---

## 实施约束（Constraints when implementing）

### 1. 数据源（与 memory-engine 协作）

- **从 memory-engine 的 KG 派生** — 不另起一份数据
- memory-engine 导出 `nodes: [], edges: []` JSON（Cytoscape format）
- 触发更新：
  - chat session 新 fact extraction → KG 更新 → mind-map 增量 `cy.add()`
  - 用户切课程 → 重 load 该课程子图
  - 时间漂移（temporal KG）→ 后台 cron 更新

### 2. 布局（locked by KD-08）

- 默认：`dagre` extension（课程 DAG 结构 — prerequisite → 当前 → 衍生）
- 自由聚类：`cose-bilkent`（无明确顺序的概念簇）
- 用户切换布局：右键菜单选项（mouse-only）

### 3. 实时流入 UX（REQ-07）

- 新 concept node → `cy.add()` + 增量布局（**不全量 re-layout**）
- 用 Cytoscape native `.animate()` API 让新节点 fade in / move-in
- 流入速率：debounce 500ms（避免 chat 流式时 mind-map 闪烁）

### 4. 容器位置（与 layout-shell 协作）

- 默认在 layout-shell **底部行**（Phase 1 D-01 mind-map placeholder 落地点）
- 高度：~200px，可拖动调整
- 折叠：用户可砍掉 mind-map 显示（settings-ui Appearance toggle）
- 上下文敏感：当前 active session 的 course_scope → 显示该课程子图

### 5. 交互（interaction-paradigm 遵守）

- 鼠标 only：
  - 单击 node → 跳到 vault `concepts/<node>.md`
  - 右键 node → "查相关 chat 记录" / "标记不会" / "拖动"
  - 滚动 → zoom in/out
  - 拖动空白 → pan
- 不绑全局快捷键（Cmd+Q 唯一例外不影响这里）

### 6. 视觉（visual-design-system 遵守）

- 节点：圆角矩形 · serif 字体 · 8% 软边 · 米色背景对比
- edges：1px · 浅灰 · 不同 type 不同 dash pattern
- confidence 低的 node → 半透明（视觉提示用户）
- 当前 chat 关联 node → 橙色高亮（`#d97757`）
- 像素级复刻 prototype（Claude Design Lab 出图 — 见 visual-design-system thread）

### 7. 性能 budget

- 单课程 KG ~1K 节点 ≤ 60fps 平移 / zoom
- 全 4 课程合集（如用户切到 "all courses" 视图）~4K 节点 ≤ 30fps
- 超过 → 自动启用 "summary view"（聚合 cluster）

### 8. 与其他 spec 的契约

- **memory-engine** — KG 数据源；KG 更新事件订阅
- **layout-shell** — 底部 pane 容器
- **multi-session** — 当前 session 的 course_scope 决定显示哪个子图
- **fsrs-review** — KG weakness 加权（review queue 排序用）
- **per-course-rules** — 不直接交互
- **vault-storage** — 单击 node 跳转到 `concepts/<node>.md`
- **whiteboard**（seed） — 独立 spec，不共享布局（user 决定拆开）

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| Cytoscape v4 breaking | 升级 / 锁 v3 LTS |
| 单课程节点 > 1K 性能崩 | summary view 实施 / 引入 webgl renderer |
| 用户实测 mind-map 看了 < 5%（没用） | 砍 / 默认折叠 |
| memory-engine 选 Cognee 后 GraphRAG 输出 schema 跟 Cytoscape JSON 差太多 | 加 adapter 层 |
| Anthropic 出 native KG viz | 评估替代 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 8 — Mind-Map View + Per-Course Rules

**关键文档**：
- PROJECT.md KD-08 + REQ-07
- STACK.md §3 Mind-map / Graph Visualization

**关联 OSS 依赖**：
- `.planning/dependencies.md` Group 1 — Cytoscape.js + extensions

**关联横切 spec**：
- **visual-design-system**（thread）
- **interaction-paradigm**（thread）

**关联其他 spec**：
- 见 §8

**后续 phase 关联**：
- Phase 7 完成后才能跑（依赖 memory-engine 实施）
- Phase 8 同 phase 内完成

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 6 · 1/3*
