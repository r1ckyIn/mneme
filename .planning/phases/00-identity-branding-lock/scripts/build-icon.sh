#!/usr/bin/env bash
# build-icon.sh - Apple-canonical PNG to ICNS pipeline.
# Source: .planning/phases/00-identity-branding-lock/00-RESEARCH.md "Pattern 3"
# Idempotent - safe to re-run after master PNG is regenerated.
# Run from repo root.
set -euo pipefail

SRC="${1:-icon-assets/1024x1024.png}"
ICONSET="icon-assets/iconset.iconset"
OUT_ICNS="icon-assets/icon.icns"

# Pre-validate source PNG: must exist, non-zero, exactly 1024x1024.
test -s "$SRC" || { echo "FAIL: source PNG missing or empty: $SRC"; exit 1; }
DIMS=$(sips -g pixelWidth -g pixelHeight "$SRC" 2>/dev/null \
  | awk '/pixelWidth|pixelHeight/{print $2}' | paste -sd' ' -)
if [ "$DIMS" != "1024 1024" ]; then
  echo "FAIL: source must be 1024x1024 (got: $DIMS)"
  exit 1
fi

# (Re)create iconset directory.
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

# Generate 10 PNG variants per Apple HIG iconset spec.
sips -z 16 16     "$SRC" --out "$ICONSET/icon_16x16.png"        > /dev/null
sips -z 32 32     "$SRC" --out "$ICONSET/icon_16x16@2x.png"     > /dev/null
sips -z 32 32     "$SRC" --out "$ICONSET/icon_32x32.png"        > /dev/null
sips -z 64 64     "$SRC" --out "$ICONSET/icon_32x32@2x.png"     > /dev/null
sips -z 128 128   "$SRC" --out "$ICONSET/icon_128x128.png"      > /dev/null
sips -z 256 256   "$SRC" --out "$ICONSET/icon_128x128@2x.png"   > /dev/null
sips -z 256 256   "$SRC" --out "$ICONSET/icon_256x256.png"      > /dev/null
sips -z 512 512   "$SRC" --out "$ICONSET/icon_256x256@2x.png"   > /dev/null
sips -z 512 512   "$SRC" --out "$ICONSET/icon_512x512.png"      > /dev/null
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png"   > /dev/null

# Pre-iconutil sanity check: every expected file present and non-empty (Pitfall 4 mitigation).
EXPECTED=(
  icon_16x16.png icon_16x16@2x.png
  icon_32x32.png icon_32x32@2x.png
  icon_128x128.png icon_128x128@2x.png
  icon_256x256.png icon_256x256@2x.png
  icon_512x512.png icon_512x512@2x.png
)
for f in "${EXPECTED[@]}"; do
  test -s "$ICONSET/$f" || { echo "MISSING: $f"; exit 1; }
done

# Pack iconset into ICNS.
iconutil -c icns "$ICONSET" -o "$OUT_ICNS"

# Post-verify: ensure 'file' recognizes Mac OS X icon format.
file "$OUT_ICNS" | grep -q "Mac OS X icon" \
  || { echo "FAIL: $OUT_ICNS not recognized as Mac OS X icon"; exit 1; }

echo "ok - $OUT_ICNS ($(stat -f%z "$OUT_ICNS") bytes)"
