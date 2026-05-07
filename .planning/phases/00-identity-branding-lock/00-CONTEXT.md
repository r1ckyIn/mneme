# Phase 0: Identity & Branding Lock - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the project's product identity — final app name, app icon (ICNS + PNG variants), bundle identifier, and propagate the rename atomically across the entire repository — **before any production code carries the codename `learn-os`**.

This phase delivers a single PR that retires the codename `learn-os` and replaces it with the locked identity. No production application code is written here — Phase 1 scaffolds the production Tauri shell using the bundle identifier locked in this phase.

**In scope:**
- Decide final app name (or defer to plan-phase researcher with locked criteria + starting candidates)
- Generate icon assets (ICNS + PNG variants) via the locked icon pipeline
- Lock bundle identifier and reverse-DNS pattern
- Atomic rename across: GitHub repo, local repo path, all `.planning/` docs, CLAUDE.md (project), README (newly created), spike-findings skill, spike 002 bundle id reference
- Establish window-title / Dock-label contract for Phase 1

**Out of scope (defer to other phases):**
- Production Tauri shell scaffolding (Phase 1)
- Production `tauri.conf.json` creation (Phase 1)
- Window-title view-aware context (Phase 1+)
- Menu-bar icon variants (Phase 1+, only if/when menubar widget is added)
- Any feature code or UI design beyond branding assets

</domain>

<decisions>
## Implementation Decisions

### Naming
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

### Icon
- **D-05:** Concept anchor: **graph-node + monogram hybrid** — small node-edge graph with the final name's first letter embedded as the focal monogram. Reflects the project's KG dual-layer architecture (REQ-07) AND personal-product identity.
- **D-06:** Icon production pipeline (locked):
  1. Final name decided (post-D-01 researcher pass)
  2. **ChatGPT image2.0 (GPT-image-1)** generates 6-8 concept sketches around D-05 anchor
  3. User picks 1-2 sketches
  4. **Claude Design** does 1 refinement round (vector-tighten + macOS squircle compliance + ICNS + PNG variant export)
  5. Ship — no further iteration cycles in Phase 0
- **D-07:** Style + color palette + dark-mode handling — **deferred** to post-naming icon-generation step (sketches will surface direction; locking before name is premature).
- **D-08:** Time-box: Phase 0 (start of name research → ICNS in repo) **≤ 1 day**. If exceeded, replan or escalate.
- **D-09 (downstream awareness):** Claude Design is Anthropic's **prompt-to-prototype** tool (HTML/CSS/JS UI prototypes), not a raster image generator. The plan-phase plan MUST surface the exact pipeline for Claude Design's role — likely path: SVG/HTML mockup from Claude Design → export PNG @ 1024×1024 → `iconutil -c icns` for ICNS. If Claude Design cannot meaningfully refine raster icon assets, the planner is authorized to substitute an equivalent KP-05-spirit tool (e.g., direct macOS Icon Composer, Figma + Iconutil) and document the deviation.

### Bundle Identifier + Rename Propagation
- **D-10:** Bundle identifier pattern: **`dev.<finalname>.app`** (locked). Replaces current `dev.learn-os.spike`.
- **D-11:** Rename scope is **atomic + 100%**. The Phase 0 PR MUST update:
  - GitHub repo name: `r1ckyIn/learn-os` → `r1ckyIn/<finalname>`
  - Local repo path: `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os` → `/Users/qinyuan/claude/r1ckyIn_GitHub/<finalname>`
  - Project-level CLAUDE.md (`/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/CLAUDE.md`)
  - All `.planning/*.md` files (PROJECT.md, ROADMAP.md, REQUIREMENTS.md, STATE.md, config.json)
  - All files under `.planning/research/` (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md, questions.md)
  - All files under `.planning/spikes/` including `MANIFEST.md`, `WRAP-UP-SUMMARY.md`, `CONVENTIONS.md`
  - Spike 002 file `.planning/spikes/sources/002-tauri-claude-shell/app/src-tauri/tauri.conf.json` — `dev.learn-os.spike` → `dev.<finalname>.spike`
  - Project skill: rename `.claude/skills/spike-findings-learn-os/` directory → `.claude/skills/spike-findings-<finalname>/`; update SKILL.md frontmatter `name:` field; update CLAUDE.md skill-table reference
  - README.md (newly created, see D-13)
- **D-12:** Phase 0 PR is **a single atomic commit** (per solo-dev rule: one phase = one branch = one PR; hook `guard-branch.sh` enforces).

### README + Window/Dock Contract
- **D-13:** README content depth: **detailed** — follow `r1ckyIn/project-template` README structure:
  - Bilingual (English + Chinese sections per template convention; English-first, Chinese mirror)
  - flat-square badges (build status, license, Tauri version, etc.)
  - MIT LICENSE (separate `LICENSE` file)
  - Quickstart (clone → install → run)
  - "What This Is" — mirrors PROJECT.md core value, 2-3 paragraphs
  - Architecture overview — three-pane layout description + stack list (Tauri 2 + SvelteKit + claude subprocess)
  - Status table — Phases 0-10 progress (mirrors ROADMAP.md Progress section)
  - Footer line: `> Codename history: this project was developed under codename \`learn-os\` until 2026-05-07.` (sourcing line — D-15)
- **D-14:** Window title + Dock label (Phase 0 contract for Phase 1): **just the app name** — `<finalname>`. No view-aware context, no tagline. Phase 1+ can iterate.
- **D-15:** Git history handling: **preserve as-is**. No `git filter-repo` rewrite. Existing commits keep `learn-os` references. README footer (D-13) is the canonical sourcing record.

### Claude's Discretion
- **CD-01:** Exact wording of the README "What This Is" section — Claude drafts, user reviews in PR.
- **CD-02:** Exact set of badges in README header — Claude picks per project-template convention.
- **CD-03:** Specific ChatGPT image2.0 prompt phrasing — Claude drafts post-naming, user approves before generation.
- **CD-04:** Order of file changes within the rename PR — Claude picks an execution order that minimizes git-rename / git-move conflicts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + product context
- `.planning/ROADMAP.md` — Phase 0 entry (lines 33-44): goal, depends-on, success criteria, OSS adoption note
- `.planning/PROJECT.md` — full product context; KP-02 (50% open-source), **KP-05 (Claude Design for UI)**, OOS-01 (multi-user/distribution — *being amended this phase per user request, see deferred ideas*)
- `.planning/REQUIREMENTS.md` §"Phase-to-Requirement Cluster Density" — confirms Phase 0 has 0 v1/v1.x REQs (pre-implementation phase)
- `.planning/STATE.md` §"Notes for Future-Self" — reminder that codename `learn-os` is retired in Phase 0

### Identity-bearing files (rename targets)
- `/Users/qinyuan/claude/r1ckyIn_GitHub/learn-os/CLAUDE.md` — project-level instructions; references codename `learn-os` ~14 places (project name, skills section, status overrides, etc.)
- `.planning/spikes/sources/002-tauri-claude-shell/app/src-tauri/tauri.conf.json` — only existing bundle id reference (`dev.learn-os.spike`)
- `.claude/skills/spike-findings-learn-os/SKILL.md` — frontmatter `name:` field + skill description
- All `.planning/**/*.md` files — codename `learn-os` referenced extensively

### Project template (README structure)
- `/Users/qinyuan/claude/r1ckyIn_GitHub/CLAUDE.md` §"项目模板（SSOT）" — points to `r1ckyIn/project-template` GitHub repo as the README + LICENSE + .gitignore SSOT for new repos
- GitHub: `https://github.com/r1ckyIn/project-template` — bilingual README format, flat-square badges, MIT LICENSE template (researcher should `gh repo clone` or `gh api` to read latest version during plan)

### Spike-locked patterns (do not re-validate)
- `.claude/skills/spike-findings-learn-os/SKILL.md` — locks subprocess + UI patterns; the rename of this skill must preserve the SKILL.md content unchanged (Phase 1+ depends on these patterns)

### Solo-dev workflow rules
- `/Users/qinyuan/claude/r1ckyIn_GitHub/CLAUDE.md` §"GSD 工作流(v1.40)" §"Solo-dev 铁律" — one phase = one branch = one PR; guard-branch.sh hook enforces

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Project template** (`r1ckyIn/project-template`): README structure, badges, MIT LICENSE — README created in Phase 0 should adhere to this template
- **Spike 002 `tauri.conf.json`**: shows the structure of bundle identifier configuration (used as reference; production version scaffolds in Phase 1, not Phase 0)
- **`spike-findings-learn-os` SKILL**: locked subprocess + UI patterns survive intact through the rename — only the directory name + SKILL.md `name:` frontmatter field change

### Established Patterns
- **GSD phase = atomic PR** (per solo-dev rule, hook-enforced): Phase 0 is one branch, one PR with all rename + identity-asset changes in one commit
- **`.planning/` is single-source-of-truth**: PROJECT.md / ROADMAP.md / REQUIREMENTS.md / STATE.md updated atomically in same PR; codename references everywhere must flip in lockstep

### Integration Points
- **Phase 1 inherits**: bundle identifier (`dev.<finalname>.app`) → goes into Phase 1's production `tauri.conf.json`; window-title contract → goes into Phase 1's main window setup; ICNS file → goes into Phase 1's `src-tauri/icons/`
- **Future GitHub release**: D-13 detailed README + MIT LICENSE prepares the repo for D-rev (see deferred ideas — eventual public open-source release as portfolio piece)

</code_context>

<specifics>
## Specific Ideas

- **Naming aesthetic preference**: User favors Greek/Latin scholarly roots (Mnemo, Mneme, Mira, Locus, Lyceum, Praxis, Atrium) over neuroscience-tech buzzwords (Cortex, Synapse, Neuro). Name should feel timeless, not derivative-of-2020s-AI-startup.
- **Icon aesthetic preference**: User wants graph-node + monogram hybrid (combination of "图谱节点 - 反映 KG 双层架构" and "字型/单色 monogram - 简约"). Single conceptual symbol > literal-illustrative icon.
- **Tooling preference**: User explicitly chose ChatGPT image2.0 for sketching even though KP-05 specifies Claude Design — meaningful nuance: Claude Design is for UI prototypes (HTML/CSS/JS), not raster ideation. ChatGPT image2.0 fills the "concept exploration" gap. Plan-phase should respect this two-tool flow.
- **Speed preference**: ≤ 1-day Phase 0 time-box. User does not want naming/icon to drag — atomic decision-then-ship.
- **Time-stamping**: 2026-05-07 is the codename retirement date (used in README footer per D-15).

</specifics>

<deferred>
## Deferred Ideas

### OOS-01 amendment (executed within this phase, but logged here for traceability)
- **Action requested by user mid-discussion**: amend PROJECT.md `OOS-01` wording to allow future open-source distribution.
- **Decision**: OOS-01 will be split — multi-user / collaboration / commercialization remain excluded; **distribution as open-source portfolio piece becomes allowed** (MIT-licensed, no accounts, no billing, no shared infra).
- **Rationale**: User stated "未来要发布" (future release planned); contradicts current OOS-01 absolute "no distribution" stance. Personal-use *single-user codebase* is unaffected; only the publishability of the codebase changes.
- **Where applied**: PROJECT.md OOS-01 reworded in the same Phase 0 PR. Future portfolio-release work (logos, marketing copy, contribution guide, public-issues triage) is its own future phase if/when actually pursued.

### Reviewed Todos (not folded)
None — discussion stayed within phase scope (no `cross_reference_todos` matches found for Phase 0).

### Future-phase ideas surfaced during Phase 0 discussion
- **Menubar icon monochrome variant** — surfaced as a "what if Phase 1+ adds menubar widget" thought; deferred until that feature is actually scoped.
- **Public open-source release as portfolio piece** — enabled by OOS-01 amendment, but the actual release work (`CONTRIBUTING.md`, public-facing landing page, screenshots, demo video, code-of-conduct, etc.) is a separate future phase post-v1 ship.
- **Logo / wordmark** — as distinct from the app icon; if/when project pursues public release polish, a wordmark-pair (icon + typographic logotype) becomes a discussion. Phase 0 only locks the app icon (Dock + window).

</deferred>

---

*Phase: 0-Identity-Branding-Lock*
*Context gathered: 2026-05-07*
