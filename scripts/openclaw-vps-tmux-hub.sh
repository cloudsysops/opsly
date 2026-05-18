#!/usr/bin/env bash
# Crea sesión tmux "openclaw-hub" en el VPS (o host operador): gateway OpenClaw + ventanas de supervisión.
# Uso: ./scripts/openclaw-vps-tmux-hub.sh [--dry-run|--apply]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${OPSLY_OPENCLAW_TMUX_SESSION:-openclaw-hub}"
DRY_RUN=true

for arg in "$@"; do
  case "${arg}" in
    --apply) DRY_RUN=false ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux no está instalado. En Ubuntu: sudo apt-get install -y tmux" >&2
  exit 1
fi

run() {
  local cmd=$1
  if [[ "${DRY_RUN}" == true ]]; then
    printf '[dry-run] %s\n' "${cmd}"
  else
    bash -c "${cmd}"
  fi
}

if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  echo "La sesión tmux '${SESSION_NAME}' ya existe. attach: tmux attach -t ${SESSION_NAME}"
  exit 0
fi

# openclaw en PATH (nvm) o wrapper Node 22 del repo.
OPENCLAW_BIN="openclaw"
if ! command -v openclaw >/dev/null 2>&1 && [[ -x "${REPO_ROOT}/scripts/openclaw-with-node22.sh" ]]; then
  OPENCLAW_BIN="${REPO_ROOT}/scripts/openclaw-with-node22.sh"
fi

run "tmux new-session -d -s ${SESSION_NAME} -n gateway -- ${OPENCLAW_BIN} gateway"

# Segunda ventana: latido HTTP a orchestrator (ajusta puerto si difiere).
run "tmux new-window -t ${SESSION_NAME}:1 -n orch-health -- watch -n 30 curl -sf http://127.0.0.1:3011/health"

mode="apply"
if [[ "${DRY_RUN}" == true ]]; then
  mode="dry-run"
  echo "Ninguna sesión tmux creada (solo plan). Ejecuta con --apply en el VPS."
else
  echo "Sesión '${SESSION_NAME}' creada."
  echo "  tmux attach -t ${SESSION_NAME}"
  echo "  Ctrl-b d  para detach sin matar procesos."
fi
echo "Modo: ${mode}."
