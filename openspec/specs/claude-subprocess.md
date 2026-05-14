# claude-subprocess

> **能力域**：Tauri 2 壳通过 `tauri-plugin-shell` 启动本机 `claude` CLI 子进程，stream-json 解析、tool-use roundtrip、subprocess 生命周期管理。**整个项目的命脉** — 没有它就没有 agent capabilities / MCP / tool use。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 1 EXECUTING — 8/9 plans 完成，01-07 dogfood checkpoint 因 window-drag blocker pause
**实现状态**：**partial** — spike 002 已 validated 端到端 demo（Tauri 2 + SvelteKit + claude subprocess + 流式 chat + markdown + KaTeX + tool-use roundtrip）；Phase 1 productionize 中

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-02** — Tauri shell spawns local `claude` CLI as subprocess
- **KD-01** — Stack: Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell
- **KD-02** — Frontend libraries: marked + KaTeX + DOMPurify + Svelte 5 runes
- **KD-03** — Rust toolchain ≥ 1.88（pinned via `rust-toolchain.toml`）
- **KP-04** — Compliant subprocess wrapping（用户自己的 claude CLI + 自己的订阅，no token theft）
- **KD-12** — `claude-code-parser` (MIT) as vendored reference, NOT npm dependency

**Phase 1 finding（2026-05-11，新发现）**：app 启动后 claude 子进程**不预热** → 用户首条消息冷启动慢（spawn + claude CLI 启动 + 首次 model API call 串联）。新增预热约束（见下方实施约束 §6）。

---

## 评估过的备选（What we considered）

| 候选 | License | Tech stack | 主要属性 | 决定 |
|------|---------|------------|---------|------|
| **当前方案：subprocess + stream-json** | n/a | Tauri 2 + tauri-plugin-shell + claude CLI | spawn `claude --print --output-format stream-json ...` → JSONL 行解析 → 按 type 分派 | ✅ 已采用（spike 002 validated） |
| **opcode (getAsterisk/opcode)** | AGPL-3.0 | Tauri 2 + React 19 + Rust | 同款架构最强参考（21.7k stars） | ⛔ AGPL 污染 — 只读参考，不复制代码 |
| **TOKENICODE (yiliqi78)** | Apache-2.0 | Tauri 2 + React 19 + TS 5.8 + Zustand 5 | spawn + NDJSON streaming + thinking/writing/tool 阶段 | ✅ 强参考；借鉴 `useStreamProcessor.ts` 的 `finalizeOnce` + `control_request` 模式（D-21） |
| **claude-code-gui (markes76)** | MIT | Electron 31 + React 18 | **不 spawn subprocess** — tail `~/.claude/projects/*.jsonl` 文件 | 📝 mental fallback — 不切主路（会失去 `--add-dir` / `--system-prompt` 等参数控制） |
| **claude-code-parser (udhaykumarbala)** | MIT | Pure TS, zero deps, 9KB | 标准 stream-json NDJSON parser | 📝 **vendored 不 npm install**（KD-12）— 项目长时间无更新 schema 已落后 |
| **claude-code-sdk-ts (instantlyeasy)** | MIT | TS SDK | 链式 API；**不 spawn subprocess**，仅委托 CLI 认证 | ❌ 不适用 — 我们就是要 spawn |
| **siteboon/claudecodeui** | AGPL-3.0 | Web (Node + React + Vite) | web 架构，不是 desktop | ⛔ AGPL + 错误架构方向 |
| **CodePilot (op7418)** | BSL-1.1 | Electron + Next.js | 多模型 agent | ⚠ BSL 个人免费商用付费 — 只读参考 |
| **Electron 整体替代** | n/a | Electron + 任意前端 | 同 opcode 但用 Electron | ❌ Intel Mac 2019 不稳定（memory `feedback_electron_avoid`）；体积 15× Tauri |

---

## 否决理由（Why we said no）

- **opcode / claudecodeui (AGPL)**：AGPL-3.0 是二进制分发污染源。即使个人使用 OK，但 PROJECT.md OOS-01 允许未来 OSS portfolio release，AGPL 会污染整个 mneme。**读不抄**。
- **claude-code-gui 文件 tail 模式**：失去 `--add-dir <vault>` / `--append-system-prompt` / `--resume` 等参数控制。这些是 vault scope / per-course rules / multi-session 的实现基础，不能放弃。
- **claude-code-sdk-ts**：它不 spawn subprocess，依赖 CLI 已有认证。和"自己 spawn 控制生命周期"目标方向相反。
- **Electron**：Intel Mac 2019 不稳定；binary 体积 15× Tauri；默认 Chromium 渲染违和 KP-09 美学家族。
- **HLS 抓流 / OAuth token 提取**：违反 Anthropic 2026.02 ToS / KP-04。OpenClaw 式方案已被 Anthropic 明确 ban。

---

## 实施约束（Constraints when implementing）

### 1. 命令行参数（locked by spike 002）

```
claude --print \
       --permission-mode bypassPermissions \
       --output-format stream-json \
       --include-partial-messages \
       --verbose \
       <prompt>
```

- `--print` 非交互，子进程发完即退
- `--permission-mode bypassPermissions` 默认放开（settings 可改 + 显式 user warning）
- `--output-format stream-json` NDJSON 流式
- `--include-partial-messages` token 级流式
- `--verbose` 含 system events（必需，否则收不到 cost 等元数据）

### 2. 子进程生命周期（locked by Phase 1 plans 01-01..01-04）

完整 Rust 状态机：
- **spawn** `tokio::process::Command` + stdin/stdout pipe
- **pause** UI 侧 stop 按钮（D-21）→ Rust 发 SIGSTOP 或丢弃 stdin
- **kill** `libc::killpg(pgid, SIGTERM)` → 2.5s drain → `SIGKILL` 兜底
- **PGID kill** subprocess + 衍生 tool 进程都拿到（防 zombie，Pitfall 1）
- **Cmd+Q drain** `CloseRequested` + `ExitRequested` 双 hook 并集 → AppleScript-driven 测试守门（Phase 1 cycle-2 HIGH-2 fix）
- **2.5s 内 PID drain 到 0** lifecycle harness 守门（cycle-2 absorbing）

### 3. Stream-json 解析（locked by spike 002 + D-21）

- NDJSON 一行一事件，按 `type` dispatch：`system_init` / `user` / `assistant` / `tool_use` / `tool_result` / `result` / `control_request`
- `result` 事件 = session 结束（含 cost + duration + usage）
- **`finalizeOnce` 守门**：防 `result` 后误处理 lingering 事件（D-21，借自 TOKENICODE）
- 解析层：vendored `claude-code-parser` (`vendor/claude-code-parser/`) — copy source + LICENSE + VENDOR.md（A2 决定，drop tests）

### 4. 前端渲染（locked by KD-02 + spike 002）

- 流式 text 增量 append 到 Svelte 5 `$state` runes
- markdown 渲染：`marked` 在 `result` 后整体重渲染（不是每 token）
- 数学：KaTeX `renderToString` paint-time，**不**做 first-class block
- HTML 注入安全：DOMPurify 强制（Pitfall 4 — markdown XSS via streaming sanitization gap）
- UI 流式信号：仅 streaming dot + dev console.log TTFT/event count/duration（D-21，不做生产 telemetry）

### 5. Capability 边界（locked by Phase 1 cycle-2）

- **spawn-args SSOT** `spawn-args.ts` 输出 `.shared` 和 `.node` 分版（cycle-2 HIGH-1 fix）→ Vitest 加 browser-safety grep-guards
- **prebuild gen-capabilities.ts** 生成 Tauri `capabilities/*.json` + diff audit (B2)
- **CSP nonce** 每次响应 random nonce（plan 01-08）
- **wildcard 禁用** capability 不允许 `*` 通配 path（Pitfall 2）

### 6. ⚡ 预热约束（2026-05-11 新增，Phase 1 finding）

**问题**：实测 app 启动后 claude 子进程**懒加载** — 用户没发消息前不 spawn。首条消息发出时才 spawn → 用户感知冷启动慢（spawn + claude CLI 启动 + 首次 model API call 串联）。

**新增契约**：
- app 启动时即 spawn **一个 idle subprocess**（不阻塞 UI 渲染 — 主线程之外）
- **idle 状态**：subprocess 待命，stdin 不写内容；不消耗 API token（只是 CLI 已加载）
- **首次发送 attach**：用户第一条 prompt 到达时直接写入已有 idle subprocess stdin，省去 spawn 延迟
- **资源边界**：idle subprocess 内存占用待 Phase 1 / Phase 2 实测（如 >100MB 考虑改 warm pool 触发条件）

**未确定的实现细节**（plan-phase 决定）：
- 1:1 default session 预热 vs warm pool（先准备 1-2 个 spare）？
- multi-session 每个新 session 是否走预热？默认 yes，但首个 session 后预热可延迟到 idle 时段
- 预热失败 fallback：lazy spawn + 显式 loading state

**落地位置**：Phase 1 收尾（如 dogfood 痛点排第一）或 Phase 2 plan（如 vault setup 优先）

### 7. 成本控制（Pitfall 3 — API cost runaway）

- **cost meter** UI 显示当前 session cumulative cost（`result` 事件的 `total_cost_usd`）
- **cost cap kill switch** settings 可设单 session 上限（默认 $5）；超过自动 kill subprocess + 通知 user
- **agent loop guard** 单 turn 超过 N tool_use（默认 50）警告，超过 2N 自动停（防 infinite loop）

### 8. 与其他 spec 的契约边界

- **multi-session** (#09)：每 session 一 subprocess；`--resume <session-id>` 恢复；预热契约延伸到新 session 创建
- **agentic-search** (#02)：`--add-dir <vault>` 授权 vault 读权限
- **per-course-rules** (#18)：`--append-system-prompt <concat>` 注入 per-course rules
- **anchored-mode** (#17)：**不走 subprocess** — 直接调 Citations API（KD-05 路径独立于 KD-01）
- **interaction-paradigm**（横切 C）：Cmd+Q 是唯一全局快捷键，必须正确触发 subprocess drain

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| Anthropic 发布官方 stream-json SDK | KD-12 整体重评；vendored 路径退役 |
| Claude Code 子进程协议大变（`--output-format` 改名 / stream-json 字段重排） | 解析层重写；调研是否切到 stable schema |
| Tauri 2 致命架构缺陷 | KD-01 整体推翻；考虑 Tauri 3 / 其他壳 |
| 预热反而拖慢启动（idle subprocess 跟主进程抢资源） | 改 lazy spawn + 显式 loading UI |
| 单 session 内存 >500MB / cost >$20 频繁触发 | 改 stateless 单次调用 + 自管会话状态 |
| Anthropic ToS 改变（如禁止 `claude --print` 在非交互场景） | KP-04 路径重评（**最大风险**） |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 1 — Tauri Shell Foundation + Subprocess Hardening
- 计划目录：`.planning/phases/01-tauri-shell-foundation-subprocess-hardening/`
- 5-piece contract：SPEC + CONTEXT + AI-SPEC + UI-SPEC + AMENDMENT-2026-05-09
- 8/9 plans 完成（01-07 dogfood paused）

**关键文档**：
- spike 002 `app/src/routes/+page.svelte` — 端到端 demo
- `spike-findings-mneme` skill — `references/{claude-subprocess,tauri-shell-ui}.md`
- Phase 1 CONTEXT.md `D-01..D-21` — 21 个 implementation decisions
- REVIEWS.md cycle 1+2 (codex) — cross-AI plan review converged HIGH=0
- `.continue-here.md` — window-drag blocker + 4 hypotheses 续上下文

**关联 OSS 依赖**：`.planning/dependencies.md` Group 1（frontend）+ Group 3（Rust backend）+ Group 5（vendored claude-code-parser）

**关联横切 spec**：
- visual-design-system — UI 流式渲染遵守 KP-09 + KD-13 美学
- interaction-paradigm — Cmd+Q 唯一全局热键 + 鼠标优先
- proactive-recall（如保持独立）— 多会话开始事件触发主动召回的 hook 点

**后续 phase 关联**：
- Phase 2（vault + onboarding）— `--add-dir <vault>` 路径
- Phase 3（multi-session + editor）— `--resume` + 多 subprocess
- Phase 5.5 + 7（memory-engine）— subprocess 输出 feed 给 memory pipeline
- Phase 8（per-course-rules）— `--append-system-prompt`
- Phase 9（anchored-mode）— Citations API 分支（不走 subprocess）

---

*抽出于 2026-05-11 · OpenSpec 阶段 2 第 1/7 个 spec · v0.3 切分确认后。*
