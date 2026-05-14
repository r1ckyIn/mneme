---
created: 2026-05-14T00:00:00.000Z
title: 抽 voice-input spec（REQ-19 — OSS 本地 STT）
area: ux / input
type: seed
spec_target: openspec/specs/voice-input.md
trigger: Intel Mac CPU STT latency spike 跑完后
---

## Status

**seed** — REQ-19 在 2026-05-07 从 OOS-09 lifted 上来，是 v1.x candidate，**但 phase 未定 + STT 库未选 + Intel Mac CPU 推理延迟未实测**。3 个未知导致 spec 写不出。

## Context

REQ-19（lifted from OOS-09 on 2026-05-07）：
- Hotkey 触发 voice mode（候选默认 `Cmd+Shift+V`）
- 本地 STT 转录 → markdown 注入到 active chat input
- 可选 Claude pass for punctuation/formatting
- 与 voice-input 共存（interaction-paradigm 横切约束的窄场景例外候选 — 见 thread）

约束（KP-01 + KP-02）：
- **本地推理**（不走 cloud STT API）
- **OSS 库**（不绑商业产品）

3 候选（未选）：
- **whisper.cpp** — OpenAI Whisper C++/Rust 端口；MIT；模型大小可选 tiny/small/medium/large
- **distil-whisper** — 更快更小，MIT 兼容
- **Vosk** — 轻量离线，多语言

**macOS native dictation** — 系统级 fallback（非 OSS，违反 KP-02），不算候选。

## What This Captures

OpenSpec v0.3 决策工作台**漏选** voice-input — 工作台只列了 21 个 spec（v1 + v1.x feature + 3 横切），voice-input REQ-19 在原 _INDEX 里被列为"暂不切（等 spike）"，所以没出现在决策按钮上。

stage-3 PROJECT.md slim audit 发现这条遗漏 — 现在补 seed 让映射完整：每个 REQ 都有 spec 或 capture 文件指向。

## Spike 需求

升级到抽 spec 前必须先跑 spike：

```
/gsd-spike voice-input-intel-mac-stt-latency
```

**spike 目标**：
1. whisper.cpp small/medium 模型在 Intel Mac CPU 上单次 5-10 秒语音转录的延迟（要 ≤ 3 秒才能用）
2. 内存占用（不能拖累 Tauri 主进程）
3. 模型大小 vs 准确率 tradeoff（user 是双语 EN/ZH 输入，准确率重要）
4. distil-whisper / Vosk 对照（择优）
5. Tauri 集成路径：subprocess（whisper.cpp CLI）or Rust binding？

## Surface Trigger

升级到抽 spec 的条件：
- Intel Mac CPU latency spike 通过（找到可接受延迟的库 + 模型）
- user 实测时长 prompt 频繁打字 → 主动想要语音
- Apple Silicon 硬件 refresh（GPU 推理大幅加速 → 选择空间扩大）

如 spike 实测全候选延迟 > 5 秒 / 准确率 < 90% → 退到 OOS（标"等硬件 refresh 再开"），不抽 spec。

## 横切约束

- **interaction-paradigm** thread（窄场景例外候选）— `Cmd+Shift+V` 是 4 个候选例外之一，跟踪中；启用前需 user 单独批准
- **claude-subprocess** — STT 输出 → 注入 claude prompt（不走 subprocess 而是直接写 chat input）
- **per-course-rules** — 可选 "punctuation pass" 是 Claude API call（独立于 subprocess）

## Related

- PROJECT.md REQ-19（slim 索引页指向本文件）
- `.planning/threads/interaction-paradigm.md` § 窄场景例外候选 — 跟踪 `Cmd+Shift+V` 启用条件
- 2026-05-07 lift from OOS-09 决策（`/gsd-explore` foundation re-frame）

## Decision Log

- 2026-05-07 — OOS-09 lifted to REQ-19（user 决定语音对长 prompt 3-5x 加速）
- 2026-05-14 — OpenSpec stage-3 audit 发现 REQ-19 漏 capture → 补 seed（其他 v1/v1.x REQ 都有 spec 或 capture，voice-input 是唯一遗漏）
