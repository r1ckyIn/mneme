---
created: 2026-05-11T13:30:00.000Z
updated: 2026-05-11T13:30:00.000Z
title: Trigger workflow sync to all r1ckyIn projects (Mneme dogfood validated)
area: infrastructure / workflow-upgrade / cross-project
status: pending — gates on Mneme phase 2-3 ship + AgentShield runtime decision
files: []
---

## Context

After the 2026-05-11 three-layer workflow upgrade (GSD + OpenSpec + ECC), Mneme is the pilot project. Once Mneme has dogfooded the stack across at least 2-3 phases, it's time to propagate the workflow to all other r1ckyIn projects.

## Trigger Conditions (all must be true)

- [ ] Mneme has shipped at least 2 phases using `/opsx:propose → apply → archive` lifecycle (i.e., at least 2 archived proposals in `openspec/specs/`)
- [ ] At least 1 ECC skill / command has been used productively (e.g., `/security-scan` caught something, `/harness-audit` gave actionable output)
- [ ] AgentShield runtime decision resolved (see sibling todo `2026-05-11-post-phase-01-agentshield-runtime-decision.md`)
- [ ] `/context` token usage stayed < 15% across multiple Mneme sessions (Mneme baseline was 9% / 85.5K)
- [ ] No "fork-and-fix" episodes — no layer needed rollback

## What to Do (when triggered)

Read the strategy doc first:

```bash
open ~/claude/r1ckyIn_GitHub/WORKFLOW-SYNC-STRATEGY.md
```

It has:
- Tier-ordered sync sequence (Tier 0 → Tier 1 → Tier 2 → Tier 3)
- Per-project checklist
- Per-project risk notes
- Rollback plan
- Success criteria
- Reminder back-references

Companion audit report (lists what each CLAUDE.md needs):

```bash
open ~/claude/r1ckyIn_GitHub/CLAUDE-MD-SYNC-AUDIT-2026-05-11.md
```

## Recommended Sync Order

1. **Tier 0** (≈ 20 min): Update `~/claude/r1ckyIn_GitHub/CLAUDE.md` — add 三层工作流 section
2. **Tier 1** (≈ 30 min each, in this order):
   - ClaudePulse (Swift, lowest blast radius)
   - UniBoard (production OSS, public)
   - borealis-fabrics (production, security-audited)
   - new-sight (production, Xuzhou incubator)
3. **Tier 2** (optional): harness-evolve, ClaudeGlance (skip), ricky-portfolio (skip)
4. **Tier 3** (≈ 5 min, optional): `~/.claude/CLAUDE.md` Vendor Choices directive extension

## Why Not All-At-Once

Solo dev + multiple production projects = high blast radius if something breaks. Tier 1 starts with **ClaudePulse** (Swift, smallest, lowest risk) to confirm the per-project install pattern works before touching production OSS (UniBoard) or income-relevant projects (borealis-fabrics, new-sight).

## Per-Project Time Budget

- ClaudePulse: 30 min (smallest)
- UniBoard: 45 min (large, but only adds OpenSpec; 25 existing phases stay as-is)
- borealis-fabrics: 30 min + 15 min security re-scan
- new-sight: 30 min + 15 min security re-scan

Total: **~3 hours** if sequential. Can split across 2-3 sessions.

## Triggering this todo

After Mneme phase 2-3 ships:
- `/gsd-capture --list` should surface this
- Or grep manually: `find .planning/todos/pending -name '*workflow-sync*'`

When sync starts, move to `.planning/todos/completed/` with progress notes. Once fully done, also update:
- Memory: `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub/memory/project_harness_evolution.md` — append "2026-XX-XX — Workflow Sync Completed" section
- Delete `~/claude/r1ckyIn_GitHub/WORKFLOW-SYNC-STRATEGY.md` (no longer needed) OR keep for next major upgrade pattern reference
