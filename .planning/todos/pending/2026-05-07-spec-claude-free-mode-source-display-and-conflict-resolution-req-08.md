---
created: 2026-05-07T06:12:41.050Z
title: Spec Claude (free) mode source display + conflict resolution behavior (REQ-08 / Phase 9)
area: planning
files:
  - .planning/REQUIREMENTS.md (REQ-08)
  - .planning/ROADMAP.md (Phase 9 — Anchored Mode + Citations API)
  - .planning/PROJECT.md (KP-04, F-DIFF-02)
---

## Problem

REQ-08 / Phase 9 已锁定 free ↔ anchored 切换的**机制**（toggle + Citations API + `[file.md:42]` 引用），但**没有定义 free（Claude）模式那一侧的具体行为规范**。当前 spec 只说 "free-mode (Claude with full agent capability)"——这是一个空白，回答时引用怎么显示、知识来源怎么综合、源之间冲突时怎么处理都没规定。

用户在 `/gsd-capture` 中提出了 free 模式的核心行为细化（这是 REQ-08 当前 acceptance 没有覆盖的部分）：

### 1. Free 模式也要在底部带 Sources（不只 anchored 才有）

Claude Code 让 Claude 搜资料时，回答下面会列出 `Sources:`——这是介于两个极端之间的中间路线：
- **NotebookLM**：完全被 Google 泯灭 AI 创造力，只讲书本里的知识
- **DeepSeek 类**：完全放飞自我，没有可追溯来源
- **Claude（mneme free 模式应当）**：用户在左侧栏勾选参考资料 → AI 回答时综合 → 底部列出 `Sources:`

**问题**：当前 REQ-08 的 acceptance 只规定 anchored 模式才有 `[file.md:42]` 引用。Free 模式回答的引用形态没规定——是底部 Sources 列表？还是和 Claude Code 原生输出一致？需要在 Phase 9 plan 中明确。

### 2. Free 模式的多源综合顺序（区别于 NotebookLM 的 USP）

NotebookLM 的弱点：只会讲书本里的知识。Claude 的价值在于**多源综合**：

> 例：税法
> 1. **先**根据自己的知识库对这个知识有大概理解（基础概念）
> 2. **再**搜索最新信息做判断（时效性）
> 3. **再**看用户在左栏勾选的参考文献做补充（场景对齐）

这个"先内置 → 再网搜 → 再用户源"的顺序是 free 模式相对 anchored 模式的核心差异，**应当在 Phase 9 success criteria 里显式写出来**（不然 Plan 阶段会把它当成 NotebookLM 复刻）。

### 3. 冲突解决模式（exam vs real-world）

最关键的一条——当三个源（内置知识 / 网搜最新 / 用户课件）出现分歧时，AI 必须**显式呈现冲突 + 给出场景化建议**，而不是悄悄选一个：

> 示例输出：
> - "现行税法是 X"
> - "课件上记载的是 Y"
> - "考试应该按照课件来"
> - "但如果你（用户）实际生活中遇到这个问题，应该按照最新的来"

这是 mneme 作为**学习工具**（不是 reference tool）的核心 UX——用户既要应付考试，又要在毕业后真正用得上知识。NotebookLM 做不到这一点（它只有课件这一个源），裸 Claude 也做不到（它不知道哪个源在"考试 vs 真实场景"里有优先级）。

### 与现有锁定决策的关系

- **REQ-08 acceptance**（当前）：只规定 anchored 模式行为
- **F-DIFF-02**（PROJECT.md）：locked toggle 存在，但行为未细化
- **Phase 9 Goal**（ROADMAP.md）："学习用 Claude / 复习用 NotebookLM" 是 framing，但 free 一侧的"学习"具体长什么样没定义

这个 todo 不修改 REQ-08 锁定文本，而是在 Phase 9 Plan 阶段（`/gsd-plan-phase 9`）把这三条加到 success criteria 或具体 plan 里。

## Solution

Phase 9 进入 plan 阶段时（在那之前不动 REQ-08）：

1. **加一条 Success Criteria 到 Phase 9**：
   > Free mode answers display `Sources:` footer when user has files checked in left sidebar; sources are referenced in the synthesis (not just listed); the 3-tier reasoning order (built-in knowledge → web search → user-checked refs) is observable in the response when topic warrants it.

2. **加一条 Success Criteria 到 Phase 9（冲突处理）**：
   > When built-in knowledge / latest web info / user course materials conflict on a factual claim, the response explicitly surfaces all three positions and provides scenario-tagged recommendation (e.g., "按考试要求 → 用 X / 按现实应用 → 用 Y").

3. **可能需要的 system prompt 片段**（Phase 9 plan 中具体化）：
   - 当用户在左栏勾选了参考文件时，注入指令："在回答末尾以 `Sources:` 列出实际引用到的文件"
   - 注入指令："当三类源（你的训练数据 / 实时搜索 / 用户提供文件）对事实性问题给出分歧答案时，明示分歧并给出场景化建议（exam / real-world）"
   - 这与 REQ-17（per-course `.mneme/rules/`）协同：用户可以在课程级别覆盖默认 prompt（比如某门课不需要 web search 介入）

4. **决定是否需要新 KD**：是否把"free 模式的 3-tier 综合 + 冲突场景化"提升为 Key Decision（KD-14？）。倾向于**不需要**——这是 REQ-08 的实施细节，不是不可逆的架构选择，留在 Phase 9 plan 即可。

5. **TBD（plan 阶段需决断）**：
   - Sources footer 是 mneme 注入还是依赖 Claude Code 自然输出？
   - 用户没勾选参考文件时，free 模式 web search 的成本控制（KP-04 cost discipline）
   - 与 anchored 模式视觉上如何区分（chat bubble 颜色 + mode chip 已锁定，是否还要区别 sources 段的样式？）
