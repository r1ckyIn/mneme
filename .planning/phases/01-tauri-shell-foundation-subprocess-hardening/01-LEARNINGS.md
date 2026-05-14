---
phase: 01
phase_name: "tauri-shell-foundation-subprocess-hardening"
project: "mneme"
generated: "2026-05-14T00:00:00Z"
counts:
  decisions: 15
  lessons: 10
  patterns: 9
  surprises: 8
missing_artifacts:
  - "01-VERIFICATION.md (no UAT.md either — verify-work was 4-bucket HTML rendering only, no UAT state file)"
---

# Phase 01 Learnings: tauri-shell-foundation-subprocess-hardening

## Decisions

### D-01..D-21 — 21 implementation decisions from /gsd-discuss-phase 1
Phase 1's discuss-phase captured 21 D-numbered decisions covering layout (vanilla CSS Grid 30/40/30 + 1280×860 + bottom-row mind-map reservation per D-03/D-05/D-06), subprocess lifecycle (Rust state machine + double `CloseRequested + ExitRequested` hook union + `nix::killpg` PGID kill per D-11), parser vendor depth (A2: src+LICENSE+VENDOR.md only, drop tests, per D-13), capability validator SSOT (B2: TS spawn-args + prebuild gen-capabilities + audit diff), RQ-03 absorption (Targeted read of OpenCovibe + TOKENICODE), telemetry (UI dot + dev console.log only, no $-cap state machine).

**Rationale:** discuss-phase Socratic interview surfaced design questions the planner couldn't have answered alone; decisions captured in CONTEXT.md become referential in PLAN files (every D-NN is grepable to its origin).
**Source:** 01-CONTEXT.md, 01-DISCUSSION-LOG.md

---

### D-22 — Visual contract pointer (Mneme.html as Phase 1 visual SSOT)
KD-13 active-scale ratified at 0.96 (not 0.98) project-wide; `--error` semantic locked to `#c15f3c` form-isolation contract; UI-SPEC's SSOT 0' (Live Anthropic Product UI > documentation snapshots) ratified.

**Rationale:** Phase 1's 4-piece contract alignment audit (SPEC + CONTEXT + AI-SPEC + UI-SPEC) needed a single pointer-style entry to prevent future visual drift across 12 components.
**Source:** 01-CONTEXT.md D-22, 01-AMENDMENT-2026-05-09.md

---

### KD-12 — claude-code-parser vendored type-only (NOT npm dep)
Frozen MIT snapshot at `vendor/claude-code-parser/` with VENDOR.md + LICENSE; consumed via `import type { ClaudeEvent }` only. Upstream commit pinned to `61fa32c5b7004fde32c47c0e95abb657316b224e`.

**Rationale:** Upstream effectively unmaintained (last commit predates current Claude Code event schema). Vendoring preserves attribution + adaptability without taking on a runtime dep. Audit gate `scripts/audit-capabilities.sh` enforces "claude-code-parser NEVER appears in package.json".
**Source:** PROJECT.md KD-12, 01-01-SUMMARY.md, 01-RESEARCH.md §3

---

### A-04 — `--max-turns 30` is the ONLY loop-runaway guard
AMENDMENT-2026-05-09 explicitly removed cost meter / `$10 daily cap` / `~/.mneme/usage.jsonl` / `~/.mneme/config.json` from scope. UI shows Ctx % + Total tokens + Session duration as OBSERVATIONAL (not enforcement). T-1-04 disposition reframed accordingly.

**Rationale:** Under KP-04 OAuth subscription mode there is NO per-call billing; rate-limit budget is the only ceiling and `--max-turns 30` is structurally sufficient. Building a $-cap state machine would be premature optimization for a mode that doesn't bill per call.
**Source:** 01-AMENDMENT-2026-05-09.md A-04, 01-SECURITY.md T-1-04

---

### Plan 01-10 retroactive frontmatter (gap_closure + retroactive flags)
When `/gsd-debug` applied the T-1-49 window-drag capability fix on 2026-05-09–10 ahead of any plan existing, plan 01-10-PLAN.md was written AFTER the fix and committed in the SAME commit (`fcd939a`) as the source files.

**Rationale:** Preserves plan trail in git history so future `git blame` on capability line navigates back to structured rationale rather than just transient `.continue-here.md`. The `retroactive: true` + `gap_closure: true` frontmatter flags let audit tooling distinguish forward plans from after-the-fact ones, while `retroactive_note` owns the process-violation acknowledgement.
**Source:** 01-10-PLAN.md, 01-10-SUMMARY.md

---

### BL-03 fix path: behavioral defer-to-post-stream over algorithmic regex rewrite
`renderKatexInDom` walker has correctness defects on `\$` escapes + inline-vs-display tie-break, but the fix deferred the walk to post-`result` only (skipping during streaming) rather than replacing the walker with a stateful tokenizer.

**Rationale:** Behavioral fix is 1-line gate (`if (streaming) return`); algorithmic rewrite is a multi-week tokenizer project. The walker's underlying ambiguity is sidestepped — not solved in place. Trade-off documented; tokenizer replacement promoted to v1.x candidate if post-merge dogfood needs streaming math UX.
**Source:** 01-REVIEW.md BL-03, 01-REVIEW-FIX.md, commit `8f052f6`

---

### BL-01 fix path: detached `thread::spawn`, NOT `tokio::spawn`
Reviewer originally suggested `tokio::spawn` to detach the SIGKILL leg of `kill_pgid`; fixer chose `std::thread::spawn` instead because `kill_pgid` is called from Tauri's main event loop which is not always inside a tokio runtime context.

**Rationale:** `tokio::spawn` requires a runtime; calling it from a sync context panics. `std::thread::spawn` works unconditionally + keeps the dependency surface narrow. Trade-off: an extra OS thread per Cmd+Q (acceptable — quit is rare).
**Source:** 01-REVIEW-FIX.md BL-01, commit `0a96c19`, 01-SECURITY.md T-1-19

---

### KP-04 OAuth compliance enforced at 3 defense layers
mneme NEVER stores Anthropic tokens. `--bare` (which would skip OAuth keychain read) is forbidden at three layers: (1) absent from `buildClaudeArgs` SSOT, (2) absent from capability validator regex, (3) absent verified by `audit-capabilities.sh` grep check 4.

**Rationale:** Single-layer protection is one accident away from failure. Three-layer defense means a developer would have to break THREE invariants simultaneously to leak this. Audit gate runs pre-commit + pre-build.
**Source:** 01-SECURITY.md "KP-04 Compliance (DO NOT VIOLATE)", PROJECT.md KP-04

---

### spawn-args SSOT split: `.shared.ts` + `.node.ts` browser-safety contract
`src/lib/spawn-args.shared.ts` contains ZERO Node imports (verified by audit checks 7a/7b/8). `src/lib/spawn-args.node.ts` is Node-only (used by `scripts/gen-capabilities.ts` at build time). The legacy `src/lib/spawn-args.ts` is FORBIDDEN to exist.

**Rationale:** Cycle-1 Codex review found that bundling Node `path` / `os` into the WebView via a single `spawn-args.ts` would either crash at runtime (no Node in WebView) or pollute the bundle. The split + audit gate is defense-in-depth so no future contributor accidentally reintroduces the bundling.
**Source:** 01-REVIEWS.md HIGH-1 absorption (cycle 2), 01-SECURITY.md T-1-44

---

### CSP ownership: SvelteKit `kit.csp` (mode: 'auto'), NOT `src/app.html` meta tag
Plan 01-08 deleted the hard-coded CSP meta in `app.html` and moved ownership to `svelte.config.js` `kit.csp` block. `mode: 'auto'` emits per-request nonce in dev (HTTP header) + SHA-256 hash at build (prerender).

**Rationale:** `src/app.html` meta is static; SvelteKit can't substitute nonces in static HTML. `kit.csp` mode:'auto' produces correct nonces in dev for Svelte's bootstrap script + correct hashes at build for the prerendered SPA shell. Single source of truth; no drift risk.
**Source:** 01-08-SUMMARY.md, 01-SECURITY.md T-1-09, T-1-46

---

### BL-02 CSP fix path: `connect-src 'ipc:' 'http://ipc.localhost'`
Tauri 2's IPC bridge uses both `ipc:` protocol (newer) and `http://ipc.localhost` (legacy fallback) for invoke() calls. CSP `connect-src` needed both.

**Rationale:** Without this, production builds would silently fall back to postMessage (slower IPC + noisy console errors) OR completely fail certain invoke calls. The same devtools probe that surfaced T-1-49 also surfaced this; planned forward as 01-11 but absorbed by code-review --fix iter-1 (making 01-11 obsolete).
**Source:** 01-REVIEW-FIX.md BL-02, commit `c80054d`, 01-SECURITY.md T-1-09

---

### `it.fails` over `it.skip` for regression-pinning escalated bugs
When auditor escalates an impl bug it cannot fix (per read-only constraint), test pinned via vitest's `it.fails(...)` — the test PASSES while the bug exists ("failure is the expected outcome") and FAILS once the bug is fixed (forcing developer to remove the `.fails` marker).

**Rationale:** `it.skip` silently disables the contract; the bug never auto-surfaces. `it.fails` is self-correcting: when the fix lands, CI flips red until the marker is removed, forcing acknowledgement of the contract change.
**Source:** 01-VALIDATION.md WR-05-pin (later flipped to enforced pass after orchestrator-applied Splitter fix)

---

### Iter-N backup file pattern for `code-review --fix --auto` loop
Before each `--auto` iteration overwrites `01-REVIEW.md` and `01-REVIEW-FIX.md`, the prior iteration is preserved as `01-REVIEW.iter2.md` / `01-REVIEW-FIX.iter2.md`.

**Rationale:** If iterations degrade (later finds new issues created by earlier fixes), the backup chain enables post-mortem reconstruction without re-running the full pipeline. Storage cost is negligible; cognitive value when iterations misbehave is high.
**Source:** GSD code-review-fix.md workflow, .planning/phases/01-.../01-REVIEW.iter2.md

---

### Cross-AI plan review (2 cycles) for HIGH-stakes plans
Phase 1 was the foundation phase for the entire roadmap; `/gsd-review --phase 1 --codex` ran 2 cycles. Cycle 1 raised 2 HIGHs (spawn-args Node↔Browser + lifecycle harness Cmd+Q skipping); cycle 2 verified both absorbed via replan + no new HIGH.

**Rationale:** Foundation phases have downstream blast radius — every Phase 2-10 plan operates INSIDE Phase 1's invariants. The cost of a 2-cycle cross-AI review is small (~30 min) vs the cost of carrying a HIGH into 9 downstream phases. For non-foundation phases, single cycle (or none) is appropriate.
**Source:** 01-REVIEWS.md cycle 1 + cycle 2, commits `ac07c43` + `f74c6e0`

---

### Inline orchestrator-applied fix for auditor-escalated impl bugs
gsd-nyquist-auditor + gsd-security-auditor agents have read-only-on-impl constraint by design. When auditor escalates an impl bug (WR-05-pin Splitter restore), orchestrator (which has no such constraint) can apply the documented fix recipe inline + flip `it.fails` → enforced pass + amend VALIDATION.md to RESOLVED.

**Rationale:** Auditor's constraint correctly bounds its scope (single-responsibility, predictable side effects). Orchestrator's broader scope allows it to take the documented recipe + close the loop atomically. Without this pattern, every auditor-found impl bug would need a separate plan cycle.
**Source:** 01-VALIDATION.md Validation Audit 2026-05-14, commit `2f1d83e`

---

## Lessons

### H1 devtools probe FIRST when Tauri 2 IPC silently fails
T-1-49 (window unmovable) saw 4 wasted chat-driven fix attempts before the H1 probe (`window.__TAURI_INTERNALS__ + getCurrentWindow().startDragging()`) immediately surfaced the real error: `Permissions associated with this command: core:window:allow-start-dragging`. The probe takes 30 seconds; the 4 chat attempts wasted hours.

**Context:** Future Tauri 2 IPC debug sessions — always probe the actual API call from devtools BEFORE adding scaffolding (drag-region attributes, JS fallbacks, decoration toggles, cursor CSS).
**Source:** 01-10-SUMMARY.md "Lessons #1", retroactive_note in 01-10-PLAN.md

---

### `core:default` is not a hammer
Tauri 2 does NOT bundle every common capability into `core:default`. `core:window:allow-start-dragging`, `core:webview:allow-eval`, and others must be declared explicitly. Drag-region attributes alone are insufficient — capability gating is the actual permission layer.

**Context:** Any new Tauri 2 IPC command added in Phase 2+ MUST verify its capability is declared. A future audit-script enhancement could lint for "IPC commands used in code without matching capability permissions" (Phase 2+ improvement opportunity).
**Source:** 01-10-SUMMARY.md "Lessons #2", 01-SECURITY.md T-1-49

---

### Behavioral fixes beat algorithmic fixes when trade-off is clear
BL-03 had two fix paths: (A) defer KaTeX walk to post-stream only (1-line gate, sidesteps the regex defect), or (B) rewrite the regex walker as a stateful tokenizer (multi-week, fixes the defect in place). Path A was chosen because the trade-off was unambiguous: streaming math UX is a nice-to-have, structural correctness in the post-result render path is required.

**Context:** When weighing "fix the symptom" vs "fix the root cause", quantify the gap. If the root cause is bounded by an out-of-scope feature (streaming math), behavioral fix + v1.x tokenizer ticket is the right call. If the root cause leaks into core flows, algorithmic fix is mandatory.
**Source:** 01-REVIEW.md BL-03, 01-REVIEW-FIX.md BL-03 rationale

---

### Iter-2 re-review caught zero regressions = fixer agent quality high
gsd-code-fixer's iter-1 closed 15/15 in-scope findings with 14 atomic commits; iter-2 re-review returned status: clean (0 BLOCKER + 0 WARNING + 0 INFO). All test suites passed (vitest 139/139 + cargo 3/3 + audit PASS).

**Context:** For phases where the initial code review produces ≤20 findings + clean test baseline, --fix --auto is high-confidence. For phases with >50 findings or fragile test infrastructure, manual review of each fix may be required (iter-N regressions are more likely).
**Source:** 01-REVIEW-FIX.md, 01-REVIEW.iter2.md, commit `cf13c01`

---

### Misdiagnosis comments are toxic — delete with the wrong code
T-1-49 debug session had left an 8-line comment claiming "data-tauri-drag-region flakiness on macOS overlay-style titlebars under HMR" — which was wrong. The actual cause was a missing capability permission. The misdiagnosis comment would have wasted future maintainers' time more than no comment at all.

**Context:** When deleting code you discover was a misdiagnosis (or removing a workaround that turned out to be unnecessary), delete the misdiagnosis comment alongside it. Leaving the comment as "well, just for context" is worse than removing it cleanly.
**Source:** 01-10-SUMMARY.md "Lessons #4"

---

### The 2-cycle Codex plan review absorbed 2 HIGHs at PLAN time
T-1-44 (spawn-args Node↔Browser bundling) + T-1-45 (lifecycle harness skipping Cmd+Q) would have surfaced as code-review BLOCKERs during execution if cycle 1 hadn't caught them at plan time. Cost-of-fix at plan time was ~30 min of replanning; cost-of-fix at execution time would have been a full plan-cycle redo.

**Context:** For foundation / cross-cutting phases, invest in cross-AI plan review even if it feels like overhead. The HIGH-finding rate at plan time is a leading indicator of code-review BLOCKER density at execution time.
**Source:** 01-REVIEWS.md cycle 1 + cycle 2 narratives

---

### Husky 9 deprecation warning is benign noise — defer to a separate phase
Every commit prints "husky - DEPRECATED ... They WILL FAIL in v10.0.0". The fix is 2 lines + a re-test (`.husky/pre-commit` shebang + sourcing line removal). Phase 1 deliberately deferred this to a separate todo (`2026-05-11-husky-v10-compat-remove-deprecated-hook-shim.md`).

**Context:** "Benign noise" warnings are seductive to "just clean up". Resist when the warning is bounded + the cleanup risks the hook itself. Track in todos + revisit when husky 10 actually ships or when another hook change brings you to the file anyway.
**Source:** .planning/STATE.md pending todos, every commit output

---

### Auditor read-only constraint is feature, not bug
gsd-nyquist-auditor and gsd-security-auditor are read-only-on-impl by design. When WR-05-pin Splitter restore bug surfaced, the auditor escalated rather than fixing. Initial instinct was "this is annoying" — actual outcome: auditor stayed in scope, orchestrator applied documented recipe, both files were committed atomically, audit trail preserved.

**Context:** Read-only audit roles produce more predictable side effects than read-write roles. Use the escalate-to-orchestrator path; don't grant auditors write access to impl files.
**Source:** 01-VALIDATION.md Validation Audit 2026-05-14, commit `2f1d83e`

---

### 49 threats is "foundation-phase" scale; downstream phases will be smaller
Phase 1's threat register (T-1-01..T-1-49) is significantly larger than typical (Phase 01.1 had ~12). Foundation phases attract threat-model attention from cross-AI reviews + RESEARCH.md §4 enumerations + execution-time additions in ways that feature phases don't.

**Context:** Don't extrapolate Phase 1's threat-cohort size to Phase 2-10 planning estimates. Expect 5-15 threats per feature phase, with foundation-phase spikes when new attack surfaces open (Phase 6 Echo360 webview = next likely spike).
**Source:** 01-SECURITY.md threat register summary (49 threats spans 4 cohorts)

---

### Code review --fix --auto loop terminated at iter 2 = high signal
The auto loop was capped at 3 iterations but exited after iter 2 because iter-1 closed 15/15 findings cleanly. Iter-2 re-review returned status: clean → loop exit per workflow rule. Iter 3 fixer was never spawned.

**Context:** The --auto loop's effectiveness depends on the fixer agent's quality. High-confidence fixer = 1-2 iterations; low-confidence fixer = 3 iterations + manual review afterward. Treat the iteration count as a fixer-quality signal.
**Source:** code-review-fix.md workflow exit-on-clean rule, .planning/phases/01-.../01-REVIEW.md status:clean

---

## Patterns

### Retroactive plan + gap_closure flag combination
When `/gsd-debug` applies a fix mid-blocker, write the plan AFTER the fix + commit in the SAME commit with `gap_closure: true + retroactive: true` frontmatter flags + `retroactive_note` block owning the process-violation acknowledgement.

**When to use:** Any time a fix lands ahead of its plan. The pattern preserves plan trail in git history (`git blame` navigates back to structured rationale) without forcing the team to rewrite the past as if the fix happened in proper sequence. The flags let audit tooling distinguish retroactive plans from forward plans.
**Source:** 01-10-PLAN.md frontmatter + retroactive_note, 01-10-SUMMARY.md patterns-established

---

### SSOT split: `.shared.ts` (browser-safe) + `.node.ts` (Node-only) with audit gate
Module that needs to run in BOTH the WebView and a Node tool (e.g., capability codegen) is split: `<base>.shared.ts` contains zero Node imports; `<base>.node.ts` contains Node imports. `audit-capabilities.sh` greps the `.shared.ts` source for forbidden Node imports (defense-in-depth). The legacy single-file `<base>.ts` is FORBIDDEN to exist.

**When to use:** Any data structure or function consumed by both browser and Node contexts (capability args, manifest definitions, schema types, etc.). The naming + audit gate prevents future contributors from collapsing the split.
**Source:** src/lib/spawn-args.shared.ts header comment, audit-capabilities.sh checks 7a/7b/8, T-1-44 fix

---

### Detached-thread non-blocking destructor
Long-running cleanup (e.g., SIGTERM → 2s grace → SIGKILL) spawned in `std::thread::spawn` so the main event loop doesn't block on the grace period. The destructor returns immediately; the thread runs to completion.

**When to use:** Any cleanup with a multi-second grace period that runs from a UI thread (Tauri main loop, GTK main loop, Cocoa main loop). DO NOT use `tokio::spawn` if the call site isn't guaranteed to be inside a tokio runtime context.
**Source:** src-tauri/src/lib.rs kill_pgid (BL-01), commit `0a96c19`

---

### Capability JSON ↔ TS SSOT regen-idempotent contract
`scripts/gen-capabilities.ts` reads the TS SSOT (`src/lib/spawn-args.shared.ts`) and writes `src-tauri/capabilities/default.json`. `scripts/audit-capabilities.sh` runs the generator in dry-run mode + diffs against the committed JSON; any drift fails the audit. The JSON is NEVER hand-edited.

**When to use:** Any time you have a runtime gate (Tauri capability JSON, OPA policy, IAM role) that must match a source-of-truth in code. The gen + audit pair prevents drift; the SSOT side stays editable in one place; the runtime side is a regenerated artifact.
**Source:** scripts/gen-capabilities.ts, scripts/audit-capabilities.sh check 1, tests/audit/test-audit-script.sh

---

### 3-layer KP-04 OAuth compliance defense
Forbidden CLI flag (`--bare`) absent at three layers: (1) absent from `buildClaudeArgs` SSOT (code can't emit it), (2) absent from capability validator regex (Tauri runtime rejects it even if smuggled in), (3) absent verified by `audit-capabilities.sh` grep gate (pre-commit + pre-build refuse to land code with it).

**When to use:** Any "this code MUST NEVER do X" invariant where the cost of a single failure is high. Single-layer protection is one accident from failure; 3-layer requires breaking 3 invariants simultaneously.
**Source:** 01-SECURITY.md "KP-04 Compliance (DO NOT VIOLATE)"

---

### Iter-N backup files in --auto fix loops
Before each iteration overwrites `REVIEW.md` / `REVIEW-FIX.md`, the prior iteration is preserved as `REVIEW.iterN.md` / `REVIEW-FIX.iterN.md`. The final committed file is the latest state; backups enable post-mortem reconstruction.

**When to use:** Any iterative agent loop where artifacts get overwritten. The cost is storage (negligible for markdown); the value is post-mortem analysis when iterations misbehave.
**Source:** GSD code-review-fix.md workflow, 01-REVIEW.iter2.md + 01-REVIEW-FIX.iter2.md

---

### `it.fails` regression-pin for auditor-escalated impl bugs
Test written for the desired behavior; pinned via vitest's `it.fails(...)` while the bug exists. Test passes (failure-is-expected); flips to fail once the bug is fixed, forcing developer to remove the `.fails` marker.

**When to use:** Auditor agent finds impl bug it can't fix (read-only constraint). The test is auto-correcting: the contract is documented, the test runs, and the bug surfaces the moment a fix lands. Use over `it.skip` because `.skip` silently disables; `.fails` self-flips.
**Source:** tests/splitter-restore.test.ts (originally `it.fails`, flipped to enforced pass after Splitter fix in `2f1d83e`)

---

### Cross-AI plan review for foundation/cross-cutting phases
Run `/gsd-review --phase N --codex` 2 cycles before `/gsd-execute-phase N` if the phase is foundation (downstream phases depend on its invariants) or cross-cutting (touches many surfaces). Cycle 1 absorbs HIGHs into a replan; cycle 2 verifies no new HIGH.

**When to use:** Foundation phases (Phase 0, 1, 2) + cross-cutting phases (Phase 4 doc ingestion, Phase 7 KG). NOT every phase — feature phases get diminishing returns from cross-AI review.
**Source:** 01-REVIEWS.md cycle 1 + cycle 2 narratives, CLAUDE.md "Tier 2 — plan-review-convergence"

---

### Orchestrator-applied fix for auditor-escalated impl bugs
When read-only auditor (nyquist-auditor / security-auditor) escalates an impl bug with a documented fix recipe, the orchestrator (which has no read-only constraint) applies the recipe inline + flips `it.fails` → enforced pass + amends the audit doc to RESOLVED.

**When to use:** Any time an auditor surfaces an impl bug with a clear ≤10-line fix recipe. For larger refactors, route to `/gsd-plan-phase --gaps-only` instead (separate plan cycle).
**Source:** 01-VALIDATION.md Validation Audit 2026-05-14, commit `2f1d83e`

---

## Surprises

### T-1-49 window-drag took 4 chat fixes before H1 probe surfaced the real cause
A 30-second H1 devtools probe would have skipped all four wasted attempts (drag-region attribute, JS fallback, drag-region "false" opt-out, cursor CSS). The lesson cost ~2 hours of debug time + a session pause + a `.continue-here.md` file.

**Impact:** Crystallized the dev-feedback-loop discipline that became Phase 01.1's entire scope. Without T-1-49's frustration, Phase 01.1 might not have been inserted.
**Source:** 01-10-SUMMARY.md, 01.1-CONTEXT.md (Phase 01.1 was inserted POST Phase 1 start specifically to prevent recurrence)

---

### BL-02 absorbed plan 01-11 within code-review --fix iter 1
The CSP `connect-src ipc:` gap was originally tracked as forward plan 01-11 (after T-1-49 was closed by retroactive 01-10). But code-review iter-1 picked it up as a BLOCKER and fixed it in commit `c80054d`, making plan 01-11 obsolete before it was ever planned.

**Impact:** A planned phase entry was eliminated by a higher-priority discipline (security-relevant code review). This validates "run code-review BEFORE writing follow-up plans" as a workflow ordering — the review may close gaps without requiring separate plan cycles.
**Source:** 01-REVIEW.md BL-02, 01-10-PLAN.md out-of-scope §1 (was supposed to be 01-11)

---

### Splitter restore vs drag asymmetric ceilings
WR-05 hardened the DRAG-time path (`clampAndNormalize` allows leftRatio up to 1-2*RATIO_MIN=0.60) but did NOT touch the RESTORE-time path (still clamped to RATIO_MAX=0.50). Saved values in (0.50, 0.60] silently clamped down on restore — up to 64px UX drift.

**Impact:** Easy-to-introduce regression class when fixing one code path without aligning sibling paths. Pattern: when normalizing a constraint at one site, grep for ALL other sites that read the same constraint + verify they use the same normalization function.
**Source:** 01-VALIDATION.md WR-05-pin, commit `2f1d83e` (orchestrator fix)

---

### 49 threats — significantly more than typical phase
Phase 01.1 had ~12 threats. Phase 1 hit 49 because it's foundation + got 2 cross-AI plan-review cycles that absorbed cycle-1 HIGHs (T-1-44, T-1-45) + had execution-time additions (T-1-46..T-1-49). The threat register grew organically across cycles, not all at plan time.

**Impact:** Threat-register size is not a planning estimate; it's an emergent property of the phase's foundation-vs-feature character + how many review cycles it gets. Plan with 5-15 threats; expect spikes when new attack surfaces open.
**Source:** 01-SECURITY.md threat register summary (4 cohorts: phase-level + plan-local + cycle review + execution-time)

---

### Security audit returned all 49 CLOSED on first pass
No escalations, no OPEN threats. This is unusual; expected outcome was 1-3 OPEN threats requiring follow-up plans.

**Impact:** The pre-audit baseline (vitest 147/147 + svelte-check 0/0 + cargo 3/3 + audit-capabilities.sh PASS + audit-fixture 5/5) was strong enough that the security auditor found no gaps. Suggests the iter-2 code review + Nyquist audit had ALREADY closed any latent security gaps.
**Source:** 01-SECURITY.md "Threat Register Summary" (49 CLOSED, 0 OPEN)

---

### Husky 9 deprecation warning prints on every commit but is benign
The warning ("husky - DEPRECATED ... They WILL FAIL in v10.0.0") appears on every commit hook run. It's bounded — v10 hasn't shipped — but visually noisy + likely to get ignored, which is the actual risk (when v10 ships, the warning gets ignored as "always there", and the hook breaks).

**Impact:** Tracked as a Phase 1+ pending todo. Pattern: noisy benign warnings train developers to ignore the hook output, which is the actual hazard. Aggressive about resolving these even when they're "just noise".
**Source:** Every commit output, todos/pending/2026-05-11-husky-v10-compat-remove-deprecated-hook-shim.md

---

### Code-review --fix --auto loop terminated at iter 2 (zero new findings)
Workflow caps the --auto loop at 3 iterations. Iter-1 closed 15/15 in-scope findings; iter-2 re-review returned status: clean; iter-3 fix pass was never spawned (per workflow exit-on-clean rule).

**Impact:** High signal for fixer agent quality. Future --auto invocations: if iter-2 returns clean, treat it as strong evidence. If iter-2 produces N new findings, treat as fixer-quality issue (regressions from iter-1 fixes) and investigate before iter-3.
**Source:** GSD code-review-fix.md exit-on-clean rule, 01-REVIEW.iter2.md (status: clean)

---

### Auditor read-only constraint surfaced a real impl bug instead of papering over it
The Nyquist auditor escalated WR-05-pin (Splitter restore drift) rather than silently fixing it. Initial reaction: "annoying — why can't auditor just fix it?" Actual outcome: auditor stayed in scope, orchestrator applied the documented fix recipe + flipped `it.fails` to enforced pass + amended VALIDATION.md to RESOLVED, with the entire chain visible in git history.

**Impact:** Read-only audit roles are a FEATURE because they force the escalation surface to be visible. Hidden auditor-applied fixes would have papered over an impl bug; the escalation made it impossible to ignore.
**Source:** 01-VALIDATION.md Validation Audit 2026-05-14 (escalation → orchestrator-applied fix chain)
