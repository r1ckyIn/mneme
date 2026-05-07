# Project Research Summary

**Project:** mneme
**Domain:** Personal desktop learning app — Tauri 2 shell wrapping local Claude Code, AI-native knowledge graph, FSRS-6 review, Echo360 lecture video
**Researched:** 2026-05-06
**Confidence:** HIGH (stack and subprocess pattern validated by spikes; features cross-checked against 8 live reference products; architecture derived from locked spike patterns; pitfalls verified against CVEs and GitHub issues)

---

## Executive Summary

mneme is a "Rust-shell-thin / TypeScript-fat" desktop app where a Tauri 2 process wraps the user's local `claude` CLI subprocess inside a three-pane learning shell (course files / video+PDF / AI chat) and continuously grows a local knowledge graph from every conversation. The architectural pattern — `tauri-plugin-shell` spawning `claude --output-format stream-json`, JSONL line-buffering, finalize-on-result rendering — is fully validated by two spikes and confirmed by the community (TOKENICODE, claude-code-parser, claude-code-gui) as the correct approach. All four researchers converge on the same 6-phase build sequence, and there are no fundamental disagreements between research threads.

The research surfaces two categories of action required before roadmap finalization. First, FEATURES research identified 9 table-stakes gaps not present in PROJECT.md's REQ-01..10 — most critically command palette (F-MISS-01), multi-session sidebar (F-MISS-02), sync status surface (F-MISS-03), settings UI (F-MISS-04), and review-mode focus screen (F-MISS-05). These are first-week abandonment risks if missing. Second, STACK research recommends switching from tldraw (now proprietary, requiring watermark) to Excalidraw (MIT) — a KP-02 compliance issue that must be acknowledged by the user. PITFALLS research flags an Echo360 webview spike as a mandatory pre-condition before planning the video integration phase, as macOS WKWebView's ITP cookie handling has a documented failure mode (wry#848) that could silently block the entire REQ-04 + REQ-05 feature.

The project's core value proposition — streaming-into-mind-map, concept-page FSRS review with AI-generated questions, and the free/anchored mode toggle — is genuinely unoccupied market space. No single competitor (NotebookLM, Obsidian, Heptabase, Cursor, Claude Desktop, Anki, RemNote) combines lecture-anchored learning, live knowledge graph growth, and spaced repetition on vault content. The build order is clear: front-load the shell and vault pipeline (Phases 1-2), add knowledge graph and Echo360 (Phase 3), render the mind-map and captions (Phase 4), ship anchored mode and FSRS (Phase 5), then defer differentiator polish (Phase 6+). The 50% open-source rule (KP-02) is comfortably satisfied — every P1+P2 feature has a credible OSS foundation.

---

## Key Findings

### Recommended Stack

The locked Tauri 2 + SvelteKit + tauri-plugin-shell foundation is correct and battle-tested. The additional library layer to build on top is:

**Core technologies (KP-02 OSS highlights):**
- **Marker (datalab-to/marker) v1.10.2** — PDF to AI-friendly markdown with LaTeX support; invoked as CLI subprocess (GPL-3.0 code, process boundary isolates linkage; model weights Apache-2 personal use OK)
- **agentmemory (rohitg00) v0.9.4** — Apache-2.0; three-tier memory pipeline (SQLite + BM25 + vector + graph); direct match to KD-10; fork-extend for confidence/bitemporal schema
- **graphify (safishamsi) v7+** — MIT, 43.6k stars; batch knowledge-graph rebuild from vault folder; complements agentmemory (batch vs. live-write)
- **Cytoscape.js v3.33.3** — MIT; leading graph viz library for analysis + animation; confirmed by user preference and 2026 ecosystem comparison
- **Excalidraw v0.18.1 (`@excalidraw/excalidraw`)** — MIT; replaces tldraw (see STACK CHANGE ALERT below)
- **ts-fsrs v5.3.2** — MIT; canonical FSRS-6 TypeScript port by `open-spaced-repetition` org; already cited as KD-06
- **Tiptap v3.22.5 (`@tiptap/starter-kit`)** — MIT; block editor with slash menu; community `tiptap-markdown` for round-trip; already locked as KD-09
- **claude-code-parser (MIT)** — 9KB, zero-deps; first documented types for `--output-format stream-json` protocol; recommended direct dependency
- **`subtitle` v4.2.2** — MIT; stream-based VTT/SRT parse for bilingual caption pipeline
- **rusqlite + sqlite-vec v0.1.9** — Apache-2.0/MIT dual; for deferred vector hot-path; do NOT use tauri-plugin-sql (sqlx incompatible with sqlite-vec extension loading)

**Critical version constraints:**
- Rust toolchain >= 1.88 (KD-03, already locked)
- Node >= 20.0.0 (ts-fsrs requirement)
- KaTeX >= 0.16.21 (CVE-2025-23207 fix; must pin in package.json)
- Tauri >= 2.0.0 (CVE-2024-35222 capability fix)

### STACK CHANGE ALERT: tldraw Must Be Replaced

**tldraw v4.x is no longer open-source.** License as of SDK 4.0: proprietary. Free in development only; production requires a license key or discretionary "hobby license" (with mandatory watermark "made with tldraw"). This directly violates KP-02 (50% OSS rule) and KP-05 (UI polish — watermark conflicts).

**Recommended replacement: Excalidraw v0.18.1 (MIT).** It is the correct primary choice: larger community (123k vs 47k stars), equally polished feature set for the whiteboard use case, pure MIT, no watermark. The swap affects KD-08 (whiteboard component).

**Action required:** User must acknowledge this stack change before roadmap is finalized. KD-08 in PROJECT.md should be updated to name Excalidraw explicitly.

### Expected Features

**Must have — table stakes (first-week abandonment risk if missing):**
- F-TS-01 Three-pane resizable shell (REQ-01 covers)
- F-TS-02 Streaming markdown/LaTeX/code chat (REQ-02, spike-validated)
- F-TS-03 Markdown vault on disk (REQ-06)
- F-TS-04 Wiki-link autocomplete + click-nav (REQ-06 partial)
- **F-MISS-01: Command palette (Cmd+P) + quick switcher (Cmd+O) — NOT in REQ list**
- **F-MISS-02: Multi-session sidebar (4 courses = 4+ live threads) — NOT in REQ list**
- F-TS-09 Canvas + Ed sync (REQ-03)
- **F-MISS-03: Sync status surface (toast + status bar) — NOT in REQ list**
- F-TS-13 FSRS-6 scheduling (REQ-09)
- **F-MISS-05: Review-mode focus screen UI — REQ-09 mentions but does not define screens**
- **F-MISS-09: First-run onboarding flow — REQ-03 hand-waves this**

**Should have — differentiators (competitive moat, no competitor has the combo):**
- F-DIFF-01 Streaming-into-mind-map during chat (REQ-07 — signature feature)
- F-DIFF-02 Free/anchored toggle in same UI (REQ-08 — "study Claude / revision NotebookLM" in one switch)
- F-DIFF-03 Concept-page review with AI-generated question, not flashcards (REQ-09)
- F-DIFF-08 Per-course system prompts via `.mneme/rules/` MDC files (Cursor pattern — NEW, not in REQ list)

**Defer to v2+:**
- F-DIFF-04 Graph-weakness x FSRS-due ranked queue (needs graph layer stable first)
- F-DIFF-07 Full dual-layer AI graph (REQ-07 — most ambitious; defer to post-v1.x)
- F-DIFF-09 Routine-style scheduled prompts (Claude Desktop pattern)

**Recommended new REQs to add to PROJECT.md:**
- REQ-NEW-A: Command palette + quick switcher
- REQ-NEW-B: Multi-session sidebar
- REQ-NEW-C: Sync status surface
- REQ-NEW-D: Settings / preferences UI
- REQ-NEW-E: Review-mode focus screen (fold into REQ-09 expansion)
- REQ-NEW-F: First-run onboarding
- REQ-NEW-G (optional): `.mneme/rules/` per-course system prompts

**Recommended new OOS additions:**
- OOS-06: Manual mind-map/whiteboard drawing tool (AI-generated, not user-drawn)
- OOS-07: Plugin/extensibility API (Claude Code skills are the layer)
- OOS-08: Multi-LLM-provider support (KP-04 locks Claude CLI)
- OOS-09: Voice/audio dictation for note-taking

### Architecture Approach

The architecture follows three concentric rings plus an Event Bus gateway. Rust side (Tauri core + plugins) owns OS-level concerns only. TypeScript/Svelte owns all product semantics. The Event Bus is the single legal cross-ring channel; no subsystem bypasses it. The Vault Layer is the only filesystem writer. Claude subprocess is the only spawner of `claude-bin`.

**Major components:**
1. **S1 Desktop Shell** — Svelte 5 three-pane layout, reactive stores, command palette; no direct Tauri API calls
2. **S2 Claude Subprocess Controller** — spawn + JSONL parse + event dispatch; only caller of `claude-bin`
3. **S3 Vault Layer** — filesystem read/write/watch/frontmatter; only filesystem writer; enforces `_source/` write policy
4. **S4 Knowledge Graph** — three-tier memory (working/episodic/long-term); subscribes to `chat.result`; writes via Vault
5. **S5 Mind-Map / Whiteboard View** — Cytoscape.js renderer; reads `graphSnapshot` store; never writes directly
6. **S6 Anchored Mode** — Anthropic Citations API (not subprocess); parallel to free-mode chat
7. **S7 FSRS Scheduler** — `ts-fsrs` wrapper; reads/writes concept frontmatter via Vault
8. **S8 External Integrations** — Canvas, Ed, Echo360 webview, Anthropic Citations API
9. **S9 Sync Controller** — only writer to `_source/` paths; incremental + cron
10. **S10 Caption Pipeline** — VTT pull + bilingual translate + search

### Critical Pitfalls

1. **Subprocess zombies on Cmd+Q (CRITICAL, Phase 1)** — Tauri does not auto-kill `claude` children on macOS Cmd+Q (wry#1896). Fix: `RunEvent::ExitRequested` handler + `child.kill()` with 2-second SIGKILL fallback. Must ship in Phase 1 or quota burns silently overnight.

2. **API cost runaway from agent loops (CRITICAL, Phase 1)** — Each new app launch = new `cache_creation` (~$0.32/launch from CLAUDE.md alone). Agentic search can fire $5+ per question. Fix: cost meter in chat header, hard daily cap ($10 default), `--max-turns 30` on all subprocess invocations.

3. **Markdown XSS via streaming gap (CRITICAL, Phase 1)** — The spike's "raw monospace during stream, sanitize+render only on `result`" pattern MUST NOT be changed to live markdown rendering. Boundary-split injection attacks pass per-chunk sanitizers. Also: KaTeX >= 0.16.21 required (CVE-2025-23207).

4. **Echo360 WKWebView cookie failure (HIGH, pre-Phase-3 spike required)** — macOS WKWebView's ITP blocks third-party cookies by default. Echo360 inside USYD Canvas iframe IS third-party. Result: SSO loop on every launch. Must spike before planning Phase 3.

5. **Knowledge graph hallucinated edges + course leakage (HIGH, Phase 3 design gate)** — Auto-extracted edges must have: course-namespace enforcement, provenance metadata, confidence threshold >= 0.85 for auto-write, audit panel. Do not ship Phase 3 without these schema constraints.

6. **Solo-dev 30% abandonment (HIGH, roadmap structure)** — 10 active REQs is 5x typical successful solo v1. Front-load shipping; lock v1 = Phase 1+2+3 only; dogfood in real S1 2026 coursework as soon as Phase 2 completes.

---

## Spike Recommendation (Pre-Phase Blocker)

**`/gsd-spike echo360-webview-auth` MUST run before Phase 3 planning.**

Echo360 video integration (REQ-04) depends on Tauri WKWebView persisting USYD SSO cookies. This has a documented failure mode (wry#848: third-party cookie blocking by macOS ITP). If this spike fails, the middle-pane video feature must fall back to opening Echo360 in system browser — changing the REQ-04 + REQ-05 design significantly. 2-day max. Do it before Phase 3 plan phase.

---

## Implications for Roadmap

All four researchers agree on the same dependency-driven phase sequence. No conflicts.

### Phase 1: Shell + Subprocess Foundation

**Rationale:** Extends spike 002's proven single-pane chat into the three-pane shell. All security and cost pitfalls must be addressed here before any real usage.

**Delivers:** Three-pane resizable shell (empty states OK); single-session claude subprocess with correct JSONL buffering; vault file tree (read-only); markdown+KaTeX rendering; cost meter + daily cap; subprocess zombie fix; DOMPurify safe config.

**Features addressed:** REQ-01, REQ-02, F-MISS-01 (command palette), F-MISS-09 (onboarding skeleton)

**Pitfalls to address:** Pitfall 1 (subprocess zombies), Pitfall 2 (capability wildcards), Pitfall 3 (cost runaway), Pitfall 4 (markdown XSS), Pitfall 17 (shell scope `args: true`)

**Research flag:** Standard patterns — spike 002 validated. Skip `/gsd-research-phase`.

### Phase 2: Vault Write + Canvas/Ed Sync

**Rationale:** Without vault content, no later subsystem has data. Must get the content pipeline working before AI-native features.

**Delivers:** Full vault read/write/watch with frontmatter; Canvas + Ed first-run import; incremental sync; sync status surface; `_source/` write policy; onboarding flow; settings UI skeleton; multi-session architecture (even if single-session ships).

**Features addressed:** REQ-03, REQ-06, F-MISS-02, F-MISS-03, F-MISS-04, F-MISS-09 (complete)

**Stack used:** Tauri `plugin-fs`, Tiptap v3 + `tiptap-markdown`, Marker CLI (resolves RQ-02)

**Pitfalls to address:** Pitfall 6 (vault concurrent writes — soft lock + atomic save), Pitfall 13 (SQLite index before file count grows), Pitfall 20 (`_source/` read-only enforcement)

**Research flag:** Canvas/Ed MCP pattern user-proven. Marker decision made (STACK.md §1). Skip `/gsd-research-phase`.

### Phase 3: Knowledge Graph (Tier 1+2) + Echo360 Webview

**Rationale:** AI-native value begins here. Echo360 webview lands here to unblock caption pipeline in Phase 4.

**Pre-condition:** `/gsd-spike echo360-webview-auth` must complete before this phase is planned.

**Delivers:** KG working + episodic tiers; episodic fact extraction on `chat.result`; concept pages with `confidence:` and `provenance:` frontmatter; Echo360 webview in middle pane with SSO cookie persistence.

**Features addressed:** REQ-04 (Echo360), REQ-07 partial (KG tiers 1+2)

**Stack used:** agentmemory (rohitg00, Apache-2.0) as foundation + fork for schema extensions

**Pitfalls to address:** Pitfall 7 (Echo360 WKWebView cookies), Pitfall 8 (hallucinated edges — course namespace + confidence gating + provenance mandatory)

**Research flag:** RQ-01 (memory project choice) unresolved. **Run `/gsd-research-phase` for Phase 3.**

### Phase 4: Mind-Map View + Caption Pipeline

**Rationale:** KG now has data, mind-map becomes meaningful. Captions need Echo360 (Phase 3).

**Delivers:** Top-bar Cytoscape.js mind-map; click node opens concept file; live mind-map updates during streaming; bilingual VTT files.

**Features addressed:** REQ-05 (bilingual captions), REQ-07 partial (mind-map view)

**Stack used:** Cytoscape.js v3.33.3 + dagre extension; `subtitle` v4.2.2; Claude API batched cue translation (50 cues/call)

**Pitfalls to address:** Pitfall 18 (caption translation cost — batch + cache)

**Research flag:** Caption batching cost needs a quick calculation before plan. Consider skip `/gsd-research-phase`.

### Phase 5a: Anchored Mode (Citations API)

**Rationale:** Depends on populated vault and stable KG so citations can create `derived_from` graph edges.

**Delivers:** Free/anchored toggle; Anthropic Citations API; `[file.md:42]` clickable citation links; source-curator sidebar.

**Features addressed:** REQ-08, F-DIFF-02, F-TS-07/08/12

**Pitfalls to address:** Anchored mode document payload size — never pass >50k tokens per query.

**Research flag:** Standard API pattern. Skip `/gsd-research-phase`.

### Phase 5b: FSRS Reviews (parallel with 5a)

**Rationale:** Depends on concept pages (Phase 2) and KG weakness scoring (Phase 3).

**Delivers:** FSRS-6 scheduler on concept pages; review-mode focus screen (collapses three-pane); AI-generated test question; 1-2-3-4 rating; graph-weakness x FSRS-due ranked queue; multi-facet concept tracking.

**Features addressed:** REQ-09, F-MISS-05 (review-mode UI), F-DIFF-03, F-DIFF-04

**Stack used:** ts-fsrs v5.3.2

**Pitfalls to address:** Pitfall 9 (FSRS calibration drift on concept-objects — multi-facet schema, two-pass rating UI, conservative initial weights)

**Research flag:** ts-fsrs KD-06 locked. Skip `/gsd-research-phase`.

### Phase 6+: Differentiator Polish + Whiteboard + Embeddings

**Rationale:** None block the core loop. Value-additive after daily use is proven.

**Includes:** Excalidraw whiteboard view (Svelte + React interop via `createRoot` in `onMount`); streaming-into-mind-map at full F-DIFF-01 fidelity; optional sqlite-vec embedding worker; `.mneme/rules/` per-course prompts.

**Research flag:** Excalidraw + Svelte interop pattern needs a small spike (React peer dependency, font self-hosting).

---

### Phase Ordering Rationale

- P1 before P2: All data flows need a working shell; cost/security pitfalls must be fixed before real usage
- P2 before P3: KG cannot work without vault content; Canvas sync must land first
- P3 before P4: Mind-map renders from KG data; captions need Echo360 webview
- P3+4 before P5: FSRS review ranking uses graph weakness score; Citations API benefits from `derived_from` edges
- P5 parallel: Anchored mode (S6) and FSRS (S7) are independent subsystems
- P6 last: Differentiators are polish; must dogfood before building

### Research Flags Summary

| Phase | Research recommendation | Reason |
|-------|------------------------|---------|
| Phase 1 | Skip `/gsd-research-phase` | Spike-validated; community implementations studied |
| Phase 2 | Skip `/gsd-research-phase` | Canvas/Ed MCP user-proven; Marker decision made |
| Phase 3 | **Run `/gsd-research-phase`** | RQ-01 (memory project choice) unresolved |
| Phase 3 (pre) | **Run `/gsd-spike echo360-webview-auth`** | BLOCKING — WKWebView ITP cookie failure documented |
| Phase 4 | Consider skip | Caption batching is a quick calc, not research |
| Phase 5a | Skip | Citations API documented; standard HTTP pattern |
| Phase 5b | Skip | ts-fsrs KD-06 locked |
| Phase 6 | Spike Excalidraw+Svelte interop | React peer dep + font self-hosting needs validation |

---

## Researcher Conflicts and Resolutions

No fundamental conflicts between the 4 researchers. Minor note: ARCHITECTURE.md references "tldraw or Excalidraw" in Whiteboard.svelte, while STACK.md definitively recommends Excalidraw only. Resolution: Excalidraw wins; update architecture doc references in Phase 6 planning.

---

## Requirements Changes Surfaced by Research

### Additions recommended (add to PROJECT.md before roadmap finalization):

| ID | Description | Severity | Source |
|----|-------------|----------|--------|
| REQ-NEW-A | Command palette (Cmd+P) + quick switcher (Cmd+O) | CRITICAL | FEATURES F-MISS-01 |
| REQ-NEW-B | Multi-session sidebar (4 courses minimum) | CRITICAL | FEATURES F-MISS-02 |
| REQ-NEW-C | Sync status surface (toast + status bar) | HIGH | FEATURES F-MISS-03 |
| REQ-NEW-D | Settings / preferences UI | HIGH | FEATURES F-MISS-04 |
| REQ-NEW-E | Review-mode focus screen | HIGH | FEATURES F-MISS-05 |
| REQ-NEW-F | First-run onboarding flow | MEDIUM | FEATURES F-MISS-09 |
| REQ-NEW-G | `.mneme/rules/` per-course system prompts (optional) | MEDIUM | FEATURES F-DIFF-08 |

### OOS additions recommended:
- OOS-06: Manual mind-map/whiteboard drawing (AI-generated, not user-drawn)
- OOS-07: Plugin/extensibility API (Claude Code skills are the extensibility layer)
- OOS-08: Multi-LLM-provider support (KP-04 locks Claude CLI; multi-vendor breaks compliance)
- OOS-09: Voice/audio dictation (lecture captions provide transcription; commute-mode OOS-02)

### Stack change requiring user acknowledgment:
- **KD-08 update**: Replace tldraw with Excalidraw v0.18.1 (MIT) — tldraw v4.x is proprietary (production license required or mandatory watermark). This is a KP-02 compliance issue.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library versions verified on npm/Context7/GitHub 2026-05-06; licenses confirmed from GitHub LICENSE files |
| Features | HIGH | 8 reference products cross-checked against live 2026 docs/changelogs; 9 missing items discovered via systematic audit |
| Architecture | HIGH | Stack and subprocess pattern locked by spike 002; subsystem decomposition derived directly from PROJECT.md constraints |
| Pitfalls | HIGH (technical) / MEDIUM (KG) | Tauri/Claude/FSRS/markdown pitfalls verified vs CVEs and GitHub issues; AI memory pitfalls from community evaluations |

**Overall confidence:** HIGH

### Gaps to Address

- **RQ-01 (memory project):** agentmemory recommended as base, but confidence/bitemporal field adequacy needs a 1-day schema spike before Phase 3 commit. Alternative: Cognee as CLI subprocess if agentmemory graph is insufficient.
- **Echo360 WKWebView ITP behavior:** Zero empirical data on macOS 13.4 + Tauri 2 + USYD SSO. Must spike before Phase 3.
- **Tiptap markdown round-trip with YAML frontmatter + wikilinks:** Issue #7147 documents non-lossless round-trips. Needs integration test on representative concept page before Phase 2 ships.
- **Caption translation ToS:** Use API-key billing not OAuth subscription to avoid Anthropic "thin wrapper" concern. Architecture already clean; just document the billing choice.
- **Intel Mac Ollama performance:** nomic-embed-text (274MB) runs ~30s-2min on Intel CPU. Plan batch-only, never real-time. `all-minilm` (45MB) available as fallback. Only relevant in Phase 6+.

---

## Sources

### Primary (HIGH confidence)
- Spike 002 (`CONVENTIONS.md`, `claude-subprocess.md`, `tauri-shell-ui.md`) — locked subprocess pattern and rendering conventions
- npm registry / Context7: ts-fsrs v5.3.2, Excalidraw v0.18.1, Cytoscape.js v3.33.3, Tiptap v3.22.5, sqlite-vec v0.1.9, agentmemory v0.9.4
- GitHub LICENSE files: opcode (AGPL confirmed), tldraw v4 (proprietary confirmed), agentmemory (Apache-2.0 confirmed), Marker (GPL-3.0 + AI Pubs confirmed)
- CVE-2024-35222 (Tauri capability wildcard), CVE-2025-23207 (KaTeX XSS), tauri-apps/wry#848 (WKWebView ITP), tauri-apps/tauri#1896 (subprocess zombie)
- 8 reference product docs: NotebookLM, Obsidian, Heptabase, Anki, Cursor, Claude Desktop App Apr 2026, RemNote, Mem.ai/Reflect

### Secondary (MEDIUM confidence)
- AI memory tool benchmarks: n1n.ai 2026 comparison (Mem0/Zep/Letta/Cognee), Cognee evaluation blog
- PDF-to-markdown comparisons: themenonlab.blog 2026, Jimmy Song 2026
- Graph visualization: PkgPulse 2026 (Cytoscape vs vis-network vs Sigma)
- BSWEN blog 2026-03: stream-json custom UI for Claude Code
- Failory/stopscopecreep.com/1000.software: solo-dev abandonment statistics

### Tertiary (informing decisions, not primary evidence)
- tldraw hobby license terms — confirm watermark requirement
- Echo360 REST API docs — confirm institutional-only OAuth
- ts-fsrs#300, Tiptap#7147, FSRS4Anki tutorial (Hard button misuse)

---

*Research completed: 2026-05-06*
*Ready for roadmap: YES — pending user acknowledgment of tldraw-to-Excalidraw switch and echo360-webview spike scheduling*
