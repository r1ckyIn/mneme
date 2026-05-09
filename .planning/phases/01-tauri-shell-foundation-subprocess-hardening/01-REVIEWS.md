---
phase: 1
reviewers: [codex]
reviewed_at: 2026-05-09T10:52+10:00
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
review_focus:
  - cross-spec drift across SPEC + CONTEXT + AI-SPEC + UI-SPEC + AMENDMENT
  - threat-model completeness (T-1-01..T-1-07)
  - TDD heuristic correctness (RESEARCH §6)
  - wave parallelism integrity (5 waves; W2 has 3 parallel plans)
  - Round 5 amendment delta encoding (A-04..A-15)
internal_iterations_passed: 3 (Claude plan-checker — 0 BLOCKER, 0 WARNING)
cycle: 1
---

# Cross-AI Plan Review — Phase 1 (Tauri Shell Foundation + Subprocess Hardening)

> Cycle 1 of `/gsd-plan-review-convergence` — independent Codex CLI review after the Claude internal plan-checker passed iteration 3 (0 BLOCKER, 0 WARNING). Goal: surface concerns the internal checker may have missed.

---

## Codex Review

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

### Risk Assessment

Overall risk: **MEDIUM-HIGH until the two HIGH items are fixed; MEDIUM after that**. The architecture and coverage strategy are sound, but the current plan has one likely build/runtime incompatibility and one validation harness that could falsely pass the most important lifecycle requirement. The remaining issues are fixable integration gaps rather than design failures.

### Specific Focus Answers

1. **Cross-spec drift**: No major unresolved A-04..A-15 contradiction, but there is implementation drift: A-10 says reactive connection meta, while 01-05's planned implementation is not reactive. Also the old top-header wording is superseded cleanly by the amendment/context in the plans.

2. **Threat model completeness**: Mostly complete. Weak spots: T-1-01 lifecycle validation is not concrete enough because the harness skips Cmd+Q, and T-1-05 lacks a real outside-scratch dogfood probe.

3. **TDD heuristic correctness**: Mostly correct. Pure/state-machine surfaces are well classified. Missed TDD opportunities: connection-state reactivity, usage-meter formatting/token definition, and multi-turn tool-use reset.

4. **Wave parallelism integrity**: W2 parallelism is mostly safe: 01-02, 01-03, 01-04 write separate areas. Hidden coupling appears later at integration, especially 01-06 depending on 01-02's browser-importable `spawn-args.ts` and 01-03's `ToolUseGroup` semantics.

5. **Round 5 amendment encoding**: No A-NN delta appears orphaned. A-10 is encoded but likely flawed, A-09 is encoded with ambiguous "Total" semantics, and A-14 is encoded but needs multi-turn reset coverage.

---

## Consensus Summary

> Cycle 1 has only one external reviewer (Codex) — there is no cross-reviewer consensus to triangulate yet. Findings below are Codex's verdict, organized by severity for `/gsd-plan-phase 1 --reviews` consumption.

### Highest-priority items to address before re-review (HIGH-severity)

1. **`spawn-args.ts` Node ↔ Browser split** — The shared module imports `homedir` from `"os"` but is also imported by `ChatPanel.svelte`. Vite/SvelteKit will fail to bundle (or runtime-fail in WebView). **Affected plans:** 01-02 (line 329 — Node import), 01-06 (line 946 — browser import). **Suggested fix:** Split into `spawn-args.shared.ts` (regex constants only — browser-safe) and `spawn-args.node.ts` (homedir + path computation — `gen-capabilities.ts` only). ChatPanel reads scratch dir from a Tauri command (Rust resolves at runtime) or a build-time `import.meta.env` injected value.

2. **Lifecycle harness skips actual Cmd+Q** — 01-07 line 273-287 sends SIGTERM to the `npm run tauri dev` wrapper PID, which is NOT the macOS Cmd+Q path. Tauri `RunEvent::ExitRequested` may not fire. The CRITICAL T-1-01 / REQ-3 / SPEC acceptance gate ("0 zombies after 5 quit cycles") is therefore not actually exercised. **Affected plan:** 01-07. **Suggested fix:** Replace SIGTERM with `osascript -e 'tell application "Mneme" to quit'` (or AppleScript Cmd+Q via System Events). Pre-assert `claude --print` is running with the dogfood prompt before quitting.

### Medium-priority items (5 MEDIUM concerns)

- **PGID kill test (01-04 line 308)** — test setup may not match production PID lineage; risks passing unit test while production still leaks zombies.
- **A-10 connection state non-reactive (01-05 line 1326)** — Svelte 5 mutation pattern won't trigger UI rerender; titlebar dot will appear stuck on "disconnected". Needs `$state`/store conversion.
- **ChatPanel spawn try/catch (01-06 line 1082)** — missing CLI / auth failure / early process close can permanently leave `isStreaming` true.
- **ToolUseGroup state leak across prompts (01-03 line 879 + 01-06 line 981)** — second prompt's tool-use card can show stale prior tool calls.
- **T-1-05 vault scope leak missing dogfood E2E (01-07 line 453)** — only command-line args are checked, not actual "read /etc/hosts" attempt.

### Low-priority items (1 LOW concern)

- **A-09 "Total" semantics ambiguous (01-06 line 615)** — currently displays only `totalInputTokens`; either rename label to "Input" or aggregate input + output + cache fields.

### Convergence-loop verdict

**Cycle 1 outcome: 2 HIGH concerns. Convergence loop must continue.**

Per `/gsd-plan-review-convergence` semantics: with HIGH > 0, the loop dispatches `/gsd-plan-phase 1 --reviews` (cycle 2) to apply targeted plan replans for the 2 HIGH issues + the 5 MEDIUM issues, then re-runs cross-AI review.

If cycle 2 still has HIGH > 0 → cycle 3 final replan or HALT/escalate per the `--max-cycles 3` ceiling.

### Divergent views

N/A in cycle 1 (single reviewer). If cycle 2 adds Gemini or another reviewer for a second perspective on the proposed fixes, this section will populate.

---

## Operational next steps

1. **Apply Codex's HIGH-severity fixes via `/gsd-plan-phase 1 --reviews`** — specifically:
   - Split `src/lib/spawn-args.ts` into `spawn-args.shared.ts` (browser-safe) + `spawn-args.node.ts` (Node-only); update 01-02 and 01-06 imports accordingly.
   - Replace 01-07 lifecycle harness SIGTERM with AppleScript Cmd+Q (`osascript -e 'tell application "Mneme" to quit'`) and add pre-quit assertion that `claude --print` is running.
2. **Apply MEDIUM-severity fixes in same replan** — PGID test rewrite (01-04), reactive connection state (01-05), ChatPanel try/catch (01-06), ToolUseGroup reset per prompt (01-03 + 01-06), `read /etc/hosts` dogfood row (01-07).
3. **Apply LOW-severity fix opportunistically** — clarify A-09 "Total" semantics (01-06 line 615).
4. **Cycle 2 re-review** — re-run `/gsd-review --phase 1 --codex` against the replanned 7 plans. Goal: 0 HIGH concerns.
5. **STATE.md** — record cycle 1 outcome (2 HIGH, 5 MEDIUM, 1 LOW) before dispatching cycle 2.

---

*Cycle 1 generated by /gsd-review (Codex CLI gpt-5-codex non-interactive exec). Prompt size: 9918 lines / 618 KB. Codex transcript: `/tmp/gsd-review/codex-review-full.log`. Final review payload: `/tmp/gsd-review/codex-review-last.md`.*
