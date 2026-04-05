#!/usr/bin/env bash
# Comprueba herramientas útiles para Opsly (git, jq, curl, ssh, docker, doppler, gh, dig).
# Uso: ./pen-check-tools.sh [--strict]
#      DRY_RUN=true ./pen-check-tools.sh  (solo lista qué buscaría)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export USB_KIT_DIR="${SCRIPT_DIR}"
# shellcheck source=tools/usb-kit/lib/usb-common.sh
source "${SCRIPT_DIR}/lib/usb-common.sh"

STRICT=false
for a in "$@"; do
  case "${a}" in
    --strict) STRICT=true ;;
    --help|-h)
      echo "Uso: $0 [--strict]"
      exit 0
      ;;
  esac
done

check_one() {
  local name="$1"
  if command -v "${name}" >/dev/null 2>&1; then
    log_info "OK  ${name} -> $(command -v "${name}")"
    return 0
  fi
  log_warn "Falta ${name}"
  return 1
}

OPTIONAL=(dig docker doppler gh)
REQUIRED=(git jq curl ssh bash)

ok=0
fail=0

for c in "${REQUIRED[@]}"; do
  if check_one "${c}"; then ok=$((ok + 1)); else fail=$((fail + 1)); fi
done

for c in "${OPTIONAL[@]}"; do
  if check_one "${c}"; then ok=$((ok + 1)); else log_info "(opcional) ${c} no instalado"; fi
done

if usb_resolve_repo_root; then
  log_info "Repo detectado: ${REPO_ROOT}"
  if [[ -f "${REPO_ROOT}/scripts/validate-config.sh" ]]; then
    log_info "validate-config.sh presente"
  else
    log_warn "No se encontró scripts/validate-config.sh bajo el repo"
  fi
else
  log_warn "No se encontró config/opsly.config.json (¿clon completo en el USB?)"
  fail=$((fail + 1))
fi

if [[ "${STRICT}" == "true" && "${fail}" -gt 0 ]]; then
  die "Faltan herramientas requeridas u opsly.config (${fail} problemas)" 1
fi

log_info "Resumen: ${ok} OK, requeridos fallidos: ${fail}"
