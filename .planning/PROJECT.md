# mneme

> Personal desktop learning app wrapping local Claude Code, for USYD CS S1 2026 coursework. Codename `mneme` — final name + icon to be locked in a dedicated phase.

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

## Core Value (5 dimensions defining product identity; losing any one dimension is identity death)

> **Re-framed 2026-05-07** (per `/gsd-explore` session): Core Value is **not a single sentence** — it is a 5-dimension composite. Each dimension is non-negotiable; losing any one degrades mneme into a different product (Obsidian + plugins, NotebookLM, Cursor for notes, etc.). Treat any feature/decision through all 5 lenses.

### Dimension 1 — Product philosophy (9 non-negotiable beliefs)
The 9 Key Principles (KP-01 through KP-09, see "Key Principles" section below):
- **KP-01 Local-first** — all data on local disk, offline-functional, no automatic cloud
- **KP-02 50% OSS-driven** — half the surface area is community-validated open source
- **KP-03 AI-native data model** — embeddings + graph + confidence + provenance + timestamps as first-class
- **KP-04 Compliant subprocess wrapping** — user's own claude CLI + own subscription, no token theft
- **KP-05 Claude Design starts UI** — first iteration via prompt-to-prototype, not Figma
- **KP-06 Reject reinvented wheels** — fork-and-extend before write-from-scratch
- **KP-07 Proactive contextual recall** — the "懂我" experience: AI surfaces context unprompted
- **KP-08 OSS dependency tracking + upstream monitoring** — every adopted library is owned, not just imported
- **KP-09 Aesthetic family — inherit Anthropic/Claude visual identity** — warmth/accessibility/restraint; full SSOT in `.planning/references/design/`; locked specs in KD-13

### Dimension 2 — Experience commitments (5 user-facing promises)
1. **"懂我" AI** (KP-07) — agent memory + KG + proactive contextual recall: AI proactively surfaces last session progress, cross-week prerequisites, recurring mistakes — without being asked
2. **Learning loop** — `learn → AI teaches → notes captured automatically → reviewed via FSRS` feels like one product, not five glued together
3. **Dual mode** — *free Claude as teacher* + *anchored Claude as textbook search* (REQ-08); same UI, one-click switch — no other app combines both
4. **One product feel** — three-pane UI (REQ-01) with cohesive interaction, not five-app stitching
5. **Power-user UX** — command palette (REQ-11) + multi-session sidebar (REQ-12) + keyboard-first navigation

### Dimension 3 — Architectural foundation (13 locked Key Decisions)
The 13 Key Decisions (KD-01 through KD-13, see "Key Decisions" section below) lock irreversible technical commitments:
- **Stack**: Tauri 2 + SvelteKit + Rust ≥1.88 (KD-01/02/03)
- **Search**: agentic search replaces vector DB in v1 (KD-07 + REQ-10)
- **Data**: dual-layer (KG for AI + mind-map/whiteboard for human, KD-08) + three-tier memory (working/episodic/long-term, KD-10) + Tiptap UI on markdown storage (KD-09 + REQ-06)
- **Protocol scoping**: MCP is for *external services only* (Canvas / Ed / Echo360 — REQ-03/04/05) — vault read/write goes through filesystem + Claude Code's native `--add-dir` agentic search, NOT through MCP
- **External integrations**: Echo360 via Tauri webview + persistent SSO cookie (KD-04); Anchored mode via Anthropic Citations API (KD-05); FSRS-6 via ts-fsrs (KD-06)
- **Visual aesthetic system (KD-13)**: locked to Anthropic/Claude family per KP-09 — 4 mandatory color anchors (`#d97757` orange / `#faf9f5` cream / `#141413` text / `#2b2a27` warm dark), serif body + ban Arial/Inter, ease curve `cubic-bezier(0.165, 0.85, 0.45, 1)`, soft 8% borders, multi-layer soft shadows. Full token palette + recommended OSS gallery deferred to `.planning/references/design/`.

### Dimension 4 — Boundaries (8 deliberate exclusions)
The 8 Out-of-Scope items (OOS-01 through OOS-08, see "Out of Scope" section; OOS-09 voice input was lifted to REQ-19 v1.x candidate on 2026-05-07). Saying "no" with the same precision as saying "yes" is part of the identity:
- No multi-user / commercialization (OSS portfolio release allowed)
- No mobile, no vector DB in v1, no audio overview, no manual flashcards, no manual mind-map drawing, no plugin API (Claude Code skills already serve this), no multi-LLM-provider

### Dimension 5 — First landing context (who / why-now / where)
- **User**: USYD CS student, S1 2026, four courses (math + programming heavy)
- **Why now**: terminal can't render LaTeX/code visually; Obsidian occupied by another workstream; NotebookLM lacks local + agent; Claude Code Desktop is dev-focused not learning-focused
- **Where**: MacBook Pro 2019 Intel, macOS Ventura 13.4 — single-user, personal-use codebase

> **Critical caveat — REQ sample-size epistemic humility (added 2026-05-07)**:
>
> The 18 v1 + v1.x requirements derive from a **single learning duo** (the user + partner). They reflect what works for *this* sample — they are NOT a validated map of optimal learning methods. Higher-achieving students plausibly use methods this sample is blind to (different note formats, different review cadences, different visual / spatial scaffolding, different AI-collaboration patterns).
>
> **Implication for foundation-first**: this is the deepest reason behind the 5-dimension Core Value structure. Foundation (Dimension 1 KP / Dimension 3 KD) must remain **agnostic to which feature set wins**. Application-layer phases (REQ-09 FSRS / REQ-08 anchored / REQ-15 review-focus / future REQs / etc.) can be replaced, supplemented, or retired as observation of better learning methods accumulates — without disturbing data, vault format, or AI ↔ vault contract.
>
> **Ongoing observation line**: see `.planning/research/questions.md` **RQ-05** — informal observation of higher-achieving students' learning methods (no formal interviews required; opportunistic capture). Findings feed new REQ candidates / OOS revisions / new KP candidates. Does NOT block any v1 phase.

---

**One-sentence summary** (does NOT replace the 5-dimension structure above; quoting this alone loses ~80% of identity):

> mneme gives one user (me) a **local-first + AI-native personal learning infrastructure** whose end-experience is *"this AI truly understands me"* — proactively surfacing where I am, where I struggle, and how knowledge connects, rather than only answering what I ask. All features (three-pane UI / Echo360 / whiteboard / FSRS / mind-map / etc.) serve that experience, AND any single feature can be retired / rebuilt / replaced without disturbing the foundation or the data.

---

## Context (who, why, when)

- **User**: USYD CS student, S1 2026, four courses (math + programming heavy)
- **Why now**: Terminal can't render LaTeX/code blocks visually; Obsidian is occupied by another workstream; NotebookLM lacks local + agent capabilities; Claude Code Desktop App exists but is dev-focused, not learning-focused
- **Constraints**: Personal use only, single-user, MacBook Pro 2019 Intel, macOS Ventura 13.4
- **Identity**: `dev.mneme.spike` (will become `dev.mneme.app` post-naming-phase)

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
- **Visual aesthetic compliance (KP-09 + KD-13)**: all panes use the locked Anthropic/Claude family — cream background `#faf9f5`, terra-cotta accent `#d97757`, serif body text, soft 8% borders, `cubic-bezier(0.165, 0.85, 0.45, 1)` motion. Full spec in `.planning/references/design/`.

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
- **Proactive contextual recall (KP-07)**: at every chat session start AND at conversational pivot points (new topic, "I'm stuck", error correction), AI auto-surfaces relevant prior-session context (last progress on this topic / cross-week prerequisite knowledge / user's recent recurring mistakes) WITHOUT user having to ask. Acceptance: in a one-week conversation sample, AI proactively surfaces ≥3 relevant prior-session contexts per session with ≥90% relevance accuracy.

**Why it matters**:
This is the project's signature "AI-native" differentiator. Obsidian + plugins can fake the human layer; nothing on the market combines it with a continuously-maintained AI knowledge graph backed by a frontier LLM **plus proactive contextual recall** (the "懂我" experience that defines KP-07).

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

#### REQ-17 · Per-course system prompts via `.mneme/rules/`

**Status**: hypothesis (v1) — added after FEATURES research (DIFFERENTIATOR — small effort, big leverage).

**Sources of inspiration**:
- Cursor `.cursor/rules` MDC pattern (the user-pointed-out design)
- Claude Code's `~/.claude/CLAUDE.md` pattern (project-level instructions)
- No precedent in learning apps yet

**What it does**:
- Per-course directory: `courses/<COURSE>/.mneme/rules/<rule>.md`
- Each rule has YAML frontmatter (`enabled: true`, `priority: 10`, `applies_to: assignment|notes|review`) + markdown body (the prompt fragment)
- When user opens a chat in COURSE context, all enabled rules are concatenated into Claude's `--append-system-prompt`
- Examples:
  - `MATH1062/.mneme/rules/proof-style.md`: "Prefer formal proofs with explicit lemmas; show counterexamples when stating necessity vs sufficiency."
  - `COMP3221/.mneme/rules/style.md`: "Stick to Java idioms; avoid stream API in performance-critical paths."

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

#### REQ-19 · Voice input via OSS speech-to-text

**Status**: hypothesis (v1.x — added 2026-05-07; reverses prior OOS-09 exclusion per user direction)

**Sources of inspiration**:
- whisper.cpp (OpenAI Whisper port; C++/Rust friendly; local inference)
- distil-whisper (faster, smaller, MIT-compatible)
- Vosk (lightweight offline, multi-language)
- macOS native dictation (system-level alternative; non-OSS, fallback only)

**What it does**:
- Hotkey trigger for voice input mode (default `Cmd+Shift+V`)
- Local STT (Whisper / Vosk) transcribes speech → markdown injected into the active chat input
- Optional Claude pass for punctuation / formatting (e.g. "format as numbered list")
- Coexists with REQ-11 command palette without hotkey conflict

**Why it matters**:
Long prompts (problem descriptions, concept disambiguations) are slow to type; voice can be 3-5x faster. Students often think of questions while watching lecture videos — keyboard input breaks that flow.

**Constraints**:
- Local inference only (KP-01 — no cloud STT API)
- OSS library required (KP-02)
- v1.x, NOT v1 — must first validate Intel Mac CPU inference latency is acceptable (whisper.cpp small/medium model spike)

**Open questions**: which OSS library has acceptable inference latency on Intel Mac CPU; how to surface "voice mode active" UI affordance; whether to share microphone permission with browser-based future features.

---

### Out of Scope (deliberate exclusions)

#### OOS-01 · Multi-user / collaboration / commercialization

**Why excluded**: personal-use codebase; introducing accounts, sharing, billing would 10x the surface area for no user benefit (myself).

**Note on distribution (amended 2026-05-07 per Phase 0 discussion)**: open-source release of the codebase as a portfolio piece **is allowed and planned**. The repo may eventually be published publicly (MIT-licensed) so others can fork it for personal use. This is **NOT** commercialization, multi-user support, or hosted SaaS — it's "look, here's how I built my own learning vault." No user accounts, no shared infrastructure, no billing, no contribution-management overhead. Public-release polish work (`CONTRIBUTING.md`, demo video, screenshots, code-of-conduct) is its own separate future phase, not bundled into v1 scope.

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

> **Note (2026-05-07)**: OOS-09 (voice/audio dictation input) was removed from this list and reborn as **REQ-19** (v1.x candidate, OSS local STT). See REQ-19 for the new framing.

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

#### KP-07 · Proactive contextual recall ("懂我" 体验承诺)

**Source**: User insight (2026-05-07 explore session — "ai能根据课件资料进行回答, 比如'我们这周老师上完的那个tut的材料我上次做到了第几题, 它和第几周的知识是关联的'... 这些不仅仅是用户问你才说而是在日常输出里面也能够有相应的表达, 让用户觉得, 这个 AI 懂我").

AI must not only respond to user-initiated queries — it must **proactively surface relevant historical context** in everyday outputs:
- Last session's tut progress, mistakes, sticking points
- Cross-week knowledge connections (this week's content → prerequisite weeks)
- The user's recurring conceptual misunderstandings
- Recent learning habits and frequent error patterns

**Implementation path**: Three-tier memory (KD-10 working/episodic/long-term) + knowledge-graph association (REQ-07) + session-aware system-prompt injection (REQ-17 + REQ-12).

**Acceptance metric**: In a one-week sample of everyday conversations, the AI proactively surfaces relevant prior-session context **≥3 times per session** with **≥90% relevance accuracy** (judged by user against a held-out test).

**Non-negotiable rationale**: Without proactive recall, mneme degrades into another passive Q&A tool, indistinguishable from Cursor or NotebookLM. The "懂我" experience is the product's experiential differentiator — losing it kills the identity.

#### KP-08 · OSS dependency tracking + upstream monitoring

**Source**: User direction (2026-05-07 explore session — "所有我们用到的其他库我们都要记录下来, 虽然我们进行了二次开发, 但是上线后还是要随时监控这些库的更新, 然后对我们的系统和软件随时进行更新").

Every external open-source library the project uses (whether vendored, forked-and-extended, or directly depended on) must be **registered** and **continuously monitored** for upstream changes after v1 ship.

**Registry**: All such libraries are tracked in `.planning/dependencies.md` with the following fields per entry:
- Library name + version + license
- Purpose (which REQ / KD it serves)
- Integration mode: `npm-dep` / `cargo-dep` / `vendored` / `forked-extended` / `subprocess-cli`
- Upstream URL + maintainer health signal (last commit, issue activity, release cadence)
- Our local modifications (if any)
- Monitoring cadence: `weekly` / `monthly` / `release-only` / `frozen`
- Last-checked timestamp

**Monitoring**:
- Pre-v1: registry must be populated before each phase ship; new dependencies added in the same PR that introduces them
- Post-v1 ship: automated upstream check (GitHub Actions cron / dependabot) at the configured cadence; any **security patch / API breaking change / license change** triggers a manual review issue

**Non-negotiable rationale**: KP-02 (50% OSS) + KP-06 (fork + extend) creates a long-term debt — forks rot if upstream isn't tracked; vendored code accumulates CVEs if frozen. KP-08 closes the loop: every OSS we adopt is owned, not just imported.

#### KP-09 · Aesthetic family — inherit Anthropic / Claude visual identity

**Source**: User direction (2026-05-07). Curated reference materials stored in `.planning/references/design/` are the SSOT for everything below.

mneme's UI culture, design, and aesthetics inherit the **Anthropic / Claude visual identity family** — the only major AI brand built on warm tones and humanist restraint, deliberately positioned against the industry's cold blue / black / metallic defaults.

**Three core principles** (per Geist studio's founding direction, quoted in reference deep-dive):
1. **warmth over modernity** — terra-cotta orange + cream backgrounds; never pure black/white; never gradients/glows
2. **accessibility over exclusivity** — readable serifs over Arial/Inter; generous spacing; plain-language labels
3. **thoughtful restraint over flashy showmanship** — soft multi-layer shadows; custom ease curves; no animation flexing

**Non-negotiable rationale**: mneme is a Claude-Code-wrapper desktop shell — the user already lives inside Claude's aesthetic via the CLI. Departing from that aesthetic in mneme creates a "two products glued together" feel that **violates Core Value Dimension 2 ("one product feel")**. Inheriting the family means the user's eyes never have to context-switch between mneme and Claude.

**Reference materials (SSOT — read these for all detailed specs / history / philosophy / OSS gallery)**:
- [`.planning/references/design/anthropic-claude-aesthetic-deep-dive_zh.md`](references/design/anthropic-claude-aesthetic-deep-dive_zh.md) — 7-chapter deep-dive: brand visual system, color palette, typography, design philosophy, team, evolution timeline, community reception
- [`.planning/references/design/claude-aesthetic-ui-libraries-gallery.html`](references/design/claude-aesthetic-ui-libraries-gallery.html) — curated gallery of 9 OSS libraries that already implement this aesthetic (open in browser to view rendered)

**Relationship to KP-05** (UI initial design via Claude Design): KP-05 is about the **process** (use prompt-to-prototype tool to start UI), KP-09 is about the **aesthetic family** (what the result should look like). They compose: Claude Design's outputs already lean toward this aesthetic; KD-13 codifies the locked specs.

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

#### KD-13 · Visual aesthetic system locked to Anthropic/Claude family (per KP-09)

**Source**: KP-09 + reference materials in `.planning/references/design/` (treated as SSOT — see KP-09 for file paths). Cross-validated against `anthropics/skills/brand-guidelines` (the only first-party color/typography source).

This decision **locks the minimum mandatory rules**. The complete specification (full token palette, motion details, shadow system, recommended OSS libraries, Anthropic team's design rationale) lives in the reference files — do NOT duplicate it here; read those files when implementing.

**Mandatory locks (must hold across all UI surfaces)**:

1. **Primary palette anchors** (oklch derivations OK; these 4 hex values must be the visual core):
   - `--orange: #d97757` (Anthropic terra cotta — primary accent)
   - `--bg: #faf9f5` (cream background, light mode — NOT pure white)
   - `--ink: #141413` (text — NOT pure black)
   - `--ink-soft: #2b2a27` (warm dark mode background — NOT cold gray-black)

2. **Typography rules**:
   - Body / reading text: serif preferred (`'Iowan Old Style', 'Apple Garamond', 'Georgia', 'Songti SC', 'Source Han Serif SC', serif`)
   - UI labels / code / monospace: `ui-monospace, 'SF Mono', Menlo, monospace`
   - **Banned: Arial, Inter** — Anthropic internal guidance flags these as producing "cheap AI feel"

3. **Motion**:
   - Standard ease curve: `cubic-bezier(0.165, 0.85, 0.45, 1)` (modified ease-out — organic feel)
   - Button press feedback: `active:scale-[0.96]` micro-shrink (Phase 1 UI-SPEC ratification 2026-05-08; project-wide adjustment from Anthropic's 0.98 baseline for clearer chat-input button feedback)
   - Animation philosophy: subtle and purposeful, never flashy

4. **Soft separation** (no hard lines, no harsh shadows):
   - Borders: ~8% opacity black (e.g. `rgba(20, 20, 19, 0.08)`)
   - Shadows: soft multi-layer (e.g. `0 0.25rem 1.25rem rgba(0,0,0,0.035)` for floating elements)

**Recommended starting libraries** (full list with previews in reference HTML gallery; choose by integration mode):
- **shadcn.io/theme/claude** — drop-in oklch tokens; mneme uses Svelte not React, so **port the CSS variables directly**, do not import the React components
- **anthropics/skills/brand-guidelines** — official first-party color/typography source; treat as ground truth when other sources disagree
- **assistant-ui Claude Clone** — three-pane layout pattern reference (study only — React)
- **tweakcn** — visual theme generator for shade variant extension
- **VoltAgent/awesome-claude-design** — 68 DESIGN.md templates for prompt-driven UI scaffolding (composes with KP-05 + KP-09)
- **jnahian/vscode-claude-theme** — for the `claude` CLI subprocess if user opens code in editor

**Integration in mneme codebase**:
- Tokens live in `app/src/styles/tokens.css` (or equivalent SvelteKit location)
- Tauri webview honors them via global CSS injection
- All third-party UI libs (Marker preview / Tiptap / Cytoscape / Excalidraw) consume the **same** tokens — no library-local color overrides
- All recommended OSS above tracked in `.planning/dependencies.md` per KP-08

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

*Last updated: 2026-05-06 — initialized via `/gsd-new-project` after `/gsd-explore` (foundation-decisions.md, 9 decisions) + `/gsd-spike` (2 validated spikes wrapped into `spike-findings-mneme` skill).*
