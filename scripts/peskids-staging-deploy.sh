#!/usr/bin/env bash
# Deploy an immutable Peskids candidate to the private staging container.
set -euo pipefail
: "${PESKIDS_IMAGE:?PESKIDS_IMAGE is required}"
: "${PESKIDS_IMAGE_DIGEST:?PESKIDS_IMAGE_DIGEST is required}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${DOPPLER_TOKEN_STG:?DOPPLER_TOKEN_STG is required}"
[[ "$PESKIDS_IMAGE" == ghcr.io/cloudsysops/peskids:sha-* ]] || exit 1
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1

container=peskids-staging
port=3304
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
DOPPLER_TOKEN="$DOPPLER_TOKEN_STG" doppler secrets download --project ops-intcloudsysops --config stg --no-file --format docker > "$env_file"
# shellcheck disable=SC1091
source scripts/lib/peskids-docker-env-filter.sh
filter_peskids_docker_env "$env_file"
printf 'PESKIDS_GIT_SHA=%s\nPESKIDS_IMAGE_TAG=%s\n' "$RELEASE_SHA" "$PESKIDS_IMAGE" >> "$env_file"
docker pull "$PESKIDS_IMAGE"
repo_digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "$PESKIDS_IMAGE")"
expected_digest="${PESKIDS_IMAGE%@*}@${PESKIDS_IMAGE_DIGEST}"
[ "$repo_digest" = "$expected_digest" ] || { echo "Staging image digest mismatch" >&2; exit 1; }
docker rm -f "$container" 2>/dev/null || true
docker run -d --name "$container" --restart unless-stopped --network traefik-public \
  -p "127.0.0.1:${port}:3004" --env-file "$env_file" "$PESKIDS_IMAGE" >/dev/null

for attempt in {1..30}; do
  if body="$(curl -fsSL --max-time 5 "http://127.0.0.1:${port}/api/health" 2>/dev/null)" \
    && echo "$body" | jq -e --arg sha "$RELEASE_SHA" '.status == "ok" and .git_sha == $sha' >/dev/null; then
    curl -fsSL --max-time 10 "http://127.0.0.1:${port}/" >/dev/null
    curl -fsSL --max-time 10 "http://127.0.0.1:${port}/admin/login" >/dev/null
    exit 0
  fi
  echo "Waiting for staging health (attempt ${attempt}/30)..."
  sleep 3
done
docker logs "$container" --tail 80 >&2 || true
exit 1
