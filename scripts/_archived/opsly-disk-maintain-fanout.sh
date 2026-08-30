#!/usr/bin/env bash
# Si algún filesystem local supera el umbral (por defecto 89%), ejecuta mantenimiento
# en este host y vía SSH en los peers configurados (flota: VPS + workers).
#
# Prerrequisitos entre máquinas: SSH por clave (BatchMode), rutas estándar en el remoto.
#
# Config (opcional, en orden):
#   /etc/default/opsly-disk-maintain
#   ~/.config/opsly/disk-maintain.env
#
# Variables:
#   OPSLY_DISK_THRESHOLD          default 89
#   OPSLY_MAINTAIN_PEERS          lista "user@host user@host2" (Tailscale recomendado)
#   OPSLY_DISK_MAINTAIN_COOLDOWN_SEC  default 3600 (no repetir fan-out antes de 1 h)
#   OPSLY_SSH_OPTS                opciones extra ssh (quoted)
#   DRY_RUN=true                  solo log, sin ejecutar
#
# Uso:
#   ./scripts/opsly-disk-maintain-fanout.sh [--dry-run] [--force] [--threshold N]
#
# --force  ignora cooldown (útil para pruebas)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

THRESHOLD="${OPSLY_DISK_THRESHOLD:-89}"
COOLDOWN_SEC="${OPSLY_DISK_MAINTAIN_COOLDOWN_SEC:-3600}"
DRY_RUN="${DRY_RUN:-false}"
FORCE="false"
PEERS="${OPSLY_MAINTAIN_PEERS:-}"

load_env_files() {
  local f
  for f in /etc/default/opsly-disk-maintain "${HOME}/.config/opsly/disk-maintain.env"; do
    if [[ -f "${f}" ]]; then
      # shellcheck disable=SC1090
      set -a
      source "${f}"
      set +a
      log_info "Cargado: ${f}"
    fi
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN="true" ;;
    --force) FORCE="true" ;;
    --threshold)
      THRESHOLD="${2:?}"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -28
      exit 0
      ;;
    *) die "Opción desconocida: $1" 1 ;;
  esac
  shift
done

load_env_files
PEERS="${OPSLY_MAINTAIN_PEERS:-${PEERS}}"
REMOTE_SCRIPT="${SCRIPT_DIR}/opsly-maintain-remote.sh"
COOLDOWN_FILE="${OPSLY_DISK_MAINTAIN_STAMP:-${HOME}/.cache/opsly/disk-maintain.last}"
SSH_BASE=(ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new)
if [[ -n "${OPSLY_SSH_OPTS:-}" ]]; then
  # shellcheck disable=SC2206
  SSH_EXTRA=(${OPSLY_SSH_OPTS})
  SSH_BASE+=("${SSH_EXTRA[@]}")
fi

max_disk_percent_awk() {
  local m
  m="$(df -P -l 2>/dev/null | tail -n +2 | awk '
    BEGIN { max = 0 }
    $1 ~ /^Filesystem/ { next }
    {
      gsub(/%/, "", $5)
      p = $5 + 0
      if (p > max) max = p
    }
    END { print max+0 }
  ')"
  if [[ -z "${m}" ]] || [[ "${m}" == "0" ]]; then
    df -P / 2>/dev/null | tail -1 | awk '{gsub(/%/,"",$5); print $5+0}'
  else
    echo "${m}"
  fi
}

threshold_exceeded() {
  local max_pct
  max_pct="$(max_disk_percent_awk)"
  awk -v m="${max_pct}" -v t="${THRESHOLD}" 'BEGIN { exit (m >= t ? 0 : 1) }'
}

cooldown_active() {
  [[ "${FORCE}" == "true" ]] && return 1
  [[ ! -f "${COOLDOWN_FILE}" ]] && return 1
  local now sec_last elapsed
  now="$(date +%s)"
  sec_last="$(stat -f "%m" "${COOLDOWN_FILE}" 2>/dev/null || stat -c "%Y" "${COOLDOWN_FILE}" 2>/dev/null || echo 0)"
  elapsed=$((now - sec_last))
  [[ "${elapsed}" -lt "${COOLDOWN_SEC}" ]]
}

write_cooldown() {
  mkdir -p "$(dirname "${COOLDOWN_FILE}")"
  : >"${COOLDOWN_FILE}"
}

run_local_maintain() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: bash ${REMOTE_SCRIPT}"
    return 0
  fi
  bash "${REMOTE_SCRIPT}"
}

run_remote_maintain() {
  local peer="$1"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: ${SSH_BASE[*]} ${peer} '…opsly-maintain-remote…'"
    return 0
  fi
  if "${SSH_BASE[@]}" "${peer}" "test -f /opt/opsly/scripts/opsly-maintain-remote.sh"; then
    "${SSH_BASE[@]}" "${peer}" "bash /opt/opsly/scripts/opsly-maintain-remote.sh" && return 0
  fi
  if "${SSH_BASE[@]}" "${peer}" 'test -x "${HOME}/bin/opsly-maintain"'; then
    "${SSH_BASE[@]}" "${peer}" 'exec "${HOME}/bin/opsly-maintain"' && return 0
  fi
  log_warn "Peer ${peer}: no se encontró /opt/opsly/scripts/opsly-maintain-remote.sh ni ~/bin/opsly-maintain"
  return 1
}

main() {
  local max_pct
  max_pct="$(max_disk_percent_awk)"
  log_info "Uso máximo de disco (filesystems locales): ${max_pct}% (umbral ${THRESHOLD}%)"

  if ! threshold_exceeded; then
    log_info "Por debajo del umbral; no se ejecuta mantenimiento."
    exit 0
  fi

  log_warn "Umbral de disco alcanzado o superado; se ejecutará mantenimiento (fan-out si aplica)."

  if cooldown_active; then
    log_info "Cooldown activo (${COOLDOWN_SEC}s); omitiendo ejecución (usa --force para ignorar)."
    exit 0
  fi

  log_ok "Ejecutando mantenimiento local…"
  run_local_maintain || log_warn "Mantenimiento local terminó con error (continuando con peers si hay)."

  local peer
  for peer in ${PEERS}; do
    [[ -z "${peer}" ]] && continue
    log_ok "Peer: ${peer}"
    run_remote_maintain "${peer}" || log_warn "Fallo SSH/maintain en ${peer}"
  done

  if [[ "${DRY_RUN}" != "true" ]]; then
    write_cooldown
  fi
  log_ok "opsly-disk-maintain-fanout completado."
}

main "$@"
