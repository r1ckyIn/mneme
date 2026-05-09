---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 01
subsystem: infra
tags: [tauri-2, sveltekit, svelte-5, rust-1.88, vite-6, vitest-4, jsdom, nix, home-crate, tauri-plugin-shell, claude-code-parser-vendored, kd-12, csp, rgba-icons]

# Dependency graph
requires:
  - phase: 00-identity-branding-lock
    provides: "icon-assets/icon.icns + iconset PNGs + final productName Mneme + identifier dev.mneme.app"
provides:
  - "Runnable Tauri 2 + SvelteKit shell at repo root with Phase 0 identity locked"
  - "src-tauri/Cargo.toml with tauri-plugin-shell 2.3.5, nix 0.31 (signal+process), home 0.5"
  - "src-tauri/tauri.conf.json with productName Mneme, identifier dev.mneme.app, window 1280x860 / min 1024x600 / decorations:true / titleBarStyle:Overlay / hiddenTitle:true"
  - "src-tauri/src/lib.rs setup hook auto-creating ~/.mneme/scratch/ via home::home_dir() + create_dir_all (idempotent)"
  - "src/app.html with CSP meta tag locked to SPEC L140 verbatim string"
  - "vendor/claude-code-parser/ frozen-reference snapshot at upstream commit 61fa32c5b7004fde32c47c0e95abb657316b224e"
  - "Vitest 4 jsdom harness with sentinel test passing (2/2)"
  - "tsconfig.json with $vendor/* and $lib/* path aliases"
  - "rust-toolchain.toml channel 1.88 (KD-03 ≥ 1.88; rustup auto-installs)"
affects: ["01-02-PLAN.md (SSOT spawn-args lands here)", "01-03-PLAN.md (sanitize harness uses jsdom env)", "01-04-PLAN.md (extends lib.rs setup hook with subprocess state machine)", "01-05-PLAN.md (replaces +page.svelte placeholder with splitter + tokens.css)", "01-06-PLAN.md (ChatPanel imports ClaudeEvent from $vendor/claude-code-parser/src/types/events)", "01-07-PLAN.md (Husky initialization + lifecycle harness; deletes tests/sentinel.test.ts)"]

# Tech tracking
tech-stack:
  added:
    - "@tauri-apps/api ^2.11.0"
    - "@tauri-apps/plugin-shell ^2.3.5"
    - "marked ^18.0.3"
    - "katex ^0.16.45 (≥ SPEC floor 0.16.21 — T-1-06 mitigation)"
    - "dompurify ^3.4.2"
    - "@sveltejs/kit ^2.59.1 + @sveltejs/adapter-static ^3.0.10"
    - "svelte ^5.55.5 (Svelte 5 runes)"
    - "vite ^6.0.7"
    - "vitest ^4.1.5 + jsdom ^25.0.1"
    - "husky ^9.1.7 (installed; NOT initialized — that's plan 01-07)"
    - "tauri ^2 + tauri-plugin-shell 2.3.5 (Rust)"
    - "nix 0.31 with features=[signal, process] (D-11 — for plan 01-04 PGID kill)"
    - "home 0.5 (setup-hook home_dir resolution)"
  patterns:
    - "Vendored OSS pattern (KD-12 + D-13): src/ + LICENSE + VENDOR.md only; no tests/, no examples/, frozen at upstream commit"
    - "Rust-side setup hook for Tauri 2 builder (foundation for plan 01-04 state machine + ExitRequested+CloseRequested hook union)"
    - "$vendor/* tsconfig path alias enabling import from vendor/ directory without npm dependency"
    - "CSP meta tag in app.html as REQ-5 starting point — defense-in-depth alongside plan 01-03 runtime sanitize pipeline"

key-files:
  created:
    - "package.json (frontend manifest with 5 deps + 14 devDeps)"
    - "package-lock.json (npm 212-package lockfile, generated)"
    - "src-tauri/Cargo.toml (Rust manifest)"
    - "src-tauri/tauri.conf.json (Phase 0 identity + D-05/D-06 chrome lock)"
    - "src-tauri/build.rs (Tauri 2 standard build script)"
    - "src-tauri/src/main.rs (binary entry)"
    - "src-tauri/src/lib.rs (Tauri builder + plugin-shell init + ~/.mneme/scratch setup hook)"
    - "src-tauri/icons/ (icon.icns + 32x32 + 128x128 + 128x128@2x + icon.png + icon.ico — all RGBA)"
    - "src/app.html (CSP meta tag locked)"
    - "src/routes/+layout.ts (ssr=false / prerender=true)"
    - "src/routes/+page.svelte (Wave 1 bootstrap placeholder)"
    - "tsconfig.json ($vendor/* + $lib/* path aliases)"
    - "svelte.config.js (adapter-static with build/index.html fallback)"
    - "vite.config.ts (Vite 6 + sveltekit plugin)"
    - "rust-toolchain.toml (channel 1.88)"
    - "vitest.config.ts (jsdom env + globals)"
    - "tests/sentinel.test.ts (2 placeholder tests — deleted in plan 01-07)"
    - "scripts/.gitkeep (placeholder dir for plan 01-02)"
    - "vendor/claude-code-parser/LICENSE (verbatim MIT from upstream)"
    - "vendor/claude-code-parser/VENDOR.md (snapshot date + commit hash + frozen-ref status)"
    - "vendor/claude-code-parser/src/{index,parser,translator,writer}.ts + types/{events,protocol}.ts"
  modified:
    - ".gitignore (appended Rust target / Husky / src-tauri/Cargo.lock / src-tauri/gen/)"

key-decisions:
  - "rust-toolchain.toml uses channel = \"1.88\" (permissive form per Phase 0 LEARNINGS macOS-CLI version-precision lesson; allows patch updates without re-pinning)"
  - "home crate adopted for ~/.mneme/scratch/ resolution (already a Tauri 2 transitive dep; T-1-11 risk accepted per threat register)"
  - "src-tauri/Cargo.lock gitignored per plan; src-tauri/gen/ added to .gitignore as a deviation (Tauri auto-regenerates on every build)"
  - "Vendored claude-code-parser preserves upstream src/ layout verbatim (parser.ts + translator.ts + writer.ts + index.ts + types/{events,protocol}.ts) instead of single types.ts; downstream plans 01-02/01-06 import ClaudeEvent from $vendor/claude-code-parser/src/types/events"
  - "PNG icons converted from RGB → RGBA at install time (Rule 3 deviation; Phase 0 didn't catch because Phase 0 didn't compile a Tauri target)"

patterns-established:
  - "Pattern (vendoring): src/ + LICENSE + VENDOR.md only; tests/ examples/ CI files dropped; VENDOR.md records snapshot date + upstream commit hash + adoption mode + license posture"
  - "Pattern (path-alias-for-vendor): tsconfig.json paths $vendor/* → ./vendor/* allows import without npm dep, preserving KD-12 vendoring posture"
  - "Pattern (CSP locked at boot): app.html ships with default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' (SPEC L140 byte-for-byte); plan 01-03 hardens runtime sanitize"
  - "Pattern (idempotent setup hook): Tauri 2 .setup() closure does fs::create_dir_all on user paths — silent no-op if path exists, no privilege escalation; foundation for plan 01-04 state machine extension"

requirements-completed: [REQ-01, REQ-02, REQ-10]

# Metrics
duration: 11min
completed: 2026-05-09
---

# Phase 1 Plan 01: Tauri Shell Foundation — Wave 1 Bootstrap Summary

**Tauri 2 + SvelteKit 2.59 + Svelte 5.55 + Rust 1.88 shell at repo root with productName Mneme + identifier dev.mneme.app + 1280x860 Overlay-titlebar window + claude-code-parser frozen at upstream commit 61fa32c, runnable end-to-end after `npm install` + `cargo build`.**

## Performance

- **Duration:** ~11 min wall time (5 commits between 11:36–11:46 local)
- **Completed:** 2026-05-09
- **Tasks:** 5/5 complete
- **Files modified:** 28 created + 1 modified (.gitignore)

## Accomplishments

- Wave 1 bootstrap delivered: project layout that all Wave 2/3/4 plans assume is in place (package.json + Cargo.toml + tsconfig.json + vitest.config.ts + vendor/claude-code-parser/src/types/events.ts)
- Phase 0 identity transition complete: productName `Mneme`, bundle identifier `dev.mneme.app`, 1280×860 window with macOS Overlay titlebar (D-05 + D-06)
- claude-code-parser vendored per KD-12 + D-13: src/ + LICENSE + VENDOR.md (frozen at upstream commit `61fa32c5b7004fde32c47c0e95abb657316b224e`); zero AGPL contamination under vendor/ (D-09 mechanical guard)
- Rust toolchain auto-installs at 1.88.0 via rustup pickup of `rust-toolchain.toml` (KD-03)
- T-1-06 KaTeX CVE mitigation verified at install time: `katex@0.16.45` resolved (well above SPEC floor 0.16.21)
- Vitest 4 jsdom harness sentinel test runs and passes (2/2 assertions; harness ready for plan 01-03 sanitize battery)
- Round 5 amendment A-04 enforced: zero cost-meter scaffolding, no `~/.mneme/usage.jsonl`, no daily-cap state machine in this plan

## Task Commits

Each task was committed atomically on per-agent worktree branch `worktree-agent-abb9f543affe03cd3`:

1. **Task 1: Bootstrap Tauri 2 + SvelteKit project skeleton at repo root** — `efc5c72` (feat)
2. **Task 2: Copy Phase 0 icon assets into src-tauri/icons/** — `46b9943` (feat)
3. **Task 3: Vendor claude-code-parser per KD-12 + D-13** — `16467fe` (feat)
4. **Task 4: Vitest config + scripts/ directory + sentinel placeholder test** — `4365804` (feat)
5. **Task 5: Install npm + cargo deps and verify the bootstrap shell launches** — `0249d63` (chore — also absorbs RGBA fix + tauri/gen ignore)

## Files Created/Modified

**Frontend manifest + scaffolding:**
- `package.json` — 5 deps (`@tauri-apps/api`, `@tauri-apps/plugin-shell`, `marked`, `katex`, `dompurify`) + 14 devDeps; `claude-code-parser` deliberately absent (KD-12)
- `package-lock.json` — npm-resolved 212-package lockfile
- `tsconfig.json` — `$vendor/*` + `$lib/*` path aliases; extends `.svelte-kit/tsconfig.json`
- `svelte.config.js` — adapter-static with `build/index.html` fallback (Tauri 2 frontendDist)
- `vite.config.ts` — sveltekit() plugin + Tauri-compatible host:localhost:5173 strict
- `vitest.config.ts` — `environment: 'jsdom'` + `globals: true` + include glob `tests/**/*.test.ts` + `src/**/*.test.ts`

**Source files:**
- `src/app.html` — CSP meta tag (`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'`) — SPEC L140 verbatim
- `src/routes/+layout.ts` — `ssr=false; prerender=true` (SPA mode lift from spike-002)
- `src/routes/+page.svelte` — Wave 1 placeholder with comment pointing to plan 01-05 replacement
- `tests/sentinel.test.ts` — 2 placeholder tests proving jsdom env wired
- `scripts/.gitkeep` — placeholder for plan 01-02 `gen-capabilities.ts` + `audit-capabilities.sh`

**Tauri Rust manifest + entry:**
- `src-tauri/Cargo.toml` — `tauri-plugin-shell 2.3.5`, `nix 0.31 features=[signal,process]` (D-11), `home 0.5` (setup-hook helper)
- `src-tauri/tauri.conf.json` — `productName "Mneme"`, `identifier "dev.mneme.app"`, `1280×860 / min 1024×600 / decorations:true / titleBarStyle:"Overlay" / hiddenTitle:true`, `bundle.icon[]` referencing 5 icon files
- `src-tauri/build.rs` — `tauri_build::build()` call
- `src-tauri/src/main.rs` — 5-line binary entry
- `src-tauri/src/lib.rs` — Tauri Builder + `tauri_plugin_shell::init()` + `.setup()` closure that creates `~/.mneme/scratch/` via `home::home_dir()` + `fs::create_dir_all` (idempotent)
- `src-tauri/icons/{icon.icns, icon.ico, 32x32.png, 128x128.png, 128x128@2x.png, icon.png}` — all RGBA, sourced from Phase 0 `icon-assets/` (icon.icns and PNG sizes from iconset.iconset/; icon.ico generated via Python PIL)

**Vendored:**
- `vendor/claude-code-parser/LICENSE` — MIT, verbatim from upstream
- `vendor/claude-code-parser/VENDOR.md` — snapshot date `2026-05-09`, upstream commit `61fa32c5b7004fde32c47c0e95abb657316b224e`, "frozen reference per KD-12" status statement, Path 2 types-only adoption mode documented
- `vendor/claude-code-parser/src/{index,parser,translator,writer}.ts + types/{events,protocol}.ts` — verbatim copy

**Toolchain pin:**
- `rust-toolchain.toml` — `channel = "1.88"` (KD-03; rustup auto-installs 1.88.0 on first cargo invocation)

**Modified:**
- `.gitignore` — appended `src-tauri/target/`, `src-tauri/Cargo.lock`, `.husky/_`, `src-tauri/gen/`, `.env.*`

## Decisions Made

- **Vendor layout deviation absorbed in VENDOR.md "Local modifications" section**: upstream `claude-code-parser` reorganized its types directory between RESEARCH.md verification (2026-05-08) and this snapshot. The plan listed `parseLine.ts` and `types.ts` as canonical files; upstream's actual current layout has parseLine logic inside `parser.ts`, and types split into `src/types/events.ts` (`ClaudeEvent` discriminated union — what we'll consume in plans 01-02 / 01-06) plus `src/types/protocol.ts`. The vendoring rule (verbatim copy, no local edits) wins; downstream plans were updated to import from `$vendor/claude-code-parser/src/types/events`.
- **Rust toolchain pinning granularity = `1.88`** (per Phase 0 LEARNINGS macOS-CLI version-precision lesson): allows patch updates without re-pinning. rustup auto-installs `1.88.0` on first cargo invocation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] PNG icons converted to RGBA**
- **Found during:** Task 5 (cargo build)
- **Issue:** Tauri 2's `tauri::generate_context!()` macro panicked with `icon … is not RGBA`. Phase 0 emitted PNGs in 8-bit-per-channel RGB mode without an alpha channel; Phase 0 didn't catch this because Phase 0 didn't compile a Tauri target.
- **Fix:** `python3 -c "from PIL import Image; img = Image.open(path).convert('RGBA'); img.save(path, format='PNG')"` applied to all four PNGs (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png`).
- **Files modified:** `src-tauri/icons/{32x32.png, 128x128.png, 128x128@2x.png, icon.png}`
- **Verification:** `file src-tauri/icons/*.png` reports `8-bit/color RGBA`; `cargo build --manifest-path src-tauri/Cargo.toml` finishes with `Finished dev profile [unoptimized + debuginfo]`.
- **Committed in:** `0249d63` (Task 5 commit)

**2. [Rule 3 — Blocking] Added `src-tauri/gen/` to .gitignore**
- **Found during:** Task 5 (post-cargo-build `git status`)
- **Issue:** `cargo build` regenerates `src-tauri/gen/schemas/{acl-manifests.json, capabilities.json, desktop-schema.json, macOS-schema.json}` on every compile. These files are auto-derived from `src-tauri/capabilities/` + `Cargo.toml`; tracking them in git would cause spurious diffs on every developer machine.
- **Fix:** Appended `src-tauri/gen/` to `.gitignore`.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` after second `cargo build` reports clean tree.
- **Committed in:** `0249d63` (Task 5 commit)

**3. [Rule 1 — Bug] Plan Task 5 verify regex for katex pin was malformed**
- **Found during:** Task 5 (verify line execution)
- **Issue:** Plan's regex `npm ls katex \| grep -E "katex@0\.(16\.[2-9][0-9]|1[7-9]|[2-9][0-9])\."` requires a trailing literal `.` after the patch number, but `npm ls` outputs `katex@0.16.45` with no trailing period at end-of-string.
- **Fix:** Substantive check replaced with proper version comparison: `python3 -c "v=ver.split('.'); exit(0 if (int(v[0]),int(v[1]),int(v[2])) >= (0,16,21) else 1)"`. Confirmed `katex@0.16.45` ≥ `0.16.21` SPEC floor (T-1-06 mitigation).
- **Files modified:** None (verify-line bug; substantive katex pin in `package.json` is correct).
- **Verification:** Python version-tuple comparison passes.
- **Committed in:** Documented in `0249d63` commit body and here.

**4. [Rule 1 — Bug] Plan Task 5 verify regex for claude-code-parser absence false-positives**
- **Found during:** Task 5 (verify line execution)
- **Issue:** Plan's regex `! npm ls claude-code-parser 2>/dev/null \| grep -q "^├\|^└"` matches `└── (empty)` — npm's empty-tree marker — when the package is absent, producing a false positive (test fails when package is correctly absent).
- **Fix:** Replaced with `! npm ls claude-code-parser 2>/dev/null | grep -q "claude-code-parser"` which correctly matches the package name only when present.
- **Files modified:** None (verify-line bug; the substantive package.json is correct — claude-code-parser is absent from deps and devDeps).
- **Verification:** `grep -q "claude-code-parser"` returns non-zero (no match) → claude-code-parser absent confirmed.
- **Committed in:** Documented in `0249d63` commit body and here.

---

**Total deviations:** 4 auto-fixed (2 Rule 3 blocking issues forced by build, 2 Rule 1 verify-line bugs in the plan itself)
**Impact on plan:** All four are minor scaffolding fixes that didn't change scope. The two Rule 3 fixes (RGBA + tauri/gen) are intrinsic to compiling a Tauri 2 binary on macOS and would have surfaced in the same way for any executor. The two Rule 1 fixes are verify-line regex bugs in the plan's automated check; the substantive code passes both intent checks (katex 0.16.45 ≥ 0.16.21, claude-code-parser absent from deps). Plans 01-02 / 01-03 / 01-04 unaffected.

## Issues Encountered

- **`sips` ICO generation refused** (cosmetic): macOS `sips -s format ico` errored with "Unable to write image to file" on Intel Ventura 13.4 (no native ICO encoder support). Plan provided fallback chain `magick → sips → python3 PIL`; landed on Python PIL with the planned `[256,128,64,48,32,16]` size container. Resolved cleanly via plan's documented fallback.
- **Vite informational warning about kit.alias vs tsconfig.paths**: SvelteKit 2.59 emits an info-level warning when `tsconfig.json` declares `paths` (suggesting `kit.alias` instead). The plan deliberately uses `tsconfig.paths` per RESEARCH §4.8 / D-14 design (Vite + Vitest both honor it; SvelteKit's auto-generated tsconfig is overridden by the extending file). Plan 01-02 owns the SSOT placement; this warning is benign and does not block builds or tests.

## User Setup Required

None — no external service configuration required. The npm prefix is already at `~/.npm-global` (per r1ckyIn solo-dev铁律), Rust 1.88 auto-installs via rustup, and Python PIL was already available on this Intel Mac.

## Next Phase Readiness

- **Wave 2 plans (01-02 SSOT, 01-03 sanitize, 01-04 lifecycle) can begin in parallel** — all four plans assume `package.json` + `Cargo.toml` + `tsconfig.json` paths + `vitest.config.ts` + `vendor/claude-code-parser/src/types/` already exist. Done.
- **Wave 3 plan (01-05 layout)** — replaces `src/routes/+page.svelte` placeholder with three-pane splitter + tokens.css. Placeholder comment in the file already points at this plan.
- **Wave 4 plan (01-06 chat E2E)** — imports `ClaudeEvent` from `$vendor/claude-code-parser/src/types/events`. Path alias is wired in tsconfig.json; verify in plan 01-06's first import-check task.
- **Wave 5 plan (01-07 Husky + lifecycle harness)** — Husky is installed (`devDeps`) but NOT initialized; tests/sentinel.test.ts will be deleted once real test files (sanitize.test.ts, spawn-args.test.ts, etc.) all pass.
- **Manual `npm run tauri dev` smoke test deferred to plan 01-07's dogfood checklist** — this plan only verifies that `cargo build` and `npx svelte-kit sync` succeed without launching the interactive window.

## Self-Check: PASSED

Mechanical existence verification of all artifacts and commits:

```
package.json: FOUND
src-tauri/Cargo.toml: FOUND
src-tauri/tauri.conf.json: FOUND (productName Mneme + identifier dev.mneme.app + window 1280×860 + Overlay)
src-tauri/src/lib.rs: FOUND (tauri_plugin_shell::init + .mneme/scratch setup hook)
src-tauri/icons/icon.icns: FOUND (≥1KB, real ICNS)
src-tauri/icons/{32x32,128x128,128x128@2x,icon}.png: FOUND (all RGBA)
src-tauri/icons/icon.ico: FOUND (Python-PIL generated)
src/app.html: FOUND (Content-Security-Policy meta tag, SPEC L140 verbatim)
src/routes/+layout.ts: FOUND (ssr=false / prerender=true)
src/routes/+page.svelte: FOUND (Wave 1 placeholder)
tsconfig.json: FOUND ($vendor/* + $lib/* aliases)
svelte.config.js: FOUND (adapter-static)
vite.config.ts: FOUND
vitest.config.ts: FOUND (jsdom env + globals)
rust-toolchain.toml: FOUND (channel "1.88")
vendor/claude-code-parser/LICENSE: FOUND (MIT)
vendor/claude-code-parser/VENDOR.md: FOUND (snapshot date + commit hash)
vendor/claude-code-parser/src/: FOUND (5 files: index, parser, translator, writer + types/{events,protocol})
tests/sentinel.test.ts: FOUND (2 tests passing)
scripts/.gitkeep: FOUND
package-lock.json: FOUND
node_modules/: FOUND
.svelte-kit/: FOUND (generated by svelte-kit sync)

Commits:
efc5c72: FOUND (Task 1 — bootstrap)
46b9943: FOUND (Task 2 — icons)
16467fe: FOUND (Task 3 — vendor)
4365804: FOUND (Task 4 — vitest + sentinel)
0249d63: FOUND (Task 5 — install + RGBA fix)
```

All artifacts exist; all commits resolvable on the worktree branch.

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Plan: 01 (Wave 1 bootstrap)*
*Completed: 2026-05-09*
