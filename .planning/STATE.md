---
gsd_state_version: 1.0
milestone: v5.3.2
milestone_name: milestone
status: unknown
last_updated: "2026-05-07T05:27:16.668Z"
progress:
  total_phases: 12
  completed_phases: 0
  total_plans: 4
  completed_plans: 0
  percent: 0
---

# mneme Project State

> Project memory — the source of truth for "where am I right now and what's next?". Updated automatically by GSD commands; read by Claude on session start.

---

## Project Reference

**Name (codename)**: mneme (final name TBD in Phase 0)
**Core value**: **5-dimension composite** (re-framed 2026-05-07 per `/gsd-explore` session — see PROJECT.md "Core Value" section for full structure: philosophy / experience / architecture / boundaries / landing context). One-line summary (does NOT replace 5-dim structure): *local-first + AI-native personal learning infrastructure whose end-experience is "this AI truly understands me" — proactively surfacing where I am, where I struggle, and how knowledge connects, rather than only answering what I ask*. ⚠ Quoting this single sentence alone loses ~80% of identity.
**Stack (locked by spike 002)**: Tauri 2 + SvelteKit (`adapter-static`) + `tauri-plugin-shell` + `marked` + KaTeX + DOMPurify + Svelte 5 runes
**User**: USYD CS S1 2026 student, MacBook Pro 2019 Intel, macOS Ventura 13.4
**Granularity**: fine (11 phases mapping 18 v1+v1.x requirements)
**Mode**: interactive

---

## Current Position

Phase: 00 (identity-branding-lock) — EXECUTING
Plan: 1 of 4
**Phase**: 0 — Identity & Branding Lock (planned, awaiting execution)
**Plan**: 4 plans across 3 waves — next is `/gsd-execute-phase 0`
**Status**: phase-0-planned
**Progress**: 0/11 phases complete · 0/4 plans complete (Phase 0)
**Resume file**: `.planning/phases/00-identity-branding-lock/00-01-PLAN.md`

```
[░░░░░░░░░░░░░░░░░░░░] 0% (0/11 phases)
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
| Phases completed | 0 / 11 |
| v1 requirements satisfied | 0 / 10 |
| v1.x requirements satisfied | 0 / 8 |
| Spikes validated | 2 (001 stream-json-recon, 002 tauri-claude-shell) |
| Spikes pending | 1 (echo360-webview-auth, scheduled in Phase 5) |
| Research questions resolved | 1 / 5 (RQ-02 resolved via REQ-18; RQ-01/03/04 still open; RQ-05 ongoing non-blocking) |
| Research questions blocking phase entry | 1 (RQ-01 → Phase 7) |
| v1.x candidates lifted from OOS | 1 (REQ-19 voice input — was OOS-09, lifted 2026-05-07) |

---

## Accumulated Context

### Locked Decisions (KD-01 through KD-12)

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

### Key Principles (KP-01 through KP-08)

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

1 pending — captured during sessions, surface at appropriate phase:

- **Evaluate thea for question generation** (research, 2026-05-07) — third-party question/题目 generation tool the user discovered; needs license + integration shape + fit-vs-duplication review against ts-fsrs / REQ-09 review surface. File: `.planning/todos/pending/2026-05-07-evaluate-thea-for-question-generation.md`. Surface trigger: before Phase 10 (FSRS-6 Reviews) planning.

---

## Session Continuity

**Last GSD command**: `/gsd-plan-phase 0`
**Last action**: Spawned gsd-phase-researcher → 00-RESEARCH.md (1319 lines: 3 verified finalists Mneme · Theoria · Scholea, D-09 icon pipeline resolution — Apple Icon Composer blocked on Ventura → sips+iconutil pipeline locked, full atomic-rename inventory with `.mneme/` lockstep gotcha, security STRIDE). Spawned gsd-planner → 4 PLAN.md (3 waves). Spawned gsd-plan-checker × 2 (1 revision cycle): caught 2 BLOCKERS (D-12 atomic-commit closure + V-07 skip-list 3-layer consistency) + 6 WARNINGs; planner revised; 2nd checker pass returned `## PLANS APPROVED` (all 6 dimensions PASS).
**Next recommended action**: `/gsd-execute-phase 0` — Wave 1 (00-01 finalist pick, autonomous: false — user picks name) → Wave 2 (00-02 icon production + 00-03 atomic rename, parallel) → Wave 3 (00-04 publish + STATE.md update + atomic D-12 commit).

**Session boundaries**:

- v1 ship target = Phases 0-4 complete (Tauri shell + vault + sync + multi-session + doc ingestion). After Phase 4, dogfood in real S1 2026 coursework before starting Phase 5.
- Differentiator layer (Phases 7-10) starts only after v1 dogfooding proves the basic loop is used daily — anti-abandonment discipline per Pitfall 10.

---

## Notes for Future-Self

- Codename `mneme` will be retired in Phase 0. After Phase 0 completes, all references in PROJECT.md, ROADMAP.md, STATE.md, README, tauri.conf.json should reflect the locked name.
- The roadmap deliberately puts the spike (Phase 5) and research-resolution (Phase 5.5) as standalone phases between v1 (Phases 0-4) and v1.x (Phases 6-10). This is intentional — each is a real piece of work that needs scope discipline (`/gsd-spike` budget = 2 days, RQ-01 dogfood budget = 1 week).
- If Phase 5 spike INVALIDATES the WKWebView path, Phase 6 MUST be replanned before entry — likely shifting to "external browser + deep links" or "persistent per-domain webview instance" alternatives. Update KD-04 in PROJECT.md at that point.
- `_source/` write-policy enforcement (Sync Controller is the only writer) is set up in Phase 2 and reused throughout Phase 4 (document ingestion outputs go to `_source/`). Don't relax this — PITFALLS Pitfall 20.
- **Foundation-first re-framing (2026-05-07)**: PROJECT.md Core Value is now a 5-dimension composite (not a single sentence); ROADMAP.md adds a Layer Architecture overlay (Foundation / Application / Replacement) on top of existing phase numbers; KP-07 (proactive contextual recall) + KP-08 (OSS dependency tracking) are new non-negotiable principles; OOS-09 (voice input) lifted to REQ-19 v1.x candidate; RQ-05 (learning-method epistemic humility) opened as ongoing non-blocking research line; `.planning/dependencies.md` created as KP-08 registry. The deepest reason behind this re-framing: current 18 REQs derive from n=2 sample (user + partner) — foundation must be agnostic to which feature set wins so REQ collection can evolve as observation of higher-achieving students' learning methods accumulates.
- **Visual aesthetic family lock (2026-05-07)**: KP-09 + KD-13 added to inherit the Anthropic/Claude visual identity (warmth/restraint/serif). Two reference files copied into `.planning/references/design/` as SSOT (deep-dive zh + OSS UI gallery HTML). PROJECT.md REQ-01 acceptance, ROADMAP.md driving constraints, and `.planning/dependencies.md` Groups 9 + 10 all updated to point to KP-09 / KD-13 / reference files. Mandatory locks: `#d97757` orange + `#faf9f5` cream + `#141413` text + `#2b2a27` warm dark; serif body, ban Arial/Inter; ease `cubic-bezier(0.165, 0.85, 0.45, 1)`; soft 8% borders; multi-layer soft shadows. Full token palette + OSS gallery deferred to reference files (not duplicated in PROJECT.md). Recommended starting OSS: shadcn.io/theme/claude (port CSS variables only — mneme is Svelte not React) + anthropics/skills/brand-guidelines (first-party SSOT) + tweakcn (shade extension).

---

*Last updated: 2026-05-07 — `/gsd-explore` aesthetic family lock applied (KP-09 + KD-13 + 2 reference files + ROADMAP/REQ-01/dependencies updates). Prior: foundation-first re-framing same day (8 atomic edits) + `/gsd-plan-phase 0` complete (4 plans, 1 revision cycle, plan-checker APPROVED).*
