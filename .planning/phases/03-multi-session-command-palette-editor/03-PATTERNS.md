# Phase 3: Multi-Session + Command Palette + Editor - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 24 (12 new · 12 modified/extended)
**Analogs found:** 22 / 24 with strong in-repo analog (2 net-new — frontmatter splitter, JSONL transcript reader — have a partial analog + a documented seed)

> **How to read this file (planner):** every "Pattern Assignment" names the closest existing file + a real `file:line` excerpt to copy from. Net-new Phase-3 components carry a `// Visual SSOT: 03-UI-SPEC.md §<section>` header comment instead of a `Mneme.html` line range (03-UI-SPEC.md L18-23 — there is no prior HTML mockup for sidebar/palette/editor). The capability SSOT chain (spawn-args → gen-capabilities → default.json → audit → test) is ONE atomic unit — see "Shared Pattern: Capability SSOT chain". RESEARCH §"Recommended Project Structure" (03-RESEARCH.md L182-205) is the file-list source of truth; this map confirms each entry against the real codebase.

---

## File Classification

### New files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/components/CommandPalette.svelte` | component (modal) | request-response (query→rank→run) | `src/lib/components/SettingsPanel.svelte` (backdrop+role=dialog+Esc/Cmd) | role-match |
| `src/lib/components/SessionSidebar.svelte` | component (rail) | CRUD (list/switch/new/close sessions) | `src/lib/components/Splitter.svelte` (localStorage collapse) + `connection-state.svelte.ts` (footer) | role-match |
| `src/lib/components/SessionRailItem.svelte` | component (list row) | request-response (click→resume) | `src/lib/components/FileArea.svelte` rows / `UserBubble.svelte` (small Props component) | role-match |
| `src/lib/components/TiptapEditor.svelte` | component (editor) | event-driven (ProseMirror mount/destroy + onUpdate) | `src/lib/components/AssistantMessage.svelte` (`bind:this` + `$effect` DOM-lifecycle, rAF) | role-match |
| `src/lib/components/MiddlePaneRouter.svelte` | component (type-router) | transform (file ext → editor\|preview\|video) | `src/lib/components/FilePreview.svelte` (the slot it type-routes against) | role-match |
| `src/lib/components/SegmentedToggle.svelte` | component (control) | request-response (toggle Preview\|Edit) | `src/lib/components/settings/*Category.svelte` rail-item button pattern | partial |
| `src/lib/components/SoftLockPill.svelte` | component (indicator) | event-driven (lock-state → pill visible) | `src/lib/components/ImportStatusPill.svelte` (pill chip pattern) | role-match |
| `src/lib/components/CeilingToast.svelte` | component (toast) | event-driven (ceiling error → toast) | `src/lib/components/ReconciliationOverlay.svelte` (template-root mount + onDone) | partial |
| `src/lib/sessions.svelte.ts` | store (reactive singleton) | CRUD (active session + recents) | `src/lib/vault-state.svelte.ts` (module-scope `$state` + setters) | exact |
| `src/lib/keybindings.svelte.ts` | store / event registrar | event-driven (window keydown → dispatch) | `src/routes/+layout.svelte` DEV-forwarder install + `SettingsPanel.svelte` Cmd+, listener | role-match |
| `src/lib/palette-actions.ts` | utility (pure data) | transform (action set → handlers) | `src/lib/stream-dispatch.ts` helper-region (pure data + functions, no module state) | partial |
| `src/lib/editor-markdown.ts` | utility (transform) | transform (frontmatter split/rejoin) | `tests/gray-matter.test.ts` (gray-matter API) — **net-new module, gray-matter already a dep** | partial |
| `src/lib/transcript-reader.ts` | utility (parser) | batch / file-I/O (JSONL → DispatchState) | `src/lib/stream-dispatch.ts` (`freshState`/`dispatchEvent`) + `vendor/claude-code-parser` types — **net-new adapter** | partial |
| `src-tauri/src/sessions_store.rs` | model / repository | CRUD (rusqlite sessions table) | `src-tauri/src/vault_index.rs` (rusqlite WAL + `params![]` + poisoned-mutex helper) | exact |
| `src-tauri/src/editor_lock.rs` | service (file writer) | file-I/O (atomic JSON write of editor-locks.json) | `src-tauri/src/config.rs` (atomic temp+rename + `sync_all`) | exact |
| `.claude/settings.json` (in vault cwd, mneme-managed) | config | n/a (declares PreToolUse hook) | NO direct analog — net-new; written by `editor_lock.rs` via the config.rs atomic-write pattern | no-analog |
| `<vault>/.claude/hooks/editor-lock-hook.mjs` (node hook script) | utility (subprocess hook) | request-response (stdin JSON → exit 2) | `scripts/gsd-dev-*.mjs` (Node ESM script shape) — **logic is net-new** | partial |
| `tests/editor-markdown.test.ts` | test | n/a | `tests/spawn-args.test.ts` / `tests/gray-matter.test.ts` (vitest round-trip) | role-match |
| `tests/sessions-store.rs` (`src-tauri/tests/`) | test (integration) | n/a | `src-tauri/tests/vault_index_count.rs` (second rusqlite connection introspection) | role-match |

### Modified / extended files

| Modified File | Role | What Changes | Analog/Precedent for the change |
|---------------|------|--------------|---------------------------------|
| `src-tauri/src/session.rs` | model (registry) | add `count()` / `try_register_if_below(2)`; extend `ChildHandle` (`resume_token`, `spawned_at`) at the documented L18 extension point | self — `register`/`drain_one`/`locked()` already there (`session.rs` L41-64) |
| `src-tauri/src/lib.rs` | builder + IPC | register new commands in BOTH `generate_handler!` arms; D-10 count-check before `register_session_pid`; create `~/.mneme` dirs | `lib.rs` L100-120 (session cmds) + L774-779 (DB dir create) + L804-836 / L840-... (dual handler arms) |
| `src/lib/spawn-args.shared.ts` | SSOT (argv) | feed `resumeSessionId` from rusqlite row (no widening — `--resume` shape already exists); ONLY net-new flag if `-c` is added | `spawn-args.shared.ts` L88-97 (`BuildOpts`) + L148-149 (`--resume` head) |
| `scripts/gen-capabilities.ts` | codegen | regenerate from SSOT (only changes if `-c` adds a third Command shape) | `gen-capabilities.ts` L76-87 (FRESH/RESUMED shapes) + L189-193 (`SPAWN_ALLOW`) |
| `src-tauri/capabilities/default.json` | config (generated) | regenerated by prebuild (DO NOT hand-edit) | generated artifact — never hand-edited (audit Gate 1) |
| `scripts/audit-capabilities.sh` | gate | a new Gate if a new SSOT invariant lands (e.g. `-c` shape, sessions SQL) | `audit-capabilities.sh` Gate 10 (no `format!()` SQL — already covers `sessions_store.rs`) |
| `tests/capability-regex.test.ts` | test | add a case only if a new Command shape lands | `capability-regex.test.ts` L147-198 (resume-shape suite) |
| `src/lib/components/ChatPanel.svelte` | component | embed `SessionSidebar`; swap active `{session_id, cwd}` before `buildClaudeArgs`; compute+persist summary on `chat.result` | `ChatPanel.svelte` (existing `buildClaudeArgs` call site + stream loop) |
| `src/lib/stream-dispatch.ts` | logic | reuse unchanged for resumed-history render; `DispatchState.sessionId` already there | `stream-dispatch.ts` L82 (`sessionId`) + L285-315 (`result` arm — summary hook point) |
| `src/routes/+layout.svelte` | route (layout) | install global keybinding registrar (one `window` keydown) | `+layout.svelte` L94-98 (DEV-forwarder install pattern) |
| `src/routes/+page.svelte` | route (shell) | mount `CommandPalette` + `CeilingToast` at template root; route `.md` → editor in middleBottom slot | `+page.svelte` modal-at-template-root precedent (03-CONTEXT.md L93) + `Splitter` `middleBottom` snippet |
| `.planning/dependencies.md` | doc (KP-08 registry) | register `bits-ui@2.18.1`, `fuzzysort@3.1.0`, `@tiptap/*@3.23.6`, official markdown ext; flip stale `cmdk`/`aguingand` rows | KP-08 registry (03-RESEARCH.md State-of-the-Art L502-511) |

---

## Pattern Assignments

### `src-tauri/src/sessions_store.rs` (model/repository, CRUD) — EXACT analog

**Analog:** `src-tauri/src/vault_index.rs` (same `vault-index.db`, same WAL connection, same invariants).

**Struct + error + poisoned-mutex helper** (`vault_index.rs` L50-62, L124-138) — copy verbatim, rename:
```rust
pub struct VaultIndex { conn: Mutex<Connection> }   // L50-52

#[derive(Debug, thiserror::Error)]
pub enum VaultIndexError {
    #[error("sqlite: {0}")] Sqlite(#[from] rusqlite::Error),   // L54-62
    #[error("io: {0}")]     Io(#[from] std::io::Error),
    #[error("walkdir: {0}")] Walk(#[from] walkdir::Error),     // (drop Walk for sessions)
}

fn with_conn<F, R>(&self, f: F) -> Result<R, VaultIndexError>      // L129-138
where F: FnOnce(&Connection) -> Result<R, VaultIndexError> {
    let guard = self.conn.lock().unwrap_or_else(|p| {
        eprintln!("[vault_index] mutex poisoned — recovering inner state");
        p.into_inner()
    });
    f(&guard)
}
```

**Schema (idempotent) + WAL pragma order** (`vault_index.rs` L88-122) — mirror exactly; the sessions schema comes verbatim from RESEARCH Pattern 4 (03-RESEARCH.md L296-306):
```rust
// init(): create parent dir, open, apply pragma stack IN THIS ORDER, then schema.
conn.pragma_update(None, "journal_mode", "WAL")?;        // L99
conn.pragma_update(None, "synchronous", "NORMAL")?;      // L100
conn.pragma_update(None, "busy_timeout", 5000_i32)?;     // L101
conn.pragma_update(None, "wal_autocheckpoint", 1000_i32)?; // L102
conn.execute_batch(r#"
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT, title TEXT, cwd TEXT NOT NULL,
        summary TEXT, last_active TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_last_active_idx ON sessions(last_active DESC);
"#)?;
```

**Every query MUST use `params![]`** (`vault_index.rs` L142-159 insert; L162-182 get; L203-216 list ordered) — this is enforced by audit Gate 10 (`audit-capabilities.sh` L187: `format!()` with a SQL keyword anywhere under `src-tauri/src/` fails the build). The `list` ordered-by-`last_active DESC` query mirrors `list_courses` (`vault_index.rs` L203-216).

**Decision (RESEARCH Pattern 4 L310):** add the table to the EXISTING `vault-index.db` — do NOT create a second DB file. Integration test opens a SECOND `rusqlite::Connection::open(&db_path)` for read-only introspection (`vault_index.rs` L231-235 comment — see `src-tauri/tests/vault_index_count.rs`).

---

### `src-tauri/src/editor_lock.rs` (service, file-I/O) — EXACT analog

**Analog:** `src-tauri/src/config.rs` (atomic temp+rename JSON write to `~/.mneme/…`).

**Atomic write** (`config.rs` L94-107) — copy the temp+`sync_all`+rename sequence verbatim; this is the D-09b "mneme owns the lock state" writer:
```rust
pub fn save_to(path: &Path, state: &Config) -> Result<(), ConfigError> {
    if let Some(parent) = path.parent() { fs::create_dir_all(parent)?; }   // L95-97
    let tmp = path.with_extension("json.tmp");                             // L98
    let bytes = serde_json::to_vec_pretty(state)?;                         // L99
    { let mut f = File::create(&tmp)?;
      f.write_all(&bytes)?;
      f.sync_all()?; }   // MANDATORY before rename — L100-104
    fs::rename(&tmp, path)?;                                               // L105
    Ok(())
}
```

**Default path resolver + NoHome guard** (`config.rs` L53-59) — for `~/.mneme/editor-locks.json`:
```rust
pub fn default_path() -> Result<PathBuf, ConfigError> {
    Ok(home::home_dir().ok_or(ConfigError::NoHome)?
        .join(".mneme").join("config.json"))   // → swap "config.json" for "editor-locks.json"
}
```
**Note (RESEARCH Runtime State Inventory L361):** the vault-cwd `.claude/settings.json` is ALSO written through this atomic pattern, but decide **create-if-absent / merge** rather than overwrite so a user's existing hooks are not clobbered. `editor_lock.rs` writes BOTH the lockfile (`~/.mneme/editor-locks.json`, not in git) and maintains the vault `.claude/settings.json` hook declaration (idempotent first-run write).

---

### `src-tauri/src/session.rs` (model, extend) — SELF analog (extension point already documented)

**Analog:** itself — `ChildHandle` carries the documented Phase-3 extension comment at L18; `register`/`drain_one`/`locked()` already exist.

**D-10 atomic ceiling-check + register under ONE lock** (RESEARCH Pitfall 7 + Code Example L447-459) — add a method that locks once, checks `len()`, inserts. Do NOT count in one locked call and register in another (TOCTOU):
```rust
// extend src-tauri/src/session.rs — the locked() helper already exists at L41-46.
pub fn try_register_if_below(&self, id: SessionId, handle: ChildHandle, ceiling: usize) -> bool {
    let mut map = self.locked();          // existing poisoned-mutex-tolerant helper (L41)
    if map.len() >= ceiling { return false; }
    map.insert(id, handle);
    true
}
```

**Extend `ChildHandle`** at the documented site (`session.rs` L16-20):
```rust
pub struct ChildHandle {
    pub pid: u32,
    // Phase 3 will add: resume_token: Option<String>, spawned_at: Instant, ...
}
```
Phase-3 plan-phase decides the exact schema per the L19 instruction ("Phase 3 plan-phase decides the schema").

---

### `src-tauri/src/lib.rs` (builder + IPC, extend) — SELF analog

**Analog:** itself — session commands + dual `generate_handler!` arms + `~/.mneme` dir creation already present.

**New `#[tauri::command]` fns return `Result<T, String>`** at the IPC boundary; the existing session commands are the shape (`lib.rs` L100-120):
```rust
#[tauri::command]
fn register_session_pid(state: State<SessionRegistry>, pid: u32) {   // L100-105
    state.register(1, ChildHandle { pid });
}
```
**D-10 wire-up:** the spawn path that calls `register_session_pid` (`lib.rs` L101-104, currently hard-codes `SessionId = 1`) becomes the call site for `try_register_if_below(id, handle, 2)`; on `false`, return an `Err(String)` the frontend renders as `CeilingToast` (03-UI-SPEC §"Also-Spec — Resource-Ceiling Warning").

**Register new commands in BOTH arms** (`lib.rs` L804-836 debug arm, L840-... release arm) — the `generate_handler!` macro does NOT accept `#[cfg]` between entries (`lib.rs` L695 comment), so every new command (`session_list`, `session_create`, `session_close`, `get_session`, `persist_summary`, `write_editor_lock`, `clear_editor_lock`) goes in BOTH arms. Per the EMPIRICAL FINDING (`gen-capabilities.ts` L91-122) user `#[tauri::command]` fns do NOT need capability allow-* entries — `generate_handler!` is the gate.

**`~/.mneme` dir creation + DB init at startup** (`lib.rs` L774-780) — the sessions table reuses `vault_index.clone()`; no new DB path:
```rust
let db_path = home::home_dir()
    .map(|h| h.join(".mneme").join("vault-index.db"))     // L774-776 — same DB
    .unwrap_or_else(|| std::path::PathBuf::from("./vault-index.db"));
if let Some(parent) = db_path.parent() { let _ = fs::create_dir_all(parent); }  // L777-779
```

---

### `src/lib/sessions.svelte.ts` (store, reactive singleton) — EXACT analog

**Analog:** `src/lib/vault-state.svelte.ts` (module-scope `$state` + setters; `.svelte.ts` suffix MANDATORY).

**Full shape to copy** (`vault-state.svelte.ts` L18-39, L57-60):
```typescript
// .svelte.ts SUFFIX IS MANDATORY for module-scope $state (plain .ts silently
// degrades to a non-reactive plain object). See connection-state.svelte.ts L21-25.
interface VaultStateShape { vault_path: string; course_list: string[]; }   // L18-21
const state = $state<VaultStateShape>({ vault_path: "", course_list: [] }); // L23-26
export function getVaultState(): VaultStateShape { return state; }          // L28-30
export function setCourseList(courses: string[]): void {                     // L37-39
  state.course_list = [...courses].sort();   // immutable — input not mutated
}
export function resetVaultStateForTest(): void { /* test-only reset */ }     // L57-60
```
For sessions: `state = $state<{ activeSessionId: number | null; recents: SessionRow[] }>(…)` with `setActive`, `setRecents`, `addRecent`, `removeRecent`, plus `resetForTest`. The footer in `SessionSidebar` reads the EXISTING `connection-state.svelte.ts` singleton (03-UI-SPEC L162) — do NOT duplicate connection status here.

---

### `src/lib/keybindings.svelte.ts` (event registrar) — role-match analog

**Analog:** `src/routes/+layout.svelte` (one-time install at layout root) + `SettingsPanel.svelte` Cmd+, listener (the existing keybinding precedent).

**One global `window` keydown, registered once** — the install-once + unlisten-on-teardown pattern is `+layout.svelte` L94-98 (DEV forwarder dynamic install) and L196-199 (`onDestroy` unlisten). The collision-aware dispatch body is RESEARCH Pattern 5 (03-RESEARCH.md L320-329):
```typescript
// Existing bindings NOT to collide with (03-UI-SPEC Keyboard-Nav Contract):
//   Cmd+, (Preferences — SettingsPanel.svelte L148-153), Cmd+I (Import),
//   Cmd+Q (Quit). RESERVED: Cmd+Shift+V (voice REQ-19 — do NOT bind).
function onKeydown(e: KeyboardEvent) {
  const meta = e.metaKey;
  if (meta && !e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); openPalette("file"); }
  else if (meta && e.key.toLowerCase() === "o")           { e.preventDefault(); openPalette("course"); }
  else if (meta && e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); openPalette("action"); }
  // normalize with .toLowerCase() + read e.shiftKey separately — never match e.key === "P".
}
```
**Existing Cmd+, precedent to mirror** (`SettingsPanel.svelte` L148-153) — dispatches a window CustomEvent rather than handling inline; the palette registrar may follow the same dispatch-then-single-listener contract:
```typescript
function onWindowKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === ",") {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("mneme:open-settings"));
  }
}
```
**CSP note (REQ-5):** `addEventListener` is not `eval` — CSP-safe under `script-src 'self' 'wasm-unsafe-eval'`.

---

### `src/lib/components/TiptapEditor.svelte` (component, event-driven mount/destroy) — role-match analog

**Analog:** `src/lib/components/AssistantMessage.svelte` (the `bind:this` + `$effect` DOM-lifecycle + rAF-batch pattern; ProseMirror is imperative the same way the KaTeX walker is).

**bind:this + `$effect` with cleanup** (`AssistantMessage.svelte` L32-57, L60) — this is the exact lifecycle for ProseMirror mount/destroy:
```svelte
let host: HTMLDivElement | undefined = $state();   // AssistantMessage L32
let rafScheduled = false;                            // L33
$effect(() => {
  void html;                       // declare dependency                   // L49
  if (!host || rafScheduled) return;                                       // L50
  rafScheduled = true;
  requestAnimationFrame(() => { rafScheduled = false; if (host) renderKatexInDom(host); }); // L53-56
});
...
<div class="msg-assistant" bind:this={host}>   <!-- L60 -->
```
For Tiptap, the `$effect` body creates `new Editor({ element: host, … })` and **returns a cleanup** `() => { editor?.destroy(); editor = undefined; }` (RESEARCH Pattern 3 L271-285). Belt-and-suspenders `onDestroy(() => editor?.destroy())`.

**HMR double-init guard** — reuse the EXACT `globalThis` singleton flag pattern from `console-forwarder.ts` L119-124 (RESEARCH Pitfall 4 names this as the precedent):
```typescript
const g = globalThis as typeof globalThis & { __mnemeForwarderInstalled?: boolean };
if (g.__mnemeForwarderInstalled) return;
g.__mnemeForwarderInstalled = true;
```

**Preview mode reuses `sanitize.ts`** — the Preview half of the segmented toggle renders via the existing `marked → DOMPurify → KaTeX` pipeline: import `renderKatexInDom` from `$lib/sanitize` (`AssistantMessage.svelte` L21) and `{@html sanitizedMarkdown}` (`AssistantMessage.svelte` L65, with the `:global(...)` CSS scoping at L78-181 as the styling precedent for `{@html}` content).

---

### `src/lib/editor-markdown.ts` (utility, transform) — net-new, gray-matter API analog

**Analog:** `gray-matter` is already a dep (`package.json`, also `tests/gray-matter.test.ts` reserves the round-trip test slot at L1-3). No in-repo splitter exists yet — this is the net-new module RESEARCH flags.

**Split/rejoin** (RESEARCH Code Example L488-495) — gray-matter splits frontmatter BEFORE Tiptap sees the body, rejoins on save (Pitfall 5: Tiptap markdown ext does NOT model YAML frontmatter):
```typescript
import matter from "gray-matter";   // already a dep
export function splitForEditor(fileText: string) {
  const { data, content } = matter(fileText);   // data = frontmatter obj, content = body
  return { frontmatter: data, body: content };
}
export function joinForSave(body: string, frontmatter: Record<string, unknown>): string {
  return Object.keys(frontmatter).length ? matter.stringify(body, frontmatter) : body;
}
```
This module also holds the official-Tiptap-markdown-extension serialize/parse config. **OPEN (Wave-0 spike, RESEARCH A6/A8):** pin the official ext's serialize/parse method names — they differ from aguingand's `editor.storage.markdown.getMarkdown()`. Round-trip fixture test goes in `tests/editor-markdown.test.ts` (analog: `tests/spawn-args.test.ts` vitest shape).

---

### `src/lib/transcript-reader.ts` (utility, batch/file-I/O) — net-new adapter, stream-dispatch analog

**Analog:** `src/lib/stream-dispatch.ts` (`freshState()` L85-95 + `dispatchEvent(evt, state)` L141) + `vendor/claude-code-parser` types.

**JSONL → DispatchState** (RESEARCH Code Example L462-483) — opt-in full-transcript restore ONLY (default Recents preview never touches the 7.4MB JSONL):
```typescript
import { freshState, dispatchEvent, type ClaudeEvent } from "$lib/stream-dispatch";
export function transcriptToState(jsonlText: string) {
  const state = freshState();
  for (const line of jsonlText.split("\n")) {
    if (!line.trim()) continue;
    let rec: unknown;
    try { rec = JSON.parse(line); } catch { continue; }   // skip malformed (append-only file)
    if (isRenderableRecord(rec)) dispatchEvent(rec as ClaudeEvent, state);
  }
  return state;
}
```
**CRITICAL (RESEARCH A8, OPEN):** the per-line JSONL record shape is NOT identical to the stream-json NDJSON envelope `dispatchEvent` was built for (JSONL adds `ai-title`, `file-history-snapshot`, etc.). A thin `isRenderableRecord` + field-mapping adapter is required — spike against a real file. The dispatcher's defensive narrowing (`readString`, `typeof`/`in` guards — `stream-dispatch.ts` L133-139) is the precedent for handling untrusted/forward-compat fields.

---

### `src/lib/components/CommandPalette.svelte` (component, request-response) — role-match analog

**Analog:** `src/lib/components/SettingsPanel.svelte` (backdrop scrim + `role="dialog"` + Esc/backdrop close + Cmd-key listener) for the modal CHROME; Bits UI `Command` provides the accessible focus-trap + ↑↓/Enter/Esc INTERNALS (do NOT hand-roll — RESEARCH Don't-Hand-Roll L344).

**Modal scrim + close-on-backdrop/Esc** (`SettingsPanel.svelte` L131-140, L156-170):
```svelte
function onBackdropClick(e: MouseEvent): void { if (e.target === e.currentTarget) onClose(); }  // L131-133
function onPanelKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && panelOpen) { e.preventDefault(); onClose(); }   // L135-140
}
...
<div class="backdrop" onclick={onBackdropClick} onkeydown={onPanelKeydown} role="presentation">  <!-- L159-164 -->
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="…">   <!-- L165-170 -->
```
**Scrim tokens** (03-UI-SPEC L110): `--color-scrim` (`rgba(20,20,19,0.45)`) + `--blur-soft` (4px) — defined in `tokens.css` (confirmed present: `--color-scrim` / `--blur-soft` in the SCRIM/BACKDROP block). These are the SAME tokens Phase 2's `DropzoneOverlay.svelte` uses — all overlays share one veil.

**Bits UI Command + fuzzysort body** (RESEARCH Pattern 1 L211-237) — `shouldFilter={false}` + own fuzzysort `$derived` ranking so match `indexes` drive the `--color-orange` per-char highlight (03-UI-SPEC L79, L196):
```svelte
import { Command } from "bits-ui";
import fuzzysort from "fuzzysort";
const ranked = $derived(search
  ? fuzzysort.go(search, items, { key: "searchText", limit: 50 })   // {obj, score, indexes}
  : items.map((obj) => ({ obj, indexes: [] as number[] })));
<Command.Root shouldFilter={false}> … </Command.Root>
```
**Mount at template root** (outside `.window` which has `overflow:hidden`) — `+page.svelte`, same precedent as the existing modals/overlays (03-CONTEXT.md L93). File-list mode queries the vault index via `list_courses` / a new index query (vault index already exists: `vault_index.rs` `list_courses` L203-216).

---

### `src/lib/components/SessionSidebar.svelte` + `SessionRailItem.svelte` (component, CRUD) — role-match analog

**Analog:** `src/lib/components/Splitter.svelte` (localStorage collapse persistence) + `connection-state.svelte.ts` (footer status) + `FileArea.svelte` (list-row rendering).

**localStorage collapse state** (`Splitter.svelte` L40, L54-75 restore, L133-146 persist) — the `mneme.sessions.collapsed` key (03-UI-SPEC L147, default `true`) follows the same try/catch restore+persist:
```typescript
const STORAGE_KEY = "mneme.layout.split";   // Splitter L40  → "mneme.sessions.collapsed"
onMount(() => { try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { const parsed = JSON.parse(raw); /* validate types before applying */ }  // L54-69
} catch (err) { console.warn("[splitter] failed to restore …", err); } });           // L71-74
```
**PUSH expand via CSS grid-template-columns transition** (03-UI-SPEC L121) — the right-pane inner grid animates `grid-template-columns` (NOT `left`/`margin`); `Splitter.svelte` L157 (`style:grid-template-columns=…`) is the existing in-repo grid-column-driven layout precedent.

**Footer reads existing connection singleton** (03-UI-SPEC L162) — import `connectionState` from `connection-state.svelte.ts` L35; do NOT create a new status store.

**SessionRailItem** is a small `Props`-interface component (`UserBubble.svelte` is the minimal-component precedent); rows are `last_active DESC` from `sessions.svelte.ts` recents. Active-row 2px `--color-orange` left bar + `--fw-semibold` (03-UI-SPEC Recents item states L166-175).

---

### `src/lib/components/MiddlePaneRouter.svelte` (component, transform) — role-match analog

**Analog:** `src/lib/components/FilePreview.svelte` (the slot it routes against; lives in the Splitter `middleBottom` snippet).

D-02 type-router: `.md` → `TiptapEditor`, PDF → existing `FilePreview` (`FilePreview.svelte` whole file is the PDF branch), video → `LectureVideo`. The middle 2-row stack already exists (`Splitter.svelte` L172-185 `middleTop`/`middleBottom`); the router replaces the `middleBottom` content. Segmented Preview\|Edit toggle in the middle-pane header (03-UI-SPEC L231-236).

---

### `src/lib/palette-actions.ts` (utility, pure data) — partial analog

**Analog:** `src/lib/stream-dispatch.ts` helper region (L322-394 — pure functions + data, NO module-scope mutable state; the "no-state-leak" discipline at L68-74).

Bounded Cmd+Shift+P action set (03-UI-SPEC L207): `New session`, `New markdown file`, `Toggle session sidebar`, `Open settings (Cmd+,)`, `Switch to last session`, `Sync vault now`, `Toggle preview/edit`. Each entry = `{ id, label, glyph, run() }`. Pure data array + handler fns; no module-level `$state` (state lives in `sessions.svelte.ts` / triggers existing window CustomEvents like `mneme:open-settings`).

---

### `<vault>/.claude/hooks/editor-lock-hook.mjs` (node hook script) — partial analog

**Analog:** `scripts/gsd-dev-*.mjs` (Node ESM script shape, `*.mjs`). Logic is net-new (D-09).

Reads `.tool_input.file_path` from stdin JSON, checks `~/.mneme/editor-locks.json`, `exit 2` if locked (D-09a: exit-2 pre-empts permission eval, fires even under `bypassPermissions`). **Write in node** (D-09: macOS may lack `jq`). This is CONFIG, NOT argv — it does NOT touch `buildClaudeArgs` / the capability allowlist (D-09a). The hook stays a dumb fast lockfile lookup; mneme (`editor_lock.rs`) owns writing the lock state (D-09b).

---

## Shared Patterns

### Shared Pattern: Capability SSOT chain (apply as ONE atomic unit)
**Sources:** `src/lib/spawn-args.shared.ts` → `scripts/gen-capabilities.ts` → `src-tauri/capabilities/default.json` → `scripts/audit-capabilities.sh` → `tests/capability-regex.test.ts`.
**Apply to:** ANY change to the `claude` argv surface (D-05 resume threading; `-c` IF added).

**The RESEARCH recommendation (Pattern 2 L240-252):** cross-restart resume **reuses the existing `claude-bin-resume` shape UNCHANGED** — only the UUID SOURCE changes (rusqlite row, not in-memory `DispatchState.sessionId`). No SSOT edit is needed for the default resume path:
```typescript
// spawn-args.shared.ts L88-97 (BuildOpts) + L148-149 already support resume:
const head: string[] = ["--print"];
if (opts.resumeSessionId) head.push("--resume", opts.resumeSessionId);   // L148-149
// SESSION_ID_REGEX (L60) validates it; the resume shape already exists in capabilities.
```
**IF `-c`/`--continue` is added** (RESEARCH recommends SKIPPING it for v1 — ambiguous under multi-session), it is the ONLY net-new flag and requires the FULL chain in lockstep (per CONTEXT.md `<code_context>` L90 + STRUCTURE.md "New CLI argv flag"):
1. `spawn-args.shared.ts` — extend `BuildOpts` + the `head` builder.
2. `gen-capabilities.ts` — add a third Command shape (`claude-bin-continue`) to `SPAWN_ALLOW` (L189-193), with a `COMMON_TAIL`-based validator array (L58-87 pattern). Distinct `name` per shape (Tauri `find` short-circuits on first matching name — L12-21).
3. `npm run prebuild` regenerates `default.json` (NEVER hand-edit — audit Gate 1 `audit-capabilities.sh` L39 diffs dry-run vs committed).
4. `audit-capabilities.sh` — verify it still passes (no wildcards Gate 2/3, no `--bare` Gate 4, `--max-turns` Gate 5).
5. `tests/capability-regex.test.ts` — add a length + per-index-match suite (L147-198 resume-shape suite is the template).

**CRITICAL (D-07, RESEARCH Pitfall 1):** the subprocess cwd MUST equal the persisted `row.cwd` on every resume, else `--resume` silently starts a FRESH session. Persist + re-pass `cwd` per thread.

### Shared Pattern: Error handling at the Tauri boundary
**Source:** `src-tauri/src/lib.rs` (every `#[tauri::command]` returns `Result<T, String>`); internal Rust helpers absorb non-fatal IO with `let _ = …`.
**Apply to:** all new commands in `sessions_store.rs` + `editor_lock.rs` + their `lib.rs` wrappers.
- Command fns: `Result<T, String>` so the JS side gets a string error (session cmds `lib.rs` L100-120 are the no-arg shape; the Phase-2 fns are the `Result<_, String>` shape).
- Non-fatal IO (lockfile write failure must NOT crash): `let _ = editor_lock::write(...)` mirrors `config.rs` `sync_all`-or-propagate for the durable path, `let _ =` for the best-effort path.
- D-10 refusal returns `Err(String)` → frontend `CeilingToast` (NOT a panic).

### Shared Pattern: `.svelte.ts` suffix for module-scope `$state`
**Source:** `src/lib/connection-state.svelte.ts` L21-25 (the canonical note) + `src/lib/vault-state.svelte.ts` L2-3.
**Apply to:** `src/lib/sessions.svelte.ts`, `src/lib/keybindings.svelte.ts` (if it holds reactive open-state).
A plain `.ts` file with module-scope `$state` silently degrades to a non-reactive plain object — the suffix is non-negotiable (CONTEXT.md `<code_context>` L100; CLAUDE.md Conventions).

### Shared Pattern: Net-new component Visual SSOT header
**Source:** 03-UI-SPEC.md L18-23 (there is no `Mneme.html` mockup for sidebar/palette/editor).
**Apply to:** ALL net-new Phase-3 `.svelte` files.
Each carries `// Visual SSOT: 03-UI-SPEC.md §<section>` instead of a `Mneme.html L###-###` range. Reference EXISTING `tokens.css` tokens only — Phase 3 introduces NO new color/type/motion tokens (03-UI-SPEC L34, L66, L116). The header-comment convention itself is the existing one (`AssistantMessage.svelte` L1-19, `FilePreview.svelte` L11 `Visual SSOT: Mneme.html …`).

### Shared Pattern: HMR double-init guard
**Source:** `src/lib/dev/console-forwarder.ts` L119-124 (`globalThis.__mnemeForwarderInstalled` singleton).
**Apply to:** `TiptapEditor.svelte` (ProseMirror double-mount, RESEARCH Pitfall 4) + `keybindings.svelte.ts` (window listener double-register). Use a `globalThis` flag, not a module-scope `let`, so HMR-reloaded instances see the prior install.

---

## No / Weak Analog Found

| File | Role | Data Flow | Reason | Planner guidance |
|------|------|-----------|--------|------------------|
| `.claude/settings.json` (vault cwd, mneme-managed) | config | n/a | First config file mneme WRITES into the vault dir to declare a PreToolUse hook. No prior in-repo precedent for managing a third-party (`claude`) config. | Write via `config.rs` atomic pattern; decide create-if-absent / merge to avoid clobbering user hooks (RESEARCH Runtime State Inventory L361). Idempotent first-run write. |
| `<vault>/.claude/hooks/editor-lock-hook.mjs` | utility (hook) | request-response | Node script shape exists (`scripts/gsd-dev-*.mjs`) but the stdin-JSON→exit-2 lock logic is net-new (D-09). | Use RESEARCH D-09/D-09a/D-09b verbatim; read `.tool_input.file_path`, exit 2 if locked. Pure node, no `jq`. |
| `src/lib/transcript-reader.ts` | utility (parser) | batch | Reuses `stream-dispatch` but the JSONL-record→ClaudeEvent adapter is net-new (RESEARCH A8 OPEN — record shapes differ). | Wave-0 spike the `isRenderableRecord` + field mapping against a real `~/.claude/projects/**/*.jsonl`; lazy-read only on opt-in full restore. |

---

## Metadata

**Analog search scope:** `src-tauri/src/` (session.rs, vault_index.rs, config.rs, lib.rs), `src/lib/` (spawn-args.shared.ts, stream-dispatch.ts, connection-state.svelte.ts, vault-state.svelte.ts, sanitize.ts, dev/console-forwarder.ts), `src/lib/components/` (Splitter, SettingsPanel, AssistantMessage, FilePreview, ImportStatusPill, ReconciliationOverlay, UserBubble), `src/routes/` (+layout.svelte, +page.svelte), `scripts/` (gen-capabilities.ts, audit-capabilities.sh), `tests/` (capability-regex, spawn-args, gray-matter).
**Files scanned:** ~30 (read in full or targeted ranges).
**Pattern extraction date:** 2026-05-30
**Token versions (KP-08, RESEARCH-verified):** bits-ui@2.18.1 · fuzzysort@3.1.0 · @tiptap/core+starter-kit+extension-suggestion@3.23.6 · Tiptap OFFICIAL markdown ext ≥3.7.0 (NOT aguingand/tiptap-markdown — maintainer inactive) · gray-matter@4.0.3 (already a dep) · rusqlite@0.39 (already a dep, reuse `vault-index.db`).
