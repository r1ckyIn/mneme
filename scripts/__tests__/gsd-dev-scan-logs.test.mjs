// scripts/__tests__/gsd-dev-scan-logs.test.mjs — D-BR-01/02 + R3 contract.
//
// Vitest scenarios for the scan-logs npm-script bridge. Per PATTERNS.md L302-336
// the test layout mirrors tests/sanitize.test.ts (describe + beforeEach + it).
// Each test spawns the script via spawnSync against an isolated tempdir so the
// real .dev-logs/ in the worktree stays untouched.

import { describe, it, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(process.cwd(), 'scripts', 'gsd-dev-scan-logs.mjs');

function runScan(args, cwd) {
  return spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mneme-scan-'));
  mkdirSync(join(dir, '.dev-logs'), { recursive: true });
});

describe('gsd-dev-scan-logs — D-BR-02 + R3 contract', () => {
  it('exits 1 with structured stderr when dev server pid file missing', () => {
    const r = runScan(['--since', '2026-05-12T00:00:00Z'], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload).toMatchObject({ error: 'dev server not running' });
    expect(payload.hint).toContain('verify.start-dev-loop');
  });

  it('returns empty issues when no log files exist and pid file present', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const r = runScan(['--since', '2026-05-12T00:00:00Z'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload.issues).toEqual([]);
    expect(payload.summary).toMatchObject({
      console_errors: 0,
      network_failures: 0,
      perf_concerns: 0
    });
    expect(payload.since).toBe('2026-05-12T00:00:00Z');
  });

  it('filters console.log entries by --since timestamp', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    writeFileSync(
      join(dir, '.dev-logs', 'console.log'),
      [
        // IN-02 fix: no trailing | — matches actual format_console_entry output
        '[FRONTEND_CONSOLE]ERROR|2026-05-11T23:00:00Z|too-old|x.ts:1',
        '[FRONTEND_CONSOLE]ERROR|2026-05-12T10:00:00Z|fresh1|x.ts:42',
        '[FRONTEND_CONSOLE]ERROR|2026-05-12T11:00:00Z|fresh2|x.ts:43'
      ].join('\n') + '\n'
    );
    const r = runScan(['--since', '2026-05-12T00:00:00Z'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload.issues.length).toBe(2);
    expect(payload.summary.console_errors).toBe(2);
    expect(payload.issues[0].message).toContain('fresh');
    expect(payload.issues.every((iss) => iss.log_file === 'console.log')).toBe(true);
  });

  it('parses network.log entries with status + duration_ms', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    writeFileSync(
      join(dir, '.dev-logs', 'network.log'),
      '[FRONTEND_NETWORK]GET|2026-05-12T10:00:00Z|/api/foo|500|12.5ms\n'
    );
    const r = runScan(['--since', '2026-05-12T00:00:00Z'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload.issues.length).toBe(1);
    expect(payload.issues[0]).toMatchObject({
      method: 'GET',
      url: '/api/foo',
      status: 500,
      duration_ms: 12.5,
      log_file: 'network.log'
    });
    expect(payload.summary.network_failures).toBe(1);
  });

  it('parses perf.log entries with metric + value', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    writeFileSync(
      join(dir, '.dev-logs', 'perf.log'),
      '[FRONTEND_PERF]largest-contentful-paint|2026-05-12T10:00:00Z|3200\n'
    );
    const r = runScan(['--since', '2026-05-12T00:00:00Z'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload.issues.length).toBe(1);
    expect(payload.issues[0]).toMatchObject({
      metric: 'largest-contentful-paint',
      value: 3200,
      log_file: 'perf.log'
    });
    expect(payload.summary.perf_concerns).toBe(1);
  });

  it('exits 1 on invalid --since timestamp', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const r = runScan(['--since', 'not-a-date'], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload.error).toContain('invalid --since');
  });

  it('skips malformed log lines without crashing (prompt R3 contract)', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    // Mix valid + malformed lines across all three log types. Malformed
    // lines (wrong tag, missing fields, garbage) should be silently dropped.
    writeFileSync(
      join(dir, '.dev-logs', 'console.log'),
      [
        'garbage line with no tag at all',
        '[FRONTEND_CONSOLE]ERROR|2026-05-12T10:00:00Z|good|x.ts:42',
        '[FRONTEND_CONSOLE]incomplete',
        '[FRONTEND_NETWORK]wrong-file-content',
        '' // blank line
      ].join('\n') + '\n'
    );
    writeFileSync(
      join(dir, '.dev-logs', 'network.log'),
      [
        '[FRONTEND_NETWORK]GET|2026-05-12T10:00:00Z|/api/ok|200|5ms',
        '[FRONTEND_NETWORK]totally-wrong',
        '   ',
        '[FRONTEND_NETWORK]POST|2026-05-12T10:00:01Z|/api/fail|503|100ms'
      ].join('\n') + '\n'
    );
    writeFileSync(
      join(dir, '.dev-logs', 'perf.log'),
      [
        'plain garbage',
        '[FRONTEND_PERF]largest-contentful-paint|2026-05-12T10:00:00Z|3200',
        '[FRONTEND_PERF]bad|no-value-just-letters|notanumber'
      ].join('\n') + '\n'
    );
    const r = runScan(['--since', '2026-05-12T00:00:00Z'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    // 1 valid console + 2 valid network + 1 valid perf = 4 issues total
    expect(payload.issues.length).toBe(4);
    expect(payload.summary.console_errors).toBe(1);
    // 503 counts as a failure; 200 does not — only 1 network_failure
    expect(payload.summary.network_failures).toBe(1);
    expect(payload.summary.perf_concerns).toBe(1);
  });
});
