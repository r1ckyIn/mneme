---
phase: 01-tauri-shell-foundation-subprocess-hardening
fixed_at: 2026-05-14T04:14:26Z
review_path: .planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-05-14T04:14:26Z
**Source review:** `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: **15** (3 BLOCKER + 12 WARNING; 7 INFO out-of-scope under `critical_warning` policy)
- Fixed: **15**
- Skipped: **0**
- WR-02 and WR-03 share one atomic commit (single file, coordinated fix) — 14 fix commits total.

**Verification baseline at end of run (worktree `/tmp/sv-01-reviewfix-XoIIao`):**
- `npx svelte-check`: 340 files / 0 errors / 0 warnings.
- `npx vitest run`: 139 / 139 tests pass across 11 test files (added 1 new test for WR-04).
- `cargo test --test kill_pgid`: 3 / 3 integration tests pass.
- `bash scripts/audit-capabilities.sh`: PASS (8 checks).
- `bash tests/audit/test-audit-script.sh`: 5 / 5 audit-fixture cases pass.

## Plan-file invalidation note for orchestrator

**Plan 01-11 (`CSP connect-src ipc: gap`) is now obsolete.** BL-02 closes the
exact gap that plan was tracking separately — CSP `connect-src` now includes
`ipc:` and `http://ipc.localhost`. The orchestrator can archive plan 01-11 or
mark it as `superseded-by: BL-02-fix` rather than scheduling its execution.

## Fixed Issues

### BL-01: `kill_pgid` blocks the Tauri event-loop thread for 2 seconds on Cmd+Q

**Files modified:** `src-tauri/src/lib.rs`
**Commit:** `0a96c19`
**Applied fix:** Detached the SIGTERM → 2 s sleep → SIGKILL sequence onto a
fire-and-forget `std::thread::spawn` worker. `kill_pgid()` now returns
immediately after delivering SIGTERM; the kernel still receives SIGKILL on the
same 2 s timer. Integration tests still pass — they already waited 2.5 s after
the call returned, which exactly matches the new asynchronous timing.

### BL-02: CSP `connect-src` missing `ipc:` directive

**Files modified:** `svelte.config.js`
**Commit:** `c80054d`
**Applied fix:** Extended `connect-src` to `['self', 'ipc:', 'http://ipc.localhost', 'ws:', 'http://localhost:*']`.
This unblocks every `@tauri-apps/api/core` `invoke()` call once the production
SHA-256-pinned CSP takes over. Documented inline that plan 01-11 is now obsolete.

### BL-03: `renderKatexInDom` walker double-matches `$$...$$` vs `$...$` boundaries

**Files modified:** `src/lib/components/AssistantMessage.svelte`
**Commit:** `8f052f6`
**Applied fix:** Skip the KaTeX walk while `streaming` is true. The walker
already runs after streaming completes (when ChatPanel finalizes the
assistant HTML via `scheduleHtmlRecompute()`), so finalized math is rendered
exactly once on a stable, complete buffer. The on-screen `.stream-dot`
already communicates "still arriving" so users read unrendered `$$...$$` as
"writing in progress", not as a bug. Matches Claude Desktop UX and aligns
with the existing `tests/sanitize.test.ts` pinning (which covers the pure
`renderKatex` function, not the DOM walker — no test broke).
**Status note:** Per spec semantic-correctness limitation for logic
changes: this is a behavioral choice (deferred render) rather than a
fundamental bug-fix to the walker; a future iteration could replace the
regex walker with a stateful tokenizer if streaming math becomes a
visible UX requirement again.

### WR-01: `SessionRegistry::lock().unwrap()` will panic on a poisoned Mutex

**Files modified:** `src-tauri/src/session.rs`
**Commit:** `7351b9a`
**Applied fix:** Replaced four `.lock().unwrap()` sites with a single
`locked()` helper that calls `.lock().unwrap_or_else(|p| {eprintln!(…);
p.into_inner()})`. On a poisoned mutex the registry now recovers the inner
state and logs the recovery to stderr instead of propagating a panic into
`WindowEvent::CloseRequested`. Tauri-side log strategy matches the project
convention (no `log` / `tracing` crate; `eprintln!` to stderr).

### WR-02 + WR-03: `as any` casts in stream-dispatch + module-scope `msgCounter`

**Files modified:** `src/lib/stream-dispatch.ts`
**Commit:** `67388c8`
**Applied fix:** Single atomic commit because both changes touch the same
file and the new `uid(state)` signature ripples through every case arm.
- WR-02: replaced every `const e = evt as any` with direct use of the vendor
  `ClaudeEvent` type, plus `typeof` / `in` narrowing at the parse boundary
  for the few extension fields the vendor does not model (`event.delta.text`
  on stream_event, `block.input` / `block.tool_use_id` on assistant /
  user blocks). Adversarial NDJSON like `{"delta":{"text":["a","b"]}}` is
  now rejected by the `typeof === "string"` guard instead of silently
  concatenating an array into the assistant text buffer. Added a small
  `readString(obj, key)` helper for the system/init `cwd` field and the
  system/error `message` field (both of which the vendor types loosely).
- WR-03: added `_uidCounter: number` to `DispatchState`; `freshState()`
  initializes it to 0; `uid()` is now `uid(state)`. The module-scope
  `let msgCounter = 0` is gone. The no-state-leak contract pinned by
  `tests/tool-use-collapsible.test.ts:140` is now structurally guaranteed.

### WR-04: `SCRATCH_DIR_REGEX` admits non-portable username shapes

**Files modified:** `src/lib/spawn-args.shared.ts`, `tests/spawn-args.test.ts`, `src-tauri/capabilities/default.json`
**Commit:** `b7ff143`
**Applied fix:** Tightened the username body from `[^/]+` to
`[A-Za-z0-9_.\-]+` — the POSIX portable-name character class used by macOS
Open Directory and Linux `useradd`. Regenerated `capabilities/default.json`
via the SSOT pipeline so the spawn capability validators stay aligned. Added
a regression test covering the previously admitted shapes (`/Users/ /.mneme/scratch`,
`/Users/qin yuan/.mneme/scratch`) and confirming common valid usernames
(`test.user`, `test-user`, `test_user`) still pass.

### WR-05: Splitter ratios can sum to ≠ 1, causing CSS grid overflow

**Files modified:** `src/lib/components/Splitter.svelte`
**Commit:** `9c71cca`
**Applied fix:** Introduced `clampAndNormalize(left, middle)` that returns
`{leftRatio, middleRatio, rightRatio: 1 - left - middle}`. The previous
asymmetric ceiling (`1 - 2*RATIO_MIN = 0.60` for left, `RATIO_MAX = 0.50`
for middle/right) combined with the `Math.max(RATIO_MIN, 1 - left - middle)`
floor on the derived `rightRatio` could yield a frame whose ratios summed to
1.01fr, causing ~12 px CSS-grid overshoot at 1280 px window width. The
normalize function holds the invariant on every drag-induced mutation.
Removed the `Math.max` floor on `rightRatio` since the normalize already
refuses to push `left + middle > 1 - RATIO_MIN`. Also surfaced `localStorage`
save errors via `console.warn` (partial WR-07 — restore arm handled
separately in `949ea4d`).

### WR-06: BSD grep `\s` portability in audit script

**Files modified:** `scripts/audit-capabilities.sh`, `tests/audit/fixture-clean.json`
**Commit:** `f869443`
**Applied fix:** Replaced every `\s+` in `grep -E` with POSIX
`[[:space:]]+` across all three audit checks in checks 7a and 7b. BSD
grep on macOS does not recognize `\s` in ERE — it treats the sequence as a
literal `s`, so the check would silently miss tab-separated imports and
break on Linux GNU grep CI runners. Also refreshed
`tests/audit/fixture-clean.json` which had drifted (it pre-dated the WR-04
regex tightening and the `allow-start-dragging` permission addition).

### WR-07: localStorage `try / catch {}` swallows errors silently

**Files modified:** `src/lib/components/Splitter.svelte`, `src/lib/components/TitlebarMeta.svelte`
**Commit:** `949ea4d`
**Applied fix:** Added a `console.warn` on the restore-arm of the Splitter
layout read AND on the TitlebarMeta vault-path read. User-perceived behavior
unchanged (defaults still apply), but a corrupted localStorage entry that
was silently reverting state every session is now visible during
development. (The Splitter save-arm warning landed in WR-05's commit.)

### WR-08: `isErrorMsg` string-pattern matching on translated content

**Files modified:** `src/lib/stream-dispatch.ts`, `src/lib/components/ChatPanel.svelte`
**Commit:** `b264164`
**Applied fix:** Added explicit `systemKind?: "error" | "info"` discriminator
to the `Msg` shape. Set `systemKind: "error"` at the five failure-path push
sites (scratchDir-not-resolved, build-args failure, spawn-or-register
failure, runtime spawn error, stream-dispatch system/error). Set
`systemKind: "info"` at the "stream ended unexpectedly" push site, which is
an operational signal (subprocess closed before result), not a failure.
`isErrorMsg(m)` now checks `m.systemKind === "error"` instead of pattern-
matching `.text`. Eliminates the `&lt;` false-positive, the "Failed to" /
"stream ended" prefix coupling, and the future i18n-break.

### WR-09: `kill_pgid` integration test uses hard-coded `/tmp/mneme_test_*.pid`

**Files modified:** `src-tauri/tests/kill_pgid.rs`
**Commit:** `8f2b638`
**Applied fix:** Allocated a per-test `tempfile::TempDir` and injected the
per-test PID file paths into the Python wrapper script via `format!()`.
`tempfile` was already a dev-dep at `src-tauri/Cargo.toml:45`. The TempDir
drops at end of test (RAII), removing the explicit `cleanup_pid_files()`
helper. All 3 tests in the file still pass; concurrent test runs no longer
alias each other's PID files.

### WR-10: `screenshot-01-06.mjs` and `take-screenshot.mjs` use stale absolute paths

**Files modified:** `scripts/screenshot-01-06.mjs`, `scripts/take-screenshot.mjs`
**Commit:** `b1cf375`
**Applied fix:** Both scripts now resolve every path relative to
`dirname(fileURLToPath(import.meta.url))` (the script's own directory).
`screenshot-01-06.mjs` previously hard-coded a deleted
`.claude/worktrees/agent-aeff29bb776aaf470/` path; `take-screenshot.mjs`
relied on `process.cwd()` which silently produced wrong-state output when
run from any directory other than the repo root. Both files pass
`node -c` syntax check after the rewrite.

### WR-11: `sanitize.ts` `catch (e: any)` violates "narrow `unknown` with `instanceof Error`" rule

**Files modified:** `src/lib/sanitize.ts`
**Commit:** `2521dc6`
**Applied fix:** Replaced `catch (e: any)` with `catch (e: unknown)` and
narrowed via `e instanceof Error`. Runtime safety equivalent to the prior
optional-chain on `e?.message`, but the type annotation now follows the
project rule. All 15 sanitize tests pass.

### WR-12: `run-quit-loop.sh` orphan grep matches unrelated `rg`/`mcp`/`ripgrep`

**Files modified:** `tests/manual/lifecycle/run-quit-loop.sh`
**Commit:** `c393494`
**Applied fix:** Narrowed the `orphan_count` ERE from
`[c]laude --print|[m]cp[ -]|[r]g[ -]|[r]ipgrep` to `[c]laude --print` only.
The dropped patterns false-fired on the developer's IDE running ripgrep, a
separate Claude Code session in another terminal, or a `cargo` build with
`rg` in its argv — any of which would cause the harness to attribute
unrelated processes to a Phase 1 orphan count and false-fail REQ-3. MCP /
rg / ripgrep selectors can be re-added as narrower patterns when MCP
integration ships in Phase 1.x.

---

_Fixed: 2026-05-14T04:14:26Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
