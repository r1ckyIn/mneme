# Phase 2: Vault + Manual Import + Onboarding — Research

**Researched:** 2026-05-15
**Domain:** Local-first markdown vault scaffolding, manual file import with chmod write protection, rusqlite file index, 6-step resumable onboarding wizard, full settings panel
**Confidence:** HIGH (stack already locked; remaining decisions are well-understood Tauri 2 / rusqlite / WebKit patterns)

---

## Summary

Phase 2 is the **first phase that puts user data on disk** in mneme. Phase 1 shipped a Tauri shell that spawns `claude` and renders streaming markdown; Phase 2 adds the vault contract (`~/StudyVault/` with PARA + course-root structure), the manual import surface (drag-drop + Cmd+I + folder batch), the rusqlite file index that Phase 3 Cmd+P will consume, the 6-step onboarding wizard, and the full 8-category settings panel that replaces the Phase 1 placeholder. <!-- v1.x deferred for Cmd+I / Cmd+P keyboard shortcuts per Phase 02.1 D-06 (W7 fix); the import surfaces themselves still ship (drag-drop trigger remains in v1) -->


Every external decision the user could make has been resolved already: SPEC locks the 11 requirements, CONTEXT locks 21 implementation decisions (D-01..D-21), UI-SPEC is the visual SSOT for all 7 net-new Phase 2 surfaces (revision 1 APPROVED 2026-05-15, 6/6 dimension PASS), and the Mneme 3 visual SSOT bundle is on disk at `/Users/qinyuan/Downloads/Mneme 3/` (8 HTMLs, verified 2026-05-15). The blocking prerequisite "user must produce onboarding HTML prototype" is satisfied.

**Primary recommendation:** Implement Phase 2 as five new Rust modules (`vault_writer.rs` / `import_controller.rs` / `vault_index.rs` / `onboarding.rs` / `config.rs`) wired through `lib.rs` with ~12 new Tauri commands declared in `capabilities/default.json` per D-19; deliver three new Svelte surface trees (onboarding/* + settings/* + import/*) plus two reactive module-scope `$state` singletons (`import-state.svelte.ts` + `vault-state.svelte.ts`); use `dragDropEnabled: false` to opt into HTML5 DOM drag-drop so D-09 `DataTransfer.types.includes("Files")` discrimination works on macOS WebKit. TDD applies to all five Rust modules (state machine + filesystem invariants + SQLite reconciliation are highly testable) and to the import controller's progress event sequencing; UI components driven by visual SSOT are standard plan.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-21)

**Onboarding wizard — implementation form (Area A)**
- **D-01** Container = Full-screen SvelteKit route `/onboarding/[step]`. 36px overlay titlebar stays visible (Cmd+Q drain path required). On Finish, programmatic navigation to `/` swaps in three-pane shell with full unmount of wizard tree.
- **D-02** Component split = main shell (`Onboarding.svelte` — state owner) + 6 step children (~80-150 LOC each, Step1Welcome through Step6DemoImport).
- **D-03** State persistence = step-boundary Rust IPC + atomic temp+rename. `save_onboarding_state(json)` called only on user clicking "Next" (mid-flight typing NOT persisted). Rust writes to `~/.mneme/onboarding-state.json.tmp` then `std::fs::rename` to final path. Startup reads via `load_onboarding_state()`; checks `completed_at`; redirects to `/onboarding/<current_step>` (resume) or `/` (main UI).
- **D-04** Visual SSOT — Onboarding HTML prototype was a BLOCKING prerequisite; **superseded 2026-05-15** by UI-SPEC.md + the Mneme 3 bundle. Plan-phase entry no longer halted. Settings panel + import dialog opt out of prototype-first per D-04 freehand allowance.

**vault_writer.rs API shape + Import-token factory (Area C)**
- **D-05** API shape = `pub enum WriteContext { User, Import(ImportToken) }`. `ImportToken` is a private struct with `pub(crate)` fields — cannot be constructed outside `vault_writer.rs`. Single factory `vault_writer::import_handle() -> ImportToken` is the only audited entry point. Public surface: `write_to_vault(path, bytes, ctx: WriteContext) -> Result<(), VaultWriterError>`.
- **D-06** Path guard runtime check. `WriteContext::User` computes `path.starts_with(<vault_root>/courses/<*>/_source/)` and rejects with `VaultWriterError::WriteToSourceForbidden`. Path check is canonicalized (`std::fs::canonicalize`) before prefix comparison to prevent `..` traversal bypass. `<vault_root>` comes from persisted config (NOT hardcoded — vault is movable per REQ-11).
- **D-07** chmod 0o444 sequence — import flow: `write_bytes` → `file.sync_all()` → `std::fs::set_permissions(path, Permissions::from_mode(0o444))`. Re-import: chmod 0o644 → write → sync_all → chmod 0o444. Three-step wrapped in `with_temporary_writable_permission(path, |writable| ...)` helper. Failure during rewrite leaves file at 0o644; caller decides retry/escalate.
- **D-08** Re-import same-name UX = dialog three options (Replace / Skip / Rename with auto-suffix `-1` / `-2`) + batch Apply-to-all checkbox for folder imports.

**Import dialog UX + drop-zone (Area B)**
- **D-09** Drop-zone = whole-window overlay + `DataTransfer.types.includes("Files")` discrimination. Suppress on `text/plain` / `text/uri-list` only (reserves text-drag for ChatPanel in v1.x).
- **D-10** Course picker = adaptive by course count: 0 → replacement state with `[Open Settings]` CTA + close; 1-3 → vertical radio stack; 4-10 → styled `<select>`; 10+ → typeahead.
- **D-11** Dialog default values = no remember-last. Course = empty (must select). Category = `_inbox`. Trade: +1 click per import, defends course-mismatch.
- **D-12** Dialog position = always screen center (CSS `position: fixed; inset: 50%; transform: translate(-50%, -50%)`).
- **D-13** ~~Cmd+I joins interaction-paradigm exception list (5th narrow exception). `.planning/threads/interaction-paradigm.md` gets one-row entry as phase wrap-up.~~ **Reversed in Phase 02.1 D-06 (2026-05-17)**: Cmd+I v1.x deferred per W7 fix. Implementation handler remains wired (no code reverted); spec contract retracted. interaction-paradigm.md thread entry remains as historical record, but the v1 exception list is now Cmd+Q only. v1.x re-introduction paired with Phase 3 multi-session sidebar. <!-- v1.x deferred per Phase 02.1 D-06 -->


**Import + reconciliation runtime (Area D)**
- **D-14** Startup reconciliation = blocking spinner (DR1, user chose over Recommended DR2). Full-screen "Indexing vault... N / M" before main UI mounts. Escalation: if dogfood measures >500 files or >1000ms, revisit DR2 in v1.x.
- **D-15** Import IO model = background tokio task + per-file event emit `import:progress {operation_id, current, total, last_file_name, last_file_status}`. WebView listens via `@tauri-apps/api/event::listen`.
- **D-16** Folder batch Cancel = stops iteration, does NOT roll back already-written files. Status pill: `N / M imported · cancelled`. Mental model: "I dragged wrong batch in; let me at least keep what's done."

**Visual contract — KD-13 inheritance**
- **D-17** KD-13 visual contract continues unchanged. Form-isolation contract from Phase 1 D-22 holds. `.planning/references/design/living-visual-contract.md` is for tool HTML only — **Phase 2 mneme app UI does NOT use Living tokens**. Permanent dual-track decision 2026-05-14.
- **D-18** New components carry `Visual SSOT:` comment header pointing into Mneme 3 bundle + UI-SPEC §8.x section ref.

**Capability surface (KP-04 + Phase 1 D-14)**
- **D-19** IPC capability registration = Tauri 2 standard model (NOT spawn-args SSOT). New ~10-15 Tauri commands declared in `capabilities/default.json` via `permissions` array. Argv validation happens inside each command's Rust handler. `audit-capabilities.sh` continues to verify no `args: true` wildcard / no `*` shell-scope expansion.
- **D-20** Vault path config = `~/.mneme/config.json` (NOT macOS `~/Library/Application Support/Mneme/`). Schema: `{vault_path: "<absolute>", schema_version: 1}`. Atomic temp+rename.

**KP-08 dependency registry additions**
- **D-21** `gray-matter` (npm, MIT, 5.6k★+) + `rusqlite` (Cargo, MIT, 2.9k★+) with `bundled` feature. Both pass Phase 1 D-08 thresholds. Register in `.planning/dependencies.md` before plan-phase (Group 1 already has gray-matter row; Group 4 already has rusqlite row — verify versions match plan-phase locked values).

### Claude's Discretion

The user did NOT explicitly delegate any decision in this session. Fine-grain implementation choices left to planner/executor:
- Exact tokio task structure for import controller (single task per operation vs task pool — planner picks based on Tauri event-bus throughput; single-user concurrent imports are rare, so single-task-per-operation is safe default).
- SQLite migration mechanism (single `CREATE TABLE IF NOT EXISTS` for v1; `schema_version` column reserved but not used until v1.x).
- Splitter localStorage key namespace (continue `mneme.<area>.<field>` Phase 1 convention).
- Onboarding step-validation regex specifics (`^[A-Z]{4}\d{4}$` default; planner verifies against USYD course-code reality — MATH1062 / INFO1110 / STAT1003 / COMP3221 all match).
- Status pill animation curve (planner reuses KD-13 `cubic-bezier(0.165, 0.85, 0.45, 1)` ease, duration ~200ms; no separate UI-phase needed).

### Deferred Ideas (OUT OF SCOPE)

**Deferred to v1.x (post-Phase-2):**
- DR2 background reconciliation (escalation trigger: vault > 500 files dogfood with reconciliation > 1000ms).
- v1.x chat input text/link drag-drop (D-09 leaves `text/plain` / `text/uri-list` paths free).
- Vault path move progress bar (current SPEC says toast suffices; add if dogfood vaults > 1000 files take > 5s).
- Onboarding back-button (SPEC REQ-8 only requires forward + resume).

**Deferred to later phases:**
- UniBoard bridge import path (separate later phase per 2026-05-11 self-ecosystem decision).
- Cost-cap kill switch (REMOVED from REQ-14 — subscription model, UsageMeter contract `Ctx % / Total / Session` stands).
- File-watch live updates via `tauri-plugin-fs-watch` (Phase 3+).
- Theme dark-mode actual switching (light-only v1 per KD-13; toggle exists but no-ops).
- Course rename / vault delete-and-replace / soft-delete trash (Phase 3+).
- Advanced settings categories full UI (General / Sync / Claude / Privacy / Advanced render `(coming in Phase N)` empty body in Phase 2).
- Nested folder import (single-level only in v1).

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-03 | Reframed: manual file import (Canvas/Ed wording stale per 2026-05-11 self-ecosystem decision). | §"Manual Import Architecture" — drag-drop overlay + Cmd+I + folder batch all use Tauri 2 dialog plugin + DOM events. <!-- v1.x deferred for Cmd+I keyboard shortcut per Phase 02.1 D-06; drag-drop and folder-batch via dialog button remain v1 contract --> |
| REQ-06 | Markdown vault (PARA + course-root structure). | §"Vault Directory Contract" — vault_storage.md spec + chmod 0o444 + gray-matter for INDEX.md YAML frontmatter. |
| REQ-13 | Sync status surface — reframed as import status pill in TitlebarMeta + click-to-detail modal. | §"Status Surface" — `import-state.svelte.ts` singleton + Tauri event listener pattern (same pattern as Phase 1 `connection-state.svelte.ts`). |
| REQ-14 | Settings UI — categorized 8-cat panel, Cmd+, reachable, 3 v1-functional. | §"Settings Panel Architecture" + settings-ui.md spec. <!-- v1.x deferred for Cmd+, per Phase 02.1 D-06; Settings panel itself ships in v1 via cog + macOS menu paths --> |
| REQ-16 | First-run onboarding wizard — 6 steps, resumable via `~/.mneme/onboarding-state.json`. | §"Onboarding Wizard Architecture" — SvelteKit `/onboarding/[step]` route + atomic temp+rename state persistence. |

**Note:** REQ-03 wording ("Canvas + Ed import + sync") in REQUIREMENTS.md is stale; SPEC.md is authoritative. ROADMAP.md L146-158 + REQUIREMENTS.md REQ-03 / REQ-13 wording patches happen at phase wrap-up, NOT inside Phase 2.

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

### Hard constraints (Phase 2 wave-0 + execution gates)

- **`audit-capabilities.sh` pre-commit gate** — Husky pre-commit hook MUST keep passing through Phase 2. Every new Tauri command declaration must round-trip through the audit: no `"args": true` wildcards; no `"*"` shell scope. Phase 2 D-19 commits this gate stays gate-passing per pre-commit. [VERIFIED: `package.json` L11 `prebuild` runs `gen-capabilities.ts` + `audit-capabilities.sh`; `.husky/pre-commit` runs `audit-capabilities.sh` directly.]
- **Browser-safe / Node-only split** — Phase 2 may introduce no new `*.node.ts` modules (no scratch-dir resolution analog; all path resolution happens in Rust). If any helper requires Node-only logic, follow Phase 1 `spawn-args.shared.ts` / `spawn-args.node.ts` convention; `audit-capabilities.sh` enforces.
- **KD-13 + KP-09 visual aesthetic family lock** — All new components use `tokens.css` exclusively. Form-isolation contract from Phase 1 D-22 holds verbatim: `--orange` only as fill; `--error` only as stroke/text; `--bubble-user: #f3f1ea` SSOT 0' override. Light theme only.
- **Living visual contract scope** — `.planning/references/design/living-visual-contract.md` (cream `#E6E3DC` + olive accent + Fraunces) is **tool HTML only** (review / dogfood / handoff). mneme app UI = KD-13 only. Any planner/executor proposal mixing the two requires re-discussion.
- **Code comments in plain English** — User-level rule explicit: code comments are English-only; technical discussion in chat / planning markdown is allowed in Chinese; code-file comments are not.
- **Many small files > few large files** — Per coding-style.md: 200-400 lines typical, 800 max. Phase 2's largest module risk is `SettingsPanel.svelte` (8 categories) — must factor into per-category child components per UI-SPEC §7 component inventory.
- **No mutation** — Per coding-style.md "Immutability (CRITICAL)". Rust side: prefer `&self` + return new owned values; TS/Svelte side: derive new objects via spread, push, or `Array.from`. Vault writer's chmod 644→write→chmod 444 helper is the documented exception (in-place rewrite required by SPEC L49 chmod-then-write semantics; contained in `with_temporary_writable_permission`).

### Process gates (GSD workflow)

- **TDD mode is ACTIVE** for this planning run (`/gsd-plan-phase 2 --tdd`). See §"TDD Candidates" below.
- **Security threat model is REQUIRED** per `workflow.security_enforcement` (ASVS L1 default, block on HIGH). See §"Threat Model" below.
- **Nyquist validation is ENABLED** per `workflow.nyquist_validation`. RESEARCH.md includes §"Validation Architecture" so VALIDATION.md can be derived.
- **Plan-checker convergence is OPTIONAL** for Phase 2 (CRUD / vault scaffold is well-understood per CLAUDE.md Tier 2 mapping — not a "关键架构/新框架/安全敏感" phase). Note: there IS a meaningful security surface (path traversal / chmod / TOCTOU), so consider running `/gsd-plan-review-convergence 2 --codex --max-cycles 3` after plan if any plan reviewer raises HIGH issue.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vault directory scaffolding | **Rust backend** (vault_writer.rs) | — | OS-level filesystem operations + POSIX chmod require Rust; WebView has no business creating dirs. |
| `_source/` write protection enum guard | **Rust backend** (vault_writer.rs) | — | `WriteContext::Import(ImportToken)` is a privacy invariant — token can only be constructed inside `vault_writer.rs`. Routing through Rust eliminates JS bypass class. |
| `chmod 0o444` enforcement | **Rust backend** (vault_writer.rs `with_temporary_writable_permission`) | — | `std::os::unix::fs::PermissionsExt` is Rust-only. |
| Drag-drop overlay UI + DataTransfer discrimination | **Browser** (DropzoneOverlay.svelte + `+page.svelte` dragenter listener) | — | DOM event semantics — must be JS to read `event.dataTransfer.types`. |
| Cmd+I native file picker | **Rust backend** (via `tauri-plugin-dialog`) | Browser (invocation) | NSOpenPanel native sheet is the OS-provided picker; Tauri dialog plugin exposes it. (Implementation present; Cmd+I keyboard shortcut v1.x deferred per Phase 02.1 D-06 — the dialog itself ships in v1 via the import dialog button.) <!-- v1.x deferred per Phase 02.1 D-06 --> |
| Import controller (tokio task + cancellation + progress events) | **Rust backend** (import_controller.rs) | Browser (event listener) | Concurrent writes + chmod + index updates + cancellation token all live in Rust. JS receives progress events only. |
| File index CRUD + reconciliation scan | **Rust backend** (vault_index.rs) | — | rusqlite is Rust; WebView never sees the DB connection. |
| Onboarding state persistence | **Rust backend** (onboarding.rs — atomic temp+rename) | Browser (wizard UI state in `$state`) | Filesystem atomic-rename is Rust-only; UI step-by-step navigation lives in Svelte. |
| Settings panel UI | **Browser** (SettingsPanel.svelte + category children) | Rust backend (settings persistence via config.rs) | Pure UI work; only the persistence is Rust. |
| Vault path move (safe copy + verify + reindex) | **Rust backend** (vault_writer.rs `move_vault` or new fn) | Browser (UI confirmation) | Filesystem recursion + verification + transaction lives in Rust; JS only renders confirmation modal. |
| Status pill state (current operation + recent-20) | **Browser** (import-state.svelte.ts) | Rust backend (event source) | Reactive UI singleton in Svelte; events emitted by Rust. |
| Reconciliation overlay | **Browser** (ReconciliationOverlay.svelte) | Rust backend (scan execution) | UI listens to progress events from Rust scan. |
| Course folder scaffold | **Rust backend** (vault_writer.rs `create_course`) | Browser (Settings → Vault → Add course) | Filesystem ops in Rust; gray-matter INDEX.md generation can be either side (recommend npm-side for symmetry with Phase 3 editor which will also use gray-matter for concept-page frontmatter). |

**Anti-pattern risk:** Putting the WriteContext enum or the chmod sequence in JS. The enum's value is exactly that `Import` cannot be reconstructed outside Rust; routing through JS breaks the contract.

---

## Standard Stack

### Core (new in Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `gray-matter` | 4.0.3 [VERIFIED: npm registry, 2026-05-15] | YAML frontmatter parse + stringify for INDEX.md and future Phase 3 concept-page frontmatter | MIT, ~5.6k★, multi-maintainer, used by Gatsby/Netlify CMS/11ty/many static site generators. Battle-tested. Latest stable. |
| `rusqlite` | 0.39.0 [VERIFIED: crates.io, 2026-05-15] with `bundled` feature | SQLite vault file index — `vault_files` table for Phase 3 Cmd+P consumption | MIT, ~2.9k★, idiomatic Rust SQLite wrapper. `bundled` feature compiles SQLite from source — avoids macOS system libsqlite3 ABI variance (~200KB acceptable per D-21). <!-- v1.x deferred: Cmd+P palette is a Phase 3 promise; the rusqlite dep itself is still v1 (vault_files index ships in v2 / Phase 2) per Phase 02.1 D-06 W7 fix --> |
| `@tauri-apps/plugin-dialog` | 2.7.1 [VERIFIED: npm registry, 2026-05-15] | Native macOS file picker (Cmd+I) + folder picker + directory chooser for vault path | Tauri 2 first-party plugin (MIT/Apache-2.0 dual). Already in Tauri ecosystem; minimal capability surface to add. <!-- v1.x deferred for Cmd+I keyboard shortcut per Phase 02.1 D-06; the dialog plugin itself still ships in v1 (drag-drop + import-dialog button still use it) --> |
| `tauri-plugin-dialog` (Cargo) | 2.x (matches npm side) | Rust-side dialog crate | Pairs with npm side. |

### Core (existing — Phase 1, used by Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tokio` | 1.x | Async runtime for import controller tokio tasks + reconciliation scan + writer tasks | [VERIFIED: `src-tauri/Cargo.toml` L26]. Phase 2 reuses Phase 1's tokio runtime; no new dep, no new features (current feature set `sync rt rt-multi-thread macros process time fs io-util` covers Phase 2). |
| `tokio_util::sync::CancellationToken` | (transitive via `tokio-util` if needed) | Import batch cancellation per D-16 | [CITED: tokio.rs/tokio-util docs] Standard idiomatic Rust async cancellation. NOTE: Cargo will need to add `tokio-util = { version = "0.7", features = ["sync"] }` as a new dep — verify lockfile during plan-phase. |
| `serde` / `serde_json` | 1.x | JSON serialization for `~/.mneme/config.json`, `~/.mneme/onboarding-state.json`, IPC payloads | [VERIFIED: `src-tauri/Cargo.toml` L23-24]. Already pulled in by Phase 1. |
| `nix` | 0.31 | Already used by Phase 1 `kill_pgid`; Phase 2 uses for `std::os::unix::fs::PermissionsExt` if needed (likely vanilla `std::os::unix::fs` suffices — flag for plan-phase) | [VERIFIED: `src-tauri/Cargo.toml` L25]. |
| `home` | 0.5 | `home_dir()` for resolving `~/StudyVault/` default + `~/.mneme/` | [VERIFIED: `src-tauri/Cargo.toml` L27]. Already used in Phase 1 `lib.rs` to create `~/.mneme/scratch`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-yaml` | (transitive via `gray-matter`) | YAML parse/stringify under gray-matter | Not directly imported; gray-matter bundles. [CITED: gray-matter GitHub README — "uses js-yaml for YAML parsing"]. js-yaml is Node-only but gray-matter ships browser-safe builds; verify at execute-time by importing in Svelte component and running `npm run check`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gray-matter` | Hand-roll YAML parser | Hand-rolling YAML is a Pitfall 2 trap (multi-line strings, anchors, escape rules, type coercion). gray-matter is 4kb gzipped, MIT, battle-tested. No-go on hand-roll. |
| `rusqlite` | `sqlx` async-first SQL toolkit | `sqlx` is heavier, compile-time-checked queries, async-first — overkill for single-user single-machine 100-file index. rusqlite is sync + simple + bundled-feature avoids system SQLite drift. |
| `rusqlite` | Plain `serde_json` flatfile index | JSON would force whole-file rewrite on every insert. For 100 files OK; for 500+ files (D-14 escalation trigger) the I/O cost compounds. SQLite handles WAL + indexing for free. |
| `@tauri-apps/plugin-dialog` | HTML `<input type="file">` | `<input type="file">` works in WebKit but lacks folder-picker UX (`webkitdirectory` flag is Chrome-only on macOS); the OS-native NSOpenPanel via Tauri dialog plugin is the right tool for both files and folders. |
| `tauri-plugin-fs-watch` | None for v1 | File-watch is Phase 3+. Phase 2 uses startup reconciliation only (D-14). |
| Embed full pico-sqlite WASM in browser | rusqlite Rust side | Browser-side SQL would bypass Rust capability gate; defeats `_source/` write protection model. Always do filesystem from Rust. |

**Installation:**

```bash
# npm side
npm install gray-matter@4.0.3 @tauri-apps/plugin-dialog@2.7.1

# Cargo side — add to src-tauri/Cargo.toml [dependencies]:
# rusqlite = { version = "0.39", features = ["bundled"] }
# tauri-plugin-dialog = "2"
# tokio-util = { version = "0.7", features = ["sync"] }   # if CancellationToken needed standalone
```

**Version verification:** Pin exact versions during plan-phase task definition. The 2026-05-15 verified versions above are current; if plan-phase runs > 7 days later, re-verify via `npm view <package> version` and `cargo search <crate>` before locking.

---

## Architecture Patterns

### System Architecture Diagram

```text
                           ┌─────────────────────────────────────────────┐
                           │           App Startup Sequence              │
                           │                                              │
                           │  1. +layout.svelte mounts                    │
                           │  2. invoke("load_config") → vault_path      │
                           │  3. invoke("load_onboarding_state")         │
                           │  4. if completed_at == null:                │
                           │       goto /onboarding/<current_step>       │
                           │     else:                                    │
                           │       ReconciliationOverlay mounts          │
                           │       invoke("reconcile_vault_index")       │
                           │       → emits "reconcile:progress" events   │
                           │       → on complete: unmount, show /        │
                           └──────────────────┬──────────────────────────┘
                                              │
              ┌───────────────────────────────┴────────────────────────────┐
              │                                                            │
              ▼                                                            ▼
   ┌──────────────────────┐                              ┌─────────────────────────────┐
   │  /onboarding/[step]  │                              │   / (three-pane shell)      │
   │  (full-screen route) │                              │   ┌─────────────────────┐    │
   │                      │                              │   │ TitlebarMeta        │    │
   │  Onboarding.svelte   │                              │   │ + ImportStatusPill  │    │
   │   └─Step1..Step6     │                              │   └─────────────────────┘    │
   │                      │                              │   │ Splitter (3 panes)  │    │
   │  Each Next click →   │                              │   │ + DropzoneOverlay   │    │
   │   invoke(            │                              │   │   listener          │    │
   │    "save_onboarding_ │                              │   └─────────────────────┘    │
   │     state",          │                              │                              │
   │    {...})            │                              │   Settings cog →             │
   │   →  atomic temp     │                              │     SettingsPanel.svelte     │
   │      +rename in      │                              │       ├─ VaultCategory       │
   │      ~/.mneme/       │                              │       ├─ Appearance(no-op)  │
   │                      │                              │       ├─ Keybindings(RO)    │
   │  Step 5 "Add course" │                              │       └─ ComingSoonCategory │
   │   →  invoke(         │                              │                              │
   │      "create_course",│                              │   Drop file on window →      │
   │      {code})         │                              │     DropzoneOverlay shown    │
   │                      │                              │     (dataTransfer.types      │
   │  Step 6 "Finish" →   │                              │      includes "Files")       │
   │   invoke(            │                              │     → drop releases →        │
   │    "complete_        │                              │     ImportDialog opens       │
   │     onboarding")     │                              │                              │
   │   → goto("/")        │                              │   Cmd+I →                    │ <!-- v1.x deferred per Phase 02.1 D-06; the handler-arrow stays in the diagram for historical accuracy -->
   │                      │                              │     dialog.open() →          │
   └──────────────────────┘                              │     ImportDialog opens       │
                                                         │                              │
                                                         │   Import submit →            │
                                                         │     invoke(                  │
                                                         │      "start_import",         │
                                                         │      {files, course, cat})   │
                                                         │     → tokio task spawned     │
                                                         │     → emits per-file         │
                                                         │       "import:progress"      │
                                                         │     → ImportStatusPill       │
                                                         │       reactively updates     │
                                                         │     → on complete:           │
                                                         │       "import:done" event    │
                                                         │       updates recent-20      │
                                                         └──────────────────────────────┘

         ┌────────────────────────────────────────────────────────────────────┐
         │                       Rust Backend (src-tauri/src/)                │
         │                                                                    │
         │  lib.rs                                                           │
         │   ├─ State<Arc<VaultWriter>>                                       │
         │   ├─ State<Arc<ImportController>>                                  │
         │   ├─ State<Arc<VaultIndex>>                                        │
         │   ├─ State<Arc<OnboardingState>>                                   │
         │   ├─ State<Arc<RwLock<Config>>>                                    │
         │   │                                                                │
         │   ├─ ~12 invoke_handler commands (D-19)                            │
         │   │   load_config / save_config / vault_create /                   │
         │   │   create_course / list_courses /                              │
         │   │   start_import / cancel_import / get_recent_imports /         │
         │   │   open_file_picker / open_folder_picker /                     │
         │   │   load_onboarding_state / save_onboarding_state /             │
         │   │   reconcile_vault_index / move_vault                           │
         │   │                                                                │
         │   └─ WindowEvent::CloseRequested + RunEvent::ExitRequested         │
         │      union handler (Phase 1 D-10 pattern):                         │
         │      → cancel all in-flight imports (CancellationToken)            │
         │      → commit pending index transactions                           │
         │      → call kill_pgid for the claude session (Phase 1)             │
         │                                                                    │
         │  vault_writer.rs                                                  │
         │   ├─ enum WriteContext { User, Import(ImportToken) }              │
         │   ├─ struct ImportToken (pub(crate) only)                         │
         │   ├─ pub fn import_handle() → ImportToken                         │
         │   ├─ pub fn write_to_vault(path, bytes, ctx) → Result<()>         │
         │   ├─ pub fn create_vault_scaffold(root) → Result<()>              │
         │   ├─ pub fn create_course(root, code) → Result<()>                │
         │   └─ pub fn with_temporary_writable_permission(path, fn)          │
         │                                                                    │
         │  import_controller.rs                                             │
         │   ├─ HashMap<OperationId, ImportOperation> (registry)             │
         │   ├─ pub async fn start_import(files, course, cat) →              │
         │   │   tokio::spawn(import_task) — emits per-file events           │
         │   ├─ pub fn cancel_import(op_id)                                  │
         │   └─ Inside task: vault_writer::import_handle() +                 │
         │       chmod 0o444 + vault_index::insert in same step              │
         │                                                                    │
         │  vault_index.rs                                                   │
         │   ├─ Connection wrapped in Mutex<Connection>                      │
         │   ├─ init() with WAL pragma + busy_timeout                        │
         │   ├─ pub fn insert(path, course, kind, size, mtime)               │
         │   ├─ pub fn delete_missing()  (reconciliation pass)               │
         │   ├─ pub fn list_courses()                                        │
         │   └─ pub fn reconcile(root) → emits progress events               │
         │                                                                    │
         │  onboarding.rs                                                    │
         │   ├─ pub struct OnboardingState { current_step, vault_path,       │
         │   │     courses_added: Vec<String>, completed_at: Option<DT> }    │
         │   ├─ pub fn load() → Result<OnboardingState>                      │
         │   ├─ pub fn save(state) → atomic temp+rename                      │
         │   └─ pub fn complete() — sets completed_at                        │
         │                                                                    │
         │  config.rs                                                        │
         │   ├─ pub struct Config { vault_path, schema_version }             │
         │   ├─ pub fn load() / save(state) — atomic temp+rename             │
         │   └─ Phase 3+ extends with theme, keybindings, etc.               │
         └────────────────────────────────────────────────────────────────────┘

                          File system layout (post-Phase 2):
                          ~/.mneme/
                            ├── scratch/                  (Phase 1)
                            ├── config.json               (Phase 2)
                            ├── onboarding-state.json     (Phase 2)
                            └── vault-index.db            (Phase 2 — rusqlite WAL)

                          ~/StudyVault/                    (Phase 2)
                            ├── _system/
                            │   ├── memory/                (Phase 7 sink)
                            │   └── fsrs/                  (Phase 10 sink)
                            ├── _inbox/                    (Phase 2 catch-all)
                            ├── courses/<CODE>/
                            │   ├── _source/               (chmod 0o444 enforced)
                            │   │   ├── lectures/
                            │   │   ├── tutorials/
                            │   │   ├── assignments/
                            │   │   └── announcements.md
                            │   ├── notes/                 (Phase 3+ editor target)
                            │   ├── concepts/              (Phase 3+ FSRS unit)
                            │   ├── practice/
                            │   ├── .mneme/rules/          (Phase 8)
                            │   └── INDEX.md               (gray-matter YAML)
                            └── shared/                    (cross-course)
```

### Recommended Project Structure

```text
src-tauri/src/
├── lib.rs                                  # Phase 1 — extend with Phase 2 state + commands
├── main.rs                                 # unchanged
├── session.rs                              # Phase 1 — unchanged
├── dev.rs / bin/dev_invoke.rs              # Phase 01.1 — unchanged
├── vault_writer.rs                         # NEW Phase 2 — D-05/D-06/D-07
├── import_controller.rs                    # NEW Phase 2 — D-15/D-16
├── vault_index.rs                          # NEW Phase 2 — rusqlite wrapper
├── onboarding.rs                           # NEW Phase 2 — D-03
└── config.rs                               # NEW Phase 2 — D-20

src/lib/
├── connection-state.svelte.ts              # Phase 1 — unchanged
├── vault-state.svelte.ts                   # NEW — vault path + course list cache
├── import-state.svelte.ts                  # NEW — current op + recent-20 + pill state
├── spawn-args.shared.ts / .node.ts         # Phase 1 — unchanged
├── stream-dispatch.ts                      # Phase 1 — unchanged
├── sanitize.ts                             # Phase 1 — unchanged
├── components/
│   ├── (existing Phase 1)
│   ├── SettingsPanel.svelte                # NEW — REPLACES SettingsModal.svelte
│   ├── ImportDialog.svelte                 # NEW
│   ├── DuplicateResolutionDialog.svelte    # NEW
│   ├── ImportStatusPill.svelte             # NEW
│   ├── ImportHistoryModal.svelte           # NEW
│   ├── ReconciliationOverlay.svelte        # NEW
│   ├── onboarding/
│   │   ├── Onboarding.svelte               # NEW (state owner)
│   │   ├── Step1Welcome.svelte             # NEW
│   │   ├── Step2AuthCheck.svelte           # NEW
│   │   ├── Step3VaultPicker.svelte         # NEW
│   │   ├── Step4MCPStatus.svelte           # NEW
│   │   ├── Step5AddCourse.svelte           # NEW
│   │   ├── Step6DemoImport.svelte          # NEW
│   │   └── OnboardingStepRail.svelte       # NEW
│   ├── settings/
│   │   ├── VaultCategory.svelte            # NEW
│   │   ├── AppearanceCategory.svelte       # NEW
│   │   ├── KeybindingsCategory.svelte      # NEW
│   │   └── ComingSoonCategory.svelte       # NEW
│   └── dropzone/
│       └── DropzoneOverlay.svelte          # NEW

src/routes/
├── +layout.svelte                          # MODIFIED — add onboarding redirect check
├── +layout.ts                              # unchanged
├── +page.svelte                            # MODIFIED — mount DropzoneOverlay listener
└── onboarding/
    ├── +layout.svelte                      # NEW (no Splitter, no MindMapBar)
    └── [step]/+page.svelte                 # NEW (step router)

src/lib/styles/
└── tokens.css                              # MODIFIED — add --color-success: #4ea36b
```

### Pattern 1: State Persistence via Atomic temp+rename

**What:** Write any JSON file via `temp + rename` so unclean exit never corrupts.
**When to use:** All Phase 2 persistent files (`config.json`, `onboarding-state.json`).
**Example:**

```rust
// vault: ~/.mneme/onboarding-state.json — atomic write
// Source: idiomatic Rust POSIX rename(2) pattern.
// [CITED: https://en.wikipedia.org/wiki/Rename_(computing) — POSIX rename
//  is atomic from the local-host POV; on APFS this guarantee holds
//  for normal operation (NOT for kernel-panic crash recovery — for
//  that we'd need fsync of the parent dir, which is acceptable v1 cost).]
pub fn save_onboarding_state(state: &OnboardingState) -> Result<(), io::Error> {
    let final_path = home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "no home"))?
        .join(".mneme/onboarding-state.json");
    let tmp_path = final_path.with_extension("json.tmp");

    let json = serde_json::to_vec_pretty(state)?;
    {
        let mut f = File::create(&tmp_path)?;
        f.write_all(&json)?;
        f.sync_all()?;  // ensures bytes are durable before rename
    }
    fs::rename(&tmp_path, &final_path)?;
    Ok(())
}
```

### Pattern 2: WriteContext Privacy Invariant

**What:** Private `ImportToken` struct + factory function so only `vault_writer.rs` can produce `WriteContext::Import`.
**When to use:** Any privileged-by-construction write capability.
**Example:**

```rust
// src-tauri/src/vault_writer.rs — D-05 verbatim
// Source: D-05 in 02-CONTEXT.md
// CYCLE-2 cluster #5 correction (2026-05-16) — `_marker` is fully PRIVATE (no
// `pub(crate)`) so sibling modules under src-tauri/src/ cannot mint ImportToken
// literals. Only this module's `import_handle()` factory can construct one.
pub struct ImportToken {
    _marker: PhantomData<()>,
}

pub enum WriteContext {
    User,
    Import(ImportToken),
}

// The ONE factory the import controller (and Phase 4 doc-ingestion) calls.
// Audit gate: grep for "import_handle()" surfaces every privileged caller.
pub fn import_handle() -> ImportToken {
    ImportToken { _marker: PhantomData }
}

pub fn write_to_vault(
    path: &Path,
    bytes: &[u8],
    ctx: WriteContext,
) -> Result<(), VaultWriterError> {
    match ctx {
        WriteContext::User => {
            // Reject any write under courses/<*>/_source/
            let canon = path.canonicalize()
                .map_err(VaultWriterError::CanonicalizeFailed)?;
            // ... prefix check ...
        }
        WriteContext::Import(_token) => {
            // Owner authorized; proceed.
        }
    }
    // ... write bytes + chmod 0o444 if under _source/ ...
}
```

### Pattern 3: tokio Task + CancellationToken + Per-File Event Emit

**What:** Background tokio task drives the import; emits events per-file; cancellable via shared `CancellationToken`.
**When to use:** Any multi-step backend operation that needs progress reporting + user-initiated cancel.
**Example:**

```rust
// src-tauri/src/import_controller.rs (sketch)
// Source: D-15 + D-16 in 02-CONTEXT.md
use tokio_util::sync::CancellationToken;

#[tauri::command]
pub async fn start_import(
    files: Vec<PathBuf>,
    course: String,
    category: String,
    state: tauri::State<'_, Arc<ImportController>>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let op_id = uuid::Uuid::new_v4().to_string();
    let cancel_token = CancellationToken::new();
    let controller = state.inner().clone();

    {
        let mut reg = controller.registry.lock().await;
        reg.insert(op_id.clone(), ImportOperation {
            cancel_token: cancel_token.clone(),
            total: files.len(),
            started_at: Instant::now(),
        });
    }

    let op_id_clone = op_id.clone();
    tokio::spawn(async move {
        for (i, file) in files.iter().enumerate() {
            if cancel_token.is_cancelled() {
                let _ = app.emit("import:progress", ImportProgress {
                    operation_id: op_id_clone.clone(),
                    current: i,
                    total: files.len(),
                    last_file_name: file.display().to_string(),
                    last_file_status: "cancelled".into(),
                });
                break;
            }
            // ... write + chmod 0o444 + index insert ...
            let status = match import_one_file(file, &course, &category).await {
                Ok(_) => "ok",
                Err(e) => {
                    // log per-file error; continue (don't break — partial OK)
                    "error"
                }
            };
            let _ = app.emit("import:progress", ImportProgress {
                operation_id: op_id_clone.clone(),
                current: i + 1,
                total: files.len(),
                last_file_name: file.display().to_string(),
                last_file_status: status.into(),
            });
        }
        let _ = app.emit("import:done", ImportDone { operation_id: op_id_clone });
    });

    Ok(op_id)
}
```

### Pattern 4: rusqlite WAL Mode + Mutex<Connection> Single-Writer

**What:** Single rusqlite connection wrapped in Tokio `Mutex<Connection>`; WAL pragma; busy_timeout.
**When to use:** Single-user single-machine SQLite (mneme's exact target).
**Example:**

```rust
// src-tauri/src/vault_index.rs (sketch)
// Sources:
//   [CITED: https://sqlite.org/wal.html — WAL enables readers + one writer]
//   [CITED: https://til.simonwillison.net/sqlite/enabling-wal-mode]
//   Recommended pragmas synthesised from oneuptime.com WAL setup guide.
use rusqlite::{params, Connection};
use tokio::sync::Mutex;

pub struct VaultIndex {
    conn: Mutex<Connection>,
}

impl VaultIndex {
    pub fn init(db_path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(db_path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;  // safe under WAL
        conn.pragma_update(None, "busy_timeout", 5000_i32)?;  // 5s
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
            CREATE INDEX IF NOT EXISTS vault_files_course_idx
                ON vault_files(course);
        "#)?;
        Ok(VaultIndex { conn: Mutex::new(conn) })
    }
    // ... CRUD + reconcile ...
}
```

### Pattern 5: DataTransfer.types Discrimination at dragenter

**What:** Inspect `event.dataTransfer.types` at `dragenter` to discriminate native file drops from text drags.
**When to use:** When the app accepts text drags in some surfaces and file drops in others.
**Example:**

```typescript
// src/routes/+page.svelte (sketch)
// Sources:
//   D-09 in 02-CONTEXT.md
//   [CITED: https://github.com/leonadler/drag-and-drop-across-browsers — WebKit dragenter supports types array]
//   [VERIFIED: WebKit bug 223517 — `.items` is empty in dragenter on Safari;
//    but `.types.includes("Files")` IS reliable on dragenter.]
function onDragEnter(e: DragEvent) {
    if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        showDropzoneOverlay = true;
    }
    // else: text-drag — leave the path open for v1.x ChatPanel
}
```

### Pattern 6: Tauri `dragDropEnabled: false` to Opt Into DOM Events

**What:** Set `dragDropEnabled: false` in `tauri.conf.json` so Tauri's native file-drop event system disables and the HTML5 `dragenter`/`drop` events fire reliably with `event.dataTransfer.files` populated on drop.
**When to use:** When the app needs full DOM control over drag UX (mneme's case — D-09 overlay).
**Example:**

```jsonc
// src-tauri/tauri.conf.json (excerpt)
// Source: [CITED: https://github.com/tauri-apps/tauri/issues/14373 + Tauri 2 dragDropEnabled docs]
// "dragDropEnabled: true (default) means Tauri's internal drag-drop is on
//  and DOM drag-drop is OFF" — must flip to false to use DataTransfer.files.
{
  "app": {
    "windows": [
      {
        "label": "main",
        "dragDropEnabled": false,    // NEW Phase 2 — opt into DOM drag-drop
        // ... rest of Phase 1 config ...
      }
    ]
  }
}
```

### Anti-Patterns to Avoid

- **Reading vault path from localStorage (Phase 1 leftover):** `TitlebarMeta.svelte:27` currently does this; Phase 2 SPEC REQ-1 acceptance requires removal. Read from `vault-state.svelte.ts` reactive singleton sourced from `~/.mneme/config.json`.
- **Hand-rolling YAML frontmatter parsing:** Use `gray-matter` — multi-line strings, escapes, type coercion, anchors are easy to get wrong.
- **JS-side filesystem writes:** Always route through Rust IPC. JS-side writes bypass the WriteContext guard.
- **Mutex<Connection> in std::sync (blocking) on tokio runtime:** Use `tokio::sync::Mutex` for the rusqlite connection if any await crosses the lock. For pure-sync blocks, `std::sync::Mutex` is also acceptable as long as the lock guard never crosses an `.await` boundary.
- **Hardcoding the vault root path constant:** Vault is movable per REQ-11 — every path-prefix check must read the *current* persisted vault root from config.
- **`fs::rename` across filesystem boundaries** (e.g., from `~/StudyVault` on user volume to `/tmp` on another mount): `rename(2)` returns `EXDEV` on cross-device. The Move flow per D-04 REQ-11 is **always copy**, never rename — this dodges the EXDEV trap entirely.
- **Skipping `file.sync_all()` before atomic rename:** Without sync_all, the bytes may not be durable when rename completes. Acceptable for non-critical config but mandatory for vault writes (chmod 0o444 will lock the bytes before sync flushes).
- **Settings cog opening different modal than Cmd+,:** Both must reach the same `SettingsPanel.svelte`; UI-SPEC §10.19 also requires unifying cog aria-label. (Applies whenever Cmd+, is implemented; spec contract for the Cmd+, keyboard shortcut itself is v1.x deferred per Phase 02.1 D-06 — the regression rule still holds when the keymap is re-introduced.) <!-- v1.x deferred per Phase 02.1 D-06 -->


---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parse/stringify | Custom YAML parser | `gray-matter` | Multi-line strings, anchors, escapes, type coercion are landmines. |
| SQLite-style index over markdown vault | JSON flatfile, custom CSV, jsonlines | `rusqlite` with `bundled` feature | I/O cost of full-file rewrite scales linearly with entries. WAL + indexes are free with SQLite. |
| Native file picker | Hand-rolled DOM file picker | `@tauri-apps/plugin-dialog` | NSOpenPanel is the macOS-native UX; `<input type="file">` lacks directory picker. |
| Process cancellation | Boolean flag + manual polling | `tokio_util::sync::CancellationToken` | Token is `.cancelled()` -aware in `select!`; can be cloned to multiple subtasks. |
| Atomic file write | Direct `fs::write` | temp + rename | Direct write leaves a partial-write window on unclean exit. |
| Directory recursion for reconciliation | Custom recursive walk | `walkdir` crate OR `std::fs::read_dir` recursion (small vault is fine) | If using `walkdir`, register in dependencies.md. For ≤100 files, vanilla `fs::read_dir` recursion is acceptable and avoids a new dep — planner picks. |
| UUID for operation_id | Random string from `rand` + format | `uuid` crate (likely already transitive) | Phase 2 emits `operation_id` on import:progress events; `Uuid::new_v4()` is one line. Check `Cargo.lock` for existing transitive presence to avoid a new dep. |
| File extension → kind classifier | Hand-rolled match on extensions | Same — but in a single `classify_kind()` helper in `vault_index.rs` | Don't over-engineer. Phase 2 needs only `_source` / `notes` / `concepts` / `practice` / `INDEX` — categorize by path prefix not extension. |

**Key insight:** Phase 2 is mostly filesystem + database orchestration; the discipline is leveraging the standard library (`std::fs`, `std::os::unix::fs`) + Tauri 2 + rusqlite, and avoiding speculative abstractions. Resist the urge to build a "vault driver" trait — REQ-06 + REQ-11 are concrete enough to code direct.

---

## Runtime State Inventory

> Phase 2 is a **greenfield** phase (no rename / refactor / migration of existing data) — but it produces several pieces of runtime state that downstream phases will need to migrate around. Documenting now so Phase 3+ doesn't get surprised.

| Category | Items Created in Phase 2 | Action Required |
|----------|--------------------------|------------------|
| Stored data | `~/.mneme/vault-index.db` (rusqlite WAL) + `~/.mneme/vault-index.db-wal` + `~/.mneme/vault-index.db-shm` (WAL companions); `~/.mneme/config.json`; `~/.mneme/onboarding-state.json`; `~/StudyVault/**` (user data) | Phase 3 Cmd+P reads vault-index.db — must coordinate schema. |
| Live service config | None — Phase 2 doesn't talk to any external service. | None. |
| OS-registered state | None — no LaunchAgent, no Spotlight metadata, no Finder tag (single-user app, mneme owns no OS-level registry). | None. |
| Secrets/env vars | None — no API keys, no OAuth tokens. Onboarding step 2 reads `~/.claude/` sentinel (Phase 1 already has access; no new secret introduced). | None. |
| Build artifacts | New Rust modules compile into `src-tauri/target/debug/mneme` + `target/release/mneme`; capability `default.json` regenerates from SSOT (existing pattern). | None unique to Phase 2. |

**Nothing found in category:** Live service config / OS-registered state / Secrets — verified explicitly above.

**Cross-phase forward warning:** Phase 4 doc-ingestion will call `vault_writer::import_handle()` from Marker / markitdown subprocess pipelines. The `pub(crate)` visibility on `ImportToken` means Phase 4's modules MUST live in the same crate (which they will — `src-tauri/src/`). Plan-phase should not propose moving `vault_writer.rs` to a separate Rust workspace member.

---

## Common Pitfalls

### Pitfall 1: TOCTOU between chmod 0o444 and another writer

**What goes wrong:** Between `write_bytes` and `chmod 0o444`, another writer (rogue extension, another mneme instance, manual `vi` open) could overwrite or delete the file.
**Why it happens:** chmod is not atomic with write; the file is briefly writable.
**How to avoid:** Order matters — `write_bytes` → `sync_all` → `set_permissions(0o444)` (locked in D-07). On macOS single-user single-app: TOCTOU is extremely improbable (no other writer on `_source/`). Still, document the gap. Future hardening: use `O_EXCL` open + `umask` 0o222 on file create so the file is born read-only — investigate for v1.x.
**Warning signs:** A future Phase 4 doc-ingestion error report showing partial files in `_source/`.

### Pitfall 2: Canonicalize fails on a not-yet-created path

**What goes wrong:** `std::fs::canonicalize` returns `Err(NotFound)` for a path whose final component doesn't exist (it resolves symlinks AND requires the path to exist).
**Why it happens:** The path guard runs *before* the write — the file isn't there yet.
**How to avoid:** Canonicalize the **parent directory** + reattach the file basename: `path.parent().canonicalize()? .join(path.file_name())`. The parent (e.g., `courses/COMP3221/_source/lectures/`) is real (vault scaffold + course scaffold created it). This catches `..` traversal in the parent path without requiring the file to exist.
**Warning signs:** Unit test `write_to_vault("/Users/.../X/Y/Z.txt", ..., WriteContext::User)` returning `Err(CanonicalizeFailed)` instead of `Err(WriteToSourceForbidden)`.

### Pitfall 3: APFS rename across volumes returns EXDEV

**What goes wrong:** Vault Move per REQ-11 uses copy (NOT rename) — but if a developer "shortcuts" with `fs::rename` to "save the bytes," `rename(2)` returns `EXDEV` (`Errno::EXDEV`) on cross-mount.
**Why it happens:** POSIX `rename` is a single-syscall operation on one filesystem; cross-volume requires copy + unlink + sync.
**How to avoid:** Specified: D-04 REQ-11 = **always copy** in vault move flow. Code review check: grep for `fs::rename` outside of the temp+rename atomic-write helpers; flag any move-vault use.
**Warning signs:** Vault move to a different drive failing with EXDEV at runtime.

### Pitfall 4: SQLite WAL files left behind after process crash

**What goes wrong:** Unclean exit while WAL is mid-checkpoint leaves `.db-wal` + `.db-shm` files; next start may show a stale view if `.db-wal` is corrupted.
**Why it happens:** WAL is faster but companion files (`.db-wal` + `.db-shm`) must be present together; SQLite recovers automatically from a clean WAL but a torn page mid-write can fail to recover.
**How to avoid:** SQLite recovery is robust; the user-visible degradation is "vault index is empty, reconciliation rebuilds it from disk." Reconciliation scan ON STARTUP (D-14) is the safety net — even on torn WAL, the next launch rebuilds the index from the actual filesystem. Document in vault_index.rs comment: "WAL torn-page recovery is intentionally handled by D-14 reconciliation rather than rusqlite recover machinery."
**Warning signs:** vault-index.db-wal larger than vault-index.db; `SELECT count(*) FROM vault_files` returning 0 unexpectedly.

### Pitfall 5: WebKit dragenter empty `.items`

**What goes wrong:** Trying to inspect `event.dataTransfer.items` during `dragenter` on macOS WebKit returns empty array (Safari bug 223517, also affects Tauri's WKWebView).
**Why it happens:** WebKit defers `items` population until `drop` for security reasons.
**How to avoid:** Use `event.dataTransfer.types.includes("Files")` (the `types` array IS populated on dragenter). D-09 already specifies this. Do not write code that depends on `items.length` at dragenter time.
**Warning signs:** Drop overlay never appears OR appears for every text drag.

### Pitfall 6: SvelteKit `adapter-static` + dynamic route `/onboarding/[step]`

**What goes wrong:** `adapter-static` with `prerender: true` requires every dynamic route to be enumerable at build time. `[step]` could be `1` through `6`, but prerender wants explicit entries.
**Why it happens:** Static export needs to produce HTML files for every page; dynamic params must be known.
**How to avoid:** Use a `+layout.ts` (or `+page.ts`) that exports a list of entry points: e.g., `export const entries = () => [{step: '1'}, {step: '2'}, {step: '3'}, {step: '4'}, {step: '5'}, {step: '6'}];`. Alternative: use a single `/onboarding` route + URL hash `#/step/N` (avoids the entry-listing pattern entirely). Plan-phase to decide — entry listing is cleaner; hash routing avoids dynamic-route ceremony.
**Warning signs:** `npm run build` fails with "Cannot prerender pages with dynamic route parameters" or "405 — adapter-static" warnings.

### Pitfall 7: Tauri 2 `dragDropEnabled` confusing semantics

**What goes wrong:** Default `dragDropEnabled: true` disables the DOM drag-drop events; setting to `false` enables HTML5 drag-drop. The naming is the opposite of intuition.
**Why it happens:** Tauri's "enabled" refers to **Tauri's internal** drag-drop system, not the DOM's. [CITED: https://github.com/tauri-apps/tauri/issues/14373]
**How to avoid:** Phase 2 must set `dragDropEnabled: false` for the main window in `tauri.conf.json`. Add inline comment explaining the inversion so future-self doesn't undo it.
**Warning signs:** `event.dataTransfer.files` always empty; drop event never fires.

### Pitfall 8: `dialog.open({ directory: true })` returns string vs string[]

**What goes wrong:** Tauri 2 dialog plugin returns `string | null` for directory mode and `string[] | null` for multiple-files mode; mixing call shapes leads to runtime type errors.
**Why it happens:** TS narrowing on optional flags.
**How to avoid:** Always pass `multiple: false` explicitly for directory picks; type the response as `string | null` and handle null (user cancelled). For Cmd+I file pick: `multiple: true` → `string[] | null`.
**Warning signs:** `value.length` on a `string | null` results in `null.length` undefined.

### Pitfall 9: Drag-drop overlay flicker on child element dragenter/dragleave

**What goes wrong:** When the user drags over a child element, the parent fires `dragleave` then `dragenter` on the child — the overlay flickers on/off.
**Why it happens:** dragenter/dragleave fire per-element, not per-window.
**How to avoid:** Use a `relatedTarget === null` check on dragleave (cursor truly left the window) OR maintain a counter that increments on dragenter / decrements on dragleave and only hide overlay when counter == 0. Industry pattern is the counter approach.
**Warning signs:** Overlay flickering while user moves cursor over panes.

### Pitfall 10: `~` not expanded by Rust path methods

**What goes wrong:** Passing `"~/StudyVault"` directly to `Path::new` or `Path::canonicalize` does NOT expand `~` — Rust's std doesn't expand `~`.
**Why it happens:** `~` expansion is a shell feature, not POSIX.
**How to avoid:** Always use `home::home_dir()` (or `dirs::home_dir()`) then `.join(...)` to construct vault root from absolute path. Onboarding's "Choose your vault location" picker should display the user-visible `~/StudyVault` string but store the absolute resolved path in config.
**Warning signs:** Vault path `~/StudyVault` literal text appearing on disk; chmod / read errors with "No such file or directory" for paths that contain a literal `~`.

### Pitfall 11: rusqlite Connection migration across threads

**What goes wrong:** Sharing a single `Connection` across multiple tokio tasks via `Arc<Mutex<Connection>>` is fine; but `Connection` itself is `!Send` on some configs. Using `Send`-safe wrapper or `tokio::sync::Mutex` per the WAL pattern handles this.
**Why it happens:** SQLite's threading model — by default rusqlite enables `SQLITE_OPEN_NOMUTEX` so the application must serialize.
**How to avoid:** Wrap connection in `tokio::sync::Mutex<Connection>`; only one task holds the lock at a time. WAL mode allows reads to bypass — but with a single `Connection`, reads also serialize. Acceptable for Phase 2 vault size; revisit for v1.x if needed.
**Warning signs:** `cargo build` errors about `Send` bounds when storing `Connection` in Tauri State.

### Pitfall 12: Cancel mid-import leaves chmod 0o644 dangling

**What goes wrong:** If user cancels during the rewrite step of a re-import (chmod 644 → write → chmod 444) at the moment between chmod 644 and the chmod 444, the file is left writable.
**Why it happens:** Cancellation is cooperative; tokio task may be in any state when cancel fires.
**How to avoid:** Wrap the three-step in a `Drop` guard that re-applies chmod 0o444 on early return / panic. Already specified per D-07: failure during rewrite leaves file at 0o644 + returns Err. Plan-phase task to add Drop guard for cancellation-safety.
**Warning signs:** Test "cancel mid-rewrite" → assert file is back to 0o444 after cancel handler runs.

---

## Code Examples

Verified patterns from prior phases + official sources.

### Tauri 2 invoke + event listener pattern (Phase 1 — proven)

```typescript
// src/lib/import-state.svelte.ts (sketch)
// Source: extends the Phase 1 connection-state.svelte.ts pattern.
import { listen } from "@tauri-apps/api/event";

export interface ImportProgress {
    operation_id: string;
    current: number;
    total: number;
    last_file_name: string;
    last_file_status: "ok" | "error" | "cancelled";
}

interface ImportState {
    current_op_id: string | null;
    progress: ImportProgress | null;
    recent_20: ImportProgress[];
}

let state = $state<ImportState>({
    current_op_id: null,
    progress: null,
    recent_20: [],
});

// Mount listener once at module load — uses Phase 1's "install once" pattern.
// .svelte.ts suffix mandatory for module-scope $state to work.
listen<ImportProgress>("import:progress", (event) => {
    state.progress = event.payload;
    // ... derive pill state ...
});

export function getImportState() {
    return state;
}
```

### `dialog.open` Cmd+I file picker (Tauri 2 dialog plugin)

```typescript
// src/lib/components/ChatFooter.svelte or wherever Cmd+I lives
// Source: [CITED: https://v2.tauri.app/plugin/dialog/]
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

async function onCmdI() {
    const files = await open({
        multiple: true,
        directory: false,
        filters: [
            { name: "Documents", extensions: ["pdf", "docx", "pptx", "md", "txt"] },
        ],
    });
    if (files === null) return;  // user cancelled
    // files is string[] for multiple:true
    showImportDialog(files);
}
```

### Vault scaffold creation (idempotent)

```rust
// src-tauri/src/vault_writer.rs
// Source: SPEC REQ-1 + REQ-2 acceptance — idempotent re-creation.
pub fn create_vault_scaffold(root: &Path) -> Result<(), VaultWriterError> {
    for sub in &["_system", "_inbox", "courses", "shared"] {
        let p = root.join(sub);
        // create_dir_all is idempotent — already-exists is fine.
        fs::create_dir_all(&p)
            .map_err(|e| VaultWriterError::ScaffoldFailed(p.clone(), e))?;
    }
    Ok(())
}

pub fn create_course(root: &Path, code: &str) -> Result<(), VaultWriterError> {
    // Validate code matches USYD pattern (D-Claude's-discretion item).
    if !VALID_COURSE_CODE.is_match(code) {
        return Err(VaultWriterError::InvalidCourseCode(code.into()));
    }
    let course_root = root.join("courses").join(code);
    for sub in &["_source", "_source/lectures", "_source/tutorials",
                 "_source/assignments", "notes", "concepts", "practice"] {
        fs::create_dir_all(course_root.join(sub))
            .map_err(|e| VaultWriterError::ScaffoldFailed(course_root.clone(), e))?;
    }
    // Idempotent: only create INDEX.md if it doesn't exist (SPEC REQ-2).
    let index_md = course_root.join("INDEX.md");
    if !index_md.exists() {
        // Use a small inline format; gray-matter is npm-side, not Rust-side.
        // Phase 2 keeps frontmatter generation in Rust by hand-writing the YAML
        // (it's a fixed 2-field shape: course + created). Bigger frontmatter
        // shapes get JS-side gray-matter.
        let created = chrono::Utc::now().to_rfc3339();
        let body = format!("---\ncourse: {}\ncreated: {}\n---\n", code, created);
        atomic_write(&index_md, body.as_bytes())?;
    }
    Ok(())
}
```

### gray-matter parse + stringify (npm side)

```typescript
// src/lib/components/settings/VaultCategory.svelte (when reading INDEX.md to show notes count)
// or src/lib/vault-state.svelte.ts (when watching INDEX.md changes — Phase 3)
// Source: [CITED: https://github.com/jonschlinkert/gray-matter] basic usage.
import matter from "gray-matter";

interface IndexFrontmatter {
    course: string;
    created: string;
    // future fields: tags?, archived?, etc.
}

export function parseIndexMd(raw: string): IndexFrontmatter {
    const parsed = matter(raw);
    return parsed.data as IndexFrontmatter;
}

export function stringifyIndexMd(content: string, fm: IndexFrontmatter): string {
    return matter.stringify(content, fm as Record<string, unknown>);
}
```

### Drop-zone overlay with counter approach (avoid flicker)

```typescript
// src/routes/+page.svelte (sketch)
// Source: industry pattern for dragenter/dragleave per-element flicker.
let dragCounter = $state(0);
let dropzoneVisible = $derived(dragCounter > 0);

function onDragEnter(e: DragEvent) {
    if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        dragCounter += 1;
        e.preventDefault();
    }
}

function onDragLeave(e: DragEvent) {
    if (dragCounter > 0) dragCounter -= 1;
}

function onDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    if (!e.dataTransfer) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        // Open import dialog with file paths (note: WebKit gives File objects,
        // not paths; Tauri exposes file paths via `tauri-apps/api/webview`'s
        // dragDrop event when dragDropEnabled is false — verify in execute).
        // Fallback: invoke a Rust command "drop_files_to_paths" that resolves.
        openImportDialog(files);
    }
}
```

**NOTE for executor:** When `dragDropEnabled: false`, WebKit gives `File` objects but NOT filesystem paths (security model). Phase 2 needs the **path** to write into `_source/`. Two recovery paths:

1. **Read file via FileReader API** → pass bytes to `invoke("write_to_vault", {path, bytes, ...})` — works but copies bytes through JS.
2. **Use Tauri's `onDragDropEvent` API on the webview** (Tauri 2 exposes drag/drop events on the webview window via `getCurrentWebviewWindow().onDragDropEvent(handler)` — handler receives the file PATHS, not File objects). This requires `dragDropEnabled: true`. Conflict with Pattern 6 above.

**Resolution:** Use Tauri's `onDragDropEvent` (option 2) with `dragDropEnabled: true` — get paths directly. The DOM `dataTransfer.types` discrimination then happens by listening to Tauri's `onDragEnter` and inspecting the payload (which carries file paths — if non-empty, it's a file drag; otherwise text). Reconfirm during plan-phase via Tauri 2 docs check; this is a non-trivial detail and the WRONG choice forces a re-architecture mid-execute.

**Plan-phase action item:** Spike-check Tauri 2 `onDragDropEvent` payload shape and confirm discrimination works for D-09 before locking implementation pattern.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri 1 `fileDropEnabled` | Tauri 2 `dragDropEnabled` | Tauri 2.0 (2024-10) | Renamed; intent unchanged. [CITED: https://github.com/tauri-apps/tauri/issues/14373] |
| rusqlite default journal_mode | WAL mode + busy_timeout | SQLite 3.7.0 (2010) | Industry standard for desktop apps; readers + one writer concurrent. [CITED: https://sqlite.org/wal.html] |
| Cancel via `Arc<AtomicBool>` flag | `tokio_util::sync::CancellationToken` | tokio-util 0.7 (active) | Token integrates with `select!` for cooperative cancellation without busy-polling. |
| Hand-rolled YAML parser | `gray-matter` 4.x | gray-matter 4.0 (~2020) | Battle-tested across static-site ecosystem. |
| SvelteKit dynamic route + adapter-static | `entries()` export for prerender | SvelteKit 2 stable | Resolves static-export dynamic-route ceremony. |

**Deprecated/outdated:**

- `fileDropEnabled` (Tauri 1 name) → use `dragDropEnabled` (Tauri 2).
- `Connection::with_flags(OPEN_READ_WRITE | OPEN_CREATE)` then manual WAL pragma → simpler `Connection::open()` + WAL pragma in one init function.
- macOS `~/Library/Application Support/<App>/` config dir → user explicitly chose `~/.mneme/` (D-20) for discoverability.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | tokio-util CancellationToken is not yet in Cargo.lock and needs adding as a new dep. | Standard Stack | Low — verify via `grep tokio-util src-tauri/Cargo.lock`. If already pulled transitively, no new dep entry needed. |
| A2 | `walkdir` crate is NOT in Cargo.lock; vanilla `fs::read_dir` recursion suffices for Phase 2 vault (≤100 files). | Don't Hand-Roll | Low — performance is fine for the target size; only matters at v1.x DR2 escalation. |
| A3 | `uuid` crate may already be transitive via Tauri dependencies. Need verification before adding as direct dep. | Common Pitfalls | Low — fallback: use `rand` + base36 string, also likely transitive. |
| A4 | macOS APFS `rename(2)` is atomic for normal operation (kernel-panic recovery requires fsync of parent dir which is acceptable v1 cost). | Standard Stack, Pitfall 3 | Medium — for `~/.mneme/onboarding-state.json` and config.json, atomicity is enough. If a future user reports torn state, add parent-dir fsync. [CITED: weirdnet.nl/apple/rename + Wikipedia rename(2)] |
| A5 | Tauri 2 `onDragDropEvent` provides filesystem paths directly when `dragDropEnabled: true`. | Code Examples NOTE | HIGH — gates entire D-09 implementation pattern. **Plan-phase spike required.** If wrong, fallback: bytes-through-JS path. |
| A6 | `gray-matter` is browser-safe via its CommonJS + ESM exports (js-yaml is bundled and works in WebKit). | Standard Stack | Low — Vite handles ESM. Verify at execute-time via `npm run check` after first import. |
| A7 | rusqlite `bundled` feature compiles SQLite with statement-count default; phase 2 vault is small enough no tuning needed. | Pattern 4 | Low — `wal_autocheckpoint 1000` is the standard tuning; covered. |
| A8 | macOS BSD `chmod` behaves identically to POSIX `chmod` for `0o444` mode bits. | SPEC L49 + D-07 | Low — verified via Phase 1 LEARNINGS (Phase 0 noted BSD sed quirk; chmod has no BSD-specific quirk). |
| A9 | Plan-phase will add the `Drop` guard for cancellation-safety per Pitfall 12. | Common Pitfalls | Low — explicit task in plan. |
| A10 | Phase 2 onboarding step 2 reads `~/.claude/` sentinel via filesystem-only ops (no network). | SPEC L121 (KP-01 lock) | Low — verified by SPEC constraint; planner must implement via `fs::metadata(home/.claude/.credentials.json)` or equivalent. |

**Assumptions tagged HIGH:** A5 only. Plan-phase MUST spike-check Tauri 2 `onDragDropEvent` shape with `dragDropEnabled: true/false` discrimination before locking the import flow. If A5 fails, all D-09 + drop-zone tasks have to reroute through FileReader bytes-through-JS path (more work, but tractable).

---

## Open Questions (RESOLVED — 2026-05-16 spike completed; see 02-SPIKE-dragdrop.md Errata)

1. **Tauri 2 onDragDropEvent file path delivery — `dragDropEnabled` true vs false**
   - What we know: `dragDropEnabled: false` enables DOM `dragenter`/`drop` events; WebKit File objects don't carry filesystem paths in browser environment.
   - What's unclear: Whether Tauri 2's `onDragDropEvent` (Rust- or JS-side) reliably delivers OS file paths when `dragDropEnabled: true`, AND whether the dataTransfer.types discrimination in D-09 still works in that mode (via Tauri-provided event payload metadata).
   - Recommendation: First task in execute-phase = 5-line spike. Drag-and-drop a file with each config, log what comes through. Lock the chosen approach as the first ratification commit. **A5 is the gating assumption.**

2. **gray-matter Rust-side counterpart vs JS-only frontmatter**
   - What we know: gray-matter is npm. Phase 2 needs INDEX.md frontmatter at write time (course creation, from Rust).
   - What's unclear: Whether to (a) generate INDEX.md frontmatter by hand in Rust (current Code Example #2 approach — fine for fixed 2-field shape), or (b) call into a Rust YAML crate (`serde_yaml` or `yaml-rust`) for symmetry with future-Phase 3 concept-page frontmatter (which gets more complex with FSRS state).
   - Recommendation: (a) for Phase 2 — INDEX.md is a fixed 2-field shape, hand-rolled YAML is safe. Defer (b) decision until Phase 3 when concept-page frontmatter lands.

3. **uuid vs rand for operation_id**
   - What we know: import controller needs unique operation IDs.
   - What's unclear: Whether uuid crate is already transitive (likely yes via tauri or one of its deps).
   - Recommendation: `cargo tree | grep uuid` during plan-phase. If present, use it. Otherwise, ~10 lines of `rand::Rng::sample_iter` over base36 is sufficient.

4. **Course code validation tightness**
   - What we know: USYD pattern `^[A-Z]{4}\d{4}$` covers COMP3221, MATH1062, INFO1110, STAT1003, etc.
   - What's unclear: Are there USYD codes that violate this pattern (e.g., research methodology / interdisciplinary courses with letters in digit positions)?
   - Recommendation: Lock `^[A-Z]{4}\d{4}$` per D-Claude's-discretion item. If user encounters a non-matching course (rare), they can rename / add via `mv` in Finder, or future Phase 3 settings adds rename flow. Don't over-engineer the regex; v1.x can relax if needed.

5. **Reconciliation scan: parallel or sequential?**
   - What we know: Vault is ≤100 files (Phase 2 target); reconciliation must complete in ≤200ms per SPEC L65.
   - What's unclear: Whether to fan out parallel `fs::metadata` reads via `tokio::join_all` or stay sequential.
   - Recommendation: Sequential is simpler and well within budget for ≤100 files. If dogfood measures > 500 files / > 1000ms (D-14 escalation trigger), revisit with parallelism + DR2 background mode.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| macOS Ventura 13.4 Intel | All Phase 2 (POSIX chmod, NSOpenPanel, APFS rename) | ✓ | 13.4 (CLAUDE.md L4) | — |
| Node ≥22 | `prebuild` script (capability codegen) + npm install | ✓ | per `package.json` L14 + Phase 1 | — |
| Rust 1.88 | `cargo build` | ✓ | per `rust-toolchain.toml` (Phase 1 lock) | — |
| Tauri CLI 2 | `npm run tauri dev` + `cargo tauri` | ✓ | per `package.json` (Phase 1) | — |
| `claude` CLI | Onboarding step 2 sentinel-file read (not actually executes) | ✓ | per Phase 1 | None — onboarding step 2 explicitly does filesystem read only, no subprocess. |
| macOS `screencapture` / `lsof` / `tee` | dev-feedback-loop (Phase 01.1) | ✓ | OS-bundled | — |
| SQLite | rusqlite `bundled` feature (compiles in) | ✓ | bundled by feature | — (rusqlite ships its own SQLite). |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None (Phase 2 has no external service / model / external CLI dependencies — purely local-system).

**Verification:**

```bash
# Already verified through Phase 1 ship — Phase 2 inherits Phase 1's env.
sw_vers -productVersion   # 13.4 ≥ Ventura
node --version            # ≥ v22
rustc --version           # 1.88
which claude              # /usr/local/bin/claude or ~/.local/bin/claude
ls ~/.claude/.credentials.json  # present (Phase 1 user uses claude CLI for chat)
```

No new env dependency introduced by Phase 2.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (JS/TS) | Vitest 4.1.x (Phase 1 + Phase 01.1) |
| Framework (Rust) | `cargo test` (built-in) |
| Config files | `vitest.config.ts`, `src-tauri/Cargo.toml [dev-dependencies]` |
| Quick run command (JS) | `npx vitest run --changed` (Husky pre-commit) |
| Quick run command (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Full suite command | `npm test && cargo test --manifest-path src-tauri/Cargo.toml` |
| E2E framework | None installed — visual verification via dev-feedback-loop (`gsd-dev-snapshot.mjs` + Tauri shell screenshot). |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-06 (vault scaffold) | `create_vault_scaffold` creates 4 top-level dirs idempotently | unit (Rust) | `cargo test --test vault_scaffold` | ❌ Wave 0 — `src-tauri/tests/vault_scaffold.rs` |
| REQ-06 (course scaffold) | `create_course(COMP3221)` creates 4 subdirs + INDEX.md with YAML frontmatter; re-add does not overwrite INDEX.md | unit (Rust) + integration (Vitest gray-matter parse) | `cargo test --test course_scaffold && npx vitest run tests/gray-matter.test.ts` | ❌ Wave 0 — `src-tauri/tests/course_scaffold.rs` + `tests/gray-matter.test.ts` |
| REQ-03 (_source/ guard — WriteContext::User reject) | `write_to_vault("…/_source/x", _, WriteContext::User) == Err(WriteToSourceForbidden)` | unit (Rust) | `cargo test --test vault_writer_user_rejects` | ❌ Wave 0 — `src-tauri/tests/vault_writer_user_rejects.rs` |
| REQ-03 (_source/ guard — WriteContext::Import accept) | `write_to_vault("…/_source/x", b"…", WriteContext::Import(import_handle())) == Ok` and file appears on disk | unit (Rust) | `cargo test --test vault_writer_import_writes` | ❌ Wave 0 |
| REQ-03 (chmod 0o444) | After import, `stat(file).mode() & 0o777 == 0o444`; `fs::write` on the file with `User` ctx returns `Err(io::ErrorKind::PermissionDenied)` | unit (Rust) | `cargo test --test chmod_lock_enforced` | ❌ Wave 0 |
| REQ-03 (re-import 644→write→444 cycle) | Re-import via `with_temporary_writable_permission` correctly rewrites bytes + relocks chmod 0o444 | unit (Rust) | `cargo test --test chmod_three_step_cycle` | ❌ Wave 0 |
| REQ-03 (cancellation-safety Drop guard) | Cancel mid-cycle leaves file at 0o444 OR 0o644 + returns Err (cleanup runs) | unit (Rust) | `cargo test --test chmod_cancellation_safety` | ❌ Wave 0 |
| REQ-03 (canonicalize prevents `..` traversal) | `write_to_vault("courses/COMP3221/_source/../notes/x", _, User) == Err(WriteToSourceForbidden OR rejected)` | unit (Rust) | `cargo test --test path_traversal_blocked` | ❌ Wave 0 |
| REQ-05 (drag-drop opens dialog) | drag-and-drop with `types.includes("Files")` opens DropzoneOverlay; drop emits files into ImportDialog | manual (visual snapshot via gsd-dev-snapshot) | manual: drag a file onto running app + capture DOM snapshot | n/a manual |
| REQ-06 (Cmd+I native picker) | Cmd+I opens native macOS file picker; selecting N files passes them to import flow | manual | manual: press Cmd+I in running app | n/a manual — **v1.x deferred per Phase 02.1 D-06**; the file picker itself ships in v1 via the import dialog button, only the Cmd+I keyboard shortcut is retracted from the v1 spec contract |
| REQ-07 (folder batch single-level) | folder pick with 10 files (1 nested folder of 5 files) imports 10 files; nested folder skipped with per-file note | integration (Rust) | `cargo test --test folder_batch_one_level` | ❌ Wave 0 |
| REQ-07 (SQLite index after import) | After importing 5 files, `SELECT count(*) FROM vault_files == 5`; index DB < 1MB | integration (Rust) | `cargo test --test vault_index_count` | ❌ Wave 0 |
| REQ-07 (lazy delete reconciliation) | Delete file from disk + relaunch → reconcile_vault_index removes the row | integration (Rust) | `cargo test --test reconcile_lazy_delete` | ❌ Wave 0 |
| REQ-08 (onboarding 6 steps) | Launching with `~/.mneme/onboarding-state.json` absent shows step 1; killing at step 4 + relaunching opens at step 4 with state preserved | integration (Vitest jsdom + Rust IPC mock) | `npx vitest run tests/onboarding-resume.test.ts` | ❌ Wave 0 |
| REQ-08 (onboarding finish) | Reaching step 6 Finish sets `completed_at` ISO; subsequent launches do NOT show wizard | unit (Rust onboarding.rs) + integration | `cargo test --test onboarding_complete && npx vitest run tests/onboarding-finish.test.ts` | ❌ Wave 0 |
| REQ-09 (import status pill) | Importing 3 files shows `importing 3 files…` pill state in `import-state.svelte.ts`; on done shows `imported 3 files · just now` | integration (Vitest) | `npx vitest run tests/import-status-pill.test.ts` | ❌ Wave 0 |
| REQ-09 (per-file failure surface) | Forcing one write to fail (mock vault path) → `2 / 3 imported · 1 error` with per-file message in recent-20 | integration (Vitest) | `npx vitest run tests/import-state-singleton.test.ts tests/import-error-classifier.test.ts` | ❌ Wave 0 |
| REQ-10 (settings Cmd+,) | Cmd+, opens SettingsPanel within 100ms | manual visual + Vitest unit on shortcut hook | manual + `npx vitest run tests/cmd-comma-shortcut.test.ts` | ❌ Wave 0 — **manual verification v1.x deferred per Phase 02.1 D-06** (the unit test stays green and gates regressions; the manual-verification row no longer gates v1 ship) |
| REQ-10 (8 categories click without error) | Click through all 8 rails categories; no error thrown | integration (jsdom) | `npx vitest run tests/settings-categories.test.ts` | ❌ Wave 0 |
| REQ-11 (vault move safe-copy) | 10 files in vault; Move to `/tmp/test-vault` produces identical tree; old vault preserved; index rebuilds with new paths; title bar updates | integration (Rust + Vitest) | `cargo test --test vault_move_safe_copy && npx vitest run tests/vault-move-flow.test.ts` | ❌ Wave 0 |
| REQ-11 (interrupt mid-copy preserves old vault) | Kill app during copy → old vault unchanged | unit (Rust) | `cargo test --test vault_move_interrupt` | ❌ Wave 0 |
| Capability audit | `audit-capabilities.sh` passes; no `args: true` wildcard added | gate | `bash scripts/audit-capabilities.sh` (already wired to Husky) | ✅ existing |
| `_source/` write-through-WriteContext::User in JS bypass attempt | Frontend invoke `write_to_vault(..._source/..., User)` returns error string | integration (Tauri test runner OR mock invoke) | `cargo test --test ipc_user_rejects` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --changed` (Husky pre-commit auto) + `cargo test --manifest-path src-tauri/Cargo.toml` (manual for Rust changes).
- **Per wave merge:** `npm test && cargo test --manifest-path src-tauri/Cargo.toml` (full suite green).
- **Phase gate:** Full suite green + `bash scripts/audit-capabilities.sh` clean + manual visual verification via `gsd-dev-snapshot` for each of the 7 net-new surfaces before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src-tauri/tests/vault_scaffold.rs` — covers REQ-06 vault root scaffold
- [ ] `src-tauri/tests/course_scaffold.rs` — covers REQ-06 course folder + idempotency
- [ ] `src-tauri/tests/vault_writer_user_rejects.rs` — covers REQ-03 User context guard
- [ ] `src-tauri/tests/vault_writer_import_writes.rs` — covers REQ-03 Import context succeeds
- [ ] `src-tauri/tests/chmod_lock_enforced.rs` — covers REQ-03 chmod 0o444 lock + permission-denied on subsequent write
- [ ] `src-tauri/tests/chmod_three_step_cycle.rs` — covers REQ-03 re-import cycle
- [ ] `src-tauri/tests/chmod_cancellation_safety.rs` — covers Pitfall 12 Drop guard
- [ ] `src-tauri/tests/path_traversal_blocked.rs` — covers Pitfall 2 + Threat Model T1
- [ ] `src-tauri/tests/folder_batch_one_level.rs` — covers REQ-07 folder batch + nested skip
- [ ] `src-tauri/tests/vault_index_count.rs` — covers REQ-07 SQLite index correctness
- [ ] `src-tauri/tests/reconcile_lazy_delete.rs` — covers REQ-07 reconciliation lazy delete
- [ ] `src-tauri/tests/onboarding_complete.rs` — covers REQ-08 Finish step
- [ ] `src-tauri/tests/vault_move_safe_copy.rs` — covers REQ-11 safe-copy
- [ ] `src-tauri/tests/vault_move_interrupt.rs` — covers REQ-11 interrupt preserves old
- [ ] `src-tauri/tests/ipc_user_rejects.rs` — covers IPC-level guard test
- [ ] `tests/gray-matter.test.ts` — covers gray-matter parse/stringify round-trip
- [ ] `tests/onboarding-resume.test.ts` — covers REQ-08 resume flow
- [ ] `tests/onboarding-finish.test.ts` — covers REQ-08 completion + skip-on-relaunch
- [ ] `tests/import-status-pill.test.ts` — covers REQ-09 pill state derivation
- [ ] `tests/import-state-singleton.test.ts` — covers REQ-13 reactive singleton + per-file failure recordHistory (06 wave 1)
- [ ] `tests/import-error-classifier.test.ts` — covers REQ-09 per-file error surface via PermissionDenied catch path (11 wave 8)
- [ ] `tests/cmd-comma-shortcut.test.ts` — covers REQ-10 Cmd+, opens SettingsPanel
- [ ] `tests/settings-categories.test.ts` — covers REQ-10 click-through 8 categories
- [ ] `tests/vault-move-flow.test.ts` — covers REQ-11 UI flow
- [ ] `tests/datatransfer-types-discrimination.test.ts` — covers D-09 Files vs text/plain gate logic (jsdom mock DataTransfer)

*(Existing test infrastructure: Vitest + jsdom + `tests/conftest.py` not applicable — JS tests use Vitest fixtures; Rust tests use `tempfile`. Phase 1 patterns are reused.)*

> **Phase 02.1 W7 deferral note (2026-05-17):** keymap manual-verifications (Cmd+, Cmd+I) are deferred to v1.x scope per D-06. Implementation tests (`cmd-comma-shortcut.test.ts`, `menu-bridge.test.ts`, `menu_preferences_emits_event.rs`) remain green and guard against silent regression; the SPEC no longer guarantees v1 contract. See `02-UI-SPEC.md` §8.0 Keymap Status for the authoritative status table. Dogfood-cost captured 2026-05-17: missing Cmd+R forces full app restart to re-trigger Step 2 probe — this is the concrete pain point that motivates v1.x re-introduction with reload prioritized first. <!-- v1.x deferred per Phase 02.1 D-06 -->

---

## Threat Model

> Required when `security_enforcement` is enabled. Phase 2 has multiple security-sensitive surfaces; ASVS L1 default + block on HIGH.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | mneme single-user, no auth surface in Phase 2 |
| V3 Session Management | no | Phase 1's session registry exists; Phase 2 doesn't extend |
| V4 Access Control | **yes** | `vault_writer.rs` enum guard + chmod 0o444 enforcement |
| V5 Input Validation | **yes** | Course code regex + vault path canonicalization + IPC argv validators |
| V6 Cryptography | no | No crypto introduced in Phase 2 |
| V12 File and Resources | **yes** | Path traversal, symlinks, file permissions, atomic write |

### STRIDE Threat Entries

| Threat | STRIDE | Severity | Surface | Mitigation Plan |
|--------|--------|----------|---------|-----------------|
| **T1 Path traversal via `..` in vault path** | Tampering | **HIGH** | `write_to_vault(path, _, WriteContext::User)` called with `courses/X/_source/../notes/file.md` | `path.parent().canonicalize()? .join(file_name)` BEFORE prefix check (Pitfall 2). Unit test in `path_traversal_blocked.rs`. |
| **T2 Symbolic link followed into `_source/`** | Tampering | **HIGH** | User creates a symlink inside `notes/` pointing into `_source/`; later writes via WriteContext::User dereference the symlink. | `canonicalize` resolves symlinks → the canonical path lands under `_source/` → guard rejects. Verified by adding a symlink-cases unit test. |
| **T3 TOCTOU between chmod 644 (re-import unlock) and final chmod 444** | Tampering | **MEDIUM** | An attacker process intercepts the moment between unlock and relock and writes garbage. | Single-user single-app machine → improbable. Document gap. Drop guard ensures relock-on-cancel (Pitfall 12). Future v1.x: use `O_EXCL` + `umask 0o222` for born-readonly. |
| **T4 Atomic-write failure leaving partial `.tmp` files in `~/.mneme/`** | Repudiation | LOW | Process killed mid-write of config.json.tmp; next read fails | `load_*` functions handle `NotFound` gracefully; `.tmp` cleanup on next save (write-overwrites-tmp). Phase 2 startup checks for and removes stale `.tmp` siblings. |
| **T5 Untrusted DataTransfer content during drag** | Tampering | LOW | Malicious page (in some hypothetical universe) drags a JavaScript URL → app interprets as file | D-09 `types.includes("Files")` gate. Even on positive, vault_writer guards path. mneme is single-user app — no cross-origin attack surface. |
| **T6 IPC arg injection (filename with shell metachars)** | Tampering | **MEDIUM** | User imports a file named `; rm -rf /` | All filesystem ops use `Path` + `OsString` (NOT shell-interpolated). No shell `Command` invocations on user content. Capability validator regexes restrict argv to known shapes per D-19. |
| **T7 SQL injection via course code in vault_index queries** | Tampering | **MEDIUM** | User enters course code `'); DROP TABLE vault_files; --` | rusqlite `params![]` macro forces parameterized queries throughout. Code review: grep `format!("SELECT.*{")` to catch any string-interpolated SQL. |
| **T8 Reading `~/.claude/` sentinel exfiltrates auth artifacts** | Information Disclosure | LOW | Onboarding step 2 reads `~/.claude/.credentials.json` | SPEC L121 + KP-01: read-only sentinel check (existence + version parse, NOT credential read). Implementation: check existence of `~/.claude/` directory + parse version from a non-secret file (e.g., `~/.claude/CHANGELOG.md`-style). Verify NO bytes from credentials.json leave Rust process. |
| **T9 Vault Move copy creates partial state if interrupted** | Repudiation | LOW (by design) | Kill app mid-Move → new location has subset, old location has full set | SPEC L84 acceptance + D-04: always-copy semantics; if interrupted, old vault is unmodified. New vault is incomplete but user is told to manually delete in Finder. Acceptable v1 behavior. |
| **T10 SQLite vault-index.db tampering** | Tampering | LOW | User manually edits vault-index.db | Reconciliation on next launch rebuilds index from disk reality (D-14). Index is an optimization, not a source of truth. Filesystem is the SSOT. |
| **T11 chmod 0o444 leaves stale data discoverable** | Information Disclosure | LOW | Re-import overwrites bytes but unrelated process retained file descriptor with previous bytes | macOS POSIX FD semantics: rewrite to `_source/foo.pdf` does NOT affect a held FD; that FD still points to the prior inode. For single-user single-app this is not a concern (no other process holds FDs to vault). |
| **T12 Onboarding mid-typing race condition** | Tampering | LOW | User types a malicious vault path → step-boundary save on Next fires after path validation | D-03 explicit: state persistence happens ONLY on Next-click after validation passes. Mid-flight typing not persisted. No exploit window. |

### Known Threat Patterns for Tauri 2 + macOS Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tauri 2 capability wildcard expansion (`args: true`) | Tampering | Pre-commit `audit-capabilities.sh` blocks. Phase 2 D-19 reaffirms. |
| Tauri WebKit XSS via untrusted HTML | Tampering | DOMPurify + KaTeX hardening (Phase 1). Phase 2 doesn't add new HTML render sites; INDEX.md content rendered via existing markdown pipeline. |
| macOS WKWebView credential exfiltration | Information Disclosure | No external HTTP in Phase 2; CSP `connect-src 'self' ws: http://localhost:*` (Phase 1) is dev-only. |
| Rust unsafe pointer (objc2 ns_window) | Tampering | Phase 01.1's dev.rs documented `SAFETY:` comment pattern; Phase 2 introduces no new `unsafe`. |
| File descriptor leak (Phase 1 lesson) | Denial of Service | Tokio's `File` drops + `sync_all` ensure fd closure. Phase 2 uses idiomatic `{ let f = File::create()?; ... }` blocks. |

**Block-on-HIGH gate:** T1 (path traversal) and T2 (symlink) MUST have unit tests + the canonicalize-parent helper in `vault_writer.rs` BEFORE plan-phase finishes. Plan-checker convergence (`/gsd-plan-review-convergence 2 --codex`) recommended.

---

## Frontend-Implementer Reusables (Phase 1 patterns Phase 2 inherits)

The Phase 1 codebase already shipped patterns Phase 2 should reuse verbatim rather than re-deriving:

| Phase 1 Asset | How Phase 2 Reuses |
|---------------|--------------------|
| **`src/lib/connection-state.svelte.ts`** | Template for `import-state.svelte.ts` + `vault-state.svelte.ts` — module-scope `$state` reactive singletons with `.svelte.ts` suffix (mandatory for Svelte 5 runes outside components). |
| **`src/lib/styles/tokens.css`** | All new components consume via `var(--*)`. NEW addition: `--color-success: #4ea36b` per UI-SPEC §4 planner note. |
| **`src/lib/components/SettingsModal.svelte`** | RETIRED; replaced by `SettingsPanel.svelte`. Keep the `<dialog>` host pattern OR migrate to manual `<div role="dialog" aria-modal="true">` overlay per UI-SPEC §8.2 (8-cat layout exceeds modal-native ergonomics; UI-SPEC chose div-overlay). |
| **`src/lib/components/TitlebarMeta.svelte`** | MODIFIED: remove hardcoded `~/Mneme/usyd-2026s1` (line 27); read from `vault-state.svelte.ts`. Insert `ImportStatusPill` between connection-status and vault-path per UI-SPEC §8.8. Replace settings-cog opening Modal with opening Panel. |
| **`src/lib/components/Splitter.svelte`** | UNCHANGED — pointer-capture drag + localStorage persistence (`mneme.layout.split`). Phase 2 uses the same `mneme.<area>.<field>` localStorage namespace convention if it adds any new persisted UI state (e.g., settings-panel last-active-category could be `mneme.settings.activeCategory`). |
| **Phase 1 `<dialog>` pattern in SettingsModal** | Pattern reusable for ImportDialog (small 480px modal — D-12 centered, fits modal-native). Per UI-SPEC §8.3, ImportDialog uses `<div role="dialog">` overlay; if planner reverses to `<dialog>` element, ensure Esc and Tab trapping. |
| **Phase 1 `src-tauri/src/session.rs` registry** | Template for `import_controller.rs` registry: `HashMap<OperationId, ImportOperation>` behind `Mutex` so concurrent imports (rare in Phase 2; common in v1.x) don't collide. |
| **Phase 1 `kill_pgid` close-requested handler** | Phase 2 EXTENDS the close-requested handler in `lib.rs` to: (a) cancel all in-flight import tokio tasks via `CancellationToken`; (b) commit pending vault-index transactions; (c) THEN call Phase 1 `kill_pgid` for claude session. Order matters. |
| **Phase 1 `scripts/audit-capabilities.sh`** | Phase 2 keeps as the pre-commit gate for new IPC commands (D-19). Audit logic continues to check no `args: true` wildcard / no `*` shell scope. |
| **Phase 1 `src/lib/spawn-args.shared.ts` browser-safety pattern** | Phase 2 doesn't add new spawn-args, BUT if any new path-resolution helper needs to live in both Vitest + Rust (e.g., the course-code validation regex), follow the same `.shared.ts` split + audit-script enforcement. |
| **Phase 1 `tauri.conf.json`** | MODIFIED: add `"dragDropEnabled": false` to main window (Pattern 6 above), OR keep `true` and use Tauri's `onDragDropEvent` directly per Open Question 1 resolution. |
| **Phase 1 `src/routes/+layout.svelte`** | MODIFIED: add app-startup branch that calls Rust IPC `load_onboarding_state` + `load_config`; conditionally redirects to `/onboarding/<step>` if onboarding not completed. |
| **Phase 1 dev-feedback-loop verify.* SDK handlers** | Phase 2 verify-work re-uses these. Each new surface (onboarding, settings, import-dialog, dropzone-overlay, status-pill, history-modal, reconciliation-overlay) gets a `gsd-dev-snapshot` capture for visual diff against Mneme 3 bundle HTML. |
| **Phase 0 LEARNINGS — BSD sed `-i ''`** | Phase 2 doesn't shell-out to macOS CLIs; pattern only relevant if planner adds a shell script. |
| **Phase 0 + 1 atomic write pattern** | Phase 2 uses for `config.json` + `onboarding-state.json` writes. Pattern documented at `src-tauri/src/dev.rs` rotation logic. |

---

## TDD Candidates

Per the active TDD planning run, here is the explicit table of which modules / logic deserves `type: tdd` vs `type: execute` in the plan-phase task definition:

| Module / Logic | Type | Rationale |
|----------------|------|-----------|
| `vault_writer.rs` enum + path guard + canonicalize | **TDD** | State machine + filesystem invariant; behavior is directly testable; security-critical (T1, T2 mitigation). |
| `vault_writer.rs` chmod 644→write→sync→444 three-step | **TDD** | State-machine invariant; failure modes (mid-rewrite cancel — Pitfall 12) require explicit test cases. |
| `vault_writer.rs` `with_temporary_writable_permission` helper + Drop guard | **TDD** | Cancellation safety; one of the highest-risk surfaces in Phase 2. |
| `vault_writer.rs` `create_vault_scaffold` + `create_course` (idempotency) | **TDD** | SPEC acceptance: re-add must not error + not overwrite INDEX.md. |
| `import_controller.rs` task spawning + progress event emission | **TDD** | Sequencing matters (per-file event order); cancellation semantics; partial-batch state. |
| `import_controller.rs` registry CRUD | **TDD** | HashMap state + Mutex; concurrent op insertion. |
| `vault_index.rs` schema init + WAL pragma | **TDD** | DB schema is contract for Phase 3 Cmd+P consumption; pragma application verifiable via `PRAGMA query`. |
| `vault_index.rs` insert / delete / query | **TDD** | CRUD invariants + SQL parametrization (T7 mitigation). |
| `vault_index.rs` reconciliation scan | **TDD** | Algorithm: walk fs → diff against DB → insert new + delete missing. Multi-step + state-changing. |
| `onboarding.rs` load/save with atomic temp+rename | **TDD** | Atomic-write invariant; resume-from-incomplete-state is SPEC acceptance. |
| `onboarding.rs` `complete()` setting `completed_at` | **TDD** | One-shot transition; subsequent launches must skip wizard. |
| `config.rs` load/save | **TDD** | Same shape as onboarding; trivial but security-relevant (path injection T6). |
| `lib.rs` close-requested handler extension (drain imports + commit index + kill_pgid) | **TDD** | Ordering matters; failure to drain leaves zombies. Phase 1 already TDD'd kill_pgid; Phase 2 extends. |
| Course-code regex validator (`^[A-Z]{4}\d{4}$`) | **TDD** | Pure function; easy to add cases (MATH1062 / INFO1110 / STAT1003 + invalid samples). |
| **UI components (any Svelte component)** | **execute** | Visual SSOT-driven; tested via visual snapshot diff against Mneme 3 bundle. TDD adds friction without proportional invariant catch. Components ARE invoked by integration tests where state-derivation matters. |
| **`+layout.svelte` onboarding redirect logic** | **execute** | Single conditional; verify via Vitest snapshot + manual visual. |
| **`+page.svelte` drag listener mount** | **execute** | Event wiring; verify via manual drag-drop + the `DataTransfer.types` discrimination Vitest test below. |
| `import-state.svelte.ts` state derivation (pill text from operation state) | **TDD** | Pure derivation function; many cases (importing / imported-just-now / imported-Nm-ago / imported-Nh-ago / error / cancelled / idle). |
| `vault-state.svelte.ts` (vault path + course list cache) | **execute** | Trivial reactive container; tested via integration. |
| DropzoneOverlay show/hide counter logic | **TDD** | Counter approach (Pitfall 9); jsdom can mock DataTransfer + dispatch dragenter/dragleave sequences. |
| Duplicate resolution dialog state (single vs batch + Apply-to-all checkbox) | **execute** | UI state mostly; integration test covers full happy path. |
| Settings panel category routing | **execute** | Switching active category; visual-driven. |

**TDD wave structure suggestion (for plan-phase task ordering):**

- **Wave 0** — Add `--color-success` to tokens.css; add gray-matter + rusqlite + dialog plugin deps; write failing Rust tests for vault_writer enum + path guard.
- **Wave 1** — Implement `vault_writer.rs` (TDD: enum, path guard, scaffold, course, chmod helper). Block-on-HIGH security tests (T1, T2) must pass.
- **Wave 2** — Implement `config.rs` + `onboarding.rs` (TDD: load/save atomic temp+rename + `completed_at` transition).
- **Wave 3** — Implement `vault_index.rs` (TDD: schema, WAL pragma, CRUD, reconciliation).
- **Wave 4** — Implement `import_controller.rs` (TDD: task spawn, event emit, cancellation, registry).
- **Wave 5** — Extend `lib.rs` (TDD: register new commands, extend close-requested handler).
- **Wave 6** — Svelte UI: Onboarding shell + 6 step children (execute, visual-SSOT-driven).
- **Wave 7** — Svelte UI: SettingsPanel + 4 category children + Cmd+, shortcut (execute).
- **Wave 8** — Svelte UI: ImportDialog + DuplicateResolutionDialog + DropzoneOverlay + ReconciliationOverlay + ImportStatusPill + ImportHistoryModal (execute, with one TDD subtask for pill state derivation in `import-state.svelte.ts`).
- **Wave 9** — Modify `TitlebarMeta.svelte` + `+layout.svelte` + `+page.svelte` (execute).
- **Wave 10** — Capability `default.json` update + audit-capabilities passes + dependencies.md registry + interaction-paradigm.md Cmd+I row.
- **Wave 11** — Manual visual verification of all 7 new surfaces against Mneme 3 bundle screenshots; gsd-verify-work; phase wrap-up.

---

## Sources

### Primary (HIGH confidence)

- **02-SPEC.md** — 11 locked requirements, 18 acceptance checks, ambiguity 0.12. Phase boundary + REQ-01..REQ-11 + in-scope/out-of-scope + constraints + acceptance criteria.
- **02-CONTEXT.md** — 21 implementation decisions (D-01..D-21) + canonical refs + code context + deferred + blocking prerequisite (NOW satisfied).
- **02-UI-SPEC.md** — Visual + interaction contract for 7 net-new surfaces; revision 1 APPROVED 2026-05-15, 6/6 dimension PASS. Visual SSOT for ALL Phase 2 UI.
- **openspec/specs/vault-storage.md** — Vault directory contract (PARA + course-root, `_source/` write protection, `[[wiki-link]]` cross-course concept refs, INDEX.md auto-maintained).
- **openspec/specs/settings-ui.md** — 8-category panel + Cmd+, entry + 3 v1-functional + KD-13 visual lock.
- **`.planning/PROJECT.md`** — KP-01 local-first, KP-02 OSS thresholds, KP-04 ToS compliance, KP-08 dependency tracking, KP-09 + KD-13 visual aesthetic.
- **`.planning/dependencies.md`** — KP-08 OSS registry; gray-matter row at Group 1; rusqlite row at Group 4.
- **`.planning/threads/visual-design-system.md`** — UI design → impl workflow contract; Mneme 3 bundle locked 2026-05-15.
- **`.planning/threads/interaction-paradigm.md`** — mouse-first + Cmd+Q + Cmd+, exceptions; Cmd+I joins as 5th narrow exception per D-13.
- **`.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md`** — Phase 1 inherited patterns (D-01 Splitter, D-06 window chrome, D-10 PGID kill, D-14 spawn-args SSOT, D-22 KD-13 form isolation).
- **`.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-CONTEXT.md`** — D-TR-04 capability SSOT pattern + verify.* SDK handlers.
- **`.claude/skills/spike-findings-mneme/SKILL.md`** — Validated subprocess + UI patterns from Phase 0/1 spike experiments; auto-loaded during implementation.

### Secondary (MEDIUM confidence)

- **[Tauri 2 dialog plugin docs](https://v2.tauri.app/plugin/dialog/)** — verified: file picker + folder picker semantics + capability declaration patterns.
- **[Tauri issue #14373 — dragDropEnabled docs](https://github.com/tauri-apps/tauri/issues/14373)** — verified: `dragDropEnabled: true` (default) disables DOM drag-drop; `false` enables HTML5 events.
- **[SQLite WAL docs](https://sqlite.org/wal.html)** — verified: WAL mode + journal_mode + busy_timeout patterns.
- **[rusqlite GitHub README](https://github.com/rusqlite/rusqlite)** — verified: `bundled` feature for desktop apps avoids system SQLite ABI variance.
- **[gray-matter GitHub README](https://github.com/jonschlinkert/gray-matter)** — verified: `matter()` parse + `matter.stringify()` write + handling of empty frontmatter.
- **[POSIX rename(2) atomicity](https://en.wikipedia.org/wiki/Rename_(computing))** — verified: atomic from local-host POV; APFS preserves this.
- **[WebKit DataTransfer dragenter behavior](https://github.com/leonadler/drag-and-drop-across-browsers)** — verified: `.types` is populated on dragenter even though `.items` is not.
- **[SQLite WAL setup TIL by Simon Willison](https://til.simonwillison.net/sqlite/enabling-wal-mode)** — verified: pragma setup order + `synchronous=NORMAL` safety under WAL.

### Tertiary (LOW confidence — needs validation during execute)

- Tauri 2 `onDragDropEvent` payload shape with `dragDropEnabled: true` — **Plan-phase spike required (Open Question 1).**
- gray-matter browser bundle behavior with Vite — verify by running `npm run check` after first import.
- macOS `~/.claude/.credentials.json` actual schema vs onboarding step 2 sentinel read — verify by inspecting an active user's `~/.claude/` directory before locking the read pattern.

---

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — `gray-matter@4.0.3` + `rusqlite@0.39.0` + `@tauri-apps/plugin-dialog@2.7.1` all verified against npm registry + crates.io (2026-05-15); KP-08 thresholds (≥1k★, MIT, multi-maintainer, active release) confirmed.
- Architecture patterns: **HIGH** — D-01 through D-21 lock the WHAT/HOW; Phase 1 D-10 + D-22 patterns are direct prior-art reuse; SvelteKit `adapter-static` + Tauri 2 IPC + tokio is the validated Phase 1 stack.
- Pitfalls: **HIGH** — pitfalls 1-12 trace to either Phase 0/1 LEARNINGS (atomic write, BSD sed quirks, macOS-specific behavior) or verified web sources (Tauri 2 dragDropEnabled naming, WebKit dragenter quirks, rusqlite WAL semantics, POSIX rename atomicity).
- Threat model: **HIGH for T1/T2** (path traversal + symlink — directly testable + standard mitigation); **MEDIUM for T3/T6/T7** (TOCTOU + IPC injection + SQL injection — standard controls apply); **LOW for T4/T5/T8-T12** (low probability or by-design semantics).
- Validation architecture: **HIGH** — phase requirements all decompose into testable behaviors; Wave 0 gap list is complete; Vitest + cargo test infrastructure already shipped in Phase 1.
- TDD candidates: **HIGH** — Rust modules with state-machine + filesystem invariants are textbook TDD targets; UI components are visual-SSOT-driven not behavioral-spec-driven.
- Open Question 1 (onDragDropEvent shape): **MEDIUM** — Tauri 2 docs cover the API but execute-time verification is the only conclusive proof.

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (30 days for stable stack) — re-verify npm + crates.io versions if planner runs > 7 days later.

---

## RESEARCH COMPLETE
