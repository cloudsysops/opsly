#!/usr/bin/env bash
# Smoke ligero de Redis para flujos de autonomía (BullMQ / orchestrator).
# No borra datos. Opcional: comprobar maxmemory-policy en desarrollo local.
#
# Uso:
#   REDIS_URL=redis://localhost:6379 ./scripts/autonomy-redis-smoke.sh
#   ./scripts/autonomy-redis-smoke.sh --dry-run
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

DRY_RUN=false
CHECK_POLICY=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=true ;;
    --check-eviction-policy) CHECK_POLICY=true ;;
  esac
done

REDIS_URL_EFFECTIVE="${REDIS_URL:-redis://localhost:6379}"

if [[ "${DRY_RUN}" == "true" ]]; then
  log_ok "[dry-run] autonomy-redis-smoke REDIS_URL=${REDIS_URL_EFFECTIVE}"
  exit 0
fi

if ! command -v redis-cli >/dev/null 2>&1; then
  log_warn "redis-cli no instalado; omitiendo smoke Redis (brew install redis / redis-tools)"
  exit 0
fi

redis_host_from_url() {
  python3 - <<'PY' "${1:?url}"
import sys
from urllib.parse import urlparse
u = urlparse(sys.argv[1])
print(u.hostname or "127.0.0.1")
PY
}

redis_port_from_url() {
  python3 - <<'PY' "${1:?url}"
import sys
from urllib.parse import urlparse
u = urlparse(sys.argv[1])
port = u.port or 6379
print(port)
PY
}

redis_has_password() {
  python3 - <<'PY' "${1:?url}"
import sys
from urllib.parse import urlparse
u = urlparse(sys.argv[1])
print("1" if u.password else "0")
PY
}

HOST="$(redis_host_from_url "${REDIS_URL_EFFECTIVE}")"
PORT="$(redis_port_from_url "${REDIS_URL_EFFECTIVE}")"
HAS_PW="$(redis_has_password "${REDIS_URL_EFFECTIVE}")"

redis_ping() {
  if [[ "${HAS_PW}" == "1" ]]; then
    local pw
    pw="$(python3 - <<'PY' "${REDIS_URL_EFFECTIVE}"
import sys
from urllib.parse import urlparse, unquote
u = urlparse(sys.argv[1])
print(unquote(u.password or ""))
PY
)"
    redis-cli -h "${HOST}" -p "${PORT}" -a "${pw}" --no-auth-warning ping
  else
    redis-cli -h "${HOST}" -p "${PORT}" ping
  fi
}

if ! redis_ping | grep -q PONG; then
  log_error "Redis no responde PONG en ${HOST}:${PORT}"
  exit 1
fi

log_ok "Redis PONG OK (${HOST}:${PORT})"

if [[ "${CHECK_POLICY}" == "true" ]] && [[ "${HOST}" == "127.0.0.1" || "${HOST}" == "localhost" ]]; then
  policy="$(redis-cli -h "${HOST}" -p "${PORT}" CONFIG GET maxmemory-policy 2>/dev/null | awk 'NR==2{print}' || true)"
  if [[ -n "${policy}" && "${policy}" != "noeviction" ]]; then
    log_warn "maxmemory-policy=${policy} (desarrollo local suele preferir noeviction para colas)"
  fi
fi

exit 0
