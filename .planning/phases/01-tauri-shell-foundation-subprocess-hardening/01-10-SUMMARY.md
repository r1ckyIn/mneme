---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 10
subsystem: capability + ui-cleanup
tags: [tauri, capability, window-drag, t-1-49, gap-closure, retroactive, h4-fix, gsd-debug]

# Dependency graph
requires:
  - phase: 01 plan 01-01 (bootstrap)
    provides: "scripts/gen-capabilities.ts initial permissions array; src-tauri/capabilities/default.json artifact slot"
  - phase: 01 plan 01-02 (capability SSOT)
    provides: "scripts/audit-capabilities.sh SSOT-drift check 1; gen-capabilities.ts regen-idempotency contract"
  - phase: 01 plan 01-09 (UI pixel recreation)
    provides: ".stage + .window + .titlebar drag-region attribute trio; src/routes/+page.svelte structure that the cleanup operates on"

provides:
  - "core:window:allow-start-dragging permission declared in scripts/gen-capabilities.ts → regenerated into src-tauri/capabilities/default.json (SSOT-drift audit PASS)"
  - "T-1-49 closure: Mneme window drags from any [data-tauri-drag-region] surface (.titlebar always; .stage matte bezel at >=1340px viewport) without 'window.start_dragging not allowed' Rust permission rejection"
  - "src/routes/+page.svelte cleanup: 30-line onMount JS startDragging() fallback + 8-line preamble comment removed; misleading 'data-tauri-drag-region HMR flakiness' diagnosis purged from source; cursor: grab/grabbing CSS on .stage/.titlebar removed (default cursor restored)"
  - "Phase 1 dogfood checklist row A-04 (window drag) flips BLOCKED → PASS, unblocking plan 01-07 Task 4 dogfood signoff"
  - ".planning/phases/01-.../.continue-here.md retired (the H1-H4 hypothesis ledger that documented the debug session — H4 confirmed sufficient, H2/H3 not the root cause; ledger preserved in git history via plan 01-10-PLAN.md retroactive_note)"

affects:
  - "phase-02-vault-canvas-sync entry — Phase 1 dogfood A-04 unblocked, validation gate one step closer"
  - "plan 01-11 (CSP connect-src ipc: gap) — separately tracked; surfaced in the SAME devtools probe but explicitly OUT OF SCOPE per this plan's <out of scope> §1"

# Tech tracking
tech-stack:
  added: []
  modified: ["Tauri 2 capability permissions: + core:window:allow-start-dragging (window-grain, single-window Phase 1 surface)"]
  patterns:
    - "Tauri 2 capability declaration discipline: core:default does NOT bundle every common surface — start_dragging is the canonical example. Always edit scripts/gen-capabilities.ts (TS SSOT), never hand-edit default.json. Audit script enforces drift check at pre-commit time."
    - "/gsd-debug routing for blocker-driven gap closures: when dogfood walkthrough surfaces a blocker mid-plan, pause via .continue-here.md ledger (H1..HN hypotheses), then resume with structured probe of the highest-confidence hypothesis. H1 devtools probe surfaced the real H4 capability gap immediately; the 4 attempted in-chat fixes (drag-region attributes, JS fallback, drag-region 'false' opt-out, cursor visual) were all wasted because they bypassed the permission gate."
    - "Retroactive plan pattern (gap_closure: true + retroactive: true frontmatter): when /gsd-debug applies a fix BEFORE the plan exists, write the plan after-the-fact and commit it in the SAME commit as the source files. Plan body's retroactive_note must explain the bypass + acknowledge the process violation. Future git blame on the lines navigates back to the plan instead of just .continue-here.md."

key-files:
  created:
    - ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-10-SUMMARY.md (this file)"
  modified:
    - "scripts/gen-capabilities.ts (+1 line — core:window:allow-start-dragging between core:default and shell:default)"
    - "src-tauri/capabilities/default.json (+1 line — regenerated, byte-for-byte SSOT match)"
    - "src/routes/+page.svelte (-44 lines — onMount JS fallback + import + cursor CSS rules removed)"
    - ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-10-PLAN.md (+246 lines — retroactive plan body itself, committed alongside the fix)"
  deleted: []

key-decisions:
  - "Out-of-scope discipline: CSP connect-src ipc: gap (surfaced in SAME devtools probe) is NOT bundled into this plan. Tracked as plan 01-11 to keep retroactive scope minimal and so the planner agent writes that one properly (forward, not retroactive)."
  - "Capability grain: core:window:allow-start-dragging is window-grain (allows ANY [data-tauri-drag-region] surface to drag). Single-window Phase 1 — no per-surface split needed. Revisit when REQ-12 multi-session sidebar arrives."
  - "Process violation acknowledged: planner→executor sequence was bypassed when the fix was applied via /gsd-debug + main thread Edit. Plan 01-10-PLAN.md frontmatter sets retroactive: true + gap_closure: true so audit tooling can distinguish forward plans from after-the-fact ones."
  - "Cleanup commit included in same fix commit (fcd939a): JS fallback + cursor CSS deletion is technically separable, but they were misdiagnosis artifacts from the same debug session; keeping them together preserves the narrative in git blame."

patterns-established:
  - "Single-commit retroactive landing (commit fcd939a — plan + source files together): preserves plan trail without polluting git history with a separate planning commit. Audit can still detect because frontmatter says retroactive: true."

requirements-completed: [REQ-01, REQ-04]
threats-closed: [T-1-49]

# Metrics
duration: ~15min (across two debug sessions: 2026-05-09 pause + 2026-05-10 resume + retroactive plan write)
completed: 2026-05-10
landed_in_commit: fcd939a
summary_committed: 2026-05-14
---

# Phase 1 Plan 10: Window-drag capability gap closure (T-1-49) — Retroactive Summary

**Plan 01-10 closes T-1-49 — Mneme window unmovable on macOS Tauri 2 — via the audit-locked SSOT path (`gen-capabilities.ts` → regenerate `default.json` → audit PASS) plus cleanup of 44 lines of misdiagnosis-artifact code in `+page.svelte`. The plan itself is retroactive (written after the fix landed via `/gsd-debug`), committed alongside the source changes in `fcd939a` so the plan trail survives in git history.**

## Performance

- **Duration**: ~15 min (across two debug sessions — 2026-05-09 pause logging the H1-H4 hypothesis ledger + 2026-05-10 resume H1 probe + capability fix + cleanup + retroactive plan write)
- **Started**: 2026-05-09 (dogfood walkthrough surfaces blocker → `.continue-here.md` written)
- **Completed**: 2026-05-10 ~20:34 UTC (commit `fcd939a` lands plan + 3 source files + cargo auto-rebuild caught the capability change in 12.07s)
- **SUMMARY committed**: 2026-05-14 (during `/gsd-execute-phase 1` retroactive closeout)
- **Tasks completed**: 5 of 5
- **Files modified**: 3 source + 1 plan (committed together) + 1 SUMMARY (this commit)

## Accomplishments

- **T-1-49 root-caused via H1 probe**: dogfood walkthrough on 2026-05-09 surfaced window-unmovable bug. After 4 wasted in-chat fixes (drag-region attribute, JS fallback, drag-region "false" inner opt-out, cursor: grab visual), the H1 devtools probe (`window.__TAURI_INTERNALS__` present + `getCurrentWindow().startDragging()`) immediately surfaced the real signal: `window.start_dragging not allowed. Permissions associated with this command: core:window:allow-start-dragging`. Tauri 2.x does NOT bundle this permission into `core:default` — every consumer of the `start_dragging` IPC command must declare it explicitly.
- **Capability fix via SSOT path**: edited `scripts/gen-capabilities.ts` to add `core:window:allow-start-dragging` between `core:default` and `shell:default`; regenerated `src-tauri/capabilities/default.json` via `node --experimental-strip-types scripts/gen-capabilities.ts`; audit passed on first run (SSOT-drift check 1). Tauri's dev watcher auto-detected the capabilities JSON change and triggered cargo rebuild in 12.07s — no manual restart needed.
- **44-line cleanup in `+page.svelte`**: removed the 30-line `onMount(() => { ... addEventListener("mousedown", ...) → win.startDragging() })` JS fallback + its 8-line preamble comment that falsely attributed the symptom to "Tauri 2's data-tauri-drag-region flakiness on macOS overlay-style titlebars under HMR" (a wrong diagnosis that would have misled future maintainers); dropped the `import { onMount } from "svelte"` (no longer used); removed `cursor: grab/grabbing` rules on `.stage` and `.titlebar` (default cursor restored per user request after drag works).
- **Pure-native drag path verified**: with capability declared, native `[data-tauri-drag-region]` attribute trio (`.stage="true"` / `.window="false"` / `.titlebar="true"`) is sufficient. No JS bridge needed. User confirmed drag works on both `.titlebar` (always) and `.stage` matte bezel (where >=1340px viewport breakpoint applies).
- **Phase 1 dogfood A-04 unblocked**: the BLOCKED → PASS flip on dogfood-checklist row A-04 was the immediate purpose of this plan — plan 01-07 Task 4 (CHECKPOINT visual verification) can now resume.
- **Retroactive plan trail preserved**: plan 01-10-PLAN.md committed in the SAME commit as the source files (`fcd939a`). Frontmatter sets `gap_closure: true + retroactive: true` so audit tooling can distinguish this from forward plans. Future `git blame` on the capability line or the deleted onMount lines navigates back to a structured rationale, not just `.continue-here.md` (which is transient and was retired post-closeout).
- **Out-of-scope discipline maintained**: same devtools probe surfaced a SECOND issue — CSP `connect-src` directive missing `ipc:` protocol (Tauri auto-falls-back to postMessage, so symptom is noisy console errors + slower IPC, not a hard failure). Explicitly NOT addressed in this plan; deferred to plan 01-11 so the planner agent writes that one forward (not retroactively).

## Deviations from plan

- **None on the source-code side** — the plan is itself retroactive, so the 5 tasks describe what was already applied. The plan was written to match the merged code, not the other way around.
- **Commit grain**: plan called for "Single commit: plan 01-10-PLAN.md + the three source files." Actual commit `fcd939a` matches this — generator + JSON + svelte route + plan file together. SUMMARY committed separately on 2026-05-14 (after retroactive flag detection during `/gsd-execute-phase 1`).
- **No H2/H3 follow-up needed**: H4 was sufficient empirically. The 4 wasted in-chat fixes from 2026-05-09 had already added enough native-drag scaffolding (`data-tauri-drag-region` on `.stage`/`.window`/`.titlebar`) that capability declaration alone closed the gap. H2 (HMR de-armed) and H3 (`decorations + titleBarStyle: Overlay` flaky) hypotheses left documented in retroactive_note for post-mortem reference.

## Verification

- **`grep -n "core:window:allow-start-dragging"`** on both `scripts/gen-capabilities.ts:116` and `src-tauri/capabilities/default.json:10`: PASS — both files contain the literal.
- **`bash scripts/audit-capabilities.sh`**: `[audit] PASS` (SSOT drift, wildcard absence, --bare absence, --max-turns presence, vendored parser non-installation, browser-safety, legacy-file absence — all 8 checks pass).
- **`node --experimental-strip-types scripts/gen-capabilities.ts && git diff --exit-code src-tauri/capabilities/default.json`**: exit 0 — regenerator output matches the committed JSON byte-for-byte (regen-idempotent invariant).
- **`grep -nE "startDragging|cursor:\s*grab" src/routes/+page.svelte`**: 0 matches — fallback fully removed.
- **Visual drag**: user-confirmed during 2026-05-09–10 debug session and again on 2026-05-14 ahead of plan retroactive write.

## Lessons for future-self

1. **Always run H1 (devtools probe of the actual API) FIRST** when a Tauri 2 IPC-mediated feature fails silently. The error message is the fastest path to root-cause; 4 chat-driven hypothesis attempts cost more debug cycles than a single 30-second probe would have. This is the precedent for the dev-feedback-loop infrastructure that became Phase 01.1.
2. **`core:default` is not a hammer.** Every Tauri 2 capability surface needs explicit declaration. A future audit-script check could lint for IPC commands used in code that lack matching capability permissions — track as a follow-up improvement opportunity (not implemented here).
3. **Retroactive plans are a real workflow shape**, not a process bug. When `/gsd-debug` finds + applies a fix mid-blocker, writing the plan AFTER the fix (with `retroactive: true` flag) is faster and more accurate than reconstructing a forward plan from chat. The discipline is: same commit must contain both, and `retroactive_note` must own the process-violation acknowledgement.
4. **Misdiagnosis comments are toxic.** The 8-line preamble that said "data-tauri-drag-region flakiness on macOS overlay-style titlebars under HMR" would have wasted future maintainers' time. When fixing a misdiagnosis, delete the misdiagnosis text alongside the wrong code — leaving it as a comment is worse than deleting it cleanly.

## Out of scope (carried forward)

- **Plan 01-11 — CSP `connect-src` missing `ipc:` protocol**: surfaced in the SAME devtools probe but explicitly deferred. To be routed via `/gsd-plan-phase 1 --gaps-only` so the planner agent writes it forward.
- **Tauri capability scope tightening per-window**: revisit when REQ-12 multi-session sidebar arrives (single-window Phase 1 makes window-grain permission acceptable).
- **Audit-script enhancement** (IPC command ↔ capability permission lint): captured as Lesson #2 above; not implemented in this plan.

---

*Plan 01-10 closes T-1-49. Code landed in commit `fcd939a` (2026-05-10). SUMMARY committed 2026-05-14 during `/gsd-execute-phase 1` retroactive closeout. Phase 1 dogfood A-04 unblocked. Next plan 01-11 (CSP `ipc:` gap) — routed via separate `/gsd-plan-phase 1 --gaps-only`.*
