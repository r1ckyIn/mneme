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
// - --system-prompt (FULL REPLACEMENT) MUST remain ABSENT in Phase 1 — full
//   replacement is Phase 9 REQ-17 per-course-rules scope. The audit gate
//   (scripts/audit-capabilities.sh checks 4b + 9 — added by plan 01-12)
//   rejects --system-prompt literals at the validator AND SSOT layers.
// - --append-system-prompt <CHAT_RENDERING_HINTS> IS ALLOWED (plan 01-12,
//   2026-05-14) — fixed compile-time string tells Claude that the client
//   renders KaTeX so it should NOT emit ASCII-fallback lines after math.
//   The hint string is a literal anchored in the validator regex; user
//   input cannot reach this position.
// - --resume <session_id> IS ALLOWED (plan 01-12, 2026-05-14) — passes the
//   server-side session id captured from the first system/init event so
//   subsequent prompts in the same app session share Claude's memory of
//   prior turns. SESSION_ID_REGEX is a defense-in-depth narrowness check.

// WR-04 fix (2026-05-14): tighten the username body from `[^/]+` to
// `[A-Za-z0-9_.\-]+`. The original `[^/]+` admitted POSIX-illegal-looking
// shapes like `/Users/ /. mneme/scratch` (space-only username) which were
// inconsistent with the docstring's "standard /Users/<name> home" claim.
// The narrower set matches the POSIX portable-name character class used by
// macOS Open Directory + Linux useradd. This is defensive narrowness for a
// defense-in-depth check — the real authorization happens in the capability
// JSON, but the SSOT regex is what gen-capabilities.ts copies into both
// shell:allow-spawn and shell:allow-execute validators. Keep them aligned.
export const SCRATCH_DIR_REGEX = `^/Users/[A-Za-z0-9_.\\-]+/\\.mneme/scratch$`;
export const MAX_TURNS = "30";

// Claude CLI session id — UUID-ish: 8-4-4-4-12 hex with hyphens.
// Defensive narrowness per the same WR-04 rationale that tightened
// SCRATCH_DIR_REGEX. The capability validator copies this verbatim; widening
// here automatically widens the spawn surface, so keep it narrow.
export const SESSION_ID_REGEX = `^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`;

// Compile-time chat-rendering hints injected via --append-system-prompt.
// Tells Claude that mneme's client renders Markdown + KaTeX so the assistant
// should NOT emit ASCII-fallback lines after math, and SHOULD use h1/h2/h3
// + --- hr separators for hierarchy.
//
// This string IS USER-INVISIBLE; Claude treats it as a directive that shapes
// output style. Keep it short — long appends consume tokens on every turn.
// Phase 9 will replace this with --system-prompt full-replacement + per-course
// rule injection (REQ-17). For Phase 1, this hardcoded string is the entire
// surface.
export const CHAT_RENDERING_HINTS =
  "Output rendering context: the client renders Markdown with KaTeX math " +
  "(display via $$...$$, inline via $...$). Use pure LaTeX only — do NOT " +
  "add ASCII-fallback lines after math blocks. Use # / ## / ### for " +
  "section hierarchy. Use --- (hr) between major sections.";

// Validator-length cap for --append-system-prompt value position. Phase 1
// pins the value to CHAT_RENDERING_HINTS exactly; the cap exists so the
// audit gate has a fixed upper bound to refuse drift. Keep equal to
// CHAT_RENDERING_HINTS.length unless the literal is intentionally updated.
export const SYSTEM_PROMPT_MAX_LEN = CHAT_RENDERING_HINTS.length;

// Optional 3rd-arg shape for buildClaudeArgs. All fields are optional so
// existing callers (`buildClaudeArgs(prompt, scratch)`) keep working without
// migration. Plan 01-12 introduces these to enable GAP-1 (session resume)
// and GAP-2 (chat-rendering hints) closures.
export type BuildOpts = {
  // undefined on the first prompt of an app-session; the captured Claude
  // server-side session id (from system/init) on prompts 2+. Threaded by
  // ChatPanel.sendPrompt from DispatchState.sessionId.
  resumeSessionId?: string;
  // Pinned to CHAT_RENDERING_HINTS at the call site. The validator regex
  // anchors to this exact literal, so a value other than CHAT_RENDERING_HINTS
  // would fail capability validation at spawn time.
  appendSystemPrompt?: string;
};

export function buildClaudeArgs(
  promptText: string,
  scratchDir: string,
  opts: BuildOpts = {},
): string[] {
  if (!new RegExp(SCRATCH_DIR_REGEX).test(scratchDir)) {
    throw new Error(
      `[spawn-args] scratchDir "${scratchDir}" does not match SCRATCH_DIR_REGEX ` +
        `(${SCRATCH_DIR_REGEX}) — defense-in-depth refusal to widen spawn surface.`,
    );
  }
  if (
    opts.resumeSessionId !== undefined &&
    !new RegExp(SESSION_ID_REGEX).test(opts.resumeSessionId)
  ) {
    throw new Error(
      `[spawn-args] resumeSessionId "${opts.resumeSessionId}" does not match ` +
        `SESSION_ID_REGEX (${SESSION_ID_REGEX}).`,
    );
  }
  if (
    opts.appendSystemPrompt !== undefined &&
    opts.appendSystemPrompt.length > SYSTEM_PROMPT_MAX_LEN
  ) {
    throw new Error(
      `[spawn-args] appendSystemPrompt length ${opts.appendSystemPrompt.length} ` +
        `exceeds SYSTEM_PROMPT_MAX_LEN ${SYSTEM_PROMPT_MAX_LEN}.`,
    );
  }
  const head: string[] = ["--print"];
  if (opts.resumeSessionId) head.push("--resume", opts.resumeSessionId);
  const middle: string[] = [
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--max-turns", MAX_TURNS,
    "--add-dir", scratchDir,
    "--exclude-dynamic-system-prompt-sections",
  ];
  const append: string[] = opts.appendSystemPrompt
    ? ["--append-system-prompt", opts.appendSystemPrompt]
    : [];
  return [...head, ...middle, ...append, promptText];
}
