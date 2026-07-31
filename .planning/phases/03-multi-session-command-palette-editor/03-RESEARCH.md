# Phase 3: Multi-Session + Command Palette + Editor - Research

**Researched:** 2026-05-30
**Domain:** Desktop app power-user layer — multi-session subprocess orchestration, headless command palette, ProseMirror/Tiptap markdown editor, Claude Code session-resume mechanics, rusqlite persistence, PreToolUse-hook soft-lock
**Confidence:** HIGH. The web/npm tools recovered after a mid-session outage and I re-verified every external package version + the resume-flag semantics against the npm registry and official Claude Code docs. The one genuinely-unresolved item (D-05a) is resolved by direct on-disk transcript analysis. The single highest-risk finding — `tiptap-markdown` maintenance status — was confirmed and changes the editor recommendation (see ⚠ correction below).

> **⚠ Load-bearing correction (verified late-session):** `tiptap-markdown` (aguingand) DOES peer-depend on `@tiptap/core@^3.0.1` (so it technically installs on Tiptap v3), BUT (a) the maintainer has publicly stopped addressing issues/PRs, and (b) **Tiptap shipped an OFFICIAL first-party markdown extension in v3.7.0** and the official docs now say to prefer it over aguingand's package. `[VERIFIED: npm tiptap-markdown@0.9.0 peerDeps + tiptap.dev/docs/editor/markdown]`. **Recommendation flipped: use Tiptap's official markdown extension, not aguingand/tiptap-markdown.** CONTEXT D-01 names `tiptap-markdown` — this is a Claude's-discretion implementation detail (the *decision* is "Tiptap + markdown round-trip via an OSS extension", not specifically the aguingand package), but the planner should surface this swap to the user since `.planning/dependencies.md` records the aguingand package by name. See Standard Stack + Pitfall 2 + Open Q1.

> **Session tooling note (honest reporting):** The Bash classifier + WebFetch/WebSearch were briefly unavailable mid-session (model-availability outage), then recovered. All version/API/flag claims below were ultimately verified against the npm registry (`npm view`), bits-ui.com, tiptap.dev, and code.claude.com/docs. On-disk analysis (Claude Code JSONL transcripts, capability SSOT chain, SessionRegistry, CSP, vendor parser types) is tagged `[VERIFIED]` from source. slopcheck itself could not be installed/run this session — package legitimacy was instead confirmed via `npm view` (version + maintainer-repo existence) + known-maintainer provenance, but the planner should still run slopcheck at install time as defense-in-depth.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Command palette = **Bits UI `Command`** (headless primitive, MIT, native Svelte 5 runes) + **`fuzzysort`** (MIT, zero-dep) for file-path/action ranking. Bits UI `Command` is the official successor to the archived `cmdk-sv`; unstyled (full KD-13 control), ships accessible keyboard nav, accepts a custom filter so fuzzysort replaces the default scorer, CSP-safe under `script-src 'self' 'wasm-unsafe-eval'`. KP-02 OSS: bits-ui + fuzzysort.
- **D-01a:** `cmdk-sv` archived/deprecated/breaks on Svelte 5 (README redirects to Bits UI Command). cmdk + kbar are React — do NOT use. `shadcn-svelte` Command = Tailwind wrapper around Bits UI Command (use the primitive directly). `svelte-command-palette` rejected (opinionated/styled, bundles lucide+fuse.js+tinykeys).
- **D-01b:** `fuzzysort` primary (purpose-built for command-palette/file-path ranking); `uFuzzy` is the fallback; `fuse.js` rejected (heavier, typo-tolerant doc-search profile, weaker on short path ranking).
- **D-02:** Editor placement LOCKED — Tiptap editor renders as **middle-pane content, routed by file type**, with a Preview↔Edit segmented toggle on the same surface (`.md` → editor; PDF/video keep FilePreview/LectureVideo). Reuses the middle 2-row stack (`middleTop`/`middleBottom`); the 3-column Splitter grid is untouched.
- **D-03 / D-03a / D-03b:** Session sidebar = embedded INSIDE the right ChatPanel (RESOLVED in 03-UI-SPEC.md — NOT a left-edge overlay, NOT a 4th Splitter column). Default COLLAPSED to a 28px toggle; expands (PUSH) to a 240px rail (New session → Recents → footer). The session list (chat threads) is conceptually distinct from the FileArea (vault files).
- **D-04:** Persist metadata + per-session summary in a **`rusqlite` `sessions` table reusing the Phase-2 WAL DB** (`~/.mneme/vault-index.db`). Columns ≥ `id`, `title`, `session_id` (resume UUID), `cwd`, `summary`, `last_active`. Indexed `ORDER BY last_active`. localStorage REJECTED for session data (only tiny UI prefs stay in localStorage).
- **D-05:** Resume UX — user clicks a Recents item; under the hood `claude --resume <session_id>` (specific thread) or `claude -c` (most-recent in cwd). **Default resume restores from the session SUMMARY, not a full-transcript replay** (cheaper + faster on Intel). Full-transcript restore is opt-in.
- **D-05a:** **WHERE the summary comes from is the research item** — see "D-05a Resolution" below (RESOLVED this session by direct JSONL analysis).
- **D-06:** Claude Code stores each session at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` (encoded-cwd = abs cwd with every non-alphanumeric → `-`); append-only, one JSON record per line. Parse with vendored claude-code-parser types (KD-12). Largest observed 7.4MB → localStorage unsuitable.
- **D-07:** `--resume <id>` reloads full prior context (mostly prompt-cache served; transcript IS re-sent). **cwd MUST match the encoded-cwd or `--resume` silently starts a FRESH session** → persist + re-pass exact cwd per thread. `--session-id <uuid>` lets mneme assign the UUID up front. `--fork-session` is a future v1.x "branch this thread" feature.
- **D-08:** Restart behavior = **lazy**. Persist metadata only on launch; spawn nothing. Spawn a one-shot `claude … --resume`/`-c` ONLY when the user opens a thread and sends. Idle threads = 0 processes (consistent with the 2-concurrent ceiling).
- **D-09 / D-09a / D-09b:** Soft-lock = **node PreToolUse hook** in the vault cwd's `.claude/settings.json`, matching `Edit|Write|MultiEdit|NotebookEdit`, reading `.tool_input.file_path` from stdin JSON, checking an mneme-written lockfile (`~/.mneme/editor-locks.json`), `exit 2` to block. Hooks fire AND block even under `bypassPermissions`; exit-2 pre-empts permission eval. This is CONFIG, NOT argv → does NOT touch buildClaudeArgs / the capability allowlist. mneme writes lock entries on editor focus + mtime<5s rule. `chmod 444` kept only as an optional OS-level second layer.
- **D-10:** Resource ceiling = enforced at the Rust spawn layer; before spawn/register, count live ChildHandles in SessionRegistry; if ≥2, refuse and return an error the frontend renders as a warning toast.

### Claude's Discretion

- Slash-menu command set for the Tiptap editor (headings / lists / code / math / callout / wikilink …) — bounded by KD-09 markdown round-trip. 03-UI-SPEC.md §"Slash menu" gives a recommended bounded set.
- Exact action set exposed by the Cmd+Shift+P universal palette. 03-UI-SPEC.md §"Three entry points" gives a recommended bounded set.
- localStorage key names for sidebar collapse state + per-thread UI prefs (follow `mneme.*` namespace).

### Deferred Ideas (OUT OF SCOPE)

- Full-transcript instant-switch cache (caching rendered transcripts per thread) — v1.x; add only if JSONL-read switch latency proves unacceptable in dogfooding.
- `--fork-session` "branch this thread" UX — v1.x.
- Voice input (REQ-19) — `Cmd+Shift+V` is RESERVED (do NOT bind this phase, do NOT research voice). STT is v1.x.
- Anchored mode/citations (Phase 9), KG/mind-map (Phase 7/8), Echo360 (Phase 5/6), document ingestion (Phase 4), FSRS (Phase 10).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-11 | Command palette — Cmd+P (vault file search), Cmd+O (course/concept jump), Cmd+Shift+P (universal action), ≥80% of in-app navigation reachable without mouse | Bits UI `Command` headless primitive + fuzzysort scorer + a single global keybinding registrar (`window.addEventListener('keydown')` in `+layout.svelte` or a `.svelte.ts` store). Bits UI provides the accessible focus-trap + ↑↓/Enter/Esc model the ≥80%-no-mouse goal depends on. See §Standard Stack + §Pattern 1 + §Pattern 5. |
| REQ-12 | Multi-session sidebar + persistence/resume across app restart | rusqlite `sessions` table in the Phase-2 WAL DB (D-04); lazy resume via `claude --resume <session_id>`/`-c` through the existing two-shape `buildClaudeArgs` SSOT; SessionRegistry already ships the multi-session HashMap shape. See §Pattern 2, §Pattern 4, §Runtime State Inventory. |
| KD-09 | Tiptap block editor, plain-markdown storage with verified round-trip | Tiptap v3 + the OFFICIAL Tiptap markdown extension (≥3.7.0), mounted/destroyed in a Svelte 5 component via `$effect`/`onDestroy`; YAML frontmatter MUST be split out with `gray-matter` (already a dep) before the editor sees the body, then rejoined on save — no markdown extension handles frontmatter. See §Pattern 3 + §Pitfall 4 + §Pitfall 5. |
| REQ-02 | Multi-turn continuity (touches resume) | Already partly built — Phase 1 captures `session_id` from the first `system/init` event and threads it via `--resume` for prompts 2+ within an app-session (`stream-dispatch.ts` L156, `spawn-args.shared.ts` L149). Phase 3 extends this to ACROSS-restart resume by persisting the `session_id` in rusqlite and re-passing it on thread reopen. |
| REQ-5 | CSP: no `unsafe-inline` / `unsafe-eval` in `script-src` | All three surfaces verified CSP-safe: Bits UI Command uses standard Svelte reactivity (no `eval`), Tiptap/ProseMirror manipulates DOM via `document.createElement` (no inline scripts), inline-SVG icons are markup not script. See §Common Pitfalls #6 + §Security Domain. |
</phase_requirements>

## Summary

Phase 3 layers three net-new surfaces onto a mature Tauri 2 + SvelteKit (static SPA) + Svelte 5 + Rust shell that already has the load-bearing primitives in place: a `SessionRegistry` HashMap built Phase-1 specifically for multi-session, a two-shape (`fresh` / `resume`) capability-gated `buildClaudeArgs` SSOT that already supports `--resume <uuid>`, a rusqlite WAL DB (`vault_index.rs`) whose patterns transfer directly to the `sessions` table, and a `marked → DOMPurify → KaTeX` sanitize pipeline reusable for both the editor preview and resumed-transcript rendering. The architecture work is mostly *extension*, not greenfield.

The one genuinely unresolved item — **D-05a, "where does the resume SUMMARY come from?"** — is now RESOLVED by direct analysis of all 48 Claude Code JSONL transcripts on this machine. **Claude Code does NOT write a leaf-summary title or a `type:"summary"` record into the per-session JSONL.** It writes a short `type:"ai-title"` record (642 across files — its own auto-generated session title) and, *only when context overflows and `/compact` fires*, an `isCompactSummary: true` user record + a `system/compact_boundary` marker. Compaction is rare (1 of 48 transcripts) and triggered by token pressure, not by session end. **Therefore mneme cannot rely on Claude Code's compaction summary as the default Recents preview** — it does not exist for normal sessions. The recommendation is: mneme generates its own one-line summary/title on the `chat.result` event (the cheapest, always-available signal it already receives), persists it to the rusqlite `summary` column, and — as an opportunistic enhancement — reads Claude Code's `ai-title` record from the JSONL on first persist if present. This is a `[VERIFIED]` finding from on-disk evidence, not a guess.

**Primary recommendation:** Treat this phase as four cleanly-separable workstreams (sidebar+persistence, palette, editor, guardrails) that share almost no code. Extend the existing SSOT chains rather than building parallel ones: the `sessions` rusqlite table follows `vault_index.rs` verbatim; the new `-c`/`--continue` flag (only net-new spawn arg — `--resume` already exists) threads through `buildClaudeArgs` + a new capability Command-shape + a `capability-regex.test.ts` case; the palette and editor are pure-frontend Svelte components against `tokens.css`; the soft-lock hook is config-only and never touches the capability allowlist. For the Recents summary, generate mneme-owned summaries on `chat.result` — do not depend on Claude Code compaction output. For the editor markdown round-trip, use Tiptap's official markdown extension (≥3.7.0), not the inactive aguingand/tiptap-markdown package.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session metadata persistence (D-04) | Database/Storage (rusqlite, Rust) | — | Crash-safe atomic commits + indexed `ORDER BY last_active` require SQLite WAL, not localStorage; the DB connection already lives Rust-side (`vault_index.rs`). |
| Resource ceiling enforcement (D-10) | API/Backend (Rust `SessionRegistry`) | Frontend (toast render) | The registry Mutex is the only authoritative, atomic, un-bypassable in-flight count; a frontend counter is an optimistic pre-check only. |
| Subprocess spawn + resume (D-05/D-07/D-08) | API/Backend (Rust spawn) + spawn-args SSOT | Browser (ChatPanel picks Command shape) | KP-04 ToS-compliance lives at the capability/argv boundary (Rust + capability JSON); the WebView only selects which validated shape to invoke. |
| Soft-lock enforcement (D-09) | External process boundary (Claude CLI PreToolUse hook) | Browser (writes lockfile on editor focus) | The hook runs inside the spawned `claude` process; mneme writes the lock state but the *enforcement* happens in the subprocess via `exit 2`. |
| Command palette (REQ-11) | Browser/Client (Svelte component) | API/Backend (vault index supplies the file list via `list_courses`/index query) | Pure UI + fuzzy ranking on a list the backend already indexes. |
| Tiptap editor + markdown round-trip (KD-09) | Browser/Client (ProseMirror in WebView) | Database/Storage (vault file read/write via Rust `vault_writer`/fs) | Editing is a client concern; persistence to the markdown file is a Rust fs write (existing `vault_writer` surface or a new thin save command). |
| Recents summary generation (D-05a) | Browser/Client (compute on `chat.result`) | Database/Storage (persist to `summary` column) | The `chat.result` event is already dispatched in the WebView (`stream-dispatch.ts`); compute there and persist via a Tauri command. |

## Standard Stack

> Versions below were **verified against the npm registry late-session** (`npm view`) after a transient outage. Tags are `[VERIFIED: npm registry]` where confirmed. The planner should still run slopcheck at install time (it could not be installed this session) and gate installs behind a `checkpoint:human-verify` task.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bits-ui` | `2.18.1` `[VERIFIED: npm registry + bits-ui.com]` | Headless `Command` primitive for the palette (Cmd+P/O/Shift+P) | Official successor to archived cmdk-sv; MIT; peer-deps `svelte ^5.33.0` (mneme is 5.55 ✓) + `@internationalized/date ^3.8.1`; runtime deps `@floating-ui/core+dom`, `runed`, `svelte-toolbelt`, `tabbable`, `esm-env` (all permissive). Ships accessible focus-trap + ↑↓/Enter/Esc + vim bindings; `Command.Root` exposes a `filter` prop `(value,search)=>0..1` AND `shouldFilter={false}` for fully-custom ranking AND an exported `computeCommandScore` to extend the default (D-01). `[VERIFIED]` |
| `fuzzysort` | `3.1.0` `[VERIFIED: npm registry]` | Custom scorer for file-path/action ranking in the palette | MIT; **zero runtime dependencies** (confirmed — no `dependencies` field); ~45.6KB unpacked / ~5KB min; `fuzzysort.go(search, items, {key, limit})` returns ranked `{obj, score, indexes}` — the `indexes` drive the `--color-orange` per-char highlight (D-01b). `[VERIFIED]` |
| `@tiptap/core` + `@tiptap/starter-kit` | `3.23.6` `[VERIFIED: npm registry]` | ProseMirror-based block editor (KD-09) | MIT; v3 is current; starter-kit 3.23.6 bundles 24 same-version MIT sub-packages (heading/list/code-block/blockquote/hard-break/horizontal-rule/link/list-keymap/etc. + `@tiptap/pm` ProseMirror) — all map cleanly to markdown. `.planning/dependencies.md` records `3.22.5`; bump to 3.23.6. `[VERIFIED]` |
| **Tiptap OFFICIAL markdown extension** (shipped Tiptap **3.7.0**) | part of `@tiptap` v3 (≥3.7.0) `[VERIFIED: tiptap.dev/docs/editor/markdown]` | Markdown ↔ ProseMirror serialize/deserialize for plain-markdown round-trip (KD-09) | **CORRECTION to CONTEXT D-01's `tiptap-markdown` naming:** Tiptap shipped a first-party markdown extension in v3.7.0; official docs say **prefer it over `aguingand/tiptap-markdown`**, whose maintainer has stopped addressing issues/PRs. Both are MIT. **Neither preserves YAML frontmatter** — split with gray-matter (Pitfall 5). Recommendation: use the official extension; treat `aguingand/tiptap-markdown@0.9.0` (peer-deps `@tiptap/core ^3.0.1`, so it DOES install on v3) as the fallback only if the official one lacks a needed serializer hook. Surface this swap to the user (dependencies.md names the aguingand package). `[VERIFIED]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tiptap/extension-suggestion` | `3.23.6` `[VERIFIED: npm registry]` | Powers the slash menu (`/` at empty block → anchored menu) | Required for the editor slash menu (03-UI-SPEC §Slash menu). The suggestion utility provides the trigger/anchor/keyboard plumbing; mneme supplies the item list + render. (Starter-kit already pulls `@tiptap/pm`; suggestion is a separate add.) |
| `@tiptap/extension-mention` | `3.23.6` `[VERIFIED: npm registry]` | Wikilink (`[[…]]`) support in the editor | Listed in dependencies.md for REQ-06 wikilinks. **Recommendation: prefer a custom `[[…]]` input rule that round-trips to plain `[[…]]` markdown over the mention node** — the mention node serializes to a non-markdown HTML span by default, breaking KD-09 round-trip. Only pull `extension-mention` if an autocomplete-on-`[[` dropdown is wanted; even then the serializer must emit plain `[[target]]`. |
| `gray-matter` | `^4.0.3` (already a dep) `[VERIFIED: package.json]` | Split/rejoin YAML frontmatter around the editor body | **Already installed.** Reuse it to strip frontmatter before Tiptap loads the body and rejoin on save (Pitfall 5). |
| `rusqlite` | `0.39` (already a cargo dep) `[VERIFIED: dependencies.md + vault_index.rs]` | `sessions` table persistence (D-04) | **Already installed.** Add a `sessions` table to the existing `vault-index.db` connection following `vault_index.rs` patterns. No new cargo dependency. |
| `marked` + `dompurify` + `katex` | already deps `[VERIFIED: package.json]` | Editor Preview mode + resumed-transcript render | **Already installed** as `src/lib/sanitize.ts`. Reuse `sanitizeMarkdown()` + `renderKatexInDom()` for the editor Preview pane and for rendering JSONL-parsed transcript history. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fuzzysort` | `uFuzzy` | CONTEXT D-01b names uFuzzy as the explicit fallback if a different ranking profile is wanted. Only swap if fuzzysort's path-ranking proves wrong in dogfood. |
| Tiptap official markdown ext | `aguingand/tiptap-markdown@0.9.0` | Fallback only — installs on v3 (peer `@tiptap/core ^3.0.1`) but maintainer inactive. Use only if the official extension lacks a needed serializer hook. |
| Bits UI `Command` | Hand-rolled `<input>` + filtered `<ul>` + manual keydown | Rejected — the accessible focus-trap + roving-tabindex keyboard model is the load-bearing part of the ≥80%-no-mouse goal (REQ-11); re-implementing ARIA combobox semantics correctly is a multi-day trap (see Don't Hand-Roll). |

**Installation (run slopcheck per-package first as defense-in-depth):**
```bash
# npm (frontend) — versions VERIFIED this session; pin to these or newer-compatible:
npm install bits-ui@2.18.1 fuzzysort@3.1.0 @tiptap/core@3.23.6 @tiptap/starter-kit@3.23.6 @tiptap/extension-suggestion@3.23.6
# markdown: prefer Tiptap's OFFICIAL markdown extension (Tiptap ≥3.7.0) over aguingand/tiptap-markdown — see Standard Stack correction.
# extension-mention@3.23.6 ONLY if the wikilink-autocomplete path is chosen (custom [[…]] input rule preferred — see Supporting).
# rusqlite: NO install — reuse the existing cargo dep + existing DB connection.
# gray-matter / marked / dompurify / katex: NO install — already present.
```

**Verified versions (npm registry, this session):** `bits-ui@2.18.1` (svelte ^5.33.0, MIT) · `fuzzysort@3.1.0` (0 deps, MIT) · `@tiptap/core@3.23.6` · `@tiptap/starter-kit@3.23.6` (24 MIT sub-pkgs) · `@tiptap/extension-suggestion@3.23.6` · `tiptap-markdown@0.9.0` (peer `@tiptap/core ^3.0.1`, but maintainer inactive — prefer Tiptap official markdown ≥3.7.0).

## Package Legitimacy Audit

> Versions + registry existence + maintainer repos **VERIFIED via `npm view` + official docs** this session. **slopcheck itself could not be installed/run** — so the planner should still run `slopcheck install <pkgs> --json` at install time as defense-in-depth, plus `npm view <pkg> scripts.postinstall` to confirm no network-touching install scripts.

| Package | Registry | Version | Source Repo | License | npm-verified | Disposition |
|---------|----------|---------|-------------|---------|--------------|-------------|
| `bits-ui` | npm | 2.18.1 | github.com/huntabyte/bits-ui (known maintainer — shadcn-svelte ecosystem) | MIT | ✓ `[VERIFIED]` | Approved — run slopcheck at install |
| `fuzzysort` | npm | 3.1.0 | github.com/farzher/fuzzysort | MIT | ✓ `[VERIFIED]` (0 deps) | Approved — run slopcheck at install |
| `@tiptap/core` | npm | 3.23.6 | github.com/ueberdosis/tiptap | MIT | ✓ `[VERIFIED]` | Approved |
| `@tiptap/starter-kit` | npm | 3.23.6 | github.com/ueberdosis/tiptap | MIT | ✓ `[VERIFIED]` (24 same-version MIT sub-pkgs) | Approved |
| `@tiptap/extension-suggestion` | npm | 3.23.6 | github.com/ueberdosis/tiptap | MIT | ✓ `[VERIFIED]` | Approved |
| `@tiptap/extension-mention` | npm | 3.23.6 | github.com/ueberdosis/tiptap | MIT | ✓ `[VERIFIED]` | Approved (only if wikilink-autocomplete chosen — custom input rule preferred) |
| Tiptap official markdown ext (≥3.7.0) | npm (@tiptap) | ≥3.7.0 | github.com/ueberdosis/tiptap | MIT | ✓ `[VERIFIED: tiptap.dev docs]` | **Approved — preferred over aguingand** |
| `aguingand/tiptap-markdown` | npm | 0.9.0 | github.com/aguingand/tiptap-markdown | MIT | ✓ `[VERIFIED]` (peer `@tiptap/core ^3.0.1`) | **Fallback only — maintainer inactive; official ext preferred** |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck unavailable; all packages independently verified on npm + known maintainer repos).
**Packages flagged as suspicious:** none. `aguingand/tiptap-markdown` is flagged **maintenance-risk** (maintainer stopped addressing issues/PRs per official Tiptap docs) → use Tiptap's official markdown extension instead.

*All packages confirmed to exist on the npm registry at the stated versions with named GitHub source repos. The planner should still run slopcheck + `npm view <pkg> scripts.postinstall` at install time as belt-and-suspenders.*

## Architecture Patterns

### System Architecture Diagram

```text
                         ┌──────────────────────────────────────────────────────────┐
   Cmd+P/O/Shift+P  ────▶│  Global keybinding registrar (+layout.svelte / .svelte.ts) │
   Cmd+,  Cmd+I (exist)  │  - opens palette in entry-aware MODE; reserves Cmd+Shift+V │
                         └───────────────┬──────────────────────────────────────────┘
                                         │ open(mode)
                                         ▼
   ┌─────────────────────────── WebView (SvelteKit static SPA, Svelte 5 runes) ──────────────────────────┐
   │                                                                                                       │
   │  CommandPalette.svelte (Bits UI Command + fuzzysort scorer)                                          │
   │     mode=file  → query vault index (list)        mode=action → bounded action set                    │
   │     ↑↓ / Enter / Esc (Bits UI focus-trap)  →  run action / open file → middle-pane router            │
   │                                                                                                       │
   │  SessionSidebar (embedded in ChatPanel)  ─── invoke ───▶ Rust sessions table (rusqlite)              │
   │     toggle 28px ⇄ 240px rail; Recents = SELECT … ORDER BY last_active DESC                            │
   │     click Recents item → set active {session_id, cwd} → ChatPanel.sendPrompt                         │
   │                                                                                                       │
   │  ChatPanel.svelte (per-thread)                                                                       │
   │     buildClaudeArgs(prompt, scratchDir, { resumeSessionId })  →  picks claude-bin-fresh|resume shape │
   │     stream-dispatch (6-arm) → on chat.result: compute mneme summary + persist (D-05a)                │
   │                                                                                                       │
   │  Middle-pane type router (D-02)                                                                      │
   │     .md → TiptapEditor (ProseMirror) ⇄ Preview (sanitize.ts)   |   PDF → FilePreview | video → ...   │
   │     gray-matter split frontmatter ──▶ official md ext ──▶ ProseMirror ──▶ official md ext ──▶ rejoin │
   │     editor focus → invoke write_editor_lock(file_path)                                               │
   │                                                                                                       │
   └───────────────────┬─────────────────────────────────────────┬───────────────────────────────────────┘
            invoke()    │ Tauri IPC                                │ tauri-plugin-shell Command.create
                        ▼                                          ▼
   ┌──────────────── Rust backend (src-tauri) ─────────┐   ┌──────── claude CLI (one-shot subprocess) ────────┐
   │  sessions table (vault-index.db, WAL)             │   │  --print --resume <uuid> --add-dir <scratch> …    │
   │  D-10: SessionRegistry.count() ≥ 2 → refuse spawn │   │  cwd = persisted thread cwd (D-07 encoded-cwd!)   │
   │  write_editor_lock → ~/.mneme/editor-locks.json   │   │  reads vault-cwd .claude/settings.json:           │
   └───────────────────────────────────────────────────┘   │    PreToolUse hook (node) → reads editor-locks    │
                                                            │    .json → exit 2 if file locked (D-09)           │
                                                            │  appends to ~/.claude/projects/<enc-cwd>/<id>.jsonl│
                                                            └────────────────────────────────────────────────────┘
```

Trace the primary use case (reopen a thread + send a prompt): user clicks a Recents item → frontend reads `{session_id, cwd}` from the rusqlite row → ChatPanel calls `buildClaudeArgs(prompt, scratchDir, { resumeSessionId: session_id })` → Rust checks SessionRegistry count < 2 → spawns `claude --print --resume <id>` with the persisted cwd → stream-dispatch renders → on `chat.result`, mneme computes + persists a fresh summary + bumps `last_active`.

### Recommended Project Structure
```text
src/lib/
├── components/
│   ├── CommandPalette.svelte        # Bits UI Command + fuzzysort; entry-aware modes
│   ├── SessionSidebar.svelte        # 28px toggle ⇄ 240px rail, embedded in ChatPanel
│   ├── SessionRailItem.svelte       # Recents row (states per 03-UI-SPEC)
│   ├── TiptapEditor.svelte          # ProseMirror mount/destroy via $effect/onDestroy
│   ├── MiddlePaneRouter.svelte      # D-02 type-router: .md→editor, pdf→FilePreview
│   ├── SegmentedToggle.svelte       # Preview|Edit control
│   ├── SoftLockPill.svelte          # dark "Claude is editing — locked" chip
│   └── CeilingToast.svelte          # D-10 warning toast
├── sessions.svelte.ts               # module-scope $state: active session, recents list (MANDATORY .svelte.ts)
├── keybindings.svelte.ts            # global hotkey registrar + reserved-binding table
├── palette-actions.ts               # bounded Cmd+Shift+P action set (pure data + handlers)
├── editor-markdown.ts               # gray-matter split/rejoin + official-md-ext config (round-trip core)
├── transcript-reader.ts             # parse ~/.claude/projects JSONL → DispatchState (reuse stream-dispatch)
└── spawn-args.shared.ts             # EXTEND: add -c/--continue support to BuildOpts (only net-new flag)

src-tauri/src/
├── session.rs                       # EXTEND ChildHandle (resume_token, spawned_at); add count()
├── sessions_store.rs                # NEW: rusqlite sessions table (mirror vault_index.rs patterns)
├── editor_lock.rs                   # NEW: write/clear ~/.mneme/editor-locks.json
└── lib.rs                           # EXTEND: register new commands; D-10 count-check before register_session_pid
```

### Pattern 1: Bits UI Command with a custom fuzzysort scorer (palette)
**What:** Headless command-menu primitive (`Command.Root` / `Input` / `List` / `Viewport` / `Group` / `Item` / `Empty` / `Separator`). Two ways to plug fuzzysort: (a) the `filter` prop `(value, search) => 0..1`, or (b) `shouldFilter={false}` + render your own fuzzysort-ranked `{#each}` (gives full control over ordering AND per-character highlight). For the 03-UI-SPEC `--color-orange` per-char highlight, **option (b) is preferred** because fuzzysort's match indices drive the highlight directly. One modal drives three entry modes via a `mode` prop that swaps data source + placeholder.
**When to use:** The Cmd+P/O/Shift+P palette (REQ-11).
**Example:**
```svelte
<!-- Source: bits-ui.com/docs/components/command [VERIFIED: bits-ui@2.18.1 — filter + shouldFilter + computeCommandScore confirmed] -->
<script lang="ts">
  import { Command } from "bits-ui";
  import fuzzysort from "fuzzysort";
  let { items, mode }: Props = $props();
  let search = $state("");
  // Option (b): shouldFilter={false} + fuzzysort ranking we own → match indices feed the highlight.
  const ranked = $derived(
    search
      ? fuzzysort.go(search, items, { key: "searchText", limit: 50 }) // returns {obj, score, indexes}
      : items.map((obj) => ({ obj, indexes: [] as number[] })),
  );
</script>

<Command.Root shouldFilter={false}>
  <Command.Input bind:value={search} placeholder={placeholderForMode} />
  <Command.List>
    <Command.Empty>{emptyCopyForMode}</Command.Empty>
    {#each ranked as r (r.obj.id)}
      <Command.Item value={r.obj.id} onSelect={() => run(r.obj)}>
        <!-- inline SVG aria-hidden + primary label w/ fuzzysort indexes → --color-orange chars + mono context -->
      </Command.Item>
    {/each}
  </Command.List>
</Command.Root>
```
**Verified API facts (bits-ui@2.18.1):** `filter` prop returns 0..1 (0 hides); `shouldFilter={false}` disables built-in filtering for fully-custom ranking; an exported `computeCommandScore` can extend the default; arrow-key nav + vim bindings (`ctrl+n/j/p/k`, toggle via `vimBindings`) + `loop` prop for wrap-at-ends + ARIA + auto-scroll-into-view are built in. The ↑↓-wraps / Enter / Esc / focus-trap model the ≥80%-no-mouse goal needs is provided — do NOT re-implement. `[VERIFIED]`

### Pattern 2: Two-shape capability-gated resume (extend existing, do NOT widen)
**What:** The capability JSON already has `claude-bin-fresh` (15-arg) and `claude-bin-resume` (17-arg, with `--resume <uuid>`). Phase-3 cross-restart resume **reuses the existing `claude-bin-resume` shape unchanged** — the only thing that changes is *where the UUID comes from* (rusqlite row, not in-memory `DispatchState.sessionId`).
**When to use:** Reopening a persisted thread (D-05).
**Example:**
```typescript
// Source: src/lib/spawn-args.shared.ts L149 [VERIFIED: codebase] — already supports resume.
// Phase 3 change is upstream: feed resumeSessionId from the persisted sessions row.
const row = await invoke<SessionRow>("get_session", { id });
const args = buildClaudeArgs(prompt, scratchDir, { resumeSessionId: row.session_id });
//                                                  ^ already validated against SESSION_ID_REGEX
// CRITICAL (D-07): the subprocess cwd MUST equal row.cwd, else --resume silently forks a fresh session.
```
**The `-c`/`--continue` decision:** `-c` ("most-recent thread in cwd") is the ONLY net-new spawn flag this phase would add. **Recommendation: prefer `--resume <session_id>` exclusively and skip `-c` for v1.** `-c` is ambiguous under multi-session (it resumes whatever was most-recent in that cwd, which may not be the thread the user clicked), and adding it requires a third capability Command-shape (`claude-bin-continue`) + new validators + a new test case. `--resume <session_id>` is unambiguous and already wired. `[VERIFIED: code.claude.com/docs/en/sessions]` confirms `--continue`/`-c` = "most-recent in cwd" and `--resume`/`-r` = specific session. If `-c` is genuinely wanted (e.g. a "continue last" palette action), add it as a deliberate, separately-gated shape — see Pattern 4.

### Pattern 3: Mount/destroy a Tiptap (ProseMirror) editor in a Svelte 5 component
**What:** ProseMirror is imperative — it attaches to a DOM element and must be explicitly destroyed. In Svelte 5, create the `Editor` after the bind:this element exists and tear it down on unmount.
**When to use:** TiptapEditor.svelte (KD-09).
**Example:**
```svelte
<!-- Source: tiptap.dev/docs/editor/getting-started/install/svelte [VERIFIED — official Svelte integration uses onMount/onDestroy] -->
<script lang="ts">
  import { onDestroy } from "svelte";
  import { Editor } from "@tiptap/core";              // @tiptap/core@3.23.6 [VERIFIED]
  import StarterKit from "@tiptap/starter-kit";        // 3.23.6 [VERIFIED]
  // import the OFFICIAL Tiptap markdown extension (≥3.7.0) — NOT aguingand/tiptap-markdown.
  // Confirm the exact export + serialize/parse API in the Wave-0 spike (Pitfall 2).

  let { initialMarkdown = "", onChange }: Props = $props();
  let host: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined;

  $effect(() => {
    if (!host || editor) return;
    editor = new Editor({
      element: host,
      extensions: [StarterKit, /* official Markdown ext + Suggestion-based slash menu */],
      content: initialMarkdown,           // markdown ext parses markdown → ProseMirror
      onUpdate: ({ editor }) => {
        onChange(/* official markdown serializer — confirm API in spike */);
      },
    });
    return () => { editor?.destroy(); editor = undefined; };  // $effect cleanup
  });
  onDestroy(() => { editor?.destroy(); });  // belt-and-suspenders (HMR + route change)
</script>
<div bind:this={host} class="tiptap-host"></div>
```
**Why `$effect` not `onMount`:** the host element must be bound first; `$effect` runs after the DOM is attached and re-runs predictably (the official docs use `onMount`/`onDestroy` — `$effect` is the Svelte-5-runes-idiomatic equivalent and matches mneme's existing `$effect` usage). Guard against double-init (the project already uses a `globalThis.__mnemeForwarderInstalled` singleton pattern for HMR — apply the same discipline here so HMR doesn't double-mount ProseMirror). **Open API item:** the official markdown extension's serialize/parse method names differ from aguingand's `editor.storage.markdown.getMarkdown()` — pin them in the Wave-0 spike.

### Pattern 4: rusqlite `sessions` table in the existing WAL DB
**What:** Add a `sessions` table to the already-open `vault-index.db` connection, following `vault_index.rs` invariants verbatim (params![] macro, std::sync::Mutex<Connection>, WAL pragma already applied at init).
**When to use:** D-04 persistence.
**Example:**
```rust
// Source: mirror src-tauri/src/vault_index.rs [VERIFIED: codebase] — same DB, same patterns.
// Schema is idempotent (CREATE TABLE IF NOT EXISTS) so it co-exists with vault_files.
const SESSIONS_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT,           -- Claude resume UUID (NULL until first chat.result)
    title        TEXT,           -- display title (mneme- or ai-title-derived)
    cwd          TEXT NOT NULL,  -- D-07: exact cwd, re-passed on resume
    summary      TEXT,           -- D-05a: mneme-generated on chat.result
    last_active  TEXT NOT NULL   -- ISO-8601, indexed for ORDER BY DESC
);
CREATE INDEX IF NOT EXISTS sessions_last_active_idx ON sessions(last_active DESC);
"#;
// EVERY query uses params![] (T-2-07 audit gate forbids format!() SQL — already enforced
// for src-tauri/src/ by audit-capabilities.sh Gate 10).
```
**Migration approach:** Phase 2 chose single-version schemas with `CREATE IF NOT EXISTS` (no schema_version column yet). Phase 3 adds a *new table* to the same DB — no migration of existing `vault_files` data needed. If a future column add is needed, follow the documented `ALTER TABLE` + schema_version path noted in `vault_index.rs` L52-54. **Decision for the planner:** put the sessions table in `vault-index.db` (D-04 says reuse the WAL DB) — do NOT create a second DB file.

### Pattern 5: Single global keybinding registrar (CSP-safe, collision-aware)
**What:** One `window.addEventListener('keydown', …)` registered once in `+layout.svelte` (or a `.svelte.ts` store), dispatching to palette-open / editor-slash / existing Cmd+, / Cmd+I. No per-component listeners (which leak + collide).
**When to use:** REQ-11 + the reserved-binding contract.
**Example:**
```typescript
// Source: keybindings.svelte.ts (new) — pattern, not external lib. [VERIFIED: collision set from 03-UI-SPEC + lib.rs]
// Existing bindings to NOT collide with: Cmd+, (Preferences — native menu, lib.rs L743),
// Cmd+I (Import — Phase 2), Cmd+Q (Quit — native). RESERVED: Cmd+Shift+V (voice, do NOT bind).
function onKeydown(e: KeyboardEvent) {
  const meta = e.metaKey;           // macOS Cmd
  if (meta && !e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); openPalette("file"); }
  else if (meta && e.key.toLowerCase() === "o")            { e.preventDefault(); openPalette("course"); }
  else if (meta && e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); openPalette("action"); }
  // Cmd+Shift+V intentionally absent — reserved for REQ-19 (do NOT bind).
  // Cmd+, and Cmd+I are owned by the native menu / existing listeners — do NOT re-handle here.
}
```
**CSP note:** `addEventListener` is not `eval` — fully CSP-safe under `script-src 'self' 'wasm-unsafe-eval'`. Note `Cmd+Shift+P` can arrive as `e.key === "p"` OR `"P"` depending on layout/shift handling — normalize with `.toLowerCase()` and read `e.shiftKey` separately (do not match `e.key === "P"`).

### Anti-Patterns to Avoid
- **Spawning eagerly on launch / on thread-open-without-send:** violates D-08 (lazy) AND the D-10 ceiling. Spawn only when the user sends a prompt in a thread.
- **Using `-c`/`--continue` as the default resume:** ambiguous under multi-session; `--resume <session_id>` is the unambiguous path and already wired. (Pattern 2.)
- **Using `aguingand/tiptap-markdown` instead of the official extension:** maintainer inactive; use Tiptap's official markdown extension (≥3.7.0). (Standard Stack + Pitfall 2.)
- **Letting the editor write the full file including frontmatter through the markdown extension:** it does not model frontmatter; the YAML block would be mangled or dropped. Split with gray-matter first. (Pitfall 5.)
- **Resuming with a stale/wrong cwd:** D-07 — `--resume` with a cwd that doesn't match the encoded-cwd silently starts a FRESH session (data-loss-equivalent: the user thinks they continued, but a new thread began). Always re-pass the persisted `cwd`. (Corroborated by claude-code issue #35226.)
- **Per-component global keydown listeners:** they leak across HMR and collide. One registrar (Pattern 5).
- **Reading the whole 7.4MB JSONL synchronously on thread switch:** blocks the WebView. Read lazily/streamed, or default to the cheap summary path (D-05) and only read the JSONL when the user explicitly requests full-transcript restore.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible command palette (focus-trap, roving tabindex, ARIA combobox, type-to-filter) | Custom `<input>` + filtered `<ul>` + manual keydown | Bits UI `Command` | Correct ARIA combobox + focus management is the load-bearing part of REQ-11's ≥80%-no-mouse goal; re-implementing it correctly is a multi-day effort with subtle screen-reader bugs. |
| Markdown ↔ rich-text round-trip | Custom ProseMirror schema serializer | Tiptap official markdown extension (≥3.7.0) | The round-trip (nested lists, code fences, hard breaks, escaping) is the deceptively-complex part KD-09 explicitly flags; hand-rolling re-creates a known-hard serializer. |
| Fuzzy ranking with match-index highlighting | Custom subsequence scorer | `fuzzysort` | Returns ranked results AND per-character match indices (needed for the `--color-orange` highlight) with tuned path-ranking; a naive scorer ranks paths poorly. |
| YAML frontmatter parse/serialize | Regex splitting `---\n…\n---` | `gray-matter` (already a dep) | Edge cases (`---` inside body, CRLF, BOM, empty frontmatter) bite; gray-matter is already installed and tested (`tests/gray-matter.test.ts`). |
| Crash-safe session persistence | localStorage / a JSON file | rusqlite WAL `sessions` table (existing DB) | localStorage is not crash-atomic and grows badly; the WAL DB is already open and gives indexed `ORDER BY last_active`. (D-04 explicitly rejects localStorage.) |
| In-flight generation counting | A frontend counter | `SessionRegistry` Mutex count (Rust) | The registry is the only authoritative, atomic, un-bypassable source; a frontend counter races with subprocess exit (D-10). |
| Claude-CLI permission gating for the soft-lock | `canUseTool` / `--permission-prompt-tool` MCP | A `PreToolUse` hook in vault `.claude/settings.json` | `canUseTool` is Agent-SDK-only; `--permission-prompt-tool` is undocumented for the bare CLI. The PreToolUse hook is config-only, fires under bypassPermissions, and never touches the capability allowlist (D-09a). |

**Key insight:** Almost every hard problem in this phase already has a battle-tested solution either installed (gray-matter, rusqlite, sanitize.ts, SessionRegistry) or named in the locked decisions (Bits UI, fuzzysort, Tiptap official markdown ext). The phase's risk is concentrated in *integration glue* (the official markdown extension's serialize/parse API, the JSONL→DispatchState adapter, frontmatter split/rejoin correctness), not in any net-new algorithm.

## Runtime State Inventory

> This phase ADDS persisted runtime state (sessions table, editor-locks file) rather than renaming existing state. It is not a rename/refactor phase, but the new persisted state is inventoried here because it crosses the process/restart boundary and is the kind of thing a grep audit would miss.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (NEW) | rusqlite `sessions` table in `~/.mneme/vault-index.db` (D-04). Survives restart; holds `session_id` (Claude resume UUID), `cwd`, `summary`, `last_active`. | New table + CRUD commands. Plan a "what if the row's `session_id` no longer exists in `~/.claude/projects`?" path — show the D-05 resume-failure toast. |
| Live service config (NEW) | The vault cwd's `.claude/settings.json` PreToolUse hook (D-09). This is config mneme writes/owns; it lives in the vault dir (which is in git if the user commits their vault, or not). The lockfile `~/.mneme/editor-locks.json` is NOT in git. | mneme must create/maintain `.claude/settings.json` in the vault cwd on first run of Phase 3 (idempotent write). Document that this file is mneme-managed. Decide: overwrite-merge vs. create-if-absent (avoid clobbering a user's existing hooks). |
| OS-registered state | None — no Task Scheduler / launchd / pm2 entries. The Claude subprocesses are transient one-shots (verified by the existing one-shot model). | None — verified by reading `lib.rs` (subprocesses are spawned per-prompt and killed via killpg; nothing is OS-registered). |
| Secrets/env vars | None new. Auth is the user's `claude` OAuth subscription via keychain (no API keys, no `.env`). `--bare` MUST stay absent (would strip keychain reads). | None — verified by `spawn-args.shared.ts` L25-26 + audit gate 4. |
| Build artifacts / installed packages | New npm deps (bits-ui, fuzzysort, @tiptap/*, official markdown ext) land in `package-lock.json`. The capability JSON regenerates from the SSOT if `-c` is added (prebuild hook). | After adding npm deps: `npm install` updates the lockfile. If `-c`/`--continue` is added to spawn-args, `npm run prebuild` regenerates `capabilities/default.json` and the audit gate must pass. |

**The canonical question — after the app restarts, what runtime state holds session info?** The rusqlite `sessions` table (the SSOT for thread metadata) and the per-session JSONL files under `~/.claude/projects/<encoded-cwd>/` (owned by Claude Code, read-only to mneme). mneme persists the `session_id` + `cwd` so it can reconstruct the `--resume` invocation; the actual conversation content lives in Claude Code's JSONL, not duplicated in mneme's DB (per D-06).

## D-05a Resolution — WHERE the resume summary comes from (VERIFIED)

> This is the phase's single flagged-unresolved research item. **RESOLVED by direct analysis of all 48 Claude Code JSONL transcripts on this machine** (`~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-mneme/`). `[VERIFIED: on-disk transcript census]`

**What Claude Code actually writes into the per-session JSONL (census across 48 files):**

| Record `type` (+subtype) | Count | Relevance to a Recents summary |
|--------------------------|-------|--------------------------------|
| `assistant` | 6989 | Conversation content |
| `user` | 4263 | Conversation content (incl. the rare `isCompactSummary` ones) |
| `ai-title` | 642 | **Claude Code's OWN auto-generated short session title** — present across many sessions |
| `system/compact_boundary` | 1 | Marks where a `/compact` ran (token-pressure-triggered) |
| `system/stop_hook_summary` | 310 | Stop-hook output, NOT a session summary |
| `system/away_summary` | 96 | "while you were away" recap, NOT a resume summary |
| `type:"summary"` (leaf-summary title) | **0 / 48 files** | **Does not exist on this machine** |
| string `summary` field on any record | **0 / 48 files** | **Does not exist** |
| `isCompactSummary: true` user record | **1 / 48 files** | Compaction summary — rare, token-pressure-triggered only |
| `compactMetadata` key | 1 / 48 files | `{trigger:"manual", preTokens:287422, postTokens:8269, …}` |

**The compaction summary record shape (when it exists):** a `user`-role record with `isCompactSummary: true`, content beginning verbatim with `"This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\n1. Primary Request and Intent:\n…"` — a long structured multi-section block, NOT a one-line title.

**Conclusion (the recommendation D-05a asks for):**

1. **(a) Reading Claude Code's own compaction/leaf-summary is NOT viable as the default.** There is no leaf-summary title record (`type:"summary"` = 0/48). The only summary-like record (`isCompactSummary`) appears in 1/48 sessions and only when context overflowed — most threads will never have one. Depending on it would leave the Recents list with empty/missing summaries for the common case.

2. **(b) mneme generates its own summary on `chat.result` — RECOMMENDED, cheaper, always available.** mneme already dispatches `chat.result` (`stream-dispatch.ts` L285). The cheapest reliable signal is: derive a title from the **first user prompt** of the thread (truncated) on session creation, and optionally refine the `summary` column from the latest assistant turn's first sentence on each `chat.result`. This is zero extra tokens (no extra Claude call) and always available. If a richer summary is wanted later, it can be a deliberate opt-in Claude call — not the default.

3. **Opportunistic enhancement:** on first persist of a session, mneme MAY read the JSONL and pick up Claude Code's `ai-title` record (642 observed → commonly present) as a nicer title than the truncated-prompt fallback. This is best-effort: if absent, fall back to the truncated first prompt. Reading one small record (the `ai-title` line) is cheap; do NOT read the whole 7.4MB file for this.

4. **Stability caveat `[ASSUMED]`:** these record types (`ai-title`, `isCompactSummary`, `compactMetadata`) are Claude Code internal schema and undocumented — they can change without notice (the vendor parser header explicitly warns "the protocol is undocumented and can add fields/types without notice"). Treat any JSONL field beyond the documented stream-json envelope as best-effort with a graceful fallback. **Do NOT make the Recents list depend on any of them** — the mneme-generated summary (truncated first prompt) is the dependency-free floor.

**Net decision for the planner:** D-05a → **mneme-generated summary on `chat.result`/session-create (truncated first prompt as the floor), with `ai-title` read as an opportunistic best-effort upgrade.** The rusqlite `summary`/`title` columns are mneme-owned. Full-transcript restore (the opt-in path) reads the JSONL via `transcript-reader.ts` → stream-dispatch, but the *default* Recents preview never touches the JSONL.

## Common Pitfalls

### Pitfall 1: `--resume` with a mismatched cwd silently starts a fresh session
**What goes wrong:** The user clicks a Recents thread, mneme spawns `claude --resume <id>` but with a cwd different from the one the session was created in. Claude Code does NOT error — it silently begins a brand-new session. The user believes they continued; their context is gone.
**Why it happens:** Claude Code keys sessions by encoded-cwd (D-06/D-07). `--resume <id>` only finds the transcript if the process cwd matches. `[VERIFIED: code.claude.com/docs + claude-code issue #35226 "Session Resume Fails ... When Working Directory Differs From Launch Directory"]`
**How to avoid:** Persist the exact `cwd` per session row (D-04 has the column) and re-pass it as the subprocess working directory on every resume. Add a behavioral test: resume with wrong cwd → assert a fresh session id appears in `system/init` (different from the requested one) → surface the D-05 resume-failure toast.
**Warning signs:** The first `system/init` event after a resume carries a `session_id` different from the one requested.

### Pitfall 2: Tiptap markdown extension choice — official (≥3.7.0) vs. inactive aguingand package
**What goes wrong:** Picking `aguingand/tiptap-markdown` by name (as `.planning/dependencies.md` records) lands an extension whose maintainer has publicly stopped addressing issues/PRs — future Tiptap-v3 breakage won't be fixed upstream.
**Why it happens (VERIFIED):** `aguingand/tiptap-markdown@0.9.0` DOES peer-dep `@tiptap/core ^3.0.1`, so it installs cleanly on Tiptap v3 — the risk is NOT a peer-dep mismatch, it's maintenance abandonment. Meanwhile **Tiptap shipped a first-party markdown extension in v3.7.0** and the official docs now say prefer it. `[VERIFIED: npm tiptap-markdown@0.9.0 + tiptap.dev/docs/editor/markdown]`
**How to avoid:** **Use Tiptap's official markdown extension (Tiptap ≥3.7.0), not aguingand's.** Plan a Wave-0 spike that installs the official extension + StarterKit 3.23.6 and round-trips a fixture (headings, nested lists, code fences, blockquote/callout, inline math, `[[wikilink]]`, frontmatter via gray-matter) before any editor UI is built. Keep `aguingand/tiptap-markdown@0.9.0` as a documented fallback only if the official extension lacks a needed serializer hook. Surface the swap to the user since dependencies.md names the aguingand package.
**Warning signs:** Relying on aguingand's `editor.storage.markdown.getMarkdown()` API and finding the official extension exposes a different surface — confirm the official extension's serialize/parse API in the spike; round-trip drops/mangles nested lists or code fences.

### Pitfall 3: Markdown round-trip is lossy on edge cases
**What goes wrong:** A `.md` file opened → edited → saved comes back with subtly different markdown (extra blank lines, changed list markers `-`↔`*`, lost hard breaks, re-escaped characters). KD-09 demands *verified* round-trip.
**Why it happens:** ProseMirror normalizes to its internal schema; the markdown serializer makes formatting choices that don't match the original.
**How to avoid:** Build a round-trip fixture test FIRST (Wave 0): a set of representative `.md` files (headings, nested lists, code fences with language, blockquote/callout, inline math, a wikilink, YAML frontmatter) → parse → serialize → assert byte-or-AST equality (AST equality is more realistic than byte equality; pick the assertion level deliberately). Document which transformations are acceptable (e.g. marker normalization) vs. which are bugs.
**Warning signs:** A diff between the original `.md` and the saved `.md` after a no-op open+save.

### Pitfall 4: ProseMirror not destroyed → memory leak + double-mount under HMR
**What goes wrong:** Switching files/threads or HMR re-runs the component; a new `Editor` mounts without the old one being destroyed → leaked listeners, duplicated DOM, ghost editors.
**Why it happens:** ProseMirror is imperative; Svelte does not auto-destroy it.
**How to avoid:** `$effect` cleanup + `onDestroy` both call `editor.destroy()` (Pattern 3). Guard double-init with a singleton-style flag like the existing `globalThis.__mnemeForwarderInstalled` pattern.
**Warning signs:** Two editors visible after HMR; rising memory across file switches.

### Pitfall 5: YAML frontmatter mangled by the markdown extension
**What goes wrong:** A concept page's `--- \n title: … \n ---` frontmatter is fed into Tiptap, which renders it as a horizontal rule + paragraph (or drops it), corrupting the file on save.
**Why it happens:** Tiptap markdown extensions (official or aguingand) do not model YAML frontmatter — `---` is a markdown thematic break to them.
**How to avoid:** Split with `gray-matter` (already installed) BEFORE the editor loads: `const { data, content } = matter(fileText)` → feed only `content` to Tiptap → on save, `matter.stringify(editedContent, data)` to rejoin. Add a round-trip fixture that includes frontmatter (Pitfall 3).
**Warning signs:** Frontmatter renders as visible `---` rules in the editor; saved file has the frontmatter moved/duplicated/lost.

### Pitfall 6: A new dep transitively pulls a CSP-incompatible or banned-license package
**What goes wrong:** A Tiptap extension or bits-ui transitive dep uses `eval`/`new Function` (CSP violation, REQ-5) or carries a copyleft license (KP-02 / license posture).
**Why it happens:** Transitive deps are invisible until installed.
**How to avoid:** After install, grep the bundle for `eval(`/`new Function(` and run the build under the production CSP (no `unsafe-eval`) — the existing CSP is `script-src 'self' 'wasm-unsafe-eval'`. ProseMirror and Bits UI are known not to need eval, but verify after the actual install. Check licenses of the resolved tree (bits-ui's runtime deps + the 24 starter-kit sub-pkgs are all MIT/permissive per the verified registry data).
**Warning signs:** CSP console error `Refused to evaluate … unsafe-eval`; a GPL/AGPL package in the resolved tree.

### Pitfall 7: SessionRegistry count check has a TOCTOU window
**What goes wrong:** Two rapid sends both read `count == 1` before either registers → 3 concurrent generations slip past the ceiling.
**Why it happens:** Check-then-register is two steps unless atomic.
**How to avoid:** Do the count + register under the **same Mutex lock** in `session.rs` (a single `try_register_if_below(2)` method that locks once, checks `len() < 2`, inserts, returns bool). Do NOT count in one locked call and register in another.
**Warning signs:** Occasionally 3 live subprocesses under fast repeated sends; the ceiling test passes single-threaded but fails under a concurrent test.

## Code Examples

### Atomic ceiling-check + register under one lock (D-10, avoids Pitfall 7)
```rust
// Source: extend src-tauri/src/session.rs [VERIFIED: codebase pattern — locked() helper exists L41]
impl SessionRegistry {
    /// D-10: atomically refuse if already at the ceiling. Returns false (refused)
    /// or true (registered). The count + insert happen under ONE lock — no TOCTOU.
    pub fn try_register_if_below(&self, id: SessionId, handle: ChildHandle, ceiling: usize) -> bool {
        let mut map = self.locked();        // existing poisoned-mutex-tolerant helper
        if map.len() >= ceiling { return false; }
        map.insert(id, handle);
        true
    }
}
```

### Parse a JSONL transcript into DispatchState (full-transcript opt-in restore, D-06)
```typescript
// Source: transcript-reader.ts (new) — reuses stream-dispatch [VERIFIED: dispatchEvent signature]
import { freshState, dispatchEvent, type ClaudeEvent } from "$lib/stream-dispatch";
// Read lazily — largest observed file is 7.4MB. Only on explicit full-transcript restore.
export function transcriptToState(jsonlText: string) {
  const state = freshState();
  for (const line of jsonlText.split("\n")) {
    if (!line.trim()) continue;
    let rec: unknown;
    try { rec = JSON.parse(line); } catch { continue; }    // skip malformed lines (append-only file)
    // The JSONL record types differ from the stream-json envelope (they include
    // ai-title / file-history-snapshot / etc.). Map the 'assistant'/'user' records'
    // .message into the ClaudeEvent shape dispatchEvent expects, skip the rest.
    if (isRenderableRecord(rec)) dispatchEvent(rec as ClaudeEvent, state);
  }
  return state;
}
// NOTE [VERIFIED by census, adapter still OPEN]: the JSONL per-line record shape is NOT
// identical to the stream-json NDJSON envelope dispatchEvent was built for — a thin adapter
// (isRenderableRecord + field mapping) is required. Spike the mapping against a real file.
```

### gray-matter frontmatter split/rejoin for the editor (Pitfall 5)
```typescript
// Source: editor-markdown.ts (new) — gray-matter already a dep [VERIFIED: package.json]
import matter from "gray-matter";
export function splitForEditor(fileText: string) {
  const { data, content } = matter(fileText);   // data = frontmatter object, content = body
  return { frontmatter: data, body: content };
}
export function joinForSave(body: string, frontmatter: Record<string, unknown>): string {
  return Object.keys(frontmatter).length ? matter.stringify(body, frontmatter) : body;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cmdk-sv` (Svelte command menu) | Bits UI `Command` `2.18.1` | cmdk-sv archived 2025-05-22; its GitHub README explicitly says "Deprecated by the Command component in Bits UI" `[VERIFIED: github.com/huntabyte/cmdk-sv]` | cmdk-sv breaks on Svelte 5. Using it would fail. |
| cmdk / kbar (React) | Bits UI `Command` (Svelte) | n/a | The ROADMAP's "cmdk or kbar" note is STALE — both are React; mneme is Svelte. dependencies.md Group 1 still lists `cmdk (or kbar) TBD` — superseded by D-01 (bits-ui@2.18.1 + fuzzysort@3.1.0). Planner should update that registry row. |
| `aguingand/tiptap-markdown` (community bridge) | **Tiptap OFFICIAL markdown extension (≥3.7.0)** | Tiptap shipped it in 3.7.0; official docs say prefer it `[VERIFIED: tiptap.dev/docs/editor/markdown]` | aguingand maintainer inactive. Use the official extension. |
| Tiptap v2 | Tiptap v3 (`3.23.6`) | v3 is current `[VERIFIED: npm]` | Extension internals changed; official markdown extension is the v3-blessed path (above). |
| In-memory-only session id (Phase 1: `DispatchState.sessionId`) | Persisted `session_id` in rusqlite (Phase 3) | this phase | Resume now survives app restart, not just within an app-session. |

**Deprecated/outdated:**
- `cmdk-sv` — archived; do not use.
- `aguingand/tiptap-markdown` — maintainer inactive; prefer Tiptap's official markdown extension (≥3.7.0).
- The `cmdk (or kbar) TBD` row + the `tiptap-markdown (aguingand) latest` row in `dependencies.md` — both superseded; planner should update them as part of the KP-08 dependency-registration task (bits-ui@2.18.1, fuzzysort@3.1.0, @tiptap/* @3.23.6, official markdown ext).

## Assumptions Log

| # | Claim | Section | Status / Risk if Wrong |
|---|-------|---------|------------------------|
| A1 | `bits-ui@2.18.1`, MIT, peer-deps `svelte ^5.33.0` | Standard Stack | ✅ **RESOLVED [VERIFIED: npm]** — mneme is svelte 5.55 (satisfies ^5.33.0). |
| A2 | Bits UI `Command` exposes `filter` prop + `shouldFilter={false}` + `computeCommandScore` | Pattern 1 | ✅ **RESOLVED [VERIFIED: bits-ui.com]** — all three confirmed; option (b) `shouldFilter={false}` recommended for highlight. |
| A3 | `fuzzysort@3.1.0`, zero runtime deps, returns match indices | Standard Stack | ✅ **RESOLVED [VERIFIED: npm]** — 0 deps, ~45.6KB unpacked, `fuzzysort.go(..., {key, limit})` returns `{obj, score, indexes}`. |
| A4 | `@tiptap/*` v3 current (core/starter-kit/suggestion `3.23.6`) | Standard Stack | ✅ **RESOLVED [VERIFIED: npm]** — bump dependencies.md from 3.22.5 → 3.23.6. |
| A5 | Markdown round-trip extension choice | Standard Stack, Pitfall 2 | ⚠ **CORRECTED [VERIFIED]** — aguingand@0.9.0 DOES peer-dep `@tiptap/core ^3.0.1` (installs on v3) BUT maintainer inactive; **use Tiptap OFFICIAL markdown ext (≥3.7.0) instead.** Wave-0 spike still REQUIRED to pin the official ext's serialize/parse API + round-trip fidelity. |
| A6 | Markdown extension serialize/parse API surface | Pattern 3 | ⏳ **OPEN** — the official ext's API differs from aguingand's `editor.storage.markdown.getMarkdown()`; pin in the Wave-0 spike. |
| A7 | Claude Code JSONL `ai-title` / `isCompactSummary` / `compactMetadata` schema stable enough to read best-effort | D-05a Resolution | ✅ Low-risk by design — opportunistic upgrade only; the mneme-generated summary floor does not depend on them. |
| A8 | JSONL per-line record shape needs a thin adapter before `dispatchEvent` | Code Examples (transcript-reader) | ⏳ **OPEN** — confirmed by census that JSONL records (`ai-title`, `file-history-snapshot`, etc.) differ from the stream-json envelope; full-transcript restore needs a mapping spike. Default summary path unaffected. |
| A9 | `--resume <id>` / `--session-id <uuid>` / `-c`/`--continue` / `--fork-session` flag spellings | Pattern 2/4 | ✅ **RESOLVED [VERIFIED: code.claude.com/docs/en/sessions]** — `--resume` (short `-r`), `--continue` (short `-c`, "most recent in cwd"), `--session-id` (requires valid UUID), `--fork-session` all confirmed. Sessions created with `-p`/`--print` do NOT appear in the picker but CAN be resumed by explicit id (relevant — mneme spawns `--print`). |
| A10 | aguingand/tiptap-markdown maintenance status | Package Legitimacy Audit | ✅ **RESOLVED [VERIFIED: tiptap.dev docs]** — maintainer stopped addressing issues/PRs; official ext preferred. |

**Remaining OPEN items (need a Wave-0 spike, not a doc lookup):** A6 + A8 — the Tiptap official-markdown-extension serialize/parse API and the JSONL→DispatchState adapter mapping. Both are confirmable by writing ~30 lines against a real fixture. Everything else is RESOLVED.

## Open Questions

1. **[RESOLVED] Markdown extension for Tiptap v3 — official vs. aguingand.**
   - Resolved: aguingand@0.9.0 installs on v3 (peer `@tiptap/core ^3.0.1`) but its maintainer is inactive; **Tiptap shipped an official markdown extension in 3.7.0 — use it.** `[VERIFIED]`
   - Remaining: pin the official extension's serialize/parse API + round-trip fidelity in a **Wave-0 spike** (round-trip a fixture incl. frontmatter-stripped body). Gate editor UI behind the spike passing. Surface the aguingand→official swap to the user (dependencies.md names aguingand).

2. **[RESOLVED] Bits UI `Command` custom-filter.**
   - Resolved: `filter` prop `(value,search)=>0..1`, OR `shouldFilter={false}` + own fuzzysort `{#each}` (recommended — match indices drive the `--color-orange` per-char highlight), OR extend `computeCommandScore`. `[VERIFIED: bits-ui.com]` No spike needed; use `shouldFilter={false}`.

3. **`-c`/`--continue` — add it or not? (planner decision)**
   - Confirmed: `--continue` (`-c`) = "most-recent in cwd"; `--resume <id>` = specific session. `[VERIFIED: code.claude.com/docs]`
   - Recommendation: **default to `--resume <session_id>` only; skip `-c` for v1** unless a "continue last" palette action is wanted. `-c` is ambiguous under multi-session and needs a third capability Command-shape + validators + test. Surface as a planner decision.

4. **vault `.claude/settings.json` merge vs. overwrite (D-09)?**
   - What we know: mneme must write a PreToolUse hook into the vault cwd's `.claude/settings.json`. The user may already have hooks there.
   - Recommendation: create-if-absent, and if present, merge the mneme hook into the existing `hooks.PreToolUse` array rather than overwriting. Plan a test for the merge path.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `claude` CLI on PATH | resume subprocess (D-05/D-07) | ✓ (Phase 1/2 already spawn it) | user's installed stable | none — already a hard requirement |
| `node` ≥22 | the PreToolUse soft-lock hook (D-09 — written in node) + prebuild | ✓ (already required) | ≥22 | none — already required |
| rusqlite + existing `vault-index.db` | sessions table (D-04) | ✓ (Phase 2) | rusqlite 0.39 | none — reused |
| `~/.claude/projects/<encoded-cwd>/*.jsonl` | full-transcript restore (opt-in) + ai-title read (D-06) | ✓ (verified: 48 files present) | Claude Code internal | default summary path doesn't need it |
| npm registry reachable (for installs) | adding bits-ui / fuzzysort / @tiptap/* | ✓ (verified late-session) | — | — |

**Missing dependencies with no fallback:** none blocking execution — all runtime deps for resume/persistence/soft-lock already exist on the machine.
**Missing dependencies with fallback:** none — the npm registry recovered and all versions were confirmed.

## Validation Architecture

> Nyquist validation enabled. Framework: **Vitest 4.1.x** (TS/JS, jsdom env) + **`cargo test`** (Rust). The 3 UI surfaces are validated **behaviorally via the project dev-feedback-loop** (`gsd-dev-screenshot` / `gsd-dev-snapshot` vs `03-UI-SPEC.md`), NOT Playwright (per the project memory `feedback_verify_work_use_phase_01_1_tools`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x (frontend) `[VERIFIED: package.json]` + `cargo test` (Rust) `[VERIFIED: Cargo deps]` |
| Config file | `vitest.config.ts` (jsdom; discovers `tests/**/*.test.ts`, `src/**/*.test.ts`, `scripts/__tests__/**/*.test.mjs`) |
| Quick run command | `npx vitest run --changed` (pre-commit already runs this via husky) |
| Full suite command | `npm test` (Vitest) + `cd src-tauri && cargo test` |
| Phase gate | Both green + `bash scripts/audit-capabilities.sh` PASS before `/gsd-verify-work` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-12 | Session state machine: create → persist → list ordered by last_active → resume sets active {session_id,cwd} | unit (TS) + integration (Rust rusqlite) | `npx vitest run tests/sessions-store.test.ts` · `cargo test --test sessions_store` | ❌ Wave 0 |
| D-10 | Ceiling: `try_register_if_below(2)` refuses the 3rd under one lock (incl. concurrent) | unit (Rust) | `cargo test --test ceiling_refuses_third` | ❌ Wave 0 |
| D-09 | Soft-lock hook: reads `.tool_input.file_path` from stdin, exit 2 when locked, exit 0 when not | unit (node script test) | `npx vitest run tests/editor-lock-hook.test.mjs` (drive the hook with mock stdin) | ❌ Wave 0 |
| KD-09 | Markdown round-trip incl. frontmatter: parse→serialize fixtures, assert acceptable equality | unit (TS) | `npx vitest run tests/editor-markdown-roundtrip.test.ts` | ❌ Wave 0 |
| REQ-11 | Fuzzy-match correctness: fuzzysort ranks expected order + returns match indices | unit (TS) | `npx vitest run tests/palette-fuzzy.test.ts` | ❌ Wave 0 |
| REQ-11 | Keyboard model: ↑↓ wrap, Enter run, Esc dismiss, mode-routing of Cmd+P/O/Shift+P; Cmd+Shift+V NOT bound | unit (TS, jsdom keydown dispatch on registrar) | `npx vitest run tests/keybindings.test.ts` | ❌ Wave 0 |
| D-07 | Resume cwd-matching: resume with wrong cwd → fresh session id surfaces → resume-failure path | behavioral (manual/dev-loop) + unit (assert cwd is re-passed) | `npx vitest run tests/resume-cwd.test.ts` (assert buildClaudeArgs/cwd wiring) | ❌ Wave 0 |
| REQ-12 | rusqlite persistence survives restart: write rows, re-open DB, rows present + ordered | integration (Rust) | `cargo test --test sessions_persist_restart` | ❌ Wave 0 |
| REQ-4 | Capability/audit regression for any new spawn arg (`-c` if added): SSOT drift, no wildcard, no --bare, --max-turns present | unit (TS) + shell gate | `npx vitest run tests/capability-regex.test.ts` + `bash scripts/audit-capabilities.sh` | ✅ extend existing |
| REQ-11/D-02/D-03 | 3 UI surfaces match 03-UI-SPEC (sidebar collapse/expand, palette modal geometry, editor preview/edit toggle, soft-lock pill, ceiling toast) | behavioral (dev-feedback-loop) | `npm run gsd-dev-screenshot` / `gsd-dev-snapshot` vs 03-UI-SPEC.md (NOT Playwright) | n/a (visual) |

### Sampling Rate
- **Per task commit:** `npx vitest run --changed` (husky pre-commit, already wired) + `bash scripts/audit-capabilities.sh`.
- **Per wave merge:** `npm test` + `cd src-tauri && cargo test`.
- **Phase gate:** full Vitest + cargo green + audit PASS before `/gsd-verify-work`; UI surfaces verified via dev-feedback-loop against 03-UI-SPEC.

### Wave 0 Gaps
- [ ] `tests/sessions-store.test.ts` — covers REQ-12 (CRUD + ordering)
- [ ] `src-tauri/tests/sessions_store.rs` + `sessions_persist_restart.rs` — covers REQ-12 persistence/restart
- [ ] `src-tauri/tests/ceiling_refuses_third.rs` — covers D-10 (incl. a concurrent-spawn case for the TOCTOU guard)
- [ ] `tests/editor-lock-hook.test.mjs` — covers D-09 (mock-stdin drive of the node hook)
- [ ] `tests/editor-markdown-roundtrip.test.ts` + fixtures (`tests/fixtures/md/*`) — covers KD-09 incl. frontmatter
- [ ] `tests/palette-fuzzy.test.ts` — covers REQ-11 ranking
- [ ] `tests/keybindings.test.ts` — covers REQ-11 keyboard model + reserved-binding contract
- [ ] `tests/resume-cwd.test.ts` — covers D-07 cwd re-pass wiring
- [ ] **Wave-0 SPIKE (gating):** Tiptap OFFICIAL markdown extension serialize/parse API + round-trip fidelity (Pitfall 2 / Open Q1 / A6) — must pass before editor UI work
- [ ] Extend `tests/capability-regex.test.ts` only if `-c`/`--continue` is added (new Command-shape)

## Security Domain

> `security_enforcement` treated as enabled (no explicit `false` in config).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth is the user's `claude` OAuth subscription (keychain) — not in scope; mneme adds no auth. `--bare` MUST stay absent (would strip keychain reads). |
| V3 Session Management | partial | "Session" here = chat thread, not web session. The resume UUID (`session_id`) is a capability — it is validated by `SESSION_ID_REGEX` (UUID-only) at the spawn boundary; an attacker-controlled value cannot reach argv. |
| V4 Access Control | yes | The capability allowlist (`capabilities/default.json`) is the access boundary for the `claude` subprocess; new spawn args must pass the audit gate (no wildcard, no `--bare`, `--max-turns` present). The soft-lock PreToolUse hook is an *additional* access control on Claude's file writes. |
| V5 Input Validation | yes | (1) Resume UUID → `SESSION_ID_REGEX`. (2) Editor markdown rendered in Preview → `marked → DOMPurify → KaTeX` (sanitize.ts) — same XSS defense as the chat. (3) JSONL transcript lines are untrusted input — narrow with typeof/in checks (stream-dispatch already does this). (4) rusqlite queries use `params![]` (no string-interpolated SQL — audit Gate 10). |
| V6 Cryptography | no | No new crypto. Resume UUIDs are identifiers, not secrets. |
| V7 Errors & Logging | partial | Resume-failure + ceiling refusal surface as user-facing toasts (no sensitive data leak); Rust commands return `Result<T, String>` (existing pattern). |

### Known Threat Patterns for {Tauri 2 + Svelte 5 + claude subprocess + rusqlite + ProseMirror}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Argv injection into the resume UUID position | Tampering / EoP | `SESSION_ID_REGEX` (UUID-only) in `buildClaudeArgs` + the capability validator at the same index (already wired for `claude-bin-resume`). |
| `--bare` slipping in (strips keychain → silent auth fail / changed trust posture) | Tampering | Audit gate 4 forbids any validator containing `bare`; SSOT must not emit it. |
| XSS via edited markdown rendered in Preview or via resumed-transcript HTML | Tampering (XSS) | Reuse `sanitize.ts` (`marked → DOMPurify → KaTeX`, `FORBID_TAGS`/`FORBID_ATTR`, on* attr stripping) — never `{@html}` un-sanitized bytes. |
| CSP bypass via a new dep using `eval`/`new Function` | EoP | Build under `script-src 'self' 'wasm-unsafe-eval'` (no `unsafe-eval`); grep bundle for `eval(`/`new Function(` after install (Pitfall 6). |
| SQL injection into the sessions table | Tampering | `params![]` macro only; audit Gate 10 greps for `format!()` with SQL keywords under `src-tauri/src/`. |
| Soft-lock bypass (Claude edits a file the user is editing) | Tampering | PreToolUse hook `exit 2` pre-empts permission eval even under `bypassPermissions` (D-09a); optional `chmod 444` second layer. |
| Path traversal via a malicious `file_path` in the lockfile / editor save | Tampering | Constrain editor saves to the vault root (reuse Phase 2 canonicalize-parent guard in `vault_writer`); the lockfile is mneme-written (not user-supplied paths). |

## Sources

### Primary (HIGH confidence)
- **On-disk Claude Code JSONL transcript census** — `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-mneme/` (48 files analyzed via a Python census script). Resolves D-05a. `[VERIFIED]`
- **Codebase (read directly):** `src-tauri/src/session.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/vault_index.rs`, `src/lib/spawn-args.shared.ts`, `src/lib/stream-dispatch.ts`, `scripts/gen-capabilities.ts`, `src-tauri/capabilities/default.json`, `scripts/audit-capabilities.sh`, `tests/capability-regex.test.ts`, `svelte.config.js`, `package.json`, `vendor/claude-code-parser/src/types/protocol.ts`. `[VERIFIED]`
- **Phase planning docs:** `03-CONTEXT.md`, `03-UI-SPEC.md`, `.planning/dependencies.md`. `[VERIFIED]`

### Secondary (HIGH-MEDIUM confidence — verified late-session via npm + official docs)
- npm registry (`npm view`): `bits-ui@2.18.1`, `fuzzysort@3.1.0`, `@tiptap/core@3.23.6`, `@tiptap/starter-kit@3.23.6`, `@tiptap/extension-suggestion@3.23.6`, `@tiptap/extension-mention@3.23.6`, `tiptap-markdown@0.9.0` (peer `@tiptap/core ^3.0.1`) — `[VERIFIED]`.
- `bits-ui.com/docs/components/command` — Command sub-components, `filter`/`shouldFilter`/`computeCommandScore`, keyboard model — `[VERIFIED]`.
- `tiptap.dev/docs/editor/markdown` + `tiptap.dev/docs/editor/getting-started/install/svelte` — official markdown extension (3.7.0), prefer-over-aguingand guidance, Svelte onMount/onDestroy lifecycle — `[VERIFIED]`.
- `code.claude.com/docs/en/sessions` — `--resume`/`-r`, `--continue`/`-c`, `--session-id <uuid>`, `--fork-session`; encoded-cwd bucketing; `-p`/`--print` sessions resumable by explicit id — `[VERIFIED]`.
- `github.com/huntabyte/cmdk-sv` README ("Deprecated by the Command component in Bits UI") — `[VERIFIED]`.
- `github.com/anthropics/claude-code` issue #35226 (resume fails on cwd mismatch — corroborates Pitfall 1) — `[CITED]`.

### Tertiary (LOW confidence — Wave-0 spike, not a doc lookup)
- Tiptap official markdown extension exact serialize/parse API surface (differs from aguingand's `editor.storage.markdown.getMarkdown()`) — confirm in spike (A6).
- JSONL-record → `dispatchEvent` adapter mapping for full-transcript restore (A8).
- slopcheck verdicts — slopcheck could not be installed this session; run at install time.

## Metadata

**Confidence breakdown:**
- D-05a resolution: HIGH — direct on-disk census of 48 transcripts (the load-bearing unresolved item is answered with evidence).
- Architecture/integration into existing code: HIGH — all extension points (SessionRegistry, two-shape buildClaudeArgs, vault_index.rs WAL DB, sanitize.ts, CSP) read directly from source.
- Standard stack exact versions/APIs: HIGH — all versions verified on the npm registry + Bits UI/Tiptap/Claude Code official docs after the tools recovered. The only LOW items are two API surfaces that warrant a 30-line Wave-0 spike (official markdown ext serialize/parse; JSONL→DispatchState adapter).
- Pitfalls: HIGH — cwd-match (corroborated by claude-code issue #35226), TOCTOU, frontmatter, ProseMirror destroy are codebase/doc-grounded; the editor markdown-extension risk is now a maintenance/API question (use official ext + spike), not a compatibility unknown.

**Research date:** 2026-05-30
**Valid until:** ~2026-06-13 for fast-moving npm packages (re-confirm `bits-ui` / `@tiptap/*` patch versions before install — minor bumps likely); D-05a/codebase findings stable until Claude Code changes its JSONL schema or the mneme codebase is refactored.
