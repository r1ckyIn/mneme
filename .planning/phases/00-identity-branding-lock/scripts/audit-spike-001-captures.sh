#!/usr/bin/env bash
# audit-spike-001-captures.sh
# One-shot pre-publish audit of spike 001 stream-json captures for sensitive content.
# Per RESEARCH.md "Security Domain - T-SEC-01": these JSONL files may contain user-message
# text from real claude sessions; confirm content is trivial test prompts before public publish.
# Note: avoids `local` outside functions (some macOS bash builds reject it); uses plain shell vars.
set -euo pipefail

CAPTURES=(
  .planning/spikes/001-stream-json-recon/captures/01-simple-text.jsonl
  .planning/spikes/001-stream-json-recon/captures/02-markdown-code.jsonl
  .planning/spikes/001-stream-json-recon/captures/03-tool-use.jsonl
)

# Strict secret patterns (real key prefixes), not coarse keywords.
# Coarse keyword scan (token/password/secret) generates false positives across
# research docs (TOKENICODE, JWT/OAuth concept mentions). Strict regex matches
# only actual leaked Anthropic API key string formats.
SENSITIVE_REGEXES=(
  'sk-ant-[a-zA-Z0-9_-]{20,}'
  'sk-proj-[a-zA-Z0-9_-]{20,}'
  'BEGIN RSA PRIVATE KEY'
  'BEGIN PRIVATE KEY'
  'BEGIN OPENSSH PRIVATE KEY'
)

EXIT=0
for f in "${CAPTURES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    EXIT=1
    continue
  fi
  echo "=== $f ($(wc -l < "$f") lines, $(stat -f%z "$f") bytes) ==="
  for pat in "${SENSITIVE_REGEXES[@]}"; do
    HITS=$( { grep -c -E "$pat" "$f" 2>/dev/null || true; } | head -1)
    HITS=${HITS:-0}
    if [ "$HITS" -gt 0 ]; then
      echo "  WARN: pattern '$pat' matched $HITS time(s) - manual review required"
      EXIT=1
    fi
  done
  # Heuristic: identifying personal/academic markers (USYD course codes, user name, email).
  if grep -i -E 'COMP[0-9]{4}|MATH[0-9]{4}|usyd|university of sydney|qinyuan|yqin0800' "$f" > /dev/null 2>&1; then
    echo "  WARN: file mentions identifying personal/academic markers - manual review required"
    grep -i -nE 'COMP[0-9]{4}|MATH[0-9]{4}|usyd|university of sydney|qinyuan|yqin0800' "$f" | head -5
    EXIT=1
  fi
done
[ "$EXIT" = "0" ] && echo "OK - spike 001 captures contain no flagged sensitive patterns"
exit "$EXIT"
