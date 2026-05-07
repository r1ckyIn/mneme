#!/usr/bin/env bash
# verify-rename.sh - bundled grep gate for V-01 + V-03 + V-04 + V-06 + V-07 + V-08 + V-09.
# Source: .planning/phases/00-identity-branding-lock/00-VALIDATION.md
# Usage: bash .planning/phases/00-identity-branding-lock/scripts/verify-rename.sh <finalname>
# Exit 0 = all gates green; non-zero = first failing gate's exit code.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "USAGE: $0 <finalname>"
  echo "  e.g. $0 mneme"
  exit 64
fi
FINAL="$1"
DIR_CONV=".${FINAL}"
SKILL_DIR="spike-findings-${FINAL}"
BUNDLE_SPIKE="dev.${FINAL}.spike"

# Gate V-01 (SC-1): PROJECT.md mentions <finalname> AND no learn-os references survive there.
gate_v01() {
  rg -F "$FINAL" .planning/PROJECT.md > /dev/null \
    || { echo "V-01 FAIL: PROJECT.md missing '$FINAL'"; return 1; }
  if rg -F 'learn-os' .planning/PROJECT.md > /dev/null; then
    echo "V-01 FAIL: 'learn-os' still in PROJECT.md"
    return 1
  fi
  echo "V-01 OK: PROJECT.md mentions $FINAL; learn-os retired"
}

# Gate V-03 (SC-3): spike 002 tauri.conf.json identifier == dev.<finalname>.spike.
gate_v03() {
  python3 - <<PYEOF
import json, sys
p = '.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json'
cfg = json.load(open(p))
expected = 'dev.${FINAL}.spike'
actual = cfg.get('identifier', '')
if actual != expected:
    print(f'V-03 FAIL: identifier="{actual}" expected="{expected}"')
    sys.exit(1)
print(f'V-03 OK: identifier={actual}')
PYEOF
}

# Gate V-04 (SC-4 README half): README.md at repo root with finalname + bilingual + footer.
gate_v04() {
  test -f README.md \
    || { echo "V-04 FAIL: README.md missing"; return 1; }
  rg -F "$FINAL" README.md > /dev/null \
    || { echo "V-04 FAIL: README.md missing '$FINAL'"; return 1; }
  rg -F '## English' README.md > /dev/null \
    || { echo "V-04 FAIL: README.md missing '## English' section"; return 1; }
  rg -F '## 中文' README.md > /dev/null \
    || { echo "V-04 FAIL: README.md missing '## 中文' section"; return 1; }
  rg -F 'Codename history' README.md > /dev/null \
    || { echo "V-04 FAIL: README.md missing 'Codename history' footer"; return 1; }
  echo "V-04 OK: README.md complete"
}

# Gate V-06 (auxiliary skill rename): skill dir + frontmatter + CLAUDE.md table.
gate_v06() {
  test -f ".claude/skills/${SKILL_DIR}/SKILL.md" \
    || { echo "V-06 FAIL: skill dir/SKILL.md missing"; return 1; }
  grep -q "^name: ${SKILL_DIR}\$" ".claude/skills/${SKILL_DIR}/SKILL.md" \
    || { echo "V-06 FAIL: SKILL.md frontmatter name mismatch"; return 1; }
  grep -q "${SKILL_DIR}" CLAUDE.md \
    || { echo "V-06 FAIL: CLAUDE.md skill-table not updated"; return 1; }
  echo "V-06 OK: skill renamed correctly"
}

# Gate V-07 (auxiliary atomic-rename complete): zero learn-os / learnos outside skip-list.
# README.md is excluded because its codename-history footer (D-13/D-15/Q5) intentionally
# retains the literal `learn-os` string as audit content. Plan 03 deviation 2026-05-07.
# rg --count-matches exits 1 when no matches; '|| true' prevents pipefail abort.
gate_v07() {
  local hits
  hits=$( { rg -i 'learn[-_ ]?os' \
    --hidden --no-ignore \
    --glob '!.git/' \
    --glob '!.planning/phases/00-identity-branding-lock/' \
    --glob '!.planning/spikes/001-stream-json-recon/captures/' \
    --glob '!node_modules/' \
    --glob '!.svelte-kit/' \
    --glob '!target/' \
    --glob '!icon-assets/sketches/' \
    --glob '!README.md' \
    --count-matches 2>/dev/null || true; } | awk -F: '{sum += $NF} END {print sum+0}')
  if [ "$hits" != "0" ]; then
    echo "V-07 FAIL: $hits 'learn-os' / 'learnos' references survive (run 'rg -i \"learn[-_ ]?os\" --hidden --no-ignore --glob \"!.git/\" --glob \"!.planning/phases/00-identity-branding-lock/\" --glob \"!.planning/spikes/001-stream-json-recon/captures/\"' to inspect)"
    return 1
  fi
  echo "V-07 OK: zero learn-os/learnos references in production files"
}

# Gate V-08 (auxiliary .learnos/rules/ lockstep): .learnos/rules/ substring gone.
# rg --count-matches exits 1 when no matches; '|| true' prevents pipefail abort.
gate_v08() {
  local hits
  hits=$( { rg -F '.learnos/rules/' \
    --hidden --no-ignore \
    --glob '!.git/' \
    --glob '!.planning/phases/00-identity-branding-lock/' \
    --glob '!.planning/spikes/001-stream-json-recon/captures/' \
    --count-matches 2>/dev/null || true; } | awk -F: '{sum += $NF} END {print sum+0}')
  if [ "$hits" != "0" ]; then
    echo "V-08 FAIL: $hits '.learnos/rules/' references survive"
    return 1
  fi
  echo "V-08 OK: .learnos/rules/ convention fully replaced with ${DIR_CONV}/rules/"
}

# Gate V-09 (security secrets-audit): No actual API key strings in tracked files.
# Strict pattern: real Anthropic key prefixes with sufficient entropy (sk-ant-NN_xxx, sk-proj-xxx).
# Coarse keyword scan ('token', 'password', etc.) generates 30+ false positives in research docs
# (TOKENICODE repo names, JWT/OAuth concept mentions, GitHub auth-token research). The strict
# regex catches actual leaked secrets while passing on documentation that mentions security
# concepts conceptually.
gate_v09() {
  local hits
  hits=$( { git ls-files | xargs grep -lE 'sk-ant-[a-zA-Z0-9_-]{20,}|sk-proj-[a-zA-Z0-9_-]{20,}' 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [ "$hits" != "0" ]; then
    echo "V-09 FAIL: $hits files contain Anthropic API key string patterns (manual review required)"
    git ls-files | xargs grep -lE 'sk-ant-[a-zA-Z0-9_-]{20,}|sk-proj-[a-zA-Z0-9_-]{20,}' 2>/dev/null || true
    return 1
  fi
  echo "V-09 OK: no API-key strings in tracked files"
}

gate_v01
gate_v03
gate_v04
gate_v06
gate_v07
gate_v08
gate_v09
echo "==="
echo "ALL GATES PASS - rename verified for finalname=$FINAL"
