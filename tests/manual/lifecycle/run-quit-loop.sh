#!/usr/bin/env bash
# tests/manual/lifecycle/run-quit-loop.sh — REQ-3 5-cycle orphan-count gate.
#
# Per RESEARCH §Wave 3 step 4 + SPEC L134-135 + AMENDMENT Cycle-2 HIGH-2.
#
# Manual-only — runs on the developer's MacBook Pro before declaring Phase 1
# complete. CI lacks macOS WKWebView privileges to drive a real Tauri window.
#
# Cycle-2 HIGH-2 (Codex review fix): the previous iteration sent SIGTERM to
# the `npm run tauri dev` wrapper PID. That signal kills the Node wrapper
# subtree, which DOES bring children down — but it does NOT fire Tauri 2's
# `RunEvent::ExitRequested` hook on macOS, which is what the production
# Cmd+Q path actually exercises. The harness was therefore not testing the
# T-1-01 / REQ-3 acceptance gate it claimed to gate. Replaced SIGTERM with
# `osascript -e 'tell application "Mneme" to quit'` (macOS native quit —
# fires the same notification chain as Cmd+Q). Added a pre-assert that
# `claude --print` is actually running before the quit (so the test is not
# a no-op when claude failed to spawn) and a post-assert that the claude
# subprocess(es) exit within 2.5s (matches REQ-3 SIGTERM→2s→SIGKILL window).
#
# Modes:
#   ./run-quit-loop.sh                  → --auto (default; no UI driving;
#                                         pre-assert is best-effort and prints
#                                         a warning if no claude is detected)
#   ./run-quit-loop.sh --with-prompt    → manual: developer types one prompt per cycle,
#                                         pre-assert is BLOCKING (the harness
#                                         refuses to quit until claude is live).

set -uo pipefail

MODE="${1:---auto}"
CYCLES=5
BOOT_WAIT_SECONDS=15
QUIT_DEADLINE_SECONDS=2.5    # REQ-3 SIGTERM(0s) → 2s grace → SIGKILL → settle = ≤ 2.5s
POLL_INTERVAL_MS=100         # 25 polls × 100ms = 2.5s window

CUMULATIVE_ORPHANS=0
CUMULATIVE_QUIT_DEADLINE_MISSES=0

# WR-12 fix (2026-05-14): the orphan grep used to also match `[m]cp[ -]`,
# `[r]g[ -]`, and `[r]ipgrep` — patterns that fire on ANY rg/ripgrep/mcp
# process in `ps aux`, including the developer's IDE searching the project
# or a separate Claude Code session in another terminal. Scope the count to
# `claude --print` only (the Phase 1 subprocess of interest). MCP / rg /
# ripgrep orphans are a Phase 1.x concern (when MCP integration ships) and
# can be added back as a separate, narrower selector at that point.
orphan_count() {
  ps aux \
    | grep -E "[c]laude --print" \
    | grep -v "grep -E" \
    | wc -l \
    | tr -d ' '
}

claude_print_pid_count() {
  # Count of currently-live `claude --print` subprocesses (the Phase 1
  # subprocess of interest; spawned by ChatPanel via Command.create).
  pgrep -f "claude --print" 2>/dev/null | wc -l | tr -d ' '
}

cleanup_existing_orphans() {
  echo "[lifecycle] pre-flight orphan probe..."
  local pre_count
  pre_count="$(orphan_count)"
  if [[ "$pre_count" != "0" ]]; then
    echo "[lifecycle] WARNING: $pre_count pre-existing orphan(s) detected before harness starts."
    echo "[lifecycle] Listing for manual review:"
    ps aux | grep -E "[c]laude --print" | grep -v "grep -E"
    echo "[lifecycle] Run 'pkill -f \"claude --print\"' to clean these up, or proceed with awareness."
    read -r -p "Proceed anyway? (y/N) " ans
    if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
      exit 1
    fi
  fi
  echo "[lifecycle] Pre-flight OK ($pre_count orphans)."
}

# AppleScript-driven quit. Fires the same NSApplicationTerminate path as
# user-initiated Cmd+Q, which is what `RunEvent::ExitRequested` listens for
# in plan 01-04's lib.rs hook union. We try `tell application ... to quit`
# first (graceful native quit). If the app does not respond within 0.5s
# (e.g. window not yet registered with the macOS app menu), fall back to
# `tell application "System Events" to keystroke "q" using command down`
# which simulates the literal Cmd+Q keystroke against the frontmost app.
applescript_quit() {
  # Variant A — native quit verb. Returns immediately; the app starts shutting
  # down asynchronously, which is what the post-assert measures.
  osascript -e 'tell application "Mneme" to quit' 2>/dev/null
  local rc=$?
  if [[ "$rc" != "0" ]]; then
    echo "[lifecycle]   AppleScript 'tell to quit' rc=$rc — falling back to System Events keystroke"
    # Variant B — literal Cmd+Q against frontmost app (System Events).
    # Pre-condition: Mneme is the frontmost app (boot wait should ensure this).
    osascript -e 'tell application "System Events" to keystroke "q" using command down' 2>/dev/null || true
  fi
}

# Wait up to QUIT_DEADLINE_SECONDS (2.5s) for the count of `claude --print`
# subprocesses to drop to 0. Returns 0 if cleanly drained, 1 on deadline miss.
wait_for_claude_drain() {
  local started_with="$1"
  local deadline_polls=25     # 2500ms / 100ms
  local p=0
  while (( p < deadline_polls )); do
    local now
    now="$(claude_print_pid_count)"
    if [[ "$now" == "0" ]]; then
      echo "[lifecycle]   claude drained to 0 PIDs after ~$((p * 100))ms (deadline=2500ms)"
      return 0
    fi
    sleep 0.1
    p=$((p + 1))
  done
  local final
  final="$(claude_print_pid_count)"
  echo "[lifecycle]   FAIL drain — started_with=$started_with PIDs, still=$final after 2500ms (REQ-3 deadline)"
  return 1
}

run_one_cycle() {
  local n="$1"
  echo "[lifecycle] === cycle $n / $CYCLES ==="

  local logfile
  logfile="$(mktemp -t mneme-cycle-XXXXXX.log)"
  npm run tauri dev > "$logfile" 2>&1 &
  local tauri_pid=$!
  echo "[lifecycle]   tauri (npm wrapper) PID: $tauri_pid; log: $logfile"

  echo "[lifecycle]   waiting ${BOOT_WAIT_SECONDS}s for boot..."
  sleep "$BOOT_WAIT_SECONDS"

  if [[ "$MODE" == "--with-prompt" ]]; then
    echo "[lifecycle]   --with-prompt: type a prompt in the Mneme window now (e.g. 'list scratch dir')."
    echo "[lifecycle]   When the response finishes streaming, press ENTER here to continue."
    read -r
  fi

  # PRE-ASSERT (Cycle-2 HIGH-2): claude --print MUST be running. In --auto
  # mode this is best-effort (no UI was driven, so claude may not have spawned
  # — print a warning and continue). In --with-prompt mode this is BLOCKING
  # — refuse to send Cmd+Q if the test isn't actually exercising the kill
  # path (false-positive prevention).
  local pre_claude
  pre_claude="$(claude_print_pid_count)"
  echo "[lifecycle]   pre-quit claude --print PID count: $pre_claude"
  if [[ "$pre_claude" == "0" ]]; then
    if [[ "$MODE" == "--with-prompt" ]]; then
      echo "[lifecycle]   ABORT: --with-prompt mode requires claude --print to be live before quit."
      echo "[lifecycle]   Did your prompt actually spawn? Check ChatPanel + capability layer."
      kill -TERM "$tauri_pid" 2>/dev/null || true
      rm -f "$logfile"
      exit 1
    else
      echo "[lifecycle]   WARNING (--auto): no claude --print detected pre-quit — orphan probe degraded to a no-op for this cycle."
    fi
  fi

  # CYCLE-2 HIGH-2 — drive the macOS-native Cmd+Q path. This fires the
  # NSApplicationTerminate notification chain that Tauri 2's
  # `RunEvent::ExitRequested` hook listens for. SIGTERM to the dev wrapper
  # (the previous behavior) does NOT fire that hook; it tears down the
  # Node wrapper subtree which is a different code path entirely.
  echo "[lifecycle]   sending AppleScript Cmd+Q (Tauri RunEvent::ExitRequested path)..."
  applescript_quit

  # POST-ASSERT (Cycle-2 HIGH-2): claude --print MUST drop to 0 within 2.5s
  # (matches REQ-3 SIGTERM(0s) → 2s grace → SIGKILL → settle window).
  if [[ "$pre_claude" != "0" ]]; then
    if ! wait_for_claude_drain "$pre_claude"; then
      CUMULATIVE_QUIT_DEADLINE_MISSES=$((CUMULATIVE_QUIT_DEADLINE_MISSES + 1))
    fi
  else
    # No claude was live — skip the drain wait but still allow the app to settle.
    sleep 1
  fi

  local orphans
  orphans="$(orphan_count)"
  echo "[lifecycle]   orphan count after cycle $n: $orphans"
  if [[ "$orphans" != "0" ]]; then
    echo "[lifecycle]   ORPHAN DETAIL:"
    ps aux | grep -E "[c]laude --print" | grep -v "grep -E" || true
    CUMULATIVE_ORPHANS=$((CUMULATIVE_ORPHANS + orphans))
  fi

  # Reap the npm wrapper. AppleScript quit asks the app to exit; the npm
  # wrapper that spawned `tauri dev` will close on its own once the app
  # window goes away, but we cap the wait to keep the harness moving.
  local wait_polls=30
  local w=0
  while kill -0 "$tauri_pid" 2>/dev/null && (( w < wait_polls )); do
    sleep 0.2
    w=$((w + 1))
  done
  if kill -0 "$tauri_pid" 2>/dev/null; then
    echo "[lifecycle]   npm wrapper still running after AppleScript quit; sending SIGTERM (cleanup only)"
    kill -TERM "$tauri_pid" 2>/dev/null || true
  fi
  wait "$tauri_pid" 2>/dev/null || true
  rm -f "$logfile"
}

main() {
  echo "[lifecycle] mneme Phase 1 5-cycle lifecycle harness — REQ-3 gate (Cycle-2 HIGH-2 fix)"
  echo "[lifecycle] mode: $MODE"
  cleanup_existing_orphans

  # Sanity: AppleScript availability (macOS-only). If not present, abort
  # — the SIGTERM path is the very thing Cycle-2 HIGH-2 says is wrong.
  if ! command -v osascript >/dev/null 2>&1; then
    echo "[lifecycle] ABORT: osascript not found. This harness is macOS-only;"
    echo "[lifecycle]        Cycle-2 HIGH-2 requires AppleScript Cmd+Q to fire RunEvent::ExitRequested."
    exit 1
  fi

  for i in $(seq 1 "$CYCLES"); do
    run_one_cycle "$i"
  done

  echo
  echo "[lifecycle] === SUMMARY ==="
  echo "[lifecycle] cumulative orphan count across $CYCLES cycles: $CUMULATIVE_ORPHANS"
  echo "[lifecycle] cumulative quit-deadline misses (claude --print not drained within 2.5s): $CUMULATIVE_QUIT_DEADLINE_MISSES"
  if [[ "$CUMULATIVE_ORPHANS" == "0" && "$CUMULATIVE_QUIT_DEADLINE_MISSES" == "0" ]]; then
    echo "[lifecycle] PASS — REQ-3 5-cycle orphan-count + quit-deadline gate satisfied."
    exit 0
  else
    echo "[lifecycle] FAIL — REQ-3 not satisfied. Diagnose:"
    echo "  - Did Cmd+Q's RunEvent::ExitRequested fire? Check Tauri 2 hook union in src-tauri/src/lib.rs"
    echo "  - Did kill_pgid actually send SIGKILL within 2s? Check the integration test (cargo test --test kill_pgid)"
    echo "  - Did the prompt actually spawn claude? --with-prompt mode is the meaningful test"
    echo "  - Was AppleScript blocked? macOS may need 'System Events' Accessibility permission for the keystroke fallback"
    exit 1
  fi
}

main "$@"
