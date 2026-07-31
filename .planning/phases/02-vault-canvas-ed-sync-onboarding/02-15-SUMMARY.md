---
phase: 02
plan: 15
subsystem: gap-closure-hardening
tags: [vault-writer, onboarding, audit, security-hardening, gap-closure, WR-02, WR-03, WR-06, WR-11]
requires: [02-13]
provides: [WR-02-closed, WR-03-closed, WR-06-closed, WR-11-closed]
affects: [src-tauri/src/vault_writer.rs, src/lib/components/onboarding/Onboarding.svelte, src/lib/components/onboarding/Step5AddCourse.svelte, scripts/audit-capabilities.sh, tests/onboarding-resume.test.ts]
tech_stack:
  added: []
  patterns: [RAII-Drop-sole-authority, URL-as-truth-state-derivation, anchored-path-whitelist, frontend-Rust-defense-in-depth, readFile-regex-source-pin]
key_files:
  created: []
  modified:
    - src-tauri/src/vault_writer.rs
    - src/lib/components/onboarding/Onboarding.svelte
    - src/lib/components/onboarding/Step5AddCourse.svelte
    - scripts/audit-capabilities.sh
    - tests/onboarding-resume.test.ts
decisions:
  - "WR-02 Variant B (delete explicit post-write chmod; Drop is sole relock authority) chosen over Variant A (disarm before chmod) — minimal lines, simpler contract, same observable behavior. RelockGuard armed/disarm dead code removed."
  - "WR-11 frontend + Rust defense-in-depth: Step5AddCourse.addCourse refuses empty vaultRoot AND vault_writer::create_course refuses empty/non-absolute root. Either layer alone is insufficient (frontend can be bypassed by direct IPC; Rust alone would surface a less friendly error path)."
  - "WR-03 source-regex test strategy chosen over component-mount: the @testing-library/svelte dep was deliberately NOT added (plan-checker iter-1 BLOCKER-1). Tests use node:fs/promises readFile + vitest regex assertions to pin the WR-03 contract in source code; pattern mirrors 02-14 Plan Task 3 Test 2."
  - "Local 'loaded' rebound to 'loadedState' inside onMount try-block to avoid shadowing the new module-scope $state gate. The merge line becomes `onboardingState = { ...loadedState, current_step: initialStep }`."
metrics:
  duration: "~13 min (commit 008ec3c through SUMMARY)"
  completed: "2026-05-17T01:54Z"
  tasks: 6
  files_modified: 5
  commits: 5
---

# Phase 02 Plan 15: Hardening Cluster (Gap-Closure) Summary

Single-shot hardening of 4 REVIEW.md WARNINGs (WR-02 / WR-03 / WR-06 / WR-11) targeting 4 disjoint files — collapses double-relock chmod paths, derives onboarding step from URL truth instead of stale state, anchors an audit-script whitelist regex against future filename collisions, and closes a Step 5 direct-URL footgun that could scaffold courses relative to cwd.

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed exactly as written; no Rule 1 / Rule 2 / Rule 3 deviations required.

### Auto-removed dead code

**[Cleanup tied to WR-02 Variant B] Removed RelockGuard.armed field + disarm() method**
- **Found during:** Task 1 (WR-02 fix)
- **Issue:** Variant B leaves the `disarm()` call site empty (Drop is now unconditional), so `armed: bool` and `fn disarm(&mut self)` become dead code with `if self.armed { ... }` in `Drop::drop` always taking the true branch.
- **Fix:** Simplified `RelockGuard` struct to just `path: &'a Path`; removed `disarm`; simplified `Drop::drop` to unconditional best-effort `set_permissions`.
- **Why this is in-scope (not Rule 1):** the dead code was a direct mechanical consequence of the WR-02 fix, not a pre-existing issue. Keeping `disarm` as a dead method would have invited future bug reports.
- **Files modified:** `src-tauri/src/vault_writer.rs`
- **Commit:** `008ec3c`

## Deferred Issues

Logged in `.planning/phases/02-vault-canvas-ed-sync-onboarding/deferred-items.md`:

- **`scripts/__tests__/visual-review-template.test.mjs` first case "template file exists at GSD upstream path"** — pre-existing FAIL (confirmed via `git stash` against commit `1c0157c` baseline). Asserts a GSD upstream template lives at `~/.claude/get-shit-done/templates/visual-review.html`; the current developer environment does not have that file installed. Not caused by plan 02-15 changes. Per scope-boundary rule: not fixed.

## Tasks Executed

| Task | Name | Commit | Files | Key change |
|------|------|--------|-------|------------|
| 1 | WR-02 + WR-11 Rust defense | `008ec3c` | `src-tauri/src/vault_writer.rs` | Variant B: Drop is sole relock authority (delete explicit post-write chmod 0o444, remove `disarm`); `create_course` adds empty/non-absolute root rejection via new `VaultWriterError::Validation` variant. |
| 2 | WR-03 Onboarding source fix | `ace379e` | `src/lib/components/onboarding/Onboarding.svelte`, `.planning/phases/02-vault-canvas-ed-sync-onboarding/deferred-items.md` | `next()` now reads `Math.min(6, initialStep + 1)` from URL truth (was stale `onboardingState.current_step + 1`); new module-scope `let loaded = $state(false)` gate flips at the END of `onMount` (after the async load resolves OR throws); `next()` short-circuits with `if (saving || !loaded) return;`. onMount's local `loaded` renamed to `loadedState` to avoid shadowing. |
| 3 | WR-03 source-regex test pins | `ca91383` | `tests/onboarding-resume.test.ts` | New sibling describe block `"WR-03 fix — Onboarding.svelte source-file invariants"` with 3 tests: (a) URL-truth formula present + stale formula absent + WR-03 marker; (b) `loaded $state` gate declared + consulted + flipped; (c) shadow-prone local `const loaded = await invoke<OnboardingState>` absent. NO component mount; NO Svelte testing-library dep added. |
| 4 | WR-11 Step5 frontend guard | `94c8113` | `src/lib/components/onboarding/Step5AddCourse.svelte` | `addCourse()` early-returns with `lastAddError = "Vault path not set — go back to Step 3."` when `vaultRoot` is empty / whitespace-only. Mirrors existing `lastAddError` rendering pattern; no new visual state. |
| 5 | WR-06 anchored regex | `51ae7e9` | `scripts/audit-capabilities.sh` | Gate 9's `import_handle()` whitelist regex changed `(vault_writer|import_controller|lib)\.rs$` → `/(vault_writer|import_controller|lib)\.rs$`. Leading slash anchors to path separator; future `<x>_lib.rs` filenames no longer inherit the whitelist. Self-test comment added documenting positive + negative cases. |
| 6 | Cross-plan smoke + grep gates | (verification — no commit) | (none) | Confirmed 5 disposition grep gates green; audit-capabilities.sh PASS; full cargo test green; svelte-check 0/0; vitest 263 passed + 1 pre-existing fail (deferred). |

## WR-02 / WR-03 / WR-06 / WR-11 Disposition Trail

### WR-02 — RelockGuard double-attempt elimination

**Root cause** (REVIEW.md L159-180): `with_temporary_writable_permission` ran an explicit `set_permissions(path, 0o444)?` AFTER the closure succeeded. If that chmod failed, `?` returned early WITHOUT calling `guard.disarm()`, so the `Drop` impl then re-ran the same `set_permissions(..., 0o444)` and hit the same failure mode. Both calls' errors were swallowed (one by `?` map_err, one by `let _ =`); net effect was wasted work + a fragile contract.

**Fix (Variant B chosen)**: deleted the explicit post-write chmod; let `Drop` be the sole relock site. Local `_guard` binding is dropped at end of scope, AFTER `f()`'s tail-expression value is computed, so the relock fires on EVERY exit path (happy / Err / panic). Removed `RelockGuard.armed: bool` + `fn disarm` since they are now dead code (Drop is unconditional).

**Why Variant B over Variant A**: Variant A (disarm before chmod) would keep the explicit chmod in the happy path and rely on Drop only for failure paths. Variant B collapses to one code path. Both have identical observable behavior under the existing tests (`chmod_three_step_cycle` / `chmod_lock_enforced` / `chmod_cancellation_safety`); Variant B is materially simpler.

**Invariant now enforced**: the relock count per `with_temporary_writable_permission` call is exactly 1 regardless of success / failure / panic. `chmod_cancellation_safety.rs::cancel_midcycle_relocks_or_returns_err` continues to pass — its contract permits either 0o444 (Drop relocked) or 0o644 (relock itself failed), and Variant B preserves both end-states.

**Threat T-2-12 (Tampering: chmod double-relock state divergence) — mitigated.**

### WR-03 — Onboarding stale-state step advance

**Root cause** (REVIEW.md L184-194): `next()` read `onboardingState.current_step`, which was bound to the URL `initialStep` prop via a `$effect`. On slow systems, a user could click Continue between (a) URL-prop change triggering `$effect` propagation and (b) the `$effect` actually mutating state. The save then wrote a stale step value silently to JSON.

**Fix**:
1. `next()` body changed `Math.min(6, onboardingState.current_step + 1)` → `Math.min(6, initialStep + 1)`. URL is the truth.
2. Defense-in-depth: added module-scope `let loaded = $state(false);` gate, flipped to `true` at the END of `onMount` (after the async `load_onboarding_state` IPC resolves OR throws). `next()` first guard becomes `if (saving || !loaded) return;` — a pre-mount click cannot advance.
3. Shadowing fix: onMount's local `const loaded = await invoke<OnboardingState>("load_onboarding_state")` renamed to `loadedState` so the module-scope `$state` binding is unambiguous.

**Invariant now enforced**: `next()` cannot compute `nextStep` from un-merged state. JSON state cannot get into an incoherent `{current_step: N, vault_path: ""}` hybrid via slow-IPC race.

**Threat T-2-13 (Tampering: stale-state step advance) — mitigated.**

### WR-06 — audit-capabilities.sh whitelist regex too loose

**Root cause** (REVIEW.md L216-229): Gate 9's `import_handle()` caller audit used `grep -vE '(vault_writer|import_controller|lib)\.rs$'`. The pattern `lib\.rs$` matched ANY file ending in `lib.rs` — `my_lib.rs`, `evil_lib.rs`, `tauri_lib.rs`, etc. A future contributor (or malicious actor) could accidentally (or deliberately) inherit the whitelist by naming a new file `<x>_lib.rs`.

**Fix**: anchored the regex with a leading `/` slash → `/(vault_writer|import_controller|lib)\.rs$`. Only literal whitelist paths (`/vault_writer.rs`, `/import_controller.rs`, `/lib.rs`) match. Added a self-test comment documenting the positive + negative cases.

**Invariant now enforced** (verified during Task 5):
- `src-tauri/src/lib.rs` matches the whitelist (excluded — correct)
- `src-tauri/src/vault_writer.rs` matches (excluded — correct)
- `src-tauri/src/import_controller.rs` matches (excluded — correct)
- `src-tauri/src/my_lib.rs` does NOT match (would be flagged — correct)
- `src-tauri/src/evil_lib.rs` does NOT match (would be flagged — correct)
- `src-tauri/src/tauri_lib.rs` does NOT match (would be flagged — correct)

**Dogfooding note**: the pre-commit hook for THIS very commit ran the new anchored regex against the live tree and successfully whitelisted `vault_writer.rs` + `import_controller.rs` (the only two real callers). `bash scripts/audit-capabilities.sh` returns `[audit] PASS`.

**Threat T-2-14 (Tampering: whitelist regex bypass via filename) — mitigated.**

### WR-11 — Step5 direct-URL bypass writing courses to cwd

**Root cause** (REVIEW.md L305-322): `Step5AddCourse.addCourse` invoked `course_create` with `root: vaultRoot` where `vaultRoot` flowed from `Onboarding.svelte::onboardingState.vault_path`. If the user reached Step 5 via direct URL `/onboarding/5` without completing Step 3, `vaultRoot` was `""`. The Rust handler then passed `Path::new("")` to `vault_writer::create_course`, which computed `root.join("courses").join(code)` → `courses/COMP3221` relative to cwd. In dev cwd is the project root; in production cwd may be `/` or `/Applications`.

**Fix (two-layer defense-in-depth)**:
1. **Frontend (`Step5AddCourse.svelte`)**: `addCourse()` early-returns with `lastAddError = "Vault path not set — go back to Step 3."` when `vaultRoot` is empty / whitespace-only. Mirrors the existing `lastAddError` rendering pattern; no new visual state.
2. **Rust (`vault_writer.rs::create_course`)**: added an early-return rejecting empty `root` with `VaultWriterError::Validation("vault root must be non-empty")` AND rejecting non-absolute `root` with `VaultWriterError::Validation("vault root must be absolute")`. Uses a new error variant; existing `course_scaffold` tests continue to pass.

**Invariant now enforced**: direct URL `/onboarding/5` without Step 3 completion cannot scaffold `courses/<CODE>` relative to cwd, regardless of whether the path is bypassed at the frontend or invoked directly via IPC.

**Threat T-2-15 (Tampering: direct-URL bypass writing courses to cwd) — mitigated.**

## Test Strategy (WR-03 source-regex pins)

Per plan-checker iter-1 BLOCKER-1, the original plan attempted runtime component testing via `@testing-library/svelte`, but that dependency is NOT in `package.json` and a full Svelte 5 component mount harness was rejected as out-of-scope for a gap-closure plan. The replacement strategy is **source-file regex assertions**, mirroring 02-14 Plan Task 3 Test 2's `node:fs/promises readFile + regex` model.

### New test cases (3 added to `tests/onboarding-resume.test.ts`)

| Test name | Pins |
|-----------|------|
| `"Onboarding.svelte next() computes nextStep from URL initialStep (WR-03 fix marker)"` | `Math.min(6, initialStep + 1)` formula present; stale `Math.min(6, onboardingState.current_step + 1)` formula GONE; disposition marker `WR-03 fix` present. |
| `"Onboarding.svelte exposes a 'loaded' \\$state gate that blocks next() pre-mount (WR-03 defense-in-depth)"` | `let loaded = $state(false)` declaration present; `if (saving || !loaded) return;` guard present in `next()`; `loaded = true` flip-to-true site present (end of onMount). |
| `"Onboarding.svelte onMount renames its local 'loaded' to avoid shadowing the \\$state gate"` | OLD shadow-prone local binding `const loaded = await invoke<OnboardingState>` is ABSENT. The new non-shadowing alternative (executor chose `loadedState`) is not asserted to a specific name — only the old shape's absence. |

Existing 3 IPC-contract tests (`load_onboarding_state` / `save_onboarding_state` / `complete_onboarding`) preserved unchanged. Total `onboarding-resume.test.ts`: 6 tests (3 IPC + 3 source-regex), all PASS.

### Dependencies not added

- `@testing-library/svelte` (count of literal occurrences in `tests/onboarding-resume.test.ts`: **0**; count in `package.json`: **0**) — never introduced.

## Disposition Grep Gates (all green)

| Gate | Pattern | File | Count | Threshold |
|------|---------|------|-------|-----------|
| (a) | `WR-02 fix` | `src-tauri/src/vault_writer.rs` | 4 | ≥ 1 |
| (b) | `WR-03 fix` | `src/lib/components/onboarding/Onboarding.svelte` | 5 | ≥ 1 |
| (c) | `WR-06 fix` | `scripts/audit-capabilities.sh` | 2 | ≥ 1 |
| (d) | `WR-11 fix` | `src/lib/components/onboarding/Step5AddCourse.svelte` | 1 | ≥ 1 |
| (e) | `WR-11` | `src-tauri/src/vault_writer.rs` (Rust defense-in-depth marker) | 2 | ≥ 1 |
| (f) | `/(vault_writer\|import_controller\|lib)` (anchored form) | `scripts/audit-capabilities.sh` | 1 | ≥ 1 |
| (g) | unanchored form in LIVE code (no `#` prefix) | `scripts/audit-capabilities.sh` | 0 | == 0 |

## Test Results

### Rust (`cargo test`)
- Full suite: 25 test binaries, all `ok` — **0 failures across the entire workspace** (chmod_three_step_cycle, chmod_lock_enforced, chmod_cancellation_safety, ipc_user_rejects, course_scaffold, vault_writer_import_writes, vault_writer_user_rejects, plus 18 other integration tests + the 20 unit tests in `lib.rs` + `dev.rs`).
- Critical WR-02 invariants: re-import preserves 0o444 (chmod_three_step_cycle PASS); raw fs::write hits PermissionDenied (chmod_lock_enforced PASS); cancel-mid-cycle ends at 0o444 OR 0o644 (chmod_cancellation_safety PASS — Drop still fires on panic via unwind).
- WR-11 Rust defense-in-depth: `course_scaffold::creates_course_dirs_and_index_md_idempotent` + `rejects_invalid_course_code` both PASS (existing tests unaffected by the new empty/non-absolute root rejection — the test passes an absolute tempdir path).

### TypeScript (`npx vitest run`)
- 23 test files passed, 1 skipped, 1 file failed (pre-existing, environment-dependency only — see Deferred Issues).
- Counts: 263 passed / 1 skipped / 1 failed.
- onboarding-resume.test.ts: 6/6 PASS (3 original IPC + 3 new WR-03 source-regex).
- onboarding-finish.test.ts: 2/2 PASS.
- All other onboarding / vault / import test suites: unchanged, no regressions.

### svelte-check (`npm run check`)
- 398 files / 0 errors / 0 warnings / 0 files-with-problems.

### audit-capabilities.sh
- `bash scripts/audit-capabilities.sh` → `[audit] PASS` (post-anchor regex change).
- Pre-commit hook dogfoods the new regex on EVERY commit in this plan starting from `51ae7e9`.

## Cross-plan smoke (Wave 1 settled)

This plan (02-15) runs in parallel with 02-13 (Wave 1) — file sets are disjoint. The worktree base commit `1c0157c` precedes the Wave 1 execute kick-off; when the orchestrator merges 02-13 + 02-15 to the main phase branch, both sets of commits will be present without overlap. After 02-14 (Wave 2) lands, the combined Wave 1 + Wave 2 cargo + vitest sweep should remain green.

The 5 disposition grep gates documenting the WR-02 / WR-03 / WR-06 / WR-11 trail across `vault_writer.rs` (Rust) / `Onboarding.svelte` (Svelte) / `Step5AddCourse.svelte` (Svelte) / `audit-capabilities.sh` (bash) / `vault_writer.rs` (Rust defense-in-depth marker) are stable in the source files committed in this plan and will survive the merge.

## Coverage Delta

Combined with 02-13 + 02-14 SUMMARYs (when those wave-mates complete), the gap-closure cycle for Phase 02 will close:

- **All 4 BLOCKERs** (CR-01 / CR-02 / CR-03 / CR-04 — owned by 02-13 + 02-14)
- **6 of 11 WARNINGs** (WR-01 owned by 02-13; WR-02 + WR-03 + WR-06 + WR-11 owned by THIS plan; WR-08 owned by 02-14)
- **Remaining 5 WARNINGs**: WR-04 (Step3 Enter-on-default footgun), WR-05 (Splitter post-banner reflow), WR-07 (safe_copy symlink reporting), WR-09 (start_import shutdown contract docs), WR-10 (DropzoneOverlay TS narrowing) — explicit backlog candidates per orchestrator gap_scope.
- **8 INFO items**: all explicit out-of-scope per orchestrator instructions.

## Forward Reference

Nothing — this plan is the tail of the gap-closure cycle. After execute-phase ships 02-13 + 02-14 + 02-15, `/gsd-verify-work 2` should re-run and produce `known_issues_acceptable: yes`; then ship via `/gsd-pr-branch main && /gsd-ship 2`.

## Self-Check: PASSED

Files created/modified verified to exist:
- FOUND: `src-tauri/src/vault_writer.rs` (modified)
- FOUND: `src/lib/components/onboarding/Onboarding.svelte` (modified)
- FOUND: `src/lib/components/onboarding/Step5AddCourse.svelte` (modified)
- FOUND: `scripts/audit-capabilities.sh` (modified)
- FOUND: `tests/onboarding-resume.test.ts` (modified)
- FOUND: `.planning/phases/02-vault-canvas-ed-sync-onboarding/deferred-items.md` (created)

Commits verified to exist (via `git log --oneline`):
- FOUND: `008ec3c` (Task 1 — WR-02 + WR-11 Rust defense-in-depth)
- FOUND: `ace379e` (Task 2 — WR-03 Onboarding source fix)
- FOUND: `ca91383` (Task 3 — WR-03 source-regex test pins)
- FOUND: `94c8113` (Task 4 — WR-11 Step5 frontend guard)
- FOUND: `51ae7e9` (Task 5 — WR-06 anchored regex)
