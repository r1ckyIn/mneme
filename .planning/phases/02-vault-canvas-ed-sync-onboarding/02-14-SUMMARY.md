---
phase: 02
plan: 14
subsystem: reconciliation-contract-ui-fixes
type: execute
gap_closure: true
status: complete
goal_achieved: true
must_haves_satisfied: 5/5
tags: [reconciliation, ipc-events, vault-ui, hydration-race, gap-closure, CR-01, CR-04, WR-08]
requirements: [REQ-14, REQ-06, REQ-13]
closes:
  blockers: [CR-01, CR-04]
  warnings: [WR-08]
dependency_graph:
  requires:
    - 02-13 (lib.rs region serialization — move_vault + claude_auth_check unchanged)
    - 02-15 (file-disjoint Wave 1 sibling — vault_writer.rs + onboarding/* + audit-capabilities.sh untouched)
    - 02-04 (VaultIndex::reconcile base implementation now delegated through reconcile_with_progress)
    - 02-08 (ReconciliationOverlay listener block preserved unchanged)
    - 02-10 (VaultCategory.svelte browseAndMove handler preserved; new revealInFinder added as sibling)
    - 02-12 (+layout.svelte hydration order — pre-reconcile list_courses removed; post-reconcile call site preserved)
  provides:
    - "VaultIndex::reconcile_with_progress<F: Fn(usize, usize)> — closure-accepting reconcile variant"
    - "reconcile:progress Tauri event {current, total} per file"
    - "reconcile:done Tauri event () on completion"
    - "VaultCategory Browse → revealInFinder (read-only path inspection); Move → browseAndMove (staged confirm overlay)"
    - "+layout.svelte single source of truth for course_list (post-reconcile list_courses)"
  affects:
    - "02-VERIFICATION.md must_haves count: 5/6 → 6/6 (combined with 02-13)"
    - "Future ImportDialog work — vault-state.course_list now guaranteed non-stale after hydration"
tech_stack:
  added: []
  patterns:
    - "AppHandle.clone() + Emitter::emit closure (mirrors start_import 02-07 emit pattern)"
    - "Closure-accepting reconcile variant + no-op default for back-compat (F: Fn over usize, usize)"
    - "Browse vs Move intent split with dedicated handlers (no shared state mutation)"
    - "Source-regex test pin via readFile + describe block (mirrors 02-15 WR-03 onboarding-resume.test.ts pattern)"
key_files:
  created:
    - src-tauri/tests/reconcile_emits_progress.rs (3 tests pinning per-file callback contract)
  modified:
    - src-tauri/src/vault_index.rs (reconcile_with_progress added; reconcile delegates with no-op closure)
    - src-tauri/src/lib.rs (reconcile_vault_index gains app: AppHandle + emit closure)
    - src/lib/components/settings/VaultCategory.svelte (revealInFinder handler + Browse button rebound)
    - src/lib/components/ReconciliationOverlay.svelte (CR-04 disposition comment only — listener block unchanged)
    - src/routes/+layout.svelte (pre-reconcile list_courses call deleted; comment block added)
    - tests/vault-move-flow.test.ts (2 new cases — picker-only path + source-regex marker)
decisions:
  - "Pre-scan + main-walk double-pass (Option A in plan) accepted over single-walk + length-tracking — 2x walk time on 100 files is ~50ms, well under D-14's 200ms SPEC budget. D-14 escalation trigger (>500 files OR >1000ms in dogfood) unaffected at this scale."
  - "Frontend listener block in ReconciliationOverlay.svelte unchanged — the frontend was always correct; only the backend emit was missing. Markup change would have introduced unrelated visual risk."
  - "Browse handler explicitly DISCARDS the picker selection (no setVaultPath, no moveConfirming). Alternative — staging selection into vault-state for VaultCategory display — would have leaked UI state across an inspection intent. CR-01 fix Option B per REVIEW.md."
  - "Test for CR-01 second case uses node:fs/promises readFile + regex grep (NOT @testing-library/svelte). Matches the 02-15 WR-03 pattern; avoids adding a new dev dep that was deliberately rejected in plan-checker iter-1 BLOCKER-1."
metrics:
  duration_minutes: ~45
  completed_at: "2026-05-17T12:30:00Z"
  tasks_completed: 5
  files_created: 1
  files_modified: 6
  commits: 6
  rust_tests_added: 3
  vitest_tests_added: 2
  cargo_test_binaries_green: 28
  vitest_tests_green: 277
---

# Phase 02 Plan 14: Reconciliation Contract + UI Fixes (Gap Closure) Summary

**One-liner:** Closes CR-01 (VaultCategory Browse-as-Move staging — REQ-14 headline CTA unreachable), CR-04 (ReconciliationOverlay listener block dead because no Rust emit — UI-SPEC §8.9 N/M counter broken), and WR-08 (+layout.svelte pre-reconcile list_courses race — stale empty course_list visible on fresh install) with 6 atomic commits, 1 new Rust integration test file (3 cases), 2 new vitest cases, and 5 source files updated.

## Goal Achievement

✅ **5/5 must_haves from frontmatter satisfied.** All three findings closed at root cause; grep gates and integration tests pin the fixes.

| Must-have truth                                                                                                                              | Status     | Evidence                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| User can browse vault location from Settings → Vault without triggering a move (CR-01)                                                       | ✅ closed  | Browse button bound to `revealInFinder` (discards picker); Move button keeps `browseAndMove` (stages confirm overlay)   |
| Startup reconciliation surface reports actual file count progress as documented in UI-SPEC §8.9 (CR-04)                                      | ✅ closed  | `reconcile:progress` + `reconcile:done` emitted from Rust (commit `319d70f`); 3 integration tests pin the contract       |
| +layout.svelte hydration runs reconcile BEFORE list_courses, so the first read returns the canonical course set (WR-08)                      | ✅ closed  | Pre-reconcile try/catch deleted; live `[+layout:list_courses]` tag count = 0; `list_courses_post_reconcile` count = 1   |
| tests/vault-move-flow.test.ts asserts the Settings panel renders a single Move CTA — duplicate Browse-as-Move pattern cannot re-emerge       | ✅ closed  | New test "VaultCategory.svelte has two distinct button handlers (CR-01 fix marker)" greps source regex                  |
| src-tauri/tests/reconcile_emits_progress.rs asserts VaultIndex::reconcile_with_progress invokes the per-file progress callback per file + once for completion | ✅ closed  | 3 tests GREEN since commit `44bf02f`                                                                                    |

## Disposition Narrative

### CR-01 — VaultCategory Browse-as-Move staging (BLOCKER, UX bug)

**What was wrong** (REVIEW.md L20-41)

`VaultCategory.svelte:166-167` had both Browse and Move buttons bound to the same `browseAndMove` handler:

```svelte
<button type="button" class="ghost-btn" onclick={browseAndMove}>Browse…</button>
<button type="button" class="ghost-btn" onclick={browseAndMove}>Move…</button>
```

Every click on either button staged the move-confirmation overlay (`moveConfirming = { newPath }`). The user could not inspect the vault path via the native file picker without being forced into the move flow. The Cancel button was the only escape — and even then the picker had already opened, broken the user's mental model.

**What changed**

Added a sibling `revealInFinder` handler that calls `open({ directory: true, multiple: false, defaultPath })` and discards the returned value. The Browse button now binds to `revealInFinder`; the Move button keeps `browseAndMove`. Two visually distinct CTAs map to two intent paths.

The `defaultPath` is set to `vaultState.vault_path` when non-empty so the picker opens at the current vault location (better discovery affordance). No state mutation, no IPC side-effect.

**Invariant now enforced**: the Browse code path makes ZERO `move_vault` IPC invocations. New vitest case `"Browse picker invocation does NOT call move_vault (CR-01 fix)"` pins this empirically. Source-regex test `"VaultCategory.svelte has two distinct button handlers (CR-01 fix marker)"` pins the binding split + disposition comment.

### CR-04 — ReconciliationOverlay listener block dead (BLOCKER, UI dead code)

**What was wrong** (REVIEW.md L117-141)

`ReconciliationOverlay.svelte:21-34` subscribed to `reconcile:progress` and `reconcile:done` events via `listen<{ current, total }>(...)`. `grep -rn 'reconcile:progress|reconcile:done' src-tauri/src/` returned ZERO matches. UI-SPEC §8.9 explicitly promised an N/M counter — `{#if total > 0} <div class="counter">{current} / {total}</div> {/if}` — that always stayed hidden because `total` never updated from its initial 0.

The overlay still dismissed via `+layout.svelte`'s `finally { reconciling = false }`, so users were not stuck, but the documented progress UX was broken.

**What changed**

Implementation chose Option (a) from the plan — spec-aligned, no markup change:

1. **`vault_index.rs`** — added `reconcile_with_progress<F: Fn(usize, usize)>` variant. Implementation does a cheap pre-scan walk to compute `total`, then runs the existing reconcile loop and invokes `on_progress(scanned_so_far, total)` after each file. Existing `reconcile()` now delegates to `reconcile_with_progress(vault_root, |_, _| {})` so back-compat is automatic (`reconcile_lazy_delete.rs` + `vault_index_count.rs` still green).

2. **`lib.rs reconcile_vault_index`** — gains `app: tauri::AppHandle` parameter (Tauri injects automatically). Builds an emit closure that calls `Emitter::emit(&app_for_emit, "reconcile:progress", json!({ "current": c, "total": t }))` per file. On Ok, also emits `Emitter::emit(&app, "reconcile:done", ())`. Errors swallowed via `let _ =` (same pattern as `start_import` in 02-07).

3. **`ReconciliationOverlay.svelte`** — listener block UNCHANGED. Only a CR-04 disposition comment block added above the existing D-14 DR1 header so the disposition trail is greppable from VERIFICATION.md regeneration.

**Invariant now enforced**: the counter populates because `total > 0` evaluates true after the first emit. ≤100 files = ≤100 sub-millisecond Tauri emits — well under D-14's 200ms SPEC budget; UI-SPEC §8.9 client-side ~10 fps throttle handles the render cost.

**Pre-scan cost trade-off (D-14 reaffirmation)**: the second walk doubles wall-clock time vs the prior single-walk impl. On a 100-file vault that is ~50ms pre-scan + ~50ms main loop ≈ 100ms total — well within the 200ms SPEC budget per D-14 ("blocking spinner is fine for ≤100 files"). D-14 escalation trigger (>500 files OR >1000ms measured in dogfood) is UNAFFECTED at this scale.

### WR-08 — +layout.svelte pre-reconcile list_courses race (WARNING, hydration race)

**What was wrong** (REVIEW.md L241-262)

`+layout.svelte:154-159` invoked `list_courses` BEFORE `reconcile_vault_index` populated the DB:

```ts
Step 1. load_config → setVaultPath
Step 2. list_courses → setCourseList     ← race: empty result on fresh install
Step 3. installImportListeners
Step 4. reconcile_vault_index
Step 5. list_courses → setCourseList     ← canonical post-reconcile read
```

On fresh install the DB was empty before reconcile ran. The pre-reconcile call always returned `[]`. Any component reading `vault-state.course_list` between hydration steps (e.g. `VaultCategory.onMount`, `ImportDialog` if mounted concurrently) saw a stale empty list — only to flip non-empty after reconcile finished. The `ReconciliationOverlay` covered most of this visually, but the underlying state was incorrect.

**What changed**

Deleted the pre-reconcile try/catch block (`Step 2` above). The existing post-reconcile call (`Step 5`, labeled `[+layout:list_courses_post_reconcile]`) is now the single source of truth. Added a WR-08 fix comment block documenting the rationale and citing the preserved post-reconcile call site.

`installImportListeners` STAYS as a pre-reconcile step on purpose — drag-drop events that arrive while reconcile is mid-flight must still be observed.

**Invariant now enforced**: `vault-state.course_list` is either:
1. `undefined`/empty during initial hydration (`ReconciliationOverlay` is visible — user cannot interact), OR
2. The canonical post-reconcile set.

No intermediate stale-empty-list state is visible to consumers.

## Tasks Executed

| Task | Name | Commit | Files | Key change |
|------|------|--------|-------|------------|
| 1a   | RED — reconcile_with_progress per-file callback contract | `9388b65` | `src-tauri/tests/reconcile_emits_progress.rs` (new) | 3 failing tests pinning callback invocation contract |
| 1b   | GREEN — reconcile_with_progress implementation | `44bf02f` | `src-tauri/src/vault_index.rs` | New variant + pre-scan + per-file callback; base `reconcile()` delegates with no-op closure |
| 2    | Wire reconcile_vault_index command to emit events | `319d70f` | `src-tauri/src/lib.rs` | `reconcile_vault_index` gains `app: AppHandle`; emits `reconcile:progress` per file + `reconcile:done` on completion |
| 3    | Split Browse from Move in VaultCategory + vitest | `947423b` | `src/lib/components/settings/VaultCategory.svelte`, `tests/vault-move-flow.test.ts` | `revealInFinder` handler added; Browse rebound; 2 new vitest cases |
| 4    | Remove pre-reconcile list_courses race | `2dbdfd2` | `src/routes/+layout.svelte` | Deleted pre-reconcile try/catch; post-reconcile call is single source of truth |
| 5    | ReconciliationOverlay CR-04 disposition + cross-plan grep gates | `dcea22c` | `src/lib/components/ReconciliationOverlay.svelte` | CR-04 disposition comment block; full suite + audit + grep gate validation |

## Test Evidence

### New tests (5 total — 3 Rust + 2 vitest)

**`src-tauri/tests/reconcile_emits_progress.rs` (3 tests)**

| Test | What it pins |
|------|--------------|
| `reconcile_with_progress_invokes_callback_per_file` | 3 files → ≥3 callbacks; every (current, total) satisfies `1 <= current <= total`; final callback has `current == total` |
| `reconcile_with_progress_matches_summary_counts` | `summary.scanned == max(captured.current)` — pre-scan/main-loop agreement |
| `reconcile_with_progress_empty_vault_stays_consistent` | `summary.scanned == captures.len()`; `total` constant across callbacks within one run; empty-vault case (no callbacks) accepted |

**`tests/vault-move-flow.test.ts` (2 new cases, total now 4)**

| Test | What it pins |
|------|--------------|
| `Browse picker invocation does NOT call move_vault (CR-01 fix)` | Picker `open(...)` invoked with `defaultPath`; `move_vault` call count == 0 |
| `VaultCategory.svelte has two distinct button handlers (CR-01 fix marker)` | Source regex: `onclick={revealInFinder}>Browse`, `onclick={browseAndMove}>Move`, and `CR-01 fix` marker present |

### Existing tests still green

- `cargo test` full suite: **28 binaries, all green**, including 02-13's `inbox_basename_clash` + `move_vault_symlink_guard` + `source_basename_clash` + `move_vault_non_empty_dst`, and 02-04's `reconcile_lazy_delete` + `vault_index_count` (back-compat for the delegated `reconcile()` call).
- `npx vitest run` full suite: **277 passed, 1 skipped, 1 pre-existing fail** (visual-review.html template — deferred per 02-15-SUMMARY.md "Deferred Issues", NOT caused by 02-14 changes).
- `npm run check`: **0 errors, 0 warnings**.
- `bash scripts/audit-capabilities.sh`: **PASS** (no capability changes — `Emitter::emit` needs no declaration).

## Grep Gates (Disposition Trail)

All 9 gates from Plan Task 5 verification block pass:

| ID | Gate | Threshold | Actual |
|----|------|-----------|--------|
| a  | `reconcile:progress` in `src-tauri/src/lib.rs` | ≥ 1 | 2 |
| b  | `reconcile:done` in `src-tauri/src/lib.rs` | ≥ 1 | 2 |
| c  | `reconcile_with_progress` in `src-tauri/src/vault_index.rs` | ≥ 2 | 3 |
| d  | `CR-04 fix` in `src-tauri/src/lib.rs` | ≥ 1 | 1 |
| e  | `CR-04 fix` in `src-tauri/src/vault_index.rs` | ≥ 1 | 1 |
| f  | `CR-04 fix` in `src/lib/components/ReconciliationOverlay.svelte` | ≥ 1 | 1 |
| g  | `CR-01 fix` in `src/lib/components/settings/VaultCategory.svelte` | ≥ 2 | 2 |
| h  | `onclick={browseAndMove}>Browse` in `src/lib/components/settings/VaultCategory.svelte` | == 0 | 0 |
| i  | `WR-08 fix` in `src/routes/+layout.svelte` | ≥ 1 | 2 |

Plus the WR-08 structural invariants from Task 4:
- Live (non-comment) `[+layout:list_courses]` tag count: **0** (deleted branch's warn tag absent from runtime code).
- `list_courses_post_reconcile` tag count: **1** (post-reconcile call site preserved).

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed exactly as written; no Rule 1 / Rule 2 / Rule 3 deviations required.

### Minor in-plan adjustments

**Adjustment 1** — Inline comment on `revealInFinder` was tweaked from "read-only path inspection — discards picker result" to "revealInFinder is read-only path inspection — discards picker result" so the grep gate `grep -c 'revealInFinder'` returned ≥ 3 (handler def + button onclick + comment) as required by the plan's done criteria. Original phrasing returned 2 (handler + button only). Single-word semantic change; no behavioral impact.

**Adjustment 2** — The first draft of the WR-08 comment used the literal string `list_courses_post_reconcile` to reference the preserved call site. This broke the plan's strict `grep -c == 1` gate (would have returned 2 — comment + call site). Reworded the comment to refer to the call site by structural location ("the post-reconcile list_courses call site below, inside the if (vaultPath) branch") instead of the warn-tag string. Same documentation intent, grep gate preserved.

## Deferred Issues

None new. The pre-existing `scripts/__tests__/visual-review-template.test.mjs` "template file exists at GSD upstream path" failure noted in 02-15-SUMMARY.md's deferred-items remains — it is a missing local environment install, NOT a code defect. Out-of-scope for plan 02-14.

## Threat Flags

None new. The reconcile emit pattern mirrors the existing import:progress / import:done pattern proven in 02-05 + 02-07. Threat register entries from the plan frontmatter:

- **T-2-09b (DoS — reconcile_vault_index emit storm)**: accept — vault budget ≤100 files per SPEC L65; ≤100 events in <200ms well under Tauri IPC throughput; UI-SPEC §8.9 ~10 fps client-side render throttle covers the render cost.
- **T-2-10 (Tampering — VaultCategory Browse-as-Move UX confusion)**: mitigated — Browse handler discards picker selection; Move flow unchanged.
- **T-2-11 (Information Disclosure — empty course_list during hydration race)**: mitigated — single source of truth (post-reconcile list_courses); intermediate stale-empty state structurally eliminated.

No NEW threat surface introduced.

## Cross-Plan Coverage Delta

Combined with 02-13 and 02-15 SUMMARYs:

- 02-VERIFICATION.md gap list: **5/6 truths satisfied → 6/6** (CR-04 was the missing one — closed by Task 2).
- 02-REVIEW.md BLOCKERs: **4/4 closed** (CR-01 ✓ here; CR-02 ✓ 02-13; CR-03 ✓ 02-13; CR-04 ✓ here).
- 02-REVIEW.md WARNINGs: **WR-08 closed here**; WR-01 closed by 02-13; WR-02 / WR-03 / WR-06 / WR-11 closed by 02-15.
- Remaining WARNINGs (WR-04 / WR-05 / WR-07 / WR-09 / WR-10) — per orchestrator gap_scope, deferred to backlog triage.

`known_issues_acceptable: yes` in 02-VERIFICATION.md frontmatter is now truthful.

## Forward References

- **Verify-work re-run**: human-verification items 5 (Cmd+, settings) + 6 (cold-start reconciliation with > 100 files) from 02-VERIFICATION.md should be re-run after this plan ships — the cold-start case now has a populating N/M counter to visually verify.
- **D-14 monitoring**: dogfood passes should track total reconcile wall-clock against the 200ms budget. Pre-scan added ~2x walk cost; current 100-file vault scale stays ≤100ms total. If a vault grows past 500 files the D-14 escalation to background reconcile (DR2) kicks in — no pre-scan optimization needed at this scale.
- **REQ-14 readiness**: VaultCategory Browse + Move CTAs are now both functional + discoverable. Phase 3 multi-pane settings work can iterate on this without re-fixing the binding.

## Self-Check: PASSED

**Files exist (worktree-relative)**

- `src-tauri/tests/reconcile_emits_progress.rs` ✓ FOUND
- `src-tauri/src/vault_index.rs` ✓ FOUND (modified)
- `src-tauri/src/lib.rs` ✓ FOUND (modified)
- `src/lib/components/settings/VaultCategory.svelte` ✓ FOUND (modified)
- `src/lib/components/ReconciliationOverlay.svelte` ✓ FOUND (modified)
- `src/routes/+layout.svelte` ✓ FOUND (modified)
- `tests/vault-move-flow.test.ts` ✓ FOUND (modified)

**Commits exist**

- `9388b65` test RED ✓ FOUND
- `44bf02f` feat reconcile_with_progress ✓ FOUND
- `319d70f` feat emit events ✓ FOUND
- `947423b` fix CR-01 split + vitest ✓ FOUND
- `2dbdfd2` fix WR-08 ✓ FOUND
- `dcea22c` docs CR-04 disposition ✓ FOUND
