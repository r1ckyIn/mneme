---
quick_id: 260508-phase1-html-prototype
date: 2026-05-08
slug: phase1-html-prototype
status: complete
related_phase: 1
related_phase_dir: .planning/phases/01-tauri-shell-foundation-subprocess-hardening/
skill_used: design-taste-frontend
deliverables_path: .planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/
---

# SUMMARY — Phase 1 前端 HTML 原型生成

## What was done

为 Phase 1 (Tauri Shell Foundation) 产出**视觉实例化原型**（KP-05 执行点 — 弥补 GSD `/gsd-ui-phase` 不调 visual-asset 工具的盲区）。落地路径：`.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/`。

### Skill applied

`design-taste-frontend`（user profile 锁的 vendor）— 作为 universal quality lens 加载，**不**作为风格 dictate。冲突项均按 UI-SPEC.md SSOT 优先（serif chain / Svelte 5 / vanilla CSS / 三栏对称 / inline SVG icons）。详见 `design/README.md` 的 skill-vs-SSOT 冲突矩阵。

### Deliverables (6 files, ~38 KB total)

| File | Bytes | Purpose |
|------|-------|---------|
| `design/preview.html` | ~24.5 KB | 单文件 mockup — 1280×860 window，三栏 30/40/30 + 120px 底部，9 个 message archetypes 同屏（user / assistant streaming + finalized / tool-use call + result / thinking / system error / KaTeX error），streaming dot pulse 动画 + Stop button 状态。Safari/Chrome 直接打开可看。 |
| `design/tokens.css` | ~5.3 KB | KD-13 token 字面量 1:1 候选（color / spacing / typography / motion / radius / shadow / geometry — 全部从 UI-SPEC L132-232 一字不差搬下来）。Plan 01-05 Task 1 直接 copy 到 `src/lib/styles/tokens.css`。 |
| `design/icons/send.svg` | 241 B | Send 上箭头（stroke 1.5, 18×18 viewBox）— 01-06 Task 1 inline 用 |
| `design/icons/stop.svg` | 163 B | Stop 实心方块（12×12 内衬 18×18）— 01-06 Task 1 inline 用 |
| `design/icons/settings.svg` | 1.1 KB | Settings gear（Phase 2 entry placeholder；Phase 1 占位渲染） |
| `design/README.md` | ~6.5 KB | 资产说明 + skill 归属 + 编辑规则（UI-SPEC 优先 — 不允许这里的资产单方面 drift）+ reviewer self-check checklist |

### Acceptance（PLAN.md 8 项）

- [x] preview.html 单文件可直接打开，无 console 报错
- [x] preview.html 渲染三栏 30/40/30 + 底部 ~120px + macOS Overlay titleBar 视觉
- [x] preview.html 包含 ChatPanel：用户气泡 / assistant streaming dot / tool-use card border-left orange / Stop button / 输入框 + Shift+Enter 提示
- [x] tokens.css `:root` 变量数 = **45** (远 ≥ 30 — color 13 / ink 4 / accent 5 / semantic 1 / bubble 1 / border 2 / shadow 2 / radius 5 / spacing 7 / typography 11 / motion 6 / geometry 3)
- [x] tokens.css 与 UI-SPEC.md 标定 KD-13 token 值一字不差（active-scale 0.96 / `--orange #d97757` / `--ease cubic-bezier(0.165, 0.85, 0.45, 1)` / `--bubble-user #EEEBE2` 全部精确匹配）
- [x] 3 个 SVG icon 矢量，stroke 1.5，与 KD-13 风格一致；send (241 B) + stop (163 B) ≤ 2 KB；settings (1.1 KB) 略复杂但仍 < 2 KB
- [x] design/README.md 注明 design-taste-frontend skill 归属 + 「不产出生产代码」声明 + reviewer self-check 14 项
- [x] 内容非 generic — 用 USYD COMP3221 RAFT 选举超时推导真实学习场景；无 "John Doe" / "Lorem ipsum" / fake percentages

### Out of scope (未做，按 PLAN.md 声明)

- ❌ src/ 目录代码（由 Phase 1 plan task 的 executor 写）
- ❌ 业务逻辑（subprocess / sanitize / dispatch — 与视觉无关）
- ❌ patch plan task 的 read_first 加 design/ 路径（**这是单独的下一步** — 等用户审完 mockup 决定满意后做）
- ❌ 修改 UI-SPEC.md（视觉契约已锁，本 task 是契约的可视化实例）

## Skill-vs-SSOT cross-spec corrections applied

`design-taste-frontend` baseline 是 Web SaaS dashboard 视角（Geist sans + Tailwind + React + Framer Motion + asymmetric layouts）。mneme Phase 1 是 Tauri desktop chat + 学术 serif 美学。

冲突项一律 UI-SPEC 优先：

1. 字体 serif chain（NOT Geist sans）— KP-09 Section 2 explicit "Claude 流动 serif，不用气泡"
2. vanilla CSS Grid + Svelte 5 runes（NOT Tailwind / React / Framer Motion）— D-01 OSS adoption 已拒绝
3. inline SVG stroke 1.5（NOT phosphor/radix）— UI-SPEC L616-619
4. 三栏对称 30/40/30 + 120px 底部（NOT anti-center / asymmetric layouts）— D-02 / D-03 已锁
5. `#faf9f5` cream + 4–12 px radius ladder（NOT `#f9fafb` + `rounded-[2.5rem]`）— KD-13 锁

完整冲突矩阵 + skill 普适规则采纳清单见 `design/README.md`。

## Next steps（不在本 quick task 范围）

| 步骤 | 触发条件 |
|------|---------|
| 1. 你打开 `preview.html` 浏览器审视觉 | 现在 |
| 2. 视觉满意 → 我 patch `01-05` Task 1/2/3 + `01-06` Task 1 + `01-07` Task 3 的 `<read_first>`，把 `design/` 路径加进去（轻量 1 commit） | 步骤 1 通过后 |
| 2-alt. 视觉不满意 → 我按你的反馈改 design/ 文件，重审 | 步骤 1 失败 |
| 3. `/gsd-execute-phase 1` 启动 Wave 1 (01-01 bootstrap) | 步骤 2 完成后 |
| 4. 流程纠偏 — 把"ui-phase 之后必须用 taste-skill 出 design/ 资产"加进 `r1ckyIn_GitHub/mneme/CLAUDE.md` 的工作流约束（防止 Phase 2/3/6/8/9/10 再踩同样的坑） | 任何时候，可与步骤 3 并行 |

## Notes

- Quick task 流程没 spawn gsd-planner / gsd-executor — design 决策的 ownership 应保留在 main context（由 main agent 直接读 UI-SPEC + 加载 skill + 写文件）。这与 PLAN.md "执行手段" 一致。
- preview.html 的 KaTeX 部分用 `<span class="katex-mock">` placeholder 模拟（避免单文件依赖 KaTeX runtime CDN）；执行时 01-03 Task 1 会接入真实 `katex.renderToString` + `trust:false`。
- preview.html 底部的 graph-hint 散点（120px 行的视觉 ornament）只是 placeholder 暗示 mind-map 形态，**不**作为 Phase 7+8 mind-map 的设计契约——那是后续 phase 的 UI-SPEC 范围。
