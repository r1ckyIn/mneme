#!/usr/bin/env node
// scripts/gsd-dev-snapshot.mjs — D-BR-01 + D-BR-02 npm-script bridge.
//
// Triggers dev-invoke dev_query_state, which (per plan 01.1-06 v1 path) drops
// .dev-logs/snapshot.request that the running Tauri app polls. The app
// evaluates globalThis.__mnemeDevSnapshot__() in the webview and writes a
// [snapshot]<json> line into .dev-logs/console.log via dev_log_console_entry.
// This helper waits briefly for that line to appear and prints the JSON
// payload to stdout. Phase 01.2 UDS upgrade (RESEARCH spike B2) replaces this
// poll-tail dance with a synchronous round-trip.
//
// Exits non-zero with structured stderr JSON when:
//   - the dev server is not running (.dev-logs/dev-server.pid missing) — D-BR-02
//   - the dev-invoke binary has not been built yet
//   - dev-invoke itself reports a non-zero exit (envelope propagated)
//   - no [snapshot] line appears within DEADLINE_MS (default 3000ms)
//
// Args:
//   --timeout <ms>   override the wait deadline (default 3000)

import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
let deadlineMs = 3000;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--timeout' && argv[i + 1]) {
    deadlineMs = Number(argv[i + 1]);
    i += 1;
  } else if (a.startsWith('--timeout=')) {
    deadlineMs = Number(a.split('=')[1]);
  }
}
if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) {
  process.stderr.write(
    JSON.stringify({
      error: 'invalid --timeout',
      hint: 'pass a positive integer (ms)'
    }) + '\n'
  );
  process.exit(2);
}

// D-BR-02 — fail loud if dev server not running.
const pidPath = resolve(process.cwd(), '.dev-logs', 'dev-server.pid');
if (!existsSync(pidPath)) {
  process.stderr.write(
    JSON.stringify({
      error: 'dev server not running',
      hint: 'run gsd-sdk query verify.start-dev-loop first'
    }) + '\n'
  );
  process.exit(1);
}

const consoleLog = resolve(process.cwd(), '.dev-logs', 'console.log');
const startSize = existsSync(consoleLog) ? statSync(consoleLog).size : 0;
const startTs = Date.now();

const devInvoke = resolve(process.cwd(), 'src-tauri', 'target', 'debug', 'dev-invoke');
if (!existsSync(devInvoke)) {
  process.stderr.write(
    JSON.stringify({
      error: 'dev-invoke binary missing',
      hint: "run 'cd src-tauri && cargo build --bin dev-invoke --features dev-invoke' first"
    }) + '\n'
  );
  process.exit(1);
}

// Trigger the snapshot. The v1 dev-invoke binary writes
// .dev-logs/snapshot.request and prints a hint JSON to stdout; the running
// Tauri app picks up the request and writes [snapshot]<json> to console.log.
const trigger = spawnSync(devInvoke, ['dev_query_state'], { encoding: 'utf8' });
if (trigger.status !== 0) {
  const stderr = (trigger.stderr || '').trim();
  if (stderr.startsWith('{')) {
    process.stderr.write(stderr + '\n');
  } else {
    process.stderr.write(
      JSON.stringify({
        error: 'dev-invoke dev_query_state failed',
        stderr,
        status: trigger.status
      }) + '\n'
    );
  }
  process.exit(trigger.status || 1);
}

// Poll console.log for the new [snapshot]<json> line. We only look at bytes
// written AFTER the trigger fired so we don't accidentally return a stale
// snapshot from a previous run.
const POLL_INTERVAL_MS = 80;
let snapshot = null;
while (Date.now() - startTs < deadlineMs) {
  if (existsSync(consoleLog)) {
    const newSize = statSync(consoleLog).size;
    if (newSize > startSize) {
      const tail = readFileSync(consoleLog, 'utf8').slice(startSize);
      // Match the LAST [snapshot]<json> in the tail (most recent wins).
      // The JSON payload itself may contain { and }, so we match greedy.
      //
      // HG-01 fix: format_console_entry emits
      //   [FRONTEND_CONSOLE]SNAPSHOT|<ts>|[snapshot]{...json...}|<source>\n
      // so after the closing } comes `|` (empty source delimiter), NOT \n.
      // Accept either `|` or whitespace/EOL as a valid terminator.
      const matches = [...tail.matchAll(/\[snapshot\](\{[\s\S]*?\})(?:\||\s*(?:$|\n))/gm)];
      if (matches.length > 0) {
        snapshot = matches[matches.length - 1][1];
        break;
      }
    }
  }
  // Busy-wait to keep the helper fully synchronous (no event loop scheduling
  // surprises when invoked from npm run). Cost is ~80ms per spin which is
  // acceptable for a polling script with a 3s deadline.
  const wakeAt = Date.now() + POLL_INTERVAL_MS;
  while (Date.now() < wakeAt) {
    /* spin */
  }
}

if (!snapshot) {
  process.stderr.write(
    JSON.stringify({
      error: 'timeout waiting for snapshot',
      hint: '__mnemeDevSnapshot__ may not be registered in the running webview; or the app is not polling .dev-logs/snapshot.request',
      deadline_ms: deadlineMs
    }) + '\n'
  );
  process.exit(1);
}

process.stdout.write(snapshot + '\n');
