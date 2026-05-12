---
title: gsd-build/get-shit-done upstream PR — follow-up scope
date: 2026-05-12
phase: 01.1-dev-feedback-loop-infrastructure
status: deferred (post-Phase-01.1-ship)
trigger: after mneme dogfood (plan 01.1-09) shows the loop holds across ≥3 verify cycles
owner: future-self (manual draft post-ship)
openspec_task: 10.5
---

# Upstream PR scope (NOT for Phase 01.1)

Per `openspec/changes/automate-dev-feedback-loop/tasks.md` task 10.5: after mneme dogfood proves the loop, draft an upstream PR to `gsd-build/get-shit-done` containing the rule-layer changes that mneme made user-locally during Phase 01.1.

## Why this PR exists outside Phase 01.1

- **Scope discipline.** Phase 01.1 is mneme-side adoption + bootstrapping self-test. Upstream contribution lives in a separate cycle; conflating the two would have:
  - Forced phase 01.1 to wait on upstream review timelines
  - Mixed mneme's commits with cross-repo coordination
  - Diluted the OpenSpec spec.md (which is mneme-anchored)
- **Cycle-2 finding.** Plan 01.1-09's dogfood found Finding F1 (validate-html comment parsing bug) and mitigated it template-side, NOT in the SDK. The full SDK fix (strip HTML comments before regex match) is demoted from blocking to nice-to-have. Re-evaluating after 2+ more verify cycles is the responsible posture.
- **Living visual contract just landed.** Cycle 2 of plan 01.1-09 added the Living visual contract as the new hard contract for generated HTML (`.planning/references/design/living-visual-contract.md` + rewrite of `$HOME/.claude/get-shit-done/templates/visual-review.html` from 252 → 552 lines). This upstream PR therefore now reflects the Living-rewritten template, not the cycle-1 KD-13 template.

## Sequencing precondition

1. Wait until mneme has run **≥3 verify cycles successfully** post-ship — confirms the loop holds and the patches don't regress over time. Plan 01.1-09 dogfood counts as cycle 1; cycle 2 was the Living rewrite. Cycles 3+ are post-ship.
2. Surface to user with confirmation that the upstream contribution is desired.
3. Open one PR per group OR a single coherent PR — depends on upstream maintainer preference.

## Scope of the upstream PR

Five groups of changes — all currently live at `$HOME/.claude/get-shit-done/` (user-global, NOT in mneme git):

### Group A — `workflows/verify-work.md` (3 patches)

Source plan: 01.1-02. Diffs embedded in `.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-02-SUMMARY.md`.

Summary of patches:
- **Patch 1** — expand `<step name="automated_ui_verification">` to add a Tauri-shell branch with capability probe (`npm run gsd-dev-screenshot --dry-run`) → `verify.scan-signals` + `verify.capture-screenshot --surface tauri` + `verify.query-dom-state --surface tauri`.
- **Patch 2** — insert new `<step name="package_manual_review">` between `automated_ui_verification` and `find_summaries`. Group queued manual items by 4-bucket → `verify.render-review-html` → `verify.validate-html` (halts on forbidden bucket/tag) → present HTML path → wait for response → `verify.parse-review-response`.
- **Patch 3** — add new `<critical_rules>` block at workflow top with 5 rules:
  1. No asking user to open DevTools / read console / paste log / inspect DOM / run terminal commands
  2. HTML `data-bucket` whitelist (`visual` / `window` / `motion` / `perf`)
  3. HTML questions MUST have concrete anchors
  4. HTML header MUST include "Claude has auto-verified" reassurance checklist
  5. Each verify run = fresh HTML; never amend prior

### Group B — `templates/visual-review.html` (Living rewrite — 552 lines, 1 new file post-cycle-2)

Source plans: 01.1-03 (initial KD-13 template) + 01.1-09 cycle 2 (Living rewrite). Full file text embedded in `01.1-03-SUMMARY.md`; cycle-2 Living rewrite documented in `01.1-09-SUMMARY.md` "Cycle 2" section.

The template uses Living visual tokens (cream `#E6E3DC` + olive `#6B6E3D` muted accent on `<em>` only + Fraunces variable axis serif + Geist sans/mono + tracking ladder + 320/620/1100ms motion curve `cubic-bezier(0.32, 0.72, 0, 1)`). Chinese-primary visible text (CSS variable names / class names / data attributes / dev WHY-comments stay English).

Backup of original KD-13 template preserved at `$HOME/.claude/get-shit-done/templates/visual-review.html.kd13.bak` (252 lines) — upstream PR should NOT delete this backup; it's a reference for downstream projects that might want the KD-13 variant.

### Group C — GSD CJS shim: `bin/lib/verify-dev-loop.cjs` + router extensions (1 new file + 2 modifications)

Source plan: 01.1-04. Diffs embedded in `01.1-04-SUMMARY.md`.

Note: **E3 errata** — v3 design assumed 8 separate handler files; reality is 1 file with 8 exports plus router + alias-generator updates. The upstream PR description should call this out so reviewers understand the simpler-than-spec layout.

### Group D — `@gsd-build/sdk` npm package TypeScript surface (8 new handlers + manifest + index registration)

Source plan: 01.1-04. The SDK package source edits are the **most impactful upstream change** because they affect every project using `gsd-sdk`. PR target: the SDK source repo (likely `https://github.com/gsd-build/get-shit-done/tree/main/sdk`).

Files modified on the TS side:
- `src/query/command-manifest.verify.ts` — 8 new `CommandManifestEntry` rows
- `src/query/verify-dev-loop.ts` — NEW file, 8 `QueryHandler` exports
- `src/query/index.ts` — explicit registration of 8 new handlers in `createRegistry()`

### Group E — F1 nice-to-have fix (validate-html HTML-comment stripping, demoted)

Source: 01.1-09 dogfood Finding F1. Demoted from blocking to nice-to-have because the Living-rewritten template no longer triggers the bug (it lists forbidden bucket values as prose, not as example `<section data-bucket=`).

Proposed 2-line surgical fix in BOTH TS source AND CJS shim (per E3 mirror):

```typescript
const content = readFileSync(path, 'utf8');
const commentStripped = content.replace(/<!--[\s\S]*?-->/g, '');
// ...use commentStripped throughout for both bucket scan AND FORBIDDEN_PHRASINGS scan
```

Regression test: render a template that DOES embed `<section data-bucket="...">` inside an HTML doc comment, validate it, expect `{passed: true}`.

This sits in the upstream PR as a "while you're here" fix — not the primary motivation.

## PR description anchors (for the future drafter)

The PR description should reference:
- The full `openspec/changes/automate-dev-feedback-loop/` permalink as the design rationale (proposal + design + tasks + spec).
- Per-group source plans (01.1-02 / 01.1-03 / 01.1-04 / 01.1-09).
- Audit notes at `.planning/notes/dev-feedback-loop-audit-202605.md` (residual-risk register).
- This file (post-ship follow-up scope).
- The cycle-2 Living rewrite as the post-cycle-1 user-driven contract change.

## Cross-references

- **Phase execution**: `.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-NN-SUMMARY.md` (10 SUMMARYs after plans 01.1-01 through 01.1-10)
- **Dogfood findings (cycle 1 + cycle 2)**: `.planning/notes/dev-feedback-loop-audit-202605.md`
- **Living visual contract SSOT**: `.planning/references/design/living-visual-contract.md` (16 chapters)
- **Spec**: `openspec/changes/automate-dev-feedback-loop/specs/dev-feedback-loop/spec.md`
- **Workflow contract**: `openspec/WORKFLOW-WITH-GSD.md` (explains why `/opsx:apply` is bypassed and `tasks.md` syncs manually at `/gsd-ship` time)

## Open questions (resolve before drafting PR)

1. Does upstream prefer ONE coherent PR or FIVE smaller PRs by group? Surface to maintainer before drafting.
2. Should the Living template be the upstream default, or should both KD-13 + Living variants ship with project-level `templates/visual-review.local.html` override? Default position: ship both; document the override hook.
3. Does the `@gsd-build/sdk` repo have its own CI / test conventions that need to be matched? Read repo's `CONTRIBUTING.md` before opening PR.
4. F4 scope (Living-vs-KD-13 ambiguity) — does that need cross-repo coordination, or is it strictly mneme-local? Answer: mneme-local for now per cycle-2 frontmatter; revisit if downstream projects ask.

---

*This file documents the deferred upstream contribution scope per Phase 01.1 task 10.5. Status remains `deferred` until the trigger conditions above are met.*
