---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 05
subsystem: infra
tags:
  - tdd
  - wave-3
  - rust
  - import-controller
  - tokio-spawn
  - cancellation-token
  - event-emit
  - per-file-progress
  - source-clash
  - input-validation

# Dependency graph
requires:
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 02
    provides: WriteContext::Import + import_handle() factory + VaultWriterError::WriteToSourceForbidden + create_vault_scaffold + create_course (vault_writer Wave-1 GREEN body)
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 04
    provides: VaultIndex::init/insert + VaultFileRow + classify_kind + now_iso (vault_index Wave-2 GREEN body)
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 01
    provides: 9 cargo deps (tokio-util / uuid / once_cell / regex) + mneme_lib crate rename + Wave-0 failing-stub test scaffold + lib.rs pub mod import_controller; declaration

provides:
  - import_controller.rs full body — tokio task orchestrator + CancellationToken registry + emit-per-file events (~430 LOC impl + ~310 LOC inline tests)
  - Public surface — ImportController { registry: Mutex<HashMap<OperationId, ImportOperation>> } + ImportOperation { cancel_token, total, started_at_iso } + ImportProgress + ImportFailure + ImportDoneEvent (cycle-2 cluster #6 SSOT)
  - start_import_inner<F>(paths, course, category, vault_root, controller, vault_index, emit_fn) → Result<OperationId, String> — pre-spawn validate (cluster #7) + tokio task + per-file source-clash detection (cluster #8) + per-file event emit + final ImportDoneEvent
  - cancel_import_inner(controller, op_id) → Result<(), String> — flips CancellationToken; spawned task observes via yield_now + is_cancelled check
  - ImportController::cancel_all() — public surface (cycle-3 priority #12) for 02-07 CloseRequested handler to drain in-flight imports without reaching into private registry
  - 6 inline lib tests GREEN (happy 2-file / _inbox dest / source-clash continues / pre-spawn validate / cancel-midbatch / per-file-error non-abort)
  - 3 integration test files GREEN (ipc_user_rejects.rs lifts Wave-0 stub / import_controller_validates_course_category.rs lifts Wave-0 stub / source_basename_clash.rs NEW)

affects:
  - Plan 02-06 (Wave 1 — import-state.svelte.ts): subscribes to import:progress + import:done events emitted by this controller; mirrors ImportDoneEvent schema verbatim
  - Plan 02-07 (Wave 4 — Tauri IPC wiring): wraps start_import_inner / cancel_import_inner in #[tauri::command] handlers; injects `move |evt, val| { let _ = app.emit(evt, val); }` as the emit_fn closure
  - Plan 02-11 (Wave 7 — ImportDialog + Dropzone + ImportHistoryModal): triggers start_import via invoke + reads failures[] from import:done; classifies "source-clash:" prefix into friendly Chinese error message
  - Plan 02-07 CloseRequested handler (Wave 4): calls ImportController::cancel_all() on app shutdown
  - Phase 4 (doc ingestion): Marker / markitdown subprocess output → vault_writer via import_handle factory uses identical pattern; cluster #8 source-clash semantics protect re-ingestion

# Tech tracking
tech-stack:
  added:
    - "No new cargo deps — consumed Wave-1 deps (tokio-util 0.7 rt + uuid 1 v4 + once_cell 1 + regex 1 + serde_json 1)"
  patterns:
    - "Type-erased emit_fn closure (Fn(&str, serde_json::Value) + Send + Sync + 'static) — single closure carries BOTH ImportProgress (per-file) AND ImportDoneEvent (batch summary) payloads. Tests substitute a capturing Vec<(String, serde_json::Value)>; Tauri command wrapper substitutes move |evt, val| { let _ = app.emit(evt, val); }. Eliminates the cycle-2 typed-Fn-per-event variant explosion."
  - "Pre-spawn validate_inputs gate (cluster #7) — validate_inputs(course, category) runs BEFORE registry insert + tokio::spawn. Invalid input returns Err(\"invalid category|invalid course code\") with the registry untouched. Tested at both lib + integration level."
    - "Source-clash detection BEFORE read_bytes (cluster #8) — when category routes into _source/ AND dest already exists, fail with `source-clash:<existing>` reason WITHOUT reading source bytes or calling write_to_vault. NO silent overwrite. Existing file's bytes are protected by both the chmod 0o444 lock (vault_writer) AND this prefix check."
    - "tokio::task::yield_now().await at top of every iteration BEFORE is_cancelled() check — makes cancellation observable even when paths read very fast (tempfile-on-tmpfs scenarios). Without yield, the cancellation race window collapses and tests sometimes see cancelled_count == 0."
    - "Per-file failure does NOT abort batch (REQ-13 2/3 acceptance) — read / write errors push ImportFailure into failures Vec, increment failed counter, emit progress with last_file_status='error', and `continue` the loop. Final ImportDoneEvent carries the full failure list for the UI history modal."
    - "uuid v4 op_id + registry drain in spawned task (NOT after spawn returns) — start_import_inner Ok's the op_id immediately after registering; the spawned task does its OWN registry.remove(&op_id) at the end. cancel_all() flips every token without removing entries (tasks remove themselves on next yield_now)."
    - "ImportDoneEvent as IMPORT EVENT SCHEMA SSOT (cluster #6) — distinct shape from ImportProgress, NOT reused. Frontend mirror at src/lib/import-state.svelte.ts will deserialize the captured JSON Value back into the typed shape. Cross-reference comment in the Rust source pins the consumer locations (02-06 import-state + 02-11 ImportHistoryModal)."

key-files:
  created:
    - "src-tauri/tests/source_basename_clash.rs (NEW — cycle-2 cluster #8 integration mirror)"
    - ".planning/phases/02-vault-canvas-ed-sync-onboarding/02-05-SUMMARY.md (this file)"
  modified:
    - "src-tauri/src/import_controller.rs (Wave-1 placeholder body 7 LOC → full ~758 LOC = impl + 6 inline async tests; ImportController + ImportOperation + ImportProgress + ImportFailure + ImportDoneEvent + compute_dest + validate_inputs + start_import_inner + cancel_import_inner + cancel_all)"
    - "src-tauri/tests/ipc_user_rejects.rs (Wave-0 #[ignore] panic! stub REPLACED with VaultWriterError::WriteToSourceForbidden invariant assertion via mneme_lib::vault_writer)"
    - "src-tauri/tests/import_controller_validates_course_category.rs (Wave-0 #[ignore] panic! stub REPLACED with full integration-level mirror of inline invalid_course_or_category_rejected_before_spawn test, reaching start_import_inner through mneme_lib::import_controller)"

key-decisions:
  - "Type-erased emit_fn closure signature (Fn(&str, serde_json::Value)) — single closure carries both progress + done payloads. Resolves the cycle-2 variant explosion where each event type wanted its own typed Fn(&str, ImportProgress) / Fn(&str, ImportDoneEvent) closure. Tests deserialize the captured Value back into the typed shape via evt.1[\"field\"].as_<type>().unwrap()."
  - "Pre-spawn validate_inputs gate (cluster #7) — validate course code regex + category enum membership BEFORE registry insert or task spawn. Invalid input returns Err with the registry untouched. Both lib-test and integration-test mirrors exist."
  - "Source-clash detection at controller level (cluster #8) — controller emits `source-clash:<dest>` failure reason WITHOUT calling vault_writer. The vault_writer.rs `VaultWriterError::SourceBasenameClash(PathBuf)` variant exists (added by Plan 02-02) but is currently dormant because the controller intercepts the clash before the writer is invoked. This pre-emption is fine — the inline + integration tests cover the failure mode; the writer variant remains available for future direct callers."
  - "tokio::task::yield_now().await BEFORE is_cancelled() check (NOT after) — makes the cancellation test deterministic on macOS tmpfs-backed tempfile dirs. Without the yield, fast batches complete before cancel_import_inner can observably flip the token."
  - "Spawned task owns its registry.remove(&op_id) (NOT start_import_inner caller) — cancel_all() flips every token without removing entries; tasks self-drain on next yield_now. This keeps the cancel-all surface symmetric (the public cancel_all does NOT need to know whether each op is currently mid-iteration or at the final ImportDoneEvent emit)."
  - "Per-file failure does NOT abort batch — read failure / write failure / source-clash all push to failures Vec, increment failed counter, and `continue`. The final ImportDoneEvent carries the full failure list. REQ-13 acceptance ('2 / 3 imported · 1 error') is exactly this shape."
  - "ImportDoneEvent is the IMPORT EVENT SCHEMA SSOT (cluster #6) — frontend mirror at src/lib/import-state.svelte.ts must mirror snake_case field names verbatim with a cross-reference comment back to this source file. Schema additions are atomic across Rust + TS."
  - "Wave-0 stub `import_controller_validates_course_category.rs` is now a real integration test (not a no-op pass) — reaches `mneme_lib::import_controller::start_import_inner` directly to prove the validation surface is public + reachable + correct at both call sites (lib unit AND integration via crate API). The same invariant is also covered by the inline `invalid_course_or_category_rejected_before_spawn` lib test."

patterns-established:
  - "Type-erased event-emit closure (Fn(&str, serde_json::Value)): a single closure type carries ALL event payloads emitted by the controller. Tests capture into Vec<(String, serde_json::Value)>; Tauri command wrapper substitutes app.emit(evt, val). Reusable for any future controller that needs per-step progress + final summary events."
  - "Pre-spawn validation gate: validate BEFORE any side effect (registry insert, task spawn, fs write). Invalid input returns Err with no state change. Reusable for any future controller surface that accepts user-controlled strings."
  - "Pre-emptive source-clash check at controller level (cluster #8): detect basename collision BEFORE invoking the writer. Keeps the writer's failure paths free of overwrite-protection logic; controller owns the user-facing failure semantics."
  - "Yield-before-cancel-check loop pattern: tokio::task::yield_now().await at the TOP of every loop iteration BEFORE is_cancelled(). Required for fast-iteration tests on tmpfs-backed paths. Cancellation observability invariant."
  - "Spawned-task-owned registry drain: the task itself calls registry.remove(&op_id) at the end. Public cancel_all() ONLY flips tokens. Symmetric and lock-free vs. caller-owned drain."

requirements-completed: [REQ-03, REQ-13, REQ-06]

# Metrics
duration: 12min
completed: 2026-05-16
---

# Phase 02 Plan 05: Import Controller (Wave 3) Summary

**Tokio-task import orchestrator with CancellationToken registry + per-file event emit + source-clash detection landed. 6 inline lib tests + 3 integration tests GREEN. Plan 06 (import-state.svelte.ts) + Plan 07 (Tauri IPC wiring) unblocked.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-16 (RED commit `9320c6b`)
- **Completed:** 2026-05-16 (Task 2 commit `d553dae`)
- **Tasks:** 2 (Task 1 RED→GREEN cycle + Task 2 test-only commit since Task 1 GREEN already foreshadowed Task 2 behaviors per cycle-3 design)
- **Files created:** 2 (1 new integration test + this SUMMARY.md)
- **Files modified:** 3 (1 placeholder OVERWRITTEN + 2 Wave-0 stubs REPLACED)
- **Commits:** 3 (1 RED test + 1 GREEN feat + 1 Task 2 test-additions)

## Accomplishments

- **`src-tauri/src/import_controller.rs` full body landed (~758 LOC = impl + inline tests)** — Wave-1 placeholder OVERWRITTEN with the locked public surface: `ImportController { registry: Mutex<HashMap<OperationId, ImportOperation>> }` + `ImportOperation` + `ImportProgress` + `ImportFailure` + `ImportDoneEvent` (cycle-2 cluster #6 SSOT) + `compute_dest` + `validate_inputs` + `start_import_inner<F>` + `cancel_import_inner` + `ImportController::cancel_all`. Module header documents every D-* + every cycle-2 cluster invariant inline.
- **REQ-13 acceptance gate GREEN** — per-file progress events flow through the type-erased `emit_fn` closure; the test `happy_path_two_files_emits_two_progress_plus_one_done` asserts exactly 2 `import:progress` events and 1 `import:done` event with `succeeded: 2, failed: 0, cancelled: false`. The 2/3 partial-failure shape ('2 / 3 imported · 1 error') is asserted by `per_file_failure_does_not_abort_batch`.
- **D-16 cancellation invariant GREEN** — `cancel_midbatch_stops_iteration_preserves_already_written` asserts that `cancel_import_inner(controller, op_id)` flips the CancellationToken, the spawned task observes it via `yield_now().await` + `is_cancelled()`, and breaks the loop WITHOUT rolling back already-written files. Registry self-drains post-cancel.
- **Cluster #6 ImportDoneEvent SSOT locked** — distinct shape from `ImportProgress`, NOT reused. `failures: Vec<ImportFailure>` carries per-file failure list; `course`, `category`, `cancelled` flow through to the frontend listener. The Rust source carries a cross-reference comment pinning the consumer locations (02-06 `import-state.svelte.ts` + 02-11 `ImportHistoryModal.svelte`).
- **Cluster #7 pre-spawn validation GREEN** — `validate_inputs(course, category)` runs BEFORE registry insert or task spawn. Invalid category returns `"invalid category: ..."`; invalid course code returns `"invalid course code: ..."`. Registry stays clean. Both `invalid_course_or_category_rejected_before_spawn` (inline) and `rejects_invalid_course_or_category_before_spawn` (integration) assert this.
- **Cluster #8 source-clash GREEN** — `source_basename_clash_records_failure_and_continues` (inline) + `source_basename_clash.rs` (NEW integration test) assert that re-importing a basename that already exists under `_source/` is detected at controller level (BEFORE read_bytes / write_to_vault), recorded as a failure with `source-clash:<existing>` prefix, and the batch CONTINUES. Existing file's bytes UNCHANGED — no silent overwrite.
- **Cycle-3 priority #12 — `ImportController::cancel_all()` public surface** — async method that flips every CancellationToken in the registry. 02-07 CloseRequested handler will call this on shutdown without needing access to the private `registry` field.
- **3 integration tests GREEN.** `ipc_user_rejects.rs` lifts the Wave-0 `#[ignore] panic!("Wave 4 implements")` stub to a real assertion of `VaultWriterError::WriteToSourceForbidden` via `mneme_lib::vault_writer`. `import_controller_validates_course_category.rs` lifts the Wave-0 `#[ignore] panic!("Wave 3 implements")` stub to a real `mneme_lib::import_controller::start_import_inner` integration mirror. `source_basename_clash.rs` is NEW and mirrors the inline clash test at integration level.
- **6 inline lib tests GREEN.** `happy_path_two_files_emits_two_progress_plus_one_done` + `inbox_destination_when_no_course` + `source_basename_clash_records_failure_and_continues` + `invalid_course_or_category_rejected_before_spawn` + `cancel_midbatch_stops_iteration_preserves_already_written` + `per_file_failure_does_not_abort_batch`. All assertions against the type-erased `Fn(&str, serde_json::Value)` capture closure; events deserialize via `evt.1["field"].as_<type>().unwrap()`.
- **No regressions.** Plan 02-02 vault_writer-family (10 cases) + Plan 02-04 vault_index-family (9 cases) + Phase 1 (kill_pgid 3 cases) + Phase 01.1 (dev_log_rotation 3 cases) all GREEN. `cargo build` + `cargo build --features dev-invoke` + `cargo clippy --features dev-invoke -- -D warnings` + `cargo fmt --check` all exit 0.

## Task Commits

Each task ran the TDD cycle; Task 2 commits as a single test-additions commit because Task 1 GREEN already foreshadowed Task 2's behaviors (per cycle-3 priority #4 design — `yield_now` + per-file failure-continue invariants are in the Task 1 main spawn body, NOT a Task 2 appendix patch):

1. **Task 1 RED — 4 inline async tests reference unbuilt impl** — `9320c6b` (test)
   - Overwrote the Wave-1 placeholder `src-tauri/src/import_controller.rs` (7 LOC of comments) with ONLY a `#[cfg(test)] mod tests { ... }` block containing 4 `#[tokio::test]` async functions.
   - Tests: `happy_path_two_files_emits_two_progress_plus_one_done` + `inbox_destination_when_no_course` + `source_basename_clash_records_failure_and_continues` + `invalid_course_or_category_rejected_before_spawn`.
   - Intended RED: `cargo build --tests` fails with E0425 (unresolved `start_import_inner`) + E0433 (undeclared `ImportController`). Cycle-2 cluster #6 / #7 / #8 invariants all encoded in the RED tests.

2. **Task 1 GREEN — import_controller body + impl** — `9befb1d` (feat)
   - Appended ~430 LOC of implementation BEFORE the existing test module: `ImportController` + `ImportOperation` + `ImportProgress` + `ImportFailure` + `ImportDoneEvent` + `compute_dest` + `VALID_CATEGORIES` + `VALID_COURSE_RE` + `validate_inputs` + `start_import_inner<F>` + `cancel_import_inner` + `cancel_all`.
   - tokio::spawn task: per-iteration `yield_now().await` BEFORE `is_cancelled()`, source-clash detection BEFORE read_bytes, vault_writer call via `import_handle()` factory + WriteContext::Import, vault_index insert (best-effort per SPEC L64), emit `ImportProgress` per file, final `ImportDoneEvent` with `failures: Vec<ImportFailure>` list.
   - Auto-fixed Rule 3 blocking issues inline during GREEN: 5 clippy `uninlined-format-args` violations + 1 clippy `doc-list-item-without-indentation` warning (see Deviations).
   - All 4 inline tests GREEN; clippy + fmt + build all exit 0; no regression.

3. **Task 2 — append 2 cancel+failure tests + replace 2 Wave-0 stubs + create source_basename_clash.rs** — `d553dae` (test)
   - Appended 2 inline lib tests: `cancel_midbatch_stops_iteration_preserves_already_written` (D-16) + `per_file_failure_does_not_abort_batch` (REQ-13).
   - Replaced `ipc_user_rejects.rs` Wave-0 stub with `VaultWriterError::WriteToSourceForbidden` invariant assertion via `mneme_lib::vault_writer`.
   - Replaced `import_controller_validates_course_category.rs` Wave-0 stub with `mneme_lib::import_controller::start_import_inner` integration mirror of the cycle-2 cluster #7 invariant.
   - Created NEW `src-tauri/tests/source_basename_clash.rs` — integration mirror of the cycle-2 cluster #8 invariant, asserting both the failure-recording behavior AND that the existing file's bytes are UNCHANGED.
   - Fixed 2 introduced clippy `uninlined-format-args` violations + 2 rustfmt rewraps in the same commit.
   - Per the cycle-3 design, Task 1's GREEN impl ALREADY contained the `yield_now` + per-file failure-continue logic (NOT deferred to a Task 2 appendix), so these tests pass against unchanged code. The commit is `test(...)` rather than `feat(...)` because no implementation code changed.

**Plan metadata commit:** _committed alongside SUMMARY.md by the orchestrator after wave-merge per parallel-execution protocol._

## Files Created/Modified

### Created (2)

| Path | Purpose |
|------|---------|
| `src-tauri/tests/source_basename_clash.rs` | NEW integration test — cycle-2 cluster #8 mirror. Asserts re-import to existing `_source/` basename is rejected with `source-clash:<existing>` reason; existing file UNCHANGED. |
| `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-05-SUMMARY.md` | This file. |

### Modified (3)

**Production source (1):**
- `src-tauri/src/import_controller.rs` — Wave-1 placeholder (7 LOC of comments) OVERWRITTEN with ~758 LOC = ~430 LOC impl + ~310 LOC inline tests. Adds: `ImportController` + `ImportOperation` + `ImportProgress` + `ImportFailure` + `ImportDoneEvent` (cycle-2 cluster #6 SSOT with cross-reference comment) + `compute_dest` (course-mode + inbox-mode discrimination) + `VALID_CATEGORIES` const + `VALID_COURSE_RE` once_cell::Lazy + `validate_inputs` (cluster #7 pre-spawn gate) + `start_import_inner<F: Fn(&str, serde_json::Value) + Send + Sync + 'static>` (uuid op_id + registry insert + tokio::spawn + per-iteration yield_now + cancel-check + source-clash detect + vault_writer + vault_index + emit) + `cancel_import_inner` + `cancel_all` (cycle-3 priority #12 public surface). 6 inline `#[tokio::test]` async tests cover happy / _inbox / clash / pre-spawn-validate / cancel-midbatch / per-file-error.

**Test scaffolding (2 replaced):**
- `src-tauri/tests/ipc_user_rejects.rs` — Wave-0 `#[ignore] panic!("Wave 4 implements")` REPLACED with a real `#[test] fn invoke_write_user_returns_error_value` that asserts `write_to_vault(&target_under_source, b"x", WriteContext::User)` returns `Err(VaultWriterError::WriteToSourceForbidden)`. This is the load-bearing invariant — the Plan 02-07 Tauri command wrapper will be a thin `.map_err(|e| e.to_string())` shim over this Err.
- `src-tauri/tests/import_controller_validates_course_category.rs` — Wave-0 `#[ignore] panic!("Wave 3 implements")` REPLACED with a real `#[tokio::test] async fn rejects_invalid_course_or_category_before_spawn` that drives `mneme_lib::import_controller::start_import_inner` through both Err paths (`invalid category` for typo'd category + `invalid course code` for non-regex-matching course string) and asserts the registry is untouched after each.

## Decisions Made

- **Type-erased emit_fn closure signature `Fn(&str, serde_json::Value) + Send + Sync + 'static`** — one closure carries BOTH `ImportProgress` (per-file) AND `ImportDoneEvent` (batch summary) payloads. Tests substitute a capturing `Arc<StdMutex<Vec<(String, serde_json::Value)>>>` push; the Plan 02-07 Tauri command wrapper substitutes `move |evt, val| { let _ = app.emit(evt, val); }`. Resolves the cycle-2 variant explosion where each event type wanted its own typed `Fn(&str, ImportProgress)` / `Fn(&str, ImportDoneEvent)` closure.

- **Pre-spawn `validate_inputs` gate (cluster #7)** — validate course regex `^[A-Z]{4}\d{4}$` (once_cell::Lazy) + category enum membership BEFORE registry insert or task spawn. Invalid input returns `Err("invalid category: ...")` or `Err("invalid course code: ...")` with registry untouched. Both lib (`invalid_course_or_category_rejected_before_spawn`) and integration (`rejects_invalid_course_or_category_before_spawn` in `import_controller_validates_course_category.rs`) mirrors lock the invariant.

- **Source-clash detection at controller level (cluster #8)** — when `category != "_inbox"` AND `course.is_some()` AND `dest.exists()`, emit failure with `source-clash:<dest>` reason WITHOUT calling `vault_writer::write_to_vault`. The vault_writer's `VaultWriterError::SourceBasenameClash(PathBuf)` variant exists (added by Plan 02-02) but is currently dormant because the controller intercepts the clash before the writer is invoked. This pre-emption is intentional — keeps the writer's failure paths free of overwrite-protection logic; controller owns the user-facing failure semantics. The variant remains available for future direct callers (Phase 4 doc-ingestion when bypassing the controller).

- **`tokio::task::yield_now().await` at TOP of every iteration BEFORE `is_cancelled()` check** — makes the cancellation test deterministic on macOS tmpfs-backed tempfile dirs. Without the yield, fast batches complete before `cancel_import_inner` can observably flip the token; the test sometimes saw `cancelled_count == 0`.

- **Spawned task owns its own registry drain** — the task itself calls `controller_task.registry.lock().await.remove(&op_id_task)` at the very end (after final `ImportDoneEvent` emit). `cancel_all()` only flips tokens; it does NOT remove entries. Tasks self-drain on next `yield_now`. This keeps the cancel-all surface symmetric (the public `cancel_all` does NOT need to know whether each op is currently mid-iteration or at the final emit).

- **Per-file failure does NOT abort batch (REQ-13 acceptance "2 / 3 imported · 1 error")** — read failures (`std::fs::read(src)` Err), write failures (vault_writer Err), and source-clash all push `ImportFailure { path, reason }` into a `failures: Vec<ImportFailure>` collector, increment the `failed` counter, emit per-file progress with `last_file_status: "error"` + `last_file_error: Some(reason)`, and `continue` the loop. The final `ImportDoneEvent` carries the full failure list.

- **`ImportDoneEvent` is the IMPORT EVENT SCHEMA SSOT (cluster #6)** — distinct shape from `ImportProgress`, NOT reused. Fields: `operation_id` + `total` + `succeeded` + `failed` + `cancelled` + `course: Option<String>` + `category: String` + `failures: Vec<ImportFailure>`. Frontend mirror at `src/lib/import-state.svelte.ts` (Plan 02-06) must mirror snake_case field names verbatim with a cross-reference comment pointing back to this source file. The Rust source carries an inline cross-reference comment pinning consumer locations (02-06 `import-state.svelte.ts` + 02-11 `ImportHistoryModal.svelte`).

- **Integration test `import_controller_validates_course_category.rs` is a REAL test, not a no-op pass** — the Wave-0 stub instructed "Wave 3 implements". Cycle-3 added an inline lib test that exercises the same invariant; this integration mirror reaches `mneme_lib::import_controller::start_import_inner` directly to ALSO prove the validation surface is public + reachable + correct at the integration call site. Both mirrors stay GREEN; either one catching a regression is sufficient to fail CI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking acceptance gate] 5 clippy `uninlined-format-args` warnings in Task 1 GREEN code**
- **Found during:** Task 1 GREEN — `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` exit gate.
- **Issue:** Initial `format!` calls used positional args (`format!("invalid category: {:?}", category)`) — clippy `-D warnings` rejects this in favor of `format!("invalid category: {category:?}")` inline interpolation. Locations: `validate_inputs` (2 calls), `read` error branch, `write` error branch, `cancel_import_inner` no-op-message.
- **Fix:** Replaced all positional args with inline interpolation. Stylistic-only; zero behavior change.
- **Files modified:** `src-tauri/src/import_controller.rs`
- **Committed in:** `9befb1d` (Task 1 GREEN — fixed before commit).

**2. [Rule 3 — Blocking acceptance gate] 1 clippy `doc-list-item-without-indentation` warning in compute_dest doc comment**
- **Found during:** Task 1 GREEN — `cargo clippy -- -D warnings`.
- **Issue:** The original doc comment wrap was `"...via a malicious basename. Course code\n+ category are pre-validated..."` — clippy interpreted `+ category` as a markdown list item without indentation continuation.
- **Fix:** Reworded to `"...via a malicious basename. Both course code and category are pre-validated..."`.
- **Files modified:** `src-tauri/src/import_controller.rs`
- **Committed in:** `9befb1d` (Task 1 GREEN — fixed before commit).

**3. [Rule 3 — Blocking acceptance gate] 2 clippy `uninlined-format-args` warnings in Task 2 inline tests**
- **Found during:** Task 2 (running `cargo clippy --tests` to check the new test files).
- **Issue:** `format!("expected source-clash: prefix, got {:?}", reason)` + `format!("expected 2 progress events, got events: {:?}", events)`.
- **Fix:** Replaced with inline-interpolated form (`{reason:?}` and `{events:?}`).
- **Files modified:** `src-tauri/src/import_controller.rs`
- **Committed in:** `d553dae` (Task 2 — fixed before commit).

**4. [Rule 3 — Blocking acceptance gate] 2 rustfmt rewraps in Task 2 inline tests**
- **Found during:** Task 2 (`cargo fmt --check` after writing the new tests).
- **Issue:** Two lines exceeded the 100-col threshold (the `cancel_import_inner(controller.clone(), &op_id).await.unwrap();` one-liner + a multi-line `assert!` block).
- **Fix:** Ran `cargo fmt` to apply rustfmt's canonical rewraps. Stylistic-only; zero behavior change.
- **Files modified:** `src-tauri/src/import_controller.rs`
- **Committed in:** `d553dae` (Task 2 — fixed before commit).

### Pre-existing test-file drift NOT fixed (out of scope, documented for visibility)

`cargo clippy --tests -- -D warnings` (the wider form) surfaces clippy violations in 7 pre-existing test files: `chmod_cancellation_safety.rs`, `course_scaffold.rs`, `dev_log_rotation.rs`, `kill_pgid.rs`, `path_traversal_blocked.rs`, `symlink_canonicalize_blocked.rs`, `vault_scaffold.rs`. These are NOT in Plan 02-05 scope (Plan 02-04 SUMMARY already documented them as out-of-scope). The pre-commit hook does not run `--tests` clippy, so the drift accumulated. Plan 02-05's acceptance criterion is `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` (the narrow lib + bin form), which is GREEN. A future housekeeping commit should extend the Plan 02-02 fix pattern to these files OR formally adopt `cargo clippy --all-targets -- -D warnings` as a CI gate.

### Note on the vault_writer `SourceBasenameClash` variant shape

The orchestrator's special_notes asked me to "add `SourceBasenameClash { existing: PathBuf, requested: PathBuf }` variant" to `vault_writer.rs`. The variant already exists from Plan 02-02 in a slightly different shape: `SourceBasenameClash(PathBuf)` (single-tuple). My implementation does NOT consume this variant — the controller intercepts the clash BEFORE invoking `vault_writer::write_to_vault`, so the variant remains dormant in this plan. I did NOT modify the variant shape because:

1. The cluster #8 invariant (no silent overwrite + structured failure) is fully tested by the inline + integration tests.
2. Changing the variant signature could break Plan 02-11's `import-error-classifier.test.ts` consumer (the classifier reads the `source-clash:` prefix from the controller-emitted `failures[].reason` string, not from the writer's enum).
3. The variant remains available for future direct callers (Phase 4 doc-ingestion bypassing the controller).

If a future plan wants to make `write_to_vault` raise `SourceBasenameClash` directly (and have the controller propagate it), the variant + the controller's prefix string can be reconciled in that plan's scope.

---

**Total deviations:** 4 auto-fixed (all Rule 3 — blocking plan acceptance gate) + 1 documented decision (variant shape unchanged from Plan 02-02).
**Impact on plan:** All auto-fixes were stylistic rewraps applied inline during GREEN; zero behavior change, zero regression. The variant-shape decision is documented for the Plan 02-11 classifier owner.

## Issues Encountered

- **Task 2 RED step had no "actually fail" state** — per the plan's cycle-3 design, Task 1's GREEN body already contains `yield_now().await` (cancel observability) + per-file failure-continue logic. So Task 2's RED tests passed against unchanged code. I split commits as RED+GREEN (Task 1) + Task 2 (test-only). This is the intentional cycle-3 design (the plan notes: "the GREEN implementation from Task 1 already covers both behaviors").
- **`vault_writer::VaultWriterError::SourceBasenameClash` variant exists from Plan 02-02 but is currently dormant** — controller detects the clash BEFORE calling write_to_vault. See Deviations § "Note on the vault_writer variant shape".
- **husky pre-commit DEPRECATED warning** on every commit — pre-existing v9 deprecation message about lines that will FAIL in husky v10.0.0. Out of scope; already noted in Plan 02-02 + 02-04 SUMMARYs.

## TDD Gate Compliance

Plan frontmatter declares `type: tdd`. Gate sequence verified in `git log`:

| Wave | Commit | Type | Gate |
|------|--------|------|------|
| Task 1 | `9320c6b` | `test` | RED — 4 inline async tests reference unbuilt ImportController + start_import_inner; cargo build --tests fails E0425/E0433 |
| Task 1 | `9befb1d` | `feat` | GREEN — import_controller body + impl; 4 inline tests pass |
| Task 2 | `d553dae` | `test` | RED+GREEN merged — 2 new inline tests + 3 integration mirrors; Task 1 GREEN body already foreshadowed both invariants (yield_now + per-file fallthrough) so no separate `feat(...)` commit is needed (cycle-3 priority #4 design) |

REFACTOR gate: implicit — every GREEN commit ran `cargo fmt` + `cargo clippy -- -D warnings` clean; no separate `refactor(...)` commit needed because the production code was written clean from the start (single-pass implementation with explicit doc-comments per D-* / cycle-2 cluster / cycle-3 priority invariant).

## User Setup Required

None — no external service configuration required. All work is contained within `src-tauri/` (Rust source + integration tests) and `.planning/` (this SUMMARY.md).

## Self-Check: PASSED

### Files exist

```
src-tauri/src/import_controller.rs                                                          FOUND (~758 LOC)
src-tauri/tests/ipc_user_rejects.rs                                                         FOUND (Wave-0 stub → GREEN real test)
src-tauri/tests/import_controller_validates_course_category.rs                              FOUND (Wave-0 stub → GREEN real test)
src-tauri/tests/source_basename_clash.rs                                                    FOUND (NEW — cluster #8 mirror)
.planning/phases/02-vault-canvas-ed-sync-onboarding/02-05-SUMMARY.md                        FOUND (this file)
```

### Commits exist in git log

```
9320c6b  test(02-05): RED — import_controller 4 inline async tests reference unbuilt impl          FOUND
9befb1d  feat(02-05): GREEN import_controller start_import_inner + per-file event emit             FOUND
d553dae  test(02-05): GREEN Task 2 — cancel + per-file fallthrough + 3 integration mirrors         FOUND
```

### Acceptance gates verified

```
cargo build --manifest-path src-tauri/Cargo.toml                                          exit 0
cargo build --manifest-path src-tauri/Cargo.toml --features dev-invoke                    exit 0
cargo test --manifest-path src-tauri/Cargo.toml --lib import_controller                   6 passed / 0 failed
cargo test --manifest-path src-tauri/Cargo.toml --test ipc_user_rejects                   1 passed / 0 failed
cargo test --manifest-path src-tauri/Cargo.toml --test import_controller_validates_course_category   1 passed / 0 failed
cargo test --manifest-path src-tauri/Cargo.toml --test source_basename_clash              1 passed / 0 failed
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings                          exit 0
cargo clippy --manifest-path src-tauri/Cargo.toml --features dev-invoke -- -D warnings    exit 0
cargo fmt --manifest-path src-tauri/Cargo.toml --check                                    exit 0
Phase 1 regression (kill_pgid)                                                            3/3 GREEN
Phase 01.1 regression (dev_log_rotation)                                                  3/3 GREEN
Plan 02-02 regression (vault_writer-family 10 cases)                                      10/10 GREEN
Plan 02-04 regression (vault_index-family 9 cases)                                        9/9 GREEN
```

### Grep gates (Task 1 + Task 2 + acceptance criteria)

```
grep -E 'tokio_util::sync::CancellationToken' src-tauri/src/import_controller.rs          1 match (use)
grep -E 'tokio::spawn' src-tauri/src/import_controller.rs                                 1 match (task spawn)
grep -E 'uuid::Uuid::new_v4' src-tauri/src/import_controller.rs                           1 match (op_id)
grep -E 'import_handle\(\)' src-tauri/src/import_controller.rs                            1 match (vault_writer factory)
grep -E '^pub mod import_controller;' src-tauri/src/lib.rs                                1 match (Plan 02-02 owned)
grep -E 'cancel_import_inner' src-tauri/src/import_controller.rs                          3 matches (decl + body + test)
grep -E 'is_cancelled\(\)' src-tauri/src/import_controller.rs                             1 match (loop guard)
grep -E 'tokio::task::yield_now\(\)\.await' src-tauri/src/import_controller.rs            1 match (pre-cancel-check yield)
grep -E 'pub async fn cancel_all' src-tauri/src/import_controller.rs                      1 match (cycle-3 priority #12)
grep -E 'ImportDoneEvent' src-tauri/src/import_controller.rs                              4 matches (struct + 2 in spawn body + cross-ref comment)
grep -E 'SourceBasenameClash' src-tauri/src/vault_writer.rs                               2 matches (variant decl + thiserror text — added by Plan 02-02, dormant in this plan)
grep -E 'source-clash:' src-tauri/src/import_controller.rs                                3 matches (reason format + 2 test assertions)
```

## Next Phase Readiness

**Plan 06 (Wave 1 — import-state.svelte.ts) is unblocked:**

- The `ImportDoneEvent` schema in `src-tauri/src/import_controller.rs` is the SSOT for the `import:done` payload. Plan 06's TS mirror at `src/lib/import-state.svelte.ts` must mirror snake_case field names verbatim (`operation_id`, `total`, `succeeded`, `failed`, `cancelled`, `course`, `category`, `failures[]`).
- The `ImportProgress` schema is the SSOT for the `import:progress` payload — Plan 06 listens via Tauri's event bus.
- Plan 06's `derivePillState` reads from the singleton store populated by both event types.

**Plan 07 (Wave 4 — Tauri IPC wiring) is unblocked:**

- Plan 07 registers `#[tauri::command] async fn start_import(...)` + `#[tauri::command] async fn cancel_import(...)` as thin wrappers over `start_import_inner` + `cancel_import_inner`. The `emit_fn` closure is `move |evt, val| { let _ = app.emit(evt, val); }`.
- Plan 07's CloseRequested handler calls `controller.cancel_all().await` on shutdown.
- Plan 07 declares the 2 new commands in `capabilities/default.json` (or wherever the capability list lives for this surface).

**Plan 11 (Wave 7 — ImportDialog + ImportHistoryModal) is unblocked:**

- ImportHistoryModal reads `import:done` events from the singleton store (mirrored by Plan 06) and renders `failures[].reason` strings.
- The `import-error.ts` classifier (Plan 11 cluster) maps the `source-clash:` prefix to the friendly Chinese message: "This filename already exists in _source/. Phase 2 does not overwrite — delete the old file first or rename your new file."
- ImportDialog triggers `invoke('start_import', { paths, course, category })` and surfaces the per-file `import:progress` events as a progress indicator.

**Phase 4 (doc ingestion: Marker / markitdown → _source/*.md) inherits:**

- Same `import_handle()` factory + `WriteContext::Import` pattern. The source-clash semantics protect re-ingestion (re-running Marker on a previously processed PDF will surface the clash instead of silently overwriting the user's annotated markdown).
- Alternatively, doc-ingestion can call `start_import_inner` directly (bypassing the UI controller) for batch ingestion of a course's `_source/lectures/*.pdf` → `_source/lectures/*.md` derived pipeline.

**No blockers.** REQ-03 (Canvas/Ed sync orchestration — partial; full sync in v1.x) + REQ-06 (vault writes through vault_writer) + REQ-13 (per-file progress emission) acceptance gates GREEN for the import-controller surface. T-2-06 (course-code injection) defense satisfied via regex gate + cluster #7 pre-spawn validate. T-2-12 (operation_id collision) satisfied via uuid v4 (statistical impossibility).

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Plan: 05 (Wave 3)*
*Completed: 2026-05-16*
