#!/usr/bin/env bash
# Manual VPS deploy for Panini Lab (when not using GitHub Actions).
# Run on VPS after git pull, or via: ssh vps-dragon@100.120.151.91 'bash -s' < scripts/deploy-panini-lab-vps.sh
set -euo pipefail

ROOT="${OPSLY_ROOT:-/opt/opsly}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-panini-lab-vps.sh [--dry-run]

Env:
  OPSLY_ROOT          Repo path on VPS (default /opt/opsly)
  PANINI_IMAGE_TAG    Image tag (default latest)
  DOPPLER_PROJECT     default ops-intcloudsysops
  DOPPLER_CONFIG      default prd
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

cd "$ROOT"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "== Panini Lab VPS deploy =="
echo "Root: $ROOT"

if [[ ! -f infra/traefik/dynamic/panini-lab.yml ]]; then
  echo "missing infra/traefik/dynamic/panini-lab.yml" >&2
  exit 1
fi
echo "Traefik dynamic config OK (file provider reloads on change)"

if [[ "$DRY_RUN" != true ]]; then
  doppler run --project "$PROJECT" --config "$CONFIG" -- \
    docker compose -f infra/docker-compose.panini-lab.yml pull
  doppler run --project "$PROJECT" --config "$CONFIG" -- \
    docker compose -f infra/docker-compose.panini-lab.yml up -d --remove-orphans
fi

sleep 5
if [[ "$DRY_RUN" != true ]]; then
  curl -sf http://127.0.0.1:3005/dashboard >/dev/null && echo "ok   localhost:3005/dashboard"
  docker compose -f infra/docker-compose.panini-lab.yml ps
fi

echo "Done. Public: https://panini.op-sly.com/dashboard"
