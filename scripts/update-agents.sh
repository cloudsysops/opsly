#!/usr/bin/env bash
# Sincroniza AGENTS.md raíz → .github/AGENTS.md y hace commit + push.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT_DIR}/AGENTS.md"
DST="${ROOT_DIR}/.github/AGENTS.md"

cp "${SRC}" "${DST}"
git -C "${ROOT_DIR}" add AGENTS.md .github/AGENTS.md
git -C "${ROOT_DIR}" commit -m "docs(agents): sync sesión $(date +%Y-%m-%d)" || true
git -C "${ROOT_DIR}" push origin main
echo "✅ AGENTS.md sincronizado y pusheado"
echo ""
echo "URL raw para próxima sesión:"
echo "https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md"
