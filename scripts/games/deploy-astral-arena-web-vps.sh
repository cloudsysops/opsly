#!/usr/bin/env bash
set -euo pipefail

: "${ASTRAL_ARENA_WEB_IMAGE:?ASTRAL_ARENA_WEB_IMAGE is required}"
: "${ASTRAL_ARENA_WEB_DIGEST:?ASTRAL_ARENA_WEB_DIGEST is required}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"

[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "invalid RELEASE_SHA" >&2; exit 1; }

container="astral-arena-web"
host="${ASTRAL_ARENA_WEB_HOST:-astral-arena.op-sly.com}"

docker pull "$ASTRAL_ARENA_WEB_IMAGE"
repo_digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "$ASTRAL_ARENA_WEB_IMAGE")"
actual_digest="${repo_digest##*@}"
[[ "$actual_digest" == "$ASTRAL_ARENA_WEB_DIGEST" ]] || {
  echo "Astral Arena web image digest mismatch" >&2
  exit 1
}

docker rm -f "$container" 2>/dev/null || true

docker run -d   --name "$container"   --restart unless-stopped   --network traefik-public   --label traefik.enable=true   --label traefik.docker.network=traefik-public   --label "traefik.http.routers.astral-arena-web.rule=Host(`$host`)"   --label traefik.http.routers.astral-arena-web.entrypoints=websecure   --label traefik.http.routers.astral-arena-web.tls=true   --label traefik.http.routers.astral-arena-web.tls.certresolver=letsencrypt   --label traefik.http.services.astral-arena-web.loadbalancer.server.port=8080   "$ASTRAL_ARENA_WEB_IMAGE" >/dev/null

for attempt in {1..30}; do
  if docker exec "$container" wget -q -O /dev/null http://127.0.0.1:8080/index.html; then
    echo "Astral Arena web container healthy: https://$host"
    exit 0
  fi
  echo "Waiting for Astral Arena web container ($attempt/30)..."
  sleep 2
done

docker logs "$container" --tail 100 >&2 || true
exit 1
