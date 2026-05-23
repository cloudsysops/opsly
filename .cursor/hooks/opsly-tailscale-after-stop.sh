#!/usr/bin/env bash
# Hook Cursor `stop`: registra fin de turno y opcionalmente comprueba Tailscale (ver env abajo).
# Entrada: JSON del hook en stdin (se conserva en OPSLY_HOOK_STDIN_JSON para auditoría).
# Salida: JSON vacío (evento `stop` no requiere campos obligatorios en la hoja de Cursor hooks).
set -euo pipefail

HOOK_STDIN="$(cat || true)"
export OPSLY_HOOK_STDIN_JSON="${HOOK_STDIN}"

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
