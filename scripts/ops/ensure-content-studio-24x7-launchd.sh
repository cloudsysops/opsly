#!/usr/bin/env bash
# Instala el tick 24×7 de Content Studio (launchd) en el Mac operador.
# Publica el siguiente Short y, si el gamer está listo, encola render.
#
# Uso:
#   ./scripts/ops/ensure-content-studio-24x7-launchd.sh
#   ./scripts/ops/ensure-content-studio-24x7-launchd.sh --dry-run
#   ./scripts/ops/ensure-content-studio-24x7-launchd.sh --unload
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
PLIST="com.opsly.content-studio-24x7.plist"
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
if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY-RUN] would install ${DEST}"
else
  cp /tmp/${PLIST} "${DEST}"
fi

if [[ "$UNLOAD" == "true" ]]; then
  run launchctl unload "${DEST}" 2>/dev/null || true
  echo "[ensure] LaunchAgent ${PLIST} desinstalado (archivo conservado en ${DEST})."
  exit 0
fi

run launchctl unload "${DEST}" 2>/dev/null || true
run launchctl load -w "${DEST}"

echo "[ensure] LaunchAgent ${PLIST} instalado — tick cada 15 min con Doppler."
echo "[ensure] Logs: ${LOG_DIR}/launchd-content-studio-24x7.{out,err}"
echo "[ensure] Desinstalar: ./scripts/ops/ensure-content-studio-24x7-launchd.sh --unload"
