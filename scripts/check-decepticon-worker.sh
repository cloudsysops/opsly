#!/usr/bin/env bash
# Comprueba prerequisitos y presencia de Decepticon en el worker Ubuntu (opsly-mac2011 / opsly-worker).
# No imprime secretos. Requiere SSH sin contraseña al worker o agente cargado.
#
# Uso:
#   ./scripts/check-decepticon-worker.sh
#   ./scripts/check-decepticon-worker.sh --dry-run
#   DECEPTICON_WORKER_SSH=opslyquantum@100.80.41.29 ./scripts/check-decepticon-worker.sh
#
# Variables (opcionales, alineadas a verify-platform-smoke):
#   DECEPTICON_WORKER_SSH — destino SSH completo (tiene prioridad)
#   WORKER_USER, WORKER_TAILSCALE_NAME, OPSLY_WORKER_HOSTNAME, WORKER_SSH, USE_TAILSCALE_SSH
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

DRY_RUN=0
for arg in "$@"; do
  if [[ "${arg}" == "--dry-run" ]]; then
    DRY_RUN=1
  fi
done

if [[ -f "${REPO_ROOT}/config/worker-tailscale.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/config/worker-tailscale.env"
  set +a
fi

DECEPTICON_WORKER_SSH="${DECEPTICON_WORKER_SSH:-}"
WORKER_USER="${WORKER_USER:-opslyquantum}"
WORKER_TAILSCALE_NAME="${WORKER_TAILSCALE_NAME:-opsly-worker}"
OPSLY_WORKER_HOSTNAME="${OPSLY_WORKER_HOSTNAME:-}"
USE_TAILSCALE_SSH="${USE_TAILSCALE_SSH:-1}"
WORKER_SSH="${WORKER_SSH:-}"

require_cmd ssh

resolve_worker_target() {
  if [[ -n "${DECEPTICON_WORKER_SSH}" ]]; then
    echo "${DECEPTICON_WORKER_SSH}"
    return
  fi
  if [[ -n "${WORKER_SSH}" ]]; then
    echo "${WORKER_SSH}"
    return
  fi
  if [[ -n "${OPSLY_WORKER_HOSTNAME}" ]]; then
    echo "${WORKER_USER}@${OPSLY_WORKER_HOSTNAME}"
    return
  fi
  if [[ "${USE_TAILSCALE_SSH}" != "0" ]] && command -v tailscale >/dev/null 2>&1; then
    local suf
    suf="$(tailscale dns status 2>/dev/null | grep -oE 'suffix = [^)]+' | head -1 | sed 's/suffix = //' | tr -d ' ')"
    if [[ -n "${suf}" ]]; then
      echo "${WORKER_USER}@${WORKER_TAILSCALE_NAME}.${suf}"
      return
    fi
  fi
  echo "${WORKER_USER}@100.80.41.29"
}

TARGET="$(resolve_worker_target)"

echo "Decepticon worker check"
echo "  SSH target: ${TARGET}"
echo "  dry_run: ${DRY_RUN}"
echo ""

if [[ "${DRY_RUN}" == "1" ]]; then
  log_info "Would SSH to ${TARGET} and run: hostname, docker, docker compose version, df, ss ports, decepticon PATH, ~/.decepticon listing, .env presence"
  exit 0
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 \
  -o "StrictHostKeyChecking=${OPSLY_WORKER_SSH_STRICT:-accept-new}" \
  "${TARGET}" bash -s <<'REMOTE'
set -e
echo "== hostname =="
hostname
echo "== docker =="
docker --version
echo "== docker compose v2 =="
if docker compose version 2>/dev/null; then
  :
else
  echo "(docker compose v2 missing — install package docker-compose-plugin; see docs/DECEPTICON-WORKER.md)"
fi
echo "== disk / =="
df -h / | tail -1
echo "== listeners 3000 4000 2024 11434 =="
ss -tlnp 2>/dev/null | grep -E ':3000|:4000|:2024|:11434' || true
echo "== decepticon launcher =="
if command -v decepticon >/dev/null 2>&1; then
  decepticon --help 2>&1 | head -3
else
  echo "(decepticon not in PATH)"
fi
echo "== ~/.decepticon =="
if [[ -d "${HOME}/.decepticon" ]]; then
  ls -la "${HOME}/.decepticon" | head -8
else
  echo "(~/.decepticon missing)"
fi
echo "== .env present (no contents) =="
if [[ -f "${HOME}/.decepticon/.env" ]]; then
  echo "yes"
else
  echo "no"
fi
REMOTE
then
  log_error "SSH failed or remote command error. Check Tailscale and SSH config."
  exit 1
fi

log_ok "Check finished (review output above for docker compose v2 and ~/.decepticon)."
