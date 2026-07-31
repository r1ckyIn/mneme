---
created: 2026-05-14T00:00:00.000Z
title: 抽 external-import spec（自成生态：手动 import + UniBoard 桥）
area: infrastructure / cross-project
type: seed
spec_target: openspec/specs/external-import.md
trigger: UniBoard 移交单元定义明确 + Phase 2 启动前
---

## Status

**seed** — 早期想法，4 个核心问题没答，写 spec 时机不到。

## Context

user 2026-05-11 决定：不接入 Canvas/Ed API/MCP，走**自成生态**。两个入口：
1. **手动文件导入**：用户拖拽 / 文件选择器 / 文件夹批量
2. **UniBoard 桥接**：从用户另一个项目（FastAPI+Next.js+Supabase+Claude API 的 web 端 GPA dashboard）导入文件 / 任务 / 笔记切片

不接外部 API 的理由：
- UniBoard 已沉淀内容能复用
- 不被学校 API 改版 / 切换学校绑死
- 跟 KP-01 local-first 更彻底兼容

覆盖（待 spec 化）：
- REQ-03 — 待改写（不再是"Canvas/Ed 拉取 + 增量同步"，改"手动 import + UniBoard 桥"）
- REQ-13 — 待改写（不再是"sync status"，改"手动 import 进度 / UniBoard 桥状态"）

## What This Captures

OpenSpec v0.3 决策工作台中，user 选择 **seed** 而非抽 spec，因为 UniBoard 桥的 4 个核心问题没答：

1. **移交单元**：从 UniBoard 到 Mneme 移交什么 — 笔记 / AI 对话 / 课程切片？
2. **传输协议**：deep link / 共享 Supabase / MCP 桥接？
3. **链接兼容**：`[[wiki-link]]` 跨项目可解析？
4. **离线可用**：KP-01 — UniBoard 离线时 Mneme 应能用已 import 的快照吗？

这 4 问没答前 spec 写不出实施约束。

## Surface Trigger

升级到抽 spec 的条件（任一触发）：
- UniBoard 项目"可移交单元"概念落地（user 在 UniBoard 那边定义清楚）
- `/gsd-discuss-phase 2` 或 `/gsd-plan-phase 2` 启动（必须先决定 import 路径）
- user 决定先做手动 import，UniBoard 桥延后（拆 spec 为两个 — manual-import 抽 + uniboard-bridge 仍 seed）

## Related

- `.planning/todos/pending/2026-05-09-cross-project-handoff-from-uniboard-to-mneme-via-claude-code.md` — 同主题更早期 todo（应该合并/超越）
- PROJECT.md REQ-03 / REQ-13（原文，待改写）
- 决策来源：OpenSpec v0.3 决策工作台（2026-05-14）+ user 反馈"自成生态"（2026-05-11）

## Decision Log

- 2026-05-11 — user 决定走自成生态，不接 Canvas/Ed API/MCP
- 2026-05-14 — OpenSpec 决策工作台 user 选 seed（前置 4 问没答，不抽 spec）
