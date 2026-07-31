---
phase: 02
status: issues_found
critical_count: 4
warning_count: 11
info_count: 8
files_reviewed: 80
depth: standard
generated_at: 2026-05-17T00:00:00Z
---

# Phase 02 Code Review — Adversarial Findings

## Executive Summary

Phase 02 ships a substantial surface: vault scaffold + `_source/` write protection + chmod 0o444 lock + safe-copy vault move + rusqlite WAL index + 6-step onboarding wizard + 8-category Settings + drag-drop/Cmd+I import controller + full IPC capability table. The core security primitives (two-arm canonicalize, Drop-guard relock, params!-only SQL, distinct command-name shell scopes) are well-engineered and pin the worst-case threats (T-2-01 path traversal, T-2-02 symlink, T-2-07 SQL injection). The threading discipline in `import_controller.rs` is correct (yield-before-cancel-check, registry drain on exit). However the adversarial scan surfaced **4 BLOCKER-class defects** that ship user-visible incorrect behavior or data loss, **11 WARNINGS** (broken UI affordances, dead listeners, race-prone flows, accepted bugs that should be acknowledged in code), and **8 INFO** items (mostly dead code, audit-script weaknesses, and code-smell). The most consequential finding is **CR-01** — the `Move…` button in `VaultCategory.svelte` is identical to `Browse…`, so the headline REQ-11 vault-move flow is unreachable through the Settings panel UI as shipped. **CR-02** silently overwrites `_inbox/` files on re-import, breaking the documented catch-all promise.

## Critical Findings

### CR-01: `Move…` button in Vault Settings is a duplicate of `Browse…` — REQ-11 unreachable from UI

**File:** `src/lib/components/settings/VaultCategory.svelte:166-168`
**Severity:** BLOCKER (Bug — primary REQ-11 user surface)
**Issue:**
```svelte
<button type="button" class="ghost-btn" onclick={browseAndMove}>Browse…</button>
<button type="button" class="ghost-btn" onclick={browseAndMove}>Move…</button>
```
Both buttons invoke the **same** handler `browseAndMove`. There is no `Browse…`-only path that would (per UI-SPEC §8.2.1) merely surface a path for inspection without staging a move. Every click on either button stages a `moveConfirming` value and pops the confirmation overlay — which is fine for "Move…" but completely wrong for "Browse…". A user trying to discover where their vault lives will be prompted to relocate it; clicking Cancel is the only way out. More importantly, the headline acceptance path for REQ-11 ("user changes vault location from Settings → Vault") goes through the same call-stack, so the existence of two buttons is meaningless UX-wise. SPEC L84-85 + acceptance L148 expect a distinct, clear move CTA.

**Fix:** Either delete the redundant `Browse…` button (Phase 2 spec only requires `Move…`) or wire a separate read-only "Show in Finder" path:
```svelte
<!-- Option A: drop the redundant button -->
<button type="button" class="ghost-btn" onclick={browseAndMove}>Move…</button>

<!-- Option B (richer): Browse opens Finder, Move pops the confirm flow -->
<button type="button" class="ghost-btn" onclick={revealInFinder}>Reveal in Finder</button>
<button type="button" class="ghost-btn" onclick={browseAndMove}>Move…</button>
```
Either way, also add a Vitest assertion (`tests/vault-move-flow.test.ts`) that the panel renders one move CTA — not two identical ones.

---

### CR-02: `_inbox` re-imports silently overwrite — clash check only guards `_source/`

**File:** `src-tauri/src/import_controller.rs:259-277`
**Severity:** BLOCKER (Data loss)
**Issue:** The basename-clash check at L259 is gated by `routes_to_source`:
```rust
let routes_to_source = category_task != "_inbox" && course_task.is_some();
if routes_to_source && dest.exists() {
    // ... record source-clash failure
    continue;
}
```
For category `_inbox` (or any case where no course is selected) the destination is `<vault>/_inbox/<basename>`. The clash check is skipped, so the subsequent `atomic_write` happily clobbers the prior `_inbox/<basename>`. Per D-11 every drop defaults to `_inbox` — this is the most common path. A user dropping `notes.pdf` twice (different content, same name from two source folders) loses the first file with no warning, no audit trail in `import-state.svelte.ts.recent_20`, and no failure event. The `_inbox/` files are NOT chmod 0o444 (the lock only fires for paths "under any `/_source/` ancestor" per L406 in `lib.rs::safe_copy_vault` and per `write_to_vault::WriteContext::Import` only locking `under_source` paths in `vault_writer.rs:189-192`), so POSIX does not save us either.

**Fix:** Lift the clash check to ALL Import-context writes, not just `_source/`. The user signal must be "we will never silently overwrite":
```rust
// Replace the routes_to_source-gated check with a universal one.
if dest.exists() {
    let reason = format!("dest-clash:{}", dest.to_string_lossy());
    failures.push(ImportFailure { path: src.to_string_lossy().to_string(), reason: reason.clone() });
    failed += 1;
    // ... emit progress with status="error"
    continue;
}
```
Then teach `import-error.ts::classifyImportError` about the `dest-clash:` prefix so the user sees a friendly "file already exists; rename source or delete first" message. Add a Vitest test and an integration test mirroring `source_basename_clash.rs` for the `_inbox` path.

---

### CR-03: `move_vault` empty-dst guard checks `canon_dst` but `safe_copy_vault` walks raw `dst` — guard bypass via symlink

**File:** `src-tauri/src/lib.rs:509-528`
**Severity:** BLOCKER (Security / data integrity)
**Issue:** The empty-destination guard at L509 runs against `canon_dst`:
```rust
let dst_pre = if canon_dst.exists() {
    count_and_sum(&canon_dst).map_err(|e| format!("dst pre-check: {e}"))?
} else {
    (0usize, 0u64)
};
if dst_pre != (0, 0) {
    return Err(format!("destination not empty: ..."));
}
```
But the subsequent copy + post-copy verification at L528, L537, L552 all use `&src` and `&dst` (the **raw user-provided paths**), not `canon_src` / `canon_dst`. Constructed attack vector:
1. User has vault at `~/StudyVault` containing 100 files.
2. User creates symlink: `ln -s /tmp/empty ~/new-vault-link`.
3. User picks `~/new-vault-link` as the new root (`dst`).
4. `canon_dst` resolves to `/tmp/empty` — empty, guard passes.
5. `safe_copy_vault(&src, &dst)` then calls `walkdir::WalkDir::new(src)` which walks `~/StudyVault` and writes into `~/new-vault-link` (resolving the symlink to `/tmp/empty`). FINE so far.
6. BUT the post-copy `count_and_sum(&dst)` at L537 ALSO follows the same symlink — and verification matches.
7. Index `reconcile(&dst)` then walks `~/new-vault-link` (which resolves to `/tmp/empty`) — paths get stored canonicalized inside reconcile, but the next-startup config still reads `vault_path` from disk where `save_config` persisted the user-string `~/new-vault-link`.
8. If the user later `rm ~/new-vault-link` (typical symlink cleanup), the next launch's `reconcile` against `~/new-vault-link` fails — vault appears empty though `/tmp/empty/*` still holds the data.

The guard is meaningful ONLY if the same canonical path is used for the actual operation. A more concrete bug: if `dst = ~/StudyVault-copy` is a fresh-empty *symlink* pointing to a directory that already contains the source vault as a child, the disk-bomb guard (L483 — `canon_dst.starts_with(&canon_src)`) does catch the recursion, but only if `canon_dst` resolves correctly. As long as the canon paths are used everywhere, OK; mixing raw + canon is fragile.

**Fix:** Use canonicalized paths throughout the move pipeline:
```rust
// Canonicalize once at top, then use canon_src/canon_dst for ALL ops.
let (sc_files, sc_bytes) = safe_copy_vault(&canon_src, &canon_dst).map_err(|e| e.to_string())?;
let (dst_files, dst_bytes) = count_and_sum(&canon_dst).map_err(|e| format!("dst post-walk: {e}"))?;
let (src_files, src_bytes) = count_and_sum(&canon_src).map_err(|e| format!("src pre-walk: {e}"))?;
let _ = index.reconcile(&canon_dst).map_err(|e| e.to_string())?;
Ok(MoveVaultSummary {
    files_copied: dst_files,
    bytes_copied: dst_bytes,
    old_root_preserved: canon_src.exists(),
})
```
Add an integration test in `src-tauri/tests/move_vault_symlink_guard.rs` that exercises this exact attack.

---

### CR-04: `ReconciliationOverlay` listens for `reconcile:progress` / `reconcile:done` — Rust never emits either; counter is permanently dead

**File:** `src/lib/components/ReconciliationOverlay.svelte:21-34` ↔ `src-tauri/src/lib.rs:225-230`
**Severity:** BLOCKER (UI dead code; failure mode masks real bugs)
**Issue:** The overlay subscribes:
```ts
const u1 = await listen<{ current: number; total: number }>("reconcile:progress", (e) => {
  current = e.payload.current; total = e.payload.total;
});
const u2 = await listen("reconcile:done", () => { visible = false; onDone?.(); });
```
But `grep -rn "reconcile:progress\|reconcile:done" src-tauri/src/` returns **zero matches**. The Rust `reconcile_vault_index` command is a thin sync wrapper around `VaultIndex::reconcile` and emits nothing. The overlay is only ever dismissed by the `+layout.svelte` `finally` block flipping `reconciling = false` after the blocking `invoke()` resolves. Consequences:
1. The `{current}/{total}` counter is never populated → users see a spinner with no progress feedback (UI-SPEC §8.9 explicitly requires "N / M" while scanning).
2. The `onDone` callback is dead — `+layout.svelte` correctly drives close via `finally`, but Wave 8 / Plan 02-12 SUMMARY implies the overlay drives its own dismissal.
3. If a Phase 3 refactor moves `reconcile_vault_index` to a backgrounded `tokio::spawn` (D-14 escalation trigger), the absence of these events would silently keep the overlay stuck because no one would notice the dead listeners.

**Fix:** Either (a) emit the events Rust-side and surface counts properly:
```rust
// inside reconcile_vault_index command or VaultIndex::reconcile with an emit_fn closure
let app_for_emit = app.clone();
app.emit("reconcile:progress", serde_json::json!({ "current": n, "total": total }));
// ...
let _ = app.emit("reconcile:done", ());
```
or (b) delete the listener block from the overlay and drop the counter UI (since the parent's `finally` already drives dismissal). Option (a) is the spec-aligned fix because UI-SPEC §8.9 promises a count. The current state — listeners exist but events never fire — is the worst of both worlds (dead code masquerading as a contract).

---

## Warnings

### WR-01: `claude_auth_check` swallows missing `home_dir()` and returns "not found" — masks a real installation bug as an OAuth-not-configured UI state

**File:** `src-tauri/src/lib.rs:184-201`
**Issue:** On `home_dir() == None` the code returns `Ok(ClaudeAuthStatus { found: false, ... })`. Comment claims "treat as not-found so the UI surfaces the 'Run claude --version in Terminal' remediation rather than a confusing error toast." But `home_dir() == None` means HOME env is unset OR system call failed — a real environmental bug. The user is told to run `claude --version` (which itself depends on HOME) and would loop forever.
**Fix:** Distinguish "home_dir unreachable" from "credentials missing". Return a typed status:
```rust
pub enum ClaudeAuthOutcome { Found, NotAuthed, EnvironmentBroken }
```
or surface the error string in `version`/an `error: Option<String>` field. The frontend Step 2 then shows different remediation per case.

---

### WR-02: `RelockGuard` only relocks on Drop — `with_temporary_writable_permission`'s `?` on the post-write `set_permissions` skips the relock when it errors

**File:** `src-tauri/src/vault_writer.rs:319-337`
**Issue:**
```rust
fs::set_permissions(path, fs::Permissions::from_mode(0o644)).map_err(...)?; // chmod 644
let mut guard = RelockGuard::new(path); // armed
let r = f()?; // user closure
fs::set_permissions(path, fs::Permissions::from_mode(0o444)).map_err(...)?; // chmod 444 — THIS line can fail
guard.disarm();
Ok(r)
```
If `f()` succeeds but the explicit `chmod 0o444` at line 332 fails (rare but possible on macOS APFS during disk-full or similar), the `?` returns early **without disarming the guard**, and the guard then re-runs `set_permissions(..., 0o444)` from Drop — which will hit the same failure mode. Drop swallows the error (`let _ = ...`). Net effect: caller sees `PermissionFailed`, file is at 0o644 (still writable). This is partly intentional ("Drop's set_permissions itself fails: swallowed") but the relock-then-relock sequence is wasted work and the comment at L271-281 doesn't clearly document that the post-write chmod re-attempts the same failed op.

**Fix:** Disarm BEFORE the explicit chmod, then relock unconditionally via Drop:
```rust
let r = f()?;
guard.disarm(); // happy-path relock is via Drop; no double-attempt
Ok(r)
// Drop runs unconditionally; one set_permissions call regardless of outcome.
```
This collapses the contract to "Drop is the relock authority." Update the comment.

---

### WR-03: `Onboarding.svelte::next()` advances even when the URL is stale — risks "skip a step"

**File:** `src/lib/components/onboarding/Onboarding.svelte:90-104`
**Issue:** `next()` reads `onboardingState.current_step` and increments. But this state is bound to the URL `initialStep` prop via a `$effect`. If the user navigates manually (e.g., reload, deep-link `/onboarding/4`), and then clicks "Continue" before the `$effect` runs (rare but possible on slow systems), `current_step` may be stale. The atomic save then writes a step value the user did not intend. Risk is small (next click usually fires after `$effect` propagation), but the failure mode persists silently to JSON.
**Fix:** Compute next from `initialStep` (URL truth) not state:
```ts
const nextStep = Math.min(6, initialStep + 1);
```
Or call `await tick()` before reading state.

---

### WR-04: Vault path `Browse…` in onboarding writes config BEFORE confirming the user wants the new path

**File:** `src/lib/components/onboarding/Step3VaultPicker.svelte:99-111`
**Issue:** `confirm()` invokes `vault_create_scaffold` followed by `save_config({vault_path})`. If the user clicked "Use this path" by mistake (or `autofocus` interacted with their Enter keypress mid-typing), the choice is committed atomically. There is no "are you sure?" because the wizard's mental model is "Browse → confirm visually → click Use this path." But the path display field is `readonly` and only updates after Browse; a confused user pressing Enter on the focused CTA before Browse-ing would persist `~/StudyVault` (the default) without ever seeing a picker. Combined with the auto-set `validation = { kind: "valid", willCreate: true }` after `homeDir()` resolves (L62-64), this is a single-keypress-to-commit foot-gun.
**Fix:** Either (a) require an explicit `Browse…`-or-confirm pattern (disable CTA until the user has clicked Browse OR typed a path), or (b) add a second-click confirm overlay similar to VaultCategory's `confirmMove`. Option (a) is lighter:
```ts
let userInteracted = $state(false);
// flip to true inside browse(); leave the CTA disabled until userInteracted || initialPath
```

---

### WR-05: Splitter localStorage hydration in `Splitter.svelte` happens after first paint — risks layout jump (Phase 1 carryover, surfaces under Phase 2 because added rows)

**File:** Not a Phase 2 file directly but interacts with `+page.svelte` row addition for `PostOnboardingBanner` (auto row insertion at L262)
**Issue:** The `.window` grid is now `var(--titlebar-height) auto 1fr` instead of `var(--titlebar-height) 1fr` — a new `auto` row sits between titlebar and main pane. On first paint before `PostOnboardingBanner` self-gating resolves (`onMount` reads localStorage sentinel), the banner is rendered then hidden, causing a visible layout reflow. The Splitter then re-applies its localStorage-saved column ratios in the same frame, compounding the flicker.
**Fix:** Hide the banner via inline CSS `display: none` initially and reveal after `onMount` resolves, OR have the parent `+page.svelte` defer mounting the banner until vault state is hydrated. Acceptable to defer (this is Phase 2 introducing the issue), but add a Cycle-3 follow-up note.

---

### WR-06: `audit-capabilities.sh` `import_handle()` whitelist regex is too loose

**File:** `scripts/audit-capabilities.sh:151-156`
**Issue:**
```bash
| grep -vE '(vault_writer|import_controller|lib)\.rs$'
```
The pattern `lib\.rs$` matches any file ending in `lib.rs` — `my_lib.rs`, `evil_lib.rs`, `tauri_lib.rs`. A future contributor could accidentally (or maliciously) add a `<x>_lib.rs` that calls `import_handle()` and the gate would silently allow it. The intent is to whitelist the literal `lib.rs` only.
**Fix:**
```bash
| grep -vE '/(vault_writer|import_controller|lib)\.rs$'
# or anchor to src-tauri/src/
| grep -vE '^src-tauri/src/(vault_writer|import_controller|lib)\.rs$'
```

---

### WR-07: `safe_copy_vault` silently ignores symlinks — but doesn't tell the user the source vault had any

**File:** `src-tauri/src/lib.rs:384-413` (comment at L410: "Symlinks ignored — Phase 2 vault scaffold contains none")
**Issue:** The comment assumes Phase 2 vault has no symlinks. True for the scaffolded layout, but the user can drop a symlinked file into `_inbox/` via the import controller — `_source/` files chmod 0o444 also do not prevent the user from `ln -s` linking into the vault from Finder/Terminal. A vault move would silently leave symlinks behind in the old vault, causing `file_count` to differ in the user's mental model from the verification result. Today the verification passes because both `src_pre_walk` and `dst_post_walk` use the same `walkdir::WalkDir::new(...)` (which by default does NOT follow symlinks) so counts agree — but the user loses links silently.
**Fix:** Either (a) follow symlinks (with anti-recursion guard) so they roundtrip, or (b) detect symlinks during `safe_copy_vault` and surface a count in `MoveVaultSummary { skipped_symlinks: usize }`. Option (b) is conservative for Phase 2.

---

### WR-08: `+layout.svelte` post-onboarding hydration races: `list_courses` runs BEFORE `reconcile` so first call returns empty on fresh install

**File:** `src/routes/+layout.svelte:143-184`
**Issue:** Code flow:
1. `setCourseList(await list_courses())` — DB is empty on first launch (fresh install), so `courses = []`.
2. `installImportListeners()`.
3. `await reconcile(root)` — walks disk, populates DB.
4. `setCourseList(await list_courses())` — now correct.

Between steps 1 and 4, any UI that reads `vault-state.course_list` (e.g., the Onboarding-just-finished `+page.svelte` mounting concurrent with `+layout`, or the `ImportDialog` triggered by an early drag-drop) sees an empty list. The window is short (sync reconcile completes in <200ms per SPEC budget), but the race is real on slow disks or large vaults.
**Fix:** Drop the first `list_courses` call. Reconcile first, then list once:
```ts
if (vaultPath) {
  reconciling = true;
  try {
    await invoke("reconcile_vault_index", { root: vaultPath });
    const courses = await invoke<string[]>("list_courses");
    setCourseList(courses);
  } finally { reconciling = false; }
}
```

---

### WR-09: `start_import` Tauri command spawns a tokio task whose emit closure captures `app.clone()` but never explicitly drops on error — webview teardown leaves a zombie task that emits to a dead app handle

**File:** `src-tauri/src/lib.rs:242-270`
**Issue:** The closure `let _ = Emitter::emit(&app_for_emit, evt_name, payload);` swallows emit errors silently (intentional per the comment at L257). But the cloned `AppHandle` keeps the Tauri runtime alive longer than expected: tokio task holds an `Arc<...>` to the app via the closure capture, and on Cmd+Q the `cancel_all()` flips cancellation BUT the task still emits one final `import:done` event after the loop. If the webview is gone, `Emitter::emit` returns Err and gets swallowed — fine. But if the user spawns 10 concurrent imports and Cmd+Q's during them, all 10 tasks try to emit + dequeue from registry simultaneously. The `controller.registry.lock().await` contention is bounded (single Mutex), but each task holds the lock for `remove` only briefly. No deadlock; just a noticeable shutdown stutter.

More concerning: the `ExitRequested` and `CloseRequested` handlers both call `tauri::async_runtime::block_on(c.cancel_all().await)`. `block_on` on the Tauri main thread can deadlock if `cancel_all`'s `registry.lock()` is held by a spawn-side `await reg = registry.lock()`. Today no spawned task holds the lock across an `.await` (registry is only locked synchronously inside `cancel_all` and inside `start_import_inner` for `insert`+`remove`), so this is safe — but the contract is fragile. A future refactor that adds an `.await` inside a `registry.lock()`-held scope would deadlock at exit.

**Fix:** Document the contract explicitly in `import_controller.rs::cancel_all`:
```rust
// CONTRACT: NEVER hold `registry.lock()` across an `.await`. The Tauri exit
// hook calls `block_on(cancel_all())` from the main thread; nesting an await
// under the lock would deadlock during shutdown.
```
Add a clippy lint or audit grep gate to detect `.await` inside the lock scope.

---

### WR-10: `DropzoneOverlay.svelte` does `payload as { type: string; paths?: string[]; ... }` cast — loses the Tauri 2 discriminated union narrowing

**File:** `src/lib/components/dropzone/DropzoneOverlay.svelte:40-62`
**Issue:** The cast `const p = payload as { type: string; paths?: string[]; ... }` widens the type *before* the switch. After narrowing on `payload.type`, the safe extraction `p.paths ?? []` for the `over` arm would now return `[]` and SET `visible = false` if the code went that path — but the `over` arm is currently a no-op (returns early via `break`), so this is latent. If a future contributor naively unifies the `enter` and `over` arms by removing the cast guards, `over` events (which carry no `paths`) would trigger `visible = false` on every mouse move. The current code is correct but the manual cast bypasses TS's exhaustiveness check on the union.
**Fix:** Use proper discriminated-union narrowing without a top-level cast:
```ts
unlisten = await win.onDragDropEvent((event) => {
  const payload = event.payload;
  switch (payload.type) {
    case "enter": visible = payload.paths.length > 0; break;
    case "over": break; // discriminator-narrowed; .paths not in type
    case "leave": visible = false; break;
    case "drop":
      visible = false;
      if (payload.paths.length > 0) onPathsDropped(payload.paths);
      break;
  }
});
```
This removes the `?? []` fallback (relies on Tauri's actual type) and forces the compiler to catch future drift.

---

### WR-11: `Step5AddCourse.svelte::addCourse` does not check `vaultRoot` is non-empty before invoking `course_create`

**File:** `src/lib/components/onboarding/Step5AddCourse.svelte:39-62`
**Issue:** `invoke("course_create", { root: vaultRoot, code })`. `vaultRoot` flows from `Onboarding.svelte::onboardingState.vault_path`. If the user reaches Step 5 via direct URL (`/onboarding/5`) without completing Step 3, `vaultRoot` is `""` (empty). The Rust handler `course_create(root: String, code: String)` then passes `Path::new(&"")` to `vault_writer::create_course`, which calls `root.join("courses").join(code)` → `courses/COMP3221` (relative to cwd). On macOS in dev, cwd is the project root — so `<repo>/courses/COMP3221` gets scaffolded. In production, cwd may be `/` or `/Applications`.
**Fix:** Guard at the Step 5 boundary:
```ts
async function addCourse() {
  if (validation.kind !== "valid" || saving) return;
  if (!vaultRoot || vaultRoot.length === 0) {
    lastAddError = "Vault path not set — go back to Step 3.";
    return;
  }
  ...
}
```
Better defense-in-depth: also reject empty `root` in `vault_writer::create_course` (Rust side).

---

## Info

### IN-01: `gray-matter.test.ts` is a `describe.skip` Wave-0 stub — Phase 2 ships with no actual gray-matter round-trip test

**File:** `tests/gray-matter.test.ts:6-9`
**Issue:** Despite REQ-02 acceptance L134 calling out YAML frontmatter via gray-matter, the only test is `describe.skip(...) expect.fail("Wave 2 implements")`. Wave 2 (Plan 02-02) shipped the INDEX.md write through `vault_writer::create_course` using a hand-rolled `format!("---\ncourse: {code}\ncreated: {created}\n---\n")` (vault_writer.rs:253). gray-matter is declared as an npm dep but no production code consumes it. Either the dep should be removed from `package.json` and the SPEC L134 wording updated, or a real test should be added.

**Fix:** Decide one of:
1. Drop gray-matter from `package.json` (it's not used by any Phase 2 production code path — Rust formats the YAML directly).
2. Refactor INDEX.md generation to use gray-matter for stringify symmetry (gives Phase 3 notes editor a single source for YAML serialization) and add the round-trip test.

---

### IN-02: `enumerate_folder_one_level` silently drops symlinks — undocumented for Phase 2 callers

**File:** `src-tauri/src/vault_index.rs:432-454`
**Issue:** The function comment notes "Symlinks are silently skipped" but the import controller does not surface this to the user. If the user drops a folder containing symlinks (common in macOS aliases / Dropbox shortcuts), those links are dropped from the import without a note. Per SPEC L140 the per-file skip note should include nested subdirs; symlinks should get equivalent treatment.

**Fix:** Either (a) emit a `subdirs_skipped`-equivalent vec for `symlinks_skipped` from `enumerate_folder_one_level`, OR (b) document the behavior in the import dialog copy ("Symlinks and nested folders are skipped").

---

### IN-03: `import_state.svelte.ts` race: `installed` flag is set BEFORE the awaited `listen` calls resolve

**File:** `src/lib/import-state.svelte.ts:95-101`
**Issue:** `installed = true;` is set on line 97, then `await listen(...)` happens on lines 99-119. If `installImportListeners()` is called twice in quick succession from two different code paths (e.g., HMR + a parent component re-mounting), the second call short-circuits at line 96 (`if (installed) return;`) BEFORE the first call has actually subscribed. Result: the second caller assumes listeners are wired when they may not be yet.

**Fix:** Use an in-flight promise instead of a boolean:
```ts
let installPromise: Promise<void> | null = null;
export async function installImportListeners(): Promise<void> {
  if (installPromise) return installPromise;
  installPromise = (async () => {
    const u1 = await listen<ImportProgress>("import:progress", ...);
    const u2 = await listen<ImportDoneEventPayload>("import:done", ...);
    unlisteners.push(u1, u2);
  })();
  return installPromise;
}
```

---

### IN-04: `start_import_inner` emit closure runs `serde_json::to_value(&progress).unwrap()` — panic-on-failure of a contract that's defined Send + Sync

**File:** `src-tauri/src/import_controller.rs:241, 275, 332, 347`
**Issue:** Four `.unwrap()` calls on `serde_json::to_value(...)`. `ImportProgress` and `ImportDoneEvent` derive `Serialize` so this should never fail in practice, but a panic inside a `tokio::spawn` task is silently leaked unless someone observes the JoinHandle — and the controller discards it. A panic would leave the registry entry orphaned (the `reg.remove(&op_id_task)` after `emit_arc("import:done", ...)` never runs).

**Fix:** Map the error to a default empty Value or log + continue:
```rust
let payload = serde_json::to_value(&progress).unwrap_or(serde_json::Value::Null);
emit_arc("import:progress", payload);
```
Or wrap the entire spawned closure in `std::panic::catch_unwind` so registry cleanup always runs.

---

### IN-05: Path-segment check in `vault_writer::is_under_source` would match `_source` directories at any depth — including a future `<vault>/_source/` top-level

**File:** `src-tauri/src/vault_writer.rs:144-150`
**Issue:** The check iterates components and matches any `Component::Normal("_source")`. The intent (per the header comment at L20) is to catch `courses/<CODE>/_source/...`. But it would also reject a User write to `<vault>/_source/x.md` (if such a top-level dir existed) or `<vault>/shared/_source/y.md` — both are deliberately impossible by the scaffold today, but future schema additions could create false rejections.

**Fix:** Tighten the check to specifically `courses/<CODE>/_source/`:
```rust
let mut iter = canon_full.components().peekable();
while let Some(c) = iter.next() {
    if let Component::Normal(s) = c {
        if s == OsStr::new("courses") {
            // Skip course code
            let _ = iter.next();
            // Next component must be _source for the rejection to fire
            if let Some(Component::Normal(s2)) = iter.next() {
                if s2 == OsStr::new("_source") { return Ok(true); }
            }
        }
    }
}
```
Current code is correct for Phase 2 reality; tightening is a hardening hedge for Phase 3+.

---

### IN-06: `AppearanceCategory.svelte` `console.log` on dark-mode click — production console pollution

**File:** `src/lib/components/settings/AppearanceCategory.svelte:21`
**Issue:** `console.log("[settings:appearance] dark mode arrives in a future ui-phase");`. Project rule is "no `console.log` in production." Should be `console.warn` (already used for similar "deferred" surfaces) or removed in favor of UI microcopy (which already exists on L48).
**Fix:** Remove the `console.log` line entirely; the microcopy at L48 is the user-facing affordance.

---

### IN-07: `Onboarding.svelte` `onboardingState` initializer uses default `current_step: 1` then immediately overwrites via `$effect`, then via `onMount` async load — race blip on slow IPC

**File:** `src/lib/components/onboarding/Onboarding.svelte:60-88`
**Issue:** Three sequential mutations of `onboardingState.current_step`:
1. `$state({current_step: 1, ...})` at line 60.
2. `$effect(() => { onboardingState.current_step = initialStep; })` at line 73.
3. `onMount async => { onboardingState = {...loaded, current_step: initialStep}; }` at line 84.

The window between (2) and (3) is brief but visible if `load_onboarding_state` is slow (cold-start, large state file). The user could click Continue at step 3 between effect-firing and onMount completion; the saved state would be `{current_step: 4, vault_path: "", courses_added: []}` overwriting the `vault_path` they had previously persisted at step 3.

**Fix:** Guard `next()` on a `loaded` boolean that flips after onMount's `await`:
```ts
let loaded = $state(false);
onMount(async () => { ...; loaded = true; });
async function next() { if (saving || !loaded) return; ... }
```

---

### IN-08: `+page.ts` `entries` returns hardcoded `[1..6]` — adding a 7th onboarding step in the future requires editing this file silently

**File:** `src/routes/onboarding/[step]/+page.ts:20-23`
**Issue:** The hardcoded entry list means the SvelteKit static prerender skips any step `>6` even if `Onboarding.svelte` routes to it. The Rust `OnboardingState.current_step` is `u8`, allowing any 0-255. If someone bumps the wizard to 7 steps but forgets to update `entries()`, the user would 404 on Step 7. Low-likelihood now; codify as a constant shared with `Math.min(6, ...)` clamp.
**Fix:** Extract a constant:
```ts
// src/lib/onboarding-validation.ts or new shared module
export const ONBOARDING_STEP_COUNT = 6;
// then in +page.ts:
entries: () => Array.from({length: ONBOARDING_STEP_COUNT}, (_, i) => ({ step: String(i + 1) }))
```
And import the same constant in `Onboarding.svelte::next` and Rust-side clamp.

---

## Per-File Notes (files with findings)

| File | Findings |
|------|----------|
| `src/lib/components/settings/VaultCategory.svelte` | CR-01 |
| `src-tauri/src/import_controller.rs` | CR-02, WR-09, IN-04 |
| `src-tauri/src/lib.rs` | CR-03, WR-01, WR-09 |
| `src/lib/components/ReconciliationOverlay.svelte` | CR-04 |
| `src-tauri/src/vault_writer.rs` | WR-02, IN-05 |
| `src/lib/components/onboarding/Onboarding.svelte` | WR-03, IN-07 |
| `src/lib/components/onboarding/Step3VaultPicker.svelte` | WR-04 |
| `src/lib/components/onboarding/Step5AddCourse.svelte` | WR-11 |
| `src/routes/+page.svelte` | WR-05 (indirect via PostOnboardingBanner row insertion) |
| `scripts/audit-capabilities.sh` | WR-06 |
| `src/routes/+layout.svelte` | WR-08 |
| `src/lib/components/dropzone/DropzoneOverlay.svelte` | WR-10 |
| `tests/gray-matter.test.ts` | IN-01 |
| `src-tauri/src/vault_index.rs` | IN-02 |
| `src/lib/import-state.svelte.ts` | IN-03 |
| `src/lib/components/settings/AppearanceCategory.svelte` | IN-06 |
| `src/routes/onboarding/[step]/+page.ts` | IN-08 |

---

_Reviewed: 2026-05-17T00:00:00Z_
_Reviewer: Claude Opus 4.7 (gsd-code-reviewer)_
_Depth: standard (per-file analysis with language-specific checks; cross-file trace for IPC contracts + event-bus subscribers)_
