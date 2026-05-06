# learn-os

> Personal desktop learning app wrapping local Claude Code, for USYD CS S1 2026 coursework. Codename `learn-os` — final name + icon to be locked in a dedicated phase.

---

## What This Is

A locally-run desktop app for one user (myself) that combines:

- **Obsidian-style** local-first markdown vault (full data ownership)
- **NotebookLM-style** source-grounded chat with citations (when the user opts in)
- **Claude Code's** agent capabilities (MCP, web access, tool use, hooks, skills) running as a subprocess inside a GUI shell
- **Heptabase / mind-map style** spatial thinking layer for humans
- **GraphRAG-style** knowledge graph layer for the AI
- **Anki / FSRS-6** spaced repetition driving review of concepts (not flashcards)
- **Echo360 lecture video** integration via embedded webview (UnSyd-specific)

Three-pane main UI: **course files (left) · video + course material preview (middle) · Claude conversation (right)**. Top bar: live mind-map of the current course that grows as you converse.

## Core Value (the ONE thing that must work)

Wrap the user's Claude Code (with all its tools, MCPs, memory) in a desktop GUI that turns chat sessions into a continuously-growing local knowledge graph + browsable markdown vault, indexed against actual lecture content. The whole loop — *learn → AI teaches → notes captured automatically → reviewed via FSRS* — must feel like one product, not five glued together.

## Context (who, why, when)

- **User**: USYD CS student, S1 2026, four courses (math + programming heavy)
- **Why now**: Terminal can't render LaTeX/code blocks visually; Obsidian is occupied by another workstream; NotebookLM lacks local + agent capabilities; Claude Code Desktop App exists but is dev-focused, not learning-focused
- **Constraints**: Personal use only, single-user, MacBook Pro 2019 Intel, macOS Ventura 13.4
- **Identity**: `dev.learn-os.spike` (will become `dev.learn-os.app` post-naming-phase)

---

## Requirements

### Validated

(None yet — every Active item is a hypothesis to be shipped + validated.)

### Active (v1 candidates)

#### REQ-01 · Three-pane main UI (course files / video / Claude chat)

**Status**: hypothesis (v1)

**Sources of inspiration**:
- NotebookLM (sources / chat / studio three-pane layout)
- Cursor (right-panel AI chat)
- VS Code (left-panel file tree)

**What it does**:
- Left: course file tree (lectures, tutorials, assignments, notes, concepts)
- Middle: video player + course material preview (PDF/PPT) — switchable
- Right: Claude conversation (streaming, with markdown / LaTeX / code blocks rendered after stream)
- Three panes are user-resizable
- Top bar: course-level mind-map that updates as conversation produces new concepts/notes

**Why it matters**:
This layout is what NotebookLM users (myself included) already have muscle memory for. Adding video to the middle is the differentiator that anchors learning to lecture content.

**Open questions**: none

---

#### REQ-02 · Tauri shell spawns local `claude` CLI as subprocess

**Status**: validated by spike (architecture, not yet by full feature set)

**Sources of inspiration**:
- Claude Desktop App (Anthropic's own model, validated by Boris Cherny)
- GoBot pattern (`claude -p` subprocess, no token extraction)
- Anthropic 2026.02 ToS (subprocess wrapping is explicitly allowed)
- Spike 002 (end-to-end working demo)

**What it does**:
- App shell spawns `claude --print --permission-mode bypassPermissions --output-format stream-json --include-partial-messages --verbose <prompt>`
- Parses JSONL line-by-line, dispatches by event `type`
- Renders streaming text live; finalizes markdown + LaTeX on `result` event
- No OAuth token extraction, no impersonation — uses user's own subscription via the local CLI

**Why it matters**:
This is the entire architecture's foundation. Without it, no agent capabilities, no MCP, no tool use.

**Open questions**: see RQ-03 (community wrappers we should learn from before locking implementation)

---

#### REQ-03 · Canvas + Ed first-run import + scheduled sync

**Status**: hypothesis (v1)

**Sources of inspiration**:
- User's existing Canvas + Ed MCP (7th iteration; see memory `project_deadline_system.md`)
- User's existing `/check-deadlines` skill + Obsidian dashboard pattern

**What it does**:
- First launch: detects Canvas/Ed MCP, lists user's enrolled courses, asks which to ingest
- Pulls all modules / files / pages / announcements / quizzes into local vault
- Folder structure: `courses/<COURSE_CODE>/_source/{lectures,tutorials,assignments}/` (read-only, mirror) + `courses/<COURSE_CODE>/{notes,concepts,practice}/` (writable)
- Auto-generates `INDEX.md` per course (auto-updated weekly progress)
- Background sync: incremental on app launch (uses Canvas `updated_at` + ETag), full nightly cron, push-toast on new announcement / new file

**Why it matters**:
This is where the local app beats NotebookLM (which requires manual upload) — Canvas + Ed MCP is the user's already-validated pipeline.

**Open questions**: how to surface sync status / failures to the user; what to do with deleted-on-Canvas files

---

#### REQ-04 · Echo360 lecture video via embedded webview + USYD SSO

**Status**: hypothesis (v1, P2 priority — comes after REQ-02 spike)

**Sources of inspiration**:
- Echo360 LTI 1.3 + OAuth/JWT documentation (the only viable auth path)
- Tauri's built-in webview component
- Original synthesis (no direct prior art for this combo)

**What it does**:
- Tauri webview embedded in middle pane
- First time opening a lecture video: webview shows USYD SSO login → Echo360 → cookie persists in macOS Keychain
- Subsequent video loads: instant (cookie reuse)
- Canvas API used to discover Echo360 LTI launch URLs in each course module

**Why it matters**:
Without video, the app degrades to "local notes + Claude chat" and loses the lecture-anchored learning loop.

**Open questions**: cookie expiration behavior; cross-course video reuse; whether Tauri webview honors all Echo360 client-side checks

---

#### REQ-05 · Caption capture + Claude-translated bilingual VTT

**Status**: hypothesis (v1, depends on REQ-04)

**Sources of inspiration**:
- Echo360 caption export (VTT format with timestamped cues)
- Immersive Translate (concept; product itself is closed-source — open-source alts: Read Frog, FluentRead)
- Original synthesis

**What it does**:
- Each lecture video's captions auto-pulled in VTT format
- Each cue text → fed through Claude API for English ↔ Chinese translation
- Output: bilingual VTT (two-line cues) saved to `courses/<CODE>/_source/lectures/<lec>.bilingual.vtt`
- HTML5 `<video>` + `<track>` renders both languages
- Captions become full-text searchable in vault (grep "old growth" or "传送" lands you on the cue)

**Why it matters**:
Bilingual captions help comprehension; persisted captions become *searchable lecture transcripts* — a major content asset.

**Open questions**: cost of translating long lectures; Echo360 caption availability for all videos; how to handle math notation in captions

---

#### REQ-06 · Markdown vault with PARA + course-root structure

**Status**: hypothesis (v1)

**Sources of inspiration**:
- Obsidian (vault concept + `[[wiki-link]]` syntax)
- PARA method (Tiago Forte) — Projects, Areas, Resources, Archives
- Academic Obsidian best practices (Emile van Krieken, others)

**What it does**:
- Vault root: `~/StudyVault/` (path TBD)
- Top-level: `_system/` (hidden, AI-only), `_inbox/` (Claude-generated drafts), `courses/`, `shared/`
- Per course: `_source/` (Canvas/Ed read-only mirror), `notes/`, `concepts/` (one file per concept), `practice/`, `INDEX.md`
- Files are pure markdown + YAML frontmatter — no proprietary binary format
- Cross-course concepts live in `shared/` and are linked via `[[wiki-link]]`

**Why it matters**:
Markdown is the universal format AI can read. PARA + course-root gives both human-natural navigation and AI-natural typed-link semantics.

**Open questions**: how to handle 4 courses sharing concepts (e.g. linear algebra concept used in both COMP and MATH); should `_source/` be force-pushed when Canvas updates

---

#### REQ-07 · Dual-layer data: knowledge graph (AI view) + mind-map / whiteboard (human view)

**Status**: hypothesis (v1)

**Sources of inspiration**:
- GraphRAG papers (clinical-QA hallucination 63% → 1.7%)
- Memento bitemporal KG (LongMemEval 92.4%)
- Mem0 / Cognee / Zep (open-source agent memory; see RQ-01)
- agentmemory (rohitg00) — three-tier memory pipeline
- Heptabase (whiteboard spatial thinking)
- Obsidian Canvas / Graph view (human-side reference)
- User's original insight: "给人看 vs 给 AI 看分开织一张网"

**What it does**:
- **Human layer**: mind-map (default for course structure) + whiteboard (free-form weekend integration), both rendered from same source-of-truth
- **AI layer**: knowledge graph — concept nodes (id + embedding + confidence + provenance + timestamps) + typed edges (auto-maintained by AI via embedding similarity)
- **Three-tier memory**: working (recent N raw msgs) → episodic (session summaries) → long-term (consolidated facts; high confidence; cross-session)
- New session writes are streamed in real-time: each user/assistant message → fact extraction → embed → indexed → graph edges updated → mind-map node may animate in

**Why it matters**:
This is the project's signature "AI-native" differentiator. Obsidian + plugins can fake the human layer; nothing on the market combines it with a continuously-maintained AI knowledge graph backed by a frontier LLM.

**Open questions**: see RQ-01 (which memory project to base this on); see RQ-04 (whether GSD graphify can be reused)

---

#### REQ-08 · Anchored mode (sources panel + answers cite back to file:line)

**Status**: hypothesis (v1)

**Sources of inspiration**:
- NotebookLM (the core USP — answers grounded only in user's sources, with clickable citations)
- Anthropic Citations API (official implementation, takes documents as input, returns spans)

**What it does**:
- Toggle in chat panel: free mode (default Claude with full tool access) ↔ anchored mode
- Anchored mode: only answers based on user-checked vault files; system prompt restricted; every sentence ends with `[file.md:42]` clickable citation
- Click citation → vault file opens to that line

**Why it matters**:
"Free Claude as teacher / anchored as textbook search" maps to the friend's "学习用 Claude / 复习用 NotebookLM" insight. Same UI, one switch — neither competitor offers this.

**Open questions**: API cost when anchored mode passes large vault subsets as documents; chunking strategy

---

#### REQ-09 · FSRS-6 spaced repetition on concept pages (no flashcards)

**Status**: hypothesis (v1)

**Sources of inspiration**:
- Anki (default scheduler since v23.12 — FSRS reduces review load 20-30% vs SM-2)
- FSRS-6 paper (late 2025; trained on ~700M reviews)
- Obsidian spaced-repetition plugin (proves note-level review is viable, not just card-level)
- User's own pushback: "Anki 价值我看不到" → keep the algorithm, drop the form

**What it does**:
- Review object = **concept page**, not flashcard (drops the manual-card-building bottleneck that kills Anki for most students)
- FSRS-6 schedules each concept with stability + difficulty + retrievability + 17 trainable weights
- When concept is "due", review mode collapses the three-pane UI to a single screen, AI generates a fresh test question on the spot, user answers, presses 1/2/3/4, score flows back into FSRS
- Review queue is ranked by `(graph weakness × FSRS due-ness)` — graph layer knows which concepts are weakly connected and prioritizes them

**Why it matters**:
This solves "做完模拟题没题做" (the reason Anki was raised) without the manual-card overhead.

**Open questions**: best ts-fsrs library (`open-spaced-repetition/ts-fsrs` is the canonical port); how to seed initial difficulty for a brand-new concept

---

#### REQ-10 · Agentic search by default (no vector DB)

**Status**: hypothesis (v1)

**Sources of inspiration**:
- Claude Code itself (Boris Cherny replaced their early RAG + vector DB with agentic grep/glob; same architecture we're inheriting via subprocess)
- Anthropic 2026 published findings (agentic search outperforms RAG on cross-document synthesis, simpler operationally)
- User's intuition: "我和 Claude 聊天时他自己用 agent search 就能找到，时间更久而已"

**What it does**:
- Default search: Claude uses its own grep/glob/cat tools to iterate through vault by name/dir/keyword
- "我之前说过 X 的事" → Claude greps + reasons (5-10s acceptable)
- **Vector DB only added later** for narrowly-scoped real-time relevance (writing-time concept suggestions, knowledge-graph edge maintenance)
- This deliberate non-architecture saves: vector DB infra, embedding pipeline, staleness handling, privacy concerns

**Why it matters**:
Inverts the conventional RAG-first wisdom; aligns with Anthropic's own validated approach.

**Open questions**: which exact local vault scope to grant Claude via `--add-dir` (security boundary)

---

### Out of Scope (deliberate exclusions)

#### OOS-01 · Multi-user / collaboration / distribution / commercialization

**Why excluded**: personal-use only; introducing accounts, sharing, billing would 10x the surface area for no user benefit (myself).

#### OOS-02 · Mobile (iOS / Android)

**Why excluded**: learning happens at the desk with lecture videos and PDFs; Tauri Mobile adds significant complexity for a marginal use case.

#### OOS-03 · Custom-built vector database / RAG infrastructure

**Why excluded**: see REQ-10 — agentic search replaces it. Vector reserved for later, narrow real-time-relevance hot paths if/when those features prove necessary.

#### OOS-04 · Audio overview / video overview generation (NotebookLM-style)

**Why excluded**: Claude is not a great audio/video producer; the time saved by a 10-min audio summary is not worth the engineering and per-minute cost; learning math/CS rewards reading + active recall, not passive listening.

#### OOS-05 · Manual flashcard authoring (Anki-style)

**Why excluded**: see REQ-09 — manual card-building is Anki's death spiral; FSRS scheduling on concept pages with AI-generated test questions removes the friction.

---

## Key Principles (non-negotiable)

#### KP-01 · Local-first

**Source**: Obsidian's core philosophy + user's original requirement.

All user data lives as plain markdown + YAML frontmatter on local disk. The app must function offline (chat will fail, but vault, mind-map, and review still work). Cloud upload is *never automatic*; any cloud touch must be explicit user action.

#### KP-02 · Open-source-driven (50% rule)

**Source**: User's repeated, emphasized direction (most recent: 2026-05-06).

Roughly half the surface area of the product should be community-validated open-source projects, not in-house code. Self-built code reserved for the differentiation layer (knowledge-graph auto-maintenance, streaming-into-mindmap, etc.). **Before any non-trivial implementation, a research pass must scan the open-source landscape; if a credible project exists, it gets adopted (or forked + extended on top).** Reinventing the wheel is an explicit anti-pattern.

#### KP-03 · AI-native data model

**Source**: Mem0 / Cognee / Zep, agentmemory (rohitg00), GraphRAG papers, user's original insight.

Embeddings, concept-graph, confidence, provenance, and timestamps are first-class data citizens — not bolt-on plugins. Every saved note, every captured chat turn, is automatically embedded, classified, linked, and confidence-scored at write time. Search and recall are graph + embedding operations from day one, not retrofits.

#### KP-04 · Compliant subprocess wrapping

**Source**: Anthropic 2026.02 ToS update + autonomee.ai analysis + Claude Desktop App reference.

The app calls the real `claude` CLI binary on the user's machine, using the user's own subscription. **No OAuth token extraction, no impersonation, no token sharing.** This puts the project in the explicitly-allowed bucket of Anthropic's policy; the OpenClaw-style ban does not apply.

#### KP-05 · UI initial design via Claude Design

**Source**: Anthropic Claude Design (released 2026-04, Opus 4.7 vision model) + user preference.

First UI iteration goes through Claude Design's prompt-to-prototype flow, producing runnable HTML/CSS/JS rather than Figma artboards. Manual visual design (Figma drag-and-drop) is deferred to refinement after the prototype is interactable.

#### KP-06 · Reject reinvented wheels

**Source**: User's original direction (most recent: 2026-05-06).

For each atomic feature, scan open-source ecosystem first. If something exists and works, copy/integrate the pattern (with attribution). If nothing fits exactly, fork the closest open-source project and extend on top — never write from scratch when a community-tested foundation exists. Implementation patterns (subprocess wrapping, knowledge-graph maintenance, etc.) should reference how leading projects do it (Claude Desktop, GSD graphify skill, Mem0/Cognee, etc.).

---

## Key Decisions (locked technical choices)

#### KD-01 · Stack: Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell

**Source**: Spike 002 validation + user preference for lightweight binary (Tauri ~10MB vs Electron ~150MB).

Used in spike 002 end-to-end with successful streaming, markdown, KaTeX, and tool-use roundtrip. Locked.

#### KD-02 · Frontend libraries: marked + KaTeX + DOMPurify + Svelte 5 runes

**Source**: Spike 002.

`marked` for markdown parse, `katex` for math via `renderToString`, `dompurify` mandatory on every HTML injection site, Svelte 5 `$state` runes for reactivity.

#### KD-03 · Rust toolchain ≥ 1.88 (pinned)

**Source**: Spike 002 finding F1 — Tauri 2 deps (`darling 0.23`, `time 0.3.47`, `serde_with 3.19`, `icu_*` 2.x) demand it.

To be enforced via `rust-toolchain.toml` at repo root.

#### KD-04 · Echo360 video via Tauri webview + persistent USYD SSO cookie

**Source**: Echo360 LTI 1.3 documentation analysis (only viable auth path under Anthropic + USYD constraints).

OAuth/JWT direct API access is gated; Canvas API token does not transfer; HLS scraping violates ToS. The webview-with-persistent-cookie approach is the clean path.

#### KD-05 · Citations API for anchored mode

**Source**: Anthropic's official Citations API (Jan 2025) + NotebookLM's UX.

The Citations API takes user-curated documents as input and returns answers with structured spans. We use it directly for anchored mode rather than rolling our own RAG.

#### KD-06 · FSRS-6 algorithm (likely via `ts-fsrs`)

**Source**: Anki v23.12 default + FSRS-6 (2025 late) paper.

Reduces review count 20-30% vs SM-2. `open-spaced-repetition/ts-fsrs` is the canonical TypeScript port; specific library to be locked after RQ-01 cross-checks community adoption.

#### KD-07 · No vector DB by default; agentic search replaces RAG

**Source**: Boris Cherny / Anthropic Claude Code internal decision.

Vector DB only added later for narrow real-time-relevance hot paths.

#### KD-08 · Mind-map (default) + whiteboard (toggle), both human-side; knowledge-graph (always-on, AI-side)

**Source**: Synthesis of Obsidian Canvas/Graph (mind-map natural for course structure) + Heptabase (whiteboard spatial freedom).

Mind-map handles the strong-structure default for course material; whiteboard available for free-form weekly integration sessions; both render from the same underlying knowledge-graph.

#### KD-09 · Tiptap as block editor; markdown as storage

**Source**: Notion (block editor + slash menu UX is the gold standard) + Obsidian (markdown universality + AI-friendliness).

Tiptap UI layer for block selection / `/` slash menu / drag, but persists to plain markdown via `getMarkdown()`. Best of both.

#### KD-10 · Three-tier memory architecture (working / episodic / long-term)

**Source**: agentmemory (rohitg00) pipeline.

Per-message: SHA-256 dedup → privacy filter → LLM compress → embed → indexed in BM25 + vector + graph. Tiers compress and stabilize as facts move from recent to consolidated.

---

## Open Questions

Tracked in `.planning/research/questions.md`:

- **RQ-01**: Community Claude Code memory project survey (Mem0 / Cognee / Zep / agentmemory / SimpleMem)
- **RQ-02**: PDF → AI-friendly markdown library survey (Marker / MinerU / Docling / Nougat / PyMuPDF4LLM)
- **RQ-03**: GUI wrappers for Claude Code subprocess — community reference implementations (**emphasized by user 2026-05-06: must scan before locking implementation**)
- **RQ-04**: GSD `graphify` skill mechanics — can we reuse directly

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Append to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-06 — initialized via `/gsd-new-project` after `/gsd-explore` (foundation-decisions.md, 9 decisions) + `/gsd-spike` (2 validated spikes wrapped into `spike-findings-learn-os` skill).*
