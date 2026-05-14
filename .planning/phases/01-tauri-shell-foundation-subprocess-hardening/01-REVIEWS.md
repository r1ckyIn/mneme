---
phase: 1
reviewers: [codex]
reviewed_at_cycle1: 2026-05-09T10:52+10:00
reviewed_at_cycle2: 2026-05-09T11:24+10:00
plans_reviewed:
  - 01-01-PLAN.md
  - 01-02-PLAN.md
  - 01-03-PLAN.md
  - 01-04-PLAN.md
  - 01-05-PLAN.md
  - 01-06-PLAN.md
  - 01-07-PLAN.md
contract_artifacts_supplied:
  - 01-SPEC.md
  - 01-CONTEXT.md
  - 01-AI-SPEC.md (sections 1, 1b, 2, 3 — threat model)
  - 01-UI-SPEC.md (sections 1-300 — SSOT + tokens + chat surface)
  - 01-AMENDMENT-2026-05-09.md (Round 5 prototype handoff alignment, 12 deltas A-04..A-15)
  - 01-RESEARCH.md (sections 1-200 — TDD heuristic + threat enumeration)
  - ROADMAP.md (Phase 1 section)
  - REQUIREMENTS.md (Phase 1 requirements)
review_focus_cycle1:
  - cross-spec drift across SPEC + CONTEXT + AI-SPEC + UI-SPEC + AMENDMENT
  - threat-model completeness (T-1-01..T-1-07)
  - TDD heuristic correctness (RESEARCH §6)
  - wave parallelism integrity (5 waves; W2 has 3 parallel plans)
  - Round 5 amendment delta encoding (A-04..A-15)
review_focus_cycle2:
  - HIGH-1 verdict (spawn-args.ts Node↔Browser bundling conflict)
  - HIGH-2 verdict (lifecycle harness skips actual Cmd+Q path)
  - regression check on changed plans (01-02, 01-06, 01-07)
  - new HIGH concerns from the cycle-2 replan
internal_iterations_passed_cycle1: 3 (Claude plan-checker — 0 BLOCKER, 0 WARNING)
internal_iterations_passed_cycle2: 1 (Claude plan-checker — 0 BLOCKER, 0 WARNING; cycle-2 replan commit f74c6e0)
cycle: 2
cycle1_high_count: 2
cycle2_high_count: 0
convergence_verdict: PASS (HIGH=0; convergence loop exits with 0 HIGH after cycle 2)
---

# Cross-AI Plan Review — Phase 1 (Tauri Shell Foundation + Subprocess Hardening)

> **Cycle 1** of `/gsd-plan-review-convergence` — independent Codex CLI review after the Claude internal plan-checker passed iteration 3 (0 BLOCKER, 0 WARNING). Goal: surface concerns the internal checker may have missed.
>
> **Cycle 2** — re-review after the planner absorbed cycle-1's 2 HIGH concerns into a targeted replan (commit `f74c6e0`, +549/-144 lines across 3 plans: 01-02, 01-06, 01-07). Goal: confirm both HIGHs are FULLY RESOLVED, regression-check for new HIGHs.

---

## Codex Review — Cycle 1 (2026-05-09T10:52+10:00)

### Summary

The Phase 1 plan set is strong and much closer to execution-ready than a typical multi-contract plan, but I would not execute it unchanged. I found two execution blockers: the browser-bundled `spawn-args.ts` imports Node's `os` module, and the lifecycle harness does not actually exercise the macOS Cmd+Q / Tauri `RunEvent::ExitRequested` path it claims to validate. The Round 5 amendment is mostly encoded, and the threat model is broadly covered, but a few integration tests/checklist rows need tightening.

### Strengths

- Clear wave decomposition: W2's security/sanitize/lifecycle plans are mostly disjoint and W3-W5 integrate in a sensible order.
- A-04 cost-meter deletion is consistently reinforced across implementation and validation: no `$` UI, no `usage.jsonl`, no `src/lib/cost.ts`.
- TDD is applied to the right high-risk pure/state-machine surfaces: spawn args, capability generation, audit script, sanitize, dispatch, and PGID kill.
- The DOMPurify regex drift noted in research is correctly absorbed through the `uponSanitizeAttribute` hook rather than unsupported `FORBID_ATTR` regex.
- Threat ownership is mostly explicit: 01-02 owns capability/spawn scope, 01-03 owns XSS/stream dispatch, 01-04 owns lifecycle, 01-07 owns manual sign-off.
- Round 5 UI deltas are mostly traceable into the correct plans: A-05/A-07/A-10/A-11/A-12 in 01-05, A-06/A-08/A-09/A-13/A-14 in 01-06, and checklist coverage in 01-07.

### Concerns

- **[HIGH]** — `src/lib/spawn-args.ts` is both browser-imported and Node-based. [01-02-PLAN.md](./01-02-PLAN.md) (line 329) imports `homedir` from `"os"`, while [01-06-PLAN.md](./01-06-PLAN.md) (line 946) imports `buildClaudeArgs` into `ChatPanel.svelte`. That module will be bundled into the WebView by Vite/SvelteKit, where Node's `os` module is unavailable. This can break `npm run build` or runtime spawn.

- **[HIGH]** — The 5-cycle lifecycle harness does not validate Cmd+Q. [01-07-PLAN.md](./01-07-PLAN.md) (line 273) starts `npm run tauri dev`, captures the shell/npm wrapper PID, then [kills it with SIGTERM](./01-07-PLAN.md) (line 287). That is not the macOS Cmd+Q path and may not fire Tauri `RunEvent::ExitRequested`. This weakens the main T-1-01 / REQ-3 acceptance gate.

- **[MEDIUM]** — The `kill_pgid` test appears production-mismatched. [01-04-PLAN.md](./01-04-PLAN.md) (line 308) spawns a parent shell that launches a `setsid` child, then kills the parent PGID. That may not kill the separate `setsid` process group. If the registered production PID is the `claude` PG leader, the test should model that directly.

- **[MEDIUM]** — A-10 connection state is specified as reactive but implemented as a plain mutable object. [01-05-PLAN.md](./01-05-PLAN.md) (line 1326) exports `{ status: "disconnected" }`, and `setStatus` mutates it. Svelte will not reliably rerender `TitlebarMeta` from that mutation. The dogfood row expecting disconnected → connecting → connected is likely to fail.

- **[MEDIUM]** — `ChatPanel.sendPrompt` lacks a guarded spawn/register failure path. In [01-06-PLAN.md](./01-06-PLAN.md) (line 1082), `await cmd.spawn()` is outside try/catch, and `finalizeOnce` is assigned only after spawn/register. Missing CLI, auth failure, or early process close can leave `dispatch.isStreaming` stuck.

- **[MEDIUM]** — Tool-use groups appear to accumulate across prompts. [01-03-PLAN.md](./01-03-PLAN.md) (line 879) defines one `ToolUseGroup`, and [01-06-PLAN.md](./01-06-PLAN.md) (line 981) does not reset it at prompt start. A second tool-using prompt may show stale prior tool calls.

- **[MEDIUM]** — T-1-05 vault scope leak has regex/unit coverage but lacks a manual end-to-end dogfood row. SPEC acceptance asks that reading outside scratch, e.g. `/etc/hosts`, returns empty/permission-error. [01-07-PLAN.md](./01-07-PLAN.md) (line 453) checks command-line args but not actual attempted outside-scope reading.

- **[LOW]** — "Total tokens" in A-09 appears to mean only `input_tokens`. [01-06-PLAN.md](./01-06-PLAN.md) (line 615) displays `Total` from `totalInputTokens`. Either rename to "Input" or define total as input + output + cache fields.

### Suggestions

- Split spawn args into browser-safe and Node-only modules. For example: keep regex/constants in `spawn-args.shared.ts`, have `gen-capabilities.ts` import only Node-safe code, and have ChatPanel receive the scratch dir from Rust/Tauri or a browser-safe helper.
- Replace the lifecycle harness SIGTERM with actual Cmd+Q automation, e.g. focus Mneme and send `osascript` command-q, or use `tell application "Mneme" to quit`. Also assert `claude --print` is running before quit in `--with-prompt` mode.
- Rewrite the PGID test so the registered PID is the process-group leader being killed, or explicitly test both parent-shell and detached-child cases with clear expected behavior.
- Make `connection-state` a Svelte 5 reactive module, e.g. `connection-state.svelte.ts` with `$state`, or use a Svelte store.
- Add `try/catch/finally` around `cmd.spawn()` and `register_session_pid`; initialize teardown state before spawn.
- Reset `toolUseGroup` per prompt or per assistant turn; add a two-turn tool-use Vitest case.
- Add dogfood row: prompt "read /etc/hosts" and verify no outside-scratch content appears in tool cards or final answer.

### Risk Assessment (cycle 1)

Overall risk: **MEDIUM-HIGH until the two HIGH items are fixed; MEDIUM after that**. The architecture and coverage strategy are sound, but the current plan has one likely build/runtime incompatibility and one validation harness that could falsely pass the most important lifecycle requirement. The remaining issues are fixable integration gaps rather than design failures.

### Specific Focus Answers (cycle 1)

1. **Cross-spec drift**: No major unresolved A-04..A-15 contradiction, but there is implementation drift: A-10 says reactive connection meta, while 01-05's planned implementation is not reactive. Also the old top-header wording is superseded cleanly by the amendment/context in the plans.

2. **Threat model completeness**: Mostly complete. Weak spots: T-1-01 lifecycle validation is not concrete enough because the harness skips Cmd+Q, and T-1-05 lacks a real outside-scratch dogfood probe.

3. **TDD heuristic correctness**: Mostly correct. Pure/state-machine surfaces are well classified. Missed TDD opportunities: connection-state reactivity, usage-meter formatting/token definition, and multi-turn tool-use reset.

4. **Wave parallelism integrity**: W2 parallelism is mostly safe: 01-02, 01-03, 01-04 write separate areas. Hidden coupling appears later at integration, especially 01-06 depending on 01-02's browser-importable `spawn-args.ts` and 01-03's `ToolUseGroup` semantics.

5. **Round 5 amendment encoding**: No A-NN delta appears orphaned. A-10 is encoded but likely flawed, A-09 is encoded with ambiguous "Total" semantics, and A-14 is encoded but needs multi-turn reset coverage.

---

## Codex Review — Cycle 2 (2026-05-09T11:24+10:00)

### Summary

Cycle 2 resolves both prior HIGH findings. The spawn-args split is now backed by explicit browser-safety tests and audit checks, and the lifecycle harness now drives a real macOS application quit path instead of terminating the dev wrapper. I found no new HIGH regressions in the replan. The remaining risk is from the previously identified MEDIUM/LOW items that were intentionally left out of this cycle.

### Per-HIGH Verdict

- **HIGH-1: RESOLVED** — `spawn-args.shared.ts` is now the browser-safe SSOT, while `spawn-args.node.ts` is limited to the Node-only homedir resolver for `gen-capabilities.ts` ([01-02-PLAN.md L38](./01-02-PLAN.md)). The plan adds tests for zero Node imports in `.shared`, legacy `spawn-args.ts` absence, and audit checks (7a, 7b, 8) blocking browser imports of `.node` ([01-02-PLAN.md L999](./01-02-PLAN.md)). `ChatPanel.svelte` now imports `buildClaudeArgs` from `$lib/spawn-args.shared` and resolves `scratchDir` at mount via Tauri's browser-safe `homeDir()` API from `@tauri-apps/api/path` ([01-06-PLAN.md L970](./01-06-PLAN.md)). New threat-model row T-1-44 codifies the regression. Verification path is concrete: Vitest tests 14-15 readFileSync the .shared file and grep against `from "(node:)?(os|fs|path)"`, and the audit script enforces the same at every CI invocation.

- **HIGH-2: RESOLVED** — the 5-cycle harness now uses AppleScript application quit (`osascript -e 'tell application "Mneme" to quit'`) with a `System Events keystroke "q" using command down` fallback ([01-07-PLAN.md L303-313](./01-07-PLAN.md)), not SIGTERM-to-wrapper. It pre-asserts a live `claude --print` process in `--with-prompt` mode (BLOCKING — refuses to send Cmd+Q if the test would be a no-op), post-asserts drain to zero PIDs within 2.5s (matching REQ-3's SIGTERM(0s)→2s grace→SIGKILL→settle window), and only passes if cumulative orphans AND cumulative quit-deadline misses are both zero ([01-07-PLAN.md L357-393, L441-453](./01-07-PLAN.md)). The harness aborts when run on a host without `osascript` — SIGTERM-to-wrapper is no longer an acceptable substitute. New threat-model row T-1-45 codifies the regression.

### NEW HIGH Concerns (regression check)

**None.**

The cycle-2 replan does not introduce any new HIGH concerns. Specifically:

- The `.shared` / `.node` split preserves the SSOT promise — the spawn-arg list is still edited in exactly one place (`spawn-args.shared.ts`), with the Node resolver isolated to a 5-line file (`spawn-args.node.ts`) that is grep-guarded against browser import.
- The AppleScript path fires Tauri 2's `RunEvent::ExitRequested` hook (the same NSApplicationTerminate notification chain that user-initiated Cmd+Q triggers); the keystroke fallback covers boot-race conditions where the app menu hasn't registered yet; the Accessibility-permission first-run note is documented.
- The threat-model additions (T-1-44, T-1-45) introduce no new unowned attack surface — both are clearly owned by the plans that introduced the regression (01-02 + 01-06 own T-1-44; 01-07 owns T-1-45).
- Plans 01-01, 01-03, 01-04, 01-05 are unchanged and remain consistent with the cycle-2 changes; the cross-plan import contract has been tightened (01-06 references `$lib/spawn-args.shared`, never `.node`), not loosened.

### Remaining MEDIUM/LOW Concerns (carried from cycle 1 — NOT counted toward HIGH)

1. **[MEDIUM]** PGID kill test production mismatch remains; 01-04 was not changed in cycle 2, so the earlier concern about modeling the actual process-group leader still applies.
2. **[MEDIUM]** A-10 connection state reactivity remains; 01-05 was not changed, so the mutable plain-object Svelte rerender risk persists for the titlebar meta dogfood row.
3. **[MEDIUM]** ChatPanel spawn/register failure handling remains; spawn/register still needs a guarded failure path to avoid stuck `isStreaming` state on missing CLI / auth failure / early process close.
4. **[MEDIUM]** Tool-use group reset across prompts remains; 01-03/01-06 were not changed for this concern, so a second tool-using prompt may still show stale prior tool calls.
5. **[MEDIUM]** T-1-05 outside-scratch dogfood probe remains missing; command-line arg checks are not the same as an actual `/etc/hosts` read attempt.
6. **[LOW]** A-09 "Total" token semantics remain ambiguous (display label says "Total" but value is `totalInputTokens` only).

### Risk Assessment (cycle 2)

**MEDIUM.** The two execution blockers are resolved, but several integration-quality and dogfood-coverage issues remain before implementation should be considered low risk. None of the remaining items are HIGH, so the convergence-loop ceiling is not breached.

### Convergence Verdict (cycle 2)

**Cycle-2 HIGH count: 0.**

Per `/gsd-plan-review-convergence` semantics: with HIGH = 0, the convergence loop exits successfully. No cycle 3 required.

The remaining 5 MEDIUM + 1 LOW concerns are eligible for opportunistic absorption during execution (`/gsd-execute-phase 1`), or can be folded into a post-Phase-1 retro. They do not block phase entry.

---

## Consensus Summary

> Cycle 1 + Cycle 2 share a single external reviewer (Codex) — no cross-reviewer triangulation. Findings below are Codex's verdict at the end of cycle 2, organized for `/gsd-plan-review-convergence` exit and downstream consumption.

### Cycle-1 → Cycle-2 transition

| Cycle-1 finding | Severity | Cycle-2 status | Evidence |
|-----------------|----------|----------------|----------|
| spawn-args.ts Node↔Browser bundling conflict | HIGH | **FULLY RESOLVED** | 01-02 split into .shared + .node; T-1-44 added; audit checks 7a/7b/8 wired; Vitest tests 14-15 grep-guard browser-safety; 01-06 imports `$lib/spawn-args.shared` + resolves scratchDir via `homeDir()` from `@tauri-apps/api/path` |
| Lifecycle harness skips actual Cmd+Q | HIGH | **FULLY RESOLVED** | 01-07 harness uses `osascript -e 'tell application "Mneme" to quit'` with System Events keystroke fallback; pre-assert claude --print PID > 0 BLOCKING in --with-prompt; post-assert drain to 0 within 2.5s; aborts on hosts without osascript; T-1-45 added |
| PGID kill test production mismatch | MEDIUM | UNCHANGED | 01-04 not touched in cycle 2 (acceptable per scope) |
| A-10 connection state non-reactive | MEDIUM | UNCHANGED | 01-05 not touched in cycle 2 |
| ChatPanel spawn try/catch | MEDIUM | UNCHANGED | 01-06 cycle-2 changes scoped to scratchDir resolution, not failure handling |
| ToolUseGroup state leak | MEDIUM | UNCHANGED | 01-03/01-06 not touched for this concern |
| T-1-05 dogfood probe | MEDIUM | UNCHANGED | 01-07 cycle-2 changes scoped to lifecycle harness, not the vault-scope dogfood row |
| A-09 "Total" semantics | LOW | UNCHANGED | 01-06 cycle-2 changes scoped to scratchDir resolution, not usage-meter wording |

### Cycle-2 outcome

**0 HIGH concerns. Convergence loop exits successfully (cycle 2 of `--max-cycles 3`).**

The 2 HIGH items raised in cycle 1 are FULLY RESOLVED in cycle 2 with verifiable enforcement (Vitest grep-guards + audit script checks for HIGH-1; AppleScript quit + pre/post claude --print PID asserts for HIGH-2). The cycle-2 replan introduced no new HIGH concerns; the regression check passed for the unchanged plans (01-01, 01-03, 01-04, 01-05).

### Divergent views

N/A in cycles 1-2 (single reviewer). Cross-reviewer triangulation is deferred — convergence achieved with one reviewer's PASS verdict.

---

## Operational next steps (cycle 2 — convergence achieved)

1. **Convergence loop exits** — `/gsd-plan-review-convergence --phase 1 --max-cycles 3` terminates with HIGH=0 after cycle 2. No cycle 3 required.
2. **Update STATE.md** — record cycle 2 outcome (0 HIGH, 5 MEDIUM, 1 LOW carried forward; convergence verdict PASS).
3. **MEDIUM/LOW backlog (opportunistic)** — the 5 MEDIUM + 1 LOW items can be absorbed during `/gsd-execute-phase 1` if the implementer touches the relevant files (01-04 PGID test, 01-05 connection state, 01-06 try/catch + ToolUseGroup reset, 01-07 outside-scratch dogfood row, 01-06 A-09 Total label). They do not block Phase 1 execution entry.
4. **Phase 1 execution** — Phase 1 is now plan-locked and ready for `/gsd-execute-phase 1` per the v1.40 Tier 1 sequence.

---

*Cycle 1 generated by /gsd-review (Codex CLI gpt-5-codex non-interactive exec). Prompt size: 9918 lines / 618 KB. Codex transcript: `/tmp/gsd-review/codex-review-full.log`. Final review payload: `/tmp/gsd-review/codex-review-last.md`.*
*Cycle 2 generated by /gsd-review (Codex CLI gpt-5-codex non-interactive exec). Prompt size: 11286 lines / 728 KB. Codex transcript: `/tmp/gsd-review/codex-review-cycle2-err.log`. Final review payload: `/tmp/gsd-review/codex-review-cycle2-out.md`. Tokens used: 254,796.*
