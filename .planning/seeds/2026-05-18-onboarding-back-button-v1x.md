---
seed_id: 2026-05-18-onboarding-back-button-v1x
source_phase: 02.1
source_finding: dogfood-friction-cost (2026-05-17 B3 dogfood)
deferred_from: dogfood-verify session (no plan owns this)
target_phase_candidate: Phase 3 (multi-session sidebar / keyboard nav first-class)
created: 2026-05-18
---

# Seed — Onboarding Back button + re-trigger affordance (v1.x)

## Problem

Phase 02 wizard is forward-only by design (D-02 single-direction). During the
2026-05-17 dogfood of the B3 claude-binary-probe fix (Plan 02.1-02), this
forward-only design + the D-06 keymap-withdrawal decision (Plan 02.1-11)
combined to make Step 2 re-verification structurally impossible from inside
the running app:

1. To verify the WR-01 disposition (`Err(NotFound)` → `found=false, env_broken=false` → "Claude CLI not detected" copy), the dogfooder must re-trigger the Step 2 probe with the `claude` binary moved off PATH.
2. Step 2 has no Back button (D-02 forward-only).
3. There is no Cmd+R keymap (D-06 withdrew it).
4. Tauri webview persists URL across cmd+Q / restart, so on relaunch the app reloads to `/onboarding/<last-step>` rather than `/onboarding/1`, **skipping Step 2 entirely** even when `~/.mneme/onboarding-state.json` has been deleted.

Net effect: WR-01 dogfood verification had to be performed **via code+test
inspection** (cargo `inspector_keychain_detect.rs` GREEN + grep of literal
"Claude CLI not detected." in `Step2AuthCheck.svelte:78` + grep of `env_broken`
backend dispatch in `lib.rs:189-191`) rather than live-rendered UI. This
worked but defeats one of the core purposes of having an onboarding wizard:
**rapid live verification of auth/detection state**.

## Scope for v1.x

A "Back" affordance on Steps 2-5 (Steps 1 and 6 are still terminal: Welcome /
Finish). Constraints:

- D-02 forward-only invariant is **preserved for committed state**. Back navigation
  does NOT delete progress — it just lets the user re-render an earlier step
  to re-trigger the per-step probe / re-pick vault / re-edit course list.
- Step 2 probe is the most important re-trigger surface (auth + version detection
  are environmental state that can change between app session and verification).
- Step 3 vault-picker re-pick is already covered by 02.1-10's "Choose another folder"
  ghost-link; a generic Back button would be a redundant secondary path here.
- Pair with cmd+R keymap re-introduction (D-06 reversal) so power users can
  reload the entire webview when probes need to re-run with fresh disk state.

## Why deferred from 02.1

Phase 02.1 scope is "ship-readiness gap closure from post-Phase-02 dogfood +
UI audit" — strictly fix-don't-add. Adding a Back button is a new UX surface
(+ accessibility contract + state-handling rules) that warrants its own
discuss-phase / plan-phase cycle. The keymap re-introduction is also a Phase 3
prerequisite (paired with multi-session sidebar where keyboard nav becomes
first-class).

## Implementation sketch

- `<BackLink>` slot in `Onboarding.svelte` step container, rendered for steps 2-5.
- Click decrements `initialStep` URL param via `goto('/onboarding/<n-1>', { replaceState: false })`.
- Existing `{#key initialStep}` (added in 02.1-08 fly-transition) auto re-mounts
  the prior step component → probe / picker / list re-renders cleanly.
- Reduced-motion fallback already in place (motion.ts `prefersReducedMotion`).
- Cmd+R: re-introduce in `+layout.svelte` keyboard listener (currently only Cmd+Q wired).

## Dependencies

- D-06 reversal decision (part of Phase 3 entry decisions).
- Phase 3 multi-session sidebar surfaces the broader keyboard-nav contract this
  Back button slots into.
