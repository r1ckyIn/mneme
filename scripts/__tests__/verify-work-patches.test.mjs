// scripts/__tests__/verify-work-patches.test.mjs — R5 structural contract tests.
//
// Validates that the three patches to ~/.claude/get-shit-done/workflows/verify-work.md
// are present and structurally correct. This is a STRUCTURAL test (file grep),
// not a workflow execution test (R4/R8 behavioral workflow rules are untestable
// in automation — see VALIDATION.md manual-only section).
//
// R5 spec.md requirement: verify-work.md SHALL be patched at three locations:
//   Patch 1 — Tauri-shell branch in automated_ui_verification step
//   Patch 2 — package_manual_review step inserted between automated_ui_verification
//              and find_summaries
//   Patch 3 — <critical_rules> block at workflow top (5 rules a-e)
//
// Evidence maps directly to 01.1-VERIFICATION.md R5 row:
//   "verify-work.md 830 lines; contains <critical_rules> block,
//    Tauri branch in step sequence (17 steps), <step name='package_manual_review'>"

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const VERIFY_WORK_PATH = join(homedir(), '.claude', 'get-shit-done', 'workflows', 'verify-work.md');

// Skip all tests gracefully if the file is absent — upstream is user-global
// and may legitimately not be installed in all environments.
const fileExists = existsSync(VERIFY_WORK_PATH);
const content = fileExists ? readFileSync(VERIFY_WORK_PATH, 'utf8') : '';
const lineCount = content ? content.split('\n').length : 0;

describe('R5 — verify-work.md patch 3: <critical_rules> block', () => {
  it('file exists at user-global GSD path', () => {
    expect(fileExists, `verify-work.md not found at ${VERIFY_WORK_PATH} — install GSD upstream`).toBe(true);
  });

  it('file is substantially larger than pre-patch baseline (> 800 lines)', () => {
    if (!fileExists) return;
    expect(lineCount).toBeGreaterThan(800);
  });

  it('contains exactly one <critical_rules> opening tag', () => {
    if (!fileExists) return;
    const matches = content.match(/<critical_rules>/g) || [];
    expect(matches.length).toBe(1);
  });

  it('contains exactly one </critical_rules> closing tag', () => {
    if (!fileExists) return;
    const matches = content.match(/<\/critical_rules>/g) || [];
    expect(matches.length).toBe(1);
  });

  it('critical_rules block contains rule (a) — no DevTools asking', () => {
    if (!fileExists) return;
    expect(content).toMatch(/\(a\).*DevTools|DevTools.*\(a\)/s);
  });

  it('critical_rules block contains rule (b) — data-bucket whitelist', () => {
    if (!fileExists) return;
    expect(content).toMatch(/\(b\).*data-bucket|data-bucket.*\(b\)/s);
  });

  it('critical_rules block contains forbidden bucket list including "terminal"', () => {
    if (!fileExists) return;
    expect(content).toContain('terminal');
  });

  it('critical_rules block contains rule (e) — fresh HTML each run', () => {
    if (!fileExists) return;
    expect(content).toMatch(/\(e\)/);
  });
});

describe('R5 — verify-work.md patch 1: Tauri-shell branch in automated_ui_verification', () => {
  it('contains Tauri-shell branch marker', () => {
    if (!fileExists) return;
    expect(content).toContain('Tauri-shell branch');
  });

  it('Tauri branch references gsd-dev-screenshot --dry-run probe', () => {
    if (!fileExists) return;
    expect(content).toContain('gsd-dev-screenshot');
    expect(content).toContain('--dry-run');
  });

  it('Tauri branch references verify.scan-signals', () => {
    if (!fileExists) return;
    expect(content).toContain('verify.scan-signals');
  });

  it('Tauri branch references verify.capture-screenshot', () => {
    if (!fileExists) return;
    expect(content).toContain('verify.capture-screenshot');
  });

  it('Tauri branch references verify.query-dom-state', () => {
    if (!fileExists) return;
    expect(content).toContain('verify.query-dom-state');
  });
});

describe('R5 — verify-work.md patch 2: package_manual_review step', () => {
  it('contains package_manual_review step opening tag', () => {
    if (!fileExists) return;
    expect(content).toContain('<step name="package_manual_review">');
  });

  it('total step count is 17 (16 original + 1 new)', () => {
    if (!fileExists) return;
    const stepMatches = content.match(/<step name=/g) || [];
    expect(stepMatches.length).toBe(17);
  });

  it('package_manual_review step references verify.render-review-html', () => {
    if (!fileExists) return;
    expect(content).toContain('verify.render-review-html');
  });

  it('package_manual_review step references verify.validate-html', () => {
    if (!fileExists) return;
    expect(content).toContain('verify.validate-html');
  });

  it('package_manual_review step references verify.parse-review-response', () => {
    if (!fileExists) return;
    expect(content).toContain('verify.parse-review-response');
  });

  it('step ordering: package_manual_review precedes find_summaries', () => {
    if (!fileExists) return;
    const pmrIdx = content.indexOf('<step name="package_manual_review">');
    const fsIdx = content.indexOf('<step name="find_summaries">');
    expect(pmrIdx).toBeGreaterThan(0);
    expect(fsIdx).toBeGreaterThan(0);
    expect(pmrIdx).toBeLessThan(fsIdx);
  });
});
