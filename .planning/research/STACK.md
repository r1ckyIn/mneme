# Stack Research — mneme Layered Libraries

> **⚠ POST-RESEARCH USER DECISIONS (2026-05-07) — reading this file standalone? Read PROJECT.md first.**
>
> Several recommendations below have been **overridden by user decisions** after this file was written. The content remains as the research record; conflicts with PROJECT.md are resolved IN FAVOR OF PROJECT.md.
>
> **Specifically**:
> - **Memory / KG library — NOT LOCKED.** agentmemory is shown as PRIMARY HIGH below but the user demoted it to "candidate, no public benchmark, fall-back only". Phase 5.5 (RQ-01 BLOCKING gate) must do a 4-project comparison + 1-week dogfood including Cognee + Zep+Graphiti + Mem0 + agentmemory before Phase 7 entry.
> - **`claude-code-parser` — DO NOT npm install.** Vendor the source into `vendor/claude-code-parser/` (KD-12). Project is effectively unmaintained.
> - **Whiteboard library is Excalidraw v0.18.1 MIT** (locked KD-08). tldraw v4.x rejected (proprietary).
> - **PDF/document ingestion is dual pipeline**: Marker for PDF, markitdown for Office (REQ-18).
> - **KP/KD scope expanded post-2026-05-07**: header below says "honor ... KD-01..KD-09" but KP has since extended to **KP-01..09** (added KP-07 proactive recall, KP-08 OSS dependency tracking, **KP-09 Anthropic/Claude aesthetic family**) and KD has extended to **KD-01..13** (added KD-13 visual aesthetic system per KP-09). The "Scope" line below is the original 2026-05-06 statement, kept for historical accuracy. New KP-09 + KD-13 imply that any UI library recommendation in this file must be cross-checked against `.planning/references/design/` for aesthetic compliance — when in doubt, see PROJECT.md KP-09 + KD-13.

**Domain:** Personal desktop learning app (Tauri 2 + SvelteKit shell wrapping local Claude Code)
**Researched:** 2026-05-06
**Decisions applied:** 2026-05-07
**Overall Confidence:** HIGH (verified versions on npm/Context7/GitHub as of research date)
**Scope:** This research covers the **additional OSS libraries to LAYER ON TOP of the locked Tauri 2 + SvelteKit + tauri-plugin-shell foundation**. It does NOT re-research the foundation (already validated by spikes 001 + 002). All recommendations honor KP-02 (50% rule), KP-04 (compliant subprocess wrapping), and KD-01..KD-09.

**Critical license boundary:** The user's app is for **personal use only** (KP-01, OOS-01: no distribution, no commercialization). However, **AGPL-3.0** dependencies are still strongly cautioned: even self-use compiled binaries would taint future open-sourcing decisions, and any code copied from AGPL projects would force the entire `mneme` to become AGPL on future open-sourcing. Treat AGPL as **read-only reference, never copy/fork**.

---

## Executive Summary by Capability

| # | Capability | Primary Pick | License | Confidence |
|---|-----------|--------------|---------|------------|
| 1 | PDF → AI-friendly markdown | **Marker (datalab-to/marker) v1.10.2** invoked as Python CLI subprocess | GPL-3.0 (code) + custom AI Pubs (weights, free for personal/research) | HIGH |
| 2 | Persistent agent memory + KG | **agentmemory by rohitg00 v0.9.4** (SQLite + hooks + MCP + Obsidian export) | Apache-2.0 | HIGH |
| 3 | Mind-map / graph viz | **Cytoscape.js v3.33.3** (with `dagre` layout extension) | MIT | HIGH |
| 4 | Whiteboard / spatial canvas | **Excalidraw v0.18.1** (`@excalidraw/excalidraw`) — NOT tldraw | MIT | HIGH |
| 5 | FSRS-6 spaced repetition | **ts-fsrs v5.3.2** (canonical, FSRS v6 implementation) | MIT | HIGH |
| 6 | Tiptap block editor + slash | **`@tiptap/starter-kit` v3.22.5** + `@tiptap/extension-mention` + custom slash via `@tiptap/suggestion` + community `tiptap-markdown` | MIT (all) | HIGH |
| 7 | Claude Code GUI reference impl | **Read-only study of opcode (AGPL, NO COPY) + claude-code-gui (MIT, OK to study patterns)** + `claude-code-parser` (MIT) for stream-json typing reference | mixed | HIGH |
| 8 | Echo360 lecture video integration | **No prior art exists** — Tauri webview + persistent cookies (validated by KD-04). Echo360 public REST API for caption VTT download (Swagger-documented) | n/a | MEDIUM |
| 9 | VTT parse + bilingual render | **`subtitle` v4.2.2** (TypeScript, stream-based) + Claude API for translation + native HTML5 `<track>` | MIT | HIGH |
| 10 | Local SQLite + sqlite-vec + Ollama | **rusqlite + sqlite-vec v0.1.9** (NOT tauri-plugin-sql) + Ollama HTTP API + `nomic-embed-text` model | Apache-2.0 / MIT (sqlite-vec dual) | HIGH |

---

## 1 · PDF → AI-friendly Markdown

### Primary: Marker (`datalab-to/marker`) v1.10.2 (Jan 2026)

| Field | Value |
|-------|-------|
| Repo | https://github.com/datalab-to/marker |
| License | **GPL-3.0** (code) + custom **AI Pubs Open Rail-M** (model weights — free for personal/research/<$2M revenue startups) |
| Latest version | v1.10.2 (released 2026-01-31) |
| Activity | Highly active — 13+ SDK versions and 8 library releases in single month (Feb 2026); Chandra 1.5 model released 2026-01-22 |
| Math support | LaTeX equations (inline `$` and display `$$`); use `--redo_inline_math` + `--use_llm` for "absolute highest quality inline math conversion" |
| Other features | Tables, forms, code blocks, multi-language, layout-preserving |
| Runtime | Python 3.10+, runs on GPU/CPU/MPS (Apple Silicon and Intel Mac via CPU) |

**Why primary:** Marker is the consensus 2026 winner for math-heavy PDFs in the open-source comparisons (Jimmy Song, themenonlab, dev.to). Specifically: (a) it formats inline math correctly when the `--use_llm` flag is enabled (we have local Claude — perfect synergy), (b) it handles tables/diagrams better than PyMuPDF4LLM (no-ML tool), (c) Datalab also publishes `Chandra` — a vision model specialized for math/handwriting/chemistry that ships inside Marker. Math is REQ for math-heavy USYD CS courses.

**Integration pattern (locked):** Invoke as a CLI subprocess from Tauri via `tauri-plugin-shell` (already integrated). Bundle a `marker_single` shell command. Output goes directly to vault under `courses/<CODE>/_source/lectures/<lec>.md`.

**License analysis for personal use:** GPL-3.0 on the code is fine because we **invoke as a separate CLI process** (no linking — process-boundary isolation). The model weights' "AI Pubs Open Rail-M" license explicitly permits personal/research use. **No legal concern for our use case.**

### Alternative: PyMuPDF4LLM v0.0.x

| Field | Value |
|-------|-------|
| Repo | https://github.com/pymupdf/pymupdf4llm |
| License | AGPL-3.0 (or commercial) — **CAUTION: copyleft** |
| Why alternative | Fast, no-ML, no-GPU, lightweight — good for native PDFs with selectable text. **But weaker math equation extraction.** |

**When to use alternative:** Pre-flight pass on PDFs that are clearly text-only (lecture handouts) where Marker's startup latency (loads Surya/Chandra models) is overkill. Likely **not worth integrating both** in v1 — start with Marker only.

### Avoided

- **MinerU** — strong on CJK layouts but Chinese-team-led, slower releases, weaker English math. (Acceptable distant 2nd; no need.)
- **Docling (IBM)** — production RAG-targeted, but the structured DoclingDocument format is overkill; Marker outputs cleaner markdown directly.
- **Nougat (Meta)** — abandoned (last major release 2023, archived in spirit).
- **LlamaParse** — cloud-only, violates KP-01 (local-first).

---

## 2 · Persistent Agent Memory + Knowledge Graph

### Primary: agentmemory (`rohitg00/agentmemory`) v0.9.4 (Apr 2026)

| Field | Value |
|-------|-------|
| Repo | https://github.com/rohitg00/agentmemory |
| License | **Apache-2.0** (permissive — clean) |
| Latest version | v0.9.4 (released 2026-04-29) |
| Stars | 2.2k |
| Activity | Highly active — 258 commits, 800+ tests, 51 MCP tools, continuous releases |
| Stack | **SQLite + iii-engine** (in-memory vector index + BM25), zero external DBs |
| Architecture | Three-tier: observation capture (hooks) → compression+indexing → context injection (SessionStart) |
| Obsidian integration | **Yes** — `OBSIDIAN_AUTO_EXPORT` flag exports memory facts as markdown into a vault |
| Provenance | Yes — "Citation provenance — Trace any memory back to source observations" |
| Hybrid search | BM25 + vector + KG (95.2% R@5 on LongMemEval-S vs ~55% keyword-only) |
| Confidence scoring | Inherited from Karpathy's LLM Wiki pattern; check `iii-engine` schema for explicit fields |
| Bitemporal | Partial — TTL expiry, supersession, lifecycle versioning; not full bitemporal like Zep |

**Why primary:** This is the EXACT three-tier pipeline described in REQ-07 + KD-10. The user's PROJECT.md already cites it as inspiration for the "agentmemory (rohitg00) — pipeline: SHA-256 dedup → privacy filter → LLM compress → embed → BM25+vector index → graph." Apache-2.0 lets us **fork-and-extend freely** (which is the explicit recommendation).

**Critical features for our needs:**
- ✅ Local-only (SQLite, no cloud, KP-01 compliant)
- ✅ Markdown vault integration (`OBSIDIAN_AUTO_EXPORT`)
- ✅ MCP server + Claude Code hooks (works with our subprocess pattern)
- ✅ Apache-2.0 — fork-friendly
- ⚠ Provenance: yes; confidence: inherited but verify in iii-engine source; bitemporal: incomplete — likely needs extension if we want full Zep-grade temporal modeling

**Integration pattern (recommended):**
1. **Phase 1 — Adopt as-is:** install agentmemory, point `OBSIDIAN_AUTO_EXPORT` at `~/StudyVault/_system/memory/`, register as MCP server visible to our wrapped Claude Code.
2. **Phase 2 — Extend schema:** if confidence/bitemporal/provenance fields are insufficient, fork and add fields to the iii-engine schema (Apache-2.0 permits unrestricted fork+extend).
3. **Phase 3 — Render to mind-map (REQ-07):** export a derived view from agentmemory's graph → Cytoscape.js JSON for the human-side mind-map.

### Alternative: Cognee (`topoteretes/cognee`) v1.0.8

| Field | Value |
|-------|-------|
| Repo | https://github.com/topoteretes/cognee |
| License | Apache-2.0 |
| Stars | 17.1k |
| Latest | v1.0.8 (2026-05-06) |
| Why alternative | Stronger structured-graph schema (GraphRAG style), ontology-grounding, more mature than agentmemory's KG layer. |
| Why not primary | **Python runtime requirement** (3.10–3.14) — would force us to ship Python alongside Tauri, or talk to Cognee Cloud (violates KP-01). Awkward fit for a Tauri/Rust desktop app. |

**When to use alternative:** If after Phase 1 we find agentmemory's KG isn't deep enough for our cross-document graph needs, Cognee can be invoked as a **CLI subprocess** (`cognee-cli remember`/`recall`) — same pattern as Marker — sidestepping the Python dependency injection problem. But adds Python runtime burden.

### Avoided

- **Mem0 (`mem0ai/mem0`)** — Apache-2.0, 54.9k stars, mature. Avoided as PRIMARY because it's vector-first (less aligned with our "graph for AI" REQ-07), and self-hosted requires Docker (heavier than agentmemory's single SQLite file). Acceptable secondary if agentmemory schema disappoints.
- **Zep (`getzep/zep`)** — Best temporal KG (Graphiti) but **community edition deprecated**, focus shifted to Zep Cloud. Violates KP-01 entirely. **Eliminated.**
- **Letta** — Multi-day persistent agents; overkill for our use case, less Apache-2.0/permissive.
- **SimpleMem** — Too lightweight, lacks the three-tier discipline we need.

### Tangential: graphify (`safishamsi/graphify`)

| Field | Value |
|-------|-------|
| Repo | https://github.com/safishamsi/graphify |
| License | MIT |
| Stars | 43.6k (growing fast) |
| Latest | v7 branch active |
| Output | `graph.json` (queryable), `graph.html` (interactive), `GRAPH_REPORT.md` |
| Other formats | GraphML (Gephi/yEd), Cypher (Neo4j), SVG, **Obsidian vault export** |
| Tech | Python 3.10+ CLI, Tree-sitter AST parsing, Leiden clustering |

**Role:** This is the same `graphify` referenced in user's RQ-04 (the GSD skill). It's an **independent open-source skill**, not just a GSD-internal thing. It's complementary to agentmemory: graphify's strength is **batch ingestion of code/docs/PDFs into a knowledge graph from a folder**; agentmemory's strength is **streaming-conversation-into-memory**. We can use **both**:
- agentmemory for live chat → memory pipeline (write side)
- graphify for periodic batch rebuild of the holistic course knowledge graph (read side)

Both export to JSON, both can feed Cytoscape.js renderer. **Recommendation: adopt both, but only graphify for explicit batch-recompute, never for live writes.**

---

## 3 · Mind-map / Graph Visualization

### Primary: Cytoscape.js v3.33.3 (Apr 2026)

| Field | Value |
|-------|-------|
| Repo | https://github.com/cytoscape/cytoscape.js |
| License | **MIT** |
| Latest | v3.33.3 (published 2026-04-29) |
| Weekly downloads | ~500K |
| Algorithms | Shortest-path, centrality (betweenness, eigenvector, degree), clustering — most comprehensive |
| Layouts | dagre, cose, fcose, breadthfirst, concentric, circle, etc. |
| Bundle | ~250KB minified gzipped (heavier than sigma but worth it for features) |

**Why primary:** Already favorited by user in PROJECT.md. Confirmed by 2026 ecosystem comparisons (PkgPulse, Linkurious, Cylynx) as the leading choice for **graph analysis + visualization**, which is exactly our use case (mind-map = graph visualization with selective layout, graph operations needed for "weakest concept" routing in REQ-09).

**Integration pattern:**
- Source: agentmemory KG export → JSON `{nodes:[], edges:[]}` (Cytoscape format)
- Layout: `dagre` extension (`cytoscape-dagre`) for course-structure DAG; `cose-bilkent` for free-form clusters
- Mounted in Svelte component via `cytoscape({ container, elements })`
- Live updates: when agentmemory writes a new fact, Cytoscape `cy.add()` + recompute layout for affected sub-region only
- **Important:** for the live-streaming-into-mindmap UX (REQ-07), use Cytoscape's native animation API (`.animate()`) on new nodes — not full re-layout each tick

### Alternative: vis-network v9.x

| Field | Value |
|-------|-------|
| Repo | https://github.com/visjs/vis-network |
| License | MIT (Apache-2.0 dual-licensed) |
| Why alternative | Best out-of-box interactive physics simulation; gentler learning curve |
| Why not primary | Smaller algorithm library; less customizable styling than Cytoscape |

**When to use:** If we ever pivot to a more "physics-y" visualization (e.g., free-form whiteboard with auto-arranging nodes) — but Excalidraw covers that better with full freehand control.

### Avoided

- **Sigma.js + graphology** — best for 100K+ node graphs, but our knowledge graph will be ~1K nodes for a single semester. Underutilized features, and layout/styling is more verbose than Cytoscape.
- **D3-graphviz** — not interactive (static SVG renders); doesn't fit live-mindmap UX.
- **Reaflow / React Flow** — React-only (we're Svelte); also more "diagram editor" than "knowledge graph" oriented.

---

## 4 · Whiteboard / Spatial Canvas

### Primary: Excalidraw v0.18.1 (Apr 2026) — NOT tldraw

| Field | Value |
|-------|-------|
| Repo | https://github.com/excalidraw/excalidraw |
| Package | `@excalidraw/excalidraw` v0.18.1 (npm) |
| License | **MIT** ✅ |
| Latest | v0.18.1 (published 2026-04-20) |
| Stars | 123k+ (>2.6× tldraw's 47k) |
| Active | Yes — recent releases, 3,986 commits, used by Google Cloud / Meta / CodeSandbox |
| React requirement | Yes (peer dependency) — we'll wrap in Svelte component |

**Why we MUST switch from tldraw to Excalidraw:**

tldraw is **NOT open-source anymore**. As of SDK 4.0:
- **License**: Proprietary (`tldraw/LICENSE.md`). Free in **development** environments only. **Production use requires a license key.**
- **Hobby license (free option)**: Discretionary — they can refuse, requires watermark "made with tldraw" on canvas, requires application form review.
- **Commercial**: $6,000/year per team.

For a personal-use single-user app this **could technically work via hobby license**, but:
1. The license is **discretionary** (they can revoke or refuse)
2. The watermark conflicts with our polish goal (KP-05 design-conscious)
3. **AGPL-equivalent risk** — if we ever open-source mneme, the tldraw dependency forces us to carry a non-OSS dependency forever
4. **REJECT REINVENTED WHEELS rule (KP-06) doesn't override license-poisoning** — tldraw's license is the bigger problem

Excalidraw is the correct primary choice: pure MIT, larger community, equally polished feature-set for our use case (free-form whiteboard with shapes, arrows, text, embedded markdown — all we need).

**Integration pattern:**
- Wrap `<Excalidraw>` React component inside a `<svelte:component>` host (Svelte+React interop is well-trod; see `svelte-react` glue or simply mount React via `createRoot()` in `onMount`)
- Persist scenes as JSON in vault `courses/<CODE>/whiteboards/<topic>.excalidraw.json`
- Self-host fonts: copy `node_modules/@excalidraw/excalidraw/dist/prod/fonts/*` to public assets (Tauri-bundled)

### Alternative: tldraw v4.5.11 (last MIT version: v2.x branch, archived)

If user **explicitly wants** tldraw's polish over Excalidraw and is OK with hobby-license risk, the application form path is documented. **Not recommended.**

### Avoided

- **tldraw v4.x** — proprietary license; see above.
- **Konva** / **Fabric.js** — too low-level (we'd reinvent the whiteboard).
- **WBO** — server-required, violates KP-01.

---

## 5 · FSRS-6 Spaced Repetition

### Primary: ts-fsrs v5.3.2 (Mar 2026)

| Field | Value |
|-------|-------|
| Repo | https://github.com/open-spaced-repetition/ts-fsrs |
| Package | `ts-fsrs` (npm) v5.3.2 |
| License | **MIT** ✅ |
| Latest | v5.3.2 (published 2026-03-31) |
| Total versions | 71 |
| FSRS algorithm version | **FSRS v6** (verified via `fsrs version` badge in README, linking to fsrs4anki wiki/algorithm#fsrs-6) |
| Node requirement | Node ≥ 20.0.0 |
| Module formats | ESM, CommonJS, UMD |

**Why primary:** This is the **canonical TypeScript port** maintained by the `open-spaced-repetition` organization (the same group that maintains the algorithm in Anki). It:
- Implements FSRS v6 (the algorithm we want — REQ-09)
- Is referenced as the standard in every other Obsidian/web FSRS plugin (LearnKit, True Recall both wrap it)
- Tiny dependency, MIT, actively maintained
- Already cited in PROJECT.md KD-06 as the locked choice

**Integration pattern:**
```ts
import { fsrs, createEmptyCard, generatorParameters, Rating } from 'ts-fsrs'

// Per concept page, persisted in YAML frontmatter
const params = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
})
const scheduler = fsrs(params)

// On review:
const result = scheduler.next(card, new Date(), Rating.Good)
// result.card -> persist to frontmatter
// result.log -> append to review history
```

Persist FSRS state in the concept page's YAML frontmatter:
```yaml
---
fsrs:
  difficulty: 5.4
  stability: 12.3
  state: 2  # Review
  reps: 5
  lapses: 1
  due: 2026-05-20T10:00:00Z
  last_review: 2026-05-08T10:00:00Z
---
```

### Alternative: fsrs-rs (Rust port)

| Field | Value |
|-------|-------|
| Repo | https://github.com/open-spaced-repetition/fsrs-rs |
| License | MIT |
| Why alternative | If we want to do scheduler computation in Tauri's Rust backend (faster, type-safer) instead of in the Svelte frontend |

**When:** Only if we're doing FSRS optimization (training the 17 weights from review history — much heavier than scheduling). Scheduling itself is cheap; ts-fsrs in JS is fine for 1000s of concepts per user. **Don't use both unless we explicitly need offline weight optimization.**

---

## 6 · Tiptap Block Editor + Slash Menu

### Primary: `@tiptap/starter-kit` v3.22.5 (Apr 2026) + extensions

| Field | Value |
|-------|-------|
| Repo | https://github.com/ueberdosis/tiptap |
| Latest starter-kit | v3.22.5 (published 2026-04-28) |
| License | **MIT** (all official extensions) |
| Tiptap version | v3.x stable (ProseMirror-based, headless) |

**Required extension list (locked recommendation):**

| Extension | Purpose | Source |
|-----------|---------|--------|
| `@tiptap/starter-kit` | Bold, italic, code, headings, lists, blockquote, hr, history, paragraph, doc, text — all Notion-essentials | Official |
| `@tiptap/extension-mention` | `@`-mention for `[[wiki-link]]` style cross-vault references (REQ-06) | Official |
| `@tiptap/extension-task-list` + `@tiptap/extension-task-item` | Checkboxes for assignment todos | Official |
| `@tiptap/extension-link` | Hyperlinks (rendered + editable) | Official |
| `@tiptap/extension-image` | Embedded screenshots, equation images | Official |
| `@tiptap/extension-code-block-lowlight` | Syntax-highlighted code blocks (lowlight + highlight.js) | Official |
| `@tiptap/extension-table` family | Tables (lecture matrices, complexity tables) | Official |
| `@tiptap/extension-suggestion` | **Backbone for slash menu and mention** | Official |
| `tiptap-markdown` (community: `aguingand/tiptap-markdown`) | **Markdown round-trip** (`getMarkdown()` + `setContent(markdown)`) | MIT, Context7-indexed |
| Custom slash command extension | Built on `@tiptap/extension-suggestion`; the official "experiment" example is the canonical reference. Alternative: `@harshtalks/slash-tiptap` (React-only — port for Svelte). | DIY (50–80 lines) |
| Math (deferred): `@aarkue/tiptap-math-extension` (MIT, npm) — KaTeX inline + display math nodes | Community | MIT |

**Why this stack:**
- KD-09 already locked Tiptap. v3 is stable (Tiptap 3.0 stable announced).
- Markdown round-trip is the critical wedge — `tiptap-markdown` solves it. (The official Tiptap markdown extension is part of the paid Tiptap Pro tier; `aguingand/tiptap-markdown` is the free community choice and is Context7-indexed/well-supported.)
- Slash menu via `@tiptap/extension-suggestion` is the official pattern; the example experiment in Tiptap docs is the template (~50 LOC custom extension that registers a `/` trigger and renders a Svelte popup).

**Math handling caveat:** `@tiptap/extension-mathematics` is **Tiptap Pro only** ($). The community `@aarkue/tiptap-math-extension` works but has a known limitation: **markdown round-trip with delimiters re-triggers input rules** (GitHub issue #2946 in tiptap-math-extension). Workaround: store math as raw markdown `$...$` text in the doc and only render via KaTeX on paint (consistent with our spike pattern from `tauri-shell-ui.md` §4 — DOM walk + DOMPurify). **Don't try to make math a first-class block in Tiptap v1.**

### Alternative: BlockNote (`TypeCellOS/BlockNote`)

| Field | Value |
|-------|-------|
| License | MPL-2.0 (compatible-ish; weaker copyleft than AGPL/GPL but stronger than MIT — file-level) |
| Why alternative | Notion-style block-based editor pre-built on top of Tiptap — saves us 1–2 weeks |
| Why not primary | React-only (we're Svelte); embedding cost > rebuilding the slash menu ourselves on raw Tiptap |

### Avoided

- **Slate.js** — too low-level, we'd reinvent half of Tiptap's surface.
- **Quill** — older, poorer markdown support.
- **Lexical (Meta)** — promising but smaller ecosystem; Tiptap has more battle-tested Notion-style patterns.

---

## 7 · GUI Wrappers / Shells around Claude Code Subprocess (Reference Implementations)

**This is the user's most-emphasized open question. Here's an exhaustive scan with license analysis.**

### Findings overview

| Project | License | Tech | Approach | Last activity | Stars | Use for mneme? |
|---------|---------|------|----------|---------------|-------|--------------------|
| **opcode** (formerly Claudia) — `getAsterisk/opcode` | **AGPL-3.0** ⛔ | Tauri 2 + React 19 + Rust | GUI command center for Claude Code | Active, 21.7k stars | High-quality reference | **STUDY ONLY — DO NOT FORK/COPY.** AGPL is poison for binary distribution. Read for inspiration; reimplement clean-room. |
| **claude-code-gui** — `markes76/claude-code-gui` | **MIT** ✅ | **Electron 31** + React 18 + TS | **Tails `~/.claude/projects/*.jsonl` files** (no subprocess spawn!) | Active, recent v1.1.0 | small | **GREAT MIT REFERENCE** for stream-json parsing (the `entry.data?.message` pattern is gold). Pattern is portable to Tauri. |
| **claude-code-parser** — `udhaykumarbala/claude-code-parser` | **MIT** ✅ | Pure TS, zero deps | Standalone TS parser for `--output-format stream-json` NDJSON | New (7 commits, 0 stars) | tiny | **EXCELLENT** — first standalone documentation of stream-json protocol. **Recommended dependency** to avoid reinventing the parser ourselves. 9KB bundle. |
| **TOKENICODE** — `yiliqi78/TOKENICODE` | **Apache-2.0** ✅ | Tauri 2 + React 19 + TS 5.8 + Tailwind 4 + Zustand 5 + CodeMirror 6 + Vite 7 | Spawns claude CLI as subprocess; NDJSON streaming with thinking/writing/tool phases | Active, 503 commits | small | **STRONG REFERENCE** — Tauri 2 + permissive license. Very close architecture match. Study tech stack and event taxonomy. |
| **siteboon/claudecodeui** | **AGPL-3.0** ⛔ | Web (Node.js + React + Vite) | Server-based web UI; not a desktop wrapper | Active, 10.6k stars | high | **STUDY ONLY** — different architecture (web), AGPL poison. |
| **tauri-claude-code-runner** — `owayo/tauri-claude-code-runner` | MIT ✅ | Tauri 2 + iTerm | Schedules Claude Code via iTerm — not a stream-json parser | Stale (last v25.7.4 = July 2025) | 2 stars | Low value for our use case. |
| **claude-code-desktop** — `hsiaol/claude-code-desktop` | MIT ✅ | Tauri 2 + React 18 + Zustand | GUI wrapper, multi-session | 1 commit, 3 stars | very tiny | Reference only; too immature. |
| **claude-code-sdk-ts** — `instantlyeasy/claude-code-sdk-ts` | MIT ✅ | TS SDK | Fluent chainable SDK; **delegates auth to CLI** (does NOT spawn subprocess) | Active, 206 stars, v0.3.3 | small | Useful study; not directly applicable since we DO spawn subprocess. |
| **CodePilot** — `op7418/CodePilot` | **BSL-1.1** ⚠ | Electron + Next.js | Multi-model AI agent client | Active, 5.6k stars, v0.54.0 | medium | BSL is "personal/academic free, commercial paid". For our personal use **technically OK to study**, but mixed-license territory. Convert to Apache-2.0 in 2029. |

### Recommended pattern adoption (locked)

**Primary reference (study + adopt patterns from):**
1. **`udhaykumarbala/claude-code-parser` (MIT)** — directly add as a dev dependency for type-safe stream-json parsing. The README is the **first standalone documentation of Claude Code's undocumented stream-json protocol**. Zero deps, 9KB.
2. **`markes76/claude-code-gui` (MIT)** — study the JSONL parsing logic (specifically the `entry.data?.message` access pattern that fixed sub-agent rendering); approach of tailing session files is a **fallback** worth knowing about (when subprocess streaming breaks).
3. **`yiliqi78/TOKENICODE` (Apache-2.0)** — study the Tauri 2 + Zustand state management patterns and the thinking/writing/tool phase rendering as architectural template.

**Read-only reference (no copy, AGPL):**
- **opcode (`getAsterisk/opcode`)** — best UI/UX reference for Claude Code GUI overall, but AGPL means we can only LEARN from screenshots/UX, not copy code.

**Why this matters for RQ-03:** The user explicitly said "scan thoroughly before locking implementation." The scan reveals:
- Our spike-validated subprocess approach (spawn + stream-json + JSONL buffer + dispatch by event type) is **the correct path** — confirmed by TOKENICODE and the BSWEN blog post explicitly arguing for this pattern.
- The **alternative** (file-tail of `~/.claude/projects/*.jsonl`) is what claude-code-gui does. **Don't switch to it as primary** — it loses the ability to control prompt args (`--add-dir`, `--system-prompt`, etc.) that we need for cost control. But keep it as **mental fallback** if subprocess breaks for some reason.

**Anti-pattern detected:** **opcode is a tempting fork target (best polish in space)** but AGPL kills it. The user's KP-06 ("fork the closest open-source project") is constrained by license — fork only Apache/MIT projects.

**Closest fork candidate by license + arch fit:** **TOKENICODE (Apache-2.0, Tauri 2)**. If we ever decide we want a head-start beyond our spike, TOKENICODE is the cleanest fork base.

---

## 8 · Echo360 Lecture Video Integration

### Primary: No prior art — Tauri webview + persistent cookies (per KD-04)

**Echo360 specifics confirmed:**
- **API exists:** Echo360 publishes a public REST API with Swagger docs (`support.echo360.com/hc/en-us/sections/10967188719245-API`).
- **Auth:** OAuth 2.0 client credentials. **However**, students don't get client credentials — those are **institutional admin** credentials. Caltech etc. have used them for caption batch download projects.
- **LTI 1.3:** Echo360 supports LTI 1.3 deep-linking with Canvas. The user's USYD Canvas is the LTI consumer. **LTI tokens are tied to the LTI launch session**, not directly accessible to a third-party app.
- **Practical implication:** The **only viable auth path for a personal app** is the webview-with-persistent-cookie approach (KD-04 already locked). REST API path requires institutional cooperation we don't have.

**Caption download:** The Capture Intake API documents how to upload/manage captions; downloading captions for an existing recording requires the same client credential. **However**, if the user has authenticated via webview SSO and is viewing the video, the Echo360 player itself fetches `*.vtt` URLs from internal endpoints — these can be observed via Tauri's webview devtools and downloaded directly with the persistent cookie (same trick Read Frog/FluentRead use for YouTube subtitles).

### Library landscape

**No drop-in OSS library exists** for "Echo360 + Tauri + persistent cookies." Closest analogues:
- **`@playwright/mcp`** — could automate the webview interaction, but overkill (we control the webview, no headless bot needed).
- **OpenEquella's Echo360 integration plugin** — server-side LTI broker for an LMS, not a desktop pattern.
- **No npm/crates package** specifically for Echo360 video.

### Recommended pattern (locked)

1. **Webview**: Tauri 2's built-in WebviewWindow embedded in middle pane.
2. **Cookie persistence**: macOS Keychain via Tauri's `tauri-plugin-store` or similar; cookies seeded from first SSO login persist across launches.
3. **Caption discovery**: Inspect Echo360 player network requests in webview devtools, identify the VTT endpoint pattern, hit it with the persistent cookie via Tauri's HTTP client (`tauri-plugin-http`).
4. **VTT format**: Echo360 outputs WebVTT directly (per Brandeis docs). No conversion needed.

**Confidence: MEDIUM** — the architectural pattern is sound (well-trod for media-app cookies), but Echo360-specific quirks (cookie expiration, cross-course reuse, Echo360's ongoing third-party-cookie removal effort per docs) need a spike to confirm. **Recommend a `/gsd-spike echo360-webview-auth` before locking phase 4 implementation.**

---

## 9 · Caption / Subtitle Handling (VTT parse + bilingual)

### Primary: `subtitle` v4.2.2 (npm) + Claude API for translation + native HTML5 `<track>`

**Library: `subtitle` (`gsantiago/subtitle.js`, also `veedstudio/subtitle.js` fork)**

| Field | Value |
|-------|-------|
| Package | `subtitle` v4.2.2 (npm) |
| License | **MIT** ✅ |
| Latest | v4.2.2 |
| Tech | Stream-based, TypeScript, parse + manipulate SRT and VTT |
| API | `parser`, `formatter`, stream pipelines |

**Why primary:** TypeScript-first, stream API (good for huge lecture transcripts), MIT, supports both VTT and SRT round-trip. Mature enough.

**Alternative:**
- `node-webvtt` v1.9.4 (MIT) — simpler API, supports HLS playlist generation (we don't need it).
- `srt-vtt-parser` (`plussub/srt-vtt-parser`) — dependency-free TS parser; simpler but less feature-rich.

### Bilingual VTT pattern

There is **no off-the-shelf "bilingual VTT generator" library**. Implementation pattern (per REQ-05):

```ts
import { parseSync, stringifySync } from 'subtitle'
import { invoke } from '@tauri-apps/api/core'

const cues = parseSync(vttText)  // -> array of {start, end, text}
for (const cue of cues) {
  if (cue.type !== 'cue') continue
  cue.text = `${cue.text}\n${await translateViaClaudeAPI(cue.text, 'zh')}`
}
const bilingualVtt = stringifySync(cues, { format: 'WebVTT' })
```

Render via `<video><track kind="subtitles" src="bilingual.vtt" srclang="bi" /></video>`. HTML5 `<track>` natively renders multi-line cues stacked.

**Reference projects (closed but instructive):**
- **Read Frog** (`mengxi-ream/read-frog`, **GPLv3 + commercial dual**) — open-source immersive translate; YouTube subtitle bilingual mode is exactly our pattern. Study the cue-batching for cost saving.
- **FluentRead** (`Bistutu/FluentRead`) — open-source; supports OpenAI/DeepSeek/Claude/Gemini engines. Useful **architecture reference** for batching.

**Cost optimization (REQ-05 open question):** Read Frog's "intelligent request batching" claims 70% API cost saving. Pattern: collect 10–30 cues, send in one batch with structured output JSON return, parse back into cues. Same trick we should use.

### License-clean integration

- **`subtitle` (MIT)** — adopt directly.
- **Claude API translation** — already part of our subscription (KP-04).
- **No GPL dependency needed.** (We don't fork Read Frog or FluentRead — just learn from them.)

---

## 10 · Local SQLite + sqlite-vec + Ollama (Future Vector Path)

**Per KD-07, vector DB is deferred (REQ-10 says agentic search is default). This section covers the path WHEN/IF we add vector for narrow real-time relevance hot-paths.**

### Primary stack: rusqlite + sqlite-vec v0.1.9 + Ollama HTTP

| Component | Version | License | Notes |
|-----------|---------|---------|-------|
| `sqlite-vec` | v0.1.9 (2026-03-31) | **Apache-2.0 OR MIT (dual)** | Pure-C extension, lightweight, supports float/int8/binary vectors |
| `rusqlite` | latest (Rust) | MIT | Use this in Tauri's Rust backend, **NOT** `tauri-plugin-sql` (sqlx-based — incompatible with sqlite-vec extension loading) |
| `sqlite-rembed` | latest | (see sqlite-vec org) | Generate embeddings via Ollama directly from SQL |
| Ollama | latest | MIT | Local LLM runtime; HTTP API at `http://localhost:11434` |
| `nomic-embed-text` | (Ollama model) | Apache-2.0 | 137M params, 274MB on disk, 8192-token context, beats OpenAI text-embedding-ada-002 |

### Critical integration finding

**DO NOT use `tauri-plugin-sql` for the vector path.** It's sqlx-based, and sqlite-vec extension loading via sqlx is brittle (must build platform-specific binaries, manually issue `LOAD_EXTENSION` SQL). 

**Use `rusqlite` directly in Rust commands, with `sqlite3_auto_extension()` to register sqlite-vec at startup.** This is the documented pattern from sqlite-vec's own Rust guide.

```rust
// src-tauri/src/db.rs
use rusqlite::{Connection, Result};
use sqlite_vec::sqlite3_vec_init;

fn init_db() -> Result<Connection> {
    unsafe {
        sqlite_vec::sqlite3_vec_init();  // register extension globally
    }
    let conn = Connection::open(vault_path())?;
    conn.execute_batch("
        CREATE VIRTUAL TABLE IF NOT EXISTS concepts_vec USING vec0(
            embedding float[768]
        );
    ")?;
    Ok(conn)
}
```

### Apple Silicon vs Intel Mac caveat

User is on **Intel Mac** (MacBook Pro 2019). Important constraint:
- Ollama on **Apple Silicon** uses GPU automatically (fast).
- Ollama on **Intel Mac** runs on CPU (significantly slower).

**Implication:** Embedding 1000 concepts on Intel Mac via `nomic-embed-text` will take meaningful time (~30s–2min depending on chunking). Plan for **batch embedding at off-hours** (background sync), not real-time, on Intel.

**Smaller model fallback:** if `nomic-embed-text` (274MB, 137M params) is too slow on Intel, try **`all-minilm`** (45MB, 22M params, English only) for faster CPU inference at cost of quality.

### Avoided

- **pgvector + Postgres** — overkill, requires Postgres process; PoC blogs (Electric Ax) showed it works but adds 100MB+ of binary weight and lifecycle complexity.
- **Faiss / Annoy / hnswlib via WASM** — possible but no SQL → re-doing the persistence layer.
- **Pinecone / Weaviate / Qdrant Cloud** — violate KP-01.

---

## Combined Installation Manifest

```bash
# === Frontend (npm; SvelteKit project) ===
npm install \
  ts-fsrs@^5.3.2 \
  cytoscape@^3.33.3 cytoscape-dagre@latest cytoscape-cose-bilkent@latest \
  @excalidraw/excalidraw@^0.18.1 react react-dom \
  @tiptap/core@^3 @tiptap/starter-kit@^3.22.5 \
  @tiptap/extension-mention @tiptap/extension-suggestion \
  @tiptap/extension-task-list @tiptap/extension-task-item \
  @tiptap/extension-link @tiptap/extension-image \
  @tiptap/extension-code-block-lowlight lowlight highlight.js \
  @tiptap/extension-table @tiptap/extension-table-row \
  @tiptap/extension-table-cell @tiptap/extension-table-header \
  tiptap-markdown \
  @aarkue/tiptap-math-extension \
  subtitle@^4.2.2 \
  claude-code-parser

# === Already from spikes (locked) ===
# marked, katex, dompurify, @tauri-apps/api, @tauri-apps/plugin-shell

# === Rust (Cargo.toml; Tauri backend) — VECTOR PATH (deferred) ===
# rusqlite = "0.x"
# sqlite-vec = "0.1"
# tauri-plugin-http = "2.x"  # for Ollama HTTP calls

# === System tools (pre-install) ===
# brew install python@3.10            # for Marker
# pip install marker-pdf              # PDF → markdown
# brew install ollama                 # local LLM runtime
# ollama pull nomic-embed-text        # embedding model

# === Skill-style installs (Claude Code skills, optional) ===
# pip install graphify && graphify install
# (agentmemory: install per its README — uvx tool or pip)
```

---

## License Posture Summary

| License | Examples | Our policy |
|---------|----------|-----------|
| MIT | ts-fsrs, Excalidraw, Cytoscape, Tiptap, marker-parser, subtitle, sqlite-vec | ✅ Adopt freely |
| Apache-2.0 | agentmemory, Cognee, Mem0, Ollama, TOKENICODE | ✅ Adopt freely |
| MPL-2.0 | dompurify, BlockNote | ✅ OK (file-level copyleft only) |
| GPL-3.0 (binary, used as separate process) | Marker | ✅ OK via subprocess (process boundary isolates linkage) |
| AGPL-3.0 | opcode, claudecodeui | ⛔ **READ-ONLY REFERENCE** — never copy/fork/link |
| Proprietary (tldraw v4.x) | tldraw | ⛔ **AVOID** — reject the convenience |
| BSL-1.1 | CodePilot | ⚠ Personal use technically OK, but treat as reference, not as dependency |
| Custom AI Pubs (Marker model weights) | Marker's Chandra | ✅ Free for personal/research |

**Cardinal rule:** If we ever publish mneme to GitHub publicly (even as personal-archive), AGPL/proprietary deps in the binary distribution chain become real problems. **Build like we'll publish.**

---

## Fork-and-Extend Candidates (Per KP-06)

| Capability | Closest OSS foundation | License | What we'd extend |
|------------|------------------------|---------|------------------|
| Three-pane Tauri shell | **TOKENICODE** (`yiliqi78/TOKENICODE`) | Apache-2.0 | Replace single-pane chat UI with three-pane; add mind-map top bar; integrate Excalidraw middle |
| Agent memory + KG | **agentmemory** (`rohitg00/agentmemory`) | Apache-2.0 | Add explicit confidence + bitemporal fields; add Svelte UI hooks for live mind-map streaming |
| stream-json parser | **claude-code-parser** (`udhaykumarbala/claude-code-parser`) | MIT | Adopt as-is; submit upstream PRs if we improve event types |
| Bilingual subtitle batcher | **Read Frog** (`mengxi-ream/read-frog`) | GPLv3 ⚠ | Study only — implement clean-room with `subtitle` + Claude API |
| FSRS Obsidian-style review | **`st3v3nmw/obsidian-spaced-repetition-recall`** | (TBD) | Study, but our concept-page-as-review-unit (REQ-09) is novel — write from scratch on top of ts-fsrs |

**No fork target** for: Echo360 webview auth, Excalidraw vault persistence, three-pane resize coordination — these are pure synthesis tasks.

---

## Stack Patterns by Variant

**If we end up needing on-device LLM (offline mode):**
- Add `llama.cpp` via Rust bindings; bundle a quantized 8B model
- Currently NOT recommended — Intel Mac CPU inference is too slow; rely on cloud Claude Code subprocess
- Defer until Apple Silicon migration (post-2027 hardware refresh)

**If we open-source the project later:**
- The current stack is **MIT/Apache-clean** — no AGPL contamination from libraries
- Marker invocation as subprocess preserves our license freedom
- Excalidraw choice over tldraw was specifically to keep this option open
- We'd still need to LICENSE under MIT/Apache; document third-party attributions

**If Anthropic ships an official Claude Code SDK with stream-json types:**
- Migrate from `claude-code-parser` (community) to official SDK — drop-in replacement
- The current `claude-agent-sdk-typescript` (anthropics/) is API-key-based, NOT yet a CLI subprocess wrapper, so doesn't yet replace our pattern

---

## Sources

### Verified via Context7 / npm registry / GitHub direct
- `/open-spaced-repetition/ts-fsrs` — Context7 — FSRS-6 confirmed, v5.3.2 (npm registry, 2026-03-31)
- `/tldraw/tldraw` — Context7 — license version v4.5.11 (proprietary)
- `/excalidraw/excalidraw` — Context7 — v0.18.1 (npm 2026-04-20, MIT)
- `/cytoscape/cytoscape.js` — Context7 — v3.33.3 (npm 2026-04-29, MIT)
- `/datalab-to/marker` — Context7 — v1.10.2 (2026-01-31, GPL-3.0 + AI Pubs)
- `/ueberdosis/tiptap-docs` — Context7 — v3.22.5 (npm 2026-04-28, MIT)
- `/asg017/sqlite-vec` — npm/crates — v0.1.9 (2026-03-31, Apache-2.0/MIT)

### Authoritative ecosystem comparisons (2026)
- [Best Open-Source PDF-to-Markdown Tools 2026 (themenonlab)](https://themenonlab.blog/blog/best-open-source-pdf-to-markdown-tools-2026)
- [Best Open Source PDF to Markdown Tools 2026 (Jimmy Song)](https://jimmysong.io/blog/pdf-to-markdown-open-source-deep-dive/)
- [AI Agent Memory Comparison 2026 — Mem0/Zep/Letta/Cognee (n1n.ai)](https://explore.n1n.ai/blog/ai-agent-memory-comparison-2026-mem0-zep-letta-cognee-2026-04-23)
- [Cytoscape.js vs vis-network vs Sigma.js 2026 (PkgPulse)](https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-2026)
- [Cognee — AI Memory Tools Evaluation](https://www.cognee.ai/blog/deep-dives/ai-memory-tools-evaluation)
- [Building a Custom Claude Code UI with Stream-JSON (BSWEN, 2026-03)](https://docs.bswen.com/blog/2026-03-21-stream-json-custom-ui-claude-code/)

### License sources (GitHub LICENSE files)
- [opcode AGPL-3.0](https://github.com/getAsterisk/opcode/blob/main/LICENSE) — confirmed
- [tldraw proprietary v4](https://github.com/tldraw/tldraw/blob/main/LICENSE.md) — confirmed
- [tldraw hobby license terms](https://tldraw.dev/get-a-license/hobby) — confirmed (discretionary, watermarked)
- [agentmemory Apache-2.0](https://github.com/rohitg00/agentmemory) — confirmed
- [Marker GPL-3.0 + AI Pubs Open Rail-M](https://github.com/datalab-to/marker) — confirmed

### Reference implementations (study targets)
- [opcode — Claude Code GUI (AGPL — read-only)](https://github.com/getAsterisk/opcode) — 21.7k stars, Tauri 2, AGPL **DO NOT FORK**
- [TOKENICODE — Apache-2.0, Tauri 2](https://github.com/yiliqi78/TOKENICODE) — closest fork candidate
- [claude-code-gui (Electron, MIT) by markes76](https://github.com/markes76/claude-code-gui) — JSONL-tail pattern reference
- [claude-code-parser (MIT) by udhaykumarbala](https://github.com/udhaykumarbala/claude-code-parser) — RECOMMENDED dependency
- [siteboon/claudecodeui (AGPL)](https://github.com/siteboon/claudecodeui) — web architecture, AGPL, study only
- [graphify by safishamsi (MIT)](https://github.com/safishamsi/graphify) — knowledge graph from any folder

### Echo360 / VTT
- [Echo360 LTI 1.3 Support](https://support.echo360.com/hc/en-us/articles/11074490900621-EchoVideo-LTI-Advantage-and-LTI-1-3-Support)
- [Echo360 Public API Documentation](https://support.echo360.com/hc/en-us/sections/10967188719245-API)
- [Echo360 Caption File Management](https://support.echo360.com/hc/en-us/articles/360038310192-EchoVideo-Managing-Closed-Captioning-Files-for-Captures)
- [subtitle.js by gsantiago](https://github.com/gsantiago/subtitle.js) — v4.2.2, MIT
- [Read Frog (open-source immersive translate, GPLv3+commercial)](https://github.com/mengxi-ream/read-frog) — bilingual reference
- [FluentRead (open-source bilingual)](https://github.com/Bistutu/FluentRead) — translation engine reference

### Vector / Local LLM
- [Using sqlite-vec in Rust — Alex Garcia](https://alexgarcia.xyz/sqlite-vec/rust.html) — official Rust guide
- [Tauri SQL plugin sqlite-vec issue #2622](https://github.com/tauri-apps/plugins-workspace/issues/2622) — confirms tauri-plugin-sql limitations
- [Offline Vector Database with Tauri (Ryosuke)](https://whoisryosuke.com/blog/2025/offline-vector-database-with-tauri/) — pattern reference
- [Ollama nomic-embed-text](https://ollama.com/library/nomic-embed-text) — model card

---

*Stack research for: mneme personal desktop learning app — additional libraries layered on top of locked Tauri 2 + SvelteKit + tauri-plugin-shell foundation*
*Researched: 2026-05-06*
*Confidence: HIGH for all libraries with version verification; MEDIUM for Echo360 (no prior art, requires spike)*
