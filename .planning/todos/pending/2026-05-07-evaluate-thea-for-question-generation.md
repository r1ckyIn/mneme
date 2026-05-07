---
created: 2026-05-07T05:27:16.668Z
updated: 2026-05-07T05:35:00.000Z
title: Evaluate thea for question generation
area: research
status: evaluated — REJECT as dependency, STUDY-ONLY for Phase 10 UX inspiration
files: []
---

## Problem

User mentioned a question/题目-generating software called **thea** that may be relevant to mneme's review surface (REQ-09 — FSRS-6 spaced repetition driving review of *concepts*, currently locked to ts-fsrs v5.3.2 per KD-06).

## Research Findings (2026-05-07)

### What thea actually is

- **Product**: thea (theastudy.com / "Thea: Study Smart") — AI study app
- **Form factor**: web app + iOS App Store + Google Play (mobile-first); **no desktop client**, no API
- **Architecture**: cloud SaaS — uploads go to their servers; no local/offline mode disclosed
- **License**: proprietary closed-source
- **Pricing**: currently free during launch ("limited period"); paid tiers TBD
- **Rating**: App Store 4.9⭐, 200+ countries, 80+ languages
- **Audience**: K-12, AP, A-Levels, GCSE, driver's ed — standardized-exam-prep market, NOT university research/CS coursework
- **Educator mode**: teachers can create classes, push AI-generated quizzes, view analytics

### Feature inventory

- **Inputs**: handwritten notes (OCR), PDF, lecture videos, YouTube link paste → AI extracts → "study kit"
- **Outputs**: practice questions (multiple choice, true/false, matching, ranking, short answer), flashcards, downloadable study guides, test simulations (exam-condition mode), summaries
- **Adaptive loop**: difficulty rises as user masters items; weak-spot focus
- **Spaced repetition**: claimed, but algorithm not disclosed (almost certainly NOT FSRS-6)

### Fit evaluation against mneme principles + KDs

| Dimension | mneme requirement | thea | Verdict |
|-----------|------------------|------|---------|
| KP-01 Local-first | offline-capable, vault on disk | cloud SaaS | ❌ |
| KP-02 No proprietary lock-in | OSS or fork-and-extend | proprietary | ❌ |
| KP-04 Compliant subprocess wrapping | own model + budget | their cloud / unknown model | ❌ |
| KD-06 FSRS-6 algorithm | locked to ts-fsrs v5.3.2 | undisclosed alg | ❌ |
| Form factor | desktop-first (Tauri shell) | mobile-first | ❌ |
| Integration shape | wrappable as MCP / subprocess / library | no API, no SDK | ❌ |
| Audience overlap | USYD CS S1 2026 | K-12 / standardized exams | ❌ |

## Decision

**REJECT** as a dependency, library, or integration target. thea is in the wrong layer (cloud SaaS) and the wrong audience (K-12 exams) for mneme's needs.

**STUDY-ONLY** for UX inspiration when planning Phase 10 (FSRS-6 Reviews + Focus Mode). Specifically worth borrowing:

1. **Question-type taxonomy** — multiple choice, true/false, matching, ranking, short answer. mneme currently has no locked taxonomy for what a "concept review item" looks like; thea's five-type set is a reasonable baseline to start from.
2. **Multi-input ingestion** — they normalize handwritten/PDF/video/YouTube into one study kit. mneme's Phase 4 (document ingestion via Marker + markitdown) is the same shape but for a different output (markdown vault, not quiz items). Cross-check thea's input UX before locking Phase 4 onboarding.
3. **Adaptive difficulty loop** — questions get harder as you master. mneme's REQ-09 says "review of concepts not flashcards" — thea's adaptive loop is a useful counterpoint when designing the concept-page review UI.
4. **Educator-mode UI** (peripheral) — class + assignment + analytics. Out of scope for v1, but a useful reference if mneme ever expands beyond solo use.

**No code, no fork, no dependency.** The app is closed and the architecture is wrong for us; the only artifact from this evaluation is "remember this set of question-type names when designing Phase 10 review UI".

## Algorithm-layer Value (added 2026-05-07 per user feedback)

**The product is rejected. The *algorithm* — "AI takes source material → produces good review questions" — is a real engineering problem worth studying separately.** This is the same problem mneme will face in Phase 10 (REQ-09: concept-page review, not flashcard review), and is independent of which product we benchmark against.

Black-box-observable algorithm signals from thea's UX:

| Signal | What it implies the algorithm does |
|--------|------------------------------------|
| Five question types from one source | a type-router stage (probably prompt-routed) classifies which item types fit each piece of source — definitions → MC, lists → matching, sequences → ranking, etc. |
| Adaptive difficulty (gets harder as you master) | item-difficulty estimation (per-item Elo / IRT-lite) + retrieval based on user mastery vector |
| "Weak spot" focus | concept-level mastery model, not item-level — the unit of forgetting is a *concept*, items are sampled from that concept |
| Handwritten OCR → quiz items | OCR + denoise + chunk + per-chunk question generation (likely page-level chunking) |
| Video / YouTube → quiz items | ASR caption → segment-level summarization → segment-level question generation |
| Spaced repetition (algorithm undisclosed) | almost certainly NOT FSRS-6 (no public claim); probably SM-2 / Leitner / proprietary heuristic |

These are the **algorithmic moves** mneme also has to make — and unlike thea's product, we already have Claude API + ts-fsrs to build them ourselves.

### Research routes (pick one when re-surfacing this todo)

1. **Black-box probe** — register thea (free), upload one USYD lecture PDF (e.g. COMP3221 distributed systems), inspect the generated items, reverse-engineer the prompt style + difficulty distribution + concept-extraction strategy. ~1 hour. Cheapest. Keeps us product-aware without reading their code (which is closed anyway).
2. **OSS comparison** — Questgen (`https://www.questgen.ai/`) is OSS-ish in this space; check repo + license + algorithm choice for an open contrast point. ~1 hour.
3. **Academic baseline** — read Kurdi et al. 2020 "Systematic Review of Automatic Question Generation for Educational Purposes" + 1-2 recent (2024-2026) LLM-based AQG papers. The field has been studied since pre-LLM days; we should not reinvent. ~2 hours.
4. **Claude API spike** — design mneme's own "concept-page → review-item" prompt pipeline, run it against the same lecture PDF, compare against thea's black-box output. ~1 day. **This is the one that produces an actual mneme artifact**, not just a research note.

**Recommended sequence**: 1 → 4 (skip 2/3 unless 4 stalls). Total budget: ½ day for routes 1+4 if disciplined.

### Recommended next step

Promote this todo to a proper spike when Phase 10 is on the horizon: `/gsd-spike concept-review-item-generation` (1-2 day timebox, scope = routes 1 + 4 above). Output: a `RESEARCH.md`-grade prompt design + 5-10 sample items generated against a real USYD lecture, ready to feed into Phase 10 PLAN.md.

Don't run the spike now — it's premature (we're at Phase 0, ten phases away). But don't lose the algorithmic angle either.

## Surface trigger

Re-read this todo before `/gsd-discuss-phase 10` (FSRS-6 Reviews + Focus Mode). At that point, decide whether to:
- Promote to `/gsd-spike concept-review-item-generation` (recommended), OR
- Inline the four research routes into Phase 10's plan-phase research stage, OR
- Move to `.planning/todos/completed/` if Phase 10 design has already settled the algorithm question.

## Sources

- https://www.theastudy.com/ — official site
- https://apps.apple.com/us/app/thea-study-smart/id6742800289 — App Store listing
- https://play.google.com/store/apps/details?id=study.thea.www.twa — Google Play
- https://www.aiapps.com/items/thea/ — third-party review
- https://www.mindgrasp.ai/blog/best-thea-study-alternatives-in-2026-top-ai-tools — competitive comparison
- https://theresanaiforthat.com/ai/thea/ — directory listing (v4.2)
