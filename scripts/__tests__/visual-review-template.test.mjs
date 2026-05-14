// scripts/__tests__/visual-review-template.test.mjs — R7 structural contract tests.
//
// Validates that the GSD upstream visual-review.html template at
// ~/.claude/get-shit-done/templates/visual-review.html satisfies the four
// structural requirements from spec.md R7:
//
//   1. Header section with "Claude has auto-verified" checklist
//   2. Four <section data-bucket="visual|window|motion|perf"> slots
//   3. Inline documentation block listing forbidden buckets and phrasings
//   4. No <section data-bucket= literals in HTML comment blocks (F1 mitigation)
//
// Visual fidelity (KD-13 palette, Fraunces font, etc.) is MANUAL-ONLY per
// project feedback_html_zh_primary_open_not_screenshot.md memory.
// These tests cover structural/contractual properties only.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const TEMPLATE_PATH = join(
  homedir(),
  '.claude',
  'get-shit-done',
  'templates',
  'visual-review.html'
);

const fileExists = existsSync(TEMPLATE_PATH);
const content = fileExists ? readFileSync(TEMPLATE_PATH, 'utf8') : '';

describe('R7 — visual-review.html template: 4-bucket structure', () => {
  it('template file exists at GSD upstream path', () => {
    expect(fileExists, `visual-review.html not found at ${TEMPLATE_PATH}`).toBe(true);
  });

  it('template is substantially sized (> 200 lines)', () => {
    if (!fileExists) return;
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThan(200);
  });

  it('contains <section data-bucket="visual"> slot', () => {
    if (!fileExists) return;
    expect(content).toContain('data-bucket="visual"');
  });

  it('contains <section data-bucket="window"> slot', () => {
    if (!fileExists) return;
    expect(content).toContain('data-bucket="window"');
  });

  it('contains <section data-bucket="motion"> slot', () => {
    if (!fileExists) return;
    expect(content).toContain('data-bucket="motion"');
  });

  it('contains <section data-bucket="perf"> slot', () => {
    if (!fileExists) return;
    expect(content).toContain('data-bucket="perf"');
  });

  it('contains exactly 4 live data-bucket section elements (none in comments)', () => {
    if (!fileExists) return;
    // Strip HTML comments before counting to verify F1 mitigation is in place.
    // The Living visual contract cycle-2 fix removed <section data-bucket= literals
    // from doc-block comments. This assertion ensures they have not crept back.
    const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '');
    const bucketMatches = withoutComments.match(/<section\b[^>]*\bdata-bucket=/g) || [];
    expect(bucketMatches.length).toBe(4);
  });
});

describe('R7 — visual-review.html template: header + auto-verified section', () => {
  it('contains auto-verified header element (class or text)', () => {
    if (!fileExists) return;
    // The Living visual contract uses .auto-verified or equivalent.
    const hasClass = content.includes('auto-verified');
    const hasText = content.includes('已自动核验') || content.includes('auto-verified');
    expect(hasClass || hasText).toBe(true);
  });
});

describe('R7 — visual-review.html template: inline forbidden-bucket documentation', () => {
  it('documents forbidden bucket "hybrid" in prose (not as a live data-bucket)', () => {
    if (!fileExists) return;
    // Must appear in prose/comment documentation, not as a live section attribute.
    expect(content).toContain('hybrid');
    // But not as a live section attribute.
    const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '');
    expect(withoutComments).not.toContain('data-bucket="hybrid"');
  });

  it('documents forbidden bucket "terminal" in prose', () => {
    if (!fileExists) return;
    expect(content).toContain('terminal');
    const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '');
    expect(withoutComments).not.toContain('data-bucket="terminal"');
  });

  it('documents forbidden bucket "console" in prose', () => {
    if (!fileExists) return;
    expect(content).toContain('console');
    const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '');
    expect(withoutComments).not.toContain('data-bucket="console"');
  });

  it('documents forbidden bucket "dom-check" in prose', () => {
    if (!fileExists) return;
    expect(content).toContain('dom-check');
    const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '');
    expect(withoutComments).not.toContain('data-bucket="dom-check"');
  });

  it('F1 mitigation: no <section data-bucket= inside HTML comment blocks', () => {
    if (!fileExists) return;
    // F1 (cycle-1 dogfood bug): the validate-html SDK regex matched
    // <section data-bucket="visual"> inside <!-- --> comments, producing
    // a false-positive bucket count. The cycle-2 rewrite removed all such
    // literals from comments. This assertion catches any regression.
    const commentMatches = content.match(/<!--[\s\S]*?-->/g) || [];
    for (const comment of commentMatches) {
      expect(comment).not.toMatch(/<section\b[^>]*\bdata-bucket=/);
    }
  });
});

describe('R7 — visual-review.html template: gitignore contract (R8)', () => {
  it('.planning/handoff/*-verify.html is gitignored in mneme repo', () => {
    // R8: the rendered HTML files must never be committed.
    const gitignorePath = join(process.cwd(), '.gitignore');
    const gitignoreContent = existsSync(gitignorePath)
      ? readFileSync(gitignorePath, 'utf8')
      : '';
    // Either a glob covering *-verify.html or the specific pattern
    const coversVerifyHtml =
      gitignoreContent.includes('*-verify.html') ||
      gitignoreContent.includes('.planning/handoff/');
    expect(coversVerifyHtml, '.gitignore must cover *-verify.html pattern for R8 ephemeral guarantee').toBe(true);
  });
});
