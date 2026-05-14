#!/usr/bin/env node
// scripts/gsd-dev-scan-logs.mjs — D-BR-01 + D-BR-02 npm-script bridge.
//
// Greps .dev-logs/{console,network,perf}.log + .dev-logs/tauri.log for
// entries newer than --since (ISO 8601 timestamp). Prints structured JSON
// to stdout per the contract documented in plan 01.1-04 verify.scan-signals
// consumer + spec.md R3 scenario "Bridge script fails gracefully when dev
// server is down".
//
// Exits 1 with structured stderr JSON on:
//   - dev-server.pid missing (D-BR-02)
//   - invalid --since (not parseable as ISO 8601 / Date)
//
// Malformed log lines are silently skipped (DoS mitigation T-01.1-07-01):
// the Rust-side writer task (plan 01.1-06 D-SF-04) swallows IO errors, so
// the consumer side mirrors that philosophy — a single bad line never
// crashes the scan.
//
// Args:
//   --since <iso-ts>   filter cutoff (ISO 8601 datetime, e.g.
//                      2026-05-12T00:00:00Z). Required.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// --- argv parsing ---
const argv = process.argv.slice(2);
let since = '';
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--since' && argv[i + 1]) {
    since = argv[i + 1];
    i += 1;
  } else if (a.startsWith('--since=')) {
    since = a.split('=')[1];
  }
}

// Validate --since if provided. We accept ANY string Date.parse() understands
// (so 2026-05-12 OR 2026-05-12T00:00:00Z OR 2026-05-12T00:00:00+10:00 all work).
let sinceMs = 0;
if (since) {
  sinceMs = Date.parse(since);
  if (Number.isNaN(sinceMs)) {
    process.stderr.write(
      JSON.stringify({
        error: `invalid --since: ${since}`,
        hint: 'use ISO 8601 like 2026-05-12T00:00:00Z'
      }) + '\n'
    );
    process.exit(1);
  }
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

// --- parsers (one per log file) ---
//
// console.log format (plan 01.1-06 writer task):
//   [FRONTEND_CONSOLE]<TAG>|<ISO-TS>|<MESSAGE>|<SOURCE>[:<LINE>]|
// where TAG ∈ {LOG, INFO, DEBUG, WARN, ERROR, UNCAUGHT, UNHANDLED-REJECTION,
// RESOURCE-ERROR, CSP}. Source may itself contain colons (file paths) — we
// take the trailing :<digits> as the line number if present, otherwise the
// whole source segment.
function parseConsoleLine(line) {
  if (!line.startsWith('[FRONTEND_CONSOLE]')) return null;
  const rest = line.slice('[FRONTEND_CONSOLE]'.length);
  // Split on | into at most 4 fields: tag, ts, message, sourceWithLine.
  const parts = rest.split('|');
  // Need at least TAG + TS + MESSAGE + SOURCE (4 pipe-separated fields,
  // possibly with a trailing empty piece from the terminating |).
  if (parts.length < 4) return null;
  const tagRaw = parts[0];
  if (!tagRaw || !/^[A-Z-]+$/.test(tagRaw)) return null;
  const ts = parts[1];
  if (!ts) return null;
  // WR-01: format_console_entry escapes `|` in message as `<PIPE>` to prevent
  // field-split corruption. Unescape here so callers see the original text.
  const message = parts[2].replace(/<PIPE>/g, '|');
  const sourceWithLine = parts[3];
  // Extract line number if trailing :<digits>
  let source = sourceWithLine;
  let lineNo = null;
  const colonIdx = sourceWithLine.lastIndexOf(':');
  if (colonIdx > 0 && /^\d+$/.test(sourceWithLine.slice(colonIdx + 1))) {
    source = sourceWithLine.slice(0, colonIdx);
    lineNo = Number(sourceWithLine.slice(colonIdx + 1));
  }
  const tag = tagRaw.toLowerCase();
  // Map tag to logical level. The 5 stdlib console levels map directly;
  // synthetic tags (uncaught / unhandled-rejection / resource-error / csp)
  // map to 'error' or 'warn' for the summary classifier.
  const level = ['log', 'info', 'debug', 'warn', 'error'].includes(tag) ? tag : 'error';
  return { level, tag, ts, message, source, line: lineNo };
}

// network.log format (plan 01.1-06 writer task):
//   [FRONTEND_NETWORK]<METHOD>|<ISO-TS>|<URL>|<STATUS>|<DURATION_MS>ms
function parseNetworkLine(line) {
  if (!line.startsWith('[FRONTEND_NETWORK]')) return null;
  const m = line.match(
    /^\[FRONTEND_NETWORK\]([A-Z]+)\|([^|]+)\|([^|]+)\|(\d+)\|([\d.]+)ms$/
  );
  if (!m) return null;
  return {
    method: m[1],
    ts: m[2],
    url: m[3],
    status: Number(m[4]),
    duration_ms: Number(m[5])
  };
}

// perf.log format (plan 01.1-06 writer task):
//   [FRONTEND_PERF]<METRIC>|<ISO-TS>|<VALUE>
function parsePerfLine(line) {
  if (!line.startsWith('[FRONTEND_PERF]')) return null;
  const m = line.match(/^\[FRONTEND_PERF\]([^|]+)\|([^|]+)\|([\d.]+)$/);
  if (!m) return null;
  const value = Number(m[3]);
  if (!Number.isFinite(value)) return null;
  return { metric: m[1], ts: m[2], value };
}

function entryIsAfterSince(ts) {
  if (!sinceMs) return true;
  const entryMs = Date.parse(ts);
  // Malformed timestamp — be permissive and include it (the scan-logs caller
  // can decide what to do; we don't drop telemetry just because the writer
  // emitted a bad timestamp).
  if (Number.isNaN(entryMs)) return true;
  return entryMs >= sinceMs;
}

// --- main scan ---
const devLogsDir = resolve(process.cwd(), '.dev-logs');
const issues = [];
const summary = {
  console_errors: 0,
  console_warnings: 0,
  network_failures: 0,
  perf_concerns: 0
};

function scanFile(filename, parser, classifyFn) {
  const path = join(devLogsDir, filename);
  if (!existsSync(path)) return;
  // Read line by line. Empty / whitespace-only lines are filtered upfront so
  // the parser never has to think about them. We use a try/catch per line
  // even though the parsers are designed to return null on bad input — this
  // is belt-and-suspenders against future parser regressions accidentally
  // throwing on a malformed line (T-01.1-07-01 mitigation).
  const content = readFileSync(path, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  for (const line of lines) {
    let parsed = null;
    try {
      parsed = parser(line);
    } catch {
      // Defensive — parser threw on unexpected input; skip silently.
      parsed = null;
    }
    if (parsed && entryIsAfterSince(parsed.ts)) {
      issues.push({ ...parsed, log_file: filename });
      classifyFn(parsed);
    }
  }
}

scanFile('console.log', parseConsoleLine, (e) => {
  if (
    e.level === 'error' ||
    e.tag === 'uncaught' ||
    e.tag === 'unhandled-rejection' ||
    e.tag === 'resource-error'
  ) {
    summary.console_errors += 1;
  } else if (e.level === 'warn' || e.tag === 'csp') {
    summary.console_warnings += 1;
  }
});
scanFile('network.log', parseNetworkLine, (e) => {
  if (e.status === 0 || e.status >= 400) summary.network_failures += 1;
});
scanFile('perf.log', parsePerfLine, (e) => {
  // LCP > 2500 → outside CWV "good" threshold. Longtask > 50ms → blocks main
  // thread. These match the dev-feedback-loop "what's worth surfacing"
  // intuition; future calibration via dogfood data.
  if (
    (e.metric === 'largest-contentful-paint' && e.value > 2500) ||
    (e.metric === 'longtask' && e.value > 50)
  ) {
    summary.perf_concerns += 1;
  }
});

// tauri.log is unstructured (Cargo / WRY stdout / stderr). We surface any
// line matching error / panic / warning as a raw issue so the verify-work
// step gets at least a flag, even though the parser can't break it down.
const tauriLogPath = join(devLogsDir, 'tauri.log');
if (existsSync(tauriLogPath)) {
  const lines = readFileSync(tauriLogPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  for (const line of lines) {
    if (/error|panic|warning/i.test(line)) {
      issues.push({ raw: line, log_file: 'tauri.log' });
    }
  }
}

process.stdout.write(JSON.stringify({ issues, summary, since: since || null }) + '\n');
