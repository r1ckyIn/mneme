# agentic-search

> **能力域**：默认靠 `claude --add-dir <vault>` 让模型自己 grep/glob 迭代搜索 vault，**不上 vector DB**。**故意的非架构决策** — 这是一条会被未来质疑的判断，独立成 spec 让"重评触发条件"有归属。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 1
**实现状态**：**hypothesis** — 依赖 claude-subprocess 已 spawn 出 `--add-dir` 授权的 subprocess

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-10** — Agentic search default (no vector DB)
- **KD-07** — No vector DB by default; agentic search replaces RAG
- 与 **OOS-03**（Custom-built vector database / RAG infrastructure）的明确边界

**核心论点**：Anthropic 在 Claude Code 早期用 RAG + vector DB，后来**完全替换为 agentic search**（Boris Cherny 验证）。理由：
- simpler 运营（无 vector DB / embedding pipeline / staleness 处理）
- 对前沿模型反而更好（跨文档综合）
- 无 staleness、无 embedding 隐私、无 re-embed 成本

---

## 评估过的备选（What we considered）

| 候选 | 性质 | 决定 |
|------|------|------|
| **当前方案：agentic search via `--add-dir`** | claude CLI 自带 grep/glob/cat tools 迭代搜索 vault | ✅ 已采用（KD-07 locked） |
| **Mem0 vector-first** | Apache-2.0，self-host 需 Docker；vector-first 不匹配 graph 需求 | ❌ 否决 — 不匹配 graph 优先（REQ-07 / memory-engine）+ Docker 重 |
| **sqlite-vec + Ollama 本地 vector** | rusqlite + sqlite-vec v0.1.9 + Ollama HTTP + `nomic-embed-text` | 📝 **保留为未来窄场景路径**（KD-07 已留口）— 写笔记时实时浮"相关概念"、知识图谱 edge 维护 |
| **Cognee GraphRAG** | Apache-2.0，多文档 GraphRAG；Python runtime 重 | 📝 候选（memory-engine 4 选 1 中），但非 agentic-search 路径 |
| **pgvector + Postgres** | 重运营，无明显优势 | ❌ 否决 — 100MB+ binary + 进程生命周期 |
| **Pinecone / Weaviate / Qdrant Cloud** | 云 vector DB | ⛔ 违反 KP-01（local-first） |
| **Faiss / Annoy / hnswlib via WASM** | 内存 vector + 无 SQL | ❌ 否决 — 持久化层得重新做 |
| **LlamaIndex / RAG 全套** | 完整 RAG 框架 | ❌ 否决 — 跟 KD-07 整个方向反 |

---

## 否决理由（Why we said no）

- **vector DB 默认上**：违反 KD-07 + Anthropic 已验证的 agentic 路径 + 增加 staleness / re-embed 成本 / embedding 模型 lock-in（Pitfall 5 HIGH severity）
- **云 vector**：违反 KP-01 local-first
- **LlamaIndex / RAG 框架**：违反 KP-06 reject reinvented wheels — Claude Code 自带的 grep/glob 就是工具，不需要额外抽象层
- **混合模式（agentic + vector 双跑）**：增加复杂度无明显收益 — 单一架构更可控

---

## 实施约束（Constraints when implementing）

### 1. 默认搜索路径（locked by Phase 1）

claude-subprocess spawn 时带 `--add-dir <vault-root>`：

```
claude --add-dir ~/StudyVault \
       --print \
       --output-format stream-json \
       ...
```

- 安全边界：`--add-dir` 是唯一授权根，**不允许通配**（Pitfall 2 — wildcard capability 风险）
- 默认 vault 路径 = settings.ui 配置的 vault 根（默认 `~/StudyVault/`）

### 2. 性能契约（locked by REQ-10）

- 典型查询响应 ≤ **10 秒**（"我之前说过 X" 类查询）
- 单次查询成本 ≤ **$0.10**（amortized after first `cache_creation`）
- 跨文档综合查询 ≤ **30 秒**（多 tool_use 迭代）

超出预算 → 走 cost cap kill switch（见 claude-subprocess §7）

### 3. 什么场景**不**走 agentic search（vector 留口）

KD-07 明确留口给以下窄场景**未来**可加 vector：
- **写笔记时实时浮"相关概念"** — 需 50ms 级响应，agentic 跑不到
- **知识图谱 edge 自动维护** — memory-engine 内部用，写入路径，不是查询路径

这两个场景**不属于** agentic-search spec — 它们走 vector 但归 memory-engine 管。`agentic-search` spec 只管"用户对 vault 的查询"。

### 4. 与 claude-subprocess 的契约

- agentic-search 依赖 claude-subprocess 已 spawn + 已 attach `--add-dir`
- 多 session（multi-session spec）每个 session 独立 `--add-dir` scope — session A 看课程 X，session B 看课程 Y，互不干扰
- `--add-dir` scope 配置变化 → 需要重启 subprocess（不能热切换）

### 5. 与 OOS-03 的边界

OOS-03（Custom-built vector database / RAG infrastructure）排除"自建 vector + 自建 embedding pipeline + 自建 RAG 框架"。**不**排除：
- 调用现成 vector lib（如 sqlite-vec）做窄场景缓存（memory-engine 内部）
- 用 claude 自己的 grep/glob agentic 搜索（这就是当前 spec）

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| 某类查询实测 agentic 跑不达标（性能 / 准确率） | 该类查询单独走 vector 缓存（不是全面回归 RAG） |
| Claude Code 自己改回 RAG 默认（不太可能） | 跟着 Anthropic 路径调整 |
| 用户实测单次查询成本超预算 $0.10 频繁触发 | chunking 策略 / `cache_creation` 重用机制重设 |
| vault 规模超 10K 文件 + grep 性能崩 | 引入 ripgrep + indexed search（仍是 agentic 不是 vector） |
| 跨文档综合查询召回率低于 80% | 评估 memory-engine 的 KG 是否能补足（不直接动 agentic 路径） |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 1 — Tauri Shell Foundation + Subprocess Hardening
- `--add-dir` 参数在 claude-subprocess 实施时已带入

**关键文档**：
- `docs/reference/notes/foundation-decisions.md` §3 — 搜索架构决策原文（"agentic search 为主，vector 只补热点"）
- PROJECT.md REQ-10 + KD-07
- STACK.md §10 — 本地 SQLite + sqlite-vec + Ollama（**未来**窄场景 vector 路径）

**关联横切 spec**：
- 无（这是行为契约，无 UI 不涉及 visual-design-system）

**关联其他 spec**：
- **claude-subprocess** — `--add-dir` 在子进程 spawn 时配置
- **vault-storage** — vault 根路径定义在这里
- **multi-session** — 每 session 独立 `--add-dir` scope
- **memory-engine** — 窄场景 vector（如果未来加）归 memory-engine，不归这里
- **settings-ui** — vault 路径配置入口

**后续 phase 关联**：
- Phase 2（vault + onboarding）— 默认 vault 路径 `~/StudyVault/` 配置
- Phase 5.5+7（memory-engine）— 窄场景 vector 决策

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 1 · 2/12 个 spec*
