# Architecture Research

**Domain:** Personal desktop learning app wrapping local Claude Code (USYD CS, single-user, local-first, AI-native KG + FSRS)
**Researched:** 2026-05-06
**Confidence:** HIGH (stack locked by spike 002; subsystem decomposition derives directly from PROJECT.md REQ-01..REQ-10 + KP/KD constraints)

> **Spike-validated stack — DO NOT propose alternatives**: Tauri 2 + SvelteKit (`adapter-static` SPA) + `tauri-plugin-shell` spawning real `claude` CLI + JSONL stream parse. All architecture below honors this and KP-01 (local-first), KP-03 (AI-native data), KP-04 (compliant subprocess wrapping), KD-07 (no vector DB by default).

---

## 1. Executive Architecture Summary

learn-os is a **Rust-shell-thin / TypeScript-fat** desktop app. The Rust side (Tauri core + plugin layer) owns OS-level concerns: process spawning, filesystem, file-watching, native webview, OS keychain. The TypeScript/Svelte side owns the *entire* product semantics: chat UI, JSONL parsing, vault model, knowledge graph, mind-map render, FSRS, sync orchestration. There is **no in-house Rust business logic** beyond bridging.

This split is deliberate:
1. **Subprocess pattern** (KP-04) means Claude itself is the agent runtime — Rust doesn't need to host a "smart" backend.
2. **Local-first markdown** (KP-01) means there's no server, no API, no DB cluster — TS can directly read/write the vault via Tauri filesystem APIs.
3. **AI-native data** (KP-03) lives most naturally where the AI events are parsed — that's TypeScript, where the JSONL stream lands.

The architecture has **three concentric rings** + one **gateway plane**:

- **Outer ring — Adapters** (Rust + tiny TS): subprocess controller, vault filesystem, Echo360 webview, external API clients
- **Middle ring — Domain core** (TS, the bulk): Vault Model, Knowledge Graph, FSRS, Sync, Caption Pipeline, Citations Anchored Mode
- **Inner ring — View layer** (Svelte 5): three-pane shell, chat, mind-map/whiteboard, review screen, source curator
- **Gateway plane — Event Bus**: a single in-process pub/sub the rest of the system speaks through, so subsystems remain decoupled

**Critical anti-coupling rule (top-level):** *No view component reaches outside the inner ring directly. No domain module touches Tauri APIs directly except through its designated adapter.* The Event Bus and a few well-typed service interfaces are the only legal cross-ring channels.

---

## 2. System Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VIEW LAYER (Svelte 5)                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ Three-Pane Shell│  │ Mind-Map / WB    │  │ Review Mode (FSRS)           │ │
│  │ (file tree /    │  │ (Cytoscape /     │  │ (single-screen test prompt + │ │
│  │  video / chat)  │  │  tldraw)         │  │  rating buttons 1-2-3-4)     │ │
│  └────────┬────────┘  └────────┬─────────┘  └──────────────┬───────────────┘ │
│           │                    │                            │                  │
│  ┌────────┴────────────────────┴────────────────────────────┴───────────────┐ │
│  │            Reactive State Stores (Svelte 5 runes: $state / $derived)     │ │
│  │  chatSession  vaultIndex  graphSnapshot  reviewQueue  syncStatus         │ │
│  └──────────────────────────────┬──────────────────────────────────────────┘ │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │  (subscribes to Event Bus)
┌──────────────────────────────────┴──────────────────────────────────────────┐
│                   GATEWAY: In-Process Event Bus (TS, pub/sub)                 │
│  Topics: chat.* | vault.* | graph.* | review.* | sync.* | citation.*         │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────────────────┘
   │      │      │      │      │      │      │      │      │
┌──┴──┐┌──┴──┐┌──┴──┐┌──┴──┐┌──┴──┐┌──┴──┐┌──┴──┐┌──┴──┐┌──┴────────────────┐
│Sub- ││Vault││ KG  ││Anch.││FSRS ││Sync ││Capt.││Ext. ││ Embedding Worker  │
│proc ││Model││Layer││Mode ││Sched││Ctlr ││Pipe ││ APIs││ (lazy, on-demand) │
│Ctlr ││     ││     ││     ││     ││     ││     ││     ││                   │
└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└────────┬──────────┘
   │      │      │      │      │      │      │      │             │
   │   DOMAIN CORE (TypeScript) — pure logic, no Tauri/DOM coupling │
   │      │      │      │      │      │      │      │             │
┌──┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴─────────────┴──────────┐
│                     ADAPTER LAYER (TS thin wrappers)                         │
│  Shell-cmd  fs/watch  Tauri-store  HTTP-fetch  Webview-bridge  Keychain     │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
   │          │          │          │          │          │ (Tauri IPC)
┌──┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────────────┐
│                 RUST CORE (Tauri 2 + plugins, minimal logic)                 │
│  tauri-plugin-shell  fs API  tauri-plugin-store  http  webview  keychain    │
└─────┬───────────────────────────────────────────────────────────────────────┘
      │
┌─────┴────────────────────────┐  ┌────────────────────────┐  ┌─────────────┐
│  Local `claude` CLI binary   │  │  Local Markdown Vault   │  │  External   │
│  (subprocess, OAuth subs)    │  │  ~/StudyVault/          │  │  Canvas/Ed/ │
│  (real agent runtime)        │  │  (single source of      │  │  Echo360/   │
│                              │  │   truth, plain MD+YAML) │  │  Anthropic  │
└──────────────────────────────┘  └────────────────────────┘  └─────────────┘
```

Three observations on this shape:

1. **Claude subprocess and the vault are siblings**, both at the OS layer. They never call each other through the app — Claude reads the vault via its own `--add-dir`-scoped grep/glob (KD-07). The app only orchestrates (spawn Claude, watch vault changes) and observes (parse JSONL).
2. **Embedding Worker is dotted** — it's optional and lazy. KD-07 says no vector DB by default; embeddings only computed for KG edge maintenance and writing-time concept suggestions. Deferred to a later phase, plumbing kept clean for it.
3. **Event Bus is the only sanctioned diagonal** through the architecture. A view component that needs to know "did vault file X change?" subscribes to `vault.file_changed`, not to the Vault Model directly. This keeps ring boundaries sharp.

---

## 3. Subsystem Specifications

Each subsystem follows the same shape: **Owner / Boundary / Data flow / Dependencies / Build phase / Anti-coupling**.

### S1. Desktop Shell (Three-Pane UI + State Mgmt)

| Field | Value |
|-------|-------|
| **Owner** | Svelte 5 (frontend) — `src/routes/+page.svelte` + child components |
| **Language/Runtime** | TypeScript / Svelte runes (`$state`, `$derived`, `$effect`) |
| **Boundary (exposes)** | Layout slots, draggable splitters, top-bar mind-map host element, route to Review mode. Subscribes to all Event Bus topics for reactive rendering. |
| **Inputs** | User mouse/keyboard, Event Bus events (`chat.delta`, `vault.tree_updated`, `graph.node_added`, etc.) |
| **Outputs** | DOM updates only. Emits user-intent events to Event Bus (`chat.send`, `vault.open_file`, `review.start`). |
| **Dependencies (must exist first)** | Event Bus (S0), Reactive State Stores (S0) |
| **Build phase** | **P1** (foundation) — extends spike 002's single-pane chat into 3 panes + top bar. Empty-state mind-map + empty file tree are acceptable in P1. |
| **Anti-coupling rules** | (a) MUST NOT call Tauri APIs directly — goes through Adapter layer. (b) MUST NOT mutate KG / vault state — only reads from stores, writes via Event Bus intents. (c) MUST NOT parse JSONL — that's S2. |

**Notes:** Three-pane resizing with Svelte's `bind:` + `<div role="separator">` panel splitters is a non-trivial UX detail; user is design-conscious (per profile) so polish here matters. Use a battle-tested split-panel library (`svelte-splitpanes` or fork) per KP-02 (50% open-source rule).

### S2. Claude Subprocess Controller

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/subprocess/claude.ts` + supporting Rust capability allow-list |
| **Language/Runtime** | TS owns logic; Rust side is just `tauri-plugin-shell` config |
| **Boundary (exposes)** | `startSession(prompt, opts) → SessionHandle`, `cancelSession(id)`, `listActiveSessions()`. Emits to Event Bus: `chat.session_started`, `chat.delta`, `chat.tool_use`, `chat.tool_result`, `chat.thinking`, `chat.rate_limit`, `chat.result`, `chat.error`. |
| **Inputs** | User prompt + session config (model, anchored mode flag, system prompt override, `--add-dir` scope). |
| **Outputs** | Event Bus events (typed), one per JSONL `type` it observes. Persists conversation log to `_system/sessions/<id>.jsonl` for replay/audit. |
| **Dependencies** | Adapter (`tauri-plugin-shell` wrapper). No domain dependencies. |
| **Build phase** | **P1** — already validated in spike 002 end-to-end. P1 ships single-session; P2 adds multi-session (parallel courses). |
| **Anti-coupling rules** | (a) MUST be the *only* module that calls `Command.create("claude-bin", ...)`. (b) MUST NOT render UI — it emits events only. (c) MUST NOT touch the vault or KG directly — KG layer subscribes to its events. (d) MUST NOT hardcode prompt content — caller passes prompts; subsystem only manages the lifecycle. |

**Critical implementation rules** (from spike findings):
- JSONL line buffering with split-on-`\n` and partial-line carryover (CONVENTIONS.md, locked)
- DO NOT use `--bare` (breaks OAuth subscription auth)
- DO use `--permission-mode bypassPermissions` (required for tools in piped mode)
- `result` event is the only reliable session terminator — finalize markdown + KaTeX in `result` handler, NOT during streaming

**Multi-session model:** Each session is keyed by a uuid; all events carry `sessionId`; the Event Bus is multiplexed. The Shell subscribes per active tab/course. Avoid spawning more than ~2 concurrent claude subprocesses on a 2019 Intel MBP — costs (~$0.55/first call) and CPU pressure both bite.

### S3. Vault Layer (Markdown Filesystem + File Watching + Frontmatter)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/vault/` (split into `index.ts`, `frontmatter.ts`, `watcher.ts`, `types.ts`) |
| **Language/Runtime** | TS over Tauri's `@tauri-apps/plugin-fs` + `@tauri-apps/plugin-fs-watch` (or equivalent native watch) |
| **Boundary (exposes)** | `readNote(path) → Note`, `writeNote(path, content, fm)`, `listFolder(path)`, `watchVault() → AsyncIterator<VaultEvent>`, `parseFrontmatter(text)`, `globVault(pattern)`. Emits to Event Bus: `vault.file_added`, `vault.file_changed`, `vault.file_deleted`, `vault.tree_updated`. |
| **Inputs** | Filesystem events from Tauri watcher; write requests from KG layer / Sync controller / chat-driven note creation. |
| **Outputs** | Event Bus events; in-memory `vaultIndex` store (`Map<path, NoteMeta>`). |
| **Dependencies** | Tauri filesystem adapter only. |
| **Build phase** | **P1** — read/write/list/watch all needed for the basic file-tree pane. Frontmatter parse needed from day one because every note has YAML metadata. |
| **Anti-coupling rules** | (a) MUST be the *only* module calling Tauri filesystem APIs (no other subsystem reads/writes the vault directly). (b) MUST normalize all paths to forward-slash, vault-relative form before emitting events. (c) MUST debounce file-watcher events (200-500ms) to avoid event storms during git checkout / Canvas sync. (d) Git integration is OPTIONAL — must work without `.git/` present. |

**Frontmatter spec (locked for v1):**
```yaml
---
id: comp1234-vector-spaces        # stable slug, never renamed
type: concept | note | source | session
course: COMP1234                  # for course filtering
created: 2026-05-06T10:23:00Z
updated: 2026-05-06T10:23:00Z
tags: [linear-algebra, vectors]
links: [[../shared/eigenvalues]]  # human-readable wikilinks
fsrs:                             # only on type=concept
  stability: 5.2
  difficulty: 0.32
  due: 2026-05-12
  reps: 3
provenance:                       # which sessions touched this
  - session: 8f3a-...
    role: assistant
    timestamp: 2026-05-06T09:11:00Z
confidence: 0.86                  # KG-assigned; 0..1
---
```

**Vault path scheme** (per REQ-06):
```
~/StudyVault/
├── _system/                    # AI-only, hidden from file tree
│   ├── sessions/<sid>.jsonl    # full Claude session logs
│   ├── kg/graph.json           # serialized KG snapshot
│   ├── kg/embeddings.bin       # if/when embeddings used (P5+)
│   ├── fsrs/state.json         # FSRS scheduler state
│   └── sync/cursors.json       # Canvas/Ed updated_at cursors
├── _inbox/                     # Claude-generated drafts pending review
├── courses/
│   └── COMP1234/
│       ├── _source/            # read-only mirror of Canvas/Ed
│       │   ├── lectures/
│       │   ├── tutorials/
│       │   └── assignments/
│       ├── notes/
│       ├── concepts/           # one .md per concept (FSRS unit)
│       ├── practice/
│       └── INDEX.md            # auto-generated weekly progress
└── shared/                     # cross-course concepts
```

`_source/` writes are gated — only Sync controller may write there. The Vault layer enforces this with a path-prefix policy in `writeNote()`.

### S4. Knowledge Graph Layer (Three-Tier Memory + Concept Graph)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/kg/` (split: `nodes.ts`, `edges.ts`, `tiers.ts`, `extract.ts`, `persist.ts`) |
| **Language/Runtime** | TS, pure logic. Persists to `_system/kg/graph.json` via Vault layer. |
| **Boundary (exposes)** | `addConcept(node)`, `linkConcepts(a, b, type, weight)`, `queryByCourse(code)`, `queryNeighbors(nodeId, k)`, `weakestConcepts(courseCode, limit)`, `consolidateSession(sessionId)`. Emits to Event Bus: `graph.node_added`, `graph.node_updated`, `graph.edge_added`, `graph.tier_promoted`, `graph.snapshot_ready`. |
| **Inputs** | (a) Subscribes to `chat.result` — extracts facts from completed assistant turns. (b) Subscribes to `vault.file_changed` for concept-page edits — re-parses frontmatter `links:` for graph edges. |
| **Outputs** | In-memory graph (nodes + edges + tier classification) → `graphSnapshot` store; persistent `_system/kg/graph.json`. |
| **Dependencies** | Vault Layer (S3) for persistence + concept-page reads; Subprocess Controller (S2) events; Embedding Worker (S10, lazy/optional). |
| **Build phase** | **P3** — cannot start before vault (S3) and chat (S2) are solid. Within P3: tier 1 (working) ships first, tier 2 (episodic summaries) second, tier 3 (long-term consolidated facts) third. |
| **Anti-coupling rules** | (a) MUST NOT render anything — view layer reads from `graphSnapshot` store. (b) MUST NOT call Anthropic API directly for fact extraction — uses the existing chat session's `result` event payload. (c) MUST NOT spawn its own claude subprocess — fact extraction can request a *new* session via S2's `startSession()` if needed. (d) Embeddings are OPTIONAL — graph must function without them (textual link analysis from frontmatter `links:` + LLM-driven edge proposals). |

**Three-tier model** (per agentmemory pattern, KD-10):

| Tier | Storage | Retention | Promotion rule |
|------|---------|-----------|----------------|
| **Working** | In-memory only; recent N=20 messages of active sessions | Until `chat.result` fires | All assistant `text` blocks of current session |
| **Episodic** | `_system/kg/episodes/<sid>.json` (one JSON per session) | Until consolidated (~weekly) | On `chat.result`: LLM-summarize the session into 3-7 fact tuples `(subject, predicate, object, confidence, provenance)` |
| **Long-term** | `_system/kg/graph.json` nodes/edges; concept .md files in vault | Permanent | Confidence ≥ 0.8 AND appears in ≥ 2 episodes → promote to long-term node, write/update concept .md |

**Edge types** (typed, vocabulary fixed in v1):
- `prerequisite_of` — hard pedagogical ordering
- `instance_of` — generalization
- `applies_to` — concept used in domain
- `related_to` — generic catch-all (lowest confidence weight)
- `contradicts` — flagged for human review
- `derived_from` — provenance edge to a `_source/` lecture file

### S5. Mind-Map / Whiteboard View Layer

| Field | Value |
|-------|-------|
| **Owner** | Svelte components `src/lib/views/MindMap.svelte`, `src/lib/views/Whiteboard.svelte` |
| **Language/Runtime** | TS + Svelte 5; uses Cytoscape.js (mind-map default) and tldraw or Excalidraw (whiteboard freeform). |
| **Boundary (exposes)** | A `<MindMap courseCode="..." />` and `<Whiteboard scope="..." />` component. Reads `graphSnapshot` store; on user click, emits `vault.open_file` / `chat.send_with_context`. Renders read-only — no graph mutation here. |
| **Inputs** | `graphSnapshot` (reactive, from KG); user drag/zoom/click. |
| **Outputs** | DOM canvas rendering; user-intent events to Event Bus. |
| **Dependencies** | KG Layer (S4) — graph data must exist; Shell (S1) — for slot in top bar. |
| **Build phase** | **P4** — mind-map needs KG (P3) to be useful. Whiteboard is **P6+** (deferred — secondary view, not blocking core loop). |
| **Anti-coupling rules** | (a) MUST NEVER write to vault directly — reads only. To create a node, emit `graph.create_request` and let KG layer handle write. (b) MUST NOT call Cytoscape's persistence API to a separate file — single source of truth is KG layer. (c) MUST NOT call S2 directly — to "ask Claude about node X", emit `chat.send_with_context` with the node id. |

**Rendering model:** Both views derive their layout from the same `graphSnapshot`. Whiteboard adds *spatial freedom* (user-positioned nodes saved as a "view config" file in `_system/kg/views/<name>.json`) but the underlying graph data is shared.

### S6. Anchored Mode Controller (Citations API + Source Curation)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/anchored/` |
| **Language/Runtime** | TS; calls Anthropic Citations API directly via `fetch` (Tauri http) |
| **Boundary (exposes)** | `enterAnchoredMode(sourceFiles[])`, `askAnchored(prompt)`, `exitAnchoredMode()`, `extractCitations(response)`. Emits to Event Bus: `citation.answer_chunk`, `citation.span`, `citation.click_open`. |
| **Inputs** | User-curated list of vault file paths (from a "Sources" sidebar component); user prompt. |
| **Outputs** | Streaming chunks identical in shape to chat-mode `chat.delta`, plus inline `[file.md:42]` citations rendered as clickable links. |
| **Dependencies** | Vault Layer (S3) to read selected source contents and build the documents payload; Shell (S1) for the source-curator UI; HTTP adapter for Anthropic API. |
| **Build phase** | **P5** — ships *after* core chat + vault are stable. Reasoning: anchored mode is a parallel UX track that consumes the same chat bubble component but bypasses the subprocess. Doing it after P3 (KG) means citations can also create graph edges (`derived_from` to source files). |
| **Anti-coupling rules** | (a) MUST NOT spawn `claude` CLI — uses Anthropic Citations API directly (KD-05). (b) MUST NOT modify the vault — citations are render-only links that resolve via `vault.open_file` events. (c) MUST treat the doc payload as ephemeral — large source bundles do NOT get cached server-side; each anchored question rebuilds the documents array (cost concern flagged in REQ-08 Open Questions). |

**Mode toggle UX:** A single switch in the chat input area swaps which subsystem handles the prompt. Free-mode (S2) and anchored-mode (S6) are fully separate — different cost profiles, different behavior, but visually unified through the same chat bubble component.

### S7. FSRS Scheduler (Concept-Page Spaced Repetition)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/fsrs/` (uses `ts-fsrs` library, KD-06) |
| **Language/Runtime** | TS pure logic |
| **Boundary (exposes)** | `dueToday() → ConceptId[]`, `nextReview(conceptId, rating)`, `recomputeStability(conceptId, rating)`, `seedConcept(conceptId)`. Emits to Event Bus: `review.queue_updated`, `review.concept_due`. Reads concept frontmatter `fsrs:` block, writes back via Vault. |
| **Inputs** | Daily cron tick (on app launch + every N hours); user rating input (1-2-3-4) from Review screen. |
| **Outputs** | Updated `fsrs:` frontmatter on concept pages; `reviewQueue` reactive store. |
| **Dependencies** | Vault Layer (S3) for concept-page read/write; KG Layer (S4) for "graph weakness" ranking input. |
| **Build phase** | **P5** (parallel-able with Anchored Mode P5; both depend on KG P3 + Vault P1). |
| **Anti-coupling rules** | (a) MUST NOT generate test questions itself — Review View asks S2 to spawn a fresh claude session with the concept content + a "generate one test question" prompt template. (b) MUST NOT auto-modify difficulty without user rating — every weight update is gated by an explicit rating button. (c) MUST NOT depend on concept content beyond the frontmatter — algorithm operates on `(stability, difficulty, retrievability, last_review)` only. |

**Ranking input from KG:** `(graph weakness × FSRS due-ness)`. Graph weakness = function of (a) edge count to other concepts (fewer = weaker), (b) avg confidence of incoming edges, (c) days since last touched. The KG layer exposes `weakestConcepts(courseCode)`; FSRS multiplies that by retrievability score for the final queue order.

### S8. External Integrations (Canvas API + Ed API + Echo360 + Anthropic)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript modules `src/lib/external/{canvas,ed,echo360,anthropic}.ts` |
| **Language/Runtime** | TS; uses Tauri `http` for outbound, Tauri webview for Echo360 SSO, Tauri keychain plugin for token storage. |
| **Boundary (exposes)** | `canvas.listCourses()`, `canvas.getModule(...)`, `canvas.fetchFile(...)` ; `ed.listCourses()`, `ed.getThread(...)` ; `echo360.openLectureInWebview(url)`, `echo360.fetchCaptions(lectureId)` ; `anthropic.citationsApi(...)`. Emits: `external.canvas_synced`, `external.ed_thread_updated`, `external.echo360_logged_in`, etc. |
| **Inputs** | API tokens (Canvas/Ed in OS keychain), session cookies (Echo360 SSO). |
| **Outputs** | JSON payloads passed to Sync Controller (S9) and Caption Pipeline (S10); Echo360 webview rendered in middle pane. |
| **Dependencies** | Adapter layer for HTTP/keychain/webview; user's existing Canvas + Ed MCP setup (per REQ-03 — leverage, don't reinvent). |
| **Build phase** | Canvas + Ed = **P2** (needed for first-run import). Echo360 webview = **P3** (after vault has files). Anthropic Citations = **P5** (with Anchored Mode). |
| **Anti-coupling rules** | (a) MUST NOT cache responses to disk — Sync Controller owns persistence. (b) MUST NOT touch the vault — returns plain JSON; Sync converts to markdown. (c) Each integration is in its own file with its own retry/rate-limit policy — no shared "external client" base class (avoid premature abstraction). (d) Tokens are read from keychain on each call, not held in module-level vars (security). |

**Echo360 specific (KD-04):** The webview is *embedded* in the middle pane; first SSO login persists USYD cookie; subsequent loads are instant. The Tauri webview bridge exposes a single message channel for caption-URL extraction (postMessage from injected JS to Rust to TS).

### S9. Sync Controller (Canvas/Ed Incremental Sync + Cron)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/sync/` |
| **Language/Runtime** | TS; uses background timers (incremental on app launch; setInterval for nightly cron while app is open). |
| **Boundary (exposes)** | `firstRunImport(selectedCourses[])`, `incrementalSync()`, `forceFullSync(courseCode)`, `subscribeStatus(callback)`. Emits: `sync.started`, `sync.file_added`, `sync.file_updated`, `sync.file_deleted`, `sync.completed`, `sync.error`. |
| **Inputs** | Cron tick / app-launch trigger / user manual sync request. |
| **Outputs** | Vault writes (under `_source/` only); cursor state in `_system/sync/cursors.json` (Canvas `updated_at` + ETag values). |
| **Dependencies** | External Integrations (S8); Vault Layer (S3). |
| **Build phase** | **P2** — first-run import is a major UX step (REQ-03). Incremental sync is also P2. |
| **Anti-coupling rules** | (a) MUST be the *only* writer to `_source/` paths — Vault layer enforces this with `writeAllowedFor(path, sourceModule)`. (b) MUST NOT modify user-writable areas (`notes/`, `concepts/`). (c) MUST be cancellable mid-sync — long fetches are AbortSignal-aware. (d) MUST emit per-file events for live UI feedback (toast on new announcement etc.). |

**Deletion handling** (REQ-03 Open Question): default policy = move to `_system/trash/<date>/` rather than hard delete, so accidental Canvas deletions don't lose user-annotated source files. User can purge manually.

### S10. Caption Pipeline (VTT Pull → Translate → Persist → Search)

| Field | Value |
|-------|-------|
| **Owner** | TypeScript module `src/lib/captions/` |
| **Language/Runtime** | TS |
| **Boundary (exposes)** | `pullCaptions(lectureId) → VTT`, `translateBilingual(vtt) → BilingualVTT`, `searchCues(query) → Cue[]`. Emits: `captions.pulled`, `captions.translated`, `captions.indexed`. |
| **Inputs** | Echo360 caption URLs from S8; lecture metadata from `_source/lectures/`. |
| **Outputs** | Bilingual `.vtt` files in `_source/lectures/<id>.bilingual.vtt`; search index in memory (regex/grep over cue text). |
| **Dependencies** | External Integrations S8 (Echo360); Vault S3 (write `_source/lectures/`); S2 to call Claude for translation. |
| **Build phase** | **P4** — depends on Echo360 (P3). Translation is cost-sensitive (long lectures), so first ship pull + persist; translation is a separate sub-phase. |
| **Anti-coupling rules** | (a) MUST batch-translate per-cue with rate-limit awareness — one HTTP per cue is wasteful; batch ~50 cues per Claude call. (b) MUST cache translations idempotently — re-running translate must not re-bill the user. (c) MUST NOT write to `_source/` outside its lecture VTT files. |

---

## 4. Adapter Layer (Detail)

The Adapter layer is intentionally *thin*. Each adapter is a single TS file that wraps a Tauri API into a typed function — no logic, no caching, no retry. Logic lives in the domain modules above.

| Adapter | File | Wraps | Used by |
|---------|------|-------|---------|
| Shell-cmd | `src/lib/adapters/shell.ts` | `@tauri-apps/plugin-shell.Command` | S2 only |
| FS read/write | `src/lib/adapters/fs.ts` | `@tauri-apps/plugin-fs` | S3 only |
| FS watcher | `src/lib/adapters/fs-watch.ts` | Tauri fs-watch | S3 only |
| HTTP | `src/lib/adapters/http.ts` | `@tauri-apps/plugin-http` | S6, S8 |
| Webview-bridge | `src/lib/adapters/webview.ts` | Tauri window/webview event channels | S8 (Echo360) |
| Keychain | `src/lib/adapters/keychain.ts` | `@tauri-apps/plugin-stronghold` or OS keyring | S8 (token storage) |
| Tauri-store (KV) | `src/lib/adapters/store.ts` | `@tauri-apps/plugin-store` | rare; for app-level prefs only |

Rust-side `lib.rs` registers these plugins; `capabilities/default.json` allow-lists their commands.

---

## 5. Event Bus (The Gateway)

A single in-process pub/sub. **No external dependency** — plain TS class with `Map<topic, Set<handler>>`. Roughly 100 lines.

```typescript
// src/lib/bus/event-bus.ts
type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler<any>>>();

  on<T>(topic: string, handler: Handler<T>): () => void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, new Set());
    this.handlers.get(topic)!.add(handler);
    return () => this.handlers.get(topic)!.delete(handler);
  }

  emit<T>(topic: string, payload: T): void {
    this.handlers.get(topic)?.forEach((h) => {
      try { h(payload); } catch (e) { console.error(`[bus] handler error on ${topic}:`, e); }
    });
  }
}

export const bus = new EventBus();
```

**Topic naming:** `<subsystem>.<verb_object>` — `chat.delta`, `vault.file_changed`, `graph.node_added`, `review.concept_due`, `sync.completed`. Past-tense for facts; imperative for intents (`chat.send_with_context`).

**Why not RxJS / nanostores / Svelte stores everywhere?** Svelte runes already provide reactive *state*. The bus provides reactive *events* — orthogonal concern. Stores hold the current snapshot; bus broadcasts transitions. Mixing them creates confusing dual-source-of-truth bugs.

---

## 6. Recommended Project Structure

```
learn-os/
├── src-tauri/
│   ├── src/lib.rs                          # Tauri builder + plugin registration only
│   ├── capabilities/default.json           # shell:allow-spawn + fs allow-list
│   ├── Cargo.toml
│   ├── rust-toolchain.toml                 # pinned 1.88
│   └── tauri.conf.json
├── src/
│   ├── routes/
│   │   ├── +layout.ts                      # ssr=false; prerender=true (KD-01)
│   │   ├── +page.svelte                    # three-pane shell (S1)
│   │   └── review/+page.svelte             # FSRS review mode (single-screen)
│   ├── lib/
│   │   ├── adapters/                       # thin Tauri wrappers (Section 4)
│   │   │   ├── shell.ts
│   │   │   ├── fs.ts
│   │   │   ├── fs-watch.ts
│   │   │   ├── http.ts
│   │   │   ├── webview.ts
│   │   │   └── keychain.ts
│   │   ├── bus/event-bus.ts                # gateway pub/sub (Section 5)
│   │   ├── stores/                         # Svelte 5 reactive stores
│   │   │   ├── chat-session.svelte.ts
│   │   │   ├── vault-index.svelte.ts
│   │   │   ├── graph-snapshot.svelte.ts
│   │   │   ├── review-queue.svelte.ts
│   │   │   └── sync-status.svelte.ts
│   │   ├── subprocess/                     # S2
│   │   │   ├── claude.ts                   # spawn + JSONL parse + dispatch
│   │   │   ├── events.ts                   # JSONL event types (taxonomy)
│   │   │   └── session-log.ts              # persist to _system/sessions/
│   │   ├── vault/                          # S3
│   │   │   ├── index.ts                    # public API
│   │   │   ├── frontmatter.ts              # YAML parse/serialize
│   │   │   ├── watcher.ts                  # debounced FS watch -> bus events
│   │   │   ├── policy.ts                   # write-allowlist (e.g. _source/ gated)
│   │   │   └── types.ts
│   │   ├── kg/                             # S4
│   │   │   ├── nodes.ts
│   │   │   ├── edges.ts
│   │   │   ├── tiers.ts                    # working/episodic/long-term
│   │   │   ├── extract.ts                  # session -> facts (uses S2)
│   │   │   ├── persist.ts                  # graph.json read/write
│   │   │   └── weakness.ts                 # graph-side scoring for FSRS
│   │   ├── views/                          # S5
│   │   │   ├── MindMap.svelte              # Cytoscape.js wrapper
│   │   │   ├── Whiteboard.svelte           # tldraw/Excalidraw wrapper (P6+)
│   │   │   └── layout-cache.ts             # _system/kg/views/<name>.json
│   │   ├── anchored/                       # S6
│   │   │   ├── citations.ts                # Anthropic Citations API client
│   │   │   ├── source-curator.ts           # vault subset selection logic
│   │   │   └── render-citations.ts         # [file:line] -> clickable links
│   │   ├── fsrs/                           # S7
│   │   │   ├── scheduler.ts                # ts-fsrs wrapper
│   │   │   ├── queue.ts                    # daily ranking with KG weakness
│   │   │   └── question-gen.ts             # prompts S2 to generate test Q
│   │   ├── external/                       # S8
│   │   │   ├── canvas.ts
│   │   │   ├── ed.ts
│   │   │   ├── echo360.ts
│   │   │   └── anthropic.ts                # only for Citations API
│   │   ├── sync/                           # S9
│   │   │   ├── controller.ts
│   │   │   ├── cursors.ts                  # _system/sync/cursors.json
│   │   │   └── trash.ts                    # safe-delete policy
│   │   ├── captions/                       # S10
│   │   │   ├── vtt.ts                      # parse VTT
│   │   │   ├── translate.ts                # batched per-cue translation
│   │   │   └── search.ts                   # in-memory cue search
│   │   ├── render/                         # shared rendering helpers
│   │   │   ├── markdown.ts                 # marked + DOMPurify (KD-02)
│   │   │   └── katex.ts                    # KaTeX with safe DOM walk
│   │   └── components/                     # reusable Svelte components
│   │       ├── ChatBubble.svelte
│   │       ├── FileTree.svelte
│   │       ├── VideoPlayer.svelte
│   │       ├── ToolUseCard.svelte
│   │       └── ReviewRater.svelte
│   └── app.html
├── package.json
├── svelte.config.js                        # adapter-static
├── vite.config.js
├── tsconfig.json
└── .planning/                              # GSD workspace (ignored in PR diffs)
```

**Structure rationale:**
- `src/lib/` is sliced by *subsystem*, not by *layer* — within each subsystem you find both pure logic and any UI components specific to it. This avoids the "hexagonal but spread over 8 folders" anti-pattern that makes navigation painful.
- `adapters/`, `bus/`, `stores/`, `render/` are cross-cutting infrastructure folders. Everything else is a subsystem.
- Subsystem boundaries are enforced by **module imports**: `vault/` may import `adapters/fs`, but never `kg/`. KG may import `vault/` (it's a domain consumer of vault). This is checkable with a lint rule (eslint `no-restricted-imports`) in a later phase.

---

## 7. Build Sequence (Phase Ordering)

The roadmap should follow this dependency graph. Phases are not arbitrary — each later phase requires earlier phases' subsystems to be solid.

### **P1 — Shell + Subprocess Foundation** (extends spike 002)
**Subsystems delivered:** S1 (three-pane skeleton, only chat pane interactive), S2 (single-session claude subprocess), Vault basics (read-only file tree from S3 fragment), Event Bus, render helpers (markdown + KaTeX from spike).
**Why first:** The whole architecture depends on a working chat. Spike 002 already proved this works end-to-end; P1 hardens it (multi-session-ready architecture even if only single-session ships) and adds the panel layout.
**Exit criteria:** Three-pane resizable shell renders; single chat session streams correctly; vault file tree displays a real folder; KaTeX/markdown finalize on result; clicking a file path opens it in the middle pane (read-only viewer).

### **P2 — Vault Write + Canvas/Ed Sync**
**Subsystems delivered:** S3 (full vault with watcher + frontmatter + write policy), S8 partial (Canvas + Ed), S9 (first-run import + incremental sync).
**Why second:** Without sync, the app has no content for any later subsystem. KG needs files to graph; FSRS needs concept pages; mind-map needs structure. Get the *content pipeline* working before the AI-native layer.
**Exit criteria:** First-run wizard imports user-selected courses; vault tree shows real Canvas/Ed materials; incremental sync adds new files on next launch; deleted-on-Canvas files go to `_system/trash/`; toast notifications fire for new announcements.

### **P3 — Knowledge Graph (Tier 1 + 2) + Echo360 Webview**
**Subsystems delivered:** S4 (working + episodic tiers; long-term skeleton), S8 partial (Echo360 webview + SSO cookie persist).
**Why third:** This is where the AI-native value proposition starts. Tier 1 (working memory) is auto-generated as user chats. Tier 2 (episodic summaries) consolidates each session on `result`. Long-term tier 3 is plumbed but not yet driving UI. Echo360 webview lands here because (a) it's needed for the middle pane to show videos alongside vault notes, (b) it unblocks the caption pipeline next phase.
**Exit criteria:** Each completed chat session writes `_system/kg/episodes/<sid>.json` with extracted fact tuples; concept pages auto-update their frontmatter `provenance:` and `confidence:`; Echo360 lecture loads in middle pane after one-time SSO; KG snapshot saves to disk on every change.

### **P4 — Mind-Map View + Caption Pipeline**
**Subsystems delivered:** S5 (Cytoscape.js mind-map only; whiteboard deferred), S10 (VTT pull + persist; translation as sub-step).
**Why fourth:** Now that KG has data, the mind-map view becomes meaningful. Captions land here because Echo360 (P3) is required and KG now exists to connect caption-mentioned concepts to their nodes.
**Exit criteria:** Top-bar mind-map renders the active course's KG; clicking a node opens the concept's `.md` file; mind-map updates live as new concepts emerge from streaming sessions; bilingual VTT files exist for played lectures and are searchable from the file tree's search bar.

### **P5 — Anchored Mode + FSRS Reviews**
**Subsystems delivered:** S6 (Anchored Mode + Citations API), S7 (FSRS scheduler + Review screen).
**Why fifth:** Both depend on a populated vault with concept pages (P3) and a meaningful KG (P3 long-term tier promotion). Both are *parallel* P5 sub-tracks — independent; can be split into P5a (Anchored) and P5b (FSRS) if executed in parallel.
**Exit criteria:** Anchored toggle in chat input swaps to Citations API; answers cite `[file.md:42]` clickable links; review queue ranks concepts by `(graph weakness × FSRS due-ness)`; review screen collapses three-pane to single screen, shows AI-generated test question, accepts 1-2-3-4 rating, schedules next review.

### **P6+ — Polish, Whiteboard, Embeddings (deferred)**
**Subsystems delivered:** Whiteboard view, optional embedding worker for narrow real-time-relevance hot paths (per KD-07), KG long-term consolidation refinements, `_inbox/` triage UI for Claude-generated drafts.
**Why deferred:** None block the core "learn → AI teaches → notes captured → reviewed" loop. Each is value-additive but not architecturally critical.

### Visualization of dependencies

```
P1 (Shell + Subprocess) ──┬──> P2 (Vault Write + Sync) ──┬──> P3 (KG + Echo360) ──┬──> P4 (Mind-Map + Captions) ──┐
                          │                              │                          │                                │
                          │                              │                          ├──> P5a (Anchored Mode) ────────┤
                          │                              │                          │                                ├──> P6+
                          │                              │                          └──> P5b (FSRS Reviews) ─────────┘
                          │                              │
                          │                              └─ KG Tier 1 (working) and Tier 2 (episodic) only in P3;
                          │                                 Tier 3 (long-term) graduates concept pages in P4-P5
                          │
                          └─ Multi-session subprocess support is "ready" in P1 architecture but only used in P3+
```

**Phases that need deeper research flags:**
- **P3 KG layer**: open question RQ-01 (which memory project to base on). MUST run a focused research pass before plan phase. Candidates: Mem0, Cognee, Zep, agentmemory, SimpleMem.
- **P4 Caption translation**: cost research — translating 4 courses × 12 lectures × ~80 cues each = ~3800 Claude calls. Need batching strategy.
- **P5 Anchored mode**: Citations API cost when passing large vault subsets — need a chunking strategy research pass.

---

## 8. End-to-End Sequence Diagram (Critical User Journey)

**Journey:** User types "explain eigendecomposition" in the chat → Claude streams answer → mind-map gets a new "eigendecomposition" node → vault gains/updates `courses/MATH1234/concepts/eigendecomposition.md`.

```
User      Shell(S1)    Bus      SubprocCtlr(S2)    claude CLI   Vault(S3)    KG(S4)     MindMap(S5)
 │            │         │             │                │            │           │            │
 │ types text │         │             │                │            │           │            │
 │ + clicks   │         │             │                │            │           │            │
 │ Send       │         │             │                │            │           │            │
 │───────────>│         │             │                │            │           │            │
 │            │ emit chat.send_       │                │            │           │            │
 │            │ requested              │                │            │           │            │
 │            │────────>│             │                │            │           │            │
 │            │         │ (S2 listens)│                │            │           │            │
 │            │         │────────────>│                │            │           │            │
 │            │         │             │ Command.create │            │           │            │
 │            │         │             │ ("claude-bin",  │            │           │            │
 │            │         │             │  --output-     │            │           │            │
 │            │         │             │  format        │            │           │            │
 │            │         │             │  stream-json,  │            │           │            │
 │            │         │             │  prompt)       │            │           │            │
 │            │         │             │───────────────>│            │           │            │
 │            │         │             │   spawn        │            │           │            │
 │            │         │             │   stdout       │            │           │            │
 │            │         │             │<───────────────│            │           │            │
 │            │         │             │ buffer split   │            │           │            │
 │            │         │             │ on \n          │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │             │ system/init    │            │           │            │
 │            │         │ chat.session_started          │            │           │            │
 │            │<────────│<────────────│                │            │           │            │
 │            │ shows status pill     │                │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │             │ stream_event   │            │           │            │
 │            │         │             │ (delta="Eigen")│            │           │            │
 │            │         │ chat.delta  │                │            │           │            │
 │            │<────────│<────────────│                │            │           │            │
 │            │ append raw text       │                │            │           │            │
 │            │ to assistant bubble   │                │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │             │ ... many       │            │           │            │
 │            │         │             │ stream_events  │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │             │ tool_use       │            │           │            │
 │            │         │             │ (Read source)  │            │           │            │
 │            │         │ chat.tool_  │                │            │           │            │
 │            │         │ use         │                │            │           │            │
 │            │<────────│<────────────│                │            │           │            │
 │            │ render tool-card      │                │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │             │ ... more       │            │           │            │
 │            │         │             │ stream_events  │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │             │ result         │            │           │            │
 │            │         │ chat.result │                │            │           │            │
 │            │<────────│<────────────│                │            │           │            │
 │            │ finalize markdown +   │                │            │           │            │
 │            │ KaTeX render bubble   │                │            │           │            │
 │            │         │             │                │            │           │            │
 │            │         │ (KG listens │                │            │           │            │
 │            │         │  to chat.   │                │            │           │            │
 │            │         │  result)    │                │            │           │            │
 │            │         │────────────────────────────────────────>──│           │            │
 │            │         │                              │            │           │            │
 │            │         │                       (KG extracts facts)             │            │
 │            │         │                       (calls S2 again with summarize  │            │
 │            │         │                        prompt for tier-2 episode)     │            │
 │            │         │                                          │            │           │            │
 │            │         │                                          │ writes     │            │
 │            │         │                                          │ episode    │            │
 │            │         │                                          │ JSON       │            │
 │            │         │                                          │ via Vault  │            │
 │            │         │                                          │───────────>│           │            │
 │            │         │                                          │            │            │            │
 │            │         │                                          │ writes new  │            │
 │            │         │                                          │ concept md  │            │
 │            │         │                                          │ if ≥ 2 ep   │            │
 │            │         │                                          │ + conf 0.8  │            │
 │            │         │                                          │───────────>│           │            │
 │            │         │                                          │            │            │            │
 │            │         │                                          │ FS watcher │           │            │
 │            │         │                                          │ fires      │           │            │
 │            │         │ vault.file_added                          │           │            │
 │            │<────────│<──────────────────────────────────────────│           │            │
 │            │ file tree refreshes in left pane                    │           │            │
 │            │         │                                          │           │            │
 │            │         │ graph.node_added                                      │            │
 │            │         │<───────────────────────────────────────────────────────│            │
 │            │         │ (MindMap listens)                                      │            │
 │            │         │────────────────────────────────────────────────────────────────────>│
 │            │         │                                                                      │
 │            │         │                                                       Cytoscape adds │
 │            │         │                                                       node + edges,  │
 │            │         │                                                       animates in    │
 │            │         │                                                                      │
 │            │ top-bar mind-map shows new "eigendecomposition" node connected to "linear      │
 │            │ algebra" and "matrix"; left pane now has concepts/eigendecomposition.md       │
 │<───────────│                                                                                │
```

**Key observations on this flow:**
1. **S1 (Shell) never talks to S4 (KG) or S2 (Subprocess) directly** — every cross-subsystem hop goes through the bus.
2. **Vault write is the natural KG-to-View propagation channel.** Because the Vault watcher fires on file change, the file tree (Shell) and mind-map (View) react to KG-driven writes the *same way* they would to user-driven edits. Single source of truth.
3. **KG can recursively call S2** for episode summarization. This is the only "internal" claude session — UI doesn't render it. Tag with `internal: true` in session config so it doesn't show up in chat history.
4. **Latency budget:** stream_event → chat.delta → DOM render must be < 50ms to feel real-time. Result → KG extract → file write → mind-map update can be up to ~3s; user perceives it as "the system is processing what we just discussed" which is acceptable.

---

## 9. Anti-Coupling Rules (Consolidated)

These rules are enforced by code review (later: by lint plugin) and are non-negotiable. They map directly to the architecture's correctness.

### View layer rules
1. **Mind-map / whiteboard MUST NEVER write to the vault directly.** All node creation goes through KG layer's API, which writes via Vault layer.
2. **No view component MUST EVER call Tauri APIs.** All native interaction goes through Adapter layer, exposed via domain modules.
3. **No view component MUST parse JSONL from claude.** That's S2 exclusively.

### Subprocess controller rules
4. **S2 MUST be the only spawner of `claude-bin`.** Anchored mode (S6) uses Anthropic Citations API directly — not the CLI. KG layer (S4) requests sessions via S2's public API, not via direct spawn.
5. **S2 MUST NOT touch the vault.** It writes session logs to `_system/sessions/` only via Vault's `writeNote()`.

### Vault layer rules
6. **Vault layer MUST be the only filesystem writer.** Sync controller, KG, FSRS, captions — all write through `vault.writeNote(path, content, fm)`.
7. **`_source/` writes MUST be allowed only from Sync Controller.** Vault enforces with a per-module path-prefix policy.
8. **Vault layer MUST NOT compute embeddings.** That's the (lazy/optional) Embedding Worker.

### KG layer rules
9. **KG MUST NOT render anything.** Views read from `graphSnapshot` store.
10. **KG MUST NOT call Anthropic API directly.** Episode summarization uses S2's claude subprocess with an `internal: true` flag.
11. **KG persistence MUST go through Vault layer** (writes to `_system/kg/...`). No direct file I/O.

### External integrations rules
12. **Each external module is independent.** No shared base class — premature abstraction tax.
13. **Tokens MUST be read fresh from keychain.** Never held in module-level vars longer than a single request.
14. **External modules MUST NOT touch the vault.** They return JSON; Sync Controller converts to markdown + writes.

### Anchored mode rules
15. **S6 MUST NOT spawn claude CLI.** Direct Anthropic Citations API only (KD-05).
16. **S6 MUST NOT modify the vault.** Citations are render-only links.

### FSRS rules
17. **S7 MUST NOT generate test questions itself.** Review View asks S2 to spawn a fresh session with the question-generation prompt template.
18. **S7 MUST NOT update difficulty without an explicit user rating.**

### Cross-cutting rules
19. **Event Bus topics MUST follow `<subsystem>.<verb_object>` naming.** Past-tense for facts, imperative for intents.
20. **No subsystem MUST EVER bypass the bus** to push state to a view. The bus + Svelte stores together are the single legal route.

---

## 10. Scaling Considerations

This is a single-user app, so "scaling" means *vault size and session history*, not user count.

| Scale | What breaks first | Mitigation |
|-------|-------------------|------------|
| 4 courses × 1 semester (~500 files, ~100 sessions) | Nothing — well within typical single-user vault | Default architecture handles this. |
| 4 courses × 4 semesters (~2,000 files, ~400 sessions) | KG `graph.json` deserialization on app launch (~50MB JSON parse → 1-3s blocking) | Lazy-load KG snapshots per active course; archive completed semesters to compressed `_system/archive/<semester>.json.gz`. |
| 8+ courses × 4 semesters | (a) File watcher event count; (b) mind-map render with >1000 nodes; (c) full-text caption search latency | (a) Scope watcher to active course only; (b) Cytoscape clustering / hide-by-confidence threshold; (c) introduce a small SQLite FTS5 index for caption + concept search (this is when SQLite earns its keep — KP-02 says use existing project). |
| Heavy chat usage (>50 sessions/day) | (a) `_system/sessions/` directory size; (b) Anthropic costs (each session ~$0.55 first call) | (a) Auto-rotate session logs older than 30 days into `_system/archive/sessions/<month>.tar.zst`; (b) UI exposes daily cost telemetry from `result.total_cost_usd`. |

**Scaling priorities:**
1. **First bottleneck** at ~2,000 vault files: KG snapshot load time. Fix: per-course snapshots + lazy-load.
2. **Second bottleneck** at ~50 sessions/day: session log directory growth. Fix: monthly archive job in `_system/archive/`.
3. **Third bottleneck** at ~5,000 files with embeddings active: in-memory embedding store. Fix: switch to a small local SQLite + sqlite-vec extension (still local-first, KP-01 honored).

KD-07's "no vector DB by default" is the right choice — agentic search via grep handles 95% of recall needs at this scale.

---

## 11. Anti-Patterns

### Anti-Pattern 1: Shoving KG logic into Rust
**What people do:** "Rust is faster, let's write the graph layer in Rust and expose it via Tauri commands."
**Why wrong:** (a) The KG layer's hottest path is LLM-driven fact extraction, which is network-bound, not CPU-bound. (b) Iterating graph rules in Rust is far slower than in TS. (c) Splits the graph data across two languages, requiring JSON IPC for every read.
**Do instead:** Keep KG in TS. If a profiler later proves a specific hotspot (e.g. embedding similarity), migrate that single function to Rust via a Tauri command. Premature.

### Anti-Pattern 2: Letting components subscribe to multiple bus topics directly
**What people do:** A Svelte component does `bus.on("vault.file_changed")` + `bus.on("graph.node_added")` + ... in `onMount`.
**Why wrong:** Tightly couples views to bus-topic stability; makes refactoring topics dangerous; scatters subscription logic.
**Do instead:** Components read from Svelte stores only. Stores are populated by a single "store-manager" that owns bus subscriptions. View → store → manager → bus, one direction.

### Anti-Pattern 3: Making `_source/` writable by everyone
**What people do:** "Sync wrote it, but I'm in the middle of fixing a typo in a lecture transcript, just edit it directly."
**Why wrong:** Next sync overwrites the user's edit silently. Trust eroded; vault becomes unreliable.
**Do instead:** `_source/` is strictly read-only-mirror. User annotations live in `notes/` with a frontmatter `links_to: <source_path>` pointing back. Vault layer enforces with a write-policy check.

### Anti-Pattern 4: Renaming nodes/concepts in the graph by changing their `id`
**What people do:** "User wants to rename `eigenvalues` → `eigen-decomposition`, just update the id."
**Why wrong:** Breaks every back-reference, every session log provenance, every FSRS history.
**Do instead:** `id` is immutable (slug-based, generated at creation). Display name (`title:` in frontmatter) is mutable. Always identify by `id`, render by `title`.

### Anti-Pattern 5: Streaming markdown render
**What people do:** Re-render assistant bubble through `marked` on every `chat.delta`.
**Why wrong:** Spike 002 verified — partial markdown breaks (unclosed code fences, half-tables). KaTeX walks DOM that's mid-mutation. Visual flicker; correctness bugs.
**Do instead:** Stream raw monospace text; on `chat.result`, single `marked` + KaTeX pass. Locked in spike CONVENTIONS.

### Anti-Pattern 6: Treating thinking blocks as visible content
**What people do:** "User wants to see the chain of thought, just render `thinking.content`."
**Why wrong:** For OAuth subscription users (which is everyone using this app), `thinking.thinking` is empty and `signature` is encrypted. There's nothing to render.
**Do instead:** Show "💭 thinking..." indicator chip during thinking blocks. Surface count + duration in telemetry. Never attempt to render the field.

### Anti-Pattern 7: Adding a vector DB "just in case"
**What people do:** "Let's set up SQLite + sqlite-vec on day one — eventually we'll want it."
**Why wrong:** KD-07 explicit non-architecture. Adds: embedding pipeline, staleness handling, schema migrations, indexing maintenance. Agentic grep handles recall well at single-user scale (Boris Cherny's own validated design).
**Do instead:** Ship without vector DB. If a specific feature (writing-time concept suggestions, KG edge maintenance) proves to need real-time relevance, *then* add a tightly-scoped embedding worker for that feature only.

### Anti-Pattern 8: Letting the mind-map become a separate source of truth
**What people do:** Cytoscape.js has its own JSON export — save the graph as Cytoscape format, ignore the KG layer.
**Why wrong:** Two graph stores diverge. AI sees one graph, user sees another.
**Do instead:** Cytoscape is a pure renderer. Single source = `_system/kg/graph.json`. View positions (where the user dragged a node) live in a *separate* `_system/kg/views/<name>.json` keyed by node id, applied as a layout override on top of the canonical graph data.

### Anti-Pattern 9: Making chat session history a direct file write per delta
**What people do:** `await fs.appendFile(sessionLog, deltaText)` on every `stream_event`.
**Why wrong:** Massive I/O amplification (~1000 writes/session). FS watcher storm. Slows streaming UX.
**Do instead:** Buffer in memory; on `chat.result`, write the entire session log atomically. Recovery from mid-session crash uses the in-memory buffer if app is alive, or the previous session log if it was completed.

---

## 12. Integration Points

### External services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| Local `claude` CLI | Subprocess (Tauri shell plugin) | KP-04 compliant; OAuth subscription auth; do NOT use `--bare`. |
| Canvas API | HTTPS + bearer token in keychain | Use existing user MCP setup as reference; honor `updated_at` + ETag for incremental sync. |
| Ed Discussion API | HTTPS + bearer token in keychain | Same pattern; user already has working pipeline (project_deadline_system memory). |
| Echo360 (lecture video + captions) | Embedded webview + persistent SSO cookie | KD-04; first launch shows USYD SSO; cookie persists in OS keychain via webview. |
| Anthropic Citations API | Direct HTTPS, bypasses claude CLI | KD-05; only for anchored mode; uses `ANTHROPIC_API_KEY` from keychain. |
| Filesystem (`~/StudyVault/`) | Tauri fs plugin + native watcher | Single source of truth for all user data. |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| View ↔ Stores | Svelte runes (`$derived`) | Reactive read; no writes from views except via emit-to-bus. |
| Store-manager ↔ Bus | `bus.on()` subscriptions | Manager owns subscriptions; stores never subscribe directly. |
| Domain ↔ Domain | Bus emit/subscribe + service-interface calls | Service calls are one-way; bus is the broadcast channel. |
| Domain ↔ Adapter | Direct typed function calls | Adapter is the *only* place where Tauri APIs appear. |
| Adapter ↔ Rust | Tauri IPC (auto-generated by plugins) | Capability allow-list in `capabilities/default.json`. |
| Subprocess ↔ Claude CLI | stdout JSONL, line-buffered | Locked pattern (CONVENTIONS.md); spike 002 validated. |
| KG ↔ Subprocess | Through S2 public API (`startSession({internal:true})`) | KG never spawns its own claude. |

---

## 13. Sources

**Spike-validated patterns** (HIGH confidence):
- `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/.planning/spikes/CONVENTIONS.md` — locked stack and subprocess pattern
- `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/.claude/skills/spike-findings-learn-os/references/claude-subprocess.md` — JSONL taxonomy + buffering rules
- `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/.claude/skills/spike-findings-learn-os/references/tauri-shell-ui.md` — Tauri 2 + SvelteKit shell architecture

**Project requirements** (HIGH confidence — single source of truth for "what to build"):
- `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/.planning/PROJECT.md` — REQ-01..REQ-10, KP-01..KP-06, KD-01..KD-10

**Domain references** (MEDIUM confidence — informed defaults but not yet locked by spike):
- agentmemory (rohitg00) three-tier memory pipeline — pattern reference for KG tiers (KD-10)
- GraphRAG papers — informs typed-edge concept graph
- ts-fsrs (`open-spaced-repetition/ts-fsrs`) — canonical FSRS-6 TS port (KD-06)
- Anthropic Citations API documentation (Jan 2025) — drives anchored mode design (KD-05)
- Boris Cherny / Anthropic Claude Code internal architecture decision (no RAG, agentic search) — drives KD-07
- agentic memory project survey — pending RQ-01 (will refine S4 details before P3 plan phase)

**Open questions flagged for later phase research:**
- RQ-01 (memory project survey) — must resolve before P3 KG implementation plan
- RQ-02 (PDF → markdown) — affects S9/Sync ingestion of Canvas PDFs (P2)
- RQ-03 (existing GUI wrappers for claude subprocess) — informs S2 hardening (P1)
- RQ-04 (GSD graphify reuse) — may shortcut KG implementation in P3

---

*Architecture research for: personal desktop learning app wrapping local Claude Code (USYD CS S1 2026)*
*Researched: 2026-05-06*
*Confidence: HIGH — stack and subprocess pattern locked by spike 002; subsystem decomposition derived directly from PROJECT.md REQ + KP + KD constraints*
