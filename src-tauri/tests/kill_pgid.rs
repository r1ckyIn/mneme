// src-tauri/tests/kill_pgid.rs — integration test for kill_pgid against a real
// process-group tree that mirrors production semantics.
//
// REQ-3 covers Cmd+Q-triggered cleanup of the process group the `claude` CLI
// detaches into via setsid(). This test isolates kill_pgid from the Tauri
// runtime and verifies the syscall sequence (SIGTERM → 2s grace → SIGKILL)
// actually eradicates the WHOLE process group — both the parent (PG leader)
// AND its children — within the deadline.
//
// Production semantics being modeled
// -----------------------------------
// In production the frontend spawns `claude --print ...`. The `claude` binary
// internally calls setsid() and becomes the LEADER of its own process group.
// `claude`'s children (mcp servers, ripgrep, file readers) inherit that PGID.
// Frontend hands `claude.pid` over to Rust; on Cmd+Q,
// `getpgid(claude.pid) → claude.pid` (because claude is the PG leader) and
// `killpg(claude.pid, …)` reaches every descendant.
//
// Test wrapper choice
// -------------------
// The naive wrapper `bash -c "setsid sleep 30 & echo $! > …"` has TWO problems:
//   1. macOS does NOT ship `setsid` (it's a util-linux command — verified
//      `which setsid` on Ventura 13.4 returns "not found"; cycle-1 review
//      MEDIUM #1 flagged this same production-mismatch).
//   2. Even if `setsid` existed, `setsid sleep 30` would put the GRANDCHILD
//      into a NEW process group separate from bash's. `getpgid(bash_pid)`
//      would return bash's PG, NOT the grandchild's — kill_pgid would only
//      kill bash, leaving the grandchild orphaned. That is the inverse of
//      what we want to assert.
//
// Instead the test uses Python as the wrapper:
//   - Python calls `os.setsid()` early, making ITSELF the PG leader (PGID = its
//     own PID — exactly mirroring how claude becomes its own PG leader).
//   - Python then forks two long-lived sleep children. Both inherit the PG.
//   - Test registers Python's PID, calls kill_pgid(python_pid), and asserts
//     EVERY descendant is gone. This closes Cycle-1 carry-forward MEDIUM
//     "PGID test mismatch" by asserting whole-group drain, not just the leader.
//
// Manual-runnable: `cargo test --manifest-path src-tauri/Cargo.toml --test kill_pgid`.
// Depends on: python3 (macOS-bundled at /usr/bin/python3), `sleep` (POSIX).

use std::process::Command;
use std::thread;
use std::time::Duration;

const PARENT_PID_FILE: &str = "/tmp/mneme_test_parent.pid";
const CHILD1_PID_FILE: &str = "/tmp/mneme_test_child1.pid";
const CHILD2_PID_FILE: &str = "/tmp/mneme_test_child2.pid";

/// Liveness probe via signal 0 (no syscall side effect on the target).
/// Returns true if the PID exists and we have permission to signal it.
/// Matches the kernel-level semantics of `kill -0 <pid>`: success = alive,
/// ESRCH = dead.
fn pid_alive(pid: u32) -> bool {
    use nix::sys::signal::kill;
    use nix::unistd::Pid;
    kill(Pid::from_raw(pid as i32), None).is_ok()
}

/// Drop-with-best-effort cleanup of the temp PID files; tolerate prior-run residue.
fn cleanup_pid_files() {
    let _ = std::fs::remove_file(PARENT_PID_FILE);
    let _ = std::fs::remove_file(CHILD1_PID_FILE);
    let _ = std::fs::remove_file(CHILD2_PID_FILE);
}

#[test]
fn kill_pgid_eradicates_whole_process_group() {
    cleanup_pid_files();

    // Python wrapper:
    //   - os.setsid() → become PG leader (PGID = python_pid)
    //   - fork TWO `sleep 30` children (both inherit the PG)
    //   - write all three PIDs to /tmp files (so Rust can probe each one)
    //   - wait forever (until killed)
    //
    // The whole point of forking TWO children is to assert in the test that
    // BOTH grandchildren die — closing the cycle-1 MEDIUM "test only checks
    // the leader, not the whole group" concern.
    let script = r#"
import os, subprocess, time
os.setsid()
parent_pid = os.getpid()
with open("/tmp/mneme_test_parent.pid", "w") as f:
    f.write(str(parent_pid))
c1 = subprocess.Popen(["sleep", "30"])
c2 = subprocess.Popen(["sleep", "30"])
with open("/tmp/mneme_test_child1.pid", "w") as f:
    f.write(str(c1.pid))
with open("/tmp/mneme_test_child2.pid", "w") as f:
    f.write(str(c2.pid))
# Block the parent so it stays alive until SIGTERM/SIGKILL arrives.
# We sleep instead of wait() so SIGTERM interrupts cleanly.
time.sleep(60)
"#;

    let mut parent = Command::new("python3")
        .args(["-c", script])
        .spawn()
        .expect("failed to spawn python3 test wrapper (is python3 on PATH?)");
    let observed_parent_pid = parent.id();

    // Give python time to call setsid + fork both children + write the PID files.
    thread::sleep(Duration::from_millis(800));

    let parent_pid: u32 = std::fs::read_to_string(PARENT_PID_FILE)
        .expect("parent PID file not written")
        .trim()
        .parse()
        .expect("parent PID file content not numeric");
    let child1_pid: u32 = std::fs::read_to_string(CHILD1_PID_FILE)
        .expect("child1 PID file not written")
        .trim()
        .parse()
        .expect("child1 PID file content not numeric");
    let child2_pid: u32 = std::fs::read_to_string(CHILD2_PID_FILE)
        .expect("child2 PID file not written")
        .trim()
        .parse()
        .expect("child2 PID file content not numeric");

    // Sanity: the parent PID we observed via Command::spawn() MUST be the same
    // PID Python wrote to disk (no fork-chain jumbling). If this assertion ever
    // fails, the test wrapper has been mutated incorrectly.
    assert_eq!(
        parent_pid, observed_parent_pid,
        "parent PID mismatch — wrapper script changed?"
    );

    // Pre-conditions: all three processes are alive before we kill.
    assert!(
        pid_alive(parent_pid),
        "parent PID {} not alive before kill_pgid",
        parent_pid
    );
    assert!(
        pid_alive(child1_pid),
        "child1 PID {} not alive before kill_pgid",
        child1_pid
    );
    assert!(
        pid_alive(child2_pid),
        "child2 PID {} not alive before kill_pgid",
        child2_pid
    );

    // The function under test
    app_lib::kill_pgid(parent_pid);

    // Wait past the 2s SIGTERM grace + a small buffer for SIGKILL delivery.
    // SPEC REQ-3 acceptance is "within 2s of Cmd+Q"; we wait 2.5s to give the
    // kernel its routine slack.
    thread::sleep(Duration::from_millis(2_500));

    // Reap the parent zombie. The kill_pgid call delivered SIGKILL to the WHOLE
    // process group, which kills the python parent in addition to the children.
    // BUT: because the test runner is the python process's parent, the dead
    // python process becomes a ZOMBIE (kernel keeps a process-table entry)
    // until we wait() on it. `kill(pid, None)` returns OK for zombies — they
    // still "exist" in the process table. To make `pid_alive(parent_pid)`
    // report DEAD honestly, we must reap the zombie via try_wait()/wait().
    //
    // The two grandchildren do NOT become zombies of THIS process — their
    // parent was the python process, which is now dead, so they are orphaned
    // and auto-reaped by init/launchd. So child{1,2}_pid liveness probes are
    // honest without our intervention.
    //
    // Production parallel: in Tauri, frontend's `cmd.spawn()` returns a Child
    // handle that the cmd.on('close') relay reaps via Rust's drop semantics.
    // Cmd+Q kill_pgid path lets the OS deliver SIGKILL; the WindowEvent close
    // sequence drains state which drops the handle. The reap happens
    // implicitly. The test simulates this with explicit try_wait().
    let _ = parent.try_wait();

    // WHOLE-PROCESS-GROUP drain assertion (closes Cycle-1 MEDIUM #1).
    // All three PIDs (parent + both children) must be gone.
    assert!(
        !pid_alive(parent_pid),
        "parent (PG leader) PID {} still alive after kill_pgid",
        parent_pid
    );
    assert!(
        !pid_alive(child1_pid),
        "child1 PID {} still alive after kill_pgid (PG drain incomplete)",
        child1_pid
    );
    assert!(
        !pid_alive(child2_pid),
        "child2 PID {} still alive after kill_pgid (PG drain incomplete)",
        child2_pid
    );

    cleanup_pid_files();
}

#[test]
fn kill_pgid_safe_on_nonexistent_pid() {
    // Should NOT panic — getpgid will return ESRCH which we drop silently via
    // `let _ = …`. We pick a high PID unlikely to exist; even if it does, the
    // function must complete without panicking.
    app_lib::kill_pgid(999_999);
}

#[test]
fn kill_pgid_safe_on_already_dead_pgid() {
    // Spawn a parent that exits immediately. By the time we call kill_pgid,
    // the PID is gone and the OS has reaped or is about to reap it. getpgid
    // returns ESRCH; the function must NOT panic.
    let parent = Command::new("bash")
        .args(["-c", "exit 0"])
        .spawn()
        .expect("failed to spawn quick-exit subprocess");
    let parent_pid = parent.id();

    // Wait for the child to exit AND the parent process tree to reap it.
    // (A short-lived bash exits in <50ms; 250ms is generous slack.)
    thread::sleep(Duration::from_millis(250));

    // Kill_pgid against a process group that no longer exists — must NOT panic.
    app_lib::kill_pgid(parent_pid);
}
