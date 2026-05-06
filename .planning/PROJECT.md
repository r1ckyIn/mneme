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

**⚠ Implementation gate**: This requirement MAY NOT begin implementation until `/gsd-spike echo360-webview-auth` passes. Reason: macOS WKWebView's ITP blocks third-party cookies by default (`tauri-apps/wry#848`); USYD SSO via Echo360 LTI 1.3 IS a third-party cookie scenario; if the cookie cannot be persisted, the entire embedded-webview approach is invalidated and we need an alternative (external browser + deep links, or persistent per-domain webview instance).

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
- Heptabase (whiteboard spatial thinking — concept inspiration; library implementation is **Excalidraw v0.18.1 MIT**, not tldraw)
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

#### REQ-11 · Command palette (Cmd+P / Cmd+O)

**Status**: hypothesis (v1) — added after FEATURES research (CRITICAL: first-week abandonment risk).

**Sources of inspiration**:
- VS Code (Cmd+P file picker)
- Notion (Cmd+P universal command palette)
- Cursor (Cmd+K inline + Cmd+P navigation)
- `cmdk` library (community standard for command palettes — KP-02 candidate)

**What it does**:
- Cmd+P: jump to file (vault file fuzzy-search)
- Cmd+O: jump to course / concept page
- Cmd+Shift+P: command palette (any user-actionable verb in the app)
- Keyboard-first; should reach 80% of all navigation without mouse

**Why it matters**:
Power-user muscle memory; without this the app feels mouse-bound and slow vs Cursor / Notion / VS Code. Personal-use power users especially abandon mouse-only apps.

#### REQ-12 · Multi-session sidebar

**Status**: hypothesis (v1) — added after FEATURES research (CRITICAL).

**Sources of inspiration**:
- Claude Desktop App (April 2026 redesign rebuilt around exactly this)
- Cursor (multiple AI chats in tabs)
- VS Code (multi-terminal pattern)

**What it does**:
- Left sidebar (or collapsible panel): list of active chat sessions
- Each session = one claude subprocess (independent state, independent system prompt, independent vault scope)
- Drag to reorder, click to switch, shortcut to spawn new
- Session names auto-generated from first user message (renamable)
- Sessions survive app restart (resume via `--resume <session-id>` claude flag)

**Why it matters**:
Realistic learning workflow has parallel threads ("explain matrix decomp" + "debug my COMP3221 assignment" + "summarize this lecture") — single-session forces context pollution.

**Open questions**: how many concurrent sessions to allow before resource exhaustion (each is a node + Rust subprocess); sub-second context-switch budget?

#### REQ-13 · Sync status surface (Canvas / Ed)

**Status**: hypothesis (v1) — added after FEATURES research (HIGH).

**Sources of inspiration**:
- Obsidian Sync status indicator
- iCloud / Dropbox sync status pattern
- Canvas API webhook semantics

**What it does**:
- Status bar widget: "synced 2m ago · 0 errors · next in 13m"
- Click → modal with per-course sync history, errors, retry controls
- New items toast (announcement / new file / new assignment)
- Failure surfaces explicitly (not silent) — auth expiry, rate limit, network error all show distinct icons

**Why it matters**:
Silent sync failures = stale content = wrong AI answers. The user must always know whether the AI is operating on current Canvas state.

#### REQ-14 · Settings / preferences UI

**Status**: hypothesis (v1) — added after FEATURES research (HIGH).

**Sources of inspiration**:
- Claude Code's `~/.claude/settings.json` model
- macOS System Preferences pattern
- KP-04 compliance requirements (must control: which dirs claude can access, which tools enabled, model profile, etc.)

**What it does**:
Categories: General · Vault · Sync · Claude · Privacy · Appearance · Keybindings · Advanced

Specific levers (non-exhaustive):
- Vault path (move + re-index)
- Sync frequency (Canvas + Ed)
- Default `claude` permission mode (`bypassPermissions` toggle with explicit warning)
- Add-dir scope for claude (default: vault root only)
- Model profile (passthrough to claude — not session-overridden by app)
- Cost cap per session (REQ-13-related — kill switch when exceeded)
- Theme (dark / light / system)
- Keybindings (overrides for command palette + send + new session)

**Why it matters**:
Personal use means no other admin — every setting must be self-discoverable + self-explanatory. Hidden flags = forgotten features.

#### REQ-15 · Review focus mode (FSRS dedicated screen)

**Status**: hypothesis (v1) — extends REQ-09 with focused UX.

**Sources of inspiration**:
- Anki desktop's review-mode (whole UI collapses to one card)
- Roam Research / Obsidian "no distraction" mode

**What it does**:
- When entering FSRS review queue, three-pane shell collapses
- Full-screen single-concept view
- Keyboard 1/2/3/4 evaluates (Anki bindings)
- AI generates a fresh test question on the spot (varied each review — no cached prompts)
- Answer flows back into FSRS scheduler

**Why it matters**:
Active recall + zero distraction is the recipe Anki proved. Three-pane during review would defeat the purpose.

#### REQ-16 · First-run onboarding wizard

**Status**: hypothesis (v1) — added after FEATURES research (MEDIUM).

**Sources of inspiration**:
- Claude Code onboarding (`claude` first run guides through API key + first command)
- Cursor's onboarding (3-step setup)

**What it does**:
- Step 1: Welcome + brief tour (3 screens)
- Step 2: Confirm Claude Code install + auth (auto-detect existing OAuth subscription)
- Step 3: Pick vault path (default: `~/StudyVault/`)
- Step 4: MCP detection — Canvas/Ed MCP auto-found; offer to enable; if missing, link to setup docs
- Step 5: Course selection — list enrolled courses, choose which to ingest first
- Step 6: First sync — progress bar with cancel
- Done → land in main UI with example chat suggestion

**Why it matters**:
Even self-use, "future-me 6 months from now after wiping the laptop" is the user. Onboarding makes setup deterministic.

#### REQ-17 · Per-course system prompts via `.learnos/rules/`

**Status**: hypothesis (v1) — added after FEATURES research (DIFFERENTIATOR — small effort, big leverage).

**Sources of inspiration**:
- Cursor `.cursor/rules` MDC pattern (the user-pointed-out design)
- Claude Code's `~/.claude/CLAUDE.md` pattern (project-level instructions)
- No precedent in learning apps yet

**What it does**:
- Per-course directory: `courses/<COURSE>/.learnos/rules/<rule>.md`
- Each rule has YAML frontmatter (`enabled: true`, `priority: 10`, `applies_to: assignment|notes|review`) + markdown body (the prompt fragment)
- When user opens a chat in COURSE context, all enabled rules are concatenated into Claude's `--append-system-prompt`
- Examples:
  - `MATH1062/.learnos/rules/proof-style.md`: "Prefer formal proofs with explicit lemmas; show counterexamples when stating necessity vs sufficiency."
  - `COMP3221/.learnos/rules/style.md`: "Stick to Java idioms; avoid stream API in performance-critical paths."

**Why it matters**:
Differentiator — no learning app does this. Costs almost nothing to implement; gives Claude course-specific persona without asking the student to repeat instructions every session. Composes with REQ-08 (anchored mode) — anchored answers can still respect course rules.

**Open questions**: default rule priority semantics; how to debug "which rules fired"; precedence vs the user's own `~/.claude/CLAUDE.md`.

#### REQ-18 · Document → markdown ingestion (Marker for PDF + markitdown for Office)

**Status**: hypothesis (v1.x) — replaces RQ-02 with locked dual pipeline.

**Sources of inspiration**:
- Marker (datalab-to/marker) v1.10.2 — math-formula leader for PDF (validated via 2026 ecosystem reviews)
- markitdown (Microsoft) — multi-format breadth winner (Word / Excel / PPT / HTML / image OCR)
- KP-02 (use community-validated tools, not in-house parser)

**What it does**:
- On Canvas/Ed sync, classify each new file by extension:
  - `.pdf` → Marker subprocess (`marker_single <file> --use_llm` for math; `--use_llm` routes through local Claude for high-quality inline math)
  - `.docx`, `.xlsx`, `.pptx`, `.html` → markitdown subprocess
  - `.md`, `.txt` → passthrough
  - other → flag in sync status (no-op)
- Output stored at `courses/<COURSE>/_source/<original-name>.md` alongside original file
- Conversion errors logged to sync status (REQ-13) — never silently dropped

**Why it matters**:
Lecture slides are PDF (math-heavy → Marker); tutorials are often Word/PPT (markitdown). Both flows must just work without user thought. KP-02 honored: no in-house parser.

**Open questions**: cost when Marker `--use_llm` routes through claude (per-page LLM calls); markitdown's PPT extraction quality with embedded images.

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

#### OOS-06 · Manual mind-map drawing

**Why excluded**: We *auto-generate* the mind-map from the knowledge graph. User-drawn mind-maps would create a parallel source of truth competing with the KG (anti-pattern flagged in ARCHITECTURE research).

#### OOS-07 · Plugin / extensibility API

**Why excluded**: Claude Code's own `skills` mechanism is already the per-project extensibility layer. Personal use does not need an additional plugin marketplace; risk of fragmenting the codebase outweighs benefit.

#### OOS-08 · Multi-LLM-provider support (OpenAI / Gemini / local Ollama LLM)

**Why excluded**: KP-04 (compliant subprocess wrapping) is specifically about Claude Code. Adding Gemini / OpenAI providers requires a parallel runtime + parallel auth + parallel cost model. Scope creep with no offsetting value for a personal tool.

#### OOS-09 · Voice / audio dictation input

**Why excluded**: Lecture captions (REQ-05) already cover the audio-content side. User input is keyboard-driven; voice-to-text adds a major UX surface (mic permission, error recovery, ambient noise) for marginal benefit in a desk-only learning tool.

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

#### KD-08 · Mind-map (Cytoscape.js, default) + whiteboard (Excalidraw, toggle); knowledge-graph (always-on, AI-side)

**Source**: Synthesis of Obsidian Canvas/Graph (mind-map natural for course structure) + Heptabase (whiteboard spatial freedom). **Library picks corrected after STACK research (commit c87eadc)**: tldraw rejected because v4.x is proprietary (commercial license required or mandatory watermark) — violates KP-02. Excalidraw v0.18.1 (MIT) is the equivalent OSS replacement.

Mind-map handles the strong-structure default for course material; whiteboard available for free-form weekly integration sessions; both render from the same underlying knowledge-graph. Excalidraw is React-only — Svelte 5 integration uses the `svelte-react` host pattern (or `createRoot` in `onMount`) — to be validated when whiteboard phase begins.

#### KD-09 · Tiptap as block editor; markdown as storage

**Source**: Notion (block editor + slash menu UX is the gold standard) + Obsidian (markdown universality + AI-friendliness).

Tiptap UI layer for block selection / `/` slash menu / drag, but persists to plain markdown via `getMarkdown()`. Best of both.

#### KD-11 · Phase entry gate — Echo360 spike must pass before Phase 3 implementation

**Source**: PITFALLS research (commit c87eadc) + Tauri wry#848 + Echo360 LTI 1.3 architecture analysis.

REQ-04 (video) and REQ-05 (captions) cannot be implemented until `/gsd-spike echo360-webview-auth` validates: (a) USYD SSO completes inside Tauri webview, (b) the resulting authenticated session cookie persists across app restarts, (c) Echo360's video player initializes inside the webview without breaking due to client-side same-origin checks. If the spike fails, requirements design changes (alternative auth path needed) before phase entry.

#### KD-10 · Three-tier memory architecture (working / episodic / long-term) — **library choice deferred**

**Source**: Architectural concept inspired by `agentmemory` (rohitg00) pipeline.

Per-message: SHA-256 dedup → privacy filter → LLM compress → embed → indexed in BM25 + vector + graph. Tiers compress and stabilize as facts move from recent to consolidated.

**⚠ Library is NOT locked**. After RQ-01 deeper research (commit c87eadc surfaced):
- agentmemory has architecture alignment but **no public benchmarks**, niche fork — risk
- The 2026 mainstream for this pattern is **Cognee (GraphRAG, multi-doc)** or **Zep + Graphiti (temporal knowledge graph with validity windows)** — both well-benchmarked
- Mem0 lacks the temporal model needed for "concept evolves as student learns"
- Letta is poorly matched (long-horizon agent ≠ student concept memory)

**RQ-01 is now BLOCKING for Phase 3 entry**: must produce a 4-project comparison + 1-week dogfood result before any KG implementation. See `.planning/research/questions.md`.

#### KD-12 · `claude-code-parser` (MIT) as vendored reference, not npm dependency

**Source**: STACK research surfaced this 9KB MIT library as a stream-json parser, but the user flagged unmaintained risk (no commits since creation).

We **copy** its source into `vendor/claude-code-parser/` for reference, attribution preserved, and adapt as needed. Not as `npm install`. Insulates us from the abandoned-dependency tax while keeping the open-source pattern for honesty + KP-02 reuse.

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
