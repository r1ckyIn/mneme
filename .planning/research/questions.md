---
title: Research Questions
date: 2026-05-06
status: open
---

# 待研究的问题

研究原则：**不造轮子。每个问题先扫开源生态，找最佳实践，能照搬就照搬。**

## RQ-01 · Claude Code memory / agent persistence 开源项目调研

**问题**：社区有哪些 "Claude Code memory" / "AI agent persistent memory" / "second brain for LLM" 类的开源项目？哪些适配我们"AI-native 双层数据架构（knowledge graph 给 AI、脑图白板给人）+ 三层 memory tier（working/episodic/long-term）+ confidence tracking" 的诉求？

**候选起点**（这一晚的对话中已浮现）：
- Mem0 — persistent agent memory layer
- Cognee — open-source structured graph-native memory
- Zep — temporal knowledge-graph memory platform
- agentmemory (rohitg00) — pipeline: SHA-256 dedup → privacy filter → LLM compress → embed → BM25+vector index → graph
- SimpleMem — efficient lifelong memory for LLM agents

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

---

*Each question gets resolved before its corresponding spike or implementation phase. RQ-01/RQ-02/RQ-03 should resolve before P0-1 spike passes; RQ-04 before knowledge graph phase plans.*
