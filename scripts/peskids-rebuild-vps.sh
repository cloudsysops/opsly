#!/usr/bin/env bash
# Rebuild Peskids image on VPS with WhatsApp + Supabase from Doppler (no secret values in logs).
set -euo pipefail

SSH_HOST="${SSH_HOST:-vps-dragon@100.120.151.91}"
REPO_PATH="${VPS_PATH:-/opt/opsly}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
IMAGE="${PESKIDS_IMAGE:-ghcr.io/cloudsysops/peskids:latest}"
DRY_RUN=false

usage() {
  cat <<EOF
Usage: ./scripts/peskids-rebuild-vps.sh [--dry-run]

Rebuilds apps/peskids on VPS with Doppler build-args (NEXT_PUBLIC_PESKIDS_WHATSAPP_*).
Requires: git pull on VPS already done, doppler scoped at $REPO_PATH.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

remote_script() {
  cat <<'REMOTE'
set -euo pipefail
cd /opt/opsly
git fetch origin main
git checkout main
git pull --ff-only origin main
cd apps/peskids
doppler run --project ops-intcloudsysops --config prd -- bash -c '
  set -euo pipefail
  WA="${NEXT_PUBLIC_PESKIDS_WHATSAPP_E164:?missing NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 in Doppler}"
  WAD="${NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY:-+1 WhatsApp}"
  WAP="${NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL:-Hola Peskids}"
  docker build \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_E164="$WA" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY="$WAD" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL="$WAP" \
    -t ghcr.io/cloudsysops/peskids:latest .
'
docker stop peskids 2>/dev/null || true
docker rm peskids 2>/dev/null || true
# doppler run only exports to the docker CLI process; pass secrets into the container.
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd >"$ENV_FILE"
docker run -d --name peskids --restart unless-stopped \
  --network traefik-public \
  -p 127.0.0.1:3004:3004 \
  --env-file "$ENV_FILE" \
  ghcr.io/cloudsysops/peskids:latest
sleep 3
curl -sf http://127.0.0.1:3004/ >/dev/null && echo "ok   peskids local health"
REMOTE
}

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would SSH rebuild peskids on $SSH_HOST"
  exit 0
fi

ssh -o BatchMode=yes "$SSH_HOST" "bash -s" < <(remote_script)
echo "Done. Verify wa.me: https://peskids.op-sly.com (FAB WhatsApp)"
