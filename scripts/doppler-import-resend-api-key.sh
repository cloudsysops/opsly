#!/usr/bin/env bash
# Importa RESEND_API_KEY a Doppler prd leyendo el valor por stdin (evita pegar en argv / historial).
#
# Uso (macOS):
#   pbpaste | ./scripts/doppler-import-resend-api-key.sh
#   ./scripts/doppler-import-resend-api-key.sh < ~/Downloads/resend-key.txt
#
# Linux:
#   xclip -o -selection clipboard | ./scripts/doppler-import-resend-api-key.sh
#
# Flags:
#   --dry-run  solo valida longitud; no llama a Doppler.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG="${REPO_ROOT}/config/opsly.config.json"
require_cmd jq doppler

[[ -f "${CONFIG}" ]] || die "No existe ${CONFIG}" 1

DRY_RUN="false"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
elif [[ -n "${1:-}" ]]; then
  die "Uso: … | $0 [--dry-run]" 1
fi

DOPPLER_PROJECT="$(jq -r '.project.doppler_project // empty' "${CONFIG}")"
DOPPLER_CFG="$(jq -r '.project.doppler_config // empty' "${CONFIG}")"
[[ -n "${DOPPLER_PROJECT}" && "${DOPPLER_PROJECT}" != "null" ]] || die "config: project.doppler_project" 1
[[ -n "${DOPPLER_CFG}" && "${DOPPLER_CFG}" != "null" ]] || die "config: project.doppler_config" 1

doppler me >/dev/null 2>&1 || die "Doppler CLI no autenticado (doppler login)" 1

IFS= read -r key || true
key="${key//$'\r'/}"
# Una sola línea (Resend); recorta espacios extremos.
key="${key#"${key%%[![:space:]]*}"}"
key="${key%"${key##*[![:space:]]}"}"

MIN_LEN=20
if (( ${#key} < MIN_LEN )); then
  die "Clave demasiado corta (${#key} < ${MIN_LEN}). Pega la API key completa desde resend.com/api-keys." 1
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "[dry-run] OK longitud ${#key} — no se escribió en Doppler."
  exit 0
fi

printf '%s' "${key}" | doppler secrets set RESEND_API_KEY \
  --project "${DOPPLER_PROJECT}" \
  --config "${DOPPLER_CFG}" \
  --no-interactive >/dev/null

log_info "RESEND_API_KEY guardada en ${DOPPLER_PROJECT}/${DOPPLER_CFG} (salida suprimida)."
log_info "Siguiente: ./scripts/sync-and-test-invite-flow.sh (export ADMIN_TOKEN y OWNER_EMAIL)."
