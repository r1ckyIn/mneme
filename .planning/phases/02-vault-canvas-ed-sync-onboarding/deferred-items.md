# Phase 02 — Deferred Items (out-of-scope for current gap-closure plans)

> Items discovered during plan-02-15 execution that are NOT directly caused by the
> WR-02 / WR-03 / WR-06 / WR-11 changes and therefore out of scope per the
> gsd-executor scope-boundary rule. Logged here for triage.

## Pre-existing test failures (environment-dependent)

### `scripts/__tests__/visual-review-template.test.mjs` — first case "template file exists at GSD upstream path"

- **Status**: pre-existing FAIL (confirmed via `git stash` baseline run on commit `1c0157c`).
- **Symptom**: `visual-review.html not found at /Users/qinyuan/.claude/get-shit-done/templates/visual-review.html`.
- **Root cause**: test is asserting the GSD upstream template is installed at the
  user's `~/.claude/get-shit-done/templates/` path. The current developer environment
  does not have this file installed at that path.
- **Why deferred**: not caused by plan 02-15 changes; affects the GSD upstream
  package installation, not mneme source code. Rule scope-boundary applies.
- **Suggested triage**: either install / refresh GSD upstream templates locally,
  or gate this test on file presence with a clear "GSD upstream not installed —
  skipping" message instead of a hard failure.
