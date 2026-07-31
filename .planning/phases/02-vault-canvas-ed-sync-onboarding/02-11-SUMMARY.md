---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 11
subsystem: import-ui
tags: [svelte5, runes, dropzone, dialog, status-pill, reconciliation, permission-denied, friendly-error]

# Dependency graph
requires:
  - phase: 02-06
    provides: import-state.svelte.ts singleton (getImportState + recent_20 + pill_state) + import-state-derive (PillState union + ImportHistoryEntry type + derivePillState)
  - phase: 02-06
    provides: vault-state.svelte.ts singleton (getVaultState + course_list)
  - phase: 02-07
    provides: 16 Tauri IPC commands (start_import + cancel_import + reconcile_vault_index emitting reconcile:done) + dragDropEnabled=true on main window (onDragDropEvent payload.paths delivery)
  - phase: 02-01
    provides: Wave-0 stubs at tests/datatransfer-types-discrimination.test.ts + tests/import-error-classifier.test.ts (describe.skip placeholders flipped GREEN here)
provides:
  - 5 net-new import-surface Svelte components (DropzoneOverlay, ImportDialog, ImportStatusPill, ImportHistoryModal, ReconciliationOverlay)
  - src/lib/import-error.ts pure-function IPC error classifier (PermissionDenied -> friendly inline duplicate message; generic fallback otherwise)
  - 2 Wave-0 tests flipped GREEN (6 dragdrop discrimination cases + 16 error classifier cases = 22 net-new green tests)
affects: [02-12 wires DropzoneOverlay/ImportDialog/ImportStatusPill/ImportHistoryModal/ReconciliationOverlay into +layout.svelte + +page.svelte + TitlebarMeta + handles Cmd+I shortcut + SettingsPanel cog routing, Phase 3 lands DuplicateResolutionDialog alongside backend duplicate-detection scan (deferred per REVIEW-1 Gemini MEDIUM resolution)]

# Tech tracking
tech-stack:
  added:
    - "@tauri-apps/api/webviewWindow.getCurrentWebviewWindow() + onDragDropEvent() (existing dep; first consumer in mneme codebase)"
    - "@tauri-apps/api/event.listen + UnlistenFn (existing dep; first reconcile-channel consumer)"
  patterns:
    - "Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`) only — no legacy `let` reactivity; matches Phase 1 ChatPanel.svelte pattern"
    - "Pure-function IPC error classifier kept in plain `.ts` (NOT `.svelte.ts`) — no runes, no IPC, no jsdom dependency; testable on Vitest fast Node path"
    - "Discriminated-union narrowing for Tauri onDragDropEvent payload — `switch (payload.type)` + typed cast `as { type, paths?, position? }` lets TS see `paths` on enter/drop without `@ts-expect-error`"
    - "Reactive singleton consumer pattern: components hold a const ref from getImportState()/getVaultState() then read fields directly — Svelte 5 fine-grained tracking propagates mutations automatically (no .subscribe(), no $store)"
    - "PermissionDenied catch-path friendly-error pattern (REVIEW-1 resolution): the IPC submit wrapper inspects rejection shape via classifyImportError() and surfaces a dismissable inline alert instead of a raw error string"
    - "Dialog open/close lifecycle reset via $effect tracking the `open` prop — auto-selects single-course case (CYCLE-2 cluster #16) and clears submission state cleanly between invocations"

key-files:
  created:
    - src/lib/components/dropzone/DropzoneOverlay.svelte (92 LOC — full-window drop overlay subscribing to Tauri onDragDropEvent)
    - src/lib/components/ImportStatusPill.svelte (86 LOC — 5-state pill, 30s recency refresh interval)
    - src/lib/components/ReconciliationOverlay.svelte (97 LOC — startup blocking spinner, listens reconcile:progress + reconcile:done)
    - src/lib/components/ImportDialog.svelte (484 LOC — D-10 adaptive course picker + D-11 default _inbox + submit/cancel IPC + friendlyError surfacing)
    - src/lib/components/ImportHistoryModal.svelte (234 LOC — recent-20 list + per-row failure expansion via <details>)
    - src/lib/import-error.ts (78 LOC — pure classifier with DUPLICATE_PERMISSION_DENIED_MESSAGE + GENERIC_IMPORT_ERROR_MESSAGE exports)
  modified:
    - tests/datatransfer-types-discrimination.test.ts (Wave-0 stub -> 6 GREEN cases covering event-type x paths-length matrix; over carries position-only per WARN-4)
    - tests/import-error-classifier.test.ts (Wave-0 stub -> 16 GREEN cases: 9 parametric + 4 type-shape + 4 classifier behavioural)

key-decisions:
  - "DuplicateResolutionDialog.svelte DEFERRED wholesale to Phase 3 per REVIEW-1 (Gemini MEDIUM 2026-05-16). Shipping a fully-rendered dialog the user can never reach (the chmod 0o444 lock blocks re-import at the writer level — duplicate detection backend lives in Phase 3+) would have been misleading. Replacement: ImportDialog catches the start_import IPC rejection, classifies via classifyImportError, and surfaces a friendly inline alert directing the user to delete the old file in their vault first. DuplicateResolutionDialog component lands in Phase 3 alongside the backend duplicate-detection scan; UI-SPEC §8.7 layout contract carries forward unchanged."
  - "DropzoneOverlay typing strategy (CYCLE-3 priority #4 cycle-2 NEW HIGH 1): removed all `@ts-expect-error` directives that cycle-2 had used. Instead apply a single typed cast `payload as { type: string; paths?: string[]; position?: { x: number; y: number } }` once the `switch (payload.type)` narrowing has resolved the discriminant. This avoids the TS6133 unused-directive failures that would have blocked `npm run check` once the Tauri 2 DragDropEvent discriminated union properly resolved paths on enter/drop."
  - "ImportDialog does NOT close on `start_import` IPC return (CYCLE-3 priority #4 cycle-2 NEW HIGH 2 fix). Closing immediately would have rendered the Cancel button unreachable because `start_import_inner` spawns a background tokio task and only awaits validate_inputs + registry registration (< 1ms). Dialog now stays open with submitting=true + currentOpId set; closes only on (a) user clicks Cancel which sends cancel_import, (b) parent listens for import:done and dispatches close, or (c) friendlyError surfaces from catch path. D-16 acceptance is now satisfied at the UI layer."
  - "Submit gate (CYCLE-2 cluster #16): `submitDisabled` derives from `submitting || paths.length === 0 || (selectedCategory !== '_inbox' && selectedCourse === null)`. Case (c) prevents an undefined-course submission flowing into start_import which would then reject with the cluster #7 course-validation error. _inbox + no course is intentional per D-11 (catch-all path)."
  - "DropzoneOverlay `over` event handling: visibility is PRESERVED from the preceding `enter`, NOT recomputed. Real Tauri 2 `over` payloads carry only `{ position: { x, y } }` — no `paths` field — so any code that destructures payload.paths on over crashes. The discrimination test pins this contract with a MockPayload union that mirrors the real wire shape (WARN-4 fix from cycle-3 iter-1)."
  - "ImportHistoryModal uses `f.reason` NOT `f.message` (CYCLE-2 cluster #6) to mirror the Rust `ImportFailure.reason` SSOT in src-tauri/src/import_controller.rs landed in Plan 02-05. When the Rust shape changes the TS type in import-state-derive must change in the same PR."
  - "ReconciliationOverlay progress-counter branch `{#if total > 0}` is intentionally defensive (WARN-9): Phase 2 Plan 04 `vault_index::reconcile()` is synchronous (returns ReconcileSummary directly) and does NOT emit `reconcile:progress` Tauri events. Total stays at 0; the counter suppresses; the spinner + 'Indexing vault…' label remain. Phase 2 SPEC L65 budget (≤200ms for ≤100 files) makes the missing counter low-cost. v1.x DR2 escalation wires the emit when dogfood measures > 500 files / > 1s reconcile. `reconcile:done` IS emitted by Plan 12's +layout.svelte after the synchronous invoke resolves."
  - "Plan 11 lands components STANDALONE — no integration into +page.svelte or +layout.svelte yet. Plan 12 wires DropzoneOverlay/ImportDialog/ImportStatusPill/ImportHistoryModal/ReconciliationOverlay into the app shell and handles Cmd+I shortcut + TitlebarMeta pill placement + SettingsPanel cog routing."

patterns-established:
  - "Pure-function IPC error classifier (plain `.ts`, no runes): keeps the classifier testable on the Vitest fast Node path without jsdom or Svelte mount; component imports `classifyImportError()` and exposes the result through a `$state<string | null>` ribbon. The DUPLICATE_PERMISSION_DENIED_MESSAGE constant is the SSOT for the friendly-message copy locked to UI-SPEC §8.3 spec-divergence note."
  - "Tauri DragDropEvent narrowing without `@ts-expect-error`: discriminate via `switch (payload.type)` first, then a single typed cast to a partial-paths/position shape. Future consumers of the same API should follow the DropzoneOverlay pattern instead of re-introducing directive comments."
  - "5-state pill via `data-status` attribute selector: ImportStatusPill renders a single .pill class with `data-status={importState.pill_state.kind}` and uses CSS attribute selectors (`pill[data-status='importing']`) for per-state colour overrides. Keeps the state machine collocated with the CSS surface; no `class:` directive sprawl."
  - "Adaptive course picker thresholds (D-10): vault-state.course_list.length ∈ {0, 1-3, 4-10, 10+} maps to {empty-state CTA, radio stack, select dropdown, typeahead}. Component reads the live array; no parent prop drilling needed."
  - "Visual SSOT header convention (D-18): every new .svelte component carries `Visual: /Users/qinyuan/Downloads/Mneme 3/<bundle>.html + 02-UI-SPEC.md §8.x` in the top comment so future drift can be reconciled by re-running the prototype-vs-impl screenshot loop against the locked 2026-05-15 bundle."

requirements-completed: [REQ-03, REQ-13]

# Metrics
duration: 8min
completed: 2026-05-16
---

# Phase 02 Plan 11: Import-Surface Svelte Components Summary

**5 import-surface Svelte components + 1 pure-function IPC error classifier landed standalone; Wave-0 dragdrop discrimination + error classifier tests flipped GREEN. REVIEW-1 / Gemini MEDIUM resolution applied — DuplicateResolutionDialog deferred to Phase 3, PermissionDenied friendly-error catch path wired in ImportDialog.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-16T13:38Z (approx)
- **Completed:** 2026-05-16T13:46Z
- **Tasks:** 2/2
- **Files created:** 6
- **Files modified:** 2

## Accomplishments
- 5 net-new import-surface Svelte components live and `npm run check`-clean: DropzoneOverlay (Tauri onDragDropEvent), ImportDialog (adaptive picker + Cancel/Submit + PermissionDenied catch), ImportStatusPill (5-state reactive pill), ImportHistoryModal (recent-20 with per-row failure expansion), ReconciliationOverlay (startup blocking spinner).
- src/lib/import-error.ts pure classifier with DUPLICATE_PERMISSION_DENIED_MESSAGE + GENERIC_IMPORT_ERROR_MESSAGE exports — replaces the deferred DuplicateResolutionDialog per REVIEW-1 / Gemini MEDIUM.
- 22 net-new GREEN tests (6 dragdrop discrimination + 16 error classifier); 2 Wave-0 stubs from Plan 02-01 flipped from describe.skip to GREEN.
- DuplicateResolutionDialog correctly ABSENT from Phase 2 surface — `! test -f src/lib/components/DuplicateResolutionDialog.svelte` confirms Phase 3 deferral.
- Full test suite: 214 passing / 6 skipped / 1 pre-existing upstream failure (visual-review.html template — out of scope per CLAUDE.md). Up from baseline 192 passing (+22 net-new green).
- `npm run check`: 374 files, 0 errors, 0 warnings.

## Task Commits

Each task was committed atomically:

1. **Task 1: DropzoneOverlay + ImportStatusPill + ReconciliationOverlay + dragdrop discrimination test** — `0eb508e` (feat)
2. **Task 2: ImportDialog + ImportHistoryModal + import-error.ts + classifier test** — `1777314` (feat)

## Files Created
- `src/lib/components/dropzone/DropzoneOverlay.svelte` — Full-window drop overlay subscribing to Tauri onDragDropEvent; payload.paths.length > 0 discriminates native file drag from text drag.
- `src/lib/components/ImportStatusPill.svelte` — Reactive pill inside TitlebarMeta (Plan 12 wires placement); 5 visual states via data-status attribute selector + 30s recency refresh.
- `src/lib/components/ReconciliationOverlay.svelte` — Full-screen blocking spinner; listens reconcile:progress + reconcile:done; fail-open on listener install failure.
- `src/lib/components/ImportDialog.svelte` — D-10 adaptive course picker (0/1-3/4-10/10+) + D-11 default _inbox category + start_import/cancel_import IPC + PermissionDenied friendly-error catch path.
- `src/lib/components/ImportHistoryModal.svelte` — 640×540 modal listing recent-20 import operations; per-row failure expansion via `<details>` using `f.reason` per Rust ImportFailure SSOT.
- `src/lib/import-error.ts` — Pure-function classifier with `classifyImportError()`, `isPermissionDeniedShape()`, DUPLICATE_PERMISSION_DENIED_MESSAGE, GENERIC_IMPORT_ERROR_MESSAGE. No Svelte runes, no IPC, jsdom-free.

## Files Modified
- `tests/datatransfer-types-discrimination.test.ts` — Wave-0 stub flipped to 6 GREEN cases covering enter/over/leave/drop × empty/non-empty paths. WARN-4 fix: over carries no paths field, only `{ position }`.
- `tests/import-error-classifier.test.ts` — Wave-0 stub flipped to 16 GREEN cases: 9 parametric string matches + 2 Error-instance + 2 object-payload + 2 null/undefined safety + 4 classifier behavioural.

## Test Results

```
Test Files  15 passed | 1 failed | 6 skipped (22)
     Tests  214 passed | 1 failed | 6 skipped (221)
```

- **Pre-existing upstream failure (out of scope per CLAUDE.md):** `scripts/__tests__/visual-review-template.test.mjs` — expects `/Users/qinyuan/.claude/get-shit-done/templates/visual-review.html` to exist; the template file isn't present in this environment. Not introduced by this plan.
- **Net-new GREEN:** +22 tests vs baseline (6 dragdrop + 16 classifier).
- **No regressions:** every previously-passing test still passes.

## Deviations from Plan

None — plan executed exactly as written.

The plan body already absorbed CYCLE-2/CYCLE-3 fixes (cluster #14 over-payload handling, cluster #16 submit gate, NEW HIGH 1 ts-expect-error removal, NEW HIGH 2 dialog stays open, WARN-4 over has no paths, WARN-9 reconcile_progress not emitted in Phase 2) and the REVIEW-1 / Gemini MEDIUM resolution (DuplicateResolutionDialog deferred + PermissionDenied catch path). Implementation followed the plan body byte-for-byte; the only tweaks during execution were trivial Svelte 5 formatting and a missing `role="presentation"` + `onkeydown` Escape handler on the ImportHistoryModal backdrop to satisfy svelte-check accessibility lint (still 0 errors / 0 warnings).

## REVIEW-1 / Gemini MEDIUM Resolution (Verified)

- ✅ DuplicateResolutionDialog.svelte is **absent** from Phase 2: `! test -f src/lib/components/DuplicateResolutionDialog.svelte` passes.
- ✅ ImportDialog imports `classifyImportError` from `$lib/import-error` and calls it inside the `start_import` catch block.
- ✅ `friendlyError` $state surfaces above the file list as a dismissable inline alert with the cream-deep + error-left-border treatment.
- ✅ Friendly message asserts `delete the old file` affordance + `coming in a future update` framing (pinned by classifier test).
- ✅ Cancel remains reachable while `friendlyError` is set — dismissing the alert does NOT block Cancel.

## Validation Surface

- `npm run check`: 374 files, 0 errors, 0 warnings.
- `npx vitest run tests/datatransfer-types-discrimination.test.ts tests/import-error-classifier.test.ts`: 22 passed (6 + 16).
- Husky pre-commit hook (audit-capabilities.sh + vitest --changed): PASS on both commits.
- 5 components carry `Visual:` header pointing to Mneme 3 bundle + UI-SPEC §8.x (per D-18).
- Tauri onDragDropEvent option-2 contract per 02-SPIKE-dragdrop.md.
- D-10 adaptive course picker (0/1-3/4-10/10+) wired in ImportDialog.
- D-11 default `_inbox` category + no remember-last.
- D-16 cancel preserves already-written files (UI surfaces option; backend respects per Plan 02-05).

## Known Stubs

None. All component data sources are real — vault-state.svelte.ts and import-state.svelte.ts are live reactive singletons hydrated by Plan 02-07 IPC. No mock data, no hardcoded empty arrays flowing to UI.

The ImportDialog file list, course list, and category list all read from real state. The HistoryModal recent_20 reads from the live import-state singleton. The ReconciliationOverlay listens to real Tauri events from `invoke('reconcile_vault_index')` (Plan 12 wires the invoke; the overlay subscribes regardless).

## Plan 12 Handoff

Plan 12 (Wave 9) wires these standalone components into the app shell:
- Mount `DropzoneOverlay` once in `+layout.svelte` (or `+page.svelte` root); pass `onPathsDropped` handler that opens `ImportDialog` with the dropped paths.
- Mount `ImportStatusPill` inside `TitlebarMeta.svelte`; `onClick` opens `ImportHistoryModal`.
- Mount `ImportHistoryModal` once; toggle visibility via local `historyOpen` $state.
- Mount `ReconciliationOverlay` in `+layout.svelte` `onMount` after invoking `reconcile_vault_index`; emit `reconcile:done` after the synchronous invoke resolves so the overlay unmounts.
- Wire `Cmd+I` shortcut in `+page.svelte` to call `invoke('open_file_picker', { multiple: true })` then open `ImportDialog` with the returned paths.
- Wire SettingsPanel cog/Cmd+, integration (separate concern from import surface; Plan 12 owns).

## Self-Check: PASSED

- ✅ `src/lib/components/dropzone/DropzoneOverlay.svelte` exists (92 LOC)
- ✅ `src/lib/components/ImportStatusPill.svelte` exists (86 LOC)
- ✅ `src/lib/components/ReconciliationOverlay.svelte` exists (97 LOC)
- ✅ `src/lib/components/ImportDialog.svelte` exists (484 LOC)
- ✅ `src/lib/components/ImportHistoryModal.svelte` exists (234 LOC)
- ✅ `src/lib/import-error.ts` exists (78 LOC)
- ✅ `tests/datatransfer-types-discrimination.test.ts` modified (Wave-0 stub flipped GREEN)
- ✅ `tests/import-error-classifier.test.ts` modified (Wave-0 stub flipped GREEN)
- ✅ `src/lib/components/DuplicateResolutionDialog.svelte` ABSENT (REVIEW-1 deferral to Phase 3 verified)
- ✅ Commit `0eb508e` exists (Task 1 — DropzoneOverlay + StatusPill + ReconciliationOverlay)
- ✅ Commit `1777314` exists (Task 2 — ImportDialog + ImportHistoryModal + PermissionDenied catch)
