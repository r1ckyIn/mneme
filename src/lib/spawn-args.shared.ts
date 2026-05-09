// src/lib/spawn-args.shared.ts — Browser-safe SSOT for Claude CLI spawn args (D-14).
//
// CRITICAL: This module MUST contain ZERO Node imports — Vite/SvelteKit bundles
// it into the WebView via plan 01-06's ChatPanel.svelte. Importing the Node
// builtins (os / fs / path) here will fail `npm run build` (or runtime-fail in
// the WebView). Codex Cycle-1 review HIGH-1 caught the original single-file
// spawn-args.ts importing the homedir helper from the Node os builtin —
// split into .shared (this file) + .node (homedir resolver — gen-capabilities
// consumer only).
//
// scripts/gen-capabilities.ts reads BOTH .shared (regex/MAX_TURNS) and .node
// (SCRATCH_DIR) and writes src-tauri/capabilities/default.json.
// scripts/audit-capabilities.sh diffs the dry-run output against the committed
// JSON to catch drift, AND greps this file for forbidden Node imports.
//
// NON-NEGOTIABLE INTERFACE CONSTRAINTS (KP-04 + REQ-2 + REQ-10 compliance):
// - --max-turns MUST be present, value MUST be "30" (Round 5 A-04 — the ONLY
//   structural ceiling under OAuth subscription mode; no $-cap exists)
// - --add-dir MUST be present, value MUST be the scratchDir parameter, which
//   the caller MUST resolve at runtime — ChatPanel uses `homeDir()` from
//   `@tauri-apps/api/path` (Tauri 2 IPC bridge — browser-safe). The SSOT
//   itself rejects scratchDir values that do not match SCRATCH_DIR_REGEX.
// - --exclude-dynamic-system-prompt-sections MUST be present
//   (drops cache_creation tokens from ~107k to <20k — spike-findings §7)
// - --bare MUST be ABSENT (strips OAuth keychain reads, silent auth failure
//   per spike F4/F6 + AI-SPEC §1 critical failure mode #2)
// - --model MUST be ABSENT (Round 5 A-13 — Phase 1 chat-footer model pill is a
//   decorative placeholder hardcoded to "Opus 4.7 1M · Max"; the CLI uses the
//   account default which IS Opus 4.7 for this user)
// - NO --system-prompt / --append-system-prompt in Phase 1 (Phase 9 introduces)

export const SCRATCH_DIR_REGEX = `^/Users/[^/]+/\\.mneme/scratch$`;
export const MAX_TURNS = "30";

export function buildClaudeArgs(promptText: string, scratchDir: string): string[] {
  if (!new RegExp(SCRATCH_DIR_REGEX).test(scratchDir)) {
    throw new Error(
      `[spawn-args] scratchDir "${scratchDir}" does not match SCRATCH_DIR_REGEX ` +
        `(${SCRATCH_DIR_REGEX}) — defense-in-depth refusal to widen spawn surface.`,
    );
  }
  return [
    "--print",
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--max-turns", MAX_TURNS,
    "--add-dir", scratchDir,
    "--exclude-dynamic-system-prompt-sections",
    promptText,
  ];
}
