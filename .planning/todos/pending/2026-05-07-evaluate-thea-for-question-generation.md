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

## Surface trigger

Re-read this todo before `/gsd-discuss-phase 10` (FSRS-6 Reviews + Focus Mode). Then move file to `.planning/todos/completed/` with the resolution carried into the phase's UI/spec discussion.

## Sources

- https://www.theastudy.com/ — official site
- https://apps.apple.com/us/app/thea-study-smart/id6742800289 — App Store listing
- https://play.google.com/store/apps/details?id=study.thea.www.twa — Google Play
- https://www.aiapps.com/items/thea/ — third-party review
- https://www.mindgrasp.ai/blog/best-thea-study-alternatives-in-2026-top-ai-tools — competitive comparison
- https://theresanaiforthat.com/ai/thea/ — directory listing (v4.2)
