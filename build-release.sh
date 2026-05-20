#!/bin/bash
# Hirsch Music Hit Maker — Release Build Script
# Ensures the correct version is embedded and files are named correctly

set -e

VERSION=$(node -e "console.log(require('./package.json').version)")
echo "Building v${VERSION}..."

# Build
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --x64 --publish never

# electron-builder always names with PREVIOUS version — find the freshest EXE
BUILT_EXE=$(ls -t dist/Hirsch-Music-Hit-Maker-v*-Setup.exe | head -1)
echo "Built: $BUILT_EXE"

# Rename to correct version
TARGET="dist/Hirsch-Music-Hit-Maker-v${VERSION}-Setup.exe"
if [ "$BUILT_EXE" != "$TARGET" ]; then
  mv "$BUILT_EXE" "$TARGET"
  echo "Renamed → $TARGET"
fi

# Regenerate latest.yml with correct SHA
python3 - <<'PY'
import hashlib, base64, json, sys, os
ver = json.load(open('package.json'))['version']
exe = f"dist/Hirsch-Music-Hit-Maker-v{ver}-Setup.exe"
data = open(exe,'rb').read()
sha = base64.b64encode(hashlib.sha512(data).digest()).decode()
yml = f"version: {ver}\nfiles:\n  - url: Hirsch-Music-Hit-Maker-v{ver}-Setup.exe\n    sha512: {sha}\n    size: {len(data)}\npath: Hirsch-Music-Hit-Maker-v{ver}-Setup.exe\nsha512: {sha}\nreleaseDate: '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'\n"
open('dist/latest.yml','w').write(yml)
print(f"✅ latest.yml: v{ver}, {len(data)} bytes, SHA={sha[:30]}...")
PY

echo "✅ Build complete: dist/Hirsch-Music-Hit-Maker-v${VERSION}-Setup.exe"
