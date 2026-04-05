#!/usr/bin/env bash
# Sincroniza contexto de agentes (AGENTS, VISION, system_state) → .github/ y hace commit + push.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT_DIR}/AGENTS.md"
DST="${ROOT_DIR}/.github/AGENTS.md"

cp "${SRC}" "${DST}"
cp "${ROOT_DIR}/VISION.md" "${ROOT_DIR}/.github/VISION.md" 2>/dev/null || true
cp "${ROOT_DIR}/context/system_state.json" \
  "${ROOT_DIR}/.github/system_state.json" 2>/dev/null || true
# Espejos explícitos en .github/ (evita `git add .github/` completo y archivos colaterales)
git -C "${ROOT_DIR}" add \
  AGENTS.md \
  VISION.md \
  context/system_state.json \
  docs/adr/ \
  agents/ \
  .github/AGENTS.md \
  .github/VISION.md \
  .github/system_state.json \
  2>/dev/null || true
git -C "${ROOT_DIR}" commit -m "docs(agents): sync sesión $(date +%Y-%m-%d)" || true
git -C "${ROOT_DIR}" push origin main
echo "✅ Contexto agentes sincronizado y pusheado"
echo ""
echo "URLs raw:"
echo "https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md"
echo "https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md"
echo "https://raw.githubusercontent.com/cloudsysops/opsly/main/context/system_state.json"
