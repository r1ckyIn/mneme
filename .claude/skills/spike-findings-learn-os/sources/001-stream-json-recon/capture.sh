#!/bin/bash
# Capture stream-json output for varied prompts.
# Each capture saved to captures/NNN-name.jsonl.

set -e
OUT_DIR="$(dirname "$0")/captures"
mkdir -p "$OUT_DIR"

run_capture() {
  local name="$1"
  local prompt="$2"
  local extra_flags="$3"
  echo "▶ Capturing: $name"
  # shellcheck disable=SC2086
  claude --print --output-format stream-json --include-partial-messages --verbose $extra_flags "$prompt" \
    > "$OUT_DIR/$name.jsonl" 2>&1 || echo "  (exit $?)"
  local lines
  lines=$(wc -l < "$OUT_DIR/$name.jsonl" | tr -d ' ')
  echo "  → $lines lines saved"
}

# Cheap text-only prompt
run_capture "01-simple-text" "Reply with exactly: pi=3.14 and nothing else."

# Markdown + code
run_capture "02-markdown-code" "Output: a markdown bullet list of 2 items, then a python hello world code block, then a 1-line LaTeX formula \$E=mc^2\$. Nothing else."

# Tool use (Bash) — needs permission auto
run_capture "03-tool-use" "Run: echo 'spike-test' via the Bash tool, then say done." "--permission-mode bypassPermissions"

echo ""
echo "✓ All captures saved to $OUT_DIR/"
