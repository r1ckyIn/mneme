---
created: 2026-05-07T05:27:16.668Z
title: Evaluate thea for question generation
area: research
files: []
---

## Problem

User discovered a third-party software called **thea** (题目生成软件) that may be relevant to mneme. mneme's review surface is REQ-09 (FSRS-6 spaced repetition driving review of *concepts*, not flashcards) and is currently locked to ts-fsrs v5.3.2 (KD-06).

Open questions before we know if thea fits:

1. **What does thea actually do?** — auto-generates quiz questions from source material (PDF/lecture/notes)? Generates flashcards? Authoring tool for hand-written question banks?
2. **License + distribution model** — OSS / freeware / SaaS / commercial? Local-only or cloud? KP-01 (local-first) and KP-02 (no proprietary lock-in) are non-negotiable.
3. **Integration shape** — CLI/library/API/standalone GUI? Can it be wrapped as a Claude Code skill, MCP server, or subprocess?
4. **Alignment vs duplication** — does it complement ts-fsrs (FSRS schedules; thea generates the items being scheduled) or duplicate the "concept review" we plan to build ourselves?
5. **Cost** — free/personal/paid? KP-04 (Claude API budget) constrains additional cloud spend.

## Solution

TBD — needs a short evaluation spike before deciding.

**Suggested next step:** when this todo surfaces, run `/gsd-spike thea-evaluation` (or a lightweight research pass) to:

- Find the canonical source (URL, repo, App Store, Steam — user only said the name)
- Capture license + runtime + offline-capability
- Compare against the existing review-loop design in REQ-09
- Decision: adopt as dependency / fork-and-extend (KP-06) / study-only / reject

If the evaluation looks promising and impacts Phase ≥ 9 (review surface), promote this from todo to a `--seed` with a phase trigger or open a backlog phase entry.

## Notes

- Source: user mention during 2026-05-07 session
- Spelling unverified ("thea" — could be Thea, THEA, or similar)
- No URL provided yet
