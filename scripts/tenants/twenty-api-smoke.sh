#!/usr/bin/env bash
# Smoke: verify Twenty API access with metadata + GraphQL.
set -euo pipefail

TWENTY_API_URL="${TWENTY_API_URL:-}"
TWENTY_API_KEY="${TWENTY_API_KEY:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/twenty-api-smoke.sh

Requires:
  TWENTY_API_URL   Base URL of the Twenty workspace
  TWENTY_API_KEY   API key created in Twenty Settings → API & Webhooks
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "${TWENTY_API_URL}" || -z "${TWENTY_API_KEY}" ]]; then
  echo "Missing TWENTY_API_URL or TWENTY_API_KEY" >&2
  usage >&2
  exit 1
fi

base_url="${TWENTY_API_URL%/}"
auth_header="Authorization: Bearer ${TWENTY_API_KEY}"

probe_metadata() {
  local candidate="$1"
  local body
  body="$(curl -fsS -H "${auth_header}" "${candidate}")"
  echo "${body}" | jq -e . >/dev/null
  echo "ok metadata: ${candidate}"
}

if ! probe_metadata "${base_url}/rest/metadata/" 2>/dev/null; then
  probe_metadata "${base_url}/metadata/"
fi

graphql_response="$(
  curl -fsS -X POST "${base_url}/graphql/" \
    -H "${auth_header}" \
    -H "Content-Type: application/json" \
    -d '{"query":"query Smoke { __typename }"}'
)"

echo "${graphql_response}" | jq -e '.data.__typename == "Query"' >/dev/null
echo "ok graphql: ${base_url}/graphql/"

echo "PASS: Twenty API smoke OK"
