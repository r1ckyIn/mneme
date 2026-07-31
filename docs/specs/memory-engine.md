# memory-engine

> **能力域**：三层记忆架构（working / episodic / long-term）+ 知识图谱（concept nodes + typed edges + confidence + provenance + 时间戳）+ **主动召回（KP-07）数据支撑**。**v1.x 最复杂能力** — 也是 mneme "懂我"差异化的核心。**库未锁定** — Phase 5.5 RQ-01 4-project 调研未完成。

---

## 现状（What it is now）

**阶段**：v1.x（post-MVP，差异化层）
**Phase**：Phase 5.5（RQ-01 调研）→ Phase 7（实施）
**实现状态**：**BLOCKED · RQ-01** — Phase 5.5 必须先产出 4-project 对比 + 1 周 dogfood + decision report

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-07** — Dual-layer data architecture (KG + mind-map / whiteboard)
- **KD-10** — Three-tier memory architecture，**library choice DEFERRED**
- **KP-03** — AI-native data model（embeddings + 图 + confidence + provenance + 时间戳 first-class）
- **KP-07** — Proactive contextual recall（数据支撑由 memory-engine 提供，**承诺并入本 spec** — 见 §**Proactive Recall**）
- **RQ-01** — Memory project survey（BLOCKING gate）

---

## 评估中的库候选（RQ-01 待决）

⚠ **库未锁定**。Phase 5.5 dogfood 4 选 1：

| 候选 | License | 强项 | 弱项 |
|------|---------|------|------|
| **Cognee** (`topoteretes/cognee`) | Apache-2.0 | 17.1k stars · GraphRAG schema 强 · ontology grounding · 多文档 | **Python 3.10-3.14 runtime**（需 ship Python alongside Tauri，或 CLI subprocess）|
| **Zep + Graphiti** (`getzep/zep`) | Apache-2.0 | 最佳 temporal KG（bitemporal validity windows） | **Community edition 已 deprecated**，重心移向 Zep Cloud（违反 KP-01）|
| **Mem0** (`mem0ai/mem0`) | Apache-2.0 | 54.9k stars · 成熟 · 三层 memory 框架 | **Vector-first**（弱 graph）+ self-host 需 Docker（重） |
| **agentmemory** (`rohitg00/agentmemory`) | Apache-2.0 | 架构对（KP-03 三层 memory 同款） + SQLite 单文件（轻）+ OBSIDIAN_AUTO_EXPORT | **无公开 benchmark** · niche fork · 2.2k stars |

**fallback**：自建（基于 sqlite-vec + 自实现 KG schema），违反 KP-06 reject reinvented wheels — 仅在 4 个候选全部 dogfood 失败时考虑

---

## 评估过的备选（What we considered — 已否决）

| 候选 | 决定 |
|------|------|
| **Letta**（agent 长期 memory） | ❌ 否决 — multi-day agent 用例不匹配 student concept memory |
| **SimpleMem** | ❌ 否决 — 太轻量，缺三层 memory 纪律 |
| **Pinecone / Weaviate / Qdrant** | ⛔ 云 vector DB，违反 KP-01 |
| **LlamaIndex / LangChain memory** | ❌ 否决 — 过度框架化 + 锁定生态 |
| **Karpathy LLM Wiki 自实现** | ❌ 否决 — 违反 KP-06 |

---

## 实施约束（待 RQ-01 决定后细化）

### 1. 三层 memory 架构（locked by KD-10）

- **Working**：最近 N 条 raw 消息（in-context）
- **Episodic**：session 级 summary（per-session 压缩）
- **Long-term**：跨 session consolidated facts（高 confidence；deduped；含 timestamps）

数据流：每 user/assistant 消息 →
1. SHA-256 dedup
2. privacy filter（剔除 secrets / 隐私）
3. LLM compress（episodic 级摘要）
4. embed
5. indexed（BM25 + vector + graph）
6. tier 升降（episodic → long-term 当 confidence 达到阈值）

### 2. KG schema（locked by KP-03）

concept nodes 必须有：
- `id`（stable UUID）
- `name`（human label）
- `embedding`（vector，模型由 RQ-01 决定）
- `confidence`（0-1）
- `provenance`（出处 — 哪条 chat / 哪个 file / 哪节 lecture）
- `timestamps`（created / updated / last_seen / valid_from / valid_to — bitemporal 如 Graphiti）
- `course_scope`（COMP3221 / MATH1062 / shared）

edges 必须有：
- `type`（typed — prerequisite / related / contradicts / etc.）
- `confidence`
- `provenance`
- `valid_from / valid_to`（temporal）

### 3. 数据落点（与 vault-storage 协作）

- **导出**到 `vault/_system/memory/<course>/<facts>.md`（OBSIDIAN_AUTO_EXPORT 等价路径）
- 内部数据库：SQLite（如选 agentmemory）/ 库特定（Cognee / Zep）— 在 `~/Library/Application Support/Mneme/memory/`
- 用户可访问导出的 markdown（grep / 备份）
- 内部 db 是 cache，可重建 from 导出 markdown

### 4. 与 claude-subprocess 协作

- subprocess 输出（stream-json `result` 事件）→ pipe 给 memory pipeline
- pipeline 写入：异步、不阻塞 chat UI
- 读取（context injection）：每 session 启动时注入 long-term facts 到 system prompt（per-course-rules 协作）

### 5. 与其他 spec 的契约

- **claude-subprocess** — `result` 流喂 memory pipeline；session 启动注入 context
- **multi-session** — 每 session 独立 episodic；切换时触发 long-term 召回（见 §Proactive Recall）
- **vault-storage** — `_system/memory/` 导出归宿；`_source/` 输入（document-ingestion 后被 memory engine 索引）
- **agentic-search** — KG 不替代 agentic search；KG 提供"概念间关联推理"窄场景补充
- **mindmap-viz** — KG 派生 mind-map 节点 + edges（Cytoscape 可视化）
- **per-course-rules** — KG facts 注入到 `--append-system-prompt`（per-course context）
- **fsrs-review** — 概念页 review 时拉 KG 出题；review 结果回流 KG（更新 confidence）
- **anchored-mode** — KG 提供 "free 模式" 的 source 推荐
- **editor** — 写入 vault 触发 fact extraction（streaming-into-mindmap 是 v2+）

---

## § Proactive Recall（KP-07 承诺并入本 spec）

> 用户 2026-05-14 决定：proactive-recall 不独立成 spec，**作为 memory-engine 的一节**。

### 承诺定义

AI 不只是"你问→它答"。在每 chat session 开始 + 对话拐点（new topic / "I'm stuck" / error correction）AI **主动浮出**相关历史：
- 上次 session 在这话题上的进展 / 卡点
- 跨周知识关联（这周内容 → 前置周知识）
- 用户的 recurring 误解 / 错题模式

### 验收指标

一周对话样本中：
- AI 主动浮出 **≥ 3 次/session**
- 相关度 **≥ 90%**（held-out test 判定）

### 实现机制（横切多 spec）

| 层 | spec | 责任 |
|---|------|------|
| **数据可用性** | memory-engine（本 spec） | KG 必须有足够 facts 可被召回；三层 memory 必须能查询"上次卡点"等模糊语义 |
| **触发时机** | multi-session | session 开始 / 切换 / 用户输入"卡住了" / 错误纠正 等事件触发 |
| **注入策略** | per-course-rules | 哪条 rule 在什么 context 下激活召回逻辑（如 COMP3221 rule："主动召回历史 graph 错题"）|

### 算法路径（待 RQ-01 + Phase 7 plan 细化）

候选：
- **embedding 相似度** + temporal weight（最近的 prior context 优先）
- **KG 图遍历**（沿 prerequisite edges 找上游知识）
- **LLM-as-judge**（用 small model 判断哪条 fact 跟当前 user input 相关）

### 失败 fallback

- 验收连续 2 周低于 90% → 算法重设（不砍 proactive-recall，调整阈值 / 触发时机 / 算法）
- 用户明确表达"AI 太啰嗦"→ settings-ui 加 "proactive-recall verbosity" 三档（off / quiet / chatty）

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| **RQ-01 4-project dogfood 结果**（必然发生）| 锁定具体库 |
| Anthropic 发布原生 long-term memory | 评估替代或互补 |
| KG 规模 > 10K concept nodes 性能崩 | 索引重设 / sharding |
| proactive-recall 验收连续 2 周 < 90% | 算法重设（见 §Proactive Recall 失败 fallback） |
| 用户实测 cost runaway（fact extraction 用 LLM 调用太多） | 改用 small model / 批处理 / 缓存 |
| embedding 模型 deprecation（如 nomic-embed-text v2） | re-embed 策略 + 迁移路径（Pitfall 5 HIGH） |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 5.5 — KG Memory Project Survey (RQ-01) — BLOCKING gate
- Phase 7 — Knowledge Graph + Three-Tier Memory — 实施

**关键文档**：
- PROJECT.md REQ-07 + KD-10 + KP-03 + KP-07
- `docs/reference/research/questions.md` RQ-01 完整 gate criteria
- STACK.md §2 Persistent Agent Memory + Knowledge Graph
- CLAUDE.md Authoritative Overrides "Memory / Knowledge Graph library — NOT LOCKED"

**关联 OSS 依赖**：
- `docs/dependencies.md` 待 RQ-01 决定后填入

**关联横切 spec**：
- **visual-design-system**（thread）— mindmap-viz 渲染遵守（虽然 mindmap-viz 是独立 spec）
- **interaction-paradigm**（thread）— 鼠标查询 KG / 鼠标拒绝 proactive-recall suggestion

**关联其他 spec**：
- 见 §5 — 与 9 个 spec 协作（memory-engine 是 v1.x 最"中央"的 spec）

**后续 phase 关联**：
- Phase 7 — KG 实施 + 三层 memory + proactive-recall MVP
- Phase 8 — mindmap-viz 拉 KG 数据 + per-course-rules 在 prompt 拼接 facts
- Phase 9 — anchored-mode 用 KG 推 source
- Phase 10 — fsrs-review 从 KG 出题

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 5 · 1/1（含 proactive-recall 章节并入）*
