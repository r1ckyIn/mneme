#!/usr/bin/env bash
# tests/audit/test-audit-script.sh — integration test for the audit script.
#
# Strategy: temporarily swap each fixture into src-tauri/capabilities/default.json,
# run the audit, assert expected exit code, restore the real default.json.

set -uo pipefail   # NOTE: NOT -e — we deliberately allow non-zero exits on corrupted
                    # fixtures and assert on them.

REAL_JSON="src-tauri/capabilities/default.json"
BACKUP="$REAL_JSON.test-backup"
FAIL=0

trap 'cp -f "$BACKUP" "$REAL_JSON" 2>/dev/null; rm -f "$BACKUP"' EXIT

# Save the real default.json
cp -f "$REAL_JSON" "$BACKUP"

run_case() {
  local label="$1"; local fixture="$2"; local expected_exit="$3"
  # Skip the self-copy when the fixture and target are the same file.
  if [[ "$(cd "$(dirname "$fixture")" && pwd)/$(basename "$fixture")" \
        != "$(cd "$(dirname "$REAL_JSON")" && pwd)/$(basename "$REAL_JSON")" ]]; then
    cp -f "$fixture" "$REAL_JSON"
  fi
  bash scripts/audit-capabilities.sh >/dev/null 2>&1
  local actual_exit=$?
  if [[ "$actual_exit" == "$expected_exit" ]]; then
    echo "[PASS] $label (exit $actual_exit)"
  else
    echo "[FAIL] $label (expected exit $expected_exit, got $actual_exit)"
    FAIL=1
  fi
}

run_case "fixture-clean (matches SSOT)"        tests/audit/fixture-clean.json        0
run_case "fixture-args-true (rejects wildcard)" tests/audit/fixture-args-true.json   1
run_case "fixture-wildcard (rejects literal *)" tests/audit/fixture-wildcard.json    1
run_case "fixture-bare (rejects --bare)"       tests/audit/fixture-bare.json         1

# Restore real default.json before final audit (so we don't leave a corrupted file)
cp -f "$BACKUP" "$REAL_JSON"

# Final sanity: real default.json passes (Task 2 produced this; drift = 0)
run_case "real default.json (production)"      "$REAL_JSON"                          0

exit $FAIL
