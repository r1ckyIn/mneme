---
quick_id: 260508-phase1-html-prototype
date: 2026-05-08
slug: phase1-html-prototype
status: planned
related_phase: 1
related_phase_dir: .planning/phases/01-tauri-shell-foundation-subprocess-hardening/
skill_used: design-taste-frontend
---

# Quick Task: Phase 1 前端 HTML 原型生成

## Description

为 Phase 1 (Tauri Shell Foundation + Subprocess Hardening) 产出一份**视觉实例化原型** — 落到 `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/` 子目录，作为 execute-phase Wave 3 / 4 实施时的视觉参考。

## Why a Quick Task (not part of plan-phase)

KP-05 (UI initial design via Claude Design / 美学家族) 的执行手段在 plan-phase 工作流里是**盲区** — `/gsd-ui-phase` 只产出 UI-SPEC.md (文字契约)，不产视觉资产。这次 quick task 是补这一步。后续 UI-重 phase (2 / 3 / 6 / 8 / 9 / 10) 会把这个补丁固化进 r1ckyIn_GitHub/mneme/CLAUDE.md 的工作流约束（单独流程纠偏，不在本 task 范围内）。

## Skill Selected: `design-taste-frontend`

User profile 锁的视觉 vendor 是 `taste-skill`（个人级偏好）。从 4 个候选中选 `design-taste-frontend`：
- **匹配**：Senior UI/UX engineer 定位 + metric-based rules + balanced design engineering — 与 mneme 严肃 desktop chat 应用契合
- **拒绝 `gpt-taste`**：偏 marketing landing (AIDA / bento / GSAP) — 与 desktop chat 完全不匹配
- **拒绝 `stitch-design-taste`**：Google Stitch 风 + DESIGN.md 体系 — 偏 web design system，不匹配 Tauri desktop
- **辅助参考**：`high-end-visual-design` / `minimalist-ui` 作为风格预设候补，不主导

## Inputs (read_first for skill invocation)

1. `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-UI-SPEC.md` — 6 维设计契约 (color tokens / typography / motion / icon / interaction / accessibility)
2. `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SPEC.md` — 6 个 phase-local REQ (REQ-1 三栏布局 / REQ-2 streaming / REQ-5 KaTeX+DOMPurify 视觉相关 / REQ-6 9 个 unbound 热键)
3. `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md` — D-01..D-22+ 视觉相关决策 (D-03 底部行 / D-04 中栏占位 / D-05 1280×860 / D-06 macOS Overlay / D-19 Stop button / D-20 Shift+Enter)
4. `.planning/PROJECT.md` — KP-09 + KD-13 Anthropic 家族美学
5. `.planning/references/design/` (如存在) — 美学 SSOT

## Deliverables

| 文件 | 用途 | 对接 Phase 1 plan |
|------|------|------------------|
| `.planning/phases/01-.../design/preview.html` | 单文件可看 mockup（含内联 CSS）— 三栏 shell + ChatPanel + 底部行 + window chrome | 01-05 Task 3 (+page.svelte) + 01-06 Task 1 (ChatPanel.svelte) |
| `.planning/phases/01-.../design/tokens.css` | KD-13 token 字面量候选（`:root` 变量定义 — color / space / duration / ease / typography / radius / shadow） | 01-05 Task 1 (`src/lib/tokens.css`) — 一字不差搬过去 |
| `.planning/phases/01-.../design/icons/send.svg` | Send 按钮图标（矢量） | 01-06 Task 1 |
| `.planning/phases/01-.../design/icons/stop.svg` | Stop 按钮图标（streaming 中显示） | 01-06 Task 1 |
| `.planning/phases/01-.../design/icons/settings.svg` | Settings 按钮图标（占位 — Phase 2 接入） | 01-05 Task 3（占位渲染） |
| `.planning/phases/01-.../design/README.md` | 资产说明 + design-taste-frontend skill 归属 + 与 plan task 的衔接说明 | (元数据) |

## Acceptance

- [ ] preview.html 单文件可在 Safari/Chrome 直接打开，不报 console 错误
- [ ] preview.html 渲染三栏（30%/40%/30%）+ 底部 ~120px + macOS Overlay titleBar 视觉
- [ ] preview.html 包含 ChatPanel：用户气泡 / assistant streaming dot / tool-use card border-left orange / Stop button / 输入框（带 Shift+Enter 提示）
- [ ] tokens.css `:root` 变量数 ≥ 30（color + space + duration + ease + typography + radius + shadow 至少 5 类各 5+ 项）
- [ ] tokens.css 与 UI-SPEC.md 标定的 KD-13 token 值（active-scale 0.96 / 主调色 / orange accent / ease-out）一字不差
- [ ] 3 个 SVG icon 矢量，单文件 ≤ 2KB，stroke-based，与 KD-13 风格一致（克制、warm）
- [ ] design/README.md 注明 design-taste-frontend skill 归属 + 不产出生产代码声明 (preview.html 是参考，src/ 由 plan task 实际写)

## Out of Scope (本 quick task 不做)

- 实际的 src/ 目录代码（由 phase 1 plan 任务的 executor 写）
- 业务逻辑（subprocess / sanitize / dispatch — 与视觉无关）
- 把 design/ 路径 patch 进 plan task 的 read_first（**这是单独的下一步**，等用户审完 mockup 再做）
- 修改 UI-SPEC.md（视觉契约已锁，本 task 是契约的可视化实例，不是契约修改）

## Notes

- **执行手段**：main agent (Opus 1M) 直接调用 `design-taste-frontend` skill 加载规则进 context，然后由 main agent 写文件。**不**spawn gsd-executor — 因为 design 决策的 ownership 应保留在 main context（你审完后才进入 plan execute）。
- **审查节点**：mockup 出来后你审一轮 → 满意 → 我可以接力做「patch plan task read_first」 + 视情况调 `imagegen-frontend-mobile` 或 `image-to-code` 互补
