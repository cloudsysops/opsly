#!/usr/bin/env bash
# Arranca el orchestrator en una sesión tmux **detached** (sigue con la pantalla apagada / sin SSH).
# Requiere: tmux instalado, REDIS_URL en ~/opsly/.env.local, nvm con Node LTS.
#
#   ./scripts/keep-worker-in-tmux.sh
#   tmux attach -t opsly-orchestrator   # ver logs
#   tmux kill-session -t opsly-orchestrator   # parar
#
set -euo pipefail
SESSION=opsly-orchestrator
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER="${ROOT}/scripts/run-worker-with-nvm.sh"
if ! command -v tmux >/dev/null 2>&1; then
  echo "Instala tmux: sudo apt install -y tmux" >&2
  exit 1
fi
if tmux has-session -t "${SESSION}" 2>/dev/null; then
  echo "Ya existe tmux '${SESSION}'. Adjuntar: tmux attach -t ${SESSION}"
  exit 0
fi
tmux new-session -d -s "${SESSION}" "${LAUNCHER}"
echo "Orchestrator en tmux '${SESSION}' (detached). Ver: tmux attach -t ${SESSION}"
