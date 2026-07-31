---
title: Research Questions
date: 2026-05-06
status: open
---

# 待研究的问题

研究原则：**不造轮子。每个问题先扫开源生态，找最佳实践，能照搬就照搬。**

## RQ-01 · Claude Code memory / agent persistence 开源项目调研 — **BLOCKING (Phase 3 entry gate)**

**问题**：社区有哪些 "Claude Code memory" / "AI agent persistent memory" / "second brain for LLM" 类的开源项目？哪些适配我们"AI-native 双层数据架构（knowledge graph 给 AI、脑图白板给人）+ 三层 memory tier（working/episodic/long-term）+ confidence tracking" 的诉求？

**候选起点**（2026 web 调研后更新）：
- **Cognee** — GraphRAG, multi-doc 结构化 KG ⭐⭐⭐⭐ 多课程跨文档关联匹配
- **Zep + Graphiti** — temporal KG（fact 有 validity window，新概念 supersede 旧）⭐⭐⭐⭐ 概念演化场景完美
- Mem0 — 3-tier memory + 混合 store ⭐⭐ **缺 temporal 模型**，弱
- Letta — long-horizon agent（self-improving）⭐ 偏 chatbot，不匹配学生概念
- agentmemory (rohitg00) — 架构对齐 KD-10 但 **无 benchmark**、niche fork — 红旗，仅作 fall-back
- SimpleMem — 64% LoCoMo benchmark 但功能集小

**Phase 3 entry 之前必须产出**：
- [ ] 4 个候选（Cognee / Zep+Graphiti / Mem0 / agentmemory）的 license / 维护活跃度 / KD-10 三层架构契合度对比表
- [ ] 至少 2 个候选的 1 周 dogfood 实测（导入一个 lecture，跑 50+ user/assistant turns，看记得几条、引用准不准）
- [ ] 决策报告 + 推荐 + 兜底（如果首选失败迁移路径）

**评估维度**：
- license 是否兼容（MIT/Apache 优先）
- 数据是否能本地（不强制云端）
- 是否支持 markdown vault 作为 source of truth
- 知识图谱 schema 是否可扩展（能加 confidence、provenance、timestamps）
- 跟 Claude Code（我们的执行器）配合是否顺畅
- 维护活跃度

**输出**：一张对比表 + 推荐照搬 / 二次开发哪个 + 自建多少

## RQ-02 · PDF → AI-friendly markdown 开源项目调研

**问题**：把 PDF（lecture slides、textbook、past exams）转成结构良好、AI 友好的 markdown 的最佳开源工具是哪个？

**已知关键词**（从对话浮现）：
- 用户说 "社区有一个开源项目专门解决这个" — 但没说具体名字
- 候选可能包括：Marker (datalab-to/marker)、MinerU、Docling (IBM)、Nougat (Meta)、PyMuPDF4LLM、LlamaParse

**评估维度**：
- 数学公式渲染（LaTeX 还原）— 我们是数学课，必须好
- 图表识别能力（lecture 经常有 diagram）
- 表格还原
- 结构层级（章节 / 子章节 → markdown heading）
- 本地运行（不要依赖云 API）
- 速度（一份 lecture 几秒内）

**输出**：单一推荐 + rationale + 集成方式

## RQ-03 · 套壳 + 流式 stream-json 解析的开源参考

**问题**：除了 Claude Desktop App 自己（闭源），社区有哪些项目示范了"GUI 包 Claude Code subprocess + 解析 `--output-format stream-json` 事件"？

**候选起点**：
- Tauri ecosystem 里有没有现成的 claude-code wrapper
- Electron 实现的 Claude Code GUI（如果有）
- 任何 Anthropic 官方 reference implementation

**评估维度**：
- 事件类型覆盖度（messages、tool_use、tool_result、thinking、stop）
- 错误恢复（subprocess 死了怎么办）
- 多 session 并行管理

**输出**：照搬模板 OR 标注"需自建" + 关键事件类型清单

## RQ-04 · GSD graphify skill 工作机制研究

**问题**：用户提到"gsd 怎么使用 graphify 生成知识图谱的我们就怎么生成"。需要研究 graphify skill 的实际工作流：输入格式、图谱 schema、节点/边类型、如何流式更新。

**输入**：`~/.claude/skills/graphify/SKILL.md`（已知存在）

**评估维度**：
- 数据 schema 能否复用
- 是否可以喂自然语言对话片段并增量建图
- 输出格式（JSON / RDF / Cypher / 自定义）
- 能否跟 RQ-01 选出的 memory 系统拼接

**输出**：照搬决策（直接用 graphify / fork 二开 / 替换）

## RQ-05 · 学习方式认知谦逊（learning-method epistemic humility）— **non-blocking, ongoing**

**问题**：当前 18 个 v1 + v1.x REQ 全部来自 **n=2 样本**（用户 + 女朋友）的学习方式。**成绩更好的同学是不是有我们盲区里的更好方法？**（不同的笔记格式 / 不同的复习节奏 / 不同的 visual+spatial 脚手架 / 不同的 AI 协作模式）。这些"更好方法"如果存在，会怎么改变 / 替换 / 增加我们当前的 REQs？

**为什么这个问题存在**：foundation-first 决策（PROJECT.md Core Value 5 维度结构）的最深底层动机就是这个——**承认产品功能假设的样本量太小**，地基必须能容纳"功能集合演化"。如果不持续观察更好学习方法的可能性，地基设计可能在错误的功能假设上 over-fit。

**研究方式**（informal, **不**做正式访谈）：
- **观察**：GitHub repos / Reddit `/r/GetStudying` `/r/medicalschool` / HN / 学校论坛上 top-performing 学生的工具栈和工作流
- **朋友网络非正式聊**：碰到自然机会就闲聊问 1-2 个问题，不预设结构化提问
- **机会式 capture**：偶遇有用 finding 就丢到 `.planning/notes/learning-method-observations.md`
- **不做**：正式 user interview / 问卷 / 招募 / 受控试验 — 这些过度工程化、成本高、对个人项目不合适

**评估维度**（findings 怎么处理）：
- finding 是不是揭示了**当前 REQ 的 bug**？（如果是 → 加候选 REQ revision 到 .planning/notes/）
- finding 是不是建议**新的 KP**？（如果是 → 升级到 PROJECT.md Key Principles 候选讨论）
- finding 是不是**确认**当前方向？（如果是 → 增加我们对当前 18 REQ 的 confidence）

**触发窗口**：v1 ship 期间持续 + v1 ship 之后 3 个月 dogfood 期间持续；不阻塞任何 v1 phase。

**输出 destination**：`.planning/notes/learning-method-observations.md`（按需创建）→ 累积到一定量后 promote 到 PROJECT.md Active REQ / OOS 修订 / 新 KP 候选。

---

*Each question gets resolved before its corresponding spike or implementation phase. RQ-01/RQ-02/RQ-03 should resolve before P0-1 spike passes; RQ-04 before knowledge graph phase plans. RQ-05 is ongoing throughout the project lifecycle (non-blocking).*
