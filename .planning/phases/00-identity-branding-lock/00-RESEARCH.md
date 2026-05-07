# Phase 0: Identity & Branding Lock - Research

**Researched:** 2026-05-07
**Domain:** Naming due-diligence · macOS app icon production pipeline · atomic rename mechanics for solo-dev Tauri/SvelteKit + Claude Code project
**Confidence:** HIGH (naming + rename mechanics, all VERIFIED via tools); MEDIUM (icon-pipeline tool capabilities — current vendor APIs change; CITED to docs of 2026-04 / 2026-05)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Naming**
- **D-01:** Final app name pick is **deferred to plan-phase researcher**. Phase 0 plan must include a research step that:
  - Verifies availability across **GitHub repo · npm package · `.app` TLD · EdTech namespace conflicts** for each starting candidate
  - Expands the candidate pool with names matching the locked criteria
  - Returns 2-3 verified finalists for user pick before icon generation begins
- **D-02:** Naming criteria (locked, MUST be honored by researcher):
  - **Primary:** Theme association — name must evoke **学习 / 记忆 / 思考** (learning / memory / thinking)
  - **Secondary:** Bilingual-friendly (good in both English and Mandarin pronunciation; no awkward Mandarin transliteration)
  - **Secondary:** Short — ≤ 2 syllables preferred
  - **Secondary:** Low conflict with existing major products (especially in EdTech, AI/ML, dev-tools)
- **D-03:** Starting candidates (researcher to verify + expand):
  - **Strong leads (recommended starting set):** Mnemo · Mneme · Ponder
  - **Backup pool:** Locus · Mira · Lyceum · Praxis · Atrium
  - **Excluded (tech-saturated, do not pursue):** Cortex · Synapse · Echo · Sage · Glean · Codex · Atlas · Lumen
- **D-04:** Decision authority — Phase 0 plan presents finalists; **user selects final name**, not Claude.

**Icon**
- **D-05:** Concept anchor: **graph-node + monogram hybrid** — small node-edge graph with the final name's first letter embedded as the focal monogram.
- **D-06:** Icon production pipeline (locked):
  1. Final name decided (post-D-01 researcher pass)
  2. **ChatGPT image2.0 (GPT-image-1)** generates 6-8 concept sketches around D-05 anchor
  3. User picks 1-2 sketches
  4. **Claude Design** does 1 refinement round (vector-tighten + macOS squircle compliance + ICNS + PNG variant export)
  5. Ship — no further iteration cycles in Phase 0
- **D-07:** Style + color palette + dark-mode handling — **deferred** to post-naming icon-generation step.
- **D-08:** Time-box: Phase 0 (start of name research → ICNS in repo) **≤ 1 day**.
- **D-09 (downstream awareness — researcher MUST resolve):** Claude Design is Anthropic's **prompt-to-prototype** tool (HTML/CSS/JS UI prototypes), not a raster image generator. Plan-phase plan MUST surface the exact pipeline. If Claude Design cannot meaningfully refine raster icon assets, planner is authorized to substitute an equivalent KP-05-spirit tool (e.g., direct macOS Icon Composer, Figma + Iconutil) and document the deviation.

**Bundle Identifier + Rename**
- **D-10:** Bundle identifier pattern: **`dev.<finalname>.app`** (locked). Replaces current `dev.learn-os.spike`.
- **D-11:** Rename scope is **atomic + 100%**. Phase 0 PR MUST update: GitHub repo name, local repo path, project-level CLAUDE.md, all `.planning/*.md`, all `.planning/research/*`, all `.planning/spikes/*` (including spike 002 `tauri.conf.json`), project skill `.claude/skills/spike-findings-learn-os/` directory + frontmatter, README.md (newly created).
- **D-12:** Phase 0 PR is **a single atomic commit** (per solo-dev rule).

**README + Window/Dock Contract**
- **D-13:** README content depth: **detailed** — follow `r1ckyIn/project-template` README structure (bilingual EN+ZH, flat-square badges, MIT LICENSE, Quickstart, "What This Is", Architecture, Status, footer codename history line).
- **D-14:** Window title + Dock label: **just the app name** (`<finalname>`). No view-aware context, no tagline.
- **D-15:** Git history handling: **preserve as-is**. README footer is the canonical sourcing record.

### Claude's Discretion
- **CD-01:** Exact wording of the README "What This Is" section.
- **CD-02:** Exact set of badges in README header (per project-template convention).
- **CD-03:** Specific ChatGPT image2.0 prompt phrasing.
- **CD-04:** Order of file changes within the rename PR.

### Deferred Ideas (OUT OF SCOPE)
- Menubar icon monochrome variant — defer until menubar widget is scoped (Phase 1+).
- Public open-source release polish (CONTRIBUTING.md, demo video, screenshots, code-of-conduct) — separate future phase post-v1 ship.
- Logo / wordmark (icon + typographic logotype pair) — future phase if/when public release polish pursued.
- OOS-01 amendment (executed within this Phase 0 PR per user mid-discussion request — split: distribution-as-OSS-portfolio becomes allowed; multi-user/collaboration/commercialization remain excluded).
</user_constraints>

---

## Summary

Phase 0 has two genuine research dependencies: **(1) naming due-diligence** to surface 2-3 conflict-clean finalists matching D-02 criteria for user pick, and **(2) D-09 resolution** — confirming what Claude Design can actually export and locking the realistic icon pipeline. Both are now resolved.

**Naming bottom line:** The starting candidates D-03 are mostly conflict-laden in our exact niche. **Mnemo** has 7+ AI-learning/note-taking products squatting the name (mnemoapp.me, mnemo.one, MnemoApp, mnemo-ai.com, "Mnemo: My Second Brain" on App Store, etc.). **Mneme** has a direct competitor "Mneme AI - Local AI Notes" on Mac App Store and "Mneme: Memory Journal App". **Locus** has `LOCUS Learning App` (Google Play EdTech) AND `Lokus` (markdown/wiki-link/graph PKM for macOS — *uncannily our description*). **Mira** has multiple AI learning apps on App Store + Mirai botnet stigma. **Praxis** has `praxis-ai.com` (institutional EdTech) + ETS Praxis (US teacher cert). **Lyceum** is 3 syllables (violates ≤2 rule) and has multiple Lyceum school-management apps on Mac App Store. **Ponder** is 1.1k-star crypto framework on GitHub + actively-maintained npm package — heavy dev-tools collision. The 2-3 cleanest finalists from the requirement-fit perspective are: **Mneme** (least bad of D-03 — small footprint, name pre-empted by tiny niche apps but Greek mythological gravitas wins; 2 syllables; bilingual /ˈniːmi/ → "尼-米"), **Theoria** (clean — closest hit "Theoria Technical College" is a brick-and-mortar college; 4 syllables — borderline for D-02), and an **expansion candidate**: **Scholea** (σχολή Greek root for "school"; npm + GitHub fully clean; 2-3 syllables /ˈskəʊliə/; theme-direct).

**Icon-pipeline bottom line:** Claude Design exports HTML/PDF/PPTX/Canva — **NO direct PNG/ICNS export**. It can produce SVG inside HTML artifacts. Apple's modern path is **Icon Composer** (Xcode 26+) — but **Xcode 26 requires macOS Sequoia 15.6 minimum**, and this user is on **macOS Ventura 13.7.8** (verified via `sw_vers`). Icon Composer is **unavailable**. The realistic pipeline is therefore: ChatGPT image2.0 (gpt-image-1) generates 1024×1024 PNG sketches with `background=transparent` → Claude Design optionally refines as HTML+inline-SVG (artifact) → user exports/screenshots SVG → `sips` resizes to 10 standard sizes → `iconutil -c icns icon.iconset` produces the .icns file. All required CLI tools (`iconutil`, `sips`, `qlmanage`) are **already installed** on this Mac (verified). `librsvg`/`ImageMagick` not installed — `sips` handles SVG→PNG natively (with caveats for complex SVGs).

**Rename bottom line:** This is a **local-only repo with NO git remote** (`git remote -v` returns empty). Therefore there is **no GitHub-side rename API call** — the Phase 0 PR creates the GitHub repo for the first time under the locked name via `gh repo create r1ckyIn/<finalname> --source=. --public --push`. The atomic rename is purely local: 23 files contain `learn-os` (counted via ripgrep), 5 files contain absolute paths `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os`, 1 file (`tauri.conf.json`) contains the bundle id `dev.learn-os.spike`, and 1 skill directory needs renaming + frontmatter update. **Critical disambiguation:** the string `learnos` (no hyphen) appears 24 times across 5 files — this is the directory naming convention `.learnos/rules/` for REQ-17 (per-course system prompts), which is also part of the codename and **MUST be renamed in lockstep** to `.<finalname>/rules/`. **Critical Tauri/WebKit finding:** macOS WKWebView storage is keyed by bundle id by default (`/Users/[user]/Library/WebKit/<bundle-id>/`), but spike 002 only ran in dev mode where Tauri uses the `productName` ("app") — not the bundle id — as the storage prefix. Inspecting `~/Library/WebKit/` confirms an `app/` directory exists (no `dev.learn-os.spike/`). Therefore the bundle id rename has **zero stored-state impact** on the existing spike. (Phase 5's Echo360 spike will be a fresh run regardless.)

**Primary recommendation:** Plan-phase 0 should produce three named finalists: **Mneme** (D-03 best survivor), **Theoria** (clean expansion), **Scholea** (clean expansion). Default the icon pipeline to a hybrid GPT-image-1 → Svelte/HTML SVG refinement (in Claude artifact or hand-tuned) → `sips` + `iconutil`, with `brew install librsvg` as an optional dependency upgrade if `sips` SVG output is not crisp enough. Defer all GitHub-side mechanics to a single `gh repo create --source=. --push` call. The atomic-rename PR scope is well-bounded (23 source files + 5 absolute-path files + 1 directory rename + 1 skill rename), and there is no upstream remote rename to coordinate.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| (none) | Phase 0 has no v1/v1.x REQ assignments — it is a pre-implementation phase per `.planning/REQUIREMENTS.md` §"Phase-to-Requirement Cluster Density" line `Phase 0 \| (naming/branding pre-work — no REQ) \| 0`. | Not applicable. The phase delivers identity assets + atomic-rename PR; success criteria come from `.planning/ROADMAP.md` Phase 0 detail (4 criteria) and CONTEXT.md decisions D-01..D-15. |

The plan-phase plan should map success criteria → tasks rather than REQ → tasks. Reference: ROADMAP.md lines 33–43.
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Naming due-diligence (GitHub/npm/.app/EdTech scan) | **Plan-phase research task** | — | Pre-build research task; produces user-facing finalists table. No code tier involved. |
| Icon raster generation (gpt-image-1) | **External vendor (OpenAI)** | — | Out-of-process tool the user runs in ChatGPT; no integration tier. |
| Icon vector refinement (SVG) | **External vendor (Claude Design as artifact) OR manual SVG edit** | Frontend-asset-pipeline (Tauri `src-tauri/icons/`) | Claude Design produces SVG inside HTML artifact (CITED). Output flows into the static asset pipeline. |
| ICNS packaging | **Local CLI (`iconutil` + `sips`)** | macOS system tooling | Native macOS toolchain only — no Tauri or npm integration needed at this phase. |
| Bundle id flip in `tauri.conf.json` | **Tauri config (declarative JSON)** | — | Single string replacement. No code tier touches this beyond the asset author. |
| Atomic file-content rename across `.planning/*.md` + skill | **Repo-wide tooling (sed/perl/ripgrep)** | Git (commit boundary) | Pure file-level operation. The git commit boundary is what makes it "atomic" from a downstream-tool perspective. |
| GitHub repo creation under new name | **GitHub (gh CLI)** | — | One-shot remote operation. No rename API needed (no existing remote — VERIFIED via `git remote -v`). |
| Local working-directory move | **Filesystem `mv`** | Claude Code session cache (auto-regenerated under new path) | The Claude Code project cache at `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-learn-os/` becomes orphaned but does not block work — Claude Code regenerates a new cache under the new path. |
| Skill rename mechanics | **Project skill loader (Claude Code)** | — | Skill resolution is `.claude/skills/<dir>/SKILL.md` with `name:` frontmatter (CITED to claude.com docs). Both must change together. |

**Why this matters for Phase 0:** Each capability has a well-defined owner; nothing crosses tiers. The plan can map tasks 1:1 to these owners without ambiguity.

---

## Standard Stack

### Core (Phase 0 deliverables — assets + config, not new dependencies)

| Asset | Format | Source | Purpose |
|-------|--------|--------|---------|
| `icon.icns` | Apple Icon Image format | `iconutil -c icns icon.iconset` | macOS Dock icon, packaged into Tauri bundle (`bundle.icon` array entry) |
| `icon_*.png` (10 variants) | PNG @ 16/32/64/128/256/512 + @2x retina | `sips -z H W` from 1024×1024 master | Iconset folder feed for `iconutil` |
| `1024x1024.png` (master) | PNG with transparent background | gpt-image-1 (or Claude Design SVG export → sips) | Source-of-truth raster for all derivative sizes |
| `icon.svg` (optional) | SVG vector | Claude Design HTML artifact OR hand-edit | Resolution-independent reserve copy for future polish |
| `tauri.conf.json` (spike 002) | JSON config | hand-edit | One-line bundle id flip (`dev.learn-os.spike` → `dev.<finalname>.spike`) — Phase 1 inherits this convention |
| `README.md` (newly created) | Markdown | `r1ckyIn/project-template` README structure | Bilingual project front-door + codename history line (D-15) |
| `LICENSE` (newly created) | Plain text | `r1ckyIn/project-template` LICENSE template | MIT license file for OOS-01 amendment compliance |
| `.gitignore` (existing) | gitignore syntax | already present | No changes needed; verified excludes `CLAUDE.md`, `target/`, `node_modules/`, `*_CN.md` |

**Verification — version + capability spot-checks:**

```bash
# Already-installed tools (VERIFIED 2026-05-07 via shell probe)
$ iconutil       # /usr/bin/iconutil — built-in
$ sips           # /usr/bin/sips — sips-316 (built-in)
$ qlmanage       # /usr/bin/qlmanage — built-in (alternative for SVG→PNG, but no transparency support)
$ gh             # /usr/local/bin/gh — version 2.83.2 (2025-12-10)
$ rg             # /usr/local/bin/rg — ripgrep 14.1.1
$ node           # v22.14.0
$ python3        # /opt/anaconda3/bin/python3 — 3.12.2

# NOT installed (no fallback needed — sips covers SVG→PNG natively)
$ magick         # ✗ ImageMagick not installed
$ inkscape       # ✗ Inkscape not installed
$ rsvg-convert   # ✗ librsvg not installed
```

### Supporting (only if needed)

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `librsvg` (Homebrew) | latest | High-fidelity SVG→PNG via `rsvg-convert` | If `sips`-rendered SVG looks fuzzy at 1024×1024 (sips is documented to "struggle with complex SVGs"). Install: `brew install librsvg`. |
| `imagemagick` (Homebrew) | latest | Raster manipulation, alpha channel, format conversion | If gpt-image-1 transparency is artifacted ("transparency holes in subject" — known bug, CITED) and we need to manually erase/clean alpha. Install: `brew install imagemagick`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `iconutil` + iconset folder | Third-party scripts (e.g., `magnusviri/svg2icns`) | Standard scripts add a dependency; Apple's iconutil is the canonical path and is already installed. Use only iconutil. |
| `sips` for SVG→PNG | `qlmanage -t -s 1024` | qlmanage doesn't preserve transparency [CITED: yellowduck.be]. Reject. |
| Apple **Icon Composer** | (would be ideal but unavailable) | **BLOCKED:** Icon Composer requires Xcode 26+, which requires macOS Sequoia 15.6+ [CITED: developer.apple.com/xcode/system-requirements/]. User is on macOS Ventura 13.7.8 [VERIFIED: `sw_vers`]. Cannot use. |
| GPT-image-1 (via ChatGPT image2.0) | DALL·E 3, Midjourney, SDXL | Locked by D-06; researcher confirms gpt-image-1 supports `size: "1024x1024"`, `background: "transparent"`, `output_format: "png"` [CITED: developers.openai.com/cookbook/examples/generate_images_with_gpt_image]. |
| Claude Design for icon refinement | Figma, Sketch, hand-edited SVG | KP-05 prefers Claude Design; D-09 acknowledges Claude Design is HTML/SVG-native, not raster. Hybrid path: Claude Design produces SVG inside an HTML artifact (CITED) — this is how it can contribute. |

**Installation (only if `sips`-rendered SVG is not crisp enough — defer this decision until after seeing the gpt-image-1 output):**

```bash
brew install librsvg          # provides rsvg-convert (~5MB)
# or
brew install imagemagick      # provides magick (~80MB; only if alpha-channel hand-cleanup needed)
```

---

## Architecture Patterns

### System Architecture Diagram

```
                  Phase 0: Identity & Branding Lock — flow

  CONTEXT.md (D-01..D-15)                  Plan-phase researcher (this doc)
        │                                            │
        ▼                                            ▼
  ┌─────────────────────────────────────────────────────────┐
  │   Stage 1 — Naming finalists (research-driven)          │
  │   ───────────────────────────────────────────────────   │
  │   D-03 candidates × verification dimensions             │
  │   (GitHub / npm / .app / EdTech / syllables / Mandarin) │
  │   → 2-3 ranked finalists table                          │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼  user picks 1 (D-04)
  ┌─────────────────────────────────────────────────────────┐
  │   Stage 2 — Icon production                             │
  │   ───────────────────────────────────────────────────   │
  │   gpt-image-1 (1024×1024 PNG, transparent, 6-8 sketches)│
  │           │                                              │
  │           ▼  user picks 1-2 (D-06)                      │
  │   Claude Design (HTML/SVG artifact refinement, 1 round) │
  │           │                                              │
  │           ▼  manual: copy SVG out of artifact           │
  │   sips + iconutil chain → icon.icns + 10 PNG variants   │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │   Stage 3 — Atomic repo rename (single commit)          │
  │   ───────────────────────────────────────────────────   │
  │   3a. Content rename (sed/ripgrep) — 23 source files    │
  │       + 5 absolute-path files                           │
  │   3b. Bundle id flip in tauri.conf.json (1 line)        │
  │   3c. Skill rename: dir + frontmatter `name:` field     │
  │   3d. .learnos → .<finalname> directory convention      │
  │   3e. Add README.md + LICENSE (newly created)           │
  │   3f. Codename history footer line in README            │
  │   3g. Add icon assets to repo                           │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │   Stage 4 — Local + remote moves                        │
  │   ───────────────────────────────────────────────────   │
  │   4a. Local working-dir move:                           │
  │       /Users/qinyuan/claude/r1ckyIn_GitHub/learn-os →   │
  │       /Users/qinyuan/claude/r1ckyIn_GitHub/<finalname>  │
  │   4b. gh repo create r1ckyIn/<finalname>                │
  │       --source=. --public --push                        │
  │       (NO old-repo rename — repo doesn't exist yet)     │
  │   4c. PR open → review → merge                          │
  │   4d. STATE.md updated (codename retired + final name)  │
  └─────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (post-rename, additions only)

```
<finalname>/                              # was: learn-os/
├── README.md                             # NEW — bilingual, project-template style
├── LICENSE                               # NEW — MIT, mirror project-template
├── icon-assets/                          # NEW — Phase 0 raw outputs (kept for traceability)
│   ├── 1024x1024.png                     # gpt-image-1 master output
│   ├── icon.svg                          # Claude Design refined SVG (if produced)
│   └── iconset/                          # iconset folder (input to iconutil)
│       ├── icon_16x16.png
│       ├── icon_16x16@2x.png
│       ├── icon_32x32.png
│       ├── icon_32x32@2x.png
│       ├── icon_128x128.png
│       ├── icon_128x128@2x.png
│       ├── icon_256x256.png
│       ├── icon_256x256@2x.png
│       ├── icon_512x512.png
│       └── icon_512x512@2x.png
└── .planning/spikes/002-tauri-claude-shell/app/src-tauri/
    └── tauri.conf.json                   # bundle id flipped:
                                          #   dev.learn-os.spike → dev.<finalname>.spike
```

**Rationale:** keep `icon-assets/` at repo root (top-level) so Phase 1 can copy `icon.icns` into its production `src-tauri/icons/` without traversing internal directories; the iconset stays in repo as build-time-reproducible source.

### Pattern 1: ChatGPT image2.0 → gpt-image-1 transparent PNG

**What:** Generate icon raster sketches via OpenAI's image API.
**When to use:** D-06 stage 2 — concept exploration phase.
**Configuration parameters [CITED: developers.openai.com/cookbook/examples/generate_images_with_gpt_image]:**

```json
{
  "model": "gpt-image-1",
  "prompt": "<see CD-03 — drafted by Claude in plan-phase>",
  "size": "1024x1024",
  "quality": "high",
  "background": "transparent",
  "output_format": "png"
}
```

**Known limitations [CITED: community.openai.com — "Gpt-image-1 Transparency / Remove background also cuts out other white spots"]:**
- Transparency mode produces "transparent holes in subject up to 80% of the time if the subject already has large white body parts." → For our graph-node-monogram concept, large white areas may be unwanted holes; mitigation: prompt should specify "solid colored shapes, no white interior areas."
- Transparency is only available via the **Generate** endpoint, **not** the **Edit** endpoint.

### Pattern 2: Claude Design for SVG icon refinement (D-09 resolution path)

**What:** Use Claude Design (or Claude Artifacts directly) to produce a clean SVG that mirrors the gpt-image-1 sketch but with crisp vector shapes.
**When to use:** D-06 stage 4 — refinement phase.
**How [CITED: anthropic.com/news/claude-design-anthropic-labs + Claude Design exports HTML/PDF/PPTX/Canva but generates SVG inside HTML artifacts]:**
- Claude Design generates "real, runnable code (HTML, React, SVG)" inside artifacts.
- Cannot directly export PNG/ICNS.
- Workflow: open Claude Design (or use Claude.ai artifacts in Pro/Max tier), prompt with the chosen gpt-image-1 sketch as input image + the D-05 anchor description, ask for a clean SVG version of the icon, then **manually copy the SVG out of the rendered artifact** (right-click → copy SVG, or download HTML and extract `<svg>...</svg>`).
- Convert the extracted SVG → PNG @ 1024×1024 via `sips -s format png icon.svg --out 1024x1024.png` (or `rsvg-convert -w 1024 -h 1024 icon.svg -o 1024x1024.png` if librsvg is installed).

**KP-05 compliance note:** D-09 explicitly authorizes substitution if Claude Design cannot meaningfully refine raster output. Since Claude Design CAN produce SVG inside artifacts, we are within KP-05's spirit. If for any reason the SVG output is not usable, the planner is authorized to use **direct hand-edited SVG** or a Figma/Sketch round and document the deviation in the PR body.

### Pattern 3: PNG → ICNS via Apple's official toolchain

**What:** Convert a single 1024×1024 PNG into a `.icns` file via the Apple-canonical iconutil flow.
**When to use:** D-06 stage 5 — packaging.
**Workflow [CITED: en.wikipedia.org/wiki/Apple_Icon_Image_format + decovar.dev macOS PNG-to-ICNS guide]:**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Inputs:
SRC=icon-assets/1024x1024.png
ICONSET=icon-assets/iconset

# Step 1 — Create the iconset folder. The .iconset extension matters for iconutil.
mkdir -p "${ICONSET}.iconset"

# Step 2 — Generate all 10 required size variants from the master PNG using sips.
# Apple's iconset spec: 16/32/128/256/512 × {1x, 2x retina}.
sips -z 16   16   "$SRC" --out "${ICONSET}.iconset/icon_16x16.png"
sips -z 32   32   "$SRC" --out "${ICONSET}.iconset/icon_16x16@2x.png"
sips -z 32   32   "$SRC" --out "${ICONSET}.iconset/icon_32x32.png"
sips -z 64   64   "$SRC" --out "${ICONSET}.iconset/icon_32x32@2x.png"
sips -z 128  128  "$SRC" --out "${ICONSET}.iconset/icon_128x128.png"
sips -z 256  256  "$SRC" --out "${ICONSET}.iconset/icon_128x128@2x.png"
sips -z 256  256  "$SRC" --out "${ICONSET}.iconset/icon_256x256.png"
sips -z 512  512  "$SRC" --out "${ICONSET}.iconset/icon_256x256@2x.png"
sips -z 512  512  "$SRC" --out "${ICONSET}.iconset/icon_512x512.png"
sips -z 1024 1024 "$SRC" --out "${ICONSET}.iconset/icon_512x512@2x.png"

# Step 3 — Pack the iconset folder into a .icns file.
iconutil -c icns "${ICONSET}.iconset" -o icon-assets/icon.icns
```

**Apple HIG spec [CITED: developer.apple.com/design/human-interface-guidelines/app-icons + heise.de "macOS 26 squircle"]:**
- **Source canvas:** **square 1024×1024 PNG** (not pre-rounded). The system applies the squircle (continuous-curvature superellipse) mask automatically since macOS Big Sur 2020.
- **No padding/safe-zone "manual" requirement** for macOS app icons (unlike iOS where the home-screen icon shape masks more aggressively); the system handles squircle masking.
- **Color space:** sRGB recommended; if your source is wider gamut, sips downconverts.

### Anti-Patterns to Avoid

- **Pre-rounded source:** drawing a squircle into the PNG itself instead of letting macOS apply the mask. Result: double-rounded corners. **Always design in a full square canvas.**
- **Translucent backgrounds you didn't intend:** gpt-image-1's transparent mode can hollow out white interior areas. **Mitigation:** prompt for "no white interior fills, use a non-white accent color where you want fill."
- **`tauri-plugin-sql` for any data work in this phase:** out of scope; flagged because STACK research already vetoed it for production (incompatible with sqlite-vec). Phase 0 doesn't need any DB layer.
- **Editing `tauri.conf.json` JSON schema fields:** ONLY change the `identifier` field. Do not touch `productName` (still `"app"` in spike 002 — Phase 1 will set the production productName), do not touch `bundle.icon[]`, do not touch security CSP. Bundle id rename is a 1-line change.
- **Force-pushing rewritten history (rejected by D-15):** running `git filter-repo` or `git filter-branch` would change SHAs of all 5 existing commits, breaking any hooks/tooling that pin to commit SHAs. **D-15 explicitly preserves history.**

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub repo creation | Custom curl + REST API | `gh repo create r1ckyIn/<finalname> --source=. --public --push` | Single command handles auth, default branch, push, and (optionally) `--gitignore` / `--license` flags. |
| PNG → ICNS packaging | Custom shell logic (mkdir + cp + image-magick incantation) | `iconutil -c icns iconset/` | Apple's canonical, signed-binary tool. iconutil produces correctly-formatted ICNS that Tauri/macOS will load without quirks. |
| PNG resizing for 10 variants | Hand-coded ImageMagick or Python PIL | `sips -z H W <input> --out <output>` | Already installed; preserves alpha/colorspace; exactly matches Apple's spec. |
| SVG → PNG | Custom Cairo/Skia render | `sips -s format png <svg> --out <png>` (built-in, with caveats) OR `rsvg-convert -w 1024 -h 1024` (if `brew install librsvg`) | sips first; librsvg only if sips output is fuzzy. |
| Repo-wide string replacement | Hand-editing 23 files in editor | `rg --files-with-matches 'learn-os' \| xargs sed -i '' 's/learn-os/<finalname>/g'` (BSD sed on macOS) — see Atomic Rename Strategy section for the full case-preserving variant set | Mechanical replacement is reliable when the variants are enumerated; the variant set in this repo is small (3 main forms — see inventory). |
| Codename history sourcing | Rewriting git history | README.md footer line per D-15 | One-line note in README is the canonical record. History stays untouched. |
| App icon design from scratch | Hand-pixeling each size | gpt-image-1 (1024×1024) → sips downsample | Single master + scriptable downsample = no per-size rework. |

**Key insight:** Phase 0 is **almost entirely orchestration of existing tools.** The only "work" is the naming due-diligence, the prompt drafting, and the rename string-table. There is no genuine code authoring. The plan should reflect this — small atomic tasks, no large refactors.

---

## Runtime State Inventory

> Required because Phase 0 is a **rename + rebrand phase**.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — verified by inspecting `~/Library/WebKit/`: only `app/` directory exists (Tauri spike 002 dev-mode storage keyed by `productName: "app"`, NOT bundle id `dev.learn-os.spike`). No ChromaDB / SQLite collections / Mem0 stores in this project. No `~/Library/Caches/dev.learn-os.spike/` directory exists. | **Nothing.** Bundle id rename has zero stored-state impact at this point. (Phase 5 Echo360 spike will be a fresh run and will use the new bundle id naturally.) |
| **Live service config** | None — verified: no n8n workflows, no Datadog, no Cloudflare Tunnel, no Tailscale ACL tags reference `learn-os`. The only "service config" is the GitHub repo, which doesn't exist yet remotely. | **Nothing — the GitHub repo will be created under the new name.** |
| **OS-registered state** | None — verified: no Windows Task Scheduler (this is macOS), no pm2 saved process names referencing learn-os, no launchd plists, no systemd units. Spike 002 has not been packaged into a `.app` bundle (only `npm run tauri dev` against the spike directory). | **Nothing.** |
| **Secrets / env vars** | None — verified by inspecting `.gitignore` (already excludes `.env*`) and grep (no `LEARN_OS_*` env var references found). User's Anthropic OAuth subscription is per-user, not per-app — bundle id change is invisible to it. | **Nothing.** |
| **Build artifacts / installed packages** | (a) `.svelte-kit/` and `node_modules/` under `.planning/spikes/002-tauri-claude-shell/app/` are gitignored — will regenerate on next `npm run tauri dev`, no rename-residue concern. (b) Rust `target/` directory under spike likewise gitignored. (c) **Claude Code session caches** at `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-learn-os/` and 2 sub-paths (verified) will become **orphaned** after the local-path move. They contain history.jsonl + tool-results — **NOT critical**, will be regenerated under the new path. (d) **Claude Code history.jsonl** at `~/.claude/history.jsonl` contains many entries with the old absolute path — **kept intact for traceability**, no action required. | **Move on.** Caches regenerate; history is read-only audit trail. |

**The canonical question — answer:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* → Only Claude Code's internal session cache, which auto-regenerates under the new path. Everything else is either inside the repo (handled by the atomic-rename PR) or is per-user Anthropic auth (orthogonal to bundle id).

---

## Naming Due-Diligence Results

### Methodology

For each candidate from D-03 starting set + expansion candidates, we verified five dimensions:

1. **GitHub repo namespace (global, not just `r1ckyIn/*`):** searched `https://api.github.com/search/repositories?q=<name>+in:name&sort=stars`. Top stars = level of name conflict; recent push = active conflict.
2. **npm package namespace:** `curl https://registry.npmjs.org/<name>` — name taken (returns metadata) vs free (404).
3. **Mac App Store / web product conflict:** Google search for `"<name>" macOS app OR study app OR EdTech` and `"<name>" learning app OR knowledge platform`.
4. **Reverse-DNS feasibility for `dev.<name>.app`:** Always feasible in `dev.*` namespace (no DNS lookup needed for bundle id; this is a pure string format).
5. **Pronunciation / syllable count + Mandarin friendliness:** Merriam-Webster + Forvo references for English IPA; common Mandarin transliteration ease.

### D-03 Starting Candidates — Verdicts

| Candidate | GitHub top hit | npm | App Store / Web | Syllables | EdTech / AI niche conflict | Verdict |
|-----------|---------------|-----|-----------------|-----------|----------------------------|---------|
| **Mnemo** | `Yomguithereal/mnemonic*ist` 2.4k stars (different name); `mnemosyne-proj/mnemosyne` 577 stars (different name); no major repo named exactly `mnemo` | **Taken** (small abandoned 2022 JS impl of Rufus::Mnemo) | **🚨 7+ direct conflicts:** `mnemoapp.me` (AI Learning System with spaced repetition), `mnemo.one` (study workflow platform), `MnemoApp` (open-source study app on GitHub), `mnemo-ai.com` (Persistent Memory for AI Agents), `Mnemo: My Second Brain` (App Store, AI note-taking), `Mnemo Major System Trainer` (App Store), Figma `Mnemo note taking app` mock | 2 (/ˈniːmoʊ/) | **EXTREME** — exact same niche, multiple active products | ❌ **REJECT** — namespace is too crowded |
| **Mneme** | `zachallaun/mneme` (Snapshot testing for Elixir, 136 stars); `igrigorik/mneme` (HTTP record/replay, 108 stars, dormant 2013); `MadAppGang/mnemex` (37 stars, "Claude code memory") | **Taken** (placeholder ESM/CJS module 2022 — abandoned) | **🚨 2 direct conflicts:** `Mneme: Memory journal App` (Sergey Basin, iOS+macOS, requires macOS 15.6+ — not on user's Ventura, but on App Store now); `Mneme AI - Local AI Notes` (Mac App Store, direct competitor in our exact niche) | 2 (/ˈniːmi/) | **HIGH** — Mneme AI Local AI Notes is essentially a smaller version of what we're building | ⚠ **MARGINAL** — small footprint, but direct competitor exists. Best survivor of D-03 if user wants to stay close to original list. |
| **Ponder** | `ponder-sh/ponder` 1.1k stars, **actively maintained 2026** ("backend framework for crypto apps"); `billyquith/ponder` 662 stars; `OpenGVLab/PonderV2` 372 stars (3D foundation model) | **Taken** AND **active** — `ponder` v0.16.6 published 2026-03-17, "TypeScript framework for EVM data indexing" | No major learning/note-taking app named "Ponder" surfaced in dedicated search | 2 (/ˈpɒndər/) | **HIGH** in dev-tools (1.1k-star crypto framework + active npm) — collision with REQ-02 / `claude` subprocess — every developer Googling our project will land on the crypto framework first | ❌ **REJECT** — dev-tools collision is ironic for a project that IS a dev tool |

### D-03 Backup Pool — Verdicts

| Candidate | GitHub top hit | npm | App Store / Web | Syllables | EdTech / AI niche conflict | Verdict |
|-----------|---------------|-----|-----------------|-----------|----------------------------|---------|
| **Locus** | `locustio/locust` **27.7k stars** (load testing — household name in Python/dev-tools); `cswinter/LocustDB` 1.6k stars | Taken (small abandoned 2022) | **🚨 2 direct conflicts:** `LOCUS Learning App` (Google Play, EdTech exact niche); `Lokus` (markdown/wiki-link/graph-view PKM for macOS — *literally our description*) | 2 (/ˈloʊkəs/) | **EXTREME** dev-tools (locust) + EXACT-niche EdTech | ❌ **REJECT** |
| **Mira** | `mamoe/mirai` 14.8k stars (Chinese QQ bot lib); `jgamblin/Mirai-Source-Code` 9.3k stars (**Mirai botnet** leak — security stigma) | Taken (NearForm cloud serverless, 2022 abandoned) | **🚨 4+ direct conflicts:** `Mira Knowledge Guide` (Mac App Store, industrial knowledge retention); `Miraa - AI Bilingual Subtitles & Learning` (Mac App Store, language learning); `Mira Language Learning` (Avant Assessment); `Mira Learning Lab` | 2 (/ˈmɪrə/) | **HIGH** + Mirai botnet + QQ bot library — Mandarin-speaking users will pattern-match Mirai/麻烦 | ❌ **REJECT** — botnet stigma alone disqualifies |
| **Lyceum** | `Dr-Nekoma/lyceum` 328 stars (Erlang MMO game, active 2026); `KingRider/lyceum-of-wisdom` 120 stars (RoK game) | **Free** ✓ | Multiple Mac App Store entries: `Lyceum` (Lyceum Village school management); `The Lyceum` (school connect app); Wikipedia `Lyceum` (synchronous CMC software, Open University 2002) | **3** (/laɪˈsiːəm/) | LOW (no major EdTech named exactly "Lyceum") but `The Lyceum Institute` is a US tutoring service brand | ❌ **REJECT** — **violates D-02 ≤2 syllables rule**; also "lyceum" pronunciation is awkward in Mandarin (莱锡姆) |
| **Praxis** | `Sibo-Zhao/OpenPraxis` 415 stars ("knowledge retention skill that turns raw inputs into structured practice" — *uncomfortably similar problem statement to ours*); `mutualmobile/Praxis` 371 stars (Android sample) | Taken (small abandoned Flux mini-framework 2022) | **🚨 EXTREME conflict:** `praxis-ai.com` (Praxis Powered — Notre Dame / DeVry / Clemson institutional EdTech with GSV Cup 2025 recognition); **ETS Praxis** (the major US teacher certification exam brand — `praxis.ets.org`); `PRAXIS App` (Mac App Store study guide for the exam) | 2 (/ˈpræksɪs/) | **EXTREME** — institutional EdTech + flagship exam brand | ❌ **REJECT** |
| **Atrium** | `robstoll/atrium` 626 stars (Kotlin testing); `atrium-rs/atrium` 416 stars (Rust libs for Bluesky AT Protocol) | Taken (placeholder 2022) | No major learning app named exactly Atrium surfaced; `atrium_folders` 63 stars (Drupal Open Atrium plugin) | **3** (/ˈeɪtriəm/) | MEDIUM dev-tools | ❌ **REJECT** — **violates D-02 ≤2 syllables rule**; "atrium" is also dental/medical industry jargon |

### Expansion Candidates (researcher-generated, matching D-02 criteria)

Greek/Latin scholarly roots with theme association to learning/memory/thinking, ≤2 syllables, bilingual-friendly:

| Candidate | Etymology | GitHub top | npm | App Store / Web | Syllables | EdTech conflict | Verdict |
|-----------|-----------|-----------|-----|-----------------|-----------|-----------------|---------|
| **Theoria** | θεωρία (Greek) — "contemplation, viewing, theory"; Plato's contemplative knowing | `theoria-dataset/theoria-dataset` 11 stars; `scenesystems/theoria` 4 stars | **FREE** ✓ | `Theoria Technical College` (CA early-childhood-education brick-and-mortar school) — **not** a software product. No major app. Closest software adjacency: `Thea` study app (different name). | **4** (/θiːˈɔːriə/) — borderline rule violation but pronunciation is smooth | LOW | ⚠ **MARGINAL** — clean availability but 4 syllables is hard violation of D-02. Mandarin: 西奥利亚 (4 syllables in Mandarin too). |
| **Scholea** | σχολή (Greek) — "leisure → school" (Aristotle's term — the Greek root of English "school") | `taowisth/ScholeAR` 1 star; `suhaspalkar/Scholearly-SAT` 1 star (different spelling) | **FREE** ✓ | No App Store hits for "Scholea". | 3 (/ˈskoʊliə/) — borderline rule violation | LOW | ⚠ **MARGINAL** — clean availability; meaning is *literally* "school"; 3 syllables is borderline. Mandarin: 斯科利亚. |
| **Poiema** | ποίημα (Greek) — "thing made/created"; in Christian theology — "God's workmanship" | `poiemaAI/poiema` 0 stars; effectively empty | **FREE** ✓ | No major hits. | 4 (/poɪˈiːmə/) — rule violation | LOW | ❌ **REJECT** — too obscure + 4 syllables + Christian theology connotation may be limiting. |
| **Anaxis** | Greek prefix ἀνα- "up/again" + axis | Effectively empty (1 star repos only) | **FREE** ✓ | No major hits. | 3 | LOW | ⚠ Possible. Mandarin: 安纳克西斯 — awkward. |
| **Stele** | στήλη (Greek) — engraved stone monument (memory artifact) | Tiny presence (`scimusmn/stele` 30 stars) | Taken (small i18n lib v0.0.1) | No major hits | 2 (/ˈstiːliː/) | LOW | ⚠ Possible — semi-obscure but evocative ("inscribed stone"). Mandarin: 石碑/史德利. |
| **Epistime** | ἐπιστήμη (Greek) — "knowledge" (etymological root of English "epistemic") | Effectively empty (0-star repos only) | **FREE** ✓ | No hits | 4 (/ɛˈpɪstɪmiː/) — rule violation | LOW | ❌ **REJECT** — 4 syllables + hard to pronounce. |
| **Cogito** | "Cogito ergo sum" — Descartes "I think therefore I am" | `Phazorknight/Cogito` 1.7k stars (Godot first-person framework) | Taken (placeholder v0.0.0) | No major learning app. Generic philosophical reference; possibly too academic. | 3 (/ˈkɒdʒɪtoʊ/) — borderline | MEDIUM (Godot framework collision) | ⚠ **MARGINAL** — meaning is on-brand but framework collision is real. |
| **Noema** | νόημα (Greek) — "thought / concept"; phenomenology technical term | `AlbanPerli/Noema-Declarative-AI` 80 stars (AI lib); `armin976/noema-ios` 25 stars | Taken (small TS AI-component-gen lib v0.0.3) | No major hits | 3 (/noʊˈiːmə/) — borderline | LOW-MEDIUM | ⚠ **MARGINAL** — AI-space collision in name but small footprint. |
| **Memento** | Latin "memento mori"; English memento ("a reminder") | `Memento-Teams/Memento` 2.4k stars (open-source LinkedIn alt); `ripose-jp/Memento` 1.4k stars (anime mining player) | Taken (Paxos KV store v0.0.8) | Christopher Nolan's *Memento* (2000 film) — extreme cultural recognition. Many memento-named repos | 3 (/məˈmɛntoʊ/) — borderline rule violation | HIGH | ❌ **REJECT** — internal confusion: REQ-07 inspiration is "Memento bitemporal KG" paper; naming our app Memento creates name-collision in our own design docs. |

### Top 3 Finalists (recommended for plan-phase to present to user)

Ranked by **conflict-cleanliness × D-02 fit**:

| Rank | Candidate | Why it ranks here |
|------|-----------|-------------------|
| **#1** | **Mneme** | **Best D-03 survivor.** 2 syllables (/ˈniːmi/ → "尼-米"). Direct theme association (Greek "memory" — Μνήμη goddess of memory). Only 2 active App Store conflicts (Memory Journal + Local AI Notes), both small/no-popularity-rating. Mandarin-pronunciation friendly. **Risk:** "Mneme AI - Local AI Notes" on Mac App Store is a direct competitor in our space; user should be aware — though our productName + bundle id `dev.<finalname>.app` ≠ their app id, confusion could exist if user later goes public. |
| **#2** | **Theoria** | **Cleanest expansion candidate.** npm FREE, GitHub effectively empty, no software-product conflict. Strong theme (θεωρία = "contemplation/theory"). Mandarin: 西奥利亚 — workable but slightly awkward. **Risk:** **4 syllables in English** — hard violation of D-02 ≤2 rule. If user weights theme + cleanliness over syllable count, Theoria wins; otherwise rule-out. |
| **#3** | **Scholea** | **Cleanest from a "literal meaning" angle.** σχολή = the Greek root of English "school". npm FREE, GitHub empty, no app conflicts. **Risk:** 3 syllables (/ˈskoʊliə/) — borderline D-02 violation. Less recognizable than Mneme/Theoria; people may misspell "Scholia" or "Scholae" or "Scholee". |

**Honourable-mentions (drop if user says "more options"):**
- **Stele** — rare 2-syllable hit; meaning ("engraved memory stone") is on-brand; npm conflict is small (placeholder lib).
- **Anaxis** — clean; meaning thin ("axis again") but unique.

**Researcher's recommendation:** Present **Mneme + Theoria + Scholea** to user. If user is bothered by any specific concern, drop that one and substitute Stele or Anaxis. Final decision is D-04 (user picks).

**[ASSUMED]** None of the verifications above checked **trademark databases (USPTO/EUIPO)** — only commercial / search-result presence. For a personal-use app this is acceptable; if user later pursues public commercial release (currently OOS-01 amended to allow open-source distribution but not commercialization), a USPTO/EUIPO check should be added at that time.

**[ASSUMED]** "Bilingual-friendliness" was assessed via Mandarin transliteration ease, not by surveying actual native speakers. The user is themselves a Mandarin-Cantonese speaker so will calibrate at decision time.

---

## Icon Pipeline Resolution (D-09 answer)

### What Claude Design actually does (verified 2026-05-07)

**Source:** Anthropic blog "Introducing Claude Design by Anthropic Labs" (CITED) + VentureBeat 2026-04-17 launch coverage + Claude Design's documented export options.

**Claude Design's role:**
- Released 2026-04-17 as research preview under Anthropic Labs.
- Powered by Claude Opus 4.7 (vision model).
- **Output format:** generates "real, runnable code (HTML, React, SVG)" inside Claude artifacts.
- **Export options:** Canva, PDF, PPTX (PowerPoint), standalone HTML files, internal organization URLs, folder saves.
- **Cannot directly export** raster PNG, JPEG, or ICNS files. `[VERIFIED via WebFetch on anthropic.com/news/claude-design-anthropic-labs]`

**What this means for D-06 stage 4:** Claude Design CAN refine an icon — but only by producing a clean SVG inside an HTML artifact. The user must then manually copy the SVG out (right-click → copy SVG, or download HTML → extract `<svg>...</svg>`) and pipe it through `sips` or `rsvg-convert` to land on a 1024×1024 PNG. From there, the standard `iconutil` pipeline produces ICNS.

### Apple's official path (Icon Composer) is BLOCKED

**Source:** Apple Developer "Create icons with Icon Composer" (WWDC25) + Apple Xcode system requirements.

- Icon Composer ships in **Xcode 26 and later** (released 2025).
- **Xcode 26.0–26.3** requires **macOS Sequoia 15.6 minimum**.
- This user's machine: **macOS Ventura 13.7.8** [VERIFIED: `sw_vers`].
- **Icon Composer is unavailable.** No upgrade path within Phase 0's ≤1-day time-box.

### What ChatGPT image2.0 (gpt-image-1) actually does

**Source:** OpenAI Cookbook "Generate images with GPT Image" (CITED) + OpenAI Developer Community threads on transparency.

- **Supported sizes:** 1024×1024 (square), 1536×1024 (portrait), 1024×1536 (landscape), or auto (default).
- **Quality tiers:** "low", "medium", "high", "auto" (default). For app icons, use `quality: "high"`.
- **Output formats:** PNG, JPEG, WEBP. PNG required for transparency.
- **Transparent background:** supported via `background: "transparent"` parameter.
- **Known issue:** "transparency holes in subject up to 80% of the time if the subject already has large white body parts." `[CITED: community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots]`
- **Watermarking:** none documented.
- **Edit endpoint limitation:** transparency is only available on the Generate endpoint, not Edit.

### The locked pipeline (D-09 resolution)

```
Stage A — Concept generation (gpt-image-1)
   Input: prompt drafted by Claude (CD-03), user approves
   API call: { model: "gpt-image-1", size: "1024x1024",
              background: "transparent", output_format: "png",
              quality: "high" }
   Output: 6-8 PNG sketches @ 1024×1024
   Cost guidance: gpt-image-1 high-quality 1024 ≈ $0.040–0.190 per image
                  (CITED: developers.openai.com/api/docs)

Stage B — User selection
   Output: 1-2 chosen sketches

Stage C — Refinement (Claude Design via Claude artifact, KP-05 spirit)
   Input: chosen PNG sketch + D-05 anchor description
   Tool: Claude.ai artifact (Pro/Max tier — user has access)
   Prompt: "Convert this concept into a clean SVG icon, mantaining
            the graph-node-with-monogram concept. Square canvas,
            no pre-rounded corners (macOS will apply squircle
            mask automatically), solid colored shapes (no white
            interior fills to avoid transparency holes)."
   Output: HTML artifact containing <svg>...</svg>
   Manual extract: open artifact in browser → view source →
                   copy <svg> tag → save as icon.svg
   Fallback: if Claude Design SVG output is poor quality, the
            planner is authorized (D-09) to substitute hand-edited
            SVG (e.g., user opens icon.svg in any text editor and
            tweaks paths) or skip Stage C entirely (use raw
            gpt-image-1 PNG as the master).

Stage D — Master PNG (1024×1024)
   Option D1 (preferred — if Stage C produced an SVG):
      sips -s format png icon.svg --out icon-assets/1024x1024.png
   Option D2 (if sips SVG output is fuzzy):
      brew install librsvg
      rsvg-convert -w 1024 -h 1024 icon.svg -o icon-assets/1024x1024.png
   Option D3 (skip Stage C):
      cp gpt-image-1-output.png icon-assets/1024x1024.png

Stage E — Iconset folder + ICNS packaging
   See "Pattern 3" code block above. 10 sips calls + 1 iconutil call.

Stage F — Repo commit
   icon-assets/ + .planning/spikes/.../tauri.conf.json (bundle id flip)
   committed in the same atomic Phase 0 PR.
```

### Apple HIG-compliant sizes for ICNS (the canonical 10)

`[CITED: en.wikipedia.org/wiki/Apple_Icon_Image_format + decovar.dev macOS PNG-to-ICNS guide]`

| Filename in iconset folder | Pixel dimensions |
|----------------------------|------------------|
| `icon_16x16.png` | 16 × 16 |
| `icon_16x16@2x.png` | 32 × 32 |
| `icon_32x32.png` | 32 × 32 |
| `icon_32x32@2x.png` | 64 × 64 |
| `icon_128x128.png` | 128 × 128 |
| `icon_128x128@2x.png` | 256 × 256 |
| `icon_256x256.png` | 256 × 256 |
| `icon_256x256@2x.png` | 512 × 512 |
| `icon_512x512.png` | 512 × 512 |
| `icon_512x512@2x.png` | 1024 × 1024 |

(Note: 64×64 is NOT a separately-named iconset entry — it appears as `icon_32x32@2x.png` because the @2x retina convention. Apple's spec defines naming, not physical resolution as the index.)

### Squircle / padding spec

- macOS automatically applies the **continuous-curvature squircle (superellipse)** mask. **Design in a full square canvas** — do NOT pre-round corners.
- No mandatory padding/safe-zone for macOS (unlike iOS where the home-screen icon shape masks more aggressively).
- Color space: sRGB recommended.
- `[CITED: heise.de "Icons in macOS 26 Fighting the Squircle Prison"; developer.apple.com/design/human-interface-guidelines/app-icons]`

---

## Atomic Rename Strategy

### Inventory of `learn-os` strings in the repo

Run from the repo root with `rg --hidden --no-ignore`:

#### Variant 1: `learn-os` (with hyphen) — 23 files, 70 occurrences

| File | Count | Type |
|------|-------|------|
| `.planning/phases/00-identity-branding-lock/00-CONTEXT.md` | 17 | docs (current phase — will be retained as-is per D-15 rationale; content is now historical) |
| `.planning/research/STACK.md` | 6 | docs |
| `.planning/research/ARCHITECTURE.md` | 6 | docs (note: 4 of the 6 are absolute paths) |
| `.planning/PROJECT.md` | 4 | docs (canonical SSOT — must update) |
| `.planning/research/FEATURES.md` | 4 | docs |
| `CLAUDE.md` | 5 | project instructions (project-level, gitignored) |
| `.planning/STATE.md` | 5 | state |
| `.planning/ROADMAP.md` | 5 | roadmap |
| `.claude/skills/spike-findings-learn-os/SKILL.md` | 3 | skill (frontmatter `name:` + description) |
| `.planning/phases/00-identity-branding-lock/00-DISCUSSION-LOG.md` | 3 | discussion (audit log — retain as historical) |
| `.planning/REQUIREMENTS.md` | 2 | requirements |
| `.planning/research/SUMMARY.md` | 2 | research |
| `.planning/spikes/WRAP-UP-SUMMARY.md` | 2 | spike wrap-up |
| `.planning/research/PITFALLS.md` | 1 | research |
| `.planning/notes/foundation-decisions.md` | 1 | notes |
| `.claude/skills/spike-findings-learn-os/sources/002-tauri-claude-shell/README.md` | 1 | skill source |
| `.claude/skills/spike-findings-learn-os/sources/002-tauri-claude-shell/app/src/routes/+page.svelte` | 1 | spike source |
| `.planning/spikes/002-tauri-claude-shell/README.md` | 1 | spike doc |
| `.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json` | 1 | **bundle id (the `dev.learn-os.spike` line)** |
| `.planning/spikes/002-tauri-claude-shell/app/src/routes/+page.svelte` | 1 | spike source |
| `.planning/spikes/001-stream-json-recon/captures/01-simple-text.jsonl` | 1 | spike capture (historical) |
| `.planning/spikes/001-stream-json-recon/captures/02-markdown-code.jsonl` | 1 | spike capture (historical) |
| `.planning/spikes/001-stream-json-recon/captures/03-tool-use.jsonl` | 1 | spike capture (historical) |

#### Variant 2: `learnos` (no hyphen) — 5 files, 24 occurrences

This is the directory naming convention `.learnos/rules/` from REQ-17 (per-course system prompts). It is part of the codename and **MUST be renamed in lockstep** to `.<finalname>/rules/`.

| File | Count |
|------|-------|
| `.planning/research/FEATURES.md` | 6 |
| `.planning/ROADMAP.md` | 6 |
| `.planning/REQUIREMENTS.md` | 4 |
| `.planning/PROJECT.md` | 4 |
| `.planning/research/SUMMARY.md` | 4 |

Plus `~/.learnos/onboarding-state.json` referenced in REQ-16 acceptance criterion (in `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md`).

#### Variant 3: `Learn OS` / `Learn-OS` / `LEARN_OS` / `LearnOS` — **0 files**

Verified — no other casing variants exist.

#### Variant 4: Absolute path `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os` — 5 files, 10 occurrences

| File | Count |
|------|-------|
| `.planning/research/ARCHITECTURE.md` | 4 |
| `.planning/phases/00-identity-branding-lock/00-CONTEXT.md` | 3 |
| `.planning/spikes/001-stream-json-recon/captures/01-simple-text.jsonl` | 1 |
| `.planning/spikes/001-stream-json-recon/captures/02-markdown-code.jsonl` | 1 |
| `.planning/spikes/001-stream-json-recon/captures/03-tool-use.jsonl` | 1 |

Spike capture JSONL files are historical recon artifacts (frozen logs from spike 001 streaming JSON taxonomy work). They should be **left untouched** — they are evidence of the spike and contain time-stamped bytes from the actual `claude` CLI of that time. If we mutate them, we destroy the evidence. Treat as historical, like `.git/`.

### Skill rename mechanics

`[CITED: code.claude.com/docs/en/skills + agensi.io/learn/where-are-claude-skills-stored]`

Claude Code resolves project skills via:
1. **Directory:** `.claude/skills/<skill-name>/SKILL.md` (project-scoped) or `~/.claude/skills/<skill-name>/SKILL.md` (personal).
2. **Frontmatter `name:` field:** if absent, Claude Code falls back to the directory name. Best practice: always set `name:` explicitly.

**Rename procedure for `spike-findings-learn-os` → `spike-findings-<finalname>`:**

```bash
# Step 1: Rename the directory
git mv .claude/skills/spike-findings-learn-os \
       .claude/skills/spike-findings-<finalname>

# Step 2: Update the frontmatter `name:` field (line 2 of SKILL.md)
sed -i '' \
  's/^name: spike-findings-learn-os$/name: spike-findings-<finalname>/' \
  .claude/skills/spike-findings-<finalname>/SKILL.md

# Step 3: Update CLAUDE.md skill-table reference (line ~178 of project CLAUDE.md)
sed -i '' \
  's/spike-findings-learn-os/spike-findings-<finalname>/g' \
  CLAUDE.md

# Step 4: Update SKILL.md description (line 3 of SKILL.md, mentions "learn-os")
sed -i '' \
  's/learn-os/<finalname>/g' \
  .claude/skills/spike-findings-<finalname>/SKILL.md
```

The skill **content itself** (subprocess + UI patterns) is preserved unchanged — D-11 + CONTEXT.md `code_context` explicitly note: "the rename of this skill must preserve the SKILL.md content unchanged (Phase 1+ depends on these patterns)."

### Local-path move + Claude Code session cache implications

**Source path:** `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/`
**Target path:** `/Users/qinyuan/claude/r1ckyIn_GitHub/<finalname>/`

**The move is just `mv`:**

```bash
mv /Users/qinyuan/claude/r1ckyIn_GitHub/learn-os \
   /Users/qinyuan/claude/r1ckyIn_GitHub/<finalname>
```

**Side effects:**
1. **Claude Code session cache becomes orphaned.** Located at:
   - `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-learn-os/`
   - `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-learn-os--planning-spikes-001-stream-json-recon/`
   - `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-learn-os--planning-spikes-002-tauri-claude-shell-app-src-tauri/`

   These caches are auto-regenerated under the new path by Claude Code on next session start. **No data loss is critical** — they contain conversation history (already mirrored in `~/.claude/history.jsonl`) and tool-call outputs (recreatable). Plan-phase has discretion to either:
   - **(a)** Leave them in place (they don't take much space, and `~/.claude/history.jsonl` references them by path-derived ID — keeping them keeps history navigable from the old worker pre-rename).
   - **(b)** Move them: `mv ~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-learn-os ~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-<finalname>` + same for the 2 sub-paths. **Recommendation:** option (a) — least risk, retains pre-rename audit trail unchanged.

2. **Shell history (`~/.zsh_history`, `~/.bash_history`)** contains many `cd /Users/qinyuan/claude/r1ckyIn_GitHub/learn-os` entries. These remain functional via Bash's `cd -` semantics until the path is gone. **No mitigation needed.**

3. **iTerm2 / VS Code workspace files** if any reference the old path, the user opens them and updates. Phase 0 plan should remind user: "open VS Code (or iTerm2 saved workspace) → File → Open → select new path. Close old workspace tab."

### GitHub repo creation (NOT a rename)

**Verified state of repo:**

```bash
$ cd /Users/qinyuan/claude/r1ckyIn_GitHub/learn-os
$ git remote -v
# (empty output — NO remote configured)

$ gh repo view r1ckyIn/learn-os --json name 2>&1
# GraphQL: Could not resolve to a Repository — repo does not exist on GitHub yet
```

**Implication:** there is **no GitHub-side rename** to perform. Phase 0 simply creates the repo for the first time under the **new locked name**:

```bash
# Run from inside the renamed local directory after the local mv
cd /Users/qinyuan/claude/r1ckyIn_GitHub/<finalname>
gh repo create r1ckyIn/<finalname> \
  --source=. \
  --public \
  --description="Personal AI-native desktop learning app for USYD CS coursework" \
  --push
```

This:
- creates the GitHub repo `r1ckyIn/<finalname>`
- sets the local `origin` remote
- pushes `main` (current branch — `git branch` confirms)

**No issues/PRs/forks to migrate** because none exist on the (non-existent) old repo. **No GitHub Pages to redirect.** Clean greenfield publish.

### Suggested execution order for the rename PR (CD-04 — Claude's discretion)

The `guard-branch.sh` hook enforces one-phase = one-branch = one-PR. The branch will be `gsd/phase-0-identity-branding-lock` (per `phase_branch_template`).

**Order minimizes git-rename / git-move conflicts:**

```
0. Create branch: git checkout -b gsd/phase-0-identity-branding-lock

1. ASSET PRODUCTION (no repo edits)
   1a. Naming finalists table → user picks final name
   1b. Run gpt-image-1 (6-8 sketches)
   1c. User picks 1-2
   1d. Claude Design SVG refinement (if usable)
   1e. sips + iconutil → icon.icns + iconset/

2. ADD NEW FILES (no renames yet)
   2a. mkdir icon-assets/
   2b. Copy 1024x1024.png + iconset/ + icon.svg + icon.icns into icon-assets/
   2c. Create README.md (bilingual, project-template style, codename history footer)
   2d. Create LICENSE (MIT, mirror project-template)
   2e. git add icon-assets/ README.md LICENSE

3. EDIT IN-PLACE STRINGS (no renames yet)
   3a. Bundle id flip in spike 002 tauri.conf.json (1 line)
   3b. Update PROJECT.md, ROADMAP.md, REQUIREMENTS.md, STATE.md (drop codename, retire it, set OOS-01 amendment text)
   3c. Update remaining .planning/research/* and .planning/notes/foundation-decisions.md
   3d. Update CLAUDE.md (project-level — gitignored — kept for reference)
   3e. SKIP .planning/phases/00-identity-branding-lock/00-CONTEXT.md and 00-DISCUSSION-LOG.md and 00-RESEARCH.md — they are historical phase artifacts (the codename references in them ARE the audit trail; rewriting them would be like rewriting git history, contra D-15)
   3f. SKIP .planning/spikes/001-stream-json-recon/captures/*.jsonl — these are time-stamped recon evidence
   3g. Update .planning/spikes/002-tauri-claude-shell/README.md and app/src/routes/+page.svelte (only references in source code/comments, not user-facing strings)

4. RENAME .learnos/ DIRECTORY CONVENTION
   4a. Update all `.learnos/rules/` references in PROJECT.md, ROADMAP.md, REQUIREMENTS.md, research/FEATURES.md, research/SUMMARY.md → `.<finalname>/rules/`
   4b. Update all `~/.learnos/onboarding-state.json` references → `~/.<finalname>/onboarding-state.json`

5. RENAME SKILL DIRECTORY
   5a. git mv .claude/skills/spike-findings-learn-os .claude/skills/spike-findings-<finalname>
   5b. Edit SKILL.md frontmatter `name:` field
   5c. Edit SKILL.md description line
   5d. Update CLAUDE.md skill-table reference

6. ABSOLUTE-PATH STRINGS
   6a. .planning/research/ARCHITECTURE.md — 4 occurrences of /Users/.../learn-os → /Users/.../<finalname>
   6b. .planning/phases/00-identity-branding-lock/00-CONTEXT.md — 3 occurrences (acceptable to update; CONTEXT.md is the historical record but its absolute paths must point to the new location to remain navigable)

7. COMMIT
   7a. git commit (single atomic commit per D-12)
       Message: "feat(0): retire codename `learn-os`, lock <finalname> identity"

8. LOCAL-PATH MOVE (last, because git is now happy with the new content)
   8a. cd ..
   8b. mv learn-os <finalname>
   8c. cd <finalname>

9. GITHUB PUBLISH
   9a. gh repo create r1ckyIn/<finalname> --source=. --public --push --description="..."
   9b. git push origin gsd/phase-0-identity-branding-lock
   9c. gh pr create (with bilingual PR body explaining the rename + OOS-01 amendment)

10. MERGE
    10a. After CI/hooks pass: gh pr merge --squash (or --merge per project convention)
    10b. git checkout main
    10c. git pull --ff-only

11. RETIRE PHASE
    11a. /gsd-extract-learnings 0
    11b. /gsd-progress (advance to Phase 1)
```

**Why this order minimizes conflicts:**
- Asset files (icon-assets/, README, LICENSE) are added first (no conflict with existing files).
- All string edits happen BEFORE the directory rename (Step 5) so `git mv` operates on already-correct content.
- Local-path move (Step 8) happens AFTER commit so git's internal state is clean.
- GitHub publish is the last network operation, ensuring the local repo is in its final state before remote write.

### `sed` syntax note for macOS (BSD sed)

macOS's `sed` is BSD, not GNU — `sed -i` requires an empty backup-extension argument:

```bash
# macOS:
sed -i '' 's/old/new/g' file.md

# GNU (Linux):
sed -i 's/old/new/g' file.md
```

The plan should use the BSD form. Alternatively, use `perl -pi -e 's/old/new/g' file.md` (cross-platform).

### Bulk-replace one-liner

After the planner has the final name, the bulk replacement can be done in one pipeline:

```bash
FINAL=<finalname>  # e.g., FINAL=mneme
SKIP_FILES=(
  '.planning/phases/00-identity-branding-lock/00-CONTEXT.md'
  '.planning/phases/00-identity-branding-lock/00-DISCUSSION-LOG.md'
  '.planning/phases/00-identity-branding-lock/00-RESEARCH.md'
  '.planning/spikes/001-stream-json-recon/captures/01-simple-text.jsonl'
  '.planning/spikes/001-stream-json-recon/captures/02-markdown-code.jsonl'
  '.planning/spikes/001-stream-json-recon/captures/03-tool-use.jsonl'
)
SKIP_PATTERN=$(printf '!%s ' "${SKIP_FILES[@]}")  # build a glob exclusion

# Replace `learn-os` (with hyphen) → ${FINAL}
rg -l 'learn-os' --hidden --no-ignore --glob '!.git/' --glob '!node_modules/' \
  --glob '!.svelte-kit/' --glob '!target/' \
  $(for f in "${SKIP_FILES[@]}"; do echo "--glob '!${f}'"; done) \
  | xargs sed -i '' "s/learn-os/${FINAL}/g"

# Replace `learnos` (no hyphen) → ${FINAL}
rg -l 'learnos' --hidden --no-ignore --glob '!.git/' --glob '!node_modules/' \
  --glob '!.svelte-kit/' --glob '!target/' \
  $(for f in "${SKIP_FILES[@]}"; do echo "--glob '!${f}'"; done) \
  | xargs sed -i '' "s/learnos/${FINAL}/g"

# Replace bundle id `dev.learn-os.spike` → `dev.${FINAL}.spike`
sed -i '' "s|dev\\.learn-os\\.spike|dev.${FINAL}.spike|g" \
  .planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json

# Replace absolute paths in non-skipped files
rg -l '/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os' --hidden --no-ignore \
  $(for f in "${SKIP_FILES[@]}"; do echo "--glob '!${f}'"; done) \
  | xargs sed -i '' "s|/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os|/Users/qinyuan/claude/r1ckyIn_GitHub/${FINAL}|g"
```

(The plan-phase plan should specify each file individually if the planner prefers explicit-list-of-files over the rg-driven approach. Both are valid.)

---

## Common Pitfalls

### Pitfall 1: Overwriting historical artifacts

**What goes wrong:** Bulk `sed -i` over the entire repo also rewrites `.planning/phases/00-identity-branding-lock/00-CONTEXT.md`, `.planning/phases/00-identity-branding-lock/00-DISCUSSION-LOG.md`, and `.planning/spikes/001-stream-json-recon/captures/*.jsonl`. This destroys the audit trail (the discussion that produced the decisions; the time-stamped JSONL bytes from spike 001).

**Why it happens:** Researchers think "atomic 100% rename" means "every byte everywhere" — but D-15 and the GSD philosophy are that historical records (audit logs, time-stamped evidence) are **read-only**.

**How to avoid:** **Skip-list** the historical files explicitly. The bulk-replace one-liner above includes the skip-list. Verify post-replacement: `rg 'learn-os' --hidden --no-ignore` should return ONLY hits in the skip-listed files.

**Warning signs:** if a JSONL capture file is modified, abort and `git checkout HEAD -- .planning/spikes/001-stream-json-recon/captures/` to restore.

### Pitfall 2: Hand-rounding the icon corners

**What goes wrong:** Designer pre-rounds the 1024×1024 PNG with macOS's squircle radius. macOS then applies its OWN squircle mask on top, producing a double-rounded "squarer-than-intended" icon visible in the Dock.

**Why it happens:** Confusion between "macOS uses a squircle" (true) and "I should pre-render a squircle" (FALSE).

**How to avoid:** Design in a **full square canvas**, no rounded corners at all. The system applies the mask. `[CITED: developer.apple.com/design/human-interface-guidelines/app-icons + heise.de "macOS 26 squircle"]`

**Warning signs:** Final icon in the Dock looks "more rounded than other system icons."

### Pitfall 3: gpt-image-1 transparency holes

**What goes wrong:** gpt-image-1 in `background: "transparent"` mode hollows out white interior areas of the subject — up to 80% of the time. For a graph-node-monogram icon, the monogram letter or interior fills may appear as transparent holes.

**Why it happens:** Documented behavior of gpt-image-1's transparency mode. `[CITED: community.openai.com Bugs thread]`

**How to avoid:**
- Prompt explicitly: "Use a non-white accent color for all interior fills. Do not include any white interior areas."
- Generate 6-8 sketches (D-06 already specifies this volume); rejected sketches are the ones with holes.
- If a winning sketch has minor holes, hand-fix in any image editor (Preview can do simple alpha-channel paint) OR install ImageMagick (`brew install imagemagick`) and use `magick image.png -alpha set -channel A -fill white -opaque transparent fixed.png`.

**Warning signs:** preview the PNG over a black background (`open -a Preview` and toggle macOS dark mode) — holes show as black.

### Pitfall 4: `iconutil` failure on the iconset folder

**What goes wrong:** `iconutil -c icns icon.iconset` fails with "Error -54: file is not iconset bundle" or similar.

**Why it happens:**
- The directory must end in `.iconset` extension (not just `iconset`).
- All 10 PNG files must be present and named **exactly** per the spec (`icon_16x16.png`, `icon_16x16@2x.png`, ..., `icon_512x512@2x.png`).
- All PNGs must be valid (not zero-byte, not truncated).

**How to avoid:** Run a pre-check before `iconutil`:

```bash
ICONSET=icon-assets/iconset.iconset
EXPECTED=(
  icon_16x16.png icon_16x16@2x.png
  icon_32x32.png icon_32x32@2x.png
  icon_128x128.png icon_128x128@2x.png
  icon_256x256.png icon_256x256@2x.png
  icon_512x512.png icon_512x512@2x.png
)
for f in "${EXPECTED[@]}"; do
  test -s "$ICONSET/$f" || { echo "MISSING or empty: $f"; exit 1; }
done
echo "All 10 PNG variants present, non-zero. Ready for iconutil."
```

### Pitfall 5: SKILL.md `name:` frontmatter mismatch with directory name

**What goes wrong:** Skill directory renamed but frontmatter `name:` still says `spike-findings-learn-os`. Claude Code uses the frontmatter `name:` as the canonical identifier — depending on Claude Code version, this can either silently fall back to directory name OR fail to load the skill.

**How to avoid:** The skill rename has 4 sub-steps (above). All four must happen. Add a verification:

```bash
# Verify frontmatter and directory match
ls .claude/skills/ | grep spike-findings
head -3 .claude/skills/spike-findings-*/SKILL.md
# `name:` field should match directory name
```

### Pitfall 6: Forgetting `.learnos/rules/` directory rename

**What goes wrong:** The codename references in REQ-17 (per-course system prompts) use `.learnos/rules/` as a directory naming convention. If only `learn-os` (with hyphen) is replaced and `learnos` (no hyphen) is missed, REQ-17's directory convention silently retains the old codename. Phase 8 implementation will then create `.learnos/rules/` directories — revealing the rename was incomplete.

**How to avoid:** The bulk-replace one-liner above does BOTH variants in two passes. Verify with a final `rg -i 'learn[-_ ]?os' --hidden --no-ignore` — should return zero hits in non-skipped files.

### Pitfall 7: BSD vs GNU sed mismatch

**What goes wrong:** Plan uses `sed -i 's/.../.../g'` (GNU form). On macOS BSD sed, this fails with "extra characters at end of n command" or modifies a file named literally `'s/.../.../g'`.

**How to avoid:** Use `sed -i ''` (empty backup extension) for macOS, OR use `perl -pi -e` (cross-platform). The bulk-replace one-liner above uses `sed -i ''`. The plan should explicitly document this.

### Pitfall 8: Omitting OOS-01 amendment from the same PR

**What goes wrong:** D-13 detailed README is the trigger for the OOS-01 amendment ("future open-source release allowed"). If the rename PR ships without amending OOS-01 in PROJECT.md, the README claims MIT-licensed open-source publishability while PROJECT.md still says distribution is OOS. Internal inconsistency.

**How to avoid:** PROJECT.md's OOS-01 wording change is part of the same atomic Phase 0 PR. The DISCUSSION-LOG.md "Deferred Ideas" section says: "Executed in this Phase 0 PR (user explicit ask mid-discussion)." Plan must include a task: "Amend PROJECT.md OOS-01 wording per CONTEXT.md Deferred Ideas → OOS-01 amendment."

### Pitfall 9: Spike-002 README scaffold command is a fossil

**What goes wrong:** `.planning/spikes/002-tauri-claude-shell/README.md` line 1 contains the exact `npm create tauri-app@latest -- ... --identifier dev.learn-os.spike` scaffold command. After replacing `learn-os` → `<finalname>`, the command in the README appears to scaffold under the new identifier — but **the spike was actually scaffolded with the old identifier**, and re-running this command would create a NEW empty Tauri app, NOT the one that exists at `app/`. Future readers might re-run the command and overwrite the spike.

**How to avoid:**
- Add a comment near the rewritten command: `# Historical scaffold command (already executed 2026-05-06); re-running would create a NEW Tauri app, not restore this spike.`
- OR leave the spike README's scaffold command at the original `dev.learn-os.spike` (since it's documenting the historical command actually used) and add a footnote.

**Recommendation:** prefer the second option — leave historical command intact, add a one-line footnote. This matches D-15's "preserve history" spirit.

### Pitfall 10: GitHub repo description / topics / metadata

**What goes wrong:** `gh repo create` requires a `--description` flag. Forgetting it makes the GitHub UI show no description. Also, useful topics like `tauri`, `sveltekit`, `claude-code`, `learning-app`, `personal-knowledge-management` are not added by default.

**How to avoid:** Plan should include the full `gh repo create` invocation:

```bash
gh repo create r1ckyIn/<finalname> \
  --source=. \
  --public \
  --description="Personal AI-native desktop learning app — Tauri 2 shell wrapping local Claude Code, three-pane UI (course files / video / chat), AI-native knowledge graph + FSRS-6 review. macOS-only, single-user, MIT-licensed." \
  --push

# Then add topics:
gh repo edit r1ckyIn/<finalname> \
  --add-topic tauri \
  --add-topic sveltekit \
  --add-topic claude-code \
  --add-topic learning-app \
  --add-topic personal-knowledge-management \
  --add-topic ai-native \
  --add-topic macos
```

---

## Code Examples

Verified patterns from sources. (No code examples relate to algorithm/feature work — Phase 0 is config/asset/orchestration.)

### Example 1: gpt-image-1 API call (Python — for reference; user invokes via ChatGPT UI per D-06)

```python
# Source: developers.openai.com/cookbook/examples/generate_images_with_gpt_image
# Per D-06 the user runs this through the ChatGPT image2.0 UI, NOT API directly.
# This snippet is provided for reference (e.g., if user prefers scripted batch).

from openai import OpenAI
client = OpenAI()

response = client.images.generate(
    model="gpt-image-1",
    prompt=(
        "Minimalist app icon, 1024x1024, square canvas, no rounded corners "
        "(macOS will apply squircle mask). Concept: a small graph of 5-7 nodes "
        "with curved edges, with the letter 'M' embedded as the focal monogram "
        "in the central node. Solid colored shapes only — no white interior fills. "
        "Modern flat design, soft shadow on the central node, single accent color "
        "(deep teal #0D6E5E or warm orange #C4622D). Off-white or transparent "
        "background. The icon should feel scholarly and timeless, not like a "
        "2020s AI startup logo."
    ),
    size="1024x1024",
    quality="high",
    background="transparent",
    output_format="png",
    n=4  # generate 4 in one call to spread cost
)
# response.data[i].b64_json contains base64-encoded PNG bytes
```

### Example 2: PNG → ICNS pipeline (canonical macOS shell)

```bash
#!/usr/bin/env bash
# Source: decovar.dev/blog/2018/10/09/macos-convert-png-to-icns/
#         + en.wikipedia.org/wiki/Apple_Icon_Image_format
set -euo pipefail

SRC="${1:-icon-assets/1024x1024.png}"
ICONSET="${2:-icon-assets/iconset.iconset}"
OUT_ICNS="${3:-icon-assets/icon.icns}"

# Validate input
test -s "$SRC" || { echo "Source PNG missing or empty: $SRC"; exit 1; }

# Verify it's actually 1024×1024 (sips will silently up/downscale otherwise)
DIMS=$(sips -g pixelWidth -g pixelHeight "$SRC" | tail -2 | awk '{print $2}' | xargs)
[[ "$DIMS" == "1024 1024" ]] || { echo "Source must be 1024x1024 (got $DIMS)"; exit 1; }

# Create iconset folder
mkdir -p "$ICONSET"

# Generate 10 size variants (Apple-spec naming)
sips -z 16   16   "$SRC" --out "$ICONSET/icon_16x16.png"      > /dev/null
sips -z 32   32   "$SRC" --out "$ICONSET/icon_16x16@2x.png"   > /dev/null
sips -z 32   32   "$SRC" --out "$ICONSET/icon_32x32.png"      > /dev/null
sips -z 64   64   "$SRC" --out "$ICONSET/icon_32x32@2x.png"   > /dev/null
sips -z 128  128  "$SRC" --out "$ICONSET/icon_128x128.png"    > /dev/null
sips -z 256  256  "$SRC" --out "$ICONSET/icon_128x128@2x.png" > /dev/null
sips -z 256  256  "$SRC" --out "$ICONSET/icon_256x256.png"    > /dev/null
sips -z 512  512  "$SRC" --out "$ICONSET/icon_256x256@2x.png" > /dev/null
sips -z 512  512  "$SRC" --out "$ICONSET/icon_512x512.png"    > /dev/null
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png" > /dev/null

# Pack into .icns
iconutil -c icns "$ICONSET" -o "$OUT_ICNS"

# Verify output
file "$OUT_ICNS" | grep -q "Mac OS X icon" || {
    echo "iconutil produced unexpected file"; exit 1; }

echo "ok — $OUT_ICNS ($(stat -f%z "$OUT_ICNS") bytes)"
```

### Example 3: Skill rename (the 4 sub-steps)

```bash
FINAL=<finalname>

# 1. Rename directory (use git mv to preserve history)
git mv .claude/skills/spike-findings-learn-os \
       .claude/skills/spike-findings-${FINAL}

# 2. Update frontmatter `name:` field
sed -i '' \
  "s/^name: spike-findings-learn-os$/name: spike-findings-${FINAL}/" \
  .claude/skills/spike-findings-${FINAL}/SKILL.md

# 3. Update SKILL.md description (replaces all `learn-os` references in the file)
sed -i '' "s/learn-os/${FINAL}/g" \
  .claude/skills/spike-findings-${FINAL}/SKILL.md

# 4. Update CLAUDE.md skill-table reference
sed -i '' "s/spike-findings-learn-os/spike-findings-${FINAL}/g" CLAUDE.md
sed -i '' "s/learn-os/${FINAL}/g" CLAUDE.md  # also flips other refs

# Verify
head -5 .claude/skills/spike-findings-${FINAL}/SKILL.md
echo "---"
grep -i 'spike-findings' CLAUDE.md
```

---

## State of the Art

| Old Approach | Current Approach (2026-05) | When Changed | Impact |
|--------------|----------------------------|--------------|--------|
| Hand-pixel each icon size in Photoshop | gpt-image-1 1024×1024 master + `sips`/`iconutil` downsample | gpt-image-1 GA mid-2025; iconutil since macOS 10.7 (2011) | 30-second pipeline vs 1-2 hours of design work |
| `dataDirectory` for WKWebView storage | `dataStoreIdentifier` (16 u8 bytes) | Tauri 2 (2024) | Stable WebKit storage independent of bundle id changes — relevant for Phase 5 spike, not Phase 0 |
| pre-rounded squircle icon source | square canvas + system-applied squircle mask | macOS Big Sur (2020) | Don't pre-round; let the system mask |
| Apple Icon Composer (the OLD tool, deprecated 2010s) | Apple Icon Composer (NEW, Xcode 26+, 2025) | WWDC25 | New tool exists but **requires macOS Sequoia 15.6+** — unavailable to this user |
| Manual `npm install icns-creator` etc. | Native `iconutil` | always | Built-in is the canonical path |
| `tldraw v2.x MIT` for whiteboard | Excalidraw v0.18.1 MIT | tldraw v4.x went proprietary 2025 | Project STACK research already locked Excalidraw — Phase 0 unaffected |

**Deprecated/outdated:**
- **Pre-rounded squircle PNG sources** — system mask handles it.
- **GitHub Pages-based redirects after repo rename** — they don't redirect (CITED). Not relevant since we have no GitHub Pages.
- **`tauri-plugin-sql`** — incompatible with sqlite-vec (per project STACK research). Phase 0 doesn't touch SQL anyway.

---

## Assumptions Log

> Claims tagged `[ASSUMED]` are best-effort knowledge that was **not** independently verified in this session. The plan-phase plan should either confirm with the user or fold into a research task before relying on them.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Mneme" on Mac App Store has no popularity (no ratings displayed) — implying small, niche, unlikely to cause real user confusion. | Naming Due-Diligence — Mneme | If Mneme suddenly becomes a household app, our app naming becomes a follower. Low risk for personal-use only. |
| A2 | gpt-image-1 high-quality 1024×1024 image cost ≈ $0.040–0.190 per generation (rough range from OpenAI pricing — exact may have shifted). | Pattern 1 / Code Example 1 | If costs are higher, the 6-8 sketch volume in D-06 may exceed user's expected outlay. Mitigation: user can generate in batches via ChatGPT UI which charges via subscription, NOT per-image API. |
| A3 | The user's ChatGPT subscription tier supports gpt-image-1 (image2.0 in chat UI). | D-06 stage 2 | If user has only ChatGPT Free, image generation may be rate-limited (~3/day). Plan should include a sanity-check ("user confirms ChatGPT Plus or higher" before this stage). |
| A4 | Trademark databases (USPTO/EUIPO) were not checked for any candidate. Searches were Google-result-based. | Naming Due-Diligence | For personal use this is acceptable. If user later commercializes, trademark risk re-emerges and a separate legal-due-diligence step is warranted. |
| A5 | Chinese/Mandarin pronunciation friendliness was assessed by transliteration-ease, not by surveying native speakers. User is themselves bilingual and self-evaluates at decision time. | Naming Due-Diligence | Low risk — user is the only user. |
| A6 | The user has Claude Pro/Max subscription tier sufficient to access Claude Design / Claude artifacts (required for D-09 stage 4). | D-06 stage 4 | If user is on Claude Free, the SVG-refinement step has no tool. Plan can skip Stage C entirely and still produce a valid icon (Option D3 in the locked pipeline). |

---

## Open Questions

> The planner should surface each as a discretionary decision OR fold into the plan with a default.

1. **Q1: Sketch generation volume — is 6-8 the right number?**
   - **What we know:** D-06 specifies 6-8 sketches.
   - **What's unclear:** if gpt-image-1 misfires often (transparency holes, off-prompt), 6-8 may yield 0-2 usable. Should the plan budget 12-16 sketches and pick the best 6-8?
   - **Recommendation:** Plan defaults to 8 sketches, but pre-stages a "if <2 are usable, generate 4 more" loop. Time-box: keep within D-08's ≤1 day limit.

2. **Q2: Skill cache regeneration impact on session continuity**
   - **What we know:** Claude Code regenerates `~/.claude/projects/-Users-...-<finalname>/` cache on first session post-rename.
   - **What's unclear:** does Claude Code lose access to the prior session history (referenced in `~/.claude/history.jsonl` by old path)? Probably not — `history.jsonl` is global. But unconfirmed.
   - **Recommendation:** Plan-phase task to verify post-merge: open the new path in Claude Code, confirm `~/.claude/history.jsonl` entries are still navigable (at minimum, readable). If not navigable, document in STATE.md and move on (don't try to migrate the cache).

3. **Q3: Should the icon-assets/ directory live at repo root or under `.planning/`?**
   - **What we know:** STACK research's general structure puts assets in `src-tauri/icons/` (Phase 1). For Phase 0 with no `src-tauri/`, where do the raw outputs live?
   - **What's unclear:** repo root or `.planning/`?
   - **Recommendation:** Repo root `icon-assets/`. Reasons: (a) Phase 1's `src-tauri/icons/` will be a different Tauri-controlled directory; (b) keeping master 1024×1024 PNG + iconset folder + final ICNS at root makes them obvious to a future reader; (c) Tauri's `bundle.icon` array references can use either path. Default to root.

4. **Q4: Bundle id — `dev.<finalname>.app` vs `dev.<finalname>.spike` for spike 002**
   - **What we know:** D-10 says final bundle id is `dev.<finalname>.app`. CONTEXT.md says spike 002's `tauri.conf.json` should be flipped from `dev.learn-os.spike` to `dev.<finalname>.spike` (note: `.spike`, not `.app`).
   - **What's unclear:** the rationale — keeping `.spike` suffix tags the spike artifact as historical/non-production, while production `.app` is locked for Phase 1's `src-tauri/`.
   - **Recommendation:** Honor CONTEXT.md exactly — spike keeps `.spike` suffix, production gets `.app`. The plan should NOT silently unify these.

5. **Q5: README codename history footer wording**
   - **What we know:** D-13 specifies the line: `> Codename history: this project was developed under codename \`learn-os\` until 2026-05-07.`
   - **What's unclear:** whether the bilingual mirror should also have a 中文 version of this line.
   - **Recommendation:** Plan to include both: English-side footer + matching Chinese footer in the 中文 section. Suggested 中文: `> 项目代号历史：此项目曾以代号 \`learn-os\` 开发至 2026-05-07。`

---

## Environment Availability

> Phase 0 has external tooling dependencies — most are built-in macOS, the rest are already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `iconutil` | ICNS packaging (Stage E) | ✓ | built-in (macOS 10.7+) | — |
| `sips` | PNG resize + SVG→PNG (Stages D + E) | ✓ | sips-316 | `qlmanage` (no transparency) or `rsvg-convert` (after `brew install librsvg`) |
| `qlmanage` | (alternative SVG→PNG, not used) | ✓ | built-in | — |
| `gh` (GitHub CLI) | Step 9 (publish to GitHub) | ✓ | 2.83.2 | `git push` to manually-created repo via `git@github.com:r1ckyIn/<finalname>.git` |
| `git` | branching + commit + history-preserve | ✓ | (system) | — |
| `rg` (ripgrep) | Inventory + bulk-replace pipeline | ✓ | 14.1.1 | `grep -rl` (slower) |
| `node` | (only for spike 002 dev — not Phase 0 work) | ✓ | v22.14.0 | — |
| `python3` | (only for hypothetical gpt-image-1 scripted batch — D-06 user uses ChatGPT UI directly) | ✓ | 3.12.2 | use ChatGPT UI instead |
| `xcode-select` / `Xcode 14.3.1` | (not needed — Phase 0 is asset-only) | ✓ | Xcode 14.3.1 | — |
| `iconutil` (Apple Icon Composer Xcode 26+) | (would be ideal for layered icons) | ✗ | — | **NOT AVAILABLE** — requires macOS Sequoia 15.6+; user is on Ventura 13.7.8. **Fallback:** standard `iconutil -c icns` flow (already in scope). No Liquid Glass / multi-layer effect — basic flat icon. |
| `librsvg` (rsvg-convert) | (optional — high-fidelity SVG→PNG) | ✗ | — | **Fallback:** `sips -s format png`. Install only if needed: `brew install librsvg`. |
| `imagemagick` (magick) | (optional — alpha-channel hand-fix for gpt-image-1 transparency holes) | ✗ | — | **Fallback:** macOS Preview app for simple alpha cleanup. Install only if needed: `brew install imagemagick`. |
| `claude` CLI | (referenced in spike, not used for Phase 0 build steps) | ✓ | 2.1.132 | — |

**Missing dependencies with no fallback:**
- **None.** Apple Icon Composer is unavailable but the Apple-canonical iconutil flow handles all needs.

**Missing dependencies with fallback:**
- `librsvg` (use `sips`); install `brew install librsvg` only if SVG-→PNG output is fuzzy.
- `imagemagick` (use Preview app); install `brew install imagemagick` only if alpha-channel hand-fix is needed.

---

## Validation Architecture

> `nyquist_validation: true` (config.json default — workflow.nyquist_validation set explicitly true). This phase has no v1/v1.x REQ, so the validation maps to **success-criteria → validation** instead of REQ → validation.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **N/A — no automated test framework** for this phase. Validation is **shell-script smoke checks + visual inspection + git-log assertion** because Phase 0 produces assets + config + docs, not testable code. |
| Config file | none (no test framework adopted at Phase 0; Phase 1+ may adopt Vitest for SvelteKit and `cargo test` for Tauri Rust) |
| Quick run command | `bash .planning/phases/00-identity-branding-lock/scripts/verify-rename.sh` (script to be authored as part of Wave 0 Gaps below) |
| Full suite command | (same — there's no broader suite at this phase) |

### Phase Success Criteria → Validation Map

(ROADMAP.md Phase 0 specifies 4 success criteria.)

| Success Criterion | Behavior | Validation Type | Automated Command | File Exists? |
|-------------------|----------|-----------------|-------------------|-------------|
| SC-1: Final app name decided + recorded in PROJECT.md | PROJECT.md mentions the locked name (and codename `learn-os` is retired except in audit-log files). | shell-grep | `rg -F '<finalname>' .planning/PROJECT.md && ! rg -F 'learn-os' .planning/PROJECT.md` | ❌ Wave 0 — `verify-rename.sh` |
| SC-2: App icon generated + committed to repo | `icon-assets/icon.icns` exists, valid Mac OS X icon format, contains the expected 10 size variants. | shell-test | `file icon-assets/icon.icns \| grep -q 'Mac OS X icon' && [ "$(iconutil -V icon-assets/icon.icns 2>&1 \| grep -c 'image format')" -ge 10 ]` | ❌ Wave 0 |
| SC-3: Bundle id transitioned in tauri.conf.json | spike 002's `identifier` field is `dev.<finalname>.spike` (NOT `.app` — explicit per CONTEXT.md). | shell-grep | `python3 -c "import json; assert json.load(open('.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json'))['identifier'] == 'dev.<finalname>.spike'"` | ❌ Wave 0 |
| SC-4: README + window title + Dock label reflect locked name | README.md exists at repo root, contains `<finalname>`, has bilingual sections + codename history footer. (Window title + Dock label are NOT testable in Phase 0 because no production Tauri app is built — they are CONTRACTS for Phase 1.) | shell-grep + manual inspection | `test -f README.md && rg -F '<finalname>' README.md && rg -F '## English' README.md && rg -F '## 中文' README.md && rg -F 'Codename history' README.md` | ❌ Wave 0 |
| (auxiliary) Skill renamed correctly | `.claude/skills/spike-findings-<finalname>/SKILL.md` exists; frontmatter `name:` matches dir; CLAUDE.md skill table updated. | shell-grep | `test -f .claude/skills/spike-findings-<finalname>/SKILL.md && grep -q "^name: spike-findings-<finalname>$" .claude/skills/spike-findings-<finalname>/SKILL.md && grep -q "spike-findings-<finalname>" CLAUDE.md` | ❌ Wave 0 |
| (auxiliary) Atomic rename complete | No `learn-os` references survive in non-skip-listed files. | shell-grep | `rg -i 'learn[-_ ]?os' --hidden --no-ignore --glob '!.git/' [SKIP_LIST flags] \| wc -l \| grep -q '^0$'` | ❌ Wave 0 |
| (auxiliary) `.learnos/rules/` references gone | `.learnos/rules/` directory convention has been replaced. | shell-grep | `! rg -F '.learnos/rules/' --hidden --no-ignore --glob '!.git/' [SKIP_LIST flags]` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** the rename is one big atomic commit (D-12), so per-task sampling doesn't apply in the usual sense. However, between Stages 3 (string edits) and Stage 5 (skill rename) of the execution order, the planner should run the verification shell script as a "sanity gate" before continuing.
- **Per wave merge:** `verify-rename.sh` (full suite) before `git push`.
- **Phase gate:** all 7 checks pass + visual inspection of icon in Finder Get Info dialog (sees the macOS Dock-rendered version with squircle mask applied).

### Wave 0 Gaps

The following must be authored as part of Phase 0's first wave:

- [ ] **`scripts/verify-rename.sh`** — shell smoke-check script bundling the 7 grep/file/python checks above. Must accept `<finalname>` as `$1` argument. Exit non-zero on any failure.
- [ ] **`scripts/build-icon.sh`** — the PNG-to-ICNS pipeline shell script (Pattern 3 + Code Example 2 above). Should be **committed** to the repo so future-self can re-run if the icon needs regenerating from a new master PNG.
- [ ] **`scripts/verify-icon.sh`** — `file icon-assets/icon.icns | grep "Mac OS X icon"` + `iconutil -V` to confirm 10 variants.
- [ ] **No test framework install required** — these are pure shell scripts; bash is built-in.

*(Phase 1+ may install Vitest / `cargo test`; Phase 0 does not justify the overhead.)*

---

## Security Domain

> `security_enforcement` is enabled by default (config.json absent → enabled). Phase 0 is naming/branding, but a quick STRIDE pass is still warranted because we are publishing a public GitHub repo for the first time.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (no auth code shipped in Phase 0) |
| V3 Session Management | no | (no sessions) |
| V4 Access Control | yes (limited) | GitHub repo public visibility — anyone can read but not write. Default `gh repo create --public` is correct. |
| V5 Input Validation | no | (no inputs, no UI yet) |
| V6 Cryptography | no | (no crypto) |
| V14 Configuration | yes | Tauri `identifier` change, `.gitignore` audit |

### Known Threat Patterns for "publish first repo + rename" workflow

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental publication of secrets via README sample code | Information Disclosure | `.gitignore` already excludes `.env*`, `*.pem`, `CLAUDE.md` (verified). Pre-commit grep for "API_KEY", "TOKEN", "PASSWORD" before push. |
| Accidental publication of `CLAUDE.md` (project-level) | Information Disclosure | `.gitignore` line `CLAUDE.md` already present (verified). Pre-flight: `git check-ignore CLAUDE.md` should print the path. |
| Accidental publication of spike 002 OAuth subscription session traces | Information Disclosure | `.planning/spikes/001-stream-json-recon/captures/*.jsonl` may contain user-message text from the user's actual claude sessions. **Audit before publish.** If sensitive content present, either redact those JSONL lines or add `.planning/spikes/001-stream-json-recon/captures/` to `.gitignore` (but they're already committed — would need `git rm --cached` and update history is forbidden by D-15). **Recommendation:** plan-phase task to **read** those JSONL files and confirm they only contain trivial test prompts (e.g., "Hello" / "What is 2+2") — if so, no action needed. |
| Future portfolio-release brand confusion | (not security) | OOS-01 amendment limits scope: distribution-as-OSS-portfolio allowed; commercialization is NOT — README should make this explicit. |

**Plan-phase task implication:** add a "secrets/sensitivity audit" step before `gh repo create --public`:

```bash
# Audit before publishing public repo
git ls-files | xargs grep -l -i 'sk-ant\|sk-proj\|api[_-]key\|token\|password\|secret' 2>/dev/null
# Should return zero hits
```

---

## Sources

### Primary (HIGH confidence)

- **GitHub `gh` API** — verified directly with `gh repo view`, `gh api /repos/...`, `gh api /search/repositories`. All naming-namespace findings.
- **npm registry** — verified directly with `curl https://registry.npmjs.org/<name>`. All npm-namespace findings.
- **macOS local environment** — verified directly with `sw_vers`, `command -v`, `ls`, `xcodebuild -version`, `git remote -v`. All environment-availability + repo-state findings.
- **ripgrep + `wc -l` + `--count`** — repo-content inventory of `learn-os` / `learnos` / absolute-path occurrences. Reproducible via the inventory commands at top of "Atomic Rename Strategy" section.
- **Spike 002 `tauri.conf.json`** read directly — `dev.learn-os.spike` confirmed at line 5.
- **`r1ckyIn/project-template`** — read README.md and LICENSE directly via `gh api /repos/r1ckyIn/project-template/contents`.

### Authoritative documentation (HIGH confidence)

- [Apple HIG — App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) — squircle / canvas / sizing spec.
- [Apple Icon Image format (Wikipedia)](https://en.wikipedia.org/wiki/Apple_Icon_Image_format) — ICNS size + iconset naming.
- [Apple Developer — Icon Composer (Xcode 26+)](https://developer.apple.com/icon-composer/) — confirms Xcode 26 requirement.
- [Apple Developer — Xcode system requirements](https://developer.apple.com/xcode/system-requirements/) — Xcode 26.0 requires macOS Sequoia 15.6.
- [Anthropic Labs — Claude Design announcement](https://www.anthropic.com/news/claude-design-anthropic-labs) — what Claude Design produces (HTML / SVG inside artifacts; PDF/PPTX/Canva exports).
- [OpenAI Cookbook — Generate images with GPT Image](https://developers.openai.com/cookbook/examples/generate_images_with_gpt_image) — gpt-image-1 size + quality + transparency parameters.
- [Claude Code Skills documentation](https://code.claude.com/docs/en/skills) — skill resolution mechanics, frontmatter `name:` field.
- [GitHub Docs — Renaming a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository) — redirect behavior (not used: we have no remote).

### Secondary (MEDIUM confidence — verified with at least one HIGH source)

- [decovar.dev — Convert PNG to ICNS on Mac OS](https://decovar.dev/blog/2018/10/09/macos-convert-png-to-icns/) — sips + iconutil shell pipeline (cross-checked against Wikipedia).
- [yellowduck.be — qlmanage SVG to PNG](https://www.yellowduck.be/posts/how-to-convert-an-svg-to-png-using-qlmanage-on-macos) — qlmanage + transparency limitation.
- [BSWEN.com blog — Stream-JSON Custom UI Claude Code 2026-03](https://docs.bswen.com/blog/2026-03-21-stream-json-custom-ui-claude-code/) — referenced in STACK; not Phase-0-relevant.
- [VentureBeat — Claude Design launch 2026-04-17](https://venturebeat.com/technology/anthropic-just-launched-claude-design-an-ai-tool-that-turns-prompts-into-prototypes-and-challenges-figma) — date + capability summary cross-check.
- [Tauri 2 dataStoreIdentifier discussion](https://github.com/tauri-apps/wry/discussions/1198) — bundle-id-tied storage on macOS WKWebView.
- [agensi.io — Where Are Claude Skills Stored](https://www.agensi.io/learn/where-are-claude-skills-stored) — skill paths.
- [allahabadi.dev — Claude Code Skill Frontmatter complete guide](https://allahabadi.dev/blogs/ai/claude-code-skills-frontmatter-complete-guide/) — frontmatter validation rules.

### Tertiary (LOW confidence — single source, marked for validation if relied on)

- gpt-image-1 pricing per generation (~$0.04–0.19 high-quality 1024×1024) — pricing not verified to the cent; OpenAI pricing changes frequently.
- Mac App Store popularity claim that "Mneme: Memory journal" has no ratings — search-snippet observation, not API-verified.
- "OpenPraxis" 415-star repo problem-statement similarity to ours — read from search snippet only.

### Naming research (each individually scored)

- [Mnemo | AI Learning System](https://mnemoapp.me/) — direct-niche EdTech conflict (HIGH-conflict signal)
- [MnemoPack](https://mnemopack.com/) — secondary niche conflict
- [Mnemo: My Second Brain (App Store)](https://apps.apple.com/us/app/mnemo-my-second-brain/id6756796222) — direct-niche conflict
- [Mneme: Memory Journal (App Store)](https://apps.apple.com/us/app/mneme-memory-journal/id6757203595) — adjacent-niche conflict
- [Mneme AI - Local AI Notes (App Store)](https://apps.apple.com/us/app/mneme-ai-local-ai-notes/id6670174487) — direct-niche conflict
- [Praxis AI](https://praxis-ai.com/) — institutional EdTech conflict
- [LOCUS Learning App](https://play.google.com/store/apps/details?id=co.bran.wevcd) — EdTech conflict
- [Lokus PKM](https://lokusmd.com/features) — exact-niche conflict
- [Mira Knowledge Guide (App Store)](https://apps.apple.com/de/app/mira-knowledge-guide/id6752037704) — direct-niche conflict
- [Lyceum (Wikipedia synchronous CMC)](https://en.wikipedia.org/wiki/Lyceum_(synchronous_CMC_software)) — historical naming reference
- [Paideia LMS (mypaideia.com)](https://mypaideia.com/) — EdTech conflict
- [Cogito (Phazorknight)](https://github.com/Phazorknight/Cogito) — Godot framework conflict (1.7k stars)
- [ponder-sh/ponder](https://github.com/ponder-sh/ponder) — npm + GitHub crypto framework (1.1k stars)
- [locustio/locust](https://github.com/locustio/locust) — load testing namespace (27.7k stars)

---

## Metadata

**Confidence breakdown:**

- **Naming Due-Diligence:** HIGH — all GitHub/npm checks performed via direct API; web-search hits cross-checked across multiple search queries; results explicitly enumerate verified competitors per candidate.
- **Icon Pipeline Resolution (D-09):** HIGH on tooling availability (verified locally); MEDIUM on Claude Design's exact 2026-05 capability surface (relying on official Anthropic announcement + 2026-04-17 launch coverage; Claude Design is a research preview that may evolve).
- **Atomic Rename Strategy:** HIGH — full file inventory generated via ripgrep with explicit counts; macOS sed/iconutil/sips/git commands all verified locally; the `.learnos/rules/` lockstep finding is a real gotcha that would have been missed without explicit search.
- **Validation Architecture:** HIGH for the per-success-criterion shell checks; the lack of a unit-test framework is a deliberate Phase 0 design choice (not a gap).
- **Common Pitfalls:** MEDIUM — most pitfalls are well-documented; Pitfall 3 (gpt-image-1 transparency holes) is a known issue with documented prevalence (~80% bug rate) but exact rate may have improved since the 2025-08 community thread.
- **Environment Availability:** HIGH — all probed locally with `command -v`.
- **Security Domain:** MEDIUM — STRIDE pass is light because Phase 0 has minimal attack surface; the secrets-audit recommendation is the main actionable item.

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (30 days for stable info — naming/icon-pipeline shouldn't drift fast; vendor APIs may shift faster, plan-phase should re-verify gpt-image-1 + Claude Design capability if Phase 0 starts >2 weeks from this date)
