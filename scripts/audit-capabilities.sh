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
#   9. B3 fix grep gate (probe_claude_binary 4-arm match completeness) — added by
#      Phase 02.1 02.1-02. Pins the four-arm subprocess-result match in
#      src-tauri/src/lib.rs::probe_claude_binary so a future refactor cannot
#      drop the NotFound arm (would re-introduce false env_broken on systems
#      where the user simply hasn't installed claude yet — WR-01 regression).
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

# 4b. --system-prompt (FULL REPLACEMENT) absent (plan 01-12).
#     The validator's preceding character must be `-` (from `--append-`) OR
#     it's a violation. The regex below matches `--system-prompt` preceded by
#     ANY char that is NOT `-`, OR matches it at string start.
#     `--append-system-prompt` is allowed because the `t` of `append-` precedes
#     the `--system-prompt` substring, blocking the match.
if grep -E '"validator":[[:space:]]*"[^"]*([^-]|^)--system-prompt[^"]*"' src-tauri/capabilities/default.json >/dev/null 2>&1; then
  echo "[audit] FAIL: '--system-prompt' (full replacement) validator detected — Phase 9 REQ-17 scope, NOT Phase 1" >&2
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
#
# WR-06 fix (2026-05-14): use POSIX ERE `[[:space:]]+` instead of `\s+`. BSD
# grep (macOS default) does NOT recognize `\s` as the whitespace class in
# ERE — it treats it as a literal `s`. The check accidentally worked because
# the import line contains `from ` with a space, but it would silently miss
# tab characters and break on Linux GNU grep CI runners.
if grep -qE 'from[[:space:]]+"(node:)?(os|fs|path)"' src/lib/spawn-args.shared.ts; then
  echo "[audit] FAIL: spawn-args.shared.ts contains Node import — breaks WebView bundle (Cycle-2 HIGH-1)" >&2
  echo "[audit]       Move Node-only logic to spawn-args.node.ts; keep .shared browser-safe." >&2
  FAIL=1
fi
if grep -qE "from[[:space:]]+'(node:)?(os|fs|path)'" src/lib/spawn-args.shared.ts; then
  echo "[audit] FAIL: spawn-args.shared.ts contains Node import (single-quoted) — breaks WebView bundle (Cycle-2 HIGH-1)" >&2
  FAIL=1
fi

# 7b. SvelteKit pages and Svelte components must NOT import from spawn-args.node.
#     The .node module is for scripts/gen-capabilities.ts only. Browser-context
#     imports of .node would re-introduce the Cycle-1 HIGH-1 bundling failure.
NODE_LEAK=$({ grep -rlE "from[[:space:]]+[\"']\\\$lib/spawn-args\\.node|from[[:space:]]+[\"']\\.\\./.*spawn-args\\.node" src/ 2>/dev/null || true; })
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

# 9. --system-prompt (FULL REPLACEMENT) absent from SSOT (plan 01-12).
#    Match the EXACT literal "\"--system-prompt\"" (open-quote + --system-prompt + close-quote).
#    The append-system-prompt literal is "\"--append-system-prompt\"" — differs in the
#    preceding `append-` so the regex below won't false-match it. Defense-in-depth at the
#    SSOT layer; complements check 4b at the validator layer.
if grep -E '"--system-prompt"' src/lib/spawn-args.shared.ts >/dev/null 2>&1; then
  echo "[audit] FAIL: --system-prompt (full replacement) found in spawn-args.shared.ts SSOT — Phase 9 REQ-17 scope only" >&2
  FAIL=1
fi

# ---------------------------------------------------------------------------
# Phase 2 Plan 02-07 — capability surface gates (D-19)
# ---------------------------------------------------------------------------

# Gate 9 — import_handle() caller audit (D-05). The single factory function
# `vault_writer::import_handle()` is the audited entry to obtain an
# `ImportToken`. Only the defining module + the sole authorized caller (the
# import controller) may reference it. Any third-party caller would gain
# unaudited write access to `_source/` files in violation of D-05.
#
# `lib.rs` does NOT directly reference `import_handle()` — the Tauri command
# wrapper delegates to `import_controller::start_import_inner` which acquires
# the token internally. If a future refactor inlines the token call in
# `lib.rs`, the audit allows it (`lib\.rs$` is whitelisted) so the gate is
# extension-friendly.
#
# WR-06 fix (gap-closure 02-15): regex anchors to /(vault_writer|...)\.rs$
# — the leading slash prevents future filenames like `my_lib.rs` or
# `tauri_lib.rs` from inheriting the whitelist by accident. Only literal
# `/vault_writer.rs`, `/import_controller.rs`, `/lib.rs` paths are excluded.
# Alternate stricter form anchoring from `src-tauri/src/` root was considered
# but rejected as fragile if the file location ever moves.
UNEXPECTED_CALLERS=$(
    grep -rln 'import_handle()' src-tauri/src/ 2>/dev/null \
    | grep -vE '/(vault_writer|import_controller|lib)\.rs$' \
    || true
)
# Self-test (sanity, not enforced): the anchored regex must:
#   - MATCH src-tauri/src/vault_writer.rs       (excluded, whitelist)
#   - MATCH src-tauri/src/import_controller.rs  (excluded, whitelist)
#   - MATCH src-tauri/src/lib.rs                (excluded, whitelist)
#   - NOT MATCH src-tauri/src/my_lib.rs         (would be flagged)
#   - NOT MATCH src-tauri/src/evil_lib.rs       (would be flagged)
#   - NOT MATCH src-tauri/src/tauri_lib.rs      (would be flagged)
if [[ -n "$UNEXPECTED_CALLERS" ]]; then
  echo "[audit] FAIL — import_handle() called from unexpected file(s):" >&2
  echo "$UNEXPECTED_CALLERS" >&2
  echo "[audit]        Only vault_writer.rs (definer) + import_controller.rs (sole" >&2
  echo "[audit]        authorized caller per D-05) + lib.rs (Tauri command wrapper)" >&2
  echo "[audit]        may reference the factory." >&2
  FAIL=1
fi

# Gate 10 — vault_writer.rs SQL grep (T-2-07 sister gate). No `format!()` SQL
# strings anywhere under src-tauri/src/. Mirrors the vault_index.rs gate; covers
# any future code that might construct SQL by string interpolation.
if grep -rnE 'format!\([^)]*\b(SELECT|INSERT|UPDATE|DELETE)\b' src-tauri/src/ >/dev/null 2>&1; then
  echo "[audit] FAIL — format!() with SQL keyword detected (T-2-07 — use params![] macro)" >&2
  FAIL=1
fi

# Gate 11 — no new `"args": true` wildcards introduced in Phase 2 capability
# additions. Gate 2 above already covers this for the SSOT-managed claude-bin
# entries; this gate makes the regression catch explicit for any future plugin
# permissions that might tempt a wildcard.
ARGS_TRUE_P2=$({ grep -c '"args": true' src-tauri/capabilities/default.json || true; })
if [[ "$ARGS_TRUE_P2" != "0" ]]; then
  echo "[audit] FAIL — Phase 2 capability '\"args\": true' wildcard detected (count=$ARGS_TRUE_P2)" >&2
  FAIL=1
fi

# Gate 12 — Phase 2 plugin-dialog scope presence (regression catch — accidental
# delete or unintended namespace flip from `dialog:*` back to `core:dialog:*`).
# The dialog plugin's permission is namespaced under `dialog:*` (NOT `core:*`);
# building with `core:dialog:default` fails the Tauri build-time validator. The
# 02-07 plan listed `core:dialog:default` originally — we use `dialog:default`
# + `dialog:allow-open` per the Tauri 2 plugin manifest. Both must be present.
if ! grep -qE '"dialog:default"' src-tauri/capabilities/default.json; then
  echo "[audit] FAIL — capability 'dialog:default' missing (Phase 2 plugin-dialog scope)" >&2
  FAIL=1
fi
if ! grep -qE '"dialog:allow-open"' src-tauri/capabilities/default.json; then
  echo "[audit] FAIL — capability 'dialog:allow-open' missing (Phase 2 NSOpenPanel surface)" >&2
  FAIL=1
fi

# Gate 13 — Phase 2 menu permission presence (SPEC-GAP-1 settings-ui.md §2 L59;
# Plan 02-07 Task 3 macOS native menu). Without `core:menu:default` a future
# Plan 12 frontend menu inspection (Menu.new() / Menu.get()) would be denied
# even though the Rust-side `app.set_menu(...)` still works. Future-proofing.
if ! grep -qE '"core:menu:default"' src-tauri/capabilities/default.json; then
  echo "[audit] FAIL — capability 'core:menu:default' missing (SPEC-GAP-1 native menu)" >&2
  FAIL=1
fi

# ---------------------------------------------------------------------------
# Phase 02.1 02.1-02 (B3 fix) — gate 9: probe_claude_binary 4-arm completeness
# ---------------------------------------------------------------------------
#
# The probe_claude_binary fn in src-tauri/src/lib.rs MUST handle ALL 4 cases:
#   (a) Ok success   → found=true,  env_broken=false  (CLI usable)
#   (b) Ok failure   → found=false, env_broken=false  (CLI installed but errored)
#   (c) Err NotFound → found=false, env_broken=false  (binary absent is NOT
#                      env_broken — user simply hasn't installed claude yet)
#   (d) Err other    → found=false, env_broken=true   (EPERM on PATH dir, etc.)
#
# A future refactor that collapses arms (c) + (d) into a single generic Err
# arm would re-introduce false env_broken on missing-binary systems — WR-01
# regression. The grep gate below pins all 4 disposition lines so the audit
# fails loud BEFORE that refactor lands.
#
# Counts assert:
#   - probe_claude_binary fn definition present (≥1)
#   - ErrorKind::NotFound arm present (≥1)
#   - env_broken: true   line count ≥1  (the Err(other) arm)
#   - env_broken: false  line count ≥3  (Ok(success) + Ok(failure) + Err(NotFound))
# Anchored to start-of-line (`^pub fn`) so an explanatory comment that
# happens to mention the function name (e.g. `// `pub fn probe_claude_binary` + ...`)
# does NOT satisfy the grep. Only an actual function definition counts.
PROBE_FN_PRESENT=$({ grep -cE '^pub fn probe_claude_binary' src-tauri/src/lib.rs || true; })
NOT_FOUND_ARM=$({ grep -c 'ErrorKind::NotFound' src-tauri/src/lib.rs || true; })
ENV_BROKEN_TRUE=$({ grep -c 'env_broken: true' src-tauri/src/lib.rs || true; })
ENV_BROKEN_FALSE=$({ grep -c 'env_broken: false' src-tauri/src/lib.rs || true; })
if [[ "$PROBE_FN_PRESENT" -lt 1 ]]; then
  echo "[audit] FAIL gate 9 (B3 fix): pub fn probe_claude_binary missing from src-tauri/src/lib.rs — B3 fix lost" >&2
  FAIL=1
fi
if [[ "$NOT_FOUND_ARM" -lt 1 ]]; then
  echo "[audit] FAIL gate 9 (B3 fix): ErrorKind::NotFound arm missing from src-tauri/src/lib.rs — WR-01 regression risk" >&2
  FAIL=1
fi
if [[ "$ENV_BROKEN_TRUE" -lt 1 ]] || [[ "$ENV_BROKEN_FALSE" -lt 3 ]]; then
  echo "[audit] FAIL gate 9 (B3 fix): env_broken disposition lines insufficient in src-tauri/src/lib.rs (expect ≥1 'env_broken: true' + ≥3 'env_broken: false'; got true=$ENV_BROKEN_TRUE false=$ENV_BROKEN_FALSE)" >&2
  FAIL=1
fi

if [[ "$FAIL" == "0" ]]; then
  echo "[audit] PASS"
  exit 0
else
  exit 1
fi
