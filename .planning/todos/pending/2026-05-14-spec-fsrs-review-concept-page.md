---
created: 2026-05-14T00:00:00.000Z
title: 抽 fsrs-review spec（FSRS-6 概念页复习）
area: algorithm / review
type: seed
spec_target: openspec/specs/fsrs-review.md
trigger: Phase 10 plan 启动前 + thea spike 跑完
---

## Status

**seed** — 算法层（FSRS-6）+ 库（ts-fsrs）+ 单元（概念页非卡片）已锁，但**AI 出题算法** 是开放问题（关联 thea spike）。

## Context

REQ-09 + REQ-15 + KD-06：
- FSRS-6 间隔重复算法（已选 ts-fsrs canonical 实现）
- **review 单元 = 概念页**（不是 Anki-style 卡片 — 砍掉手建卡片瓶颈）
- daily-due 队列排序：`(graph weakness × FSRS due-ness)` — graph weakness 来自 memory-engine KG
- review focus mode：UI 收起三栏 → 单概念全屏 → AI 现场出题 → 1/2/3/4 回流 FSRS scheduler

约束：
- FSRS state 存概念页 YAML frontmatter（vault-storage 协作）
- review history 存 `_system/fsrs/history.jsonl`
- AI 出题用 small model（cost 控制）
- 评分键 1/2/3/4 是 fsrs-review 窄场景例外候选（interaction-paradigm thread 跟踪）

## What This Captures

OpenSpec v0.3 工作台 user 选 **seed**：算法明确但**AI 出题质量未知**。STATE.md pending todo `2026-05-07-evaluate-thea-for-question-generation.md` 是同主题：

> thea.study 产品 REJECTED（cloud SaaS 违反 KP-01）— 但其 AI-question-from-source 算法值 Phase 10 spike（½-1 day timebox）

抽 fsrs-review spec 前应：
1. 跑 `/gsd-spike concept-review-item-generation`（thea 黑盒 + Claude API prompt-pipeline 实验）
2. 决定 AI 出题策略 — prompt 模板 / few-shot / fine-tune candidate
3. 然后抽 spec 时把出题契约写进去

## Surface Trigger

升级到抽 spec 的条件：
- Phase 10 plan-phase 启动前
- thea spike 跑完（出题质量决策出来）
- memory-engine ship 后（依赖 KG weakness 数据）

如 user 实测每天 due 太多 → 改 retention 参数（不动 spec 本身）。

## Related

- PROJECT.md REQ-09 + REQ-15 + KD-06
- STACK.md §5 — FSRS-6 + ts-fsrs
- 关联 todo：`2026-05-07-evaluate-thea-for-question-generation.md`（同主题）
- 关联 spec：memory-engine（KG weakness 来源）+ vault-storage（FSRS state 落 frontmatter）+ layout-shell（review focus mode 全屏切换）

## Decision Log

- 2026-05-14 — OpenSpec 决策工作台 user 选 seed（等 thea spike 跑完 + memory-engine ship 后）
