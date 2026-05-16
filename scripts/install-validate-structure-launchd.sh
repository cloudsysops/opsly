#!/usr/bin/env bash
# Instala o actualiza el LaunchAgent de validación de estructura (macOS).
# Logs en runtime/logs/launchd/ — nunca en logs/ en la raíz del repo.
#
# Uso: ./scripts/install-validate-structure-launchd.sh [--dry-run] [--unload]

set -euo pipefail

DRY_RUN=false
UNLOAD_ONLY=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=true ;;
    --unload) UNLOAD_ONLY=true ;;
    *) echo "Uso: $0 [--dry-run] [--unload]" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_SRC="${REPO_ROOT}/infra/launchd/com.opsly.validate-structure.plist"
PLIST_DST="${HOME}/Library/LaunchAgents/com.opsly.validate-structure.plist"
LABEL="com.opsly.validate-structure"
LOG_DIR="${REPO_ROOT}/runtime/logs/launchd"

run() {
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Solo macOS (LaunchAgents). En Linux usar cron apuntando a: npm run validate-structure" >&2
  exit 0
fi

if [[ ! -f "${PLIST_SRC}" ]]; then
  echo "Falta plantilla: ${PLIST_SRC}" >&2
  exit 1
fi

unload_agent() {
  run launchctl bootout "gui/$(id -u)" "${PLIST_DST}" 2>/dev/null \
    || run launchctl unload "${PLIST_DST}" 2>/dev/null \
    || true
}

if [[ "${UNLOAD_ONLY}" == true ]]; then
  echo "Descargando ${LABEL}…"
  unload_agent
  echo "OK. Borra manualmente logs/ en la raíz del repo si aún existe: rm -rf ${REPO_ROOT}/logs"
  exit 0
fi

run mkdir -p "${LOG_DIR}"
run mkdir -p "${HOME}/Library/LaunchAgents"
sed "s|__OPSLY_ROOT__|${REPO_ROOT}|g" "${PLIST_SRC}" >"/tmp/com.opsly.validate-structure.plist"
run cp "/tmp/com.opsly.validate-structure.plist" "${PLIST_DST}"

echo "Instalando ${LABEL} → ${PLIST_DST}"
unload_agent
if [[ "${DRY_RUN}" != true ]]; then
  launchctl bootstrap "gui/$(id -u)" "${PLIST_DST}" 2>/dev/null \
    || launchctl load -w "${PLIST_DST}"
fi

if [[ -d "${REPO_ROOT}/logs" ]]; then
  echo "Eliminando carpeta prohibida en raíz: ${REPO_ROOT}/logs"
  run rm -rf "${REPO_ROOT}/logs"
fi

echo ""
echo "✅ LaunchAgent listo. Logs: ${LOG_DIR}/validate-structure.{out,err}.log"
echo "   Validación manual: cd ${REPO_ROOT} && npm run validate-structure"
