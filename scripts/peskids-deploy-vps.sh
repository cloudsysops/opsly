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

# CI invokes the copy already on disk; git pull updates the file but not this process.
# Re-exec once so health-check logic and needles always match main.
if [[ "${PESKIDS_DEPLOY_IN_PLACE:-}" == "1" || "${PESKIDS_DEPLOY_IN_PLACE:-}" == "true" ]]; then
  if [[ "${PESKIDS_DEPLOY_SCRIPT_REEXECED:-}" != "1" ]]; then
    cd "$REPO_PATH"
    git fetch origin main
    git checkout main
    git pull --ff-only origin main
    export PESKIDS_DEPLOY_SCRIPT_REEXECED=1
    export PESKIDS_DEPLOY_IN_PLACE=1
    export PESKIDS_IMAGE="$IMAGE"
    exec bash "$REPO_PATH/scripts/peskids-deploy-vps.sh" "$@"
  fi
fi

wait_for_peskids_ready() {
  local max_wait="${PESKIDS_HEALTH_WAIT_SECONDS:-90}"
  local elapsed=0
  local body

  while (( elapsed < max_wait )); do
    if body="$(curl -fsSL --max-time 5 http://127.0.0.1:3004/api/health 2>/dev/null)" \
      && [[ "$body" == *'"status":"ok"'* ]]; then
      echo "ok   peskids local health (${elapsed}s)"
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
    echo "waiting for peskids (${elapsed}s/${max_wait}s)..."
  done

  echo "fail peskids local health after ${max_wait}s" >&2
  docker logs peskids --tail 40 2>&1 || true
  return 1
}

check_url() {
  local label="$1"
  local url="$2"
  local needle="${3:-}"
  local body
  local attempt

  for attempt in 1 2 3 4 5; do
    if body="$(curl -fsSL --max-redirs 5 --max-time 15 "$url" 2>/dev/null)"; then
      if [[ -z "$needle" || "$body" == *"$needle"* ]]; then
        echo "ok   ${label}"
        return 0
      fi
    fi
    echo "retry ${label} (${attempt}/5)"
    sleep 6
  done
  echo "fail ${label}: ${url}" >&2
  return 1
}

run_deploy_on_host() {
  local repo_path="$1"
  local image="$2"
  set -euo pipefail
  cd "$repo_path"

  if [[ "${PESKIDS_DEPLOY_SCRIPT_REEXECED:-}" != "1" ]]; then
    git fetch origin main
    git checkout main
    git pull --ff-only origin main
  fi

  echo "Pulling ${image}..."
  docker pull "$image"

  docker stop peskids 2>/dev/null || true
  docker rm peskids 2>/dev/null || true

  ENV_FILE="$(mktemp)"
  trap 'rm -f "$ENV_FILE"' EXIT
  doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd >"$ENV_FILE"
  # shellcheck source=scripts/lib/peskids-docker-env-filter.sh
  source "${repo_path}/scripts/lib/peskids-docker-env-filter.sh"
  filter_peskids_docker_env "$ENV_FILE"

  docker run -d --name peskids --restart unless-stopped \
    --network traefik-public \
    -p 127.0.0.1:3004:3004 \
    --env-file "$ENV_FILE" \
    "$image"

  wait_for_peskids_ready
  check_url "peskids local admin login" "http://127.0.0.1:3004/admin/login"
  check_url "peskids local familias login" "http://127.0.0.1:3004/familias/login"
}

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would deploy peskids ($IMAGE) on $SSH_HOST"
  exit 0
fi

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
export PESKIDS_DEPLOY_IN_PLACE=1
export PESKIDS_IMAGE="$IMAGE"
bash "$REPO_PATH/scripts/peskids-deploy-vps.sh"
REMOTE
fi

echo "Done. https://peskids.op-sly.com"
