#!/usr/bin/env bash
# opsly-quantum.sh — atajos seguros alineados al skill opsly-quantum (sin secretos).
# Uso: ./scripts/opsly-quantum.sh help|context|status|smoke|skills
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

cmd_help() {
  cat <<'EOF'
Opsly Quantum — comandos locales
  context  Rutas y recordatorios (AGENTS, VISION, config)
  status   npm run type-check
  smoke    ./scripts/verify-platform-smoke.sh
  skills   skills listados bajo skills/user/
EOF
}

cmd_context() {
  echo "REPO_ROOT=${REPO_ROOT}"
  echo "Fuentes de verdad:"
  for f in AGENTS.md VISION.md config/opsly.config.json docs/README.md; do
    if [[ -f "${REPO_ROOT}/${f}" ]]; then
      echo "  - ${f}"
    fi
  done
  echo ""
  echo "Arquitectura (ejemplos):"
  echo "  - docs/ARCHITECTURE-DISTRIBUTED-FINAL.md"
  echo "  - docs/OPENCLAW-ARCHITECTURE.md"
  echo ""
  echo "Skill maestro: skills/user/opsly-quantum/SKILL.md"
  echo "VPS: solo SSH Tailscale (ver AGENTS.md); no hardcodear secretos."
}

cmd_status() {
  npm run type-check
}

cmd_smoke() {
  exec "${REPO_ROOT}/scripts/verify-platform-smoke.sh"
}

cmd_skills() {
  find "${REPO_ROOT}/skills/user" -mindepth 1 -maxdepth 1 -type d | sort | while read -r d; do
    basename "${d}"
  done
}

main() {
  local sub="${1:-help}"
  case "${sub}" in
    help|-h|--help) cmd_help ;;
    context) cmd_context ;;
    status) cmd_status ;;
    smoke) cmd_smoke ;;
    skills) cmd_skills ;;
    *)
      echo "Comando desconocido: ${sub}" >&2
      cmd_help >&2
      exit 1
      ;;
  esac
}

main "$@"
