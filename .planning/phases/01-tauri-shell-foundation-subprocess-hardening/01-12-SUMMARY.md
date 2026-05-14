---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 12
subsystem: subprocess-wrapper + capability-layer + visual-hierarchy
tags: [gap-closure, dogfood, session-resume, append-system-prompt, capability-topology, kp-04-defense-extension, css-hierarchy]
dependency_graph:
  requires: [01-01, 01-02, 01-06, 01-09, 01-10]
  provides: [session-continuity-via-resume, chat-rendering-hints-via-append, heading-hierarchy-css, kp-04-3-layer-defense-extended-to-system-prompt-full-replacement, tauri-2-multi-entry-capability-pattern-option-b]
  affects: [01-13 (docs amendment wave 10)]
tech_stack:
  added: []
  patterns:
    - "Optional opts arg with backward-compat default (buildClaudeArgs 3rd-arg)"
    - "Compile-time literal anchored in capability validator via escapeRegex"
    - "Tauri 2 multi-shape capability via dual Command names (Option B)"
    - "Pre-implementation spike for capability-schema runtime questions"
key_files:
  created:
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/spike-tauri-capability-multi-entry.md
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-AMENDMENT-2026-05-14.md
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-12-SUMMARY.md
    - tests/audit/fixture-append-system-prompt.json
    - tests/audit/fixture-system-prompt-rejected.json
  modified:
    - src/lib/spawn-args.shared.ts
    - src/lib/stream-dispatch.ts
    - src/lib/components/ChatPanel.svelte
    - src/lib/components/AssistantMessage.svelte
    - scripts/gen-capabilities.ts
    - src-tauri/capabilities/default.json
    - scripts/audit-capabilities.sh
    - tests/spawn-args.test.ts
    - tests/stream-dispatch.test.ts
    - tests/capability-regex.test.ts
    - tests/audit/test-audit-script.sh
    - tests/audit/fixture-clean.json
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SECURITY.md
decisions:
  - "Task 4a spike — Option B (dual Command names) over Options A/C. Tauri 2 source-code-of-truth proves Option A is structurally impossible (find short-circuits on first matching name); Option B provable correct from upstream Tauri source alone; Option C trades one unverified question (Tauri) for another (Claude CLI sentinel-id semantics) and erodes SESSION_ID_REGEX narrowness."
  - "Single atomic commit (per Task 9 explicit instruction; OVERRIDES execute-plan.md's 'commit each task atomically' rule). Multiple -m flags to bypass feedback_gsd_validate_commit_heredoc memory."
  - "fixture-clean.json refreshed to match the new SSOT regenerator output (pre-plan-01-12 13-arg shape was obsolete); fixture-append-system-prompt.json is byte-identical (semantic redundancy, no test loss)."
  - "Dogfood verification deferred to /gsd-verify-work 1 — the worktree cannot run Mneme interactively for the 9-sample matrix; SUMMARY marks each sample PENDING with exact procedure."
metrics:
  duration_minutes: ~75
  task_count: 10  # 4a + 1 + 2 + 3 + 4b + 5 + 7 + 6 + 8 + 9
  files_touched: 18
  completed: 2026-05-14
---

# Phase 1 Plan 01-12: Session Resume + Chat-Rendering Hints + Heading Hierarchy (code-layer) Summary

**One-liner:** Closes two 2026-05-14 dogfood gaps via session id capture + `--resume` threading
(GAP-1), `--append-system-prompt CHAT_RENDERING_HINTS` literal + h1/h2/h3/hr CSS hierarchy
(GAP-2); extends KP-04 3-layer defense to reject full `--system-prompt` at audit + SSOT layers;
implements Tauri 2 multi-shape capability via dual Command names (Option B from Task 4a spike).

## What changed

### GAP-1 — Session lifecycle continuity (REQ-02 acceptance)

`DispatchState.sessionId: string | null` captures `evt.session_id` from the first
`system/init` event of every fresh `claude --print` subprocess. `ChatPanel.sendPrompt` reads
that field and picks one of two Tauri Command names (`claude-bin-fresh` on prompts where
`sessionId === null`, `claude-bin-resume` otherwise), invoking
`buildClaudeArgs(prompt, scratch, { resumeSessionId, appendSystemPrompt: CHAT_RENDERING_HINTS })`.
Claude now retains memory of prior turns inside one app-session.

The titlebar dot lifecycle was also reshaped per A-16 (which clarifies + supersedes A-10):
`setStatus("connecting")` fires at `onMount` (not per-prompt); `setStatus("disconnected")`
fires at EXACTLY four enumerated sites — `onDestroy`, `cmd.on("error")`,
spawn-or-register catch, and (no-op) scratchDir early-return path — and is REMOVED from
`teardown()`. Per-prompt subprocess natural close no longer flips status.

### GAP-2 — Output rendering parity with Claude.ai web (REQ-05 sanitize + visual hierarchy)

- `--append-system-prompt CHAT_RENDERING_HINTS` is always passed; the literal is anchored
  byte-for-byte via `escapeRegex(CHAT_RENDERING_HINTS)` in the capability validator regex
  so SSOT drift fails audit check 1 immediately.
- `AssistantMessage.svelte` h1/h2/h3 differentiated: 21px / 17.5px / 15.5px with explicit
  vertical-rhythm margins; new `hr` rule (1px soft-border, 28px vertical margin) replaces
  the invisible default browser inset 3D line.

### Tauri 2 capability — Option B per Task 4a spike

Task 4a's 30-min source-of-truth probe (against `tauri-plugin-shell-2.3.5` at
`~/.cargo/registry/src/...`) proved that Tauri's `_prepare` uses
`scopes.iter().find(|s| s.name == command_name)` — short-circuit `find` on first matching
name — so Option A (two `allow` entries under the same name) is **structurally impossible**:
the second entry would be silently shadowed by the first. Option B (two `allow` entries
under DISTINCT names) is provable correct from Tauri source alone, preserves
SESSION_ID_REGEX narrowness, and avoids Option C's unverified Claude-CLI-sentinel-id
question. Capability JSON now registers `claude-bin-fresh` + `claude-bin-resume` under
both `shell:allow-spawn` and `shell:allow-execute`.

### KP-04 3-layer defense extended

New audit checks 4b + 9 reject standalone `--system-prompt` (full replacement) at the
validator AND SSOT layers. Phase 9 REQ-17 (per-course rules) is the documented promotion
path. Phase 1 stays at append.

## Before / After test numbers

| Suite | Before plan 01-12 | After plan 01-12 |
|---|---|---|
| vitest total | 147 / 147 | **177 / 177** (+30 net new; +31 raw new, -1 superseded by Option-B-aware rewrite) |
| spawn-args.test.ts | 20 | 32 (+12) |
| stream-dispatch.test.ts | 12 | 18 (+6) |
| capability-regex.test.ts | 11 | 24 (+13 — Option B restructure replaced 2 baseline tests but net new is +13) |
| svelte-check | 0 / 0 | 0 / 0 |
| audit-capabilities.sh | PASS | PASS (with 2 NEW checks 4b + 9) |
| test-audit-script.sh | 5 / 5 | **7 / 7** (2 NEW fixtures: append-system-prompt, system-prompt-rejected) |
| cargo test | 3 / 3 (baseline; not re-run inside this worktree — no Rust files modified by plan 01-12) | unchanged |
| gen-capabilities idempotent | n/a | SHA1 stable across regen pairs |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `fixture-clean.json` was the old 13-arg shape**

- **Found during:** Task 4b
- **Issue:** After regenerating `src-tauri/capabilities/default.json` for Option B,
  `fixture-clean.json` (used by `test-audit-script.sh` as the "matches SSOT" positive case)
  still held the pre-plan-01-12 13-arg shape. With check 1 (SSOT drift) comparing
  dry-run-output vs disk, the swapped-in fixture-clean would now fail check 1 with the
  new SSOT, and the harness's expected exit code for that case is 0.
- **Fix:** Refreshed `fixture-clean.json` to match the new regenerator output verbatim.
  This makes it byte-identical to the new `fixture-append-system-prompt.json` — semantic
  redundancy but no test loss; the two fixtures test slightly different intents.
- **Files modified:** `tests/audit/fixture-clean.json`

**2. [Rule 2 - Critical] Existing `tests/capability-regex.test.ts` asserted the OLD single-allow-entry shape**

- **Found during:** Task 4b RED-phase test rewrite
- **Issue:** Three baseline tests asserted "has shell:allow-spawn with exactly one allow
  entry for claude-bin" + "13 validators" + "spawn-args and execute-args identical". With
  Option B, the JSON has TWO entries with distinct names (`claude-bin-fresh` +
  `claude-bin-resume`). The old assertions would fail without restructure.
- **Fix:** Restructured the existing describe blocks into Option-B-aware shape (one
  describe per Command name + a structural-topology describe at the top). Per-shape
  validator counts (15 / 17) replace the single 13-count assertion; spawn-vs-execute
  identity is preserved as a per-shape check.
- **Files modified:** `tests/capability-regex.test.ts`

**3. [Rule 1 - Bug] Pre-existing audit "verification grep" returns false positive on docstring**

- **Found during:** Task 8 final verification matrix
- **Issue:** `grep -nE '"--bare"|--bare' src/lib/spawn-args.shared.ts` returns exit 0
  (match) because the source contains a docstring line `// - --bare MUST be ABSENT...`.
  The plan's success-criterion grep is overly broad — it conflates "literal flag in argv"
  with "any substring match including docstrings".
- **Fix:** No code change. The OPERATIONAL KP-04 check is unchanged — `grep -nE
  '"--bare"' src/lib/spawn-args.shared.ts` returns no matches (no quoted-string literal),
  and the existing test `tests/spawn-args.test.ts` pins `args.filter((a) =>
  a.includes("bare"))` returns length 0 at runtime. The audit script's check 4 grep is
  also narrower (`"validator":\s*"[^"]*bare[^"]*"` — JSON-validator-string-only). The
  docstring match is a false positive at the verification-grep layer only; runtime safety
  is intact.
- **Note:** Documented here so future planners know the "any-bare-substring" grep needs
  refinement if it's re-used as a strict gate. The narrower `"--bare"` quoted-literal
  grep is the load-bearing check.

### Out-of-scope items

- **Manual dogfood verification (9 samples × 3 flows)** — Worktree mode cannot run Mneme
  interactively for the full sample matrix. SUMMARY records each sample as PENDING with
  the exact procedure; `/gsd-verify-work 1` post-merge is the responsible verification
  step.
- **cargo test re-run** — Plan 01-12 modifies zero `.rs` files. Baseline 3/3 carried
  forward from Phase 1 closeout (01-SECURITY.md verification baseline).

## Dogfood log

**Status:** PENDING — `/gsd-verify-work 1` post-merge is the responsible verification step.
Each sample below carries the exact reproduction procedure so a human-in-the-loop verifier
can mark PASS/FAIL.

### Flow 1 — Session continuity (GAP-1)

Acceptance: ≥2/3 sample replies preserve the prior turn's fact AND ≥2/3 devtools-console
`[claude:init]` log lines share the prior turn's session id.

| # | Procedure | Expected outcome | Status |
|---|-----------|------------------|--------|
| A | `npm run tauri dev` → send "我叫 Ricky" → wait → send "我叫什么?" | reply contains "Ricky"; devtools `[claude:init]` shows same session id on prompts 1 & 2 | PENDING — human verification required |
| B | `npm run tauri dev` → send "我的猫叫 Mochi" → wait → send "我的猫叫什么?" | reply contains "Mochi"; same session id across both prompts | PENDING — human verification required |
| C | `npm run tauri dev` → send "我今天在写 Phase 1" → wait → send "我今天在做什么?" | reply mentions "Phase 1"; same session id across both prompts | PENDING — human verification required |

### Flow 2 — No ASCII fallback after KaTeX (GAP-2 part 1)

Acceptance: ≥2/3 sample replies show pure-KaTeX math with NO ASCII-fallback echo.

| # | Procedure | Expected outcome | Status |
|---|-----------|------------------|--------|
| A | `npm run tauri dev` → send "什么是泰勒展开式?" | reply renders $$...$$ KaTeX block; NO ASCII duplicate on the next line | PENDING — human verification required |
| B | `npm run tauri dev` → send "推导一下勾股定理" | reply renders KaTeX; no plain-text math echo | PENDING — human verification required |
| C | `npm run tauri dev` → send "写出黎曼和的极限定义" | reply renders KaTeX; no plain-text math echo | PENDING — human verification required |

### Flow 3 — Heading hierarchy + hr visibility (GAP-2 part 2)

Acceptance: ≥2/3 sample replies render distinct h1/h2/h3 sizes AND ≥2/3 `---` separators
render visible hr.

| # | Procedure | Expected outcome | Status |
|---|-----------|------------------|--------|
| A | `npm run tauri dev` → send "分三层标题介绍什么是动态规划 (用 # / ## / ### markdown)" | h1 (~21px) > h2 (~17.5px) > h3 (~15.5px) with ≥2px scale step between adjacent levels | PENDING — human verification required |
| B | `npm run tauri dev` → send "用三级 markdown 标题讲解什么是图灵机" | three distinct sizes; visible vertical rhythm | PENDING — human verification required |
| C | `npm run tauri dev` → send "三级标题写一份贝叶斯定理学习笔记，并用 --- 分隔章节" | three distinct sizes AND visible `---` hr separators | PENDING — human verification required |

### Visual verification pointer

Screenshots are NOT captured in the executor's worktree pass — `/gsd-verify-work 1` will run
the dev shell + `npm run gsd-dev-screenshot` per sample.

## Patterns reaffirmed

1. **SSOT split: `.shared.ts` (browser-safe) + `.node.ts` (Node-only) with audit gate** —
   new exports (`BuildOpts`, `SESSION_ID_REGEX`, `CHAT_RENDERING_HINTS`,
   `SYSTEM_PROMPT_MAX_LEN`) live in `.shared.ts`; Node-only code unchanged.

2. **Capability JSON ↔ TS SSOT regen-idempotent contract** — `gen-capabilities.ts`
   produces SHA1-stable output across regen pairs; audit check 1 enforces.

3. **3-layer KP-04 OAuth compliance defense** — extended to ALSO reject full
   `--system-prompt` at the validator (check 4b) + SSOT (check 9) layers. Three defenses
   for "this MUST NOT happen": SSOT can't emit it, validator rejects it, audit grep
   refuses to land it.

4. **Spike-then-implement for unverified-runtime assumptions** — Task 4a's source-code-of-
   truth probe (against the actual `tauri-plugin-shell-2.3.5` Rust source pinned by
   Cargo.lock) bounded the cost of validating Tauri 2 multi-entry capability behavior
   BEFORE committing to a capability topology.

## Patterns introduced

1. **Optional opts arg with backward-compatible default** —
   `buildClaudeArgs(prompt, scratchDir)` continues to work for any caller that hasn't
   migrated; new signature is `buildClaudeArgs(prompt, scratchDir, opts: BuildOpts = {})`.
   Reduces blast radius of SSOT change.

2. **Compile-time literal anchored in capability validator via escapeRegex** —
   `CHAT_RENDERING_HINTS` is a fixed string; its validator regex is
   `^${escapeRegex(CHAT_RENDERING_HINTS)}$`. Any drift between the SSOT literal and the
   validator literal fails audit check 1 (SSOT drift) immediately. Pattern is reusable
   for any future fixed-string flag value.

3. **Pre-implementation spike for capability schema** — Task 4a's source-code-of-truth
   probe is the new precedent for "Tauri capability behavior is unclear; spike before
   committing JSON." Sub-pattern: when an interactive runtime probe is impractical
   (worktree mode, cross-agent isolation), reading the pinned dependency source code from
   `~/.cargo/registry/src/...` is the equivalent source of truth.

4. **Code-layer / docs-layer split for high-revert-risk plans** — when a plan touches
   both code and many .planning docs AND has an internal spike-gated risk (like Task 4a),
   splitting docs into a follow-on plan (01-13) bounds revert blast radius and lets the
   docs reference the code's committed hashes verbatim.

5. **Tauri 2 multi-shape capability via dual Command names** — when the same binary needs
   to be invoked with two argv shapes (e.g. fresh vs resumed session), register TWO
   `allow` entries under distinct `name`s under a single shell identifier and pick the
   name at call site. The single-name + multiple-allow alternative is structurally
   impossible per upstream Tauri (find short-circuits).

## Surprises

**Tauri 2's `_prepare` uses `find` not `try-each`** — until the Task 4a source probe, the
project carried the unverified assumption that multiple `allow` objects under one
identifier would be tried in order until one validated. Reality (per
`tauri-plugin-shell-2.3.5/src/scope.rs:251-261`): `scopes.iter().find(|s| s.name ==
command_name)` short-circuits on FIRST matching name, then validates against THAT entry
only. Second-and-subsequent entries with the same name are dead weight. This makes
Option A architecturally impossible without modifying upstream Tauri. The plan's
decision matrix correctly anticipated this outcome as one of three possibilities; the
spike's value was elevating it from "possible" to "proven from source".

## Known Stubs

None. The two amendments (`A-16` session resume + `A-17` chat-rendering hints + `A-18`
heading hierarchy) wire real behavior — no hardcoded empty values, placeholder text, or
unwired data sources introduced.

## References

- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-AMENDMENT-2026-05-14.md`
  — A-16 / A-17 / A-18 deltas + reconciliation table.
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/spike-tauri-capability-multi-entry.md`
  — Tauri 2.11.1 source-of-truth probe with Decision: Option B.
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SECURITY.md`
  Plan 01-12 footer note — 49-threat register reaffirmed CLOSED.
- Plan 01-11 — documented VOID slot (absorbed by code-review --fix iter-1 BL-02 in
  commit c80054d; reserved for plan-number continuity).
- Plan 01-13-PLAN.md — wave 10 follow-on docs amendment (SPEC.md REQ-02/REQ-05 +
  REQUIREMENTS.md traceability). Reason for the code/docs split: plan-checker H-3 —
  bound the revert blast radius if Task 4a Tauri-multi-entry spike forced redesign; let
  01-13 reference 01-12's committed hashes for traceability.

## Self-Check: PASSED

Verified during Task 8:

- All 17 files in frontmatter `files_modified` exist on disk (confirmed via `ls` /
  `test -f`).
- `npx vitest run` → 177 / 177 passing.
- `npm run check` → 0 errors / 0 warnings.
- `bash scripts/audit-capabilities.sh` → `[audit] PASS`.
- `bash tests/audit/test-audit-script.sh` → 7 / 7 PASS.
- `node --experimental-strip-types scripts/gen-capabilities.ts` → SHA1-stable output
  across regen pairs (idempotent).
- `grep -nE '"--bare"' src/lib/spawn-args.shared.ts src/lib/spawn-args.node.ts` → no
  match (KP-04 layer 1 — quoted-literal narrow grep).
- `grep -E '"validator":\s*"[^"]*bare[^"]*"' src-tauri/capabilities/default.json` → no
  match (KP-04 layer 2).
- `grep -nE '"--system-prompt"' src/lib/spawn-args.shared.ts src-tauri/capabilities/default.json`
  → no match (plan-01-12 layer 3 — full-replacement forbidden).
- Plan-checker constraints met: L-1 (header comment replaced — see
  spawn-args.shared.ts L31-44), H-1 (escapeRegex helper at
  scripts/gen-capabilities.ts:46-50), H-2 (4 setStatus("disconnected") sites enumerated
  in ChatPanel.svelte: onDestroy + cmd.on("error") + spawn-or-register catch + scratchDir
  no-op), H-3 (no SPEC.md / REQUIREMENTS.md edits — those are 01-13's scope), H-4
  (verbatim "A-16 supersedes A-10" clause at AMENDMENT L68-75), M-1 (descriptive fixture
  names: fixture-append-system-prompt + fixture-system-prompt-rejected), M-2 (3-sample-
  per-class dogfood matrix in this SUMMARY), M-3 (commit only under /gsd-execute-phase
  orchestration — this run satisfies that constraint).

Commit hash will be recorded by the orchestrator after the worktree merge.
