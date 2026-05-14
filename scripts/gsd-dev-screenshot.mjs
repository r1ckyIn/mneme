#!/usr/bin/env node
// scripts/gsd-dev-screenshot.mjs — D-BR-01 + D-BR-02 npm-script bridge.
//
// Invokes src-tauri/target/debug/dev-invoke dev_capture_screenshot <scope>
// per E2 errata + plan 01.1-06. Prints the PNG path returned by dev-invoke
// to stdout on success; exits non-zero with structured stderr JSON when the
// dev server is not running (D-BR-02 contract — the GSD SDK verify.*
// handlers parse the stderr JSON and propagate it to the verify-work
// workflow's automated_ui_verification step).
//
// Args:
//   --surface webview | window   (default: webview)
//   --dry-run                    Probe used by verify-work patch 1 to detect
//                                whether the Tauri bridge is available in
//                                the current project. Prints
//                                {ready: true, surface: <value>} and exits 0
//                                WITHOUT shelling out to dev-invoke.
//                                Still requires the dev-server.pid file to
//                                exist — the probe is "can verify-work reach
//                                the Tauri capability", not "does this Node
//                                script load".

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
let surface = 'webview';
let dryRun = false;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--surface' && argv[i + 1]) {
    surface = argv[i + 1];
    i += 1;
  } else if (a.startsWith('--surface=')) {
    surface = a.split('=')[1];
  } else if (a === '--dry-run') {
    dryRun = true;
  }
}

if (!['webview', 'window'].includes(surface)) {
  process.stderr.write(
    JSON.stringify({
      error: `unknown surface: ${surface}`,
      hint: 'use --surface webview or --surface window'
    }) + '\n'
  );
  process.exit(2);
}

// D-BR-02 — fail loud if dev server not running (dev-server.pid absent).
// This check applies to BOTH the real invocation path AND the --dry-run probe:
// the probe is meaningful only when verify-work has already started the dev
// loop via `gsd-sdk query verify.start-dev-loop`.
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

// --dry-run short-circuit: return capability probe and exit. Used by the
// patched verify-work workflow's `automated_ui_verification` step to detect
// the Tauri-shell branch (D-UP-01 patch 1).
if (dryRun) {
  process.stdout.write(JSON.stringify({ ready: true, surface }) + '\n');
  process.exit(0);
}

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

const result = spawnSync(devInvoke, ['dev_capture_screenshot', surface], { encoding: 'utf8' });
if (result.status !== 0) {
  // Propagate the structured stderr from dev-invoke (D-BR-02 envelope).
  // If dev-invoke didn't write a structured envelope (truly defensive), wrap it.
  const stderr = (result.stderr || '').trim();
  if (stderr.startsWith('{')) {
    process.stderr.write(stderr + '\n');
  } else {
    process.stderr.write(
      JSON.stringify({
        error: 'dev-invoke failed',
        stderr,
        status: result.status
      }) + '\n'
    );
  }
  process.exit(result.status || 1);
}

// Success — print PNG path (single line) to stdout.
process.stdout.write((result.stdout || '').trim() + '\n');
