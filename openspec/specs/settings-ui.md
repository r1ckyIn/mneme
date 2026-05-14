# settings-ui

> **能力域**：设置 / 偏好面板。**self-discoverable** — 单用户场景没有外部 admin，每项设置必须自解释。8 个 category 分类、Cmd+, 入口（macOS 标准）+ 菜单栏入口。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 2
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-14** — Settings / preferences UI

**核心承诺**：personal use = 无 admin，每项设置必须 **self-discoverable** + **self-explanatory**。隐藏 flag = 被忘的功能。

---

## 评估过的备选（What we considered）

| 候选 | 性质 | 决定 |
|------|------|------|
| **当前方案：8 category 集中面板** | General / Vault / Sync / Claude / Privacy / Appearance / Keybindings / Advanced 分类 | ✅ 已采用（REQ-14） |
| **纯 JSON 配置文件** | 用户改 `~/.mneme/config.json` | ❌ 否决 — 不够 self-discoverable；隐藏 flag 风险 |
| **散落嵌入各 pane（vault 设置在文件树侧、chat 设置在 chat pane）** | 上下文化 | ❌ 否决 — 找不到 + 改动重复入口 |
| **macOS Preferences pattern**（独立窗口） | 跟 macOS app 一致 | 📝 借用 — UI/UX 模式参考，但渲染在主窗口 modal（不独立窗口，避免多窗口管理） |
| **CLI-only config**（如 `mneme settings set vault.path ...`） | dev 友好 | ❌ 否决 — 违反 interaction-paradigm 鼠标优先 |
| **`~/.claude/settings.json` 同款 schema** | 跟 Claude Code 一致 | 📝 borrow — 底层格式参考，但 UI 是 modal 不是 JSON edit |

---

## 否决理由（Why we said no）

- **纯 JSON 配置**：用户 6 个月后回来必然忘记某个 flag 在哪 — "future-me" 是核心用户
- **分散嵌入**：违反 self-discoverable — 找设置要先想"它在哪个 pane"
- **独立窗口**：multi-window 增加状态管理负担 + 跟 layout-shell 容器化设计冲突

---

## 实施约束（Constraints when implementing）

### 1. 8 个 category（locked by REQ-14）

| Category | 关键 levers |
|---|---|
| **General** | App language（先锁中文）/ start behavior / update channel |
| **Vault** | Vault path（移动 + re-index 触发 vault-storage 全扫）/ `_source/` 写保护开关（默认开） |
| **Sync** | 已废弃 — external-import 替代；保留 category 但内容改为"手动 import 触发" / "UniBoard 桥" 配置 |
| **Claude** | 默认 `--permission-mode`（`bypassPermissions` 切换 + 显式 warning）/ `--add-dir` scope / model profile passthrough / cost cap 上限（默认 $5）|
| **Privacy** | 数据导出（vault tar）/ memory 三层清空 / Claude API 请求历史 |
| **Appearance** | 主题（light / dark / system）— 必遵守 visual-design-system 美学锁；字体大小；行距 |
| **Keybindings** | **极少** — 大部分鼠标交互（interaction-paradigm）；只保留 Cmd+Q（subprocess drain，不可改）+ 可能加 Cmd+,（开 settings，macOS native）|
| **Advanced** | dev mode 开关 / log level / experimental flag / 重置布局 / 清空 localStorage |

### 2. 入口（locked）

- **Cmd+,**（macOS native settings shortcut）— **interaction-paradigm 例外**，属于 OS 标准约定不算应用快捷键
- 顶部菜单栏（macOS native menu）→ Mneme → Preferences...
- onboarding 完成后弹一次"开了一圈，要不要现在看下设置？"链接

### 3. 渲染方式

- 主窗口内 **modal**（layout-shell 容器内），不开独立窗口
- 左侧 category nav + 右侧设置项
- 渲染时遵守 visual-design-system（米背景、serif body、cubic-bezier 过渡）
- 像素级复刻 prototype（Claude Design Lab 出图）

### 4. 配置持久化

- 底层格式：JSON（`~/.mneme/config.json` 或 macOS `~/Library/Application Support/Mneme/`）
- 改动即时生效（无 "Save" 按钮），重启 app 仍然保留
- 部分改动需重启 app（如切换 `--permission-mode`） — UI 显式提示"需要重启生效"

### 5. cost cap kill switch（与 claude-subprocess 协作）

- settings Claude category 设单 session cost 上限（默认 $5）
- claude-subprocess §7 中已实施 — settings-ui 只是入口配置 + UI 显示
- 超 cap 时弹 modal 通知 user，subprocess 被 kill（不静默）

### 6. 与其他 spec 的契约边界

- **layout-shell** — settings modal 是容器内的一个 overlay；不破坏布局状态
- **visual-design-system**（thread）— 必遵守
- **interaction-paradigm**（thread）— Cmd+, 是例外（OS 标准），其余鼠标
- **vault-storage** — vault path 配置入口；改 vault path 触发 re-index
- **claude-subprocess** — permission mode / model profile / cost cap 入口
- **agentic-search** — `--add-dir` scope 入口（继承 vault path）
- **multi-session** — session 名 / model 默认 / 自动清理策略入口
- **onboarding**（seed）— onboarding 完成态写入 settings
- **memory-engine** — 三层 memory 清空入口（Privacy category）
- **per-course-rules** — 全局 rules toggle（默认开 / 关）入口

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| 设置项超 50 个 | 加搜索框 / 子 category 重构 |
| 多 monitor / detach window 需求 | settings 是否能独立窗口 |
| Anthropic 改 `--permission-mode` 或 cost 计费 | Claude category 重写 |
| 用户实测 Cmd+, 跟其他 OS 应用冲突 | 改成纯菜单栏入口 |
| Privacy 法规变化（用户要 GDPR-like 一键导出 / 删除） | Privacy category 扩展 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 2 — Vault + Onboarding + Settings（Phase 2 三件事打包做）

**关键文档**：
- PROJECT.md REQ-14（含 8 category + 关键 levers 列表）
- PROJECT.md KP-04 — `bypassPermissions` 显式 warning 要求

**关联 OSS 依赖**：
- 无第三方 settings 框架 — Svelte 5 runes + 自实现 modal

**关联横切 spec**：
- **visual-design-system**（thread）— modal / 类型选择器 / toggle 等组件遵守美学锁
- **interaction-paradigm**（thread）— Cmd+, 例外说明

**关联其他 spec**：
- 见 §6 — 几乎所有 v1 spec 都有 settings 入口

**后续 phase 关联**：
- Phase 2 内 onboarding 收尾后立即可用
- Phase 8 — per-course-rules 全局 toggle 在 Advanced 加入
- Phase 10 — fsrs-review schedule 参数（retention rate / fuzz）在 Advanced 加入

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 2 · 2/2 完成*
