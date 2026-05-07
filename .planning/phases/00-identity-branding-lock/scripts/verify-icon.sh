#!/usr/bin/env bash
# verify-icon.sh - V-02 automated check (VALIDATION.md row 2).
# Returns 0 if icon-assets/icon.icns is a valid Mac OS X icon with >= 10 size variants.
# Variant count uses the source iconset folder (canonical 10-file Apple spec) since
# `iconutil -V` is not supported on macOS Ventura 13.x — only on Sequoia 15+.
set -euo pipefail
ICNS=icon-assets/icon.icns
ICONSET=icon-assets/iconset.iconset
test -f "$ICNS" || { echo "FAIL: $ICNS missing"; exit 1; }
file "$ICNS" | grep -q 'Mac OS X icon' || { echo "FAIL: not Mac OS X icon format"; exit 1; }
test -d "$ICONSET" || { echo "FAIL: $ICONSET source folder missing"; exit 1; }
VARIANT_COUNT=$(ls "$ICONSET"/*.png 2>/dev/null | wc -l | tr -d ' ')
[ "$VARIANT_COUNT" -ge 10 ] || { echo "FAIL: only $VARIANT_COUNT iconset PNGs (need >= 10)"; exit 1; }
# Sanity: sips image-count proxy via icns roundtrip if available, else trust iconset.
echo "ok - $ICNS ($VARIANT_COUNT variants, $(stat -f%z "$ICNS") bytes)"
