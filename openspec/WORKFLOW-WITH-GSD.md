# OpenSpec × GSD 协作工作流

> Mneme 项目内 OpenSpec 和 GSD 两套系统的协作契约。**跨 phase 长期参考。**
> 最后更新：2026-05-12（首次确立）

---

## 协作模型

```
openspec（合同层 / 跨 phase 永久）          GSD（执行轨道 / phase 内瞬态）
─────────────────────────────              ──────────────────────────────
/opsx:propose <change>
   → openspec/changes/<name>/
       proposal.md
       tasks.md
       design.md
       spec-delta.md（说"specs/<cap>.md 要改成什么"）
                                     ─→    /gsd-spec-phase N（可选）
                                           → .planning/phases/NN/SPEC.md
                                             （该 phase 的验收切片）
                                     ─→    /gsd-plan-phase N
                                           读 specs/<cap>.md
                                              + proposal.tasks
                                              + phase SPEC.md
                                           → PLAN.md（依赖图 + wave + TDD）
                                          ↓
                                           /gsd-execute-phase N
                                           → atomic commits 干代码
                                          ↓
                                           /gsd-verify-work N
                                          ↓
                                           /gsd-ship N
                                          ↓
                                           手动 sync tasks.md（⚠ 关键）
                                              把每个 - [ ] 改成 - [x]
                                          ↓
                                           /gsd-extract-learnings N
                                          ↓
   /opsx:archive  ←────────────────
   ← spec-delta 应用到 openspec/specs/<cap>.md
   ← changes/<name>/ 移到 changes/archive/<name>/
```

---

## 三个关键 nuance

### 1. change ↔ phase 是 N:N，不是 1:1

一个 phase 可消费多个 capability spec：
```
Phase 1 ─┬─ claude-subprocess
         ├─ layout-shell
         └─ agentic-search
```

一个 change 可跨多 phase 实施：
```
visual-design-system 改美学 ─┬─ Phase 1
                            ├─ Phase 2
                            └─ Phase 3
```

早期 phase（Phase 1）大致 1:1，后期复杂 phase 会破。

### 2. spec SSOT 在 archive 才更新

propose 阶段写的 `spec-delta.md` 描述"specs/<cap>.md 要改成什么"，**但不立即改**。
执行期间 specs/ 文件保持旧版（last-archived 状态）。
直到 `/opsx:archive` 才把 delta 应用到 specs/<cap>.md。

含义：phase 实施中读 specs/ 是旧契约，新契约在 `openspec/changes/<name>/spec-delta.md`。

### 3. GSD `/gsd-spec-phase` 跟 openspec specs/ 互补不替代

| 文档 | 性质 | 生命周期 |
|---|---|---|
| `openspec/specs/<cap>.md` | 跨 phase 能力契约 SSOT | 永久 |
| `.planning/phases/NN/SPEC.md` | 该 phase 的验收切片 + 任务边界 | phase 结束后归档到 `.planning/phases/NN/` |

phase SPEC.md 引用 capability spec，是 capability spec 在该 phase 的**应用切片**。两者共存。
plan-phase 时**两份都读**。

---

## Phase 命令真实语法（避坑）

⚠ r1ckyIn `CLAUDE.md` L2 的 v1.40 对照表写 `/gsd-phase add/insert/remove` subcommand 风格是**文档 bug** — skill 源码（`~/.claude/skills/gsd-phase/SKILL.md`）从首版就是 **flag 风格**。按下表用：

| 意图 | 命令 |
|---|---|
| 加新 phase 到 milestone 末尾 | `/gsd-phase <kebab-slug>` **（无 flag）** |
| 在 Phase N 之后插入 decimal phase（N.1） | `/gsd-phase --insert <N> <kebab-slug>` |
| 删除 phase + 后续 renumber | `/gsd-phase --remove <N>` |
| 改 phase 字段 | `/gsd-phase --edit <N> [--force]` |

`<slug>` 必须 kebab-case 英文（ROADMAP / STATE 按 slug 生成）。错写 `/gsd-phase insert 1.5` 会被解析成"加一个名字为 `insert-1-5` 的 phase 到末尾"。

---

## 完整 lifecycle 实操步骤

```bash
# 1. propose — 描述要变啥
/opsx:propose <change-name>
# 产出：openspec/changes/<name>/ 四份文件

# 2. （可选）phase 层 spec
/gsd-spec-phase N
# 产出：.planning/phases/NN/SPEC.md

# 3. plan — GSD 接力点
/gsd-plan-phase N
# 读 specs/ + changes/<name>/ + phase SPEC.md
# 产出：PLAN.md（依赖 / wave / TDD 标记）

# 4. execute — 真干代码
/gsd-execute-phase N
# atomic commits + branch / PR

# 5. verify & ship
/gsd-verify-work N
/gsd-ship N

# 6. ⚠ 关键：手动 sync tasks.md
sed -i '' 's/- \[ \]/- [x]/g' openspec/changes/<name>/tasks.md
# 或逐项手动勾
# 原因：apply 替代为 GSD 后 tasks checkbox 不会自动更新

# 7. extract learnings
/gsd-extract-learnings N

# 8. archive — 回写 specs/ SSOT
/opsx:archive
# spec-delta → specs/<cap>.md
# changes/<name>/ → changes/archive/<name>/
```

---

## 为啥不用 `/opsx:apply`

`/opsx:apply` 的实际职责（读 `.claude/commands/opsx/apply.md` 确认）：
1. 读 status + instructions + contextFiles
2. 按 tasks.md 干代码（LLM 任务驱动 — 跟 GSD execute-phase 同性质）
3. **每个 task 完成时把 `- [ ]` 改成 `- [x]`** ← 唯一独有动作
4. 不做 atomic commit / branch / PR / verify / extract-learnings

**功能重叠 90%**，GSD 在 commit / verify / ship / learnings 几个维度更强。
唯一损失 = tasks.md checkbox 不自动同步 → **第 6 步手动 sync** 补上。

---

## 未确认 / 需 dogfood 验证

第一次跑 lifecycle 时验证：

- [ ] **archive 是否要求 tasks 全 checked 才放行**（如果是 → step 6 不能省）
- [ ] **spec-delta 在 archive 时怎么 merge 到 specs/<cap>.md**（覆盖 / 三方合并 / 还需要 review？）
- [ ] **tasks.md sync oneliner 是否有效**（`sed` macOS BSD vs GNU 行为）
- [ ] **GSD phase SPEC.md 跟 openspec changes/<name>/spec-delta.md 内容重叠时怎么 resolve**

关掉这个 todo：`.planning/todos/pending/2026-05-11-post-phase-01-agentshield-runtime-decision.md` 里的前置条件 "first OpenSpec lifecycle dry-run"。

---

## change 粒度分类

| 粒度 | 例子 | propose 时机 |
|---|---|---|
| 新 capability | `add-voice-input` | 整个 capability 准备实施时（前置 phase 完成）|
| 既有 capability 的 amendment | `add-subprocess-prewarming` | phase 中发现 finding 后 |
| 横切多 capability | `migrate-design-system-to-anthropic-v2` | 偶发，跨多 phase 协调 |
| 纯 spec 文档修订（没代码） | `clarify-multi-session-resume-semantics` | 决策线 close 时（thread → propose）|

---

## 何时**不**走 lifecycle

- 当前 spec 抽取（PROJECT.md → specs/<cap>.md 重组）— 无变更 delta，直接 Write specs/ 文件
- spec 内部排版 / 错字修正 — 直接 Edit specs/<cap>.md
- 临时 phase 内决策（不影响其他 phase）— 用 GSD CONTEXT.md 记录足够

走 lifecycle 的门槛 = **有 spec 变更 + 影响后续 phase 实施**。

---

## Cross-ref

- 早期想法收纳 → `/gsd-capture --seed/--note` → `.planning/todos/pending/`
- 跨 session 调查线 → `/gsd-thread <desc>` → `.planning/threads/`
- spec 切分草案 → `openspec/specs/_INDEX.md`
- spec SSOT → `openspec/specs/<cap>.md`
- 活跃 change → `openspec/changes/<name>/`
- 历史 change → `openspec/changes/archive/<name>/`

---

*生命周期升级路径：capture（备忘） → thread（调查线） → propose（变更提案） → apply（由 GSD 接管） → archive（回写 SSOT）。不强制每条都走完，按成熟度跳级。*
