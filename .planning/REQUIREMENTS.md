# learn-os Requirements

> Scoped, testable, atomic requirements derived from `.planning/PROJECT.md` (REQ-01 through REQ-18, OOS-01 through OOS-09, KP-01 through KP-06, KD-01 through KD-12) and `.planning/research/SUMMARY.md`.

Status legend:
- `[ ]` — hypothesis (in scope, not yet shipped)
- `[x]` — validated (shipped + verified)
- `[~]` — partial (some sub-criteria done)

---

## v1 (MVP — ship-and-use-daily)

### Foundation

- [ ] **REQ-02 · Tauri 2 shell spawns local `claude` CLI subprocess**
  Acceptance: app shell can spawn / pause / kill `claude --print --permission-mode bypassPermissions --output-format stream-json --include-partial-messages --verbose <prompt>`; JSONL output is buffered, parsed, and dispatched by `type`; `result` event closes session cleanly with cost/duration shown. (Spike-002 validated; productionize in P1.)

### UI Shell

- [ ] **REQ-01 · Three-pane resizable main UI**
  Acceptance: left (course file tree), middle (PDF preview / placeholder for video pane), right (Claude chat with markdown + LaTeX rendering). All three panes resizable via drag; layout state persists across restarts. Top bar reserved for mind-map (rendered empty in v1).

- [ ] **REQ-11 · Command palette (Cmd+P / Cmd+O / Cmd+Shift+P)**
  Acceptance: Cmd+P fuzzy-search vault files; Cmd+O jumps to course / concept; Cmd+Shift+P universal action palette; ≥80% of in-app navigation reachable without mouse.

- [ ] **REQ-12 · Multi-session sidebar**
  Acceptance: collapsible sidebar lists active chat sessions; spawn / switch / rename / close; each session is an independent claude subprocess; sessions survive app restart via `--resume <session-id>`.

- [ ] **REQ-13 · Sync status surface**
  Acceptance: status bar widget shows last-synced timestamp + error count + next-scheduled; click → modal with per-course detail; auth/rate-limit/network errors each have distinct icons; new-item toasts for announcements + new files.

- [ ] **REQ-14 · Settings / preferences UI**
  Acceptance: categorized panel (General / Vault / Sync / Claude / Privacy / Appearance / Keybindings / Advanced); reachable via Cmd+,; vault path move + re-index works; cost cap (REQ-13-related kill switch) functions; theme toggle works; keybinding override works for top 5 actions.

- [ ] **REQ-16 · First-run onboarding wizard**
  Acceptance: 6-step wizard (Welcome → Confirm Claude Code auth → Vault path → MCP detection → Course selection → First sync); cancellable; resumable from `~/.learnos/onboarding-state.json`; landing into main UI shows an example chat prompt.

### Data & Sync

- [ ] **REQ-03 · Canvas + Ed import + scheduled sync**
  Acceptance: first run pulls all enrolled-course modules / files / pages / announcements; folder structure `courses/<COURSE_CODE>/_source/{lectures,tutorials,assignments,announcements.md}`; incremental sync on app launch (uses `updated_at` + ETag); full nightly cron; user-controllable per-course toggle; failures surface in REQ-13.

- [ ] **REQ-06 · Markdown vault (PARA + course-root structure)**
  Acceptance: vault root configurable; required dirs auto-created (`_system/`, `_inbox/`, `courses/`, `shared/`); each course has `_source/` (read-only mirror), `notes/`, `concepts/`, `practice/`, `INDEX.md`; YAML frontmatter on all written notes; `_source/` write-protected (REQ-03 is the only writer).

### AI core

- [ ] **REQ-10 · Agentic search default (no vector DB)**
  Acceptance: claude has `--add-dir <vault-root>` scope only; "我之前说过 X" type queries return correct refs in ≤10s; no separate embedding pipeline / no vector DB ships in v1; cost per typical query stays bounded (target ≤$0.10 amortized after first cache_creation).

---

## v1.x (post-MVP, ship in order)

### Video & captions

- [ ] **REQ-04 · Echo360 video integration via Tauri webview** *(GATED by spike `/gsd-spike echo360-webview-auth`)*
  Acceptance: middle pane embeds Tauri webview; first-run USYD SSO flow completes; cookie persists in macOS Keychain; video plays inside the webview with no external browser bounce; subsequent video loads are seamless.

- [ ] **REQ-05 · Caption capture + Claude bilingual VTT**
  Acceptance: each lecture's VTT auto-pulled; cue text translated EN ↔ ZH via Claude API; bilingual VTT saved to `courses/<CODE>/_source/lectures/<lec>.bilingual.vtt`; HTML5 `<video>` + `<track>` renders both; captions are full-text-searchable in vault.

### AI-native layer

- [ ] **REQ-07 · Dual-layer data architecture (KG + mind-map / whiteboard)** *(GATED by RQ-01 BLOCKING research)*
  Acceptance: human layer renders mind-map (Cytoscape.js) over current course; new chat session writes are streamed → fact extraction → embed → KG edges updated → mind-map node may animate in; AI layer has confidence + provenance + timestamp on each node; three-tier memory (working/episodic/long-term) functions; same source-of-truth (no parallel stores).

- [ ] **REQ-08 · Anchored mode (sources panel + Citations API)**
  Acceptance: chat panel toggle (free ↔ anchored); anchored mode passes user-checked vault files as documents to Anthropic Citations API; every assistant sentence ends with `[file.md:42]` clickable citation; click → vault file opens to that line; mode-switch is per-session, not global.

- [ ] **REQ-17 · Per-course system prompts via `.learnos/rules/`**
  Acceptance: rules stored at `courses/<COURSE>/.learnos/rules/<rule>.md` with YAML frontmatter (`enabled`, `priority`, `applies_to`); when starting chat in COURSE context, all enabled rules concatenated into `--append-system-prompt`; debug overlay shows which rules fired.

### Document ingestion

- [ ] **REQ-18 · Document → markdown ingestion (Marker for PDF + markitdown for Office)**
  Acceptance: on Canvas/Ed sync, extension-based dispatcher; `.pdf` → Marker subprocess (`--use_llm` for math); `.docx`/`.xlsx`/`.pptx`/`.html` → markitdown subprocess; `.md`/`.txt` passthrough; output at `courses/<CODE>/_source/<original>.md`; conversion errors surface in REQ-13.

### Review

- [ ] **REQ-09 · FSRS-6 spaced repetition on concept pages**
  Acceptance: each concept page has FSRS state (stability + difficulty + retrievability + 17 weights); daily-due queue ranked by `(graph weakness × FSRS due-ness)`; review entry triggers AI to generate a fresh test question; rating 1/2/3/4 flows back into FSRS scheduler; review history persisted to `_system/fsrs/history.jsonl`.

- [ ] **REQ-15 · Review focus mode (FSRS dedicated UI)**
  Acceptance: entering review queue collapses three-pane shell to single-concept full-screen view; keyboard `1/2/3/4` evaluates; AI generates a fresh test question per concept (no cached prompts); answer flows into FSRS via REQ-09; press Esc returns to main UI.

---

## v2+ (deferred — differentiator polish + experimental)

- [ ] Streaming-into-mind-map animation (new concepts slide into the top-bar mind-map as chat produces them; REQ-01 + REQ-07 fully wired)
- [ ] Whiteboard mode via Excalidraw (KD-08; secondary to mind-map; weekend integration sessions)
- [ ] Vector DB for narrowly-scoped real-time relevance (writing-time concept suggestions, KG edge maintenance) — only added if/when those features prove necessary
- [ ] Cross-course concept consolidation (move shared concepts to `shared/` automatically)
- [ ] Routine / scheduled prompts (Claude Code Routines integration)
- [ ] Past-paper exam → simulated study session (`practice/` integration)
- [ ] iCloud / Drive backup option for vault (opt-in, never automatic — KP-01)

---

## Out of Scope

| ID | Exclusion | Why |
|----|-----------|-----|
| OOS-01 | Multi-user / collaboration / distribution / commercialization | Personal use only — accounts/sharing/billing 10x surface area for no benefit. |
| OOS-02 | Mobile (iOS / Android) | Desk learning workflow; Tauri Mobile is too much complexity for marginal use. |
| OOS-03 | Custom-built vector DB / RAG infrastructure | Replaced by REQ-10 (agentic search); reserved for narrow real-time-relevance features later. |
| OOS-04 | Audio overview / video overview generation (NotebookLM-style) | Claude is poor producer; passive listening doesn't reward math/CS learning. |
| OOS-05 | Manual flashcard authoring (Anki-style) | Replaced by REQ-09 (concept-page FSRS). |
| OOS-06 | Manual mind-map drawing | Auto-generated from KG; user-drawn would create parallel source-of-truth (anti-pattern). |
| OOS-07 | Plugin / extensibility API | Claude Code's `skills` already serve this layer. |
| OOS-08 | Multi-LLM-provider support (OpenAI / Gemini / local Ollama) | KP-04 incompatibility; parallel auth + cost runtime is scope creep. |
| OOS-09 | Voice / audio dictation input | Captions cover audio content; voice input adds UX surface for marginal gain. |

---

## Phase-Gating Conditions (must resolve before phase entry)

| Gate | Blocks | Resolution required |
|------|--------|---------------------|
| RQ-01 BLOCKING (memory project survey) | REQ-07 / Phase 7 entry | 4-project comparison + 1-week dogfood + decision report (Phase 5.5 in ROADMAP.md) |
| `/gsd-spike echo360-webview-auth` | REQ-04 + REQ-05 / Phase 6 entry | SSO + cookie persistence verified in Tauri webview (Phase 5 in ROADMAP.md) |
| RQ-03 (GUI wrapper community implementations) | Phase 1 production hardening | Survey of opcode / TOKENICODE / others; pattern adoption decision (absorbed into Phase 1 plan-phase) |
| RQ-04 (graphify skill mechanics) | REQ-07 / Phase 7 design | Decide: reuse `graphify` directly / fork / replace (resolved during plan-phase 7) |

---

## Traceability

Every v1 + v1.x requirement maps to exactly one phase in ROADMAP.md. Phase numbering is "fine" granularity (11 phases total: Phases 0-10 with decimal Phase 5.5 as research-resolution gate).

| Requirement | Phase | Phase Name | Status |
|-------------|-------|------------|--------|
| REQ-01 (three-pane resizable UI) | Phase 1 | Tauri Shell Foundation + Subprocess Hardening | Pending |
| REQ-02 (Tauri spawns claude subprocess) | Phase 1 | Tauri Shell Foundation + Subprocess Hardening | Pending |
| REQ-03 (Canvas + Ed import + sync) | Phase 2 | Vault + Canvas/Ed Sync + Onboarding | Pending |
| REQ-04 (Echo360 video webview) | Phase 6 | Echo360 Video + Bilingual Captions | Pending (gated by Phase 5 spike) |
| REQ-05 (caption capture + bilingual VTT) | Phase 6 | Echo360 Video + Bilingual Captions | Pending (gated by Phase 5 spike) |
| REQ-06 (markdown vault PARA + course-root) | Phase 2 | Vault + Canvas/Ed Sync + Onboarding | Pending |
| REQ-07 (dual-layer data: KG + mind-map) | Phase 7 | Knowledge Graph + Three-Tier Memory | Pending (gated by Phase 5.5 RQ-01) |
| REQ-08 (anchored mode + Citations API) | Phase 9 | Anchored Mode + Citations API | Pending |
| REQ-09 (FSRS-6 spaced repetition) | Phase 10 | FSRS-6 Reviews + Focus Mode | Pending |
| REQ-10 (agentic search default) | Phase 1 | Tauri Shell Foundation + Subprocess Hardening | Pending |
| REQ-11 (command palette Cmd+P/O/Shift+P) | Phase 3 | Multi-Session + Command Palette + Editor | Pending |
| REQ-12 (multi-session sidebar) | Phase 3 | Multi-Session + Command Palette + Editor | Pending |
| REQ-13 (sync status surface) | Phase 2 | Vault + Canvas/Ed Sync + Onboarding | Pending |
| REQ-14 (settings / preferences UI) | Phase 2 | Vault + Canvas/Ed Sync + Onboarding | Pending |
| REQ-15 (review focus mode) | Phase 10 | FSRS-6 Reviews + Focus Mode | Pending |
| REQ-16 (first-run onboarding wizard) | Phase 2 | Vault + Canvas/Ed Sync + Onboarding | Pending |
| REQ-17 (per-course `.learnos/rules/`) | Phase 8 | Mind-Map View + Per-Course Rules | Pending |
| REQ-18 (document → markdown ingestion) | Phase 4 | Document Ingestion (PDF + Office → markdown) | Pending |

**Coverage:** 18 / 18 v1+v1.x requirements mapped. ✓ No orphans. ✓ No duplicates.

### Phase-to-Requirement Cluster Density

| Phase | Requirements | Count |
|-------|--------------|-------|
| Phase 0 | (naming/branding pre-work — no REQ) | 0 |
| Phase 1 | REQ-01, REQ-02, REQ-10 | 3 |
| Phase 2 | REQ-03, REQ-06, REQ-13, REQ-14, REQ-16 | 5 |
| Phase 3 | REQ-11, REQ-12 | 2 |
| Phase 4 | REQ-18 | 1 |
| Phase 5 | (Echo360 spike — no REQ; gates Phase 6) | 0 |
| Phase 5.5 | (RQ-01 research-resolution — no REQ; gates Phase 7) | 0 |
| Phase 6 | REQ-04, REQ-05 | 2 |
| Phase 7 | REQ-07 | 1 |
| Phase 8 | REQ-17 | 1 |
| Phase 9 | REQ-08 | 1 |
| Phase 10 | REQ-09, REQ-15 | 2 |

---

*Last updated: 2026-05-06 — traceability section populated by gsd-roadmapper after roadmap creation. Source documents: PROJECT.md, research/SUMMARY.md, spike-findings-learn-os skill, ROADMAP.md.*
