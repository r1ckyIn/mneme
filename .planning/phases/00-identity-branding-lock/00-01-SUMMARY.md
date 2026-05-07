---
phase: 00-identity-branding-lock
plan: 01
subsystem: branding
tags: [naming, identity, hand-off, frontmatter]

requires: []
provides:
  - Locked final app name (mneme) in NAME-DECISION.md hand-off file
  - Bundle id pattern dev.mneme.app (production) + dev.mneme.spike (frozen spike artifact)
  - Skill rename target: spike-findings-mneme
  - Directory convention target: .mneme (REQ-17)
affects: [00-02-icon, 00-03-rename, 00-04-publish, phase-1-tauri-shell]

tech-stack:
  added: []
  patterns:
    - "Hand-off-by-frontmatter: downstream plans extract <finalname> via grep on NAME-DECISION.md YAML frontmatter"

key-files:
  created:
    - .planning/phases/00-identity-branding-lock/00-NAME-DECISION.md
  modified: []

key-decisions:
  - "Final name: Mneme (lowercase: mneme)"
  - "Bundle id pattern: dev.mneme.app for production, dev.mneme.spike for the frozen spike-002 artifact"
  - "User explicitly accepted small-footprint App Store competitor 'Mneme AI - Local AI Notes' per D-04"
  - "USPTO/EUIPO trademark check deferred (acceptable for personal-use scope per A4); revisit on commercialization"

patterns-established:
  - "NAME-DECISION.md hand-off: downstream plans read final_name/bundle_id_app/bundle_id_spike/skill_dir/directory_convention via YAML frontmatter — single canonical source"

requirements-completed: [SC-1]

duration: 5min
completed: 2026-05-07
---

# Phase 0 / Plan 01: Lock Final App Name

**Final app name locked: Mneme (Greek goddess of memory, /ˈniːmi/, 2 syllables, Mandarin 尼-米)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-07T04:18:00Z
- **Completed:** 2026-05-07T04:20:21Z
- **Tasks:** 2
- **Files created:** 1 (00-NAME-DECISION.md)

## Accomplishments

- Presented all 17 researcher-evaluated naming candidates (3 D-03 starting + 5 backup pool + 9 expansion) with their conflict-cleanliness verdicts to the user, not just the 3 finalists.
- User picked **Mneme** — the only candidate satisfying D-02 ≤2 syllables hard rule + strong theme + Mandarin pronunciation.
- Authored `.planning/phases/00-identity-branding-lock/00-NAME-DECISION.md` with all 11 frontmatter fields (final_name, final_name_display, bundle_id_app, bundle_id_spike, skill_dir, directory_convention, codename_retired, codename_retirement_date, decision_date, decision_authority, type/phase) and all 6 body sections (Locked Name, Why This Name, Bundle Identifier Pattern, Rename Targets, Conflicts Acknowledged, Hand-off).
- All 6 verify gates from PLAN.md `<verify><automated>` block passed (file existence + 5 frontmatter regex matches + English-only content check).

## Task Commits

1. **Task 1: Present finalists and capture decision** — interactive, no commit (decision captured in user reply)
2. **Task 2: Author NAME-DECISION.md** — committed in this plan's atomic commit

## Files Created/Modified

- `.planning/phases/00-identity-branding-lock/00-NAME-DECISION.md` — Locked-name hand-off with frontmatter (11 fields) + 6 body sections (Locked Name, Why, Bundle Pattern, Rename Targets, Conflicts Acknowledged, Hand-off)

## Decisions Made

- **Mneme over Theoria/Scholea**: D-02 ≤2 syllables is a hard rule per CONTEXT.md; Mneme is the only candidate that satisfies it while keeping the Greek scholarly theme. Theoria (4 syllables) and Scholea (3 syllables) both violate.
- **App Store conflicts accepted**: User explicitly accepts "Mneme: Memory journal" and "Mneme AI - Local AI Notes" — both have no popularity ratings and are not in the user's macOS Ventura 13.4 reach. Personal-use-only project per OOS-01.
- **Spike bundle id stays `.spike`, production reserves `.app`**: Per CONTEXT.md D-10/D-11 + RESEARCH.md Q4 — tags spike-002 as historical artifact distinct from Phase 1's production app.

## Deviations from Plan

None — plan executed exactly as written. Wave 1 was a single-plan checkpoint; user picked Mneme on first ask after seeing the comprehensive 17-candidate verdict table (which expands the 3-finalist presentation specified in PLAN.md `<task type="checkpoint:decision">` to give the user full visibility — research data was already in RESEARCH.md, not added).

## Issues Encountered

None.

## Next Phase Readiness

- **Plan 00-02 (icon)** unblocked: monogram letter is `M`, master 1024×1024 target locked.
- **Plan 00-03 (atomic rename)** unblocked: `<finalname>` = `mneme`; `<Name>` = `Mneme`; bundle id flip target `dev.mneme.spike`; skill rename target `spike-findings-mneme`; directory convention `.mneme/rules/`.
- **Plan 00-04 (publish)** unblocked: GitHub repo target `r1ckyIn/mneme`; final-commit message mentions Mneme.

---
*Phase: 00-identity-branding-lock*
*Completed: 2026-05-07*
