#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
RESET_UFW=false
SSH_HOST="${SSH_HOST:-100.120.151.91}"
SSH_USER="${SSH_USER:-vps-dragon}"
TS_NET_CIDR="${TS_NET_CIDR:-100.64.0.0/10}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --ssh-host)
      SSH_HOST="${2:-}"
      shift 2
      ;;
    --ssh-user)
      SSH_USER="${2:-}"
      shift 2
      ;;
    --reset-ufw)
      RESET_UFW=true
      shift
      ;;
    --help|-h)
      cat <<'EOF'
Uso:
  ./scripts/vps-secure.sh [--dry-run] [--reset-ufw] [--ssh-host 100.120.151.91] [--ssh-user vps-dragon]
  # (equivalente: este archivo scripts/infra/security-hardening.sh con los mismos flags)

Acciones:
  - Configura UFW para permitir SSH solo desde 100.64.0.0/10 (Tailscale).
  - Mantiene 80/443 abiertos para tráfico web.
  - Elimina regla SSH pública `allow 22/tcp` si existe.
  - Habilita UFW de forma idempotente.
  - `--reset-ufw` aplica reset completo (opcional).

Nota:
  Para DNS público en Cloudflare, mantener Proxy ON en *.ops.smiletripcare.com.
EOF
      exit 0
      ;;
    *)
      echo "[vps-secure] argumento desconocido: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${SSH_HOST}" || -z "${SSH_USER}" ]]; then
  echo "[vps-secure] SSH_HOST/SSH_USER inválidos" >&2
  exit 1
fi

read -r -d '' REMOTE_SCRIPT <<'EOF' || true
set -euo pipefail
TS_NET_CIDR="${1:-100.64.0.0/10}"
DRY_RUN="${2:-false}"
RESET_UFW="${3:-false}"

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

if [[ "${RESET_UFW}" == "true" ]]; then
  run sudo ufw --force reset
fi
run sudo ufw default deny incoming
run sudo ufw default allow outgoing
run sudo ufw --force delete allow 22/tcp || true
run sudo ufw --force delete allow ssh || true
run sudo ufw allow from "${TS_NET_CIDR}" to any port 22 proto tcp
run sudo ufw allow 80/tcp
run sudo ufw allow 443/tcp
run sudo ufw --force enable
run sudo ufw status verbose
EOF

echo "[vps-secure] Aplicando reglas UFW en ${SSH_USER}@${SSH_HOST} (dry-run=${DRY_RUN})"
ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_USER}@${SSH_HOST}" \
  "bash -s -- '${TS_NET_CIDR}' '${DRY_RUN}' '${RESET_UFW}'" <<<"${REMOTE_SCRIPT}"

echo "[vps-secure] OK. Recomendación Cloudflare: activar Proxy ON en *.ops.smiletripcare.com"
