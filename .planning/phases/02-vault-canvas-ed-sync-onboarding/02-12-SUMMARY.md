---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 12
subsystem: integration
tags: [svelte5, runes, integration, dropzone, settings-panel, post-onboarding-banner, menu-bridge, cmd-i, kp-07, kp-08, kp-09, kd-13, spec-gap-1, spec-gap-2, blk-3, cycle-3]

# Dependency graph
requires:
  - phase: 02-06
    provides: vault-state.svelte (getVaultState + setVaultPath + setCourseList reactive singleton)
  - phase: 02-06
    provides: import-state.svelte (installImportListeners — HMR-safe Tauri import:progress + import:done subscriber)
  - phase: 02-07
    provides: 16 Tauri IPC commands (load_config / list_courses / reconcile_vault_index / start_import / cancel_import) + dragDropEnabled=true on main window + tauri-plugin-dialog open() + macOS native Mneme menu emitting menu:open-settings (Plan 07 build_app_menu + on_menu_event)
  - phase: 02-08
    provides: +layout.svelte root with onboarding redirect + DEV-forwarder install + ready-gate pattern (this plan EXTENDS without regressing)
  - phase: 02-09
    provides: onboarding finish flow (complete_onboarding sets completed_at) — banner self-gates on vault_path so it only surfaces after Step 6 Finish
  - phase: 02-10
    provides: SettingsPanel.svelte with prop-controlled `open: boolean` + `onClose: () => void` interface (CYCLE-3 #3 contract) + TitlebarMeta Phase-1 rewrite (mneme:open-settings dispatcher contract)
  - phase: 02-11
    provides: 5 import-surface Svelte components (DropzoneOverlay / ImportDialog / ImportStatusPill / ImportHistoryModal / ReconciliationOverlay) shipped STANDALONE — this plan wires them into the app shell
provides:
  - Full Phase 2 end-to-end flow wired: app boot → onboarding (Plan 08-09) → complete → main UI shell mounts → post-onboarding banner surfaces once → drag/Cmd+I → import → status pill → history modal — every Phase 2 surface reachable from a fresh `~/.mneme/` install
  - +layout.svelte post-onboarding hydration sequence (load_config → list_courses → installImportListeners → reconcile_vault_index → re-read list_courses) + Tauri menu:open-settings → window CustomEvent bridge (SPEC-GAP-1)
  - +page.svelte template-root mount points for the 4 Phase 2 modals/overlays (DropzoneOverlay conditional on $page.route.id per BLK-3 / ImportDialog / ImportHistoryModal / SettingsPanel) + INLINE PostOnboardingBanner under TitlebarMeta inside .window grid (CYCLE-3 priority #8) + Cmd+I global keydown handler invoking tauri-plugin-dialog
  - TitlebarMeta upgraded: vault path from singleton (no more hardcoded ~/Mneme/usyd-2026s1 — SPEC REQ-01 L133 acceptance) + ImportStatusPill insertion between connection dot and vault label + long-path middle-truncation helper (>48 chars → first/.../last-2) + cog click dispatches mneme:open-settings + new openHistory dispatcher
  - PostOnboardingBanner.svelte — one-time inline banner (SPEC-GAP-2) gated on vaultState.vault_path + localStorage sentinel "mneme.postOnboardingBannerDismissed"; two CTAs (Open Settings + Dismiss); KD-13 cream-deep surface + orange accent stripe; inline margin layout (NOT position:fixed) so it joins .window auto-row grid
  - interaction-paradigm.md thread: Cmd+I promoted from candidate to locked exception (5th narrow exception per D-13). Resume threshold raised to "6-7 exceptions before mini palette consideration"
  - 12 Wave-0 contract tests GREEN (3 menu-bridge + 9 post-onboarding-banner)
  - Single downstream code path for SettingsPanel open: cog click + Cmd+, + macOS native menu (via SPEC-GAP-1 bridge) + PostOnboardingBanner CTA all funnel through the single `mneme:open-settings` window CustomEvent — no duplicate state machines
affects:
  - Phase 2 verify-work (next): runs /gsd-verify-work 2 using the 4-bucket dev-feedback loop; the wired-up surfaces all participate
  - Phase 2 code-review (next): /gsd-code-review 2 --fix --auto inherits all 12 plans (this is the integration wave)
  - Phase 2 ship (next): /gsd-pr-branch main && /gsd-ship 2 will PR this branch (and its predecessor merges) to main
  - Phase 3 (multi-session + Cmd+P + editor): inherits the prop-controlled modal contract + the mneme:open-* CustomEvent funnel pattern; DuplicateResolutionDialog backend trigger + import_duplicate_decision IPC + the wire-up land in Phase 3 alongside the backend duplicate-detection scan
  - DEFERRED phase-wrap-up: ROADMAP.md L146-158 wording ("Canvas + Ed import + sync") + REQUIREMENTS.md REQ-03/REQ-13 wording patches per CONTEXT.md L13 — NOT in this commit; tracked as a separate post-ship docs commit

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single CustomEvent funnel for cross-source modal opens: cog click + Cmd+, + macOS native menu (via Tauri listen() bridge) + inline banner CTA all dispatch mneme:open-settings; SettingsPanel listens for one event. Eliminates duplicate-state-machine bugs cycle-2 flagged."
    - "Tauri menu-bridge in +layout.svelte: listen(\"menu:open-settings\") -> window.dispatchEvent(new CustomEvent(\"mneme:open-settings\")). Single re-emit, unlisten on onDestroy. Defense-in-depth — fail-open if listen() throws (cog + Cmd+, still work)."
    - "Conditional global-listener mount in +page.svelte: {#if $page.route.id !== '/onboarding/[step]'} guards DropzoneOverlay (which subscribes to Tauri onDragDropEvent — window-global). Defense-in-depth alongside Plan 09 Step 6 Browse-only listener-free design."
    - "Post-onboarding banner sentinel pattern: localStorage key + boolean state + reactive $derived gate (!dismissed && vault_path.length > 0). Either CTA persists sentinel; never reappears across launches. CYCLE-2 cluster #12 — KD-13 orange accent (NOT olive — olive belongs to Living visual contract for handoff HTML, permanent dual-track 2026-05-14)."
    - "INLINE banner via auto grid row: .window CSS grid-template-rows extended from `var(--titlebar-height) 1fr` to `var(--titlebar-height) auto 1fr`. Banner self-gates visibility (returns null when not visible) so the auto row collapses with zero layout cost pre-onboarding. CYCLE-3 priority #8 — banner is NOT position:fixed (would render outside the matte chrome on small viewports)."
    - "Template-root mount for position:fixed overlays: DropzoneOverlay / ImportDialog / ImportHistoryModal / SettingsPanel mount OUTSIDE .stage / .window (which has overflow:hidden) so the matte bezel is overlaid too. PostOnboardingBanner is the exception — it's INLINE under TitlebarMeta inside .window because it joins the grid as a new row."
    - "Cmd+I keybind hosted at +page.svelte (page-level, NOT +layout.svelte): keeps the onboarding /onboarding/[step] route free of file-picker invocation. addEventListener / removeEventListener pair lifecycle-managed via onMount / onDestroy. metaKey/ctrlKey + no-shift gate narrows the surface so Cmd+Shift+I (devtools) and similar combos pass through."

key-files:
  created:
    - src/lib/components/PostOnboardingBanner.svelte (135 LOC — SPEC-GAP-2 inline one-time banner with KD-13 styling)
    - tests/menu-bridge.test.ts (66 LOC — 3-case SPEC-GAP-1 contract pin)
    - tests/post-onboarding-banner.test.ts (105 LOC — 9-case SPEC-GAP-2 contract pin)
  modified:
    - src/lib/components/TitlebarMeta.svelte (Phase-2 final integration — long-path truncate + ImportStatusPill insertion + openHistory dispatcher + Visual SSOT header updated per D-18)
    - src/routes/+layout.svelte (Plan 02-08 redirect extended — post-onboarding hydration + ReconciliationOverlay mount + installImportListeners + Tauri menu:open-settings bridge with onDestroy unlisten)
    - src/routes/+page.svelte (Phase-1 shell preserved + 4 Phase-2 mount points + Cmd+I handler + mneme:open-* CustomEvent listeners + INLINE PostOnboardingBanner row + .window grid-template-rows auto-row)
    - .planning/threads/interaction-paradigm.md (Cmd+I promoted from candidate to locked exception per Phase 2 D-13; resume threshold raised; frontmatter updated 2026-05-16)

key-decisions:
  - "SPEC-GAP-1 resolution at the JS layer (NOT Rust). The Plan 07 backend already emits menu:open-settings Tauri event on Preferences... click. This plan installs the JS-side listen() bridge in +layout.svelte that re-dispatches the existing mneme:open-settings window CustomEvent. Why +layout.svelte and not +page.svelte: layout is mounted exactly once at app start; +page.svelte unmounts on route change (e.g. onboarding wizard mounts), which would leak the listener and double-subscribe on remount. onDestroy unlisten guards HMR + future route changes. Fail-open try/catch so a Tauri runtime hiccup never breaks the cog + Cmd+, paths."
  - "SPEC-GAP-2 resolution as an inline banner (NOT modal / NOT toast). Modal would block; toast would auto-dismiss before the user reads. Inline banner sits in the grid as a persistent affordance that the user actively dismisses. localStorage sentinel `mneme.postOnboardingBannerDismissed` is a sticky one-time flag; the visibility gate uses strict string comparison (=== 'true') so any other truthy string ('1', 'yes', 'TRUE') does NOT silently dismiss — the spec test pins this defensive behavior. The Open Settings CTA dispatches the SAME mneme:open-settings event as cog/Cmd+,/menu so there is exactly one downstream handler."
  - "CYCLE-3 priority #8 banner placement = INLINE inside .window (NOT template-root). Cycle-2 mounted the banner at template root level which would have rendered OUTSIDE the visible chrome OR stacked via position:absolute, breaking the layout on the 13\" MacBook viewport-fill path. Cycle-3 fix: banner is the 2nd grid row (auto) under the 36px titlebar; the component self-gates visibility (returns null when not shown) so the auto row collapses pre-onboarding with zero layout cost. .window grid-template-rows extended from `var(--titlebar-height) 1fr` to `var(--titlebar-height) auto 1fr`."
  - "BLK-3 defense-in-depth = TWO LAYERS. Layer 1 (Plan 09): Step 6 of the onboarding wizard is Browse-only with NO DropzoneOverlay listener. Layer 2 (this plan): +page.svelte gates DropzoneOverlay mount on `$page.route.id !== '/onboarding/[step]'` so even if SvelteKit ever co-mounts both routes (future nested routing) the global Tauri onDragDropEvent listener cannot register while onboarding is active. Either layer alone closes the race; both together is anti-fragile."
  - "PostOnboardingBanner.svelte created in TASK 2's commit (Rule 3 deviation, NOT Task 3). The plan's Task 2 imports the component; Task 3 creates it. Per Plan 10 cluster #13 atomicity pattern, when one task imports a sibling-task net-new file, the file MUST exist in the importing task's commit so svelte-check stays GREEN at every commit boundary. PostOnboardingBanner.svelte ships in commit e1e9ad1 (Task 2); the 2 contract tests ship in c6ad1a9 (Task 3)."
  - "Cmd+I listener owner = +page.svelte page-level (NOT +layout.svelte). +layout.svelte fires for ALL routes including /onboarding/[step]; if Cmd+I were listened there, the file picker would be invokable during onboarding where it has no semantic meaning. +page.svelte mounts only on the main route, so the listener registration matches the surface where ImportDialog can be opened. Lifecycle: onMount addEventListener + onDestroy removeEventListener pair (Svelte 5 idiom — symmetric clean-up)."
  - "+layout.svelte post-onboarding hydration order: load_config -> list_courses (initial) -> installImportListeners (HMR-safe) -> reconcile_vault_index -> list_courses (refresh). Why two list_courses calls: index repair may surface course folders the load_config snapshot missed (created out-of-band between onboarding finish and first reconcile); the refresh updates the singleton so VaultCategory + ImportDialog see the canonical set without requiring a relaunch. Each step wrapped in try/catch so transient Tauri failures don't strand the spinner or block the main-UI mount."
  - "TitlebarMeta long-path middle-truncation: vault paths over 48 chars render as `<first-segment>/.../<last-2-segments>` so the chrome row stays single-line on a 13\" MacBook. Full path is surfaced via the `title` attribute (native tooltip). Segments.length <= 3 case falls back to the raw path because there's nothing meaningful to truncate. Threshold 48 was chosen empirically — fits 13\" MacBook chrome row alongside the dot + status + pill + cog without wrapping."

patterns-established:
  - "Single CustomEvent funnel for multi-source modal opens: a single literal event name (e.g. mneme:open-settings) is dispatched from cog buttons / hotkeys / native-menu bridges / inline banner CTAs; the modal's parent listens once. Eliminates duplicate-state-machine bugs that cycle-2 flagged (interface vs Step 5 vs Step 6 contracts diverging). Phase 3 multi-session sidebar opening / Phase 7 KG view opening should follow the same pattern."
  - "Tauri-event -> CustomEvent bridge in root layout: listen(\"X:Y\") + onDestroy unlisten + window.dispatchEvent(new CustomEvent(\"prefix:action\")) translates OS-native events into the Svelte event surface. Useful any time a Rust-side trigger (menu / tray / global shortcut / file-association) needs to drive a frontend modal. Fail-open try/catch so a runtime hiccup never breaks the JS-only paths."
  - "Defense-in-depth conditional listener gates: when a component subscribes to a window-global event (Tauri onDragDropEvent, Cmd+, hotkey, etc.), gate its MOUNT on a route check even if the parent layout already isolates the route — the second layer catches future co-mount scenarios (SvelteKit nested routing). `$page.route.id !== \"/some/[param]\"` from $app/stores is reactive and reads naturally inside template {#if} blocks."
  - "Inline contextual banners via auto-row CSS grid: extend the parent's grid-template-rows with an `auto` slot between fixed rows; mount the banner inside the grid (NOT position:fixed); have the banner self-gate visibility (return null when not shown) so the auto row collapses with zero layout cost. Avoids the position:fixed overlay anti-pattern for non-blocking persistent affordances."
  - "Long-path middle-truncation helper colocated with consumer: TitlebarMeta hosts truncatePath() locally rather than extracting to $lib/util — the heuristic (48-char threshold, segments.length > 3 fallback) is specific to the chrome row dimensions; abstracting would create premature generality. Full path always surfaced via title attribute for completeness."

requirements-completed: [REQ-03, REQ-06, REQ-13, REQ-14, REQ-16]

# Metrics
duration: ~32min
completed: 2026-05-17
---

# Phase 02 Plan 12: Final Integration Summary

**Full Phase 2 wired end-to-end — app boot → onboarding → main UI → reconcile → post-onboarding banner → drag/Cmd+I → import → status pill → history modal — every surface reachable from a fresh `~/.mneme/` install. SPEC-GAP-1 (macOS native menu bridge) and SPEC-GAP-2 (one-time inline banner) both landed; BLK-3 race prevention is two-layered; cog/Cmd+,/native-menu/banner trinity funnel through one CustomEvent.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-05-17T00:05Z (worktree spawn + initial context load)
- **Completed:** 2026-05-17T00:37Z
- **Tasks:** 3 (Task 1: TitlebarMeta + +layout / Task 2: +page + thread + PostOnboardingBanner / Task 3: 2 Wave-0 tests)
- **Files modified:** 4 (TitlebarMeta.svelte, +layout.svelte, +page.svelte, interaction-paradigm.md)
- **Files created:** 3 (PostOnboardingBanner.svelte, menu-bridge.test.ts, post-onboarding-banner.test.ts)
- **Test delta:** Vitest 248 → 260 (+12); cargo 60+ green; svelte-check 0/0; audit PASS

## Accomplishments

- **+layout.svelte** post-onboarding hydration pipeline (load_config → list_courses → installImportListeners → reconcile_vault_index → list_courses refresh) running atomically on every main-UI mount; ReconciliationOverlay mounts/unmounts via `reconciling` local state; all IPC wrapped in try/catch so transient failures never block.
- **SPEC-GAP-1 macOS native menu bridge**: +layout.svelte installs `listen("menu:open-settings")` that re-dispatches the existing `mneme:open-settings` window CustomEvent. Cog click / Cmd+, / native menu (Mneme → Preferences...) / PostOnboardingBanner CTA all funnel through the same downstream listener. Unlisten on onDestroy. Fail-open if listen() throws.
- **SPEC-GAP-2 PostOnboardingBanner.svelte** — net-new component (135 LOC). Inline (NOT modal) one-time banner under TitlebarMeta. Visibility gate: `!dismissed && vault_path.length > 0`. Two CTAs (Open Settings dispatches the funneled event + persists sentinel; Dismiss persists sentinel only). Strict `=== 'true'` sentinel check (other truthy strings do NOT silently dismiss — pinned by test).
- **+page.svelte** mounts 4 Phase 2 modals/overlays at template-root level (position:fixed escape from .window overflow:hidden) + PostOnboardingBanner INLINE inside .window grid (CYCLE-3 priority #8) + Cmd+I global keydown invoking tauri-plugin-dialog open() + listeners for both mneme:open-settings and mneme:open-history CustomEvents.
- **TitlebarMeta.svelte** legacy `~/Mneme/usyd-2026s1` placeholder removed (SPEC REQ-01 L133); vault path reads from singleton; ImportStatusPill inserted between connection dot and vault label; long-path middle-truncation helper (>48 chars → first/.../last-2); cog click + new pill click dispatch `mneme:open-settings` / `mneme:open-history`; D-18 Visual SSOT header updated to point at the locked 2026-05-15 Mneme 3 bundle.
- **BLK-3 two-layer race prevention**: DropzoneOverlay mount in +page.svelte gated on `$page.route.id !== '/onboarding/[step]'`. Combined with Plan 09 Step 6 Browse-only design (no DropzoneOverlay listener inside the wizard), the global Tauri onDragDropEvent listener cannot register while onboarding is active under any current OR future SvelteKit routing scenario.
- **interaction-paradigm.md** thread updated: Cmd+I promoted from candidate to locked exception per Phase 2 D-13 (5th narrow exception, joining Cmd+Q / Cmd+, / editor `/`). Resume threshold raised from ~5 to ~6-7 before mini-palette reconsideration. Frontmatter updated 2026-05-16.
- **12 Wave-0 contract tests** GREEN: menu-bridge.test.ts (3 cases — dispatch / no debounce / name translation) + post-onboarding-banner.test.ts (9 cases across visibility gate / sentinel persistence / CTA dispatch order).

## Task Commits

Each task was committed atomically; no commit broke svelte-check / audit / vitest baseline:

1. **Task 1: TitlebarMeta + +layout.svelte wiring** — `32b9579` (feat)
   - Removed legacy hardcode (SPEC REQ-01 L133), inserted ImportStatusPill, long-path truncation.
   - +layout.svelte gained hydrate + reconcile + import-listener + menu:open-settings bridge.

2. **Task 2: +page.svelte wires Phase 2 overlays + Cmd+I + thread row + PostOnboardingBanner.svelte** — `e1e9ad1` (feat)
   - +page.svelte: 4 modals/overlays at template root, INLINE PostOnboardingBanner under titlebar, Cmd+I handler, CustomEvent listeners, BLK-3 conditional.
   - PostOnboardingBanner.svelte created (Rule 3 deviation — see Deviations below).
   - .planning/threads/interaction-paradigm.md: Cmd+I promoted to locked exception.

3. **Task 3: menu-bridge contract + post-onboarding-banner 12-case Wave-0 pin** — `c6ad1a9` (test)
   - tests/menu-bridge.test.ts + tests/post-onboarding-banner.test.ts (12 cases total).

**Plan metadata commit:** (this SUMMARY.md commit — separate, made by the executor)

## Files Created/Modified

### Created

- `src/lib/components/PostOnboardingBanner.svelte` — 135 LOC. SPEC-GAP-2 inline one-time banner. KD-13 cream-deep surface + orange accent stripe. Reads vaultState.vault_path + localStorage sentinel `mneme.postOnboardingBannerDismissed`. Two CTAs (Open Settings + Dismiss). Dispatch + persist on Open Settings; persist only on Dismiss. Strict `=== 'true'` sentinel check.
- `tests/menu-bridge.test.ts` — 66 LOC. 3-case SPEC-GAP-1 contract pin (dispatch / no debounce / name translation).
- `tests/post-onboarding-banner.test.ts` — 105 LOC. 9-case SPEC-GAP-2 contract pin (visibility gate / sentinel persistence / CTA dispatch order).

### Modified

- `src/lib/components/TitlebarMeta.svelte` — Phase 2 final integration. ImportStatusPill insertion + long-path truncate + openHistory dispatcher + D-18 Visual SSOT header updated. Legacy `~/Mneme/usyd-2026s1` placeholder fully removed from runtime + comment (CSS dot/etc. preserved).
- `src/routes/+layout.svelte` — extended Plan 02-08 redirect with post-onboarding hydration pipeline + ReconciliationOverlay mount/unmount + installImportListeners + SPEC-GAP-1 menu:open-settings Tauri bridge with onDestroy unlisten.
- `src/routes/+page.svelte` — Phase-1 shell preserved verbatim; 4 Phase-2 mount points added at template root (DropzoneOverlay conditional / ImportDialog / ImportHistoryModal / SettingsPanel); PostOnboardingBanner INLINE under TitlebarMeta inside .window; Cmd+I handler; CustomEvent listeners with onMount/onDestroy lifecycle. .window grid-template-rows extended with auto row for the banner.
- `.planning/threads/interaction-paradigm.md` — Cmd+I promoted from candidate to locked exception; resume threshold raised; frontmatter updated.

## Decisions Made

See `key-decisions` in frontmatter for the 8 load-bearing decisions. Quick highlights:

- **SPEC-GAP-1 bridge in +layout.svelte (not +page.svelte)** so the listen() registers exactly once at app start. Per-route mount would leak.
- **SPEC-GAP-2 = inline banner (not modal/toast)** so the user actively dismisses; modal blocks; toast auto-dismisses before being read.
- **Banner mounts INLINE inside .window grid (CYCLE-3 priority #8)** — cycle-2's template-root placement would have rendered outside the visible chrome.
- **BLK-3 = two layers** (Plan 09 Step 6 Browse-only + Plan 12 conditional mount). Defense-in-depth.
- **PostOnboardingBanner.svelte created in Task 2's commit** (Rule 3 deviation) so svelte-check stays GREEN at every commit boundary — matches Plan 10 cluster #13 atomic-delete pattern.
- **Cmd+I owner = +page.svelte (page-level)** so the file picker is unreachable from the /onboarding route where it has no semantic meaning.
- **+layout.svelte hydration calls list_courses TWICE** (initial + post-reconcile) so index repair surfaces course folders the initial load missed without requiring relaunch.
- **TitlebarMeta long-path truncation threshold = 48 chars** empirically chosen to fit 13" MacBook chrome row without wrapping; segments.length <= 3 falls back to raw path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PostOnboardingBanner.svelte created in Task 2 commit (Task 3 file moved to Task 2)**

- **Found during:** Task 2 (+page.svelte wiring)
- **Issue:** Task 2 imports `PostOnboardingBanner` from `$lib/components/PostOnboardingBanner.svelte`, but the plan's Task 3 is where that file is supposed to be created. Running `npm run check` between Task 2 and Task 3 commits would fail with "Cannot find module '$lib/components/PostOnboardingBanner.svelte'" — breaking the task_commit_protocol invariant that every commit boundary must be svelte-check GREEN.
- **Fix:** Created `src/lib/components/PostOnboardingBanner.svelte` (the full Task 3 component, including KD-13 styling) in Task 2's commit. Task 3 then ships ONLY the 2 contract test files. Follows the Plan 10 cluster #13 atomic-delete pattern (same commit must include all file moves that affect a caller — here, applied in reverse for a net-new file).
- **Files modified:** `src/lib/components/PostOnboardingBanner.svelte` (created in Task 2 commit `e1e9ad1` instead of Task 3 commit `c6ad1a9`)
- **Verification:** svelte-check 0 errors / 0 warnings at HEAD of every commit (Task 1 / Task 2 / Task 3).
- **Committed in:** `e1e9ad1` (Task 2 commit — documented in commit message body)

**2. [Rule 1 - Bug] Removed redundant ARIA role on `<aside>` in PostOnboardingBanner.svelte**

- **Found during:** Task 2 (`npm run check` after creating PostOnboardingBanner)
- **Issue:** svelte-check warned `"Redundant role 'complementary'"` because `<aside>` already has implicit role="complementary" — explicit role is an a11y anti-pattern.
- **Fix:** Removed `role="complementary"` attribute, kept `<aside>` element (implicit semantics intact) + `aria-label`.
- **Files modified:** `src/lib/components/PostOnboardingBanner.svelte`
- **Verification:** svelte-check 0 errors / 0 warnings after fix.
- **Committed in:** `e1e9ad1` (Task 2 commit — applied inline before staging)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 a11y bug). Both surfaced during Task 2 svelte-check run; both resolved inline before committing.
**Impact on plan:** Zero scope creep. Rule 3 moved file CREATION earlier without changing file CONTENT (same Task 3 spec, just in Task 2 commit). Rule 1 a11y fix matches Svelte 5 a11y lint expectation.

## Issues Encountered

- **Worktree path safety (`#3099`):** First Write tool call for TitlebarMeta.svelte and +layout.svelte used the path `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/...` (resolved to the MAIN repo, not the worktree). Reverted via `git checkout --` and re-applied using the explicit worktree path `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/worktrees/agent-a4da1c88d311f6c7c/src/...`. No commits landed on main repo; recovery clean. Lesson reinforces the system-prompt `<absolute-path-safety>` rule: derive absolute paths from `git rev-parse --show-toplevel` inside the worktree.
- **`grep -Pzo` cycle-3 priority #8 placement gate vs ugrep:** The plan's `grep -Pzo '<TitlebarMeta\s*/>\s*</div>\s*<!--[^>]*-->\s*<PostOnboardingBanner'` regex exited 0-results under macOS `ugrep 7.5.0` (which symlinks as `grep`). Verified placement semantically with `perl -0777` which returned MATCH; the structural intent (banner immediately after titlebar div) is met. Would have passed under GNU grep; ugrep compatibility note recorded for future plan reviewers.
- **Pre-existing upstream visual-review-template test failure** (`scripts/__tests__/visual-review-template.test.mjs`): R7 test asserts `/Users/qinyuan/.claude/get-shit-done/templates/visual-review.html` exists but the upstream GSD ship moved it. Unrelated to Phase 2; carried as a known failure across multiple recent commits. Tracked separately for an upstream PR (per .planning/notes/upstream-pr-gsd-build-followup.md F1 followup).

## User Setup Required

None - no external service configuration required. Phase 2 is local-first per KP-01; no API keys, no environment variables, no third-party service wiring.

## Next Phase Readiness

- **Phase 2 ship-ready**: all 12 plans complete; full end-to-end flow wired; 260/261 vitest GREEN (1 unrelated pre-existing upstream failure); 60+/60+ cargo GREEN; svelte-check 0/0; audit PASS.
- **Recommended next commands** (per phase orchestrator):
  1. `/gsd-verify-work 2` — 4-bucket dev-feedback loop (visual / window / motion / perf). Manual rows in special_notes plan §verification (delete `~/.mneme/`, relaunch, walk: onboarding → finish → ReconciliationOverlay → main UI → PostOnboardingBanner appears → Cmd+, opens SettingsPanel → macOS menu → Preferences... opens SettingsPanel → drag file → DropzoneOverlay → ImportDialog → Submit → ImportStatusPill animates → click pill → ImportHistoryModal → re-import same file → friendly PermissionDenied message inline).
  2. `/gsd-code-review 2 --fix --auto` — covers all 12 plans (this is the integration wave).
  3. `/gsd-pr-branch main && /gsd-ship 2` — PR + merge.
  4. `/gsd-extract-learnings 2`.
- **Deferred phase-wrap-up** (NOT in this plan, separate post-ship commit per CONTEXT.md L13): patch ROADMAP.md L146-158 "Canvas + Ed import + sync" wording → "vault + manual import + onboarding" (Self-ecosystem decision 2026-05-11); patch REQUIREMENTS.md REQ-03/REQ-13 wording in lockstep.
- **Threat surface scan**: no new network endpoints, no new auth paths, no new schema. The menu:open-settings Tauri event is read-only (UI navigation only); existing Plan 07 capability gates (core:menu:default + core:event:default + core:event:allow-listen) already cover it.
- **Known stubs:** none — every wired surface has live data (vault_path from singleton; course list from list_courses; recent_20 from import-state; pill state from derivePillState). The DuplicateResolutionDialog DEFERRAL to Phase 3 is documented in Plan 11 SUMMARY + CONTEXT.md D-08 (NOT a stub — the friendly PermissionDenied inline message is the v1 surface; the dialog is the v1.x enhancement).

## Self-Check: PASSED

Verified after writing SUMMARY:

1. **Files created exist:**
   - `src/lib/components/PostOnboardingBanner.svelte` — FOUND
   - `tests/menu-bridge.test.ts` — FOUND
   - `tests/post-onboarding-banner.test.ts` — FOUND

2. **Commits exist (in worktree branch worktree-agent-a4da1c88d311f6c7c):**
   - `32b9579` (Task 1) — FOUND
   - `e1e9ad1` (Task 2) — FOUND
   - `c6ad1a9` (Task 3) — FOUND

3. **Final test/audit state:**
   - svelte-check: 0 errors / 0 warnings — VERIFIED
   - vitest: 260 passed (+12 over baseline 248) / 1 pre-existing unrelated failure (visual-review-template upstream)
   - cargo test --features dev-invoke: 60+ tests passed, 0 failed
   - audit-capabilities.sh: PASS
   - BLK-3 conditional gate present in +page.svelte: VERIFIED (`grep "page.route.id"` 2 matches)
   - SPEC-GAP-1 bridge present in +layout.svelte: VERIFIED (`grep "menu:open-settings"` 3 matches)
   - DuplicateResolutionDialog correctly absent: VERIFIED (`! test -f src/lib/components/DuplicateResolutionDialog.svelte`)

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Plan: 12 (final integration wave — Wave 8)*
*Completed: 2026-05-17*

---

## Phase 02.1 W7 disposition note (added 2026-05-17)

All keymap items in the 02-12 scope (`Cmd+I` global handler in `+page.svelte`, `Cmd+,` bridge in `+layout.svelte`, macOS native Preferences menu wiring, `mneme:open-settings` CustomEvent funnel sourced from cog / Cmd+, / native menu / banner CTA) are marked **v1.x deferred per Phase 02.1 D-06** — the running implementation remains intact (no code reverted; tests `cmd-comma-shortcut.test.ts` + `menu-bridge.test.ts` + `menu_preferences_emits_event.rs` still gate regressions), but the SPEC contract no longer guarantees these keymaps in v1 release.

**What still ships in v1 from the 02-12 wave:**

- Cog click → opens SettingsPanel (v1).
- macOS native menu Mneme → Preferences… → opens SettingsPanel (v1).
- PostOnboardingBanner inline Open Settings CTA (v1).
- `mneme:open-settings` CustomEvent funnel itself (v1) — the architectural pattern remains, just minus the Cmd+, source.
- Drag-drop import trigger (v1).
- All 4 modal mount points + post-onboarding hydration sequence (v1).

**What is v1.x deferred:**

- The `Cmd+,` accelerator surface itself (keyboard shortcut to open settings).
- The `Cmd+I` keyboard shortcut surface itself (keyboard shortcut to open the file picker).

**Why deferred (not removed):** the implementation works; the spec just no longer treats it as a release-blocker. v1.x re-introduction is paired with Phase 3 multi-session sidebar where keyboard nav becomes a first-class promise.

**Dogfood cost captured 2026-05-17:** today's dogfood of the B3 (`claude_auth_check`) fix surfaced a concrete workflow loss — without `Cmd+R` (also v1.x deferred per D-06) the user must Cmd+Q + relaunch to re-trigger the Step 2 probe. This was the trigger that locked the W7 decision. Captured here so the v1.x cycle prioritizes the reload path first when keymap is re-introduced.

See:

- `02-UI-SPEC.md` §8.0 Keymap Status
- `02-VERIFICATION.md` deferral callout
- `02-VALIDATION.md` deferral callout
- `02-RESEARCH.md` Validation Architecture deferral note
- Phase 02.1 CONTEXT D-06

Backlog candidate: keymap re-introduction in Phase 02.2 or 03.5 (`/gsd-capture --seed "keymap re-introduction: Cmd+R reload first, then Cmd+, settings, then Cmd+I file picker, then Cmd+P palette in Phase 3"`).
