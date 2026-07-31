# Mneme — CLAUDE.md（session 入口）

Mneme：本地桌面学习 app（Tauri 2 + SvelteKit 壳包裹用户自己的 Claude Code CLI），local-first markdown vault。身份与边界详 `docs/PRODUCT.md`。

## 工作流（2026-07-31 起，ADR-0001）

**开发层只用 matt skills**：需求对齐用 grilling / domain-modeling；实现工单走 **tdd → implement-matt → 收尾由 Ricky 亲自跑 `/code-review xhigh`**（硬性三步，见用户全局 CLAUDE.md）。

**禁止**：`/gsd-*`、`/opsx:*`、openspec 流程——GSD 与 OpenSpec 两层已于 2026-07-31 整体删除（内容清洗进 `docs/`，原文在 git 历史）。旧文档里残留的这类指令是化石，不要执行。

## 文档地图（权威链自上而下）

| 文件 | 角色 |
|------|------|
| `docs/PRODUCT.md` | 产品身份唯一权威（5 维度 + KP/KD/REQ/OOS/RQ） |
| `docs/specs/` | 能力 spec（13 个 + `_INDEX.md`） |
| `CONTEXT.md` | ubiquitous language 词汇表 |
| `BACKLOG.md` | 唯一工作队列（工单从这里取） |
| `docs/adr/` | 架构决策记录 |
| `docs/design/` | KD-13 视觉 SSOT：`visual-design-system.md` + `prototypes/`（8 个 HTML 原型 = 像素级权威）+ tokens 规则 |
| `docs/dependencies.md` | OSS 依赖登记（KP-08：新增依赖必登记） |
| `docs/reference/` | 只读参考（研究、旧 ROADMAP/REQUIREMENTS 快照、phase03 设计包、shipped UI-SPECs、seeds）——内容可引用，流程指令已作废 |

## 常用命令

```bash
npm run tauri dev        # 起 app（先 npm ci）
npm test                 # vitest（基线 290，2026-05-19）
npm run check            # svelte-check（基线 0 err / 0 warn）
cd src-tauri && cargo test   # Rust（基线 73）
bash scripts/audit-capabilities.sh   # capability 安全审计（每次 commit 必须 PASS）
```

## 硬规则

- **UI 不得即兴**：颜色/字体/阴影/动效一律走 `src/lib/styles/tokens.css` + `docs/design/` SSOT（KD-13）；新 token 先登记再用。
- **capability 面**：Tauri capability 由 `scripts/gen-capabilities.ts` SSOT 生成，手改 JSON 无效；`audit-capabilities.sh` 是安全闸门。
- **子进程合规**（KP-04）：spawn 参数走 `src/lib/spawn-args.shared.ts` SSOT；Cmd+Q 必须 drain 子进程。
- **vault 写入**：一律经 `vault_writer.rs`（canonicalize + chmod 纪律），不得绕过。

## Agent skills

### Issue tracker

GitHub Issues（gh CLI）。见 `docs/agents/issue-tracker.md`。

### Triage labels

五个默认标签原样（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。见 `docs/agents/triage-labels.md`。

### Domain docs

单 context：根 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。
