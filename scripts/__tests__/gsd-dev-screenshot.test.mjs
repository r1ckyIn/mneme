// scripts/__tests__/gsd-dev-screenshot.test.mjs — R3 + WR-03 gap coverage.
//
// Tests for gsd-dev-screenshot.mjs covering spec.md R3 behavioral requirements:
//   1. Missing pid file → exits 1 with D-BR-02 envelope (dev server not running)
//   2. Unknown surface arg → exits 2 with structured error
//   3. --dry-run with pid present → exits 0 with {ready: true, surface}
//   4. --dry-run with pid missing → exits 1 (D-BR-02 check applies to probe too)
//   5. Missing dev-invoke binary (pid present, not dry-run) → exits 1 with structured error
//   6. Successful dev-invoke execution → prints PNG path to stdout
//
// Tests use an isolated tempdir so the real .dev-logs/ in the worktree stays
// untouched. Pattern mirrors gsd-dev-snapshot.test.mjs (spawnSync + tempdir).

import { describe, it, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(process.cwd(), 'scripts', 'gsd-dev-screenshot.mjs');

function runScreenshot(args, cwd) {
  return spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mneme-screenshot-'));
  mkdirSync(join(dir, '.dev-logs'), { recursive: true });
});

describe('gsd-dev-screenshot — D-BR-02 + R3 contract', () => {
  it('exits 1 with D-BR-02 structured stderr when dev server pid file missing', () => {
    // R3 requirement: script fails gracefully when dev server is down
    const r = runScreenshot([], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload).toMatchObject({ error: 'dev server not running' });
    expect(payload.hint).toContain('verify.start-dev-loop');
  });

  it('exits 2 with structured stderr when surface arg is unknown', () => {
    // Unknown surface is a caller error — exit 2, not 1
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const r = runScreenshot(['--surface', 'electron'], dir);
    expect(r.status).toBe(2);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload.error).toContain('unknown surface');
    expect(payload.hint).toContain('webview');
  });

  it('--dry-run with pid present exits 0 and returns {ready:true, surface}', () => {
    // R3 scenario: verify-work patch 1 probes TAURI_CAPABLE via --dry-run
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const r = runScreenshot(['--dry-run'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload).toMatchObject({ ready: true, surface: 'webview' });
    expect(r.stderr.trim()).toBe('');
  });

  it('--dry-run with --surface window returns correct surface value', () => {
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const r = runScreenshot(['--dry-run', '--surface', 'window'], dir);
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload).toMatchObject({ ready: true, surface: 'window' });
  });

  it('--dry-run exits 1 (D-BR-02) when pid file is missing — probe requires running dev server', () => {
    // The --dry-run is a CAPABILITY probe, not a script-load probe.
    // The D-BR-02 check fires before the dry-run short-circuit, so missing pid
    // still returns exit 1 with the D-BR-02 envelope.
    const r = runScreenshot(['--dry-run'], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload).toMatchObject({ error: 'dev server not running' });
  });

  it('exits 1 with structured stderr when dev-invoke binary is absent', () => {
    // pid present but dev-invoke binary missing → binary-missing branch
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    // No src-tauri/target/debug/dev-invoke in tempdir → missing binary
    const r = runScreenshot([], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload.error).toContain('dev-invoke binary missing');
    expect(payload.hint).toMatch(/cargo build/);
  });

  it('prints PNG path to stdout when dev-invoke succeeds', () => {
    // Simulate a successful invocation using a fake dev-invoke script that
    // prints a PNG path and exits 0 — mirrors the real binary's success path.
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const fakeDevInvokeDir = join(dir, 'src-tauri', 'target', 'debug');
    mkdirSync(fakeDevInvokeDir, { recursive: true });
    const fakeDevInvoke = join(fakeDevInvokeDir, 'dev-invoke');
    const fakePngPath = join(dir, '.dev-logs', 'screenshots', '2026-05-14T10:00:00Z.png');
    writeFileSync(fakeDevInvoke, `#!/bin/sh\necho "${fakePngPath}"\nexit 0\n`);
    chmodSync(fakeDevInvoke, 0o755);

    const r = runScreenshot([], dir);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(fakePngPath);
    expect(r.stderr.trim()).toBe('');
  });

  it('propagates structured stderr from dev-invoke on failure', () => {
    // When dev-invoke exits non-zero with a structured JSON envelope on stderr,
    // the bridge must forward it unchanged (D-BR-02 passthrough).
    writeFileSync(join(dir, '.dev-logs', 'dev-server.pid'), '12345');
    const fakeDevInvokeDir = join(dir, 'src-tauri', 'target', 'debug');
    mkdirSync(fakeDevInvokeDir, { recursive: true });
    const fakeDevInvoke = join(fakeDevInvokeDir, 'dev-invoke');
    const structuredError = JSON.stringify({
      error: 'screencapture failed',
      hint: 'window not found'
    });
    writeFileSync(
      fakeDevInvoke,
      `#!/bin/sh\necho '${structuredError}' >&2\nexit 1\n`
    );
    chmodSync(fakeDevInvoke, 0o755);

    const r = runScreenshot([], dir);
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stderr.trim());
    expect(payload).toMatchObject({ error: 'screencapture failed' });
    expect(payload.hint).toContain('window not found');
  });
});
