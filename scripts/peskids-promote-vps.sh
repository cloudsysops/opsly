#!/usr/bin/env bash
# Promote or restore a Peskids immutable image on production.
# The caller must enforce the production environment and Bogotá window.
set -euo pipefail

ACTION="${1:-}"
case "$ACTION" in
  --promote|--rollback) ;;
  *) echo "Usage: $0 --promote|--rollback" >&2; exit 1 ;;
esac

: "${DOPPLER_TOKEN_PRD:?DOPPLER_TOKEN_PRD is required}"
STATE_FILE="${PESKIDS_RELEASE_STATE_FILE:-/opt/opsly/runtime/peskids-previous-image}"

if [[ "$ACTION" == "--promote" ]]; then
  : "${PESKIDS_IMAGE:?PESKIDS_IMAGE is required}"
  : "${PESKIDS_IMAGE_DIGEST:?PESKIDS_IMAGE_DIGEST is required}"
  [[ "$PESKIDS_IMAGE" == ghcr.io/cloudsysops/peskids:sha-* ]] || {
    echo "Production accepts only sha-tagged images" >&2
    exit 1
  }
  previous="$(docker inspect --format '{{.Config.Image}}' peskids 2>/dev/null || true)"
  [[ "$previous" == ghcr.io/cloudsysops/peskids:sha-* ]] || {
    echo "No known immutable previous Peskids image; refusing promotion" >&2
    exit 1
  }
  install -d -m 700 "$(dirname "$STATE_FILE")"
  printf '%s\n' "$previous" > "$STATE_FILE"
  chmod 600 "$STATE_FILE"
else
  [ -s "$STATE_FILE" ] || { echo "No deterministic rollback target" >&2; exit 1; }
  PESKIDS_IMAGE="$(head -n 1 "$STATE_FILE")"
  [[ "$PESKIDS_IMAGE" == ghcr.io/cloudsysops/peskids:sha-* ]] || exit 1
fi

if [[ "$ACTION" == "--promote" ]]; then
  docker pull "$PESKIDS_IMAGE"
  repo_digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "$PESKIDS_IMAGE")"
  expected_digest="${PESKIDS_IMAGE%@*}@${PESKIDS_IMAGE_DIGEST}"
  [ "$repo_digest" = "$expected_digest" ] || { echo "Production image digest mismatch" >&2; exit 1; }
fi

echo "$DOPPLER_TOKEN_PRD" | docker login ghcr.io -u github-actions --password-stdin
export PESKIDS_IMAGE PESKIDS_DEPLOY_IN_PLACE=1
bash scripts/peskids-deploy-vps.sh
