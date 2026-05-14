---
created: 2026-05-14T00:00:00.000Z
title: 抽 caption-bilingual spec（Echo360 VTT → Claude 翻译 → 双语 VTT）
area: video / i18n
type: note
spec_target: openspec/specs/caption-bilingual.md
trigger: echo360-video Phase 5 spike 通过后 + Phase 6 plan 启动前
---

## Status

**note** — 内容稳定（VTT → Claude 翻译 → 双语 VTT），但**完全依赖 echo360-video** spike 结果。spike 通过即可抽，spike 失败 spec 重设计。

## Context

REQ-05：
- Echo360 lecture video 字幕自动拉 VTT
- 每条 cue → Claude API 翻译（EN ↔ ZH）
- 输出 双语 VTT（两行 cue）落 `courses/<CODE>/_source/lectures/<lec>.bilingual.vtt`
- HTML5 `<video>` + `<track>` 渲染双语
- 字幕全文进入 vault grep 索引（agentic-search 间接受益）

库：
- `subtitle` v4.2.2 MIT（VTT parse/format）
- Claude API（翻译，KP-04 兼容 — 走 user 自己 API key）
- 不用 Read Frog / FluentRead（GPLv3 ⚠ 只学不抄）

## What This Captures

OpenSpec v0.3 工作台 user 选 **note**：内容稳定就等触发时机。**spec 实质内容已经在 STACK.md §9 写完**，抽 spec 是 5-10 分钟事，但抽早了无意义（echo360-video spike 失败的话连 VTT 入口都没了）。

note vs seed 差异：内容已定型，不是早期想法，只是等触发顺手做。

## Surface Trigger

升级到抽 spec 的条件：
- Phase 5 echo360-video spike 通过（VTT endpoint 可访问）
- `/gsd-plan-phase 6` 启动前
- 如 spike 失败 → spec 重设计（不再是 webview 抓 VTT，可能 OCR / 手动上传 / etc.）→ 重新降为 seed

## Related

- PROJECT.md REQ-05
- STACK.md §9 Caption / Subtitle Handling
- 关联 spec：echo360-video（依赖）/ vault-storage（VTT 落点）/ agentic-search（字幕全文索引）/ claude-subprocess（Claude API 翻译走独立通路，不通过 subprocess — 与 anchored-mode 类似）

## Decision Log

- 2026-05-14 — OpenSpec 决策工作台 user 选 note（内容稳定，等 spike 通过顺手抽）
