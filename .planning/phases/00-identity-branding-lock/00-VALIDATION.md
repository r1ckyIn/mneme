---
phase: 0
slug: identity-branding-lock
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Phase 0 has no v1/v1.x REQ — validation maps to **ROADMAP.md success criteria → shell smoke checks** (no test framework adopted at this phase; Phase 1+ may install Vitest + `cargo test`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | N/A — no automated test framework (Phase 0 produces assets + config + docs, not testable code) |
| **Config file** | none — pure bash smoke scripts |
| **Quick run command** | `bash .planning/phases/00-identity-branding-lock/scripts/verify-rename.sh "<finalname>"` |
| **Full suite command** | `bash .planning/phases/00-identity-branding-lock/scripts/verify-rename.sh "<finalname>" && bash .planning/phases/00-identity-branding-lock/scripts/verify-icon.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **Stage gate (between rename stages):** Run quick `verify-rename.sh` after string-edits stage, before skill-rename stage. Catches drift before it compounds.
- **Pre-commit (single atomic commit per D-12):** Run full suite — both `verify-rename.sh` and `verify-icon.sh`.
- **Pre-push (before `gh repo create --public --push`):** Full suite + secrets audit (`git ls-files | xargs grep -l -i 'sk-ant\|sk-proj\|api[_-]key\|token\|password\|secret'` returns 0 hits).
- **Phase gate (`/gsd-verify-work 0`):** Full suite + visual inspection of `icon.icns` in Finder Get Info dialog (Dock-rendered squircle).
- **Max feedback latency:** ~5 seconds (pure bash; no compile, no test runner).

---

## Per-Task Verification Map

> Phase-level mapping — task IDs filled in by planner. Each row maps a ROADMAP success criterion to one or more grep/file/python-eval shell checks bundled in `verify-rename.sh` / `verify-icon.sh`.

| Map ID | ROADMAP SC | Behavior | Threat Ref | Test Type | Automated Command | File Exists | Status |
|--------|-----------|----------|------------|-----------|-------------------|-------------|--------|
| V-01 | SC-1 | PROJECT.md mentions locked name; codename `learn-os` retired (audit-log files allowed) | T-PUB-01 secret leak | shell-grep | `rg -F '<finalname>' .planning/PROJECT.md && ! rg -F 'learn-os' .planning/PROJECT.md` | ❌ W0 | ⬜ pending |
| V-02 | SC-2 | `icon-assets/icon.icns` is valid Mac OS X icon format with 10 size variants | — | shell-test | `file icon-assets/icon.icns \| grep -q 'Mac OS X icon' && [ "$(iconutil -V icon-assets/icon.icns 2>&1 \| grep -c 'image format')" -ge 10 ]` | ❌ W0 | ⬜ pending |
| V-03 | SC-3 | spike 002 `tauri.conf.json` `identifier` = `dev.<finalname>.spike` (NOT `.app` — preserves spike domain) | T-CFG-01 stale-id | shell-python | `python3 -c "import json; assert json.load(open('.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json'))['identifier'] == 'dev.<finalname>.spike'"` | ❌ W0 | ⬜ pending |
| V-04 | SC-4 (README) | README.md exists at repo root, contains finalname, bilingual sections, codename history footer | T-PUB-02 brand-confusion | shell-grep | `test -f README.md && rg -F '<finalname>' README.md && rg -F '## English' README.md && rg -F '## 中文' README.md && rg -F 'Codename history' README.md` | ❌ W0 | ⬜ pending |
| V-05 | SC-4 (window/Dock) | Window-title + Dock-label CONTRACTS captured in PHASE-1 entry hand-off note (not testable in Phase 0 — no production Tauri shell yet) | — | manual hand-off | (visual inspection of Phase 1 PR — out of scope for Phase 0 verify) | N/A | ⬜ deferred to Phase 1 |
| V-06 | (auxiliary) | Skill renamed: `.claude/skills/spike-findings-<finalname>/SKILL.md` exists; frontmatter `name:` matches dir; CLAUDE.md skill-table updated | T-SKL-01 skill-orphan | shell-grep | `test -f .claude/skills/spike-findings-<finalname>/SKILL.md && grep -q "^name: spike-findings-<finalname>$" .claude/skills/spike-findings-<finalname>/SKILL.md && grep -q "spike-findings-<finalname>" CLAUDE.md` | ❌ W0 | ⬜ pending |
| V-07 | (auxiliary) | No `learn-os` references survive in non-skip-listed files (audit-log directories — phase artifacts + 4 PLAN.md + spike-001 captures — exempt per D-15) | T-RNM-01 incomplete-rename | shell-grep | `! rg -i 'learn[-_ ]?os' --hidden --no-ignore --glob '!.git/' --glob '!.planning/phases/00-identity-branding-lock/' --glob '!.planning/spikes/001-stream-json-recon/captures/' \| read` | ❌ W0 | ⬜ pending |
| V-08 | (auxiliary) | `.learnos/rules/` directory convention has been replaced with `.<finalname>/rules/` | T-RNM-02 lockstep-miss | shell-grep | `! rg -F '.learnos/rules/' --hidden --no-ignore --glob '!.git/' --glob '!.planning/phases/00-identity-branding-lock/' --glob '!.planning/spikes/001-stream-json-recon/captures/' \| read` | ❌ W0 | ⬜ pending |
| V-09 | (security) | No secrets in tracked files (pre-publish gate before `gh repo create --public`) | T-SEC-01 secret-leak | shell-grep | `[ "$(git ls-files \| xargs grep -l -i 'sk-ant\\\|sk-proj\\\|api[_-]key\\\|token\\\|password\\\|secret' 2>/dev/null \| wc -l)" = "0" ]` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

The following must be authored as the first wave of Phase 0 (before any rename or asset work):

- [ ] `.planning/phases/00-identity-branding-lock/scripts/verify-rename.sh` — bundles V-01, V-03, V-04, V-06, V-07, V-08, V-09 shell checks. Accepts `<finalname>` as `$1`. Exit non-zero on any failure.
- [ ] `.planning/phases/00-identity-branding-lock/scripts/build-icon.sh` — committed PNG-to-ICNS pipeline (sips resize → iconutil pack). Idempotent re-run safe. Documents the master-PNG location.
- [ ] `.planning/phases/00-identity-branding-lock/scripts/verify-icon.sh` — bundles V-02 (`file` + `iconutil -V`).
- [ ] No test-framework install required — pure bash; built-in.

*Phase 1+ may install Vitest (SvelteKit) and `cargo test` (Tauri Rust). Phase 0 does not justify the overhead.*

---

## Manual-Only Verifications

| Behavior | Success Criterion | Why Manual | Test Instructions |
|----------|-------------------|------------|-------------------|
| Icon renders correctly in macOS Dock with squircle mask | SC-2 | `iconutil -V` validates structure but not visual quality (anti-aliasing, contrast at small sizes, squircle compliance) | After committing `icon.icns`, copy to `~/Desktop`, `Cmd+I` in Finder → verify Dock-rendered preview shows the graph-node + monogram clearly at 32×32 (Dock thumbnail size) |
| Window title + Dock label contract for Phase 1 | SC-4 (window/Dock half) | Phase 0 doesn't build a production Tauri shell — Phase 1 does. The contract is text in CONTEXT.md / PHASE-1 hand-off; verification happens during Phase 1 verify-work | Phase 1 spawn-time check: `tauri.conf.json` has `productName: "<finalname>"` AND `mainWindow.title: "<finalname>"` (no view-aware suffix per D-14) |
| README readability + tone | SC-4 (README half) | grep checks structure but not "does this read well to a stranger landing on the GitHub page?" | User reads README before merging Phase 0 PR. Specifically check: bilingual sections balance, badges render, codename-history footer factually accurate |
| GitHub repo public visibility + topics | (deployment) | `gh repo create --public` is one-shot; no automated post-check | After publish: visit `https://github.com/r1ckyIn/<finalname>` in browser. Confirm: README renders, LICENSE detected, no `.gitignore`-protected files leaked (CLAUDE.md, .env*, *.pem) |

---

## Validation Sign-Off

- [ ] All 9 mapped checks have `<automated>` verify or are explicitly deferred (V-05) / manual (4 items above)
- [ ] Sampling continuity: Wave 0 first 3 tasks author the verify scripts, then every subsequent stage runs them
- [ ] Wave 0 covers all MISSING references (verify-rename.sh, build-icon.sh, verify-icon.sh)
- [ ] No watch-mode flags (single-shot bash scripts only)
- [ ] Feedback latency < 10s (verified: ~5s typical)
- [ ] `nyquist_compliant: true` set in frontmatter (set after planner maps task IDs to V-01..V-09)

**Approval:** pending — awaits planner mapping task IDs to Map IDs V-01..V-09 in PLAN.md files.
