#!/usr/bin/env bash
# validate-doppler-vars.sh — Comprueba token Doppler y presencia de variables requeridas.
# No imprime valores secretos.
#
# Uso:
#   export DOPPLER_TOKEN=...
#   ./scripts/ci/validate-doppler-vars.sh ops-intcloudsysops prd
#
# Archivos opcionales (primero gana el específico por config):
#   config/doppler-ci-required-<config>.txt  (ej. doppler-ci-required-stg.txt)
#   config/doppler-ci-required.txt
#
# Formato: una variable por línea; líneas vacías y # comentarios ignorados.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

log() { echo "[validate-doppler] $*"; }
err() { echo "[validate-doppler] ERROR: $*" >&2; }

if [[ $# -lt 2 ]]; then
  err "Uso: $0 <project> <config>"
  exit 1
fi

PROJECT="$1"
CONFIG="$2"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Falta el comando: $1"
    exit 1
  }
}

require_cmd doppler
require_cmd jq
require_cmd awk

if [[ -z "${DOPPLER_TOKEN:-}" ]]; then
  err "DOPPLER_TOKEN no está definido en el entorno."
  exit 1
fi

export DOPPLER_TOKEN

if ! doppler me --json >/dev/null 2>&1; then
  err "Token Doppler inválido o sin acceso (doppler me falló)."
  exit 1
fi

log "Proyecto=${PROJECT} config=${CONFIG}"

JSON_OUT=$(doppler secrets --project "$PROJECT" --config "$CONFIG" --json) || {
  err "No se pudo leer secretos (¿proyecto/config existe?)."
  exit 1
}

COUNT=$(echo "$JSON_OUT" | jq 'keys | length')
if [[ "$COUNT" -lt 1 ]]; then
  err "La config no tiene secretos (0 claves)."
  exit 1
fi
log "Secretos en config: ${COUNT} (solo conteo, sin nombres en log detallado)"

REQ_FILE="${ROOT_DIR}/config/doppler-ci-required-${CONFIG}.txt"
if [[ ! -f "$REQ_FILE" ]]; then
  REQ_FILE="${ROOT_DIR}/config/doppler-ci-required.txt"
fi

if [[ ! -f "$REQ_FILE" ]]; then
  log "Sin archivo de requisitos; validación básica OK (token + config no vacía)."
  exit 0
fi

MISSING=0
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "${line//[[:space:]]/}" ]] && continue
  var="$(echo "$line" | awk '{print $1}')"
  var="${var//$'\r'/}"
  [[ -z "$var" || "$var" =~ ^# ]] && continue

  LEN=$(echo "$JSON_OUT" | jq -r --arg k "$var" '
    if (.[$k] | type) == "object" and (.[$k].computed != null) then (.[$k].computed | tostring | length)
    elif (.[$k] | type) == "string" then (.[$k] | length)
    else 0 end
  ')
  [[ "$LEN" =~ ^[0-9]+$ ]] || LEN=0

  MIN_LEN=1
  if [[ "$var" == "GOOGLE_SERVICE_ACCOUNT_JSON" ]]; then
    MIN_LEN=100
  fi

  if [[ "${LEN:-0}" -ge "$MIN_LEN" ]]; then
    log "OK (presente): ${var}"
  else
    err "Falta o vacío: ${var} (longitud ${LEN:-0}, mínimo ${MIN_LEN})"
    MISSING=$((MISSING + 1))
  fi
done < "$REQ_FILE"

if [[ "$MISSING" -gt 0 ]]; then
  err "${MISSING} variable(s) requerida(s) ausentes o demasiado cortas."
  exit 1
fi

log "Todas las variables de ${REQ_FILE##*/} cumplen."
exit 0
