---
status: accepted
date: 2026-07-31
---

# 开发层切换为 matt skills，删除 GSD 与 OpenSpec 两层

项目在 GSD + OpenSpec 双流程下产出了 86,817 行规划文档对约 14,000 行代码（6:1），并在 Phase 2 发布后停摆 73 天；两套记账系统还产生了互相矛盾的权威（REQ-11 在 PROJECT.md 中 retired、却在晚 19 天批准的 03-UI-SPEC 中被完整设计回来）。2026-07-31 决定：**开发工作流只用 matt skills**（grilling / domain-modeling → tdd → implement-matt → `/code-review` xhigh），`.planning/` 与 `openspec/` 两层在内容清洗迁移到 `docs/` 后整体删除（含 repo 级 `.claude/` 里的 opsx commands 与 openspec skills），git 历史即归档。

## Consequences

- 权威链收缩为：`docs/PRODUCT.md`（身份）→ `docs/specs/`（能力 spec）→ `CONTEXT.md`（词汇表）→ `BACKLOG.md`（工作队列）→ `docs/adr/`（决策）。
- 任何 session 不得再执行 `/gsd-*` 或 `/opsx:*` 流程；旧文档中残留的此类指令一律视为化石。
- `docs/reference/` 为只读参考层（研究、旧 ROADMAP/REQUIREMENTS 快照、phase03 设计包、shipped UI-SPECs、seeds）——内容有效但不再是流程的一部分。
- 被拒绝的备选：(a) 冻结而不删除——被否，冻结目录会持续把新 session 拽回旧流程；(b) 双轨并行——被否，6:1 文档税与权威冲突正是双轨的产物。
