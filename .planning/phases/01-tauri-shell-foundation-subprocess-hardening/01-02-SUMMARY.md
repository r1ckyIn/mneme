---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 02
subsystem: security-capability
tags: [tdd, tauri-2, capability-hardening, ssot, browser-safety, cycle-2-high-1, req-2, req-4, req-10, t-1-03, t-1-04, t-1-05, t-1-07, t-1-44, a-04, a-13]

# Dependency graph
requires:
  - phase: 01-tauri-shell-foundation-subprocess-hardening
    plan: 01
    provides: "package.json + tsconfig $vendor/$lib aliases + vitest.config.ts jsdom harness + scripts/.gitkeep + Tauri 2 Cargo.toml + initial src/app.html + src/routes/ shell"
provides:
  - "src/lib/spawn-args.shared.ts — browser-safe SSOT (buildClaudeArgs(prompt, scratchDir) + MAX_TURNS + SCRATCH_DIR_REGEX, ZERO Node imports — verified by grep)"
  - "src/lib/spawn-args.node.ts — Node-only resolver (homedir() → SCRATCH_DIR const), consumed exclusively by scripts/gen-capabilities.ts"
  - "scripts/gen-capabilities.ts — prebuild generator with --dry-run mode, runtime length-sanity + SCRATCH_DIR_REGEX sanity guard"
  - "scripts/audit-capabilities.sh — composed CI/pre-commit guard with 8 checks (SSOT drift / args:true / `\"*\"` / --bare / MAX_TURNS / parser-not-npm / browser-safety .shared / .node-leak in src/ / legacy file)"
  - "src-tauri/capabilities/default.json — generated 13 × 2 (allow-spawn + allow-execute = 26 validator entries; 0 wildcards; 0 args:true)"
  - "tests/spawn-args.test.ts — 19 Vitest assertions (13 buildClaudeArgs + 2 browser-safety + 3 Node-consumer + 1 SCRATCH_DIR regex contract)"
  - "tests/capability-regex.test.ts — 12 Vitest assertions covering JSON shape + every-validator-matches contract + out-of-scope rejection"
  - "tests/audit/{fixture-clean,fixture-args-true,fixture-wildcard,fixture-bare}.json — 4 corruption fixtures + 1 clean"
  - "tests/audit/test-audit-script.sh — Bash integration harness sweeping the 4 corrupted + 1 clean + 1 production-real cases (5/5 PASS)"
  - "package.json prebuild wired to `node --experimental-strip-types scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh`"
affects: ["01-04-PLAN.md (Rust spawn path consumes the locked capability validators; subprocess state machine spawns through claude-bin allowlist)", "01-06-PLAN.md (ChatPanel.svelte will import buildClaudeArgs from $lib/spawn-args.shared and resolve scratchDir via homeDir() from @tauri-apps/api/path — Cycle-2 HIGH-1 contract)", "01-07-PLAN.md (Husky pre-commit will invoke scripts/audit-capabilities.sh; dogfood checklist row C-04 verifies the spawn surface end-to-end)"]

# Tech tracking
tech-stack:
  added:
    - "@types/node ^25.6.2 (devDep — required for spawn-args.node.ts type-checking under svelte-check)"
  patterns:
    - "SSOT split (Cycle-2 HIGH-1): browser-safe `.shared.ts` (zero Node imports — Vite-bundlable) + Node-only `.node.ts` (homedir resolver — scripts/gen-capabilities.ts only). Audit grep guards both directions: 7a (.shared has no os/fs/path imports), 7b (no SvelteKit page browser-imports .node)."
    - "Generator + audit triple (D-14): `spawn-args.shared.ts` SSOT → `gen-capabilities.ts` (build-time generator with --dry-run mode) → `audit-capabilities.sh` (8 checks; runs as npm prebuild + future Husky pre-commit). Hand-edits to default.json fail audit's diff check. Add new flags by editing .shared.ts ONLY, then re-run gen + audit."
    - "Defense-in-depth scratchDir validation: `buildClaudeArgs(prompt, scratchDir)` itself rejects scratchDir values that don't match `^/Users/[^/]+/\\.mneme/scratch$` — caller-passed paths are validated before reaching Tauri's capability layer."
    - "Audit pipefail discipline (Phase 0 LEARNINGS): `set -uo pipefail` (NOT -e) + `{ grep -c ... || true; }` to preserve no-match-as-zero — grep -c returns 1 on 0 matches under -e and would falsely abort."

key-files:
  created:
    - "src/lib/spawn-args.shared.ts (52 lines — browser-safe SSOT)"
    - "src/lib/spawn-args.node.ts (15 lines — Node-only homedir resolver)"
    - "scripts/gen-capabilities.ts (87 lines — generator with --dry-run)"
    - "scripts/audit-capabilities.sh (114 lines — 8-check CI gate)"
    - "src-tauri/capabilities/default.json (113 lines — generated; 26 validators × 2 scopes)"
    - "tests/spawn-args.test.ts (129 lines — 19 assertions)"
    - "tests/capability-regex.test.ts (109 lines — 12 assertions)"
    - "tests/audit/fixture-clean.json (113 lines — known-good fixture for diff)"
    - "tests/audit/fixture-args-true.json (62 lines — corruption: spawn entry args=true)"
    - "tests/audit/fixture-wildcard.json (114 lines — corruption: literal `\"*\"` in windows array)"
    - "tests/audit/fixture-bare.json (117 lines — corruption: `^--bare$` validator inserted)"
    - "tests/audit/test-audit-script.sh (43 lines — 5-case integration harness)"
  modified:
    - "package.json (prebuild updated to use --experimental-strip-types; added @types/node devDep)"
    - "package-lock.json (npm-resolved @types/node entry)"

key-decisions:
  - "**Cycle-2 HIGH-1 absorption (Codex review)** — `src/lib/spawn-args.ts` (single file with `import { homedir } from \"os\"` per RESEARCH §4.2) was correctly identified by Codex as a Vite/SvelteKit bundling failure waiting to happen: ChatPanel.svelte (plan 01-06) browser-imports `buildClaudeArgs`, but Vite cannot bundle Node's `os` for the WebView. Resolution: split into two files. `.shared.ts` is browser-safe (zero Node imports) and exports `buildClaudeArgs(prompt, scratchDir)` taking the scratch dir as an explicit parameter. `.node.ts` is the Node-only homedir resolver — consumed exclusively by `scripts/gen-capabilities.ts`. ChatPanel will resolve `scratchDir` at mount via `homeDir()` from `@tauri-apps/api/path` (Tauri 2 IPC bridge — browser-safe; Vite-bundlable). Audit script gains 3 new checks (7a / 7b / 8) to enforce the split: 7a greps `.shared.ts` for `from \"(node:)?(os|fs|path)\"`, 7b greps SvelteKit pages for browser imports of `.node`, 8 asserts the legacy `spawn-args.ts` does not exist."
  - "**Round 5 A-04 reframing** — T-1-04 (cost runaway) is now mitigated SOLELY by `--max-turns 30` loop guard. Cost meter and `~/.mneme/usage.jsonl` are gone; under OAuth subscription mode there's no per-call billing — only Anthropic rate limits. Audit check 5 (MAX_TURNS pinned in `.shared.ts` SSOT) is the load-bearing T-1-04 mitigation."
  - "**Round 5 A-13 confirmation** — `--model` is intentionally ABSENT from `buildClaudeArgs`. Phase 1 chat-footer model pill (per A-13) hardcodes the display string `\"Opus 4.7 1M · Max\"` for visual identity; the CLI invocation goes WITHOUT `--model` and uses the account default (which IS Opus 4.7 for this user). Test 7 in spawn-args.test.ts asserts `args.not.toContain(\"--model\")`."
  - "**Generator runtime: `node --experimental-strip-types` (Node ≥22) chosen over `tsx`** — Node 22.14 is available on this machine; native type stripping avoids adding `tsx` as a devDep. The experimental warning is benign and only logged to stderr. Falls back to `npx tsx` should Node version drop below 22."
  - "**Capability JSON Option A (all-Var)** — every one of the 13 args is a `{validator: \"^literal$\"}` regex (no Path-prefix-mode mixing). Per RESEARCH §4.2 cross-spec correction 1, this minimizes SPEC churn. The `^30$` validator (index 8), the SCRATCH_DIR_REGEX validator (index 10), and the `.+` free-form prompt validator (index 12) are the only non-trivial regexes; all others are `^--literal$` flag literals."
  - "**`@types/node` added at install time (Rule 3 deviation)** — `svelte-check --tsconfig ./tsconfig.json` errored with `Cannot find module 'node:os'` because the SvelteKit base tsconfig doesn't pull `@types/node`. Adding it as a devDep resolves the type errors without changing runtime semantics. Vitest also needs it for `__dirname` and `node:fs` / `node:path` references in the test files."

patterns-established:
  - "Pattern (SSOT-split-for-browser-bundlability): When a constant or function needs to be reachable from BOTH a Node script (build-time) AND the browser bundle, split into `.shared.ts` (browser-safe — only pure constants and functions taking explicit parameters) + `.node.ts` (Node-only resolvers). Add audit grep guards in both directions to lock the contract."
  - "Pattern (composed-audit-script): Audit script builds defense in concentric rings — (1) SSOT-drift diff against the generator's --dry-run output catches hand-edits, (2) corruption-pattern grep catches injection patterns the diff would miss if the SSOT itself were tampered, (3) browser-safety grep catches bundling regressions, (4) legacy-file guard prevents pre-split files from sneaking back. Each ring fails CLOSED with informative stderr."
  - "Pattern (TDD for security-critical SSOT): RED test commit FIRST (test files reference modules that don't exist → import errors prove RED gate). GREEN commit creates the minimum implementation. Tests assert positive shape (13 elements, MAX_TURNS=30) AND negative absence (no --bare, no --model, no Node imports). Browser-safety regex guards live in the test file (Test 14-15) AND in the audit script (check 7a) — defense at both layers."

requirements-completed: [REQ-02, REQ-10]

# Metrics
duration: 6min
completed: 2026-05-09
---

# Phase 1 Plan 02: Capability Hardening — SSOT + Generator + Audit Triple Summary

**`src/lib/spawn-args.shared.ts` is the browser-safe single source of truth for the 13-element Claude CLI spawn args list; `src/lib/spawn-args.node.ts` is the Node-only homedir resolver consumed exclusively by `scripts/gen-capabilities.ts`; `scripts/audit-capabilities.sh` runs 8 checks (SSOT drift / args:true / literal `*` / --bare / MAX_TURNS=30 / parser-not-npm / browser-safety in .shared / .node-leak in src/ / legacy spawn-args.ts absence) and exits 0 against the generated `src-tauri/capabilities/default.json` with 26 validators × 2 scopes (0 wildcards). T-1-03 / T-1-04 reframed (A-04 loop-guard only) / T-1-05 / T-1-07 / T-1-44 (NEW Cycle-2 HIGH-1) all mitigated; verified by 31 Vitest assertions + 5-case Bash integration harness.**

## Performance

- **Duration:** ~6 min wall time (8 commits between 11:56 → 12:02 local — `node_modules` install ran in parallel during context-loading; `cargo check` validated Tauri 2 schema acceptance in ~55s on cold worktree)
- **Completed:** 2026-05-09
- **Tasks:** 5/5 complete
- **Files created:** 12 (2 implementation + 1 generator + 1 audit script + 1 generated JSON + 2 test suites + 4 fixtures + 1 harness)
- **Files modified:** 2 (package.json prebuild + @types/node devDep; package-lock.json regenerated)
- **Test assertions:** 33 total Vitest passing (2 sentinel from 01-01 + 19 spawn-args + 12 capability-regex), 5/5 Bash audit-harness cases passing

## Accomplishments

- **Cycle-2 HIGH-1 absorbed end-to-end**: `.shared.ts` + `.node.ts` split with grep-guarded contract (Vitest tests 14-15 + audit checks 7a / 7b / 8). Codex review's regression vector closed at every CI invocation; ChatPanel.svelte (plan 01-06) can browser-import `buildClaudeArgs` from `$lib/spawn-args.shared` without bundling Node `os` into the WebView.
- **Round 5 A-04 enforced**: `--max-turns 30` is the SOLE structural ceiling. Audit check 5 greps `MAX_TURNS\s*=\s*"30"` in `.shared.ts`. Zero `~/.mneme/usage.jsonl` write path; zero `$-cap` state machine. T-1-04 narrative reframed.
- **Round 5 A-13 enforced**: `--model` absent from spawn args (test 10 + grep). The chat-footer model pill is decorative; CLI uses account default.
- **REQ-4 (capability hardening)** delivered: 26 exact-regex validators (no wildcards, no `args:true`); SCRATCH_DIR_REGEX anchored both sides (`^/Users/[^/]+/\\.mneme/scratch$`) — `/etc/hosts`, `~/.ssh/`, parent-traversal all rejected by Vitest assertions AND by Tauri's capability layer at runtime.
- **REQ-2 (spawn args)** delivered: 13-element positional contract with `--max-turns 30` immediately adjacent, `--add-dir <SCRATCH>` immediately adjacent, `--exclude-dynamic-system-prompt-sections` present, `--bare` and `--model` absent, prompt as last positional.
- **REQ-10 (vault scope)**: SCRATCH_DIR_REGEX is the only OS-level scope mechanism; `buildClaudeArgs` itself refuses out-of-scope `scratchDir` arguments (defense-in-depth at the producer layer; capability validator at index 10 is the second layer; Tauri's runtime enforcement is the third).
- **TDD discipline visible in commit history**: `test(...)` commit precedes `feat(...)` commit for both spawn-args (90b54fa → 1115289) and audit (a0d8737 → 6799d47). The capability-regex test (37b351b) is a single commit because Task 2 had already produced the JSON correctly — running the test confirmed GREEN on first invocation.

## Task Commits

Each task was committed atomically on per-agent worktree branch `worktree-agent-a787a378a20309045`:

| Task | Step | Commit | Type | Description |
|------|------|--------|------|-------------|
| 1 | RED | `90b54fa` | test | add failing tests for spawn-args ssot split |
| 1 | GREEN | `1115289` | feat | implement spawn-args ssot split (req-2 req-10) |
| 1 | REFACTOR (Rule 3) | `6b0e509` | chore | add @types/node devdep for spawn-args.node typing |
| 2 | — | `de1ed70` | feat | generator emits capability json from ssot (req-4) |
| 3 | TEST | `37b351b` | test | add capability-regex unit tests (req-4) |
| 4 | RED | `a0d8737` | test | add audit-script integration fixtures (req-4) |
| 4 | GREEN | `6799d47` | feat | audit-capabilities.sh closes t-1-03 04 05 07 (req-4) |
| 5 | — | `d4f2215` | chore | wire audit into npm prebuild |

## Files Created/Modified

**Source (browser-safe + Node-only split):**
- `src/lib/spawn-args.shared.ts` — `buildClaudeArgs(prompt, scratchDir)` + `MAX_TURNS = "30"` + `SCRATCH_DIR_REGEX = "^/Users/[^/]+/\\.mneme/scratch$"`. ZERO Node imports — Vite-bundlable for ChatPanel.svelte (plan 01-06). Defense-in-depth: throws on scratchDir mismatch.
- `src/lib/spawn-args.node.ts` — `import { homedir } from "node:os"` + `SCRATCH_DIR = ${homedir()}/.mneme/scratch`. Consumed ONLY by `scripts/gen-capabilities.ts`.

**Build-time scripts:**
- `scripts/gen-capabilities.ts` — imports BOTH `.shared` (regex/MAX_TURNS) and `.node` (SCRATCH_DIR); emits `src-tauri/capabilities/default.json`. Supports `--dry-run` (stdout) for audit's diff check. Runtime sanity checks: validator length must equal `buildClaudeArgs` length; SCRATCH_DIR must satisfy SCRATCH_DIR_REGEX.
- `scripts/audit-capabilities.sh` — 8 checks; exits 0 on clean SSOT, exits 1 with informative stderr on any drift. Uses `set -uo pipefail` + `{ grep -c ... || true; }` per Phase 0 LEARNINGS.

**Generated capability:**
- `src-tauri/capabilities/default.json` — `identifier: "default"` + `windows: ["main"]` + 4 permissions (`core:default`, `shell:default`, `shell:allow-spawn`, `shell:allow-execute`); each shell scope has `name: "claude-bin"` + `cmd: "claude"` + 13-validator args array. 26 validators total. 0 wildcards. 0 `args:true`.

**Tests:**
- `tests/spawn-args.test.ts` — 19 assertions across 3 describe blocks (buildClaudeArgs SSOT × 14, browser safety grep guards × 2, Node consumer contract × 3).
- `tests/capability-regex.test.ts` — 12 assertions across 2 describe blocks (structural shape × 4, args validators × 8).
- `tests/audit/fixture-clean.json` — verbatim copy of `gen-capabilities.ts --dry-run` output.
- `tests/audit/fixture-args-true.json` — corrupted: spawn entry's `args` replaced with `true`.
- `tests/audit/fixture-wildcard.json` — corrupted: `windows` array contains literal `"*"`.
- `tests/audit/fixture-bare.json` — corrupted: `^--bare$` validator inserted at args[0].
- `tests/audit/test-audit-script.sh` — 5-case Bash harness (clean → pass; 3 corruptions → fail; production → pass). Self-copy guard added so the production-real case doesn't trip `cp: same file`.

**Build wiring:**
- `package.json` `prebuild` → `node --experimental-strip-types scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh` (was: `node scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh`).
- `package.json` devDeps gained `@types/node ^25.6.2`.
- `package-lock.json` regenerated.

## Decisions Made

- **Generator runtime = `node --experimental-strip-types`** (Node 22.14 available on this machine). Avoids adding `tsx` as a devDep. Experimental-warning is benign and goes to stderr. Suppressed in audit's `--dry-run` invocation via `2>/dev/null`. Falls back to `npx tsx scripts/gen-capabilities.ts` if a future executor's Node drops below 22.
- **Capability JSON shape: Option A (all-Var)** per RESEARCH §4.2 — every one of the 13 args is a `{"validator": "..."}` regex object. No mixing of Path-prefix mode for the prompt argument; the prompt is `{"validator": ".+"}`. Minimizes SPEC churn.
- **Audit's Tauri-side cargo build verification handled by `cargo check`** instead of `cargo build` — `cargo check` parses the capability JSON via `tauri_build` macro at the same compile-time stage as `cargo build`, so it covers schema acceptance with substantially less wall time on cold worktrees. Confirmed via `cargo check --manifest-path src-tauri/Cargo.toml` finishing in 54.55s with no errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] @types/node added as devDep**
- **Found during:** Task 1 REFACTOR step (svelte-check)
- **Issue:** `npx svelte-check --tsconfig ./tsconfig.json` errored with `Cannot find module 'node:os' or its corresponding type declarations` (5 errors across `src/lib/spawn-args.node.ts`, `tests/spawn-args.test.ts`). The SvelteKit base tsconfig declares `types: ["node"]` but `@types/node` was missing from devDeps. Plan 01-01's package.json shipped without `@types/node` because the original `spawn-args.ts` (single-file) was authored before the Cycle-2 split required Node imports under TypeScript checking.
- **Fix:** `npm install --save-dev @types/node` (resolved to ^25.6.2).
- **Files modified:** `package.json` (devDeps gained `@types/node ^25.6.2`), `package-lock.json` (npm-resolved tree).
- **Verification:** `npx svelte-check --tsconfig ./tsconfig.json` reports `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`. All 19 spawn-args tests still pass.
- **Committed in:** `6b0e509` (Task 1 third commit).

**2. [Rule 1 — Bug] Initial `.shared.ts` documentation comment matched the audit/Test 14 import-grep regex**
- **Found during:** Task 1 GREEN step (initial Vitest run)
- **Issue:** The first version of `src/lib/spawn-args.shared.ts` had a doc comment containing the literal text `from "os"` — describing why the original single-file pattern was rejected. Test 14 (`expect(sharedSource).not.toMatch(/from\s+["']os["']/)`) failed on this comment line. The audit script's check 7a would have failed on the same line.
- **Fix:** Reworded the doc comment to use prose phrasing (e.g., "Importing the Node builtins (os / fs / path)") instead of literal `from "X"` strings. Substantive code is unchanged.
- **Files modified:** `src/lib/spawn-args.shared.ts` (comment block lines 4-10 only; no semantic change).
- **Verification:** All 19 spawn-args tests pass; audit-capabilities.sh exits 0; `grep -E 'from\s+"(node:)?(os|fs|path)"' src/lib/spawn-args.shared.ts` returns no matches.
- **Committed in:** Folded into `1115289` (Task 1 GREEN commit) — caught and fixed before staging.

**3. [Rule 1 — Bug] Test harness self-copy when fixture path == REAL_JSON path**
- **Found during:** Task 4 RED step (initial harness dry-run)
- **Issue:** The harness's last case (`run_case "real default.json (production)" "$REAL_JSON" 0`) attempts `cp -f "$REAL_JSON" "$REAL_JSON"`, which BSD `cp` rejects with `cp: src and dst are identical (not copied)`. Cosmetic but generates noise in the harness output and would confuse future readers.
- **Fix:** Added an absolute-path comparison guard inside `run_case` that skips the `cp` step when fixture == target. The audit still runs against the production JSON (already in place from the previous trap restoration).
- **Files modified:** `tests/audit/test-audit-script.sh` (run_case body).
- **Verification:** Harness now reports `[PASS] real default.json (production) (exit 0)` cleanly with no `cp` warning.
- **Committed in:** Folded into `a0d8737` (Task 4 RED commit) — caught before staging.

---

**Total deviations:** 3 auto-fixed (1 Rule 3 blocking — @types/node; 2 Rule 1 bugs — doc-comment regex match + harness self-copy).
**Impact on plan:** All three are self-contained fixes that didn't change scope. The @types/node addition is mandatory for Cycle-2 HIGH-1 split (the .node module imports `node:os`). The two Rule 1 bugs are minor authoring slips in the plan's verbatim test/script content; both were caught immediately and rolled into the same commit as the original artifact (no separate fix-up commits). Plans 01-03 / 01-04 / 01-06 unaffected.

## TDD Gate Compliance

Plan-level TDD discipline verified by commit-history shape:

| Surface | RED commit | GREEN commit | Compliance |
|---------|------------|--------------|------------|
| `buildClaudeArgs` SSOT (Task 1) | `90b54fa` (test) | `1115289` (feat) | ✅ test → feat |
| Capability regex (Task 3) | n/a — Task 2 already produced JSON | `37b351b` (test) | ✅ single test commit; immediately green per plan |
| Audit script (Task 4) | `a0d8737` (test fixtures + harness) | `6799d47` (feat audit script) | ✅ test → feat |

Both Task 1 and Task 4 RED commits were verified to fail (Task 1: `Failed to resolve import "../src/lib/spawn-args.shared"`; Task 4: `[FAIL] ... (exit 127)`). GREEN commits made the failing tests pass with no skip / xfail. No TDD-gate violations.

## Threat Model Coverage

| Threat | Owner | Mitigation evidence |
|--------|-------|---------------------|
| **T-1-03** (capability wildcards / `args:true`) | This plan | Generator emits exact-regex validators only (0 `args:true`, 0 `*`); audit checks 2 + 3 grep for both; fixture-args-true.json + fixture-wildcard.json prove the audit catches them. |
| **T-1-04 (reframed under A-04)** (cost runaway → loop guard only) | This plan | `--max-turns 30` positionally locked at indices 7-8 of buildClaudeArgs; Test 5 asserts `args[idx+1] === "30"` AND `MAX_TURNS === "30"`; audit check 5 greps `MAX_TURNS\s*=\s*"30"` in `.shared.ts`. No `~/.mneme/usage.jsonl` write path; no $-cap state machine. |
| **T-1-05** (vault scope leak via --add-dir) | This plan | SCRATCH_DIR_REGEX anchored both sides (`^...$`); spawn-args Test 12 + capability-regex Test 7 reject `/etc/hosts`, `/Users/qinyuan/.ssh/id_rsa`, parent-traversal `/Users/qinyuan/.mneme/scratch/../etc`, and bare `/`; spawn-args Test 13 proves `buildClaudeArgs` itself throws on garbage scratchDir (defense at the producer layer). |
| **T-1-07** (--bare bypass) | This plan | Test 8 asserts no element contains substring "bare"; capability-regex Test 8 asserts no validator regex contains "bare"; audit check 4 greps `"validator":\s*"[^"]*bare[^"]*"`; fixture-bare.json proves catch. |
| **T-1-44 (NEW Cycle-2 HIGH-1)** (Node↔Browser bundling conflict) | This plan + 01-06 | `.shared.ts` ZERO Node imports verified by Tests 14-15 (readFileSync + grep) AND audit check 7a; `.node.ts` browser-import leak verified by audit check 7b (greps `src/` for `from "$lib/spawn-args.node"` patterns); pre-split `spawn-args.ts` absence verified by audit check 8. ChatPanel.svelte (plan 01-06) will resolve scratchDir via `homeDir()` from `@tauri-apps/api/path`. |
| **T-1-12** (gen-capabilities length desync) | This plan | Generator's runtime length-check: `if sample.length !== ARG_VALIDATORS.length` → process.exit(1) with FATAL log. Capability-regex Test 4 asserts `validators.length === 13 === buildClaudeArgs(any).length`. |
| **T-1-13** (audit silent failure under pipefail) | This plan | `set -uo pipefail` (NOT -e) per Phase 0 LEARNINGS; explicit `{ grep -c ... || true; }` preserves no-match-as-zero; harness's 5-case sweep validates each corruption produces the expected non-zero exit (exit 1) and clean inputs produce exit 0. |

## Issues Encountered

- **SvelteKit baseUrl/paths warning**: Vite emits an info-level warning that `tsconfig.json` declares `paths` instead of `kit.alias`. Plan 01-01 explicitly accepted this trade-off (RESEARCH §4.8 / D-14 design — Vitest needs the path aliases too, and SvelteKit's auto-generated tsconfig is overridden by the extending file). The warning is benign and does not block builds or tests; this plan does not change the trade-off.
- **`src-tauri/target/` cold-build cost**: First `cargo check` on the per-agent worktree took ~55s (210+ Rust crate compiles). Subsequent prebuild invocations would skip the recompile if `target/` is preserved. Tauri 2's `tauri_build` macro parses `capabilities/default.json` at this stage, so a successful `cargo check` IS the schema-acceptance proof for the generated JSON.
- **node_modules not pre-warmed**: This per-agent worktree did not inherit the parent repo's `node_modules` (parent repo had none either). `npm install` was run in the background during context-loading; cost ~30s. Subsequent worktree agents (01-03, 01-04) will face the same cold-start cost.

## User Setup Required

None — no external service configuration. The npm prefix is at `~/.npm-global` (per r1ckyIn solo-dev铁律), Node 22.14 is available, Rust 1.88 is installed via `rust-toolchain.toml`, Tauri 2 transitive deps already resolved on this machine.

## Next Phase Readiness

- **Plan 01-03 (sanitize + dispatch)** can begin in parallel — independent of this plan's outputs (plan 01-03 owns `src/lib/sanitize.ts` + `src/lib/stream-dispatch.ts`; no spawn-args coupling).
- **Plan 01-04 (Rust subprocess state machine)** can begin in parallel — its `spawn` call goes through Tauri's `claude-bin` allowlist defined here; it does not modify the capability JSON.
- **Plan 01-06 (ChatPanel.svelte E2E)** consumer contract is locked by this plan: `import { buildClaudeArgs } from "$lib/spawn-args.shared"` (NEVER `$lib/spawn-args.node`); resolve `scratchDir` at mount via `import { homeDir } from "@tauri-apps/api/path"`; pass `await homeDir() + ".mneme/scratch"` as the second argument. Audit check 7b will block any browser-context import of `.node`.
- **Plan 01-07 (Husky + lifecycle harness)** will wire `bash scripts/audit-capabilities.sh` into the Husky pre-commit hook (audit script is already executable + production-validated here).
- **Phase 2 plan-phase note (deferred reminder)**: when REQ-14 settings introduce a user-configured vault path, `SCRATCH_DIR_REGEX` MUST be re-tightened to anchor on the new vault root or scratch becomes a wildcard subset of any user-typed path. RESEARCH §8 Risk 3 captures this; carry forward to Phase 2 plan-phase.

## Self-Check: PASSED

Mechanical existence verification of all artifacts and commits:

```
src/lib/spawn-args.shared.ts: FOUND (buildClaudeArgs + MAX_TURNS + SCRATCH_DIR_REGEX, 0 Node imports)
src/lib/spawn-args.node.ts: FOUND (homedir import + SCRATCH_DIR export)
scripts/gen-capabilities.ts: FOUND (imports both .shared and .node; supports --dry-run)
scripts/audit-capabilities.sh: FOUND, executable; 8 checks encoded
src-tauri/capabilities/default.json: FOUND (26 validators, 0 wildcards, 0 args:true)
tests/spawn-args.test.ts: FOUND (19 assertions across 3 describe blocks)
tests/capability-regex.test.ts: FOUND (12 assertions across 2 describe blocks)
tests/audit/fixture-clean.json: FOUND
tests/audit/fixture-args-true.json: FOUND
tests/audit/fixture-wildcard.json: FOUND
tests/audit/fixture-bare.json: FOUND
tests/audit/test-audit-script.sh: FOUND, executable; 5-case sweep
package.json prebuild: WIRED (gen --experimental-strip-types && audit)
package.json @types/node devDep: PRESENT (^25.6.2)

Vitest: 33 passed (sentinel 2 + spawn-args 19 + capability-regex 12)
Audit harness: 5/5 PASS
Direct audit on production default.json: PASS

Commits (8 total):
90b54fa: FOUND (Task 1 RED — failing tests)
1115289: FOUND (Task 1 GREEN — implementation)
6b0e509: FOUND (Task 1 REFACTOR — @types/node)
de1ed70: FOUND (Task 2 — generator + JSON)
37b351b: FOUND (Task 3 — capability-regex tests, immediately green)
a0d8737: FOUND (Task 4 RED — fixtures + harness)
6799d47: FOUND (Task 4 GREEN — audit script)
d4f2215: FOUND (Task 5 — prebuild wire)
```

All artifacts exist; all commits resolvable on the worktree branch. `cargo check` validated Tauri 2 schema acceptance.

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Plan: 02 (Wave 2 SSOT + Audit)*
*Completed: 2026-05-09*
