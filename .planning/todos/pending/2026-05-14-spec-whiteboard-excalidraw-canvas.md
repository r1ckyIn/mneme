---
created: 2026-05-14T00:00:00.000Z
title: 抽 whiteboard spec（Excalidraw 自由画布）
area: ui / visualization
type: seed
spec_target: openspec/specs/whiteboard.md
trigger: Phase 8 mindmap-viz 稳定后 + user 实测有需求时
---

## Status

**seed** — KD-08 已选 Excalidraw v0.18.1 MIT，但 v1.x 后置，是否真用待用户实测。

## Context

KD-08 双视图：
- **mind-map**（Cytoscape）— AI 给人看 KG 派生（已抽 spec）
- **whiteboard**（Excalidraw）— 用户自由画 (本 spec 描述)

user 2026-05-11 反馈：mind-map 和 whiteboard 是**不同功能**，spec 必须拆开。

Whiteboard 用例：
- 周末整合多个 concept 做视觉拼接
- 跨主题手画思路图
- 不绑 KG（user 主导，AI 不维护）

约束：
- Excalidraw v0.18.1 MIT（已锁 — KP-02 干净）
- 拒绝 tldraw v4（proprietary + watermark）
- React-only — 需 Svelte 5 host wrap（`svelte-react` 或 `createRoot()` in `onMount`）
- 场景持久化：`courses/<COURSE>/whiteboards/<topic>.excalidraw.json`
- 字体自宿主（Tauri-bundled）

## What This Captures

OpenSpec v0.3 工作台 user 选 **seed**：v1.x 后置 + 是否真用未知。Phase 8 mindmap-viz 跑稳后 user 实测决定。

如 user 实测发现 mind-map 够用 / whiteboard 用不上 → 整个 spec 砍（不抽）。
如 user 实测 mind-map 限制结构化、想自由画 → 升级抽 spec。

## Surface Trigger

升级到抽 spec 的条件：
- Phase 8 mindmap-viz ship 后 user 实测 ≥ 4 周
- user 主动提"需要白板"
- 跨主题视觉拼接需求出现（如学期末复习整合）

如 4 周内 user 没需求 → 这条 seed 可以收成 reject（或 OOS 候选）。

## Related

- PROJECT.md KD-08（mind-map + whiteboard 同一决策，已拆 spec）
- `openspec/specs/mindmap-viz.md`（同源 KD，已抽）
- STACK.md §4 — Excalidraw vs tldraw 决策原文

## Decision Log

- 2026-05-11 — user 决定 mindmap 和 whiteboard 拆开（不同功能）
- 2026-05-14 — OpenSpec 决策工作台 user 选 seed（v1.x 后置 + 实测决定）
