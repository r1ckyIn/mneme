---
created: 2026-05-07T06:01:16.927Z
title: Triage awesome-design-md vs awesome-claude-design for KD-13
area: planning
files:
  - .planning/dependencies.md (Group 9 + Group 10)
  - .planning/references/design/anthropic-claude-aesthetic-deep-dive_zh.md
  - .planning/references/design/claude-aesthetic-ui-libraries-gallery.html
  - .planning/PROJECT.md (KP-09 + KD-13)
---

## Problem

User surfaced a third candidate reference today (2026-05-07): `VoltAgent/awesome-design-md` — a generic collection of brand DESIGN.md files (Cohere, ElevenLabs, Linear, Stripe, etc.) that includes a `design-md/claude/` subfolder (2 files: `DESIGN.md` + `README.md`). Question was whether it adds anything to the two existing Claude-aesthetic references already at `.planning/references/design/`.

Web triage findings:

1. **Two related VoltAgent repos exist:**
   - `VoltAgent/awesome-design-md` — generic parent (multiple aesthetic families incl. a small `claude/` folder, 2 files)
   - `VoltAgent/awesome-claude-design` — specialized sibling, **68 ready-to-use DESIGN.md files** across 11 aesthetic families (AI/LLM, devtools, productivity, fintech, etc.), MIT license, ~2k stars

2. **The specialized sibling is already tracked** in `dependencies.md` Group 10 (KD-13 starting libraries) with last-checked 2026-05-07 and integration mode `reference-only`. The parent (`awesome-design-md`) is **not** currently in `dependencies.md`.

3. **Shape difference vs existing references:**
   - `anthropic-claude-aesthetic-deep-dive_zh.md` — 7-chapter design philosophy / team / color / typography deep-dive (theory + history)
   - `claude-aesthetic-ui-libraries-gallery.html` — 9 OSS UI libraries gallery (visual implementations)
   - VoltAgent DESIGN.md format — **executable prompts** that coding agents (Claude Code, etc.) can ingest to scaffold a UI in one shot (third axis: action-oriented)

4. **Pre-decision: not blocking.** mneme is currently on milestone v5.3.2, has not entered UI/frontend phase yet (Phase 8+ per ROADMAP). KD-13 already locks the Anthropic/Claude aesthetic family at the principle level with the two existing references as SSOT. This triage is for the moment we actually consume the references during a `/gsd-ui-phase` run.

## Solution

Defer decision to UI-phase entry. At that trigger:

1. **Diff the two VoltAgent Claude DESIGN.md sources** — fetch both `awesome-design-md/design-md/claude/DESIGN.md` (parent) and `awesome-claude-design/design-md/<claude-path>/anthropic-claude.md` (specialized), compare content and recency.

2. **Cross-check vs existing deep-dive** — verify token values (`#d97757` orange, `#f5f4ed` cream, etc.), typography (Styrene/Tiempos/Galaxie Copernicus or Poppins/Lora fallback), motion (`cubic-bezier(0.165, 0.85, 0.45, 1)`), shadow signature (`0 0 0 1px` ring) all match the SSOT in `anthropic-claude-aesthetic-deep-dive_zh.md`. Anthropic primary brand-guidelines repo wins ties (per `dependencies.md` Group 9 authority rule).

3. **If specialized version is a strict superset of parent → drop parent**, keep `awesome-claude-design` row in Group 10 as the only VoltAgent entry. **If parent has unique content** (e.g. cross-aesthetic comparison data useful to KP-09 alignment checks) → add parent as a separate row in Group 10 with `integration mode: reference-only` and `last-checked: <today>`.

4. **If the chosen DESIGN.md is good enough as a `/gsd-ui-phase` scaffold prompt** → copy into `.planning/references/design/anthropic-claude-DESIGN.md` (or similar), add to Group 9 alongside the two existing references; flag as `Tertiary — executable prompt format` to keep authority order clear (deep-dive > gallery > scaffold prompt; Anthropic first-party `brand-guidelines` repo overrides all three on conflict).

5. **Re-validate KP-09 + KD-13** — confirm no aesthetic drift was introduced (no off-family color tokens, no Inter/Arial fallbacks creeping back in, no tldraw-style proprietary watermark contamination).

Trigger: pin to first `/gsd-ui-phase N` invocation, or earlier if user manually requests an aesthetic consolidation pass.
