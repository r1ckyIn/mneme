// scripts/gen-capabilities.ts
//
// SSOT generator (D-14): reads src/lib/spawn-args.shared.ts (browser-safe constants)
// AND src/lib/spawn-args.node.ts (Node-only homedir resolver), then emits
// src-tauri/capabilities/default.json. Run via `node --experimental-strip-types`
// (Node ≥22) or as a prebuild hook in package.json.
//
// Cycle-2 HIGH-1 split note: this script runs in Node context, so it is the ONLY
// legal consumer of spawn-args.node.ts (which imports `homedir` from "node:os").
// SvelteKit pages and Svelte components MUST import only spawn-args.shared.ts.
//
// Plan 01-12 (2026-05-14) — Option B per Task 4a spike:
//   The capability JSON registers TWO Command names under each shell identifier:
//     - claude-bin-fresh (15-arg shape, no --resume)
//     - claude-bin-resume (17-arg shape, with --resume + SESSION_ID_REGEX)
//   ChatPanel.sendPrompt picks the Command name based on dispatch.sessionId
//   presence. Tauri 2's `tauri-plugin-shell` scope resolution does
//   `scopes.iter().find(|s| s.name == command_name)` — short-circuit on first
//   matching name — so multiple `allow` entries with the SAME name silently
//   shadow each other (only the first is consulted). Distinct names avoid that
//   pitfall. See `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/spike-tauri-capability-multi-entry.md`.
//
// Modes:
//   node scripts/gen-capabilities.ts            → writes to disk (default)
//   node scripts/gen-capabilities.ts --dry-run  → emits to stdout (audit script consumer)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  buildClaudeArgs,
  SCRATCH_DIR_REGEX,
  SESSION_ID_REGEX,
  CHAT_RENDERING_HINTS,
  MAX_TURNS,
} from "../src/lib/spawn-args.shared.ts";
import { SCRATCH_DIR } from "../src/lib/spawn-args.node.ts";

const isDryRun = process.argv.includes("--dry-run");

/**
 * Escape regex metacharacters so a literal string can be embedded in a
 * `^...$`-anchored validator regex. CHAT_RENDERING_HINTS contains `$`, `$$`,
 * `#`, `---`, `(`, `)`, `.`, `+`, `?` — all regex metachars — so the literal
 * must be escaped before insertion into the validator array.
 *
 * Source: MDN "Regular_Expressions/Escaping"; matches the set
 * [.*+?^${}()|[\]\\] verbatim.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Common tail of validators — shared by both Option-B Command shapes. Order
// MUST match the positional emission inside buildClaudeArgs() between
// "--permission-mode" (start) and the free-form prompt (end).
const COMMON_TAIL: Array<{ validator: string }> = [
  { validator: "^--permission-mode$" },
  { validator: "^bypassPermissions$" },
  { validator: "^--output-format$" },
  { validator: "^stream-json$" },
  { validator: "^--include-partial-messages$" },
  { validator: "^--verbose$" },
  { validator: "^--max-turns$" },
  { validator: `^${MAX_TURNS}$` },                              // ^30$
  { validator: "^--add-dir$" },
  { validator: SCRATCH_DIR_REGEX },                             // ^/Users/<name>/.mneme/scratch$
  { validator: "^--exclude-dynamic-system-prompt-sections$" },
  { validator: "^--append-system-prompt$" },                    // Plan 01-12 GAP-2 flag
  { validator: `^${escapeRegex(CHAT_RENDERING_HINTS)}$` },      // Anchored literal — defense-in-depth
  { validator: ".+" },                                          // Free-form prompt — last positional
];

// Option-B fresh shape: 15 args. No --resume; first prompt of an app-session.
const FRESH_ARGS: Array<{ validator: string }> = [
  { validator: "^--print$" },
  ...COMMON_TAIL,
];

// Option-B resumed shape: 17 args. --resume + SESSION_ID_REGEX after --print.
const RESUMED_ARGS: Array<{ validator: string }> = [
  { validator: "^--print$" },
  { validator: "^--resume$" },
  { validator: SESSION_ID_REGEX },                              // ^[a-f0-9]{8}-...$
  ...COMMON_TAIL,
];

// Phase 01.1 (D-TR-04 + R9 Approach A): dev-only Tauri commands.
//
// EMPIRICAL FINDING (plan 01.1-06 task 6 + 7 — Rule 1 deviation):
// The plan author's R9 Approach A assumes Tauri auto-generates
// `allow-<command-snake-case>` permissions for every #[tauri::command]
// function. Testing on Tauri 2.11.1 disproves this — the macro
// `tauri::generate_handler!` registers commands at the IPC layer
// without producing any permission identifier. Tauri only resolves
// `allow-*` permissions that originate from a `tauri-plugin` crate's
// manifest (e.g. `tauri-plugin-shell`'s `allow-spawn`). Listing a
// raw `allow-dev-capture-screenshot` in capabilities/default.json
// fails the build with `Permission allow-dev-capture-screenshot not
// found, expected one of <core+plugin permissions>`.
//
// Consequence: user-defined `#[tauri::command]` functions registered
// via `generate_handler!` do NOT need capability entries. The
// `#[cfg(debug_assertions)]` gate alone hides them from release
// builds (D-TR-05; verified empirically — `nm target/release/mneme`
// reports zero dev_log_* / dev_capture_screenshot / dev_query_state
// symbols, see plan 01.1-06 task 7).
//
// The `DEV_ONLY_PERMISSIONS` array below is kept as a documentation
// anchor for the R9 Approach A discussion, but is INTENTIONALLY NOT
// spread into the capability JSON. If Tauri 2 ever adds first-class
// per-command permission generation (e.g. via a `#[tauri::command(name = "...", permission = "...")]` attribute), the spread can be
// re-enabled in one line.
//
// Threat impact: zero. The dev commands are already triple-gated:
//   (1) #![cfg(debug_assertions)] on bin + module
//   (2) [[bin]] required-features = ['dev-invoke']
//   (3) lib.rs invoke_handler split between debug/release branches
// — the release binary lacks both the symbols AND the dispatch table
// entries. Capability JSON cannot grant access to a symbol that does
// not exist.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEV_ONLY_PERMISSIONS: string[] = [
  "allow-dev-log-console-entry",
  "allow-dev-log-network-entry",
  "allow-dev-log-perf-entry",
  "allow-dev-capture-screenshot",
  "allow-dev-query-state",
];
void DEV_ONLY_PERMISSIONS; // suppress "unused" — kept for documentation

// Sanity 1: each validator-shape's length MUST equal what buildClaudeArgs()
// emits with the matching opts shape. SCRATCH_DIR is passed because Node
// context can resolve it; the WebView caller passes the same value via
// homeDir() (Tauri IPC bridge).
const SAMPLE_SESSION_ID = "00000000-0000-0000-0000-000000000000";
const sampleFresh = buildClaudeArgs("__SAMPLE__", SCRATCH_DIR, {
  appendSystemPrompt: CHAT_RENDERING_HINTS,
});
if (sampleFresh.length !== FRESH_ARGS.length) {
  console.error(
    `[gen-capabilities] FATAL: buildClaudeArgs(opts={append}) emits ${sampleFresh.length} args ` +
      `but FRESH_ARGS has ${FRESH_ARGS.length} entries.`,
  );
  process.exit(1);
}
const sampleResumed = buildClaudeArgs("__SAMPLE__", SCRATCH_DIR, {
  resumeSessionId: SAMPLE_SESSION_ID,
  appendSystemPrompt: CHAT_RENDERING_HINTS,
});
if (sampleResumed.length !== RESUMED_ARGS.length) {
  console.error(
    `[gen-capabilities] FATAL: buildClaudeArgs(opts={resume, append}) emits ${sampleResumed.length} args ` +
      `but RESUMED_ARGS has ${RESUMED_ARGS.length} entries.`,
  );
  process.exit(1);
}

// Sanity 2: SCRATCH_DIR must satisfy SCRATCH_DIR_REGEX — the .node resolver
// could in theory yield an unexpected path on a non-macOS host.
if (!new RegExp(SCRATCH_DIR_REGEX).test(SCRATCH_DIR)) {
  console.error(
    `[gen-capabilities] FATAL: spawn-args.node.ts resolved SCRATCH_DIR="${SCRATCH_DIR}" ` +
      `which does not match SCRATCH_DIR_REGEX="${SCRATCH_DIR_REGEX}". Are you on macOS?`,
  );
  process.exit(1);
}

// Plan 01-12 Option B: TWO `allow` entries under each shell identifier with
// distinct Command names (claude-bin-fresh + claude-bin-resume). Tauri 2's
// shell-plugin scope-resolution uses `find` (short-circuit on first matching
// name); distinct names avoid the multi-entry-with-same-name pitfall.
const SPAWN_ALLOW = [
  { name: "claude-bin-fresh", cmd: "claude", args: FRESH_ARGS },
  { name: "claude-bin-resume", cmd: "claude", args: RESUMED_ARGS },
];

const capability = {
  $schema: "../gen/schemas/desktop-schema.json",
  identifier: "default",
  description: "Capability for the main window",
  windows: ["main"],
  permissions: [
    "core:default",
    "core:window:allow-start-dragging",
    "shell:default",
    {
      identifier: "shell:allow-spawn",
      allow: SPAWN_ALLOW,
    },
    {
      identifier: "shell:allow-execute",
      allow: SPAWN_ALLOW,
    },
    // ...DEV_ONLY_PERMISSIONS, // SEE NOTE ABOVE: Tauri 2 user commands
    //                              registered via generate_handler! do not
    //                              accept allow-* permission entries; the
    //                              cfg(debug_assertions) gate is sufficient.
  ],
};

const json = JSON.stringify(capability, null, 2) + "\n";

if (isDryRun) {
  process.stdout.write(json);
} else {
  const here = dirname(fileURLToPath(import.meta.url));
  const targetPath = resolve(here, "..", "src-tauri", "capabilities", "default.json");
  writeFileSync(targetPath, json, "utf8");
  console.log(`[gen-capabilities] wrote ${targetPath}`);
}
