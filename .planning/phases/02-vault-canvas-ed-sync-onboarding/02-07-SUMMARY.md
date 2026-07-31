---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 07
subsystem: ipc-bridge
tags: [tauri, ipc, capability, drag-drop, plugin-dialog, vault-move, macos-menu]

# Dependency graph
requires:
  - phase: 02-02
    provides: vault_writer (create_vault_scaffold + create_course + write_to_vault + import_handle factory)
  - phase: 02-03
    provides: config (load/save/Config struct) + onboarding (load/save/complete/OnboardingState struct)
  - phase: 02-04
    provides: vault_index (init + insert + list_courses + reconcile + ReconcileSummary)
  - phase: 02-05
    provides: import_controller (start_import_inner + cancel_import_inner + cancel_all + ImportProgress/ImportDoneEvent)
provides:
  - 16 #[tauri::command] handlers (frontend can invoke any Phase 2 backend operation)
  - tauri-plugin-dialog registered (NSOpenPanel pickers for Cmd+I + vault-path Browse)
  - dragDropEnabled: true (Tauri-side onDragDropEvent payload.paths delivery — DropzoneOverlay in 02-08)
  - vault_move command + safe_copy_vault primitive (REQ-11 — always-copy + 0o444 preserved + old vault intact)
  - count_and_sum primitive + count_and_sum_for_test wrapper (CYCLE-3 BLK-1 dst guard)
  - CloseRequested + ExitRequested handlers drain imports via cancel_all() before kill_pgid
  - macOS native menu (Mneme → Preferences... Cmd+, → emits menu:open-settings; SPEC-GAP-1)
  - audit-capabilities.sh extended with 5 new Phase 2 gates (9-13)
affects: [02-08 ReconciliationOverlay, 02-09 onboarding wizard, 02-11 ImportDialog, 02-12 SettingsPanel, all Wave 5+ Svelte plans]

# Tech tracking
tech-stack:
  added:
    - tauri-plugin-dialog 2.7.1 (Rust crate + JS plugin pair — NSOpenPanel bridge)
    - tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder} (Tauri 2 menu API)
    - tauri::Emitter trait (used for app.emit in start_import wrapper + menu:open-settings)
  patterns:
    - "IPC bridge pattern: Tauri #[tauri::command] wrappers delegate to AppHandle-agnostic *_inner functions (testable via captured-emit closure)"
    - "block_on bridging: tauri::async_runtime::block_on inside sync WindowEvent handler to await import_controller.cancel_all()"
    - "Safe-copy primitive + independent post-walk verifier (CYCLE-3 BLK-1): never trust the writer's tuple; re-walk dst as source of truth"
    - "Canonicalize-then-compare disk-bomb guard: canon_dst != canon_src AND !descendant-of AND !ancestor-of before copy"
    - "Single merged setup() hook per cycle-3 priority #11: Phase 1 scratch + Phase 2 menu install in the SAME closure (chained .setup() calls silently keep only the last)"
    - "Wave-0 contract test for AppHandle-coupled features: in-process shim mirrors the production closure body byte-for-byte; manual /gsd-verify-work covers the full Tauri runtime path"

key-files:
  created:
    - src-tauri/tests/menu_preferences_emits_event.rs (4 tests; SPEC-GAP-1 dispatch contract)
  modified:
    - src-tauri/src/lib.rs (+ ~480 LOC: 16 commands + 2 state-holder structs + safe_copy_vault + count_and_sum + move_vault + build_app_menu + merged setup + on_menu_event + close-requested drain)
    - src-tauri/Cargo.toml (tauri-plugin-dialog 2.7 dependency)
    - src-tauri/tauri.conf.json (dragDropEnabled: true on main window + plugins.dialog block)
    - src-tauri/capabilities/default.json (regenerated via gen-capabilities.ts — adds dialog:default, dialog:allow-open, core:event:{default,allow-emit,allow-listen}, core:menu:default)
    - src-tauri/src/vault_index.rs (added serde::Serialize to ReconcileSummary — required for IPC return)
    - scripts/gen-capabilities.ts (PHASE_2_IPC_PERMISSIONS array; documents Tauri 2 permission-identifier reality)
    - scripts/audit-capabilities.sh (Gates 9-13: import_handle audit + SQL grep + args:true regression + dialog permission presence + core:menu:default presence)
    - src-tauri/tests/vault_move_safe_copy.rs (transitioned from Wave-0 stub to 1 GREEN test)
    - src-tauri/tests/vault_move_interrupt.rs (transitioned from Wave-0 stub to 1 GREEN test)
    - src-tauri/tests/move_vault_non_empty_dst.rs (transitioned from Wave-0 stub to 2 GREEN tests)

key-decisions:
  - "Custom project-namespaced capability identifier mneme:phase-2-vault REMOVED (Rule 1 deviation). Tauri 2 strictly validates capability ids against plugin manifests; any non-manifest identifier fails the Tauri build-time validator with 'Permission X not found'. Per the existing EMPIRICAL FINDING in gen-capabilities.ts, user-defined #[tauri::command] functions registered via generate_handler! do NOT require allow-* entries anyway (the IPC dispatch table is the access gate). The Phase 2 command list is documented inline above the generate_handler! invocation in lib.rs where it belongs."
  - "Dialog plugin namespace is dialog:* NOT core:dialog:* (Rule 1 deviation). The PLAN listed core:dialog:default; empirical Tauri 2.11 build rejects it with the expected-list including dialog:default + dialog:allow-open. Corrected; documented in scripts/gen-capabilities.ts."
  - "Event plugin namespace is core:event:* NOT event:* for emit/listen permissions (Rule 1 deviation). The PLAN listed event:allow-emit and event:allow-listen; corrected to core:event:allow-emit + core:event:allow-listen."
  - "CloseRequested drain uses public cancel_all() method (cycle-3 cluster 2 surface) instead of reaching into private registry field. cancel_all internally calls cancel_token.cancel() on every operation — same effect, audited public API."
  - "Async command pattern: every command holding tauri::State<'_, Arc<...>> declared async (Tauri 2 lifetime requirement); blocking module calls (config::load, vault_index::reconcile, etc.) execute synchronously inside the async body since per-call latency is sub-ms and no spawn_blocking is justified."
  - "safe_copy_vault made pub (was suggested pub(crate) in PLAN) so the integration test src-tauri/tests/vault_move_safe_copy.rs compiles without the lib in #[cfg(test)] dance. count_and_sum_for_test exposes the load-bearing predicate for the BLK-1 test the same way."

patterns-established:
  - "IPC bridge pattern (D-19 standard model): #[tauri::command] wrappers delegate to AppHandle-agnostic *_inner functions taking emit_fn: Fn(&str, serde_json::Value) closures. Tests capture events without standing up a real AppHandle."
  - "Atomic command commit per task with per-section commit message paragraphs (1: title 2-N: body). Avoids heredoc bash issues with gsd-validate-commit hook (per MEMORY.md feedback_gsd_validate_commit_heredoc)."
  - "Audit-capabilities.sh as Phase 2 surface gate: not just SSOT drift for claude-bin argv (Phase 1) but also caller-audit for import_handle factory (D-05) + plugin permission presence + SQL injection grep."
  - "Wave-0 contract test pattern for AppHandle-coupled features: shim the closure body in an integration test that exercises the dispatch invariants in isolation; document that the full runtime path verifies via manual /gsd-verify-work."

requirements-completed: [REQ-03, REQ-06, REQ-11, REQ-13, REQ-14, REQ-16]

# Metrics
duration: 25min
completed: 2026-05-16
---

# Phase 02 Plan 07: Tauri IPC Bridge Wave + macOS Native Menu Summary

**Wire 16 Phase 2 backend operations into Tauri IPC + enable drag-drop + plugin-dialog + safe vault_move + macOS Mneme menu — Wave 5+ Svelte plans now have a working `invoke(...)` for every Phase 2 frontend need.**

## Performance

- **Duration:** 25 min (1508s)
- **Started:** 2026-05-16T13:03:05Z
- **Completed:** 2026-05-16T13:28:13Z
- **Tasks:** 3 / 3 completed
- **Files modified:** 8 (+ 1 created: menu_preferences_emits_event.rs)

## Accomplishments

- 16 Phase 2 `#[tauri::command]` handlers registered in BOTH the debug + release `invoke_handler` branches: `load_config`, `save_config`, `load_onboarding_state`, `save_onboarding_state`, `complete_onboarding`, `claude_auth_check` (Option-A stub), `vault_create_scaffold`, `course_create`, `list_courses`, `reconcile_vault_index`, `start_import`, `cancel_import`, `get_recent_imports`, `open_file_picker`, `open_folder_picker`, `move_vault`. Frontend can invoke every Phase 2 backend operation.
- `tauri-plugin-dialog` 2.7.1 registered for the NSOpenPanel-backed Cmd+I file picker (Plan 02-11) + vault-path Browse (Plan 02-09). Capability namespace `dialog:default` + `dialog:allow-open` corrected from the PLAN's `core:dialog:*` (Tauri 2 build-time validator rejects the wrong namespace).
- `dragDropEnabled: true` on the main window unlocks Tauri-side `onDragDropEvent` payload.paths delivery — DropzoneOverlay in Plan 02-08 can now register the listener (no DataTransfer.files round-trip needed; absolute OS paths delivered directly).
- `safe_copy_vault` + `count_and_sum` + `move_vault` Tauri command implement REQ-11 acceptance: always-copy (never `fs::rename` per RESEARCH Pitfall 3 EXDEV on APFS) + 0o444 preserved at the new `_source/` location + INDEPENDENT post-copy walk verifier + CYCLE-3 BLK-1 empty-destination guard + canonicalize disk-bomb guards (dst != src AND !descendant AND !ancestor). Old vault is left intact for the user to delete manually in Finder (T-2-09 by-design).
- CloseRequested + ExitRequested handlers extended to drain in-flight imports via `import_controller.cancel_all().await` BEFORE the existing `kill_pgid` SessionRegistry drain. Spawned tokio tasks observe the cancel on their next `yield_now` and break out of the per-file loop. Mirrored across both hooks per Tauri issue #9198 (one or the other may not fire on certain macOS versions). cancel_all is idempotent.
- macOS native menu (SPEC-GAP-1 / settings-ui.md §2 L59, 2026-05-16 replan): Mneme submenu (About / Preferences... Cmd+, / Hide / Quit) installed at builder `.setup()` time in a SINGLE merged closure with the Phase 1 `~/.mneme/scratch` carryover (cycle-3 priority #11 — chained `.setup()` calls silently keep only the last). `Preferences...` click emits Tauri event `menu:open-settings`; Plan 12 frontend listener consumes it.
- `scripts/audit-capabilities.sh` extended with 5 new Phase 2 gates (Gates 9-13): import_handle caller audit (D-05), SQL grep (T-2-07 sister gate), `"args": true` regression, dialog permission presence, core:menu:default presence. All 13 gates green.
- 4 Wave-0 Rust integration tests transitioned to GREEN: `vault_move_safe_copy.rs` (1), `vault_move_interrupt.rs` (1), `move_vault_non_empty_dst.rs` (2 — CYCLE-3 BLK-1 predicate pinning), `menu_preferences_emits_event.rs` (4 — SPEC-GAP-1 dispatch contract).

## Task Commits

Each task was committed atomically with multi-paragraph commit messages (multi-`-m` flag pattern per MEMORY.md `feedback_gsd_validate_commit_heredoc` — heredoc form trips the `gsd-validate-commit` hook):

1. **Task 1: Register state holders + tauri.conf.json (dragDropEnabled + plugin-dialog) + 16 Tauri commands + safe_copy_vault + move_vault** — `72974ae` (feat)
2. **Task 2: Extend close-requested + audit-capabilities.sh Gates 9-13 + 3 Wave-0 vault_move tests GREEN** — `e601db9` (feat)
3. **Task 3: macOS native menu (Mneme → Preferences) + Wave-0 menu dispatch test** — `e038436` (feat)

## Files Created / Modified

### Created

- `src-tauri/tests/menu_preferences_emits_event.rs` — 4-test Wave-0 contract for SPEC-GAP-1. Asserts `dispatch_menu_event("preferences", emit)` emits exactly `menu:open-settings`; other ids emit nothing; id + event-name string constants are pinned.

### Modified

- `src-tauri/src/lib.rs` (+ ~480 LOC) — main bridge file. Adds 16 `#[tauri::command]` handlers; `ConfigState` + `MoveVaultSummary` + `VaultMoveError` + `ClaudeAuthStatus` structs; `safe_copy_vault` / `count_and_sum` / `count_and_sum_for_test` primitives; `move_vault` command with canonicalize + empty-dst + independent-post-walk verifier; `build_app_menu` helper; merged `.setup()` (Phase 1 scratch + Phase 2 menu install); `.on_menu_event` closure emitting `menu:open-settings`; close-requested + exit-requested handlers extended with `cancel_all` drain via `tauri::async_runtime::block_on`.
- `src-tauri/Cargo.toml` — `tauri-plugin-dialog = "2.7"` added.
- `src-tauri/tauri.conf.json` — `dragDropEnabled: true` on main window; `plugins.dialog: {}` block.
- `src-tauri/capabilities/default.json` — regenerated via `gen-capabilities.ts`; adds `dialog:default`, `dialog:allow-open`, `core:event:default`, `core:event:allow-emit`, `core:event:allow-listen`, `core:menu:default`.
- `src-tauri/src/vault_index.rs` — `ReconcileSummary` gains `serde::Serialize` derive (required for Tauri IPC return).
- `scripts/gen-capabilities.ts` — `PHASE_2_IPC_PERMISSIONS` array + documentation comment explaining (a) the dialog plugin's `dialog:*` namespace (NOT `core:dialog:*`), (b) the strict permission-validator behavior that rejects custom project-namespaced identifiers like `mneme:phase-2-vault`, (c) the chain that `#[tauri::command]` functions registered via `generate_handler!` do not need allow-* entries.
- `scripts/audit-capabilities.sh` — 5 new gates (9-13) appended; existing 8 Phase 1 gates preserved.
- `src-tauri/tests/vault_move_safe_copy.rs` — replaced 8-line failing stub with full REQ-11 acceptance test (1 test, GREEN).
- `src-tauri/tests/vault_move_interrupt.rs` — replaced 8-line failing stub with mid-copy interrupt invariant test (1 test, GREEN).
- `src-tauri/tests/move_vault_non_empty_dst.rs` — replaced 14-line failing stub with `count_and_sum` predicate pin (2 tests, GREEN; CYCLE-3 BLK-1).

## Decisions Made

See `key-decisions` block in frontmatter. Highlights:

- **`mneme:phase-2-vault` custom identifier removed** — Tauri 2.11 strictly validates capability identifiers against plugin manifests + IPC dispatch is already the gate for user `generate_handler!` commands. Documented inline in `lib.rs` instead.
- **Dialog / event permission namespaces corrected** to match Tauri 2's actual plugin manifests (`dialog:*` not `core:dialog:*`; `core:event:*` not `event:*`).
- **CloseRequested drain uses public `cancel_all()` method** (cycle-3 cluster 2 surface) instead of reaching into private registry — same effect, audited API.
- **Async-everywhere command pattern**: Tauri 2 macro requires async when `tauri::State<'_, Arc<...>>` is held; blocking module calls run synchronously inside the async body (sub-ms latency, no spawn_blocking justified).
- **safe_copy_vault + count_and_sum_for_test made `pub`** so integration tests under `tests/` can drive them without the `lib in #[cfg(test)]` dance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong dialog permission namespace (`core:dialog:default` → `dialog:default`)**
- **Found during:** Task 1 (initial `cargo build` after gen-capabilities.ts update).
- **Issue:** PLAN listed `core:dialog:default` + `dialog:allow-open`. Tauri 2.11 build-time validator rejects `core:dialog:default` with `Permission core:dialog:default not found, expected one of ... dialog:default, dialog:allow-open ...`. The dialog plugin's permissions live under the `dialog:*` namespace; `core:*` is reserved for built-in Tauri permissions (event / menu / window / webview / image / etc.).
- **Fix:** Updated `scripts/gen-capabilities.ts` `PHASE_2_IPC_PERMISSIONS` array to use `dialog:default` + `dialog:allow-open`. Documented the namespace rule + the empirical build-error verbatim above the array. Updated `scripts/audit-capabilities.sh` Gate 12 to grep for `dialog:default` (not `core:dialog:default`).
- **Files modified:** `scripts/gen-capabilities.ts`, `src-tauri/capabilities/default.json` (regenerated), `scripts/audit-capabilities.sh`.
- **Verification:** `cargo build --manifest-path src-tauri/Cargo.toml` passes; `bash scripts/audit-capabilities.sh` PASS.
- **Committed in:** `72974ae` (Task 1) + `e601db9` (Task 2 audit-script extension).

**2. [Rule 1 - Bug] Wrong event permission namespace (`event:allow-emit/listen` → `core:event:allow-emit/listen`)**
- **Found during:** Task 1 (same `cargo build` error chain).
- **Issue:** PLAN listed `event:allow-emit` + `event:allow-listen`. Built-in Tauri event API lives under the `core:event:*` namespace (verified from the expected-list in the build-error output: `core:event:default, core:event:allow-emit, core:event:allow-emit-to, core:event:allow-listen, core:event:allow-unlisten`).
- **Fix:** Updated `PHASE_2_IPC_PERMISSIONS` to `core:event:allow-emit` + `core:event:allow-listen`. (`core:event:default` was already correct in the PLAN.)
- **Files modified:** `scripts/gen-capabilities.ts`, `src-tauri/capabilities/default.json` (regenerated).
- **Verification:** `cargo build` passes.
- **Committed in:** `72974ae` (Task 1).

**3. [Rule 1 - Bug] Custom project-namespaced identifier `mneme:phase-2-vault` rejected by Tauri 2**
- **Found during:** Task 1 (after fixing #1 and #2, build still failed with `Permission mneme:phase-2-vault not found`).
- **Issue:** PLAN expected the capability JSON to carry an `mneme:phase-2-vault` block enumerating all 16 Phase 2 command names under an `allow` array. Tauri 2's build-time permission validator only accepts identifiers declared in a plugin crate's `manifest.toml` (e.g. `tauri-plugin-dialog`, `tauri-plugin-shell`). Any other identifier — including project-namespaced documentation labels — fails the build. Per the existing EMPIRICAL FINDING already in `gen-capabilities.ts` (Phase 01.1 — same issue with `allow-dev-*` permissions), user-defined `#[tauri::command]` functions registered via `generate_handler!` do NOT require allow-* entries anyway — the IPC dispatch table is the access gate.
- **Fix:** Removed the `mneme:phase-2-vault` block from `PHASE_2_IPC_PERMISSIONS`. Documented Phase 2 command list inline above the `tauri::generate_handler!` invocation in `lib.rs` where it belongs. Updated `audit-capabilities.sh` Gate 12 to grep for `dialog:default` + `dialog:allow-open` instead of the original Plan-12-instructed `mneme:phase-2-vault` (the surface the gate guards is now the plugin-dialog scope presence — Phase 2's actual permission-surface dependency).
- **Files modified:** `scripts/gen-capabilities.ts`, `src-tauri/capabilities/default.json` (regenerated), `scripts/audit-capabilities.sh`.
- **Verification:** `cargo build` passes; `bash scripts/audit-capabilities.sh` PASS.
- **Committed in:** `72974ae` (Task 1) + `e601db9` (Task 2 audit-script extension).

**4. [Rule 2 - Missing critical functionality] `ReconcileSummary` missing `serde::Serialize` derive**
- **Found during:** Task 1 (first `cargo build` of new `reconcile_vault_index` command).
- **Issue:** `reconcile_vault_index` returns `vault_index::ReconcileSummary` across the Tauri IPC boundary, but the struct did not derive `serde::Serialize`. Build fails with `the method 'async_kind' exists ... but its trait bounds were not satisfied ... ReconcileSummary: IpcResponse`.
- **Fix:** Added `serde::Serialize` to the `#[derive(...)]` list on `ReconcileSummary` in `src-tauri/src/vault_index.rs`. Documented that this is required for the IPC return type with a stable snake_case JSON shape consumed by Plan 02-08's ReconciliationOverlay.
- **Files modified:** `src-tauri/src/vault_index.rs`.
- **Verification:** `cargo build` passes; `cargo test --lib` still passes (no behavior change).
- **Committed in:** `72974ae` (Task 1).

**5. [Rule 3 - Blocking issue] Clippy `uninlined_format_args` lint errors (8 instances)**
- **Found during:** Task 1 (first `cargo clippy -- -D warnings` after lib.rs additions).
- **Issue:** clippy's `-D warnings` flag promoted 8 instances of `format!("...{}", var)` to errors, demanding the inline form `format!("...{var}")`. All occurred in the new `move_vault` command's error-message formatting.
- **Fix:** Converted all 8 sites to the inline form per clippy's suggestion.
- **Files modified:** `src-tauri/src/lib.rs`.
- **Verification:** `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` PASS.
- **Committed in:** `72974ae` (Task 1).

### Acceptance-criterion deviations (documented, not blocking)

- **AC for Task 2 "`grep -E 'cancel_token\\.cancel' src-tauri/src/lib.rs` returns ≥1 match"** — replaced by `grep -E 'cancel_all\(\)' src-tauri/src/lib.rs` returning 3 matches. The PLAN's exact regex matches the *implementation detail* inside `cancel_all`; per cycle-3 cluster 2 the lib.rs CloseRequested handler should call the public `cancel_all()` surface instead of reaching into the private registry. `cancel_all()` internally calls `cancel_token.cancel()` on every operation (import_controller.rs L58-64) — same effect, audited public API.
- **AC for Task 2 capability JSON entries** (`{ "command": "start_import" }`, `{ "command": "claude_auth_check" }`, `{ "command": "open_file_picker" }`, `{ "command": "open_folder_picker" }`) — these were inside the `mneme:phase-2-vault` block that Tauri 2 rejects. The commands are still registered via `tauri::generate_handler!` (the IPC gate); the JSON entries were redundant documentation per the EMPIRICAL FINDING.
- **AC for Task 3 "`grep -cE '\.setup\(' src-tauri/src/lib.rs` returns `1`"** — returns 2 because the second match is inside a *comment* explaining why the setup hook must be single-merged. Only one actual top-level `.setup(...)` call exists (line 723), as confirmed by `grep -nE '^\s*\.setup\(' src-tauri/src/lib.rs` which returns the single hit.

## Authentication Gates

None — this plan was fully autonomous, no auth required.

## Verification Results

- **`cargo build --manifest-path src-tauri/Cargo.toml`** — PASS (default features + dev-invoke feature).
- **`cargo test --manifest-path src-tauri/Cargo.toml --tests --lib`** — PASS (24 test groups; 0 failed). Includes the 4 newly-GREEN tests for this plan: `vault_move_safe_copy::move_copies_tree_preserves_source_chmod_and_old_vault`, `vault_move_interrupt::interrupt_midcopy_leaves_old_vault_intact`, `move_vault_non_empty_dst::{count_and_sum_observes_pre_existing_files_in_dst, count_and_sum_treats_empty_directory_as_zero}`, `menu_preferences_emits_event::*` (4 tests).
- **`cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`** — PASS (default features).
- **`cargo clippy --manifest-path src-tauri/Cargo.toml --features dev-invoke -- -D warnings`** — PASS.
- **`cargo fmt --manifest-path src-tauri/Cargo.toml --check`** — PASS (clean).
- **`bash scripts/audit-capabilities.sh`** — PASS (13 gates: Phase 1's 8 + Phase 2's 5 new).
- **`npm run check`** — PASS (0 errors, 0 warnings; svelte-kit sync + svelte-check).
- **`node --experimental-strip-types scripts/gen-capabilities.ts --dry-run | diff src-tauri/capabilities/default.json -`** — PASS (no SSOT drift; audit Gate 1 satisfied).

## Threat Flags

None new. The Phase 2 IPC surface stays within the threat model already documented in `02-07-PLAN.md` `<threat_model>`:

- **T-2-06 (Tampering — filename arg injection on start_import)** — mitigated as designed: `Vec<String>` paths convert to `PathBuf` in Rust; no shell `Command::new()` of user paths.
- **T-2-08 (Information Disclosure — `~/.claude/` sentinel read)** — mitigated as designed: `claude_auth_check` is a hardcoded stub returning `{ found: false, version: None }` in this plan; 02-09 replaces the body with the real `fs::metadata(home/.claude/.credentials.json)` existence check. NO bytes from `credentials.json` cross IPC in either body.
- **Capability surface (Tampering — Tauri allow-list)** — mitigated: no `"args": true` wildcard; per-command `#[tauri::command]` registration is the IPC gate; `audit-capabilities.sh` blocks regressions.
- **T-2-09 (Repudiation — vault_move interrupted mid-copy)** — accepted by-design per SPEC L85: always-copy, old vault untouched, partial new vault user-deletable in Finder.

## Self-Check: PASSED

**Files exist:**
- `src-tauri/src/lib.rs` — FOUND
- `src-tauri/Cargo.toml` — FOUND
- `src-tauri/tauri.conf.json` — FOUND
- `src-tauri/capabilities/default.json` — FOUND
- `src-tauri/src/vault_index.rs` — FOUND
- `scripts/gen-capabilities.ts` — FOUND
- `scripts/audit-capabilities.sh` — FOUND
- `src-tauri/tests/vault_move_safe_copy.rs` — FOUND
- `src-tauri/tests/vault_move_interrupt.rs` — FOUND
- `src-tauri/tests/move_vault_non_empty_dst.rs` — FOUND
- `src-tauri/tests/menu_preferences_emits_event.rs` — FOUND

**Commits exist:**
- `72974ae` (Task 1) — FOUND
- `e601db9` (Task 2) — FOUND
- `e038436` (Task 3) — FOUND

All claims verified.

## Wave 5+ Unblocked

After this plan ships, every Wave 5+ Svelte plan can wire `invoke("...")` to a working Rust handler. Specifically:

- **Plan 02-08 (ReconciliationOverlay)** — `invoke("reconcile_vault_index", { root })` returns `{ inserted, deleted, scanned }`. DropzoneOverlay can subscribe to `onDragDropEvent` per the spike-locked pattern.
- **Plan 02-09 (Onboarding wizard)** — `invoke("load_onboarding_state")` / `invoke("save_onboarding_state", { state })` / `invoke("complete_onboarding")`; Step 2 calls `invoke("claude_auth_check")` (stub returns `{ found: false, version: None }`; 02-09 replaces the BODY only); Step 3 uses `invoke("open_folder_picker")` + `invoke("save_config", { state: { vault_path, schema_version: 1 } })`; Step 4 uses `invoke("vault_create_scaffold", { root })`; Step 5 loops `invoke("course_create", { root, code })`.
- **Plan 02-11 (ImportDialog Cmd+I)** — `invoke("open_file_picker", { multiple: true })` returns absolute path array; `invoke("start_import", { paths, course, category, vaultRoot })` returns operation_id; `invoke("cancel_import", { operationId })`; subscribes to `import:progress` + `import:done` events.
- **Plan 02-12 (SettingsPanel)** — `invoke("load_config")` + `invoke("save_config")`; `invoke("move_vault", { oldRoot, newRoot })` (returns `MoveVaultSummary`); `invoke("list_courses")`; frontend listener for `menu:open-settings` Tauri event dispatches the same `mneme:open-settings` custom event the cog click + Cmd+, key listener already emit.

The macOS menu bar now shows `Mneme → About Mneme / Preferences... ⌘, / Hide Mneme / Quit Mneme`; the Preferences click is the third way (alongside the cog click + Cmd+, key listener in Plan 12) to open the SettingsPanel via a single downstream code path.
