#!/usr/bin/env bash
# Escribe el service.json de OBS con el stream key tomado del entorno (Doppler).
#
# Por que existe: OBS exige la clave en disco, pero el ORIGEN UNICO debe ser Doppler.
# Asi la clave vive en Doppler y este script solo la proyecta en la maquina donde
# hace falta, sin loguearla nunca.
#
# Uso (cualquiera de los dos):
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops-write-obs-service-config.sh
#   ./scripts/ops-write-obs-service-config.sh          # si el env ya trae las vars
#
# Flags:
#   --check      solo verifica que el env tenga lo necesario; no escribe nada.
#   --dry-run    muestra la ruta destino y valida formato; no escribe.
#   --print-path solo imprime la ruta de service.json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
require_cmd jq

MODE="write"
for arg in "$@"; do
  case "${arg}" in
    --check) MODE="check" ;;
    --dry-run) MODE="dry-run" ;;
    --print-path) MODE="print-path" ;;
    *) die "Uso: $0 [--check|--dry-run|--print-path]" 1 ;;
  esac
done

# --- Ubicacion de service.json (Windows nativo o WSL/Linux) --------------------
if [[ -n "${APPDATA:-}" ]]; then
  SERVICE_DIR="${APPDATA}/obs-studio/basic"          # Windows: %APPDATA%
else
  SERVICE_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/obs-studio/basic"  # WSL / Linux
fi
SERVICE_FILE="${SERVICE_DIR}/service.json"

if [[ "${MODE}" == "print-path" ]]; then
  printf '%s\n' "${SERVICE_FILE}"
  exit 0
fi

# --- Validacion de entorno (nunca imprimimos el valor) -----------------------
if [[ -z "${TWITCH_STREAM_KEY:-}" ]]; then
  die "TWITCH_STREAM_KEY no esta en el entorno. Usa 'doppler run … -- $0' o importala con scripts/doppler-import-twitch-stream-key.sh --allow-prod" 1
fi
MIN_LEN=20
if (( ${#TWITCH_STREAM_KEY} < MIN_LEN )); then
  die "TWITCH_STREAM_KEY demasiado corta (${#TWITCH_STREAM_KEY} < ${MIN_LEN})." 1
fi

CHANNEL="${TWITCH_CHANNEL:-OpsAfterDark}"
SERVER="${TWITCH_STREAM_SERVER:-rtmp://live.twitch.tv/app}"

if [[ "${MODE}" == "check" ]]; then
  log_info "OK: TWITCH_STREAM_KEY presente (${#TWITCH_STREAM_KEY} chars), canal=${CHANNEL}, server=${SERVER}"
  log_info "Destino: ${SERVICE_FILE}"
  exit 0
fi

if [[ "${MODE}" == "dry-run" ]]; then
  log_info "[dry-run] Destino: ${SERVICE_FILE}"
  log_info "[dry-run] canal=${CHANNEL} server=${SERVER} key=${#TWITCH_STREAM_KEY} chars — nada escrito."
  exit 0
fi

# --- Construccion: preserva otros stream services si ya existia el archivo ---
mkdir -p "${SERVICE_DIR}"

if [[ -f "${SERVICE_FILE}" ]] && jq -e . "${SERVICE_FILE}" >/dev/null 2>&1; then
  # Reemplaza/inserta solo la entrada de Twitch; conserva las demas.
  updated="$(jq --arg k "${TWITCH_STREAM_KEY}" --arg s "${SERVER}" '
    .stream_services = ((.stream_services // [])
      | map(select(.name != "Twitch"))
      + [{ name: "Twitch", type: "rtmp_service", settings: { server: $s, key: $k } }])
  ' "${SERVICE_FILE}")"
else
  updated="$(jq -n --arg k "${TWITCH_STREAM_KEY}" --arg s "${SERVER}" '
    { stream_services: [
        { name: "Twitch", type: "rtmp_service", settings: { server: $s, key: $k } }
    ] }
  ')"
fi

# Escribe via temporal y mv atomico; permisos 600 (solo el usuario lee la clave).
tmp="$(mktemp "${SERVICE_DIR}/.service.json.XXXXXX")"
printf '%s\n' "${updated}" > "${tmp}"
chmod 600 "${tmp}"
mv -f "${tmp}" "${SERVICE_FILE}"

log_info "service.json escrito: ${SERVICE_FILE} (perm 600, clave no logueada)"
log_info "canal=${CHANNEL} server=${SERVER}"
log_info "Cierra OBS antes de ejecutar: si OBS esta abierto, lo sobreescribe al salir."
log_info "Para rotar la clave: cambiala en Twitch, re-importa a Doppler, y re-ejecuta este script."
