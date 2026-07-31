---
phase: 02
slug: vault-canvas-ed-sync-onboarding
status: reviewed
scored: true
audited_at: 2026-05-17
surfaces_audited: 9
overall_score: 14
baseline: 02-UI-SPEC.md (approved 2026-05-15, 1521 lines, 9 surfaces)
screenshots: not captured (no dev server at ports 3000 / 5173)
registry_audit: not applicable (shadcn not initialized; all components hand-authored)
---

# Phase 02 — UI Review

**Audited:** 2026-05-17
**Baseline:** `02-UI-SPEC.md` (approved 2026-05-15)
**Screenshots:** not captured — no dev server detected. Audit is code-only + dogfood signal from phase context.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Voice is calm and precise; 3 copy deviations from spec contract (loading-state validation text color not copy) |
| 2. Visuals | 2/4 | DropzoneOverlay backdrop is cream not dark — overlay is invisible against the UI; step transitions not implemented |
| 3. Color | 2/4 | Two token violations: `--color-success` used outside onboarding in VaultCategory; `#4ea36b` hardcoded in TitlebarMeta instead of `var(--color-success)` |
| 4. Typography | 3/4 | Font trio (serif/sans/mono) fully token-based; CTA font-family deviates from spec intent on onboarding steps |
| 5. Spacing | 3/4 | Overwhelmingly token-based; two hardcoded values (`2px 6px` inline code padding, `4px` chip padding) |
| 6. Experience Design | 2/4 | Missing step transition animations; ImportStatusPill lacks icon prefixes and state-specific backgrounds; SettingsPanel rail missing focus-visible ring; Step3 loading state shows error-red; AuthCheck real-world detection fails on keychain-only installs |

**Overall: 14/24**

---

## Top 5 Priority Fixes

1. **DropzoneOverlay.svelte:80 — background: var(--color-cream) makes the overlay invisible** — the user sees a plain white flash instead of the spec's `rgba(20,20,19,0.45)` dark semi-transparent backdrop; the "Drop to import" hero text becomes unreadable against the main-shell content behind it. Change to `background: rgba(20, 20, 19, 0.45); backdrop-filter: blur(4px);` and add the missing arrow icon + sublabel per §8.4.

2. **VaultCategory.svelte:192 + 370-371 — `--color-success` used for move-complete feedback** — spec §4 explicitly reserves `#4ea36b` for onboarding validation only (Step 2, 3, 5). "Move vault complete" feedback in Settings is not an onboarding validation state. Change `.status.success { color: var(--color-success) }` to `var(--color-warm-dark-soft)` with a checkmark prefix, or use `--color-warm-dark` for the success text.

3. **Step3VaultPicker.svelte — missing "Choose another folder" secondary text link** — spec §8.1.3 shows a secondary ghost-link below "Use this path" CTA. Without it the only re-entry path for changing a Browse-chosen path is clicking Browse again, which is not communicated to the user. Add `<button type="button" class="ghost-link" onclick={browse}>Choose another folder</button>` below `.cta`, matching the Step 5 ghost-link pattern.

4. **ImportStatusPill.svelte — missing icon prefixes and state-specific backgrounds** — spec §8.5 shows `◐ importing…` (orange), `✓ imported N` (cream-deep bg), `! N errors` (cream bg + error left rule), `⊘ cancelled` (cream-deep bg). The implementation renders text-only, no icon, no background shift between states. The spinner for importing-state is also absent. Fix: add status-icon span per state, add `.pill[data-status="importing"] { background: var(--orange-soft); }` and `.pill[data-status="imported"] { background: var(--color-cream-deep); }`.

5. **Onboarding.svelte — zero step-transition animation** — spec §8.1 requires `opacity 0→1 + translateY(8px)→0` on step entry and `opacity 0 + translateY(-8px)` on exit, both gated by `@media (prefers-reduced-motion)`. The current SvelteKit route navigation produces a hard-cut with no motion. Add Svelte `in:fly` / `out:fly` directives or CSS animation classes on the step body container in `Onboarding.svelte:157-186`, using `--duration-base` for entry and `--duration-fast` for exit.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Score rationale:** The voice across all 9 surfaces is consistent: calm, direct, product-specific. Spec-mandated CTA strings, empty-state headings, error messages, and placeholder copy are faithfully reproduced. The "No imports yet." empty state, "Import N files" dynamic CTA, and per-category coming-soon phrasing all match §10.11-10.13 verbatim. Three specific deviations found:

**WARNING — Step6DemoImport.svelte:61** body copy reads `"Click Browse to pick a file from your computer. Skip if you'd rather not."` — spec §8.1.6 says `"Drop a file from your computer to see how importing works. Skip if you'd rather not."`. The "drop" framing is intentional (sets expectations for the main-app experience) even though the actual dropzone in Step 6 is browse-only per BLK-3 resolution. Fix: restore spec wording or document the deviation.

**WARNING — Step2AuthCheck.svelte:78** not-found state renders `"Claude CLI not detected."` then sublabel `"Run \`claude --version\` in Terminal first, then return here."` — this is a two-element render split across status-main and status-sub, not the single combined string in spec §8.1.2. Screen readers will read two pauses. Merge into a single `<div class="status-main">Claude CLI not detected. Run \`claude --version\` in Terminal first, then return here.</div>`.

**INFO — ImportHistoryModal.svelte:55** modal title is `"Recent imports"` but spec §8.6 header copy is `"Import history"`. Spec wins on divergence (§Implementation Note). Fix: change h2 text.

**Dogfood #6 absorbed:** the import error classifier fallback `"Something went wrong while importing. Check the console for details."` (in `src/lib/import-error.ts`) is too generic — users cannot recover without devtools. This is classified as a copywriting defect for fallback error messages. Fix: surface the raw classified error reason in the friendly-error block.

---

### Pillar 2: Visuals (2/4)

**Score rationale:** The three-pane shell, settings panel 880×600 grid, and onboarding wizard frame are all geometrically faithful to the spec. The component visual hierarchy — wordmark → headline → body → CTA → step rail — is correctly layered. Two significant deviations degrade the anti-template quality claim:

**BLOCKER — DropzoneOverlay.svelte:80** `background: var(--color-cream)` renders the full-window drag overlay as an opaque cream-colored screen with black "Drop to import" text. Spec §8.4 requires `rgba(20,20,19,0.45)` + `backdrop-filter: blur(4px)` so the user can see the main UI ghosted behind, making the overlay feel like a target landing zone rather than a blank wall. The current implementation is the opposite of the spec intent. The arrow icon is also missing (spec: 64×64, stroke 2px, --color-cream); and the sublabel `"Files land in your selected course and category — pick on the next screen."` is absent. Fix: `src/lib/components/dropzone/DropzoneOverlay.svelte:77-93` — change `.overlay { background: rgba(20, 20, 19, 0.45); backdrop-filter: blur(4px); }`, add `.hero { color: var(--color-cream); }` (text is currently `--color-warm-dark` which would be invisible against the dark overlay), add SVG arrow above hero, add sublabel div.

**WARNING — Onboarding.svelte:157-186** no step-level transition animation. SvelteKit's `/onboarding/[step]` route changes cause a full hard-cut between steps. Spec §8.1 explicitly defines `opacity 0→1 + translateY(8px)→0` entry and matching exit animations. A bare SvelteKit route change does nothing. The wizard feels abrupt as a result — each step just snaps in. The reduced-motion path (from `@media prefers-reduced-motion`) is also unimplemented.

**INFO — SettingsPanel.svelte:158-213** panel open/close has no `opacity + scale(0.96→1)` animation. Spec §8.2 motion: "panel `opacity 0 + scale(0.96) → opacity 1 + scale(1)` over `--duration-base`". The Svelte `{#if panelOpen}` block just shows/hides instantaneously.

**INFO — Step3VaultPicker.svelte:140-146** loading-state validation shows the `!` icon in `--color-error` (red) while the path is still resolving. The text says "Loading default location…" but the icon and color communicate "error". Should use muted neutral color for the indeterminate loading state. Fix: add a `loading` validation kind or change validation initialization to use `kind: "loading"` with muted styling.

---

### Pillar 3: Color (2/4)

**Score rationale:** The KD-13 60/30/10 split is correctly applied in ~90% of uses: cream backgrounds, cream-deep surfaces, orange only on primary CTAs and status indicators. Token discipline is strict — no `#000`, no `#fff`. Two violations found that cross the spec's "reserved" boundaries:

**BLOCKER — VaultCategory.svelte:192, 370-371** `--color-success` (`#4ea36b`) applied to the vault-move success status message:
```css
.status.success { color: var(--color-success); }
```
Spec §4 color section (line 148-153): `"--color-success is NOT a general success accent for the rest of the app... Reserved-for list is exhaustive: no other surface in Phase 2 uses #4ea36b."` The three reserved sites are Step 2 auth dot, Step 3 vault path checkmark, Step 5 course validation. A vault move in Settings is not in the exhaustive list. Fix: change to `var(--color-warm-dark-soft)` (soft success text tone matching the "imported" pill state).

**WARNING — TitlebarMeta.svelte:132** hardcoded `background: #4ea36b` for the connected-state dot instead of `var(--color-success)`:
```css
.dot[data-status="connected"] {
  background: #4ea36b;
```
This predates the `--color-success` token addition and was not reconciled during Phase 2. Fix: `background: var(--color-success);`. (The `rgba(78, 163, 107, 0.18)` ring value is a documented carve-out from 02-09-PLAN.md L1023 since no `--color-success-ring` token exists — acceptable.)

**WARNING — ImportDialog.svelte:284** backdrop `background: rgba(20, 20, 19, 0.32)` is hardcoded instead of token-based. The spec §4 documents this exact value and there is no dedicated token for dialog veil in `tokens.css`. This is the same pattern across SettingsPanel:219, ImportHistoryModal:105, VaultCategory:379 — consistent but untokenized. Minor; recommend adding `--veil: rgba(20, 20, 19, 0.32)` to `tokens.css` so future phases don't each hardcode this.

**INFO — ToolUseGroup.svelte:186** (Phase 1 component) `color: #4ea36b` used outside Phase 2 scope. Not a Phase 2 finding but noted for completeness.

**INFO — Step2AuthCheck.svelte:180** `.status-sub code { padding: 2px 6px }` — spacing tokens: `2px = --space-1/2` (not in scale), `6px` (not in scale). The 4px multiple scale has `--space-1 = 4px`; `2px` and `6px` are non-multiples. Fix: `padding: 1px var(--space-1)` (acceptable 1px vertical for inline code pill).

---

### Pillar 4: Typography (3/4)

**Score rationale:** The three-font KD-13 stack (serif/sans/mono) is consistently tokenized across all 9 surfaces. Font size usage stays within the 4-size cap (meta 14px, body 16px, heading 20px, display 28px) with no 5th size introduced. Weights stay within 2 (regular 400, semibold 600).

**WARNING — Step1Welcome.svelte:94** the primary CTA uses `font-family: var(--font-serif)` but spec §8.2 UI labels note says: `"UI labels (settings rail items, buttons, form labels) use --font-sans at 14px / 400"`. Onboarding CTAs in Step1–6 all use `--font-serif` at `--fs-body` (16px). This creates a heavier-weight CTA feel (Tiempos Text at 16px weight-400 vs system-ui at 14px). The spec text is somewhat ambiguous — it says "UI labels" but also says the onboarding CTA is 200px wide at 16px. The onboarding CTA reads as body copy, not a label. Partial compliance; the distinction only matters because the spec explicitly carves out "buttons" from font-sans. **Recommend:** change onboarding CTA `font-family` to `var(--font-sans)` at `--fs-body` to match Settings CTAs and ImportDialog CTAs (both already use `--font-sans`).

**WARNING — ImportDialog.svelte:392-400** category radio `.opt` uses `font-family: var(--font-serif); font-size: var(--fs-body)` (16px serif) — spec §8.3 says category radios use `--font-sans` 14px. The course picker radios would match (they use serif at body size) but category choices like "Lectures" should use `--font-sans` meta size since they are UI labels, not reading text. Fix: `.opt .cap { font-family: var(--font-sans); font-size: var(--fs-meta); }` — the `.cap` span is already there, just missing the font override.

**INFO — ImportHistoryModal.svelte:199** `.target` uses `font-family: var(--font-sans)` for the `course/category` column. Spec §8.6 doesn't explicitly specify this column's font. The timestamp column correctly uses mono. Acceptable.

---

### Pillar 5: Spacing (3/4)

**Score rationale:** Overwhelming token compliance. `--space-1` through `--space-10` are used consistently. Spacing is deliberately rhythmical and matches spec §3 scale. Two hardcoded non-token values found:

**WARNING — Step2AuthCheck.svelte:180** `.status-sub code { padding: 2px 6px }` — both values are outside the 4px-multiple spacing scale. `2px` is `--space-1/2`, `6px` is between `--space-1` (4px) and `--space-2` (8px). Fix: `padding: 1px var(--space-1)` or `var(--space-1) var(--space-2)`.

**WARNING — Step5AddCourse.svelte:199** `.chip { padding: 4px var(--space-2) }` — the `4px` is `--space-1` and could be tokenized: `padding: var(--space-1) var(--space-2)`. Minor but inconsistent with total token discipline elsewhere.

**INFO — ImportHistoryModal.svelte:118** `.modal { grid-template-rows: 56px 1fr }` uses hardcoded `56px` for the header height. Spec §8.6 defines the header as 56px — this is a spec-value literal, not an arbitrary number. However, it creates a dependency: if the header height token ever moves, this breaks silently. Consider a local `--settings-header-h: 56px` or re-using the pattern from SettingsPanel which has the same 56px header height.

**INFO — Step1Welcome.svelte:58** the parent flex container uses uniform `gap: var(--space-5)` (20px) for all inter-element spacing. The spec describes distinct gaps: `--space-6` (24px) between wordmark and headline, `--space-5` between headline and body, `--space-10` (40px) before CTA. The implementation achieves the wordmark→headline gap via `gap: space-5 + margin-bottom: space-1 = 24px = space-6` (mathematically correct but roundabout). The body→CTA gap is `gap(20) + cta-margin-top(20) = 40px = space-10` (correct by accident of double-spacing). These work out numerically but the approach is fragile — removing the margin-bottom on wordmark would break the wordmark-to-headline gap. **Recommend:** implement each inter-element gap explicitly to match spec intent.

---

### Pillar 6: Experience Design (2/4)

**Score rationale:** The functional flows (onboarding persistence, import pipeline, reconciliation, drag-drop, settings vault category) are mechanically complete. Loading/error/empty states exist on all critical paths. However, four interaction-design failures degrade the quality below a 3: missing step animations, incomplete pill states, missing focus ring on settings rail, and the loading-state false-error color.

**BLOCKER — DropzoneOverlay.svelte:70-93** (also classified under Visuals) — the overlay backdrop color is cream, so when a user drags files over the window they see the main UI go momentarily cream-white rather than the intended semi-transparent dark scrim. This makes the feature feel broken. (Dogfood finding #2 complement.)

**WARNING — ImportStatusPill.svelte** — four experience gaps:
1. Missing spinner animation in `importing` state (spec §8.5 L1023: "12px circle, 1.5px arc spinning at `--color-orange`"). The pill shows just text, no spinner.
2. Missing icon prefixes: `◐` for importing, `✓` for imported, `!` for partial, `⊘` for cancelled.
3. `importing` state has no background — spec says `background: var(--orange-soft)`. Pill is invisible-feeling without bg.
4. `imported` state has no background — spec says `background: var(--color-cream-deep)`.

**WARNING — SettingsPanel.svelte:279-303** — rail items have no `focus-visible` rule. Any user pressing Tab to navigate settings categories gets a browser-default outline (inconsistent with the `--orange-ring` focus standard everywhere else in Phase 2). Fix: add `.rail-item:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--orange-ring); }`.

**WARNING — Step3VaultPicker.svelte:46-49, 234-236** — during the async `homeDir()` resolution window (< 100ms typically, but longer on slow machines), the validation state is `kind: "invalid"` with `color: var(--color-error)` (red). The text says "Loading default location…" but the icon is `!` in error-red. The user sees a red error message before any mistake. Fix: add a `"loading"` validation kind with `--color-warm-dark-mute` color and no `!` icon.

**WARNING — Dogfood #5 (AuthCheck) absorbed:** `Step2AuthCheck.svelte` detects Claude CLI via `claude_auth_check` Rust command which checks `~/.claude/.credentials.json`. Live macOS Claude Code stores auth in the macOS keychain, not this file. A fresh install will have no `.credentials.json`, causing Step 2 to show `not-found` even when Claude is properly authenticated. This blocks first-time users at the second onboarding step with no way to continue (CTA is disabled on `not-found`). The check needs to fall back to `claude --version` subprocess call or keychain API.

**WARNING — Dogfood #7 (course code regex) absorbed:** `validateCourseCode` in both `src/lib/onboarding-validation.ts` and the inline copy in `VaultCategory.svelte:48` uses `^[A-Z]{4}\d{4}$`. This rejects USYD semester-coded courses like `BIOL2010S2`, `COMP3027L`, and any 9-10 character codes with suffix. Even the dogfood test code `DOGFOOD101` (7+3 char) failed. Fix: relax to `^[A-Z]{2,4}\d{4}[A-Z0-9]{0,4}$` or remove the validation gate and let `course_create` handle non-standard codes gracefully.

**INFO — ImportHistoryModal.svelte:118** missing footer row with `[Close]` button — spec §8.6 ASCII layout shows an explicit 56px footer row with a `[Close]` CTA. The implementation only has a `×` icon-button in the 56px header. This is a minor UX gap (Esc and backdrop-click both close), but spec-non-compliant. The grid should be `grid-template-rows: 56px 1fr 56px` with a footer.

**INFO — ImportDialog.svelte:182** file rows do not show file size. Spec §8.3 ASCII shows `lecture1.pdf  3.2 MB` and `tutorial2.pdf  890 KB` format. The implementation shows only the filename. File size is not available from `paths: string[]` prop without a Tauri IPC call (would require a new `get_file_sizes` command). Deferrable to Phase 3.

**INFO — ImportDialog.svelte:393, spec §8.3 L894** category radios are rendered as a vertical block stack (`.opt { display: flex; align-items: center }` inside section with no flex-wrap). Spec says "Horizontal flex-wrap pill row". The 5 radios in vertical stack make the dialog ~100px taller than spec (5×36=180px vs ~72px for horizontal-wrapped). Fix: `.category-picker { display: flex; flex-wrap: wrap; gap: var(--space-2); }` and `.opt { display: inline-flex; padding: var(--space-1); border-radius: var(--radius-md); }`.

**INFO — Dogfood #8 (import error fallback) absorbed:** `src/lib/import-error.ts` produces generic message "Something went wrong while importing. Check the console for details." for unrecognized error patterns. During dogfood, `invalid course code: "DOGFOOD101"` was only visible in devtools. This is a copywriting + UX gap: the `classifyImportError` pattern list should surface the raw classified reason in the friendly-error block.

---

## Files Audited

**Onboarding wizard:**
- `src/lib/components/onboarding/Onboarding.svelte` (202 lines)
- `src/lib/components/onboarding/OnboardingStepRail.svelte` (88 lines)
- `src/lib/components/onboarding/Step1Welcome.svelte` (112 lines)
- `src/lib/components/onboarding/Step2AuthCheck.svelte` (222 lines)
- `src/lib/components/onboarding/Step3VaultPicker.svelte` (266 lines)
- `src/lib/components/onboarding/Step4MCPStatus.svelte` (147 lines)
- `src/lib/components/onboarding/Step5AddCourse.svelte` (312 lines)
- `src/lib/components/onboarding/Step6DemoImport.svelte` (208 lines)
- `src/routes/onboarding/+layout.svelte`
- `src/routes/onboarding/[step]/+page.svelte`

**Settings:**
- `src/lib/components/SettingsPanel.svelte` (312 lines)
- `src/lib/components/settings/VaultCategory.svelte` (484 lines)
- `src/lib/components/settings/AppearanceCategory.svelte`
- `src/lib/components/settings/KeybindingsCategory.svelte`
- `src/lib/components/settings/ComingSoonCategory.svelte`

**Import surfaces:**
- `src/lib/components/ImportDialog.svelte` (485 lines)
- `src/lib/components/ImportStatusPill.svelte` (87 lines)
- `src/lib/components/ImportHistoryModal.svelte` (235 lines)
- `src/lib/components/ReconciliationOverlay.svelte` (106 lines)
- `src/lib/components/dropzone/DropzoneOverlay.svelte` (93 lines)

**Modified shell components:**
- `src/lib/components/TitlebarMeta.svelte` (166 lines)
- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`

**Design tokens:**
- `src/lib/styles/tokens.css` (233 lines)

**Design contract:**
- `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-UI-SPEC.md` (1521 lines)
- `.planning/phases/02-vault-canvas-ed-sync-onboarding/02-REVIEW.md` (code-review findings)
