---
type: quick-research
slug: claude-design-research
created: 2026-05-08
status: complete
trigger: /gsd-quick — 调研 Claude Design 工具用法 + 最佳实践
---

# Claude Design 调研 — 用法 + 最佳实践

> **触发问题**：mneme Phase 1 ui-phase 阶段产出 UI-SPEC.md（文字契约）但没产出 HTML mockup + 图片资产。用户期望补一步 KP-05 Claude Design 工具实例化。这份调研回答「该工具怎么用」「要不要上传文档」。

---

## 核心结论（TL;DR）

1. **要上传文档，但分两步**：(a) 一次性建 design system 时上传 DESIGN.md；(b) 之后每个 prototype 不用重传，自动继承 design system
2. **DESIGN.md 是社区事实标准**（`VoltAgent/awesome-claude-design`，68 个开源示例），不是 Anthropic 官方格式但已是主流约定
3. **官方推荐提示词结构 = Goal / Layout / Content / Audience 4 段**
4. **Export 关键路径 = Claude Code handoff bundle**（不是 PDF / PNG），直接喂回 claude code 做实施

---

## 1. Claude Design 是什么

- Anthropic Labs 2026-04-17 发布的 Research Preview
- URL：`claude.ai/design`
- 计划：Pro / Max / Team / Enterprise 可用
- 模型：Claude Opus 4.7 驱动
- 定位：「prompt-to-prototype + presentation generator」，挑战 Figma 工作流

UI 结构：左侧 chat 对话 + 右侧 canvas 实时渲染

## 2. 4 种启动方式

| 方式 | 适用场景 | 文件格式 |
|------|---------|---------|
| Text prompt | 从 0 开始 | — |
| Reference images / sketches | 有视觉参考 | PNG / JPG / SVG |
| Document upload | 已有内容文件 | **DOCX / PPTX / XLSX**（PDF / MD 未在官方列表） |
| Web capture tool | 模仿现有网站 | URL → 抓元素 |

**关键限制**：MD 文件走「附件 in chat」，**不是文件上传系统**——但作为 chat attachment 可以正常使用。

## 3. Design System 设置（重要 — 一劳永逸）

入口：`claude.ai/design/#org` 的 "Set up design system" 按钮

**两种上传路径**：
- **直接**：`claude.ai/design/#org` → "Add assets" 区上传 DESIGN.md
- **chat 内**：附 DESIGN.md 在 prototype 消息里 → 提示 `"Create a design system from this DESIGN.md"`

**配完之后的效果**（官方原话）：
> "Every project after that uses your colors, typography, and components automatically."

→ 后续每个 prototype 自动继承，不用每次重设

## 4. DESIGN.md 9 段开源约定

来源：`VoltAgent/awesome-claude-design`（GitHub）

| # | 段 | 描述 |
|---|------|------|
| 1 | Visual Theme & Atmosphere | Setting tone, density, and mood of the scaffold |
| 2 | Color Palette & Roles | Emitting CSS variables with semantic names + hex |
| 3 | Typography Rules | Building the type scale and picking Google Fonts fallbacks |
| 4 | Component Stylings | Generating buttons, inputs, cards, nav with states |
| 5 | Layout Principles | Spacing scale, grid, whitespace rhythm |
| 6 | Depth & Elevation | Shadow tokens and surface hierarchy |
| 7 | Do's and Don'ts | Guardrails Claude respects when generating new screens |
| 8 | Responsive Behavior | Breakpoints, touch targets, collapse behavior |
| 9 | Agent Prompt Guide | Reusable prompts Claude embeds into the generated SKILL.md |

**Claude Design 消费 DESIGN.md 后自动产出**：
- CSS 变量
- Google Fonts substitutes
- preview cards
- component library
- working UI kit
- portable `SKILL.md`（可移植）

## 5. 官方推荐提示词结构

来源：Claude Help Center "Get started with Claude Design"

> "A good prompt includes the goal (what you're building), the layout (how things should be arranged), the content (what information to display), and the audience (who will use it)."

**4 段结构**：
1. **Goal** — 要建什么
2. **Layout** — 如何排列
3. **Content** — 显示什么信息
4. **Audience** — 给谁用

## 6. Refinement 工作流

- inline 评论具体元素
- 直接编辑文字
- 用 "adjustment knobs" 调间距 / 颜色 / 布局
- 让 Claude 把改动 apply 到整个 design

## 7. Export 选项

| 格式 | 适用 |
|------|-----|
| **Standalone HTML** | 浏览器快速 review / 拷到代码仓做视觉参考 ✓ |
| **Claude Code handoff bundle** | **一键传给 claude code 做实施 ✓✓** — 推荐主路径 |
| PDF | 静态展示 |
| PPTX | 转 PowerPoint |
| .zip | 打包导出 |
| Canva | 协作编辑 |

## 8. Claude Code Handoff（最关键的 export 路径）

Anthropic 官方原话：
> "Claude packages everything into a handoff bundle that you can pass to Claude Code with a single instruction."

两个 handoff 选项：
- **Send to local coding agent** — 本地 claude code 直接接手
- **Send to Claude Code Web** — 网页版 claude code

→ 这是从 Claude Design → Claude Code → 实际代码的官方推荐管道。

## 9. Best Practice 清单（综合 docs + 第三方文章）

### 提示词层面
- ✓ 具体到「2-3 句」「16 行」等可量化数（不要说"简洁"）
- ✓ 用 XML tags 结构化（Anthropic 训练时用 XML）
- ✓ 把指令放 human message，不要堆 system message
- ✓ 3-5 个 few-shot example（复杂任务）

### 视觉资产层面
- ✓ 图片尽量放提示词开头（视觉模型最佳实践）
- ✓ 上传前 resize（平衡清晰度 + 大小）
- ✓ 多上传截图比少上传好

### 工程化层面
- ✓ **先 set up design system，再开 prototype**（一劳永逸）
- ✓ link 你的 codebase（Claude 理解组件 / 架构 / 样式）
- ✓ Export 选 Claude Code handoff bundle，不要选 PDF
- ✓ 用 inline comment 而不是重新写 prompt 改细节

## 10. 我的 mneme case 推荐路径

| 步 | 操作 | 谁做 |
|---|------|------|
| 1 | 把 `01-UI-SPEC.md` 转成 9 段 DESIGN.md（命名 `mneme-DESIGN.md`） | 我可以帮你做 |
| 2 | claude.ai/design → Set up design system → 上传 mneme-DESIGN.md | 你 |
| 3 | New prototype → High fidelity → `mneme-phase-1-shell` | 你 |
| 4 | 4 段结构提示词（Goal: Phase 1 三栏 shell / Layout: 30%-40%-30% + 底部 120px / Content: chat 流 + Stop + 9 unbound 热键 / Audience: 单用户 daily driver） | 你 + Claude Design |
| 5 | 可选：附 spike-002 渲染截图 | 你 |
| 6 | Export → Claude Code handoff bundle 或 standalone HTML | 你 |
| 7 | 资产 → `.planning/phases/01-.../design/` | 你 / 我 |
| 8 | patch 4 plan 的 `<read_first>` 加 design/ 路径 | 我 |
| 9 | `/gsd-execute-phase 1` | 我们 |

## 11. 流程纠偏（防 Phase 2 再踩坑）

后续 6 个 UI-重 phase（2 / 3 / 6 / 8 / 9 / 10）每次都要走 ui-phase + Claude Design 两步。建议在 `r1ckyIn_GitHub/mneme/CLAUDE.md` 加一段约束（待实施）：

```markdown
## KP-05 强制执行点（UI 重 phase）

`/gsd-ui-phase N` 之后、`/gsd-plan-phase N` 之前：
1. 用 UI-SPEC.md 视觉决策喂给 claude.ai/design（High fidelity，design system 已配）
2. Export → Claude Code handoff bundle 或 standalone HTML
3. 资产落到 .planning/phases/{N}-.../design/
4. plan-phase 时 design/ 自动注入相关 task 的 read_first

GSD ui-phase 只产出 UI-SPEC.md 文字契约 — 不替代 claude.ai/design 的视觉实例化。
DESIGN.md 一次性配好（一劳永逸），prototype 每个 phase 配一个。
```

## 12. 已知盲点 / 不确定项

- **PDF / MD 文件上传支持**：官方明确 DOCX/PPTX/XLSX，PDF/MD 未列。MD 实践上能作为 chat attachment 用，但不在「文件上传」入口
- **DESIGN.md 是否能被 Anthropic 直接接受**：不是官方格式，是社区约定。但 awesome-claude-design 仓库的 68 个示例证明社区已成功使用
- **Set up design system 的 30 分钟限制**：官方说 "play with Claude Design for 30 minutes" — 不确定是 free trial 限制还是 generation 时长限制（你 Pro/Max 应该没限制）
- **handoff bundle 的具体文件结构**：官方没详细文档化，需要 export 一次才知道里面什么

---

## Sources（调研引用）

- [Get started with Claude Design — Claude Help Center](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)
- [Introducing Claude Design by Anthropic Labs — Anthropic 官方公告](https://www.anthropic.com/news/claude-design-anthropic-labs)
- [Anthropic launches Claude Design — TechCrunch (2026-04-17)](https://techcrunch.com/2026/04/17/anthropic-launches-claude-design-a-new-product-for-creating-quick-visuals/)
- [Anthropic just launched Claude Design — VentureBeat](https://venturebeat.com/technology/anthropic-just-launched-claude-design-an-ai-tool-that-turns-prompts-into-prototypes-and-challenges-figma)
- [Hands-On with Anthropic Labs' Claude Design Preview — MacStories](https://www.macstories.net/stories/hands-on-with-anthropic-labs-claude-design-preview/)
- [What Is Claude Design? — DataCamp](https://www.datacamp.com/blog/claude-design)
- [Claude Design Complete Guide for Non-Designers (2026) — BuildFastWithAI](https://www.buildfastwithai.com/blogs/claude-design-anthropic-guide-2026)
- [Complete Guide to Claude Design — Tosea](https://tosea.ai/blog/claude-design-complete-guide)
- [Claude AI Design Workflow Full Tutorial — Medium / Bootcamp](https://medium.com/design-bootcamp/claude-design-complete-guide-figma-to-frontend-d94dcc06320c)
- [How to Use Claude Design for UX/UI — DesignerUp](https://designerup.co/blog/how-to-use-claude-design-for-ux-ui/)
- [Claude Design Guide: Prototype Export to Figma and Canva — Geeky Gadgets](https://www.geeky-gadgets.com/how-to-use-claude-design-tips/)
- [Claude Design Explained — DigitPatrox](https://digitpatrox.com/claude-design-explained-features-pricing-and-the-new-ai-handoff-workflow/)
- [Claude Design admin guide for Team and Enterprise plans — Claude Help Center](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)
- [VoltAgent/awesome-claude-design — DESIGN.md 9 段格式 + 68 示例](https://github.com/VoltAgent/awesome-claude-design)
- [Anthropic Prompt Engineering Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

---

## SUMMARY

**调研完成**。核心答案：要上传文档（DESIGN.md → 一次性建 design system），之后 prototype 用 Goal/Layout/Content/Audience 4 段提示词。Export 路径用 Claude Code handoff bundle，从 Claude Design 一键过渡到 Claude Code 实施。

**下一步**（用户决策）：
- **A**：让我把 UI-SPEC.md 转成 mneme-DESIGN.md（推荐 — 你直接拿去上传）
- **B**：我先写 prototype brief（4 段结构），DESIGN.md 你自己手动改
- **C**：你只要这份调研，DESIGN.md + brief 都自己来
- **D**：把 KP-05 流程纠偏加进 mneme/CLAUDE.md
