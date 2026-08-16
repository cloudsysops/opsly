#!/usr/bin/env bash
# Instala el autodispatch overnight (launchd) en la máquina local (Mac op). 
# Ejecuta el script cada 5 min vía Doppler (PLATFORM_ADMIN_TOKEN nunca en repo).
#
# Uso:
#   ./scripts/ops/ensure-overnight-autodispatch-launchd.sh
#   ./scripts/ops/ensure-overnight-autodispatch-launchd.sh --dry-run
#   ./scripts/ops/ensure-overnight-autodispatch-launchd.sh --unload
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DRY_RUN=false
UNLOAD=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --unload) UNLOAD=true ;;
    -h | --help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done

[[ "$(uname -s)" == "Darwin" ]] || { echo "[ensure] Solo macOS — este launchd es el del Mac operador." >&2; exit 1; }

LAUNCH_AGENTS="${HOME}/Library/LaunchAgents"
LOG_DIR="${ROOT}/runtime/logs"
PLIST="com.opsly.pc-gamer-autodispatch.plist"
DEST="${LAUNCH_AGENTS}/${PLIST}"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

mkdir -p "${LAUNCH_AGENTS}" "${LOG_DIR}"
sed "s|__OPSLY_ROOT__|${ROOT}|g" "${ROOT}/infra/launchd/${PLIST}" >/tmp/${PLIST}
cp /tmp/${PLIST} "${DEST}"

if [[ "$UNLOAD" == "true" ]]; then
  run launchctl unload "${DEST}" 2>/dev/null || true
  echo "[ensure] LaunchAgent ${PLIST} desinstalado (archivo conservado en ${DEST})."
  exit 0
fi

run launchctl unload "${DEST}" 2>/dev/null || true
run launchctl load -w "${DEST}"

echo "[ensure] LaunchAgent ${PLIST} instalado — corre cada 5 min con doppler."
echo "[ensure] Logs: ${LOG_DIR}/launchd-pc-gamer-autodispatch.{out,err}"
echo "[ensure] Desinstalar: ./scripts/ops/ensure-overnight-autodispatch-launchd.sh --unload"