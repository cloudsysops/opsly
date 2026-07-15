#!/usr/bin/env bash
# Provision Twenty CRM for ICSO / IntCloud SysOps on VPS (separate stack from Peskids).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT}/infra/docker-compose.twenty-icso.yml"
ENV_FILE="${OPSLY_ENV_FILE:-/opt/opsly/.env}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/setup-twenty-icso.sh [--dry-run]

Starts Twenty CRM stack for ICSO (server + worker + Postgres + Redis) behind Traefik.
Requires Doppler secrets in OPSLY env file:
  PLATFORM_DOMAIN, TWENTY_ICSO_SERVER_URL, TWENTY_ICSO_APP_SECRET,
  TWENTY_ICSO_ENCRYPTION_KEY, TWENTY_ICSO_PG_PASSWORD

Bootstrap: ./scripts/tenants/generate-twenty-secrets.sh --execute --tenant icso

After deploy:
  1. Open TWENTY_ICSO_SERVER_URL and create admin (cboteros1@gmail.com)
  2. Settings → API & Webhooks → create API key
  3. echo "<key>" | ./scripts/tenants/twenty-apply-api-key.sh --tenant icso
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

required_vars=(
  PLATFORM_DOMAIN
  TWENTY_ICSO_SERVER_URL
  TWENTY_ICSO_APP_SECRET
  TWENTY_ICSO_ENCRYPTION_KEY
  TWENTY_ICSO_PG_PASSWORD
)
missing=()
for var in "${required_vars[@]}"; do
  if [[ ! -f "${ENV_FILE}" ]] || ! grep -q "^${var}=" "${ENV_FILE}"; then
    missing+=("${var}")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "Missing required vars in ${ENV_FILE}: ${missing[*]}" >&2
  echo "Run: ./scripts/tenants/generate-twenty-secrets.sh --execute --tenant icso" >&2
  echo "Then: ./scripts/vps-bootstrap.sh" >&2
  exit 1
fi

cmd=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d)
if [[ "${DRY_RUN}" == true ]]; then
  printf 'DRY RUN: '
  printf '%q ' "${cmd[@]}"
  printf '\n'
  exit 0
fi

"${cmd[@]}"
echo "ICSO Twenty stack started. Verify: curl -sfk \"\${TWENTY_ICSO_SERVER_URL}/healthz\""
