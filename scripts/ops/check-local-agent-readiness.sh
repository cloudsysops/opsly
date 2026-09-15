#!/usr/bin/env bash
# Verify the local Opsly orchestrator and BullMQ/Redis readiness without exposing
# PLATFORM_ADMIN_TOKEN in process arguments or shell history.
set -euo pipefail

BASE_URL="${OPSLY_ORCHESTRATOR_URL:-http://127.0.0.1:3011}"

if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
  echo "PLATFORM_ADMIN_TOKEN is required in the environment" >&2
  exit 2
fi

curl -fsS "${BASE_URL}/health" >/dev/null

cfg="$(mktemp "${TMPDIR:-/tmp}/opsly-curl.XXXXXX")"
chmod 600 "${cfg}"
cleanup() {
  rm -f "${cfg}"
}
trap cleanup EXIT

printf 'silent\nshow-error\nfail\nheader = "Authorization: Bearer %s"\n' "${PLATFORM_ADMIN_TOKEN}" >"${cfg}"

response="$(curl -K "${cfg}" "${BASE_URL}/api/local/queue-health")"
printf '%s\n' "${response}"

node -e '
const body = JSON.parse(process.argv[1]);
if (body.ok !== true || body.redis_ping !== "PONG" || body.queue !== "local-agents") {
  console.error("local queue readiness failed");
  process.exit(1);
}
' "${response}"

echo "OPSLY_LOCAL_QUEUE_READY"
