# Source-only helper. Rewrites Doppler REDIS_URL when the host is the Docker
# service name `redis` so Mac/LaunchAgent can reach VPS Redis over Tailscale.
# Never prints REDIS_URL (password lives in the URI).
#
# Usage:
#   # shellcheck source=scripts/lib/rewrite-docker-redis-url.sh
#   source "$ROOT/scripts/lib/rewrite-docker-redis-url.sh"
#   rewrite_docker_redis_url
#
rewrite_docker_redis_url() {
  local host="${OPSLY_REDIS_HOST:-100.120.151.91}"
  local url="${REDIS_URL:-}"
  if [[ -z "$url" ]]; then
    return 0
  fi
  if [[ "$url" == *@redis:* || "$url" == *@redis/* || "$url" == *://redis:* || "$url" == *://redis/* ]]; then
    url="${url//@redis/@${host}}"
    url="${url//:\/\/redis/:\/\/${host}}"
    REDIS_URL="$url"
    export REDIS_URL
  fi
}
