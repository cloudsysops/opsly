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

Rebuilds apps/peskids on VPS from source (docker build on VPS).
Prefer CI path after merge: GitHub "Deploy Peskids" or ./scripts/peskids-deploy-vps.sh (GHCR pull).
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
doppler run --project ops-intcloudsysops --config prd -- bash -c '
  set -euo pipefail
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?missing NEXT_PUBLIC_SUPABASE_URL in Doppler}"
  SUPABASE_ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?missing NEXT_PUBLIC_SUPABASE_ANON_KEY in Doppler}"
  WA="${NEXT_PUBLIC_PESKIDS_WHATSAPP_E164:?missing NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 in Doppler}"
  WAD="${NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY:-+1 WhatsApp}"
  WAP="${NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL:-Hola Peskids}"
  WA_LLANO="${NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_E164:-$WA}"
  WAD_LLANO="${NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_DISPLAY:-+57 305 470 2600}"
  WA_DOM="${NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_E164:-$WA}"
  WAD_DOM="${NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_DISPLAY:-+57 305 479 0273}"
  docker build \
    -f apps/peskids/Dockerfile \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_E164="$WA" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY="$WAD" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL="$WAP" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_E164="$WA_LLANO" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_DISPLAY="$WAD_LLANO" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_E164="$WA_DOM" \
    --build-arg NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_DISPLAY="$WAD_DOM" \
    -t ghcr.io/cloudsysops/peskids:latest .
'
docker stop peskids 2>/dev/null || true
docker rm peskids 2>/dev/null || true
# doppler run only exports to the docker CLI process; pass secrets into the container.
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd >"$ENV_FILE"
source /opt/opsly/scripts/lib/peskids-docker-env-filter.sh
filter_peskids_docker_env "$ENV_FILE"
docker run -d --name peskids --restart unless-stopped \
  --network traefik-public \
  -p 127.0.0.1:3004:3004 \
  --env-file "$ENV_FILE" \
  ghcr.io/cloudsysops/peskids:latest
check_url() {
  local label="$1"
  local url="$2"
  local needle="${3:-}"
  local body
  local attempt
  for attempt in 1 2 3 4 5; do
    if body="$(curl -fsSL --max-redirs 5 "$url" 2>/dev/null)"; then
      if [[ -z "$needle" || "$body" == *"$needle"* ]]; then
        echo "ok   ${label}"
        return 0
      fi
    fi
    echo "retry ${label} (${attempt}/5)"
    sleep 5
  done
  echo "fail ${label}: ${url}" >&2
  return 1
}

check_url "peskids local health" "http://127.0.0.1:3004/api/health" '"ok":true'
check_url "peskids local admin login" "http://127.0.0.1:3004/admin/login"
check_url "peskids local familias login" "http://127.0.0.1:3004/familias/login"
REMOTE
}

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would SSH rebuild peskids on $SSH_HOST"
  exit 0
fi

ssh -o BatchMode=yes "$SSH_HOST" "bash -s" < <(remote_script)
echo "Done. Verify wa.me: https://peskids.op-sly.com (FAB WhatsApp)"
