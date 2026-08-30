#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
echo "⏳ validate:notion (requiere NOTION_TOKEN + NOTION_DATABASE_TASKS)…"
if [[ -z "${NOTION_TOKEN:-}" ]]; then
  echo "⚠️  NOTION_TOKEN vacío — exportar o: doppler run -- npm run notion:validate"
  exit 0
fi
npm run notion:validate
echo "✅ Notion test OK"
