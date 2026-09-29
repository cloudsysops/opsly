#!/usr/bin/env bash
# Importa el stream key de Twitch a Doppler prd leyendo el valor por stdin.
# Nunca pasa por argv (queda en historial del shell) ni se escribe a disco.
#
# Uso (macOS):
#   pbpaste | ./scripts/doppler-import-twitch-stream-key.sh
#   ./scripts/doppler-import-twitch-stream-key.sh < ~/Downloads/twitch-key.txt
#
# Linux (WSL / workers):
#   xclip -o -selection clipboard | ./scripts/doppler-import-twitch-stream-key.sh
#
# Flags:
#   --dry-run     solo valida formato; no llama a Doppler.
#   --with-channel  ademas fija TWITCH_CHANNEL (no secreto, se puede pasar en claro).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG="${REPO_ROOT}/config/opsly.config.json"
require_cmd jq doppler

[[ -f "${CONFIG}" ]] || die "No existe ${CONFIG}" 1

DRY_RUN="false"
SET_CHANNEL="false"
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN="true" ;;
    --with-channel) SET_CHANNEL="true" ;;
    *) die "Uso: … | $0 [--dry-run] [--with-channel]" 1 ;;
  esac
done

DOPPLER_PROJECT="$(jq -r '.project.doppler_project // empty' "${CONFIG}")"
DOPPLER_CFG="$(jq -r '.project.doppler_config // empty' "${CONFIG}")"
[[ -n "${DOPPLER_PROJECT}" && "${DOPPLER_PROJECT}" != "null" ]] || die "config: project.doppler_project" 1
[[ -n "${DOPPLER_CFG}" && "${DOPPLER_CFG}" != "null" ]] || die "config: project.doppler_config" 1

doppler me >/dev/null 2>&1 || die "Doppler CLI no autenticado (doppler login)" 1

IFS= read -r key || true
key="${key//$'\r'/}"
key="${key#"${key%%[![:space:]]*}"}"
key="${key%"${key##*[![:space:]]}"}"

# El stream key de Twitch es opaco y largo. Solo validamos forma basica:
# sin espacios internos y con longitud suficiente. No imprimimos el valor.
MIN_LEN=20
if (( ${#key} < MIN_LEN )); then
  die "stream key demasiado corto (${#key} < ${MIN_LEN}). Pega la clave completa desde Twitch > Settings > Stream." 1
fi
if [[ "${key}" == *" "* ]]; then
  die "el stream key contiene espacios; ensure de copiarlo en una sola linea." 1
fi

if [[ "${SET_CHANNEL}" == "true" ]]; then
  CHANNEL="${TWITCH_CHANNEL:-OpsAfterDark}"
  if [[ "${DRY_RUN}" != "true" ]]; then
    printf '%s' "${CHANNEL}" | doppler secrets set TWITCH_CHANNEL \
      --project "${DOPPLER_PROJECT}" \
      --config "${DOPPLER_CFG}" \
      --no-interactive >/dev/null
  fi
  log_info "TWITCH_CHANNEL=${CHANNEL}${DRY_RUN:+ (dry-run, no escrito)}"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "[dry-run] OK longitud ${#key} — no se escribio en Doppler."
  exit 0
fi

printf '%s' "${key}" | doppler secrets set TWITCH_STREAM_KEY \
  --project "${DOPPLER_PROJECT}" \
  --config "${DOPPLER_CFG}" \
  --no-interactive >/dev/null

log_info "TWITCH_STREAM_KEY guardada en ${DOPPLER_PROJECT}/${DOPPLER_CFG} (salida suprimida)."
log_info "Siguiente: ./scripts/ops-write-obs-service-config.sh  (escribe service.json en la maquina)."
log_info "No guardes la clave en el repo. Si la expusiste, rotala en Twitch."
