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

When GitHub Actions SSHs into the VPS, set PESKIDS_DEPLOY_IN_PLACE=1 to run locally (no nested SSH).

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

# Fast-forward main; remove untracked files that would block merge (common on VPS).
pull_main_ff_only() {
  local pull_err
  pull_err="$(mktemp)"
  trap 'rm -f "$pull_err"' RETURN

  if git pull --ff-only origin main 2>"$pull_err"; then
    return 0
  fi

  if grep -q "would be overwritten by merge" "$pull_err"; then
    echo "Removing untracked files blocking git pull..."
    awk '/^\t/{ sub(/^\t/, ""); print }' "$pull_err" | while IFS= read -r path; do
      [[ -n "$path" && -e "$path" ]] && rm -f "$path"
    done
    git pull --ff-only origin main
    return 0
  fi

  cat "$pull_err" >&2
  return 1
}

run_deploy_on_host() {
  local repo_path="$1"
  local image="$2"
  set -euo pipefail
  cd "$repo_path"
  git fetch origin main
  git checkout main
  pull_main_ff_only

  echo "Pulling ${image}..."
  docker pull "$image"

  docker stop peskids 2>/dev/null || true
  docker rm peskids 2>/dev/null || true

  ENV_FILE="$(mktemp)"
  trap 'rm -f "$ENV_FILE"' EXIT
  doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd >"$ENV_FILE"
  # Strip platform-wide NEXT_PUBLIC_* that point at wrong API or Docker hostnames (browsers cannot use them).
  # shellcheck source=scripts/lib/peskids-docker-env-filter.sh
  source "${repo_path}/scripts/lib/peskids-docker-env-filter.sh"
  filter_peskids_docker_env "$ENV_FILE"

  docker run -d --name peskids --restart unless-stopped \
    --network traefik-public \
    -p 127.0.0.1:3004:3004 \
    --env-file "$ENV_FILE" \
    "$image"

  sleep 3
  curl -sf http://127.0.0.1:3004/ >/dev/null && echo "ok   peskids local health"
}

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would deploy peskids ($IMAGE) on $SSH_HOST"
  exit 0
fi

# GitHub Actions lands on the VPS via ssh-action; nested ssh to self fails (publickey).
if [[ "${PESKIDS_DEPLOY_IN_PLACE:-}" == "1" || "${PESKIDS_DEPLOY_IN_PLACE:-}" == "true" ]]; then
  echo "Deploy in place (already on VPS)"
  run_deploy_on_host "$REPO_PATH" "$IMAGE"
elif [[ -d "${REPO_PATH}/.git" ]] && [[ "$(cd "${REPO_PATH}" && pwd -P)" == "$(pwd -P)" ]]; then
  echo "Deploy in place (cwd is ${REPO_PATH})"
  run_deploy_on_host "$REPO_PATH" "$IMAGE"
else
  ssh -o BatchMode=yes "$SSH_HOST" \
    "REPO_PATH=$(printf '%q' "$REPO_PATH") IMAGE=$(printf '%q' "$IMAGE") bash -s" \
    <<'REMOTE'
set -euo pipefail
cd "$REPO_PATH"
git fetch origin main
git checkout main

pull_err="$(mktemp)"
if ! git pull --ff-only origin main 2>"$pull_err"; then
  if grep -q "would be overwritten by merge" "$pull_err"; then
    echo "Removing untracked files blocking git pull..."
    awk '/^\t/{ sub(/^\t/, ""); print }' "$pull_err" | while IFS= read -r path; do
      [[ -n "$path" && -e "$path" ]] && rm -f "$path"
    done
    git pull --ff-only origin main
  else
    cat "$pull_err" >&2
    rm -f "$pull_err"
    exit 1
  fi
fi
rm -f "$pull_err"

echo "Pulling ${IMAGE}..."
docker pull "$IMAGE"

docker stop peskids 2>/dev/null || true
docker rm peskids 2>/dev/null || true

ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd >"$ENV_FILE"
source "${REPO_PATH}/scripts/lib/peskids-docker-env-filter.sh"
filter_peskids_docker_env "$ENV_FILE"

docker run -d --name peskids --restart unless-stopped \
  --network traefik-public \
  -p 127.0.0.1:3004:3004 \
  --env-file "$ENV_FILE" \
  "$IMAGE"

sleep 3
curl -sf http://127.0.0.1:3004/ >/dev/null && echo "ok   peskids local health"
REMOTE
fi

echo "Done. https://peskids.op-sly.com"
