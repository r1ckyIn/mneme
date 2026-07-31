# Feature Research — mneme

**Domain:** Personal desktop learning app wrapping local Claude Code (USYD CS S1 2026; math + programming)
**Researched:** 2026-05-06
**Confidence:** HIGH
**Researcher mode:** Ecosystem (cross-checking 8 reference products against user's REQ-01..10 / OOS-01..05 / KP-01..06)

> **⚠ Status drift notice (sync 2026-05-07)**: This research artifact is a **frozen snapshot from 2026-05-06**. Subsequent decisions changed several recommendations:
> - **OOS-09** (voice / audio dictation) referenced below as a "recommended OOS addition" was **lifted to REQ-19** (v1.x candidate, OSS local STT — whisper.cpp / distil-whisper / Vosk) on 2026-05-07. F-ANTI-10 in this file is no longer accurate as an exclusion.
> - **KP scope** has expanded from KP-01..06 (header above) to **KP-01..09** — added KP-07 (proactive contextual recall), KP-08 (OSS dependency tracking), KP-09 (Anthropic/Claude aesthetic family). Consult PROJECT.md for current KP list.
> - **REQ scope** expanded from REQ-01..10 (header) to **REQ-01..19**. Consult REQUIREMENTS.md for current list.
>
> When this file's recommendations conflict with PROJECT.md / REQUIREMENTS.md, **PROJECT.md / REQUIREMENTS.md win**.

---

## TL;DR — What's Missing From REQ-NN

The user's 10 REQs cover the **content + AI core** strongly, but miss **app-shell hygiene** (command palette, multi-session, settings/preferences, error/sync surface) and **review-loop fluency** (review session UI, due-queue ranking visualization, post-review concept update). 9 MISSING features identified below.

| Severity | Missing Feature | Why It Matters |
|----------|----------------|----------------|
| **CRITICAL** | F-MISS-01 Command palette + quick switcher (Cmd+P / Cmd+O) | Every reference app ships this; user already has Obsidian muscle memory; missing = the app feels like a mockup |
| **CRITICAL** | F-MISS-02 Multi-session / multi-conversation sidebar | Claude Desktop Apr 2026 redesign was *literally* a rebuild around this; one-conversation-at-a-time = unusable for 4 courses |
| **HIGH** | F-MISS-03 Sync status surface (toast / banner / status bar) | REQ-03 mentions push-toast in passing; Canvas/Ed sync silently failing for 2 days = lost trust |
| **HIGH** | F-MISS-04 Settings / preferences UI | Hardcoded paths and `claude --add-dir` boundary settings need UI; otherwise app is hostile to its single user (the user) on day 30 |
| **HIGH** | F-MISS-05 Review-mode UI (collapsed three-pane → focus screen) | REQ-09 mentions it but doesn't define the screen; this is 30% of the daily UX |
| **HIGH** | F-MISS-06 Citation click-back navigation primitive | REQ-08 says click `[file.md:42]` opens vault — but this is a reusable primitive used by review-mode, video timestamps, and graph-node-clicks too |
| **MEDIUM** | F-MISS-07 Conversation persistence + branching | Claude Desktop's "side chat (Cmd+;)" pattern; without it you lose course-thread context every restart |
| **MEDIUM** | F-MISS-08 PDF→markdown ingest (RQ-02 unresolved) | REQ-03 imports lecture *files* but doesn't define the PDF→AI-friendly conversion; without this `_source/` is just opaque blobs to Claude |
| **MEDIUM** | F-MISS-09 Onboarding / first-run flow | REQ-03 mentions "first launch" but doesn't define the empty-state when no Canvas MCP is connected, no courses chosen, no vault path picked |

---

## Reference Product Cross-Check (one concrete feature per product)

| Product | Concrete feature pulled | Mapped to | Notes |
|---------|------------------------|-----------|-------|
| **NotebookLM** | Sources/Chat/Studio 3-pane + grounded chat with clickable citations + interactive Mind Map (click node → opens chat scoped to that branch) | REQ-01 (3-pane), REQ-08 (anchored), REQ-07 (mind-map) | NotebookLM **stops** at "click node → chat" — we extend with **streaming-into-mindmap during chat** which they don't have |
| **Obsidian** | Command palette (Cmd+P), Quick switcher (Cmd+O), Excalibrain plugin (auto mind-map from `[[wiki-links]]` + dataview + frontmatter), HiNote/LearnKit/True Recall (FSRS on notes via `ts-fsrs`) | REQ-06 (vault), REQ-09 (FSRS), F-MISS-01 (palette) | Excalibrain is the closest precedent for our human-side mind-map; `True Recall` proves note-level FSRS is shipped, not theoretical |
| **Heptabase** | AI Tutor: add cards as sources, drag AI chat → whiteboard, Premium mode, Mindmap with fold/rotate; Web Cards (offline) | REQ-07 (whiteboard), REQ-08 (anchored sources) | Heptabase has **everything except the local Claude Code agent capabilities** — they're closest to our human-layer reference; their roadmap shows FSRS still in development → first-mover advantage for us |
| **Anki** | FSRS-6 default since 23.12; reduces reviews 20-30% vs SM-2; image occlusion + cloze; review heatmap | REQ-09 (algorithm), KD-06 (`ts-fsrs`) | We keep the algorithm, drop the manual-card-building (OOS-05) |
| **Cursor** | Cmd+K inline edit, Composer/Agent (Cmd+I), Tab completion (320ms), `.cursor/rules` MDC files for project-level system prompts, /multitask async subagents | REQ-01 (right-panel chat), KP-04 (subprocess wrapping pattern shared) | The **`.cursor/rules` pattern** is gold — we should replicate as `.mneme/rules/` for per-course system prompts (e.g. "MATH1062: prefer formal proofs"). **NOT YET IN REQ LIST** — see F-DIFF-08 |
| **Claude Desktop App (Apr 2026)** | Multi-session sidebar (filter by status/project), side chat shortcut Cmd+; (branch question off running task), integrated terminal + file editor + diff viewer, Routines (scheduled prompt triggers) | F-MISS-02 (multi-session), F-MISS-07 (branching) | Anthropic's own app pivoted to multi-session because single-session was the #1 pain. We must not repeat that mistake. **Routines** is interesting → see F-DIFF-09 |
| **Mem.ai / Reflect / Saner.ai** | Auto-organize without manual filing, Mem Chat queries entire note history with citations, voice→text via Whisper, end-to-end encryption (Reflect) | KP-03 (AI-native), KP-01 (local-first) | Mem.ai's "AI reads what you write and links related content automatically" = **the streaming-graph pattern we want**, but they use cloud. We do it local. |
| **RemNote** | Flashcards-in-notes (cards live in their note context), FSRS-6 + SM-2, AI-powered flashcard generation, Exam Scheduler, PDF annotation→cards | REQ-09 (FSRS) — partial precedent | RemNote keeps cards-as-notes; we go one step further → **review the concept page itself**, AI generates fresh test on the spot. **Anti-feature confirmation**: don't build a card editor (OOS-05 holds) |
| **Opcode (Claudia, ~21k stars)** | Tauri 2 GUI for Claude Code; message input + scrolling transcript + file tree + diff viewer; **single session per window — no unified view** | REQ-02 (subprocess) | Most popular community wrapper, AGPL. Confirms Tauri 2 + subprocess approach is community-validated. Their **single-session limitation** is our improvement opportunity → F-MISS-02 again |

**Confidence on cross-check: HIGH** (all 8 references verified against published 2026 docs/changelogs/reviews).

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are non-negotiable — the user (or any returning Obsidian/NotebookLM/Cursor user) will abandon the app within a week if these are missing.

| ID | Feature | Why Expected | Complexity | Inspiration | REQ Map |
|----|---------|--------------|------------|-------------|---------|
| F-TS-01 | Three-pane resizable layout (file tree / preview / chat) | NotebookLM, Cursor, VS Code muscle memory | M | NotebookLM, Cursor | REQ-01 ✓ |
| F-TS-02 | Streaming markdown + LaTeX + code block rendering in chat | Every modern chat app post-ChatGPT-Mar-2023 | S | Cursor, Claude Desktop | REQ-02 ✓ (spike-validated) |
| F-TS-03 | Markdown vault on local disk, plain `.md` + YAML frontmatter | Obsidian's whole ethos; user explicit (KP-01) | M | Obsidian | REQ-06 ✓ |
| F-TS-04 | `[[wiki-link]]` autocomplete + click-to-navigate | Obsidian standard; required for cross-course concept linking | M | Obsidian | REQ-06 ✓ (linking part) |
| F-TS-05 | **Command palette (Cmd+P) + quick switcher (Cmd+O)** | Obsidian, Cursor, every shipping desktop app | S | Obsidian | **MISSING — F-MISS-01** |
| F-TS-06 | **Multi-session / multi-conversation sidebar** | Claude Desktop redesigned around this (Apr 2026); 4 courses = 4+ live threads | M | Claude Desktop App | **MISSING — F-MISS-02** |
| F-TS-07 | Free/anchored mode toggle in chat | NotebookLM-style sources panel + Claude's free agent are the two known modes | S | NotebookLM, Anthropic Citations API | REQ-08 ✓ |
| F-TS-08 | Citation click-back: `[file.md:42]` opens vault to that line | NotebookLM has it; required for trust | S | NotebookLM | REQ-08 ✓ (mentioned, but reusable primitive — see F-MISS-06) |
| F-TS-09 | Course file tree (left pane) with Canvas/Ed sync | User has Canvas/Ed MCP working in 7th iteration; expects real data | M | NotebookLM (manual upload), VS Code (file tree) | REQ-03 ✓ |
| F-TS-10 | Lecture video player (middle pane) | Without video, app is "yet another notes + chat" | L | Echo360 LTI + Tauri webview | REQ-04 ✓ |
| F-TS-11 | Bilingual captions toggle on video | Echo360's VTT exists; user is international student | M | Echo360 + Claude API translate | REQ-05 ✓ |
| F-TS-12 | Source-grounded citations in anchored mode | NotebookLM's USP; Anthropic Citations API exists | M | NotebookLM, Anthropic Citations API | REQ-08 ✓ (KD-05) |
| F-TS-13 | FSRS-6 spaced repetition scheduler | Anki default since 23.12; user explicitly asked for this | M | Anki, `ts-fsrs` | REQ-09 ✓ (KD-06) |
| F-TS-14 | **Review-mode UI: focus screen, AI generates question, 1/2/3/4 grading** | Anki's review screen is the reference; without UI design = no review loop | M | Anki, RemNote | **PARTIAL — REQ-09 mentions, F-MISS-05 details missing** |
| F-TS-15 | **Sync status surface (toast on new announcement, status bar for last-sync)** | Canvas/Ed silently failing destroys trust | S | Notion, VS Code activity bar | **MISSING — F-MISS-03** |
| F-TS-16 | **Settings / preferences UI** (vault path, MCP boundary, course list, theme) | Every desktop app has one; without it, hardcoded values rot | M | All desktop apps | **MISSING — F-MISS-04** |
| F-TS-17 | **Onboarding / first-run flow** (vault path picker, Canvas MCP detect, course pick) | REQ-03 hand-waves "first launch detects MCP"; needs actual screens | M | Notion, Linear, Obsidian | **MISSING — F-MISS-09** |
| F-TS-18 | Markdown editor with WYSIWYG-ish block UI + slash menu (`/`) | Notion-class expectation post-2024; Tiptap supports both | M | Notion, Tiptap experiments | KD-09 ✓ |
| F-TS-19 | PDF preview in middle pane | Lecture slides are PDFs; opening externally breaks flow | M | NotebookLM, Heptabase | REQ-01 (mentioned "PDF/PPT preview"), needs concrete library decision |
| F-TS-20 | **PDF → AI-friendly markdown conversion (Marker / MinerU / Docling)** | RQ-02 unresolved; without it `_source/` PDFs are opaque to Claude (it can grep filenames, not equations) | L | Marker (datalab-to/marker), MinerU (CJK + math), Docling (IBM) | **MISSING — F-MISS-08** (RQ-02) |
| F-TS-21 | Streaming text indicator (dot pulse, partial render) | Every chat app does it; spike F-validated approach | S | Claude Desktop, Cursor, opcode | REQ-02 ✓ (spike-validated) |
| F-TS-22 | Conversation history persistence across app restart | Claude Desktop, Cursor, ChatGPT all do it; losing chat = losing study session | M | Claude Desktop App | **MISSING — F-MISS-07 (partial)** |

**Severity reasoning for MISSING items:**
- **CRITICAL** = first-week abandonment. F-MISS-01 (palette), F-MISS-02 (multi-session) are this severity.
- **HIGH** = month-one frustration. F-MISS-03/04/05/06 are these.
- **MEDIUM** = month-two papercut. F-MISS-07/08/09 are these.

---

### Differentiators (Competitive Moat)

These are the features that make `mneme` distinct from each individual reference product. Each is something **no single competitor ships**.

| ID | Feature | Value Proposition | Complexity | Inspiration | REQ Map | OSS Foundation? |
|----|---------|-------------------|------------|-------------|---------|-----------------|
| F-DIFF-01 | **Streaming-into-mind-map**: as Claude generates concepts, the top-bar mind-map animates new nodes/edges | NotebookLM mind-map is post-hoc generation; no one streams the graph during the conversation. Heptabase requires manual drag-to-whiteboard. | XL | Excalibrain (auto from links), Graphiti (incremental temporal KG), original synthesis | REQ-07 ✓ | KP-02 partial — Graphiti (MIT, getzep) is the closest base; fork + extend |
| F-DIFF-02 | **Free-mode ↔ Anchored-mode same UI toggle** | NotebookLM has anchored only; Claude Desktop has free only. The friend's "学习用 Claude / 复习用 NotebookLM" insight encoded in one switch. | M | NotebookLM (anchored) + Claude Desktop (free) + Anthropic Citations API | REQ-08 ✓ | YES — Anthropic Citations API is the foundation |
| F-DIFF-03 | **Concept-page review (not flashcards) + AI-generated fresh question on the spot** | Anki/RemNote review pre-authored cards; we review the **concept page** with a freshly generated test. Removes the manual-card-building bottleneck that kills Anki for 90% of students. | L | RemNote (cards-in-notes), True Recall (FSRS on notes), original synthesis | REQ-09 ✓ | YES — `ts-fsrs` (open-spaced-repetition org) |
| F-DIFF-04 | **Graph-weakness × FSRS-due-ness ranked review queue** | Standard FSRS only knows "due"; we additionally know "weakly connected in graph". Prioritizes reviews where both pressure points align — fixes weak knots fastest. | M | REQ-09 + REQ-07 synthesis | REQ-09 ✓ | Self-built (small layer on `ts-fsrs`) |
| F-DIFF-05 | **Bilingual auto-translated captions persisted as searchable transcript** | Echo360 has VTT; nobody marries Echo360 + Claude translation + grep search of caption corpus. International students get massive comprehension lift. | M | Echo360 VTT + Claude API + immersive translate concept | REQ-05 ✓ | Partial OSS (Read Frog, FluentRead for translation pattern) |
| F-DIFF-06 | **Caption + video timestamp + PDF page three-way alignment** ("show me where the prof said `老师讲了 X` and the slide that was up") | QuickTakes does timestamp linking; HoverNotes does screenshot embedding; nobody does **caption + video time + slide page** all aligned for cross-search | L | HoverNotes, ScreenApp, OneNote (audio↔note), Echo360 + Tauri | Implicit in REQ-04 + REQ-05; **EXPAND** | Self-built (small alignment service) |
| F-DIFF-07 | **Dual-layer data model: AI graph + human mind-map from same source-of-truth** | Mem.ai auto-links but it's cloud-only and one-layer. Heptabase has whiteboard but no AI graph. Obsidian has graph view but no AI maintenance. | XL | GraphRAG papers, Memento (LongMemEval 92.4%), Mem0/Cognee/Zep | REQ-07 ✓ | YES (KP-02) — base on Cognee or Graphiti, extend |
| F-DIFF-08 | **Per-course system prompts via `.mneme/rules/` MDC files** (e.g. "MATH1062: always provide formal proofs; cite course-week") | Cursor has `.cursor/rules`; nobody has it for *learning* (course-specific tutor personas). Massive UX win for math vs CS courses needing different teaching styles. | S | Cursor's `.cursor/rules` MDC | **NOT IN REQ LIST — RECOMMEND ADD** | YES — copy Cursor's pattern |
| F-DIFF-09 | **Routine-style scheduled prompts** ("Every Sunday 8pm: summarize this week's COMP1100 lectures into a quiz") | Claude Desktop's Routines (Apr 2026); no learning app has scheduled study triggers | M | Claude Desktop App April 2026 redesign | **NOT IN REQ LIST — DEFER (v1.x)** | YES — Tauri tray + cron pattern |
| F-DIFF-10 | **Agentic vault search (no vector DB)** | Inverts conventional RAG-first wisdom; aligns with Anthropic's own validated approach (Boris Cherny). Privacy + simplicity win. | S (just don't build) | Claude Code itself | REQ-10 ✓ (KD-07) | YES — already in Claude Code, free |

**Highest-leverage differentiator:** F-DIFF-01 (streaming-into-mind-map). This is the **single feature** that, demoed, makes someone say "oh, this isn't NotebookLM + Obsidian glued together — this is something new." All other diffs are valuable but easier to copy.

---

### Anti-Features (Look Attractive, Wrong for Scope)

Features the user might be tempted to add (or that reviewers/friends will suggest), but that should be explicitly rejected. Cross-checked against existing OOS-NN.

| ID | Anti-Feature | Surface Appeal | Why Wrong for This User / Scope | Maps To | Better Alternative |
|----|--------------|----------------|--------------------------------|---------|-------------------|
| F-ANTI-01 | Audio overview (NotebookLM-style 2-host podcast) | NotebookLM's most-shared feature; "kids these days listen to podcasts" | Math/CS rewards reading + active recall, not passive listening; per-minute Claude API cost is real; Claude is not a great audio producer | **OOS-04 ✓ confirmed** | Read the markdown; do FSRS review |
| F-ANTI-02 | Manual flashcard authoring (Anki-style card editor) | Anki's bread-and-butter; "we already have FSRS, why not cards?" | Manual card-building is Anki's death spiral — users abandon it within 2-4 weeks. User explicitly pushed back on this. | **OOS-05 ✓ confirmed** | Concept-page review with AI-generated questions (F-DIFF-03) |
| F-ANTI-03 | Multi-user / sharing / collaboration | "Share my study notes with classmates" is requested by every user-test of every notes app | Adds 10x surface area for personal-use product; auth, permissions, sync conflicts, billing pressure | **OOS-01 ✓ confirmed** | Manual export of `.md` files to a Gist if needed |
| F-ANTI-04 | Mobile (iOS / Android) port | "I want to study on the bus" | Lecture videos + PDFs need a desk; Tauri Mobile is heavy; the app fundamentally requires a 3-pane layout | **OOS-02 ✓ confirmed** | Web-only fallback if absolutely needed (don't build) |
| F-ANTI-05 | Custom vector DB / RAG infrastructure | Conventional wisdom says "AI app = RAG"; vendors push it | Boris Cherny / Anthropic replaced their own RAG with agentic search and got better results; staleness, embedding privacy, infra cost = all avoidable | **OOS-03 ✓ confirmed** | Agentic grep (REQ-10); narrow vector only for hot paths (50ms writing-time concept suggestions) |
| F-ANTI-06 | **Manual mind-map drawing tool** | Heptabase / Excalidraw style "drag boxes around" | We have AI generating the graph + mind-map automatically (F-DIFF-01); building a manual editor splits effort and confuses the loop | **EXPAND OOS list** | Mind-map is auto-generated; weekend "whiteboard mode" allows light arrange/highlight only |
| F-ANTI-07 | **Plugin system for third parties** | Obsidian's superpower is plugins | Single-user app; plugin API = forever-compat tax; wrong leverage for one user | **EXPAND OOS list** | Skills directory in Claude Code already provides extensibility; that's the plugin layer |
| F-ANTI-08 | **Built-in LLM model selection (OpenAI / Gemini / xAI / etc.)** | Cherry Studio / Cursor support multi-vendor | Subprocess wrapping (KP-04) explicitly uses *user's own Claude subscription* via `claude` CLI; multi-vendor breaks compliance bucket and adds 10x complexity | **EXPAND OOS list** | Claude Code is the model. Period. Skills + MCPs extend capability. |
| F-ANTI-09 | **Real-time collaboration on a vault** | Notion/Heptabase have it | Single-user; conflicts; CRDT complexity for zero benefit | **Already covered by OOS-01 expansion** | None — never multiplayer |
| F-ANTI-10 | **Voice transcription / dictation** | Reflect, Mem.ai, Otter all do it | Lecture videos already give you Echo360 captions; user is at desk, not commuting; Whisper integration cost ≠ value for math/CS | **NEW — recommend add to OOS** | Type. Or copy from Echo360 captions. |
| F-ANTI-11 | **Auto-summary of every conversation** | Mem.ai auto-organizes; Claude Desktop has session summaries | The three-tier memory architecture (KD-10) **already** does this in the AI graph; user-facing auto-summary is duplicate work + noise | **Implicit; recommend explicit OOS** | Three-tier memory tiers handle this silently |

**Recommended OOS additions:**
- **OOS-06**: Manual mind-map / whiteboard drawing tool (the mind-map is AI-generated, not user-drawn)
- **OOS-07**: Plugin system / extensibility API (Claude Code skills + MCPs are the extensibility layer)
- **OOS-08**: Multi-LLM-provider support (KP-04 locks Claude subscription; multi-vendor breaks compliance + 10x complexity)
- **OOS-09**: Voice / audio capture for note-taking (lecture captions already provide transcription; commute-mode out of scope per OOS-02)

---

## Feature Dependencies

```
F-TS-03 (markdown vault)
   ├──requires──> F-TS-04 (wiki-links)
   ├──requires──> F-TS-09 (Canvas sync)
   │                  └──requires──> F-TS-15 (sync status surface)
   ├──requires──> F-TS-20 (PDF→md conversion)  [F-MISS-08]
   └──enables──> F-DIFF-07 (dual-layer data)
                       ├──enables──> F-DIFF-01 (streaming mind-map)
                       └──enables──> F-DIFF-04 (graph-weakness review queue)

F-TS-01 (three-pane)
   ├──requires──> F-TS-05 (command palette)  [F-MISS-01]
   ├──requires──> F-TS-06 (multi-session sidebar)  [F-MISS-02]
   └──enables──> F-TS-10 (video) + F-TS-19 (PDF preview) + F-TS-02 (chat)

F-TS-02 (streaming chat)
   └──requires──> F-TS-22 (conversation persistence)  [F-MISS-07]

F-TS-13 (FSRS)
   ├──requires──> F-TS-14 (review-mode UI)  [F-MISS-05]
   ├──requires──> F-TS-08 (citation click-back)  [reuses F-MISS-06]
   └──enabled-by──> F-DIFF-07 (graph layer for F-DIFF-04 ranking)

F-TS-10 (video)
   ├──requires──> F-TS-11 (bilingual captions)
   └──enables──> F-DIFF-05 + F-DIFF-06

F-DIFF-02 (mode toggle)
   └──requires──> F-TS-12 (Citations API) + F-TS-07 (toggle UI)

F-DIFF-08 (per-course rules)
   └──requires──> F-TS-16 (settings UI)  [F-MISS-04]

F-DIFF-09 (routines)
   └──requires──> system tray + cron + F-TS-22 (persistence)
```

### Critical Dependency Chains

1. **The Vault Chain**: F-TS-03 → F-TS-09 (sync) → F-TS-20 (PDF→md) → F-DIFF-07 (graph) → F-DIFF-01 (streaming mind-map). **A break anywhere here = the AI sees garbage.** PDF conversion (F-MISS-08, RQ-02) is the soft underbelly.

2. **The Shell Chain**: F-TS-01 (3-pane) → F-TS-05 (palette) + F-TS-06 (multi-session) + F-TS-15 (sync status) + F-TS-16 (settings) + F-TS-17 (onboarding). **All four MISSING items live here.** Without them the app feels like a spike, not a product.

3. **The Review Chain**: F-TS-13 (FSRS) → F-TS-14 (review screen) → F-DIFF-04 (graph-aware ranking). **F-MISS-05 (review screen) is the gap.**

---

## MVP Definition

### Launch With (v1) — Roughly maps to existing REQ-01..10 + 4 missing-fixes

Minimum to validate "wrap Claude Code in a learning shell" hypothesis.

- [ ] **F-TS-01** — Three-pane resizable shell (REQ-01)
- [ ] **F-TS-02** — Streaming markdown/LaTeX/code chat (REQ-02 — spike-validated)
- [ ] **F-TS-03** — Markdown vault on disk (REQ-06)
- [ ] **F-TS-04** — Wiki-link autocomplete + click-nav (REQ-06)
- [ ] **F-MISS-01 (F-TS-05)** — Command palette + quick switcher *[CRITICAL gap fix]*
- [ ] **F-MISS-02 (F-TS-06)** — Multi-session sidebar (4 courses min) *[CRITICAL gap fix]*
- [ ] **F-TS-09** — Canvas + Ed sync to vault (REQ-03)
- [ ] **F-MISS-03 (F-TS-15)** — Sync status surface *[HIGH gap fix]*
- [ ] **F-TS-13** — FSRS-6 scheduling (REQ-09)
- [ ] **F-MISS-05 (F-TS-14)** — Review-mode UI screen *[HIGH gap fix]*
- [ ] **F-DIFF-10 (REQ-10)** — Agentic vault search (zero-build, just don't add vector DB)
- [ ] **F-MISS-09 (F-TS-17)** — First-run onboarding flow

### Add After Validation (v1.x)

Once v1 proves the loop works.

- [ ] **F-TS-10** — Echo360 video player (REQ-04, P2 in user's spec)
- [ ] **F-TS-11** — Bilingual captions (REQ-05)
- [ ] **F-TS-19** — PDF preview in middle pane
- [ ] **F-MISS-08 (F-TS-20)** — PDF→AI-friendly markdown conversion (resolves RQ-02)
- [ ] **F-TS-07 + F-DIFF-02** — Anchored mode toggle + Citations API (REQ-08)
- [ ] **F-TS-12** — Source-grounded citations (REQ-08)
- [ ] **F-TS-08 + F-MISS-06** — Citation click-back primitive (REQ-08, reused widely)
- [ ] **F-TS-18** — Tiptap block editor + slash menu (KD-09)
- [ ] **F-MISS-04 (F-TS-16)** — Settings / preferences UI
- [ ] **F-MISS-07 (F-TS-22)** — Conversation persistence + branching (Cmd+; pattern)

### Future Consideration (v2+) — The differentiator layer

Defer until v1 + v1.x prove the user actually opens the app daily.

- [ ] **F-DIFF-01** — Streaming-into-mind-map (the signature feature; needs graph + mind-map both stable first)
- [ ] **F-DIFF-03** — Concept-page review with AI-generated questions (REQ-09 enhancement)
- [ ] **F-DIFF-04** — Graph-weakness × FSRS-due ranked queue
- [ ] **F-DIFF-05** — Searchable bilingual transcript corpus
- [ ] **F-DIFF-06** — Caption + video time + PDF page three-way alignment
- [ ] **F-DIFF-07** — Dual-layer data: full AI graph layer (REQ-07; needs Mem0/Cognee/Graphiti foundation decision from RQ-01)
- [ ] **F-DIFF-08** — `.mneme/rules/` per-course system prompts *[NEW, recommend add to REQ list]*
- [ ] **F-DIFF-09** — Routine-style scheduled prompts *[NEW, defer to v2]*

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| F-TS-01 three-pane | HIGH | M | **P1** |
| F-TS-02 streaming chat | HIGH | S (spike done) | **P1** |
| F-TS-03 vault | HIGH | M | **P1** |
| F-TS-05 command palette (F-MISS-01) | HIGH | S | **P1** |
| F-TS-06 multi-session (F-MISS-02) | HIGH | M | **P1** |
| F-TS-09 Canvas sync | HIGH | M | **P1** |
| F-TS-13 FSRS | HIGH | M | **P1** |
| F-TS-14 review UI (F-MISS-05) | HIGH | M | **P1** |
| F-TS-15 sync status (F-MISS-03) | HIGH | S | **P1** |
| F-TS-17 onboarding (F-MISS-09) | HIGH | M | **P1** |
| F-DIFF-10 agentic search | HIGH | XS (zero-build) | **P1** |
| F-TS-10 Echo360 video | HIGH | L | **P2** |
| F-TS-11 bilingual captions | MEDIUM-HIGH | M | **P2** |
| F-TS-12 + F-DIFF-02 anchored mode | HIGH | M | **P2** |
| F-TS-19 PDF preview | MEDIUM | M | **P2** |
| F-TS-20 PDF→markdown (F-MISS-08) | HIGH | L | **P2** |
| F-TS-16 settings UI (F-MISS-04) | MEDIUM | M | **P2** |
| F-TS-22 conv persistence (F-MISS-07) | HIGH | M | **P2** |
| F-DIFF-01 streaming mind-map | VERY HIGH | XL | **P3** (deferred, signature) |
| F-DIFF-03 concept-page review | HIGH | L | **P3** |
| F-DIFF-07 dual-layer data | VERY HIGH | XL | **P3** |
| F-DIFF-08 per-course rules | MEDIUM-HIGH | S | **P3** (cheap, but defer to post-v1.x) |
| F-DIFF-04 graph-weakness queue | MEDIUM | M | **P3** |
| F-DIFF-09 routines | MEDIUM | M | **P3** |
| F-DIFF-05 bilingual transcript search | MEDIUM | M | **P3** |
| F-DIFF-06 three-way timestamp | MEDIUM | L | **P3** |

**Priority key:**
- **P1** = MVP (v1) — must ship to validate concept
- **P2** = v1.x — add immediately after v1 ships
- **P3** = v2+ — the differentiator layer; only after daily-use is proven

---

## Competitor Feature Analysis (the matrix the user asked for)

Each row = a feature axis. Each column = how each product handles it. Last column = our approach.

| Feature axis | NotebookLM | Obsidian | Heptabase | Anki | Cursor | Claude Desktop | Mem.ai/Reflect | RemNote | **mneme** |
|--------------|-----------|----------|-----------|------|--------|---------------|----------------|---------|---------------|
| Local-first vault | No (cloud) | Yes (`.md`) | Hybrid | Local sqlite | Workspace local | Local CLI sessions | Cloud (Mem) / E2EE cloud (Reflect) | Cloud-first, local export | **Yes (`.md` + YAML)** |
| Three-pane shell | Sources/Chat/Studio | File/Editor/Outline | Map/Card/AI | n/a | File/Editor/Chat | Sidebar/Editor/Diff | n/a | Notes/Cards/AI | **Files/Video+PDF/Chat (lecture-anchored)** |
| Multi-session sidebar | n/a | n/a (workspaces) | n/a | n/a | Tabs | **Apr 2026 redesign — yes** | n/a | n/a | **Required (F-MISS-02)** |
| Command palette | Limited | **Cmd+P (gold standard)** | Cmd+K | n/a | **Cmd+K + Cmd+I** | Cmd+; side chat | Limited | Yes | **Required (F-MISS-01)** |
| Markdown editor | Limited | Excellent | Card-based | n/a | Code-only | Code-only | Block editor | Block editor | **Tiptap + markdown storage (KD-09)** |
| Mind-map | **Click-node→chat (post-hoc)** | Excalibrain plugin (auto from links) | Whiteboard + mindmap | n/a | n/a | n/a | n/a | Hierarchical outline | **Streaming-during-chat (F-DIFF-01)** ★ |
| AI tutor / chat | Grounded (RAG) | Plugin only | AI Tutor mode | n/a | Composer agent | Free + tools | Mem Chat (cloud) | AI cards | **Free + Anchored toggle (F-DIFF-02)** ★ |
| Spaced repetition | n/a | True Recall / HiNote / LearnKit plugins (FSRS-6) | On roadmap | **FSRS-6 default** | n/a | n/a | n/a | **FSRS-6 + SM-2** | **Concept-page + AI-question (F-DIFF-03)** ★ |
| Citation grounding | **Yes (USP)** | n/a | Source-cards in AI Tutor | n/a | n/a | n/a | Mem Chat citations | n/a | **Anthropic Citations API (KD-05)** |
| Lecture video | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | **Echo360 webview (F-TS-10)** ★ |
| Bilingual captions | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | **VTT + Claude translate (F-TS-11)** ★ |
| AI memory model | Single-doc context | n/a | Chat + cards | n/a | Project rules | Session-scoped | **Auto-link cloud** | Note-graph | **Three-tier (working/episodic/long-term) (KD-10)** ★ |
| Vault search | RAG | grep-style | Card search | Card search | Cmd+P + agent | grep + agent | AI search | AI + tags | **Agentic grep (KD-07)** |
| Per-context rules | n/a | n/a | n/a | n/a | **`.cursor/rules` MDC** | n/a | n/a | n/a | **`.mneme/rules/` (F-DIFF-08, NEW)** ★ |
| Scheduled prompts | n/a | Plugins | n/a | n/a | n/a | **Routines (Apr 2026)** | n/a | Exam Scheduler | **F-DIFF-09 (defer v2)** |
| Open-source | No | Plugins yes | No | **Yes (AGPL)** | No | No | No | Limited | **Tauri + 50% OSS rule (KP-02)** |

★ = features where `mneme` differentiates (no competitor has the combo).

**Strategic read:** The user already correctly identified the three differentiation moats — (1) lecture-anchored learning loop, (2) streaming-into-mind-map, (3) free/anchored toggle. The cross-check confirms these are unclaimed in the market. The MISSING gaps (F-MISS-01..09) are all **table-stakes hygiene**, not differentiation — fixing them is necessary cost-of-entry, not strategic risk.

---

## Cross-Reference Summary (How REQ/OOS/KP map)

### REQ Coverage Audit

| REQ | Coverage | Notes |
|-----|----------|-------|
| REQ-01 three-pane | F-TS-01 ✓ | Solid |
| REQ-02 subprocess | F-TS-02 ✓ | Spike-validated |
| REQ-03 Canvas/Ed sync | F-TS-09 ✓ | Needs F-MISS-03 (sync surface) added |
| REQ-04 Echo360 video | F-TS-10 ✓ | P2 priority confirmed |
| REQ-05 bilingual VTT | F-TS-11 ✓ | Solid |
| REQ-06 vault | F-TS-03 + F-TS-04 ✓ | Needs F-MISS-08 (PDF→md, RQ-02) added |
| REQ-07 dual-layer | F-DIFF-07 + F-DIFF-01 ✓ | Most ambitious; defer to v2 |
| REQ-08 anchored mode | F-DIFF-02 + F-TS-12 ✓ | Solid |
| REQ-09 FSRS | F-TS-13 + F-DIFF-03 + F-DIFF-04 ✓ | Needs F-MISS-05 (review UI) added |
| REQ-10 agentic search | F-DIFF-10 ✓ | Solid (zero-build) |

**REQ-list verdict: solid on content/AI core. Recommend adding 4-6 new REQs for the missing items:**
- **REQ-NEW-A** — Command palette + quick switcher (covers F-MISS-01)
- **REQ-NEW-B** — Multi-session sidebar (covers F-MISS-02)
- **REQ-NEW-C** — Sync status surface (covers F-MISS-03)
- **REQ-NEW-D** — Settings / preferences UI (covers F-MISS-04)
- **REQ-NEW-E** — Review-mode focus screen (covers F-MISS-05; could be folded into REQ-09 expansion)
- **REQ-NEW-F** — First-run onboarding (covers F-MISS-09)
- **REQ-NEW-G** *(optional)* — `.mneme/rules/` per-course system prompts (covers F-DIFF-08)
- **REQ-NEW-H** *(optional)* — PDF→markdown ingest (covers F-MISS-08; resolves RQ-02)

### OOS Coverage Audit

| OOS | Coverage | Notes |
|-----|----------|-------|
| OOS-01 multi-user | F-ANTI-03 ✓ | Strong |
| OOS-02 mobile | F-ANTI-04 ✓ | Strong |
| OOS-03 vector DB | F-ANTI-05 ✓ | Strong |
| OOS-04 audio overview | F-ANTI-01 ✓ | Strong |
| OOS-05 manual flashcards | F-ANTI-02 ✓ | Strong |

**Recommend adding 4 new OOS items:**
- **OOS-06** — Manual mind-map drawing tool (F-ANTI-06)
- **OOS-07** — Plugin / extensibility API (F-ANTI-07; Claude Code skills are the layer)
- **OOS-08** — Multi-LLM-provider support (F-ANTI-08; KP-04 incompatibility)
- **OOS-09** — Voice / audio dictation (F-ANTI-10; commute-mode out per OOS-02)

### KP Alignment Check

| KP | Alignment with feature plan |
|----|----------------------------|
| KP-01 Local-first | ✓ — every feature respects vault as source of truth; cloud touches only for Claude API + Echo360 SSO |
| KP-02 50% OSS | ✓ — explicit OSS dependencies: Tauri 2, marked, KaTeX, ts-fsrs, Tiptap, marker/MinerU/Docling, possibly Graphiti or Cognee for graph layer; differentiation is in the integration glue, not in re-implementing primitives. **Confirmed by cross-check that every primitive in our stack has a credible OSS implementation.** |
| KP-03 AI-native data model | ✓ — F-DIFF-07 (dual-layer) directly implements; F-DIFF-01 (streaming graph) is the user-visible payoff |
| KP-04 Compliant subprocess | ✓ — opcode (~21k stars) confirms the pattern works at scale; no feature in this plan requires breaching it (no token extraction, no impersonation) |
| KP-05 Claude Design UI | ✓ — initial UI prototype goes through Claude Design; only after v1 ships do we hand-tune |
| KP-06 Reject reinvented wheels | ✓ — F-MISS items lean on prior art (Obsidian palette, Claude Desktop multi-session, etc.); F-DIFF items either fork OSS bases (Graphiti for streaming KG) or are integration-glue layers |

**KP-02 (50% OSS) verification per feature:**

| Feature | OSS foundation | Self-build effort |
|---------|---------------|-------------------|
| F-TS-02 streaming chat | `marked`, KaTeX, DOMPurify, Svelte 5 | small render loop |
| F-TS-03 vault | none needed (filesystem) | small |
| F-TS-05 command palette | `cmdk` (npm) or roll own with kbar | trivial |
| F-TS-13 FSRS | `ts-fsrs` (open-spaced-repetition) | tiny wrapper |
| F-TS-18 block editor | `Tiptap` + slash-cmd extension | extension code only |
| F-TS-20 PDF→md | `Marker` (datalab-to/marker) — **recommend single best fit for math** | none, just CLI wrapper |
| F-DIFF-01 streaming mind-map | base on `Graphiti` (getzep, MIT) for incremental KG; render via D3 or Cytoscape.js | the streaming-to-graph glue is the self-build core |
| F-DIFF-07 dual-layer data | base on `Cognee` or `Graphiti` (RQ-01 to decide) | confidence-tracking + provenance schema extensions |
| F-DIFF-08 per-course rules | port `.cursor/rules` MDC parser (3 hr work) | trivial |

**OSS-rule passes:** at least 9 of 10 P1+P2 features have credible OSS foundations to sit on, satisfying KP-02 comfortably.

---

## Open Questions Surfaced by This Research

These are NEW questions raised during the cross-check, beyond what's in `questions.md`:

1. **Q-NEW-1 (HIGH):** Does Tauri 2's webview support a *dock-able* embed of Echo360 (vs full-screen takeover)? If not, video needs a popup window — degrades the three-pane illusion. Worth a 30-min spike before committing REQ-04.

2. **Q-NEW-2 (HIGH):** What's the right granularity for "concept page" review (REQ-09)? Per-concept-file? Per-section? RemNote does per-`Rem` (paragraph). Anki does per-card. Affects review UI design directly.

3. **Q-NEW-3 (MEDIUM):** Should the multi-session sidebar (F-MISS-02) group conversations by **course** or by **topic across courses**? Claude Desktop groups by project; Cursor by file. For a learning app, course-grouping is the obvious match — but a "linear algebra" thread that spans both COMP1100 and MATH1062 needs cross-course visibility.

4. **Q-NEW-4 (MEDIUM):** Is `.mneme/rules/` a per-vault, per-course, or per-folder concept? Cursor's `.cursor/rules` is per-project + glob-scoped. For us, per-course at minimum, with optional per-topic.

5. **Q-NEW-5 (MEDIUM):** PDF→markdown library decision (RQ-02): research strongly suggests **Marker** as default for safety + good math handling, **MinerU** if formula-heavy + CJK content (Chinese textbook PDFs?), **Docling** for enterprise-tier multi-format. Single-recommendation pending: **Marker** (datalab-to/marker, GitHub-active, math-aware via `force_ocr`). Consider deferring final choice to Phase that needs it.

6. **Q-NEW-6 (LOW):** Should free-mode show the Studio-panel-style *generate-deliverable* affordance (NotebookLM has 10 infographic styles + slide deck export)? Probably no for v1 (feels like feature creep), but worth flagging — one-click "summarize this conversation as a study sheet" is a small win.

---

## Sources

### Reference products
- NotebookLM 2026: [Jeff Su — What Changed in 2026](https://www.jeffsu.org/notebooklm-changed-completely-heres-what-matters-in-2026/), [DigitalOcean overview](https://www.digitalocean.com/resources/articles/what-is-notebooklm), [NotebookLM Mind Map help](https://support.google.com/notebooklm/answer/16212283), [LearnPrompting interactive Mind Maps](https://learnprompting.org/blog/notebooklm-interactive-mind-maps)
- Obsidian: [Obsidian command palette help](https://help.obsidian.md/plugins/command-palette), [Best Obsidian Plugins 2026](https://www.dsebastien.net/the-must-have-obsidian-plugins-for-2026/), [ExcaliBrain plugin docs](https://www.obsidianstats.com/plugins/excalibrain), [Excalidraw plugin GitHub](https://github.com/zsviczian/obsidian-excalidraw-plugin)
- Heptabase: [Official Heptabase Changelog](https://wiki.heptabase.com/changelog), [2026 Newsletter Mar 24](https://wiki.heptabase.com/newsletters/2026-03-24), [Heptabase Roadmap (FSRS in development)](https://wiki.heptabase.com/roadmap/nextup)
- Cursor: [Cursor Features](https://cursor.com/features), [Cursor IDE 2026 Guide](https://tech-insider.org/cursor-tutorial-ai-code-editor-2026/), [Cursor Rules Docs](https://cursor.com/docs/context/rules), [Cursor Composer / Agent Mode 2026](https://dev.to/sahilkhurana/cursor-ai-2026-the-complete-guide-to-the-ai-native-ide-3n4h)
- Claude Desktop App April 2026: [VentureBeat redesign review](https://venturebeat.com/orchestration/we-tested-anthropics-redesigned-claude-code-desktop-app-and-routines-heres-what-enterprises-should-know), [MacRumors parallel sessions](https://www.macrumors.com/2026/04/15/anthropic-rebuilds-claude-code-desktop-app/), [The New Stack desktop redesign](https://thenewstack.io/claude-code-desktop-redesign/)
- Anki / FSRS: [Anki FSRS Algorithm Explained](https://studycardsai.com/blog/anki-fsrs-algorithm), [SlideToAnki FSRS Setup Guide](https://slidetoanki.com/blog/how-to-use-fsrs-anki-guide), [awesome-fsrs (open-spaced-repetition)](https://github.com/open-spaced-repetition/awesome-fsrs)
- RemNote: [RemNote Spaced Repetition feature](https://www.remnote.com/feature/spaced-repetition), [RemNote vs Anki / SuperMemo](https://help.remnote.com/en/articles/6025618-remnote-vs-anki-supermemo-and-other-spaced-repetition-tools)
- Mem.ai / Reflect / Saner.ai: [Mem.ai Review 2026](https://blog.saner.ai/mem-ai-reviews/), [Mem vs Reflect comparison](https://pointofai.com/compare-ai-tools/mem-vs-reflect-notes), [AI Note-Taking 2026 ranked](https://www.saner.ai/blogs/best-ai-note-taking-apps)

### Implementation references (KP-02 OSS check)
- [Marker — datalab-to/marker (PDF→markdown w/ math)](https://github.com/datalab-to/marker)
- [Best Open-Source PDF-to-Markdown Tools 2026 (Marker vs Docling vs MinerU)](https://themenonlab.blog/blog/best-open-source-pdf-to-markdown-tools-2026)
- [opcode (~21k stars, Tauri 2 GUI for Claude Code, AGPL)](https://github.com/winfunc/opcode)
- [Best Claude Code GUI Tools 2026](https://nimbalyst.com/blog/best-claude-code-gui-tools-2026/)
- [Tauri System Tray docs](https://v2.tauri.app/learn/system-tray/)
- [Tauri Local LLM template](https://medium.com/@dillon.desilva/building-local-lm-desktop-applications-with-tauri-f54c628b13d9)
- [Tiptap Markdown extension](https://tiptap.dev/docs/editor/markdown), [Tiptap Slash Commands experiment](https://tiptap.dev/docs/examples/experiments/slash-commands)
- [Graphiti (getzep) — incremental temporal KG for AI agents](https://github.com/getzep/graphiti)
- [True Recall (FSRS-6 on Obsidian notes)](https://github.com/open-spaced-repetition/awesome-fsrs)

### Adjacent learning-app references
- [Otter.ai for Education](https://otter.ai/education) — lecture transcript baseline
- [QuickTakes — AI Study Sidekick](https://quicktakes.io/) — multi-output study tool
- [HoverNotes — video screenshot timestamp linking](https://hovernotes.io/en/blog/lecture-note-taker)
- [ScreenApp — video to timestamped notes](https://screenapp.io/features/lecture-ai-notetaker)

---

*Feature research for: personal desktop learning app wrapping local Claude Code (USYD CS S1 2026)*
*Researched: 2026-05-06*
*Cross-referenced against: REQ-01..10, OOS-01..05, KP-01..06, KD-01..10*
*9 MISSING items identified, 4 new OOS additions recommended, 2-8 new REQ additions recommended.*
