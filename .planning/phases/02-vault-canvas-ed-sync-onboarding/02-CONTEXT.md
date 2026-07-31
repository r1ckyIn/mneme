# Phase 02: Vault + Manual Import + Onboarding - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning (with one prerequisite — see `<deferred_blocking>`)

<domain>
## Phase Boundary

mneme ships a local-first markdown vault at `~/StudyVault/`, a 6-step resumable first-run wizard, a manual file-import surface (drag-drop / Cmd+I file picker / single-level folder batch) that lands coursework into the course-scoped `_source/` directory, a rusqlite-backed file index that Phase 3 Cmd+P will consume, an always-visible import-status surface in the titlebar, and a fully-functional Settings panel reachable via Cmd+, that replaces the Phase 1 placeholder.

**Two layers of `_source/` write protection** are required: a `vault_writer.rs` Rust module discriminating `WriteContext::User` from `WriteContext::Import`, and POSIX `chmod 0o444` applied to every file the import flow lands. Both layers must be in place — the chmod layer alone leaves a TOCTOU gap, the writer-module layer alone leaves a runtime-bypass gap.

**Hard scope-narrowing relative to ROADMAP.md L146-158** (which still says "Canvas + Ed import + sync"): per the 2026-05-11 self-ecosystem decision (`.planning/todos/pending/2026-05-14-spec-external-import-self-ecosystem.md`), v1 has **zero external university API or MCP integration** (no Canvas, no Ed, no Echo360, no scheduled sync). UniBoard bridge is a separate later phase (UniBoard is the user's other project — same self-ecosystem). ROADMAP wording will be patched as part of phase wrap-up, not inside this phase.

**Cost-cap UsageMeter scope was explicitly removed** from REQ-14 by the 2026-05-15 SPEC because the user runs on Pro/Max Anthropic subscription (turn-throttled, not USD-metered). The Phase 1 UsageMeter contract (`Ctx % · Total Nk · Session Xh Ym`) stands; Phase 2 does NOT add a cost-cap kill switch.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**11 requirements are locked.** See `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPEC.md` for full requirements, boundaries, constraints, and acceptance criteria (18 pass/fail checks).

Downstream agents (researcher / planner / executor) MUST read `02-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**Requirement headlines** (full text in SPEC):
1. Vault scaffold on first launch (`_system/`, `_inbox/`, `courses/`, `shared/` 4 top-level dirs auto-created)
2. Course folder scaffold on demand (`courses/<CODE>/{_source/, notes/, concepts/, practice/}` + INDEX.md with YAML frontmatter; idempotent re-add)
3. `_source/` write protection — `vault_writer.rs` Rust module with `WriteContext::{User, Import}` enum (User rejects `_source/` writes)
4. `_source/` write protection — POSIX `chmod 0o444` after every byte flush; re-import follows chmod 644 → write → chmod 444
5. Manual import — drag-drop opens dialog with course-picker + category-picker (lectures/tutorials/assignments/announcements/_inbox)
6. Manual import — Cmd+I file picker + folder batch (single-level, nested skipped with per-file note)
7. Vault file index in `~/.mneme/vault-index.db` (rusqlite); startup reconciliation; lazy delete on missing files; <1MB after fresh install with one course
8. Onboarding wizard — 6 steps, resumable via `~/.mneme/onboarding-state.json`; `completed_at` set on Finish
9. Import status pill in TitlebarMeta; click-to-detail modal with most-recent-20 import operations + per-file failure messages
10. Settings panel reachable via Cmd+,; 8 categories in left rail; 3 v1-functional (Vault / Appearance light-only-toggle / Keybindings read-only display); other 5 render `(coming in Phase N)` empty body
11. Vault path move via safe-copy (NOT rename / mv) — recursive copy, file count + byte verify, index rebuild, old vault preserved for user to manually delete in Finder

**In scope (from SPEC.md L89-101):**
- Vault directory scaffolding (4 top-level + per-course sub-tree on demand)
- `vault_writer.rs` with `WriteContext::{User, Import}` discriminated path guard
- `chmod 0o444` on every `_source/` file
- Drag-drop + file picker + folder batch (one-level)
- Per-import course-and-category dialog
- SQLite vault file index (`vault_files` table only)
- Onboarding wizard (6 steps, resumable)
- Import status pill + most-recent-20 modal
- Settings panel (3 v1-functional categories of 8)
- Vault path move via safe copy
- YAML frontmatter via `gray-matter`

**Out of scope (from SPEC.md L102-117):**
- Canvas / Ed / Echo360 / any external university API or MCP (self-ecosystem lock)
- UniBoard bridge (later phase)
- PDF / Office → markdown conversion (Phase 4)
- Anchored citations (Phase 9)
- Cmd+P fuzzy palette (Phase 3 — this phase produces the index it consumes)
- Tiptap block editor (Phase 3)
- Multi-session sidebar (Phase 3)
- Cost cap kill switch (subscription model — explicitly removed)
- Per-course system prompts via `.mneme/rules/` (Phase 8)
- File-watch live updates (Phase 3+ — startup reconciliation only in v1)
- Theme toggle actual switching (light-only per KD-13; toggle exists but no-ops)
- Nested folder import (single-level only)
- Rename a course / vault delete-and-replace / soft-delete trash (all Phase 3+)

</spec_lock>

<decisions>
## Implementation Decisions

All decisions traced to the 2026-05-15 `/gsd-discuss-phase 2 --analyze` session. CONTEXT.md is the canonical record consumed by researcher/planner; DISCUSSION-LOG.md preserves alternatives considered.

### Onboarding wizard — implementation form (Area A)

- **D-01 Container = Full-screen SvelteKit route**: a new route `/onboarding/[step]` takes over the entire webview (the 36px overlay titlebar with macOS traffic lights stays visible — required for Cmd+Q drain path; everything below is wizard). Decision drivers: SPEC REQ-8 acceptance "main UI is NOT reachable until Finish" is implemented as physical isolation rather than dialog focus-trap + click-through prevention + esc-disable in a Tauri WebKit modal (three macOS WebKit edge cases avoided). On Finish, programmatic navigation to `/` swaps in the three-pane shell with full unmount of the wizard tree.
- **D-02 Component split = main shell + 6 step children**: `Onboarding.svelte` owns step routing + state + persistence. Six step children each ~80-150 LOC: `Step1Welcome.svelte`, `Step2AuthCheck.svelte`, `Step3VaultPicker.svelte`, `Step4MCPStatus.svelte`, `Step5AddCourse.svelte`, `Step6DemoImport.svelte`. Each step's visual treatment is independent (Welcome = hero / Auth = status check / Vault = path picker / MCP = read-only status / Add course = form / Demo import = drop zone) — single-file switch would create maintenance pressure.
- **D-03 State persistence = step-boundary Rust IPC + atomic temp+rename**: `Onboarding.svelte` calls Tauri command `save_onboarding_state(json)` only when the user clicks "Next" on a step (input mid-flight stays in-memory — partial typing is not persisted, eliminating "half-typed vault path that fails to load on resume" failure mode). Rust side writes to `~/.mneme/onboarding-state.json.tmp` then atomic `std::fs::rename` to the final path — no possibility of partial-write corruption on unclean exit. App startup reads the file via `load_onboarding_state()`, checks `completed_at`, and either redirects to `/onboarding/<current_step>` (resume) or to `/` (main UI).
- **D-04 Visual SSOT — split per region**: onboarding 6 steps require the user to first produce an HTML prototype in Claude Design Lab (per `.planning/threads/visual-design-system.md` workflow); planner/executor render pixel-faithful from the prototype. Settings panel + import dialog use existing `tokens.css` (KD-13) freehand without prior prototype — both are mature UI patterns (macOS Settings.app + Finder file-import dialog are decades-old reference points; freehand-then-iterate is acceptable risk). **Onboarding HTML prototype is a BLOCKING prerequisite for `/gsd-plan-phase 2`** — see `<deferred_blocking>` below.

### vault_writer.rs API shape + Import-token factory (Area C)

- **D-05 API shape = enum + private token + factory function (C1)**: `pub enum WriteContext { User, Import(ImportToken) }` where `ImportToken` is a private struct with `pub(crate)` fields (cannot be constructed outside `vault_writer.rs`). `vault_writer::import_handle() -> ImportToken` is the single factory function — by convention, only the import controller (`src-tauri/src/import_controller.rs`, new file Phase 2) calls it. Phase 4 document-ingestion will also call `vault_writer::import_handle()` from its converter pipeline (Marker output → `_source/<file>.md`); the factory is the single audited entry point for any future write-to-`_source/` capability addition. Single function `write_to_vault(path, bytes, ctx: WriteContext) -> Result<(), VaultWriterError>` is the only public writer surface.
- **D-06 Path guard runtime check**: `write_to_vault` checks `ctx`. On `WriteContext::User`, it computes `path.starts_with(<vault_root>/courses/<*>/_source/)` and rejects with `VaultWriterError::WriteToSourceForbidden`. The path-prefix check uses `<vault_root>` resolved from the current persisted vault path config (NOT a hardcoded constant — vault path is movable per REQ-11). User-facing path arrives as a `PathBuf`; the check is canonicalized (`std::fs::canonicalize`) before prefix comparison to prevent `..` traversal bypass.
- **D-07 chmod 0o444 sequence**: import flow — `write_bytes` → `file.sync_all()` → `std::fs::set_permissions(path, Permissions::from_mode(0o444))`. Re-import same path — `chmod 0o644` → `write_bytes` → `sync_all` → `chmod 0o444`. Three-step is wrapped in a `with_temporary_writable_permission(path, |writable| ...)` helper inside `vault_writer.rs` so the unlock+relock invariant is in one place (not scattered across import flow + future Phase 4 callers). Helper's failure path on the rewrite leaves the file at `0o644` and returns `Err` — caller decides whether to retry or escalate.
- **D-08 Re-import same-name UX = dialog three options + batch Apply-to-all (CR2)**: when import detects an existing file at the target path, dialog shows: (a) **Replace** — chmod 644 → write → chmod 444; (b) **Skip** — leave existing file untouched, do not write the incoming file; (c) **Rename** — auto-suffix incoming file with `-1` / `-2` / ... (macOS Finder convention; suffix increments until non-collision). For batch import (folder of N files with M duplicates), dialog shows the first duplicate with an "Apply to all M remaining duplicates" checkbox so the user does not face N consecutive dialogs.
  - **Implementation note (2026-05-16 — WARN-8 disposition)**: Phase 2 SPEC L132-150 acceptance criteria do NOT include duplicate-handling assertions. Plan 11 ships `DuplicateResolutionDialog.svelte` as a **forward-compatible visual shell** (the 3-button + Apply-to-all UX is authored against UI-SPEC §8.7) but Plan 05 `import_controller.rs` does **NOT** wire the backend `tokio::fs::try_exists` check + `import:duplicate-detected` event emit in Phase 2. The shell anchors the visual contract so Phase 3+ adds only the backend trigger + oneshot decision channel without re-architecting the dialog UI. **Phase 3+ will land**: (i) Plan-05-analog backend trigger; (ii) `import_duplicate_decision` IPC command; (iii) JS-side `listen("import:duplicate-detected")` wire-up in Plan-11-analog. Until then, Phase 2 imports OVERWRITE same-name targets via the standard write path (which fails with `PermissionDenied` since the existing file is chmod 0o444 — re-import requires the user to manually `chmod 644` in Finder, which is the documented Phase 2 escape hatch). Acceptable v1 friction because the user is single-user single-device and re-imports are rare in the first-week dogfood window.

### Import dialog UX + drop-zone (Area B)

- **D-09 Drop-zone = whole-window overlay + `DataTransfer.types` discrimination (BD3)**: dropping anywhere on the mneme window triggers the full-window overlay ("Drop to import" + cream backdrop + KD-13 styling) — but only when `DataTransfer.types` includes `Files` (i.e. native file objects). When `DataTransfer.types` is `text/plain` or `text/uri-list` only (text-drag scenarios), the overlay is suppressed and the right pane (`ChatPanel`) gets first refusal — leaves a clean integration point for v1.x chat-input text/link drag. Detection lives in `+page.svelte` `dragenter` listener, with `event.dataTransfer.types.includes("Files")` gate.
  - **Implementation note (2026-05-16 — INFO-11 spike supersession)**: D-09's specific discrimination mechanism (`DataTransfer.types.includes("Files")` on a DOM `dragenter` listener) was **superseded** by Tauri 2 `onDragDropEvent.payload.paths.length > 0` discrimination during the Plan 01 Wave-0 spike. See `02-SPIKE-dragdrop.md` Errata for runtime payload shape. Tauri 2 with `dragDropEnabled: true` intercepts native file drags at the OS layer and emits `enter`/`over`/`leave`/`drop` events with `paths: string[]` of absolute OS paths; the WebKit `DataTransfer` surface is bypassed for native drags. Text drags (text/plain, text/uri-list) do NOT trigger `onDragDropEvent` at all — they remain available to the right pane (ChatPanel) for v1.x chat-input text/link drag without any discrimination gate needed. The window-global listener lives in `DropzoneOverlay.svelte` (mounted from `+page.svelte` per Plan 12, **conditionally gated on `$page.route.id !== '/onboarding/[step]'`** per BLK-3 fix) rather than a `dragenter` listener on the route element. The D-09 "Drop to import" copy + cream backdrop + KD-13 styling + whole-window scope are preserved; only the detection mechanism evolved.
- **D-10 Course picker = adaptive by course count (BC2)**: import dialog renders the course picker per current course count (read from `vault_writer::list_courses()` on dialog open):
  - **0 courses** → entire dialog is replaced with: "No courses yet. Add a course in Settings → Vault, then re-drop." (with a `[Open Settings]` button that closes the dialog and opens settings to the Vault category). No file is written.
  - **1-3 courses** → radio buttons stacked vertically (one-glance + one-click select)
  - **4-10 courses** → standard dropdown (`<select>` styled per KD-13)
  - **10+ courses** → typeahead input (filter as user types; arrow keys to navigate; Enter to select)
- **D-11 Dialog default values = no remember-last (BL1)**: each time the import dialog opens, course = empty (must be selected) and category = `_inbox` (the safest default — `_inbox` is the catch-all for "I haven't decided yet"). User must consciously pick a course on every import — defends against "I switched courses mid-week and forgot to update the picker default." Per-import friction cost is one click; mistake recovery cost is one Finder delete + re-import. The trade is intentional.
- **D-12 Dialog position = always screen center**: macOS modal dialog convention; Tauri `Window::center` or CSS `position: fixed; inset: 50% / translate -50%`. Mouse-following dialogs are explicitly out of scope (violates macOS Human Interface Guidelines + Tauri implementation cost).
- **D-13 Cmd+I joins interaction-paradigm exception list**: `.planning/threads/interaction-paradigm.md` previously locked 4 narrow exceptions to "mouse-first + Cmd+Q only global hotkey" (voice-input Cmd+Shift+V / fsrs-review 1234 / multi-session Cmd+K / fsrs-review Esc). Cmd+I joins as the 5th narrow exception (file-picker invocation; macOS standard semantic — nothing else triggers Cmd+I in mneme). Thread file gets a one-row entry as part of Phase 2 wrap-up; CONTEXT.md surfaces this so planner doesn't propose additional hotkeys without thread review.

### Import + reconciliation runtime (Area D)

- **D-14 Startup reconciliation = blocking spinner (DR1, user choice over Recommended DR2)**: on app launch, before the main three-pane UI mounts, a full-screen "Indexing vault... N / M" spinner runs while the reconciliation scan completes. SPEC L65 performance budget (≤200ms for ≤100 files) is the v1 target. **Escalation trigger**: if Phase 2 dogfood measures vault-file count > 500 and reconciliation > 1000ms on the user's MacBook Pro 2019 Intel, revisit DR2 (background tokio task + Phase 3 "index ready" event) as a v1.x improvement. The choice favors "every app open guarantees an index-consistent main UI" over "fast launch with a few hundred ms of background catch-up." Acceptable Phase 2 because (a) Phase 2's vault is post-onboarding small (single-digit course folders, low file count); (b) Phase 3 Cmd+P would otherwise need to handle "index still building" UI states, which DR1 sidesteps.
- **D-15 Import IO model = background tokio task + per-file event emit (SPEC-locked)**: SPEC REQ-9 acceptance ("importing 3 files…" → "imported 3 files · just now"; failure path "2 / 3 imported · 1 error" with per-file error message) implicitly requires per-file streaming progress to the WebView. Implementation: import controller spawns a `tokio::spawn` task that iterates files; after each file write completes, it emits a Tauri event `import:progress` with `{operation_id, current, total, last_file_name, last_file_status}`. WebView (`TitlebarMeta.svelte` + import status modal) listens via `@tauri-apps/api/event::listen`. No new gray area — SPEC closed this.
- **D-16 Folder batch Cancel button = Cancel + already-written preserved (D2-B)**: import dialog (during active batch) shows a `[Cancel]` button. On click: import controller stops the iteration loop (does NOT roll back already-written files), updates the status pill to `N / M imported · cancelled`, and the most-recent-20 import history records the operation as "cancelled at file N". User mental model: "I dragged the wrong batch in; let me at least keep the ones already done and undo by manually deleting in Finder." Rolling back already-written files (D2-C) is rejected because: (a) chmod 0o444 makes deletion require chmod 0o644 first, doubling failure-mode complexity; (b) cancellation often means "the rest were wrong," not "throw all of it away."

### Visual contract — KD-13 inheritance (carried forward from Phase 1 D-22)

- **D-17 KD-13 visual contract continues unchanged**: all Phase 2 new UI surfaces (onboarding wizard, settings panel, import dialog, status pill, course-add form, vault path picker) use `src/lib/styles/tokens.css` exclusively. Form-isolation contract from D-22 Phase 1 holds: `--orange` only as fill, `--error` only as stroke; KD-13 `active:scale-[0.96]` baseline; `--bubble-user: #EEEBE2` SSOT 0' override. **`.planning/references/design/living-visual-contract.md` is for tool HTML (review / dogfood / handoff) only — Phase 2 mneme app UI does NOT use Living tokens** (cream `#E6E3DC`, olive accent, Fraunces). The 2026-05-14 dual-track decision is permanent.
- **D-18 New components carry `Visual SSOT:` comment header**: same convention as Phase 1 components. For onboarding step components, the SSOT pointer is the (forthcoming) Claude Design Lab HTML prototype path — placeholder until prototype is produced. For settings + import dialog components, the SSOT pointer is `tokens.css` line ranges + KD-13 deep-dive references.

### Capability surface (KP-04 + Phase 1 D-14)

- **D-19 IPC capability registration = Tauri 2 standard model (NOT spawn-args SSOT)**: Phase 2 introduces ~10-15 new Tauri commands (vault_create, course_add_or_create, write_to_vault wrapper, vault_move, vault_query_index, save_onboarding_state, load_onboarding_state, dialog_open_file_picker, dialog_open_folder_picker, list_courses, get_recent_imports, etc.). These use Tauri 2's standard capability declaration in `src-tauri/capabilities/default.json` with the existing `permissions` array — NOT routed through `scripts/gen-capabilities.ts` (which is the SSOT only for `claude-bin` argv per Phase 1 D-14). Argv validation for these commands happens inside each command's Rust handler (path canonicalization + regex checks where needed). The `audit-capabilities.sh` pre-commit gate continues to verify "no `args: true` wildcard" and "no `*` shell scope expansion" for any newly added permission.
- **D-20 Vault path config = `~/.mneme/config.json`**: SPEC + settings-ui spec lock the vault path as a configurable persistent value. Storage = `~/.mneme/config.json` (NOT macOS `~/Library/Application Support/Mneme/`). Reasoning: keeps mneme's runtime state under a single discoverable directory (`~/.mneme/`) — easier for the user to inspect/clear/migrate. Schema: `{vault_path: "<absolute path>", schema_version: 1}`. New fields (theme, keybindings, etc.) extend the same file. Reads cached at app startup; writes are atomic temp+rename (same pattern as onboarding-state.json).

### KP-08 dependency registry additions

- **D-21 New OSS deps register in `.planning/dependencies.md`**: `gray-matter` (npm, MIT, ~5.6k★, multi-maintainer ✓ — passes Phase 1 D-08 thresholds) for YAML frontmatter parse + stringify; `rusqlite` (Cargo, MIT, ~2.9k★ ✓) with `bundled` feature for SQLite (avoids macOS system libsqlite3 version variance — bundled is 200KB ABI cost worth it for personal app). Both register before plan-phase. UniBoard bridge / file-watch are out-of-scope; no new deps for those.

### Claude's Discretion

The user did NOT explicitly delegate any decision to Claude in this session. Items where the SPEC text or D-01..D-21 above leave fine-grain implementation choices to the planner/executor:
- Exact tokio task structure for import controller (single task per import operation vs task pool — planner picks based on Tauri event-bus throughput)
- SQLite migration mechanism (single `CREATE TABLE IF NOT EXISTS` for v1; future schema_version column reserved but not used)
- Splitter localStorage key namespace (continue with `mneme.<area>.<field>` Phase 1 convention)
- Onboarding step-validation regex specifics (course CODE format — `^[A-Z]{4}\d{4}$` likely default but planner reviews vs USYD course-code reality including `MATH1062` 4+4 / `INFO1110` 4+4 / `STAT1003` 4+4 — all match the regex)
- Status pill animation curve (planner reuses KD-13 `cubic-bezier(0.165, 0.85, 0.45, 1)` ease, duration ~200ms; no separate UI-phase needed for this micro-detail)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher / planner / executor) MUST read these before planning or implementing.**

### Phase scope + locked requirements (READ FIRST)
- `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-SPEC.md` — **11 locked requirements, 18 acceptance checks, ambiguity 0.12.** Authoritative WHAT/WHY for Phase 2.
- `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-DISCUSSION-LOG.md` — alternatives considered for each Area A/B/C/D decision (audit trail, NOT for agent consumption — agents read CONTEXT.md only).

### Capability specs (OpenSpec — READ for cross-phase contract context)
- `openspec/specs/vault-storage.md` — vault directory contract (PARA + course-root, `_source/` write protection, `[[wiki-link]]` cross-course concept refs, `INDEX.md` auto-maintained). Phase 2 implements REQ-06.
- `openspec/specs/settings-ui.md` — 8-category panel + Cmd+, entry + 3 v1-functional categories + KD-13 visual lock. Phase 2 implements REQ-14.

### Project-level decisions (READ for principle / decision context)
- `.planning/PROJECT.md` — KP-01 (local-first; Phase 2 zero-network constraint), KP-02 (50% OSS rule + Phase 1 D-08 ≥1k★ thresholds — gray-matter / rusqlite both pass), KP-04 (compliant subprocess wrapping; OAuth subscription = no cost-cap kill switch), KP-08 (OSS dependency tracking — Phase 2 adds 2 entries to dependencies.md), KP-09 + KD-13 (Anthropic/Claude visual aesthetic family — Phase 2 UI continues this lock).
- `.planning/REQUIREMENTS.md` — REQ-06 / REQ-13 / REQ-14 / REQ-16 mapped to Phase 2; note REQ-03 wording ("Canvas + Ed import + sync") is stale and will be patched in phase wrap-up per 2026-05-11 self-ecosystem decision.
- `.planning/STATE.md` — current milestone v5.3.2; Phase 1 ship-ready; Phase 2 next active phase.
- `.planning/dependencies.md` — KP-08 OSS registry; Phase 2 adds `gray-matter` + `rusqlite` rows before plan-phase.

### Cross-cutting threads (READ for cross-phase contract)
- `.planning/threads/visual-design-system.md` — UI design → 实现 workflow contract (user prototypes in Claude Design Lab → executor pixel-faithful re-creates) + KD-13 quick reference. **Phase 2 D-04 invokes this contract for onboarding** (HTML prototype prerequisite). Settings + import dialog opt out of prototype-first.
- `.planning/threads/interaction-paradigm.md` — mouse-first + Cmd+Q only global hotkey + 4 prior narrow exceptions. **Phase 2 D-13 adds Cmd+I as the 5th narrow exception**; thread file gets a one-row entry as part of phase wrap-up.
- `.planning/references/design/anthropic-claude-aesthetic-deep-dive_zh.md` — KD-13 7-chapter SSOT (color / typography / motion / shadows). Phase 2 new UI consumes this directly.
- `.planning/references/design/living-visual-contract.md` — **NOT applicable to Phase 2 mneme app UI**. Living tokens (cream `#E6E3DC` / olive accent / Fraunces) are reserved for tool HTML (review / dogfood / handoff). Permanent dual-track decision 2026-05-14.

### Phase 1 inherited context (dependency)
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md` — D-01 vanilla CSS Grid + Svelte 5 runes Splitter / D-06 window chrome (`decorations:true + titleBarStyle:Overlay + hiddenTitle:true`) / D-08 OSS adoption thresholds / D-10 Rust state machine + PGID kill (Phase 2 import controller reuses the pattern) / D-14 spawn-args SSOT (NOT extended to Phase 2 IPC commands per D-19 above) / D-22 KD-13 form-isolation contract.
- `.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-CONTEXT.md` — D-TR-04 capability SSOT pattern + dev-feedback-loop verify.* SDK handlers (Phase 2 verify-work uses these).

### macOS / Tauri / Rust technical references
- `https://v2.tauri.app/security/capabilities/` — Tauri 2 capability declaration model (D-19 standard model)
- `https://docs.rs/rusqlite/latest/rusqlite/` — bundled feature usage; `bundled` ABI cost ~200KB acceptable
- `https://www.npmjs.com/package/gray-matter` — `matter()` parser + `matter.stringify()` writer
- `https://man7.org/linux/man-pages/man2/chmod.2.html` (POSIX) — `0o444` semantics; macOS BSD layer behaves identically

### Stale / superseded refs (DO NOT use as source of truth)
- ROADMAP.md L146-158 Phase 2 wording "Canvas + Ed import + sync" — stale; SPEC.md is authoritative; ROADMAP patched in wrap-up.
- REQUIREMENTS.md REQ-03 / REQ-13 wording — same; SPEC.md authoritative.
- `TitlebarMeta.svelte:27` hardcoded `~/Mneme/usyd-2026s1` placeholder — Phase 1 leftover; SPEC REQ-1 acceptance requires removal.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 1 patterns Phase 2 inherits)
- **`src/lib/connection-state.svelte.ts`** — module-scope `$state` reactive singleton pattern. Phase 2 uses the same pattern for `import-state.svelte.ts` (current import operation, recent-20 history, status-pill state) and `vault-state.svelte.ts` (current vault path + course list cache).
- **`src/lib/styles/tokens.css`** — KD-13 design tokens (cream `#faf9f5`, orange `#d97757`, warm dark `#2b2a27`, serif body, soft 8% borders, `cubic-bezier(0.165, 0.85, 0.45, 1)` ease). Phase 2 new components consume directly via `var(--*)`.
- **`src/lib/components/SettingsModal.svelte`** — current 1-paragraph placeholder (`<dialog>` + KD-13 styling skeleton). Phase 2 replaces entirely with full 8-category UI but keeps the `<dialog>` host pattern + `dialog.showModal()` / `dialog.close()` APIs.
- **`src/lib/components/TitlebarMeta.svelte`** — current shows connection status + hardcoded vault path placeholder + settings cog. Phase 2 (a) reads vault path from `vault-state.svelte.ts` (NOT localStorage hardcode); (b) inserts the import-status pill between `connected` and `vault:` per SPEC REQ-9; (c) clicking the pill opens the import-history modal.
- **`src/lib/components/Splitter.svelte`** — pointer-capture drag handles + localStorage persistence pattern. Phase 2's onboarding wizard does NOT use Splitter (full-screen takeover per D-01); the Splitter remains untouched in main `+page.svelte` route.
- **`src-tauri/src/session.rs`** — `HashMap<SessionId, ChildHandle>` behind `Mutex` registry. Phase 2's import controller uses an analogous pattern: `HashMap<OperationId, ImportOperation>` registry inside `src-tauri/src/import_controller.rs` so concurrent import operations (rare in single-user Phase 2 but theoretically possible) don't collide.
- **`src-tauri/src/lib.rs` `kill_pgid`** — Phase 2 import operations are tokio tasks (not subprocesses), so PGID kill doesn't apply directly. But `WindowEvent::CloseRequested` + `RunEvent::ExitRequested` union handler is reused: on Cmd+Q, in-flight import tasks are signaled to stop via `tokio::sync::CancellationToken`, file index transactions are committed (best-effort), then app exits.
- **`scripts/audit-capabilities.sh`** — Phase 1 pre-commit gate. Phase 2 IPC commands all pass through this gate (D-19); audit script verifies no new `args: true` wildcard appears in `default.json`.

### Established Patterns (Phase 0 + 1 LEARNINGS)
- **`*.shared.ts` / `*.node.ts` browser-safe split** — Phase 2 may not need any node-only modules (no scratch-dir resolution analog), but if any Node-only path resolution is needed (e.g., `path.resolve('~/StudyVault')`), follow the same `.shared` / `.node` convention. The `audit-capabilities.sh` browser-safety check enforces this.
- **Atomic file writes** — Phase 0 LEARNINGS lesson: any file mneme writes (config, onboarding-state, vault INDEX.md, future user-edited notes) uses temp+rename (`.tmp` suffix → `std::fs::rename`). The vault_writer's `chmod 644 → write → chmod 444` re-import sequence is the one exception (in-place rewrite required by SPEC L49 chmod-then-write semantics), and it's contained in `with_temporary_writable_permission` helper (D-07).
- **macOS BSD vs GNU CLI quirks** — Phase 0 LEARNINGS: `sed -i ''` (BSD empty backup-extension) and `iconutil -V` (Sequoia-only). Phase 2 doesn't shell out to macOS CLIs (all logic is Rust + Svelte), so this lesson applies only to any auxiliary scripts (none planned).
- **Visual SSOT comment header** — every Phase 1 component carries `Visual: Mneme.html L<range>` header (Mneme.html now lives inside the locked bundle at `/Users/qinyuan/Downloads/Mneme 3/Mneme.html` — content + line numbers unchanged, only path updated 2026-05-15). Phase 2 components extending main-shell patterns keep `Visual: Mneme.html L<range>`; net-new Phase 2 components point to the surface-specific HTML in the same bundle (e.g. `Visual: Mneme 3/Mneme Import Dialog.html` for ImportDialog.svelte) AND to UI-SPEC §8.x section refs.

### Integration Points
- **Phase 3 (multi-session + Cmd+P + editor)**: inherits Phase 2's vault-index SQLite database (`vault_files` table) for Cmd+P fuzzy search; multi-session state extends Phase 2's session registry (Phase 1 left it `HashMap<SessionId, ChildHandle>` for this purpose); Tiptap editor writes go through Phase 2's `vault_writer.rs` with `WriteContext::User` (cannot write `_source/`).
- **Phase 4 (document ingestion: PDF + Office → markdown)**: Marker subprocess output and markitdown subprocess output both land in `<vault>/courses/<CODE>/_source/<original>.md` via `vault_writer::write_to_vault(path, bytes, WriteContext::Import(import_handle()))`. Phase 4's converters call `vault_writer::import_handle()` from their pipeline — this is the second authorized caller of the factory (after Phase 2's manual import controller).
- **Phase 5 / 6 (Echo360)**: Echo360 lecture videos / VTT files import via the same vault_writer interface. Caption-bilingual VTT (REQ-05) falls into the same import path.
- **Phase 7 (KG + memory)**: `_system/memory/` directory writes use `vault_writer::write_to_vault(_, _, WriteContext::User)` — the `_system/` directory is NOT under the `_source/` write-block path-guard, so User context can write there freely. Memory-engine spec confirms `_system/memory/` is the export sink for the three-tier memory pipeline.
- **Phase 8 (per-course rules)**: rules at `courses/<COURSE>/.mneme/rules/<rule>.md` are user-editable text files; writes go through `vault_writer::write_to_vault(_, _, WriteContext::User)` — `.mneme/rules/` is not `_source/`, so User can write.
- **Phase 9 (anchored mode + Citations API)**: Citations need stable `[file.md:42]` anchors — vault file index from Phase 2 provides the canonical path → file metadata mapping. Anchored mode panel reads from same SQLite database.
- **Phase 10 (FSRS-6 review)**: `_system/fsrs/history.jsonl` writes go through vault_writer with User context. Concept-page YAML frontmatter (`fsrs:` field) edited via Tiptap (Phase 3) and read via gray-matter parse (Phase 2 ships the gray-matter dep).

### Files to be created (Phase 2 — for plan-phase reference)
**Rust:**
- `src-tauri/src/vault_writer.rs` — single Rust module per D-05/D-06/D-07 (write_to_vault + WriteContext + ImportToken + import_handle factory + with_temporary_writable_permission helper)
- `src-tauri/src/import_controller.rs` — orchestrates drag-drop/Cmd+I import flow + tokio task per operation + emits import:progress events (D-15) + cancellation via CancellationToken (D-16)
- `src-tauri/src/vault_index.rs` — rusqlite wrapper; `vault_files` table CRUD; reconciliation scan; database init at `~/.mneme/vault-index.db`
- `src-tauri/src/onboarding.rs` — load/save onboarding-state.json with atomic temp+rename (D-03)
- `src-tauri/src/config.rs` — load/save `~/.mneme/config.json` (D-20)

**Svelte (full-screen onboarding route):**
- `src/routes/onboarding/[step]/+page.svelte` — step router; redirects to current step on resume
- `src/routes/onboarding/+layout.svelte` — onboarding-only layout (no Splitter, no MindMapBar; just titlebar + cream fullscreen)
- `src/lib/components/onboarding/Onboarding.svelte` — main shell (state owner; routes between 6 steps; persistence calls)
- `src/lib/components/onboarding/Step1Welcome.svelte` through `Step6DemoImport.svelte`

**Svelte (main UI additions):**
- `src/lib/components/SettingsPanel.svelte` (replaces SettingsModal placeholder; 8-category left rail + 3 v1-functional bodies)
- `src/lib/components/settings/VaultCategory.svelte` / `AppearanceCategory.svelte` / `KeybindingsCategory.svelte` / `ComingSoonCategory.svelte` (5 placeholder reuses last)
- `src/lib/components/ImportDialog.svelte` (course/category picker + adaptive course-picker per D-10 + duplicate-resolution sub-dialog per D-08)
- `src/lib/components/ImportStatusPill.svelte` (insert into `TitlebarMeta.svelte` between connection-status and vault-path)
- `src/lib/components/ImportHistoryModal.svelte` (most-recent-20 modal per SPEC REQ-9)
- `src/lib/components/dropzone/DropzoneOverlay.svelte` (full-window overlay per D-09)

**Svelte state:**
- `src/lib/import-state.svelte.ts` (current operation + recent-20 history + status-pill state)
- `src/lib/vault-state.svelte.ts` (current vault path + course list cache + course-count derived)

**Modifications:**
- `src/lib/components/TitlebarMeta.svelte` — remove hardcoded `~/Mneme/usyd-2026s1`, read vault path from `vault-state.svelte.ts`, insert ImportStatusPill
- `src/routes/+layout.svelte` — add app-startup check that calls Rust IPC `load_onboarding_state` and conditionally redirects to `/onboarding/<step>`
- `src/routes/+page.svelte` — main shell unchanged structurally; minor adjustment to wire DropzoneOverlay listener
- `src-tauri/src/lib.rs` — register new commands (vault_create, course_add_or_create, save/load_onboarding_state, etc.); extend close-requested handler to drain in-flight import tasks
- `src-tauri/Cargo.toml` — add `rusqlite = { version = "0.32", features = ["bundled"] }` and `gray-matter` if Rust-side parse needed (likely npm-side parse only, so gray-matter is npm dep)
- `package.json` — add `gray-matter` ^4.0.3 (latest at planning time — version pin during plan-phase)
- `src-tauri/capabilities/default.json` — add ~10-15 new permissions per D-19; audit script must continue to pass
- `.planning/dependencies.md` — D-21: add gray-matter + rusqlite rows
- `.planning/threads/interaction-paradigm.md` — D-13: append Cmd+I row to exception-candidate table
- ROADMAP.md L146-158 + REQUIREMENTS.md REQ-03/REQ-13 wording — phase-wrap-up patches (NOT inside this phase)

</code_context>

<specifics>
## Specific Ideas

- **User direct quote 2026-05-15 (during gray area selection)**: "做这个的目的是什么，你给了我比喻但是我没理解 area 是做什么的" — captured as Memory `feedback_plain_chinese_in_discuss.md` (永久 default 大白话 for all Socratic commands). Planner / executor inherit this style for any user-facing summaries / intermediate questions in `/gsd-plan-phase 2` or `/gsd-execute-phase 2`.
- **User chose DR1 over Recommended DR2 (Area D-1)** — explicit override: "DR1 启动阻塞 + spinner". Reasoning inferred (not user-stated): favors index-consistency invariant on app open over fast-launch UX. Acceptable for Phase 2 vault size but escalation trigger documented in D-14 (revisit DR2 in v1.x if vault > 500 files measured in dogfood).
- **User chose BL1 over Recommended BL2 (Area B-3)** — explicit override: "BL1 不记忆，每次重置". Reasoning inferred: favors course-mismatch defense over per-import friction reduction. Acceptable for daily use; planner does not add "remember last" feature flag.
- **Living visual contract scope re-confirmed (2026-05-14 sticking)** — `.planning/references/design/living-visual-contract.md` is for tool HTML only (review / dogfood / handoff). mneme app UI = KD-13 only. Any planner / executor proposal mixing the two requires re-discussion.
- **Onboarding HTML prototype is BLOCKING** for `/gsd-plan-phase 2` — see `<deferred_blocking>` below. The visual-design-system thread workflow contract (user prototypes in Claude Design Lab → I pixel-faithful complete) is non-negotiable for the onboarding region per AC3 lock.

</specifics>

<deferred>
## Deferred Ideas

### Deferred to v1.x (post-Phase-2)
- **DR2 background reconciliation** — escalation trigger: vault > 500 files measured in Phase 2 dogfood with reconciliation > 1000ms. If triggered, replan as v1.x improvement; emit "index ready" event so Phase 3 Cmd+P can show "index building" spinner.
- **v1.x chat input text/link drag-drop** — D-09 BD3 leaves the `text/plain` + `text/uri-list` DataTransfer paths free for ChatPanel to claim later. No scope work in Phase 2.
- **Vault path move progress bar** — current SPEC says "Move complete — old vault preserved" toast suffices. If users dogfood with vaults > 1000 files and the copy takes > 5s, add a progress bar in v1.x.
- **Onboarding back-button** — SPEC REQ-8 acceptance only requires forward + resume; back-button ergonomics (re-edit a previous step) is a v1.x candidate. Forward-only in v1.

### Deferred to later phases
- **UniBoard bridge import path** — separate later phase per 2026-05-11 self-ecosystem decision. UniBoard "transferable unit" definition must be locked first (4 open questions in `.planning/todos/pending/2026-05-14-spec-external-import-self-ecosystem.md`).
- **Cost-cap kill switch** — explicitly REMOVED from REQ-14 scope per 2026-05-15 SPEC. Subscription model. UsageMeter contract (`Ctx % / Total / Session`) stands.
- **File-watch live updates** — Phase 3+ via `tauri-plugin-fs-watch`. Phase 2 uses startup reconciliation only.
- **Theme dark-mode actual switching** — light-only per KD-13 for v1; toggle exists in Settings → Appearance but no-ops. Dark-mode token system is a future ui-phase.
- **Course rename / vault delete-and-replace / soft-delete trash** — Phase 3+.
- **Advanced settings categories (General / Sync / Claude / Privacy / Keybindings-override)** — render `(coming in Phase N)` empty body in Phase 2; full UI lands in Phase 3+.

### Items captured but explicitly NOT in this phase
- **Auto-collapse PDF/video panes when no file/video selected** (`.planning/todos/pending/2026-05-09-auto-collapse-pdf-and-video-panes-when-no-file-or-video-sele.md`) — not in Phase 2 SPEC scope (vault + import + onboarding); is a Splitter UX behavior. Stays in pending todos for later phase or one-off micro-fix.
- **Husky v10 compat — remove deprecated hook shim** (`.planning/todos/pending/2026-05-11-husky-v10-compat-remove-deprecated-hook-shim.md`) — 5-min trivial fix; can be done as housekeeping commit any time. Not Phase 2 scope.
- **AgentShield runtime monitor decision** + **Workflow sync to all r1ckyIn projects** — both are workflow infrastructure todos, NOT Phase 2 scope.

### Reviewed Todos (cross_reference_todos)
`gsd-sdk query todo.match-phase "02"` returned 0 matches (15 pending todos exist but none scored above auto-fold threshold). Explicit review:
- `2026-05-14-spec-external-import-self-ecosystem.md` — already absorbed into SPEC scope (manual import only); not folded as a "todo" because it became a SPEC-level constraint.
- `2026-05-14-spec-onboarding-first-run-wizard.md` — already absorbed into SPEC scope (REQ-8 6-step wizard); same reason.
- All other pending todos scored < 0.4 against Phase 2 keywords; correctly skipped.

</deferred>

<deferred_blocking>
## Blocking Prerequisite — onboarding HTML prototype

Per D-04 (Visual SSOT split) and the `.planning/threads/visual-design-system.md` workflow contract:

**Before `/gsd-plan-phase 2` is run, the user must produce an onboarding HTML prototype** in Claude Design Lab covering 6 steps:

1. Welcome (mneme branding + "Let's set up your study vault" tone)
2. Claude Code auth check (sentinel-file read of `~/.claude/.credentials.json` or equivalent — read-only verification)
3. Vault path picker (`~/StudyVault/` default + Browse button + path validation feedback)
4. MCP detection (no-op pass-through for v1 with explicit "no external MCP — self-ecosystem mode" copy)
5. Add first course (CODE input + Add button + "Skip — add later" link)
6. Demo import (drop zone + "Skip" — optional)

**Plan-phase entry behavior (UPDATE 2026-05-15 — BLOCKING SATISFIED)**: the original BLOCKING ("user must produce onboarding HTML prototype before plan-phase") is now **satisfied** by the locked Mneme 3 bundle at `/Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html` (6 fullscreen step frames, audited 2026-05-15, all 18 PASS items + 3 NOW-tier fixes applied). Plan-phase 2 may proceed without halt. Historical phrasing below preserved for audit trail:

> *(Original 2026-05-15 phrasing, superseded later same day):* `/gsd-plan-phase 2` should detect prototype absence (e.g., file missing at agreed path like `~/Downloads/mneme/onboarding-prototype.html` or repo-relative `.planning/references/prototypes/onboarding.html`) and HALT with the message:

> "Phase 2 onboarding visual contract requires an HTML prototype per CONTEXT.md D-04 (visual-design-system thread). Please produce the prototype before re-running plan-phase. See `.planning/threads/visual-design-system.md` for the workflow."

**Workflow**: user spends ~half-day in Claude Design Lab → exports HTML → places at the agreed path → user re-runs `/gsd-plan-phase 2`. Settings panel + import dialog do NOT have this prerequisite (D-04 freehand allowance).

</deferred_blocking>

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Context gathered: 2026-05-15*
*Next step: (1) user produces onboarding HTML prototype per `<deferred_blocking>`; (2) `/gsd-plan-phase 2 --tdd` (vault_writer Rust state-machine + import controller + reconciliation + onboarding wizard all benefit from `--tdd`).*
