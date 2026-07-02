#!/usr/bin/env bash
# Print Doppler commands to bootstrap Twenty CRM secrets (no values written to stdout secrets in logs).
set -euo pipefail

DRY_RUN=false
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/generate-twenty-secrets.sh [--dry-run]

Generates random secrets locally and prints doppler secrets set commands.
Does NOT push to Doppler automatically — copy/paste after review.

Optional env:
  PLATFORM_DOMAIN (default: op-sly.com)
  DOPPLER_PROJECT   (default: ops-intcloudsysops)
  DOPPLER_CONFIG    (default: prd)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

app_secret="$(openssl rand -base64 32)"
encryption_key="$(openssl rand -base64 32)"
pg_password="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
server_url="https://crm-peskids.${DOMAIN}"

cat <<EOF
# Twenty CRM — bootstrap secrets for ${PROJECT}/${CONFIG}
# Review then run (one block):

doppler secrets set \\
  TWENTY_SERVER_URL="${server_url}" \\
  TWENTY_APP_SECRET="${app_secret}" \\
  TWENTY_ENCRYPTION_KEY="${encryption_key}" \\
  TWENTY_PG_PASSWORD="${pg_password}" \\
  PESKIDS_GHL_ENABLED="false" \\
  --project ${PROJECT} --config ${CONFIG}

# After Twenty UI is up and API key created:
doppler secrets set \\
  TWENTY_API_URL="${server_url}" \\
  TWENTY_API_KEY="<paste-from-twenty-settings>" \\
  PESKIDS_TWENTY_ENABLED="true" \\
  --project ${PROJECT} --config ${CONFIG}

# VPS after doppler sync:
#   cd /opt/opsly && ./scripts/vps-bootstrap.sh
#   ./scripts/tenants/setup-twenty-peskids.sh
EOF

if [[ "${DRY_RUN}" == true ]]; then
  echo "# DRY RUN — secrets generated but not applied anywhere else."
fi
