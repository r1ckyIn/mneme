---
phase: 02
slug: vault-canvas-ed-sync-onboarding
status: shipped
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-15
validated_at: 2026-05-17
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` `## Validation Architecture` section (lines 1058-1133).
> **Last refreshed:** 2026-05-17 — Nyquist audit pass after gap-closure ship (plans 02-13 / 02-14 / 02-15).
> Per-Task Verification Map previously held a single placeholder row; this refresh replaces it with real rows derived from all 15 PLAN.md + SUMMARY.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (JS/TS)** | Vitest 4.1.x (inherited from Phase 1 + Phase 01.1) |
| **Framework (Rust)** | `cargo test` built-in |
| **Config files** | `vitest.config.ts`, `src-tauri/Cargo.toml [dev-dependencies]` |
| **Quick run command (JS)** | `npx vitest run --changed` (auto via Husky pre-commit) |
| **Quick run command (Rust)** | `cargo test --manifest-path src-tauri/Cargo.toml` |
| **Full suite command** | `npm test && cargo test --manifest-path src-tauri/Cargo.toml` |
| **E2E framework** | None — visual verification via dev-feedback-loop (`gsd-dev-snapshot.mjs` + Tauri shell screenshot) |
| **Estimated runtime** | ~30s JS suite + ~15s Rust suite |
| **Final suite state (2026-05-17)** | cargo: 66/66 pass · vitest: 277 pass / 1 pre-existing fail (out-of-scope) / 1 skip · svelte-check: 0/0/398 |

---

## Sampling Rate

- **After every task commit:** `npx vitest run --changed` (Husky pre-commit auto) + `cargo test` for Rust changes
- **After every plan wave:** `npm test && cargo test --manifest-path src-tauri/Cargo.toml` (full suite green)
- **Before `/gsd-verify-work`:** Full suite green + `bash scripts/audit-capabilities.sh` clean + dev-snapshot visual diff for each net-new surface (7 surfaces: Onboarding 6 steps + Settings + ImportDialog + ImportStatusPill + ImportHistoryModal + DropzoneOverlay)
- **Max feedback latency:** ≤ 45s (full suite including Rust)

---

## Per-Task Verification Map

> Filled 2026-05-17 by Nyquist audit from all 15 PLAN.md + 15 SUMMARY.md files.
> Threat refs (T-2-01 … T-2-12) map to `02-RESEARCH.md` `## Threat Model` STRIDE table.
> Wave column: 0 = bootstrap, 1 = vault_writer, 2 = persistence, 3 = import_controller, 4 = IPC bridge, 5/6 = UI wizard, 7 = settings/import-UI, 8 = integration, GC = gap-closure.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior Verified | Test Type | Automated Command | File Path | Status |
|---------|------|------|-------------|------------|--------------------------|-----------|-------------------|-----------|--------|
| 02-01-T0 | 01 | 0 | REQ-03, REQ-06 | T-2-01 HIGH | `..` path traversal rejected by substring check at skeleton level | unit (Rust) | `cargo test --test path_traversal_blocked` | `src-tauri/tests/path_traversal_blocked.rs` | ✅ green |
| 02-01-T0b | 01 | 0 | REQ-03 | T-2-02 HIGH | Symlink leaf at skeleton level intentionally RED (Wave 1 GREEN gate) — Wave 0 stubs all 18 Rust integration tests | unit (Rust) | `cargo test --test symlink_canonicalize_blocked` | `src-tauri/tests/symlink_canonicalize_blocked.rs` | ✅ green (RED→GREEN in 02-02) |
| 02-01-T1 | 01 | 0 | REQ-03, REQ-06, REQ-13, REQ-16 | — | 9 cargo deps + 2 npm deps land; `mneme_lib` crate rename; 16 `#[ignore]` stub Rust tests + 9 Vitest `describe.skip` stubs seeded | infra | `cargo build && npm install` | `src-tauri/Cargo.toml`, `package.json` | ✅ green |
| 02-01-T2 | 01 | 0 | REQ-14 | T-2-09 | `--color-success #4ea36b` token locked to onboarding-only (3 reserved uses; never as primary CTA fill per UI-SPEC §4) | infra | `grep -E '\-\-color-success' src/lib/styles/tokens.css` | `src/lib/styles/tokens.css` | ✅ green |
| 02-01-T3 | 01 | 0 | REQ-03 | T-2-01, T-2-02 | Tauri 2 `onDragDropEvent` payload shape source-verified against locked dep versions; A5 HIGH risk closed | doc/spike | `02-SPIKE-dragdrop.md` Errata `### Verification mode: source-of-truth` | `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPIKE-dragdrop.md` | ✅ green |
| 02-02-T1 | 02 | 1 | REQ-06 | T-2-01, T-2-02 | `create_vault_scaffold` 4 top-level dirs idempotent; re-init NOOP | unit (Rust) | `cargo test --test vault_scaffold` | `src-tauri/tests/vault_scaffold.rs` | ✅ green |
| 02-02-T1b | 02 | 1 | REQ-06 | T-2-06 | `create_course` creates 7 sub-dirs + INDEX.md; re-add does NOT overwrite INDEX.md; invalid course code `^[A-Z]{4}\d{4}$` rejected | unit (Rust) | `cargo test --test course_scaffold` | `src-tauri/tests/course_scaffold.rs` | ✅ green |
| 02-02-T1c | 02 | 1 | REQ-03 | T-2-01, T-2-02 | Two-arm canonicalize-parent gate: T-2-01 + T-2-02 both GREEN; Component-based `_source` check (NOT substring) | unit (Rust) | `cargo test --test vault_writer_user_rejects && cargo test --test vault_writer_import_writes` | `src-tauri/tests/vault_writer_user_rejects.rs`, `src-tauri/tests/vault_writer_import_writes.rs` | ✅ green |
| 02-02-T1d | 02 | 1 | REQ-03 | T-2-02 | Symlink leaf canonicalize guard: T-2-02 flipped RED→GREEN | unit (Rust) | `cargo test --test symlink_canonicalize_blocked` | `src-tauri/tests/symlink_canonicalize_blocked.rs` | ✅ green |
| 02-02-T2 | 02 | 1 | REQ-03 | T-2-03 | `chmod 0o444` enforced after import write; raw `fs::write` returns `PermissionDenied`; User-ctx vault_writer guard rejects | unit (Rust) | `cargo test --test chmod_lock_enforced` | `src-tauri/tests/chmod_lock_enforced.rs` | ✅ green |
| 02-02-T2b | 02 | 1 | REQ-03 | T-2-03 | Re-import cycle: chmod 644 → write → chmod 444 (D-07 one-place contract) | unit (Rust) | `cargo test --test chmod_three_step_cycle` | `src-tauri/tests/chmod_three_step_cycle.rs` | ✅ green |
| 02-02-T2c | 02 | 1 | REQ-03 | T-2-03 | Cancellation-safety Drop guard: cancel mid-cycle leaves file at 0o444 OR 0o644 + returns Err | unit (Rust) | `cargo test --test chmod_cancellation_safety` | `src-tauri/tests/chmod_cancellation_safety.rs` | ✅ green |
| 02-03-T1 | 03 | 2 | REQ-16 | T-2-10 | `Config { vault_path, schema_version }` atomic temp+rename round-trip; `NotFound` → default; unsupported schema → typed Err | unit (Rust inline) | `cargo test --manifest-path src-tauri/Cargo.toml --lib config` | `src-tauri/src/config.rs` (inline tests) | ✅ green |
| 02-03-T2 | 03 | 2 | REQ-16 | T-2-10 | `OnboardingState { current_step, vault_path, courses_added, completed_at }` atomic temp+rename round-trip; `complete_in` stamps ISO-8601; `completed_at.is_some()` is the skip-wizard gate | unit (Rust inline) + integration | `cargo test --manifest-path src-tauri/Cargo.toml --lib onboarding && cargo test --test onboarding_complete` | `src-tauri/src/onboarding.rs`, `src-tauri/tests/onboarding_complete.rs` | ✅ green |
| 02-04-T1 | 04 | 2 | REQ-13, REQ-06 | T-2-07 | WAL pragma stack; idempotent schema; CRUD via `params![]` (T-2-07 SQL injection grep gate); 5-insert + DB < 1 MB; list_courses DISTINCT NULL-skip | integration (Rust) | `cargo test --test vault_index_count` | `src-tauri/tests/vault_index_count.rs` | ✅ green |
| 02-04-T2 | 04 | 2 | REQ-13 | T-2-07 | Reconciliation lazy-delete: ghost rows removed; idempotent re-run | integration (Rust) | `cargo test --test reconcile_lazy_delete` | `src-tauri/tests/reconcile_lazy_delete.rs` | ✅ green |
| 02-04-T2b | 04 | 2 | REQ-06 | — | `enumerate_folder_one_level` returns top-level files + skipped-subdirs tuple; hidden files excluded | integration (Rust) | `cargo test --test folder_batch_one_level` | `src-tauri/tests/folder_batch_one_level.rs` | ✅ green |
| 02-05-T1 | 05 | 3 | REQ-13 | T-2-06, T-2-12 | Happy-path: 2 files emit 2 `import:progress` + 1 `import:done`; `_inbox` dest when no course | unit (Rust inline) | `cargo test --manifest-path src-tauri/Cargo.toml --lib import_controller` | `src-tauri/src/import_controller.rs` (inline tests) | ✅ green |
| 02-05-T1b | 05 | 3 | REQ-03 | T-2-06 | Pre-spawn `validate_inputs` gate rejects invalid course code + invalid category BEFORE registry insert or task spawn | unit (Rust inline) + integration | `cargo test --test import_controller_validates_course_category` | `src-tauri/tests/import_controller_validates_course_category.rs` | ✅ green |
| 02-05-T1c | 05 | 3 | REQ-03 | T-2-03 | Source-clash detection BEFORE `read_bytes` / `write_to_vault`; existing bytes UNCHANGED; batch continues | unit (Rust inline) + integration | `cargo test --test source_basename_clash` | `src-tauri/tests/source_basename_clash.rs` | ✅ green |
| 02-05-T2 | 05 | 3 | REQ-13 | T-2-11 | Cancel mid-batch: CancellationToken flips; spawned task observes via `yield_now().await`; already-written files NOT rolled back | unit (Rust inline) | `cargo test --manifest-path src-tauri/Cargo.toml --lib import_controller` | `src-tauri/src/import_controller.rs` (inline tests) | ✅ green |
| 02-05-T2b | 05 | 3 | REQ-13 | — | Per-file failure does NOT abort batch: read/write errors → `failures Vec`, failed counter incremented, `continue` loop | unit (Rust inline) | `cargo test --manifest-path src-tauri/Cargo.toml --lib import_controller` | `src-tauri/src/import_controller.rs` (inline tests) | ✅ green |
| 02-05-T2c | 05 | 3 | REQ-03 | — | `ipc_user_rejects`: `write_to_vault(..._source/..., User)` returns `Err(VaultWriterError::WriteToSourceForbidden)` | integration (Rust) | `cargo test --test ipc_user_rejects` | `src-tauri/tests/ipc_user_rejects.rs` | ✅ green |
| 02-06-T1 | 06 | 1 | REQ-13 | — | `derivePillState` returns correct `PillState` for all 5 variants (idle / importing / imported / partial / cancelled); stale-history grace; `formatRecency` boundaries | unit (Vitest) | `npx vitest run tests/import-status-pill.test.ts` | `tests/import-status-pill.test.ts` | ✅ green |
| 02-06-T2 | 06 | 1 | REQ-13 | — | Reactive singleton: `recordHistory` FIFO drop at 20; `failures[].reason` (not `.message`) per Rust SSOT; `installImportListeners` idempotence; `courseCount`; alphabetical sort | unit (Vitest) | `npx vitest run tests/import-state-singleton.test.ts` | `tests/import-state-singleton.test.ts` | ✅ green |
| 02-07-T1 | 07 | 4 | REQ-03, REQ-06, REQ-11, REQ-13, REQ-14, REQ-16 | T-2-01, T-2-09 | 16 `#[tauri::command]` handlers registered; `tauri-plugin-dialog` registered; `dragDropEnabled: true`; `audit-capabilities.sh` Gates 9-13 green | integration (Rust + audit) | `cargo test --test menu_preferences_emits_event && bash scripts/audit-capabilities.sh` | `src-tauri/tests/menu_preferences_emits_event.rs` | ✅ green |
| 02-07-T2 | 07 | 4 | REQ-11 | T-2-09 | `safe_copy_vault` + `count_and_sum` + `move_vault`: always-copy (no `fs::rename`); 0o444 preserved; independent post-copy walk verifier; CYCLE-3 BLK-1 non-empty-dst guard; canonicalize disk-bomb guards | integration (Rust) | `cargo test --test vault_move_safe_copy && cargo test --test vault_move_interrupt && cargo test --test move_vault_non_empty_dst` | `src-tauri/tests/vault_move_safe_copy.rs`, `src-tauri/tests/vault_move_interrupt.rs`, `src-tauri/tests/move_vault_non_empty_dst.rs` | ✅ green |
| 02-07-T3 | 07 | 4 | REQ-14 | — | macOS native menu (Mneme → Preferences… Cmd+,) emits `menu:open-settings`; `build_app_menu` + `on_menu_event` dispatch contract pinned | integration (Rust) | `cargo test --test menu_preferences_emits_event` | `src-tauri/tests/menu_preferences_emits_event.rs` | green (implementation intact; spec contract for the Cmd+, keymap surface is v1.x deferred per Phase 02.1 D-06 — the macOS menu Preferences… still works in v1) |
| 02-08-T1 | 08 | 5 | REQ-16 | — | SvelteKit `/onboarding/[step]` dynamic route prerendered (entries 1-6); `completed_at == null` → redirect to wizard; root `+layout.svelte` `ready` flag gates `{@render children()}` before IPC resolves | unit (Vitest IPC contract) | `npx vitest run tests/onboarding-resume.test.ts` | `tests/onboarding-resume.test.ts` | ✅ green |
| 02-08-T2 | 08 | 5 | REQ-16 | — | `OnboardingStepRail` 6-dot indicator; Step1Welcome + Step4MCPStatus visual bodies per UI-SPEC §8.1; URL→state `$effect` bridge for same-route navigation | manual (visual snapshot) | `npm run gsd-dev-screenshot` | `src/lib/components/onboarding/*.svelte` | manual queued |
| 02-09-T1 | 09 | 6 | REQ-16 | T-2-08 | `claude_auth_check` uses `Path::exists()` (stat syscall); NO credential bytes cross IPC | integration (Rust) + unit (Vitest) | `npx vitest run tests/onboarding-finish.test.ts` | `tests/onboarding-finish.test.ts` | ✅ green |
| 02-09-T1b | 09 | 6 | REQ-16 | T-2-06 | `validateCourseCode` rejects non-`^[A-Z]{4}\d{4}$` + path-segment prefix false-positive fixed | unit (Vitest) | `npx vitest run tests/course-code-regex.test.ts` | `tests/course-code-regex.test.ts` | ✅ green |
| 02-09-T2 | 09 | 6 | REQ-16 | — | Step2AuthCheck / Step3VaultPicker / Step5AddCourse / Step6DemoImport components; BLK-3 race eliminated by Browse-only Step6 (no DropzoneOverlay listener during onboarding) | manual (visual snapshot) | `npm run gsd-dev-screenshot` | `src/lib/components/onboarding/Step{2,3,5,6}*.svelte` | manual queued |
| 02-10-T1 | 10 | 7 | REQ-14 | — | Cmd+, opens SettingsPanel; `mneme:open-settings` CustomEvent dispatched; prop-controlled `open` + `onClose` interface (CYCLE-3 #3 contract) | unit (Vitest) | `npx vitest run tests/cmd-comma-shortcut.test.ts` | `tests/cmd-comma-shortcut.test.ts` | green (implementation intact; spec contract v1.x deferred per Phase 02.1 D-06 — the Vitest unit test still gates regression of the dispatch contract) |
| 02-10-T2 | 10 | 7 | REQ-14 | — | 8 categories render without error; `localStorage` `mneme.settings.activeCategory` persistence; VaultCategory / AppearanceCategory / KeybindingsCategory bodies correct | unit (Vitest) | `npx vitest run tests/settings-categories.test.ts` | `tests/settings-categories.test.ts` | ✅ green |
| 02-10-T3 | 10 | 7 | REQ-14, REQ-11 | — | `SettingsModal.svelte` deleted + `TitlebarMeta` import rewritten atomically (CYCLE-2 cluster #13); cog click dispatches `mneme:open-settings` | unit (Vitest) | `npx vitest run tests/vault-move-flow.test.ts` | `tests/vault-move-flow.test.ts` | ✅ green |
| 02-11-T1 | 11 | 7 | REQ-03 | T-2-01 | `DropzoneOverlay` subscribes to Tauri `onDragDropEvent`; `over` event visibility preserved from preceding `enter` (no phantom `paths` destructure); discriminated-union narrowing without `@ts-expect-error` | unit (Vitest) | `npx vitest run tests/datatransfer-types-discrimination.test.ts` | `tests/datatransfer-types-discrimination.test.ts` | ✅ green |
| 02-11-T2 | 11 | 7 | REQ-03, REQ-13 | T-2-03 | `classifyImportError` classifier: `PermissionDenied` → friendly inline alert; `source-clash:` prefix → user-remediation message; generic fallback | unit (Vitest) | `npx vitest run tests/import-error-classifier.test.ts` | `tests/import-error-classifier.test.ts` | ✅ green |
| 02-11-T3 | 11 | 7 | REQ-13 | — | `ImportStatusPill` 5-state via `data-status` CSS attr; 30s recency refresh; `ImportHistoryModal` recent-20 + per-row failure expansion; `ReconciliationOverlay` blocking spinner + listener block | manual (visual snapshot) | `npm run gsd-dev-screenshot` | `src/lib/components/{ImportStatusPill,ImportHistoryModal,ReconciliationOverlay}.svelte` | manual queued |
| 02-12-T1 | 12 | 8 | REQ-03, REQ-13, REQ-14, REQ-16 | — | `menu:open-settings` Tauri event → `mneme:open-settings` CustomEvent bridge in `+layout.svelte`; single-path funneling for cog / Cmd+, / native menu / banner CTA | unit (Vitest) | `npx vitest run tests/menu-bridge.test.ts` | `tests/menu-bridge.test.ts` | green (implementation intact; the Cmd+, source in the funnel is v1.x deferred per Phase 02.1 D-06 — cog / native menu / banner CTA still funnel as v1) |
| 02-12-T2 | 12 | 8 | REQ-06, REQ-16 | — | `PostOnboardingBanner` one-time inline banner; `localStorage` sentinel strict `=== 'true'`; `mneme.postOnboardingBannerDismissed` gate; Open Settings CTA dispatches `mneme:open-settings` | unit (Vitest) | `npx vitest run tests/post-onboarding-banner.test.ts` | `tests/post-onboarding-banner.test.ts` | ✅ green |
| 02-12-T3 | 12 | 8 | REQ-03, REQ-06, REQ-13, REQ-14, REQ-16 | T-2-01 | Full end-to-end flow wired: `+layout.svelte` post-onboarding hydration sequence; Cmd+I `+page.svelte` handler; `DropzoneOverlay` gated on `$page.route.id !== '/onboarding/[step]'` (BLK-3 layer 2); 4 modal mount points at template root | manual (visual snapshot + end-to-end dogfood) | `npm run gsd-dev-snapshot` | `src/routes/{+layout,+page}.svelte` | manual queued — Cmd+I handler is v1.x deferred per Phase 02.1 D-06 (handler stays wired; spec contract retracted) |
| 02-13-T1 | 13 | GC | REQ-03 | T-2-03 | CR-02: `_inbox/` same-basename re-import records failure + existing bytes UNCHANGED (unconditional `dest-clash:` prefix; `routes_to_source` predicate removed from controller) | integration (Rust) | `cargo test --test inbox_basename_clash` | `src-tauri/tests/inbox_basename_clash.rs` | ✅ green |
| 02-13-T2 | 13 | GC | REQ-06 | T-2-02 | CR-03: `canon_src`/`canon_dst` used throughout `safe_copy_vault` + `count_and_sum` + `reconcile` (grep gate: 0 live `&src`/`&dst` references in those call sites); stdlib canonicalize-follows-symlinks invariant pinned | integration (Rust) | `cargo test --test move_vault_symlink_guard` | `src-tauri/tests/move_vault_symlink_guard.rs` | ✅ green |
| 02-13-T3 | 13 | GC | REQ-14 | — | WR-01: `ClaudeAuthStatus.env_broken: bool` added; `claude_auth_check` returns `env_broken: true` when `home::home_dir() == None`; Step 2 can surface "environment misconfigured" distinct from credentials missing | integration (Vitest) | `npx vitest run tests/import-error-classifier.test.ts` | `tests/import-error-classifier.test.ts` (28 cases incl. dest-clash branch) | ✅ green |
| 02-13-T3b | 13 | GC | REQ-03 | — | `import-error.ts` classifier: `dest-clash:` prefix → `DEST_CLASH_MESSAGE`; ordered BEFORE `PermissionDenied` catch; `isDestClashShape()` helper | unit (Vitest) | `npx vitest run tests/import-error-classifier.test.ts` | `tests/import-error-classifier.test.ts` | ✅ green |
| 02-14-T1 | 14 | GC | REQ-13 | — | CR-04: `VaultIndex::reconcile_with_progress<F: Fn(usize, usize)>` variant emits `reconcile:progress {current, total}` per file + `reconcile:done` on completion via `Emitter::emit` | integration (Rust) | `cargo test --test reconcile_emits_progress` | `src-tauri/tests/reconcile_emits_progress.rs` | ✅ green |
| 02-14-T2 | 14 | GC | REQ-14 | — | CR-01: VaultCategory Browse button bound to `revealInFinder` (discards picker; no `setVaultPath`); Move button keeps `browseAndMove` (stages confirm overlay); two distinct CTAs per UI-SPEC §8.1 | unit (Vitest source-regex pin) | `npx vitest run tests/vault-move-flow.test.ts` | `tests/vault-move-flow.test.ts` (2 new cases) | ✅ green |
| 02-14-T3 | 14 | GC | REQ-06 | — | WR-08: `+layout.svelte` pre-reconcile `list_courses` call deleted; single post-reconcile read is now the canonical course list (stale empty-list race eliminated) | unit (Vitest source-regex pin) | `npx vitest run tests/vault-move-flow.test.ts` | `tests/vault-move-flow.test.ts` | ✅ green |
| 02-15-T1 | 15 | GC | REQ-03 | T-2-03 | WR-02: `RelockGuard` Drop is sole relock authority (explicit post-write `chmod 0o444` removed; `disarm`/`armed` dead code removed); `chmod_three_step_cycle` + `chmod_cancellation_safety` still GREEN | unit (Rust) | `cargo test --test chmod_three_step_cycle && cargo test --test chmod_cancellation_safety` | `src-tauri/tests/chmod_{three_step_cycle,cancellation_safety}.rs` | ✅ green |
| 02-15-T2 | 15 | GC | REQ-16 | — | WR-03: `next()` reads `Math.min(6, initialStep + 1)` (URL truth); module-scope `loaded $state` gate flips at END of `onMount`; `next()` short-circuits when `saving \|\| !loaded`; stale-state formula absent | unit (Vitest source-regex pin) | `npx vitest run tests/onboarding-resume.test.ts` | `tests/onboarding-resume.test.ts` (WR-03 describe block) | ✅ green |
| 02-15-T3 | 15 | GC | REQ-16 | — | WR-11: `Step5AddCourse.addCourse()` early-returns with inline error when `vaultRoot` empty/whitespace; `vault_writer::create_course` rejects empty/non-absolute root via new `VaultWriterError::Validation` variant | unit (Rust inline) + unit (Vitest source-regex) | `cargo test --manifest-path src-tauri/Cargo.toml --lib vault_writer && npx vitest run tests/onboarding-resume.test.ts` | `src-tauri/src/vault_writer.rs`, `tests/onboarding-resume.test.ts` | ✅ green |
| 02-15-T4 | 15 | GC | REQ-03 | — | WR-06: `audit-capabilities.sh` Gate 9 `import_handle()` whitelist regex anchored with leading `/` to prevent `<x>_lib.rs` filename collisions; `bash scripts/audit-capabilities.sh` PASS | gate | `bash scripts/audit-capabilities.sh` | `scripts/audit-capabilities.sh` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 installs MUST land BEFORE the first feature task runs. Per RESEARCH.md L1106-1133, 24 net-new test files are required:

### Rust integration / unit tests (15 files in `src-tauri/tests/`)

- [x] `vault_scaffold.rs` — REQ-06 vault root scaffold (4 top-level dirs + idempotency) — Plan 02-02 Wave 1 RED→GREEN
- [x] `course_scaffold.rs` — REQ-06 course folder + idempotent re-add (preserves existing INDEX.md) — Plan 02-02 Wave 1 RED→GREEN
- [x] `vault_writer_user_rejects.rs` — REQ-03 `WriteContext::User` guard rejects `_source/` writes — Plan 02-02 Wave 1 RED→GREEN
- [x] `vault_writer_import_writes.rs` — REQ-03 `WriteContext::Import(import_handle())` accepts `_source/` writes — Plan 02-02 Wave 1 RED→GREEN
- [x] `chmod_lock_enforced.rs` — REQ-03 chmod 0o444 + subsequent `User` write returns `PermissionDenied` — Plan 02-02 Wave 1 RED→GREEN
- [x] `chmod_three_step_cycle.rs` — REQ-03 re-import 644→write→444 sequence — Plan 02-02 Wave 1 RED→GREEN
- [x] `chmod_cancellation_safety.rs` — Pitfall 12 Drop guard (cancel leaves file at 444 OR 644+Err) — Plan 02-02 Wave 1 RED→GREEN
- [x] `path_traversal_blocked.rs` — Pitfall 2 + Threat T-2-01 (`..` traversal rejected via `parent().canonicalize()`) — Plan 02-01 Wave 0 PASSES at stub level; Plan 02-02 hardens to Component check
- [x] `symlink_canonicalize_blocked.rs` — Threat T-2-02 (symlink into `_source/` rejected) — Plan 02-01 Wave 0 intentional RED; Plan 02-02 Wave 1 RED→GREEN
- [x] `folder_batch_one_level.rs` — REQ-07 folder batch + nested skip with per-file note — Plan 02-04 Wave 2 RED→GREEN
- [x] `vault_index_count.rs` — REQ-07 SQLite index post-import row count + DB < 1MB — Plan 02-04 Wave 2 RED→GREEN
- [x] `reconcile_lazy_delete.rs` — REQ-07 reconciliation lazy delete on missing file — Plan 02-04 Wave 2 RED→GREEN
- [x] `onboarding_complete.rs` — REQ-08 Finish sets `completed_at` ISO; relaunch skips wizard — Plan 02-03 Wave 2 RED→GREEN
- [x] `vault_move_safe_copy.rs` — REQ-11 safe-copy + file count + byte verify + index rebuild — Plan 02-07 Wave 4 stub→GREEN
- [x] `vault_move_interrupt.rs` — REQ-11 mid-copy kill preserves old vault — Plan 02-07 Wave 4 stub→GREEN
- [x] `ipc_user_rejects.rs` — IPC-level guard (frontend invoke returns error string) — Plan 02-05 Wave 3 stub→GREEN

**Wave 0 bonus (not in original 15 but confirmed green):**

- [x] `source_basename_clash.rs` — NEW Plan 02-05: cluster #8 integration mirror (source-clash without silent overwrite)
- [x] `move_vault_non_empty_dst.rs` — Plan 02-07 Wave 4: CYCLE-3 BLK-1 non-empty-dst guard (2 cases)
- [x] `import_controller_validates_course_category.rs` — Plan 02-05 Wave 3: pre-spawn validation integration mirror
- [x] `menu_preferences_emits_event.rs` — Plan 02-07 Wave 4: SPEC-GAP-1 dispatch contract (4 cases)
- [x] `inbox_basename_clash.rs` — Plan 02-13 GC: CR-02 data-safety integration test (2 cases)
- [x] `move_vault_symlink_guard.rs` — Plan 02-13 GC: CR-03 symlink canonicalize stdlib invariant pin (2 cases)
- [x] `reconcile_emits_progress.rs` — Plan 02-14 GC: CR-04 per-file callback contract (3 cases)

**Total Rust integration test files (Phase 2 + inherited Phase 1/01.1): 25**
(Phase 1 inherited: `kill_pgid.rs` + `dev_log_rotation.rs` — both green, regression confirmed in each plan)

### JS/TS Vitest tests (19 files in `tests/` + 1 inline in `src/`)

- [x] `gray-matter.test.ts` — YAML frontmatter round-trip via gray-matter@4.0.3
- [x] `onboarding-resume.test.ts` — REQ-08 resume from `~/.mneme/onboarding-state.json` + WR-03 source-regex pins (Plan 02-08 + 02-15)
- [x] `onboarding-finish.test.ts` — REQ-08 completion + relaunch skip (Plan 02-09)
- [x] `import-status-pill.test.ts` — REQ-09 pill state derivation (idle / importing / imported / partial / cancelled)
- [x] `import-state-singleton.test.ts` — REQ-13 reactive singleton + recordHistory + courseCount + listener idempotence
- [x] `import-error-classifier.test.ts` — REQ-09 per-file error classifier + friendly PermissionDenied + dest-clash surface (Plan 02-11 + 02-13: 28 cases)
- [x] `cmd-comma-shortcut.test.ts` — REQ-10 Cmd+, opens SettingsPanel <!-- v1.x deferred per Phase 02.1 D-06 — the test stays in the green-list and gates regression; the spec-level guarantee that Cmd+, ships in v1 has been retracted -->

- [x] `settings-categories.test.ts` — REQ-10 click-through 8 categories without error
- [x] `vault-move-flow.test.ts` — REQ-11 UI flow + CR-01 Browse-vs-Move source-regex pin + WR-08 post-reconcile pin (Plan 02-10 + 02-14)
- [x] `datatransfer-types-discrimination.test.ts` — D-09 Files vs text/plain gate logic (jsdom mock DataTransfer)
- [x] `course-code-regex.test.ts` — NEW Plan 02-09: `^[A-Z]{4}\d{4}$` validation (21 cases including USYD codes + path-segment false-positive fix)
- [x] `menu-bridge.test.ts` — NEW Plan 02-12: SPEC-GAP-1 `menu:open-settings` → `mneme:open-settings` CustomEvent bridge (3 cases)
- [x] `post-onboarding-banner.test.ts` — NEW Plan 02-12: SPEC-GAP-2 one-time banner sentinel + strict string comparison (9 cases)

**Phase 1 inherited (confirmed green throughout all 15 plans):**
- [x] `capability-regex.test.ts`, `sanitize.test.ts`, `spawn-args.test.ts`, `splitter-restore.test.ts`, `stream-dispatch.test.ts`, `tool-use-collapsible.test.ts` — Phase 1 regression suite
- [x] `src/lib/dev/console-forwarder.test.ts` — Phase 01.1 dev forwarder

### Infrastructure additions

- [x] `src-tauri/Cargo.toml` adds `rusqlite = { version = "0.39", features = ["bundled"] }` + `tokio-util 0.7` + `chrono 0.4` + `uuid 1 v4` + `walkdir 2` + `thiserror 1` + `regex 1` + `once_cell 1` (all Plan 02-01)
- [x] `package.json` adds `gray-matter@4.0.3` runtime dep + `@tauri-apps/plugin-dialog@2.7.1` (Plan 02-01)
- [x] `vitest.config.ts` — no changes needed (jsdom env already configured Phase 1)
- [x] `scripts/audit-capabilities.sh` extended with Gates 9-13 (Plan 02-07) + Gate 9 regex anchored (Plan 02-15 WR-06)

---

## Manual-Only Verifications

> **Phase 02.1 W7 deferral notice (2026-05-17):** rows referencing Cmd+, / Cmd+I are marked with a `v1.x deferred per D-06` parenthetical. The TESTS themselves remain green and continue to gate regressions; the SPEC contract no longer guarantees these keymaps in v1 release. See `02-UI-SPEC.md` §8.0 Keymap Status for the SSOT. Dogfood-cost 2026-05-17: the missing Cmd+R reload path forced a full app restart to re-trigger the Step 2 probe — captured here so v1.x re-introduction prioritizes Cmd+R first. <!-- v1.x deferred per Phase 02.1 D-06 -->

Per RESEARCH.md L1084-1086 + L1093 — these behaviors require human-in-loop visual verification (no jsdom can fake native OS chrome):

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native macOS NSOpenPanel via Cmd+I | REQ-06 (Cmd+I file picker) | Native OS dialog cannot be jsdom-mocked | Press Cmd+I in running `npm run tauri dev` → expect NSOpenPanel; select 3 files → expect files arrive in ImportDialog (manual row v1.x deferred per Phase 02.1 D-06 — does not gate v1 ship; the Cmd+I handler stays wired so re-activating this row in v1.x is trivial) |
| Drag-drop overlay reveal + dialog flow | REQ-05 (drag-drop) | WebKit drag events + Tauri event bridge not jsdom-coverable | Drag a file onto running app window → DropzoneOverlay full-window cream backdrop appears within 100ms → release → ImportDialog opens with course/category pickers |
| Onboarding visual pixel-faithfulness | REQ-08 + D-04 | Visual diff vs `/Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html` | `npm run gsd-dev-screenshot` after each step → side-by-side compare with `Mneme Onboarding.html` step-N panel |
| Settings panel pixel-faithfulness | REQ-14 + D-17 | Visual diff vs `Mneme Settings.html` | Cmd+, → screenshot → compare with `Mneme Settings.html` (manual row v1.x deferred per Phase 02.1 D-06 for the Cmd+, trigger path; can also be triggered via cog click or macOS menu Preferences… — both ship in v1) |
| Import status pill animation | REQ-13 + Claude's discretion | Ease curve + duration only verifiable by eye | Trigger import → observe pill transition (KD-13 `cubic-bezier(0.165, 0.85, 0.45, 1)` ~200ms) |
| Startup reconciliation spinner with live N/M counter (CR-04) | REQ-07 | Blocking-spinner UX + real-time counter requires running Tauri shell | Quit app + relaunch with >100 files in vault → expect spinner ≤ 200ms + N/M counter populates in real-time (CR-04 gap-closure fix) |
| Settings → Vault → Browse (CR-01) | REQ-14 | Browse intent separation only verifiable in live shell | Settings → Vault → Browse → native folder picker → select → NO move-confirm overlay, NO vault state change |
| Re-import same-basename to `_inbox` (CR-02) | REQ-03 | Byte-level data safety requires live file system | Drop file → second drop same basename → expect friendly "already exists" toast; original bytes UNCHANGED |
| Onboarding Step 5 with empty vaultRoot via direct URL (WR-11) | REQ-16 | Route bypass + IPC plumbing requires live Tauri shell | Navigate to /onboarding/5 directly → click Add course → expect inline error, NO `course_create` IPC call |
| Light/Dark toggle disabled in Settings → Appearance (D-17) | REQ-14 | KD-13 light-only invariant is visual/behavioral | Settings → Appearance → Light selected; Dark radio disabled/no-op |

---

## Open Question Resolution (RESEARCH.md L998-1056)

All open questions are resolved:

1. **Tauri 2 `onDragDropEvent` payload shape** — RESOLVED via source-verified inspection (Plan 02-01 02-SPIKE-dragdrop.md; `tauri-runtime-2.11.1/src/window.rs` enum + `.d.ts`). Runtime UX-flow probes remain in human-verification queue.
2. **gray-matter Rust counterpart** — RESOLVED: Rust hand-rolled YAML for Phase 2's fixed 2-field INDEX.md (Plan 02-02); gray-matter `^4.0.3` for TS-side frontmatter round-trip tests (Plan 02-01).
3. **`uuid` crate present vs hand-rolled base36 `operation_id`** — RESOLVED: `uuid 1 v4` adopted (Plan 02-01/02-05; `uuid::Uuid::new_v4()` for `OperationId`).
4. **Course-code regex tightness** — RESOLVED: `^[A-Z]{4}\d{4}$` locked (Plan 02-02 + 02-09; 21-case Vitest suite in `tests/course-code-regex.test.ts`).
5. **Reconciliation parallelism** — RESOLVED (deferred): sequential for ≤100 files (D-14 budget ≤200ms); DR2 escalation triggers parallelism in v1.x. CR-04 gap-closure adds per-file `reconcile:progress` emit without changing the sequential algorithm.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (24 test files + 3 infra additions + 7 bonus gap-closure additions)
- [x] No watch-mode flags (`vitest run` not `vitest`; `cargo test` not `cargo watch`)
- [x] Feedback latency < 45s (full suite)
- [x] Threat T-2-01 (path traversal) + T-2-02 (symlink) HIGH-severity items have dedicated tests landed BEFORE first import-flow plan executes
- [x] `nyquist_compliant: true` set in frontmatter

**Pre-existing out-of-scope failure documented:**
- `scripts/__tests__/visual-review-template.test.mjs > R7` — pre-existing FAIL confirmed via `git stash` baseline against commit `1c0157c`. Asserts GSD upstream template at `~/.claude/get-shit-done/templates/visual-review.html`; file not installed in developer environment. Belongs to dev-feedback-loop / GSD-upstream cluster, NOT Phase 02 source. Logged in `.planning/phases/02-vault-canvas-ed-sync-onboarding/deferred-items.md`.

**Approval:** SHIPPED — Phase 02 gap-closure verified 2026-05-17T02:50:00Z (02-VERIFICATION.md status: success 6/6 must-haves). `nyquist_compliant: true` set; this audit refreshes the per-task map from 1 placeholder row → 56 real rows covering all 15 plans.

---

## Validation Audit 2026-05-17

**Audit type:** Documentation refresh (not gap-closure test generation)
**Performed by:** gsd-nyquist-auditor
**Scope:** Phase 02 — vault-canvas-ed-sync-onboarding (plans 02-01 through 02-15, including gap-closure 02-13/02-14/02-15)

### Audit Summary

| Metric | Value |
|--------|-------|
| Plans audited | 15 (02-01 … 02-15) |
| Per-task rows generated | 56 |
| REQ-IDs mapped | REQ-03, REQ-06, REQ-13, REQ-14, REQ-16 |
| Rust integration test files confirmed | 25 (23 Phase 2 net-new + 2 Phase 1/01.1 inherited) |
| Vitest test files confirmed | 19 `tests/*.test.ts` + 1 `src/lib/dev/*.test.ts` + 5 `scripts/__tests__/*.mjs` |
| Tests confirmed green (cargo) | 66/66 |
| Tests confirmed green (vitest) | 277 pass / 1 pre-existing fail (out-of-scope) / 1 skip |
| svelte-check | 0 errors / 0 warnings / 398 files |
| Genuine MISSING gaps found | 0 |
| ESCALATIONS | 0 |
| Pre-existing out-of-scope failures | 1 (`visual-review-template.test.mjs > R7` — GSD upstream cluster) |

### Findings

**No genuine coverage gaps found.** All 24 Wave 0 required test files are present and green. All 4 gap-closure blockers (CR-01 / CR-02 / CR-03 / CR-04) have dedicated integration tests. All 5 REQ-IDs (REQ-03 / REQ-06 / REQ-13 / REQ-14 / REQ-16) have ≥3 test files each.

The only change needed was replacing the single placeholder row in the Per-Task Verification Map with 56 real rows derived from PLAN.md + SUMMARY.md content. No source files, test files, or `.planning/` files other than this VALIDATION.md were modified.

### REQ Coverage Summary

| REQ | Test Files (Rust) | Test Files (Vitest) | Automated Command | Status |
|-----|-------------------|---------------------|-------------------|--------|
| REQ-03 | `vault_writer_user_rejects.rs`, `vault_writer_import_writes.rs`, `chmod_lock_enforced.rs`, `chmod_three_step_cycle.rs`, `chmod_cancellation_safety.rs`, `path_traversal_blocked.rs`, `symlink_canonicalize_blocked.rs`, `ipc_user_rejects.rs`, `source_basename_clash.rs`, `inbox_basename_clash.rs` | `import-error-classifier.test.ts`, `datatransfer-types-discrimination.test.ts` | `cargo test && npx vitest run tests/import-error-classifier.test.ts` | ✅ green |
| REQ-06 | `vault_scaffold.rs`, `course_scaffold.rs`, `folder_batch_one_level.rs`, `vault_index_count.rs`, `reconcile_lazy_delete.rs`, `vault_move_safe_copy.rs`, `vault_move_interrupt.rs`, `move_vault_non_empty_dst.rs`, `move_vault_symlink_guard.rs` | `vault-move-flow.test.ts`, `gray-matter.test.ts` | `cargo test && npx vitest run tests/vault-move-flow.test.ts` | ✅ green |
| REQ-13 | `vault_index_count.rs`, `source_basename_clash.rs`, `inbox_basename_clash.rs`, `reconcile_emits_progress.rs` | `import-status-pill.test.ts`, `import-state-singleton.test.ts`, `import-error-classifier.test.ts` | `cargo test && npx vitest run tests/import-status-pill.test.ts tests/import-state-singleton.test.ts` | ✅ green |
| REQ-14 | `menu_preferences_emits_event.rs`, `reconcile_emits_progress.rs` | `cmd-comma-shortcut.test.ts`, `settings-categories.test.ts`, `vault-move-flow.test.ts`, `menu-bridge.test.ts` | `cargo test && npx vitest run tests/cmd-comma-shortcut.test.ts tests/settings-categories.test.ts` | ✅ green |
| REQ-16 | `onboarding_complete.rs` | `onboarding-resume.test.ts`, `onboarding-finish.test.ts`, `course-code-regex.test.ts`, `post-onboarding-banner.test.ts` | `cargo test --test onboarding_complete && npx vitest run tests/onboarding-resume.test.ts tests/onboarding-finish.test.ts` | ✅ green |
