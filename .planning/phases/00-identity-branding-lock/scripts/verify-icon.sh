#!/usr/bin/env bash
# verify-icon.sh - V-02 automated check (VALIDATION.md row 2).
# Returns 0 if icon-assets/icon.icns is a valid Mac OS X icon with >= 10 size variants.
set -euo pipefail
ICNS=icon-assets/icon.icns
test -f "$ICNS" || { echo "FAIL: $ICNS missing"; exit 1; }
file "$ICNS" | grep -q 'Mac OS X icon' || { echo "FAIL: not Mac OS X icon format"; exit 1; }
VARIANT_COUNT=$( { iconutil -V "$ICNS" 2>&1 || true; } | grep -c 'image format' || true)
[ "$VARIANT_COUNT" -ge 10 ] || { echo "FAIL: only $VARIANT_COUNT variants (need >= 10)"; exit 1; }
echo "ok - $ICNS ($VARIANT_COUNT variants, $(stat -f%z "$ICNS") bytes)"
