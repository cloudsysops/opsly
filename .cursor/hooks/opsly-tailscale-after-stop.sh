#!/usr/bin/env bash
# Hook Cursor `stop`: registra fin de turno y opcionalmente comprueba Tailscale (ver env abajo).
# Entrada: JSON del hook en stdin (se descarta; no se exporta en variables de entorno).
# Salida: JSON vacío (evento `stop` no requiere campos obligatorios en la hoja de Cursor hooks).
set -euo pipefail

cat >/dev/null || true

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
cd "${REPO_ROOT}"

if [[ "${OPSLY_HOOK_TAILSCALE:-1}" == "0" ]]; then
  printf '%s\n' '{}'
  exit 0
fi

mkdir -p "${REPO_ROOT}/.cursor/hooks/logs"

if ! python3 "${REPO_ROOT}/scripts/opsly_tailscale_cli.py" agent-stop-hook \
  >>"${REPO_ROOT}/.cursor/hooks/logs/tailscale-stop.stdout.log" 2>>"${REPO_ROOT}/.cursor/hooks/logs/tailscale-stop.stderr.log"; then
  :
fi

printf '%s\n' '{}'
exit 0
