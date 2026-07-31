---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 06
subsystem: frontend
tags:
  - tdd
  - wave-1
  - svelte-5
  - reactive-singleton
  - state-management
  - import-status
  - vault-state
  - pill-derive
  - cycle-2-cluster-6
  - cycle-3-cluster-2

# Dependency graph
requires:
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 01
    provides: Wave-0 RED-gate stubs (tests/import-status-pill.test.ts + tests/import-state-singleton.test.ts as describe.skip placeholders), --color-success token, @tauri-apps/plugin-dialog dep
provides:
  - src/lib/import-state-derive.ts — pure derivePillState + formatRecency (no Svelte runes, no IPC)
  - src/lib/import-state.svelte.ts — Svelte 5 module-scope $state singleton + listen('import:progress'|'import:done') wiring
  - src/lib/vault-state.svelte.ts — Svelte 5 module-scope $state singleton for vault_path + alphabetical course_list
  - SSOT mirror for Rust ImportDoneEvent (ImportFailure.reason, ImportHistoryEntry shape)
  - Idempotent installImportListeners (`installed` flag — HMR-safe + dup-mount-safe)
  - Pill state machine: idle / importing / imported / partial / cancelled (5 PillState union variants per UI-SPEC §8.5)
  - 16 vitest tests green (10 derivePillState/formatRecency + 6 singleton coverage)
affects:
  - Plan 02-09/10 (SettingsPanel → VaultCategory reads `getVaultState().course_list`)
  - Plan 02-10 (TitlebarMeta modification — reads `getVaultState().vault_path` + `getImportState().pill_state`)
  - Plan 02-11 (ImportStatusPill.svelte + ImportHistoryModal — consumes `pill_state` directly; ImportHistoryModal renders `recent_20[].failures[].reason` rows)
  - Plan 02-08 (Onboarding flow — calls `setVaultPath()` + `setCourseList()` after backend hydration)

# Tech tracking
tech-stack:
  added:
    - "(none — uses Phase 1 Svelte 5 + @tauri-apps/api/event already locked in package.json)"
  patterns:
    - "Pure-function / reactive-singleton split: derivation logic lives in plain `.ts` (testable on Node fast path without jsdom Svelte mount); module-scope `$state` lives in `.svelte.ts` siblings that import + call the pure functions on mutation. Mirrors the Phase 1 stream-dispatch.ts (pure) + connection-state.svelte.ts (rune) shape."
    - "SSOT type-mirroring: TS interfaces for cross-language event payloads carry `// CYCLE-2 cluster #6 — Rust SSOT` headers + field-by-field comments tying snake_case names to the Rust struct. When Rust changes, the TS interface MUST change in the same PR."
    - "Idempotent listener install via `installed` boolean flag: HMR-survives + double-mount-safe. Test contract uses vi.mock('@tauri-apps/api/event') with a listenSpy counting per-event subscriptions."

key-files:
  created:
    - "src/lib/import-state-derive.ts (pure derivation — derivePillState + formatRecency + 3 type exports + ImportFailure interface)"
    - "src/lib/import-state.svelte.ts (Svelte 5 $state singleton + Tauri listener wiring + 6 exported functions)"
    - "src/lib/vault-state.svelte.ts (Svelte 5 $state singleton + 6 exported setters/getters)"
  modified:
    - "tests/import-status-pill.test.ts (Wave-0 describe.skip stub → 10 derivePillState + formatRecency tests; turned GREEN)"
    - "tests/import-state-singleton.test.ts (Wave-0 describe.skip stub → 6 singleton tests covering recordHistory FIFO + courseCount + idempotent install; turned GREEN)"

key-decisions:
  - "Pure-derive in separate file (`import-state-derive.ts` NOT `.svelte.ts`): keeps unit tests jsdom-mount-free + runs on Node fast path + reusable from non-Svelte contexts (e.g. future ImportHistoryModal data formatter). The `.svelte.ts` singleton imports and calls into it on every mutation."
  - "Idempotent install via `installed` flag (cycle-2 MEDIUM closure / cycle-3 cluster 2 contract pin): a boolean module-scope sentinel — first call subscribes, second call short-circuits. The test mocks `@tauri-apps/api/event::listen` to count per-event subscription invocations."
  - "ImportHistoryEntry / ImportFailure SHAPES mirror Rust ImportDoneEvent verbatim (cycle-2 cluster #6 — `failures[].reason` NOT `.message`). When Plan 02-05's Rust struct evolves, this TS interface MUST change in the same PR. Comments tie each field to the Rust source line."
  - "STALE_HISTORY_MS = 24h (UI-SPEC §8.5 L1029): pill returns to idle past 1 day to avoid `imported 5 · 7d ago` clutter. `formatRecency` itself still returns `Nd ago` because ImportHistoryModal (Wave 7) needs the full recency spectrum."
  - "Reactive singleton via `const state = $state<Shape>({...})` + `getState()` returning the live reference (Phase 1 connection-state.svelte.ts pattern). Consumers do NOT `import { state }` — Svelte 5 fine-grained reactivity tracks property access through the returned reference."

patterns-established:
  - "Pure-derive + reactive-singleton split for state surfaces: pure module exports types + derivation; `.svelte.ts` singleton imports pure module + wraps with `$state`. Tests cover the pure module without mount; integration tests cover the singleton via vi.mock."
  - "Test-only reset exports (`resetImportStateForTest`, `resetVaultStateForTest`): vitest beforeEach hooks call these instead of re-importing the module so the shared singleton reference stays stable across test cases."
  - "Tauri event listener mock pattern: `vi.mock('@tauri-apps/api/event', () => ({ listen: listenSpy }))` BEFORE any imports — the listenSpy returns an async no-op unlisten function so the singleton's bookkeeping (`unlisteners[]`) accepts it."

requirements-completed: [REQ-13]

# Metrics
duration: 5min
completed: 2026-05-16
---

# Phase 02 Plan 06: Import-State + Vault-State Reactive Singletons Summary

**Wave-1 frontend RED→GREEN: 3 small modules (1 pure derivation + 2 Svelte 5 `.svelte.ts` reactive singletons) + 16 vitest tests turn the Wave-0 `import-status-pill.test.ts` and `import-state-singleton.test.ts` stubs GREEN. Unblocks Wave 7+ ImportStatusPill / ImportHistoryModal / TitlebarMeta / SettingsPanel → VaultCategory components.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-16T11:45:20Z
- **Completed:** 2026-05-16T11:50:25Z
- **Tasks:** 2 (both TDD: RED → GREEN, no REFACTOR needed)
- **Files created:** 3 (src/lib/{import-state-derive.ts, import-state.svelte.ts, vault-state.svelte.ts})
- **Files modified:** 2 (tests/{import-status-pill.test.ts, import-state-singleton.test.ts})
- **Commits:** 2 (both `feat(02-06): ...`)
- **Tests green:** 16 / 16 (10 pure derivation + 6 singleton coverage)
- **svelte-check:** clean (0 errors, 0 warnings across 355 files)

## Accomplishments

- **`src/lib/import-state-derive.ts`** — pure derivation module. Exports `derivePillState(progress, recent, now): PillState` and `formatRecency(timestampIso, now): string` plus 3 interface types (`ImportProgress`, `ImportFailure`, `ImportHistoryEntry`) and the `PillState` discriminated union. No Svelte runes, no Tauri IPC, no jsdom dependency. Tests run on Node fast path.
- **`src/lib/import-state.svelte.ts`** — Svelte 5 module-scope `$state<ImportStateShape>` reactive singleton with FIFO `recent_20: ImportHistoryEntry[]` (cap 20), `current_op_id`, `progress`, and derived `pill_state`. Exports `getImportState`, `recordHistory`, `setProgress`, `refreshPillState`, `installImportListeners`, `uninstallImportListeners`, `resetImportStateForTest`. Listener install is IDEMPOTENT via an `installed` boolean (cycle-3 cluster 2 contract pin).
- **`src/lib/vault-state.svelte.ts`** — Svelte 5 module-scope `$state<VaultStateShape>` reactive singleton for `vault_path: string` + alphabetical `course_list: string[]`. Exports `getVaultState`, `setVaultPath`, `setCourseList`, `addCourse`, `removeCourse`, `courseCount`, `resetVaultStateForTest`. All mutating setters preserve the sorted invariant.
- **`tests/import-status-pill.test.ts`** (Wave-0 stub → GREEN) — 10 tests covering all 5 `PillState` variants + stale-history grace + 4 `formatRecency` boundaries (strict `<` per cycle-2 LOW).
- **`tests/import-state-singleton.test.ts`** (Wave-0 stub → GREEN) — 6 tests covering recordHistory error surfacing (cycle-2 cluster #6 `reason` field), recent_20 FIFO drop at 20, alphabetical course sort, vault path setter, courseCount, and `installImportListeners` idempotence (vi.mock on `@tauri-apps/api/event`).
- **SSOT mirror correctness:** `ImportHistoryEntry.failures[].reason` (NOT `.message`) verified at compile time + asserted in `recordHistory makes failures visible in recent_20[0]` test. Rust `ImportDoneEvent` (src-tauri/src/import_controller.rs from Plan 02-05) and TS interface stay synchronized.
- **No regressions:** full vitest suite still passes 192 tests (1 pre-existing failure in `scripts/__tests__/visual-review-template.test.mjs` is a GSD upstream template-path issue, completely unrelated to plan 02-06 files).

## Task Commits

Each task was committed atomically as `feat(02-06): ...`:

1. **Task 1: `import-state-derive.ts` pure derivation** — `78abd1c` — 10 derivePillState + formatRecency tests green
2. **Task 2: `import-state.svelte.ts` + `vault-state.svelte.ts` reactive singletons** — `7a1c89a` — 6 singleton tests green (recordHistory FIFO, courseCount, idempotent install)

## Files Created/Modified

### Created (3)

**Frontend libs:**

- `src/lib/import-state-derive.ts` (134 lines) — pure module: `derivePillState`, `formatRecency`, `ImportProgress`, `ImportFailure`, `ImportHistoryEntry`, `PillState`. Constant `STALE_HISTORY_MS = 24 * 3600 * 1000`.
- `src/lib/import-state.svelte.ts` (148 lines) — Svelte 5 `$state<ImportStateShape>` singleton + Tauri listener wiring. Exports 7 functions including `resetImportStateForTest` for test isolation.
- `src/lib/vault-state.svelte.ts` (66 lines) — Svelte 5 `$state<VaultStateShape>` singleton. Exports 7 functions including `resetVaultStateForTest` and the alphabetical-sort enforcement in `setCourseList`/`addCourse`.

### Modified (2)

- `tests/import-status-pill.test.ts` (was `describe.skip` stub → 119-line vitest file with 2 `describe` blocks / 10 tests). All 10 GREEN.
- `tests/import-state-singleton.test.ts` (was `describe.skip` stub → 134-line vitest file with 4 `describe` blocks / 6 tests). All 6 GREEN.

## Decisions Made

- **Pure-derive vs `.svelte.ts` split** — keeping `derivePillState` and `formatRecency` in plain `.ts` (no runes) lets vitest run them on the Node fast path without jsdom mount ceremony. The `.svelte.ts` singleton imports and calls them on every mutation so the derived state stays correct without consumer-side recomputation.
- **`derivePillState(progress, recent_20, now)` priority** — active import (`progress != null && last_file_status !== "done"`) wins over history. Status `"done"` falls through to history because it signals the operation finished; `recordHistory()` then clears `state.progress`. This avoids an `imported X · just now` flash while the listener is still processing the `done` event.
- **`MAX_HISTORY = 20`** (UI-SPEC §8.6 implicit) — `recordHistory()` keeps `recent_20` capped via `[entry, ...state.recent_20].slice(0, 20)`. ImportHistoryModal in Plan 02-11 reads the full 20 slots.
- **`STALE_HISTORY_MS = 24h`** — `derivePillState` returns `{ kind: "idle" }` when the latest entry is ≥1 day old so the pill hides instead of showing stale `imported 5 · 7d ago`. The `formatRecency` helper itself still computes `Nd ago` because ImportHistoryModal needs the full spectrum.
- **Idempotent `installImportListeners` via boolean `installed`** — first call subscribes both `import:progress` and `import:done` and pushes the unlisten fns into `unlisteners[]`; second call short-circuits at the `if (installed) return;` guard. Tests verify with vi.mock('@tauri-apps/api/event') and a `listenSpy` that the per-event subscription count stays at 1 after a double-install.
- **Const not `let` for `state`** — `const state = $state<Shape>({...})` (not `let`) because the rune wraps the value, not the binding. Mutating object properties triggers reactivity; reassigning the binding is forbidden and would be a bug.

## Deviations from Plan

### Auto-fixed Issues

**None — plan executed exactly as written.** All test cases, types, and acceptance criteria match the PLAN contract verbatim.

**One minor adaptation (NOT a deviation; test-architecture improvement):**

The PLAN's test snippet for the `installImportListeners` idempotence test (PLAN L516-531) mutates `mod.listen` via `(mod as any).listen = ...` after dynamic import. This is fragile — vitest's module cache may bypass the assignment, and the singleton's hoisted `import { listen }` already captured the original reference. The implemented test uses the cleaner pattern: `vi.mock('@tauri-apps/api/event', () => ({ listen: listenSpy }))` declared at the TOP of the test file BEFORE any imports. This ensures all module-scope `listen` references resolve to the spy. Same contract verified (single subscription per event after double-install); just the more robust vitest idiom.

## Issues Encountered

**None.**

- The Wave-0 stubs (describe.skip placeholders) gave a clean RED state — `npx vitest run tests/import-status-pill.test.ts tests/import-state-singleton.test.ts` initially reported "2 skipped" before any work; after the test rewrite + module creation it reports "16 passed (16)".
- The pre-existing failure in `scripts/__tests__/visual-review-template.test.mjs > R7 ... template file exists at GSD upstream path` is a GSD upstream template-path discrepancy in `~/.claude/get-shit-done/templates/visual-review.html`. It was flagged in the executor's success criteria as expected (`other unrelated tests may still skip or have pre-existing visual-review-template.test.mjs upstream issue`) and predates this plan.

## TDD Gate Compliance

Plan frontmatter declares `type: tdd`. Both tasks followed RED → GREEN cycles atomically.

- **Task 1 RED:** rewrote `tests/import-status-pill.test.ts` to import non-existent `../src/lib/import-state-derive`. Verified vitest fails with `Failed to resolve import` before module creation.
- **Task 1 GREEN:** created `src/lib/import-state-derive.ts` with `derivePillState` + `formatRecency` + types. Verified `npx vitest run tests/import-status-pill.test.ts` reports 10/10 passed.
- **Task 1 commit:** `78abd1c feat(02-06): import-state-derive pure pill-state derivation`.
- **Task 2 RED:** rewrote `tests/import-state-singleton.test.ts` to import non-existent `../src/lib/import-state.svelte` and `../src/lib/vault-state.svelte`. Verified vitest fails with `Failed to resolve import`.
- **Task 2 GREEN:** created `src/lib/import-state.svelte.ts` + `src/lib/vault-state.svelte.ts`. Verified `npx vitest run tests/import-state-singleton.test.ts` reports 6/6 passed.
- **Task 2 commit:** `7a1c89a feat(02-06): import-state + vault-state reactive singletons`.

No REFACTOR commits — both modules came out at the right shape on first GREEN. Per cycle-3 priority #5 (REFACTOR is optional when initial implementation is already clean), the gate sequence (RED → GREEN per task) is satisfied. Plan-level gate (RED commit before GREEN commit) is satisfied because the Wave-0 stubs (which ARE the RED gate for the entire phase per Plan 02-01) landed in commit `d27ab67` prior to this plan's commits.

## User Setup Required

None — no external service configuration required. All consumed deps were already locked by Phase 1 (`svelte ^5.55.5`, `@tauri-apps/api ^2.11.0`) and Phase 2 Wave 0 (`vitest ^4.1.5`). The Vitest test runner picks up `tests/*.test.ts` via the existing `vitest.config.ts` include glob.

## Self-Check: PASSED

Verified all 3 created files exist:

```text
src/lib/import-state-derive.ts     FOUND
src/lib/import-state.svelte.ts     FOUND
src/lib/vault-state.svelte.ts      FOUND
```

Verified both commits exist in git log:

```text
78abd1c  feat(02-06): import-state-derive pure pill-state derivation                FOUND
7a1c89a  feat(02-06): import-state + vault-state reactive singletons                FOUND
```

Verified test counts:

```text
tests/import-status-pill.test.ts        10 passed
tests/import-state-singleton.test.ts     6 passed
Combined                                16 passed
```

Verified svelte-check is clean:

```text
355 files, 0 errors, 0 warnings
```

Verified pure module has no $state:

```text
grep -E '\$state' src/lib/import-state-derive.ts: 0 matches
```

Verified both `.svelte.ts` singletons have $state<Shape>:

```text
grep -E '\$state<.+Shape>' src/lib/import-state.svelte.ts:  1 match
grep -E '\$state<.+Shape>' src/lib/vault-state.svelte.ts:   1 match
```

Verified `derivePillState` is imported into the singleton (multi-line import — awk-aware check):

```text
awk '/^import \{/,/} from/' src/lib/import-state.svelte.ts | grep -c derivePillState  ->  1
```

## Next Phase Readiness

**Wave 7+ Svelte component plans (02-09, 02-10, 02-11) are unblocked for any tasks that consume these singletons:**

- **Plan 02-11 ImportStatusPill.svelte** — reads `getImportState().pill_state` and renders one of 5 visual states per UI-SPEC §8.5. The discriminated union (`PillState`) drives exhaustive `if/else if` rendering with TypeScript-narrowing per branch.
- **Plan 02-11 ImportHistoryModal.svelte** — reads `getImportState().recent_20` and renders the most-recent-20 list. Per-entry failures render via `entry.failures[].reason` rows (cycle-2 cluster #6 SSOT). `formatRecency(entry.timestamp_iso, new Date())` formats the timestamp column.
- **Plan 02-10 TitlebarMeta.svelte modification** — reads `getVaultState().vault_path` for the `vault: <path>` text and `getImportState().pill_state` to slot the pill between `connected` and `vault:`. Will need long-path middle-truncation logic for narrow titlebars.
- **Plan 02-09/10 SettingsPanel → VaultCategory** — reads `getVaultState().course_list` to render the course chip grid. Adds new chips via `addCourse(code)`; removes via `removeCourse(code)`. `courseCount()` drives the "N courses" heading.
- **Plan 02-08 Onboarding flow** — calls `setVaultPath(absPath)` after the vault scaffold completes, and `setCourseList([...])` after the user picks course codes in Step 5. The `+layout.svelte` hydration calls `installImportListeners()` once during `onMount`.

**No blockers introduced.** The wave 1 parallel plan (02-02 Rust vault_writer) operates on completely disjoint files (src-tauri/) and was running in a parallel worktree; no merge conflicts possible.

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Plan: 06*
*Completed: 2026-05-16*
