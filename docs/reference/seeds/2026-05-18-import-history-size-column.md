---
seed_id: 2026-05-18-import-history-size-column
source_phase: 02.1
source_finding: I1 (02-UI-REVIEW.md L154)
deferred_from: 02.1-13
target_phase_candidate: Phase 3 (backend persistence)
created: 2026-05-18
---

# Seed — Import History size column population

## Problem

`ImportHistoryModal.svelte` per-file failure rows currently render only `path` +
`reason` — there is no size column. The original UI-REVIEW.md INFO finding
**I1** requested a populated size column ("always shows `—`" was the wording in
the original review against an earlier ImportDialog mock; the production
ImportHistoryModal never even rendered the column).

The data source `getImportState().recent_20` is an in-memory frontend store of
`ImportHistoryEntry`-shaped objects (see `src/lib/import-state-derive.ts`)
derived from per-session `import:done` events. The entry shape includes
`failures[]: { path, reason }` and aggregate counts, but **does NOT include
per-file `size_bytes`**.

The `vault_files` rusqlite table (populated by `reconcile_vault_index`) DOES
contain `size_bytes` per row, but is not bridged into `recent_20`.

## Why deferred from 02.1

Phase 02.1 plan-phase classification per `<planner_authority_limits>` legitimate
reason **#2 (Missing information: required data not present in any source
artifact)**. Implementing requires backend work that materially changes the
import data flow:

- New Tauri IPC, e.g. `get_recent_imports_with_sizes` joining `vault_files` on
  `operation_id` (which in turn requires recording `operation_id` in
  `vault_files` OR a new audit table).
- OR: `vault_writer.rs` records per-file size on import; the frontend
  `ImportHistoryEntry` shape gains a `size_bytes?: number` field; pipeline
  end-to-end change including the `import:done` event payload.

The placeholder `get_recent_imports` in `src-tauri/src/lib.rs:315` already
notes Phase 3 backend persistence as the planned home for this work
(comment: "`get_recent_imports returns empty — recent-20 lives in frontend …
Phase 3 may add backend persistence`").

## Implementation sketch (when picked up)

1. Add `size_bytes: Option<i64>` to the `ImportFailure` / `ImportSuccess`
   Rust shapes in `src-tauri/src/import_controller.rs` (or introduce a
   new `ImportFileRecord` shape if cleaner separation is wanted).
2. Emit per-file size in the `import:done` event payload (currently emits
   aggregate counts only).
3. Update `src/lib/import-state-derive.ts` to store size in
   `ImportHistoryEntry.failures` (and a new `successes[]` array if
   successful imports also need their sizes — currently the modal only
   expands failures via `<details>`, so failures-first is fine for v1.x).
4. Add a `humansize` helper in `src/lib/format-size.ts` (formats bytes
   → "1.2 MB" / "482 KB" / etc.). Consider porting the formatter shape
   from a small permissive-license OSS lib rather than rolling our own.
5. `ImportHistoryModal.svelte` renders the size next to the path inside
   the `.failure` row (or add a `.size` column to the `.summary` grid for
   aggregate-row level visibility).

## Estimated context cost

~30% — touches Rust import shapes + IPC + event payload + frontend
derive + new format helper + Svelte template. Cross-module change but
each individual file diff is small.

## Routing

This seed lands manually under `.planning/seeds/` (the directory was
created by 02.1-13 Task 4 — first seed in this project). Promote to
Phase 3 backlog when Phase 3 planning starts, or earlier via
`/gsd-review-backlog` if a v1.x cycle picks it up first.

## Related artifacts

- Original finding: `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-UI-REVIEW.md` (INFO tier, I1)
- 02.1 context lock: `.planning/phases/02.1-ui-fixes-from-dogfood-and-audit-3-blocker-8-warning-3-info/02.1-CONTEXT.md` (INFO table — I1 row)
- 02.1-13 plan disposition: `.planning/phases/02.1-ui-fixes-from-dogfood-and-audit-3-blocker-8-warning-3-info/02.1-13-PLAN.md` `<objective>` declares the deferral with planner-authority-limits citation
- Backend touchpoint: `src-tauri/src/lib.rs:315` (existing `get_recent_imports` placeholder comment naming Phase 3)
