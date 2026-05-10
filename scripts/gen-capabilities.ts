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
// Modes:
//   node scripts/gen-capabilities.ts            → writes to disk (default)
//   node scripts/gen-capabilities.ts --dry-run  → emits to stdout (audit script consumer)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildClaudeArgs, SCRATCH_DIR_REGEX, MAX_TURNS } from "../src/lib/spawn-args.shared.ts";
import { SCRATCH_DIR } from "../src/lib/spawn-args.node.ts";

const isDryRun = process.argv.includes("--dry-run");

// Build the validator regex array. We use Option A (all-Var) per RESEARCH §4.2:
// every flag literal is `^literal$`; the path is SCRATCH_DIR_REGEX; the prompt is `.+`.
// The order MUST match buildClaudeArgs() positionally.
const ARG_VALIDATORS: Array<{ validator: string }> = [
  { validator: "^--print$" },
  { validator: "^--permission-mode$" },
  { validator: "^bypassPermissions$" },
  { validator: "^--output-format$" },
  { validator: "^stream-json$" },
  { validator: "^--include-partial-messages$" },
  { validator: "^--verbose$" },
  { validator: "^--max-turns$" },
  { validator: `^${MAX_TURNS}$` },                   // ^30$
  { validator: "^--add-dir$" },
  { validator: SCRATCH_DIR_REGEX },                  // ^/Users/[^/]+/\.mneme/scratch$
  { validator: "^--exclude-dynamic-system-prompt-sections$" },
  { validator: ".+" },                               // free-form prompt — last positional
];

// Sanity 1: regex array length MUST equal what buildClaudeArgs() emits.
// We pass SCRATCH_DIR (Node-only resolved) here because Node context can use it.
// Browser callers (ChatPanel) pass scratchDir from `homeDir()` (Tauri IPC bridge).
const sample = buildClaudeArgs("__SAMPLE_PROMPT__", SCRATCH_DIR);
if (sample.length !== ARG_VALIDATORS.length) {
  console.error(
    `[gen-capabilities] FATAL: spawn-args.shared.ts emits ${sample.length} args ` +
    `but ARG_VALIDATORS has ${ARG_VALIDATORS.length} entries.`
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
      allow: [{ name: "claude-bin", cmd: "claude", args: ARG_VALIDATORS }],
    },
    {
      identifier: "shell:allow-execute",
      allow: [{ name: "claude-bin", cmd: "claude", args: ARG_VALIDATORS }],
    },
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
