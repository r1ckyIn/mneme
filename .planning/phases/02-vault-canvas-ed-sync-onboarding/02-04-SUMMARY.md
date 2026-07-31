---
phase: 02-vault-canvas-ed-sync-onboarding
plan: 04
subsystem: infra
tags:
  - tdd
  - wave-2
  - rust
  - vault-index
  - rusqlite
  - wal
  - walkdir
  - reconciliation
  - chrono
  - sqlite-injection

# Dependency graph
requires:
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 02
    provides: Wave-1 placeholder src-tauri/src/vault_index.rs stub + lib.rs `pub mod vault_index;` registration + 9 cargo deps (rusqlite 0.39 bundled / walkdir 2 / chrono 0.4 / thiserror 1) + Wave-0 #[ignore] test stubs at vault_index_count.rs + reconcile_lazy_delete.rs + folder_batch_one_level.rs
  - phase: 02-vault-canvas-ed-sync-onboarding
    plan: 01
    provides: rusqlite + walkdir Cargo entries + mneme_lib crate rename + Wave-0 failing-stub test scaffold

provides:
  - vault_index.rs full body — rusqlite-backed file index (WAL + schema + CRUD + reconcile + folder-batch helper)
  - Public surface — `VaultIndex { conn: Mutex<Connection> }` + `VaultFileRow` + `ReconcileSummary` + `VaultIndexError` (thiserror 3-variant Sqlite/Io/Walk wrapper)
  - WAL pragma stack applied at open in canonical order (journal_mode=WAL → synchronous=NORMAL → busy_timeout=5000 → wal_autocheckpoint=1000)
  - Idempotent schema (`CREATE TABLE IF NOT EXISTS vault_files (path TEXT PRIMARY KEY, course, kind, size_bytes, mtime_iso, indexed_at_iso) + CREATE INDEX vault_files_course_idx`)
  - CRUD methods using `params![]` macro exclusively (T-2-07 SQL injection mitigation grep-gate satisfied: `format!.*(SELECT|INSERT|UPDATE|DELETE)` returns 0 matches)
  - `reconcile(vault_root)` — walkdir-based scan with `filter_entry` pruning hidden directories before descent (cycle-3 #9). Inserts rows for un-indexed on-disk files; lazy-deletes rows for paths no longer on disk. Canonicalizes each path (resolves macOS `/var → /private/var` symlinks). Idempotent across re-runs.
  - `enumerate_folder_one_level(folder)` — REQ-06 single-level folder batch helper. Returns `(files_at_depth_1, skipped_subdirs)` tuple; hidden files (`.DS_Store`) excluded from both vectors; symlinks silently skipped.
  - Helpers `classify_kind(path, vault_root)` + `extract_course(path, vault_root)` + `now_iso()` — consumed by reconcile and (in Wave 3) by Plan 05 import_controller.rs
  - 9 plan-owned integration test cases GREEN across 3 test files (vault_index_count 5 cases + reconcile_lazy_delete 2 cases + folder_batch_one_level 2 cases) — turns 3 Wave-0 #[ignore] panic! stubs into real assertions then GREENs them

affects:
  - Plan 02-05 (import_controller.rs — Wave 3): consumes `enumerate_folder_one_level` for folder batch import flow; calls `classify_kind` + `extract_course` per-imported-file; emits `import:progress` events after each `VaultIndex::insert`
  - Plan 02-07 (Tauri IPC wiring — Wave 4): wraps `VaultIndex::list_courses` / `list_all_paths` / `count_all` / `reconcile` behind `invoke()` commands consumed by `ImportDialog` adaptive course-picker (D-10) + Settings VaultCategory display
  - Plan 02-10 (SettingsPanel — Wave 7): Settings → Vault category reads `count_all()` + `list_courses()` for the vault stats display
  - Plan 02-11 (ImportDialog adaptive picker — Wave 7): reads `list_courses()` count to decide between radio / dropdown / typeahead UX (D-10)
  - Phase 3 (Cmd+P fuzzy search): consumes `vault_files` table directly — schema is the cross-phase data contract
  - Phase 4 (doc ingestion: Marker / markitdown subprocess output → `_source/*.md`): each converted file gets indexed via `VaultIndex::insert` at the same trust boundary
  - Phase 7 (KG + memory): `_system/memory/*.md` writes are indexed via the same reconcile path; classify_kind returns `_system` for that subtree

# Tech tracking
tech-stack:
  added:
    - "No new cargo deps — consumed Wave-1 deps (rusqlite 0.39 bundled + walkdir 2 + chrono 0.4 + thiserror 1 + std::sync::Mutex)"
  patterns:
    - "WAL pragma stack at open — canonical order (journal_mode → synchronous=NORMAL → busy_timeout → wal_autocheckpoint) applied via pragma_update in init(). Reusable for any future SQLite consumer (Phase 7 memory store, Phase 10 FSRS history)."
    - "std::sync::Mutex<Connection> wrapping per Pitfall 11 — rusqlite Connection is !Send on some configs. Pure-sync CRUD blocks never cross .await boundaries so std::sync::Mutex is correct (not tokio::sync::Mutex). Phase 1 WR-01 poisoned-mutex tolerance pattern (`unwrap_or_else(|p| p.into_inner())`) carried forward."
    - "Private locked_conn discipline (cycle-3 #9) — integration tests under src-tauri/tests/ cannot reach pub(crate). The fix pattern: open a SECOND rusqlite::Connection::open(&db_path) inside the test for read-only schema introspection; SQLite WAL multi-conn reads are safe. Keeps the internal Mutex<Connection> fully private without weakening the privacy boundary for testing."
    - "Two-pass reconcile pattern — pass 1 walks disk + inserts missing; pass 2 deletes indexed paths NOT in the on-disk canonical set. Idempotent across re-runs. Plan 05 import_controller can append a third pass (per-import notify) without touching the algorithm."
    - "walkdir filter_entry with depth-aware hidden prune — `e.depth() > 0 && e.file_name().starts_with('.')`. The depth() == 0 exemption is load-bearing: macOS tempfile::tempdir() returns dirs prefixed `.tmpXXX` which would otherwise prune the entire walk root. Reusable for any future on-disk scan helper."
    - "INSERT OR REPLACE for idempotent reconcile inserts — re-indexing the same path during a follow-up reconcile pass after mtime/size change is a no-op SQL-wise. This is the right semantics for D-14 startup reconciliation."
    - "T-2-07 SQL injection grep-gate — `! grep -nE 'format!.*(SELECT|INSERT|UPDATE|DELETE)' src-tauri/src/vault_index.rs`. Reusable as a pre-commit hook addition (deferred — Husky pre-commit currently runs audit-capabilities.sh only). All future SQLite consumers MUST honor this gate."
    - "Canonicalize-on-walk pattern — every path returned by walkdir is canonicalized before insert so stored paths are stable across /var ↔ /private/var symlink aliases. Lazy-delete pass naturally prunes any stale non-canonical rows left behind from earlier inserts. Plan 05 import_controller will reuse this when writing import-controller-originated rows."

key-files:
  created:
    - ".planning/phases/02-vault-canvas-ed-sync-onboarding/02-04-SUMMARY.md (this file)"
  modified:
    - "src-tauri/src/vault_index.rs (Wave-1 placeholder body OVERWRITTEN with full ~430-LOC rusqlite implementation: VaultIndex + VaultFileRow + ReconcileSummary + VaultIndexError + init/insert/get/delete/count_all/list_courses/list_all_paths/reconcile + classify_kind/extract_course/now_iso/enumerate_folder_one_level)"
    - "src-tauri/tests/vault_index_count.rs (Wave-0 #[ignore] panic! stub REPLACED with 5 real test cases — schema/pragma proof via SECOND rusqlite::Connection / CRUD round-trip / 5-insert+1MB / list_courses NULL-skip / idempotent re-init)"
    - "src-tauri/tests/reconcile_lazy_delete.rs (Wave-0 #[ignore] panic! stub REPLACED with 2 real test cases — ghost-row delete / reconcile idempotency)"
    - "src-tauri/tests/folder_batch_one_level.rs (Wave-0 #[ignore] panic! stub REPLACED with 2 real test cases — top-level files vs skipped subdirs / hidden-file skip)"

key-decisions:
  - "std::sync::Mutex<Connection> over tokio::sync::Mutex — explicit per RESEARCH Pitfall 11 + PLAN.md <interfaces> lock. rusqlite is sync-only; pure-sync CRUD blocks never cross .await boundaries so std::sync::Mutex is correct. Tauri State<T> requires Sync which Mutex<Connection> provides."
  - "Private locked_conn (cycle-3 priority #9) — NOT exposed even as pub(crate). Integration tests under src-tauri/tests/ open a SECOND rusqlite::Connection::open(&db_path) for read-only schema introspection. SQLite WAL multi-conn reads are safe; this keeps the internal Mutex<Connection> fully private without a backdoor for tests."
  - "walkdir filter_entry depth() == 0 exemption — the walk root is ALWAYS exempt from the hidden-prefix check. Root cause: macOS tempfile::tempdir() uses `.tmpXXX` prefix by default; without the exemption, every test calling reconcile against a tempdir vault would prune the entire walk. This also tolerates real-world user-chosen vault paths that happen to resolve under a hidden ancestor (e.g. Library/Containers/.../.appdata/StudyVault) — the user explicitly pointed at the vault root, so trust the choice. Per-file '.'-prefix guard inside the loop is defense-in-depth for orphan dotfiles at depth 1+."
  - "Canonicalize every on-disk path before insert — resolves macOS /var → /private/var symlinks. Stored paths are stable; reconcile lazy-delete pass naturally prunes any stale non-canonical rows left behind from earlier inserts (e.g., test-seeded ghost rows that were inserted at vault.join(...).to_string_lossy() without canonicalization)."
  - "INSERT OR REPLACE on reconcile inserts — future-proofs against re-indexing the same path during a follow-up pass when mtime/size changes (Phase 3 file-watcher candidate). The vault_files PRIMARY KEY (path) means INSERT OR REPLACE is the cheapest path."
  - "enumerate_folder_one_level uses fs::read_dir, NOT walkdir — depth = 1 strictly. WalkDir.max_depth(1) would work but read_dir is shorter and matches the REQ-06 contract verbatim (single-level only, nested-skip explicit)."
  - "T-2-07 grep gate satisfied — every query uses rusqlite::params![] macro. Audit gate `! grep -nE 'format!\\([^)]*\\b(SELECT|INSERT|UPDATE|DELETE)\\b' src-tauri/src/vault_index.rs` returns 0 matches. No string-interpolated SQL anywhere in the module."

patterns-established:
  - "WAL pragma stack at open: journal_mode=WAL → synchronous=NORMAL → busy_timeout=5000 → wal_autocheckpoint=1000. Order matters per RESEARCH L583-587. Reusable for any future SQLite consumer."
  - "Private-Mutex + second-connection-for-tests pattern: keep `conn: Mutex<Connection>` private to the module; integration tests open a second `rusqlite::Connection::open(&db_path)` for read-only introspection. SQLite WAL multi-conn reads make this safe and avoid weakening the privacy boundary with a `pub(crate) locked_conn()` backdoor."
  - "walkdir depth-aware hidden-prune: `e.depth() > 0 && e.file_name().starts_with('.')`. Exempting the walk root is load-bearing on macOS where the canonical tempdir prefix starts with `.`. Future scan helpers should reuse this exact predicate."
  - "Canonicalize-on-walk + lazy-delete-prunes-stale-non-canonical: every on-disk path gets canonicalize'd; the lazy-delete pass naturally prunes any non-canonical leftover rows. Eliminates the need for a separate index-migration pass."
  - "T-2-07 SQL-injection grep gate: every SQLite-touching module must satisfy `! grep -nE 'format!\\([^)]*\\b(SELECT|INSERT|UPDATE|DELETE)\\b' <file>`. All queries route through rusqlite::params![]. Reusable for Phase 7 memory store + Phase 10 FSRS history."
  - "Two-pass reconcile (insert-missing then lazy-delete-stale): naturally idempotent. Plan 05 import_controller can append a third pass without altering the algorithm."

requirements-completed: [REQ-13, REQ-06]

# Metrics
duration: 22min
completed: 2026-05-16
---

# Phase 02 Plan 04: Vault Index (rusqlite WAL + Reconciliation) Summary

**rusqlite-backed vault file index with WAL pragmas + parametrized CRUD + walkdir reconciliation + REQ-06 single-level folder-batch helper; 9 plan tests GREEN; T-2-07 SQL injection grep gate satisfied; Wave 3 (import_controller.rs) unblocked.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-05-16T22:14Z (RED commit `bf75579`)
- **Completed:** 2026-05-16T22:36Z (Task 2 GREEN commit `6c83d80`)
- **Tasks:** 2 (each TDD RED→GREEN cycle committed atomically)
- **Files created:** 1 (this SUMMARY.md)
- **Files modified:** 4 (1 lib body OVERWRITES placeholder + 3 test bodies replace stubs)
- **Commits:** 4 (2 RED test commits + 2 GREEN feat commits)

## Accomplishments

- **`src-tauri/src/vault_index.rs` full body landed (~430 LOC)** — Wave-1 placeholder OVERWRITTEN with the locked public surface: `VaultIndex { conn: std::sync::Mutex<Connection> }` + `VaultFileRow` + `ReconcileSummary` + `VaultIndexError` (3-variant thiserror) + 8 methods (`init` / `insert` / `get` / `delete` / `count_all` / `list_courses` / `list_all_paths` / `reconcile`) + 4 public helpers (`classify_kind` / `extract_course` / `now_iso` / `enumerate_folder_one_level`). Module header documents every D-* / cycle-3 invariant inline.
- **WAL pragma stack applied in canonical order** (journal_mode=WAL → synchronous=NORMAL → busy_timeout=5000 → wal_autocheckpoint=1000) per RESEARCH L583-587 + Pitfall 4. Schema (`vault_files` PRIMARY KEY path + course index) is fully idempotent via `CREATE TABLE IF NOT EXISTS`.
- **T-2-07 SQL injection grep gate satisfied.** Every SQLite query uses `rusqlite::params![]` macro. Audit gate `! grep -nE 'format!\([^)]*\b(SELECT|INSERT|UPDATE|DELETE)\b' src-tauri/src/vault_index.rs` returns 0 matches.
- **REQ-13 acceptance gate GREEN.** After 5 inserts, `count_all()` == 5 AND DB file < 1 MB on a fresh install (test `count_all_matches_after_five_inserts_and_db_under_1mb` asserts both). `reconcile()` correctly removes rows for files no longer on disk (test `removes_row_for_missing_file_on_reconcile` asserts ghost-row delete + real-file insert in a single pass).
- **REQ-06 folder-batch single-level acceptance GREEN.** `enumerate_folder_one_level(folder)` returns `(files_at_depth_1, skipped_subdirs)` tuple — top-level files imported, nested sub-dirs reported separately for Plan 05's per-file note. Hidden files (`.DS_Store`) excluded from both vectors. Test `imports_top_level_skips_nested_with_note` enforces.
- **Reconciliation hidden-dir hardening (cycle-3 priority #9).** `walkdir::WalkDir::filter_entry` prunes hidden DIRECTORIES (`.mneme/`, `.git/`, `.DS_Store`) BEFORE descent — never self-indexes `vault-index.db-wal`, `vault-index.db-shm` etc. Critical depth() == 0 exemption preserves walking under macOS-tempfile `.tmpXXX` prefixes + user-chosen vault paths that resolve under a hidden ancestor.
- **Canonicalize-on-walk.** Every on-disk path is canonicalized before insert so stored paths are stable across macOS `/var ↔ /private/var` symlink aliases. Lazy-delete pass naturally prunes any stale non-canonical rows left behind from earlier inserts (e.g., test-seeded ghost rows that bypass canonicalization).
- **9 plan-owned integration test cases GREEN** across 3 test files. Wave-0 starting state was 3 `#[ignore] panic!("Wave 2 implements")` / `#[ignore] panic!("Wave 3 implements")` stubs (note: `folder_batch_one_level.rs` Wave-0 stub claimed Wave 3 ownership but is actually owned by Plan 02-04 Wave 2 per the current PLAN.md frontmatter; ownership clarified by this plan).
- **No regressions.** Plan 02-02 + Plan 02-06 + Phase 1 + Phase 01.1 tests stay GREEN. All 22 integration test binaries run to completion with 0 failures. cargo build + cargo clippy (lib + bin per PLAN.md acceptance) + cargo fmt --check all exit 0.

## Task Commits

Each task ran a full RED→GREEN cycle; one commit per phase:

1. **Task 1 RED — vault_index_count 5 cases reference unbuilt VaultIndex** — `bf75579` (test)
   - Replaced `#[ignore] panic!("Wave 2 implements")` body in `tests/vault_index_count.rs` with 5 real assertions per PLAN.md Task 1 RED: schema/WAL pragma proof via SECOND rusqlite::Connection (cycle-3 #9 fix), CRUD round-trip, 5-insert + DB < 1 MB (REQ-13 acceptance L141 + L142), list_courses DISTINCT + NULL-skip + ASC sort, idempotent re-init on existing DB.
   - Intended RED: `cargo test --test vault_index_count` fails to compile (E0432 — `VaultIndex` + `VaultFileRow` not yet defined in the Wave-1 placeholder).
2. **Task 1 GREEN — vault_index.rs WAL + schema + CRUD (Pattern 4)** — `aea3fa1` (feat)
   - Overwrote Wave-1 placeholder `src-tauri/src/vault_index.rs` with the full implementation: VaultIndex struct + VaultFileRow + ReconcileSummary + VaultIndexError (thiserror) + 7 methods (init/insert/get/delete/count_all/list_courses/list_all_paths) + 3 public helpers (classify_kind/extract_course/now_iso). WAL pragma stack applied at open. `with_conn` helper for poisoned-mutex tolerance (Phase 1 WR-01 pattern). 5 tests GREEN; T-2-07 grep gate satisfied; cargo clippy + fmt + build all exit 0.
3. **Task 2 RED — reconcile + folder-batch tests reference unbuilt helpers** — `44d8491` (test)
   - Replaced `#[ignore] panic!` stubs in 2 test files (reconcile_lazy_delete.rs + folder_batch_one_level.rs) with 4 real test cases per PLAN.md Task 2 RED: ghost-row delete + reconcile idempotency + top-level vs skipped subdirs + hidden-file skip.
   - Intended RED: E0599 `no method named reconcile` + E0432 `no enumerate_folder_one_level in vault_index`.
4. **Task 2 GREEN — reconcile + enumerate_folder_one_level (walkdir + lazy-delete)** — `6c83d80` (feat)
   - Appended `impl VaultIndex { reconcile(vault_root) }` + `pub fn enumerate_folder_one_level` to vault_index.rs. reconcile uses walkdir::WalkDir + filter_entry hidden-dir prune (cycle-3 #9) + canonicalize-on-walk + 2-pass insert-then-delete. enumerate uses fs::read_dir at depth 1 only.
   - Required inline fix during GREEN: depth() == 0 exemption added to filter_entry hidden-prune predicate (see Deviations).
   - All 4 Task 2 tests GREEN + Task 1 regression GREEN + Phase 1 / 02-02 / 02-06 / 01.1 regression GREEN.

**Plan metadata commit:** _committed alongside SUMMARY.md by the orchestrator after wave-merge per parallel-execution protocol._

## Files Created/Modified

### Created (1)

| Path | Purpose |
|------|---------|
| `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-04-SUMMARY.md` | This file. |

### Modified (4)

**Production source (1):**
- `src-tauri/src/vault_index.rs` — Wave-1 placeholder (7 lines of comments) OVERWRITTEN with ~430 LOC full implementation. Adds VaultIndex struct (private `conn: Mutex<Connection>`) + VaultFileRow + ReconcileSummary + VaultIndexError (3-variant thiserror) + init (WAL pragma stack + schema) + with_conn (poisoned-mutex tolerance) + insert/get/delete/count_all/list_courses/list_all_paths (CRUD via params![]) + reconcile (walkdir + filter_entry hidden-prune + canonicalize + 2-pass) + classify_kind (8-bucket path-prefix matcher) + extract_course (course-code extraction from `courses/<CODE>/...`) + now_iso (chrono RFC-3339) + enumerate_folder_one_level (fs::read_dir at depth 1, hidden-skip).

**Test scaffolding (3):**
- `src-tauri/tests/vault_index_count.rs` — Wave-0 `#[ignore] panic!` stub REPLACED with 5 real assertions (schema/WAL pragma proof / CRUD round-trip / 5-insert + DB < 1 MB / list_courses NULL-skip / idempotent re-init).
- `src-tauri/tests/reconcile_lazy_delete.rs` — Wave-0 `#[ignore] panic!` stub REPLACED with 2 real assertions (ghost-row delete + reconcile idempotency).
- `src-tauri/tests/folder_batch_one_level.rs` — Wave-0 `#[ignore] panic!` stub REPLACED with 2 real assertions (top-level files vs skipped subdirs + hidden-file skip).

## Decisions Made

- **std::sync::Mutex<Connection> over tokio::sync::Mutex** — explicit per RESEARCH Pitfall 11 + PLAN.md `<interfaces>` lock. rusqlite is sync-only; pure-sync CRUD blocks never cross `.await` boundaries so std::sync::Mutex is correct. Tauri State<T> requires Sync which Mutex<Connection> provides. Phase 1 WR-01 poisoned-mutex tolerance pattern (`unwrap_or_else(|p| p.into_inner())`) is carried forward in the `with_conn` helper.
- **Private locked_conn (cycle-3 priority #9)** — NOT exposed even as `pub(crate)`. Integration tests under `src-tauri/tests/` open a SECOND `rusqlite::Connection::open(&db_path)` for read-only schema introspection. SQLite WAL multi-conn reads are safe; this keeps the internal Mutex<Connection> fully private without a backdoor for tests.
- **walkdir filter_entry depth() == 0 exemption** — the walk root is ALWAYS exempt from the hidden-prefix check. Root cause: macOS `tempfile::tempdir()` uses `.tmpXXX` prefix by default; without the exemption, every test calling reconcile against a tempdir vault would prune the entire walk (caught during Task 2 GREEN — see Deviations). This also tolerates real-world user-chosen vault paths that happen to resolve under a hidden ancestor — the user explicitly pointed at the vault root, so trust the choice. Per-file `.`-prefix guard inside the loop is defense-in-depth for orphan dotfiles at depth ≥ 1.
- **Canonicalize every on-disk path before insert** — resolves macOS `/var → /private/var` symlinks so stored paths are stable. Lazy-delete pass naturally prunes any stale non-canonical rows left behind from earlier inserts (e.g., test-seeded ghost rows that were inserted at `vault.join(...).to_string_lossy()` without canonicalization). This eliminates the need for a separate index-migration pass.
- **INSERT OR REPLACE on reconcile inserts** — future-proofs against re-indexing the same path during a follow-up pass when mtime/size changes (Phase 3 file-watcher candidate). The vault_files PRIMARY KEY (path) means INSERT OR REPLACE is the cheapest path; no DELETE+INSERT round-trip needed.
- **enumerate_folder_one_level uses fs::read_dir, NOT walkdir** — depth = 1 strictly. `WalkDir.max_depth(1)` would work but `read_dir` is shorter and matches the REQ-06 contract verbatim (single-level only, nested-skip explicit). Same hidden-file skip applied; symlinks silently skipped via `ftype.is_file()` / `ftype.is_dir()` discrimination.
- **T-2-07 grep gate satisfied** — every query uses `rusqlite::params![]` macro. Audit gate `! grep -nE 'format!\([^)]*\b(SELECT|INSERT|UPDATE|DELETE)\b' src-tauri/src/vault_index.rs` returns 0 matches. No string-interpolated SQL anywhere in the module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] filter_entry hidden-prune missing depth() == 0 exemption (caught + fixed during Task 2 GREEN, before commit)**
- **Found during:** Task 2 GREEN — running `cargo test --test reconcile_lazy_delete` immediately after the first reconcile() implementation.
- **Issue:** The PLAN.md cycle-3-errata sketch for `is_hidden_entry` reads `e.file_name().to_str().map_or(false, |s| s.starts_with('.'))` — applied to EVERY walkdir entry including the walk root. macOS `tempfile::tempdir()` creates dirs with a `.tmpXXX` prefix by default; the predicate matched the root and pruned the entire walk. Test 1 failed with `expected >=2 scanned, got 0`.
- **Fix:** Added `e.depth() > 0 &&` short-circuit so the walk root is exempt. The per-file `.`-prefix guard INSIDE the loop is preserved as defense-in-depth for orphan dotfiles at depth ≥ 1. Documented inline with the root cause + the real-world rationale (user-chosen vault paths under hidden ancestors are also accepted).
- **Files modified:** `src-tauri/src/vault_index.rs` (single function `is_hidden_entry` inside `reconcile`)
- **Verification:** `cargo test --test reconcile_lazy_delete` 2/2 PASS; `cargo test --test vault_index_count` 5/5 PASS (regression); `cargo test --test folder_batch_one_level` 2/2 PASS; T-2-07 grep gate still satisfied; clippy + fmt + build all exit 0.
- **Committed in:** `6c83d80` (Task 2 GREEN — fix included in same commit, never landed broken on the branch)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug found inline during GREEN execution)
**Impact on plan:** Single-line fix to a predicate inside the new `reconcile()` function — well within scope of Task 2 GREEN. The fix preserves the cycle-3 #9 hidden-dir-prune intent (which is the load-bearing security invariant — prevents self-indexing `vault-index.db-wal`) while making the predicate behave correctly under the macOS test tempdir conventions. Zero scope creep; no other deviations from PLAN.md.

## Issues Encountered

- **macOS tempdir prefix `.tmpXXX` breaks naive filter_entry** — see Deviations Rule-1 entry above. Discovered immediately on first `cargo test --test reconcile_lazy_delete` run after the initial reconcile implementation; fixed inline in the same commit before landing.
- **husky pre-commit DEPRECATED warning** on every commit. Unrelated to this plan — husky v9 deprecation message about lines that will FAIL in v10.0.0 in `.husky/pre-commit`. Pre-existing — already noted in Plan 02-02 SUMMARY. Out of scope for Plan 02-04.
- **Pre-existing clippy `uninlined-format-args` warnings in 7 sibling test files** (chmod_cancellation_safety.rs, symlink_canonicalize_blocked.rs, vault_scaffold.rs, course_scaffold.rs, path_traversal_blocked.rs, kill_pgid.rs, dev_log_rotation.rs) when running `cargo clippy --all-targets -- -D warnings`. **Out of scope** — Plan 02-04 acceptance criterion is `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` (NOT `--all-targets`) which matches the gate Plan 02-02 used. The narrow form (lib + bin only) is GREEN. The pre-existing test-file drift was partially absorbed by Plan 02-02's Rule-3 auto-fix pass on 4 files (dev.rs, dev_invoke.rs, dev_log_rotation.rs, path_traversal_blocked.rs); the remaining 7 test files have always failed `--all-targets` clippy because the pre-commit hook does not run it. Logged here for visibility — recommend a future housekeeping commit to extend the Plan 02-02 fix pattern to these files, or formally adopt `cargo clippy --all-targets -- -D warnings` as a CI gate. NOT in Plan 02-04 scope.

## TDD Gate Compliance

Plan frontmatter declares `type: tdd`. Gate sequence verified in `git log`:

| Wave | Commit | Type | Gate |
|------|--------|------|------|
| Task 1 | `bf75579` | `test` | RED — 5 vault_index_count cases reference unbuilt VaultIndex; cargo test fails to compile (E0432) |
| Task 1 | `aea3fa1` | `feat` | GREEN — vault_index.rs body with init/CRUD; 5 tests pass |
| Task 2 | `44d8491` | `test` | RED — 4 reconcile + folder-batch cases reference unbuilt helpers; cargo test fails to compile (E0599 + E0432) |
| Task 2 | `6c83d80` | `feat` | GREEN — reconcile + enumerate_folder_one_level; 4 tests pass; total 9 plan tests GREEN |

REFACTOR gate: implicit — every GREEN commit ran `cargo fmt` + `cargo clippy -- -D warnings` clean; no separate `refactor(...)` commit needed because the production code was written clean from the start (single-pass implementation with explicit doc-comments per D-* / cycle-3 invariant).

## User Setup Required

None — no external service configuration required. All work is contained within `src-tauri/` (Rust source + integration tests) and `.planning/` (this SUMMARY.md).

## Self-Check: PASSED

### Files exist

```
src-tauri/src/vault_index.rs                                                                FOUND (~430 LOC)
src-tauri/tests/vault_index_count.rs                                                        FOUND (5 cases GREEN)
src-tauri/tests/reconcile_lazy_delete.rs                                                    FOUND (2 cases GREEN)
src-tauri/tests/folder_batch_one_level.rs                                                   FOUND (2 cases GREEN)
.planning/phases/02-vault-canvas-ed-sync-onboarding/02-04-SUMMARY.md                        FOUND (this file)
```

### Commits exist in git log

```
bf75579  test(02-04): RED — vault_index_count 5 cases reference unbuilt VaultIndex          FOUND
aea3fa1  feat(02-04): GREEN — vault_index.rs WAL + schema + CRUD (Pattern 4)                FOUND
44d8491  test(02-04): RED — reconcile + folder-batch tests reference unbuilt helpers        FOUND
6c83d80  feat(02-04): GREEN — reconcile + enumerate_folder_one_level (walkdir+lazy-delete)  FOUND
```

### Acceptance gates verified

```
cargo build --manifest-path src-tauri/Cargo.toml                                            exit 0
cargo test --manifest-path src-tauri/Cargo.toml --test vault_index_count                    5 passed / 0 failed
cargo test --manifest-path src-tauri/Cargo.toml --test reconcile_lazy_delete                2 passed / 0 failed
cargo test --manifest-path src-tauri/Cargo.toml --test folder_batch_one_level               2 passed / 0 failed
cargo test --manifest-path src-tauri/Cargo.toml --tests (full suite)                        22 binaries / 0 failures
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings (per PLAN.md spec)         exit 0
cargo fmt --manifest-path src-tauri/Cargo.toml --check                                      exit 0
Phase 1 regression (kill_pgid)                                                              3/3 GREEN
Phase 01.1 regression (dev_log_rotation)                                                    3/3 GREEN
Plan 02-02 regression (vault_writer-family 10 cases)                                        10/10 GREEN
```

### Grep gates (Task 1 + Task 2 + acceptance criteria)

```
grep -E 'journal_mode.*WAL' src-tauri/src/vault_index.rs                                  3 matches (header + pragma_update + doc-comment)
grep -E 'PRIMARY KEY' src-tauri/src/vault_index.rs                                        1 match (schema)
grep -E 'params!\[' src-tauri/src/vault_index.rs                                          4 matches (insert + get + delete + DEFAULT)
! grep -nE 'format!\([^)]*\b(SELECT|INSERT|UPDATE|DELETE)\b' src-tauri/src/vault_index.rs PASS — 0 matches (T-2-07 gate)
grep -E '^pub mod vault_index;' src-tauri/src/lib.rs                                      1 match (Plan 02-02 owned)
grep -E 'pub fn reconcile' src-tauri/src/vault_index.rs                                   1 match
grep -E 'pub fn enumerate_folder_one_level' src-tauri/src/vault_index.rs                  1 match
grep -E 'walkdir::WalkDir' src-tauri/src/vault_index.rs                                   3 matches (use + WalkDir::new + filter_entry doc-comment)
grep -E 'std::sync::Mutex' src-tauri/src/vault_index.rs                                   1 match (use std::sync::Mutex)
grep -E 'tokio::sync::Mutex' src-tauri/src/vault_index.rs                                 0 matches (Pitfall 11 — NOT tokio Mutex)
```

## Next Phase Readiness

**Wave 3 (Plan 02-05 — import_controller.rs) is unblocked:**

- Consumes `vault_index::enumerate_folder_one_level` for folder batch import flow (REQ-06 single-level + skipped-subdirs per-file note).
- Consumes `vault_index::classify_kind` + `vault_index::extract_course` per-imported-file to populate `VaultFileRow.{kind, course}` before calling `VaultIndex::insert`.
- Consumes `vault_index::now_iso` for `indexed_at_iso` timestamps.
- Cancellation token (tokio-util) wraps each `vault_writer::write_to_vault(_, _, WriteContext::Import(import_handle()))` call so import errors surface via Plan 02-11's `import-error-classifier.test.ts` per-file failure surface.

**Wave 4+ (Plans 02-07 / 02-08 / 02-10 / 02-11) inherit:**

- `VaultIndex::list_courses()` / `count_all()` / `list_all_paths()` / `reconcile()` are wrapped behind Tauri `invoke()` commands by Plan 02-07 IPC wiring. The narrow public surface (no `locked_conn` backdoor) means the IPC layer cannot bypass the params![] gate.
- Plan 02-11's ImportDialog adaptive course-picker (D-10) reads `list_courses()` length to discriminate 0 / 1-3 / 4-10 / 10+ UX modes.
- Plan 02-10's SettingsPanel → Vault category renders `count_all()` row count + `list_courses()` course list.
- Plan 02-08's Onboarding step 6 (demo import) goes through Plan 02-05's import_controller which in turn goes through vault_index — no direct VaultIndex access from the onboarding wizard.

**Phase 3 (Cmd+P fuzzy search) inherits:**

- `vault_files` table schema is the cross-phase data contract — Phase 3 Cmd+P queries it directly via `rusqlite::Connection::open` (read-only second connection per the cycle-3 #9 pattern established here).

**Phase 4 (doc ingestion: Marker / markitdown → `_source/*.md`) inherits:**

- Each converted file gets indexed via `VaultIndex::insert` at the same trust boundary as manual imports. `classify_kind` correctly returns `_source` for paths under `courses/<CODE>/_source/`.

**No blockers.** REQ-13 (vault index data source) + REQ-06 (folder batch single-level) acceptance gates GREEN. T-2-07 SQL injection grep gate active. Plan 05 (import_controller.rs) and downstream waves can proceed without waiting on additional vault_index work.

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Plan: 04 (Wave 2)*
*Completed: 2026-05-16*
