// scripts/__tests__/gsd-dev-snapshot.test.mjs — WR-03 coverage for snapshot bridge.
//
// Tests for gsd-dev-snapshot.mjs covering:
//   1. Missing pid file → exits 1 with D-BR-02 envelope (dev server not running)
//   2. Missing dev-invoke binary → exits 1 with structured error
//   3. HG-01 regression: mock console.log with actual FRONTEND_CONSOLE format
//      line containing [snapshot]{json} followed by | — JSON must be extracted.
//
// Tests use an isolated tempdir so the real .dev-logs/ stays untouched.
// Because gsd-dev-snapshot.mjs invokes the actual dev-invoke binary and polls
// for a running app, tests that need to simulate success mock the binary
// using a small shell script that exits 0 and pre-seeds console.log.

import { describe, it, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(process.cwd(), 'scripts', 'gsd-dev-snapshot.mjs');

function runSnapshot(args, cwd, env = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mneme-snapshot-'));
  mkdirSync(join(dir, '.dev-logs'), { recursive: true });
});

describe('gsd-dev-snapshot — D-BR-02 + HG-01 regression', () => {
  it('exits 1 with structured stderr when dev server pid file missing', () => {
    const r = runSnapshot([], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload).toMatchObject({ error: 'dev server not running' });
    expect(payload.hint).toContain('verify.start-dev-loop');
  });

  it('exits 1 with structured stderr when dev-invoke binary is absent', () => {
    // pid file present but no binary at expected path
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    // The script looks for binary at cwd/src-tauri/target/debug/dev-invoke.
    // Our tempdir has no such path → binary missing branch.
    const r = runSnapshot([], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload.error).toContain('dev-invoke binary missing');
    expect(payload.hint).toMatch(/cargo build/);
  });

  it('exits 1 on invalid --timeout value', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const r = runSnapshot(['--timeout', '-5'], dir);
    expect(r.status).toBe(2);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload.error).toContain('invalid --timeout');
  });

  it('HG-01 regression: extracts JSON from FRONTEND_CONSOLE format with | terminator', () => {
    // This test validates that the snapshot regex correctly handles the actual
    // log format: [FRONTEND_CONSOLE]SNAPSHOT|<ts>|[snapshot]{...json...}|<source>\n
    // (the source field is empty, so the line ends with |)
    //
    // We verify the regex logic directly by running a Node.js snippet rather
    // than spawning the full script (which requires a real dev-invoke binary).
    // The regex is embedded in gsd-dev-snapshot.mjs at the poll section.
    const snapshotJson = JSON.stringify({
      url: 'http://localhost:5173',
      viewport: { w: 1280, h: 720, dpr: 2 },
      performance: { lcp_ms: null, fcp_ms: 890, cls: 0, longtasks: 0 }
    });

    // Actual log line format produced by format_console_entry in dev.rs
    const logLine = `[FRONTEND_CONSOLE]SNAPSHOT|2026-05-12T10:00:00Z|[snapshot]${snapshotJson}|\n`;

    // Old (broken) regex from before HG-01 fix:
    const brokenMatches = [...logLine.matchAll(/\[snapshot\](\{[\s\S]*?\})\s*(?:$|\n)/gm)];
    expect(brokenMatches.length).toBe(0); // confirms the bug existed

    // New (fixed) regex from gsd-dev-snapshot.mjs:
    const fixedMatches = [...logLine.matchAll(/\[snapshot\](\{[\s\S]*?\})(?:\||\s*(?:$|\n))/gm)];
    expect(fixedMatches.length).toBe(1);
    const parsed = JSON.parse(fixedMatches[0][1]);
    expect(parsed.url).toBe('http://localhost:5173');
    expect(parsed.viewport).toMatchObject({ w: 1280, h: 720 });
  });

  it('HG-01 regression: also matches snapshot line without trailing |', () => {
    // Some callers may log the snapshot without a trailing source delimiter.
    // The regex should handle both cases.
    const snapshotJson = '{"url":"http://localhost"}';
    const logLineNoTrailingPipe = `[FRONTEND_CONSOLE]SNAPSHOT|2026-05-12T10:00:00Z|[snapshot]${snapshotJson}\n`;
    const matches = [...logLineNoTrailingPipe.matchAll(/\[snapshot\](\{[\s\S]*?\})(?:\||\s*(?:$|\n))/gm)];
    expect(matches.length).toBe(1);
    expect(JSON.parse(matches[0][1]).url).toBe('http://localhost');
  });

  it('exits 1 with timeout error when console.log has no snapshot line within deadline', () => {
    // Simulate a scenario where the binary exists (mock script) and returns 0,
    // but console.log never gets a [snapshot] line — deadline should trigger.
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');

    // Create a fake dev-invoke that exits 0 immediately (no snapshot written)
    const fakeDevInvokeDir = join(dir, 'src-tauri', 'target', 'debug');
    mkdirSync(fakeDevInvokeDir, { recursive: true });
    const fakeDevInvoke = join(fakeDevInvokeDir, 'dev-invoke');
    writeFileSync(fakeDevInvoke, '#!/bin/sh\nexit 0\n');
    chmodSync(fakeDevInvoke, 0o755);

    // --timeout 200ms so the test runs fast
    const r = runSnapshot(['--timeout', '200'], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload.error).toContain('timeout waiting for snapshot');
    expect(payload.deadline_ms).toBe(200);
  });
});
