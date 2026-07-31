---
created: 2026-05-14T00:00:00.000Z
title: 抽 onboarding spec（首次启动向导）
area: ux
type: seed
spec_target: openspec/specs/onboarding.md
trigger: external-import 路径明确后 + Phase 2 plan 启动前
---

## Status

**seed** — 6 步流程清楚但第 4 步（import 入口）依赖 external-import 路径未定。

## Context

REQ-16 首次启动向导 — 6 步：
1. Welcome + brief tour（3 screens）
2. Confirm Claude Code install + auth（auto-detect existing OAuth subscription）
3. Pick vault path（default: `~/StudyVault/`）
4. **Import 入口** — 待 external-import 定（手动 / UniBoard 桥）
5. 课程选择 — 但课程是 import 来的，不是 detect 来的（原 REQ-16 假设有 Canvas API auto-detect）
6. 首次 import — 进度条 + 取消

第 4-5 步设计变化大：
- 原 REQ-16 假设 Canvas API auto-detect 课程 → 现在没 API
- 用户得手动告诉 mneme"我要导哪些课"
- 或：通过 UniBoard 桥拿课程列表（如 UniBoard 知道）

## What This Captures

OpenSpec v0.3 工作台 user 选 **seed**：onboarding 框架明确但**关键步骤依赖 external-import**。external-import seed 升级前不抽 onboarding spec。

第 1-3 + 6 步可以独立设计，但跟第 4-5 拆开会让 UX 断裂 — 不如等 external-import 决定后一次抽。

## Surface Trigger

升级到抽 spec 的条件：
- external-import seed 升级到抽 spec（首选触发 — 一起设计）
- `/gsd-plan-phase 2` 启动（Phase 2 是 vault + onboarding + settings 一起做）
- user 决定 onboarding 走 minimal first（不等 external-import 完整）→ 拆 spec 抽 minimal 部分

## Related

- PROJECT.md REQ-16（原文）
- 同 phase 关联：external-import seed（todo 同日创建）
- 关联 spec：vault-storage / settings-ui / claude-subprocess（auth detect）

## Decision Log

- 2026-05-14 — OpenSpec 决策工作台 user 选 seed（等 external-import 路径明确）
