---
gsd_state_version: 1.0
milestone: v5.3.2
milestone_name: milestone
status: phase-0-complete
last_updated: "2026-05-07T06:18:00Z"
progress:
  total_phases: 12
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 9
---

# mneme Project State

> Project memory — the source of truth for "where am I right now and what's next?". Updated automatically by GSD commands; read by Claude on session start.

---

## Project Reference

**Name**: Mneme (codename `learn-os` retired 2026-05-07)
**Core value**: **5-dimension composite** (re-framed 2026-05-07 per `/gsd-explore` session — see PROJECT.md "Core Value" section for full structure: philosophy / experience / architecture / boundaries / landing context). One-line summary (does NOT replace 5-dim structure): *local-first + AI-native personal learning infrastructure whose end-experience is "this AI truly understands me" — proactively surfacing where I am, where I struggle, and how knowledge connects, rather than only answering what I ask*. ⚠ Quoting this single sentence alone loses ~80% of identity.
**Stack (locked by spike 002)**: Tauri 2 + SvelteKit (`adapter-static`) + `tauri-plugin-shell` + `marked` + KaTeX + DOMPurify + Svelte 5 runes
**User**: USYD CS S1 2026 student, MacBook Pro 2019 Intel, macOS Ventura 13.4
**Granularity**: fine (11 phases mapping 18 v1+v1.x requirements)
**Mode**: interactive

---

## Current Position

**Phase**: 1 — Tauri Shell Foundation + Subprocess Hardening (Phase 0 retired 2026-05-07)
**Plan**: none yet — next is `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`
**Status**: phase-0-complete
**Progress**: 1/11 phases complete · 4/4 plans complete (Phase 0)

```
[██░░░░░░░░░░░░░░░░░░] 9% (1/11 phases)
```

---

## Phase Map (overview)

```
Phase 0  ─ Identity & Branding Lock                    [pending]
Phase 1  ─ Tauri Shell Foundation + Hardening          [pending]
Phase 2  ─ Vault + Canvas/Ed Sync + Onboarding         [pending]
Phase 3  ─ Multi-Session + Cmd Palette + Editor        [pending]
Phase 4  ─ Document Ingestion (PDF/Office → md)        [pending]
Phase 5  ─ Echo360 Spike Resolution                    [pending; gates Phase 6]
Phase 5.5 ─ KG Memory Project Survey (RQ-01)           [pending; gates Phase 7]
Phase 6  ─ Echo360 Video + Bilingual Captions          [pending]
Phase 7  ─ Knowledge Graph + Three-Tier Memory         [pending]
Phase 8  ─ Mind-Map View + Per-Course Rules            [pending]
Phase 9  ─ Anchored Mode + Citations API               [pending]
Phase 10 ─ FSRS-6 Reviews + Focus Mode                 [pending]
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 1 / 11 |
| v1 requirements satisfied | 0 / 10 |
| v1.x requirements satisfied | 0 / 8 |
| Spikes validated | 2 (001 stream-json-recon, 002 tauri-claude-shell) |
| Spikes pending | 1 (echo360-webview-auth, scheduled in Phase 5) |
| Research questions resolved | 1 / 5 (RQ-02 resolved via REQ-18; RQ-01/03/04 still open; RQ-05 ongoing non-blocking) |
| Research questions blocking phase entry | 1 (RQ-01 → Phase 7) |
| v1.x candidates lifted from OOS | 1 (REQ-19 voice input — was OOS-09, lifted 2026-05-07) |

---

## Accumulated Context

### Locked Decisions (KD-01 through KD-13)

See PROJECT.md for full text. Quick reference:

- **KD-01**: Stack — Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell (spike 002 validated)
- **KD-02**: Frontend libs — marked + KaTeX + DOMPurify + Svelte 5 runes
- **KD-03**: Rust toolchain ≥ 1.88 (pinned in `rust-toolchain.toml`)
- **KD-04**: Echo360 via Tauri webview + persistent USYD SSO cookie (subject to Phase 5 spike outcome)
- **KD-05**: Citations API for anchored mode (Anthropic Jan 2025 official)
- **KD-06**: FSRS-6 via `ts-fsrs` (open-spaced-repetition org, MIT)
- **KD-07**: No vector DB by default; agentic search replaces RAG
- **KD-08**: Cytoscape.js (default mind-map) + Excalidraw (whiteboard, v2+); knowledge-graph always-on AI-side
- **KD-09**: Tiptap as block editor; markdown as storage
- **KD-10**: Three-tier memory architecture — **library choice DEFERRED until Phase 5.5**
- **KD-11**: Phase entry gate — Echo360 spike must pass before Phase 6 implementation
- **KD-12**: `claude-code-parser` (MIT) vendored in `vendor/`, NOT npm dependency
- **KD-13**: Visual aesthetic system locked to Anthropic/Claude family (per KP-09; full spec deferred to `.planning/references/design/`)

### Active Open Questions (research/questions.md)

- **RQ-01** [BLOCKING for Phase 7]: Memory project survey → resolved in Phase 5.5
- **RQ-03**: GUI wrapper community implementations → absorbed into Phase 1 hardening (TOKENICODE pattern study during plan-phase 1)
- **RQ-04**: GSD `graphify` skill reuse decision → resolved within Phase 7 design
- **RQ-05** [ongoing, non-blocking]: Learning-method epistemic humility — informal observation of higher-achieving students' learning methods (sample n=2 → broaden); findings feed new REQ candidates / OOS revisions / new KP candidates throughout v1 ship + 3-month dogfood window

### Critical Pitfalls Tracked (research/PITFALLS.md)

Phase-by-phase pitfall ownership (must be addressed during the named phase):

| Pitfall | Severity | Owner Phase |
|---------|----------|-------------|
| 1. Subprocess zombies on Cmd+Q | CRITICAL | Phase 1 |
| 2. Capability wildcard window grants | CRITICAL | Phase 1 (default), Phase 6 (Echo360 iframe isolation) |
| 3. API cost runaway from cache miss + agent loops | CRITICAL | Phase 1 (cost meter + caps), Phase 9 (anchored chunking) |
| 4. Markdown XSS via streaming sanitization gap | CRITICAL | Phase 1 |
| 5. Embedding model lock-in / re-embed cost | HIGH | Phase 7 |
| 6. Vault corruption via concurrent writes | HIGH | Phase 3 (soft-lock + Tiptap mtime guard) |
| 7. Echo360 cookie/iframe + USYD SSO failure | HIGH | Phase 5 (spike) |
| 8. KG hallucinated edges + course leakage | HIGH | Phase 7 |
| 9. FSRS Hard misuse + concept calibration drift | HIGH | Phase 10 |
| 10. Solo-dev abandonment at 30% | HIGH | Roadmap structure (front-loaded shipping; v1 = phases 1-4) |

### Key Principles (KP-01 through KP-09)

Honored across the roadmap; no phase contradicts:

- KP-01 Local-first
- KP-02 50% open-source rule (each phase has explicit OSS adoption note)
- KP-03 AI-native data model
- KP-04 Compliant subprocess wrapping (no token extraction)
- KP-05 UI initial design via Claude Design
- KP-06 Reject reinvented wheels
- **KP-07 Proactive contextual recall** ("懂我" experience commitment — added 2026-05-07; AI proactively surfaces session context unprompted; acceptance ≥3/session, ≥90% relevance — gates REQ-07 acceptance)
- **KP-08 OSS dependency tracking + upstream monitoring** (added 2026-05-07; every adopted OSS library registered in `.planning/dependencies.md`; post-v1 automated upstream check at per-row cadence)
- **KP-09 Aesthetic family — inherit Anthropic/Claude visual identity** (added 2026-05-07; warmth over modernity, accessibility over exclusivity, thoughtful restraint over flashy showmanship; full SSOT in `.planning/references/design/`; locked specs in KD-13)

### Project Skills (auto-loaded)

- `spike-findings-mneme` — Implementation patterns + constraints + gotchas from spikes 001 + 002 (CONVENTIONS, claude-subprocess findings, tauri-shell-ui findings). Auto-loaded during all implementation work.

### Existing Validated Foundation

Spike 002 produced a runnable end-to-end demo (Tauri 2 + SvelteKit + claude subprocess + streaming chat with markdown + KaTeX + tool-use roundtrip). Phase 1's job is to **extend and harden** this validated seed — not redo it. Specifically:

- Source: `.planning/spikes/sources/002-tauri-claude-shell/app/src/routes/+page.svelte`
- Locked patterns documented in `spike-findings-mneme/references/{claude-subprocess.md, tauri-shell-ui.md}`
- Phase 1 success criteria explicitly assume this seed; do NOT re-validate the basic subprocess+streaming pattern

### Pending Todos

3 pending — captured during sessions, surface at appropriate phase:

- **Evaluate thea for question generation** (research, 2026-05-07, **product REJECTED · algorithm-layer worth a Phase 10 spike**) — thea.study (closed cloud SaaS, K-12) fails KP-01/KP-02/KD-06/form-factor as a dependency. Separately, the *algorithm* — AI takes source material → produces good concept-review items — is a real engineering problem mneme also has to solve in Phase 10 (REQ-09 concept review, not flashcard). Recommended path: when approaching Phase 10, promote to `/gsd-spike concept-review-item-generation` (½–1 day timebox; black-box probe of thea + Claude API prompt-pipeline experiment against a real USYD lecture). File: `.planning/todos/pending/2026-05-07-evaluate-thea-for-question-generation.md`. Surface trigger: before `/gsd-discuss-phase 10`.

- **Triage awesome-design-md vs awesome-claude-design for KD-13** (planning, 2026-05-07, **deferred to UI-phase entry**) — User surfaced `VoltAgent/awesome-design-md` (generic parent, has small `design-md/claude/` folder); the specialized sibling `VoltAgent/awesome-claude-design` (68 templates, MIT) is **already** in `dependencies.md` Group 10 last-checked today. VoltAgent's DESIGN.md format is **executable scaffold prompts** (a third axis vs the existing theory deep-dive + visual gallery). Decision deferred — at first `/gsd-ui-phase N` run, diff both VoltAgent sources, cross-check tokens against the deep-dive SSOT (Anthropic `brand-guidelines` wins ties), then either drop parent / add as Group 10 row / copy chosen DESIGN.md into Group 9 as Tertiary executable prompt. File: `.planning/todos/pending/2026-05-07-triage-awesome-design-md-vs-awesome-claude-design-for-kd-13.md`. Surface trigger: before first `/gsd-ui-phase`.

- **Spec Claude (free) mode source display + conflict resolution behavior (REQ-08 / Phase 9)** (planning, 2026-05-07, **defer to Phase 9 plan stage**) — REQ-08 lock 了 free ↔ anchored 切换机制，但 free 一侧的具体行为未规范。User 提出三条 free 模式细化：(1) 底部带 `Sources:` 列表（介于 NotebookLM 只讲书本 vs DeepSeek 放飞之间的中间路线，参考 Claude Code 搜资料时的形态）；(2) 3-tier 综合顺序——内置知识 → 网搜最新 → 用户左栏勾选的参考文献；(3) 冲突场景化——三源分歧时显式呈现并按场景给出建议（"考试按课件来 / 现实按最新来"，以税法为例）。不修改 REQ-08 锁定文本，进入 `/gsd-plan-phase 9` 时把这三条加进 Success Criteria + system prompt 注入策略。可能涉及 REQ-17（per-course rules）协同。File: `.planning/todos/pending/2026-05-07-spec-claude-free-mode-source-display-and-conflict-resolution-req-08.md`. Surface trigger: before `/gsd-discuss-phase 9` 或 `/gsd-plan-phase 9`.

---

## Session Continuity

**Last GSD command**: `/gsd-execute-phase 0`
**Last action**: Phase 0 retired 2026-05-07: codename `learn-os` → Mneme; icon committed at `icon-assets/icon.icns` (8-petal cream sparkle on terra cotta, hand-drawn rough.js aesthetic); bundle id flipped (spike 002: `dev.mneme.spike`); README.md (bilingual EN+ZH) + LICENSE (MIT) created; project skill renamed (`spike-findings-mneme`); PROJECT.md OOS-01 amended; published to https://github.com/r1ckyIn/mneme (pending push).
**Next recommended action**: `/gsd-discuss-phase 1` or `/gsd-plan-phase 1` — Tauri Shell Foundation + Subprocess Hardening.

**Session boundaries**:

- v1 ship target = Phases 0-4 complete (Tauri shell + vault + sync + multi-session + doc ingestion). After Phase 4, dogfood in real S1 2026 coursework before starting Phase 5.
- Differentiator layer (Phases 7-10) starts only after v1 dogfooding proves the basic loop is used daily — anti-abandonment discipline per Pitfall 10.

---

## Notes for Future-Self

- Codename `learn-os` was retired 2026-05-07; final name is `Mneme` (Phase 0 complete).
- **Phase 1 productName + window title contract**: `Mneme` (per Phase 0 D-14, no view-aware suffix).
- **Phase 1 production tauri.conf.json bundle identifier**: `dev.mneme.app` (per Phase 0 D-10; spike 002 keeps `.spike` suffix per RESEARCH.md Q4).
- **Phase 1 production icon source**: copy `icon-assets/icon.icns` into `src-tauri/icons/` (the entire iconset folder is at repo root for re-runnability).
- The roadmap deliberately puts the spike (Phase 5) and research-resolution (Phase 5.5) as standalone phases between v1 (Phases 0-4) and v1.x (Phases 6-10). This is intentional — each is a real piece of work that needs scope discipline (`/gsd-spike` budget = 2 days, RQ-01 dogfood budget = 1 week).
- If Phase 5 spike INVALIDATES the WKWebView path, Phase 6 MUST be replanned before entry — likely shifting to "external browser + deep links" or "persistent per-domain webview instance" alternatives. Update KD-04 in PROJECT.md at that point.
- `_source/` write-policy enforcement (Sync Controller is the only writer) is set up in Phase 2 and reused throughout Phase 4 (document ingestion outputs go to `_source/`). Don't relax this — PITFALLS Pitfall 20.
- **Foundation-first re-framing (2026-05-07)**: PROJECT.md Core Value is now a 5-dimension composite (not a single sentence); ROADMAP.md adds a Layer Architecture overlay (Foundation / Application / Replacement) on top of existing phase numbers; KP-07 (proactive contextual recall) + KP-08 (OSS dependency tracking) are new non-negotiable principles; OOS-09 (voice input) lifted to REQ-19 v1.x candidate; RQ-05 (learning-method epistemic humility) opened as ongoing non-blocking research line; `.planning/dependencies.md` created as KP-08 registry. The deepest reason behind this re-framing: current 18 REQs derive from n=2 sample (user + partner) — foundation must be agnostic to which feature set wins so REQ collection can evolve as observation of higher-achieving students' learning methods accumulates.
- **Visual aesthetic family lock (2026-05-07)**: KP-09 + KD-13 added to inherit the Anthropic/Claude visual identity (warmth/restraint/serif). Two reference files copied into `.planning/references/design/` as SSOT (deep-dive zh + OSS UI gallery HTML). PROJECT.md REQ-01 acceptance, ROADMAP.md driving constraints, and `.planning/dependencies.md` Groups 9 + 10 all updated to point to KP-09 / KD-13 / reference files. Mandatory locks: `#d97757` orange + `#faf9f5` cream + `#141413` text + `#2b2a27` warm dark; serif body, ban Arial/Inter; ease `cubic-bezier(0.165, 0.85, 0.45, 1)`; soft 8% borders; multi-layer soft shadows. Full token palette + OSS gallery deferred to reference files (not duplicated in PROJECT.md). Recommended starting OSS: shadcn.io/theme/claude (port CSS variables only — mneme is Svelte not React) + anthropics/skills/brand-guidelines (first-party SSOT) + tweakcn (shade extension).

---

*Last updated: 2026-05-07 — `/gsd-explore` aesthetic family lock applied (KP-09 + KD-13 + 2 reference files + ROADMAP/REQ-01/dependencies updates). Prior: foundation-first re-framing same day (8 atomic edits) + `/gsd-plan-phase 0` complete (4 plans, 1 revision cycle, plan-checker APPROVED).*
