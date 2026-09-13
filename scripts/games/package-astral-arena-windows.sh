#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="${ASTRAL_WINDOWS_DIST:-$ROOT/dist/astral-arena}"

test -s "$DIST/AstralArena.exe" || {
  echo "Missing Windows export: $DIST/AstralArena.exe" >&2
  exit 1
}

cd "$DIST"

find . -type f ! -name 'SHA256SUMS.txt' ! -name 'build-manifest.json' -print0   | sort -z   | xargs -0 shasum -a 256 > SHA256SUMS.txt

cat > build-manifest.json <<EOF
{
  "schemaVersion": 1,
  "game": "astral-arena",
  "platform": "windows-x64",
  "releaseSha": "${RELEASE_SHA:-unknown}",
  "buildNumber": "${BUILD_NUMBER:-local}",
  "entrypoint": "AstralArena.exe",
  "steamUploadExecuted": false
}
EOF

echo "Windows package ready: $DIST"
echo "Entrypoint: AstralArena.exe"
echo "Checksums: SHA256SUMS.txt"
