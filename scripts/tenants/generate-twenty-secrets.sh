#!/usr/bin/env bash
# Bootstrap Twenty CRM stack secrets in Doppler (infra only — API key stays manual).
set -euo pipefail

DRY_RUN=false
EXECUTE=false
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
TENANT="peskids"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/generate-twenty-secrets.sh [--dry-run] [--execute] [--tenant peskids|icso]

Generates random stack secrets locally.

  --dry-run   Print doppler commands only (default)
  --execute   Apply infra secrets to Doppler (never prints values to stdout)
  --tenant    peskids → crm-peskids.* ; icso → crm-intcloudsysops.* (prep for ICSO)

API key (TWENTY_API_KEY / TWENTY_INTCLOUDSYSOPS_API_KEY) is NOT auto-generated —
use ./scripts/tenants/twenty-apply-api-key.sh after Twenty UI admin setup.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; EXECUTE=false ;;
    --execute) EXECUTE=true; DRY_RUN=false ;;
    --tenant)
      shift
      TENANT="${1:-peskids}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ "$TENANT" == "icso" ]]; then
  server_url="https://crm-intcloudsysops.${DOMAIN}"
else
  server_url="https://crm-peskids.${DOMAIN}"
fi

app_secret="$(openssl rand -base64 32)"
encryption_key="$(openssl rand -base64 32)"
pg_password="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

if [[ "$EXECUTE" == true ]]; then
  if ! command -v doppler >/dev/null 2>&1; then
    echo "doppler CLI not found" >&2
    exit 1
  fi
  doppler secrets set \
    TWENTY_SERVER_URL="$server_url" \
    TWENTY_APP_SECRET="$app_secret" \
    TWENTY_ENCRYPTION_KEY="$encryption_key" \
    TWENTY_PG_PASSWORD="$pg_password" \
    --project "$PROJECT" --config "$CONFIG" >/dev/null
  unset app_secret encryption_key pg_password
  echo "set  TWENTY_SERVER_URL=${server_url}"
  echo "set  TWENTY_APP_SECRET (hidden)"
  echo "set  TWENTY_ENCRYPTION_KEY (hidden)"
  echo "set  TWENTY_PG_PASSWORD (hidden)"
  echo ""
  echo "VPS: cd /opt/opsly && ./scripts/vps-bootstrap.sh && ./scripts/tenants/setup-twenty-peskids.sh"
  exit 0
fi

cat <<EOF
# Twenty CRM — bootstrap secrets for ${PROJECT}/${CONFIG} (tenant=${TENANT})
# Review then run with --execute (does not print secrets):

./scripts/tenants/generate-twenty-secrets.sh --execute --tenant ${TENANT}

# Or manual block (values generated once per run — copy from a local terminal only):

doppler secrets set \\
  TWENTY_SERVER_URL="${server_url}" \\
  TWENTY_APP_SECRET="<openssl rand -base64 32>" \\
  TWENTY_ENCRYPTION_KEY="<openssl rand -base64 32>" \\
  TWENTY_PG_PASSWORD="<openssl rand -base64 24>" \\
  --project ${PROJECT} --config ${CONFIG}

# After Twenty UI admin + API key:
#   echo "<key>" | ./scripts/tenants/twenty-apply-api-key.sh --tenant ${TENANT} --api-url ${server_url}

# VPS:
#   ./scripts/vps-bootstrap.sh && ./scripts/tenants/setup-twenty-peskids.sh
EOF

if [[ "$DRY_RUN" == true ]]; then
  echo "# DRY RUN — no secrets written."
fi

unset app_secret encryption_key pg_password
