# Phase 3: Multi-Session + Command Palette + Editor - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 adds the power-user workflow layer on top of the working single-session shell (Phase 1) + vault/onboarding (Phase 2):

1. **Multi-session** — multiple parallel Claude chat threads, listed in a collapsible sidebar; spawn / switch / rename / close; threads survive app restart (REQ-12).
2. **Command palette** — keyboard-first navigation: Cmd+P fuzzy-searches vault files, Cmd+O jumps to course/concept, Cmd+Shift+P universal action palette; ≥80% of in-app navigation reachable without mouse (REQ-11).
3. **Tiptap block editor** — concept/markdown pages edited with a slash menu; saves to plain markdown with verified round-trip integrity (KD-09).

Plus two guardrails:
- **Soft-lock** — Claude's Edit/Write refuses a file the user is actively editing (active editor lock) or that was just written (mtime < 5s).
- **Resource ceiling** — max 2 concurrent in-flight `claude` generations on Intel Mac; 3rd attempt shows a warning instead of spawning.

**Not in this phase:** anchored mode / citations (Phase 9), KG/mind-map (Phase 7/8), Echo360 (Phase 5/6), document ingestion (Phase 4), FSRS review (Phase 10).
</domain>

<decisions>
## Implementation Decisions

### Command palette technology (REQ-11)
- **D-01:** Build the palette with **Bits UI `Command`** (headless primitive, MIT, native Svelte 5 runes) + **`fuzzysort`** (MIT, zero-dep) for file-path / action ranking. Bits UI `Command` is the *official successor* to the now-archived `cmdk-sv`; it is unstyled (full KD-13 visual control), ships accessible keyboard nav (load-bearing for the ≥80%-no-mouse goal), accepts a custom filter so fuzzysort replaces its default scorer, and uses standard Svelte reactivity → **CSP-safe** under `script-src 'self' 'wasm-unsafe-eval'` (no inline scripts). KP-02 OSS sources named: bits-ui + fuzzysort.
- **D-01a (verified, load-bearing):** `cmdk-sv` is **archived (2025-05-22), deprecated, breaks on Svelte 5** — its README redirects to Bits UI `Command`. The ROADMAP OSS note ("cmdk or kbar") is **stale**: both cmdk and kbar are React. Do NOT use them. `shadcn-svelte` Command is just a Tailwind-styled wrapper around Bits UI `Command` (strip the styling → use the primitive directly). `svelte-command-palette` is opinionated/styled (fights KD-13) and bundles lucide+fuse.js+tinykeys.
- **D-01b:** Fuzzy lib choice — `fuzzysort` primary (purpose-built for command-palette/file-path ranking, ~5kb [UNVERIFIED exact gzip]); `uFuzzy` is the fallback if a different ranking profile is wanted. `fuse.js` rejected (heavier ~8kb, tuned for typo-tolerant doc search, weaker on short path ranking).

### Layout — where sidebar + editor live (net-new surfaces, no locked visual yet)
- **D-02:** **Editor placement LOCKED** — Tiptap editor renders as **middle-pane content, routed by file type**, with a **preview↔edit toggle** on the same surface (open a `.md` → editor; PDF/video keep the existing preview/LectureVideo). Reuses the existing middle 2-row stack (`middleTop`/`middleBottom` snippets); the 3-column Splitter grid is untouched. Document lands center (where NotebookLM/Obsidian both put it), chat stays right.
- **D-03:** **Session sidebar form LOCKED, exact dock deferred to UI-phase** — collapsible, **default COLLAPSED**, modeled on the **Claude desktop app sidebar** (user-provided screenshot, 2026-05-30): a ☰ hamburger toggle expands a panel with `New chat`/`New session` at top + a `Recents` list of chat sessions + a footer (user + status). Adopt the collapse-to-toggle behavior + Recents list + footer; mneme drops the Claude-specific Chat/Cowork/Code tabs + Projects/Artifacts/Customize nav.
- **D-03a (UI-phase decision):** The exact dock — **left-edge slide-out overlay** (default collapsed so it does NOT permanently restructure the 3-column grid; far-left FileArea = vault files stays put) **vs.** an in-right-ChatPanel rail — is to be locked in `/gsd-ui-phase 3` with real mockups, using the user's Claude-desktop screenshot as the visual anchor. Claude's current read: a left-edge collapsible OVERLAY (does not add a 4th Splitter column; keeps "files left vs sessions toggle" as two distinct lists) — confirm visually in UI-phase.
- **D-03b:** Hard distinction to preserve — the **session list (chat threads)** is conceptually separate from the existing **FileArea (vault files)**. The two "list" surfaces must not blur. Reject the VS-Code activity-bar/4th-column approach (rewrites Splitter ratio math + WR-05 normalize invariant, reads as "IDE clone" which the project explicitly rejects) unless Phase 5+ adds ≥2 more left-side lists.

### Session persistence & resume (REQ-12)
- **D-04:** **Persist metadata + a per-session summary** in a **`rusqlite` `sessions` table** (reuse the Phase 2 WAL DB — crash-safe atomic commits, indexed `ORDER BY last_active` for the Recents/palette list, no new dependency). Columns at least: `id`, `title`, `session_id` (resume UUID), `cwd` (the `--add-dir`/working-dir scope), `summary`, `last_active`. **localStorage is rejected** for this (transcripts/threads grow large; only crash-NON-atomic store — keep localStorage for tiny UI prefs like `mneme.layout.split` only).
- **D-05:** **Resume UX** — visually the user clicks a session in `Recents`; under the hood mneme runs `claude --resume <session_id>` (specific thread) or `claude -c` (most-recent thread in cwd). **Default resume restores from the session SUMMARY, not a full-transcript replay** (cheaper tokens + faster on Intel). Full-transcript restore is the non-default / opt-in path.
- **D-05a (research item for plan-phase):** WHERE the summary comes from — Claude Code's own compaction/leaf summary vs an mneme-generated summary on `chat.result` — is unresolved. Research in `/gsd-plan-phase 3`. If full history is ever needed, read Claude Code's own append-only transcript (see D-06) rather than duplicating storage.
- **D-06 (verified, load-bearing):** Claude Code stores each session as `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` where **encoded-cwd = the absolute cwd with every non-alphanumeric char replaced by `-`**; append-only, one file per session, each line a self-describing record (`type`, `sessionId`, `timestamp`, `message`, `cwd`, `gitBranch`, `parentUuid`; `assistant` records carry a `usage` block). Verified on this machine (45 `.jsonl` in the mneme project dir, largest **7.4MB** → confirms localStorage unsuitable). Parse with the already-vendored `claude-code-parser` types (KD-12).
- **D-07 (verified):** `--resume <id>` reloads full prior context (mostly served from prompt cache — `cache_read_input_tokens` observed — but the transcript IS re-sent; expect non-trivial first-turn input on long threads). **`cwd` must match the encoded-cwd or `--resume` silently starts a FRESH session** → mneme must persist + re-pass the exact cwd/`--add-dir` scope per thread (this is why `cwd` is in the metadata). `--session-id <uuid>` lets mneme *assign* the UUID up front (cleaner than capturing it from the first `system/init` event). `--fork-session` exists for a future "branch this thread" feature (v1.x).
- **D-08:** **Restart behavior = lazy.** Persist metadata only on launch; spawn nothing. Spawn a one-shot `claude … --resume`/`-c` ONLY when the user opens a thread and sends a prompt. This is strongly implied by the 2-concurrent ceiling (idle threads = 0 processes) and the locked one-shot subprocess model — eager respawn is rejected (no warm state to keep; would violate the ceiling on launch).

### Soft-lock + resource ceiling
- **D-09:** **Soft-lock = PreToolUse hook + dynamic lock file.** Ship a `.claude/settings.json` in the vault cwd (which the subprocess inherits) with a `PreToolUse` hook matching `Edit|Write|MultiEdit|NotebookEdit`; the hook reads `.tool_input.file_path` from stdin JSON, checks it against an mneme-written lock file (e.g. `~/.mneme/editor-locks.json`), and **`exit 2`** (or emits a `permissionDecision: deny`) when locked. **Write the hook in node** (project already requires Node ≥22; macOS may lack `jq`).
- **D-09a (verified, load-bearing):** Claude Code **hooks fire AND can block even under `--permission-mode bypassPermissions`** (bypass skips interactive prompts, NOT hooks). A hook exiting code 2 **stops the tool call BEFORE permission rules/mode are evaluated**. This is Anthropic's own "block edits to protected files" example. Needs **no change to `buildClaudeArgs` / the capability allowlist** (the hook is config, not argv) → KP-04 ToS-compliance + real-CLI contract untouched.
- **D-09b:** mneme owns the lock state — it writes/clears lock entries on editor focus (active-editor lock) and computes the mtime<5s rule, writing both into the lock file; the hook stays a dumb, fast lock-file lookup. Rejected alternatives: `canUseTool` (Agent-SDK-only, mneme spawns the plain CLI via tauri-plugin-shell), `--permission-prompt-tool` MCP (undocumented for the bare CLI). `chmod 444` (reusing the `_source/` pattern) is kept only as an optional OS-level **second layer** under the hook — too coarse/racy for a transient 5s lock as the primary.
- **D-10:** **Resource ceiling enforced at the Rust spawn layer** — before spawn/`register_session_pid`, count live `ChildHandle`s in the `SessionRegistry` `Mutex<HashMap<…>>`; if `>= 2`, refuse and return an error the frontend renders as a warning toast. The registry is the only authoritative, atomic (under its Mutex), un-bypassable source of in-flight count. A frontend counter is at best an optimistic pre-check.

### Claude's Discretion
- Slash-menu command set for the Tiptap editor (headings / lists / code / math / callout / wikilink …) — bounded by KD-09 markdown-storage round-trip; planner/UI-phase to specify.
- Exact action set exposed by the Cmd+Shift+P universal palette.
- localStorage key names for sidebar collapse state + per-thread UI prefs (follow `mneme.*` namespace).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & roadmap
- `.planning/REQUIREMENTS.md` — REQ-11 (command palette Cmd+P/O/Shift+P), REQ-12 (multi-session sidebar). REQ-02 multi-turn continuity note (`--resume` from `system/init`).
- `.planning/ROADMAP.md` §"Phase 3" — goal + 5 success criteria + OSS adoption note (note: the cmdk/kbar suggestion is STALE per D-01a).
- `.planning/PROJECT.md` — KD-09 (Tiptap block editor, markdown storage), KD-13 (visual aesthetic), KP-01 (local-first), KP-02 (≥50% OSS), KP-04 (compliant subprocess), KP-08 (OSS dep tracking), KP-09 (Anthropic/Claude aesthetic).

### Visual aesthetic (LOCKED — do not improvise palette/fonts/motion)
- `.planning/references/design/` — KP-09 + KD-13 SSOT (colors `#d97757`/`#faf9f5`/`#141413`/`#2b2a27`, serif body NO Arial/Inter, motion `cubic-bezier(0.165,0.85,0.45,1)`, soft 8% borders).
- `/Users/qinyuan/Downloads/Mneme 3/Mneme.html` — three-pane shell visual SSOT (L94-160 used by `+page.svelte`). **No existing HTML for sidebar/palette/editor → these are net-new (UI-phase produces the contract).**
- **User-provided reference (2026-05-30):** Claude desktop app sidebar screenshot (collapsed narrow state with ☰ toggle; expanded = `New chat` + `Recents` session list + user/status footer). Visual anchor for D-03; re-surface in `/gsd-ui-phase 3`.

### Implementation blueprint & spike findings
- `.claude/skills/spike-findings-mneme/SKILL.md` — subprocess MUSTs, stream-json model, KD-13 color anchors.
- `vendor/claude-code-parser/src/types/protocol.ts` — `ClaudeEvent` types (KD-12, type-only) for reading Claude Code JSONL transcripts (D-06).

### External docs (verified during research)
- Bits UI `Command` — https://bits-ui.com (headless command primitive, Svelte 5, MIT).
- fuzzysort — https://github.com/farzher/fuzzysort (MIT).
- Tiptap v3 + `tiptap-markdown` — https://github.com/aguingand/tiptap-markdown (MIT, per ROADMAP OSS note + KD-09).
- Claude Code hooks / permissions — https://code.claude.com/docs/en/hooks · /permissions · /agent-sdk/permissions (D-09a evidence: hooks block under bypassPermissions; exit-2 pre-empts permission eval).

### Dependency registry (KP-08)
- `.planning/dependencies.md` — plan-phase MUST register new deps: `bits-ui`, `fuzzysort`, `@tiptap/*` v3 (starter-kit + extension-mention + extension-suggestion), `tiptap-markdown`.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/session.rs` — `SessionRegistry` (`Mutex<HashMap<SessionId, ChildHandle>>`) was built Phase-1 with the multi-session HashMap shape ready. `ChildHandle` has a documented `// Phase 3 will add: resume_token: Option<String>, spawned_at: Instant` extension point. `register`/`drain_one`/`drain_all`/`kill_all` exist — counting live handles for the D-10 ceiling is a natural extension.
- `src/lib/spawn-args.shared.ts` — `buildClaudeArgs(prompt, scratchDir)` SSOT. New flags (`--resume`, `--session-id`, `-c`/`--continue`) MUST be added here + to `ARG_VALIDATORS` in `scripts/gen-capabilities.ts` (positional order) + `npm run prebuild` + a `tests/capability-regex.test.ts` case + audit pass (per STRUCTURE.md "New CLI argv flag").
- `src/lib/stream-dispatch.ts` — 6-arm stream-json router + `DispatchState`/`freshState()`. Reuse for rendering resumed-thread history records parsed from JSONL.
- `src/lib/sanitize.ts` — marked→DOMPurify→KaTeX pipeline; reuse to render stored transcript records.
- `src/routes/+page.svelte` — three-pane shell. Splitter snippets: `left` (FileArea), `middleTop` (LectureVideo), `middleBottom` (FilePreview — D-02 routes editor here), `right` (ChatPanel — D-03 candidate dock), `bottom` (MindMapBar). Modals/overlays mount at template root (outside `.window` because `.window` has `overflow:hidden`). Titlebar has a 70px `.titlebar-spacer` near the traffic lights — natural home for a ☰ session toggle (D-03).
- Phase 2 `config.rs` atomic temp+rename pattern + rusqlite WAL `vault_index.rs` — reuse for D-04 session persistence.

### Established Patterns
- **Per-prompt one-shot subprocess** — each prompt spawns `claude --print … --resume <id>` that exits on `result`; connection-state stays "connected" across per-prompt closes (Phase 1 A-16). A "session" = a logical thread (resume token + transcript), NOT a running process → "2 concurrent" = 2 in-flight generations.
- **Capability SSOT + audit gate** — any new argv must pass `scripts/audit-capabilities.sh` (no wildcards, no `--bare`, `--max-turns` present). The soft-lock hook (D-09) is config, NOT argv → does not touch this surface.
- **Mouse-first interaction paradigm** — Phase 2 D-13 kept keyboard to narrow exceptions (Cmd+I was the 5th). REQ-11's palette deliberately EXPANDS keyboard surface to ≥80%; plan-phase should define the Phase-3 keyboard-nav contract (see deferred backlog seed below).
- `mneme.*` localStorage namespace; `*.svelte.ts` suffix mandatory for module-scope `$state`; components carry a "Visual SSOT" header comment.

### Integration Points
- Session sidebar ↔ ChatPanel: switching threads must swap the active `session_id` + cwd that `ChatPanel` passes to `buildClaudeArgs`.
- Editor ↔ FilePreview slot: middle-bottom becomes a type-router (PDF→FilePreview, `.md`→Tiptap editor) with preview↔edit toggle (D-02).
- Soft-lock: editor focus + post-write events (frontend/Rust) → write `~/.mneme/editor-locks.json` → node PreToolUse hook in vault `.claude/settings.json` reads it (D-09).
- Ceiling: spawn path in `lib.rs` / `ChatPanel` → `SessionRegistry` count check → frontend toast (D-10).
</code_context>

<specifics>
## Specific Ideas

- **"Like Claude desktop" (user, 2026-05-30):** the multi-session sidebar should DEFAULT TO COLLAPSED and expand via a ☰ toggle into a Claude-desktop-style panel — `New chat` at top, a `Recents` vertical list of session titles, a footer with the user + status. This is the concrete visual reference for D-03 / D-03a; the user attached a screenshot of the Claude desktop sidebar (both collapsed-narrow and expanded states).
- **"默认从 summary 恢复" (user):** resuming a session should default to reconstructing from a SUMMARY (cheap), not replaying the full transcript — visually the user just picks a thread from Recents; the `--resume`/`-c` mechanics are hidden (D-05).
</specifics>

<deferred>
## Deferred Ideas

- **Full-transcript instant-switch cache** — caching rendered transcripts per thread for instant switching of very large threads. Deferred to v1.x; add only if read-from-JSONL switch latency proves unacceptable in dogfooding (D-04/D-05).
- **`--fork-session` "branch this thread"** — Claude Code supports forking a session; a "branch from here" UX is a v1.x candidate (D-07).
- **Voice input (REQ-19)** — `Cmd+Shift+V` STT must coexist with the REQ-11 palette without hotkey conflict; not this phase, but the keyboard-nav contract here should reserve the binding.

### Reviewed Todos (not folded)
Reviewed in `cross_reference_todos` (15 matched on weak keyword overlap), none folded — all belong to other phases:
- `2026-05-09-auto-collapse-pdf-and-video-panes-when-no-file-or-video-selected` (score 0.7) — pane auto-collapse behavior; closer to a general layout/Phase-8 polish, not multi-session/palette/editor scope.
- `2026-05-09-built-in-pdf-editor-claude-code-direct-edit-annotate` (score 0.6) — PDF editing; Phase 3's editor is markdown (Tiptap), not PDF. Separate capability.
- Remaining 13 (caption-bilingual→Phase 6, voice-input→REQ-19 v1.x, whiteboard→v2, fsrs→Phase 10, onboarding→Phase 2 done, external-import, cross-project handoff, agentshield, workflow-sync, thea-eval, free-mode-source→Phase 9, KD-13 triage) are clearly other-phase or non-phase.
</deferred>

---

*Phase: 3-Multi-Session + Command Palette + Editor*
*Context gathered: 2026-05-30*
