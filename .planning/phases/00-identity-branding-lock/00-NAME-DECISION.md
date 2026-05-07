---
phase: 00-identity-branding-lock
type: name-decision
final_name: mneme
final_name_display: Mneme
bundle_id_app: dev.mneme.app
bundle_id_spike: dev.mneme.spike
skill_dir: spike-findings-mneme
directory_convention: .mneme
codename_retired: learn-os
codename_retirement_date: 2026-05-07
decision_date: 2026-05-07
decision_authority: user (per D-04)
---

## Locked Name

Final app name: **Mneme** — pronounced /ˈniːmi/ ("nee-mee"); Mandarin transliteration: 尼-米.

## Why This Name

- Best D-02 fit: 2 syllables (strict win over Theoria's 4 and Scholea's 3) and Mandarin-pronunciation friendly.
- Greek mythological gravitas: Μνήμη is the goddess of memory — directly aligned with the project's spaced-repetition + knowledge-graph + course-memory thesis.
- Conflict footprint is small and acceptable: only two App Store hits ("Mneme: Memory journal", "Mneme AI - Local AI Notes") — both with no popularity ratings per researcher A1; user accepts.
- ICNS monogram letter "M" works graphically for the 1024×1024 Dock icon.

## Bundle Identifier Pattern

| Domain | Pattern | Used In |
|--------|---------|---------|
| Production app (Phase 1+) | `dev.mneme.app` | New `tauri.conf.json` scaffolded in Phase 1 |
| Spike artifact (frozen) | `dev.mneme.spike` | Existing `.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json` (Plan 03 flips this) |

Per CONTEXT.md D-10/D-11 + RESEARCH.md Q4: spike keeps `.spike` suffix to tag it as historical/non-production; production gets `.app` reserved for Phase 1.

## Rename Targets

- Repo dir + GitHub repo: `r1ckyIn/mneme`
- All `.planning/*.md` references: `learn-os` → `mneme`
- Directory convention (REQ-17): `.learnos/rules/` → `.mneme/rules/`
- Skill: `.claude/skills/spike-findings-learn-os/` → `.claude/skills/spike-findings-mneme/`
- Bundle id (spike 002): `dev.learn-os.spike` → `dev.mneme.spike`

## Conflicts Acknowledged

- "Mneme: Memory journal App" (Sergey Basin, iOS+macOS, requires macOS 15.6+) — out of reach on user's macOS Ventura 13.4 anyway; user accepts.
- "Mneme AI - Local AI Notes" (Mac App Store) — direct competitor in our exact niche, but small footprint (no popularity ratings per A1). User explicitly accepts; this is a personal-use app per OOS-01, distribution-only-not-commercialization. D-04 decision is final per CONTEXT.md.
- USPTO/EUIPO trademark databases were not checked (per A4) — acceptable for personal use; revisit if commercialization is ever considered.

## Hand-off

Plans 02, 03, 04 read this file's YAML frontmatter to substitute `<finalname>` (= `mneme`) throughout their tasks.
