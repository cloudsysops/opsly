#!/usr/bin/env bash
# Pull GHCR peskids image on VPS and recreate container (Doppler runtime env).
# Used by GitHub Actions after CI green on main; manual fallback when image already in GHCR.
set -euo pipefail

SSH_HOST="${SSH_HOST:-vps-dragon@100.120.151.91}"
REPO_PATH="${VPS_PATH:-/opt/opsly}"
IMAGE="${PESKIDS_IMAGE:-ghcr.io/cloudsysops/peskids:latest}"
DRY_RUN=false

usage() {
  cat <<EOF
Usage: ./scripts/peskids-deploy-vps.sh [--dry-run]

Pulls $IMAGE on the VPS, recreates container "peskids" on traefik-public (port 3004).
Requires: doppler scoped at $REPO_PATH, docker login ghcr.io on VPS (Deploy workflow does login).

Rebuild from source on VPS (no GHCR): ./scripts/peskids-rebuild-vps.sh
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
  cat <<REMOTE
set -euo pipefail
cd ${REPO_PATH}
git fetch origin main
git checkout main
git pull --ff-only origin main

echo "Pulling ${IMAGE}..."
docker pull ${IMAGE}

docker stop peskids 2>/dev/null || true
docker rm peskids 2>/dev/null || true

ENV_FILE="\$(mktemp)"
trap 'rm -f "\$ENV_FILE"' EXIT
doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd >"\$ENV_FILE"
# Strip platform-wide NEXT_PUBLIC_* that point at wrong API or Docker hostnames (browsers cannot use them).
source ${REPO_PATH}/scripts/lib/peskids-docker-env-filter.sh
filter_peskids_docker_env "\$ENV_FILE"

docker run -d --name peskids --restart unless-stopped \\
  --network traefik-public \\
  -p 127.0.0.1:3004:3004 \\
  --env-file "\$ENV_FILE" \\
  ${IMAGE}

sleep 3
curl -sf http://127.0.0.1:3004/ >/dev/null && echo "ok   peskids local health"
REMOTE
}

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would SSH deploy peskids ($IMAGE) on $SSH_HOST"
  exit 0
fi

ssh -o BatchMode=yes "$SSH_HOST" "bash -s" < <(remote_script)
echo "Done. https://peskids.op-sly.com"
