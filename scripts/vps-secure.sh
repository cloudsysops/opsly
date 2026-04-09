#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
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
    --help|-h)
      cat <<'EOF'
Uso:
  ./scripts/vps-secure.sh [--dry-run] [--ssh-host 100.120.151.91] [--ssh-user vps-dragon]

Acciones:
  - Configura UFW para permitir SSH solo desde 100.64.0.0/10 (Tailscale).
  - Mantiene 80/443 abiertos para tráfico web.
  - Habilita UFW de forma idempotente.

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

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

run sudo ufw --force reset
run sudo ufw default deny incoming
run sudo ufw default allow outgoing
run sudo ufw allow from "${TS_NET_CIDR}" to any port 22 proto tcp
run sudo ufw allow 80/tcp
run sudo ufw allow 443/tcp
run sudo ufw --force enable
run sudo ufw status verbose
EOF

echo "[vps-secure] Aplicando reglas UFW en ${SSH_USER}@${SSH_HOST} (dry-run=${DRY_RUN})"
ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_USER}@${SSH_HOST}" \
  "bash -s -- '${TS_NET_CIDR}' '${DRY_RUN}'" <<<"${REMOTE_SCRIPT}"

echo "[vps-secure] OK. Recomendación Cloudflare: activar Proxy ON en *.ops.smiletripcare.com"
