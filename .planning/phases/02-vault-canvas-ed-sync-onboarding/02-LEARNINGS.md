---
phase: 02
phase_name: "vault-canvas-ed-sync-onboarding"
project: "mneme"
generated: "2026-05-19T00:00:00Z"
counts:
  decisions: 12
  lessons: 9
  patterns: 8
  surprises: 6
missing_artifacts:
  - "02-UAT.md (Phase 02 shipped without a UAT step; verify-work + UAT lived in the 02.1 fix wave)"
---

# Phase 02 Learnings: vault-canvas-ed-sync-onboarding

> Synthesized from 15 PLAN.md + 15 SUMMARY.md files + 02-VERIFICATION.md + 02-RESEARCH.md + 02-CONTEXT.md + 02-SECURITY.md + 02-VALIDATION.md. UAT lived in 02.1 (`02.1-UAT.md`) — Phase 02 did not have its own UAT pass.

---

## Decisions

### Two-arm canonicalize pattern unifies T-2-01 + T-2-02 into one helper
A single `vault_writer` helper handles both path-traversal and symlink-leaf threats via two branches: `symlink_metadata().is_ok()` resolves an existing leaf (regular file, dir, or symlink) by canonicalizing the WHOLE path so symlinks resolve through; the not-yet-existing leaf branch canonicalizes parent + joins file_name to catch `..` traversal during `fs::create`.

**Rationale:** Cycle-2 cluster #3 — fewer helpers means fewer drift surfaces. The unification was load-bearing for `chmod_lock_enforced` AND `symlink_canonicalize_blocked` integration tests passing against the same impl.
**Source:** 02-02-SUMMARY.md "Decisions Made" + 02-RESEARCH.md threat model T-2-01..T-2-02

---

### Path-Component check over substring for `_source/` write-protection
Iterate canonicalized `Components`, match `Component::Normal(OsStr::new("_source"))` exactly. Substring `contains("_source")` was rejected because future filenames like `notes/my_source/README.md` would false-match.

**Rationale:** REQ-06 acceptance criterion: only `vault_writer` writes under `_source/`; user-context writes must reject. Component-based check is the only correct gate.
**Source:** 02-02-SUMMARY.md "Decisions Made"

---

### `ImportToken._marker` field stays fully PRIVATE (not `pub(crate)`)
The factory `pub fn import_handle()` is the ONLY construction path for `ImportToken`. Sibling modules under `src-tauri/src/` that try `ImportToken { _marker: PhantomData }` get rustc E0451. The privacy of the FIELD — not the function — is what seals construction.

**Rationale:** Cycle-2 cluster #5 — capability-token discipline. `pub(crate)` would have let sibling modules bypass the factory invariants.
**Source:** 02-02-SUMMARY.md "Decisions Made"

---

### `ImportDoneEvent` is the IMPORT EVENT SCHEMA SSOT (cluster #6)
Distinct shape from `ImportProgress`, NOT reused. Fields: `operation_id` + `total` + `succeeded` + `failed` + `cancelled` + `course: Option<String>` + `category: String` + `failures: Vec<ImportFailure>`. The Rust source carries an inline cross-reference comment pinning frontend consumer locations (`02-06 import-state.svelte.ts` + `02-11 ImportHistoryModal.svelte`); when the Rust shape changes the TS mirror MUST change in the same PR.

**Rationale:** Frontend has TWO consumers (pill state + history modal) — keeping them in lockstep with the Rust source via inline cross-refs is cheaper than spinning up a code-gen pipeline at this scale.
**Source:** 02-05-SUMMARY.md "Decisions Made" + 02-CONTEXT.md SSOT contract

---

### Type-erased `emit_fn` closure unifies progress + done events
One closure `Fn(&str, serde_json::Value) + Send + Sync + 'static` carries BOTH `ImportProgress` (per-file) AND `ImportDoneEvent` (batch summary). Tests substitute a capturing `Arc<StdMutex<Vec<(String, serde_json::Value)>>>`; the Tauri command wrapper substitutes `move |evt, val| { let _ = app.emit(evt, val); }`.

**Rationale:** Resolves the cycle-2 variant explosion where each event type wanted its own typed `Fn(&str, ImportProgress)` / `Fn(&str, ImportDoneEvent)` closure. Type-erasure at the boundary keeps the controller's inner loop free of per-event-type generics.
**Source:** 02-05-SUMMARY.md "Decisions Made"

---

### `std::sync::Mutex<Connection>` over `tokio::sync::Mutex` for rusqlite
rusqlite is sync-only; pure-sync CRUD blocks never cross `.await` boundaries so `std::sync::Mutex` is correct. Tauri `State<T>` requires `Sync` which `Mutex<Connection>` provides. Phase 1 WR-01 poisoned-mutex tolerance pattern (`unwrap_or_else(|p| p.into_inner())`) is carried forward in the `with_conn` helper.

**Rationale:** RESEARCH Pitfall 11 — using tokio's async mutex around a sync DB connection is a common-but-wrong pattern. The lock guard cannot be held across `.await` anyway, so the std mutex is both correct and lighter.
**Source:** 02-04-SUMMARY.md "Decisions Made" + 02-RESEARCH.md Pitfall 11

---

### Capability `description` field as command registry (NEW PATTERN)
`audit-capabilities.sh` grep gates check that command names appear somewhere in `src-tauri/capabilities/default.json`. Because Tauri 2 rejects custom permission identifiers AND user `#[tauri::command]` functions don't need explicit allow-* entries, the cleanest gate-satisfaction path is to enumerate the command surface in the capability's top-level `description` string. `gen-capabilities.ts` composes the description from `PHASE_2_COMMAND_LIST` so future commands stay enumerated.

**Rationale:** The Tauri validator treats `description` as opaque text, so it never rejects the string content. The grep gate gets a single source of truth without spawning a parallel SSOT file.
**Source:** 02-09-SUMMARY.md "Decisions Made"

---

### `$effect` bridge for URL → state in Onboarding (NOT capture-on-init)
The literal Svelte snippet `let onboardingState = $state({ current_step: initialStep, ... })` captures the prop's INITIAL value only. SvelteKit reuses the `+page.svelte` instance across `/onboarding/1` → `/onboarding/2` navigation, so the wizard would never visually advance even though the URL changed. The `$effect` makes `onboardingState.current_step` track URL changes reactively.

**Rationale:** SvelteKit same-root navigation does NOT remount; only the bridge keeps state honest. svelte-check caught this with a `state-referenced-locally` warning, but the bug would have shipped silently if compiled clean.
**Source:** 02-08-SUMMARY.md "Decisions Made"

---

### `ready=true` BEFORE `goto` in root `+layout.svelte`
SvelteKit root layouts do NOT remount on same-root navigation; leaving `ready = false` here blanks the screen for first-launch users until Cmd+R. Order matters: set `ready=true` first, then call `goto(initialPath)` to swap the route.

**Rationale:** Preserved verbatim from cycle-2 cluster #11 + cycle-3 cycle-2 H1 PARTIAL fix. This is non-obvious and exactly the kind of edge case that smoke-tests miss.
**Source:** 02-08-SUMMARY.md "Decisions Made"

---

### KD-13 `--color-orange` for main-app UI (NOT Living olive)
The Living token system's olive accent (`#6B6E3D`) lives in `.planning/references/design/living-visual-contract.md` for **tool HTML** (review / dogfood / handoff) only. Main-app UI uses the KD-13 cream + warm-dark + orange Anthropic/Claude palette.

**Rationale:** Cycle-2 cluster #12 disposition. Mixing the two palettes would dilute the Anthropic/Claude family identity (KP-09 lock).
**Source:** 02-08-SUMMARY.md "Decisions Made" + KD-13 token system

---

### TitlebarMeta long-path truncation threshold = 48 chars
Empirically chosen to fit 13" MacBook chrome row without wrapping. `segments.length <= 3` falls back to raw path (already short enough to not need truncation).

**Rationale:** Real-device measurement on the user's MacBook Pro 13" 2019 Intel display. Hardcoded magic number is acceptable because (1) the screen size doesn't change between sessions, (2) the test pin is the visual contract not the threshold value.
**Source:** 02-12-SUMMARY.md "Decisions Made"

---

### `INSERT OR REPLACE` on reconcile inserts (future-proof against re-indexing)
Future-proofs against re-indexing the same path during a follow-up pass when mtime/size changes (Phase 3 file-watcher candidate). The `vault_files` PRIMARY KEY (`path`) means `INSERT OR REPLACE` is the cheapest path; no DELETE+INSERT round-trip needed.

**Rationale:** REQ-06 reconcile must be idempotent + safe under interleaved walk passes. Picking this now avoids a Phase 3 migration cycle.
**Source:** 02-04-SUMMARY.md "Decisions Made"

---

## Lessons

### macOS BSD `sed` lacks GNU `\b` word-boundary
The PLAN's `sed -E 's/app_lib::/mneme_lib::/g'` did not match on macOS Ventura BSD sed (silently no-ops). Replaced with the simpler form which works on both BSD and GNU sed. Lesson applies whenever PLAN snippets use sed.

**Context:** Phase 0 lesson rediscovered. PLAN regex authors writing on Linux must verify on the user's macOS Ventura 13.4 Intel target before landing as `acceptance criteria`.
**Source:** 02-01-SUMMARY.md "Issues Encountered"

---

### macOS `tempfile::tempdir()` uses `.tmpXXX` prefix → breaks naive hidden-file filter
walkdir's `filter_entry` applied a `s.starts_with('.')` predicate to EVERY entry including the walk root. macOS tempdir created `.tmpAbc123/`, the predicate matched the root, and the entire walk was pruned. Test failed with `expected >=2 scanned, got 0`.

**Context:** Test infrastructure quirk that doesn't surface on Linux. Fix: add `depth() == 0` exemption so the walk root is ALWAYS exempt from the hidden-prefix check (also tolerates real user-chosen vault paths under a hidden ancestor).
**Source:** 02-04-SUMMARY.md "Issues Encountered" + "Deviations from Plan"

---

### Husky v9 pre-commit DEPRECATED warnings on every commit (out-of-scope across all plans)
Pre-commit hook prints "lines that will FAIL in husky v10.0.0" on every commit. Persists across the entire phase; documented in 02-02, 02-03, 02-04, 02-05 SUMMARYs as "out of scope".

**Context:** Pre-existing repo noise. A future housekeeping plan (or part of a v1.x cycle) should upgrade `.husky/pre-commit` to the v10-compatible format. Don't conflate with phase-scope work; just log + carry forward.
**Source:** 02-02 through 02-05 SUMMARY.md "Issues Encountered"

---

### Tauri 2 capability `description` validator accepts arbitrary text; permission namespace is strict
`description` field is treated as opaque by the validator — usable as a command-name registry. But permission names are STRICT: `core:dialog:default` is rejected (build error); the correct namespace is `dialog:default` for plugin permissions, `core:event:*` / `core:menu:*` etc. for built-in Tauri permissions.

**Context:** Mistaking `core:*` vs `<plugin>:*` is easy because Tauri 1 had a flatter model. Plan 02-07 caught this at first `cargo build` post-update.
**Source:** 02-07-SUMMARY.md "Issues Encountered" + "Deviations from Plan" (Rule 1 Bug)

---

### macOS ugrep symlinked as `grep` silently changes `grep -Pzo` semantics
The plan's `grep -Pzo '<TitlebarMeta\s*/>\s*</div>\s*<!--[^>]*-->\s*<PostOnboardingBanner'` regex exited 0-results under macOS `ugrep 7.5.0` (which symlinks as `grep`). Verified placement semantically with `perl -0777` instead.

**Context:** Acceptance-gate scripts using PCRE multi-line regex must either pin `grep` to GNU `ggrep` (`brew install grep`) OR use Perl for cross-tool portability. ugrep is otherwise a drop-in replacement except for `-Pzo` multi-line corner cases.
**Source:** 02-12-SUMMARY.md "Issues Encountered"

---

### Pre-commit hook does NOT run `cargo fmt --check` or `cargo clippy -D warnings`
Pre-existing fmt + clippy drift on Phase 01.1 files (dev.rs, dev_invoke.rs, dev_log_rotation.rs, path_traversal_blocked.rs) accumulated because the gate doesn't run. Plan 02-02 fixed inline under Rule 3 (blocking acceptance gate); recommended formal CI gate adoption to prevent recurrence.

**Context:** Affects every new plan. Either (a) add fmt + clippy to the husky hook, or (b) accept inline-fix-as-you-go discipline. Decision deferred to v1.x.
**Source:** 02-02-SUMMARY.md "Issues Encountered" + "Deviations from Plan"

---

### Wave-0 RED tests don't always RED when the GREEN body is pre-baked
Task 2 RED step had no "actually fail" state — by cycle-3 design, Task 1's GREEN body already contained `yield_now().await` + per-file failure-continue logic. So Task 2's RED tests passed against unchanged code. Intentional, but worth flagging that "RED → GREEN" granularity sometimes collapses when the plan-author already wrote the logic.

**Context:** Don't panic if Wave-0 RED tests pass on first run after Wave-1 lands — re-read the plan body for "the GREEN implementation from Task 1 already covers both behaviors" notes before assuming a test bug.
**Source:** 02-05-SUMMARY.md "Issues Encountered"

---

### Cargo CLI flag combination `--lib X --test Y` treats Y as a filter, not a separator
`cargo test --lib onboarding --test onboarding_complete` shows 0/2 in the integration line because cargo treats the trailing positional as a test-name filter. Workaround: invoke `cargo test --test onboarding_complete` separately.

**Context:** Verifier scripts that combine `--lib` and `--test` flags must split into separate invocations to read correct counts.
**Source:** 02-03-SUMMARY.md "Issues Encountered"

---

### Worktree absolute-path safety: derive from `git rev-parse --show-toplevel` inside the worktree
First Write tool call for TitlebarMeta.svelte + +layout.svelte used the main-repo path; the worktree had not absorbed the changes. Reverted via `git checkout --` and re-applied using the explicit worktree path. No commits leaked to main; recovery clean.

**Context:** When running inside a worktree (which `gsd-execute-phase` does for parallel plans), ALWAYS derive absolute paths from `git rev-parse --show-toplevel` to ensure writes land in the right tree. Hardcoded `/Users/.../mneme/src/...` paths assume main-repo location and break under worktree.
**Source:** 02-12-SUMMARY.md "Issues Encountered"

---

## Patterns

### Two-arm canonicalize helper (T-2-01 + T-2-02 unified)
Encapsulate path security in ONE helper with two branches: existing-leaf canonicalize-full vs not-yet-existing leaf canonicalize-parent. Used by `vault_writer::write_to_vault` and all future writers.

**When to use:** Any code path that takes a user-provided path and writes to it. Don't write separate guards for "does the path exist" + "did the user use ..": the helper handles both.
**Source:** 02-02-SUMMARY.md + 02-SECURITY.md threat model

---

### Sealed factory via private field (capability token discipline)
Make the marker field PRIVATE (not `pub(crate)`), expose only a factory function. Sibling modules that try to construct the type directly get rustc E0451.

**When to use:** When a value's mere existence is a capability-grant (e.g., "this token proves the caller passed validation"). Cheaper than newtype + trait sealing patterns for short-lived in-process tokens.
**Source:** 02-02-SUMMARY.md `ImportToken._marker` decision

---

### Type-erased `emit_fn` closure for multi-event-type IPC bridge
One `Fn(&str, serde_json::Value) + Send + Sync + 'static` closure carries every event type the controller emits. Tests substitute a capturing collector; production substitutes the Tauri `app.emit(evt, val)` call.

**When to use:** When a single controller produces multiple discriminated event types AND tests want to assert event sequencing without spinning up a real Tauri app. Avoids per-event-type generics that explode the controller's type signature.
**Source:** 02-05-SUMMARY.md `emit_fn` decision

---

### Pre-spawn `validate_inputs` gate — fail before touching registry or tokio spawn
Validate course regex + category enum BEFORE inserting into registry or spawning a task. Invalid input returns `Err("invalid …")` immediately with registry untouched.

**When to use:** Any IPC handler that hands off to a long-running tokio task. Validate at the synchronous IPC boundary so caller errors are immediate, registry stays clean, and async paths can assume valid inputs.
**Source:** 02-05-SUMMARY.md "Decisions Made"

---

### `tokio::task::yield_now().await` AT TOP of every iteration before cancellation check
Makes cancellation tests deterministic on macOS tmpfs-backed tempfile dirs. Without the yield, fast batches complete before `cancel_import_inner` can observably flip the token; the test sometimes saw `cancelled_count == 0`.

**When to use:** Any cancellation-token-driven loop where the cancel signal arrives via `tokio::sync` and the loop body is fast (filesystem-cache hits, small batches). Stick the yield at the TOP not the bottom.
**Source:** 02-05-SUMMARY.md "Decisions Made"

---

### Inline cross-reference comments between Rust SSOT and TS mirror types
When a Rust event payload has a TS mirror in `import-state.svelte.ts`, the Rust source carries an inline comment pinning consumer locations; the TS mirror carries the reverse-direction comment. Compile-time guarantees are impossible; the comment is the contract.

**When to use:** Cross-language type mirroring where build tooling can't auto-derive (e.g., Rust Tauri events → frontend listeners). The comment is the only thing that gets greppable enough to enforce "change both in the same PR".
**Source:** 02-05-SUMMARY.md + 02-06-SUMMARY.md

---

### Component-based path matching for guard rails (`Component::Normal(OsStr)`)
Match `Component::Normal(OsStr::new("_source"))` exactly via path Components iteration. Don't use `.to_string_lossy().contains("_source")`.

**When to use:** Any path-based access control gate where future filenames might legitimately contain the guard string (e.g., `notes/my_source/README.md`). Component matching is robust against false positives substring matching cannot avoid.
**Source:** 02-02-SUMMARY.md "Decisions Made"

---

### `$effect` for URL → state synchronization in SvelteKit single-instance pages
`+page.svelte` instances are reused across `/onboarding/1` → `/onboarding/2` navigation. Use `$effect` to bridge URL params to component-local `$state`; do NOT use init-only `$state(initialValue)`.

**When to use:** Any SvelteKit page that takes a route parameter AND mutates local state in response. The `$effect` is the canonical bridge; svelte-check warns when you forget.
**Source:** 02-08-SUMMARY.md "Decisions Made"

---

## Surprises

### `rustfmt` re-ordered `pub mod` declarations alphabetically during `cargo fmt`
Initial Edit placed `import_controller` last (matching narrative order in the plan); rustfmt re-sorted to alphabetical (`config` / `import_controller` / `onboarding` / `vault_index`). This is rustfmt's `reorder_modules = true` default — desirable for consistency but surprising mid-plan.

**Impact:** Adapted by moving the per-module Plan-ownership comments ABOVE the declarations (collapsing trailing-line comments that rustfmt mangled). lib.rs ends with sorted alphabetical declarations + a single block comment documenting Plan ownership.
**Source:** 02-02-SUMMARY.md "Issues Encountered"

---

### `vault_writer::SourceBasenameClash` variant is currently DORMANT
The variant exists from Plan 02-02 but is never raised — Plan 02-05 controller detects the clash BEFORE calling `vault_writer::write_to_vault` and emits `source-clash:<dest>` as a failure reason instead. The variant remains available for future direct callers (Phase 4 doc-ingestion).

**Impact:** Dead-code-style warning is suppressed via `#[allow(dead_code)]` or similar; future readers of vault_writer might wonder why this variant exists. The cross-reference is the only thing keeping the rationale alive.
**Source:** 02-05-SUMMARY.md "Issues Encountered" + "Deviations from Plan"

---

### `vitest-browser-svelte` was never actually a dep — deferred test path documented inline
CYCLE-3 priority #6 flagged the dep, but importing it would have caused Vitest module resolution to fail before any fallback ran (it's never been declared in `package.json`). Tests assert the IPC contract via `vi.mock`; component-mount + visual E2E deferred to `/gsd-verify-work` per `02-VALIDATION.md` Manual-Only table.

**Impact:** Avoided a tooling rabbit hole. Lesson: when a plan suggests a new dev-dep mid-execution, verify it's actually installed before relying on it; cycle-3 reviews aren't infallible.
**Source:** 02-08-SUMMARY.md "Decisions Made"

---

### Tauri 2 strictly validates capability identifiers — `mneme:phase-2-vault` rejected
Tauri 2.11 strictly validates capability identifiers against plugin manifests. The user-namespaced identifier `mneme:phase-2-vault` was rejected; IPC dispatch (via `#[tauri::command]` registration) is already the gate for user commands, so the custom identifier was unnecessary anyway.

**Impact:** Removed. Documented inline in `lib.rs` so future authors don't try to re-add it.
**Source:** 02-07-SUMMARY.md "Decisions Made"

---

### Step1 + Step4 had to ship as Task-1 stubs (atomic-compile boundary)
Task 1's `npm run check 0 errors` acceptance required Step1Welcome + Step4MCPStatus to be importable when Onboarding.svelte's import graph compiled. Cleanest semantic split: ship trivial single-button stubs in Task 1 + replace with full bodies in Task 2. Both commits compile + pass tests independently.

**Impact:** Took longer than estimated because the stub-then-replace pattern wasn't in the plan; surfaced as a "Deviations from Plan" entry. The literal PLAN `<files>` boundary (Task 1 = routes + state owner + rail; Task 2 = step bodies + test) was preserved at the diff level.
**Source:** 02-08-SUMMARY.md "Decisions Made" + "Deviations from Plan"

---

### Pre-existing `visual-review-template.test.mjs > R7` fail carried across the entire phase
Single vitest test asserting `~/.claude/get-shit-done/templates/visual-review.html` exists at GSD upstream path. Failed before and after every plan; logged in `deferred-items.md` and tracked as upstream-PR followup. Persistence was a recurring "this isn't my bug" annotation in every SUMMARY.

**Impact:** Out-of-scope for Phase 02 in scope-boundary discipline, but the carry-forward overhead per plan was real (each plan author had to re-explain). Tracked formally in `.planning/notes/upstream-pr-gsd-build-followup.md` F1.
**Source:** 02-06 through 02-15 SUMMARY.md "Issues Encountered" / "Deferred Issues"

---
