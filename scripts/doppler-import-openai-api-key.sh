#!/usr/bin/env bash
# Importa OPENAI_API_KEY a Doppler leyendo el valor por stdin (evita argv / historial).
#
# Uso (macOS):
#   pbpaste | ./scripts/doppler-import-openai-api-key.sh
#   ./scripts/doppler-import-openai-api-key.sh < ~/Downloads/openai-key.txt
#
# Linux:
#   xclip -o -selection clipboard | ./scripts/doppler-import-openai-api-key.sh
#
# Flags:
#   --dry-run  solo valida longitud/prefijo; no llama a Doppler.
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
key="${key#"${key%%[![:space:]]*}"}"
key="${key%"${key##*[![:space:]]}"}"

MIN_LEN=20
if (( ${#key} < MIN_LEN )); then
  die "Clave demasiado corta (${#key} < ${MIN_LEN}). Pega la API key completa desde platform.openai.com/api-keys." 1
fi

if [[ "${key}" != sk-* ]]; then
  log_warn "La clave no empieza por sk-; si es correcta para tu proveedor, ignora este aviso."
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "[dry-run] OK longitud ${#key} — no se escribió en Doppler."
  exit 0
fi

printf '%s' "${key}" | doppler secrets set OPENAI_API_KEY \
  --project "${DOPPLER_PROJECT}" \
  --config "${DOPPLER_CFG}" \
  --no-interactive >/dev/null

log_info "OPENAI_API_KEY guardada en ${DOPPLER_PROJECT}/${DOPPLER_CFG} (salida suprimida)."
log_info "Probar: npm run opsly:codex -- --version   (requiere @openai/codex en PATH)"
log_info "O: codex-dop  (tras ./scripts/local-mac-improve.sh --apply-zsh)"
