# Phase 2: Vault + Manual Import + Onboarding — Specification

**Created:** 2026-05-15
**Ambiguity score:** 0.12 (gate: ≤ 0.20)
**Requirements:** 11 locked

> **Phase naming note**: the slug `02-vault-canvas-ed-sync-onboarding` is legacy from the 2026-04 ROADMAP. The 2026-05-11 self-ecosystem decision (`.planning/todos/pending/2026-05-14-spec-external-import-self-ecosystem.md`) and this SPEC reframe Phase 2 as **Vault + Manual Import + Onboarding**. The slug stays for artifact stability; do not rename mid-phase. ROADMAP.md L146-158 + REQUIREMENTS.md REQ-03 / REQ-13 wording will be updated as part of the wrap-up, not inside this phase.

## Goal

Mneme ships with a local-first markdown vault on disk at a user-configured path (default `~/StudyVault/`), a first-run wizard that takes a brand-new install from "0 files on disk" to "vault scaffolded + at least one course folder created + ready to chat", a manual file-import surface (drag-drop / file picker / folder batch) that writes coursework into the course-scoped `_source/` directory with file-system write protection, a rusqlite-backed file index that Phase 3 Cmd+P can consume, an always-visible import-status surface in the titlebar/status area, and a full Settings panel reachable via Cmd+, that replaces the Phase 1 placeholder.

## Background

**Phase 1.1 shipped (commit `cb567a6`).** Today the Tauri shell renders a 3-pane Splitter UI; `ChatPanel.svelte` spawns `claude` subprocess via `tauri-plugin-shell` with strict capability gating; `~/.mneme/scratch/` is the only mneme-owned directory on disk.

**What does NOT exist yet (the Phase 2 delta):**
- No vault directory on disk. `TitlebarMeta.svelte:27` shows a hardcoded placeholder string `~/Mneme/usyd-2026s1` from `localStorage["mneme.vault.path"]`; nothing is created.
- `FileArea.svelte` (left pane) shows 5 hardcoded mock file rows; no real filesystem reads.
- `SettingsModal.svelte` is a 1-paragraph stub: "Settings wires in Phase 2".
- No `~/.mneme/onboarding-state.json`; no first-run wizard component.
- No import surface. No file-watch. No SQLite index. No status surface.

**Self-ecosystem constraint (locked 2026-05-11):** v1 does NOT call any external university API or MCP (Canvas / Ed / Echo360 / etc). Data enters the vault via **manual import only** in Phase 2; a separate later phase will add the UniBoard bridge (UniBoard is the user's own project — same self-ecosystem). The ROADMAP's original Phase 2 wording mentioning "Canvas + Ed import + scheduled sync" is stale and will be rewritten during the discuss-phase / plan-phase 2 wrap-up.

**Vault default lock (this SPEC):** Default vault path is `~/StudyVault/` — one lifetime vault, not per-semester. REQUIREMENTS.md REQ-06 is authoritative; the `TitlebarMeta.svelte` hardcoded `~/Mneme/usyd-2026s1` is a Phase 1 leftover and will be removed.

**Costing model lock (confirmed by screenshot 2026-05-15):** the UsageMeter shipped in Phase 1 displays `Ctx X% · Total Nk · Session Xh Ym` — there is no dollar field. REQ-14's "cost cap (REQ-13-related kill switch)" phrasing is stale because the user runs on a Pro/Max Anthropic subscription (turn-throttled, not USD-metered); Phase 2 explicitly does NOT implement a cost-cap kill switch.

## Requirements

1. **Vault scaffold on first launch**: required directory tree is created if missing.
   - Current: no vault dir exists; `TitlebarMeta.svelte` shows a placeholder string only.
   - Target: when user completes onboarding (or relaunches with a configured vault path), the path is created with `_system/`, `_inbox/`, `courses/`, `shared/` subdirectories; the title bar's vault-path text reflects the live configured path.
   - Acceptance: deleting `~/StudyVault/` then relaunching the app re-creates exactly those four top-level dirs; `TitlebarMeta` reads vault path from a persisted config source (not the legacy `~/Mneme/usyd-2026s1` hardcode).

2. **Course folder scaffold on demand**: each user-added course gets a fixed sub-structure.
   - Current: no course concept exists in code.
   - Target: adding course `<CODE>` (via Settings → Vault, or onboarding step 5) creates `courses/<CODE>/{_source/,notes/,concepts/,practice/}` and writes a starter `courses/<CODE>/INDEX.md` with YAML frontmatter `{course: <CODE>, created: <iso8601>}`.
   - Acceptance: adding course `COMP3221` produces all 4 sub-dirs + an `INDEX.md` whose frontmatter parses with `gray-matter` and contains the two fields; running the same add twice is idempotent (does not error, does not overwrite `INDEX.md`).

3. **`_source/` write protection (vault_writer layer)**: a single Rust module is the only legitimate writer path into the vault, and refuses any write into `_source/` unless the caller passes the `ImportContext` privileged token.
   - Current: no centralized write path; nothing prevents arbitrary writes.
   - Target: `src-tauri/src/vault_writer.rs` exposes `write_to_vault(path, bytes, ctx: WriteContext)`. `WriteContext::User` rejects any path under `<vault>/courses/<*>/_source/`. `WriteContext::Import` is the only variant that can write under `_source/`. All other vault-touching code (settings save, INDEX.md generation, future notes write) goes through this module.
   - Acceptance: a unit test calls `write_to_vault("…/COMP3221/_source/lec.pdf", b"…", WriteContext::User)` and asserts `Err`; the same call with `WriteContext::Import` succeeds and the file appears on disk.

4. **`_source/` write protection (chmod 444 layer)**: every file the manual-import flow writes into `_source/` gets POSIX mode `0o444` immediately after the bytes are flushed.
   - Current: no files in `_source/`; no chmod logic.
   - Target: import flow writes file, fsyncs, then `std::fs::set_permissions(path, Permissions::from_mode(0o444))`. Subsequent `fs::write` from any other code path returns `EACCES`. Re-importing the same file follows the "chmod 644 → write → chmod 444" three-step.
   - Acceptance: after import, `stat -f "%Sp" <file>` shows `-r--r--r--`; a Rust test attempts `fs::write` on the imported file with `WriteContext::User` and gets `Err(io::Error)` with kind `PermissionDenied`.

5. **Manual import — drag-drop**: dropping files onto the mneme window triggers an import flow.
   - Current: no drop handler exists.
   - Target: dropping one or more files on the main window opens an import dialog showing (a) the file list, (b) a course-picker dropdown (populated from existing `courses/<CODE>/` dirs), (c) a category radio: `lectures / tutorials / assignments / announcements / _inbox` (default: `_inbox` if no course picked). Confirm writes via `WriteContext::Import`.
   - Acceptance: dragging two files into mneme with course = `COMP3221`, category = `lectures` deposits them at `courses/COMP3221/_source/lectures/<original-name>` with mode `0o444`; the import dialog's "imported N files" toast appears.

6. **Manual import — file picker + folder batch**: a button in the left pane / Cmd+I keybind opens a native file picker; folder selection imports recursively.
   - Current: no picker exists.
   - Target: Cmd+I or "Import" button opens Tauri `dialog.open({multiple:true, directory:false})` for files, and a separate "Import folder" entry uses `directory:true` to traverse one level deep (sub-files only, not nested folders in v1). Same target-course / target-category dialog as REQ-05.
   - Acceptance: Cmd+I opens a native macOS file picker; selecting 3 PDFs + 1 PPTX writes 4 files; selecting a folder with 10 files writes 10 files (any nested sub-folder is skipped with a per-file note in the import status toast).

7. **Vault file index (rusqlite)**: every file ever written under the vault (`_source/`, `notes/`, `concepts/`, `practice/`, `_inbox/`, `INDEX.md`) is indexed in `~/.mneme/vault-index.db` with columns `(path TEXT PRIMARY KEY, course TEXT, kind TEXT, size_bytes INTEGER, mtime_iso TEXT, indexed_at_iso TEXT)`.
   - Current: no SQLite, no index file.
   - Target: import writes synchronously update the index in the same transaction as the file write (best-effort: on index failure log and continue; do not block the import); app startup runs a "missing-files reconciliation" scan that adds rows for any files on disk not yet in the index. Files deleted from disk are removed from the index lazily on the next reconciliation.
   - Acceptance: after importing 5 files, `SELECT count(*) FROM vault_files` returns 5; deleting one file from disk and relaunching the app drops the row to 4 within the first reconciliation pass; the index DB file is < 1MB after a fresh install with one course.

8. **Onboarding wizard — 6 steps, resumable**: first launch (or when `~/.mneme/onboarding-state.json` is missing-or-incomplete) shows a 6-step wizard before the main UI is reachable.
   - Current: no wizard component; app drops straight into the chat UI.
   - Target: steps are (1) Welcome, (2) Claude Code auth check (verify `claude --version` resolves and OAuth is active by reading `~/.claude/` sentinel — read-only, no writes), (3) Vault path picker (default `~/StudyVault/`), (4) Optional MCP detection (no-op pass-through for v1 — display "no external MCP configured, you're in self-ecosystem mode"; the step exists so the wizard's structure is stable for future phases), (5) Add first course (CODE input + create button — at least 1 required to proceed, with explicit "Skip — add later" link that drops to step 6 with no course), (6) Demo import (optional — drop a file or skip).
   - Acceptance: launching with `~/.mneme/onboarding-state.json` absent shows step 1; clicking Next on each step persists `{current_step, vault_path, courses_added: [...], completed_at: null}`; killing the app at step 4 and relaunching opens at step 4 with prior state preserved; reaching step 6's "Finish" sets `completed_at` to ISO timestamp and routes to main UI; subsequent launches do NOT show the wizard.

9. **Import status surface**: the existing titlebar meta region (Phase 1 shows `claude-code · connected · vault: <path>`) gains a recent-import indicator and a click-to-detail modal.
   - Current: `TitlebarMeta.svelte` shows connection status + vault path only.
   - Target: when an import is in flight, an inline pill `importing N files…` appears between `connected` and `vault:`; when idle, the pill shows `imported N files · <relative time>` if there has been activity within the current session; clicking opens a modal listing the most-recent 20 import operations with (timestamp, count, target course/category, success/failure summary). Failures show a per-file error message.
   - Acceptance: importing 3 files shows `importing 3 files…` during the write, then `imported 3 files · just now`; clicking opens a modal whose first row matches the import; manually deleting `_source/` mid-import (forcing a write failure) surfaces a row with `2 / 3 imported · 1 error` and the per-file message.

10. **Settings panel — categorized, Cmd+, reachable**: the Phase 1 placeholder modal is replaced with a tabbed settings UI.
    - Current: `SettingsModal.svelte` is a single `<dialog>` with "Settings wires in Phase 2" + a Close button.
    - Target: settings opens via Cmd+, (in addition to the existing cog icon click); 8 categories listed in left rail: `General / Vault / Sync / Claude / Privacy / Appearance / Keybindings / Advanced`. v1-functional in this phase: `Vault` (path display + Move button + course list with add/remove), `Appearance` (theme toggle — light only for v1 as per KD-13 Anthropic/Claude aesthetic lock), `Keybindings` (read-only display of current bindings — override deferred to Phase 3). Other categories render an empty body with a `(coming in Phase N)` note. **Explicitly NOT in this phase:** any cost-cap field — the REQ-14 wording mentioning "cost cap kill switch" is stale (user runs on subscription, not API-key billing; UsageMeter contract is `Ctx % / Total / Session` per Phase 1 screenshot 2026-05-15).
    - Acceptance: pressing Cmd+, with the chat panel focused opens the settings panel within 100ms; clicking through all 8 categories does not error; the `Vault` category shows the current `~/StudyVault/` path; the `Appearance` toggle no-ops but does not error.

11. **Vault path move — copy-and-preserve semantics**: clicking "Move" in Settings → Vault performs a safe copy and points mneme at the new location, leaving the old vault intact for the user to remove manually.
    - Current: no move logic; the vault path is a static string.
    - Target: "Move" opens a directory picker; on confirm, mneme (a) recursively copies the full vault tree (preserving `_source/` mode `0o444`) to the new location, (b) verifies file count and total byte size match between old and new, (c) updates the persisted vault path config and rebuilds the SQLite index, (d) shows a "Move complete — old vault at <old-path> preserved. Delete it manually in Finder when ready." confirmation. **NOT** a rename / `mv` operation — always copy, even on same volume, to keep the failure mode trivially recoverable.
    - Acceptance: with 10 files in the vault, clicking Move and choosing `/tmp/test-vault` produces an identical tree at `/tmp/test-vault`, the old `~/StudyVault/` still has all 10 files, the SQLite index now reports all paths under the new location, the title bar updates to show the new path; interrupting the copy mid-flight (kill the app) leaves the old vault unmodified.

## Boundaries

**In scope:**
- Vault directory scaffolding (4 top-level dirs + course sub-tree on demand)
- `vault_writer.rs` Rust module with `WriteContext::{User, Import}` discriminated path guard
- `chmod 0o444` on every file written to `_source/`
- Manual import flow: drag-drop + file picker + folder batch (one-level)
- Per-import course-and-category dialog
- SQLite file index (`rusqlite`) — `vault_files` table only
- Onboarding wizard (6 steps, resumable via `~/.mneme/onboarding-state.json`)
- Import status pill in titlebar + click-to-detail modal (most-recent-20 operations)
- Settings panel (Cmd+, + cog icon) with 8 categories, 3 v1-functional (Vault / Appearance / Keybindings-display)
- Vault path move via safe copy (old preserved)
- YAML frontmatter on `INDEX.md` files (using `gray-matter`)

**Out of scope:**
- Canvas / Ed / Echo360 / any external university API or MCP — locked by self-ecosystem decision 2026-05-11
- UniBoard bridge — separate later phase (user's other project; `external-import.md` seed has 4 open questions)
- PDF / Office → markdown conversion — Phase 4 (Marker for PDF, markitdown for Office)
- Anchored-mode citations / Citations API — Phase 9
- Cmd+P fuzzy palette — Phase 3 (this phase produces the index it will consume)
- Tiptap block editor — Phase 3
- Multi-session sidebar — Phase 3
- Cost cap kill switch — explicitly removed from REQ-14 scope; user runs on Pro/Max subscription, UsageMeter contract is `Ctx % / Total / Session` (no USD field)
- Per-course system prompts via `.mneme/rules/` — Phase 8 (REQ-17)
- File-watch live updates (`tauri-plugin-fs-watch`) — Phase 3+ (Phase 2 uses startup reconciliation only; new imports trigger index writes synchronously)
- Theme toggle actual switching — light-only for v1 per KD-13; the toggle exists in Settings but no-ops
- Nested folder import (folder-of-folders) — v1 single-level only
- Renaming a course (`courses/COMP3221/` → `courses/COMP3222/`) — Phase 3+ via Settings
- Vault delete-and-replace flow — out of v1; user manually deletes if they want a fresh start
- Trash / soft-delete for vault files — Phase 3+; v1 hard-delete only via Finder

## Constraints

- **Local-only (KP-01)**: zero network calls in Phase 2. The Claude auth check in onboarding step 2 reads `~/.claude/` sentinel files; does NOT hit any HTTP endpoint.
- **OSS-first (KP-02)**: `gray-matter` (MIT) for YAML frontmatter; `rusqlite` (MIT) for SQLite. No vendored / proprietary deps added.
- **Visual aesthetic (KD-13)**: all new UI uses Mneme.html-locked tokens — `--color-cream`, `--color-warm-dark`, `--font-serif`, etc. New components carry a `Visual SSOT:` comment header pointing into the locked bundle at `/Users/qinyuan/Downloads/Mneme 3/` — either `Mneme.html L<range>` for main-shell-extending components, or the surface-specific HTML (e.g. `Mneme 3/Mneme Settings.html`) for net-new Phase 2 components. Light theme only.
- **Tauri capability surface (REQ-4)**: any new IPC commands added in this phase get explicit-argv validators in `src-tauri/capabilities/default.json` via `scripts/gen-capabilities.ts` SSOT — no `"args": true` wildcards. The `audit-capabilities.sh` pre-commit gate must pass.
- **macOS Ventura 13.4 Intel** is the validated baseline — `chmod 0o444` paths use POSIX `std::os::unix::fs::PermissionsExt` (no Windows fallback needed in v1).
- **`_source/` writer identity is exactly one**: the import flow. No other code path may construct a `WriteContext::Import`; the variant is private to `vault_writer.rs` and exposed only via an `import_handle()` factory that runs from the import controller.
- **Subscription costing model**: UsageMeter shows `Ctx % · Total Nk · Session Xh Ym` — no USD. Confirmed via in-app screenshot 2026-05-15.
- **Performance budget**: onboarding step 3 (vault create) must complete under 500ms on a fresh `~/StudyVault/`; vault index reconciliation on app startup must complete under 200ms for ≤ 100 files (typical post-onboarding state).

## Acceptance Criteria

- [ ] Deleting `~/StudyVault/` then relaunching with completed onboarding re-creates the 4 top-level dirs.
- [ ] `TitlebarMeta.svelte` no longer contains the hardcoded `~/Mneme/usyd-2026s1` string; vault path comes from the persisted config.
- [ ] Adding course `COMP3221` twice does not error and does not overwrite `INDEX.md`.
- [ ] `INDEX.md` YAML frontmatter parses with `gray-matter` and contains `course: COMP3221` + `created: <iso>`.
- [ ] `write_to_vault("…/_source/x", b"…", WriteContext::User)` returns `Err`; same with `WriteContext::Import` succeeds and the resulting file has POSIX mode `0o444`.
- [ ] After import, a Rust test attempting `fs::write` on the file with `WriteContext::User` returns `Err(io::ErrorKind::PermissionDenied)`.
- [ ] Drag-drop 2 files + course `COMP3221` + category `lectures` → files at `courses/COMP3221/_source/lectures/<name>` with mode `0o444`.
- [ ] Cmd+I opens native file picker; selecting 3 files imports 3 files.
- [ ] "Import folder" with a 10-file folder imports 10 files; nested sub-folders skipped with per-file note in status.
- [ ] `SELECT count(*) FROM vault_files` matches on-disk file count after import; deleting one file and relaunching drops the count on reconciliation.
- [ ] Index DB file at `~/.mneme/vault-index.db` is < 1MB after fresh install with one course.
- [ ] First launch (state file absent) shows wizard step 1; killing at step 4 and relaunching opens at step 4 with state preserved.
- [ ] Finishing the wizard sets `completed_at` to ISO; subsequent launches skip the wizard.
- [ ] Importing 3 files shows `importing 3 files…` pill, then `imported 3 files · just now`; click → modal with row matching the operation.
- [ ] Forcing a mid-import write failure surfaces `2 / 3 imported · 1 error` with the per-file message.
- [ ] Cmd+, opens settings panel within 100ms; all 8 categories click without error.
- [ ] Settings → Vault → Move to `/tmp/test-vault` produces identical tree at new location; old vault preserved; index now references new paths; title bar updates.
- [ ] Interrupting the Move mid-copy (kill app) leaves the old vault unmodified.
- [ ] `audit-capabilities.sh` passes after Phase 2 changes; no `"args": true` wildcard introduced.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                 |
|--------------------|-------|------|--------|-----------------------------------------------------------------------|
| Goal Clarity       | 0.92  | 0.75 | ✓      | Manual import + vault scaffold + onboarding + settings, no Canvas/Ed   |
| Boundary Clarity   | 0.90  | 0.70 | ✓      | Explicit out-of-scope (UniBoard, PDF→md, cost cap, file-watch, etc)    |
| Constraint Clarity | 0.85  | 0.65 | ✓      | KP-01 local-only, chmod 0o444, vault_writer single-entry, gray-matter  |
| Acceptance Criteria| 0.82  | 0.70 | ✓      | 18 pass/fail checkboxes mapped to 11 requirements                      |
| **Ambiguity**      | 0.12  | ≤0.20| ✓      |                                                                       |

## Interview Log

| Round | Perspective      | Question summary                                            | Decision locked                                                                                          |
|-------|------------------|-------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| 1     | Researcher       | Q1 — Canvas/Ed sync model (MCP via claude / Rust HTTP / subprocess) | User clarified: no external API/MCP per 2026-05-11 self-ecosystem decision; UniBoard is internal (later phase) |
| 1     | Researcher       | Q2 — Vault default path (`~/Mneme/usyd-2026s1` vs `~/StudyVault/` vs no-default) | `~/StudyVault/` — one lifetime vault, not per-semester                                                  |
| 1.5   | Researcher       | D1 — v1 ship data entry path (manual / UniBoard / neither)  | Manual import in Phase 2; UniBoard bridge in later phase                                                |
| 1.5   | Researcher       | D2 — SQLite index timing (Phase 2 / Phase 3 / never)        | Phase 2 (rusqlite already in deps); same model as macOS Spotlight                                       |
| 2     | Simplifier       | D5 — cost cap kill switch in Phase 2 (full / UI-only / drop) | Drop from REQ-14; UsageMeter contract = `Ctx % / Total / Session` (confirmed via screenshot)            |
| 2     | Simplifier       | D6 — onboarding mid-quit resume (resume / restart / skip / block) | Resume from incomplete step via `~/.mneme/onboarding-state.json`                                         |
| 3     | Boundary Keeper  | D3 — `_source/` write protection (chmod / vault_writer / both) | Double-defense: vault_writer first line + chmod 0o444 last line                                          |
| 3     | Boundary Keeper  | D4 — vault path move semantics (copy / rename / pointer-only / unsupported) | Copy-and-preserve; old vault stays for user to delete in Finder                                          |

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*Spec created: 2026-05-15*
*Next step: /gsd-discuss-phase 2 — implementation decisions (vault_writer API shape, onboarding wizard component split, import dialog UX details, status pill animation, settings tab layout)*
