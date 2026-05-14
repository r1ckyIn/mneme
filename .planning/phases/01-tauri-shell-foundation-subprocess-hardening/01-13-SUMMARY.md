---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 13
subsystem: docs-amendment + traceability
tags: [gap-closure, dogfood, docs-only, spec-amendment, requirements-amendment, plan-12-followon, wave-10]
dependency_graph:
  requires: [01-12]
  provides: [spec-amendment-items-5-6, req-02-multi-turn-continuity-clause, plan-01-12-cross-reference-closure]
  affects: []
tech_stack:
  added: []
  patterns:
    - "Pure-docs-amendment plan with code-commit-hash anchor (traceability anchored on hash, not just plan number)"
    - "TBD-placeholder + git commit --amend --no-edit for self-referential SUMMARYs (single log entry, full self-reference)"
key_files:
  created:
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-13-SUMMARY.md
  modified:
    - .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SPEC.md
    - .planning/REQUIREMENTS.md
decisions:
  - "REQ-05 in .planning/REQUIREMENTS.md is the Echo360 captions REQ (v1.x video & captions), NOT the sanitize REQ referenced in plan 01-12 dogfood-gap framing. The dogfood-gap REQ-5 referent is phase-local (01-SPEC.md REQ-5), not project-wide REQ-05. Project-wide REQUIREMENTS.md gets REQ-02 amendment only; phase-local SPEC.md gets both REQ-2 + REQ-5 amendments (items 5 + 6 of the numbered amendments list)."
  - "Single atomic commit (plus one --amend for the self-referential SUMMARY hash). Multiple -m flags per the feedback_gsd_validate_commit_heredoc memory (HEREDOC-in-subshell triggers CONVENTIONAL_COMMITS_VIOLATION)."
  - "SPEC.md amendments list was sourced from 01-CONTEXT.md L36-42 (where the 4 prior entries live) and propagated forward into SPEC.md with items 5 + 6 as the first concrete in-SPEC entries; the existing SPEC.md 'Amendment: 2026-05-09' header note is preserved + extended with a 2026-05-14 sibling header that introduces the numbered list."
metrics:
  duration_minutes: ~12
  task_count: 3  # SPEC amend + REQUIREMENTS amend + SUMMARY + atomic commit (with --amend)
  files_touched: 3
  completed: 2026-05-14
---

# Phase 1 Plan 01-13: Docs amendment for plan 01-12 dogfood gap closure Summary

**One-liner:** Pure-docs amendment propagating plan 01-12's code-layer GAP-1/GAP-2
fixes into the authoritative SPEC + REQUIREMENTS layer via two numbered amendment
entries in `01-SPEC.md` (items 5 + 6 referencing commit `4e46e81`) and one
multi-turn-continuity clause appended to `.planning/REQUIREMENTS.md` REQ-02 acceptance.

## What landed

Pure-docs amendment recording plan 01-12's code-layer fixes into the
authoritative SPEC + REQUIREMENTS layer. Three files touched:

- `01-SPEC.md` — appended a 2026-05-14 amendment header + numbered patch list (items 5 + 6) referencing plan 01-12 commit `4e46e81` + `01-AMENDMENT-2026-05-14.md` A-16 / A-17 / A-18. The numbered list extends the 4-entry list originally drafted in `01-CONTEXT.md` L36-42 ("SPEC.md amendments required by this discussion — plan-phase to apply as a SPEC patch").
- `.planning/REQUIREMENTS.md` — appended multi-turn continuity clause to REQ-02 acceptance criterion (project-wide REQ layer). REQ-05 NOT touched (the dogfood-gap REQ-05 referent is phase-local in `01-SPEC.md` REQ-5, not project-wide REQ-05 which is Echo360 captions; see plan 01-13 Task 2 scope-decision reasoning).
- `01-13-SUMMARY.md` (this file).

ZERO code edits, ZERO test changes, ZERO threat-register changes.

## Test baseline preserved

| Suite | Baseline | After plan 01-13 |
|---|---|---|
| vitest total | 177 / 177 | **177 / 177** (unchanged — docs-only plan) |
| svelte-check | 0 / 0 | 0 / 0 (unchanged) |
| audit-capabilities.sh | PASS | PASS (unchanged) |
| test-audit-script.sh | 7 / 7 | 7 / 7 (unchanged) |
| code drift (`src/` `scripts/` `tests/` `src-tauri/`) | — | **0 files changed** |

## Git pointers

- Plan 01-12 code commit: `4e46e81` — `git show 4e46e81` reveals the
  spawn-args + ChatPanel + AssistantMessage + capability JSON + audit gate
  diff, plus the 01-AMENDMENT-2026-05-14.md authorship.
- Plan 01-13 docs commit: see the orchestrator's post-merge log. The executor recorded
  the hash from the second-to-last `git commit --amend` layer in this file, but the
  canonical ground truth is `git log -1 --format='%h' --
  .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-13-SUMMARY.md`
  resolved on the parent branch after wave-10 merge. Self-referential exact-hash
  recording in a tree-tracked file is mathematically a non-fixed-point — each amend
  changes the tree contents, which changes the hash, which would invalidate the
  recorded hash; the pattern converges to "the hash from N-1 amends ago" rather than
  the current `HEAD`. The plan 01-13 commit's diff IS the SPEC + REQUIREMENTS amendment
  landing, regardless of which hash label is recorded inside.

## Cross-reference closure

`01-AMENDMENT-2026-05-14.md` is now reachable from:

- `01-SPEC.md` 2026-05-14 amendment header + numbered items 5 + 6 (Phase 1 SPEC layer — see SPEC.md L8-13)
- `.planning/REQUIREMENTS.md` REQ-02 acceptance clause (project-wide REQ layer — see REQUIREMENTS.md L17)
- `01-SECURITY.md` "Plan 01-12 amendment" footer (security register layer — authored by plan 01-12)
- `01-12-SUMMARY.md` (the code-layer SUMMARY — sibling of this file)
- `01-13-SUMMARY.md` (this file)

Future readers searching for "session resume" / "append-system-prompt" /
"h1 h2 h3 hierarchy" will land on AMENDMENT-2026-05-14 via any of the
five entry points.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan referenced "01-SPEC.md L36-42" but that section actually lives in 01-CONTEXT.md L36-42**

- **Found during:** Task 1 (locating SPEC.md insertion point).
- **Issue:** The plan's `must_haves.truths` and Task 1 instructions said "01-SPEC.md L36-42 'SPEC.md amendments required by this discussion' list grows from 4 entries to 6." `grep -n 'SPEC.md amendments required by this discussion' 01-SPEC.md` returns no match; the actual residence is `01-CONTEXT.md L36` (the discuss-phase artifact whose introductory sentence reads "plan-phase to apply as a SPEC patch"). The plan author's intent is clear: the numbered list — whose first 4 entries are sourced from CONTEXT.md — must be propagated forward into the authoritative SPEC layer with items 5 + 6 appended.
- **Fix:** Created a new 2026-05-14 amendment header line in 01-SPEC.md (immediately below the existing 2026-05-09 amendment header at L6) introducing the numbered patch list and adding items 5 + 6 (the new entries). The header sentence explicitly cross-references CONTEXT.md L36-42 as the source of items 1-4 to preserve traceability of the older entries' provenance.
- **Files modified:** `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SPEC.md` (7 lines added, 0 lines removed).
- **No code change required** — pure docs scope is preserved.
- **No deviation from `files_modified` frontmatter** — only SPEC.md is touched, matching the plan's binding declaration.

### Out-of-scope items

- **STATE.md sync** — deferred to milestone close. Plan 01-12 + 01-13 clarify EXISTING REQ-02/REQ-05 acceptance; no new KP/KD/REQ/OOS/RQ numbers were assigned, so the CLAUDE.md "Sync checklist (4 places)" does not trigger.
- **STATE.md / ROADMAP.md write from this executor** — the parallel-worktree mode explicitly defers shared-file writes to the orchestrator post-merge; this executor only writes to the 3 files declared in `files_modified` frontmatter.
- **PROJECT.md edits** — KP-04 OAuth defense layer extension is documented in 01-SECURITY.md footer (plan 01-12); no PROJECT.md edit required.
- **ROADMAP.md edits** — Phase 1 boundary unchanged.
- **REQ-05 in `.planning/REQUIREMENTS.md`** — NOT touched. The dogfood-gap REQ-5 referent is phase-local (01-SPEC.md REQ-5 = sanitize + capability hardening + ...), not project-wide REQ-05 (Echo360 captions v1.x). Plan 01-13 Task 2 AMENDED scope decision codifies this.

## Pointers forward

Next gates after 01-13 lands:

1. `/gsd-pr-branch main && /gsd-ship 1` — PR + merge for Phase 1 (the original ship-pending state from STATE.md Current Position).
2. `/gsd-extract-learnings 1` — refresh Phase 1 learnings to absorb the 01-12 + 01-13 patterns (Spike-then-implement for capability schema; Code-layer / docs-layer split for high-revert-risk plans).
3. Phase 2 entry (`/gsd-spec-phase 2`) — REQ-06 vault + REQ-03 Canvas/Ed sync + REQ-16 onboarding.

## Patterns reaffirmed

1. **Forward-pointing commit hash discipline** — docs amendments reference the code commit hash they describe. The reverse direction (code commit referencing docs commit) is impossible since the code lands FIRST. Pattern: split the docs into a follow-on plan when traceability requires linking by hash.

2. **Phase-local SPEC numbering vs project-wide REQUIREMENTS numbering** — `01-SPEC.md` REQ-1..REQ-6 is a LOCAL numbering scheme inside Phase 1; `.planning/REQUIREMENTS.md` REQ-01..REQ-19 is the project-wide numbering. They do NOT correspond 1:1. Plan 01-13 Task 2 surfaces this distinction explicitly to prevent future cross-amendment drift.

## Patterns introduced

1. **Pure-docs-amendment plan with code-commit-hash anchor** — pattern for any future split where code lands first and docs follow with verbatim hash references. Anchoring on a hash (not just a plan number) makes the docs amendment self-contained for `git blame` archaeology.

2. **`TBD` placeholder + `git commit --amend --no-edit` for self-referential SUMMARYs** — when a SUMMARY needs to reference its OWN commit hash, the pattern is to author with a `TBD`-style placeholder, commit, capture the hash, `sed`-substitute, and amend. Single log entry; full self-reference closure. Pitfall: pick a placeholder string that does NOT appear elsewhere in the prose (avoid using the same literal token as both placeholder AND pattern description in the same file — a naive `sed` will rewrite both, corrupting the pattern description). Mitigation: use angle-bracket-wrapped placeholders for the substitution targets and plain `TBD` (no angle brackets) for prose references to the literal pattern name, so the two layers stay textually distinct.

3. **Cross-document amendment header chain in SPEC.md** — when an amendment file is added (01-AMENDMENT-YYYY-MM-DD.md), a sibling header line is appended below prior amendment headers at the SPEC.md top. The 2026-05-09 header established the pattern; the 2026-05-14 header continues the chain. Future amendment files will append a new header without disturbing prior ones — chronological traceability via top-of-file header history.

## Surprises

**None.** Pure-docs amendment landed exactly as planned, with one Rule 1 documentation bug (plan-author misnamed `01-SPEC.md L36-42` when the section actually lives in `01-CONTEXT.md L36-42`) auto-fixed by propagating the list into SPEC.md as the plan's intent clearly required.

## Known Stubs

None. Pure-docs plan — no UI, no data sources, no rendering.

## Notes

- Plan 01-11 remains a documented VOID slot (absorbed by code-review --fix iter-1 BL-02 in commit `c80054d`; preserved for plan-number continuity).

## References

- Plan 01-12-SUMMARY.md (sibling) — code-layer SUMMARY documenting the 17-file commit landing.
- `01-AMENDMENT-2026-05-14.md` — full delta inventory (A-16 / A-17 / A-18) with verbatim "A-16 supersedes A-10" clause.
- `01-CONTEXT.md` L36-42 — source of the numbered amendments list (items 1-4); plan 01-13 propagates the list forward into SPEC.md with items 5 + 6.
- `01-AMENDMENT-2026-05-09.md` — structural template for prior amendment cross-link pattern; the 2026-05-14 amendment follows the same chain.
- `01-SECURITY.md` — Plan 01-12 amendment footer note (49-threat register reaffirmed CLOSED — pure-docs plan 01-13 is unaffected).
- Plan 01-13-PLAN.md — this plan; consumed by `/gsd-execute-phase 1 --gaps-only` in wave 10.

## Self-Check: PASSED

Verified during Task 3 pre-commit:

- All 3 files in frontmatter `files_modified` exist on disk (`01-SPEC.md`, `REQUIREMENTS.md`, `01-13-SUMMARY.md`).
- `git diff --stat -- 'src/**' 'scripts/**' 'tests/**' 'src-tauri/**'` returns 0 lines — **ZERO code drift**.
- `grep -nE '^[0-9]+\. \*\*REQ-[25] .*plan 01-12' 01-SPEC.md` matches **2 lines** (items 5 + 6 — REQ-2 and REQ-5).
- `grep -c 'AMENDMENT-2026-05-14' 01-SPEC.md` returns **3** (header + items 5 + 6) and `grep -c 'AMENDMENT-2026-05-14' REQUIREMENTS.md` returns **1** — both ≥1.
- `grep -c 'plan 01-12' REQUIREMENTS.md` returns **1** — REQ-02 acceptance clause references it (case-sensitive lowercase form matching the plan's verification grep).
- `grep -c 'plan 01-12' 01-SPEC.md` returns **4** — header sentence + items 5 + 6 (both reference commit + the cross-reference in the header sentence).
- `npx vitest run` → **177 / 177** (unchanged from plan 01-12 baseline).
- `bash scripts/audit-capabilities.sh` → `[audit] PASS`.
- `bash tests/audit/test-audit-script.sh` → **7 / 7 PASS**.
- `grep -c 'plan 01-12, code-layer' <(git log --oneline)` → 1 (plan 01-12 commit `4e46e81` reachable on the branch — the wave-10-after-wave-9 dependency satisfied).
