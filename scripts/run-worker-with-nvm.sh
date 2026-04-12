#!/usr/bin/env bash
# Worker Mac 2011 / Ubuntu: carga nvm y ejecuta start-worker.sh (orchestrator).
# Antes de arrancar: git pull --ff-only en la rama actual (igual que VPS / opsly-admin).
# Emergencia sin red: OPSLY_SKIP_GIT_PULL=1
# Uso: ./scripts/run-worker-with-nvm.sh   |   tmux: ver keep-worker-in-tmux.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if [[ "${OPSLY_SKIP_GIT_PULL:-0}" != "1" ]]; then
  if [[ -x "${ROOT}/scripts/git-sync-repo.sh" ]]; then
    "${ROOT}/scripts/git-sync-repo.sh" "${ROOT}" || {
      echo "run-worker-with-nvm: git-sync-repo falló; arranque abortado. Corrige el repo o exporta OPSLY_SKIP_GIT_PULL=1" >&2
      exit 1
    }
  fi
fi

export NVM_DIR="${HOME}/.nvm"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${NVM_DIR}/nvm.sh"
fi
nvm use default >/dev/null
exec "${ROOT}/scripts/start-worker.sh"
