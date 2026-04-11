#!/usr/bin/env bash
# Worker Mac 2011 / Ubuntu: carga nvm y ejecuta start-worker.sh (orchestrator).
# Uso: ./scripts/run-worker-with-nvm.sh   |   tmux: ver keep-worker-in-tmux.sh
set -euo pipefail
export NVM_DIR="${HOME}/.nvm"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${NVM_DIR}/nvm.sh"
fi
nvm use default >/dev/null
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"
exec "${ROOT}/scripts/start-worker.sh"
