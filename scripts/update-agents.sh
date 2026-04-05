#!/usr/bin/env bash
# Sincroniza AGENTS.md y VISION.md raíz → .github/ y hace commit + push.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT_DIR}/AGENTS.md"
DST="${ROOT_DIR}/.github/AGENTS.md"

cp "${SRC}" "${DST}"
cp "${ROOT_DIR}/VISION.md" "${ROOT_DIR}/.github/VISION.md" 2>/dev/null || true
git -C "${ROOT_DIR}" add AGENTS.md VISION.md .github/ 2>/dev/null || true
git -C "${ROOT_DIR}" commit -m "docs(agents): sync sesión $(date +%Y-%m-%d)" || true
git -C "${ROOT_DIR}" push origin main
echo "✅ AGENTS.md / VISION.md sincronizados y pusheado"
echo ""
echo "URL raw para próxima sesión:"
echo "https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md"
echo "https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md"
