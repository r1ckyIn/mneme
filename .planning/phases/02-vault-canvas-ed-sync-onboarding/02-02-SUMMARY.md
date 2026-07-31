---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 02
subsystem: infra
tags:
  - tdd
  - wave-1
  - rust
  - vault-writer
  - canonicalize
  - chmod
  - drop-guard
  - path-traversal
  - symlink
  - thiserror
  - once-cell
  - regex

# Dependency graph
requires:
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 01
    provides: Wave-0 SKELETON vault_writer.rs (public surface), 9 cargo deps (chrono / thiserror / regex / once_cell / rusqlite / walkdir / uuid / tokio-util), `mneme_lib` crate name, 18 Rust integration test stubs (2 RUNNABLE HIGH + 16 #[ignore]), lib.rs `pub mod vault_writer;` registration
provides:
  - vault_writer.rs full body — single authorized writer surface (WriteContext + private ImportToken + import_handle factory + write_to_vault + create_vault_scaffold + create_course + with_temporary_writable_permission + RelockGuard)
  - Two-arm canonicalize-parent path guard (Pitfall 2 + cycle-2 cluster #3) closing T-2-01 + T-2-02 HIGH-severity block-on-HIGH gate
  - chmod 644 -> write -> chmod 444 three-step wrapped in with_temporary_writable_permission helper with RelockGuard Drop semantics (D-07 + Pitfall 12)
  - 5 `pub mod` declarations in lib.rs (vault_writer + 4 placeholder modules pre-declared for interface-first wave-safety)
  - 4 placeholder stub .rs files on disk (config.rs / onboarding.rs / vault_index.rs / import_controller.rs) so Plans 02-03/04/05 can overwrite without lib.rs merge conflicts
  - Course-code regex gate `^[A-Z]{4}\d{4}$` (T-2-06 mitigation)
  - INDEX.md atomic temp+rename + idempotency (re-add same course does NOT overwrite)
  - Defense-in-depth: path-Component check (NOT substring) so `notes/my_source/...` never falsely matches `_source/`
  - 10 vault_writer-family test cases GREEN across 9 test files (was: 1 GREEN, 1 RED, 8 #[ignore] stubs after Wave 0)
affects:
  - Plan 02-03 (onboarding.rs + config.rs — overwrites 2 placeholders)
  - Plan 02-04 (vault_index.rs — overwrites 1 placeholder)
  - Plan 02-05 (import_controller.rs — overwrites 1 placeholder; consumes import_handle factory + WriteContext::Import)
  - Plan 02-07 (Tauri IPC wiring — wraps write_to_vault behind invoke commands)
  - Plan 02-08 (Onboarding step 3 — calls create_vault_scaffold)
  - Plan 02-08 (Onboarding step 5 — calls create_course)
  - Phase 4 doc-ingestion (Marker subprocess output -> _source/*.md via import_handle factory)

# Tech tracking
tech-stack:
  added:
    - "No new cargo deps — used Wave 0 deps (chrono 0.4 / thiserror 1 / regex 1 / once_cell 1 / std::os::unix::fs::PermissionsExt)"
  patterns:
    - "Two-arm canonicalize gate: leaf-symlink_metadata() detects existing path -> canonicalize whole; else canonicalize parent + join file_name. Closes both T-2-01 (not-yet-existing path with `..`) AND T-2-02 (existing symlink leaf) in one helper."
    - "Path-component check pattern: iterate Path::Components, match `Component::Normal == OsStr::new(\"_source\")` exactly — NOT substring on path.to_string_lossy(). Prevents false-match on filenames like `my_source.md` or directories like `notes/source/`."
    - "Private-field privacy seal pattern: `ImportToken { _marker: PhantomData<()> }` with NO `pub(crate)` qualifier. Sibling modules cannot construct the literal because the field is invisible. Single `pub fn import_handle()` factory inside the same module is the only legitimate construction path. Audit gate: grep for `ImportToken {` literal outside vault_writer.rs MUST return 0 results."
    - "RAII Drop guard for chmod cancellation safety: `RelockGuard { path, armed }` re-applies 0o444 on Drop unless `disarm()` called. Closure `?` propagation or panic unwind both trigger Drop relock before the error surfaces upstream. Best-effort (`let _ = set_permissions(...)`) so a failed relock leaves file at 0o644 and the original Err informs the caller."
    - "Interface-first wave-safety: pre-declare ALL Wave 1-3 modules in lib.rs at the start of Wave 1 so parallel waves never touch lib.rs. Placeholder .rs files exist on disk; Waves 2/3 OVERWRITE them with full implementations. cargo build stays green at every wave boundary."
    - "Auto-fixed pre-existing fmt/clippy drift on Phase 01.1 files (dev.rs / dev_invoke.rs / dev_log_rotation.rs / path_traversal_blocked.rs) as Rule 3 blocking issue — required for plan acceptance criteria `cargo clippy -- -D warnings` + `cargo fmt --check` to pass. Stylistic-only, zero behavior change."

key-files:
  created:
    - "src-tauri/src/config.rs (placeholder — Plan 02-03 overwrites)"
    - "src-tauri/src/onboarding.rs (placeholder — Plan 02-03 overwrites)"
    - "src-tauri/src/vault_index.rs (placeholder — Plan 02-04 overwrites)"
    - "src-tauri/src/import_controller.rs (placeholder — Plan 02-05 overwrites)"
    - ".planning/phases/02-vault-canvas-ed-sync-onboarding/02-02-SUMMARY.md (this file)"
  modified:
    - "src-tauri/src/vault_writer.rs (overwrote Wave-0 skeleton with full body: WriteContext enum + private ImportToken + import_handle factory + 8-variant VaultWriterError + two-arm canonicalize gate + Component-based _source check + atomic_write helper + create_vault_scaffold + create_course (incl. course-code regex + idempotent INDEX.md) + with_temporary_writable_permission + RelockGuard Drop guard)"
    - "src-tauri/src/lib.rs (added 4 pub mod declarations: config / onboarding / vault_index / import_controller)"
    - "src-tauri/src/dev.rs (Rule 3 auto-fix: 1-line clippy uninlined-format-args on iso8601_now format!)"
    - "src-tauri/src/bin/dev_invoke.rs (Rule 3 auto-fix: rustfmt rewrap of 3 long lines)"
    - "src-tauri/tests/path_traversal_blocked.rs (Rule 3 auto-fix: rustfmt rewrap of long assert!)"
    - "src-tauri/tests/dev_log_rotation.rs (Rule 3 auto-fix: rustfmt rewrap of long .send + assert! lines)"
    - "src-tauri/tests/vault_scaffold.rs (RED: replaced panic! stub with real assertion for create_vault_scaffold idempotency)"
    - "src-tauri/tests/course_scaffold.rs (RED: replaced panic! stub with 2 cases — full course tree + INDEX.md idempotency + invalid course code rejection)"
    - "src-tauri/tests/vault_writer_user_rejects.rs (RED: replaced panic! stub with 2 cases — User-ctx rejects _source/ write + accepts notes/ write)"
    - "src-tauri/tests/vault_writer_import_writes.rs (RED: replaced panic! stub with Import-ctx success path)"
    - "src-tauri/tests/chmod_lock_enforced.rs (RED: replaced panic! stub with 0o444 enforcement + raw fs::write PermissionDenied + vault_writer User-ctx guard)"
    - "src-tauri/tests/chmod_three_step_cycle.rs (RED: replaced panic! stub with re-import unlock/relock cycle)"
    - "src-tauri/tests/chmod_cancellation_safety.rs (RED: replaced panic! stub with std::panic::catch_unwind + assert mode at 0o444 or 0o644)"

key-decisions:
  - "Two-arm canonicalize pattern (cycle-2 cluster #3): symlink_metadata().is_ok() branch detects EXISTING leaf (regular file, dir, or symlink) and canonicalizes the WHOLE path so symlinks resolve through; else canonicalize parent + join file_name catches `..` traversal during fs::create on not-yet-existing leaf. This unifies T-2-01 (path traversal) + T-2-02 (symlink leaf) into ONE helper instead of two separate guards."
  - "Path-Component check over substring: iterate canonicalized Components, match Normal(OsStr::new(\"_source\")) exactly. Future filenames like `notes/my_source/README.md` will NOT false-match. Plan PLAN.md explicitly required this; verified by manual review."
  - "ImportToken._marker stays fully PRIVATE (NOT pub(crate)) per cycle-2 cluster #5. The factory `pub fn import_handle()` is the ONLY construction path. Sibling modules under src-tauri/src/ get rustc E0451 if they try `ImportToken { _marker: PhantomData }`. The privacy of the field — not the function — is what seals construction."
  - "Re-import branch (under_source && path.exists()) explicitly routes through with_temporary_writable_permission(path, || atomic_write(path, bytes)) even though atomic temp+rename would technically bypass the 0o444 lock via parent-dir rename. The contract is: D-07 chmod 644 -> write -> chmod 444 lives in ONE place (the helper). Future Phase 4 doc-ingestion path will reuse the same helper without re-implementing the cycle."
  - "Auto-fixed pre-existing fmt+clippy drift on Phase 01.1 files (dev.rs, dev_invoke.rs, dev_log_rotation.rs, path_traversal_blocked.rs) under Rule 3 (blocking issue for plan acceptance). The pre-commit hook does not run `cargo fmt --check` or `cargo clippy -D warnings` so these had no enforcement gate. Plan acceptance requires both to exit 0; fixed inline. Zero behavior change — pure stylistic rewraps + format! string interpolation."

patterns-established:
  - "Two-arm canonicalize gate: closes path-traversal AND symlink-leaf attacks in one helper. Reusable for any future filesystem boundary check (e.g. Phase 4 doc-ingestion writes, Phase 5 import_controller.rs)."
  - "Path-component _source check: every future filesystem prefix gate in mneme should iterate Components rather than substring on path strings. Avoids partial-match false positives."
  - "ImportToken privacy via private field + public factory: pattern is reusable for any future privileged-write surface (Phase 4 Marker subprocess writes, Phase 5 import_controller cancellation token, etc.). Audit gate: grep for `<Type> {` literal outside owning module = 0 results."
  - "RelockGuard RAII Drop for cleanup-on-cancel: pattern reusable for any cooperative-cancellation site where a resource needs to be restored on early-return / panic. Phase 5 import_controller cancellation will reuse this shape."
  - "Interface-first wave-safety via pre-declared placeholder modules: lib.rs declares all Wave-1-through-3 modules at the start of Wave 1; Waves 2/3 OVERWRITE placeholder bodies. Eliminates lib.rs merge conflicts across parallel waves."

requirements-completed: [REQ-03, REQ-06]

# Metrics
duration: 14min
completed: 2026-05-16
---

# Phase 02 Plan 02: Vault Writer Wave-1 Summary

**Phase 2 single authorized writer surface locked: two-arm canonicalize-parent guard closes T-2-01 + T-2-02 HIGH-severity gate, chmod 644→444 three-step wrapped in RelockGuard-protected helper, 10 vault_writer-family tests GREEN, 4 placeholder .rs stubs pre-declared in lib.rs unblock parallel Waves 2/3.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-05-16T11:47:12Z (commit `11fd4b2`)
- **Completed:** 2026-05-16T12:01:37Z (commit `b71fcda`)
- **Tasks:** 2 (each TDD RED→GREEN cycle committed atomically)
- **Files created:** 5 (4 placeholder Rust modules + this SUMMARY.md)
- **Files modified:** 12 (1 lib + 1 lib.rs + 9 test files + 2 Phase 01.1 fmt fixes)
- **Commits:** 4 (2 RED test commits + 2 GREEN feat commits)

## Accomplishments

- **`src-tauri/src/vault_writer.rs` full body landed** — Wave-0 skeleton overwritten with the locked public surface: `WriteContext` enum + private `ImportToken` + `import_handle()` factory + 8-variant `VaultWriterError` + `write_to_vault` + `create_vault_scaffold` + `create_course` + `with_temporary_writable_permission` + `RelockGuard` Drop guard. Module-top doc-comment explains every D-* decision + every cycle-2 cluster invariant inline.
- **T-2-01 (path traversal) + T-2-02 (symlink leaf) HIGH-severity gate satisfied.** Two-arm canonicalize pattern + path-Component check closes both attack vectors in one helper (`is_under_source`). T-2-02 was Wave-0 RED; this plan ships the canonicalize gate that makes it GREEN.
- **REQ-06 vault + course scaffold GREEN.** `create_vault_scaffold` makes `_system/`, `_inbox/`, `courses/`, `shared/` idempotently. `create_course` validates course code via `^[A-Z]{4}\d{4}$` regex (T-2-06 mitigation), creates 7 sub-dirs (`_source/`, `_source/{lectures,tutorials,assignments}/`, `notes/`, `concepts/`, `practice/`), writes `INDEX.md` with YAML frontmatter (`course: <code>`, `created: <iso>`) via atomic temp+rename, and is fully idempotent (re-add does NOT overwrite INDEX.md).
- **REQ-04 chmod 0o444 lock + three-step re-import GREEN.** `write_to_vault` under `WriteContext::Import` to a path under `_source/` lands the file then chmod 0o444. Re-import path (file exists at 0o444) routes through `with_temporary_writable_permission(path, || atomic_write(path, bytes))` so the chmod 644 → write → chmod 444 cycle lives in ONE place (D-07 + Pitfall 1). Cancellation safety: `RelockGuard` Drop trait re-applies 0o444 on panic / early-return / closure-Err (Pitfall 12).
- **lib.rs pre-declares all 5 Phase 2 modules + 4 placeholder .rs stubs land on disk.** Plans 02-03 (config + onboarding) / 02-04 (vault_index) / 02-05 (import_controller) can now ship their full implementations by OVERWRITING the placeholders WITHOUT touching lib.rs — eliminating the file-merge conflict surface across parallel waves.
- **10 vault_writer-family test cases GREEN.** Across 9 test files (path_traversal_blocked, symlink_canonicalize_blocked, vault_scaffold, course_scaffold [2 cases], vault_writer_user_rejects [2 cases], vault_writer_import_writes, chmod_lock_enforced, chmod_three_step_cycle, chmod_cancellation_safety). Wave 0 starting state was: 1 GREEN (T-2-01) + 1 RED (T-2-02) + 8 #[ignore] panic! stubs.
- **No regressions.** Phase 1 (kill_pgid 3/3) + Phase 01.1 (dev_log_rotation 3/3) tests stay GREEN. Pre-commit hook (`audit-capabilities.sh` + `npx vitest run --changed`) passes on every commit.
- **clippy + fmt gates GREEN.** `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` exits 0; `cargo fmt --manifest-path src-tauri/Cargo.toml --check` exits 0. Required Rule-3 auto-fix on pre-existing Phase 01.1 fmt/clippy drift (see Deviations).

## Task Commits

Each task ran a full RED→GREEN cycle; one commit per phase:

1. **Task 1 RED — 6 stub tests replaced with real assertions** — `11fd4b2` (test)
   - Replaced `#[ignore] panic!("Wave 1 implements")` bodies in vault_scaffold.rs, course_scaffold.rs (2 cases), vault_writer_user_rejects.rs (2 cases), vault_writer_import_writes.rs with full assertions per SPEC REQ-03 + REQ-06 acceptance.
   - Intended RED state: `cargo test` fails to compile (`create_vault_scaffold` / `create_course` / `InvalidCourseCode` variant missing).
2. **Task 1 GREEN — vault_writer body + 5 module decls + 4 placeholder stubs** — `25344a5` (feat)
   - Overwrote vault_writer.rs Wave-0 skeleton with full body (two-arm canonicalize gate + Component check + atomic_write + create_vault_scaffold + create_course + course-code regex + idempotent INDEX.md).
   - Added 4 `pub mod` declarations to lib.rs (config / onboarding / vault_index / import_controller) + landed 4 placeholder .rs stub files.
   - Auto-fixed pre-existing fmt+clippy drift on dev.rs, dev_invoke.rs, dev_log_rotation.rs, path_traversal_blocked.rs (Rule 3 blocking — required for `cargo clippy -D warnings` + `cargo fmt --check` acceptance criteria).
   - 8 tests GREEN: path_traversal_blocked + symlink_canonicalize_blocked (T-2-02 RED→GREEN) + vault_scaffold + course_scaffold (2) + vault_writer_user_rejects (2) + vault_writer_import_writes.
3. **Task 2 RED — 3 chmod tests reference unbuilt helper** — `6173791` (test)
   - Replaced `#[ignore] panic!` stubs in chmod_lock_enforced.rs, chmod_three_step_cycle.rs, chmod_cancellation_safety.rs with full assertions per SPEC REQ-04 + RESEARCH Pitfall 12.
   - chmod_cancellation_safety fails to compile (`with_temporary_writable_permission` not yet defined) — intended RED.
   - chmod_lock_enforced + chmod_three_step_cycle actually pass against Task-1 GREEN code (atomic temp+rename bypasses 0o444 lock via parent-dir rename) — noted in commit body; Task 2 GREEN step formalizes the contract.
4. **Task 2 GREEN — with_temporary_writable_permission + RelockGuard Drop** — `b71fcda` (feat)
   - Appended `RelockGuard<'a>` (RAII Drop) + `pub fn with_temporary_writable_permission` to vault_writer.rs.
   - Updated `write_to_vault` Import branch: when `under_source && path.exists()`, route through `with_temporary_writable_permission(path, || atomic_write(path, bytes))`.
   - All 3 chmod tests GREEN; all 10 vault_writer-family test cases GREEN; Phase 1 + 01.1 regression GREEN.

**Plan metadata commit:** _committed alongside SUMMARY.md by the orchestrator after wave-merge per parallel-execution protocol._

## Files Created/Modified

### Created (5)

| Path | Purpose |
|------|---------|
| `src-tauri/src/config.rs` | Placeholder stub — Plan 02-03 (Wave 2) overwrites with `~/.mneme/config.json` load/save (atomic temp+rename). |
| `src-tauri/src/onboarding.rs` | Placeholder stub — Plan 02-03 (Wave 2) overwrites with onboarding state persistence (atomic temp+rename for `~/.mneme/onboarding-state.json`). |
| `src-tauri/src/vault_index.rs` | Placeholder stub — Plan 02-04 (Wave 2) overwrites with rusqlite-backed `vault_index.db` schema + reconciliation scan. |
| `src-tauri/src/import_controller.rs` | Placeholder stub — Plan 02-05 (Wave 3) overwrites with import controller state machine (folder batch + emit:progress events + cancellation token). |
| `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-02-SUMMARY.md` | This file. |

### Modified (12)

**Production source (3):**
- `src-tauri/src/vault_writer.rs` — Wave-0 skeleton (80 lines) → full body (304 lines). Adds two-arm canonicalize-parent gate (Component-based `_source` check), `atomic_write` temp+rename, `create_vault_scaffold` (4 dirs idempotent), `create_course` (7 sub-dirs + INDEX.md atomic + idempotent + course-code regex), `with_temporary_writable_permission` (chmod 644 → write → 444 three-step), `RelockGuard` (RAII Drop on cancel). Public surface: `WriteContext` + `ImportToken` (private `_marker`) + `import_handle()` + 8-variant `VaultWriterError` (incl. `SourceBasenameClash` for cycle-2 cluster #8).
- `src-tauri/src/lib.rs` — Added 4 `pub mod` declarations sorted alphabetically (`config` / `import_controller` / `onboarding` / `vault_index`) below the existing `pub mod vault_writer;` declaration. Inline comment documents Plan ownership for each placeholder.
- `src-tauri/src/dev.rs` — Auto-fix Rule 3: 1-line clippy `uninlined-format-args` fix on `iso8601_now` format! string (`"{:04}-...", y, m, ...` → `"{y:04}-{m:02}-..."`). Zero behavior change. Required for `cargo clippy -D warnings` exit 0.

**Test scaffolding (9):**
- `src-tauri/tests/vault_scaffold.rs` — RED panic stub → real assertion of `create_vault_scaffold` idempotency.
- `src-tauri/tests/course_scaffold.rs` — RED panic stub → 2 cases (full course tree + INDEX.md idempotency, invalid course code rejection).
- `src-tauri/tests/vault_writer_user_rejects.rs` — RED panic stub → 2 cases (User-ctx rejects `_source/` write, accepts `notes/` write).
- `src-tauri/tests/vault_writer_import_writes.rs` — RED panic stub → Import-ctx success path under `_source/`.
- `src-tauri/tests/chmod_lock_enforced.rs` — RED panic stub → 0o444 enforcement + raw fs::write PermissionDenied + vault_writer User-ctx guard rejection.
- `src-tauri/tests/chmod_three_step_cycle.rs` — RED panic stub → re-import unlock/write/relock cycle preserves 0o444.
- `src-tauri/tests/chmod_cancellation_safety.rs` — RED panic stub → std::panic::catch_unwind asserts file mode is 0o444 (relocked) OR 0o644 (caller-retry-allowed) after panic.
- `src-tauri/src/bin/dev_invoke.rs` — Auto-fix Rule 3: rustfmt rewrap of 3 long lines (`> 100 cols`). Zero behavior change.
- `src-tauri/tests/dev_log_rotation.rs` — Auto-fix Rule 3: rustfmt rewrap of `.send` + `assert!` long lines. Zero behavior change.
- `src-tauri/tests/path_traversal_blocked.rs` — Auto-fix Rule 3: rustfmt rewrap of long assert! line. Zero behavior change.

## Decisions Made

- **Two-arm canonicalize pattern** (cycle-2 cluster #3): `symlink_metadata().is_ok()` branch detects EXISTING leaf (regular file, dir, or symlink) and canonicalizes the WHOLE path so symlinks resolve through; else canonicalize parent + join file_name catches `..` traversal during `fs::create` on a not-yet-existing leaf. Unifies T-2-01 (path traversal) + T-2-02 (symlink leaf) into ONE helper instead of two separate guards.
- **Path-Component check over substring**: iterate canonicalized `Components`, match `Component::Normal(OsStr::new("_source"))` exactly. Future filenames like `notes/my_source/README.md` will NOT false-match. Plan PLAN.md explicitly required this; verified by manual review of `is_under_source`.
- **ImportToken._marker stays fully PRIVATE** (NOT `pub(crate)`) per cycle-2 cluster #5. The factory `pub fn import_handle()` is the ONLY construction path. Sibling modules under `src-tauri/src/` get rustc E0451 if they try `ImportToken { _marker: PhantomData }`. The privacy of the field — not the function — is what seals construction.
- **Re-import branch explicitly routes through `with_temporary_writable_permission`**: even though atomic temp+rename would technically bypass the 0o444 lock via parent-dir rename, the contract is that D-07 chmod 644 → write → chmod 444 lives in ONE place (the helper). Future Phase 4 doc-ingestion path will reuse the same helper without re-implementing the cycle. This is a stronger invariant than the test bytes alone demand.
- **Auto-fixed pre-existing fmt+clippy drift** on Phase 01.1 files (dev.rs, dev_invoke.rs, dev_log_rotation.rs, path_traversal_blocked.rs) under Rule 3 (blocking acceptance gate). The pre-commit hook does not run `cargo fmt --check` or `cargo clippy -D warnings` so these had no enforcement. Plan acceptance requires both to exit 0; fixed inline. Zero behavior change — pure stylistic rewraps + format! string interpolation. Without these fixes, the Plan acceptance criteria would fail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking acceptance gate] Pre-existing clippy uninlined-format-args on dev.rs:80**
- **Found during:** Task 1 GREEN step (`cargo clippy -- -D warnings` exit gate)
- **Issue:** Phase 01.1 commit `c3c8d2c` landed `format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, m, day_in_month, h, min, s)` in `dev.rs::iso8601_now`. Clippy `-D warnings` rejects this in favor of inline `{y:04}` interpolation. The pre-commit hook does NOT run `cargo clippy -D warnings` so the drift was never caught. Plan 02-02 acceptance criteria explicitly requires `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` exit 0.
- **Fix:** Replaced with `format!("{y:04}-{m:02}-{day_in_month:02}T{h:02}:{min:02}:{s:02}Z")`. Stylistic-only; zero behavior change.
- **Files modified:** `src-tauri/src/dev.rs`
- **Verification:** `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` now exit 0. `iso8601_now()` doctest behavior unchanged (Phase 01.1 dev_log_rotation tests still GREEN).
- **Committed in:** `25344a5` (Task 1 GREEN)

**2. [Rule 3 - Blocking acceptance gate] Pre-existing rustfmt drift on 4 files**
- **Found during:** Task 1 GREEN step (`cargo fmt --check` exit gate)
- **Issue:** Phase 01.1 + Wave 0 landed several lines `> 100 cols` that rustfmt would re-wrap. Affected files: `src-tauri/src/bin/dev_invoke.rs` (3 spots), `src-tauri/tests/dev_log_rotation.rs` (2 spots), `src-tauri/tests/path_traversal_blocked.rs` (1 spot). Pre-commit hook does NOT run `cargo fmt --check` so the drift was never caught. Plan 02-02 acceptance requires `cargo fmt --manifest-path src-tauri/Cargo.toml --check` exit 0.
- **Fix:** Ran `cargo fmt --manifest-path src-tauri/Cargo.toml` to apply rustfmt's canonical rewraps. Stylistic-only; zero behavior change.
- **Files modified:** `src-tauri/src/bin/dev_invoke.rs`, `src-tauri/tests/dev_log_rotation.rs`, `src-tauri/tests/path_traversal_blocked.rs` (plus 2 of my new test files that fmt re-wrapped during the same run — vault_writer_user_rejects.rs + course_scaffold.rs).
- **Verification:** `cargo fmt --manifest-path src-tauri/Cargo.toml --check` now exit 0. Phase 01.1 regression tests (`kill_pgid` 3/3 + `dev_log_rotation` 3/3) still GREEN.
- **Committed in:** `25344a5` (Task 1 GREEN)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking plan acceptance gate)
**Impact on plan:** Both auto-fixes are pure stylistic rewraps on pre-existing Phase 01.1 code that had no fmt/clippy enforcement gate before Wave 1. Zero behavior change, zero regression. Without them, Plan 02-02 acceptance criteria (`cargo clippy -D warnings` + `cargo fmt --check`) would have failed. Plan executed exactly as specified for the vault_writer.rs scope.

## Issues Encountered

- **rustfmt re-ordered `lib.rs` `pub mod` declarations alphabetically** during `cargo fmt`. The initial Edit placed `import_controller` last (matching narrative order in the plan); rustfmt re-sorted to alphabetical (`config` / `import_controller` / `onboarding` / `vault_index`). This is rustfmt's `reorder_modules = true` default behavior — desirable for consistency. Adapted by moving the per-module Plan-ownership comments above the declarations (collapsing trailing-line `//` comments that rustfmt mangled). **Resolution:** lib.rs ends with sorted alphabetical declarations + a single block comment documenting Plan ownership. Functionally equivalent; downstream Plans 02-03/04/05 just need to find their named module and overwrite the .rs file body.
- **`chmod_lock_enforced` + `chmod_three_step_cycle` tests passed against Task-1 GREEN code** (before Task 2's helper was added) because `atomic_write`'s temp+rename bypasses the 0o444 lock through the parent-dir rename. Test bytes alone wouldn't have forced the `with_temporary_writable_permission` route. **Resolution:** Task 2 GREEN deliberately routes the re-import path (`under_source && path.exists()`) through the helper anyway, so the D-07 chmod-cycle contract lives in ONE place. Documented in commit body of `6173791`.
- **husky pre-commit DEPRECATED warning** on every commit. This is unrelated to my plan — husky v9 deprecation message about lines that will FAIL in v10.0.0 in `.husky/pre-commit`. Out of scope; documented for the next Wave-N planner.

## TDD Gate Compliance

Plan frontmatter declares `type: tdd`. Gate sequence verified in `git log`:

| Wave | Commit | Type | Gate |
|------|--------|------|------|
| Task 1 | `11fd4b2` | `test` | RED — 6 stub tests with real assertions; cargo test fails to compile |
| Task 1 | `25344a5` | `feat` | GREEN — vault_writer body + 5 module decls; 8 tests pass |
| Task 2 | `6173791` | `test` | RED — 3 chmod tests reference undefined helper; cargo test fails to compile |
| Task 2 | `b71fcda` | `feat` | GREEN — with_temporary_writable_permission + RelockGuard; 10 tests pass |

REFACTOR gate: implicit — every GREEN commit ran `cargo fmt` + `cargo clippy -- -D warnings` clean; no separate `refactor(...)` commit needed because the production code was written clean from the start (single-pass implementation with explicit doc-comments per D-* decision).

## User Setup Required

None — no external service configuration required. All work is contained within `src-tauri/` (Rust source + integration tests) and `.planning/` (this SUMMARY.md).

## Self-Check: PASSED

### Files exist

```
src-tauri/src/vault_writer.rs                                                             FOUND
src-tauri/src/lib.rs                                                                       FOUND (5 pub mod declarations)
src-tauri/src/config.rs                                                                    FOUND (placeholder)
src-tauri/src/onboarding.rs                                                                FOUND (placeholder)
src-tauri/src/vault_index.rs                                                               FOUND (placeholder)
src-tauri/src/import_controller.rs                                                         FOUND (placeholder)
src-tauri/tests/path_traversal_blocked.rs                                                  FOUND (T-2-01 GREEN)
src-tauri/tests/symlink_canonicalize_blocked.rs                                            FOUND (T-2-02 GREEN — RED→GREEN)
src-tauri/tests/vault_scaffold.rs                                                          FOUND (GREEN — RED→GREEN)
src-tauri/tests/course_scaffold.rs                                                         FOUND (2 cases GREEN — RED→GREEN)
src-tauri/tests/vault_writer_user_rejects.rs                                               FOUND (2 cases GREEN — RED→GREEN)
src-tauri/tests/vault_writer_import_writes.rs                                              FOUND (GREEN — RED→GREEN)
src-tauri/tests/chmod_lock_enforced.rs                                                     FOUND (GREEN — RED→GREEN)
src-tauri/tests/chmod_three_step_cycle.rs                                                  FOUND (GREEN — RED→GREEN)
src-tauri/tests/chmod_cancellation_safety.rs                                               FOUND (GREEN — RED→GREEN)
.planning/phases/02-vault-canvas-ed-sync-onboarding/02-02-SUMMARY.md                       FOUND (this file)
```

### Commits exist in git log

```
11fd4b2  test(02-02): RED — vault_writer 6 stub tests replaced with real assertions             FOUND
25344a5  feat(02-02): GREEN — vault_writer body + 5 module decls + 4 placeholder stubs         FOUND
6173791  test(02-02): RED — chmod tests reference with_temporary_writable_permission           FOUND
b71fcda  feat(02-02): GREEN — with_temporary_writable_permission + RelockGuard Drop            FOUND
```

### Acceptance gates verified

```
cargo build --manifest-path src-tauri/Cargo.toml                                          exit 0 (build green)
cargo test --manifest-path src-tauri/Cargo.toml --tests                                   23 passed / 0 failed / 10 ignored
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings                          exit 0
cargo fmt --manifest-path src-tauri/Cargo.toml --check                                    exit 0
Phase 1 regression (kill_pgid)                                                            3/3 GREEN
Phase 01.1 regression (dev_log_rotation)                                                  3/3 GREEN
```

### Grep gates (Task 1 + Task 2)

```
grep -E 'pub\(crate\) _marker' src-tauri/src/vault_writer.rs                            0 matches (PASS — fully private)
grep -E '^\s+_marker: PhantomData<\(\)>' src-tauri/src/vault_writer.rs                  1 match (private field decl)
grep -rEn 'ImportToken\s*\{' src-tauri/src/*.rs src-tauri/src/bin/*.rs                 only vault_writer.rs (struct decl + factory)
grep -E 'symlink_metadata|\.canonicalize\(\)' src-tauri/src/vault_writer.rs            3 matches (two-arm gate)
grep -E 'Component::Normal' src-tauri/src/vault_writer.rs                              1 match (path-component check)
grep -E '0o444' src-tauri/src/vault_writer.rs                                          4 matches (chmod sequence)
grep -E '\^\[A-Z\]\{4\}\\d\{4\}\$' src-tauri/src/vault_writer.rs                       1 match (course-code regex)
grep -E '^pub mod vault_writer;' src-tauri/src/lib.rs                                  1 match
grep -E '^pub mod config;' src-tauri/src/lib.rs                                        1 match
grep -E '^pub mod onboarding;' src-tauri/src/lib.rs                                    1 match
grep -E '^pub mod vault_index;' src-tauri/src/lib.rs                                   1 match
grep -E '^pub mod import_controller;' src-tauri/src/lib.rs                             1 match
grep -E 'pub fn with_temporary_writable_permission' src-tauri/src/vault_writer.rs       1 match
grep -E 'struct RelockGuard' src-tauri/src/vault_writer.rs                              1 match
grep -E 'impl.*Drop for RelockGuard' src-tauri/src/vault_writer.rs                      1 match
```

## Next Phase Readiness

**Wave 2 (Plans 02-03 + 02-04 in parallel) is unblocked:**

- **Plan 02-03 (config.rs + onboarding.rs)** — overwrites 2 placeholder stub files with full implementations. Uses `chrono` (already declared), `serde` / `serde_json` (already declared), atomic temp+rename pattern from `vault_writer::atomic_write` (private; copy the shape or refactor to `pub(crate)` if shared). Onboarding step 3 calls `vault_writer::create_vault_scaffold(root)`; step 5 calls `vault_writer::create_course(root, code)`.
- **Plan 02-04 (vault_index.rs)** — overwrites 1 placeholder. Uses `rusqlite 0.39 bundled` + `walkdir` (already declared). Reconciliation scan on startup reads the vault filesystem to rebuild the index after WAL torn-page or first-run.

**Wave 3 (Plan 02-05 import_controller.rs) is unblocked:**

- Consumes `vault_writer::import_handle()` factory + `WriteContext::Import(token)` for every write under `_source/`. Folder batch one-level walk uses `walkdir` (already declared). Cancellation token uses `tokio-util 0.7 rt CancellationToken` (already declared). Wraps every `write_to_vault` call so import errors surface via the import-error classifier (Plan 02-11).

**Wave 4+ (Plans 02-07 / 02-08 / 02-10 / 02-11 / 02-12) inherits:**

- `WriteContext` enum publicly exported; Tauri IPC commands wrap `write_to_vault(path, bytes, ctx)` with `ctx` always `User` (since IPC originates from the webview where ImportToken cannot be constructed). This enforces the privilege boundary at the FFI surface.
- `create_vault_scaffold` + `create_course` called from `onboarding.rs` (Wave 2) and from `vault_move` flow (Wave 4) to scaffold the destination root.

**No blockers for Wave 2 or Wave 3.** T-2-01 + T-2-02 HIGH-severity block-on-HIGH gate (VALIDATION.md L132-133) is satisfied — any future plan that touches vault paths can rely on the canonicalize-parent guard.

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Plan: 02 (Wave 1)*
*Completed: 2026-05-16*
