#!/usr/bin/env bash
# Worker Mac 2011 / Ubuntu: carga nvm y ejecuta start-worker.sh (orchestrator).
# Antes de arrancar: git pull --ff-only en la rama actual (igual que VPS / opsly-admin).
# Emergencia sin red: OPSLY_SKIP_GIT_PULL=1
# Uso: ./scripts/run-worker-with-nvm.sh   |   tmux: ver keep-worker-in-tmux.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

# Misma carga que start-worker.sh, pero antes del ensure Ollama (OPSLY_ENSURE_OLLAMA en .env.local).
if [[ -f "${ROOT}/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT}/.env.local"
  set +a
fi
if [[ -f "${ROOT}/.env.worker" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT}/.env.worker"
  set +a
fi

if [[ "${OPSLY_SKIP_GIT_PULL:-0}" != "1" ]]; then
  if [[ -x "${ROOT}/scripts/utils/git-sync.sh" ]]; then
    "${ROOT}/scripts/utils/git-sync.sh" "${ROOT}" || {
      echo "run-worker-with-nvm: git-sync falló; arranque abortado. Corrige el repo o exporta OPSLY_SKIP_GIT_PULL=1" >&2
      exit 1
    }
  fi
fi

# Opcional: levantar / verificar Ollama local antes del orchestrator (ADR-024).
# En .env.local: OPSLY_ENSURE_OLLAMA=1. Si debe abortar sin Ollama: OPSLY_FAIL_WITHOUT_OLLAMA=1
if [[ "${OPSLY_ENSURE_OLLAMA:-0}" == "1" ]] && [[ -x "${ROOT}/scripts/ensure-ollama-local.sh" ]]; then
  if ! "${ROOT}/scripts/ensure-ollama-local.sh" --ensure; then
    echo "run-worker-with-nvm: ensure-ollama-local falló (Ollama no responde en OLLAMA_BASE_URL)." >&2
    if [[ "${OPSLY_FAIL_WITHOUT_OLLAMA:-0}" == "1" ]]; then
      exit 1
    fi
    echo "run-worker-with-nvm: continuando sin Ollama local (gateway puede usar otro OLLAMA_URL en VPS)." >&2
  fi
fi

export NVM_DIR="${HOME}/.nvm"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${NVM_DIR}/nvm.sh"
fi
nvm use default >/dev/null
exec "${ROOT}/scripts/start-worker.sh"
