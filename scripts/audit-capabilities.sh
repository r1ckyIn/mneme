#!/usr/bin/env bash
# scripts/audit-capabilities.sh — REQ-4 audit gate.
#
# Runs as prebuild + Husky pre-commit. Checks:
#   1. SSOT drift — `diff` between generator dry-run output and committed JSON.
#   2. Wildcard guard — no `"args": true` in default.json.
#   3. Wildcard guard — no literal `"*"` in default.json.
#   4. --bare absence — no validator regex contains the literal string "bare".
#   5. --max-turns sanity — spawn-args.shared.ts contains "--max-turns" + "30"
#      (Round 5 A-04: this is the ONLY structural ceiling under OAuth subscription mode;
#      no $-cap exists; T-1-04 reframed to depend exclusively on this check).
#   6. claude-code-parser is NOT an npm dep (KD-12 + D-13 vendoring contract).
#   7. Browser-safety guard (Cycle-2 HIGH-1) — spawn-args.shared.ts contains ZERO
#      Node imports (no `from "os"`, `from "node:os"`, `from "fs"`, `from "node:fs"`,
#      `from "path"`, `from "node:path"`). Also: SvelteKit pages and Svelte components
#      (src/**/*.svelte, src/routes/**) MUST NOT import from spawn-args.node.
#   8. Legacy file guard — src/lib/spawn-args.ts (the pre-split single file) MUST
#      NOT exist. The split into .shared + .node is the contract.
#
# Exit codes: 0 = pass, 1 = any check failed.
#
# Per Phase 0 LEARNINGS:
# - BSD sed `-i ''` for any in-place edit (we don't edit here, only grep).
# - `set -euo pipefail` then explicit `|| true` on grep -c returns
#   (grep -c with 0 matches exits 1, but 0 is the value we want to assert).

set -uo pipefail   # NOT -e because grep -c 0-matches exits 1 — we handle it manually

FAIL=0

# 1. SSOT drift check — regenerate to stdout and diff against committed JSON.
#    The dry-run output is the canonical truth; if it differs from default.json,
#    someone hand-edited the JSON or forgot to regenerate.
if ! diff <(node --experimental-strip-types scripts/gen-capabilities.ts --dry-run 2>/dev/null) src-tauri/capabilities/default.json >/dev/null 2>&1; then
  echo "[audit] FAIL: SSOT drift between spawn-args.shared/node.ts and src-tauri/capabilities/default.json" >&2
  echo "[audit]       Run: node --experimental-strip-types scripts/gen-capabilities.ts" >&2
  FAIL=1
fi

# 2. No `"args": true` wildcard.
ARGS_TRUE_COUNT=$({ grep -c '"args": true' src-tauri/capabilities/default.json || true; })
if [[ "$ARGS_TRUE_COUNT" != "0" ]]; then
  echo "[audit] FAIL: '\"args\": true' found in src-tauri/capabilities/default.json (count=$ARGS_TRUE_COUNT)" >&2
  FAIL=1
fi

# 3. No literal `"*"` wildcard. We grep for the JSON-string pattern "*" specifically
#    (a 3-character sequence: quote, asterisk, quote) so we don't false-positive on
#    regex internals like ".+*" inside validator strings.
WILDCARD_COUNT=$({ grep -c '"\*"' src-tauri/capabilities/default.json || true; })
if [[ "$WILDCARD_COUNT" != "0" ]]; then
  echo "[audit] FAIL: literal wildcard '\"*\"' found in src-tauri/capabilities/default.json" >&2
  FAIL=1
fi

# 4. No --bare validator regex (--bare strips OAuth keychain reads, silent auth fail).
if grep -E '"validator":\s*"[^"]*bare[^"]*"' src-tauri/capabilities/default.json >/dev/null 2>&1; then
  echo "[audit] FAIL: '--bare' validator detected (incompatible with OAuth subscription auth)" >&2
  FAIL=1
fi

# 5. --max-turns sanity in the SSOT (Round 5 A-04 — only loop guard).
if ! grep -q '"--max-turns"' src/lib/spawn-args.shared.ts; then
  echo "[audit] FAIL: --max-turns not found in src/lib/spawn-args.shared.ts SSOT" >&2
  FAIL=1
fi
if ! grep -qE 'MAX_TURNS\s*=\s*"30"' src/lib/spawn-args.shared.ts; then
  echo "[audit] FAIL: MAX_TURNS not pinned to '30' in src/lib/spawn-args.shared.ts" >&2
  FAIL=1
fi

# 6. claude-code-parser must NOT be an npm dep (KD-12 + D-13).
if grep -q '"claude-code-parser"' package.json 2>/dev/null; then
  echo "[audit] FAIL: claude-code-parser found in package.json — must be vendored only (KD-12 + D-13)" >&2
  FAIL=1
fi

# 7a. Browser-safety guard — spawn-args.shared.ts must contain ZERO Node imports.
#     Cycle-2 HIGH-1: ChatPanel.svelte (plan 01-06) imports buildClaudeArgs from
#     spawn-args.shared. If .shared imports `os`/`fs`/`path`, Vite/SvelteKit fails
#     to bundle (or runtime-fails in WebView).
if grep -qE 'from\s+"(node:)?(os|fs|path)"' src/lib/spawn-args.shared.ts; then
  echo "[audit] FAIL: spawn-args.shared.ts contains Node import — breaks WebView bundle (Cycle-2 HIGH-1)" >&2
  echo "[audit]       Move Node-only logic to spawn-args.node.ts; keep .shared browser-safe." >&2
  FAIL=1
fi
if grep -qE "from\s+'(node:)?(os|fs|path)'" src/lib/spawn-args.shared.ts; then
  echo "[audit] FAIL: spawn-args.shared.ts contains Node import (single-quoted) — breaks WebView bundle (Cycle-2 HIGH-1)" >&2
  FAIL=1
fi

# 7b. SvelteKit pages and Svelte components must NOT import from spawn-args.node.
#     The .node module is for scripts/gen-capabilities.ts only. Browser-context
#     imports of .node would re-introduce the Cycle-1 HIGH-1 bundling failure.
NODE_LEAK=$({ grep -rlE "from\s+[\"']\\\$lib/spawn-args\\.node|from\s+[\"']\\.\\./.*spawn-args\\.node" src/ 2>/dev/null || true; })
if [[ -n "$NODE_LEAK" ]]; then
  echo "[audit] FAIL: spawn-args.node.ts is browser-imported by:" >&2
  echo "$NODE_LEAK" >&2
  echo "[audit]       Browser callers must import from spawn-args.shared and resolve scratchDir via @tauri-apps/api/path homeDir()." >&2
  FAIL=1
fi

# 8. Legacy file guard — pre-split spawn-args.ts must not exist.
if [[ -f src/lib/spawn-args.ts ]]; then
  echo "[audit] FAIL: legacy src/lib/spawn-args.ts exists — split into .shared + .node per Cycle-2 HIGH-1 fix." >&2
  FAIL=1
fi

if [[ "$FAIL" == "0" ]]; then
  echo "[audit] PASS"
  exit 0
else
  exit 1
fi
