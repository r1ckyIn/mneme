---
phase: 01-tauri-shell-foundation-subprocess-hardening
plan: 04
subsystem: rust-subprocess-lifecycle
tags: [rust, tauri-2, nix-0.31, killpg, getpgid, sigterm, sigkill, setsid, process-group, session-registry, hook-union, hashmap-shape, tdd, integration-test]

# Dependency graph
requires:
  - phase: 01-tauri-shell-foundation-subprocess-hardening
    plan: 01
    provides: "src-tauri/Cargo.toml with nix 0.31 (signal+process) + home 0.5; src-tauri/src/lib.rs Tauri Builder skeleton + scratch dir setup hook"
provides:
  - "src-tauri/src/session.rs — SessionRegistry (Mutex<HashMap<SessionId, ChildHandle>>), Phase 3 extension-friendly"
  - "src-tauri/src/lib.rs::kill_pgid (pub) — nix::killpg(getpgid(pid), SIGTERM) → 2s grace → unconditional SIGKILL"
  - "src-tauri/src/lib.rs hook union — WindowEvent::CloseRequested ∪ RunEvent::ExitRequested both call SessionRegistry::kill_all()"
  - "Three Tauri invoke commands wired — register_session_pid / clear_session_pid / stop_session"
  - "src-tauri/tests/kill_pgid.rs — 3 integration tests (whole-PG eradication / nonexistent PID / already-dead PG); cycle-1 MEDIUM PGID test mismatch closed"
  - "Setup hook for ~/.mneme/scratch/ preserved from plan 01-01 (re-statement, no behavior change)"
affects:
  - "01-06-PLAN.md ChatPanel — IPC contract: await invoke('register_session_pid', { pid: child.pid }) after spawn → await invoke('clear_session_pid') on natural close → await invoke('stop_session') for Stop button"
  - "01-07-PLAN.md 5-cycle bash lifecycle harness — kill_pgid is now the kernel-level cleanup the harness verifies; harness drives Cmd+Q via AppleScript, this plan provides the path that satisfies the orphan-count = 0 gate"
  - "Phase 3 multi-session refactor — 1-task swap (start generating monotonic SessionIds at frontend spawn time; HashMap shape ships now, no rip-out)"

# Tech tracking
tech-stack:
  added:
    - "nix 0.31 (already in deps via plan 01-01) — now consumed: nix::sys::signal::{killpg, Signal}, nix::unistd::{getpgid, Pid}, nix::sys::signal::kill (for liveness probe in tests)"
  patterns:
    - "Pattern (kernel-level subprocess GC): SIGTERM grace + unconditional SIGKILL — NO TOCTOU 'is it still alive?' check between the two; let _ = killpg(...) drops ESRCH on dead PG harmlessly (T-1-19 mitigation)"
    - "Pattern (idempotent dual-hook drain): Mutex<HashMap>::take()-on-drain semantics let both WindowEvent::CloseRequested and RunEvent::ExitRequested call kill_all() safely; second call is a no-op (T-1-18 mitigation for Tauri issue #9198)"
    - "Pattern (extension-friendly state from day 1): Mutex<HashMap<SessionId, ChildHandle>> from Phase 1; Phase 3 multi-session inserts more entries with no rip-out (RESEARCH §8 Risk 1; T-1-20 mitigation)"
    - "Pattern (test-side zombie reap): integration test that kills its own python child must call try_wait()/wait() to reap before pid_alive() probes; otherwise kill(pid, 0) returns OK on zombie process-table entries"
    - "Pattern (production-mirroring test wrapper): Python's os.setsid() makes the wrapper itself the PG leader, mirroring how `claude` CLI becomes its own PG leader via internal setsid()  — closes cycle-1 MEDIUM 'PGID test mismatch' by removing the bash-+-grandchild-different-PG mismatch"

key-files:
  created:
    - "src-tauri/src/session.rs (60 LOC) — SessionRegistry + ChildHandle + SessionId; 5 methods (new / register / drain_one / drain_all / kill_all); HashMap shape; Default impl"
    - "src-tauri/tests/kill_pgid.rs (222 LOC) — 3 integration tests; cargo test --test kill_pgid passes 3/3 in ~5s"
  modified:
    - "src-tauri/src/lib.rs (32 → 117 LOC) — added mod session, pub re-exports, pub kill_pgid (real impl), 3 invoke commands, hook union via .build(...).run(closure); preserved scratch dir setup hook verbatim from plan 01-01"

key-decisions:
  - "kill_pgid sequence: getpgid(Some(pid)) → killpg(SIGTERM) → thread::sleep(2s) → killpg(SIGKILL). SIGKILL is sent UNCONDITIONALLY (no TOCTOU alive-check between the two signals — that race window would let slow-exiting children evade). ESRCH on dead PG is dropped via let _ = (T-1-19 lock)."
  - "Hook union: WindowEvent::CloseRequested AND RunEvent::ExitRequested both call SessionRegistry::kill_all(). Tauri issue #9198 documents ExitRequested unreliability on some macOS versions; CloseRequested is the partner. Both calling kill_all is idempotent via std::mem::take on the inner HashMap (T-1-18 lock)."
  - "SessionRegistry shape: Mutex<HashMap<SessionId, ChildHandle>>, NOT Mutex<Option<u32>>. Phase 1 always uses SessionId = 1 (single-session, ≤1 entry). Phase 3 multi-session generates monotonic IDs at frontend spawn time — 1-task swap, not a rip-out (RESEARCH §8 Risk 1, T-1-20 lock)."
  - "Builder pattern: switched from .run(generate_context!()) shorthand (plan 01-01) to .build(generate_context!()).run(closure) form. The closure form is REQUIRED to receive RunEvent::ExitRequested events; the shorthand never reaches user code with the exit event."
  - "Test wrapper choice: Python's os.setsid() over bash's `setsid` command. Reasons: (1) macOS Ventura 13.4 ships no `setsid` binary — verified via `which setsid` returns 'not found'; (2) even if setsid existed, `setsid sleep 30 &` puts the GRANDCHILD into a NEW PG distinct from bash's, breaking the 'kill bash's PG kills sleep' assertion. Python wrapper makes ITSELF the PG leader, mirroring production where `claude` becomes its own PG leader."
  - "Test-side zombie reap: parent.try_wait() must be called BEFORE asserting parent_pid is dead. Cargo test runner is the python process's parent; killed-but-unreaped processes are zombies, and kill(pid, 0) returns OK for zombies (process-table entry survives until reaped). Without try_wait(), pid_alive(parent_pid) returns true even when SIGKILL has been delivered. The grandchildren do NOT need explicit reap — once their parent (python) dies, they're orphaned to launchd which auto-reaps."

requirements-completed: [REQ-02]
threats-mitigated: [T-1-01, T-1-18, T-1-19, T-1-20, T-1-21]

# Metrics
duration: 9min
completed: 2026-05-09
---

# Phase 1 Plan 04: Subprocess Lifecycle Hardening Summary

**Rust state machine that closes T-1-01 (subprocess zombies on Cmd+Q) — `nix::killpg(getpgid(pid), SIGTERM)` → 2s grace → unconditional `SIGKILL`, dispatched by both `WindowEvent::CloseRequested` and `RunEvent::ExitRequested` hooks via an extension-friendly `SessionRegistry` HashMap, gated by an integration test that proves whole-process-group eradication on a real `setsid`-detached child tree.**

## Performance

- **Duration:** ~9 min wall time (3 commits between 12:01–12:10 local on agent worktree branch `worktree-agent-ab58c5864be7737ab`)
- **Completed:** 2026-05-09
- **Tasks:** 3/3 complete
- **Files:** 2 created (session.rs, tests/kill_pgid.rs) + 1 modified (lib.rs)

## Accomplishments

- **T-1-01 zombie subprocess accumulation closed at the kernel level.** `kill_pgid` calls `nix::sys::signal::killpg(getpgid(pid), SIGTERM)`, sleeps 2s, then unconditionally `killpg(pgid, SIGKILL)`. The unconditional second signal is load-bearing (T-1-19 — adding a "still alive?" check between SIGTERM and SIGKILL would introduce a TOCTOU race that lets slow-exiting children survive).
- **Hook union ships per D-12.** Both `WindowEvent::CloseRequested` and `RunEvent::ExitRequested` route to `SessionRegistry::kill_all()`. The dual coverage closes T-1-18 — Tauri issue #9198 reports that `ExitRequested` is unreliable on some macOS versions; the `CloseRequested` hook is the partner that catches red-button close. The dual call is safe via `Mutex<HashMap>::std::mem::take()` semantics (`drain_all` empties the map on first call; second call drains nothing).
- **SessionRegistry HashMap shape ships from day 1 (RESEARCH §8 Risk 1).** `Mutex<HashMap<SessionId, ChildHandle>>` with `SessionId = 1` hard-coded in Phase 1's invoke handlers. Phase 3 multi-session refactor becomes a 1-task swap (frontend starts generating monotonic IDs at spawn time; the registry inserts more entries with no rip-out). T-1-20 mitigation locked in code, not just doc.
- **Three Tauri invoke commands wired into the IPC contract.** `register_session_pid` (called after `await cmd.spawn()`), `clear_session_pid` (called on natural close from `cmd.on('close')`), `stop_session` (called by D-19 Stop button — same kill path, app keeps running). Plan 01-06's ChatPanel can drive the contract without further Rust changes.
- **Setup hook for `~/.mneme/scratch/` preserved verbatim from plan 01-01.** `home::home_dir()` + `fs::create_dir_all` is idempotent and survives the lib.rs rewrite intact (T-1-21 lock — failure-open is also caught at the capability layer by plan 01-02's regex validator).
- **Integration test `cargo test --test kill_pgid` passes 3/3 in ~5s.** The test:
  - **`kill_pgid_eradicates_whole_process_group`** — uses Python (with `os.setsid()` making it the PG leader) + two long-lived `sleep 30` grandchildren, asserts ALL three PIDs are gone after `kill_pgid(parent_pid)`. Closes Cycle-1 carry-forward MEDIUM "PGID test mismatch" by asserting whole-group drain instead of just leader drain.
  - **`kill_pgid_safe_on_nonexistent_pid`** — `kill_pgid(999_999)` does not panic. Verifies the `getpgid` ESRCH path is handled silently.
  - **`kill_pgid_safe_on_already_dead_pgid`** — spawns `bash -c "exit 0"`, waits 250ms for natural exit, then calls `kill_pgid(its_pid)`. Verifies kill on an already-gone PG is idempotent (no panic).

## Task Commits

Atomic per-task commits on agent worktree branch `worktree-agent-ab58c5864be7737ab`:

1. **Task 1: SessionRegistry HashMap shape (Phase 3 extension-friendly)** — `1cdc5fa` (feat)
2. **Task 2 RED: kill_pgid integration test (failing against stub)** — `437514c` (test)
3. **Task 2 GREEN: real kill_pgid + hook union close T-1-01** — `2e16433` (feat) — also absorbed a test-side fix for zombie reap (try_wait()) discovered during GREEN execution; documented as Rule 1 deviation below

## Files Created/Modified

**Created:**

- `src-tauri/src/session.rs` (60 LOC, frontmatter not counted) — `SessionRegistry` (`Mutex<HashMap<SessionId, ChildHandle>>`); `ChildHandle { pid: u32 }`; 5 methods (`new` / `register` / `drain_one` / `drain_all` / `kill_all`); `Default` impl. `kill_all` delegates to `crate::kill_pgid` for each drained handle.
- `src-tauri/tests/kill_pgid.rs` (222 LOC) — 3 integration tests + helper functions (`pid_alive` via `nix::sys::signal::kill(_, None)`; `cleanup_pid_files` for /tmp PID-mailbox tolerance). Top-of-file comment documents the production-semantics modeling and the rationale for choosing Python over bash+setsid.

**Modified:**

- `src-tauri/src/lib.rs` (32 → 117 LOC) — added `mod session;` + `pub use session::*` re-exports + `use std::{fs, thread, time::Duration}` + nix + tauri imports. New: `pub fn kill_pgid` (real impl), 3 `#[tauri::command]` functions (register/clear/stop), Tauri Builder upgraded from `.run(generate_context!())` to `.build(generate_context!()).run(closure)` form (the closure form is REQUIRED to receive `RunEvent::ExitRequested`). Preserved: scratch-dir setup hook verbatim.

## Decisions Made

See frontmatter `key-decisions` for the canonical list. Highlights:

- **Test wrapper uses Python `os.setsid()`, not `bash setsid`** — macOS Ventura 13.4 has no `setsid` binary in `$PATH` (verified via `which setsid` → "not found"). The Python wrapper makes itself the PG leader (matching production where `claude` is its own PG leader).
- **Test calls `parent.try_wait()` before final liveness probe** — without it, the killed Python process becomes a zombie under the cargo-test parent. `kill(pid, 0)` returns OK for zombies (the process-table entry survives until reaped), so `pid_alive(parent_pid)` would falsely report "alive" until reap.
- **SIGKILL is sent UNCONDITIONALLY after the 2s grace** — no liveness check between SIGTERM and SIGKILL. The TOCTOU race window would let slow-exiting children survive. `let _ = killpg(...)` drops ESRCH harmlessly when the PG is already gone (T-1-19 lock).
- **Tauri Builder upgraded to closure form** — `.build(generate_context!()).run(|app, event| { ... })`. The shorthand `.run(generate_context!())` does NOT call user code on `RunEvent::ExitRequested`; the closure form is required to wire up the second hook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test wrapper uses Python instead of bash+`setsid`**
- **Found during:** Task 2 RED (test design)
- **Issue:** The plan's RESEARCH §TDD verbatim test wrapper `bash -c "setsid sleep 30 & echo $! > …"` has two production-mismatch problems: (1) macOS does not ship `setsid` (`which setsid` returns "not found" on Ventura 13.4); (2) even if it did, `setsid sleep 30 &` makes the GRANDCHILD its own PG leader (separate from bash's PG), so `getpgid(bash_pid)` returns bash's PG only and `killpg(bash_pgid, SIGKILL)` would never reach the grandchild. The naive wrapper inverts the production semantics it claims to mirror — and is also exactly what cycle-1 review MEDIUM #1 flagged as "PGID kill test production mismatch".
- **Fix:** Replaced the bash wrapper with a Python wrapper that calls `os.setsid()` early. Python becomes its own PG leader (PGID = python_pid), exactly mirroring how `claude` CLI becomes its own PG leader. Two `subprocess.Popen(["sleep", "30"])` children inherit that PGID. The test then asserts ALL THREE PIDs (parent + both grandchildren) are dead after `kill_pgid(parent_pid)` — closing the cycle-1 carry-forward MEDIUM by asserting whole-group drain rather than just leader drain.
- **Files modified:** `src-tauri/tests/kill_pgid.rs`
- **Commits:** `437514c` (RED test with Python wrapper), `2e16433` (GREEN refinements)

**2. [Rule 1 - Bug] Test must `try_wait()` to reap parent zombie before probing liveness**
- **Found during:** Task 2 GREEN (initial green run failed unexpectedly)
- **Issue:** The first GREEN run produced this surprising failure mode: children DEAD ✓, parent STILL ALIVE ✗ (the eradication assertion panicked on the parent PID). Debug printlns revealed `getpgid(parent) = Ok(Pid(parent_pid))` (parent IS the PG leader as expected) and `killpg(SIGKILL)` returns Ok — yet `kill(parent_pid, None)` continued to return OK after the kill. Root cause: the cargo-test runner is the python process's parent; killed-but-unreaped processes are ZOMBIES — kernel keeps a process-table entry until `wait()` is called, and `kill(pid, 0)` (signal 0 = liveness probe) returns OK for zombies (the PID still "exists"). The grandchildren do not have this issue — once python dies, they're orphaned to launchd which auto-reaps. So the test's `pid_alive(parent_pid)` was correct in saying "process-table entry exists", just deceptive about whether it's running.
- **Fix:** Added `let _ = parent.try_wait();` after the 2.5s sleep and before the parent-PID liveness assertion. `try_wait()` reaps the zombie, freeing the process-table slot, so `kill(parent_pid, None)` correctly returns ESRCH after that.
- **Files modified:** `src-tauri/tests/kill_pgid.rs`
- **Commit:** `2e16433` (combined with GREEN impl since both were needed for test pass)
- **Production parallel:** in Tauri, the frontend's `cmd.spawn()` returns a `Child` handle; the `cmd.on('close')` relay ensures the handle is dropped when the subprocess exits, and Rust's drop semantics handle the reap implicitly. The test simulates this with explicit `try_wait()`.

**3. [Rule 1 - Bug] Builder shorthand `.run(generate_context!())` does not deliver `RunEvent::ExitRequested`**
- **Found during:** Task 2 GREEN (implementation choice)
- **Issue:** Plan 01-01's lib.rs used `.run(generate_context!())` (shorthand, no closure). That form does NOT execute user code on `RunEvent::ExitRequested` — the runtime exits without dispatching the event. To wire the second hook, the Builder must be split into `.build(generate_context!()).run(|app, event| { ... })`.
- **Fix:** Switched lib.rs to the closure form. The expression `.expect("error while running tauri application")` (preserved from plan 01-01's wording) now applies to the `.build(...)` result. The closure receives `app: AppHandle` + `event: RunEvent` and matches `RunEvent::ExitRequested { .. }` to invoke `app.state::<SessionRegistry>().kill_all()`.
- **Files modified:** `src-tauri/src/lib.rs`
- **Commit:** `2e16433`
- **Note:** This is a structural change to the Builder pattern that plan 01-01 set up; it's a Rule 1 fix because plan 01-04's REQ — to wire `RunEvent::ExitRequested` — cannot be met without it. Plan 01-04 inherently extends/restructures plan 01-01's Builder. No regression to plan 01-01's contract: the scratch-dir setup hook is preserved verbatim, the plugin-shell init is preserved, and `expect(...)` semantics are equivalent.

### Notes

- **Out-of-scope sibling-plan integration deferred.** Task 3's `bash scripts/audit-capabilities.sh` and `npx vitest run tests/spawn-args.test.ts tests/capability-regex.test.ts` cannot run in this worktree because the files those checks depend on are owned by parallel-running plans 01-02 and 01-03 in their own worktrees. The orchestrator will run those checks after merging all Wave 2 worktrees back. In-scope Task 3 verification (`cargo build` clean + `cargo test --test kill_pgid` passing) is verified locally and passes.
- **No `unsafe` blocks introduced.** `Pid::from_raw(pid_u32 as i32)` is safe; the `as i32` cast is documented as harmless for any realistic POSIX PID (RESEARCH §4.3 line 213). The integration test similarly avoids `unsafe` by using `nix::sys::signal::kill(pid, None)` for the liveness probe instead of `libc::kill(pid, 0)`.

## Issues Encountered

- **`kill -- -<PGID>` returned "no such process" instantly during shell debugging.** Initially read as "kill failed" but actually means the SIGTERM/SIGKILL killed the entire group fast enough that the kernel had already cleaned up by the time the second probe ran. Confirmed mechanism is correct; the subsequent test failure was unrelated to the kernel layer (it was the zombie-reap issue in deviation #2).
- **Pre-commit hook rejected initial heredoc-form commit message.** The Claude Code `gsd-validate-commit.sh` hook regex matches `-m "..."` and `-m '...'` but does not pattern-match the multiline single-quoted form produced by `git commit -m "$(cat <<'EOF' ... EOF)"`. Switched to single-line `-m "feat(01-04): ..."` form for all three commits; commit message bodies omitted.

## Threat Coverage

| Threat ID | Status | Mitigation |
|-----------|--------|------------|
| T-1-01 (zombie subprocess accumulation) | MITIGATED | `kill_pgid` SIGTERM → 2s → unconditional SIGKILL via `nix::killpg`; hook union catches both Cmd+Q and red-button close; integration test `kill_pgid_eradicates_whole_process_group` proves whole-PG drain |
| T-1-18 (`RunEvent::ExitRequested` unreliable on some macOS) | MITIGATED | `WindowEvent::CloseRequested` partner hook; both call `kill_all()`; `Mutex<HashMap>::take()` semantics make the second drain a no-op (idempotent) |
| T-1-19 (TOCTOU between SIGTERM grace and "still alive?" check) | MITIGATED | SIGKILL is sent UNCONDITIONALLY after the 2s grace; `let _ = killpg(...)` drops ESRCH; lib.rs comment forbids adding a TOCTOU check |
| T-1-20 (Phase 3 multi-session refactor breaks Phase 1 single-session contract) | MITIGATED | `Mutex<HashMap<SessionId, ChildHandle>>` shape ships from day 1; `SessionId = 1` hard-coded in invoke handlers; Phase 3 inserts monotonic IDs with no rip-out |
| T-1-21 (Setup hook race / partial mkdir on `~/.mneme/scratch/`) | MITIGATED | `std::fs::create_dir_all` is idempotent + atomic at directory-tree level on macOS APFS; setup hook runs BEFORE `.run()` so frontend cannot spawn before scratch exists; plan 01-02's capability validator regex catches failure-open at the IPC layer |

## Self-Check: PASSED

Mechanical existence verification of all artifacts and commits:

```
src-tauri/src/session.rs: FOUND
src-tauri/src/lib.rs: FOUND (mod session, pub use, kill_pgid, register/clear/stop, hook union, scratch setup hook)
src-tauri/tests/kill_pgid.rs: FOUND (3 tests, 222 LOC)

Symbols verified:
  - pub struct SessionRegistry: PRESENT in session.rs
  - pub struct ChildHandle: PRESENT in session.rs
  - Mutex<HashMap<SessionId, ChildHandle>>: PRESENT in session.rs
  - new / register / drain_one / drain_all / kill_all: PRESENT in session.rs
  - pub fn kill_pgid: PRESENT in lib.rs
  - killpg + Signal::SIGTERM + Signal::SIGKILL + Duration::from_secs(2): PRESENT in lib.rs
  - WindowEvent::CloseRequested: PRESENT in lib.rs
  - RunEvent::ExitRequested: PRESENT in lib.rs
  - register_session_pid / clear_session_pid / stop_session: PRESENT in lib.rs
  - tauri_plugin_shell::init: PRESENT in lib.rs
  - .mneme/scratch: PRESENT in lib.rs

Cargo gates:
  - cargo build (full): exit 0
  - cargo test --test kill_pgid: 3 passed; 0 failed; 0 ignored (in ~5s)

Commits on worktree-agent-ab58c5864be7737ab:
  1cdc5fa: FOUND (Task 1 — SessionRegistry HashMap shape)
  437514c: FOUND (Task 2 RED — kill_pgid integration test)
  2e16433: FOUND (Task 2 GREEN — real kill_pgid + hook union)
```

All artifacts exist; all commits resolvable on the agent worktree branch.

## Next Wave Readiness

- **Plan 01-06 (chat E2E)** can drive the IPC contract directly: `await invoke("register_session_pid", { pid: child.pid })` after `cmd.spawn()`, `await invoke("clear_session_pid")` from the natural-close `cmd.on('close')` relay, `await invoke("stop_session")` from the D-19 Stop button click. No further Rust changes required for Phase 1 chat lifecycle.
- **Plan 01-07 (5-cycle bash lifecycle harness)** has the kernel-level cleanup it needs to verify. Cycle-2 of code review already corrected the harness HIGH (AppleScript-driven Cmd+Q + pre/post `claude --print` PID asserts); this plan's `kill_pgid` is the path being verified end-to-end. Combined: `cargo test --test kill_pgid` (deterministic unit-level gate) + `tests/manual/lifecycle/run-quit-loop.sh` (5-cycle E2E gate) jointly satisfy SPEC REQ-3.
- **Phase 3 multi-session refactor** is now a 1-task swap, not a rip-out. The frontend will start generating monotonic SessionIds at spawn time and pass them to `register_session_pid`; the registry inserts more entries; all other code paths (kill_all, drain_one) work unchanged. Cycle-1 RESEARCH §8 Risk 1 mitigation lands as code, not just doc.

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Plan: 04 (Wave 2 — subprocess lifecycle hardening)*
*Completed: 2026-05-09*
*Worktree branch: worktree-agent-ab58c5864be7737ab*
