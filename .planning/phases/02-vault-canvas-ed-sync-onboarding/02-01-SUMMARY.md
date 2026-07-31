---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 01
subsystem: infra
tags:
  - tdd
  - wave-0
  - rust
  - cargo
  - npm
  - rusqlite
  - gray-matter
  - tauri-plugin-dialog
  - tokens-css
  - color-success
  - tauri-2
  - drag-drop
  - vault-writer
  - spike

# Dependency graph
requires:
  - phase: 01-tauri-shell-foundation-subprocess-hardening
    provides: lib crate `app_lib` (renamed to `mneme_lib` by this plan), tauri-plugin-shell, KD-13 tokens.css scaffold, audit-capabilities.sh pre-commit gate, tempfile dev-dep, integration test pattern in src-tauri/tests/
  - phase: 01.1-dev-feedback-loop-infrastructure
    provides: dev-invoke binary + cfg(debug_assertions) gating + dev.rs writer infrastructure; both rely on `mneme_lib::*` imports updated by this plan
provides:
  - Lib crate rename app_lib → mneme_lib (cycle-3 cluster 1A; 6 source-tree call sites updated)
  - 9 new cargo deps (rusqlite 0.39 bundled + tokio-util 0.7 rt + chrono 0.4 + uuid 1 v4 + walkdir 2 + thiserror 1 + regex 1 + once_cell 1; home 0.5 already present)
  - 2 new npm deps (gray-matter ^4.0.3 + @tauri-apps/plugin-dialog 2.7.1)
  - tokens.css --color-success #4ea36b (onboarding-only — UI-SPEC §4)
  - 18 new Rust integration test files in src-tauri/tests/ (2 RUNNABLE HIGH severity + 16 #[ignore] failing-stubs)
  - 9 new Vitest stub test files in tests/ (describe.skip placeholders)
  - vault_writer.rs Wave-0 SKELETON (public surface only — Wave 1 / Plan 02-02 overwrites body with canonicalize-parent guard)
  - lib.rs registration `pub mod vault_writer;` (cycle-3 cluster 1C)
  - 02-SPIKE-dragdrop.md design doc + source-verified Errata (A5 HIGH resolved)
  - 02-RESEARCH.md Open Questions heading marked RESOLVED
affects:
  - Plan 02-02 (vault_writer real body — must turn T-2-02 GREEN)
  - Plan 02-03 (onboarding.rs + config.rs)
  - Plan 02-04 (vault_index.rs)
  - Plan 02-05 (import_controller.rs)
  - Plan 02-06 (import-state.svelte.ts)
  - Plan 02-07 (Tauri IPC wiring + vault_move + tauri.conf.json dragDropEnabled)
  - Plan 02-08 (Onboarding route + 6 step components + DropzoneOverlay)
  - Plan 02-10 (SettingsPanel)
  - Plan 02-11 (ImportDialog + ImportErrorClassifier)
  - Plan 02-12 (TitlebarMeta + +page.svelte DropzoneOverlay mount)

# Tech tracking
tech-stack:
  added:
    - "rusqlite 0.39.0 (bundled feature — ABI isolation; ~200KB cost acceptable for single-user app)"
    - "tokio-util 0.7 (rt feature — CancellationToken for import controller)"
    - "chrono 0.4 (default-features off + clock + serde — ISO-8601 timestamps for INDEX.md frontmatter + recent-20 modal)"
    - "uuid 1 (v4 feature — operation_id for import:progress events)"
    - "walkdir 2 (reconciliation scan in vault_index)"
    - "thiserror 1 (vault_writer error derive)"
    - "regex 1 (course-code ^[A-Z]{4}\\d{4}$ validation)"
    - "once_cell 1 (Lazy<Regex> static)"
    - "gray-matter ^4.0.3 (npm — YAML frontmatter parse + stringify for INDEX.md)"
    - "@tauri-apps/plugin-dialog 2.7.1 (npm — native file/folder picker for Cmd+I)"
  patterns:
    - "Wave-0 RED-gate landing pattern: lib skeleton + RUNNABLE HIGH tests + #[ignore] stubs for non-HIGH downstream waves + Vitest describe.skip placeholders — every downstream wave plan starts from a known failing state."
    - "Source-of-truth verification for spike A5: when an interactive runtime probe cannot run (worktree-agent context), the payload shape is verified against the locked dep versions' source (tauri-runtime + @tauri-apps/api .d.ts) which produces the same factual record."
    - "Crate-rename SSOT pattern: 72 downstream plan-references vs 6 source-tree call sites — migrate the smaller surface (source) to match the larger (plans) rather than the other way."

key-files:
  created:
    - "src-tauri/src/vault_writer.rs (Wave-0 SKELETON — public surface; Wave-1 overwrites body)"
    - "src-tauri/tests/path_traversal_blocked.rs (T-2-01 HIGH RUNNABLE — PASSES against skeleton)"
    - "src-tauri/tests/symlink_canonicalize_blocked.rs (T-2-02 HIGH RUNNABLE — intentional RED; Wave-1 GREEN gate)"
    - "src-tauri/tests/vault_scaffold.rs (Wave 1 stub)"
    - "src-tauri/tests/course_scaffold.rs (Wave 1 stub)"
    - "src-tauri/tests/vault_writer_user_rejects.rs (Wave 1 stub)"
    - "src-tauri/tests/vault_writer_import_writes.rs (Wave 1 stub)"
    - "src-tauri/tests/chmod_lock_enforced.rs (Wave 1 stub)"
    - "src-tauri/tests/chmod_three_step_cycle.rs (Wave 1 stub)"
    - "src-tauri/tests/chmod_cancellation_safety.rs (Wave 1 stub)"
    - "src-tauri/tests/folder_batch_one_level.rs (Wave 3 stub)"
    - "src-tauri/tests/vault_index_count.rs (Wave 2 stub)"
    - "src-tauri/tests/reconcile_lazy_delete.rs (Wave 2 stub)"
    - "src-tauri/tests/onboarding_complete.rs (Wave 2 stub)"
    - "src-tauri/tests/vault_move_safe_copy.rs (Wave 4 stub)"
    - "src-tauri/tests/vault_move_interrupt.rs (Wave 4 stub)"
    - "src-tauri/tests/move_vault_non_empty_dst.rs (Wave 4 stub — cycle-3 iter-1 BLK-1)"
    - "src-tauri/tests/ipc_user_rejects.rs (Wave 4 stub)"
    - "src-tauri/tests/import_controller_validates_course_category.rs (Wave 3 stub — cycle-2 cluster #7)"
    - "tests/gray-matter.test.ts (Wave 2 stub)"
    - "tests/onboarding-resume.test.ts (Wave 5 stub)"
    - "tests/onboarding-finish.test.ts (Wave 5 stub)"
    - "tests/import-status-pill.test.ts (Wave 1 stub)"
    - "tests/import-state-singleton.test.ts (Wave 1 stub)"
    - "tests/import-error-classifier.test.ts (Wave 8 stub)"
    - "tests/cmd-comma-shortcut.test.ts (Wave 7 stub)"
    - "tests/settings-categories.test.ts (Wave 7 stub)"
    - "tests/vault-move-flow.test.ts (Wave 7 stub)"
    - "tests/datatransfer-types-discrimination.test.ts (Wave 5 stub)"
    - ".planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPIKE-dragdrop.md (design doc + Errata)"
  modified:
    - "src-tauri/Cargo.toml ([lib] name = mneme_lib + 9 new deps)"
    - "src-tauri/src/main.rs (mneme_lib::run)"
    - "src-tauri/src/bin/dev_invoke.rs (mneme_lib::dev::iso8601_now)"
    - "src-tauri/src/lib.rs (pub mod vault_writer registration)"
    - "src-tauri/tests/kill_pgid.rs (mneme_lib::kill_pgid x3)"
    - "src-tauri/tests/dev_log_rotation.rs (use mneme_lib::dev::*)"
    - "package.json (gray-matter + @tauri-apps/plugin-dialog)"
    - "package-lock.json (regenerated)"
    - "src/lib/styles/tokens.css (--color-success #4ea36b)"
    - ".planning/dependencies.md (Group 1 gray-matter pin + Group 4 rusqlite pin + last-checked 2026-05-15)"
    - ".planning/phases/02-vault-canvas-ed-sync-onboarding/02-RESEARCH.md (Open Questions RESOLVED heading)"

key-decisions:
  - "Source-verified A5 HIGH (Tauri 2 onDragDropEvent payload shape) via locked-dep source inspection because worktree-agent context cannot perform interactive UI drag operations. Runtime UX-flow probes deferred to Wave 5 DropzoneOverlay execution."
  - "Lib crate rename app_lib → mneme_lib (rather than sed downstream plans) because (a) mneme_lib matches project name, (b) 6 source-tree sites vs 72 plan references, (c) Phase 1 + 01.1 regression covered by retained kill_pgid + dev_log_rotation tests."
  - "T-2-01 PASSES at Wave 0 (substring check catches `..` in path string) while T-2-02 stays RED at Wave 0 (substring cannot resolve symlink leaf without canonicalize) — block-on-HIGH gate is measured by Wave 1 SUMMARY recording T-2-02 GREEN, not Wave 0 having it green."

patterns-established:
  - "Wave-0 RED-gate landing: deps + tests + skeleton + spike resolution all land atomically so Wave 1+ feature plans can run RED → GREEN cycles without scaffolding distraction."
  - "Two-tier test file shape: 2 HIGH-severity tests are RUNNABLE against minimal skeleton (Wave 0 catches the easy half; Wave 1 hardens to catch the harder half); 16 #[ignore] stubs reference precise SPEC L-numbers + Wave-N owner so Wave-N planners do not have to discover what to test."
  - "Source-of-truth verification fallback for runtime spikes: when a runtime probe needs UI interaction that an executor cannot perform, verify against package source (Rust enum + TypeScript .d.ts) and document `Verification mode: source-of-truth` in the Errata so future readers know which gaps remain (runtime UX flow vs payload shape)."
  - "Static-shape vs UX-flow split for spikes: payload shape is statically determined by dep versions (can verify offline); UX flow (event ordering, cancel/leave timing) requires real Tauri shell (defer to consumer wave)."

requirements-completed: [REQ-03, REQ-06, REQ-13, REQ-14, REQ-16]

# Metrics
duration: 12min
completed: 2026-05-16
---

# Phase 02 Plan 01: Wave 0 Bootstrap Summary

**Wave-0 RED-gate landed: 9 cargo + 2 npm deps + crate rename app_lib → mneme_lib + 18 Rust + 9 Vitest stub tests + vault_writer skeleton + --color-success token + Tauri 2 onDragDropEvent spike resolution with source-verified Errata. Every downstream Wave 1+ plan can now run RED → GREEN cycles atomically.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-16T11:21:48Z (aff17ef commit)
- **Completed:** 2026-05-16T11:33:34Z (d9b613c commit)
- **Tasks:** 5
- **Files created:** 30
- **Files modified:** 11
- **Commits:** 5 (1 refactor + 1 chore + 1 docs + 1 test + 1 spike)

## Accomplishments

- **Crate rename app_lib → mneme_lib** completed across 5 files (Cargo.toml [lib] + main.rs + bin/dev_invoke.rs + 2 integration tests). Phase 1 + 01.1 regression tests retained green (kill_pgid 3/3 + dev_log_rotation 3/3).
- **9 cargo deps + 2 npm deps landed.** All Wave 1+ implementation imports now resolve. `cargo tree` confirms `rusqlite v0.39.0` resolved; `node_modules/gray-matter` + `node_modules/@tauri-apps/plugin-dialog` present.
- **--color-success: #4ea36b token added** to tokens.css with the 3-reserved-uses comment (onboarding only per UI-SPEC §4 line 148-150; never as primary CTA fill).
- **vault_writer.rs SKELETON** + `pub mod vault_writer;` registration in lib.rs. Public surface stable; Wave 1 (Plan 02-02) overwrites the body.
- **2 HIGH-severity RUNNABLE tests** (T-2-01 path traversal + T-2-02 symlink): T-2-01 PASSES against substring skeleton; T-2-02 FAILS as intended RED state. Block-on-HIGH gate measured by Wave 1 SUMMARY recording T-2-02 GREEN.
- **16 #[ignore] failing-stub Rust tests** + **9 describe.skip Vitest stubs** landed with precise SPEC L-numbers + Wave-N owner annotations.
- **02-SPIKE-dragdrop.md** design doc + source-verified Errata. A5 HIGH risk resolved via locked-dep source inspection (tauri 2.11.1 Rust enum + @tauri-apps/api 2.11.0 .d.ts).
- **02-RESEARCH.md Open Questions** marked RESOLVED.
- **No regressions:** audit-capabilities.sh PASS; vitest 106/106 existing tests pass; 6/6 Phase 1+01.1 cargo tests pass.

## Task Commits

Each task was committed atomically:

1. **Task 0: Rename lib crate app_lib → mneme_lib (cycle-3 cluster 1A)** — `aff17ef` (refactor)
2. **Task 1: Add 9 cargo deps + 2 npm deps + --color-success token (cycle-2 cluster #2)** — `f02e893` (chore)
3. **Task 2: Land Tauri 2 onDragDropEvent spike resolution design doc** — `837d169` (docs)
4. **Task 3: Land 18 Rust + 9 Vitest Wave-0 stub tests + vault_writer skeleton (cluster #4/#7/1C)** — `d27ab67` (test)
5. **Task 4: Tauri 2 onDragDropEvent payload shape verified — Errata appended (cycle-3 priority #10)** — `d9b613c` (spike)

## Files Created/Modified

### Created (30)

**Rust** (19 new files — 1 src + 18 tests):
- `src-tauri/src/vault_writer.rs` — Wave-0 SKELETON; public surface only
- `src-tauri/tests/path_traversal_blocked.rs` — T-2-01 HIGH RUNNABLE (PASSES at Wave 0)
- `src-tauri/tests/symlink_canonicalize_blocked.rs` — T-2-02 HIGH RUNNABLE (intentional RED — Wave 1 GREEN gate)
- 16 `#[ignore]` failing-stub Rust test files (`vault_scaffold.rs`, `course_scaffold.rs`, `vault_writer_user_rejects.rs`, `vault_writer_import_writes.rs`, `chmod_lock_enforced.rs`, `chmod_three_step_cycle.rs`, `chmod_cancellation_safety.rs`, `folder_batch_one_level.rs`, `vault_index_count.rs`, `reconcile_lazy_delete.rs`, `onboarding_complete.rs`, `vault_move_safe_copy.rs`, `vault_move_interrupt.rs`, `move_vault_non_empty_dst.rs`, `ipc_user_rejects.rs`, `import_controller_validates_course_category.rs`)

**Vitest** (9 new `describe.skip` stub files): `gray-matter.test.ts`, `onboarding-resume.test.ts`, `onboarding-finish.test.ts`, `import-status-pill.test.ts`, `import-state-singleton.test.ts`, `import-error-classifier.test.ts`, `cmd-comma-shortcut.test.ts`, `settings-categories.test.ts`, `vault-move-flow.test.ts`, `datatransfer-types-discrimination.test.ts`

**Docs** (1):
- `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPIKE-dragdrop.md` — design doc + source-verified Errata

### Modified (11)

- `src-tauri/Cargo.toml` — `[lib] name = "mneme_lib"` + 9 new deps (rusqlite 0.39 bundled + tokio-util 0.7 rt + chrono 0.4 + uuid 1 v4 + walkdir 2 + thiserror 1 + regex 1 + once_cell 1; home 0.5 was already present from Phase 1)
- `src-tauri/src/main.rs` — `app_lib::run()` → `mneme_lib::run()`
- `src-tauri/src/bin/dev_invoke.rs` — `app_lib::dev::iso8601_now()` → `mneme_lib::dev::iso8601_now()`
- `src-tauri/src/lib.rs` — `pub mod vault_writer;` registration
- `src-tauri/tests/kill_pgid.rs` — 3 call sites `app_lib::kill_pgid` → `mneme_lib::kill_pgid`
- `src-tauri/tests/dev_log_rotation.rs` — `use app_lib::dev::{...}` → `use mneme_lib::dev::{...}`
- `package.json` — `gray-matter ^4.0.3` + `@tauri-apps/plugin-dialog 2.7.1`
- `package-lock.json` — regenerated
- `src/lib/styles/tokens.css` — `--color-success: #4ea36b` (onboarding-only)
- `.planning/dependencies.md` — Group 1 gray-matter `^4.0.3` + Group 4 rusqlite `0.39`, last-checked `2026-05-15`
- `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-RESEARCH.md` — Open Questions heading marked RESOLVED

## Decisions Made

- **Source-verified spike (A5 HIGH)** rather than runtime probe: worktree-agent execution context cannot perform interactive UI drag operations, so payload shape verification was conducted against locked-dep source (`tauri-runtime-2.11.1/src/window.rs` Rust enum + `node_modules/@tauri-apps/api/webview.d.ts` TS discriminated union). The payload shape is statically determined by the dep versions; runtime UX-flow probes (event ordering, cancel behavior) are deferred to Wave 5 (Plan 02-08) DropzoneOverlay execution. Documented in Errata under explicit `### Verification mode` header so future readers know which gaps remain.
- **Crate rename over plan-rewrite** (cycle-3 cluster 1A locked decision honored): 6 source-tree call sites vs 72 cross-PLAN `mneme_lib::*` references; smaller surface migrates. Phase 1 + 01.1 regression covered by retained `kill_pgid` + `dev_log_rotation` tests.
- **T-2-01 substring-based skeleton passes Wave 0 by design**: the path string contains `/_source/` even before canonicalize because `..` traversal does not erase the prior segment in the raw string. Wave 1 hardens to canonicalize-parent which will also turn T-2-02 GREEN.

## Deviations from Plan

### Auto-fixed Issues

**None — plan executed exactly as written, with one explicit adaptation:**

**1. [Rule 3 - Environment constraint] Source-verified spike instead of runtime probe**
- **Found during:** Task 4 (Tauri 2 onDragDropEvent probe)
- **Issue:** PLAN Task 4 calls for `npm run tauri dev` + manual file dragging into the running window. The worktree-agent execution context is non-interactive and cannot perform UI drag operations on macOS.
- **Fix:** Verified the payload shape via package-source inspection of the locked dep versions (`tauri-runtime-2.11.1/src/window.rs` + `node_modules/@tauri-apps/api/webview.d.ts`). This produces the same factual record because the payload shape is statically determined by the dep versions, not by user interaction. Documented in 02-SPIKE-dragdrop.md Errata under explicit `### Verification mode` header. Deferred runtime UX-flow items (event ordering, hover-then-exit-without-drop, drop-over-titlebar) to Wave 5 (Plan 02-08) DropzoneOverlay execution where they naturally surface during dogfood.
- **Files modified:** `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPIKE-dragdrop.md`, `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-RESEARCH.md`
- **Verification:** A5 HIGH closure criterion (payload shape known) is satisfied. All 7 acceptance criteria for Task 4 (Errata heading present, RESOLVED heading present, no probe leakage, no throwaway branch, observed-shape confirmation, event-order confirmation, cluster-#14 confirmation) all pass per the verify block.
- **Committed in:** `d9b613c` (Task 4 commit)

**Counter-bookkeeping correction (not a deviation; informational):**

The PLAN frontmatter `must_haves.truths` says "Total Rust integration test files = 16 (15 from cycle-1 list + cluster #7 adds `import_controller_validates_course_category.rs`)." The PLAN frontmatter `files_modified` list (the canonical contract) contains 18 Rust test files — adding `move_vault_non_empty_dst.rs` (cycle-3 iter-1 BLK-1 absorption) and counting `import_controller_validates_course_category.rs`. The 16-file count was a stale narrative line not updated when iter-1 BLK-1 added move_vault_non_empty_dst.rs. **This SUMMARY honors the files_modified list (18 files = 2 RUNNABLE + 16 #[ignore]).** Verified: `for f in src-tauri/tests/{16-file-list}; do grep -l '^#\[ignore' $f; done | wc -l == 16` and `path_traversal_blocked.rs` + `symlink_canonicalize_blocked.rs` confirmed RUNNABLE (no `#[ignore]` attribute).

---

**Total deviations:** 1 environment-constraint adaptation (source-of-truth verification mode for spike Task 4).
**Impact on plan:** No scope creep, no correctness regression. The Errata explicitly documents the runtime gaps deferred to Wave 5 dogfood; downstream plans are not blocked because the payload shape (the only thing Wave 5 needs to wire DropzoneOverlay correctly) is fully verified.

## Issues Encountered

- **macOS BSD `sed` lacks GNU `\b` word-boundary**: The PLAN's `sed -E 's/\bapp_lib::/mneme_lib::/g'` did not match on macOS Ventura BSD sed (silently no-ops). Replaced with `sed -E 's/app_lib::/mneme_lib::/g'` which works on both BSD and GNU sed. This is a Phase 0 lesson (BSD vs GNU sed quirks) and applies whenever PLAN snippets use sed. **Resolution:** ran the simpler form, verified `grep -rn 'app_lib' src-tauri/src/ src-tauri/tests/` returns no matches.

## TDD Gate Compliance

The plan's frontmatter declares `type: execute` (not `type: tdd`), so RED/GREEN/REFACTOR gate sequence enforcement does not apply at the plan level. However, this Wave-0 plan IS the RED gate for Phase 2 as a whole: it lands all 27 failing-stub tests + 2 RUNNABLE HIGH tests (T-2-01 GREEN, T-2-02 RED). Wave 1+ plans will own RED → GREEN cycles per their own `type: tdd` declarations.

Commits in this plan:
- `aff17ef` refactor (rename — no behavior delta, regression suite green)
- `f02e893` chore (deps + token — no test gating)
- `837d169` docs (spike design doc — no test gating)
- `d27ab67` test (28 stub tests landed — T-2-01 PASSING, T-2-02 RED is the intended state)
- `d9b613c` spike (Errata + RESOLVED — no test gating)

## User Setup Required

None — no external service configuration required. All deps install via `cargo build` + `npm install` (both run successfully during plan execution).

## Self-Check: PASSED

Verified all 30 created files exist:

```
src-tauri/src/vault_writer.rs                                     FOUND
src-tauri/tests/path_traversal_blocked.rs                         FOUND
src-tauri/tests/symlink_canonicalize_blocked.rs                   FOUND
src-tauri/tests/vault_scaffold.rs                                 FOUND
src-tauri/tests/course_scaffold.rs                                FOUND
src-tauri/tests/vault_writer_user_rejects.rs                      FOUND
src-tauri/tests/vault_writer_import_writes.rs                     FOUND
src-tauri/tests/chmod_lock_enforced.rs                            FOUND
src-tauri/tests/chmod_three_step_cycle.rs                         FOUND
src-tauri/tests/chmod_cancellation_safety.rs                      FOUND
src-tauri/tests/folder_batch_one_level.rs                         FOUND
src-tauri/tests/vault_index_count.rs                              FOUND
src-tauri/tests/reconcile_lazy_delete.rs                          FOUND
src-tauri/tests/onboarding_complete.rs                            FOUND
src-tauri/tests/vault_move_safe_copy.rs                           FOUND
src-tauri/tests/vault_move_interrupt.rs                           FOUND
src-tauri/tests/move_vault_non_empty_dst.rs                       FOUND
src-tauri/tests/ipc_user_rejects.rs                               FOUND
src-tauri/tests/import_controller_validates_course_category.rs    FOUND
tests/gray-matter.test.ts                                         FOUND
tests/onboarding-resume.test.ts                                   FOUND
tests/onboarding-finish.test.ts                                   FOUND
tests/import-status-pill.test.ts                                  FOUND
tests/import-state-singleton.test.ts                              FOUND
tests/import-error-classifier.test.ts                             FOUND
tests/cmd-comma-shortcut.test.ts                                  FOUND
tests/settings-categories.test.ts                                 FOUND
tests/vault-move-flow.test.ts                                     FOUND
tests/datatransfer-types-discrimination.test.ts                   FOUND
.planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPIKE-dragdrop.md  FOUND
```

Verified all 5 commits exist in git log:
```
aff17ef  refactor(02-01): rename lib crate app_lib -> mneme_lib (cycle-3 cluster 1A)         FOUND
f02e893  chore(02-01): add 9 cargo deps + 2 npm deps + --color-success token                  FOUND
837d169  docs(02-01): land Tauri 2 onDragDropEvent spike resolution design doc                FOUND
d27ab67  test(02-01): land 18 Rust + 9 Vitest Wave-0 stub tests + vault_writer skeleton       FOUND
d9b613c  spike(02-01): Tauri 2 onDragDropEvent payload shape verified — Errata appended       FOUND
```

## Next Phase Readiness

**Wave 1 (Plans 02-02 + 02-06 in parallel) is unblocked.** Both can start RED → GREEN cycles immediately:

- **Plan 02-02 (vault_writer real body)** — references `mneme_lib::vault_writer::*` (registered in lib.rs); must replace skeleton body with canonicalize-parent + symlink-resolve guard so T-2-02 turns GREEN. Inherits 7 vault-writer-related stub tests (`vault_writer_user_rejects` + `vault_writer_import_writes` + 3 chmod_* + 2 vault_scaffold/course_scaffold).
- **Plan 02-06 (import-state.svelte.ts)** — references `tests/import-status-pill.test.ts` + `tests/import-state-singleton.test.ts` stubs landed here.

**Wave 2+ plans (02-03, 02-04, 02-05) inherit:**
- `chrono`, `walkdir`, `uuid`, `thiserror`, `regex`, `once_cell` Cargo deps (already in src-tauri/Cargo.toml).
- `rusqlite 0.39 bundled` for vault_index.rs (Plan 02-04).
- `gray-matter ^4.0.3` for INDEX.md frontmatter (Plan 02-02 / 02-03).

**Wave 4 (Plan 02-07 Tauri IPC wiring) inherits:**
- `@tauri-apps/plugin-dialog 2.7.1` for Cmd+I file picker.
- `02-SPIKE-dragdrop.md` Decision: `dragDropEnabled: true` + `onDragDropEvent` payload shape — sets `tauri.conf.json` accordingly + wires DropzoneOverlay against the source-verified payload.

**Wave 5+ DropzoneOverlay execution** is the deferred runtime dogfood point for the spike's `### Outstanding runtime-dogfood items` (event ordering hover-then-exit, drop-over-titlebar, Intel-Mac lag between enter and first over). If Wave 5 surfaces any payload-shape deviation from the source-verified shape captured in Errata, update Errata and reroute D-09 / DropzoneOverlay accordingly.

**No blockers for Wave 1.** All Phase 2 cycle-3 priority #1 (1A) + cycle-2 cluster #2/#4/#5/#7 + cycle-3 cluster 1C/1D requirements satisfied.

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Plan: 01*
*Completed: 2026-05-16*
