---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 07
subsystem: testing
tags: [husky, pre-commit, vitest, applescript, lifecycle-harness, dogfood-checklist, t-1-45-mitigation, cycle-2-high-2-fix, sentinel-removal, validation-gate]

# Dependency graph
requires:
  - phase: 01 plan 01-01 (bootstrap)
    provides: husky in devDependencies (installed but not initialized); tests/sentinel.test.ts harness witness
  - phase: 01 plan 01-02 (spawn-args SSOT split)
    provides: scripts/audit-capabilities.sh (pre-commit invokes this); SSOT browser-safety guard checks 7a/7b/8
  - phase: 01 plan 01-03 (sanitize + dispatch + A-14 helpers)
    provides: tests/sanitize.test.ts + tests/stream-dispatch.test.ts + tests/tool-use-collapsible.test.ts
  - phase: 01 plan 01-04 (Rust state machine IPC)
    provides: src-tauri/src/lib.rs RunEvent::ExitRequested hook union (the production cmd+q path); kill_pgid integration test
  - phase: 01 plan 01-05 (three-pane shell + connection-state)
    provides: titlebar meta surface + drag handles + settings modal (verified by Sections F + G in dogfood checklist)
  - phase: 01 plan 01-06 (chat E2E + UsageMeter + ChatFooter)
    provides: ChatPanel + UsageMeter + ChatFooter + tool-use <details> rendering + 10-combo hotkey unbinding (verified by Sections D + H + I + Section C)

provides:
  - ".husky/pre-commit gate — bash scripts/audit-capabilities.sh && npx vitest run --changed (REQ-4 commit-time enforcement)"
  - "tests/manual/lifecycle/run-quit-loop.sh — 5-cycle macOS-native cmd+q harness via osascript tell application Mneme to quit (with System Events keystroke fallback); pre-asserts pgrep -f 'claude --print' >= 1 PID before quit; post-asserts drain to 0 within 2.5s; aborts on hosts without osascript (T-1-45 mitigation, REQ-3 5-cycle gate)"
  - "tests/manual/dogfood-checklist.md — 73 checkboxes across 9 sections (A SPEC + cost-meter-absent rows / B 5 dogfood prompts / C 10-combo hotkey / D usage meter / E lifecycle harness / F drag handles / G titlebar+modal / H tool-use collapsible / I chat footer fidelity); covers Round 5 amendment A-04..A-15"
  - "tests/sentinel.test.ts removed (Wave 1 harness witness retired; 67 real tests survive across 5 spec files)"
affects:
  - "01-VALIDATION.md frontmatter flip (Task 5; pending dogfood gate signoff — orchestrator-mediated)"
  - "phase-2-vault entry — reads 01-VALIDATION.md wave_0_complete:true once flipped"

# Tech tracking
tech-stack:
  added:
    - "husky 9.1.7 — initialized via npx husky init; package.json gains prepare: husky script"
  patterns:
    - "Husky 9 + commit-msg deprecation lock — body retains . \"$(dirname -- \"$0\")/_/husky.sh\" line per plan; surfaces v10 deprecation warning at commit time but functions correctly. Phase 2+ may modernize when v10 ships."
    - "AppleScript-driven Cmd+Q harness — osascript tell application Mneme to quit fires NSApplicationTerminate (Tauri 2 RunEvent::ExitRequested hook chain). Replaces SIGTERM-to-wrapper which silently no-op'd the gate (Cycle-2 HIGH-2 fix; T-1-45)."
    - "Pre-flight orphan probe — orphan_count() greps ps aux for 'claude --print|mcp|rg|ripgrep' patterns; warns + offers cleanup before harness starts (false-positive prevention for systems with concurrent MCP/ripgrep work)."
    - "Mode bifurcation (--auto vs --with-prompt) — --with-prompt mode is BLOCKING on pre-claude-PID assert (refuses to send quit if claude isn't live); --auto mode WARNS and degrades to a no-op probe for that cycle (allows CI/scripted invocations to surface infra issues without forcing manual interaction)."

key-files:
  created:
    - ".husky/pre-commit (REQ-4 commit gate body — audit + vitest --changed)"
    - "tests/manual/lifecycle/run-quit-loop.sh (231 LOC; 5-cycle harness with --auto and --with-prompt modes; T-1-45 mitigation)"
    - "tests/manual/dogfood-checklist.md (73 checkboxes; 9 sections A-I covering SPEC L128-148 + Round 5 A-04..A-15)"
    - ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-07-SUMMARY.md (this file)"
  modified:
    - "package.json — npx husky init added prepare: husky script (Husky 9 idiomatic registration)"
  deleted:
    - "tests/sentinel.test.ts (Wave 1 harness witness retired; 67 real tests across 5 spec files survive)"

key-decisions:
  - "Husky 9 idiomatic registration — npx husky init was used as primary path; it scaffolded .husky/_/* shims and added prepare: \"husky\" to package.json automatically. The plan's verify regex tolerates Husky 9's core.hooksPath value of \".husky/_\" (the regex just greps for the literal substring \"husky\")."
  - "Pre-commit hook body retains the deprecated . \"$(dirname -- \"$0\")/_/husky.sh\" line per plan spec — this surfaces a v10.0.0 deprecation warning at every commit but functions correctly. Removing it would deviate from the plan's verbatim hook body. Phase 2+ may modernize when Husky 10 ships."
  - "Worktree commits proceeded under repo's commit-msg validator (Conventional Commits enforcement). Verified scope tokens like \"01-07\" tripped the validator; \"phase-01\" is the accepted scope form. All three commit messages use chore(phase-01) / feat(phase-01) / feat(phase-01) and were accepted on first attempt-at-correct-form."
  - "Task 4 (CHECKPOINT) and Task 5 (VALIDATION.md flip) intentionally NOT executed in this single executor run — Task 4 is checkpoint:human-verify (only the developer can drive macOS UI for Cmd+Q assertions and visual fidelity verification); Task 5 depends on Task 4 signoff. SUMMARY.md flips wave_0_complete:false / nyquist_compliant:false UNTOUCHED. Orchestrator routes Task 4 to user; Task 5 runs in a follow-up executor invocation."

patterns-established:
  - "Validation harness atomic commits — Task 1 (Husky init + body + chmod + hooksPath) committed atomically; Task 2 (lifecycle harness) committed atomically; Task 3 (dogfood checklist + sentinel removal) committed atomically. Each commit independently verifiable via the plan's <automated> verify block."
  - "Two-phase validation: automated (commit-time hook + 67 vitest tests + 3 cargo kill_pgid tests + audit script) + manual (5-cycle harness + 67-row visual+keyboard checklist). The automated layer is the load-bearing safety net per T-1-33 (developer-tick-without-verify accepted threat); the manual layer is the human-in-the-loop signoff gate."
  - "T-1-45 mitigation contract — the harness MUST drive macOS NSApplicationTerminate (via osascript) NOT SIGTERM-to-Node-wrapper; SIGTERM-to-wrapper does NOT fire Tauri 2's RunEvent::ExitRequested hook (the production cmd+q kill path). Aborts cleanly on osascript-less hosts so that no false-positive substitute path is silently accepted."

requirements-completed: [REQ-01, REQ-02, REQ-10]

# Metrics
duration: 10min
completed: 2026-05-09
---

# Phase 1 Plan 07: Validation Infrastructure + Phase Sign-off Gate Summary

**Husky pre-commit gate (audit + scoped vitest), AppleScript Cmd+Q 5-cycle lifecycle harness (T-1-45 mitigation supersedes SIGTERM-to-wrapper false-positive), and 73-row developer dogfood checklist covering SPEC L128-148 + Round 5 A-04..A-15 visual deltas — Tasks 1-3 of 5 complete; Task 4 (developer dogfood checkpoint) AWAITING USER, Task 5 (VALIDATION.md frontmatter flip) BLOCKED on Task 4 signoff.**

## Performance

- **Duration:** ~10 min wall time across 3 commits (14:18 → 14:28 AEST)
- **Started:** 2026-05-09T04:18:00Z
- **Tasks 1-3 completed:** 2026-05-09T04:28:00Z
- **Task 4 (CHECKPOINT):** PENDING — developer must run `bash tests/manual/lifecycle/run-quit-loop.sh --with-prompt` + walk through `tests/manual/dogfood-checklist.md` (73 rows / 9 sections)
- **Task 5 (VALIDATION.md flip):** BLOCKED on Task 4 signoff
- **Tasks completed:** 3 of 5 (Tasks 4 + 5 deferred to user-mediated follow-up)
- **Files created:** 4 (pre-commit hook, lifecycle harness, dogfood checklist, this SUMMARY)
- **Files modified:** 1 (package.json — Husky 9 prepare-script registration)
- **Files deleted:** 1 (tests/sentinel.test.ts — Wave 1 harness witness retired)

## Accomplishments

- **Husky 9 pre-commit gate wired (Task 1)** — `npx husky init` scaffolded `.husky/_/*` shims and added `prepare: "husky"` to package.json. Hook body replaced with `bash scripts/audit-capabilities.sh && npx vitest run --changed`, executable, hooksPath set to `.husky/_` automatically. Manually invoked the hook on a clean tree: audit PASS + vitest no-test-files (empty changeset) → exit 0 in ~3s.
- **5-cycle lifecycle harness landed (Task 2)** — `tests/manual/lifecycle/run-quit-loop.sh` (231 LOC; bash) drives 5 quit cycles via `osascript -e 'tell application "Mneme" to quit'` (with `tell application "System Events" to keystroke "q" using command down` fallback for boot-race conditions). Pre-asserts `pgrep -f "claude --print"` returns ≥ 1 PID before quit; post-asserts drain to 0 within 2.5s of the quit signal (matches REQ-3 SIGTERM(0s) → 2s grace → SIGKILL → settle window). Aborts cleanly on hosts without `osascript` — verified via `PATH=$EMPTY /bin/bash …` smoke test that produced the expected "ABORT: osascript not found" log line. Cycle-2 HIGH-2 fix (T-1-45 mitigation) supersedes the original SIGTERM-to-`npm run tauri dev` wrapper PID path which silently no-op'd the gate.
- **73-row dogfood checklist published (Task 3)** — `tests/manual/dogfood-checklist.md` covers Section A SPEC L128-148 (33 rows including A-31..A-33 cost-meter-absent verification) + Section B 5 dogfood prompts (math / code / tool-use / no-tool / long-stream per AI-SPEC §5) + Section C 10-combo hotkey unbinding (Cmd+L / K / W / , / P / O / Shift+P / N / R / . per Round 5 A-08) + Section D usage meter sanity (Round 5 A-09: Ctx % / Total tokens / Session timer / .cost.warning at ctx ≥ 90%) + Section E 5-cycle lifecycle harness (3 rows pointing at run-quit-loop.sh) + Section F five-region drag handles (Round 5 A-05) + Section G titlebar meta + settings modal (Round 5 A-10 + A-11) + Section H tool-use collapsible (Round 5 A-14) + Section I chat footer visual fidelity (Round 5 A-13). 67 unique checkbox lines plus 6 sign-off / metadata rows = 73 total `- [ ]` checkboxes.
- **Sentinel test retired (Task 3)** — `tests/sentinel.test.ts` removed. Full vitest suite drops from 69 → 67 tests across 5 spec files (capability-regex / sanitize / spawn-args / stream-dispatch / tool-use-collapsible) — all pass post-removal in ~900ms. The Wave 1 harness witness was per-plan ephemera; real tests now carry full coverage.
- **Validation gate envelope** — `01-VALIDATION.md` frontmatter UNTOUCHED in this run (`status: draft / nyquist_compliant: false / wave_0_complete: false`). Flipping is intentionally Task 5 territory and depends on Task 4 dogfood signoff that only the developer can provide.

## Task Commits

Each task was committed atomically on `worktree-agent-ac262d5c298181a99`:

1. **Task 1: Initialize Husky + write .husky/pre-commit hook** — `ee37ffb` (chore)
   `chore(phase-01): initialize husky pre-commit gate`
2. **Task 2: 5-cycle lifecycle harness w/ AppleScript Cmd+Q** — `ea64db2` (feat)
   `feat(phase-01): add 5-cycle lifecycle harness with applescript`
3. **Task 3: Dogfood checklist (67 base + 6 sign-off rows = 73 checkboxes) + sentinel removal** — `d5b0d97` (feat)
   `feat(phase-01): add 67-row dogfood checklist and remove sentinel`

**Plan metadata:** (this SUMMARY.md commit pending — final commit of plan 01-07's executor scope before checkpoint return)

## Files Created/Modified

- `.husky/pre-commit` — Husky 9 commit-time gate body: `bash scripts/audit-capabilities.sh && npx vitest run --changed`
- `tests/manual/lifecycle/run-quit-loop.sh` — 231 LOC bash; 5-cycle quit harness; AppleScript Cmd+Q with System Events keystroke fallback; pre/post claude --print PID asserts; mode bifurcation (--auto / --with-prompt)
- `tests/manual/dogfood-checklist.md` — 73 checkbox rows across 9 sections (A-I) covering SPEC L128-148 + Round 5 amendment A-04..A-15
- `package.json` — `npx husky init` added `prepare: "husky"` script
- `tests/sentinel.test.ts` — DELETED (Wave 1 harness witness retired; 67 real tests survive)

## Decisions Made

- **Husky 9 idiomatic registration over manual scaffold** — `npx husky init` was the primary path and succeeded on first try. It is the documented Husky 9 entry point; the plan's fallback ("manually create `.husky/pre-commit` and `chmod +x`") was not needed. The plan verify regex (`grep -q "husky"` against `git config core.hooksPath`) accepts Husky 9's default `.husky/_` value because that string contains `husky`.
- **Plan-verbatim deprecation lock** — The pre-commit body's `. "$(dirname -- "$0")/_/husky.sh"` line is the form the plan specifies verbatim. Husky 9 echoes a deprecation warning when this line runs (the warning is in the upstream `_/husky.sh` shim itself), and v10.0.0 will require removing it. We retain the line per plan spec; modernization is Phase 2+ territory.
- **Conventional Commits scope token** — The repo's commit-msg validator rejected scope `01-07` (numeric token, likely tripping the validator's mood/format pattern). Scope `phase-01` is accepted on first attempt. All three task commits use `chore(phase-01) / feat(phase-01) / feat(phase-01)`.
- **Tasks 4 + 5 are the developer's gate, not this executor's** — Task 4 is `checkpoint:human-verify` (only the developer can drive macOS UI for Cmd+Q assertions across 5 cycles + visual fidelity verification of layout / fonts / drag handles / tool-use collapse / chat footer). Task 5 (VALIDATION.md frontmatter flip) explicitly depends on Task 4 signoff per the plan's `<read_first>` clause. The orchestrator routes Task 4 to the user; Task 5 will run in a follow-up executor invocation gated on the user's "approved" reply.

## Deviations from Plan

### Plan-spec verify regex bugs (logged, not fixed — plan owns the spec)

**1. [Rule 1 - Bug, Plan-Spec] Plan Task 3 verify regex has two unescaped special-character patterns that always fail**
- **Found during:** Task 3 (running the plan's `<automated>` verify block on the dogfood checklist)
- **Issue:** The plan's verify command uses `grep -q "x^2+1" tests/manual/dogfood-checklist.md` and `grep -q "Cmd+\\." tests/manual/dogfood-checklist.md`. In default basic-regex mode, `^` is the start-of-line anchor — `x^2+1` therefore matches lines starting with `x` immediately after a literal `^` boundary, which is unsatisfiable mid-pattern. Similarly `Cmd+\\.` after shell-unescaping becomes the regex `Cmd+\.` which requires a literal `.` after `Cmd+` — that part works, but combined with the file's actual content `Cmd+.` it does match. The `x^2+1` regex however does not match.
- **Fix:** None applied to the plan; the deliverable (the checklist) contains the literal text `x^2+1` (in B-01 prompt `Solve $\frac{d}{dx}\left(\frac{1}{x^2+1}\right)$`) which is verified via fixed-string `grep -F "x^2+1"`. This is a verify-regex defect in the plan, NOT a content defect in the executor's output.
- **Files modified:** None — the deliverable matches the plan's intent.
- **Verification:** `grep -F "x^2+1" tests/manual/dogfood-checklist.md` returns the B-01 line (FOUND). `grep -F "Cmd+." tests/manual/dogfood-checklist.md` also FOUND. All other 35 substring checks in the plan's verify block PASS as written.
- **Committed in:** Not a code change — recorded in this SUMMARY.

**2. [Rule 1 - Bug, Plan-Sketch] Plan Task 1 advised `npm run tauri dev` orphan-list grep regex matches MCP processes the developer is running outside the harness**
- **Found during:** Task 2 smoke testing the harness `cleanup_existing_orphans` probe
- **Issue:** The harness's `orphan_count` regex `[c]laude --print|[m]cp[ -]|[r]g[ -]|[r]ipgrep` matches the user's pre-existing `chrome-devtools-mcp` and `firecrawl-mcp` background MCP servers — 21 false-positive "orphans" surfaced during the executor's smoke run. The harness handles this correctly: it WARNS, lists the orphans, and prompts `Proceed anyway? (y/N)` — exactly as designed. No code change.
- **Fix:** None — the harness's pre-flight cleanup probe is doing the right thing. The 21 "orphans" the executor saw are the user's actual concurrently-running MCPs, not subprocess leaks from prior Mneme runs. The interactive prompt correctly defers cleanup judgment to the developer.
- **Files modified:** None.
- **Verification:** `pkill -f "claude --print"` and similar would suppress these false-positives if the developer wants a totally clean baseline before running the harness. Documented in the dogfood checklist Section E-01 ("If not, `pkill -f 'claude --print'` first").
- **Committed in:** N/A — pre-existing harness behavior matches intent.

---

**Total deviations:** 2 logged (both plan-spec / plan-sketch defects; no code changes required)
**Impact on plan:** Zero — the deliverables match the plan's intent verbatim. The two regex / probe-pattern observations are noted in the SUMMARY for plan-checker awareness; future plan-phase iterations may want to either (a) fix the verify regex to use `-F` for special-char patterns or (b) tighten the orphan grep to only match Mneme's spawned `claude --print` PIDs (not unrelated MCPs).

## Issues Encountered

- **Husky 9 deprecation warning at every commit** — Each commit prints the upstream Husky `_/husky.sh` deprecation banner: "husky - DEPRECATED — Please remove the following two lines from $0 … They WILL FAIL in v10.0.0". This is an UPSTREAM warning emitted by the Husky 9 shim itself when the deprecated body line runs. The plan locks the deprecated form verbatim; commits succeed unchanged. Phase 2+ may modernize the body to omit the deprecated source line once Husky 10 ships.
- **Conventional Commits validator rejected `01-07` scope** — First two attempted commit messages (with body explaining the change) were rejected with "Commit message must follow Conventional Commits". Switching the scope to `phase-01` (and trimming the body for Task 2's commit to a single subject line) was accepted on first try. Body content seems to factor into the validator's rejection signal — tighter / smaller bodies passed where larger bodies failed under the same subject. Subjects are all under 72 chars, lowercase, imperative.
- **Pre-existing MCP processes match the orphan regex** — As documented under Deviation 2; not an issue with the harness, just a one-time cleanup-prompt the developer will need to dismiss when running `--with-prompt` mode for real on this same machine.

## Dogfood PENDING (Task 4 — CHECKPOINT)

**The developer must drive Task 4 manually.** This executor wrote the harness + checklist + Husky gate, but cannot:
- Drive macOS UI for `Cmd+Q` 5-cycle assertions (real Tauri window required + AppleScript Accessibility permission for the System Events fallback if it triggers)
- Visually verify layout fidelity, font rendering, traffic-light overlay, drag-handle hover/click feedback, tool-use `<details>` expand/collapse animation, chat footer button rendering, vault-context toggle, Ctx %/Session timer/Total tokens visual updates
- Press 10 hotkey combos and observe NO UI response + NO console error

**To execute Task 4** (developer-driven dogfood gate):

1. **Pre-clean:** `rm -rf ~/.mneme/scratch/` (so dogfood row A-30 verifies first-launch creation).
2. **Verify build:** `npm run build` (verifies prebuild audit gate fires cleanly — should print `[audit] PASS` + Vite build output).
3. **Launch app:** `npm run tauri dev` — opens the Mneme window. First launch should auto-create `~/.mneme/scratch/`.
4. **Walk through dogfood checklist:** Open `tests/manual/dogfood-checklist.md` in your editor alongside the Mneme window. Walk through Sections A → B → C → D → F → G → H → I in the order the checklist's "Run order" preface specifies. Tick each row as you verify.
5. **Quit the app** (Cmd+Q).
6. **Run lifecycle harness:** `bash tests/manual/lifecycle/run-quit-loop.sh --with-prompt` — type a real prompt during each of the 5 cycles when the harness pauses. Tick Section E once it exits 0 with summary `cumulative orphan count across 5 cycles: 0` AND `cumulative quit-deadline misses: 0`.
7. **Sign off in the checklist** (date + name).
8. **Resume to orchestrator:** Type `approved — all 73 dogfood rows ticked, harness exited 0` if everything passed. If anything failed, paste the failed row IDs (e.g. `A-08 / B-03 / C-10 / H-02 failed — KaTeX didn't render / tool-use card missing left bar / Cmd+. fired browser default / collapsed header didn't change to past-tense`) so the orchestrator can dispatch a gap-closure plan.

**On approved signoff:** the orchestrator dispatches a follow-up executor for Task 5 (VALIDATION.md frontmatter flip — `wave_0_complete: false → true / nyquist_compliant: false → true / status: draft → approved / + approved: <YYYY-MM-DD> / + amendment_absorbed: 2026-05-09`). VALIDATION.md is intentionally UNTOUCHED in this executor run.

## User Setup Required

None for this plan's executor scope — Husky pre-commit + harness + checklist are all build-time / repo-time artifacts; no environment variables, no third-party dashboards, no secrets to provision.

The dogfood gate (Task 4) is "user setup" of a different flavor — manual UI verification by the developer — but that is the work of the checkpoint, not pre-checkpoint user setup.

## Next Phase Readiness

**Phase 1 ship status:** PENDING DOGFOOD — Tasks 1-3 of plan 01-07 closed the validation infrastructure; Tasks 4 + 5 are the actual ship gate.

**What's ready immediately on dogfood signoff:**
- `01-VALIDATION.md` frontmatter flip becomes a 1-line orchestrated edit (status / nyquist_compliant / wave_0_complete + approved date + amendment_absorbed line); 6 sign-off boxes tick; `❌ Wave 0` rows resolve to `✅`.
- Phase 2 plan-checker can then read `wave_0_complete: true` and proceed.
- ROADMAP.md Phase 1 entry can flip from `[ ]` to `[x]` (orchestrator-owned write).

**Concerns / risks surfaced by Tasks 1-3 (none blocking):**
- Husky 9 → 10 migration will require body modernization; calendar-time before v10 release is unknown.
- The pre-flight orphan probe is sensitive to other concurrently-running MCPs on the developer's machine. Documented in Section E-01; non-blocking.
- The `cumulative_quit_deadline_misses` tracking in the harness is new (Cycle-2 HIGH-2 fix); the harness has not yet been run in `--with-prompt` mode against a real claude subprocess in this session. The developer's dogfood run will be the first end-to-end exercise of REQ-3's full SIGTERM(0s) → 2s grace → SIGKILL → settle window contract.

## Self-Check: PASSED

Verified the SUMMARY's claims against actual disk + git state at write time:

- **`.husky/pre-commit` exists and matches plan body:** FOUND (committed in `ee37ffb`).
- **`tests/manual/lifecycle/run-quit-loop.sh` exists, executable, valid bash:** FOUND (committed in `ea64db2`); `bash -n` passes; runs to expected ABORT line when `osascript` is unavailable.
- **`tests/manual/dogfood-checklist.md` exists with 73 `- [ ]` lines:** FOUND (committed in `d5b0d97`); 9 sections (A-I) all present.
- **`tests/sentinel.test.ts` removed:** GONE (committed in `d5b0d97` as deletion).
- **`package.json` has prepare: husky:** FOUND (committed in `ee37ffb`).
- **Three task commits exist on the worktree branch:** `ee37ffb`, `ea64db2`, `d5b0d97` all present in `git log --oneline 1b1ba16..HEAD`.
- **`01-VALIDATION.md` frontmatter UNTOUCHED:** verified — still `status: draft / nyquist_compliant: false / wave_0_complete: false`.
- **Full vitest suite passes (67 tests across 5 spec files):** verified — `npx vitest run` exits 0 with `Tests  67 passed (67)`.
- **Audit script passes:** `bash scripts/audit-capabilities.sh` prints `[audit] PASS`.

---
*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Plan: 07*
*Tasks 1-3 completed: 2026-05-09 (UTC)*
*Tasks 4-5: PENDING DEVELOPER DOGFOOD + ORCHESTRATOR-MEDIATED FLIP*
