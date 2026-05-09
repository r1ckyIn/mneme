---
created: 2026-05-09T13:08:38.356Z
title: Cross-project handoff from UniBoard to Mneme via Claude Code
area: planning
files: []
---

## Problem

UniBoard（FastAPI + Next.js + Supabase + Claude API 全栈 Web 应用）目前没有把工作 handoff 到 Mneme（本地 Tauri 学习软件）的机制。

Anthropic 已在 Claude design（Web 端）→ Claude Code（本地 CLI）之间建立了 handoff 模式：在 Web UI 设计/聊天到一定程度，按钮一点把上下文/产物落到本地 Claude Code 继续工作。

同一思路可以用在 **UniBoard → Mneme**：
- 在 UniBoard Web 端完成的学习内容片段（笔记草稿、AI 总结、引用）可以一键 handoff 到本地 Mneme vault
- 让"轻量在线消费"和"重量本地深加工"形成闭环
- 利用 Claude Code 已有的本地化能力（MCP / 工具调用 / vault 写入）做着陆

## Solution

TBD — 触发条件未到（UniBoard 还没有"明确可移交的工作单元"概念）。

设计时需要回答：
1. **移交单元是什么** —— 笔记 markdown？课程材料切片？讨论线程？AI 对话历史？
2. **传输协议** —— deep link (`mneme://handoff?...`) / 剪贴板 + 系统通知 / 共享 Supabase 行 + Mneme 拉取 / Claude Code MCP 桥接
3. **状态衔接** —— UniBoard 里的引用/标签如何在 Mneme vault 里继续可解析（`[[wiki-link]]` 兼容？）
4. **离线可用性** —— Mneme 是 local-first（KP-01），handoff payload 必须可离线消费，不能依赖在线 Supabase 取数

参考 Anthropic 的 handoff 按钮实现（`getAsterisk/opcode` 屏幕截图、claude.ai 行为）以理解 UX 模式后再设计本项目协议。

依赖：UniBoard 项目里先把"可移交工作单元"明确化，再回头设计 Mneme 接收端。
