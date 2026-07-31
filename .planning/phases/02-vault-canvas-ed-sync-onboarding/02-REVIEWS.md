---
phase: 2
reviewers: [gemini, codex]
reviewed_at: 2026-05-16T00:00:00Z
plans_reviewed:
  - 02-01-PLAN.md
  - 02-02-PLAN.md
  - 02-03-PLAN.md
  - 02-04-PLAN.md
  - 02-05-PLAN.md
  - 02-06-PLAN.md
  - 02-07-PLAN.md
  - 02-08-PLAN.md
  - 02-09-PLAN.md
  - 02-10-PLAN.md
  - 02-11-PLAN.md
  - 02-12-PLAN.md
gemini_model: gemini-2.5-pro
gemini_mode: plan (read-only)
codex_model: gpt-5.5
codex_strategy: per-file (12 separate invocations via argv, not stdin)
codex_commit_reviewed: a0480ca
cycle: 1
---

# Cross-AI Plan Review — Phase 2 (Vault + Canvas/Ed Sync + Onboarding)

## Gemini Review

### 1. Executive Summary
This is an exceptionally well-structured and comprehensive 12-plan set for implementing Phase 2 of the mneme project. The plans demonstrate a mature software development process, prioritizing security, testability, and incremental, de-risked delivery through a "wave" based system. The clear separation of concerns between backend Rust modules and frontend Svelte components, coupled with a rigorous TDD-first approach (starting with a "Wave 0" to establish dependencies and failing test stubs), provides high confidence that the implementation will be robust and align with the detailed specifications. The plans correctly interpret the project's scope, adhering to the "manual import only" constraint for Phase 2 and deferring more complex features. The overall risk is low, with the primary concerns being minor points of friction in the user experience that are explicitly acknowledged as acceptable for this phase.

### 2. Strengths
*   **Test-Driven Discipline:** The "Wave 0" plan (`02-01`) to establish all dependencies and failing test stubs upfront is best-in-class TDD. It ensures every subsequent feature plan has a clear, testable goal.
*   **Security-First Approach:** The plans show an excellent security posture. High-severity threats like path traversal (T-2-01) and symlink attacks (T-2-02) are identified and have dedicated, blocking tests created in the very first wave. The extension of `audit-capabilities.sh` further hardens the IPC surface.
*   **Logical Phasing (Waves):** The breakdown into waves is logical and de-risks the project. Core Rust logic (Waves 1-3) is built before the IPC bridge (Wave 4), which is then followed by the UI components (Waves 5-8). This ensures a stable foundation before the UI is wired up.
*   **Clear Traceability:** Plans consistently reference the source `SPEC`, `CONTEXT`, and `UI-SPEC` documents, including specific decision IDs (e.g., D-08, D-14), making the rationale for each implementation step clear and auditable.
*   **Proactive De-risking:** The creation of a spike-resolution document for the Tauri drag-drop API uncertainty (Plan `02-01` and `02-04`) is a proactive way to resolve technical ambiguity before it can derail implementation.

### 3. Concerns by Severity

**CONCERN [MEDIUM] — Misleading UX for Duplicate File Imports**
*   **Plan(s) affected:** 02-05, 02-11
*   **Description:** CONTEXT.md (D-08, WARN-8) states that the backend for duplicate file detection is deferred to Phase 3+, but Plan `02-11` still creates a `DuplicateResolutionDialog.svelte` component with a full UI for handling duplicates (Replace/Skip/Rename). The user will see this dialog in the component list but will never encounter it in the app. Instead, a re-import attempt will fail with a `PermissionDenied` error because the existing file is `chmod 0o444`.
*   **Why it matters:** This creates a significant gap between user expectation (a helpful dialog) and reality (a cryptic error). It introduces user friction and confusion that seems higher than the "acceptable v1 friction" described.
*   **Suggested fix:** The plan should include a small UI task in `ImportDialog.svelte` to detect a `PermissionDenied` error and show a user-friendly message, such as: "This file already exists and is write-protected. Re-importing is a feature for a future update. To replace it now, please delete the old file in your vault first." This would be more honest than a non-functional dialog component.

> **2026-05-16 update (commit `a0480ca`):** REVIEW-1 MEDIUM has been ABSORBED by the replan — `02-11-PLAN.md` removed `DuplicateResolutionDialog.svelte` from Phase 2 scope (Option 2), and added a pure-classifier `src/lib/import-error.ts` + Wave-0 `import-error-surface.test.ts` (13 cases) that drives a friendly `PermissionDenied` catch path inside `ImportDialog.svelte`. Codex cycle-1 review (below) was performed AFTER this replan, so this concern is no longer in scope.

**CONCERN [LOW] — Inconsistent Dependency Checks in Planning**
*   **Plan(s) affected:** 02-01, 02-02
*   **Description:** Plan `02-01` includes a step to check if `uuid` is already a transitive dependency before adding it, but then the action unconditionally adds it. This pattern repeats for other dependencies like `thiserror` and `regex` in subsequent plans.
*   **Why it matters:** This is a minor inconsistency in planning logic. While adding a direct dependency that is also transitive is harmless, it reflects a small lack of decisiveness in the plan itself.
*   **Suggested fix:** The plan should make a firm decision: either always add the direct dependency for clarity and version control, or perform the check and conditionally skip the addition. The former is recommended for explicitness.

**CONCERN [LOW] — Unresolved Implementation Detail for Capability Generation**
*   **Plan(s) affected:** 02-07
*   **Description:** Plan `02-07` correctly identifies that adding new IPC commands to `capabilities/default.json` might conflict with the existing `gen-capabilities.ts` script, which treats itself as the single source of truth. The plan notes this but defers the final resolution to the executor.
*   **Why it matters:** This pushes a design decision from the planning phase to the execution phase. While minor, it introduces a small amount of ambiguity for the executor.
*   **Suggested fix:** The plan should be slightly more prescriptive, recommending the executor to "refactor `gen-capabilities.ts` to append a static, non-generated block of permissions for Phase 2 commands," which is the most robust solution.

### 4. Cross-Plan Risk Assessment
*   **Dependency ordering:** The dependency flow across the 12 plans is excellent. The wave structure is respected, and the `depends_on` arrays correctly model the flow from backend logic to frontend integration. The parallel execution of plans (`02-03` and `02-04`) is correctly identified and safe.
*   **Test coverage gaps:** There appear to be no significant gaps. The "Wave 0" approach (`02-01`) of stubbing out all 24 required test files is exemplary and ensures full coverage against the `VALIDATION.md` contract. All acceptance criteria from the `SPEC` file seem to have a corresponding automated test.
*   **Security posture:** The security posture is very strong. The plans show a deep understanding of the threat model, with specific, high-priority tests for path traversal, symlink vulnerabilities, and SQL injection (`params!` enforcement). The extension of the `audit-capabilities.sh` script to guard the `import_handle()` factory is a particularly thoughtful defense-in-depth measure.
*   **Scope/over-engineering:** The plans are tightly scoped to the Phase 2 requirements. There is no evidence of over-engineering. Features explicitly out-of-scope (like the duplicate-detection backend) are correctly deferred, even if it introduces some UX friction (as noted in the MEDIUM concern). The creation of a "shell" component for `DuplicateResolutionDialog` is a good example of planning for forward-compatibility without implementing the full feature.

### 5. Overall Risk Level
**LOW.** The implementation plan is one of the most thorough and well-considered I have reviewed. It is grounded in a solid TDD methodology, prioritizes security, and demonstrates a clear understanding of the project's architecture and constraints. The identified concerns are minor and do not undermine the structural integrity of the plan.

---

## Codex Review (cycle 1 — per-file strategy, post-replan)

> **Reviewer:** `codex exec` v0.129.0 with `gpt-5.5` (the only ChatGPT-account-supported model that returns content; `gpt-5-codex` and `o3` return HTTP 400). **Strategy:** per-file (方案 C) — 12 separate `codex exec` invocations, prompt passed as positional argv (not stdin), `-o /tmp/codex-phase2-review/codex-review-PLAN-NN.txt` capturing the last-message envelope. **Root cause of prior cycle-1 codex failure:** stdin pipe truncated at 547 KB → codex silently emitted no LLM tokens. Per-file argv bypasses that path entirely (largest prompt 60 KB, well under macOS `ARG_MAX` 1 MB). **Reviewed commit:** `a0480ca` (replan that already absorbed Gemini MEDIUM + SPEC-GAP-1 + SPEC-GAP-2). **All 12/12 reviews succeeded** — see [Failed-PLAN appendix](#failed-plan-appendix) (empty this cycle).

### Codex Verdict Summary Table

| PLAN | Title (function) | HIGH | MEDIUM | LOW | Elapsed (s) |
|------|------------------|------|--------|-----|-------------|
| 02-01 | Wave-0 dependencies + failing-stub tests | 3 | 6 | 3 | 107 |
| 02-02 | vault_writer + path/symlink guards + chmod cycle | 4 | 5 | 3 | 118 |
| 02-03 | onboarding state + config persistence | 2 | 4 | 2 | 122 |
| 02-04 | vault_index (rusqlite) + reconcile + folder enumeration | 3 | 4 | 3 | 172 |
| 02-05 | import_controller (drag-drop + picker → write_to_vault loop) | 3 | 4 | 2 | 127 |
| 02-06 | Frontend vault/import state singletons + listeners | 1 | 6 | 2 | 136 |
| 02-07 | Tauri 2 IPC surface + capabilities + native menu + close drain | 3 | 6 | 5 | 201 |
| 02-08 | Onboarding route shell + Step1Welcome + Step4MCPStatus | 2 | 5 | 2 | 113 |
| 02-09 | Onboarding Step2/3/5/6 (vault picker + course adder + finish) | 2 | 4 | 2 | 226 |
| 02-10 | SettingsPanel rail + VaultCategory + ComingSoonCategory | 1 | 5 | 2 | 124 |
| 02-11 | ImportDialog + DropzoneOverlay + ReconciliationOverlay + import-error | 2 | 5 | 3 | 146 |
| 02-12 | +layout/+page integration + menu bridge + PostOnboardingBanner | 2 | 7 | 3 | 154 |
| **Total** | | **28** | **61** | **32** | **1,846 s** |

### Codex per-PLAN findings

#### 02-01 — Wave-0 dependencies + failing-stub tests

##### HIGH
- Symlink guard guidance is unsafe — Section/line: `<interfaces>` T-2-02 and Task 3 `symlink_canonicalize_blocked.rs` comments. Why blocker: `canonicalize(parent).join(file_name)` does not resolve a symlink at the leaf path, so `notes/disguise.pdf -> _source/secret.pdf` can still be written through. Fix: require Wave 1 to reject destination symlink leaves via `symlink_metadata`, canonicalize existing targets when present, and use Unix `O_NOFOLLOW`/atomic open semantics to avoid TOCTOU before writing.
- HIGH threat tests are disabled/comment-only — Section/line: `<objective>` "NOT placeholder", `must_haves.truths` T-2-01/T-2-02, Task 3 HIGH-priority files, and Task 3 acceptance `grep -l '#\[ignore' ... returns 15`. Why blocker: the block-on-HIGH gate can pass with both path traversal and symlink protections unexecuted. Fix: add minimal `vault_writer` API stubs in Wave 0 and make T-2-01/T-2-02 non-ignored, compiling, failing tests with real `matches!(err, WriteToSourceForbidden)` assertions.
- Drag-drop probe workflow can discard the required A5 resolution — Section/line: Task 4 steps 1, 4, and 5. Why blocker: the plan appends required errata on `spike/tauri-ondragdrop`, then checks out `main` and deletes the branch without a merge/apply step, so the HIGH-risk spike output may not land. Fix: run the probe without switching branches, or explicitly commit/merge/cherry-pick only `02-SPIKE-dragdrop.md` and `02-RESEARCH.md` before deleting the throwaway branch.

##### MEDIUM
- Rust test count is internally inconsistent — frontmatter/files list and Task 3 list include 16 Rust test files, but `must_haves`, Task 3 heading, verification, and success criteria repeatedly say 15; success criteria also say "14 ignored stubs + 1 path_traversal" while symlink is also HIGH. Fix: normalize every count and acceptance check to 16, or remove one named file intentionally.
- "Failing-stub" tests are actually skipped/ignored — `must_haves` requires failing stubs with `assert!(false)` / `expect.fail()`, but Task 3 uses `#[ignore]` and `describe.skip`. Fix: either change the objective to "discoverable skipped placeholders" or make the non-HIGH tests real RED stubs and update verification to run them intentionally.
- Modified-file contract is incomplete — frontmatter `files_modified` omits `.planning/dependencies.md`, `02-RESEARCH.md`, and the required `02-01-SUMMARY.md`, all of which the tasks/output mutate. Fix: add those paths to `files_modified` so execution review and downstream aggregation see the full write surface.
- Task 4 is not truly autonomous — `autonomous: true` conflicts with manual Finder/Safari drag actions and observation capture in Task 4. Fix: mark Task 4 as manual/semi-manual, split it into a separate spike plan, or replace it with an automated harness that can produce reproducible logs.
- Dialog plugin contract is under-specified for Tauri 2 capabilities — Task 1 adds `@tauri-apps/plugin-dialog`, while verification says `scripts/audit-capabilities.sh` must show no capability changes. Fix: state explicitly which downstream plan registers `tauri_plugin_dialog` and adds the needed Tauri 2 dialog permissions, or add those changes here.
- Dependency count/pinning contract drifts — Task 1 adds six Cargo deps (`rusqlite`, `tokio-util`, `chrono`, `home`, `uuid`, `walkdir`), while `<output>` says "5 cargo"; `uuid` is conditional in Task 1 but mandatory in success criteria. Fix: make `uuid` unconditional or update success criteria/output to match the conditional decision.

##### LOW
- Stale test name after drag-drop decision — `tests/datatransfer-types-discrimination.test.ts` is retained even though the plan replaces DOM `DataTransfer.types` with Tauri `payload.paths`. Fix: rename it or add a prominent compatibility comment in the test and downstream references.
- Package ordering instruction is imprecise — Task 1 says place `@tauri-apps/plugin-dialog` between `dompurify` and `katex`, which is not alphabetical with an `@tauri-apps/*` package. Fix: either remove the ordering claim or specify the project's existing package ordering rule.
- Spike sample contains unused imports — Task 2 code imports `listen` and `UnlistenFn` but does not use `listen`. Fix: remove the unused import from the canonical snippet.

##### Cross-PLAN notes
- Plan 02-02 should be checked for a real `vault_writer` API that protects both `..` traversal and symlink leaf writes with no-follow/open-time safeguards, not just parent canonicalization.
- Downstream UI/import plans should reference the spike's `start_import(paths: Vec<PathBuf>, ...)` contract and avoid reintroducing bytes-through-JS import paths unless explicitly scoped.
- The aggregator should verify whether Tauri dialog plugin registration/capabilities are owned by this plan or a later Settings/Import plan.

---

#### 02-02 — vault_writer + path/symlink guards + chmod cycle

##### HIGH
- Test crate name does not match the existing Rust library crate — Section/line: Task 1 RED test bodies use `mneme_lib::vault_writer::*`; current `src-tauri/Cargo.toml:14` has `[lib] name = "app_lib"`. Why blocker: the GREEN implementation can still never compile unless 02-01 explicitly renamed the lib crate. Fix: either change all planned tests to `app_lib::vault_writer::*`, or make the crate rename an explicit upstream 02-01 contract and update existing `app_lib` call sites.
- `chrono::Utc` is used but `chrono` is not added as a direct dependency — Section/line: Task 1 GREEN code block `use chrono::Utc`; dependency block only adds `thiserror`, `regex`, `once_cell`. Why blocker: Rust cannot import transitive crates implicitly, so `cargo build` fails. Fix: add `chrono = { version = "0.4", features = ["clock"] }` or avoid chrono and use an already-direct time source.
- Final-path symlink is not actually resolved by the specified guard — Section/line: Task 1 GREEN `is_under_source()` canonicalizes `parent` then `join(file_name)`; Task 1 test `symlink_canonicalize_blocked.rs`. Why blocker: a symlink at the final path segment remains unresolved, so T-2-02's required rejection will fail. Fix: if `path` exists, canonicalize the full path; otherwise canonicalize parent plus basename, and add an explicit `symlink_metadata(path).file_type().is_symlink()` branch for existing final-segment symlinks.
- `ImportToken` is not sealed against crate-internal construction — Section/line: interfaces block and Task 1 GREEN code use `pub(crate) _marker: PhantomData<()>`. Why blocker: any future `src-tauri/src/*.rs` module can mint `ImportToken` directly, violating the stated "ONLY via `vault_writer::import_handle()`" security contract. Fix: make `_marker` private, keep `ImportToken` public, and require all callers to obtain it from `import_handle()`.

##### MEDIUM
- Chmod error semantics contradict themselves — must_haves say inner-step errors leave the file at `0o644`, while the Drop guard section says early-return / panic / cancellation relocks to `0o444`; Task 2 test accepts either state — choose one contract and write separate tests for closure `Err`, panic, and final `set_permissions` failure.
- The re-import "chmod 644 → write → sync → chmod 444" path is not really exercised — Task 2 GREEN wraps `atomic_write(path, bytes)`, but `atomic_write` writes a temp file and renames it over the target, so chmod on the old file is not load-bearing — either write to the existing file inside `with_temporary_writable_permission` or restate the design as atomic replace plus final relock and fsync the containing directory.
- `_source` detection is a string substring check, not a vault/course path contract — Task 1 GREEN `s.contains("/_source/") || s.ends_with("/_source")` — replace with `Path::components()` segment checks, and clarify whether the API intentionally rejects any `_source` anywhere or only `<vault>/courses/<code>/_source`.
- The symlink test does not assert source-file integrity — Task 1 RED `symlink_canonicalize_blocked.rs` only checks the returned error — also assert `_source/secret.pdf` remains `orig` and the symlink path remains a symlink, so accidental overwrite/rename behavior is caught.
- `INDEX.md` atomic write does not fsync the directory after rename — Task 1 GREEN `atomic_write()` syncs the temp file then `rename`s — add directory fsync on Unix or explicitly document the accepted crash-consistency tradeoff.

##### LOW
- The final "all 8 vault_writer-family tests" command appears malformed — Task 2 acceptance uses `cargo test ... path_traversal_blocked symlink_canonicalize_blocked ...`; use `cargo test --manifest-path src-tauri/Cargo.toml --tests` or individual `--test` invocations.
- Placeholder creation uses shell `echo` despite the plan owning file edits — Task 1 GREEN placeholder loop — replace with explicit file contents in the plan or require `apply_patch`-style creation for consistency with repository editing rules.
- Test counts are inconsistent — frontmatter says "All 8 Wave-0 vault_writer tests" and later "All 10 vault_writer Wave-0 tests" while listing 9 test files with multiple cases — normalize the count by file and by test case.

##### Cross-PLAN notes
- Aggregator should verify 02-01 either renames the Rust lib crate to `mneme_lib` or 02-02 updates its test imports to the existing `app_lib`.
- Downstream 02-05 should consume `ImportToken` only through `import_handle()`; this depends on fixing the token field privacy in 02-02.

---

#### 02-03 — onboarding state + config persistence

##### HIGH
- `mneme_lib` crate path will not compile — Section/line: PLAN `must_haves.truths` and Task 2 RED test snippet use `mneme_lib::...`; current crate is `app_lib` in `src-tauri/Cargo.toml:13-15`. Why blocker: `src-tauri/tests/onboarding_complete.rs` will fail before tests run. Fix: change plan/test imports to `app_lib::onboarding` and `app_lib::config`, or explicitly include a Cargo.toml crate rename plus updates to existing `app_lib::*` callers.
- Required Rust deps are missing from the modification set — Section/line: Task 1/2 GREEN snippets use `thiserror::Error` and `chrono::Utc`; current `src-tauri/Cargo.toml:20-28` has neither, and `files_modified` omits Cargo.toml. Why blocker: both modules fail to compile. Fix: add `src-tauri/Cargo.toml` to `files_modified` and add OSS-compatible deps, e.g. `thiserror` and `chrono` with the needed clock feature, or avoid chrono consistently with an existing project timestamp helper.

##### MEDIUM
- Module registration assumption is not explicit enough — pointer: Task 1/2 notes say `pub mod config;` / `pub mod onboarding;` are "already registered in lib.rs by Plan 02", but current `src-tauri/src/lib.rs:10-13` has only `session` and debug `dev`. Fix: make 02-02's module stub contract a hard precondition, or have this plan add the `pub mod` lines when absent.
- Fixed temp path is unsafe under concurrent saves — pointer: Task 1/2 GREEN snippets use `path.with_extension("json.tmp")` for every save. Fix: use a unique temp name in the same directory, e.g. include pid/thread/random suffix, then `sync_all` and rename; keep stale-temp cleanup as a later concern.
- Atomicity tests are mostly shape checks, not crash-path tests — pointer: Task 2 `killed_midcycle_state_file_either_absent_or_valid` says it cannot SIGKILL and only verifies post-success JSON; Task 1 `save_writes_atomically_via_tmp_then_rename` only checks tmp absence. Fix: add tests that pre-create a valid canonical file plus malformed/stale tmp and assert `load_from` ignores tmp and preserves canonical state; keep grep checks for `sync_all`/tmp only as static guards.
- Verification command is invalid/misleading — pointer: `<verification>` command `cargo test --manifest-path src-tauri/Cargo.toml --lib config --lib onboarding --test onboarding_complete`. Fix: split into explicit commands or use `cargo test --manifest-path src-tauri/Cargo.toml --lib` plus `cargo test --manifest-path src-tauri/Cargo.toml --test onboarding_complete`; avoid repeating `--lib` and avoid positional filters that can hide tests.

##### LOW
- `files_modified` omits generated summary output — pointer: frontmatter `files_modified` vs `<output>` requiring `02-03-SUMMARY.md`. Fix: include the summary path or clarify summaries are workflow artifacts outside the modified-files contract.
- `save_to` accepts unsupported `Config.schema_version` — pointer: Task 1 only validates schema on `load_from`. Fix: either validate in `save_to` or document that only Rust-side constructors may call `save_to` with `CURRENT_SCHEMA_VERSION`.

##### Cross-PLAN notes
- Aggregator should verify 02-02 really creates placeholder `src-tauri/src/config.rs`, `src-tauri/src/onboarding.rs`, and matching `pub mod` exports before 02-03 runs.
- Aggregator should sanity-check crate naming across all Phase 2 plans: current repo convention is `app_lib`, while this plan's public API prose says `mneme_lib`.

---

#### 02-04 — vault_index (rusqlite) + reconcile + folder enumeration

##### HIGH
- Integration test helper is not callable — Section/line: Task 1 RED test body calls `idx.locked_conn()`, while Task 1 GREEN sketch defines `#[cfg(test)] pub(crate) fn locked_conn`. Why blocker: integration tests under `src-tauri/tests/*` compile the library without `cfg(test)` and cannot access `pub(crate)`, so `vault_index_count` will not compile. Fix: remove the helper from the integration test and open a separate `rusqlite::Connection` on `db_path` for schema/pragma assertions, or expose a real public diagnostic API.
- Reconcile will index its own DB and hidden directory contents — Section/line: Task 2 RED test sets `db_path = vault.join(".mneme/vault-index.db")`; Task 2 GREEN `WalkDir::new(vault_root)` only skips files whose own filename starts with `.`. Why blocker: WalkDir still descends into `.mneme` and `.git`, so `vault-index.db` / WAL / git internals can be inserted, breaking the stated `count_all() == 2` acceptance and polluting the file index. Fix: canonicalize `vault_root` and use `WalkDir::new(root).into_iter().filter_entry(...)` to prune `.mneme`, `.git`, and hidden directories before descent.
- Crate/dependency contract is not explicit enough to compile from this plan — Section/line: Task 1/2 RED tests import `mneme_lib::vault_index`, Task 1 GREEN imports `chrono`, `rusqlite`, `thiserror`, `walkdir`, but frontmatter `files_modified` excludes `src-tauri/Cargo.toml`. Why blocker: unless 02-02 already renamed the lib crate and added all dependencies, this plan hard-fails at compile time. Fix: either add `Cargo.toml` to this plan and update deps/imports, or state the exact 02-02 outputs this plan depends on: crate name, `pub mod vault_index`, and dependency versions/features.

##### MEDIUM
- WAL pragma coverage is under-tested — pointer: `must_haves.truths` require `synchronous=NORMAL`, `busy_timeout=5000`, `wal_autocheckpoint=1000`, and journal confirmation; Task 1 test only asserts `PRAGMA journal_mode`. Fix: add assertions for all required pragmas, preferably by querying back after `init`.
- Path containment/TOCTOU handling is incomplete — pointer: Task 2 GREEN `reconcile` checks `entry.file_type().is_file()` before `canonicalize()` and never verifies the canonical file remains under canonical `vault_root`. Fix: canonicalize the root once, skip symlinks with `symlink_metadata`, canonicalize each file, then require `canonical.starts_with(canonical_root)` before indexing.
- Folder-batch "per-file note" is not represented in the API — pointer: `must_haves.truths` says nested folders are skipped "with per-file note", but `enumerate_folder_one_level` returns only `(Vec<PathBuf>, Vec<PathBuf>)`. Fix: return a structured skipped item with a stable reason, or explicitly move note generation to Plan 05 and make this plan's contract "returns skipped subdirs for note generation."
- Reconcile idempotence test is too weak — pointer: `reconcile_is_idempotent` only compares row counts and `second.deleted == 0`. Fix: also assert `second.inserted == 0` and compare sorted `list_all_paths()` before/after.

##### LOW
- DB path wording is ambiguous — pointer: `must_haves.truths` says DB file at `<dbpath>/vault-index.db`, while `VaultIndex::init(db_path: &Path)` treats `db_path` as the full file path. Fix: standardize on either `db_dir` plus filename or `db_path` as full path.
- Verification grep is brittle — pointer: Task 1 acceptance says `grep -E 'PRIMARY KEY' ... returns 1 match`. Fix: assert schema through SQLite in tests; keep grep only as a supplemental smoke check.
- Output mentions "Wave 3" although this phase description is Wave 0 → Wave 1 → Wave 2 — pointer: `<output>` says "Wave 3 (import_controller.rs) unblocked." Fix: rename to the actual downstream plan/wave terminology.

##### Cross-PLAN notes
- Aggregator should verify 02-02 actually provides the crate name expected here, `pub mod vault_index;`, and all Rust dependencies/features required by this plan before 02-04 is executed.
- Plan 05 should consume a precise skip contract from `enumerate_folder_one_level`; otherwise the REQ-06 "per-file note" behavior may disappear between helper and UI/import-controller layers.

---

#### 02-05 — import_controller (drag-drop + picker → write_to_vault loop)

##### HIGH
- `import:done` contract loses the required final summary — Section/line: must-have lines 21, API lines 103-110, callback lines 118-128, implementation lines 479-486. Why blocker: downstream Plans 06/11 cannot derive `succeeded`, `failed`, and `cancelled` from an `ImportProgress` payload, despite this PLAN defining `ImportDoneEvent`. Fix: change the event contract to an `ImportEvent` enum or separate `emit_progress` / `emit_done` callbacks, and make tests assert `ImportDoneEvent { succeeded, failed, cancelled }`.
- Destination path construction allows course/category path traversal — Section/line: `compute_dest` lines 367-383 and threat model line 165. Why blocker: IPC-provided `course` or `category` containing `..` or path separators can escape `vault_root` before `write_to_vault` is called. Fix: validate `category` against the fixed enum, validate `course` as an existing course slug/id with no separators or `.`/`..`, and canonicalize/assert destination parent remains under the canonical vault root.
- Imports can silently overwrite existing `_source` files with the same basename — Section/line: destination uses only `src.file_name()` lines 433-435 and writes directly lines 446-449; tests only assert new-file creation lines 258-265. Why blocker: dragging two files with the same name or re-importing a file can destroy previously imported source content. Fix: define a no-clobber policy before write, either reject existing destination as per-file error or generate deterministic unique names, and add a collision test.

##### MEDIUM
- `vault_index::insert` failure is ignored while the file is reported as imported — Section/line: line 461 and success accounting lines 468-486 — fix by treating insert errors as per-file `"error"` or emitting a distinct indexed-failed status; add a test with a failing/closed index.
- Cancellation test is timing-based and can still flake — Section/line: sleeps at lines 607-612, assertion at lines 614-616, mitigation lines 703-712 — fix with deterministic synchronization, e.g. an emit callback/Notify gate or test hook that blocks after first file, then cancels before the next iteration.
- `ipc_user_rejects.rs` no longer tests the claimed IPC string-error behavior — Section/line: must-have line 23 versus direct Rust test lines 683-696 — fix either by renaming the test/claim to "vault_writer user-context rejection" or deferring a real Tauri command wrapper/string error test to Plan 07 explicitly.
- Requirement metadata is inconsistent with the plan body — Section/line: frontmatter line 12 lists `[REQ-03, REQ-13]`, while the implementation comments map to REQ-05/REQ-06/REQ-13 lines 309-311 — fix the frontmatter so the aggregator tracks drag-drop and file-picker coverage correctly.

##### LOW
- Task file list is inconsistent — Section/line: frontmatter `files_modified` lines 7-10 omits `src-tauri/src/lib.rs`, while Task 1 lists it at line 174 and verification checks it at lines 537 and 746. Fix: either add `src-tauri/src/lib.rs` to frontmatter or remove it from task scope if Plan 02 already owns it.
- `last_file_status` enum comment omits `"done"` even though implementation emits it — Section/line: API comment line 99 versus implementation line 484. Fix: avoid `"done"` in `ImportProgress` by using `ImportDoneEvent`, or update the documented status set.

##### Cross-PLAN notes
- Plan 07 must not rely only on Tauri capability validators for `course`/`category`; this controller should enforce the same validation internally.
- Plans 06 and 11 need one stable event schema for `import:progress` and `import:done`; this PLAN should publish that schema before they implement pill/history derivation.

---

#### 02-06 — Frontend vault/import state singletons + listeners

##### HIGH
- `import:done` payload contract is incompatible with upstream import-controller shape — Section/line: `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:547-567`. Why blocker: this listener requires `succeeded`, `failed`, `course`, `category`, and `failures`, but the producing plan currently does not clearly guarantee those fields, so `recent_20[0].failures` can become `undefined` and break ImportHistoryModal at runtime. Fix: make `02-06` explicitly depend on the producer plan and lock a shared `ImportDoneEvent` contract, or change the listener to consume the unified `ImportProgress` done event and synthesize safe defaults.

##### MEDIUM
- Event payloads are trusted without runtime validation — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:544-567` — fix by adding a small type guard for `ImportProgress` and `ImportDoneEvent` before mutating singleton state; invalid payloads should be ignored or converted to a safe partial-error history entry.
- Listener idempotence/HMR claim is overstated and untested — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:411`, `541-543`, `676-679` — fix by adding a `vi.mock("@tauri-apps/api/event")` test that double-calls `installImportListeners()`, and use `import.meta.hot.dispose(uninstallImportListeners)` or a `globalThis` guard if HMR safety is actually required.
- Verification commands can pass despite failing checks because failures are piped into `tail` — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:384`, `391`, `652`, `661` — fix with `set -o pipefail` or run `npx vitest ...` / `npm run check` as standalone commands before piping display output.
- `formatRecency` boundary contradicts the stated behavior — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:196`, `357-360` — fix by either changing the spec to `<60s` or implementing/test-covering `<=60s` as `"just now"`.
- `setProgress(null)` leaves `current_op_id` stale — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:535-538` — fix with `state.current_op_id = p?.operation_id ?? null` and add a unit test.
- `vaultState` shape is inconsistent with the must-have contract — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:27`, `153-163`, `597-618` — fix by either adding a derived `course_count` field/getter to the returned state shape or changing the must-have to say `courseCount()` is the public derived API.

##### LOW
- Test name claims `courseCount` is covered, but the test never imports or asserts it — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:467-472` — fix by importing `courseCount` and asserting `courseCount() === 3`.
- Objective says "Wave 3" while frontmatter says `wave: 1` — `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-06-PLAN.md:5`, `55` — fix the objective label to match the actual wave organization.

##### Cross-PLAN notes
- Aggregator should sanity-check `02-05` / `02-06` / `02-11` together: `02-06` stores `ImportHistoryEntry.failures`, and `02-11` renders `entry.failures.length`, so the backend done-event must always provide `failures: []` at minimum.

---

#### 02-07 — Tauri 2 IPC surface + capabilities + native menu + close drain

##### HIGH
- Missing IPC surface for file pickers despite being a must-have — Section/line: `.planning/.../02-07-PLAN.md` lines 21, 181-210, 654-676. Why blocker: downstream import UI invoking `open_file_picker` / `open_folder_picker` will hit an unregistered-command runtime failure. Fix: add both command signatures, invoke-handler entries in debug/release, capability allow entries, and tests/grep acceptance, or explicitly change downstream plans to use the JS dialog plugin directly and remove these commands from `must_haves`.
- `move_vault` can recursively copy the vault into itself — Section/line: lines 431-459 and 588-599. Why blocker: if `new_root` equals or is inside `old_root`, `safe_copy_vault` creates `dst` before walking `src`, risking runaway nested copies, disk exhaustion, or corrupt partial output. Fix: canonicalize/validate `src` and `dst` before copy; reject equal paths, `dst.starts_with(src)`, `src.starts_with(dst)`, and existing non-empty destinations.
- `claude_auth_check` is claimed in the threat model but absent from the command plan — Section/line: line 329 versus command list lines 92-150 and registration lines 654-676. Why blocker: Plan 09 onboarding is said to call this command, but 02-07 does not register or authorize it, producing a cross-plan IPC break. Fix: add the stub command and capability entry here, or move the claim and implementation responsibility explicitly to Plan 09.

##### MEDIUM
- `vault_move_interrupt` test is stub-only — lines 905-947 — fix by actually calling `safe_copy_vault` or `move_vault` after the partial destination setup and asserting rerun behavior, destination completion, and old-vault byte equality.
- Menu test duplicates constants instead of testing production wiring — lines 1067-1122 — fix by extracting the menu dispatch logic/constants from `lib.rs` into testable functions or adding an audit test that reads `lib.rs` and asserts the actual `with_id("preferences")` and `app.emit("menu:open-settings")` contract.
- `ConfigState` is registered but not used by `load_config` / `save_config` — lines 394-403, 483-490, 626-648 — fix by accepting `State<ConfigState>` in both commands and updating the `RwLock` on save, or remove the state holder and the "cache vault_path" claim.
- Close handling contradicts the stated `ImportController.cancel_all()` contract — lines 25 and 736-760 — fix by adding/using a public `cancel_all()` API on `ImportController`; use `window.app_handle().state(...)` for `WindowEvent` and `app.state(...)` for `RunEvent` rather than copying a `window.state(...)` snippet into both contexts.
- Capability grants `event:allow-emit` without a stated frontend need — lines 191-193 and 767-771 — fix by removing `event:allow-emit` unless a downstream plan explicitly requires frontend event emission; listening to backend events should only need listen capability.
- Destination verification does not inspect the final destination tree — lines 597-607 — fix by running `count_and_sum(&dst)` after copy and comparing source vs destination, or require destination absent/empty before starting so stale extra files cannot be indexed as migrated vault content.

##### LOW
- Requirement metadata omits REQ-11 even though vault move is central to the plan — line 16 versus lines 26 and 304-312 — fix by adding `REQ-11` or explaining why it is intentionally excluded.
- `files_modified` omits `src-tauri/Cargo.toml` even though Task 1 edits it — lines 7-14 versus lines 347-352 — fix the frontmatter so implementation tracking and summaries are complete.
- Command counts are inconsistent — lines 21, 70, 700, 1183 — fix the text to consistently say 13, 15, or whatever the final IPC surface is after resolving picker/auth commands.
- `import_handle()` audit allow-list is inconsistent about `lib.rs` — lines 221-232 versus lines 805-810 — fix the gate and prose to either allow `lib.rs` or require delegation through `import_controller.rs`.
- `_source/` detection uses string matching — lines 451-454 — fix by checking path components for an ancestor exactly equal to `_source`.

##### Cross-PLAN notes
- Aggregator should resolve one file-picker contract across Plans 07, 09, and 11: either Rust `invoke("open_file_picker")` / `invoke("open_folder_picker")`, or direct JS dialog plugin usage.
- Aggregator should verify Plan 12 listens for exactly `menu:open-settings` and does not expect `mneme:open-settings` directly from Rust.

---

#### 02-08 — Onboarding route shell + Step1Welcome + Step4MCPStatus

##### HIGH
- Fresh-install redirect can blank the app — Section/line: `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-08-PLAN.md`, `<interfaces>` Root `/+layout.svelte` snippet and Task 1 Step 4, `return; // Layout remounts`. Why blocker: SvelteKit root layouts do not remount on same-root navigation, so `ready` can stay `false` after `goto('/onboarding/1')`, leaving first-run users on a blank shell. Fix: set `ready = true` after successful `goto`, or gate only the pre-redirect render while allowing the new onboarding child route to render.
- KD-13 accent contract is contradicted by orange-token requirements — Section/line: `must_haves` "All components source tokens from tokens.css (KD-13)" plus Task 1 Step 5 / Task 2 Step 1 requiring `var(--color-orange)` and `--orange-ring`. Why blocker: KD-13 is locked as cream + olive accent, but this PLAN hard-requires orange CTAs/rail states and acceptance greps for orange. Fix: replace orange token requirements with the locked olive accent token names and update all acceptance greps accordingly.

##### MEDIUM
- The resume test is stub-only and does not test resume — pointer: Task 2 Step 3, `tests/onboarding-resume.test.ts`, comment "Direct call to mock instead of mounting Svelte component". Fix: mount `Onboarding` or a small route harness, mock `load_onboarding_state`, and assert Step 4 renders / `goto('/onboarding/4')` occurs for the root-layout path.
- Planned test imports a missing package — pointer: Task 2 Step 3 imports `render` from `vitest-browser-svelte`, but current `package.json` has no `vitest-browser-svelte` dependency. Fix: remove the unused import if staying IPC-only, or explicitly add/configure the browser test dependency.
- Adapter-static risk is not verified by acceptance — pointer: Task 1 says "Run `npm run check` and `npm run build`", but `<verify>` and acceptance only require `npm run check`. Fix: make `npm run build` an explicit verification/acceptance command, since prerender `entries()` correctness is only proven at build time.
- Step 6 placeholder can complete onboarding before required setup exists — pointer: Task 1 Step 6, Step 6 placeholder calls `complete_onboarding`; objective says steps 2/3/5/6 are placeholders until Plan 09. Fix: either block Finish until Plan 09 replaces required steps, or require backend `complete_onboarding` to reject incomplete state and test that rejection.
- "No px hardcoded" is contradicted throughout the implementation snippets — pointer: `must_haves` final truth says "NO hex / px / ms hardcoded"; snippets use `36px`, `64px`, `8px`, `10px`, `560px`, `480px`, `200px`, `44px`. Fix: define/use tokens for titlebar height, rail height, dot sizes, content widths, and CTA dimensions, or narrow the must-have to only ban raw colors/motion durations.

##### LOW
- File-count acceptance is stale — pointer: Task 1 acceptance says "5 new files exist", while the PLAN also creates `Step1Welcome.svelte`, `Step4MCPStatus.svelte`, and `tests/onboarding-resume.test.ts`. Fix: update the count or list all expected files explicitly.
- `Onboarding.svelte` duplicates the Rust/IPC state shape inline — pointer: Task 1 Step 6 `interface OnboardingState`. Fix: move the frontend state contract to a shared `$lib/types/onboarding.ts` so Plans 09+ do not drift on `vault_path`, `courses_added`, or `completed_at`.

##### Cross-PLAN notes
- Aggregator should check 02-07 exposes Tauri 2 capabilities for `load_onboarding_state`, `save_onboarding_state`, and `complete_onboarding`, and validates `current_step` server-side as 1..6.
- Aggregator should check Plan 09 removes or hardens the Step 2/3/5/6 placeholders before any "completed onboarding" path can reach the main UI with an empty vault/course state.

---

#### 02-09 — Onboarding Step2/3/5/6 (vault picker + course adder + finish)

##### HIGH
- Step3 can scaffold/save an empty vault root — Section/line: `Step3VaultPicker.svelte` snippet lines 529-532 initializes `absolutePath = ""` while `validation` starts valid, lines 534-546 fills it asynchronously, and lines 561-565 invoke `vault_create_scaffold` / `save_config` with `absolutePath`; the CTA is enabled at lines 591-593. Why blocker: a fast click or resumed Step 3 with `initialPath` set can write config/scaffold to `""` instead of default `~/StudyVault/`, violating the locked vault layout and risking writes to the app cwd. Fix: initialize `absolutePath` synchronously from `initialPath` when present, otherwise keep validation invalid/loading until `homeDir()` resolves; disable CTA unless `absolutePath` is non-empty and revalidate before invoking Rust.
- Missing frontend dependency for dialog plugin — Section/line: imports `@tauri-apps/plugin-dialog` at lines 518 and 759, but `files_modified` lines 7-17 do not include `package.json` / lockfile and Task 1/2 never installs the npm package. Why blocker: `npm run check` / Vite build will fail module resolution even if Plan 07 registered the Rust plugin. Fix: add `@tauri-apps/plugin-dialog` to frontend dependencies and include `package.json` + lockfile in `files_modified` and verification.

##### MEDIUM
- `validateVaultPath` prefix check is bypassable — Section/line: lines 125-132 and 281-292 use `trimmed.startsWith(homeDir)`, with tests only covering `/tmp` at lines 353-355. Fix: require a path-boundary match (`path === homeDir || path.startsWith(homeDir + "/")`) and add tests for `/Users/qy2/...`; for symlink escape, add/confirm a Rust-side canonicalized guard before scaffold/config persistence.
- Finish test is explicitly stub-only despite claiming relaunch coverage — Section/line: must-have line 31 says completion → relaunch skips wizard, but test lines 914-924 uses a static mock returning `completed_at: null` and only asserts `complete_onboarding` was called. Fix: make the mock stateful so post-complete `load_onboarding_state` returns non-null, or add a Rust persistence test around `onboarding::complete()` + reload.
- Capability update may drift from the generator/audit SSOT — Section/line: lines 249-255 directly edit `default.json`, and verification requires `audit-capabilities.sh` pass at lines 388 and 397. Fix: explicitly update the Plan 07 capability SSOT/generator/static snippet as well as `default.json`, or state that Plan 07 removed full-file drift checking for Phase 2 command permissions.
- Step5 skip contract is internally inconsistent — Section/line: interface says Continue is enabled when `courses_added.length >= 1 || skipPressed` at line 182, but implementation has no `skipPressed` state and disables Continue solely on `courses.length === 0` at lines 710-713. Fix: either remove `skipPressed` from the contract and keep Skip as the only skip path, or implement `skipPressed` and test it.

##### LOW
- D-18 Visual headers omit required line ranges — Section/line: D-18 requires `Visual: <bundle path> L<range>` at line 99, but component headers use only "Step N frame" at lines 419, 512, 620, and 744; acceptance lines 954-958 only greps the path. Fix: require exact `Lx-Ly` frame ranges in headers and acceptance greps.
- KD-13 token-only rule is weakened by an inline raw color exception — Section/line: must-have line 33 says KD-13 tokens only, but line 493 uses `rgba(78, 163, 107, 0.18)` and line 968 explicitly permits it. Fix: add a `--success-ring` token and use that instead of an inline RGBA.

##### Cross-PLAN notes
- Plan 11/12 should confirm `start_import` argument naming: this plan's interface says `vault_root` at line 188, while the Svelte invoke uses `vaultRoot` at line 779. That is likely correct for Tauri's JS camelCase-to-Rust snake_case mapping, but the aggregator should keep all import callers consistent.

---

#### 02-10 — SettingsPanel rail + VaultCategory + ComingSoonCategory

##### HIGH
- Deleting `SettingsModal.svelte` leaves a live import broken — Section/line: 02-10 Step 6 lines 666-674; current `src/lib/components/TitlebarMeta.svelte` imports/renders it at lines 18 and 57. Why blocker: `npm run check` cannot pass once the file is deleted while `TitlebarMeta` still imports it. Fix: either update `TitlebarMeta.svelte` in this PLAN to mount `SettingsPanel` and manage `panelOpen`, or keep a temporary compatibility `SettingsModal.svelte` wrapper until Plan 12 repoints the import.

##### MEDIUM
- Cmd+, acceptance is claimed but not actually wired to open in this PLAN — Section/line: must-have lines 22 and 26, objective line 67, implementation lines 637-643, output line 918. The implementation only dispatches `mneme:open-settings`; no listener in this PLAN flips `panelOpen`, so the 100ms "opens SettingsPanel" claim is deferred to Plan 12. Fix: either add the root listener/state wiring here, or change this PLAN's acceptance to "dispatches open-settings event" and leave the open-time acceptance to Plan 12.
- Tests are mostly duplicated-contract tests, not implementation tests — Section/line: shortcut test directly reimplements handler logic at lines 689-695; categories test duplicates the rail/copy constants at lines 722-758; vault move test calls mocked `invoke` directly at lines 841-861. Fix: mount `SettingsPanel`/`VaultCategory` with Testing Library or Svelte component tests, fire real key/click events, and assert rendered UI plus actual mocked `invoke` calls.
- Move completion contract says toast with exact "old vault preserved" outcome, but implementation renders an inline paragraph and ignores `summary.old_root_preserved` — Section/line: must-have line 29 vs implementation lines 363-371 and 415-417. Fix: either use the project toast/status pattern with the specified copy, or update the must-have to inline status; also assert `old_root_preserved === true` before showing success.
- `--color-success` is used without this PLAN adding or owning that token, and UI-SPEC reserves it outside general settings success states — Section/line: VaultCategory CSS line 489; UI-SPEC notes `--color-success` needs token addition and reserves it for onboarding validation. Fix: add the token in the owning token plan/file and update the reserved-use rule, or use an existing warm-dark/olive settings token for the move-complete status.
- Persisted `activeCategory` is trusted without validation — Section/line: `JSON.parse(raw) as CategoryKey` at line 561. A corrupted localStorage value can render a blank body and violate "all categories click/render" expectations. Fix: validate against `rail.some(r => r.key === raw)` before assignment and fall back to `"vault"` or `"general"`.

##### LOW
- `ComingSoonCategory` prop contract disagrees with the component signature — Section/line: must-have says `title` + `subline` at line 25 and interface says same at line 140, but implementation requires `phase` too at lines 173-174 and callsite lines 623-626. Fix: either fold phase into `subline`, or update the contract/tests to explicitly require `{ title, phase, subline }`.
- Backdrop is marked `aria-hidden="true"` while containing the dialog — Section/line: lines 593-595. This can hide the dialog subtree from assistive tech. Fix: remove `aria-hidden` from the backdrop; if background inerting is needed, apply it to the app shell outside the modal.

##### Cross-PLAN notes
- Plan 12 must be checked against this PLAN for the single event contract: `mneme:open-settings` needs exactly one listener that sets `panelOpen`, and the native `menu:open-settings` bridge should dispatch the same event.
- Aggregator should ensure Plan 07's `move_vault(old_root, new_root)` argument names match the frontend `{ oldRoot, newRoot }` Tauri invoke payload and that capability permissions include the dialog plugin plus all new commands.

---

#### 02-11 — ImportDialog + DropzoneOverlay + ReconciliationOverlay + import-error

##### HIGH
- DropzoneOverlay reads `payload.paths.length` on `over`, but Tauri `over` events expose position, not paths — Section/line: lines 95, 177-180, 367-369. Why blocker: a normal drag-over can throw at runtime before the user drops a file. Fix: only read `paths` for `enter`/`drop`, keep current visibility on `over`, and add a test case for `{ type: "over", position }` with no `paths`.
- ImportDialog can submit with `course: null` — Section/line: lines 463-499, 557-588, 601-604. Why blocker: Phase 2 import is course-scoped, but the UI never requires or defaults a selected course, so `start_import` can receive an invalid/non-course destination. Fix: initialize the single-course case, require an explicit course for all non-empty course lists, disable Submit until selected, and remove the undocumented "null = _inbox catch-all" path unless 02-07 explicitly supports it.

##### MEDIUM
- Cancel mid-batch is effectively unreachable — lines 24, 109, 500-517, 601-604 — fix by defining the `start_import`/`cancel_import` contract so the UI receives an `op_id` before or during the batch, keeps the dialog/status control cancellable while work is active, and verifies `cancel_import` is invoked with that live id.
- Drag-drop test is a logic copy, not a component/API test — lines 333-383, 407-412 — fix by extracting the discriminator into a shared function or mounting `DropzoneOverlay` with a mocked `onDragDropEvent`; include the real Tauri `over` shape without `paths`.
- `import-error-surface.test.ts` does not verify the ImportDialog catch path claimed by `must_haves` — lines 30, 724-787, 935 — fix by mounting `ImportDialog`, mocking `invoke("start_import")` to reject with PermissionDenied/EACCES/read-only, and asserting the inline friendly message appears while raw error text does not.
- The modal wrappers set `aria-hidden="true"` on an ancestor of the dialog content — lines 523-525 and 827-829 — fix by using the real `<dialog open>` required by lines 100 and 119, or remove `aria-hidden` from the wrapper and make any backdrop a separate hidden element.
- ReconciliationOverlay can block forever if `reconcile:done` is emitted before the listener is registered — lines 124-129, 288-303 — fix by giving the component an explicit `visible/reconciling` prop from Plan 12 or mounting/listening before invoking reconciliation, with an integration test for event ordering.

##### LOW
- `src/lib/import-error.ts` is created but omitted from `files_modified` and `artifacts` — lines 7-14 versus 645-722 — fix the frontmatter so automation/review sees the pure module.
- Wave number is inconsistent — line 5 says `wave: 7`, line 67 says "Wave 8" — fix one source of truth.
- The objective says "After this plan" drag-drop opens ImportDialog, but line 71 says Plan 12 wires the surfaces — lines 69-71 — reword to "After Plan 12" or "component contract is ready."

##### Cross-PLAN notes
- Aggregator should check Plan 12 mounts `ReconciliationOverlay` before invoking `reconcile_vault_index`, and that Plan 07's `start_import` argument schema requires a concrete course string matching the course-scoped `_source/` layout.

---

#### 02-12 — +layout/+page integration + menu bridge + PostOnboardingBanner

##### HIGH
- First-run onboarding can render blank — Section/line: Task 1 Step 2 `+layout.svelte` sample, `if (!state.completed_at && !onOnboarding) { await goto(...); return; }`. Why blocker: `ready` is never set before returning, so a fresh install redirected to `/onboarding/{step}` can keep `{@render children()}` hidden in the same root layout instance. Fix: set `ready = true` before the redirect return, or do not gate onboarding children behind `ready`.
- KD-13 visual contract is not actually enforced — Section/line: Task 3 Step 1 `PostOnboardingBanner.svelte` CSS and note about `--color-olive` fallback; `.cta { background: var(--color-orange); }`, serif/sans language, and fallback to `var(--color-warm-dark-mute)`. Why blocker: KD-13 is locked as cream `#E6E3DC` + olive accent + Fraunces/Geist, but this plan permits orange/old-token fallback and non-locked typography. Fix: require KD-13 tokens to exist, use olive for actions/accent, Fraunces/Geist token families, and fail verification if those tokens are absent instead of substituting older palette tokens.

##### MEDIUM
- `PostOnboardingBanner` placement contradicts the stated UI contract — pointer: Objective and interfaces say "under TitlebarMeta"; Task 2 appends `<PostOnboardingBanner />` after the existing template. In the current shell, `.stage` is `position: fixed; inset: 0`, so an appended sibling is not under the titlebar and may be visually covered. Fix: place the banner inside `.window`, directly after the `.titlebar` row, and adjust the grid rows to reserve banner height only when visible.
- Menu bridge test is stub-only — pointer: Task 3 Step 2 `tests/menu-bridge.test.ts` mirrors the handler body locally instead of importing/mocking `+layout.svelte` or `listen()`. Fix: factor the bridge callback into a tiny exported helper or mount the layout with a mocked `@tauri-apps/api/event.listen`, then assert the real registration uses `"menu:open-settings"` and dispatches `"mneme:open-settings"`.
- Banner tests are also stub-only — pointer: Task 3 Step 3 `tests/post-onboarding-banner.test.ts` reimplements `shouldShowBanner`, `persistDismissal`, and `openSettingsAndPersist`. Fix: mount `PostOnboardingBanner.svelte` in jsdom, set the real vault singleton/localStorage, click the actual buttons, and assert DOM visibility plus dispatched event.
- `Cmd+,` ownership is ambiguous — pointer: must_haves claim cog/Cmd+,/menu all open SettingsPanel and `+layout.svelte` installs a "cmd+, handler", but Task 1 only installs `listen("menu:open-settings")`, and Task 2 only handles Cmd+I. Fix: state whether Plan 07 native menu accelerator or Plan 10 SettingsPanel owns Cmd+, and add a test against that real owner.
- `VALIDATION.md` coverage is claimed but not planned — pointer: must_have says "All Phase 2 acceptance criteria … automated tests OR documented manual flow in VALIDATION.md"; `files_modified` and `<output>` do not include `02-VALIDATION.md`/`VALIDATION.md`. Fix: add the validation file to artifacts/tasks or remove the claim and make the manual verification rows live in the summary only.
- Titlebar sample can regress the Phase 1 chrome contract — pointer: Task 1 Step 1 full replacement snippet uses `.meta` without the current `margin-left: auto` and drops explicit `data-tauri-drag-region="false"` from the container context. Fix: make the task say to patch the existing `.titlebar-meta` structure in place and add an acceptance grep for `margin-left: auto` and `data-tauri-drag-region="false"`.
- Global Cmd+I handler is broader than the D-13 exception — pointer: Task 2 `onWindowKeydown` accepts `(e.metaKey || e.ctrlKey)` and does not ignore editable targets. Fix: on macOS, bind only `metaKey`, ignore `input`, `textarea`, and `contenteditable`, and guard `e.repeat` so the file picker cannot open repeatedly.

##### LOW
- D-18 header verification is incomplete — pointer: must_have says every modified Svelte component needs a Visual SSOT header, but acceptance checks only `TitlebarMeta` and `PostOnboardingBanner`, not `+page.svelte` or `+layout.svelte`. Fix: either scope D-18 to visual components only or add grep checks for all modified `.svelte` files.
- PostOnboardingBanner header lacks the required line range — pointer: Task 3 Step 1 header uses `/Users/qinyuan/Downloads/Mneme 3/Mneme.html (post-onboarding contextual surfaces)` instead of `L<range>`. Fix: cite the exact prototype line range or explicitly mark no prototype line exists and cite the UI-SPEC section as the SSOT.
- Verification greps are too weak for event counts — pointer: Task 2 acceptance uses `grep -E 'mneme:open-settings' ... returns 1 match`, but comments plus handlers can make this count unstable. Fix: prefer Vitest assertions for behavior and use greps only for coarse presence checks.

##### Cross-PLAN notes
- Confirm upstream 02-10 owns the SettingsPanel `mneme:open-settings` listener/open prop contract; this plan alternates between "SettingsPanel hook" and `+page.svelte` owning modal state.
- Confirm upstream 02-11 already added `@tauri-apps/plugin-dialog` and the required Tauri capabilities; 02-12 imports `@tauri-apps/plugin-dialog` but does not list package/capability changes.
- Confirm upstream import IPC remains the authoritative validator for drag/drop and file-picker paths, including symlink escape and path traversal; 02-12 forwards raw paths into `ImportDialog`.

---

### Cross-PLAN Consistency Issues (synthesized from Codex's per-PLAN cross-notes)

These are findings that touch ≥2 PLANs simultaneously; fixing them in only one PLAN leaves the contract broken. Sorted by severity of the most-severe constituent finding.

1. **[HIGH × 4] Crate-name drift between plans and current repo** — 02-02, 02-03, 02-04 all write tests against `mneme_lib::*`, but `src-tauri/Cargo.toml:14` is `[lib] name = "app_lib"`. Either (a) 02-01 adds a one-line rename in `Cargo.toml` plus a sed update of existing `app_lib::*` callers under `src-tauri/src/`, or (b) all three downstream plans switch their test imports to `app_lib::*`. The plans must pick one and align in cycle 2 — currently they appear to disagree.

2. **[HIGH × 3] `import:done` / `ImportProgress` event-schema contract is not locked** — 02-05 emits, 02-06 listens, 02-11 renders. 02-05 says it has a separate `ImportDoneEvent` struct but uses `ImportProgress` in must-haves; 02-06 requires `succeeded, failed, course, category, failures` on done; 02-11 reads `entry.failures.length`. Lock the schema (probably `ImportDoneEvent { op_id, succeeded, failed, cancelled, course, category, failures: Vec<{path, reason}> }`) in 02-05's `<interfaces>` section, then reference that one source from 02-06 and 02-11.

3. **[HIGH × 2] Final-segment symlink guard not implemented by either 02-01 or 02-02** — 02-01 declares T-2-02 as a HIGH threat test but only stubs it; 02-02 GREEN's `is_under_source()` canonicalizes `parent` then `join(file_name)`, which never resolves a symlink at the leaf. Both PLANs need to land a symlink-leaf rejection (Unix `O_NOFOLLOW` open semantics or explicit `symlink_metadata(path).file_type().is_symlink()` reject path) before T-2-02 can flip from ignored-stub to real-RED.

4. **[HIGH × 2] Destination path-traversal in import_controller and capability layer** — 02-05's `compute_dest` accepts `course` + `category` IPC arguments directly into a `Path::join`; 02-07's capability validators are not stated to reject `..` or path separators in those fields. Either 02-05 must validate before `Path::join` (and a unit test must pin it), or 02-07 must enforce regex `[a-zA-Z0-9_-]+` on `course` and an exact enum on `category` in the capability JSON. Currently both PLANs assume the other one does it.

5. **[HIGH × 2] `ready` flag-vs-redirect blank-screen bug repeats in 02-08 and 02-12** — Both `+layout.svelte` snippets set `ready=false`, `await goto('/onboarding/...')`, then `return` without ever setting `ready=true`. SvelteKit root layouts do not remount on same-root navigation. Both PLANs need: set `ready=true` after the redirect (or simpler: render children unconditionally and gate only the pre-redirect non-onboarding tree).

6. **[HIGH × 2] KD-13 visual contract violated by orange-token requirements** — 02-08 task says use `var(--color-orange)` / `--orange-ring` for CTAs and rail; 02-12 `PostOnboardingBanner` CSS does the same with a `--color-warm-dark-mute` fallback. KD-13 is locked cream + olive accent + Fraunces/Geist. The cycle-2 fix must either (a) re-introduce `--color-orange` tokens to `tokens.css` as legitimate KD-13 accent variations, or (b) sweep both PLANs to use `--color-olive` / olive-derived tokens — and the acceptance greps need to match the chosen direction.

7. **[HIGH × 1] File-picker IPC contract missing in 02-07** — 02-09 onboarding Step3 invokes `@tauri-apps/plugin-dialog` directly (no Rust command), but 02-11 ImportDialog's `start_import`/Cmd+I path is described as using `open_file_picker`/`open_folder_picker` Rust commands that 02-07 does not register. Either downstream PLANs uniformly use JS dialog plugin (and 02-07 drops the picker commands from must-haves) or 02-07 adds the two commands + capabilities. Currently a mismatch.

8. **[HIGH × 1] `move_vault` self-copy / `claude_auth_check` registration in 02-07** — 02-07 lists `move_vault` and uses it from 02-10's VaultCategory but never validates `src ⊄ dst`; and claims `claude_auth_check` is exercised by the threat model but never registers it. 02-09 Step6 says it relies on `claude_auth_check`. The two HIGHs both originate in 02-07 but break 02-09/02-10 downstream.

9. **[MEDIUM × multi] Tauri 2 dialog plugin frontend npm install + capability permissions** — 02-09 and 02-11 both `import "@tauri-apps/plugin-dialog"`; 02-01 installs it; 02-07 grants Rust-side init but the capability permission set for `dialog:*` is not enumerated. Cycle 2 should explicitly list `dialog:allow-open` (or whatever the plugin's permission key is) in 02-07's capability section and acceptance greps.

10. **[MEDIUM × multi] `mneme:open-settings` event ownership** — 02-10 dispatches; 02-12 bridges native `menu:open-settings` → `mneme:open-settings`; 02-10 also wants to listen. There must be exactly ONE listener that flips `panelOpen` and exactly ONE bridge. 02-10 and 02-12 must agree on which file owns the listener (per Codex's cross-notes, likely `+page.svelte` in 02-12).

### Failed-PLAN appendix

**None.** All 12/12 codex calls returned exit code 0 with non-trivial last-message content (3,199-5,428 bytes per PLAN, 107-226 s elapsed each). No timeouts, no truncations, no transport errors.

For the record, the operational details:
- Largest prompt was 02-12 at 59,963 bytes (well under macOS `ARG_MAX = 1,048,576 = 1 MB`).
- Smallest prompt was 02-03 at 32,384 bytes.
- Slowest review was 02-09 at 226 s (under the 300 s per-call timeout); fastest was 02-01 smoke test at 107 s.
- Total wall time across 12 sequential reviews: **1,846 s ≈ 31 minutes**.
- Aggregate output: 48,753 bytes of last-message text across all 12 reviews.

---

## Consensus Summary (Cycle 1 — Gemini + Codex)

### HIGH-Severity Concerns

Gemini found **0 HIGH**. Codex found **28 HIGH** (consolidated into **6 cross-PLAN themes** + **4 PLAN-local HIGHs** = **10 conceptual HIGH clusters**, given many HIGHs are the same architectural drift surfacing across multiple PLANs).

**Themes from Codex cross-PLAN consistency synthesis (counting each architectural concern ONCE even if it touches multiple PLANs):**

1. Crate-name drift `app_lib` vs `mneme_lib` (touches 02-02, 02-03, 02-04)
2. `import:done` event-schema contract not locked across producer/listener/renderer (02-05 / 02-06 / 02-11)
3. Final-segment symlink guard not implemented (02-01 / 02-02)
4. Destination path-traversal via IPC `course`/`category` (02-05 / 02-07)
5. `ready` flag / blank-screen redirect bug (02-08 / 02-12)
6. KD-13 visual contract violated by orange-token requirements (02-08 / 02-12)
7. File-picker IPC contract missing in 02-07 (touches 02-09 / 02-11)
8. 02-07-local HIGHs: `move_vault` self-copy + `claude_auth_check` missing registration
9. 02-09-local HIGH: Step3 can scaffold empty vault root before `homeDir()` resolves
10. 02-10-local HIGH: `SettingsModal.svelte` deletion breaks live `TitlebarMeta.svelte` import

**Verdict:** the architectural surface for cycle 2 to chew on is **~10 themes**, but the raw count of HIGH-tagged bullets across all 12 plans is **28**, because the cross-PLAN concerns are surfaced in each affected PLAN's review independently.

### MEDIUM-Severity Concerns

Gemini found **1 MEDIUM** (duplicate-import UX — now ABSORBED in commit `a0480ca`).

Codex found **61 MEDIUM** across 12 plans, ranging from test-design weakness (stub-only tests that don't exercise the claimed behavior) to test-tooling drift (`pipefail` missing, `cargo test --lib --lib` double-flag, `vitest-browser-svelte` import without dep) to spec inconsistencies (banner placement, wave numbering, REQ metadata vs PLAN body). Highest concentration: 02-12 (7 MEDIUMs from heavy integration responsibility), 02-06 + 02-07 + 02-10 (5-6 MEDIUMs each).

### LOW-Severity Concerns

Gemini found **2 LOW**. Codex found **32 LOW** — mostly file-count drift, stale comments, package ordering, doc-vs-code grep mismatches, and `files_modified` frontmatter not listing every touched file.

### Divergent Views

Most striking divergence: **Gemini rated the Phase 2 plan set "LOW risk, 0 HIGH"; Codex flagged 28 HIGHs across 10 architectural themes.** Two explanations are plausible:

1. **Calibration drift.** Gemini's HIGH bar reads as "spec/architecture-level blocker"; Codex's HIGH bar reads more like "compile-time / runtime / contract failure". Many Codex HIGHs (crate-name, missing dep, symlink leaf, blank-screen redirect) WOULD trip `npm run check` or `cargo build` or first-launch UAT — so they are real blockers, just at the implementation-fidelity layer rather than the architectural layer.
2. **Granularity.** Gemini was given ALL 12 PLANs concatenated (557 KB stdin) and produced a single 39-line review. Codex was given ONE PLAN at a time and produced 12 focused reviews totaling ~700 lines of finding text. Per-file granularity surfaces details that aggregate reviews compress away.

**Recommended posture for cycle-2 replanner:** treat Codex's 6 cross-PLAN themes + 4 PLAN-local HIGHs as the actionable cycle-2 work. Gemini's broader "LOW risk" verdict remains valid at the architectural level, but the implementation-fidelity gaps Codex found will cause downstream pain if not addressed before Wave 1 starts.

### Agreed Strengths (both reviewers)

- Wave-0 TDD discipline with explicit failing-stub gates
- Security-first posture (path-traversal, symlink, `_source/` chmod-444, IPC user-reject)
- Logical wave ordering (Rust backend → IPC → frontend)
- Strong traceability to SPEC / CONTEXT / UI-SPEC decision IDs
- Proactive drag-drop spike to de-risk Tauri 2 ambiguity (Gemini called this out; Codex implicitly accepted by not flagging it)

---

## Cycle Notes

- **Cycle:** 1 (Codex per-file aggregation appended to existing Gemini review — Gemini section preserved verbatim for traceability)
- **Codex reviewer:** `codex exec` v0.129.0 with model `gpt-5.5`
- **Strategy:** 方案 C (per-file argv). 12 separate invocations of `codex exec --skip-git-repo-check --color never -m gpt-5.5 -o /tmp/codex-phase2-review/codex-review-PLAN-NN.txt "<prompt>"`. Prompt size 32-60 KB per call (well under `ARG_MAX 1 MB`).
- **Why per-file:** the prior cycle-1 attempt fed all 12 PLANs + framing as a single 547 KB stdin pipe → codex silently exited (stdout 0 bytes, stderr only echoed the prompt, no LLM tokens emitted). Per-file argv bypasses stdin entirely.
- **Smoke test:** ran 02-01 first (49 KB prompt, 107 s, 4,872 bytes output, 3 HIGH / 6 MEDIUM / 3 LOW). Confirmed argv approach works before iterating.
- **Failure handling:** 0 failures this cycle; all 12 PLANs reviewed cleanly.
- **Driver script:** `/tmp/codex-phase2-review/review_plan.sh` (parameterized by `PLAN_DIR`, `OUT_DIR`, `MODEL`, `TIMEOUT_S`).
- **Output retention:** per-PLAN prompts saved at `/tmp/codex-phase2-review/prompt-PLAN-NN.txt`, raw responses at `/tmp/codex-phase2-review/codex-review-PLAN-NN.txt`, stderr at `*.err`. Total disk: ~1.2 MB of forensic data.
- **Reviewed commit:** `a0480ca` (already absorbed Gemini MEDIUM + SPEC-GAP-1 + SPEC-GAP-2 from the replan run on 2026-05-16).
- **Total wall time:** 31 min sequential. Future cycles could parallelize 4-6 calls (codex CLI is single-session per process, but multiple processes are fine) to cut to ~10 min, at the cost of API-credit burst rate.

### Convergence gate

Per `/gsd-plan-review-convergence 2 --codex --max-cycles 3` contract, the gate metric is **`current_high`**: the count of unresolved HIGH concerns at the end of this cycle. For cycle 1:

- **`current_high = 28`** (sum across all 12 reviewed PLANs)
- Architectural themes (deduplicated cross-PLAN): **10 clusters** — these are the conceptual fix targets for cycle 2

Cycle 2 should focus on the 10 architectural themes (most impactful fixes — each cluster touches multiple PLANs). If the next cycle reduces `current_high` to ≤ a small single-digit count with all cross-PLAN themes resolved, convergence is achieved. Otherwise run cycle 3 (the last per `--max-cycles 3`).

To continue: `/gsd-plan-review-convergence 2 --codex --max-cycles 3` should automatically trigger the replan agent on these findings, then re-invoke this codex review for cycle 2.

---

# Cycle 2 Codex Review (d4c2124)

> **Reviewer:** `codex exec` v0.129.0 with `gpt-5.5`. **Strategy:** per-file (方案 C) — same as cycle 1, 12 separate invocations via positional argv. **Reviewed commit:** `d4c2124` ("docs(02): cycle-2 replan absorbs 28 HIGH codex findings across 10 PLANs"). **Cycle-2 framing:** each prompt includes (a) Phase 2 framing, (b) the specific cycle-1 HIGH findings cited for that PLAN, (c) the FULL CURRENT cycle-2 replanned PLAN body, (d) a review contract that requires verdicts of FULLY RESOLVED / PARTIALLY RESOLVED / UNRESOLVED per cycle-1 HIGH plus NEW HIGH/MEDIUM/LOW. **All 12/12 reviews succeeded** (5 in flight in parallel, 11 with total wall time ≈ 6 minutes from launch to completion).

## Cycle-2 Verdict Summary Table

| PLAN | Cycle-1 HIGHs | FULL | PARTIAL | UNRESOLVED | NEW HIGH | Effective unresolved HIGH this cycle |
|------|---------------|------|---------|------------|----------|--------------------------------------|
| 02-01 | 3 | 1 (H2) | 1 (H1) | 1 (H3) | 1 | **3** |
| 02-02 | 4 | 2 (H3+H4) | 0 | 2 (H1+H2) | 1 | **3** |
| 02-03 | 2 | 0 | 0 | 2 (H1+H2) | 1 | **3** |
| 02-04 | 3 | 0 | 1 (H3) | 2 (H1+H2) | 0 | **3** |
| 02-05 | 3 | 0 | 3 (H1+H2+H3) | 0 | 1 | **4** |
| 02-06 | 1 | 0 | 1 (H1) | 0 | 0 | **1** |
| 02-07 | 3 | 0 | 3 (H1+H2+H3) | 0 | 3 | **6** |
| 02-08 | 2 | 1 (H2 - rejection valid) | 1 (H1) | 0 | 1 | **2** |
| 02-09 | 2 | 1 (H1) | 0 | 1 (H2) | 1 | **2** |
| 02-10 | 1 | 0 | 1 (H1) | 0 | 1 | **2** |
| 02-11 | 2 | 0 | 2 (H1+H2) | 0 | 2 | **4** |
| 02-12 | 2 | 2 (H1+H2 - rejection valid) | 0 | 0 | 1 | **1** |
| **Total** | **28** | **7** | **13** | **8** | **13** | **34** |

**Counting rules:** `current_high = PARTIAL + UNRESOLVED + NEW HIGH`. FULLY RESOLVED are EXCLUDED.

**Reading:** cycle 1 had 28 HIGH; cycle 2 RESOLVED 7 (mostly architectural fixes that the replanner correctly identified — the symlink-leaf canonicalization, the `ImportToken` sealing, the cluster #12 rejection rationale on both 02-08 + 02-12, and the Step 3 empty-vault-root fix on 02-09 + the ready-flag fix on 02-12). However, the replan also introduced **13 NEW HIGH** issues and left **8 cycle-1 HIGHs entirely UNRESOLVED** plus **13 only PARTIALLY resolved**. Net: `current_high` went from 28 → 34, an INCREASE.

The replan **made qualitative progress** on the architectural surface but **introduced new compile-blockers and contract drifts** that downstream Wave-1 execution would trip on immediately.

## Codex per-PLAN cycle-2 findings

### 02-01 — Wave-0 dependencies + failing-stub tests

#### Cycle-1 HIGH verification
- **H1 (symlink-guard): PARTIALLY RESOLVED.** Plan adds a runnable symlink test asserting `WriteToSourceForbidden` + that `_source/secret.pdf` bytes remain `orig` + that the symlink leaf remains a symlink. But implementation guidance still says `parent().canonicalize().join(file_name)` without explicit `symlink_metadata` leaf rejection / `O_NOFOLLOW` — original unsafe guidance partially alive.
- **H2 (failing-stub-not-ignored): FULLY RESOLVED.** Task 3 now requires `path_traversal_blocked.rs` and `symlink_canonicalize_blocked.rs` to be runnable tests (not `#[ignore]`d) and adds minimal `src-tauri/src/vault_writer.rs` API surface so they compile.
- **H3 (drag-drop-spike-discard): UNRESOLVED.** Task 4 still creates `spike/tauri-ondragdrop`, edits `02-SPIKE-dragdrop.md` and `02-RESEARCH.md` on that branch, then runs `git checkout main && git branch -D spike/tauri-ondragdrop`. Still no `git add`/`commit`/`cherry-pick` before deleting the throwaway branch — required errata can still be discarded.

#### NEW HIGH (cycle-2 only)
- **success_criteria contradicts the cycle-2 fix and can reintroduce H2.** `<success_criteria>` still says "15 Rust integration test files / 14 are `#[ignore]` stubs / 1 (`path_traversal_blocked.rs`) carries the full Wave-1 commented body inside the `#[ignore]` block". That directly conflicts with Task 3's corrected contract: 2 HIGH tests must be non-ignored and runnable. Success criteria are often used as the final execution gate — internal contract break.

#### NEW MEDIUM (cycle-2 only)
- `import_controller_validates_course_category.rs` claimed in cluster #7 table but absent from `files_modified`, Task 3 `<files>`, `ls` verification, and final success criteria. Plan alternates between 15, 16, and effectively 17 Rust test files.
- `files_modified` omits `src-tauri/src/vault_writer.rs` and `src-tauri/src/lib.rs` even though Task 3 adds/modifies both.

#### NEW LOW (cycle-2 only)
- Dep/test count stale prose: `<objective>` says "2 deps (rusqlite + tokio-util)" while Task 1 adds 9 Cargo deps; `<output>` says "5 cargo + 2 npm" while actual list is larger.

#### Verdict
**Not ready for Wave 1 execution.** H2 substantively fixed but H3 remains unresolved, H1 only partially resolved, and stale success_criteria can steer execution back toward ignored HIGH tests.

---

### 02-02 — vault_writer + path/symlink guards + chmod cycle

#### Cycle-1 HIGH verification
- **H1 (crate-name-drift): UNRESOLVED.** Plan still uses `mneme_lib::vault_writer::*` throughout Task 1 RED tests; current `src-tauri/Cargo.toml` still has `[lib] name = "app_lib"`. No crate rename included. Wave 1 compile blocker.
- **H2 (chrono-undeclared-dep): UNRESOLVED.** GREEN impl still imports `chrono::Utc`, plus `once_cell`, `regex`, `thiserror`. Plan says these are "added by Wave 0 / 02-01" and that this plan "does NOT touch Cargo.toml", but current `src-tauri/Cargo.toml` declares none of them.
- **H3 (symlink-leaf-not-resolved): FULLY RESOLVED.** Plan now specifies and implements two-arm canonicalization: existing paths use full `path.canonicalize()`, non-existing paths canonicalize parent and reattach filename. Symlink test asserts target bytes unchanged + symlink leaf remains a symlink.
- **H4 (ImportToken-not-sealed): FULLY RESOLVED.** Required interface and GREEN now define `ImportToken { _marker: PhantomData<()> }` with fully private field (not `pub(crate)`). Acceptance criteria grep against `pub(crate) _marker`.

#### NEW HIGH (cycle-2 only)
- **Dependency ownership contradiction blocks compile.** `files_modified` includes `src-tauri/Cargo.toml`, but Task 1 GREEN says this plan does not touch Cargo.toml and depends on 02-01 for `chrono`, `thiserror`, `regex`, `once_cell`. Since current Cargo.toml lacks those, plan cannot compile as written. Broader than H2.

#### NEW MEDIUM (cycle-2 only)
- `with_temporary_writable_permission` error-state contract internally inconsistent (Drop guard relocks on closure `Err` because `guard.disarm()` is never reached; cancellation test allows either `0o444` or `0o644`).
- Typed-marker behavior specified but not implemented (behavior says callback receives a typed marker; signature is `F: FnOnce() -> Result<...>` with no marker arg).

#### NEW LOW (cycle-2 only)
- Test count drifts: "8", "10", "All 10 vault_writer Wave-0 tests"; pasted bodies contain 11 Rust test functions.

#### Verdict
**Not ready for Wave 1 execution.** H1 and H2 remain compile blockers.

---

### 02-03 — onboarding state + config persistence

#### Cycle-1 HIGH verification
- **H1 (mneme_lib-crate-path): UNRESOLVED.** Replan still names `mneme_lib::config::load()` and `mneme_lib::onboarding::load()` in `must_haves.truths` and Task 2 RED integration test. Current Cargo.toml still declares `[lib] name = "app_lib"`.
- **H2 (missing-rust-deps): UNRESOLVED.** Replan still uses `thiserror::Error` and `chrono::Utc`, but `files_modified` does not include `src-tauri/Cargo.toml`. Current Cargo.toml has neither dep.

#### NEW HIGH (cycle-2 only)
- **Module registration ownership inconsistent and not satisfied.** Task bodies and acceptance criteria require `pub mod config;` and `pub mod onboarding;`, but frontmatter `files_modified` excludes `src-tauri/src/lib.rs`. Plan says "Plan 02 already registered them" but current `src-tauri/src/lib.rs` does not contain those declarations.

#### NEW MEDIUM/LOW
- None identified beyond the compile blockers above.

#### Verdict
**Not ready for Wave 1 execution.** Both cycle-1 HIGHs remain unresolved; module registration dependency adds another blocker.

---

### 02-04 — vault_index (rusqlite) + reconcile + folder enumeration

#### Cycle-1 HIGH verification
- **H1 (locked_conn-not-callable): UNRESOLVED.** Task 1 RED test still calls `idx.locked_conn()`; Task 1 GREEN still defines `#[cfg(test)] pub(crate) fn locked_conn`. Method unavailable to integration tests under `src-tauri/tests/*`. Compile blocker.
- **H2 (reconcile-indexes-own-db): UNRESOLVED.** Task 2 GREEN still uses `WalkDir::new(vault_root).into_iter().filter_map(Result::ok)` skipping only files whose own filename starts with `.`. Does not prune `.mneme` / `.git` directories before descent. Reconcile will still index `vault-index.db`, `vault-index.db-wal`, `vault-index.db-shm` and `.git` internals.
- **H3 (crate-dep-contract-implicit): PARTIALLY RESOLVED.** Plan now adds `depends_on: [02-02]` and notes `pub mod vault_index;` is already registered. Still missing: exact 02-02 contract for crate name + required deps; `files_modified` still excludes Cargo.toml.

#### NEW HIGH (cycle-2 only)
- None beyond unresolved cycle-1 HIGHs.

#### NEW MEDIUM (cycle-2 only)
- REQ-06 "per-file note" not specified by helper contract — `enumerate_folder_one_level(folder)` returns only `(Vec<PathBuf>, Vec<PathBuf>)`, no note payload/wording/owner.

#### NEW LOW (cycle-2 only)
- `files_modified` frontmatter omits `src-tauri/src/lib.rs` even though Task 1 acceptance requires `pub mod vault_index;` in it.

#### Verdict
**Not ready for Wave 1 execution.** H1 and H2 are compile/runtime blockers.

---

### 02-05 — import_controller (drag-drop + picker → write_to_vault loop)

#### Cycle-1 HIGH verification
- **H1 (import-done-event-schema): PARTIALLY RESOLVED.** Plan defines `ImportDoneEvent` with `succeeded`, `failed`, `cancelled`, `course`, `category`, `failures` (line 119) and GREEN emits it on `import:done` (line 578). Still incomplete: required API and test snippets still use `Fn(&str, ImportProgress)` / `Vec<(String, ImportProgress)>` (line 146, 247); implementation uses `serde_json::Value` (line 453). Tests don't assert `succeeded/failed/cancelled`.
- **H2 (course-category-traversal): PARTIALLY RESOLVED.** Category exact-enum validated, course regex validated before spawn/registration (lines 21, 428). Still incomplete: plan does not validate course is an existing vault course; `compute_dest` still joins paths without canonicalizing + asserting parent remains under canonical `vault_root` (line 403); creates missing parents (line 531), so valid-looking-but-nonexistent course can be materialized.
- **H3 (overwrite-without-collision): PARTIALLY RESOLVED.** No-overwrite policy stated (line 23); precheck `dest.exists()` (line 507). Still incomplete: `src-tauri/tests/source_basename_clash.rs` listed in frontmatter but no task body or verification command creates/runs it; non-atomic `dest.exists()` precheck; `VaultWriterError::SourceBasenameClash` variant not shown as enforced inside `vault_writer::write_to_vault`.

#### NEW HIGH (cycle-2 only)
- **Emit callback contract internally inconsistent — compile-time failure if implemented literally.** Public API + RED/Task 2 tests use `ImportProgress` callbacks (lines 146, 247, 694); GREEN requires `Fn(&str, serde_json::Value)` (line 453). Note at line 637 says to update tests, but snippets and acceptance criteria remain stale.

#### NEW MEDIUM (cycle-2 only)
- `import_controller_validates_course_category.rs` claimed cycle-2 traversal regression test (line 29), but no task content / verification command for it.
- Cancellation test still race-prone — plan says `yield_now` at line 810 + acceptance requires it at 835, but main implementation block does not include it.

#### NEW LOW (cycle-2 only)
- Stale prose at line 613 says `import:done` is "unified"/`ImportProgress`-like shape, contradicting `ImportDoneEvent` SSOT.

#### Verdict
**Not ready for Wave 1 execution.** Callback type mismatch is a direct compile blocker; H1/H2/H3 mitigations need tightening.

---

### 02-06 — Frontend vault/import state singletons + listeners

#### Cycle-1 HIGH verification
- **H1 (import-done-payload-mismatch): PARTIALLY RESOLVED.** 02-06 defines expected `ImportDoneEvent` mirror with `operation_id`, `total`, `succeeded`, `failed`, `cancelled`, `course`, `category`, non-optional `failures: ImportFailure[]` using `reason` (lines 93, 104). Listener maps `import:done` into `recordHistory()` with those fields (line 575). Test asserts `recent_20[0].failures[0].reason` (line 452). Producer 02-05 mostly matches. Remaining gap: 02-06 still declares `depends_on: [02-01]`, not 02-05, despite consuming 02-05's event contract (line 6); 02-05 still has stale contradictory note saying `import:done` reuses `ImportProgress` (line 613).

#### NEW HIGH (cycle-2 only)
- None.

#### NEW MEDIUM (cycle-2 only)
- `installImportListeners()` idempotence required in behavior, but planned test never mocks `listen()` or calls `installImportListeners()` twice.
- `courseCount()` part of required vault-state behavior; test name says it verifies course count while only asserting sorted `course_list`.

#### NEW LOW (cycle-2 only)
- Recency boundary inconsistent: behavior says `"just now"` for `≤60s` (line 207); interface comment says `<60s` (line 130); implementation uses `< 60` (line 381).

#### Verdict
**Not ready as a cross-plan contract.** 02-06 local shape mostly corrected; missing 02-05 dependency + stale producer note leaves original `import:done` contract vulnerable to implementation divergence.

---

### 02-07 — Tauri 2 IPC surface + capabilities + native menu + close drain

#### Cycle-1 HIGH verification
- **H1 (file-picker-IPC-missing): PARTIALLY RESOLVED.** Cycle-2 adds `open_file_picker` / `open_folder_picker` in `must_haves.truths`, handler registration list in Task 1 Step 4, plugin registration via `tauri_plugin_dialog::init()`, concrete command implementations. Remaining blocker: Task 2 Step 2's concrete `capabilities/default.json` snippet OMITS both commands; acceptance criteria do not grep for either. Earlier interface block includes them, but executable task text contradicts. Downstream invokes will be denied by Tauri permissions.
- **H2 (move_vault-self-copy): PARTIALLY RESOLVED.** `move_vault` now canonicalizes `src` and `dst` and rejects `canon_dst == canon_src`, `canon_dst.starts_with(canon_src)`, `canon_src.starts_with(canon_dst)`. Resolves recursive self-copy path. Remaining blocker: cycle-1 fix also required rejecting existing non-empty destinations — new plan does not do that; verification compares `src` totals to counters returned by `safe_copy_vault`, not to `count_and_sum(&dst)`, so pre-existing extra files in `new_root` are not detected.
- **H3 (claude_auth_check-missing): PARTIALLY RESOLVED.** Cycle-2 adds `claude_auth_check` command + handler registration. Stub returns boolean from `~/.claude/.credentials.json` existence. Remaining blocker: Task 2 Step 2's concrete capabilities snippet OMITS `{ "command": "claude_auth_check" }`. Top-level capabilities example includes it, but task instructions inconsistent.

#### NEW HIGH (cycle-2 only)
- **Incomplete concrete capabilities block can still break Wave 5+ IPC.** Task 2 Step 2 omits all three cycle-2 additions (`open_file_picker`, `open_folder_picker`, `claude_auth_check`) from the final `mneme:phase-2-vault` block. Runtime contract break despite earlier sections saying they are allowed.
- **Menu setup risks overwriting existing Phase 1 setup hook.** Task 3 says add new `.setup(...)` for `build_app_menu()` before existing debug/release split, while current app already has later `.setup(...)` for `~/.mneme/scratch`. Tauri builder setup hooks should be merged; otherwise menu or scratch creation may be lost.
- **Close-requested import cancellation uses private internals instead of planned API.** `must_haves` says use `ImportController.cancel_all()`, but Task 2 Step 1 directly accesses `c.registry` and `op.cancel_token`. Compile-time fault if those fields are private.

#### NEW MEDIUM (cycle-2 only)
- `vault_move_interrupt.rs` doesn't actually test `safe_copy_vault` rerun/idempotency; only manually copies one file and checks old source still exists.
- Menu test is duplicated shim, not a contract against `lib.rs` — verifies local `dispatch_menu_event()` helper, not actual `on_menu_event` closure or `build_app_menu()` item id.

#### NEW LOW (cycle-2 only)
- Command counts stale/inconsistent: "16 new" / "13 commands" / "~12" across different sections.

#### Verdict
**Not ready for Wave 1 execution.** Main architectural fixes present but capability contradictions + duplicated setup wiring + direct access to `ImportController` internals likely block compile and runtime.

---

### 02-08 — Onboarding route shell + Step1Welcome + Step4MCPStatus

#### Cycle-1 HIGH verification
- **H1 (ready-flag-blank-screen): PARTIALLY RESOLVED.** Plan correctly diagnoses and provides fixed "final snippet" setting `ready = true` before `goto(...)` (lines 186, 221). But executable Task 1 Step 4 STILL contains original broken implementation: `await goto(...)` followed by `return; // Layout remounts; ready will stay false until then` (line 393). Implementer following Task block can still ship blank-screen bug.
- **H2 (KD-13-orange-contract): FULLY RESOLVED — rejection valid.** Verified against `src/lib/styles/tokens.css` (line 27: `--color-orange: #d97757`), `.planning/threads/visual-design-system.md`, `.planning/references/design/living-visual-contract.md`. Orange IS the KD-13 main-app palette; olive is scoped to handoff/tool HTML only. Cycle-1 codex was confused about visual layers — replanner's rejection rationale is correct.

#### NEW HIGH (cycle-2 only)
- **Missing test dependency will break required Vitest run.** `tests/onboarding-resume.test.ts` imports `vitest-browser-svelte` (line 879), but `package.json` devDependencies only include Vitest/jsdom/Svelte tooling — not `vitest-browser-svelte`. Import is static, so `npx vitest run tests/onboarding-resume.test.ts` will fail module resolution before any fallback logic. Fix: remove import entirely (test doesn't use `render`), or add the dependency deliberately.

#### NEW MEDIUM (cycle-2 only)
- Resume test does not test stated resume behavior — must-have says "kill at step 4 + relaunch lands at step 4"; actual test directly calls mocked `invoke` and never mounts component or root redirect path.
- Token-only rule contradicts hardcoded dimensions — `36px`, `64px`, `8px`, `10px`, `200px`, `44px` used in multiple places.

#### NEW LOW (cycle-2 only)
- Cycle-2 fix text promises `$effect` page-store watcher, but neither fixed snippet nor task snippet implements one.

#### Verdict
**Not ready for Wave 1 execution.** KD-13 orange rejection correct, but plan still contains old blank-screen root-layout snippet in actionable task block, and new Vitest file has missing static import.

---

### 02-09 — Onboarding Step2/3/5/6 (vault picker + course adder + finish)

#### Cycle-1 HIGH verification
- **H1 (Step3-empty-vault-root): FULLY RESOLVED.** Task 2 / Step 2 — `Step3VaultPicker.svelte` initializes `absolutePath` synchronously from `initialPath`, otherwise keeps empty while `validation` starts invalid with `"Loading default location…"`. CTA disabled unless `validation.kind === "valid" && absolutePath !== ""`. `confirm()` has second guard. Directly closes fast-click path.
- **H2 (missing-dialog-npm-dep): UNRESOLVED.** Frontmatter `files_modified` still does not include `package.json` or `package-lock.json`; neither Task 1 nor Task 2 installs `@tauri-apps/plugin-dialog`. But Step 3 and Step 6 import `from "@tauri-apps/plugin-dialog"`. Local `package.json` does NOT include the dep. `npm run check` / Vite will fail module resolution.

#### NEW HIGH (cycle-2 only)
- **Step6DemoImport's own acceptance check is impossible to pass.** Plan requires `grep -E "onDragDropEvent" src/lib/components/onboarding/Step6DemoImport.svelte` returns `0` matches, but proposed Step 6 source comment contains `onDragDropEvent` multiple times. Executor copying the plan will fail BLK-3 verification even though no listener installed.

#### NEW MEDIUM (cycle-2 only)
- `onboarding-finish.test.ts` does not verify relaunch-skip behavior — must-have says "completion → relaunch skips wizard", but test uses static mock and explicitly says it cannot assert subsequent loaded state.
- Step 6 says Browse-button-only, but implementation makes entire dropzone clickable.
- `validateVaultPath` uses raw `startsWith(homeDir)` — `/Users/qy2/StudyVault` passes when `homeDir` is `/Users/qy`.

#### NEW LOW (cycle-2 only)
- `homeResolved` written but not read in Step3VaultPicker — comments describe as CTA gate, but actual gate uses `absolutePath !== ""`.

#### Verdict
**Not ready for Wave 1 execution.** H1 resolved; H2 remains a build blocker; Step 6 negative grep will fail against plan's own proposed source.

---

### 02-10 — SettingsPanel rail + VaultCategory + ComingSoonCategory

#### Cycle-1 HIGH verification
- **H1 (settingsmodal-delete-breaks-titlebarmeta): PARTIALLY RESOLVED.** Replan now correctly owns atomic delete/rewrite — `SettingsModal.svelte` and `TitlebarMeta.svelte` both in `files_modified` (lines 13-14); Task 1 explicitly includes "rewrite TitlebarMeta + delete SettingsModal" (lines 152-154); Step 6 says 02-10 owns both deletion and import rewrite. Step 6 replaces old modal with `<SettingsPanel />` (line 691) and claims SettingsPanel owns open/close via `mneme:open-settings` (lines 679-694). But Step 5 SettingsPanel contract requires `onClose` prop (lines 530-534), only renders when `panelOpen` is true (line 594), and does NOT listen for `mneme:open-settings` — only dispatches that event on Cmd+, (lines 638-643). `npm run check` still at risk because `<SettingsPanel />` omits required props; runtime opening not wired.

#### NEW HIGH (cycle-2 only)
- **SettingsPanel ownership contract internally broken — three incompatible contracts:** (1) Interface says Cmd+, uses exported `installSettingsShortcut()` (line 98); (2) Step 5 implements prop-controlled SettingsPanel with required `onClose` and external `open` state (lines 530-534); (3) Step 6 says TitlebarMeta mounts bare `<SettingsPanel />` and panel listens for `mneme:open-settings` internally (lines 690-694). Blocks Wave 1 execution.

#### NEW MEDIUM (cycle-2 only)
- Shortcut tests self-fulfilling — `cmd-comma-shortcut.test.ts` simulates handler inline instead of mounting SettingsPanel.
- Dialog wrapper sets `aria-hidden="true"` on backdrop containing `role="dialog"` subtree — hides modal from assistive tech.
- Move-flow must-have says toast appears ("Move complete — old vault preserved") but implementation only renders inline status text and logs summary.

#### NEW LOW (cycle-2 only)
- `ComingSoonCategory` prop contract drifts — interface text says `{ title, subline }`; component requires `{ title, phase, subline }`.

#### Verdict
**Not ready for Wave 1 execution.** Original deleted-import failure only partially fixed because replacement SettingsPanel mount incompatible with component's own props/open-state contract.

---

### 02-11 — ImportDialog + DropzoneOverlay + ReconciliationOverlay + import-error

#### Cycle-1 HIGH verification
- **H1 (over-event-no-paths): PARTIALLY RESOLVED.** Component snippet in Task 1 Step 1 correctly changes runtime handling: `enter` reads `paths`, `over` preserves current visibility and does not touch `payload.paths`, `leave` hides, `drop` reads paths only for callback. Addresses actual crash path. But plan still contains STALE contracts and tests: `must_haves.truths[0]` says visible on `enter/over with paths`; `<interfaces> DropzoneOverlay` says `payload.type === "enter" || "over"` plus `paths.length > 0`; `tests/datatransfer-types-discrimination.test.ts` defines `MockPayload.paths` as mandatory; `shouldShowOverlay()` reads `payload.paths.length` for `over`; no required test for `{ type: "over", position }` with no `paths`.
- **H2 (course-null-submit): PARTIALLY RESOLVED.** Single-course vaults auto-select; `submitDisabled` blocks non-`_inbox` categories when `selectedCourse === null`. Original blocker remains for default path: `selectedCategory` defaults to `_inbox`, `selectedCourse` defaults to `null` for 2+ courses, `submitDisabled` allows submission when category is `_inbox`. Submit call still sends `course: selectedCourse // null = _inbox catch-all`. Preserves cycle-1 invalid `course: null` path unless 02-07 explicitly supports it (this plan does not prove it).

#### NEW HIGH (cycle-2 only)
- **DropzoneOverlay may fail `npm run check` due to unused `@ts-expect-error`.** Snippet adds `@ts-expect-error` before `payload.paths` in `enter` and `drop` switch cases. After switch narrowing, `payload.paths` is valid in those cases (Tauri DragDropEvent is a discriminated union; `enter`/`drop` include `paths`, `over` only `position`). Directives become unused TS errors. Compile blocker.
- **ImportDialog cannot satisfy "Cancel mid-batch invokes `cancel_import`".** `currentOpId` assigned only after `await invoke<string>("start_import", ...)` returns, then `onClose()` immediately runs. During in-flight period, Cancel is disabled by `disabled={submitting && !currentOpId}`. No reachable UI state where user can cancel an active batch with an op id — breaks D-16 must-have.

#### NEW MEDIUM (cycle-2 only)
- `import-error-surface.test.ts` does not verify ImportDialog catch path — only covers pure `classifyImportError()` helper; never mounts ImportDialog, mocks `invoke("start_import")`, submits, or asserts `friendlyError` renders.
- Modal implementation diverges from `<dialog>` contract and hides dialog content from assistive tech (uses `<div role="dialog">`; backdrop has `aria-hidden="true"` while containing interactive dialog).

#### NEW LOW (cycle-2 only)
- `files_modified` omits `src/lib/import-error.ts` although Task 2 creates it.
- Frontmatter says `wave: 7`, objective says "Wave 8".
- `ImportHistoryModal.svelte` includes stray literal backtick after failure message line.

#### Verdict
**Not ready for Wave 1 execution.** H1 only partially fixed because test contract still encodes old unsafe `over.paths` shape; H2 still permits `course: null` on default `_inbox` path; new cancel-flow + likely `@ts-expect-error` compile issues.

---

### 02-12 — +layout/+page integration + menu bridge + PostOnboardingBanner

#### Cycle-1 HIGH verification
- **H1 (ready-flag-blank-screen-repeat): FULLY RESOLVED.** `+layout.svelte` snippet now sets `ready = true` before onboarding redirect and return, with explicit cluster comment (lines 331-337). Normal fallthrough also sets `ready = true` (line 365).
- **H2 (KD-13-orange-banner): FULLY RESOLVED — rejection valid.** Live app tokens define orange/cream/warm-dark and no olive token (`tokens.css:27` and Mneme.html L9-21). Replan's concrete CSS uses `border-left: 3px solid var(--color-orange)` and `.cta { background: var(--color-orange) }`. Rationale at lines 735-739 correctly rejects cycle-1 orange objection and removes undefined `--color-olive` path. Cycle-1 also surfaced an INCIDENTAL bug: original snippet referenced `var(--color-olive)` which is NOT a defined token (would render as `unset` → invisible border). Replanner fixed this by switching to actual KD-13 orange family.

#### NEW HIGH (cycle-2 only)
- **PostOnboardingBanner placement still execution-blocking.** Plan says banner must mount under TitlebarMeta in main UI, but Task 2 tells executor to "add new mounts at the END of the template" and snippet mounts `<PostOnboardingBanner />` after preserved template/overlay block (lines 443, 540). In current `+page.svelte`, `TitlebarMeta` is inside `.window`, while `.stage` is fixed and `.window` has `overflow: hidden` + two-row grid. Appending at end makes it a sibling outside app chrome, not under titlebar — likely hidden/incorrectly placed.

#### NEW MEDIUM (cycle-2 only)
- Residual "olive" wording remains in normative parts even though concrete CSS is orange (interface visual contract line 158, read-first description line 628, component header line 645, commit message line 931, success criteria line 980). Not the original H2 because actual snippet fixed, but inconsistency can mislead implementation/review.
- `post-onboarding-banner.test.ts` duplicates helper logic instead of mounting `PostOnboardingBanner.svelte`.

#### NEW LOW (cycle-2 only)
- Frontmatter truth says `+layout.svelte` installs `install_import_listeners + cmd+, handler`, but actual snippets put Cmd+I in `+page.svelte` and Cmd+, dispatch in SettingsPanel — docs drift.

#### Verdict
**Not ready for Wave 1 execution.** Cycle-1 HIGHs resolved including KD-13 orange rejection, but new banner placement issue would fail SPEC-GAP-2 in the running UI.

---

## Cross-PLAN Cycle-2 Consistency

### Cycle-1 themes — status

1. **Crate-name drift `app_lib` vs `mneme_lib` (02-02, 02-03, 02-04)** — **UNRESOLVED.** None of the three plans were updated to either rename the lib crate in 02-01/02 or switch imports to `app_lib::*`. All three still write tests against `mneme_lib::*`. Compile blocker across the Wave-1 Rust pipeline.

2. **`import:done` event-schema contract not locked (02-05, 02-06, 02-11)** — **PARTIALLY RESOLVED.** 02-05 now defines `ImportDoneEvent` and 02-06 mirrors it with matching fields. But 02-05 still has a stale `ImportProgress`-like note (line 613); 02-06's `depends_on` lists `[02-01]` not `[02-05]`; 02-11 still uses `entry.failures` without confirming non-optional schema. Producer callback signature in 02-05 uses `serde_json::Value` while public API uses `ImportProgress` — internal contradiction.

3. **Final-segment symlink guard (02-01, 02-02)** — **RESOLVED in 02-02 (H3 FULL); PARTIALLY in 02-01.** 02-02 added two-arm canonicalization; 02-01 added runnable test but implementation guidance still references the unsafe `parent.canonicalize().join(file_name)` pattern.

4. **Destination path-traversal via IPC `course`/`category` (02-05, 02-07)** — **PARTIALLY RESOLVED.** Validation added at 02-05 entry points + 02-07 regex capability, but 02-05's `compute_dest` still doesn't canonicalize + assert parent stays under canonical `vault_root`. `course` not verified against existing vault course list.

5. **`ready` flag / blank-screen redirect bug (02-08, 02-12)** — **RESOLVED in 02-12 (H1 FULL); PARTIALLY in 02-08.** 02-12 set `ready = true` before redirect; 02-08 added a "final snippet" with the fix but left old buggy snippet in the actionable Task 1 Step 4 body — implementer following Task block ships the bug.

6. **KD-13 visual contract orange-vs-olive (02-08, 02-12)** — **RESOLVED with rejection valid.** Codex cycle-1 misinterpreted KD-13 visual layers. Replanner correctly identified that `--color-orange: #d97757` IS the canonical KD-13 main-app palette per `tokens.css:27` + `Mneme.html L9-21`; olive belongs to handoff/tool HTML living-visual-contract only. Cycle-2 codex independently verified the rejection and confirmed it. INCIDENTAL bug fix: 02-12 originally referenced `var(--color-olive)` (undefined token → invisible border); replanner replaced with `var(--color-orange)`. Some prose in 02-12 still mentions "olive-accent" — should be cleaned up but not a HIGH issue.

7. **File-picker IPC contract missing in 02-07** — **PARTIALLY RESOLVED.** Commands added to interface block + Task 1 handler list + plugin init, but Task 2 Step 2's concrete `capabilities/default.json` snippet OMITS the two picker commands AND `claude_auth_check`. Acceptance criteria do not grep for them. Runtime IPC denial when executor follows Task 2.

8. **02-07-local: `move_vault` self-copy + `claude_auth_check` registration** — **PARTIALLY RESOLVED.** Self-copy guard added (canonicalize + reject equal/prefix paths); claude_auth_check stub added. Still missing: reject non-empty destinations; destination tree verification via `count_and_sum`; capability JSON missing all three new commands.

9. **02-09-local: Step3 can scaffold empty vault root** — **FULLY RESOLVED.** Sync init from `initialPath`, async fallback, CTA disabled until valid+non-empty, second guard in `confirm()`. Clean fix.

10. **02-10-local: SettingsModal deletion breaks TitlebarMeta import** — **PARTIALLY RESOLVED.** 02-10 now owns the rewrite, but the replacement `<SettingsPanel />` is bare-mounted while the component requires `onClose` + external `open` state — three incompatible contracts for who owns `panelOpen`.

### New cross-cutting issues introduced by cycle-2

A. **Cargo.toml ownership ambiguity (02-01, 02-02, 02-03, 02-04).** Multiple plans say "deps added by 02-01" but 02-01's `files_modified` does not enumerate the dependency set, and Cargo.toml mutations are scattered across 4 plans without a single SSOT contract. Pre-Wave 1, the executor will not know which plan owns adding `chrono`, `thiserror`, `regex`, `once_cell`, `rusqlite`, `walkdir`, `home`, `uuid`, `tokio-util`.

B. **Capabilities JSON omits cycle-2 additions (02-07).** Three commands (`open_file_picker`, `open_folder_picker`, `claude_auth_check`) are added in interface / handler list / plugin init but NOT in the actual concrete `capabilities/default.json` snippet that the executor will copy. Downstream Plans 09/11 will hit IPC permission denial.

C. **Test files claimed in frontmatter but absent from tasks (02-01, 02-05).** `import_controller_validates_course_category.rs` referenced in both plans but has no task body / verification command in either.

D. **Frontend `vitest-browser-svelte` dep missing (02-08).** Test imports it but `package.json` doesn't declare it.

E. **Frontend `@tauri-apps/plugin-dialog` dep missing (02-09).** Same shape as D — `import { open } from "@tauri-apps/plugin-dialog"` but neither plan installs it.

F. **SettingsPanel ownership tri-conflict (02-10).** Interface, Step 5, Step 6 each describe a different owner for `panelOpen`. Same root cause as cycle-1 H1 for 02-10 — replan didn't pick a single contract.

## Cluster #12 verdict — independent assessment

The replanner's rejection of cluster #12 is **CORRECT** and supported by three independent sources:

1. `src/lib/styles/tokens.css:27` defines `--color-orange: #d97757` as a KD-13 token sourced from "Mneme.html L9-21". `tokens.css` has NO `--color-olive` token defined at all. There is no `--color-success`. Olive does not exist as a main-app token.

2. `.planning/threads/visual-design-system.md` and `.planning/references/design/living-visual-contract.md` explicitly scope olive `#6B6E3D` to the **handoff/tool HTML "analyst view"** documents, NOT the main app UI. The Living visual contract document explicitly says (line 10 paraphrase): "Living (cream/olive) 和 KD-13 的视觉差异是有意保留的 — 工具型 HTML 给'分析者视角'，主 App UI 给'学习者视角'(暖、亲、聚焦学习)".

3. `Mneme.html L9-21` (the locked 2026-05-15 visual SSOT bundle) defines the canonical token registry. The line range Mneme.html L9-21 in the bundle confirms orange + cream + warm-dark + alpha-borders as the main-app palette.

**Codex cycle-1 was confused** about which visual layer KD-13 binds to. The cycle-1 finding correctly identified that the PLANs use `var(--color-orange)` for CTAs and rail-active state, but incorrectly assumed KD-13 forbids orange. In reality, KD-13 IS the orange/cream/warm-dark palette; olive is a deliberately-separate aesthetic for tooling/handoff documents.

**Incidental bug** the replanner fixed in 02-12: the original snippet had `border-left: 3px solid var(--color-olive);` with a fallback to `var(--color-warm-dark-mute)`. Since `--color-olive` is NOT a defined token, the `border-left` would have rendered as `unset` (invisible border). Replanner replaced this with `var(--color-orange)` (the actual KD-13 accent). Good cycle-2 catch.

**Cycle-2 residual issue** (now flagged as MEDIUM not HIGH): 02-12 prose at lines 158, 626, 628, 645, 931, 980 still mentions "olive-accent" even though the actual CSS is orange. This is docs/code drift and should be cleaned up, but it does NOT regress the visual contract.

**Therefore the cycle-1 HIGHs from cluster #12 are EXCLUDED from `current_high`** (i.e., 02-08 H2 and 02-12 H2 are correctly counted as FULLY RESOLVED).

## Convergence gate — cycle 2

- **`current_high = 34`** (PARTIAL + UNRESOLVED + NEW HIGH across all 12 reviewed PLANs)
- Cycle 1 was 28. Cycle 2 went UP by 6 HIGH. The replan made architectural progress (7 FULLY RESOLVED) but introduced 13 NEW HIGH compile-blockers, contract drifts, and impossible-to-pass verification gates.
- **Per `--max-cycles 3`: cycle 3 should be triggered** since cycle 2 has not converged.

### Cycle-3 priority targets (ranked by impact)

1. **PICK ONE crate name for Rust lib.** Either rename `app_lib` → `mneme_lib` in 02-01 with sed across `src-tauri/src/*` callers, OR change all `mneme_lib::*` imports in 02-02/02-03/02-04 to `app_lib::*`. **Highest-leverage fix** — unblocks 5 PLANs at compile time.

2. **PICK ONE Cargo.toml ownership SSOT.** Have 02-01 enumerate every cargo dep added (`chrono`, `thiserror`, `regex`, `once_cell`, `rusqlite`, `walkdir`, `home`, `uuid`, `tokio-util`) with version + features. Downstream plans depend on this single contract.

3. **PICK ONE SettingsPanel ownership contract.** Either internally-stateful (listens for `mneme:open-settings`) OR prop-controlled (`open` + `onClose` from parent). Apply consistently across interface / Step 5 / Step 6 in 02-10.

4. **PICK ONE ImportEvent callback type.** 02-05's GREEN signature is `Fn(&str, serde_json::Value)`; public API is `ImportProgress`. Pick one — likely the typed one — and update all snippets + tests.

5. **FIX capabilities/default.json snippet (02-07).** Add `open_file_picker`, `open_folder_picker`, `claude_auth_check` to the concrete JSON block in Task 2 Step 2 + add acceptance greps.

6. **FIX npm deps.** Add `@tauri-apps/plugin-dialog` to `package.json` in 02-01 or 02-09; remove or add `vitest-browser-svelte` import in 02-08.

7. **FIX Task 1 Step 4 snippet in 02-08** to match the "final snippet" — set `ready = true` before `goto`. Don't leave the broken version in the actionable body.

8. **FIX 02-12 banner placement** — insert inside `.window` immediately after titlebar, not at end of template.

9. **FIX 02-04 integration test** — replace `idx.locked_conn()` with `rusqlite::Connection::open(&db_path)` or expose a public diagnostic API. Add `filter_entry` to prune `.mneme` / `.git`.

10. **FIX 02-01 Task 4 drag-drop spike workflow** — cherry-pick `02-SPIKE-dragdrop.md` + `02-RESEARCH.md` to main BEFORE deleting throwaway branch, OR run the spike on main directly.

11. **FIX 02-07 menu setup hook** — merge into existing `.setup(...)` closure rather than adding a second one.

12. **FIX 02-07 close-requested cancellation** — use public `ImportController::cancel_all()` not private `c.registry` / `op.cancel_token`.

If cycle 3 addresses items 1-5 (the cross-PLAN compile/contract blockers) at minimum, `current_high` should drop to ≤ 10 and convergence is achievable. Items 6-12 are PLAN-local fixes that the replanner can address in the same cycle.

## Cycle Notes

- **Cycle:** 2 (cycle-1 HIGHs verified against d4c2124 cycle-2 replan)
- **Codex reviewer:** `codex exec` v0.129.0 with model `gpt-5.5`
- **Strategy:** 方案 C (per-file argv). 12 separate invocations of `codex exec --skip-git-repo-check --color never -m gpt-5.5 -o /tmp/codex-phase2-review-c2/codex-c2-review-PLAN-NN.txt "<prompt>"`. Prompt size 32-64 KB per call (largest 02-07 at 63.6 KB).
- **Smoke test:** 02-01 first (49.6 KB prompt, 121 s, 3.9 KB output). Confirmed argv approach still works.
- **Parallelism:** 11 sequential cycle-1 calls took 31 min; cycle 2 ran 11 in parallel waves of 4-4-3, total wall time ≈ 6 min from launch of first parallel batch to last completion.
- **Failure handling:** 0 failures this cycle; all 12 PLANs reviewed cleanly (output bytes 2.2 KB - 5.6 KB per PLAN, exit code 0 throughout).
- **Driver script:** `/tmp/codex-phase2-review-c2/review_plan_c2.sh` (parameterized by `NN`).
- **Output retention:** per-PLAN prompts saved at `/tmp/codex-phase2-review-c2/prompt-PLAN-NN.txt`, raw responses at `/tmp/codex-phase2-review-c2/codex-c2-review-PLAN-NN.txt`, stderr at `*.err`. Total disk: ~1.5 MB of forensic data.
- **Reviewed commit:** `d4c2124` (cycle-2 replan that claimed to absorb 28 HIGH).
- **Independent KD-13 verification:** read `src/lib/styles/tokens.css`, `.planning/threads/visual-design-system.md`, `.planning/references/design/living-visual-contract.md`, and confirmed Mneme.html L9-21 SSOT. Cluster #12 rejection is valid.

### Convergence gate — cycle 2 final

- **`current_high = 34`** (was 28 at cycle 1)
- The replan was net-NEGATIVE on the gate metric — fewer fully-resolved than NEW HIGHs introduced.
- Per `--max-cycles 3`: cycle 3 is REQUIRED unless the cross-PLAN compile blockers (items 1-5 in cycle-3 priorities above) are addressed.

