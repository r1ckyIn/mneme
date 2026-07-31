# Phase 02: Vault + Manual Import + Onboarding — Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 24 new files + 8 modified files = 32 surfaces
**Analogs found:** 28 strong matches / 32 total (4 first-instances: `vault_index.rs`, `DropzoneOverlay.svelte`, `ReconciliationOverlay.svelte`, dynamic-step route)

**Scope note:** Phase 2 is pure local-first filesystem + IPC + UI. NO Canvas / Ed / HTTP client analogs are sought — the ROADMAP wording "Canvas + Ed import + sync" is stale per CONTEXT L13 self-ecosystem decision. All analogs come from Phase 1 + Phase 01.1 codebase (`src-tauri/src/{lib,session,dev}.rs` + `src/lib/**/*.{ts,svelte}`).

---

## File Classification

| New / Modified | Role | Data Flow | Closest Analog | Match Quality |
|----------------|------|-----------|----------------|---------------|
| `src-tauri/src/vault_writer.rs` | Rust module — filesystem guard + state-machine | request-response (IPC) + chmod state machine | `src-tauri/src/session.rs` + `src-tauri/src/lib.rs::kill_pgid` | role + flow match (state machine + safety helper) |
| `src-tauri/src/import_controller.rs` | Rust module — tokio task orchestrator | event-driven (per-file progress emit) + cancellation | `src-tauri/src/dev.rs::start_log_writer` + `src-tauri/src/session.rs::SessionRegistry` | exact (tokio task + mpsc + HashMap registry) |
| `src-tauri/src/vault_index.rs` | Rust module — rusqlite wrapper | CRUD + batch reconciliation | NO direct analog (first SQLite use) — fallback `src-tauri/src/dev.rs` writer-task pattern | new pattern |
| `src-tauri/src/onboarding.rs` | Rust module — atomic JSON persistence | file-I/O (load / save) | `src-tauri/src/dev.rs::flush` rotation (temp + rename idiom) | role match |
| `src-tauri/src/config.rs` | Rust module — atomic JSON persistence | file-I/O (load / save) | `src-tauri/src/onboarding.rs` (sibling — same pattern) | exact (sibling) |
| `src/lib/components/SettingsPanel.svelte` | Svelte component — multi-pane shell | request-response (modal-mode UI) | `src/lib/components/SettingsModal.svelte` + `src/lib/components/Splitter.svelte` | role + flow (replaces placeholder; adopts splitter rail-body layout) |
| `src/lib/components/settings/VaultCategory.svelte` | Svelte leaf — form panel | request-response (IPC call on action) | `src/lib/components/ChatFooter.svelte` (button + state + IPC trigger composition) | role match |
| `src/lib/components/settings/AppearanceCategory.svelte` | Svelte leaf — read-only toggle stub | display-only | `src/lib/components/ChatFooter.svelte` vault-ctx toggle (lines 89-103) | exact (visual-toggle no-op pattern) |
| `src/lib/components/settings/KeybindingsCategory.svelte` | Svelte leaf — read-only table | display-only | `src/lib/components/FileArea.svelte` (static-data table) | role match |
| `src/lib/components/settings/ComingSoonCategory.svelte` | Svelte leaf — placeholder copy | display-only | `src/lib/components/LectureVideo.svelte` (placeholder card) | exact (Phase-deferred placeholder pattern) |
| `src/lib/components/ImportDialog.svelte` | Svelte component — modal with adaptive picker | request-response (IPC submit) | `src/lib/components/ChatFooter.svelte` (form-control composition) + `src/lib/components/SettingsModal.svelte` (`<dialog>` host) | role match |
| `src/lib/components/DuplicateResolutionDialog.svelte` | Svelte component — nested confirmation modal | request-response (3-button choice) | `src/lib/components/SettingsModal.svelte` (`<dialog>` host) | role match |
| `src/lib/components/ImportStatusPill.svelte` | Svelte leaf — reactive pill | event-driven (reads `import-state.svelte.ts`) | `src/lib/components/TitlebarMeta.svelte` connection-dot (lines 43-44, 76-97) | exact (reactive state-derived chip pattern) |
| `src/lib/components/ImportHistoryModal.svelte` | Svelte component — list modal | request-response (read recent-20) | `src/lib/components/SettingsModal.svelte` + `src/lib/components/FileArea.svelte` row-list | role match (modal host + row-list) |
| `src/lib/components/dropzone/DropzoneOverlay.svelte` | Svelte component — full-window drag overlay | event-driven (DataTransfer.types + dragenter/leave) | NO direct analog (first drag-drop use) — fallback `src/routes/+page.svelte` overlay-on-shell pattern | new pattern |
| `src/lib/components/ReconciliationOverlay.svelte` | Svelte component — startup spinner | event-driven (reads progress events) | NO direct analog (first startup-blocking overlay) — fallback `src/lib/components/AssistantMessage.svelte` rAF-batched effect | new pattern |
| `src/lib/components/onboarding/Onboarding.svelte` | Svelte component — wizard state owner | request-response (multi-step navigation) | `src/lib/components/ChatPanel.svelte` (state owner + multi-child orchestrator, lines 60-127) | exact (state-owner with step routing) |
| `src/lib/components/onboarding/Step1Welcome.svelte` | Svelte leaf — hero step | display + button | `src/lib/components/LectureVideo.svelte` (centered placeholder card) | role match |
| `src/lib/components/onboarding/Step2AuthCheck.svelte` | Svelte leaf — status check step | request-response (IPC read) | `src/lib/components/TitlebarMeta.svelte` connection-dot + status text | role match |
| `src/lib/components/onboarding/Step3VaultPicker.svelte` | Svelte leaf — path picker form | request-response (IPC + dialog plugin) | `src/lib/components/ChatPanel.svelte` sendPrompt (IPC + state mutation) | role match |
| `src/lib/components/onboarding/Step4MCPStatus.svelte` | Svelte leaf — pass-through status step | display-only | `src/lib/components/LectureVideo.svelte` (placeholder copy) | role match |
| `src/lib/components/onboarding/Step5AddCourse.svelte` | Svelte leaf — text-input form | request-response (IPC submit) | `src/lib/components/ChatPanel.svelte` (input + submit + state) | role match |
| `src/lib/components/onboarding/Step6DemoImport.svelte` | Svelte leaf — dropzone within step | event-driven (DataTransfer.types) + skip | composes `DropzoneOverlay.svelte` (sibling new component) | composition |
| `src/lib/components/onboarding/OnboardingStepRail.svelte` | Svelte leaf — step-indicator row | display + active-state | `src/lib/components/FileArea.svelte` sort-indicator (`.active-sort` class) | role match (active-step pattern) |
| `src/routes/onboarding/[step]/+page.svelte` | SvelteKit dynamic route | request-response (URL → state) | `src/routes/+page.svelte` (existing route — first dynamic route in project) | role match |
| `src/routes/onboarding/+layout.svelte` | SvelteKit layout | shell wrapper | `src/routes/+layout.svelte` (root layout) | exact (layout-without-children-children pattern) |
| `src/lib/import-state.svelte.ts` | Svelte 5 module-scope `$state` | reactive singleton | `src/lib/connection-state.svelte.ts` (verbatim template) | exact |
| `src/lib/vault-state.svelte.ts` | Svelte 5 module-scope `$state` | reactive singleton | `src/lib/connection-state.svelte.ts` (verbatim template) | exact |
| `src/lib/components/TitlebarMeta.svelte` *(modified)* | Existing leaf — chip row | display + state read | self — modify in place | n/a |
| `src/routes/+layout.svelte` *(modified)* | Existing root layout | shell + redirect | self — modify in place | n/a |
| `src/routes/+page.svelte` *(modified)* | Existing main route | shell + listener wiring | self — modify in place | n/a |
| `src-tauri/src/lib.rs` *(modified)* | Existing Tauri builder | builder + lifecycle hooks | self — modify in place | n/a |

---

## Pattern Assignments — Rust modules

### `src-tauri/src/vault_writer.rs` (Rust module, request-response + chmod state machine)

**Role:** Single authorized writer surface for `<vault>/courses/<*>/_source/`. Owns `WriteContext` enum + private `ImportToken` + path-guard canonicalization + chmod-644→write→chmod-444 helper.

**Analog:** `src-tauri/src/session.rs` (registry + state-machine pattern) **+** `src-tauri/src/lib.rs::kill_pgid` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/src/lib.rs:52-64`) (deterministic-safety helper at top of `lib.rs`).

**Imports pattern** (from `lib.rs:17-23`):
```rust
use std::fs;
use std::thread;
use std::time::Duration;

use nix::sys::signal::{killpg, Signal};
use nix::unistd::{getpgid, Pid};
use tauri::{Manager, RunEvent, State, WindowEvent};
```
**Replicate:** keep `use std::fs / std::os::unix::fs::PermissionsExt / std::path::{Path, PathBuf}` grouping at the top; group nix + tauri last.

**State-machine + private-token pattern** (from `session.rs:14-46`):
```rust
pub type SessionId = u32;

pub struct ChildHandle {
    pub pid: u32,
    // Phase 3 will add: resume_token, spawned_at, ...
}

pub struct SessionRegistry {
    inner: Mutex<HashMap<SessionId, ChildHandle>>,
}

impl SessionRegistry {
    pub fn new() -> Self { Self { inner: Mutex::new(HashMap::new()) } }
    // WR-01: tolerate poisoned Mutex
    fn locked(&self) -> MutexGuard<'_, HashMap<SessionId, ChildHandle>> {
        self.inner.lock().unwrap_or_else(|poisoned| {
            eprintln!("[session] mutex poisoned — recovering inner state");
            poisoned.into_inner()
        })
    }
```
**Replicate:**
- struct-with-private-fields + `pub(crate)` PhantomData marker for `ImportToken` (D-05 verbatim from RESEARCH §Pattern 2)
- single factory function `import_handle()` as the only audited entry point (the grep-for-callers gate)
- `fn locked()` helper for any future `Mutex` use (Phase 1 WR-01 poisoned-mutex tolerance lesson applies)

**Deterministic-safety helper pattern** (from `lib.rs:52-64`):
```rust
pub fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    let Ok(pgid) = getpgid(Some(pid)) else { return; };
    let _ = killpg(pgid, Signal::SIGTERM);
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(2));
        let _ = killpg(pgid, Signal::SIGKILL);
    });
}
```
**Replicate** for `with_temporary_writable_permission(path, |writable| ...)` (D-07):
- pure top-level helper, no `&self`, single PathBuf input
- `let _ = ...` to silently absorb non-load-bearing errors (chmod-back-to-444 failure leaves file at 644 per D-07 contract; caller decides retry)
- Failure path mid-rewrite is the documented exception to immutability (in-place re-chmod is required by SPEC L49)

**What changes vs analog:**
- New error enum `VaultWriterError { WriteToSourceForbidden, CanonicalizeFailed(io::Error), PermissionFailed(io::Error), IoFailed(io::Error) }` per Rust patterns ruleset (thiserror-style typed errors). Phase 1 `kill_pgid` uses `let _ = ...` because it is fire-and-forget; vault_writer must propagate the typed error to the Tauri command boundary as `Result<T, String>`.
- New canonicalization step: `path.canonicalize()` before prefix comparison (D-06 — defends against `..` traversal). No Phase 1 analog uses `canonicalize`.
- Three-step chmod helper (644 → write → 444) is the documented exception to coding-style.md immutability rule. Cite this in module header comment.

---

### `src-tauri/src/import_controller.rs` (Rust module, event-driven + tokio task + registry)

**Role:** Orchestrates drag-drop / Cmd+I import flows. Spawns one tokio task per operation; emits `import:progress` events per file; supports cancellation via `CancellationToken`; calls `vault_writer::import_handle()` + `vault_index::insert` in same step.

**Analog:** `src-tauri/src/dev.rs::start_log_writer` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/src/dev.rs:166-194`) for the tokio-task-with-mpsc shape **+** `src-tauri/src/session.rs::SessionRegistry` (lines 22-65) for the HashMap-behind-Mutex registry shape.

**tokio task + mpsc + select! pattern** (from `dev.rs:166-194`):
```rust
pub fn start_log_writer(_channel: LogChannel, path: PathBuf) -> Sender<String> {
    let (tx, mut rx) = mpsc::channel::<String>(CHANNEL_BUFFER);
    tokio::spawn(async move {
        let mut buf: Vec<String> = Vec::with_capacity(64);
        loop {
            tokio::select! {
                msg = rx.recv() => {
                    match msg {
                        Some(s) => buf.push(s),
                        None => { flush(&path, &mut buf); break; }
                    }
                    if buf.len() >= BATCH_SOFT_CAP { flush(&path, &mut buf); }
                }
                _ = sleep(Duration::from_millis(DEBOUNCE_MS)) => {
                    if !buf.is_empty() { flush(&path, &mut buf); }
                }
            }
        }
    });
    tx
}
```
**Replicate:** `tokio::spawn(async move { for file in files { ... } })` with `tokio::select!` between iteration step and `cancel_token.cancelled()`. RESEARCH §Pattern 3 (lines 499-559) gives the canonical sketch — apply it verbatim with `app.emit("import:progress", ...)` after each `import_one_file` step. Constants follow Phase 1 convention: `const PROGRESS_DEBOUNCE_MS: u64 = ...` SCREAMING_SNAKE_CASE module-top.

**Registry pattern** (from `session.rs:22-58`):
```rust
pub struct SessionRegistry {
    inner: Mutex<HashMap<SessionId, ChildHandle>>,
}

impl SessionRegistry {
    pub fn register(&self, id: SessionId, handle: ChildHandle) {
        self.locked().insert(id, handle);
    }
    pub fn drain_one(&self, id: SessionId) -> Option<ChildHandle> {
        self.locked().remove(&id)
    }
    pub fn drain_all(&self) -> Vec<ChildHandle> {
        std::mem::take(&mut *self.locked()).into_values().collect()
    }
    pub fn kill_all(&self) {
        for h in self.drain_all() { crate::kill_pgid(h.pid); }
    }
}
```
**Replicate:**
- `pub struct ImportController { registry: tokio::sync::Mutex<HashMap<OperationId, ImportOperation>> }` (use `tokio::sync::Mutex` not `std::sync::Mutex` because the registry is held across `.await` points inside tokio task — RESEARCH §Pattern 3 sketch line 517 shows `reg.lock().await`).
- `register / drain_one / drain_all / cancel_all` symmetric API to `SessionRegistry`.
- `cancel_all` calls `cancel_token.cancel()` on each operation (not `kill_pgid` — tokio tasks are not subprocesses).
- `Phase 3 will add: ...` forward-reference comment style (per `session.rs:18-19`) to mark `ImportOperation` fields as load-bearing for batch-pause / batch-resume v1.x.

**Tauri command shape** (from `lib.rs:70-90`):
```rust
#[tauri::command]
fn register_session_pid(state: State<SessionRegistry>, pid: u32) {
    state.register(1, ChildHandle { pid });
}
```
**Replicate** for `start_import` / `cancel_import`:
- `#[tauri::command] pub async fn start_import(...) -> Result<String, String>` (operation_id returned)
- `state: tauri::State<'_, Arc<ImportController>>` + `app: tauri::AppHandle` (RESEARCH §Pattern 3 line 510 shows the signature shape)
- error path: `.map_err(|e| e.to_string())` per Rust ruleset (string-bounded IPC error)

**What changes vs analog:**
- Phase 1 `start_log_writer` swallows all I/O errors per D-SF-04 (telemetry-only). Import controller MUST propagate per-file errors via `last_file_status: "error"` in the progress event AND record the per-file message in the recent-20 history (SPEC REQ-9 acceptance: `2 / 3 imported · 1 error` with per-file message).
- New dependency: `tokio-util` for `CancellationToken` (verify lockfile during plan-phase per RESEARCH §"Core" line 167; if `tokio-util` is not transitive, Cargo.toml gains an entry).
- New dependency: `uuid` for `Uuid::new_v4().to_string()` operation IDs (RESEARCH §Pattern 3 line 513) — verify transitive availability or add to Cargo.toml.

---

### `src-tauri/src/vault_index.rs` (Rust module, CRUD + batch reconciliation)

**Role:** rusqlite wrapper. `vault_files` table CRUD + WAL pragma init + reconciliation scan + lazy-delete on missing files.

**Analog:** **NO direct Phase 1 analog** (first SQLite use in mneme). Fallback patterns:
- `src-tauri/src/dev.rs::DevWriter` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/src/dev.rs:241-264`) — `tokio::sync::Mutex<Option<T>>` shared state pattern with `init()` factory.
- `src-tauri/src/session.rs` — Mutex-wrapped resource handle pattern.
- RESEARCH §Pattern 4 (lines 561-600) — canonical rusqlite WAL pragma + `Mutex<Connection>` sketch.

**Recommended idiom** (RESEARCH §Pattern 4 verbatim):
```rust
pub struct VaultIndex {
    conn: Mutex<Connection>,
}

impl VaultIndex {
    pub fn init(db_path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(db_path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "busy_timeout", 5000_i32)?;
        conn.pragma_update(None, "wal_autocheckpoint", 1000_i32)?;
        conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS vault_files (
                path TEXT PRIMARY KEY,
                course TEXT,
                kind TEXT,
                size_bytes INTEGER,
                mtime_iso TEXT,
                indexed_at_iso TEXT
            );
            CREATE INDEX IF NOT EXISTS vault_files_course_idx ON vault_files(course);
        "#)?;
        Ok(VaultIndex { conn: Mutex::new(conn) })
    }
}
```

**DevWriter analog** (from `dev.rs:241-257`):
```rust
pub struct DevWriter {
    pub console_tx: tokio::sync::Mutex<Option<Sender<String>>>,
    pub network_tx: tokio::sync::Mutex<Option<Sender<String>>>,
    pub perf_tx: tokio::sync::Mutex<Option<Sender<String>>>,
    pub log_dir: tokio::sync::Mutex<Option<PathBuf>>,
}

impl DevWriter {
    pub fn new(log_dir: PathBuf) -> Self {
        Self {
            console_tx: tokio::sync::Mutex::new(None),
            // ...
            log_dir: tokio::sync::Mutex::new(Some(log_dir)),
        }
    }
}
```
**Replicate:**
- `pub struct VaultIndex { conn: tokio::sync::Mutex<Connection> }` (tokio Mutex if any handler holds the lock across `.await`; std Mutex is OK if all ops are sync — rusqlite is sync-only so std::sync::Mutex is the correct choice unless reconciliation awaits inside the lock).
- `init(db_path: &Path)` factory returning `rusqlite::Result<Self>` (not `Self` directly — pragma failures propagate).
- module-top `SCREAMING_SNAKE_CASE` constants for pragma values + WAL threshold (Phase 1 `dev.rs:136-139` style).

**What changes vs fallback:**
- This is a fresh `rusqlite::Connection` wrapper — no Phase 1 module owns a DB. Carry RESEARCH §Pattern 4 lines 581-599 verbatim (pragma order matters: journal_mode FIRST, then synchronous, busy_timeout, wal_autocheckpoint).
- Parametrized queries only (Rust security ruleset SQL-injection section + RESEARCH §"Threat Model" T7). NEVER format paths into SQL strings. Use `params![path, course, kind, size, mtime]`.
- `reconcile()` method emits Tauri `reconcile:progress` events via `app.emit(...)` (same emit-from-task pattern as `import_controller.rs`).
- Module-top doc comment must cite RESEARCH §Pattern 4 + the SQLite WAL docs URL + the `bundled` feature rationale (D-21 + `~200KB` ABI cost note).

---

### `src-tauri/src/onboarding.rs` (Rust module, file-I/O with atomic temp+rename)

**Role:** Load / save `~/.mneme/onboarding-state.json` (`{current_step, vault_path, courses_added: Vec<String>, completed_at: Option<DateTime>}`). Atomic temp+rename. `complete()` one-shot transition sets `completed_at`.

**Analog:** `src-tauri/src/dev.rs::flush` rotation step (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/src/dev.rs:200-233`) for the temp-write-then-rename idiom. RESEARCH §Pattern 1 (lines 423-445) gives the canonical sketch.

**Atomic temp+rename pattern** (from `dev.rs:212-232`):
```rust
let payload_len: u64 = buf.iter().map(|s| s.len() as u64).sum();
let current_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
if current_size + payload_len > ROTATION_THRESHOLD_BYTES {
    let backup = path.with_extension("log.1");
    let _ = std::fs::rename(path, &backup);
}

let mut file = match OpenOptions::new().append(true).create(true).open(path) {
    Ok(f) => f,
    Err(_) => { buf.clear(); return; }
};
for line in buf.drain(..) {
    let _ = file.write_all(line.as_bytes());
}
let _ = file.flush();
```

**Replicate** (per RESEARCH §Pattern 1 lines 430-444):
```rust
pub fn save_onboarding_state(state: &OnboardingState) -> Result<(), io::Error> {
    let final_path = home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "no home"))?
        .join(".mneme/onboarding-state.json");
    let tmp_path = final_path.with_extension("json.tmp");

    let json = serde_json::to_vec_pretty(state)?;
    {
        let mut f = File::create(&tmp_path)?;
        f.write_all(&json)?;
        f.sync_all()?;
    }
    fs::rename(&tmp_path, &final_path)?;
    Ok(())
}
```

**What changes vs dev.rs analog:**
- dev.rs uses `let _ = ...` (D-SF-04 — swallow on telemetry failure). onboarding.rs must propagate errors via `Result<(), io::Error>` so the Tauri command boundary surfaces them to the user (resume-from-incomplete-step is SPEC acceptance — silent corruption is a regression).
- `serde_json::to_vec_pretty(state)?` for human-readability of the state file (the user inspects `~/.mneme/onboarding-state.json` during dev). Phase 1 `dev.rs` writes pipe-delimited strings — different format because telemetry.
- `f.sync_all()?` BEFORE rename is mandatory (RESEARCH §Pattern 1 comment line 440: "ensures bytes are durable before rename"). The `let _ = file.flush()` from dev.rs is NOT sufficient — onboarding state must be crash-recovery-safe.

---

### `src-tauri/src/config.rs` (Rust module, file-I/O with atomic temp+rename)

**Role:** Load / save `~/.mneme/config.json` (`{vault_path: String, schema_version: u32}`). Atomic temp+rename. Cached at app startup; writes through same path.

**Analog:** `src-tauri/src/onboarding.rs` (sibling — same atomic write pattern, same `~/.mneme/` parent dir).

**Replicate:** verbatim adaptation of the `save_onboarding_state` sketch above with:
- struct shape `pub struct Config { pub vault_path: String, pub schema_version: u32 }` (D-20 verbatim).
- `pub const CURRENT_SCHEMA_VERSION: u32 = 1;` SCREAMING_SNAKE_CASE.
- `load() -> Result<Config, io::Error>` returns default-shape on `NotFound` (first-launch path); propagates on parse error (corrupt config is a user-visible failure that the onboarding wizard then surfaces).

**What changes vs onboarding.rs sibling:**
- Default-on-NotFound semantics differ. Onboarding-state absent ⇒ start wizard. Config absent ⇒ first-launch default; will be created on first wizard Finish.
- Schema-version forward-compat: load() must surface `schema_version` mismatch via `Err(...)` so future versions can route to a migration path. v1 only — single version.

---

## Pattern Assignments — Svelte components (main UI additions)

### `src/lib/components/SettingsPanel.svelte` (Svelte component, multi-pane shell)

**Role:** REPLACES `SettingsModal.svelte`. 8-category left rail + 3 v1-functional bodies + 5 placeholder bodies. Cmd+, entry. Per UI-SPEC §8.2 uses `<div role="dialog" aria-modal="true">` overlay (NOT `<dialog>` — 8-cat layout exceeds modal-native ergonomics).

**Analog:** `src/lib/components/SettingsModal.svelte` (current placeholder — `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/SettingsModal.svelte:1-63`) for the existing host pattern; `src/lib/components/Splitter.svelte` for the multi-pane layout with persistence.

**Existing `<dialog>` host pattern** (from `SettingsModal.svelte:10-21`):
```svelte
<script lang="ts">
  let { dialog = $bindable() }: { dialog?: HTMLDialogElement } = $props();
  function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="settings-modal">
  <p>Settings wires in Phase 2</p>
  <button type="button" onclick={close}>Close</button>
</dialog>
```

**Multi-pane layout + localStorage pattern** (from `Splitter.svelte:40-75`):
```svelte
const STORAGE_KEY = "mneme.layout.split";
// ...
onMount(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.leftRatio === "number" && typeof parsed.middleRatio === "number") {
        const normalized = clampAndNormalize(parsed.leftRatio, parsed.middleRatio);
        leftRatio = normalized.leftRatio;
        middleRatio = normalized.middleRatio;
      }
    }
  } catch (err) {
    console.warn("[splitter] failed to restore layout from localStorage", err);
  }
});
```

**What to replicate:**
- `<dialog>` → `<div role="dialog" aria-modal="true">` overlay per UI-SPEC §8.2 (planner-locked decision — do not revert to `<dialog>`).
- Esc-close + click-outside-to-close behavior (manual implementation; `<dialog>` Esc semantics are lost on `<div>`).
- `localStorage` key naming `mneme.settings.activeCategory` (Splitter's `mneme.layout.split` convention — CONTEXT L125-126 "Splitter localStorage key namespace: continue with `mneme.<area>.<field>` Phase 1 convention").
- 8 category routing via `let activeCategory = $state<CategoryKey>("vault")` + `{#if activeCategory === "vault"}<VaultCategory />{/if}` switch.
- KD-13 visual tokens (cream surface, soft border, font-serif headings, font-mono labels) — `tokens.css` already supplies all values.

**What changes:**
- File factor split: SettingsPanel is the shell; each category is a child component (`settings/VaultCategory.svelte` etc.) — coding-style.md "many small files" rule + 8-cat layout would otherwise blow past 800 LOC.
- Cmd+, keyboard listener at panel-mount time (interaction-paradigm thread allows Cmd+, per Phase 2 D-13 sibling acceptance — already locked).
- Reads from `vault-state.svelte.ts` (new singleton) for the vault path + course list displayed in VaultCategory.

---

### `src/lib/components/settings/VaultCategory.svelte` (Svelte leaf, IPC-triggering form panel)

**Role:** Displays current vault path + Move button + course list with Add/Remove. Calls `invoke("vault_create")` / `invoke("create_course")` / `invoke("move_vault")` on user action.

**Analog:** `src/lib/components/ChatFooter.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/ChatFooter.svelte`) for the button-row + state-driven-style composition (especially `vault-ctx active` toggle at lines 89-103).

**Composition pattern** (from `ChatFooter.svelte:26-37`):
```svelte
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    vaultContextActive: boolean;
    onToggleVaultContext: () => void;
    sendStopSlot: Snippet;
  }
  let { vaultContextActive, onToggleVaultContext, sendStopSlot }: Props = $props();

  function unimplementedToast(msg: string) {
    console.log(`[chat-footer] ${msg}`);
  }
</script>
```

**What to replicate:**
- `Props` interface declared inline at top of script (Phase 1 convention).
- Callback props for actions: `onAddCourse: (code: string) => Promise<void>` (parent owns IPC).
- Disabled-state visual treatment per ChatFooter mic button (`disabled`, `opacity: 0.45`, `cursor: not-allowed`) — useful for "Move" button mid-operation.

**What changes:**
- This category triggers real IPC, not toast-only stubs. Wrap each `invoke("...")` in try/catch + display error via parent's import-state singleton (graceful failure UX).
- Course-code regex validation `^[A-Z]{4}\d{4}$` (RESEARCH §"Claude's Discretion" line 126 + USYD course-code reality MATH1062 / INFO1110 / STAT1003 / COMP3221 verified).

---

### `src/lib/components/settings/AppearanceCategory.svelte` (Svelte leaf, no-op toggle stub)

**Role:** Light/dark toggle that no-ops in v1 per KD-13 light-only lock. Toggle visible but inoperative.

**Analog:** `src/lib/components/ChatFooter.svelte` vault-ctx toggle (lines 89-103) for the visual-only toggle pattern + LectureVideo.svelte placeholder copy for the "wired in Phase N" sub-line treatment.

**Replicate:** the `class:active={vaultContextActive}` + `aria-pressed={vaultContextActive}` pattern from ChatFooter L92-93 for the toggle's visual state, even though the click handler is a no-op (`unimplementedToast("Dark mode arrives in v1.x")` style).

**What changes:** ChatFooter's vault-ctx wraps a future-feature visual; AppearanceCategory's toggle wraps a permanently-deferred toggle for v1. Use distinct toast copy per UI-SPEC §10.11 ("Coming in v1.x. Light/dark theme arrives when KD-13 v2 ships.")

---

### `src/lib/components/settings/KeybindingsCategory.svelte` (Svelte leaf, read-only table)

**Role:** Read-only display of current keybindings (Cmd+Q / Cmd+, / Cmd+I / Cmd+Shift+V / etc.). NO override capability in v1.

**Analog:** `src/lib/components/FileArea.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/FileArea.svelte:32-45`) for the static-array-to-table render pattern.

**Static-table pattern** (from `FileArea.svelte:32-45`):
```svelte
const rows: Row[] = [
  { name: "transcripts", kind: "folder", size: "—", type: "Folder", mtime: "2026-05-07 22:10" },
  { name: "notes.md", kind: "md", size: "12 KB", type: "MD file", mtime: "2026-05-08 16:51" },
  // ...
];
```

**Replicate:** `const keybindings: Keybinding[] = [{ action: "Open Settings", combo: "Cmd+,", category: "global" }, ...]` then `{#each keybindings as kb (kb.action)}<row>...</row>{/each}`. Reuse the `.cell.muted` / `.cell` grid layout from FileArea.

**What changes:** Read-only — no checkboxes, no sort indicator, no hover effect (just plain rows).

---

### `src/lib/components/settings/ComingSoonCategory.svelte` (Svelte leaf, placeholder copy)

**Role:** Reusable placeholder for 5 categories (General / Sync / Claude / Privacy / Advanced). Per UI-SPEC §10.11 two-line treatment: heading + explanatory subline.

**Analog:** `src/lib/components/LectureVideo.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/LectureVideo.svelte:21-31`) for the centered-placeholder-card pattern.

**Placeholder card pattern** (from `LectureVideo.svelte:21-31`):
```svelte
<div class="preview-placeholder">
  <div class="pp-frame">
    <svg ... />
  </div>
  <div class="pp-title">Lecture video player</div>
  <div class="pp-sub">EchoVideo wired in Phase 4</div>
</div>
```

**Replicate:**
- `.pp-title` (serif 16px, `--color-warm-dark`) — the heading line.
- `.pp-sub` (mono 11.5px, `--color-warm-dark-mute`) — the explanatory subline.
- Centered card with subtle dotted-background — but use a flatter treatment (no 16:9 aspect-ratio) since these are inline panel bodies not video placeholders.

**What changes:**
- Props: `interface Props { title: string; subline: string }` so 5 callers parameterize differently.
- Per UI-SPEC §10.11 the subline must reflect the actual phase mapping (not Phase 3 generic) — e.g., "Coming in Phase 7" for Privacy, "Coming in v2" for Sync.

---

### `src/lib/components/ImportDialog.svelte` (Svelte component, modal with adaptive picker)

**Role:** Modal opened by drag-drop / Cmd+I. Shows file list + course picker (adaptive per D-10: 0 / 1-3 / 4-10 / 10+) + category radio (`lectures / tutorials / assignments / announcements / _inbox`, default `_inbox` per D-11). Submit triggers `invoke("start_import")`.

**Analog:** `src/lib/components/ChatFooter.svelte` for form-control composition (button-row + active-state + serif input shell); `src/lib/components/SettingsModal.svelte` for the `<dialog>` host.

**Form-control composition** (from `ChatFooter.svelte:39-103`):
- `.foot-btn` pattern for icon + label buttons.
- `class:active={vaultContextActive}` for radio-like toggle state.
- `aria-pressed={...}` for accessibility.

**Modal host pattern** (from `SettingsModal.svelte:18-21`):
```svelte
<dialog bind:this={dialog} class="settings-modal">
  <p>Settings wires in Phase 2</p>
  <button type="button" onclick={close}>Close</button>
</dialog>
```

**What to replicate:**
- `<dialog>` host pattern (UI-SPEC §8.3 confirms ImportDialog is small-modal-suitable; ImportDialog uses `<div role="dialog">` per spec but planner may keep `<dialog>` if Esc-close + Tab-trap are wired manually).
- KD-13 visual tokens (`--color-cream` surface, `--shadow-2` elevation, `--border-soft` hairline).
- Per-import default semantics (D-11): course empty (must select), category `_inbox`. Reset on dialog re-open (no remember-last).

**What changes:**
- Adaptive course picker (D-10) — branch on `vaultState.courseCount`:
  - `0 courses` → render "No courses yet. Add a course in Settings → Vault, then re-drop." with `[Open Settings]` + Close ghost-link.
  - `1-3 courses` → vertical `<input type="radio">` stack.
  - `4-10 courses` → styled `<select>`.
  - `10+ courses` → typeahead input.
- File-name display uses `--font-mono` 14px per UI-SPEC §8.3 (filenames carry case sensitivity + underscores).
- Cancel button per D-16: stops iteration without rollback. The Cancel handler invokes `invoke("cancel_import", { operation_id })`.

---

### `src/lib/components/DuplicateResolutionDialog.svelte` (Svelte component, nested confirmation)

**Role:** Per D-08, when import detects same-name file: dialog with Replace / Skip / Rename buttons + batch "Apply to all M remaining duplicates" checkbox. Nested overlay ON TOP of ImportDialog (parent stays mounted but inert).

**Analog:** `src/lib/components/SettingsModal.svelte` `<dialog>` host + ChatFooter button rows.

**What to replicate:** Same `<dialog>` host pattern with `--shadow-2` elevation. Three actions = three buttons styled per ChatFooter `.foot-btn` (no orange CTA — Replace is destructive-ish but D-08 doesn't elevate it to primary CTA).

**What changes:**
- "Apply to all" checkbox using FileArea `.cbx` styling (lines 380-411) — already cream-circle + orange-checked.
- Footer per UI-SPEC §8.7 divergence rule: single `Continue` button, NO `Back to file list` ghost-link (defends D-08 safety contract).
- Esc behaves as Skip+Cancel-rest (UI-SPEC §8.7 L1147). Wire Esc listener at dialog mount.

---

### `src/lib/components/ImportStatusPill.svelte` (Svelte leaf, reactive pill)

**Role:** Inline pill in TitlebarMeta between connection-status and vault-path. 4 states per UI-SPEC §8.5 (idle, importing, just-imported, error). Click opens ImportHistoryModal.

**Analog:** `src/lib/components/TitlebarMeta.svelte` connection-dot (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/TitlebarMeta.svelte:42-44, 76-97`).

**Reactive-state-derived chip pattern** (from `TitlebarMeta.svelte:42-44, 76-97`):
```svelte
<span class="dot" data-status={connectionState.status} aria-hidden="true"></span>
<!-- ... -->
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-warm-dark-mute);
  transition: background var(--duration-base) var(--ease-out);
}
.dot[data-status="connected"] {
  background: #4ea36b;
  box-shadow: 0 0 0 2px rgba(78, 163, 107, 0.18);
}
.dot[data-status="disconnected"] { background: var(--color-error); }
```

**Replicate:**
- `data-status={importState.pillState}` attribute-selector pattern for the 4 states (idle / importing / just-imported / error).
- Reactive read from module-scope `$state` — `import { importState } from "$lib/import-state.svelte"`.
- `transition: ... var(--duration-base) var(--ease-out)` per KD-13.

**What changes:**
- 4 states vs 3 (TitlebarMeta has connecting / connected / disconnected; pill has idle / importing / just-imported / error).
- Click handler opens history modal: `onclick={() => importHistoryModalDialog?.showModal()}` (composes with the sibling ImportHistoryModal).
- Importing state shows accent orange text per UI-SPEC §4 line 138: "Importing-state status pill text color (transient, returns to `--color-warm-dark-mute` once idle)".

---

### `src/lib/components/ImportHistoryModal.svelte` (Svelte component, list modal)

**Role:** Most-recent-20 import operations modal. Per SPEC REQ-9: timestamp + count + target course/category + success/failure summary; failures show per-file error message.

**Analog:** `src/lib/components/SettingsModal.svelte` `<dialog>` host + `src/lib/components/FileArea.svelte` row-list pattern (lines 117-167).

**Row-list pattern** (from `FileArea.svelte:118-167`):
```svelte
<div id="filerows">
  {#each rows as r (r.name)}
    <div class="row" data-kind={r.kind === "folder" ? "folder" : "file"} class:selected={r.active}>
      <div class="cell"><div class="name-cell">...</div></div>
      <div class="cell muted">{r.size}</div>
      <div class="cell muted">{r.type}</div>
      <div class="cell muted">{r.mtime}</div>
    </div>
  {/each}
</div>
```

**Replicate:**
- `<dialog>` host + KD-13 cream surface + `--shadow-2`.
- `{#each operations as op (op.id)}<row>...</row>{/each}` grid layout (4 cols: timestamp / count / course-category / status).
- `data-status={op.status}` attribute pattern for success / partial-error / cancelled visual states.
- Per UI-SPEC §4 destructive token: error-row left border in `--color-error` (stroke-only per Phase 1 D-22).

**What changes:**
- Per-file error message expansion via `{#each op.failures as failure}<div class="err">{failure.path}: {failure.message}</div>{/each}` nested rendering.

---

### `src/lib/components/dropzone/DropzoneOverlay.svelte` (Svelte component, full-window drag overlay)

**Role:** Full-window overlay shown on dragenter when `DataTransfer.types.includes("Files")` (D-09). KD-13 cream backdrop + "Drop to import" hero per UI-SPEC §8.4.

**Analog:** **NO direct Phase 1 analog** (first drag-drop use). Fallback patterns:
- `src/routes/+page.svelte:34` `.stage` full-viewport overlay-style fixed positioning (`position: fixed; inset: 0`).
- `src/lib/components/AssistantMessage.svelte` rAF-batched `$effect` for the show/hide counter approach (RESEARCH §"Frontend-Implementer Reusables" Pitfall 9).

**Recommended idiom** (from RESEARCH §"Pattern 6 — D-09 DataTransfer.types discrimination" — to be cross-referenced; falling back to canonical drag-counter pattern):
```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  let visible = $state(false);
  let dragCounter = 0;

  function onDragEnter(e: DragEvent) {
    // D-09: discriminate native files from text drags
    if (!e.dataTransfer?.types.includes("Files")) return;
    dragCounter++;
    visible = true;
    e.preventDefault();
  }

  function onDragLeave(e: DragEvent) {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      visible = false;
    }
  }

  function onDragOver(e: DragEvent) {
    if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    visible = false;
    if (e.dataTransfer?.files) {
      // emit files to parent / open ImportDialog
    }
  }

  onMount(() => {
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
  });

  onDestroy(() => {
    window.removeEventListener("dragenter", onDragEnter);
    // ... mirror
  });
</script>

{#if visible}
  <div class="dropzone-overlay">
    <div class="hero">Drop to import</div>
  </div>
{/if}
```

**What to replicate:**
- `.stage`-style `position: fixed; inset: 0` from `+page.svelte:88-94`.
- KD-13 cream backdrop + `--font-serif` display heading per UI-SPEC §8.4.
- Counter approach (dragenter increments, dragleave decrements) — RESEARCH-flagged Pitfall 9 fix: nested-element dragenter/leave events fire multiple times; counter is the canonical fix.
- DataTransfer.types gate (D-09 line 90) — `e.dataTransfer?.types.includes("Files")` MUST be the entry gate so text drags pass through to ChatPanel in v1.x.

**What changes vs fallback:**
- This is a brand-new pattern — no Phase 1 component uses `window.addEventListener("drag*", ...)`.
- Module-top doc comment must cite RESEARCH §"Pitfall 9 — drag-counter approach" + D-09 + the WebKit DataTransfer dragenter quirk URL (RESEARCH §"Secondary sources" line 1278).
- `dragDropEnabled: false` must be set in `src-tauri/tauri.conf.json` so Tauri's native drag interception is disabled and HTML5 DOM events fire (RESEARCH §"Frontend-Implementer Reusables" line 1199 + open question 1).

---

### `src/lib/components/ReconciliationOverlay.svelte` (Svelte component, startup spinner)

**Role:** Full-screen "Indexing vault... N / M" spinner shown before main UI mounts (per D-14 DR1 user choice). Listens to `reconcile:progress` events from Rust scan; unmounts on `reconcile:done`.

**Analog:** **NO direct Phase 1 analog** (first startup-blocking overlay). Fallback patterns:
- `src/routes/+page.svelte:34` `.stage` full-viewport overlay positioning.
- `src/lib/components/AssistantMessage.svelte` rAF-batched effect for the progress-event animation.

**Tauri event listener pattern** (from RESEARCH §Pattern 3 sketch + canonical `@tauri-apps/api/event::listen`):
```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";

  let current = $state(0);
  let total = $state(0);
  let visible = $state(true);
  let unlisten: UnlistenFn | null = null;

  onMount(async () => {
    unlisten = await listen<{ current: number; total: number }>(
      "reconcile:progress",
      (event) => {
        current = event.payload.current;
        total = event.payload.total;
      }
    );
    const doneUnlisten = await listen("reconcile:done", () => {
      visible = false;
    });
    // ... combine unlisten
  });

  onDestroy(() => {
    unlisten?.();
  });
</script>
```

**What to replicate:**
- KD-13 cream-backdrop full-screen overlay (same `position: fixed; inset: 0` shape as DropzoneOverlay).
- `@tauri-apps/api/event::listen` for `reconcile:progress` / `reconcile:done` event subscription.
- Loading spinner arc in `--color-orange` per UI-SPEC §4 line 139 (accent reserved use #6).

**What changes vs fallback:**
- This is a brand-new pattern. Module-top doc comment cites D-14 + SPEC L65 performance budget (≤200ms ≤100 files) + RESEARCH §"escalation trigger" (>500 files / >1000ms revisits to DR2 in v1.x).

---

## Pattern Assignments — Onboarding wizard (full-screen route)

### `src/lib/components/onboarding/Onboarding.svelte` (Svelte component, state owner)

**Role:** Owns wizard state + step routing + persistence calls. Routes between 6 step children via `currentStep` state. Calls `invoke("save_onboarding_state")` on Next, `invoke("complete_onboarding")` on Finish.

**Analog:** `src/lib/components/ChatPanel.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/ChatPanel.svelte:60-127`) for state-owner + multi-child orchestrator pattern.

**State owner pattern** (from `ChatPanel.svelte:60-79, 130-167`):
```svelte
// ---------- state ----------
let prompt = $state("");
let dispatch = $state<DispatchState>(freshState());
let pulseDotVisible = $state(false);
let scroller: HTMLDivElement | undefined = $state();
// ...

// ---------- send-prompt orchestration ----------
async function sendPrompt() {
  if (!prompt.trim() || dispatch.isStreaming) return;
  // ...
  let cmd: Command<string>;
  try {
    cmd = Command.create(cmdName, buildClaudeArgs(userText, scratchDir, opts));
  } catch (e) {
    console.error("[claude:build-args]", e);
    dispatch.messages = [...dispatch.messages, { id: uid(), role: "system", systemKind: "error", text: escapeHtml(`Failed to build spawn args: ${String(e)}`), streaming: false }];
  }
}
```

**Replicate:**
- `let onboardingState = $state<OnboardingState>(...)` at component top — single canonical state object.
- `async function onNext()` orchestrates: validate current step → mutate state → `invoke("save_onboarding_state", { state: onboardingState })` → advance.
- Try / catch around every `invoke(...)` per Phase 1 Cycle-1 MEDIUM closure pattern (ChatPanel L193-200).
- Console-tagged errors `[onboarding:save]` per Phase 1 logging convention (CLAUDE.md "tagged prefix `[<source>:<event>]`").

**What changes vs ChatPanel:**
- ChatPanel owns subprocess lifecycle + stream-event dispatch. Onboarding owns step navigation + persistence only — no subprocess interaction.
- Routing via `goto(\`/onboarding/${nextStep}\`)` from `$app/navigation` (SvelteKit) at Next click — but the actual state-mounted step renders based on URL param. Alternatively, owner-internal `currentStep` state without URL routing (UI-SPEC §8.1 supports either; planner picks).

---

### Step1Welcome / Step4MCPStatus (Svelte leaves, hero / placeholder steps)

**Analog:** `src/lib/components/LectureVideo.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/LectureVideo.svelte:21-31`) — centered card with title + sub-line.

**What to replicate:** `.preview-placeholder` flex-center vertical stack with `--font-serif` display heading + `--font-mono` sub-line. Step 4 explicitly mirrors LectureVideo's "wired in Phase N" subline copy ("no external MCP — self-ecosystem mode" per CONTEXT line 293).

---

### Step2AuthCheck (Svelte leaf, status check step)

**Analog:** `src/lib/components/TitlebarMeta.svelte` connection-dot (lines 43-44) for the status-dot + label pattern.

**Replicate:** `<span class="dot" data-status={authStatus}>` with `data-status` switching between `checking` / `found` / `missing`. Per UI-SPEC §4 the `found` state uses `--color-success` (one of the 3 reserved success uses per UI-SPEC §4 line 148-150).

---

### Step3VaultPicker (Svelte leaf, path picker form)

**Analog:** `src/lib/components/ChatPanel.svelte` sendPrompt (lines 130-167) for IPC + state-mutation orchestration.

**Replicate:** input + browse button (calls `@tauri-apps/plugin-dialog` `open({ directory: true })`) + validation feedback (path exists + writable). Per UI-SPEC §4 line 149 the valid-path checkmark uses `--color-success`.

---

### Step5AddCourse (Svelte leaf, text-input form)

**Analog:** `src/lib/components/ChatPanel.svelte` input shell + Send button pattern (lines 150-167).

**Replicate:** text input + Add button + "Skip — add later" ghost link. Course-code regex validation `^[A-Z]{4}\d{4}$` (RESEARCH "Claude's Discretion" line 126).

---

### Step6DemoImport (Svelte leaf, dropzone within step)

**Composition:** mounts `DropzoneOverlay.svelte` (sibling new component) inline + Skip button.

**What changes vs DropzoneOverlay sibling:** Scope is the step container, not the full window. Either pass a `containerRef` prop to DropzoneOverlay or duplicate the listener wired to the step container — planner picks.

---

### OnboardingStepRail (Svelte leaf, active-step indicator)

**Analog:** `src/lib/components/FileArea.svelte` `.active-sort` indicator (line 100) for the active-state class pattern.

**Active-state pattern** (from `FileArea.svelte:96-100`):
```svelte
<div class="cell name-head" class:active-sort={activeSortKey === "name"}>
  <input type="checkbox" class="cbx" aria-label="Select all">
  <span class="head-spacer" aria-hidden="true"></span>
  <span class="head-label"><span>Name</span><span class="sort" aria-hidden="true"></span></span>
</div>
```

**Replicate:** `<div class="step" class:active={currentStep === i}>` with `--color-orange` filled circle for active step per UI-SPEC §4 line 137 (accent reserved use #4).

---

## Pattern Assignments — Routes

### `src/routes/onboarding/[step]/+page.svelte` (SvelteKit dynamic route)

**Role:** Step router — reads `$page.params.step` and mounts the corresponding step component (delegating to `Onboarding.svelte` shell).

**Analog:** `src/routes/+page.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/routes/+page.svelte:1-22`) — existing root route (mneme's only Phase 1 route).

**Existing route pattern** (from `+page.svelte:13-22`):
```svelte
<script lang="ts">
  import Splitter from "$lib/components/Splitter.svelte";
  import FileArea from "$lib/components/FileArea.svelte";
  import LectureVideo from "$lib/components/LectureVideo.svelte";
  // ...
</script>
```

**Replicate:** Import `Onboarding.svelte` + read URL param. `[step]` dynamic SvelteKit convention requires `+page.ts` (or similar) to declare `prerender = false` since the URL is dynamic — verify against `src/routes/+layout.ts` (current: SSR off + prerender true) and possibly add a per-route prerender override.

**What changes vs main route:**
- Dynamic param consumption — first use in project. SvelteKit convention: `import { page } from "$app/stores"` + `$page.params.step`.
- No three-pane Splitter shell — onboarding takes full screen per D-01.

---

### `src/routes/onboarding/+layout.svelte` (SvelteKit nested layout)

**Role:** Onboarding-only wrapper. No Splitter / MindMapBar. Keeps 36px overlay titlebar visible (Cmd+Q drain path).

**Analog:** `src/routes/+layout.svelte` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/routes/+layout.svelte:1-44`) — root layout.

**Root layout pattern** (from `+layout.svelte:16-43`):
```svelte
<script lang="ts">
  import "$lib/styles/tokens.css";
  import "katex/dist/katex.min.css";

  if (import.meta.env.DEV) {
    void import("$lib/dev/console-forwarder").then(({ installConsoleForwarder }) => {
      installConsoleForwarder();
    });
  }

  let { children } = $props();
</script>

{@render children()}
```

**Replicate:** Same `let { children } = $props()` + `{@render children()}` pass-through pattern.

**What changes:**
- No tokens.css import (inherited from root +layout.svelte).
- Just a structural wrapper for the titlebar + step-rail + step-body grid.

---

## Pattern Assignments — Svelte state singletons

### `src/lib/import-state.svelte.ts` (module-scope `$state` reactive singleton)

**Role:** Current operation + recent-20 history + status-pill state derived from operation state.

**Analog:** `src/lib/connection-state.svelte.ts` (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/connection-state.svelte.ts:1-42`) — exact template.

**Template pattern** (from `connection-state.svelte.ts:31-41`):
```typescript
export type ConnectionStatus = "connected" | "connecting" | "disconnected";

// Module-level $state — reactive across the app. Mutating .status (via setStatus)
// triggers re-renders in any component that reads connectionState.status.
export const connectionState = $state<{ status: ConnectionStatus }>({
  status: "disconnected",
});

export function setStatus(status: ConnectionStatus): void {
  connectionState.status = status;
}
```

**Replicate:**
- `.svelte.ts` suffix mandatory (Phase 1 file-header comment lines 21-26 + CLAUDE.md "Svelte 5 requires `.svelte.ts` (or `.svelte.js`) for module-level `$state` rune to work across module boundaries reactively").
- Module-top doc comment explaining the reactive singleton invariant + listing every consumer (TitlebarMeta, ImportStatusPill, ImportHistoryModal — Phase 2 has more consumers than Phase 1).
- Exported setter functions for each mutation (e.g., `setImportingState / appendToHistory / setIdle`).

**What changes:**
- Multi-field state object: `{ pillState: "idle" | "importing" | "just-imported" | "error", currentOperation: ImportOperation | null, recentTwenty: ImportOperation[] }`.
- Status-pill state derivation: per UI-SPEC §8.5 — could live as a derived `$derived(...)` rune INSIDE this module OR be computed in `ImportStatusPill.svelte`. RESEARCH §TDD Candidates line 1230 marks state-derivation as TDD-suitable, suggesting it should live in this module (pure derivation function testable via Vitest).
- Listen to `import:progress` Tauri events at module-load time? — defer to planner (likely "no — let `Onboarding.svelte` + `ChatPanel.svelte` siblings be the event subscribers and call setters here").

---

### `src/lib/vault-state.svelte.ts` (module-scope `$state` reactive singleton)

**Role:** Current vault path + course list cache + `courseCount` derived value.

**Analog:** `src/lib/connection-state.svelte.ts` (same template).

**Replicate:** identical shape — `.svelte.ts` suffix, module-top doc comment, exported setter functions.

**What changes:**
- State shape: `{ vaultPath: string, courses: string[] }`.
- `courseCount` derived: prefer `$derived(vaultState.courses.length)` at the call site (ImportDialog course-picker D-10) rather than embedding in this module — keeps the singleton minimal.
- Module-load time `invoke("load_config")` to populate vaultPath? — defer to planner. Phase 1 connection-state.svelte.ts is module-default `"disconnected"` and re-asserted on +layout mount; vault-state likely follows same lazy-load pattern.

---

## Pattern Assignments — Modified files

### `src/lib/components/TitlebarMeta.svelte` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/lib/components/TitlebarMeta.svelte`):
- Hardcoded `let vaultPath = $state("~/Mneme/usyd-2026s1")` (line 27); reads via `localStorage.getItem("mneme.vault.path")` on mount (line 30).
- Renders connection-dot + `claude-code · {status}` + `vault: {vaultPath}` + settings cog (lines 42-55).
- Composes `<SettingsModal bind:dialog={modal} />` (line 57).
- Clicking cog calls `modal?.showModal()` (line 38).

**What changes:**
- Remove `let vaultPath = $state("~/Mneme/usyd-2026s1")` and `localStorage.getItem` block (lines 27-35).
- Import vault path from new singleton: `import { vaultState } from "$lib/vault-state.svelte"` + render `{vaultState.vaultPath}` (REQ-1 acceptance).
- Insert `<ImportStatusPill />` between `<span class="meta-text">claude-code · {connectionState.status}</span>` and `<span class="dot-sep">·</span><span class="meta-text">vault: {vaultPath}</span>` per UI-SPEC §8.8 (REQ-9 acceptance).
- Replace `<SettingsModal bind:dialog={modal} />` with `<SettingsPanel bind:open={settingsOpen} />` (D-19 + UI-SPEC §8.2 — Panel is no longer a `<dialog>` so the open mechanic shifts from `dialog.showModal()` to a `bind:open` boolean).
- Update cog `onclick` to `() => settingsOpen = true` (was `modal?.showModal()`).

**Risk:** Phase 1 has a Vitest snapshot test for TitlebarMeta layout — must be re-baselined after import-pill insertion. UI-SPEC §8.8 specifies the exact insertion point + spacing; verify against the locked Mneme 3 bundle HTML.

---

### `src/routes/+layout.svelte` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/routes/+layout.svelte:1-44`):
- Imports `tokens.css` + `katex/dist/katex.min.css`.
- DEV-guarded dynamic import of `console-forwarder` (lines 34-38).
- `<script lang="ts">` + `let { children } = $props()` + `{@render children()}`.

**What changes:**
- Add app-startup `onMount` (or top-of-script `if` since SSR is off — both are SPA-safe).
- Call `invoke("load_onboarding_state")` and `invoke("load_config")` in parallel via `Promise.all([...])`.
- Conditionally `goto(\`/onboarding/${state.current_step}\`)` if `state.completed_at === null`, else proceed to main UI.
- Mount `<ReconciliationOverlay />` if main UI path taken (D-14 — blocking spinner before three-pane shell mounts).
- Update vault-state singleton with loaded `config.vault_path` so TitlebarMeta picks it up.

**Risk:** SvelteKit prerender is `true` per `+layout.ts:2`. Verify dynamic routing under prerendered SPA — adapter-static fallback to `index.html` should handle this (svelte.config.js + adapter docs). If prerender breaks dynamic routes, may need `+page.ts: export const prerender = false` on `/onboarding/[step]`.

---

### `src/routes/+page.svelte` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src/routes/+page.svelte:1-159`):
- Three-pane Splitter shell (lines 51-77).
- `<TitlebarMeta />` mounted in `.titlebar` div (line 47).

**What changes:**
- Mount `<DropzoneOverlay />` at the top of the .stage wrapper (above Splitter) — DropzoneOverlay self-installs window-level drag listeners so no parent-side wiring needed beyond mounting.
- If DropzoneOverlay does not self-install, add `dragenter / dragleave / dragover / drop` listeners on the `.stage` element here.

**Risk:** Per D-09, listener must gate on `DataTransfer.types.includes("Files")` to avoid stealing text drags from ChatPanel (v1.x scope). If DropzoneOverlay does the gating internally, no risk. If parent wires the listener, parent does the gating.

---

### `src-tauri/src/lib.rs` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/src/lib.rs:1-164`):
- 3 Tauri commands registered (`register_session_pid` / `clear_session_pid` / `stop_session`) at lines 70-90.
- Debug-only invoke handler split adds 5 dev commands (lines 107-125).
- `SessionRegistry` managed in builder (line 105).
- WindowEvent::CloseRequested + RunEvent::ExitRequested union handler (lines 143-163) calls `state.kill_all()`.
- Setup hook creates `~/.mneme/scratch` (lines 135-141).

**What changes:**
- Add new `mod` declarations: `mod vault_writer; mod import_controller; mod vault_index; mod onboarding; mod config;` after the existing `mod session` line (after line 10).
- Add new managed state: `.manage(Arc::new(VaultWriter::new(...)))` + `.manage(Arc::new(ImportController::new()))` + `.manage(Arc::new(VaultIndex::init(...)?))` + `.manage(Arc::new(RwLock::new(Config::load()?)))`.
- Register ~12 new Tauri commands in `tauri::generate_handler!` macro per RESEARCH §"System Architecture Diagram" lines 281-287: `load_config / save_config / vault_create / create_course / list_courses / start_import / cancel_import / get_recent_imports / open_file_picker / open_folder_picker / load_onboarding_state / save_onboarding_state / reconcile_vault_index / move_vault`.
- Extend close-requested handler (line 149-151) to ALSO: (a) cancel all in-flight imports via `state.import_controller.cancel_all()`; (b) commit pending vault-index transactions (`state.vault_index.checkpoint_wal()`); (c) THEN call `session_registry.kill_all()` (existing). Order matters — RESEARCH §"Frontend-Implementer Reusables" line 1196.
- Add `~/.mneme/` directory creation alongside the existing `~/.mneme/scratch` creation (line 138) — Phase 2 config + onboarding state both live in `~/.mneme/`.

**Risk:**
- `tauri::generate_handler!` macro does NOT accept `#[cfg]` between entries (CLAUDE.md "the macro `tauri::generate_handler!` does NOT accept `#[cfg]` between entries, so the builder must be split into two top-level branches"). The existing debug/release builder split must preserve this — Phase 2's ~12 new commands are not dev-gated, so they go in the COMMON `invoke_handler` block (NOT inside `#[cfg(debug_assertions)]`).
- Capability JSON must register these commands per D-19 BEFORE the audit gate runs at next commit. See `src-tauri/capabilities/default.json` modification entry below.

---

### `src-tauri/Cargo.toml` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/Cargo.toml:20-28`):
- `tauri = { version = "2" }`, `serde`, `serde_json`, `tauri-plugin-shell`, `nix`, `home`, `tokio` (lines 21-28).

**What changes:**
- Add `rusqlite = { version = "0.39", features = ["bundled"] }` (D-21).
- Add `tauri-plugin-dialog = "2"` (RESEARCH §"Standard Stack" line 160).
- Add `tokio-util = { version = "0.7", features = ["sync"] }` if not transitive (RESEARCH §"Core" line 167 — verify lockfile).
- Add `uuid = { version = "1", features = ["v4"] }` if not transitive (RESEARCH §Pattern 3 sketch line 513).

**Risk:** `bundled` feature on rusqlite adds ~200KB to release binary (D-21 line 119 — explicitly acceptable). No license-compatibility risk (both MIT).

---

### `package.json` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/package.json:20-26`):
- dependencies: `@tauri-apps/api`, `@tauri-apps/plugin-shell`, `dompurify`, `katex`, `marked`.

**What changes:**
- Add `gray-matter: ^4.0.3` (D-21 + RESEARCH line 157).
- Add `@tauri-apps/plugin-dialog: ^2.7.1` (RESEARCH line 160).

**Risk:** gray-matter has a Node-side build (uses js-yaml). RESEARCH §"Supporting" line 176 notes the package ships browser-safe builds but flags "verify at execute-time by importing in Svelte component and running `npm run check`". Wave-0 gap.

---

### `src-tauri/capabilities/default.json` *(modified)*

**What's there now** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/src-tauri/capabilities/default.json:1-239`):
- 5 permission entries: `core:default`, `core:window:allow-start-dragging`, `shell:default`, `shell:allow-spawn`, `shell:allow-execute`.
- The latter two declare `claude-bin-fresh` + `claude-bin-resume` Command schemas with strict per-arg `validator` regexes.
- The file is GENERATED by `scripts/gen-capabilities.ts` from SSOT (`src/lib/spawn-args.shared.ts` + `spawn-args.node.ts`).

**What changes per D-19:**
- Add ~10-15 new permissions for new Tauri commands. D-19 line 113-114 explicitly notes these use Tauri 2's standard capability declaration model — NOT routed through `gen-capabilities.ts` (which is Phase 1 D-14 SSOT for `claude-bin` argv ONLY).
- BUT: `gen-capabilities.ts` is the file's writer. The audit script `audit-capabilities.sh:31-38` diffs the dry-run output against committed JSON. **Resolution**: Either (a) extend `gen-capabilities.ts` to also emit the Phase 2 permissions (preserving the SSOT contract), or (b) refactor the audit gate to accept Phase 2 permissions as fixed-literal additions outside the SSOT diff. Planner picks during plan-phase.
- Add `tauri-plugin-dialog` permissions (`dialog:allow-open` for file picker + folder picker per RESEARCH §"Standard Stack" line 160).
- New permissions are simple `identifier`-only strings (Tauri 2 standard) — NO `args: true` wildcard, NO `*` shell scope. The audit gate continues to enforce these prohibitions.

**Risk (CRITICAL):**
- `audit-capabilities.sh:31-38` will FAIL if `gen-capabilities.ts` output diverges from `default.json`. Phase 2 additions either go through gen-capabilities.ts (preserving SSOT contract) or the audit script must be extended to whitelist non-SSOT additions. Phase 1 D-14 commits the SSOT model strictly — bending it requires planner-level decision.
- Resolution direction (recommended): extend gen-capabilities.ts to emit Phase 2 permissions in a separate constant array, append to the JSON output. Audit gate stays unchanged. Plan-phase task surfaces this.

---

## Shared Patterns

### Atomic file write (temp + rename)

**Source:** `src-tauri/src/dev.rs:200-232` (rotation step) + RESEARCH §Pattern 1 (`02-RESEARCH.md:423-445`).

**Apply to:** `src-tauri/src/onboarding.rs` + `src-tauri/src/config.rs` + any future Phase 2+ JSON state file under `~/.mneme/`.

```rust
let final_path = home_dir().ok_or(...)?.join(".mneme/onboarding-state.json");
let tmp_path = final_path.with_extension("json.tmp");

let json = serde_json::to_vec_pretty(state)?;
{
    let mut f = File::create(&tmp_path)?;
    f.write_all(&json)?;
    f.sync_all()?;  // durable before rename
}
fs::rename(&tmp_path, &final_path)?;
```

---

### Module-scope reactive `$state` singleton

**Source:** `src/lib/connection-state.svelte.ts:31-41`.

**Apply to:** `src/lib/import-state.svelte.ts` + `src/lib/vault-state.svelte.ts`.

```typescript
export type ConnectionStatus = "connected" | "connecting" | "disconnected";
export const connectionState = $state<{ status: ConnectionStatus }>({
  status: "disconnected",
});
export function setStatus(status: ConnectionStatus): void {
  connectionState.status = status;
}
```

`.svelte.ts` suffix MANDATORY — plain `.ts` silently degrades to non-reactive plain object. The Phase 1 file-header comment (lines 21-26) carries the entire rationale; new singletons cite the same source.

---

### Tauri command shape with typed-error boundary

**Source:** `src-tauri/src/lib.rs:70-90` + `src-tauri/src/dev.rs:298-314`.

**Apply to:** ALL new Tauri commands in `vault_writer.rs` / `import_controller.rs` / `vault_index.rs` / `onboarding.rs` / `config.rs`.

```rust
#[tauri::command]
fn register_session_pid(state: State<SessionRegistry>, pid: u32) {
    state.register(1, ChildHandle { pid });
}

#[tauri::command]
pub async fn dev_log_console_entry(
    state: State<'_, DevWriter>,
    level: String,
    // ...
) -> Result<(), String> {
    // ... .map_err(|e| e.to_string())?;
    Ok(())
}
```

**Replicate:**
- `#[tauri::command]` attribute.
- `Result<T, String>` return type (string-bounded error per Rust security ruleset — never leak internal paths / stack traces).
- `.map_err(|e| e.to_string())?` at every internal Result boundary.

---

### Console-tagged logging convention

**Source:** Phase 1 CLAUDE.md "tagged prefix `[<source>:<event>]`" + `ChatPanel.svelte:196` (`console.error("[claude:build-args]", e)`) + `Splitter.svelte:72` (`console.warn("[splitter] failed to restore layout from localStorage", err)`).

**Apply to:** ALL new `console.{log,warn,error}` calls in Svelte components + .ts modules.

```typescript
try {
  vaultPath = localStorage.getItem("mneme.vault.path") ?? "~/Mneme/usyd-2026s1";
} catch (err) {
  console.warn("[titlebar-meta] failed to read vault.path from localStorage", err);
}
```

In DEV mode all console calls are forwarded to `.dev-logs/console.log` via Phase 01.1 `console-forwarder.ts` — tagged prefixes enable greppable telemetry.

---

### KD-13 token usage + form-isolation

**Source:** `src/lib/styles/tokens.css` (token registry) + Phase 1 D-22 form-isolation contract (CONTEXT line 108) + UI-SPEC §4 Color table.

**Apply to:** ALL Phase 2 new Svelte component `<style>` blocks.

Rules:
1. `--color-orange` ONLY as fill (CTA, focus ring, active step, etc. — see UI-SPEC §4 line 134 "Accent reserved for" list).
2. `--color-error` ONLY as stroke / text (NEVER fill).
3. `--bubble-user: #EEEBE2` SSOT 0' override (UserBubble.svelte:32 — `background: var(--color-cream-deep)`).
4. `cubic-bezier(0.165, 0.85, 0.45, 1)` ease per KD-13 — encoded as `--ease-out`.
5. `active:scale-[0.96]` baseline for clickable surfaces (see ChatFooter `.foot-btn:active` line 167).
6. Light theme only — `--color-cream` (60%) + `--color-cream-deep` (30%) + `--color-orange` (10%).
7. NO `#000` / `#fff` hard-coded values — KP-09 safeguard at tokens.css L213 (CLAUDE.md "Banned: `#000`, `#fff`").

---

### Visual SSOT comment header

**Source:** Phase 1 convention (`UserBubble.svelte:6` → "Visual SSOT: Mneme.html L633-648") + CONTEXT line 190 + CLAUDE.md "Visual SSOT comment header".

**Apply to:** EVERY new Phase 2 component.

Format:
- Main-shell extensions → `Visual SSOT: Mneme.html L<range>` (path: `/Users/qinyuan/Downloads/Mneme 3/Mneme.html`).
- Net-new Phase 2 surfaces → `Visual SSOT: Mneme 3/Mneme <Surface>.html` (per UI-SPEC §"Implementation Note" bundle map).
- Plus the line range / section ref into `02-UI-SPEC.md` §8.x — UI-SPEC wins when bundle and spec diverge (UI-SPEC §"Implementation Note" L33).

Example for ImportDialog.svelte:
```svelte
<!--
  ImportDialog.svelte — Phase 2 REQ-5 manual import surface.
  Visual SSOT: Mneme 3/Mneme Import Dialog.html (+ UI-SPEC.md §8.3).
  Per UI-SPEC §"Implementation Note" — where this divergence list applies,
  follow UI-SPEC, not HTML bundle (e.g., filenames in font-mono not font-serif).
-->
```

---

### Pre-commit gate enforcement (`audit-capabilities.sh`)

**Source:** `scripts/audit-capabilities.sh:1-118` (8 checks: SSOT drift / `args: true` wildcard / `"*"` wildcard / `--bare` absence / `--max-turns` sanity / `claude-code-parser` not-installed / browser-safety guard / legacy file guard).

**Apply to:** ALL Phase 2 IPC capability changes (D-19).

The pre-commit hook (`.husky/pre-commit`) runs `audit-capabilities.sh` + `vitest run --changed`. Phase 2 additions to `default.json` must:
- Pass the SSOT drift check (gen-capabilities.ts output == committed JSON).
- NOT introduce `"args": true` or `"*"`.
- NOT route Phase 2 commands through `claude-bin` spawn-args (Phase 1 SSOT scope only).
- Keep all browser-safety guards (`spawn-args.shared.ts` ZERO Node imports).

---

## No Analog Found (first-instance patterns)

Files with no close Phase 1 match — planner uses RESEARCH.md sketches + external sources:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src-tauri/src/vault_index.rs` | rusqlite wrapper | CRUD + reconciliation | First SQLite use in mneme. Use RESEARCH §Pattern 4 verbatim (`02-RESEARCH.md:561-600`) + rusqlite docs URL. |
| `src/lib/components/dropzone/DropzoneOverlay.svelte` | DOM drag overlay | event-driven (DataTransfer.types) | First drag-drop use. Use RESEARCH-flagged Pitfall 9 counter approach + WebKit dragenter quirk URL. |
| `src/lib/components/ReconciliationOverlay.svelte` | Startup blocking spinner | Tauri event listener | First startup-blocking overlay + first `@tauri-apps/api/event::listen` use in mneme. Use canonical Tauri event listen pattern. |
| `src/routes/onboarding/[step]/+page.svelte` | SvelteKit dynamic route | URL → state | First dynamic route. Use SvelteKit `[param]` convention + `$page.params` from `$app/stores`. |

---

## Metadata

**Analog search scope:** `src-tauri/src/*.rs` (4 files: lib.rs, session.rs, dev.rs, bin/dev_invoke.rs) + `src/lib/components/*.svelte` (15 components) + `src/lib/*.ts` (4 .ts files + 1 .svelte.ts singleton) + `src/routes/*.svelte` (1 page + 1 layout + 1 layout.ts) + `scripts/*.sh|.ts|.mjs` (gen-capabilities + audit + dev bridges).
**Files scanned:** ~28 Phase 1 source files read in full or targeted-section.
**Pattern extraction date:** 2026-05-15.
**Phase 1 baseline commit:** `cb567a6` (Phase 1.1 ship-ready per SPEC L15) + visual SSOT lock 2026-05-15 (`28167b0`).

---

## PATTERN MAPPING COMPLETE
