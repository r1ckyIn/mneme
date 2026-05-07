# Phase 0: Identity & Branding Lock - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 0-identity-branding-lock
**Areas discussed:** Naming, Icon visual direction, Bundle ID + rename propagation, Claude Design iteration cadence, README content depth (supplementary), Window/Dock label format (supplementary), Git history handling (supplementary)

---

## Naming

### Q1: 名字怎么收敛？

| Option | Description | Selected |
|--------|-------------|----------|
| 已有 2-3 个候选 (Recommended) | User lists candidates, Claude evaluates against criteria | |
| Claude 生成 8-10 个候选 | Generate per criteria, user picks 1-2 | ✓ |
| 混合 — 用户设 constraint, Claude 填 | User sets must-have constraints, Claude generates | |

**User's choice:** Claude 生成 8-10 个候选, 我挑

### Q2: 生成名字前 — 最看重哪个准则？

| Option | Description | Selected |
|--------|-------------|----------|
| 学习主题诊性 — 名字联想到"学习/记忆/思考" (Recommended) | e.g. Mnemo / Cortex / Recall / Ponder. Theme-direct, clear identity. | ✓ |
| 抽象 — 不揭示主题, 可拓展 | e.g. Aria / Nori / Iris / Loom | |
| 元 — 反映 KG 双层架构本身 | e.g. Graphite / Synapse / Vault / Codex | |

**User's choice:** 学习主题诊性

### Q3: 这些名字里哪个走下步？

Claude generated 10 candidates grouped by archetype:
- **Greek/Latin (scholarly):** Mnemo, Mneme, Locus, Lyceum, Praxis, Mira
- **Direct English:** Ponder, Cortex (saturated), Synapse (saturated)
- **Spatial metaphor:** Atrium

| Option | Description | Selected |
|--------|-------------|----------|
| Mnemo (Recommended) | Greek memory goddess + mnemonic root, low conflict | |
| Mneme | Greek "memory" itself, more distinctive | |
| Ponder | English "think deeply", uncommon in tech | |
| Other (free text) | Pick from list above or propose new | ✓ |

**User's choice:** "在plan和execute阶段经过研究之后再给我推荐" — defer final pick to plan-phase researcher with criteria-based due-diligence (GitHub repo / npm / .app TLD / EdTech namespace conflict scan).

**Notes:** User wants the name pick to be evidence-backed — researcher verifies candidate availability before user is asked to commit. Starting candidates locked: Mnemo · Mneme · Ponder + backups (Locus / Mira / Lyceum / Praxis / Atrium). Excluded: Cortex / Synapse / Echo / Sage / Glean / Codex / Atlas / Lumen (tech-saturated).

---

## Icon visual direction

### Q1: 图标主概念锚点 — Claude Design prompt 应该围绕哪个意象？

| Option | Description | Selected |
|--------|-------------|----------|
| 图谱/节点网络 (Recommended) | Reflects KG dual-layer differentiator; some EdTech/note-taking apps use similar | |
| 脑/神经 | Direct theme but cliché-risk (Cortex/Neuro/Synapse) | |
| 书/页/卷轴 | Traditional learning, low conflict but not "AI-native" | |
| 字型/单色 monogram | Minimalist; needs name lock first | |
| Other | Combination | ✓ |

**User's choice:** "结合1和4，等名字出来再做决定，然后先用ChatGPT image2.0出草图然后再让Claude design实现"

**Notes:** Hybrid — graph-node + monogram (first letter of final name embedded as focal element). Pipeline: name → ChatGPT image2.0 sketches → Claude Design final. Style/palette deferred until sketches surface direction.

---

## Bundle ID + rename propagation

### Q1: Bundle identifier (逆 DNS) 采哪种模式？

| Option | Description | Selected |
|--------|-------------|----------|
| dev.<finalname>.app (Recommended) | macOS personal-developer convention; matches ROADMAP.md spec | ✓ |
| me.r1ckyin.<finalname> | Apple-recommended `me.*` personal namespace | |
| io.github.r1ckyin.<finalname> | GitHub subdomain convention; globally unique | |

**User's choice:** dev.<finalname>.app

### Q2: GitHub repo + 本地路径要不要跟名字一起改？

| Option | Description | Selected |
|--------|-------------|----------|
| 全部同步改 (Recommended) | Atomic rename of GitHub repo + local path + all references | ✓ |
| 只改 GitHub repo, 本地路径不动 | Avoid local IDE/shell-history disruption | |
| 两者均不改 — 仅换 app name + bundle ID | Keep `learn-os` as project codename indefinitely | |

**User's choice:** 全部同步改

### Q3: 重命名的全面性 — spike 产物要不要一起同步？

| Option | Description | Selected |
|--------|-------------|----------|
| 原子 100% 重命名 (Recommended) | spike-findings skill renamed; spike 002 bundle id reference updated | ✓ |
| 前向性改 — 已完成 spike 产物保持原状 | Historical artifacts retain `learn-os`; only Phase 0+ uses new name | |

**User's choice:** 原子 100% 重命名

---

## Claude Design iteration cadence

### Q1: 图标的迭代节奏 — 出多少轮不同方案才定稿？

| Option | Description | Selected |
|--------|-------------|----------|
| ChatGPT 6-8 草图 → Claude Design 1 轮 → ship (Recommended) | Quick batch ideation, single refinement pass, ≤ 1-day phase | ✓ |
| ChatGPT 1 轮 → Claude Design N 轮 refine | Multi-round refinement (quality ↑, time 2-3 days) | |
| Researcher 调研 best-practice 后再决定 | Plan-phase researcher surfaces 2026 macOS icon workflow norms | |

**User's choice:** ChatGPT 6-8 草图 → Claude Design 1 轮 → ship

---

## Supplementary: README content depth

### Q1: README 该写多详？

| Option | Description | Selected |
|--------|-------------|----------|
| 极简 (Recommended) | 1-line tagline + 1-paragraph What This Is + link to .planning/PROJECT.md | |
| 中等 | + Quickstart + Stack list (Claude context) | |
| 详细 | Full r1ckyIn project-template (bilingual + badges + MIT + Architecture + Status) | |
| Other | User free response | ✓ |

**User's choice:** "这个项目未来要发布所以写详细的根据我现在的项目们来" → detailed README, follow r1ckyIn project-template.

**Notes:** This response triggered an explicit out-of-band ask: amend PROJECT.md OOS-01 to allow future open-source distribution. See "Deferred Ideas" → "OOS-01 amendment" — handled in same Phase 0 PR.

---

## Supplementary: Window title + Dock label

### Q1: macOS Dock + window title 显示什么？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅应用名 — "<finalname>" (Recommended) | Default Tauri behavior; Phase 1+ may add view-aware context | ✓ |
| 应用名 + view-aware 上下文 | "<finalname> — COMP3221 · Lecture 5" | |
| 应用名 + tagline | "<finalname> — USYD CS Companion" | |

**User's choice:** 仅应用名

---

## Supplementary: Git history handling

### Q1: 升取 codename 后, 现有 commit message 里的 'learn-os' 怎么处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留原状, README 加溯源 (Recommended) | History untouched; README footer notes codename history | ✓ |
| Squash 重写所有历史 | git filter-repo rewrite (SHA changes, force-push, hook risk) | |
| 不管 | Codename references survive only in history; no sourcing line | |

**User's choice:** 保留原状, README 加溯源

---

## Claude's Discretion

| Discretion item | Captured as |
|-----------------|-------------|
| README "What This Is" wording | CD-01 |
| Specific badge selection in README header | CD-02 |
| ChatGPT image2.0 prompt phrasing | CD-03 |
| File-rename execution order in PR | CD-04 |

## Deferred Ideas

| Idea | Status / next step |
|------|-------------------|
| **OOS-01 amendment to allow distribution** | **Executed in this Phase 0 PR** (user explicit ask mid-discussion); split OOS-01 — multi-user/collab/commercialization stay out, distribution-as-OSS-portfolio becomes allowed |
| Menubar icon monochrome variant | Defer until menubar widget is actually scoped (Phase 1+) |
| Public release polish (CONTRIBUTING.md, demo video, screenshots, code of conduct) | Separate future phase post-v1 ship |
| Wordmark / typographic logotype (icon + wordmark pair) | Future phase if/when public release polish is pursued |

---
