---
gsd_state_version: 1.0
milestone: v5.3.2
milestone_name: milestone
status: unknown
last_updated: "2026-05-07T01:27:23.528Z"
progress:
  total_phases: 12
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# learn-os Project State

> Project memory — the source of truth for "where am I right now and what's next?". Updated automatically by GSD commands; read by Claude on session start.

---

## Project Reference

**Name (codename)**: learn-os (final name TBD in Phase 0)
**Core value**: Wrap the user's Claude Code (with all its tools, MCPs, memory) in a desktop GUI that turns chat sessions into a continuously-growing local knowledge graph + browsable markdown vault, indexed against actual lecture content. The whole loop — *learn → AI teaches → notes captured automatically → reviewed via FSRS* — must feel like one product, not five glued together.
**Stack (locked by spike 002)**: Tauri 2 + SvelteKit (`adapter-static`) + `tauri-plugin-shell` + `marked` + KaTeX + DOMPurify + Svelte 5 runes
**User**: USYD CS S1 2026 student, MacBook Pro 2019 Intel, macOS Ventura 13.4
**Granularity**: fine (11 phases mapping 18 v1+v1.x requirements)
**Mode**: interactive

---

## Current Position

**Phase**: 0 — Identity & Branding Lock (context gathered, awaiting plan)
**Plan**: none yet — next is `/gsd-plan-phase 0`
**Status**: phase-0-context-ready
**Progress**: 0/11 phases complete
**Resume file**: `.planning/phases/00-identity-branding-lock/00-CONTEXT.md`

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
| Research questions resolved | 1 / 4 (RQ-02 resolved via REQ-18; RQ-01/03/04 still open) |
| Research questions blocking phase entry | 1 (RQ-01 → Phase 7) |

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

### Active Open Questions (research/questions.md)

- **RQ-01** [BLOCKING for Phase 7]: Memory project survey → resolved in Phase 5.5
- **RQ-03**: GUI wrapper community implementations → absorbed into Phase 1 hardening (TOKENICODE pattern study during plan-phase 1)
- **RQ-04**: GSD `graphify` skill reuse decision → resolved within Phase 7 design

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

### Key Principles (KP-01 through KP-06)

Honored across the roadmap; no phase contradicts:

- KP-01 Local-first
- KP-02 50% open-source rule (each phase has explicit OSS adoption note)
- KP-03 AI-native data model
- KP-04 Compliant subprocess wrapping (no token extraction)
- KP-05 UI initial design via Claude Design
- KP-06 Reject reinvented wheels

### Project Skills (auto-loaded)

- `spike-findings-learn-os` — Implementation patterns + constraints + gotchas from spikes 001 + 002 (CONVENTIONS, claude-subprocess findings, tauri-shell-ui findings). Auto-loaded during all implementation work.

### Existing Validated Foundation

Spike 002 produced a runnable end-to-end demo (Tauri 2 + SvelteKit + claude subprocess + streaming chat with markdown + KaTeX + tool-use roundtrip). Phase 1's job is to **extend and harden** this validated seed — not redo it. Specifically:

- Source: `.planning/spikes/sources/002-tauri-claude-shell/app/src/routes/+page.svelte`
- Locked patterns documented in `spike-findings-learn-os/references/{claude-subprocess.md, tauri-shell-ui.md}`
- Phase 1 success criteria explicitly assume this seed; do NOT re-validate the basic subprocess+streaming pattern

---

## Session Continuity

**Last GSD command**: `/gsd-discuss-phase 0`
**Last action**: Captured Phase 0 context (CONTEXT.md + DISCUSSION-LOG.md) at `.planning/phases/00-identity-branding-lock/`; amended PROJECT.md OOS-01 to allow future open-source distribution as portfolio piece (multi-user/commercialization still excluded).
**Next recommended action**: `/gsd-plan-phase 0` — plan-phase researcher does name due-diligence (GitHub/npm/.app/EdTech conflict scan for Mnemo · Mneme · Ponder + backups), then user picks final name → ChatGPT image2.0 sketches → Claude Design ICNS export → atomic rename across repo.

**Session boundaries**:

- v1 ship target = Phases 0-4 complete (Tauri shell + vault + sync + multi-session + doc ingestion). After Phase 4, dogfood in real S1 2026 coursework before starting Phase 5.
- Differentiator layer (Phases 7-10) starts only after v1 dogfooding proves the basic loop is used daily — anti-abandonment discipline per Pitfall 10.

---

## Notes for Future-Self

- Codename `learn-os` will be retired in Phase 0. After Phase 0 completes, all references in PROJECT.md, ROADMAP.md, STATE.md, README, tauri.conf.json should reflect the locked name.
- The roadmap deliberately puts the spike (Phase 5) and research-resolution (Phase 5.5) as standalone phases between v1 (Phases 0-4) and v1.x (Phases 6-10). This is intentional — each is a real piece of work that needs scope discipline (`/gsd-spike` budget = 2 days, RQ-01 dogfood budget = 1 week).
- If Phase 5 spike INVALIDATES the WKWebView path, Phase 6 MUST be replanned before entry — likely shifting to "external browser + deep links" or "persistent per-domain webview instance" alternatives. Update KD-04 in PROJECT.md at that point.
- `_source/` write-policy enforcement (Sync Controller is the only writer) is set up in Phase 2 and reused throughout Phase 4 (document ingestion outputs go to `_source/`). Don't relax this — PITFALLS Pitfall 20.

---

*Last updated: 2026-05-06 — initialized via `/gsd-new-project` Step 8 after roadmap creation.*
