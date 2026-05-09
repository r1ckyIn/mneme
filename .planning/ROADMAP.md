# mneme Roadmap

> Personal desktop learning app — Tauri 2 shell wrapping local Claude Code, AI-native knowledge graph, FSRS-6 review, Echo360 lecture video. Granularity: **fine** (config.json). Mode: **interactive**.

**Coverage:** 18/18 v1 + v1.x requirements mapped to phases. v2+ items flagged separately.

**Driving constraints:**
- KP-02 (50% open-source rule) — every phase introducing a feature names its OSS adoption/adaptation source.
- KP-04 (compliant subprocess wrapping) — phases 1, 6, 9 carry explicit ToS-compliance criteria.
- **KP-09 + KD-13 (Anthropic/Claude visual aesthetic family — added 2026-05-07)** — every UI-bearing phase (1, 2, 3, 6, 8, 9, 10) inherits the locked color tokens / typography rules / motion curve / soft-separation rules from KD-13; full spec lives in `.planning/references/design/` (do NOT improvise UI palette / fonts / shadows).
- Solo-dev anti-abandonment (PITFALLS Pitfall 10) — phases 1-4 are dogfoodable shipping milestones; differentiator phases (7-10) are explicitly back-loaded so the user is using the app in real S1 2026 coursework before the ambitious AI-native layer.

---

## Layer Architecture (foundation-first interpretation, 2026-05-07)

> Per the Core Value re-framing in PROJECT.md (5-dimension structure), the 11 phases below are NOT equal — they sort into 3 layers. Phase numbers and `Depends on` edges remain authoritative; this section adds a **second axis (layer)** so any planner can see at a glance whether a delay is killing foundation or just a feature bet.

### Layer 1 — Foundation (locks the invariants ALL application phases assume)

| Phase | Anchors which KP / KD / REQ |
|---|---|
| **Phase 0** Identity & Branding Lock | Naming + bundle ID are irreversible — touches every downstream artifact |
| **Phase 1** Tauri Shell + Subprocess Hardening | KD-01 / 02 / 03 stack lock + KP-04 compliant subprocess |
| **Phase 2** Vault + Canvas/Ed Sync + Onboarding | REQ-06 vault structure + KP-01 local-first |
| **Phase 5.5** KG Memory Project Survey + Dogfood | KD-10 library lock — gates Phase 7 (RQ-01 BLOCKING) |
| **Phase 7** Knowledge Graph + Three-Tier Memory | REQ-07 + KP-03 AI-native data + **KP-07 proactive contextual recall** ("懂我" experience) |

### Layer 2 — Application (replaceable feature bets atop foundation)

| Phase | What we lose if cut / replanned |
|---|---|
| **Phase 3** Multi-Session + Command Palette + Editor | Power-user UX polish; app stays single-session, mouse-driven |
| **Phase 4** Document Ingestion (Marker + markitdown) | Lecture PDFs stay opaque to AI agentic search |
| **Phase 5** Echo360 Spike Resolution | Gate; alternative auth-path required if invalidated |
| **Phase 6** Echo360 Video + Bilingual Captions | App degrades to "local notes + Claude chat" |
| **Phase 8** Mind-Map View + Per-Course Rules | KG has no human-side visual surface |
| **Phase 9** Anchored Mode + Citations API | Loses "学习用 Claude / 复习用 NotebookLM" dual-mode |
| **Phase 10** FSRS-6 Reviews + Focus Mode | Loses learning-loop closure (learn → review) |

### Layer 3 — Replacement (implementations behind stable contracts; can swap without rebuild)

Not separate phases — these are **library / algorithm choices INSIDE phases** that should be replaceable without rebuilding the phase. All tracked in `.planning/dependencies.md` per **KP-08** (OSS dependency tracking).

| What | Decided in | Replaceable because |
|---|---|---|
| KG memory library (Mem0 / Cognee / Zep / agentmemory) | Phase 5.5 → Phase 7 | Hidden behind stable read/write contract; vault data + KG schema unchanged |
| Whiteboard library (Excalidraw locked, deferred to v2+) | v2+ phase | `.excalidraw.json` files survive library deprecation |
| Voice STT library (whisper.cpp / Vosk — REQ-19 v1.x) | v1.x phase TBD | Audio → text is lossy; only transcribed markdown commits to vault |
| Embedding model (when v2 vector DB lands) | Future v2 phase | Embeddings re-generatable from vault — no data migration |

### Ordering rule (strict)

**Foundation → Application** for dependency graph (already enforced via `Depends on`). Within each layer, existing `Depends on` edges stay authoritative. **If a Foundation phase slips, Application phases pause** — do NOT parallelize Application work over a Foundation regression.

---

## Phases

- [x] **Phase 0: Identity & Branding Lock** - Final app name + icon + bundle identifier locked before any production code
- [ ] **Phase 1: Tauri Shell Foundation + Subprocess Hardening** - Three-pane shell, single-session chat, cost meter, zombie cleanup, capability hardening, agentic search scope
- [ ] **Phase 2: Vault + Canvas/Ed Sync + Onboarding** - Local-first markdown vault, Canvas/Ed import + incremental sync, sync status surface, settings UI, first-run wizard
- [ ] **Phase 3: Multi-Session + Command Palette + Editor** - Multi-session sidebar, Cmd+P/O/Shift+P palette, Tiptap block editor with markdown round-trip
- [ ] **Phase 4: Document Ingestion (PDF + Office → markdown)** - Marker for PDF math, markitdown for Office; sync pipeline routes each file type to the right converter
- [ ] **Phase 5: Echo360 Spike Resolution** - Spike `/gsd-spike echo360-webview-auth` to validate or invalidate WKWebView SSO + cookie persistence
- [ ] **Phase 5.5: KG Memory Project Survey + Dogfood (RQ-01)** - 4-project comparison + 1-week dogfood + decision report; gates Phase 7
- [ ] **Phase 6: Echo360 Video + Bilingual Captions** - Embedded webview lecture video + auto-translated bilingual VTT (gated by Phase 5)
- [ ] **Phase 7: Knowledge Graph + Three-Tier Memory** - Dual-layer data architecture: AI-side KG with confidence/provenance/bitemporal, three-tier memory pipeline (gated by Phase 5.5)
- [ ] **Phase 8: Mind-Map View + Per-Course Rules** - Top-bar Cytoscape.js mind-map, click-to-navigate, `.mneme/rules/` per-course system prompts
- [ ] **Phase 9: Anchored Mode + Citations API** - Free/anchored toggle in chat input, Anthropic Citations API, clickable `[file.md:42]` citations
- [ ] **Phase 10: FSRS-6 Reviews + Focus Mode** - Concept-page FSRS-6 scheduler, AI-generated test questions, review focus screen, graph-weakness × due-ness ranking

---

## Phase Details

### Phase 0: Identity & Branding Lock
**Goal**: Final app name, icon, and macOS bundle identifier are locked before any production code carries the codename `mneme`.
**Depends on**: Nothing
**Requirements**: (none — this is a pre-implementation phase)
**Success Criteria** (what must be TRUE):
  1. Final app name decided and recorded in PROJECT.md (codename `mneme` retired).
  2. App icon (ICNS + PNG variants) generated via Claude Design (KP-05) and committed to repo.
  3. Bundle identifier transitioned from `dev.mneme.spike` to `dev.<finalname>.app` in `tauri.conf.json` (or chosen reverse-DNS).
  4. README + window title + macOS Dock display reflect the locked name.
**OSS adoption note (KP-02)**: Pure naming/branding decision phase — no code adoption needed. Icon generation goes through Claude Design (KP-05), no third-party icon library.
**Plans:** 4 plans
Plans:
- [x] 00-01-PLAN.md — Naming finalist selection + user pick (Wave 1; checkpoint:decision)
- [x] 00-02-PLAN.md — Icon asset production via gpt-image-1 + sips/iconutil pipeline (Wave 2)
- [x] 00-03-PLAN.md — Atomic content rename + skill rename + README/LICENSE creation (Wave 2)
- [x] 00-04-PLAN.md — Pre-publish gate + atomic commit + GitHub publish + local-path move (Wave 3)

### Phase 1: Tauri Shell Foundation + Subprocess Hardening
**Goal**: Three-pane resizable shell with single-session Claude chat works end-to-end, with all CRITICAL pitfalls (zombies, cost runaway, XSS, capability wildcards) closed before user starts dogfooding.
**Depends on**: Phase 0
**Requirements**: REQ-02 (subprocess), REQ-01 (three-pane shell), REQ-10 (agentic search default — `--add-dir` vault scope only)
**Success Criteria** (what must be TRUE):
  1. Three-pane resizable shell renders (left: file tree placeholder, middle: PDF preview placeholder, right: Claude chat); split positions persist across restarts.
  2. Single Claude session streams correctly: chunky text during stream → finalized markdown + KaTeX + DOMPurify-sanitized HTML on `result` event (spike 002 pattern locked).
  3. Subprocess lifecycle is clean: Cmd+Q kills child processes within 2s (SIGTERM → 2s → SIGKILL); `ps aux | grep claude` shows zero orphans after 5 quit cycles.
  4. **Loop guard via `--max-turns 30`** passed to every `claude` invocation (the only structural ceiling under OAuth subscription mode — no per-call billing exists; `result.total_cost_usd` is theoretical-API-equivalent, not a real charge). Chat input shows **Ctx % + Total tokens + Session duration** (no `$` figures, no daily cap, no `~/.mneme/usage.jsonl`) — per Round 5 amendment A-04 + A-09 in `phases/01-tauri-shell-foundation-subprocess-hardening/01-AMENDMENT-2026-05-09.md`. Propagates SPEC Round 4 (cost meter already out of scope L100/L123).
  5. Capability hardening: explicit window names (no `"*"`), shell `args` per-arg validators (no `args: true` reaching production), KaTeX ≥ 0.16.21 pinned, DOMPurify allowlist explicit.
**OSS adoption note (KP-02)**: Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell (KD-01, spike 002 validated); marked + KaTeX + DOMPurify (KD-02); `claude-code-parser` (MIT) **vendored** in `vendor/claude-code-parser/` per KD-12 (no npm dep).
**Plans:** 7 plans
Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Wave 1 bootstrap: Tauri 2 + SvelteKit + Phase 0 identity transition + vendored claude-code-parser + test harness scaffold

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 01-02-PLAN.md — Wave 2 (TDD): spawn-args SSOT + capability hardening + audit script (T-1-03/04/05/07)
- [ ] 01-03-PLAN.md — Wave 2 (TDD): sanitize.ts (DOMPurify Option-A hook + KaTeX trust:false) + 6-arm stream-dispatch.ts (T-1-02 + T-1-06)
- [ ] 01-04-PLAN.md — Wave 2 (TDD): Rust state machine (SessionRegistry + kill_pgid + hook union) (T-1-01)

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 01-05-PLAN.md — Wave 3: tokens.css + Splitter.svelte three-pane + bottom row + window chrome (KP-09 + KD-13)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 01-06-PLAN.md — Wave 4: ChatPanel.svelte E2E wiring (Command spawn + dispatch + sanitize + IPC + Stop button + hotkey unbinding)

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 01-07-PLAN.md — Wave 5: Husky pre-commit + 5-cycle lifecycle harness + 50-row dogfood checklist + VALIDATION.md sign-off (CHECKPOINT)
**UI hint**: yes

### Phase 2: Vault + Canvas/Ed Sync + Onboarding
**Goal**: Local-first markdown vault with PARA + course-root structure is the user's source of truth; Canvas + Ed pull real coursework into `_source/` on first run; sync status is always visible; settings UI and first-run wizard make setup deterministic for future-self.
**Depends on**: Phase 1
**Requirements**: REQ-03 (Canvas + Ed sync), REQ-06 (markdown vault), REQ-13 (sync status surface), REQ-14 (settings UI), REQ-16 (first-run onboarding wizard)
**Success Criteria** (what must be TRUE):
  1. First-launch wizard completes 6 steps (welcome → Claude auth check → vault path picker → MCP detection → course selection → first sync) and lands in main UI; resumable from `~/.mneme/onboarding-state.json`.
  2. Vault root is configurable (default `~/StudyVault/`); required dirs auto-created (`_system/`, `_inbox/`, `courses/`, `shared/`); each ingested course has `_source/` (chmod 444 — write-protected; Sync controller is the only writer), `notes/`, `concepts/`, `practice/`, `INDEX.md`; YAML frontmatter on all written notes.
  3. Canvas + Ed first-run import pulls all enrolled-course modules / files / pages / announcements into `courses/<COURSE_CODE>/_source/{lectures,tutorials,assignments,announcements.md}`; incremental sync on app launch uses `updated_at` + ETag; deletions move to `_system/trash/<date>/` (no hard delete).
  4. Status bar widget shows last-synced timestamp + error count + next-scheduled; click → modal with per-course detail; auth/rate-limit/network errors each have distinct icons; new-item toasts fire for announcements + new files.
  5. Settings panel reachable via Cmd+, with categories (General / Vault / Sync / Claude / Privacy / Appearance / Keybindings / Advanced); vault path move + re-index works; cost cap + theme + keybinding override functional.
**OSS adoption note (KP-02)**: Canvas/Ed MCP (user-owned, 7th iteration); `gray-matter` (MIT) for YAML frontmatter parse; Tauri `plugin-fs` + `plugin-fs-watch`. `_source/` SQLite index uses `rusqlite` directly (per STACK research — not `tauri-plugin-sql`).
**Plans**: TBD
**UI hint**: yes

### Phase 3: Multi-Session + Command Palette + Editor
**Goal**: Realistic learning workflow with parallel chat threads (one per course/topic); keyboard-first navigation reaches 80% of in-app actions without mouse; Tiptap block editor saves to plain markdown with round-trip integrity verified.
**Depends on**: Phase 2
**Requirements**: REQ-11 (command palette Cmd+P/O/Shift+P), REQ-12 (multi-session sidebar)
**Success Criteria** (what must be TRUE):
  1. Multi-session sidebar lists active chat sessions; spawn / switch / rename / close work; each session is an independent claude subprocess; sessions survive app restart via `--resume <session-id>`.
  2. Cmd+P fuzzy-searches vault files; Cmd+O jumps to course / concept; Cmd+Shift+P opens universal action palette; ≥ 80% of in-app navigation reachable without mouse.
  3. Tiptap block editor renders concept pages with slash menu (`/`); saves to plain markdown via `tiptap-markdown` (community MIT); markdown round-trip integration test passes for representative concept (frontmatter + math + wikilinks + code blocks + lists).
  4. Soft-lock per file: when user opens file in editor, Claude tools refuse Edit if file `mtime` < 5s ago or active editor lock exists (PITFALLS Pitfall 6).
  5. Resource ceiling enforced: max 2 concurrent claude subprocesses on Intel Mac (cost + CPU pressure); attempt to spawn 3rd shows warning.
**OSS adoption note (KP-02)**: `cmdk` (community standard MIT) or roll own with kbar — pick locked in plan-phase 3; Tiptap v3 + `@tiptap/starter-kit` + `@tiptap/extension-mention` + `@tiptap/extension-suggestion` + community `tiptap-markdown` (`aguingand/tiptap-markdown`).
**Plans**: TBD
**UI hint**: yes

### Phase 4: Document Ingestion (PDF + Office → markdown)
**Goal**: Lecture slides (PDF, math-heavy) and tutorials (Word/PPT/Excel) automatically convert to AI-friendly markdown alongside their originals on Canvas/Ed sync, so Claude can grep + reason over actual lecture content (not opaque blobs).
**Depends on**: Phase 2 (sync pipeline + `_source/` policy must exist)
**Requirements**: REQ-18 (Marker for PDF + markitdown for Office)
**Success Criteria** (what must be TRUE):
  1. Sync pipeline classifies new files by extension and dispatches: `.pdf` → Marker subprocess (`marker_single --use_llm` for math); `.docx`/`.xlsx`/`.pptx`/`.html` → markitdown subprocess; `.md`/`.txt` passthrough; other → flagged in sync status (no-op, never silently dropped).
  2. Output stored at `courses/<COURSE>/_source/<original-name>.md` next to original file; original file preserved (never overwritten).
  3. Conversion errors surface in REQ-13 sync status modal with per-file detail (which file, which converter, error message); user can retry single file or whole batch.
  4. Cost guardrail: Marker `--use_llm` per-page cost surfaced in sync UI for first batch (PITFALLS Pitfall 18 — set expectations before users see surprise charges).
  5. Round-trip sample lecture (math-heavy PDF) extracts inline LaTeX correctly and is grep-able by Claude in agentic search.
**OSS adoption note (KP-02)**: `Marker` (datalab-to/marker, GPL-3.0 code via subprocess process-boundary; AI Pubs Open Rail-M model weights for personal use); `markitdown` (Microsoft, MIT) — both invoked as Python subprocesses (no in-process Python embedding).
**Plans**: TBD

### Phase 5: Echo360 Spike Resolution
**Goal**: `/gsd-spike echo360-webview-auth` validates (or invalidates) the assumption that USYD SSO completes inside Tauri WKWebView and the resulting cookie persists across app restarts. Without this gate, REQ-04 + REQ-05 cannot proceed.
**Depends on**: Phase 1 (Tauri shell exists)
**Requirements**: (no v1/v1.x REQ — this is a phase-entry gate for Phase 6)
**Success Criteria** (what must be TRUE):
  1. Spike completes with verdict: VALIDATED (proceed to Phase 6) or INVALIDATED (replan REQ-04/REQ-05 design before Phase 6 entry).
  2. If VALIDATED: documented evidence that (a) USYD SSO completes inside Tauri WKWebView, (b) authenticated session cookie persists across app restarts via `WKWebsiteDataStore = .default`, (c) Echo360 video player initializes inside the webview without breaking due to client-side same-origin checks.
  3. If INVALIDATED: alternative auth path documented (external browser + deep links, OR persistent per-domain webview instance) with new REQ-04 acceptance criteria proposed.
  4. Spike findings wrapped via `/gsd-spike-wrap-up` into project-level skill `echo360-webview-findings`.
  5. KD-04 in PROJECT.md updated to reflect spike outcome (or replaced with the alternative).
**OSS adoption note (KP-02)**: No third-party Echo360 library exists (STACK research); pure Tauri webview + persistent cookie pattern.
**Gate**: **BLOCKING** for Phase 6 entry per KD-11 + PITFALLS Pitfall 7.
**Plans**: TBD

### Phase 5.5: KG Memory Project Survey + Dogfood (RQ-01)
**Goal**: Choose the foundation library for Phase 7's three-tier memory + knowledge graph by running a 4-project comparison (Mem0 / Cognee / Zep / agentmemory) plus a 1-week real-coursework dogfood, ending with a locked decision report.
**Depends on**: Phase 2 (vault must exist for dogfooding to be meaningful)
**Requirements**: (no v1/v1.x REQ — this is a phase-entry gate for Phase 7 per RQ-01 BLOCKING flag in PROJECT.md KD-10)
**Success Criteria** (what must be TRUE):
  1. 4-project comparison report written: Mem0 vs Cognee vs Zep vs agentmemory, evaluated on (a) confidence/bitemporal/provenance schema fit, (b) Apache-2.0/MIT license cleanliness, (c) local-only operation (KP-01), (d) integration cost with Tauri+Svelte stack, (e) public benchmark results.
  2. 1-week dogfood: top-2 candidates installed, fed real chat sessions from user's S1 2026 coursework, retrieval/recall manually evaluated.
  3. Decision report names the locked choice + adapter pattern (adopt-as-is / fork+extend / wrap-via-CLI-subprocess) + which schema extensions are needed.
  4. KD-10 in PROJECT.md updated from "deferred" to "locked: <choice>".
  5. Spike-style skill `kg-memory-foundation-decision` wraps findings.
**OSS adoption note (KP-02)**: This phase IS the OSS-survey discipline anchor — it operationalizes the 50% rule for the project's most ambitious subsystem.
**Gate**: **BLOCKING** for Phase 7 entry per RQ-01 in REQUIREMENTS.md.
**Plans**: TBD

### Phase 6: Echo360 Video + Bilingual Captions
**Goal**: Lecture videos play inline in the middle pane via embedded webview with persistent SSO; auto-translated bilingual VTT captions accompany every played lecture and become full-text searchable in the vault.
**Depends on**: Phase 5 (spike outcome locks the implementation pattern)
**Requirements**: REQ-04 (Echo360 webview + USYD SSO), REQ-05 (caption capture + Claude bilingual VTT)
**Success Criteria** (what must be TRUE):
  1. Middle pane embeds Tauri webview; first-run USYD SSO flow completes and cookie persists in macOS Keychain; video plays inside the webview with no external browser bounce; subsequent video loads are seamless across app restarts.
  2. Each lecture's VTT auto-pulled into `courses/<CODE>/_source/lectures/<lec>.vtt`; cue text translated EN ↔ ZH via Claude API with batched cue translation (~50 cues/call per PITFALLS Pitfall 18); bilingual VTT saved to `<lec>.bilingual.vtt`.
  3. HTML5 `<video>` + `<track>` renders bilingual captions; toggle in player UI switches mono/bilingual mode.
  4. Captions are full-text-searchable in vault — `Cmd+P "old growth"` / `传送` lands user on the right cue; agentic Claude search can find caption content.
  5. Caption translation uses **API-key billing** (not OAuth subscription) per PITFALLS Pitfall 7 + KP-04 ToS guidance — billing path documented in settings UI.
**OSS adoption note (KP-02)**: `subtitle` v4.2.2 (MIT) for VTT parse + format; `Read Frog` / `FluentRead` cue-batching pattern studied (clean-room implementation, no GPL fork). Webview pattern derived from spike outcome (no third-party Echo360 library).
**Gate entry condition**: Phase 5 spike VALIDATED. If INVALIDATED, this phase's success criteria are replanned per spike's documented alternative.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Knowledge Graph + Three-Tier Memory
**Goal**: AI-side knowledge graph builds itself from every chat session — extracting concepts, embedding, linking with confidence + provenance, promoting through working → episodic → long-term tiers; concept pages auto-update with KG-derived metadata; cross-course leakage and hallucinated edges are gated by confidence threshold + audit panel.
**Depends on**: Phase 5.5 (memory project decision locked)
**Requirements**: REQ-07 (dual-layer data: KG + mind-map / whiteboard)
**Success Criteria** (what must be TRUE):
  1. Three-tier memory pipeline functions: working (recent N=20 messages, in-memory) → episodic (per-session JSON in `_system/kg/episodes/<sid>.json`, summarized on `chat.result`) → long-term (concept .md pages in vault, promoted when confidence ≥ 0.85 AND ≥ 2 episodes touched).
  2. Each KG node has confidence (0..1) + provenance (`{added_by_session, added_at, source_message_id, evidence_excerpt}`) + timestamps + course namespace (`<COURSE_CODE>::<concept_slug>`); typed edges (`prerequisite_of`, `instance_of`, `applies_to`, `related_to`, `contradicts`, `derived_from`).
  3. Auto-edge writes are gated: confidence < 0.85 → flagged as candidate in `_inbox/edges-candidate.md` (human review); cross-course edges require explicit `cross_course: true` flag (PITFALLS Pitfall 8).
  4. KG persistence: `_system/kg/graph.json` updates atomically; git-snapshot before each session-driven write so edges can be diffed/reverted; audit panel in settings shows recent edges with thumbs-up/down feedback into prompt examples.
  5. Eval: cross-course leakage test passes (ask "what is X in COMP?" → no MATH concepts cited).
**OSS adoption note (KP-02)**: Locked memory-project foundation from Phase 5.5 (likely `agentmemory` Apache-2.0 fork-extend per STACK research, but Phase 5.5 may pivot to Cognee subprocess); `graphify` (`safishamsi/graphify`, MIT) optionally adopted for periodic batch rebuild from vault folder (complementary to streaming writes).
**Plans**: TBD

### Phase 8: Mind-Map View + Per-Course Rules
**Goal**: The top-bar mind-map renders the active course's KG live — concepts animate in as the user chats; per-course system prompts via `.mneme/rules/` give Claude course-specific persona without forcing the user to re-explain context every session.
**Depends on**: Phase 7 (KG must have data to render meaningfully)
**Requirements**: REQ-17 (per-course `.mneme/rules/` system prompts)
**Success Criteria** (what must be TRUE):
  1. Top-bar mind-map renders the active course's KG via Cytoscape.js v3.33.3 + `cytoscape-dagre` layout; click a node opens the concept's `.md` file; mind-map updates live as new concepts emerge from streaming chat sessions (animated `cy.add()` for new nodes — not full re-layout per tick).
  2. Mind-map is **read-only renderer** (S5 anti-coupling rule): node creation goes through KG layer's API; node positions saved as `_system/kg/views/<name>.json` overlay (separate from canonical graph data).
  3. Per-course rules stored at `courses/<COURSE>/.mneme/rules/<rule>.md` with YAML frontmatter (`enabled: true`, `priority: 10`, `applies_to: assignment|notes|review`); when starting chat in COURSE context, all enabled rules concatenated into Claude's `--append-system-prompt`.
  4. Debug overlay in chat header shows which rules fired for current session (helps debug "why is Claude answering this way?").
  5. Streaming-into-mind-map UX: latency from `chat.result` → KG extract → vault write → mind-map node animation ≤ 3s end-to-end (acceptable "the system is processing what we just discussed").
**OSS adoption note (KP-02)**: `Cytoscape.js` v3.33.3 (MIT) + `cytoscape-dagre` extension; `.mneme/rules/` pattern ports `Cursor` `.cursor/rules` MDC concept (~3hr work, simple parser).
**Plans**: TBD
**UI hint**: yes

### Phase 9: Anchored Mode + Citations API
**Goal**: A single toggle in the chat input swaps between free-mode (Claude with full agent capability) and anchored-mode (Anthropic Citations API answers grounded in user-checked vault files with clickable `[file.md:42]` citations) — the "学习用 Claude / 复习用 NotebookLM" insight encoded in one switch.
**Depends on**: Phase 7 (anchored citations create `derived_from` graph edges back to source files)
**Requirements**: REQ-08 (anchored mode)
**Success Criteria** (what must be TRUE):
  1. Chat panel toggle (free ↔ anchored) is visible per-session; mode chip + different chat bubble color make active mode unmistakable; mode-switch animates so user knows the swap happened.
  2. Anchored mode passes user-checked vault files as documents to Anthropic Citations API directly (NOT via claude CLI subprocess — KD-05); document payload capped at 50k tokens per query (chunking strategy + summary fallback for larger sets per PITFALLS Pitfall 3).
  3. Every assistant sentence ends with `[file.md:42]` clickable citation; click opens vault file at that line in middle pane.
  4. Anchored answers create `derived_from` graph edges back to source files (Phase 7's KG schema honored).
  5. Cost path: Citations API uses API-key billing (not OAuth subscription) per ToS-compliance pattern from Phase 6.
**OSS adoption note (KP-02)**: Anthropic Citations API (Jan 2025, official) — direct HTTPS, no third-party wrapper.
**Plans**: TBD
**UI hint**: yes

### Phase 10: FSRS-6 Reviews + Focus Mode
**Goal**: Concept pages (not flashcards) are scheduled by FSRS-6 with multi-facet tracking; review-due concepts collapse three-pane shell into single-screen focus mode where AI generates a fresh test question on the spot; user rates 1/2/3/4, score flows back into FSRS scheduler; queue is ranked by `(graph weakness × FSRS due-ness)`.
**Depends on**: Phase 7 (graph weakness scoring requires KG), Phase 2 (concept pages live in vault)
**Requirements**: REQ-09 (FSRS-6 spaced repetition on concept pages), REQ-15 (review focus mode)
**Success Criteria** (what must be TRUE):
  1. Each concept page has FSRS state in YAML frontmatter (`stability` + `difficulty` + `retrievability` + 17 trainable weights); persisted via Vault layer; review history appended to `_system/fsrs/history.jsonl`.
  2. Daily-due queue ranked by `(graph weakness × FSRS due-ness)` — weakness from Phase 7's KG (low edge count + low avg incoming confidence + days-since-touched); queue capped at 20/day with overflow deferred (PITFALLS Pitfall 9).
  3. Entering review queue collapses three-pane shell to single-concept full-screen view; AI generates fresh test question per concept (no cached prompts — varied each review); keyboard `1/2/3/4` evaluates; press Esc returns to main UI.
  4. Multi-facet tracking: concept frontmatter has `facets: [definition, computation, application]`; FSRS scheduled per-facet not per-concept; concept "due" = any facet due (PITFALLS Pitfall 9 calibration drift mitigation).
  5. Two-pass rating UI: after user picks 1-4, show "are you sure? You said the answer was X. Was that right?" with the actual model answer for sanity check; conservative initial weights (stock FSRS-6 defaults, retrain personally only after 100+ reviews).
**OSS adoption note (KP-02)**: `ts-fsrs` v5.3.2 (MIT, `open-spaced-repetition` org) — canonical TS port of FSRS-6 (KD-06).
**Plans**: TBD
**UI hint**: yes

---

## Out of Scope (v2+, not mapped to phases)

These items are deferred from REQUIREMENTS.md v2+ section. They get phase mappings only if/when promoted to active scope:

- Streaming-into-mind-map at full F-DIFF-01 fidelity (signature differentiator polish — depends on Phase 7 + 8 stable + 1 month dogfood)
- Whiteboard mode via Excalidraw (KD-08; secondary to mind-map; React-in-Svelte interop spike needed first)
- Vector DB for narrowly-scoped real-time relevance (writing-time concept suggestions, KG edge maintenance) — only added if/when those features prove necessary; sqlite-vec + Ollama nomic-embed-text path documented in STACK research
- Cross-course concept consolidation (auto-move shared concepts to `shared/`)
- Routine / scheduled prompts (Claude Code Routines integration)
- Past-paper exam → simulated study session (`practice/` integration)
- iCloud / Drive backup option for vault (opt-in, never automatic — KP-01)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Identity & Branding Lock | 4/4 | Complete    | 2026-05-07 |
| 1. Tauri Shell Foundation + Subprocess Hardening | 0/7 | Not started | - |
| 2. Vault + Canvas/Ed Sync + Onboarding | 0/0 | Not started | - |
| 3. Multi-Session + Command Palette + Editor | 0/0 | Not started | - |
| 4. Document Ingestion (PDF + Office → markdown) | 0/0 | Not started | - |
| 5. Echo360 Spike Resolution | 0/0 | Not started | - |
| 5.5. KG Memory Project Survey + Dogfood (RQ-01) | 0/0 | Not started | - |
| 6. Echo360 Video + Bilingual Captions | 0/0 | Not started | - |
| 7. Knowledge Graph + Three-Tier Memory | 0/0 | Not started | - |
| 8. Mind-Map View + Per-Course Rules | 0/0 | Not started | - |
| 9. Anchored Mode + Citations API | 0/0 | Not started | - |
| 10. FSRS-6 Reviews + Focus Mode | 0/0 | Not started | - |

---

## Phase-Entry Gates Summary

| Gate | Blocks Phase | Resolution |
|------|--------------|------------|
| `/gsd-spike echo360-webview-auth` (Phase 5) | Phase 6 | SSO + cookie persistence verified in Tauri WKWebView per KD-11 + PITFALLS Pitfall 7 |
| RQ-01 4-project comparison + 1-week dogfood (Phase 5.5) | Phase 7 | Locked memory-project decision report; KD-10 transitions from "deferred" to "locked" |
| RQ-04 graphify skill mechanics (resolved within Phase 7 design) | Phase 7 | Decide reuse / fork / replace during plan-phase 7 |
| RQ-03 GUI wrapper community implementations (already absorbed into STACK research) | Phase 1 hardening | TOKENICODE pattern study during plan-phase 1 |

---

*Generated 2026-05-06 by gsd-roadmapper after `/gsd-explore` (foundation-decisions.md, 9 decisions) + 2 validated spikes (`spike-findings-mneme` skill auto-loaded). Granularity: fine. 11 phases (0 through 10, with 5.5 decimal) covering 18 v1+v1.x requirements with 100% coverage.*
