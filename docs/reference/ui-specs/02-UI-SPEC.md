---
phase: 02
slug: vault-canvas-ed-sync-onboarding
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-15
reviewed_at: 2026-05-15
revision: 1
---

# Phase 2 — UI Design Contract

> Visual + interaction contract for the seven new Phase 2 surfaces (onboarding wizard, settings panel, import dialog, dropzone overlay, status pill, history modal, TitlebarMeta updates). Drafted by gsd-ui-researcher, verified by gsd-ui-checker.
>
> **Pixel-faithful instruction.** Per user override 2026-05-15, this document — together with the locked visual SSOT bundle at `/Users/qinyuan/Downloads/Mneme 3/` — is the design SSOT for ALL seven Phase 2 surfaces. The planner / executor renders directly from this spec; the Mneme 3 bundle is the authoritative visual reference (8 HTMLs: main shell + 7 Phase 2 surfaces). When spec and bundle diverge, **this UI-SPEC.md wins** (see Implementation Note table below).

---

## Implementation Note — Handoff HTMLs vs UI-SPEC.md

**Locked visual SSOT bundle (2026-05-15):** `/Users/qinyuan/Downloads/Mneme 3/` — 8 HTML files from Claude Design Lab:

- `Mneme.html` — three-pane main shell (1840 LOC; Phase 1 baseline, unchanged content)
- `Mneme Onboarding.html` — 6-step onboarding wizard (§8.1)
- `Mneme Settings.html` — 8-category settings panel (§8.2)
- `Mneme Import Dialog.html` — import dialog + duplicate sub-dialog (§8.3 + §8.7)
- `Mneme Dropzone Overlay.html` — full-window dropzone (§8.4)
- `Mneme Status Pill.html` — TitlebarMeta status pill 4 states (§8.5 + §8.8)
- `Mneme Import History.html` — most-recent-20 history modal (§8.6)
- `Mneme Reconciliation.html` — startup reconciliation overlay (§8.9)

The bundle is **visual reference only**, lives at the user-managed Downloads path (path contains a space — shell quote as `~/Downloads/Mneme\ 3/` or `"~/Downloads/Mneme 3/"`), and is gitignored. **Where the bundle HTMLs and this UI-SPEC.md diverge, this UI-SPEC.md wins.**

Specific divergences executor MUST resolve in favor of UI-SPEC.md (handoff HTMLs are stale on these):

| HTML divergence | UI-SPEC.md rule (authoritative) | Source |
|-----------------|----------------------------------|--------|
| Titlebar shows `vault: ~/Mneme/usyd-2026s1` (Phase 1 legacy hardcode) across 5 HTMLs | `vault: ~/StudyVault` from live persisted config (REQ-1 + REQ-6 acceptance) | SPEC §11.1 |
| Settings → Sync placeholder labeled "Coming in Phase 3" | "Coming in v2. Sync between devices is a v2 feature. Mneme is single-device-first by design." | §10.11 |
| Settings → Privacy placeholder labeled "Phase 5" | "Coming in Phase 7." (KG ships data residency controls) | §10.11 |
| Settings → Advanced placeholder labeled "Phase 6" | "Coming in Phase 4+." | §10.11 |
| Settings → General / Sync / Claude / Privacy / Advanced placeholder body is one-line | Two-line per §10.11 (heading + explanatory subline) | §10.11 |
| Import Dialog Variant A (0-courses) footer has only `Open Settings` | Footer also includes secondary `Close` ghost-link | §10.13 |
| Duplicate sub-dialog footer has `Back to file list` ghost-link | Single `Continue` button — no Back-out (defends D-08 safety contract — Esc behaves as Skip+Cancel-rest per §8.7 L1147) | §8.7 |
| Duplicate sub-dialog rendered as independent modal in HTML | Implementation = nested overlay ON TOP of ImportDialog (ImportDialog stays mounted but inert behind) | §8.7 L1088 |
| `--veil: rgba(20, 16, 13, 0.32)` (Living token leak) | `rgba(20, 20, 19, 0.32)` (KD-13 form-isolation; D-17 dual-track) | §4 Color |
| Panel border uses `--color-cream-edge` solid color | `--border-soft` (`rgba(20, 20, 19, 0.08)` translucent) — token roles per `tokens.css` | §4 Color + tokens.css |
| Footer gap `14px` ad-hoc | `--space-3` (12px) — every spacing value is a multiple of 4 | §3 Spacing |
| File-name in import dialog rendered in `--font-serif` | `--font-mono` 14px — filenames carry underscores / case sensitivity | §8.3 |
| Section label `Files` | `Files to import` | §10.12 |
| Category radios `lectures · tutorials · …` (lowercase) | Sentence case — `Lectures · Tutorials · Assignments · Announcements · _inbox` | §10.12 |
| `_inbox` without annotation | `_inbox  (default — uncategorized)` with the parenthetical in `--color-warm-dark-mute` | §10.12 |

Where the HTMLs and this UI-SPEC.md **agree**, executor MAY copy visual choices verbatim from HTML (token usage, animation timings, layout proportions, ASCII layouts).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Svelte 5 + Tauri 2 stack — shadcn does not apply) |
| Preset | not applicable (manual `tokens.css` design system; KD-13 Anthropic/Claude family) |
| Component library | none (vanilla Svelte 5 components; scoped `<style>` per `.svelte` file) |
| Icon library | inline SVG only (24×24 viewBox, 1.5px stroke, `currentColor`) — NO library |
| Font (body) | `--font-serif` — Tiempos Text → Source Serif Pro → Charter → Iowan → Palatino → Georgia + CJK fallback |
| Font (UI / labels) | `--font-sans` — system-ui stack |
| Font (mono) | `--font-mono` — JetBrains Mono → SF Mono |
| Banned fonts | Inter, Arial (KP-09 — body safeguard at `tokens.css` L213) |
| Visual SSOT | `tokens.css` (token registry) + `/Users/qinyuan/Downloads/Mneme 3/` (locked bundle — 8 HTMLs covering main shell + 7 Phase 2 surfaces) + this document (Phase 2 design contract, wins on divergence) |
| Dual-track callout | Living visual contract (cream `#E6E3DC` + olive + Fraunces) is for TOOL HTML only (review / dogfood / handoff). Phase 2 mneme UI uses KD-13 exclusively. Permanent dual-track per 2026-05-14. |

---

## Spacing Scale

All values are multiples of 4 (✓ checker D5). Tokens already declared in `src/lib/styles/tokens.css` L43-51 — reference verbatim, do NOT redeclare:

| Token | Value | Phase 2 Usage |
|-------|-------|---------------|
| `--space-1` | 4px | Inline icon gaps, dot indicator offsets, focus-ring outer offset |
| `--space-2` | 8px | Compact element spacing inside pills, dialog row gutter |
| `--space-3` | 12px | Label-to-input gap, settings rail row vertical rhythm |
| `--space-4` | 16px | Default element spacing, titlebar padding, dialog inner padding |
| `--space-5` | 20px | Onboarding step body breathing room |
| `--space-6` | 24px | Section padding inside settings categories, dialog block separation |
| `--space-8` | 32px | Onboarding step inter-block spacing, settings category headers |
| `--space-10` | 40px | Onboarding hero-to-body gap, modal outer margins |

Exceptions:
- Onboarding hero vertical centering uses `min-height: 100vh` calc — interior spacing still snaps to the scale.
- Dialog backdrop is `position: fixed; inset: 0` (no spacing token — full viewport).

---

## Typography

4 sizes (cap = 4, ✓ checker D4). 2 weights (cap = 2). Line heights from `tokens.css` L146-147.

| Role | Size | Weight | Line Height | Font | Phase 2 Surfaces |
|------|------|--------|-------------|------|------------------|
| Meta / pill | `--fs-meta` (14px) | `--fw-regular` (400) | `--lh-body` (1.5) | `--font-mono` | Status pill, titlebar meta, history modal timestamps |
| Body | `--fs-body` (16px) | `--fw-regular` (400) | `--lh-body` (1.5) | `--font-serif` | All reading text — onboarding body copy, settings descriptions, dialog body, error messages |
| Heading | `--fs-h` (20px) | `--fw-semibold` (600) | `--lh-heading` (1.2) | `--font-serif` | Settings category headers, dialog titles, modal titles |
| Display | `--fs-display` (28px) | `--fw-regular` (400) for wordmark / `--fw-semibold` (600) for headlines | `--lh-heading` (1.2) | `--font-serif` | Onboarding wordmark (Step 1 `mneme`, weight 400), onboarding step hero headlines (e.g., "Let's set up your study vault.", weight 600), dropzone overlay hero line (`Drop to import`, weight 600) |

UI labels (settings rail items, buttons, form labels) use `--font-sans` at 14px / 400 — this is the same token as Meta but rendered in sans for chrome contrast against serif body. **Do not introduce a 5th size.**

Numeric content (file counts, KB sizes, progress N/M) uses `--font-mono` 14px for tabular alignment.

---

## Color

KD-13 60/30/10 split + form-isolation contract from Phase 1 D-22. All tokens already in `tokens.css` — reference verbatim.

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Dominant (60%) | `--color-cream` | `#faf9f5` | All page backgrounds — onboarding canvas, settings body, dropzone overlay backdrop |
| Secondary (30%) — surface | `--color-cream-deep` | `#f3f1ea` | Settings left rail, dialog inner panels, history modal rows, status-pill resting bg |
| Secondary (30%) — hairline | `--color-cream-edge` | `#ede9de` | Card borders that need visible-yet-soft separation (history modal row dividers) |
| Accent (10%) | `--color-orange` | `#d97757` | Primary CTA fills, focus rings, streaming spinner arc, active step indicator, importing-state pill text |
| Destructive | `--color-error` | `#c15f3c` | Stroke-only — error message left rule, error pill text, error-row left border in history modal |
| Text — primary | `--color-warm-dark` | `#141413` | All body text (KP-09 ban: NO `#000`) |
| Text — soft | `--color-warm-dark-soft` | `#4a4843` | Secondary descriptions, settings sublabel |
| Text — mute | `--color-warm-dark-mute` | `#7a766d` | Timestamps, placeholder copy, settings category disabled state |
| Border | `--border-soft` | `rgba(20,20,19,0.08)` | All UI hairlines — never hard lines |
| Validation success | `--color-success` | `#4ea36b` | Inline status dots, validation checkmarks, found-state indicators (onboarding only) — NEVER a CTA fill or primary state |
| Focus ring outer | `--orange-ring` | `rgba(217,119,87,0.15)` | 3px outer ring on all focus-visible elements |
| Banned | n/a | `#000`, `#fff` | Hard fail — KP-09 cheap-AI-feel safeguard |

**Accent reserved for** (explicit list — NEVER blanket "all interactive"):
1. Primary CTA fill (`Continue`, `Add course`, `Import N files`, `Use this path`, `Open Settings`, `Finish`)
2. Send button (existing Phase 1) — Phase 2 introduces no new send-like buttons
3. Focus ring on any focused interactive element (3px outer `--orange-ring` + 1px inner `--color-orange`)
4. Active step indicator (filled circle in onboarding step rail)
5. Importing-state status pill text color (transient, returns to `--color-warm-dark-mute` once idle)
6. Loading spinner arc in startup reconciliation overlay
7. Active settings category indicator (left rail — 2px left bar in `--color-orange`)

**Destructive reserved for** (stroke-only per Phase 1 D-22):
1. Error message left rule (3px solid `--color-error` on left edge of error block)
2. Error pill text color (e.g., `2 / 3 imported · 1 error`)
3. Per-file failure row left border in history modal
4. Move-vault confirmation copy emphasis (text color on "old folder stays at..." caveat)

**`--color-success` reserved for** (onboarding validation only):
1. Step 2 Claude CLI auth check — `found` state dot
2. Step 3 vault path picker — valid path checkmark
3. Step 5 add course — typing-valid + added validation states

`--color-success` is NOT a general success accent for the rest of the app. The status pill's `imported` state uses `--color-warm-dark-soft`, not green. Reserved-for list is exhaustive: no other surface in Phase 2 uses `#4ea36b`.

**Planner note:** Token `--color-success: #4ea36b` will need a one-line addition to `src/lib/styles/tokens.css` during Phase 2 execution — flag for the planner.

**Form isolation contract (Phase 1 D-22 holds verbatim):**
- `--orange` only as fill; never stroke / never border / never text color (one exception: importing-state pill text is in `--color-orange` because the pill itself has no fill).
- `--error` only as stroke / text; never background / never fill.
- `--bubble-user: #f3f1ea` SSOT 0' override — Phase 2 user bubbles (none introduced) continue this.

**Dark mode:** Light theme only for v1. Tokens exist (`tokens.css` L164-175) but Appearance toggle in Settings no-ops. Do not spec dark variants for Phase 2 surfaces.

---

## Copywriting Contract — primary defaults

> All strings are **English** (mneme is single-user, prototype is English-only).
> Voice = calm, precise, low-friction. NOT chirpy, NOT corporate.
> Every entry below is `(default — confirm during plan-phase review)` so the user can override in execution.

| Element | Copy |
|---------|------|
| Primary CTA (onboarding step generic) | "Continue" |
| Primary CTA (import dialog) | "Import N files" (dynamic N) |
| Primary CTA (settings → vault → move) | "Move vault" |
| Primary CTA (history modal close) | "Close" |
| Empty state heading (history modal) | "No imports yet." |
| Empty state body (history modal) | "Drop files on the window, press Cmd+I, or use Settings → Vault." | <!-- v1.x spec deferral: copy mentions Cmd+I which works in current implementation but spec no longer guarantees v1 contract per Phase 02.1 D-06 (W7 fix). Dogfood-cost 2026-05-17: no Cmd+R either, so user cannot re-trigger Step 2 probe from inside the app -->

| Empty state heading (import dialog, 0 courses) | "No courses yet." |
| Empty state body (import dialog, 0 courses) | "Add a course in Settings → Vault, then re-drop your files." + `[Open Settings]` button |
| Error state — Claude CLI missing (onboarding step 2) | "Claude CLI not detected. Run `claude --version` in Terminal first, then return here." |
| Error state — vault path invalid (onboarding step 3) | "That path can't be used. Try a folder under your home directory." |
| Error state — per-file failure (history modal row) | "{filename} — {error reason}. Re-drop to retry." |
| Destructive — move vault | "Move vault to {new-path}? The original folder stays at {old-path} for you to delete manually in Finder." |
| Destructive — remove course | "Remove course {CODE} from the list? Files in courses/{CODE}/ stay on disk." |

§10 below carries the full per-surface micro-copy inventory.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable (Svelte / Tauri stack — no shadcn) |
| third-party registries | none | not applicable |

No registry-sourced components. Every component in Phase 2 is hand-authored Svelte 5 against `tokens.css`. No `npm install` of UI kits.

---

## §7 Component Inventory

All new and modified Phase 2 components. Dimensions are intrinsic content size unless noted. Visual SSOT column points to either the Mneme 3 bundle file (`/Users/qinyuan/Downloads/Mneme 3/<file>.html` — for net-new Phase 2 surfaces) OR `Mneme.html` line ranges inside the bundle (for components extending main-shell patterns; line numbers are unchanged from the original Mneme.html, only the bundle path is new).

### New components (full Phase 2 surfaces)

| Name | Responsibility | File | Dimensions | States | Visual SSOT |
|------|---------------|------|------------|--------|-------------|
| `Onboarding.svelte` | Wizard shell — owns 6-step state, persistence, navigation | `src/lib/components/onboarding/Onboarding.svelte` | 100vw × (100vh − 36px titlebar) | step routing only; no own visual state | §8.1 |
| `Step1Welcome.svelte` | Onboarding hero + Continue | `src/lib/components/onboarding/Step1Welcome.svelte` | fills wizard frame | idle / pressing-CTA | §8.1.1 |
| `Step2AuthCheck.svelte` | Claude CLI sentinel verification + status block | `src/lib/components/onboarding/Step2AuthCheck.svelte` | fills wizard frame | checking / found / not-found | §8.1.2 |
| `Step3VaultPicker.svelte` | Default `~/StudyVault/` + Browse button + path validation | `src/lib/components/onboarding/Step3VaultPicker.svelte` | fills wizard frame | idle / browsing / valid / invalid | §8.1.3 |
| `Step4MCPStatus.svelte` | "Self-ecosystem mode" notice + Continue | `src/lib/components/onboarding/Step4MCPStatus.svelte` | fills wizard frame | idle | §8.1.4 |
| `Step5AddCourse.svelte` | CODE input + Add + Skip-link | `src/lib/components/onboarding/Step5AddCourse.svelte` | fills wizard frame | empty / typing / added / error | §8.1.5 |
| `Step6DemoImport.svelte` | Drop zone or "Skip — Finish" | `src/lib/components/onboarding/Step6DemoImport.svelte` | fills wizard frame | idle / drag-active / imported | §8.1.6 |
| `OnboardingStepRail.svelte` | 6-dot bottom progress indicator | `src/lib/components/onboarding/OnboardingStepRail.svelte` | 100% × 32px | per-step active / completed / upcoming | §8.1 (component sec) |
| `SettingsPanel.svelte` | Replaces `SettingsModal.svelte` — 8-category panel | `src/lib/components/SettingsPanel.svelte` | 880 × 600 (centered overlay) | open / closing | §8.2 |
| `VaultCategory.svelte` | Settings → Vault — path + move + course list | `src/lib/components/settings/VaultCategory.svelte` | 640 × auto | idle / moving / move-confirming | §8.2.1 |
| `AppearanceCategory.svelte` | Light-only toggle (no-op) | `src/lib/components/settings/AppearanceCategory.svelte` | 640 × auto | idle | §8.2.2 |
| `KeybindingsCategory.svelte` | Read-only key list | `src/lib/components/settings/KeybindingsCategory.svelte` | 640 × auto | idle | §8.2.3 |
| `ComingSoonCategory.svelte` | Placeholder body for 5 deferred categories | `src/lib/components/settings/ComingSoonCategory.svelte` | 640 × auto | idle | §8.2.4 |
| `ImportDialog.svelte` | Course picker + category radios + actions | `src/lib/components/ImportDialog.svelte` | 480 × auto (centered modal) | 0-courses / 1-3 / 4-10 / 10+ / submitting | §8.3 |
| `DuplicateResolutionDialog.svelte` | Replace / Skip / Rename + batch checkbox | `src/lib/components/DuplicateResolutionDialog.svelte` | 440 × auto (centered modal, nested) | first / batch-remaining | §8.7 |
| `DropzoneOverlay.svelte` | Full-window drop target | `src/lib/components/dropzone/DropzoneOverlay.svelte` | 100vw × 100vh (overlay) | hidden / drag-enter / drop-pending | §8.4 |
| `ImportStatusPill.svelte` | Inline pill inside TitlebarMeta | `src/lib/components/ImportStatusPill.svelte` | auto × 20px | idle / importing / imported / error / cancelled | §8.5 |
| `ImportHistoryModal.svelte` | Most-recent-20 operations list | `src/lib/components/ImportHistoryModal.svelte` | 640 × 540 (centered modal) | empty / list / scrolled | §8.6 |
| `ReconciliationOverlay.svelte` | App-startup blocking spinner ("Indexing vault…") | `src/lib/components/ReconciliationOverlay.svelte` | 100vw × 100vh (overlay) | spinning / done (then unmounts) | §8.1 (note) |

### Modified components

| Name | Change | File | Visual SSOT |
|------|--------|------|-------------|
| `TitlebarMeta.svelte` | Insert `ImportStatusPill` between `connected` and `vault:`; vault-path from `vault-state.svelte.ts` (not localStorage); long-path middle-truncation | `src/lib/components/TitlebarMeta.svelte` | `Mneme.html` L145-160 (existing pattern) + §8.8 (delta) |
| `+layout.svelte` | App-startup branch — call `load_onboarding_state` → conditional redirect to `/onboarding/<step>` | `src/routes/+layout.svelte` | n/a (logic only) |
| `+page.svelte` | Mount `DropzoneOverlay` listener on the three-pane shell | `src/routes/+page.svelte` | unchanged structurally |

### Deleted / retired

| Name | Reason |
|------|--------|
| `SettingsModal.svelte` | Replaced by `SettingsPanel.svelte` per REQ-10 |

---

## §8 Page Layout Specifications

For each surface: frame & geometry → layout (ASCII wireframe with spacing tokens) → hierarchy → states → motion → accessibility → maps-to.

### §8.0 Keymap Status (v1 ship gate — Phase 02.1 W7 fix)

> **Updated 2026-05-17 per Phase 02.1 D-06.** This section is the authoritative SSOT for which keyboard shortcuts ship in v1 vs which are v1.x deferred. Other §8 subsections may mention `Cmd+,` / `Cmd+I` / `Cmd+P` / `Cmd+R` in historical context — the `<!-- v1.x deferred -->` inline markers there reference this section.

**In v1 scope:**

- `Cmd+Q` — system quit. Drains subprocess group, closes window. Tested via `src-tauri/tests/kill_pgid.rs` + Phase 1 close-request hooks. This is the **only** keymap the v1 spec guarantees.

**Deferred to v1.x:**

- `Cmd+,` — open Settings panel.
- `Cmd+I` — open native file picker.
- `Cmd+P` — command palette (Phase 3 candidate, not Phase 2 promise).
- `Cmd+R` — reload (DevTools-only in v1, not a user-facing shortcut).

**Why deferred:** Phase 02.1 D-06 (user-explicit decision 2026-05-17). The implementation wiring for `Cmd+,` and `Cmd+I` is present (per `tests/cmd-comma-shortcut.test.ts` + `tests/menu-bridge.test.ts` + `src-tauri/tests/menu_preferences_emits_event.rs`), but the SPEC no longer guarantees v1 contract. v1.x re-evaluation is paired with Phase 3 multi-session sidebar where keyboard nav becomes a first-class promise.

**Dogfood cost captured 2026-05-17 (motivates v1.x prioritization):** Today's dogfood of the B3 fix surfaced a concrete pain point — the absence of `Cmd+R` means we cannot re-trigger the onboarding Step 2 `claude --version` probe from inside the running app. A full app restart (Cmd+Q + relaunch) is the only way to retry the auth-check path. Without a Back button on Step 2 and without `Cmd+R`, every probe iteration costs ~5-10s of restart latency. **v1.x re-introduction of the keymap should prioritize the reload path first** (then `Cmd+,` for Settings, then `Cmd+I` for file picker, then `Cmd+P` for the Phase 3 command palette). This dogfood-cost note is captured here so future readers understand **why** the keymap was withdrawn (release-discipline ≠ "the implementation didn't work" — it did; we chose to retract the contract) and how that decision shaped a real workflow loss.

**What changed:** spec promises, not implementation. The running app still responds to `Cmd+,` and `Cmd+I`; this is a documentation-level retraction so a future change that breaks those keybinds is not a release blocker.

**Backlog:** `/gsd-capture --seed "Phase 02.2 or 03.5 — keymap re-introduction (priority: Cmd+R reload first per dogfood-cost note)"`.

---

### §8.1 Onboarding Wizard

**Frame & geometry.** Full-screen SvelteKit route `/onboarding/[step]`. The 36px overlay titlebar from Phase 1 remains visible (required for Cmd+Q drain path). Below the titlebar, the entire viewport (`width: 100vw; height: calc(100vh − 36px)`) is the wizard. Background: `--color-cream`. No splitter, no mind-map bar, no chat. Tab key trap is implicit (no other UI exists).

**Shared step shell** (Onboarding.svelte composition):

```
┌─────────────────────────────────────────────────────────────┐
│ titlebar (36px) — macOS overlay, traffic lights only        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                    [step body area]                          │
│       max-width: 560px, centered, --space-10 from top       │
│                                                              │
│                                                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│           [OnboardingStepRail: ● ● ○ ○ ○ ○]                  │
│                  height: 32px, margin-bottom: --space-8     │
└─────────────────────────────────────────────────────────────┘
```

- Each step body is content-vertically-centered within the available height using `display: grid; place-items: center;` on the step container.
- Step rail (`OnboardingStepRail.svelte`): 6 dots horizontally centered, gap `--space-3` (12px).
  - Upcoming: 8px circle filled `--border-soft`
  - Active: 10px circle filled `--color-orange`, 1px ring `--color-orange` at +2px offset
  - Completed: 8px circle filled `--color-warm-dark-mute`
  - Transitions: dot size + color cross-fade over `--duration-base` (200ms) with `--ease-out`.

**Hierarchy (every step):**
1. Hero headline at `--fs-display` (28px, serif semibold) — single line, drives the eye.
2. Body copy at `--fs-body` (16px, serif regular) — 2-3 lines max.
3. Form input or status block — distinct visual block, 1 per step at most.
4. Primary CTA — full-width or auto-width per step, `--space-8` below content.
5. Secondary action (Skip / Open guide / Choose another) — text link below CTA, `--space-3` gap.
6. Step rail at bottom (always).

**Shared motion:**
- Entry: each step body fades in with `opacity 0 → 1` over `--duration-base` (200ms) AND `translateY(8px) → 0` simultaneously. No stagger.
- Exit: previous step fades to `opacity 0` + `translateY(-8px)` over `--duration-fast` (160ms); next step enters with above entry. Cross-fade not overlapping (sequential).
- Reduced motion: durations → 0ms, transform → none, only `opacity 0 ↔ 1` instant swap.

**Shared accessibility:**
- `<main role="main" aria-labelledby="step-heading">` wraps the body.
- Step rail is `<nav role="progressbar" aria-valuenow="{N}" aria-valuemin="1" aria-valuemax="6" aria-label="Onboarding progress">` — read-only, NOT clickable in Phase 2 (forward-only per CONTEXT deferred list).
- Primary CTA receives autofocus on step entry.
- Cmd+Q still drains subprocess + exits app (works because titlebar + main process untouched).

**Maps to:** REQ-08 (6-step resumable wizard), D-01 (full-screen route), D-02 (6 step children), D-03 (state persistence on Next), D-04 (UI-SPEC = visual SSOT after user override).

---

#### §8.1.1 Step 1 — Welcome

```
                        mneme

         Let's set up your study vault.
       (serif display 28px / semibold)

   A local-first place for your coursework,
   notes, and conversations with Claude. Takes
   about a minute.
       (serif body 16px / regular / mute --color-warm-dark-soft)

   [           Continue           ]
        (primary CTA — see §9)

              ● ○ ○ ○ ○ ○
```

**Layout:**
- Hero "mneme" wordmark at top of content area, `--font-serif` `--fs-display` (28px) regular, color `--color-warm-dark`, letter-spacing `-0.01em`.
- `--space-6` (24px) gap below wordmark.
- Display headline.
- `--space-5` (20px) gap.
- Body copy, max-width 480px, centered.
- `--space-10` (40px) gap.
- Continue CTA, width 200px.

**States:** idle / pressing (`active:scale-[0.96]` per §9).

**Copy (default — confirm during plan-phase review):**
- Wordmark: `mneme`
- Headline: `Let's set up your study vault.`
- Body: `A local-first place for your coursework, notes, and conversations with Claude. Takes about a minute.`
- CTA: `Continue`

**Maps to:** REQ-08 step 1.

---

#### §8.1.2 Step 2 — Claude Code auth check

```
      Verifying Claude Code authentication
              (display 28px)

   Reading your local Claude CLI session.
   No network calls.
        (body 16px / soft)

   ┌─────────────────────────────────────────┐
   │  ●  Claude CLI detected                  │  ← status block, --color-cream-deep bg
   │     v1.2.3 · OAuth session active       │     padding --space-5, radius --radius-lg
   └─────────────────────────────────────────┘     border --border-soft, --space-8 above CTA

   [           Continue           ]

              ● ● ○ ○ ○ ○
```

**Status block dimensions:** max-width 480px, height auto, padding `--space-5` (20px) on all sides. Status dot `8px circle`, gap `--space-3` from text.

**State table:**

| State | Dot color | Body text | CTA enabled | Secondary action |
|-------|-----------|-----------|-------------|------------------|
| checking | `--color-warm-dark-mute` with spinner overlay | `Looking for Claude CLI…` | disabled (--ink-mute) | none |
| found | `--color-success` (`#4ea36b`, warm green from Mneme.html L158) + 2px soft shadow ring `rgba(78,163,107,0.18)` | `Claude CLI detected · {version}` + `OAuth session active` | enabled | none |
| not-found | `--color-error` text + same color dot | `Claude CLI not detected. Run \`claude --version\` in Terminal first, then return here.` | disabled | text link: `Open Claude Code guide` (opens `https://docs.claude.com/claude-code` in default browser via `tauri-plugin-shell` open with URL allow-list) |

**Motion:** spinner is 1.2s loop, `--color-orange` arc on `--color-cream-edge` track (8px ring, 2px stroke). Cross-fade between checking → found/not-found over `--duration-base`.

**Accessibility:**
- Status block is `<div role="status" aria-live="polite">` so screen readers announce the result.
- not-found state CTA is `aria-disabled="true"`; pressing it has no effect.

**Maps to:** REQ-08 step 2, KP-01 (zero network — sentinel read only).

---

#### §8.1.3 Step 3 — Vault path picker

```
      Choose your vault location
              (display 28px)

   Mneme will create folders here for your
   courses, sources, notes, and concepts.
        (body 16px / soft)

   ┌─────────────────────────────────────────┐
   │  ~/StudyVault/                  [Browse]│  ← input + button row
   │  (path input — read-only display; live   │     input flex:1, --color-cream-deep bg
   │   path; Browse opens Tauri dir picker)   │     button --color-cream-edge bg
   └─────────────────────────────────────────┘
   ✓ Path will be created.
     (body 14px / muted, --space-2 above)

   [        Use this path        ]

   Choose another folder
     (secondary text link, --space-3 below CTA)

              ● ● ● ○ ○ ○
```

**Input row:** height 44px, padding `--space-4` (16px) horizontal, `--radius-md` (6px) corners. Input font `--font-mono` 14px (path is monospace for legibility). Browse button width 96px, height 36px, `--color-cream-edge` bg, hover `--color-cream-deep`.

**Path validation copy** (under input, `--space-2` gap):

| State | Icon | Color | Copy |
|-------|------|-------|------|
| valid (path will be created) | `✓` (1.5px stroke checkmark) | `--color-success` | `Path will be created.` |
| valid (path exists, scaffold present) | `✓` | `--color-success` | `Existing vault detected. Mneme will use it.` |
| invalid (outside home) | `!` (1.5px stroke) | `--color-error` | `That path can't be used. Try a folder under your home directory.` |
| invalid (permission denied) | `!` | `--color-error` | `Mneme can't write here. Choose another folder.` |

CTA `Use this path` is disabled when state is invalid.

**Motion:** Browse button opens native macOS picker (Tauri `dialog.open`) — no Svelte transition. Validation row cross-fades over `--duration-fast` (160ms).

**Accessibility:**
- Input is `<input type="text" readonly aria-label="Vault path">`; Browse button has `aria-haspopup="dialog"`.
- Validation row is `<p role="status" aria-live="polite">`.

**Maps to:** REQ-08 step 3, REQ-06 (vault default `~/StudyVault/`).

---

#### §8.1.4 Step 4 — MCP detection (self-ecosystem mode)

```
      You're in self-ecosystem mode
              (display 28px)

   Mneme doesn't talk to external MCP servers
   right now. Everything stays on your machine.
        (body 16px / soft)

   ┌─────────────────────────────────────────┐
   │  ●  No external MCP configured           │  ← status block, same shape as step 2
   │     v1 ships with local-only flow        │     dot color --color-warm-dark-mute (neutral)
   └─────────────────────────────────────────┘

   [           Continue           ]

              ● ● ● ● ○ ○
```

**States:** idle only (no async work — pure informational).

**Visual treatment:** identical to step 2's status block, but dot is `--color-warm-dark-mute` (neutral grey-brown), no green / red.

**Copy:**
- Headline: `You're in self-ecosystem mode`
- Body: `Mneme doesn't talk to external MCP servers right now. Everything stays on your machine.`
- Status: `No external MCP configured` + sublabel `v1 ships with local-only flow`
- CTA: `Continue`

**Maps to:** REQ-08 step 4, KP-01 (local-only), self-ecosystem decision 2026-05-11.

---

#### §8.1.5 Step 5 — Add first course

```
       Add your first course
              (display 28px)

   Use the course code from your university
   schedule. You can add more in Settings later.
        (body 16px / soft)

   ┌─────────────────────────────────────────┐
   │  Course code                             │  ← label, --fs-meta 14px sans, --space-2 above
   │  ┌───────────────────────┐ [Add course] │
   │  │  COMP3221             │             │  ← input + button row, height 44px
   │  └───────────────────────┘             │     input flex:1, mono font
   └─────────────────────────────────────────┘
   ✓ Looks like a course code.
     (body 14px / muted, --space-2 above)

   Added: COMP3221
     (after successful add, replaces validation row)

   [          Continue           ]   ← enabled once ≥1 course added OR user clicks Skip

   Skip — add later
     (secondary text link, --space-3 below CTA)

              ● ● ● ● ● ○
```

**Layout:**
- Input field has `placeholder="e.g. COMP3221"` in `--color-warm-dark-mute`.
- Add-course button width 120px (accommodates the two-word label), same `--color-cream-edge` bg as Browse, but turns `--color-orange` fill when input is non-empty AND validation passes (acts as the *secondary primary* CTA for the form — pressing Enter while in input triggers `Add course`).
- Adding pushes the code into a chip list above the input:

```
   ┌─────────────────────────────────────────┐
   │  COMP3221  ×    INFO1110  ×              │  ← chip list, --space-2 gap between chips
   └─────────────────────────────────────────┘    --space-3 below; chip = --color-cream-deep bg, 4px 8px padding, --radius-sm
```

**Validation regex** (D-126 planner discretion): `^[A-Z]{4}\d{4}$` default; matches `MATH1062` / `INFO1110` / `STAT1003`. Validation row copy:

| State | Color | Copy |
|-------|-------|------|
| empty | mute | `Enter a course code to add.` (or hidden if first interaction) |
| typing-valid | `--color-success` | `Looks like a course code.` |
| typing-invalid | mute | `Four letters + four digits — like \`COMP3221\`.` |
| added (chip just added) | `--color-success` | `Added: {CODE}` (auto-fade to empty/typing state after 2s) |
| error (creation failed) | `--color-error` | `Couldn't create that course folder. {reason}` |

**Continue CTA:** enabled after first chip added OR if user clicked Skip (which advances to step 6 with no course added).

**Maps to:** REQ-02 (course folder scaffold), REQ-08 step 5.

---

#### §8.1.6 Step 6 — Demo import

```
      Try a quick import
              (display 28px)

   Drop a file from your computer to see how
   importing works. Skip if you'd rather not.
        (body 16px / soft)

   ┌─────────────────────────────────────────┐
   │                                          │
   │              ⬇  Drop a file               │  ← drop zone, height 200px
   │       or click to browse                 │     dashed border --color-cream-edge 2px
   │                                          │     bg --color-cream, radius --radius-lg
   │   We'll put it in your _inbox folder.    │     hover --color-cream-deep bg
   │                                          │
   └─────────────────────────────────────────┘

   ✓ Imported: lecture1.pdf
     (after import, success line replaces zone)

   [          Finish              ]

   Skip
     (secondary text link, --space-3 below CTA)

              ● ● ● ● ● ●
```

**Drop zone behavior:**
- Default state: dashed border `--color-cream-edge` 2px, body cream, height 200px.
- Drag-enter (file detected via `DataTransfer.types.includes("Files")`): border solid `--color-orange` 2px, bg `--orange-soft` (rgba 217/119/87/0.12), arrow icon scales 1.1× over `--duration-fast` (160ms).
- Dropped: zone collapses to success line over `--duration-base` (200ms) with `height: 200px → 0` and content cross-fade.
- Click to browse: alternative entry — opens Tauri dialog (same picker as Cmd+I in main UI). <!-- v1.x deferred per Phase 02.1 D-06 — only Cmd+Q ships in v1 -->


**Demo import target:** writes to `~/StudyVault/_inbox/<filename>`. Bypasses the course/category picker (intentional — demo step is the easy path).

**Finish behavior:** sets `completed_at` in onboarding-state.json, programmatic-navigate to `/`, full unmount of wizard tree.

**Maps to:** REQ-08 step 6.

---

### §8.2 Settings Panel

**Frame & geometry.** Full-screen centered modal overlaying the three-pane shell. Backdrop: `rgba(20, 20, 19, 0.32)` (slight darken + blur for focal-point effect). Panel: 880 × 600 px, `position: fixed; inset: 0; margin: auto;` (auto-center via flex). Background `--color-cream`, border `--border-soft`, `--shadow-2`, `--radius-xl` (10px). NOT a `<dialog>` element — uses a `<div role="dialog" aria-modal="true">` overlay with manual focus trap (Phase 1 SettingsModal's `<dialog>` host pattern is retired because the 8-category layout exceeds modal-native ergonomics).

**Layout (880 × 600):**

```
┌──────────────────────────────────────────────────────────────┐
│ Settings                                            ×        │  ← header bar, 56px height, --space-4 padding
│ (--fs-h 20px serif semibold)         (icon-btn 26×26)        │     border-bottom --border-soft
├──────────────────────────────────────────────────────────────┤
│             │                                                 │
│  General    │   Vault                                         │  ← body grid: 200px rail | 1px hairline | 1fr body
│  Vault   ●  │   ────────                                      │
│  Sync       │                                                 │
│  Claude     │   Vault path                                    │
│  Privacy    │   ~/StudyVault/         [Browse]   [Move…]      │
│  Appearance │                                                 │
│  Keybindings│   Courses                                       │
│  Advanced   │   ┌─────────────────────────────┐               │
│             │   │ COMP3221  notes (12)   [⋯] │               │
│             │   │ INFO1110  notes (4)    [⋯] │               │
│             │   └─────────────────────────────┘               │
│             │   [+ Add course]                                 │
│             │                                                 │
│             │                                                 │
└─────────────┴────────────────────────────────────────────────┘
     200px            1px           1fr (640px body)
   left rail        hairline
```

**Hierarchy:** Active category body draws the eye (it occupies ~73% of the panel width). Left rail's active indicator (2px orange bar + cream-deep row tint) is the secondary anchor — tells you where you are. The 20px `Settings` title at top-left is tertiary.

**Header bar (56px tall):**
- Padding `--space-4` (16px) horizontal.
- "Settings" title left, `--fs-h` (20px) `--font-serif` semibold.
- Close icon (×) right — 26×26 icon-btn (Mneme.html L161-174 pattern). Hover `rgba(20,20,19,0.05)` bg, active `scale(0.96)`.
- Bottom border `1px solid --border-soft`.

**Left rail (200 px wide):**
- Padding `--space-4` top + `--space-4` bottom, no horizontal padding (full-bleed selection bar).
- Each item: 36 px tall, padding `0 var(--space-5) 0 var(--space-4)` (right 20px for chevron-less consistency, left 16px), `--fs-meta` (14px) `--font-sans` regular.
- Active category indicator: 2px `--color-orange` left bar (full height of row) + body text color shifts to `--color-warm-dark`. Bg also gains `--color-cream-deep` fill.
- Inactive: text `--color-warm-dark-soft`, hover `--color-cream-deep` bg.
- Disabled (coming-soon categories): text `--color-warm-dark-mute`, no hover effect, italic? — NO italic (KP-09 cheap-AI-feel risk). Use opacity 0.7 instead.
- Order (top to bottom): `General / Vault / Sync / Claude / Privacy / Appearance / Keybindings / Advanced`.

**Body (1fr ≈ 640 px wide):**
- Padding `--space-6` (24px) on all sides.
- Category header: `--fs-h` (20px) `--font-serif` semibold, color `--color-warm-dark`, `--space-2` above (after the 24px padding), `--space-6` below before content.
- A 1px hairline `--border-soft` separates the header from content (full body width).
- Content uses §8.2.1-§8.2.4 layouts.

**Motion:**
- Open: backdrop fades in `opacity 0 → 1` over `--duration-base` (200ms); panel `opacity 0 + scale(0.96) → opacity 1 + scale(1)` over `--duration-base` with `--ease-out`.
- Close: reverse over `--duration-fast` (160ms).
- Category switch: body content cross-fades `opacity 0 → 1` over `--duration-fast` (no transform).
- Reduced motion: opacity-only, durations 0ms.

**Accessibility:**
- `<div role="dialog" aria-modal="true" aria-labelledby="settings-title">`.
- Focus trap: when modal opens, focus moves to the active rail item. Tab cycles through rail → body interactive elements → close button → back to rail. Shift+Tab reverses.
> **Status:** v1.x deferred — only Cmd+Q ships in v1. See Phase 02.1 D-06 + §Keymap Status. The implementation handler still works on dev machines, but the spec no longer guarantees v1 contract.
- Esc closes the panel. ~~Cmd+, opens within 100ms (REQ-10 acceptance).~~ <!-- v1.x deferred per Phase 02.1 D-06 — only Cmd+Q ships in v1; the Cmd+, listener remains wired but is no longer a release contract -->

- Underneath, the three-pane shell is `inert` (Tauri WebKit 2.11+ supports it; fallback: `aria-hidden="true"` + pointer-events none).

**Maps to:** REQ-10, D-04 (no HTML prototype prerequisite — freehand from this spec).

---

#### §8.2.1 Vault category body

```
   Vault path                          (--fs-meta 14px sans, --color-warm-dark-soft)
   ┌─────────────────────────────────────────┐
   │ ~/StudyVault/                            │  ← read-only path display, --color-cream-deep bg
   │   (--font-mono 14px)                     │     padding --space-3 --space-4, --radius-md
   └─────────────────────────────────────────┘
   [Browse…]  [Move…]                          (--space-3 gap, 36px height buttons)

   Courses                                     (--space-8 above, section header)
   ┌─────────────────────────────────────────┐
   │  COMP3221    notes (12)        [⋯]      │  ← list row, 48px tall, --space-4 padding
   ├─────────────────────────────────────────┤     hairline --border-soft between rows
   │  INFO1110    notes (4)         [⋯]      │
   └─────────────────────────────────────────┘
   [+ Add course]                               (text+icon button, --space-4 above)
```

**Path display row:**
- Read-only `<input>` styled as cream-deep panel.
- Browse opens Tauri `dialog.open` directory picker; on confirm, opens the Move flow (see below) — Browse and Move are equivalent.
- Move opens an inline confirmation overlay:

**Move confirmation (inline, NOT a separate modal):**

```
   ┌─────────────────────────────────────────┐
   │  Move vault to /tmp/test-vault?          │  ← body 16px serif, max 480px wide
   │  The original folder stays at            │
   │  ~/StudyVault/ for you to delete         │
   │  manually in Finder.                     │
   │                                          │
   │  [Cancel]                  [Move vault]  │  ← buttons right-aligned
   └─────────────────────────────────────────┘
```

- Backdrop within the settings body only (not full window — keeps the rail visible).
- Move CTA is in `--color-orange` (this is a primary action despite being destructive-adjacent, because the *destruction* is left to Finder — mneme's action is non-destructive copy).

**Course list rows:**
- Each row: 48px height, `--space-4` (16px) horizontal padding.
- Left: course code, `--font-mono` 14px, `--color-warm-dark`.
- Center: notes count, `--font-sans` 14px, `--color-warm-dark-mute` — placeholder until Phase 3 produces real counts; render `_source (N)` where N = file count from vault index.
- Right: `⋯` icon-btn (26×26), reveals popover with `Open folder` / `Remove course`.
- Hover: full row bg `--color-cream-deep`.

**Remove course confirmation:** inline below the row, same shape as Move confirmation.

**Add course button:**
- 36px tall, `--space-4` above the list, `--font-sans` 14px regular, `--color-warm-dark-soft`, `[+]` icon + text.
- Click → inline form below, same layout as Step 5's input + Add button + chip-pattern (reuse the component).

**State table:**

| State | Visual delta |
|-------|--------------|
| idle | as drawn |
| moving | Move CTA shows inline spinner inside button; path display row gets pulsing `--color-orange-soft` bg outline |
| move-confirming | Move overlay visible; rest of body inert (aria-hidden) |
| add-course-active | inline form revealed below `[+ Add course]` button; button hidden |

**Maps to:** REQ-02 (course add), REQ-11 (vault path move), REQ-10 (Vault category v1-functional).

---

#### §8.2.2 Appearance category body

```
   Theme                          (--fs-meta 14px sans soft)

   ○ Light    (filled radio --color-orange, "Light" --font-serif 16px)
   ○ Dark     (radio --color-warm-dark-mute disabled, "Dark — coming soon" mute)

   ───────────────────────────────────────  (hairline --border-soft, --space-6 above/below)

   Font size                       (--fs-meta sans soft)
   ○ Comfortable (16px body)       (default, selected, disabled — no toggle in v1)
   ○ Compact (14px body)           (disabled placeholder)
```

**State:** idle only. Both Theme and Font-size toggles are visible but non-functional in v1 (REQ-10 acceptance: "Appearance toggle no-ops but does not error"). Disabled options have opacity 0.5 and `aria-disabled="true"`.

**Microcopy:** add a single body line below "Theme": `Dark mode and font sizing arrive in a future ui-phase.` — `--color-warm-dark-mute`, `--fs-meta`.

**Maps to:** REQ-10 Appearance v1-functional (no-op acceptable).

---

#### §8.2.3 Keybindings category body

```
   Active                          (--fs-meta sans soft)
   ┌─────────────────────────────────────────┐
   │  Quit                            ⌘ Q    │  ← rows, 40px tall, padding --space-3 --space-4
   ├─────────────────────────────────────────┤
   │  Open Settings                   ⌘ ,    │
   ├─────────────────────────────────────────┤
   │  Open file picker                ⌘ I    │
   ├─────────────────────────────────────────┤
   │  Send message                    ↵      │
   ├─────────────────────────────────────────┤
   │  Newline in input                ⇧ ↵    │
   └─────────────────────────────────────────┘
   Override coming in Phase 3+.                (--color-warm-dark-mute, --space-3 above)
```

**Row format:**
- Left: action name, `--font-serif` 16px, `--color-warm-dark`.
- Right: key chord, `--font-mono` 14px, `--color-warm-dark-soft`. Spaces between chord segments.
- Hairline `--border-soft` between rows; first row no top border, last row no bottom border (clipped by container `--radius-md`).
- Container: `--color-cream-deep` bg, `--radius-md`, full width of body content area.

**State:** idle only — read-only display, no interactions.

**Maps to:** REQ-10 Keybindings v1-functional (read-only display; override deferred to Phase 3+), interaction-paradigm thread (1 v1 exception: Cmd+Q. v1.x deferred per Phase 02.1 D-06: Cmd+,, Cmd+I, Cmd+P, Cmd+R. Enter / Shift+Enter remain in scope — input affordances, not keymaps). <!-- v1.x deferred per Phase 02.1 D-06 (W7 fix) -->


---

#### §8.2.4 Coming-soon category body (General / Sync / Claude / Privacy / Advanced)

```
   General                                     (--fs-h serif semibold)
   ──────────────────────────────────────       (hairline --border-soft)

                                               (--space-8 spacer)

         Coming in Phase 3.
         (--fs-body serif regular, --color-warm-dark-mute, centered)

         General settings — window size,
         startup behavior, language — arrive
         when Phase 3 introduces multi-session.
         (--fs-meta 14px sans, mute, centered, max-width 400px)
```

**Per-category copy (default — confirm during plan-phase review):**

| Category | Phase | Body |
|----------|-------|------|
| General | Phase 3 | "General settings — window size, startup behavior, language — arrive when Phase 3 introduces multi-session." |
| Sync | TBD | "Sync between devices is a v2 feature. Mneme is single-device-first by design." |
| Claude | Phase 3 | "Model selection, system-prompt config, and per-session limits arrive when Phase 3 wires multi-session." |
| Privacy | Phase 7 | "Data residency controls and conversation retention arrive when Phase 7 ships the knowledge graph." |
| Advanced | Phase 4+ | "Power-user toggles (vault index reset, log export, MCP overrides) arrive incrementally." |

**State:** idle only.

**Maps to:** REQ-10 ("other categories render an empty body with `(coming in Phase N)` note").

---

### §8.3 Import Dialog

**Frame & geometry.** Centered modal, 480 × auto (height grows with course-picker variant). Backdrop `rgba(20,20,19,0.32)`. Panel: `--color-cream` bg, `--border-soft` border, `--shadow-2`, `--radius-xl`. Always screen-center (D-12).

**Trigger paths:**
1. Files dropped on window (DropzoneOverlay → release).
2. Cmd+I → native file picker → ≥1 file selected. <!-- v1.x deferred per Phase 02.1 D-06 — handler stays wired; spec contract withdrawn for v1 -->

3. Settings → Vault → "Import" entry (deferred — Phase 2 ships via 1 and 2 only).

**Layout (480 × auto):**

```
┌──────────────────────────────────────────────┐
│ Import 3 files                          ×    │  ← header: --fs-h serif semibold + close
├──────────────────────────────────────────────┤
│                                              │
│  Files to import                             │  ← section label, --fs-meta sans soft
│   lecture1.pdf                  3.2 MB       │  ← file list, NO outer border; section bg `--color-cream-deep`
│   tutorial2.pdf                 890 KB       │     row height 32px; 1px `--border-soft` between rows only
│   assignment3.docx              145 KB       │     mono filename (--font-mono 14px) + mono size right-aligned
│                                              │     overflow: scroll, max-height 200px (4–5 rows visible)
│                                              │
│  Course                                      │  ← --space-5 above
│  [course picker — adaptive per count]        │
│                                              │
│  Category                                    │  ← --space-5 above
│  ○ Lectures  ○ Tutorials  ○ Assignments      │  ← horizontal flex-wrap radios — keeps dialog ≤ 520px tall
│  ○ Announcements  ● _inbox  (default —       │     (vertical 5-row stack would balloon to ~700px)
│                    uncategorized)            │     filled radio is `_inbox`; "(default — uncategorized)"
│                                              │     in `--color-warm-dark-mute` 14px sans
│                                              │
├──────────────────────────────────────────────┤
│  [Cancel]                  [Import 3 files]  │  ← footer: 56px, buttons right-aligned, gap --space-3 (12px)
└──────────────────────────────────────────────┘
   inner padding --space-4 --space-5 (16 vertical, 20 horizontal) per section
```

**Hierarchy:** File list (left ~52% of dialog width) draws the eye first — it's what you just dragged. Course picker block (top-right) is the primary decision surface — the user can't dismiss the dialog without committing. Category radios + footer buttons are tertiary.

**Adaptive course picker (D-10):**

**0 courses — replacement state (entire dialog body replaces):**

```
┌──────────────────────────────────────────────┐
│ Import                                  ×    │
├──────────────────────────────────────────────┤
│                                              │
│         No courses yet.                      │  ← --fs-h serif semibold, centered
│                                              │
│   Add a course in Settings → Vault, then     │  ← body 16px serif, --color-warm-dark-soft, centered
│   re-drop your files.                        │
│                                              │
│         [Open Settings]                      │  ← primary CTA, --space-8 above
│                                              │
├──────────────────────────────────────────────┤
│                              [Close]         │  ← single button, right-aligned
└──────────────────────────────────────────────┘
```

**1-3 courses — radio stack:**

```
   Course                                       (--fs-meta sans soft)
   ○ COMP3221
   ○ INFO1110
   ○ MATH1062
```

- Radio row height 36px, padding `--space-3` horizontal, `--font-serif` 16px text.
- Filled radio is `--color-orange` (8px circle inside 16px outer ring `--color-cream-edge`).
- Hover: row bg `--color-cream-deep`.
- Default: none selected — user MUST pick (D-11).

**4-10 courses — styled select:**

```
   Course                                       (--fs-meta sans soft)
   ┌────────────────────────────────────────┐
   │  Choose a course…                  ▾   │  ← height 44px, --color-cream-deep bg, --radius-md
   └────────────────────────────────────────┘
```

- Native `<select>` styled per KD-13. `appearance: none`; custom chevron drawn with SVG.
- Placeholder option "Choose a course…" disabled + grayed.

**10+ courses — typeahead:**

```
   Course                                       (--fs-meta sans soft)
   ┌────────────────────────────────────────┐
   │  Type to filter…                    🔍 │  ← input, height 44px
   └────────────────────────────────────────┘
   ┌────────────────────────────────────────┐
   │  COMP3221                              │  ← suggestion list, max 6 visible
   │  COMP3231                              │     row height 36px
   │  COMP3331                              │     selected row bg --color-orange-soft
   └────────────────────────────────────────┘
```

- Arrow up/down navigates; Enter selects.
- Input mono font 14px (course codes are alphanumeric, mono reads better).

**Category radios (always 5, regardless of course picker variant):**
- **Horizontal flex-wrap pill row** (revised 2026-05-15 to absorb handoff HTML choice). Wrapping to 2 lines on the 480px dialog is expected — the layout adapts. Cap dialog height at ~520px; a vertical 5-row stack (5 × 36 = 180px) would balloon the dialog past 700px which is excessive for a per-import decision surface.
- Each radio cell: `display: inline-flex; gap: var(--space-1); padding: var(--space-1); border-radius: var(--radius-md);`. Hover row bg `--color-cream-edge`; selected row bg `--color-cream-deep`.
- Radio dot: 14×14 outer ring `--color-cream-edge` 1px; inner 6×6 fill `--color-orange` on selected.
- Default selection: `_inbox` (D-11).
- `_inbox` rendered with the underscore-prefix in `--font-mono` 13px PLUS the inline annotation `(default — uncategorized)` in `--color-warm-dark-mute` `--fs-meta` (14px sans). The mono-on-_inbox is intentional — system-folder semantics.
- Other category labels: `Lectures`, `Tutorials`, `Assignments`, `Announcements` (sentence case, `--font-sans` 14px regular).

**State table:**

| State | Visual delta |
|-------|--------------|
| 0-courses | Body replaced per layout above |
| 1-3 / 4-10 / 10+ | Picker variant per count; Import CTA disabled until course selected |
| submitting | Import CTA shows spinner + text "Importing…"; Cancel becomes "Hide" (operation continues in background, dialog closes); dropzone shell + status pill take over |
| no-files-selected (impossible from trigger paths) | Defensively show "No files to import." centered + Close button |

**Motion:**
- Open: same as Settings — backdrop fade + panel scale-in.
- Close: same reverse.
- Picker-variant change (course count crosses a threshold mid-dialog — rare): cross-fade `--duration-fast`.

**Accessibility:**
- `<div role="dialog" aria-modal="true" aria-labelledby="import-title">`.
- Initial focus: course picker (or "Open Settings" CTA in 0-courses state).
- Esc → Cancel.
- Tab order: file list (read-only) → course picker → category radios → Cancel → Import.

**Maps to:** REQ-05 (drag-drop dialog), REQ-06 (file picker — keyboard shortcut Cmd+I deferred to v1.x per Phase 02.1 D-06; the dialog itself ships in v1 via drag-drop trigger), D-08 (course/category contract), D-10 (adaptive picker), D-11 (no-remember-last, _inbox default), D-12 (centered). <!-- v1.x deferred per Phase 02.1 D-06 (W7 fix) -->


---

### §8.4 Dropzone Overlay

**Frame & geometry.** `position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 9999`. Mounts on `+page.svelte` when `DataTransfer.types.includes("Files")` fires on the document `dragenter`. Unmounts on `dragleave` to outside the window OR on `drop`.

**Layout:**

```
                                                    ← full viewport
                                                       backdrop: rgba(20,20,19,0.45) — slightly darker than modal backdrop
                                                       backdrop-filter: blur(4px) — subtle


              ⬇                                       ← arrow icon, 64×64, stroke 2px --color-cream
                                                       --space-5 above hero line

         Drop to import                               ← hero line, --font-serif --fs-display (28px) semibold
                                                       color --color-cream

         Files land in your selected course           ← sublabel, --font-sans 16px regular
         and category — pick on the next screen.        color rgba(250,249,245,0.75)
                                                       max-width 480px, centered, --space-4 above


```

- Content vertically centered via `display: grid; place-items: center`.
- Arrow icon: 1.5px stroke, rounded line caps, `--color-cream` color.

**Detection logic (per D-09):**
- `dragenter` on document: if `event.dataTransfer.types.includes("Files")` → mount overlay.
- If only `text/plain` or `text/uri-list` → suppress overlay (reserves text-drag for ChatPanel in v1.x).
- `dragleave` with `event.relatedTarget === null` (left the window entirely) → unmount.
- `drop` on overlay → consume files, unmount, open ImportDialog with file list.

**State table:**

| State | Visual delta |
|-------|--------------|
| hidden | Component not mounted |
| drag-enter (mounted) | As drawn above |
| drag-over-target (file hovering, no movement) | Arrow icon pulses scale 1 → 1.05 over 1.2s loop |
| drop-pending | Overlay fades to opacity 0 over `--duration-fast`; ImportDialog mounts in same frame |

**Motion:**
- Mount: `opacity 0 → 1` over `--duration-base` (200ms).
- Unmount: `opacity 1 → 0` over `--duration-fast` (160ms).
- Arrow pulse: 1.2s loop, `--ease-out` in both directions.
- Reduced motion: no pulse, durations 0ms.

**Accessibility:**
- The overlay is purely visual feedback for a pointer interaction. It is NOT focusable (no keyboard equivalent — ~~Cmd+I provides the keyboard path~~ Cmd+I handler stays wired but the keyboard path is v1.x deferred per Phase 02.1 D-06; v1 keymap surface = Cmd+Q only). <!-- v1.x deferred per Phase 02.1 D-06 -->

- `aria-hidden="true"` on the overlay so screen readers don't announce it.
- Underneath, the three-pane shell remains keyboard-accessible (Esc cancels the drag).

**Maps to:** REQ-05 (drag-drop), D-09 (full-window overlay + types gate).

---

### §8.5 Import Status Pill

**Frame & geometry.** Inline element inside `TitlebarMeta.svelte`. Inserted between the connection-status dot and the vault-path text. Height 20px (multiple of 4 per --space-5 baseline; fits within the 36px titlebar with 8px clearance on each side via `--space-2` vertical centering). Auto width based on content.

**Layout (4 states):**

```
TitlebarMeta arrangement (Phase 2):

   claude-code · connected · [PILL] · vault: ~/StudyVault/   [⚙]
                                         ↑ inserted here

PILL state — idle (no recent activity):
   (hidden — no element rendered)

PILL state — importing:
   ┌─────────────────────────────────────┐
   │ ◐  importing 3 files…               │  ← spinner + mono text --fs-meta (14px), --color-orange
   └─────────────────────────────────────┘     padding --space-1 --space-2, --radius-pill (9999px)
                                              bg --orange-soft

PILL state — imported (within last 60s):
   ┌─────────────────────────────────────┐
   │ ✓  imported 3 files · just now      │  ← check + text, --color-warm-dark-soft
   └─────────────────────────────────────┘     bg --color-cream-deep, --radius-pill

PILL state — error:
   ┌─────────────────────────────────────┐
   │ !  2 / 3 imported · 1 error         │  ← warning + text, --color-error (stroke-only)
   └─────────────────────────────────────┘     bg transparent, 1px solid --color-error left rule only

PILL state — cancelled:
   ┌─────────────────────────────────────┐
   │ ⊘  2 / 3 imported · cancelled       │  ← cancel + text, --color-warm-dark-mute
   └─────────────────────────────────────┘     bg --color-cream-deep
```

**Typography:** `--font-mono` `--fs-meta` (14px) (matches existing `titlebar-meta` style — Mneme.html L152, upsized for KD-13 4-size cap), letter-spacing `0.02em`.

**Icon sizes:** 12 × 12 px, stroke 1.5px.

**Spinner (importing state):** 12px circle, 1.5px arc spinning at `--color-orange`, track `--orange-soft`. 1.2s loop.

**Relative-time copy (imported state):**
- 0-60 s: `just now`
- 60 s - 60 min: `Nm ago` (N = minutes)
- 60 min - 24 h: `Nh ago`
- > 24 h: pill hides (returns to idle)

**Click behavior:**
- Idle: pill not rendered, no click target.
- All other states: click opens ImportHistoryModal (§8.6).
- Hover: bg shifts to `--color-cream-edge` (subtle), cursor: pointer.
- Active: `scale(0.96)` per §9.

**Motion:**
- State transition: width auto-animates via CSS `width: max-content` + cross-fade of inner text over `--duration-fast` (160ms). Old content fades out then new content fades in (sequential, not overlapping — prevents content shift confusion).
- Reduced motion: instant swap.

**Accessibility:**
- `<button aria-label="Import history" aria-live="polite">{content}</button>`.
- `aria-live="polite"` so screen readers announce state changes without interrupting.

**Maps to:** REQ-09 (import status surface), D-15 (per-file progress events drive copy).

---

### §8.6 Import History Modal

**Frame & geometry.** Centered modal, 640 × 540 px. Same backdrop pattern as Settings + ImportDialog. `--color-cream` bg, `--radius-xl`, `--shadow-2`.

**Layout:**

```
┌──────────────────────────────────────────────────┐
│ Import history                              ×    │  ← header 56px, --fs-h serif semibold
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 2026-05-15 14:32   ✓  3 files              │ │  ← row, 72px tall, padding --space-4
│  │   COMP3221 / lectures · 3 imported         │ │     mono timestamp + sans status + serif details
│  ├────────────────────────────────────────────┤ │
│  │ 2026-05-15 14:30   !  2 / 3 imported       │ │     left border 3px solid --color-error on error row
│  │   COMP3221 / lectures · 1 error            │ │
│  │   └ assignment3.docx — write failed.        │ │  ← per-file error line, indent --space-4
│  │     Re-drop to retry.                       │ │     --color-warm-dark-soft, --fs-meta sans
│  ├────────────────────────────────────────────┤ │
│  │ 2026-05-15 13:15   ⊘  2 / 5 imported       │ │
│  │   INFO1110 / _inbox · cancelled            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Scroll for more — showing most recent 20.       │  ← footer note, --fs-meta sans mute, --space-3 above scroll-end
│                                                  │
├──────────────────────────────────────────────────┤
│                                  [Close]         │  ← footer 56px
└──────────────────────────────────────────────────┘
```

**Hierarchy:** Most-recent row at top of the list draws the eye (it's the operation just finished — the reason the modal opens). Header bar "Import history · last 20" is secondary, establishing context. The empty state — when N=0 — replaces the list region entirely and shifts focal point to the cream-deep call-to-action card.

**Row anatomy:**
- 72px tall (allows 2-3 lines without crowding); error rows expand to 96px+ to fit per-file lines.
- Padding `--space-4` (16px) horizontal, `--space-3` (12px) vertical.
- Top line: timestamp (mono, `--color-warm-dark-mute`) + status icon + headline.
- Bottom line: course/category + per-operation count.
- Per-file error lines (only on error rows): bullet-tree style with `└` glyph, indented `--space-4`.

**Status icons (12×12 px):**
- `✓` `--color-warm-dark-soft` — success
- `!` `--color-error` — error (also: 3px `--color-error` left border on the row)
- `⊘` `--color-warm-dark-mute` — cancelled

**Hairlines:** `--border-soft` between rows.

**Container:** `--color-cream-deep` bg, `--radius-md`, fills inner padding (`--space-5` from header/footer + `--space-6` horizontal).

**Empty state:**

```
                                                  (--space-10 above)

         No imports yet.                          (--fs-h serif semibold, centered)

   Drop files on the window, press Cmd+I, or      (body 16px serif, --color-warm-dark-soft, centered) <!-- v1.x spec deferral: copy mentions Cmd+I which works in current implementation but spec no longer guarantees v1 contract per Phase 02.1 D-06 -->

   use Settings → Vault.                            max-width 360px

                                                  (--space-10 below to footer)
```

**Scroll:** vertical scroll inside container if rows exceed 20 (cap is 20 per REQ-09; 20 always fit without scroll, but the container is scrollable to be safe with longer error-row expansions). Scroll bar uses macOS native overlay style.

**Motion:** same modal entry/exit as Settings + ImportDialog.

**Accessibility:**
- `<div role="dialog" aria-modal="true" aria-labelledby="history-title">`.
- Row list is `<ul role="list">`; each row `<li>`.
- Initial focus: Close button (history is read-only).
- Esc closes.

**Maps to:** REQ-09 (click-to-detail modal, most-recent-20, per-file errors).

---

### §8.7 Duplicate Resolution Sub-Dialog

**Frame & geometry.** Centered modal, 440 × auto, nested ON TOP of ImportDialog (which stays mounted but inert behind). Backdrop within ImportDialog area + an additional `rgba(20,20,19,0.18)` to layer-darken.

**Layout (single duplicate):**

```
┌──────────────────────────────────────────────┐
│ File already exists                          │  ← --fs-h serif semibold (no close button — must resolve)
├──────────────────────────────────────────────┤
│                                              │
│  lecture1.pdf already exists in              │  ← body 16px serif
│  COMP3221 / lectures.                        │     mono filename inline
│                                              │
│  What would you like to do?                  │  ← --space-5 above
│                                              │
│  ○ Replace                                   │
│      Overwrites the existing file.           │  ← sublabel --fs-meta sans soft, indent --space-5
│  ○ Skip                                      │
│      Keeps the existing file as-is.          │
│  ○ Rename                                    │
│      Save the new file as `lecture1-1.pdf`.  │
│                                              │
├──────────────────────────────────────────────┤
│                                  [Continue]  │  ← single button — must pick before continuing
└──────────────────────────────────────────────┘
```

**Layout (batch with M+ duplicates remaining):**

```
┌──────────────────────────────────────────────┐
│ File already exists (1 of 3)                 │
├──────────────────────────────────────────────┤
│                                              │
│  lecture1.pdf already exists in              │
│  COMP3221 / lectures.                        │
│                                              │
│  ○ Replace                                   │
│  ○ Skip                                      │
│  ○ Rename                                    │
│                                              │
│  ☐ Apply to all 3 remaining duplicates       │  ← checkbox, --space-5 above
│                                              │
├──────────────────────────────────────────────┤
│                                  [Continue]  │
└──────────────────────────────────────────────┘
```

**Radio rows:** same dimensions as ImportDialog radios. Sublabel only on first appearance (single duplicate state) — batch state hides sublabels to save vertical space.

**Checkbox:** 16×16 box, `--color-cream-edge` border, fills `--color-orange` when checked. `--space-3` gap to label.

**Continue CTA:** primary orange, disabled until a radio is selected.

**Motion:** same modal scale-in / scale-out.

**Accessibility:**
- `<div role="dialog" aria-modal="true">`.
- Initial focus: first radio.
- Esc closes ONLY the duplicate dialog, returning to ImportDialog (does NOT cancel the import — the resolution defaults to Skip if user dismisses).
- Wait — revise: Esc actually CANCELS the duplicate (treats as Skip + Cancel-rest). User needs to explicitly Continue to proceed. Skip behavior on Esc avoids accidental destructive Replace.

**Maps to:** REQ-05/06 (import flow), D-08 (three options + batch apply-to-all).

---

### §8.8 TitlebarMeta Updates

**Frame & geometry.** Existing 36px titlebar (Mneme.html L120-160 pattern). Phase 2 modifies only the meta region (right side); traffic lights + drag region untouched.

**Layout (Phase 2 arrangement):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                       claude-code · connected · [PILL] · vault: ~/StudyVault/   [⚙]
│ traffic                     ─────────────────────────────────────────────────────  ─
│  lights                                    titlebar-meta                          settings cog
└─────────────────────────────────────────────────────────────────────────┘
   --space-4 padding                                                       
   left                                                                   
```

**Changes from Phase 1:**

| Element | Phase 1 | Phase 2 |
|---------|---------|---------|
| `claude-code · connected` | Hardcoded label + dot indicator | Unchanged — reads from `connection-state.svelte.ts` |
| Status pill | Not present | **NEW** — `ImportStatusPill` inserted before `vault:` (only visible when state ≠ idle) |
| `vault: <path>` | Hardcoded `~/Mneme/usyd-2026s1` from localStorage | **CHANGED** — reads from `vault-state.svelte.ts`; path from persisted `~/.mneme/config.json` |
| Long path truncation | Not specified | **NEW** — middle-truncate with `…` |
| Settings cog | Click opens `SettingsModal.svelte` (placeholder) | Click opens `SettingsPanel.svelte` (full 8-cat panel) |

**Vault path truncation rule:**
- Available width for path text: ~280px (titlebar varies; budget conservatively).
- If `vault: <path>` exceeds budget, middle-truncate: `vault: ~/Users/qinyuan/…/StudyVault/`.
- Algorithm: keep first 8 chars after `vault: ` + `…` + last 16 chars. CSS-only via `text-overflow: ellipsis` won't middle-truncate; implement via JS string slice in the Svelte component.
- Tooltip on hover (HTML `title` attribute) shows full path.

**Spacing between meta elements:** `--space-3` (12px) gap (Mneme.html L149 pattern: `gap: var(--space-3)`).

**State table:**

| State | Visual delta |
|-------|--------------|
| idle (no import history) | No pill rendered |
| importing | Pill visible, importing variant |
| imported (recent) | Pill visible, imported variant |
| error (recent) | Pill visible, error variant |
| cancelled (recent) | Pill visible, cancelled variant |
| long path | Path text middle-truncated; hover reveals full path |

**Motion:**
- Pill mount/unmount on state transitions: `opacity 0 ↔ 1` + `width 0 → auto` over `--duration-fast`.
- Vault path text change (rare — only on Move complete): no animation, instant swap.

**Accessibility:**
- Existing patterns preserved.
- Status pill has `aria-live="polite"` so state changes are announced without disrupting.

**Maps to:** REQ-09 (status pill insertion), REQ-01 (vault path from config not localStorage), Phase 1 D-22 + Mneme.html L145-160.

---

### §8.9 Reconciliation Overlay (App-startup)

**Frame & geometry.** Full viewport overlay, `position: fixed; inset: 0; z-index: 10000`. Mounted by `+layout.svelte` on app startup before the three-pane shell. Unmounted when reconciliation completes (typically <200ms for ≤100 files per SPEC L65).

**Layout:**

```
                                                       full viewport
                                                       bg --color-cream (full opacity)


              ◐                                        ← large spinner, 48×48, 3px arc
                                                          --color-orange arc on --color-cream-edge track
              

         Indexing vault…                               ← --fs-h serif semibold, --color-warm-dark
                                                          --space-5 above next line

              12 / 47                                  ← --font-mono 16px, --color-warm-dark-soft
                                                          live counter

```

Content vertically centered via `place-items: center`.

**State table:**

| State | Visual delta |
|-------|--------------|
| spinning | As drawn — counter increments as files reconcile |
| done | Overlay opacity fades to 0 over `--duration-base`, then unmounts |

**Motion:** counter updates throttled to ~10 fps (no per-file flicker). Spinner 1.2s loop. Reduced motion: no spinner rotation, static `Indexing vault…` text + counter.

**Accessibility:**
- `<div role="status" aria-live="polite" aria-busy="true">`.
- Screen reader announces "Indexing vault, 12 of 47" — throttled to avoid spam.

**Maps to:** D-14 (DR1 blocking spinner — user choice over Recommended DR2).

---

## §9 Interaction Patterns

Cross-surface interaction language. Reference these from §8 sections; do not redefine per-component.

### Button press
- Effect: `transform: scale(0.96)` on `:active`.
- Duration: `--duration-fast` (160ms) for both press-down and release.
- Ease: `--ease-out`.
- Origin: project-wide ratification per Phase 1 D-22 (overrides Anthropic 0.98 baseline). Applies to ALL clickable buttons, icon-buttons, and pill buttons in Phase 2.

### Hover lift (interactive surfaces)
- Apply to: list rows (settings courses, history rows, course-picker radios), buttons.
- Effect: bg shifts to a darker tier of the same family.
  - On `--color-cream` rows → hover bg `--color-cream-deep`.
  - On `--color-cream-deep` rows → hover bg `--color-cream-edge`.
  - On icon-buttons → hover bg `rgba(20,20,19,0.05)` (Mneme.html L173).
- Duration: `--duration-base` (200ms).
- No `translateY` lift — keep flat per KD-13 calm restraint. (Mneme.html does not use translateY for interactive lift; this is intentional.)

### Focus ring
- Apply to: ALL focusable interactive elements when `:focus-visible`.
- Visual: 3px outer ring at `--orange-ring` (rgba 217/119/87/0.15) + 1px inner ring `--color-orange`.
- Box-shadow recipe: `box-shadow: 0 0 0 1px var(--color-orange), 0 0 0 4px var(--orange-ring)`.
- Duration: `--duration-fast`.
- Removed on `:focus:not(:focus-visible)` (no ring on mouse click).

### Modal open / close
- Open: backdrop `opacity 0 → 1` over `--duration-base` (200ms); panel `opacity 0 + scale(0.96) → opacity 1 + scale(1)` over `--duration-base` with `--ease-out`.
- Close: reverse over `--duration-fast` (160ms).
- Applies to: SettingsPanel, ImportDialog, ImportHistoryModal, DuplicateResolutionDialog.

### Onboarding step transition
- Sequential cross-fade (NOT overlapping).
- Outgoing: `opacity 1 → 0` + `translateY(0 → -8px)` over `--duration-fast` (160ms).
- Then: incoming `opacity 0 + translateY(8px) → opacity 1 + 0` over `--duration-base` (200ms).
- Step rail dot updates concurrent with incoming step's entry.

### Dropzone enter / leave
- Mount: `opacity 0 → 1` over `--duration-base` (200ms).
- Unmount: `opacity 1 → 0` over `--duration-fast` (160ms).
- Inner arrow pulse: `scale(1) → scale(1.05) → scale(1)` over 1.2s, loop indefinitely while overlay mounted.

### Status pill state change
- Old content: `opacity 1 → 0` over `--duration-fast` (sequential, not overlapping with new content).
- Container width: auto-animates via CSS `width: max-content` transition over `--duration-fast`.
- New content: `opacity 0 → 1` over `--duration-fast` after old content faded.
- Total transition: ~320ms (back-to-back) — within the `--d-cap` 400ms upper bound.

### Spinners
- All loading spinners are the same shape:
  - 12px small (status pill), 16px medium (button-inline), 48px large (reconciliation overlay).
  - Arc: 270° sweep, 1.5-3px stroke (proportional).
  - Color: `--color-orange` arc on `--color-cream-edge` track.
  - Rotation: 1.2s loop, linear.
  - Reduced motion: static (no rotation); replace with three-dot ellipsis text where appropriate.

### Prefers-reduced-motion
- All `--duration-*` tokens override to `0ms` (already declared in `tokens.css` L177-188).
- Transform animations replaced with opacity-only swaps.
- Spinners become static "Indexing..." / "Importing..." text.
- Dropzone arrow pulse pauses (`animation-play-state: paused`).

### Cursor states
- Buttons / interactive: `cursor: pointer`.
- Disabled buttons: `cursor: not-allowed`.
- Drag handles (existing Phase 1 — unchanged): `cursor: col-resize`.
- Drop zones (active): `cursor: copy`.

---

## §10 Copywriting Contract — full inventory

Every user-visible string in Phase 2, grouped by surface. **All strings are English. Voice: calm, precise, low-friction. Mark `(default)` indicates default — confirm during plan-phase review.**

### §10.1 Onboarding — Step 1 Welcome
- Wordmark: `mneme` (default)
- Headline: `Let's set up your study vault.` (default)
- Body: `A local-first place for your coursework, notes, and conversations with Claude. Takes about a minute.` (default)
- Primary CTA: `Continue` (default)

### §10.2 Onboarding — Step 2 Auth check
- Headline: `Verifying Claude Code authentication` (default)
- Body: `Reading your local Claude CLI session. No network calls.` (default)
- Status (found): `Claude CLI detected · {version}` + sublabel `OAuth session active` (default)
- Status (checking): `Looking for Claude CLI…` (default)
- Status (not-found): `Claude CLI not detected. Run \`claude --version\` in Terminal first, then return here.` (default)
- Secondary action (not-found only): `Open Claude Code guide` (default)
- Primary CTA: `Continue` (default)

### §10.3 Onboarding — Step 3 Vault picker
- Headline: `Choose your vault location` (default)
- Body: `Mneme will create folders here for your courses, sources, notes, and concepts.` (default)
- Input label: `Vault path` (default)
- Browse button: `Browse` (default)
- Validation (valid, new): `Path will be created.` (default)
- Validation (valid, exists): `Existing vault detected. Mneme will use it.` (default)
- Validation (invalid, outside home): `That path can't be used. Try a folder under your home directory.` (default)
- Validation (invalid, no write perm): `Mneme can't write here. Choose another folder.` (default)
- Primary CTA: `Use this path` (default)
- Secondary action: `Choose another folder` (default)

### §10.4 Onboarding — Step 4 MCP status
- Headline: `You're in self-ecosystem mode` (default)
- Body: `Mneme doesn't talk to external MCP servers right now. Everything stays on your machine.` (default)
- Status: `No external MCP configured` + sublabel `v1 ships with local-only flow` (default)
- Primary CTA: `Continue` (default)

### §10.5 Onboarding — Step 5 Add course
- Headline: `Add your first course` (default)
- Body: `Use the course code from your university schedule. You can add more in Settings later.` (default)
- Input label: `Course code` (default)
- Input placeholder: `e.g. COMP3221` (default)
- Add button: `Add course` (default)
- Validation (typing-valid): `Looks like a course code.` (default)
- Validation (typing-invalid): `Four letters + four digits — like \`COMP3221\`.` (default)
- Validation (added): `Added: {CODE}` (default)
- Validation (error): `Couldn't create that course folder. {reason}` (default)
- Primary CTA: `Continue` (default)
- Secondary action: `Skip — add later` (default)

### §10.6 Onboarding — Step 6 Demo import
- Headline: `Try a quick import` (default)
- Body: `Drop a file from your computer to see how importing works. Skip if you'd rather not.` (default)
- Drop zone hero: `Drop a file` (default)
- Drop zone sublabel: `or click to browse` (default)
- Drop zone note: `We'll put it in your _inbox folder.` (default)
- Success: `Imported: {filename}` (default)
- Primary CTA: `Finish` (default)
- Secondary action: `Skip` (default)

### §10.7 Settings — Panel chrome
- Title: `Settings` (default)
- Close button aria-label: `Close settings` (default)
- Rail items: `General`, `Vault`, `Sync`, `Claude`, `Privacy`, `Appearance`, `Keybindings`, `Advanced` (default — order locked by REQ-10)

### §10.8 Settings — Vault category
- Category header: `Vault` (default)
- Path label: `Vault path` (default)
- Browse button: `Browse…` (default)
- Move button: `Move…` (default)
- Courses label: `Courses` (default)
- Add course button: `+ Add course` (default)
- Per-course row notes-count format: `notes ({N})` (default — N = file count from index)
- Per-course menu items: `Open folder`, `Remove course` (default)
- Move confirmation body: `Move vault to {new-path}? The original folder stays at {old-path} for you to delete manually in Finder.` (default)
- Move confirmation buttons: `Cancel`, `Move vault` (default)
- Remove course confirmation: `Remove course {CODE} from the list? Files in courses/{CODE}/ stay on disk.` (default)
- Remove course buttons: `Cancel`, `Remove course` (default)
- Move success toast: `Move complete. Old vault preserved at {old-path}.` (default)

### §10.9 Settings — Appearance category
- Category header: `Appearance` (default)
- Section label: `Theme` (default)
- Option (selected): `Light` (default)
- Option (disabled): `Dark — coming soon` (default)
- Section label: `Font size` (default)
- Option (selected): `Comfortable (16px body)` (default)
- Option (disabled): `Compact (14px body)` (default)
- Footnote: `Dark mode and font sizing arrive in a future ui-phase.` (default)

### §10.10 Settings — Keybindings category
- Category header: `Keybindings` (default)
- Section label: `Active` (default)
- Row (action / chord): `Quit / ⌘ Q` (default)
- Row: `Open Settings / ⌘ ,` (default)
- Row: `Open file picker / ⌘ I` (default)
- Row: `Send message / ↵` (default)
- Row: `Newline in input / ⇧ ↵` (default)
- Footnote: `Override coming in Phase 3+.` (default)

### §10.11 Settings — Coming-soon categories

| Category | Body |
|----------|------|
| General | `Coming in Phase 3.` + `General settings — window size, startup behavior, language — arrive when Phase 3 introduces multi-session.` (default) |
| Sync | `Coming in v2.` + `Sync between devices is a v2 feature. Mneme is single-device-first by design.` (default) |
| Claude | `Coming in Phase 3.` + `Model selection, system-prompt config, and per-session limits arrive when Phase 3 wires multi-session.` (default) |
| Privacy | `Coming in Phase 7.` + `Data residency controls and conversation retention arrive when Phase 7 ships the knowledge graph.` (default) |
| Advanced | `Coming in Phase 4+.` + `Power-user toggles (vault index reset, log export, MCP overrides) arrive incrementally.` (default) |

### §10.12 Import dialog
- Title: `Import {N} files` (default — N dynamic; singular `Import 1 file`)
- Files label: `Files to import` (default)
- Course label: `Course` (default)
- Course picker placeholder (4-10 select): `Choose a course…` (default)
- Course picker placeholder (10+ typeahead): `Type to filter…` (default)
- Category label: `Category` (default)
- Category options: `Lectures`, `Tutorials`, `Assignments`, `Announcements`, `_inbox  (default — uncategorized)` (default)
- Cancel button: `Cancel` (default)
- Primary CTA: `Import {N} files` (default — N dynamic; singular `Import 1 file`)
- Submitting CTA: `Importing…` (default)

### §10.13 Import dialog — 0-courses replacement state
- Headline: `No courses yet.` (default)
- Body: `Add a course in Settings → Vault, then re-drop your files.` (default)
- Primary CTA: `Open Settings` (default)
- Secondary: `Close` (default)

### §10.14 Duplicate resolution sub-dialog
- Title (single): `File already exists` (default)
- Title (batch): `File already exists ({K} of {M})` (default)
- Body: `{filename} already exists in {COURSE} / {category}.` (default)
- Prompt: `What would you like to do?` (default)
- Option 1: `Replace` (default) + sublabel `Overwrites the existing file.` (default)
- Option 2: `Skip` (default) + sublabel `Keeps the existing file as-is.` (default)
- Option 3: `Rename` (default) + sublabel `Save the new file as \`{filename-1.ext}\`.` (default — auto-renamed preview)
- Batch checkbox: `Apply to all {M} remaining duplicates` (default)
- Primary CTA: `Continue` (default)

### §10.15 Dropzone overlay
- Hero: `Drop to import` (default)
- Sublabel: `Files land in your selected course and category — pick on the next screen.` (default)

### §10.16 Import status pill
- Importing: `importing {N} files…` (default — singular `importing 1 file…`)
- Imported (just now): `imported {N} files · just now` (default — singular `imported 1 file · just now`)
- Imported (m/h ago): `imported {N} files · {N}m ago` / `imported {N} files · {N}h ago` (default)
- Error: `{N} / {M} imported · 1 error` / `{N} / {M} imported · {E} errors` (default)
- Cancelled: `{N} / {M} imported · cancelled` (default)
- ARIA label: `Import history` (default)

### §10.17 Import history modal
- Title: `Import history` (default)
- Empty heading: `No imports yet.` (default)
- Empty body: `Drop files on the window, press Cmd+I, or use Settings → Vault.` (default) <!-- v1.x spec deferral: copy mentions Cmd+I which works in current implementation but spec no longer guarantees v1 contract per Phase 02.1 D-06 -->

- Row top-line format: `{ISO timestamp}   {status icon}  {N files} | {N} / {M} imported | {N} / {M} imported`  (default)
- Row bottom-line format: `{COURSE} / {category} · {summary}` (default)
- Per-file error line: `└ {filename} — {error reason}. Re-drop to retry.` (default)
- Footer note: `Scroll for more — showing most recent 20.` (default)
- Close button: `Close` (default)

### §10.18 Reconciliation overlay
- Headline: `Indexing vault…` (default)
- Counter: `{N} / {M}` (default — mono)
- Reduced-motion fallback: `Indexing vault — {N} of {M}.` (default — static)

### §10.19 TitlebarMeta updates
- Vault label prefix: `vault: ` (default — unchanged from Phase 1)
- Long-path truncation: `vault: {first 8 chars}…{last 16 chars}` (default — middle ellipsis)
- Settings cog aria-label: `Open settings` (default — replaces Phase 1 placeholder label)

### §10.20 Voice & tone reference
- ✗ `Welcome aboard! 🎉 Let's get you set up.` — chirpy
- ✗ `Initialize Application Configuration Settings` — corporate
- ✓ `Let's set up your study vault.` — calm, direct
- ✗ `Oops! Something went wrong.` — chirpy
- ✗ `An error occurred during the import operation.` — corporate
- ✓ `assignment3.docx — write failed. Re-drop to retry.` — calm, actionable
- ✗ `You haven't added any courses yet. Click here to add one!` — chirpy
- ✗ `Course collection is empty. Initialization required.` — corporate
- ✓ `No courses yet. Add a course in Settings → Vault, then re-drop your files.` — calm, direct, actionable

---

## §11 Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — §5 + §10 cover every user-visible string; voice consistent (calm, precise, low-friction); revision 1 expanded `Add` → `Add course` and `Remove` → `Remove course` for two-noun CTA clarity; destructive copy specifies non-destructive consequence ("old vault stays at…")
- [x] Dimension 2 Visuals: PASS — Single direction (KD-13 Anthropic/Claude family); intentional hierarchy per surface (revision 1 added explicit `**Hierarchy:**` callouts to §8.2 / §8.3 / §8.6); depth via shadows + soft borders; no template defaults
- [x] Dimension 3 Color: PASS — 60/30/10 split locked; accent reserved list explicit (7 elements); `--color-success` (`#4ea36b`) tokenized + reserved-for-onboarding-only callout added (revision 1); form-isolation contract preserved (Phase 1 D-22 holds)
- [x] Dimension 4 Typography: PASS — 4 sizes max (meta 14 / body 16 / heading 20 / display 28); 2 weights (regular/semibold); revision 1 collapsed inline 11px (pill) + 32px (wordmark + dropzone hero) into the 4-size scale; no Inter/Arial; serif body across reading surfaces
- [x] Dimension 5 Spacing: PASS — 8-point scale + 4/12/20/40 (all multiples of 4); pill height 20px (revision 1, was 22px); no ad-hoc px values in §8
- [x] Dimension 6 Registry Safety: PASS — N/A (no shadcn / no third-party registries)

**Approval:** approved 2026-05-15 (revision 1 — gsd-ui-checker verified all 6 dimensions PASS)

---

*Phase: 02-vault-canvas-ed-sync-onboarding*
*UI-SPEC drafted: 2026-05-15 · revised: 2026-05-15 (revision 1 — close 1 BLOCK + 4 FLAGs from gsd-ui-checker)*
*Visual SSOT: tokens.css + Mneme.html (main shell) + this document (Phase 2 net-new surfaces)*
*Living visual contract (cream `#E6E3DC` + olive + Fraunces) does NOT apply — that is tool-HTML only per 2026-05-14 dual-track*
*Next step: gsd-ui-checker validates against 6 design quality dimensions*
