#!/usr/bin/env bash
# Billy Automatic Prompt Monitor — vigila docs/ACTIVE-PROMPT.md y registra cambios.
# [SEGURIDAD] No ejecuta shell desde el archivo; solo notifica que el prompt cambió.
set -euo pipefail

REPO_PATH="${REPO_PATH:-/opt/opsly}"
PROMPT_FILE="${PROMPT_FILE:-$REPO_PATH/docs/ACTIVE-PROMPT.md}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
LOG_DIR="${LOG_DIR:-$REPO_PATH/runtime/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/billy-prompt-monitor.log}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

log_line() {
  local msg="$1"
  mkdir -p "${LOG_DIR}"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${msg}" | tee -a "${LOG_FILE}"
}

cleanup() {
  log_line "Monitor detenido (signal)"
  exit 0
}

trap cleanup SIGINT SIGTERM

mkdir -p "${LOG_DIR}"
touch "${LOG_FILE}"

log_line "Billy Prompt Monitor iniciado"
log_line "Monitoreando: ${PROMPT_FILE}"
log_line "Intervalo: ${CHECK_INTERVAL}s"

LAST_HASH=""

while true; do
  sleep "${CHECK_INTERVAL}"

  if [[ ! -f "$PROMPT_FILE" ]]; then
    continue
  fi

  CURRENT_HASH="$(md5sum "$PROMPT_FILE" | cut -d' ' -f1)"

  if [[ -z "${LAST_HASH}" ]]; then
    log_line "✓ Monitor listo. Aguardando cambios..."
    LAST_HASH="${CURRENT_HASH}"
    continue
  fi

  if [[ "${LAST_HASH}" == "${CURRENT_HASH}" ]]; then
    continue
  fi

  log_line "NUEVO PROMPT DETECTADO (hash ${CURRENT_HASH:0:8})"

  cd "${REPO_PATH}"
  PREVIEW="$(head -2 "$PROMPT_FILE" | rg -v '^#' | head -1)"
  "${SCRIPT_DIR}/utils/notify-discord.sh" \
    "Billy detectó un prompt nuevo" \
    "${PREVIEW:-Prompt actualizado en ACTIVE-PROMPT.md}" \
    "info" 2>/dev/null || true

  log_line "Prompt actualizado; no se ejecuta shell"

  log_line "Ciclo de prompt finalizado"
  LAST_HASH="${CURRENT_HASH}"
done
