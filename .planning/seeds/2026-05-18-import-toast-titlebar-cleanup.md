---
seed_id: 2026-05-18-import-toast-titlebar-cleanup
source_phase: 02.1
source_finding: G-02 (02.1-UAT.md dogfood — 2026-05-18T11:38 user decision)
deferred_from: 02.1 verify-work
target_phase_candidate: v1.x (post Phase 02 + 02.1 ship)
created: 2026-05-18
severity: minor          # design preference, not bug
status: pending_v1x
---

# Seed — Move ImportStatusPill out of titlebar into bottom toast

## What the user asked for

> "这个导入历史不要在上面，上面只留Claude code状态和vault"

Translation: the import status pill (`✓ imported 1 · 41m ago`) currently crowding the 36px titlebar between `claude-code · connected` and `vault: ...` should be removed. The titlebar middle section should hold ONLY:

1. `claude-code · connected` (or whatever the live connection state is)
2. `vault: /.../mneme-dogfood/move-target`
3. Settings cog (right edge, unchanged)

Import status (importing / success / error) routes to a **temporary toast** (bottom area, auto-dismiss after 3-5s), per the user's explicit pick (option B in the 2026-05-18 verify-work AskUserQuestion).

## Why now → v1.x

- **Not a ship-blocker** for Phase 02 + 02.1. Current titlebar layout works (tests + visual contract pass W8 / W8b); user preference is the trigger, not a bug.
- **G-01 (the real bug — ImportDialog stuck) is already fixed** in commit `a11e7c3`. Once that lands, the worst dogfood pain is gone.
- **Scope is bigger than a one-line fix**: new component + Settings link + +page.svelte mount + remove-from-titlebar + regression tests. Estimate 1-2h focused. Cleaner as its own plan than tacking onto 02.1.

## Scope

### Add (new)

- **`src/lib/components/ImportToast.svelte`** — bottom-region (bottom-left? bottom-right? **decision needed in plan-phase**), 3-5s auto-dismiss, reuses KD-13 4-state color palette + spinner SVG copied or refactored from `ImportStatusPill.svelte`.
  - States: `importing` (peach + spinner + "Importing N of M…") → `complete` (olive + ✓ + "Imported N files just now") → `error` (faded red + ⚠ + "Import failed — N succeeded, M failed") → fade out
  - Click target: clicking the toast opens Import History modal (preserves the discoverability of the current pill-click behavior)
  - Stacking: only ONE toast at a time (replace, don't queue); per-import not per-file
  - Reduced-motion: skip slide-in animation, opacity-fade only — reuse `src/lib/motion.ts:prefersReducedMotion()`
- **`tests/import-toast.test.ts`** — vitest + mount-pattern + mocked `listen` for `import:progress` + `import:done`; assert toast appears on import:progress, transitions on import:done, auto-dismisses after 3-5s

### Modify (existing)

- **`src/lib/components/TitlebarMeta.svelte`** — remove `<ImportStatusPill>` + the `<span class="no-drag-wrap" data-tauri-drag-region="false">` wrapper. Titlebar middle becomes: `[ claude-code · status ]   [ vault: path ]   [ ⚙ ]`. Drag-region simplifies (no carve-out needed for the pill anymore — only the cog button still needs `data-tauri-drag-region="false"`).
- **`src/routes/+page.svelte`** — mount `<ImportToast />` at root; it subscribes to `import-state.svelte.ts` pill_state for state transitions (the state machine already exists, just needs a new consumer).
- **`src/lib/components/SettingsPanel.svelte`** — Sync category: add a "View import history" link/button that dispatches `window.dispatchEvent(new CustomEvent("mneme:open-history"))` for discoverability (because the pill-click affordance is going away).
- **Keep**: `Cmd+I` shortcut to open Import History remains the primary keyboard path (already wired via `mneme:open-history` CustomEvent in +page.svelte L134).
- **Optional**: consider deleting `src/lib/components/ImportStatusPill.svelte` entirely if no other consumer remains. Otherwise keep the file but stop mounting it. Decide in plan-phase based on whether the component's state logic is reused inside `ImportToast` or fully replaced.

### UAT impact (already recorded)

- **02.1-UAT.md tests 3 (W1) + 10 (W8c)** are marked `skipped` with `reason: "design changed mid-verify"`. After v1.x plan lands, replace with: `tests/import-toast.test.ts` covers the new toast contract; `W8` becomes simpler to test (full titlebar middle is drag-region).

## Plan-phase prerequisites (when v1.x lands)

1. **Decide toast position** — bottom-left (per Anthropic-Claude family aesthetic precedent) vs. bottom-right (macOS-native convention) vs. bottom-center (least intrusive). Recommend bottom-left for KD-13 family consistency.
2. **Decide stacking behavior** — pure replace (current toast cancelled mid-flight if new import starts) vs. fade-old-fast-then-new vs. queue. Recommend replace for simplicity.
3. **Confirm KD-13 token coverage** — `--color-importing-bg / --color-success-bg / --color-error-bg` may need new tokens if not already in `tokens.css`; the current ImportStatusPill uses `[data-state="..."]` inline styles — make sure they migrate cleanly.
4. **Decide whether to delete ImportStatusPill.svelte** (yes if no caller remains) or keep for future use.
5. **Settings → Sync** UI surface — does it already exist as a category? Otherwise creating it is its own plan task.

## Reference artifacts

- `02.1-UAT.md` Gap G-02 entry (full artifact list under `artifacts:` block)
- `src/lib/components/ImportStatusPill.svelte` (current implementation; reuse state machine logic)
- `src/lib/import-state.svelte.ts` (already emits pill_state transitions — the new toast just needs to consume this same state)
- `src/lib/components/TitlebarMeta.svelte` (current pill mount site + no-drag-wrap)
- `~/Downloads/Mneme 3/Mneme.html` Visual SSOT — search for any toast-style component reference; if absent, design the toast as a NEW surface that fits the Living token system (cream `#E6E3DC` + olive `#6B6E3D` + Anthropic family typography)
- Decision context: 2026-05-18 verify-work UAT session (AskUserQuestion answer "临时 toast (右下角 / 底部 几秒后消失)")

## Decision pointer

When v1.x roadmap planning happens, add this seed as a phase candidate:

> **Phase v1.x-N**: Move ImportStatusPill out of titlebar to bottom toast
>
> - Scope: 1 new component + 3 file edits + Settings link + tests
> - Effort: 1-2h focused
> - Driver: dogfood UX preference (titlebar uncluttering)
> - Dep: none (post Phase 02 + 02.1 ship)
