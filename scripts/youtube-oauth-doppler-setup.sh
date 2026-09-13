#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -x node_modules/.bin/tsx ]]; then
  echo "Missing node_modules/.bin/tsx; run npm ci first." >&2
  exit 1
fi

exec node_modules/.bin/tsx scripts/youtube-oauth-doppler-setup.ts "$@"
