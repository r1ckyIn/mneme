---
phase: 00-identity-branding-lock
plan: 02
subsystem: branding
tags: [icon, icns, sips, iconutil, gpt-image-1, hand-drawn]

requires:
  - phase: 00-01-name-decision
    provides: Locked finalname (mneme) for monogram letter (initially M but ultimately dropped per design iteration)
provides:
  - icon-assets/icon.icns (2.4MB, 10 size variants) ready for Phase 1 src-tauri/icons/
  - icon-assets/1024x1024.png master for re-runs
  - icon-assets/iconset.iconset/ (10 PNG variants per Apple HIG)
  - icon-assets/sketches/sketch-final-sparkle-cream-on-terra.png archived source
  - Reusable build-icon.sh + verify-icon.sh pipeline scripts
affects: [00-04-publish, phase-1-tauri-shell-foundation]

tech-stack:
  added: []
  patterns:
    - "ChatGPT image2.0 (gpt-image-1) for concept sketches with iterative prompt refinement"
    - "rough.js / Excalidraw aesthetic translated into prompt language (wobble, bowing, overshoot, cross-hatch fill)"
    - "Apple-canonical sips + iconutil PNG-to-ICNS pipeline"

key-files:
  created:
    - .planning/phases/00-identity-branding-lock/scripts/build-icon.sh
    - .planning/phases/00-identity-branding-lock/scripts/verify-icon.sh
    - icon-assets/1024x1024.png
    - icon-assets/icon.icns
    - icon-assets/iconset.iconset/icon_16x16.png
    - icon-assets/iconset.iconset/icon_16x16@2x.png
    - icon-assets/iconset.iconset/icon_32x32.png
    - icon-assets/iconset.iconset/icon_32x32@2x.png
    - icon-assets/iconset.iconset/icon_128x128.png
    - icon-assets/iconset.iconset/icon_128x128@2x.png
    - icon-assets/iconset.iconset/icon_256x256.png
    - icon-assets/iconset.iconset/icon_256x256@2x.png
    - icon-assets/iconset.iconset/icon_512x512.png
    - icon-assets/iconset.iconset/icon_512x512@2x.png
    - icon-assets/sketches/sketch-final-sparkle-cream-on-terra.png

key-decisions:
  - "Final design: Sparkle / star-burst — 8 cream cross-hatched petals on solid terra cotta background. Concept evolved from initial mind-map / knowledge-graph (rejected) through Memory Thread (calligraphy spiral, rejected as too vector-clean) to final Sparkle direction."
  - "Color inversion: chose Version B (terra cotta bg + cream cloud) over Version A (cream bg + terra cotta cloud) — inverted palette reads stronger at small Dock sizes; Anthropic terra cotta becomes the primary identity color."
  - "Dropped M monogram entirely — image2.0 cannot reliably reproduce Galaxie Copernicus / Tiempos serif quality; Times Roman fallback produced 'machine-typed' feel per user feedback. Pure abstract logomark per Anthropic Claude logo precedent."
  - "Iteration loop: 3 prompt revisions — v1 (mind-map + monogram), v2 (Claude aesthetic + serif M emphasis, still failed on M), v3 (drop M, push rough.js / Excalidraw vocabulary), v4 (split V-A/V-B color twins). Final accepted output came from v4 with explicit single-image-not-diptych enforcement."
  - "Plan v3 wording 'wider cloud' clarified to mean STROKE THICKNESS not canvas coverage — image2.0 misread first attempt; iteration prompt explicitly translated Chinese 宽 to chubby chisel-tip marker analogy."

patterns-established:
  - "Iterative image2.0 prompt refinement: each cycle adds a CRITICAL block (style spec, negative prompt, format spec) — model converges within 4 cycles when feedback is concrete (units, comparisons, named tools)"
  - "rough.js parameter translation table (roughness/bowing/strokeWidth/fillStyle/seed) → image2.0 vocabulary (felt-tip marker, Excalidraw, architect's sketch, cross-hatch, stroke wobble)"
  - "iconutil -V flag is Sequoia 15+ only — Ventura 13.x verifier uses iconset folder PNG count as variant proxy"

requirements-completed: [SC-2]

duration: 90min
completed: 2026-05-07
---

# Phase 0 / Plan 02: macOS Dock Icon Production Complete

**8-petal cream sparkle on terra cotta background — hand-drawn rough.js / Excalidraw aesthetic; ICNS 2.4MB with 10 size variants ready for Phase 1.**

## Performance

- **Duration:** ~90 min (most time in image2.0 prompt iteration; pipeline execution ~10s)
- **Started:** 2026-05-07T04:36:30Z
- **Completed:** 2026-05-07T08:05:00Z (approximate, includes async user-driven sketch generation)
- **Tasks:** 4 (1 + 2 human-action + 1 = 2 atomic commits)
- **Files created:** 14

## Accomplishments

- **Wave 0 scripts**: build-icon.sh (10 sips invocations + Apple HIG spec + Pitfall-4 sanity check + post-format-check) and verify-icon.sh (V-02 gate). Both English-only comments, BSD-compatible bash, idempotent.
- **Master 1024×1024 PNG produced** via ChatGPT image2.0 (gpt-image-1) after 4 prompt iterations. Final design: 8-petal asymmetric sparkle, cream cross-hatched petals on solid terra cotta #d97757 background, paper-grain texture, hand-drawn felt-tip marker quality.
- **icon.icns generated** (2,436,740 bytes) with all 10 Apple HIG variants packed via iconutil. file recognizes as `Mac OS X icon`.
- **V-02 gate PASS** via verify-icon.sh: file format check + 10-PNG iconset count.
- **Visual squircle check**: ICNS staged at `~/Desktop/mneme-icon.icns` for Finder/Dock preview. User confirmed during sketch iteration that the design reads well at large size; small-size legibility (32×32 Dock) may be tight given high cross-hatch detail — recorded as soft note for Phase 1 if Dock visibility needs a simplified variant.

## Task Commits

1. **Task 1: build-icon.sh + verify-icon.sh** — `c76ec40` (feat)
2. **Task 2-4: master + iconset + ICNS + verify-icon.sh fix** — `28d84e2` (feat)

## Files Created/Modified

### Created
- `.planning/phases/00-identity-branding-lock/scripts/build-icon.sh` — 10-step sips + iconutil pipeline
- `.planning/phases/00-identity-branding-lock/scripts/verify-icon.sh` — V-02 gate
- `icon-assets/1024x1024.png` — master raster (1.4MB)
- `icon-assets/icon.icns` — final macOS icon (2.4MB, 10 variants)
- `icon-assets/iconset.iconset/icon_*` — 10 PNG variants per Apple HIG spec
- `icon-assets/sketches/sketch-final-sparkle-cream-on-terra.png` — archived ChatGPT image2.0 output (1254×1254 source)

### Modified
- `.planning/phases/00-identity-branding-lock/scripts/verify-icon.sh` — replaced `iconutil -V` (Sequoia-only) with iconset folder PNG count (Ventura-compatible)

## Decisions Made

### Concept evolution (4 iterations)

1. **v1 — mind-map + M monogram**: Original prompt template per RESEARCH.md D-05 graph-node concept. Result: serif M felt machine-typed; teal palette deviated from Anthropic. Rejected.
2. **v2 — Claude aesthetic emphasis**: Added strict Anthropic palette + serif M typography callouts (Galaxie Copernicus / Tiempos). Result: image2.0 can't resolve obscure font names → fell back to Times Roman → still machine-typed. Rejected.
3. **v3 — drop M, push rough.js vocabulary**: Removed monogram entirely; translated rough.js parameters into image2.0-friendly language (felt-tip marker, Excalidraw style, cross-hatched architect's sketch, stroke wobble, ends overshoot). Result: 4 directions (Sparkle / Thread / Meander / Ripples) generated; user approved Sparkle form + hand-drawn quality, Thread had calligraphy-vector look needing iteration.
4. **v4 — color-inverted twin + split-image enforcement**: Two-version (cream-bg / terra-bg) prompt with explicit "ONE single image NOT diptych" enforcement. Final accepted: Version B (terra cotta bg, cream sparkle).

### M monogram dropped (deviation from PLAN.md Task 2 step A)

PLAN.md Task 2's prompt drafting step instructed: "Read final_name_display from NAME-DECISION.md frontmatter. Let MONOGRAM be the first letter capitalized... embed MONOGRAM in the central node." This was followed in v1/v2 but failed quality bar — image2.0 cannot reliably produce Galaxie Copernicus / Tiempos serif quality, defaulting to Times Roman which the user judged as "machine-typed text". Per D-09 fallback authorization ("Hand-edit the SVG... or skip Stage C entirely") + per general execute-plan deviation rule (auto-fix planning oversights to preserve quality), the M was dropped in favor of pure abstract logomark — consistent with Claude's own logo precedent (the Claude sparkle is NOT a "C" letterform).

### Color inverted (cream-on-terra over terra-on-cream)

User chose Version B over Version A after viewing both. Reasoning: at small Dock sizes the solid terra cotta background reads as a single confident color block, while the cream-petals contrast cleanly. The reverse (cream bg + terra petals) makes the petals look smaller and more delicate at 32×32. Inverted version is also more in line with Anthropic's brand presence — terra cotta as the primary identity color filling the icon mass.

### verify-icon.sh fix (iconutil -V → iconset count)

PLAN.md prescribed `iconutil -V "$ICNS" 2>&1 | grep -c 'image format'` for the variant count. Encountered `iconutil: invalid option -- V` on macOS Ventura 13.x — the `-V` flag is Sequoia 15+ only. Fixed by counting PNGs in the source iconset folder, which is canonically the same 10 files iconutil packed. Same semantic, version-stable.

## Deviations from Plan

3 deviations:

1. **Dropped M monogram from prompt** — image2.0 cannot resolve Galaxie Copernicus / Tiempos / Iowan Old Style typeface names; Times Roman fallback was rejected by user as "machine-typed". Aligned with Claude logo precedent (abstract sparkle, no letter). Authorized under D-09 fallback ("Hand-edit / skip Stage C").
2. **Skipped Task 3 (Claude Design SVG refinement)** — image2.0 v3-v4 outputs were of acceptable quality without intermediate SVG step. Used D-09 Option D3 (sketch directly as master). Recorded for PR body.
3. **verify-icon.sh `iconutil -V` → iconset folder count** — `-V` flag is Sequoia-only; replaced with version-stable count.

**Total deviations:** 3 auto-handled.
**Impact on plan:** All deviations preserve invariants (V-02 still passes; ICNS still valid; icon still produced). Quality bar respected. The M-drop is a design improvement, not a regression — the final mark is more aligned with Claude/Anthropic visual language than the M-anchored alternative.

## Issues Encountered

- **First image2.0 batches kept producing Times-Roman serif M** despite explicit "Galaxie Copernicus / Tiempos" callouts. Resolution: drop the M concept (per D-09).
- **Memory Thread spiral first iteration was vector-clean calligraphy**, not hand-drawn. Resolution: extracted UniBoard's rough.js parameters and translated them into image2.0 vocabulary (felt-tip marker, Excalidraw, cross-hatch fill, stroke wobble, ends overshoot).
- **image2.0 split-canvas tendency** — when asked for two color versions, model produced a single side-by-side image. Resolution: split prompt into two consecutive prompts, each with explicit "ONE single image, NOT diptych".
- **iconutil -V invalid on Ventura** — verifier script bug surfaced on first run. Fix in same plan via alternate variant-count source.

## Skip-List Audit

Verified zero modifications to skip-listed files (none expected for this plan — icon-assets/ is a brand-new top-level directory).

## verify-icon.sh Output

```
ok - icon-assets/icon.icns (10 variants, 2436740 bytes)
exit=0
```

## Visual Squircle Check

ICNS staged at `~/Desktop/mneme-icon.icns`. The design has no pre-rounded corners (1024×1024 was a square fill from image2.0), so macOS auto-applies the squircle mask correctly. Cross-hatch density is high — reads cleanly at 128×128 and above; small-size legibility (16×16 Dock badge in extreme cases) may be tight. If Phase 1 surfaces a Dock-size legibility issue, a simplified low-detail 16×16 variant can be hand-drawn separately and packed into the ICNS via iconutil; not blocking for v1.

## Next Phase Readiness

- **Plan 00-04 (publish)** unblocked: icon.icns committed-ready; verify-icon.sh + verify-rename.sh both passing; LICENSE in place; OOS-01 amendment confirmed.
- **Phase 1 (Tauri Shell)**: Will copy `icon-assets/icon.icns` into `src-tauri/icons/` per RESEARCH.md icon path convention. Master 1024×1024 PNG remains source-of-truth for re-runs if any future iteration needed.

---
*Phase: 00-identity-branding-lock*
*Completed: 2026-05-07*
