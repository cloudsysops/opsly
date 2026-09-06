#!/usr/bin/env bash
# Guard: rewrite helper remaps Docker hostname without printing the URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
# shellcheck source=scripts/lib/rewrite-docker-redis-url.sh
source "${ROOT}/scripts/lib/rewrite-docker-redis-url.sh"

REDIS_URL='redis://default:secret@redis:6379/0'
rewrite_docker_redis_url
if [[ "$REDIS_URL" != 'redis://default:secret@100.120.151.91:6379/0' ]]; then
  echo "expected Tailscale host rewrite, got masked host mismatch" >&2
  exit 1
fi

REDIS_URL='redis://default:secret@100.120.151.91:6379/0'
rewrite_docker_redis_url
if [[ "$REDIS_URL" != 'redis://default:secret@100.120.151.91:6379/0' ]]; then
  echo "expected already-rewritten URL to stay put" >&2
  exit 1
fi

echo "rewrite-docker-redis-url: ok"
