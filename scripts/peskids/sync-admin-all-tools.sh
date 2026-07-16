#!/usr/bin/env bash
# Sync peskids.admin@gmail.com across Peskids stack (Supabase metadata, n8n, Uptime Kuma, Doppler).
#
# PASSWORD POLICY:
#   - Default run NEVER changes the Supabase admin password (prevents surprise lockouts).
#   - Use --sync-password only when intentionally aligning Supabase with PESKIDS_ADMIN_PASSWORD.
#   - n8n + Uptime always receive PESKIDS_ADMIN_PASSWORD from env/Doppler.
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     bash scripts/peskids/sync-admin-all-tools.sh
#
#   # After rotating PESKIDS_ADMIN_PASSWORD in Doppler:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     bash scripts/peskids/sync-admin-all-tools.sh --sync-password
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EMAIL="${PESKIDS_ADMIN_EMAIL:-peskids.admin@gmail.com}"
VPS_HOST="${PESKIDS_VPS_HOST:-vps-dragon@100.120.151.91}"
N8N_CONTAINER="${N8N_CONTAINER:-n8n_peskids}"
N8N_VOLUME="${N8N_VOLUME:-tenants_n8n_data_peskids}"
UPTIME_URL="${UPTIME_KUMA_URL:-http://127.0.0.1:8003}"
UPTIME_USER="${UPTIME_KUMA_USERNAME:-peskids-admin}"
if [[ "$UPTIME_USER" == *"@"* ]]; then
  UPTIME_USER="peskids-admin"
fi
UPTIME_CONTAINER="${UPTIME_CONTAINER:-uptime_peskids}"
UPTIME_VOLUME="${UPTIME_VOLUME:-tenants_uptime_data_peskids}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
SYNC_SUPABASE_PASSWORD=false

usage() {
  cat <<'EOF'
Usage: sync-admin-all-tools.sh [--dry-run] [--sync-password]

Env (required):
  PESKIDS_ADMIN_PASSWORD   Unified password for n8n/Uptime (and Supabase only with --sync-password)

Flags:
  --sync-password   Also set Supabase auth password from PESKIDS_ADMIN_PASSWORD (explicit opt-in)
  --dry-run         Print actions without applying

Optional env:
  PESKIDS_ADMIN_EMAIL        Default: peskids.admin@gmail.com
  PESKIDS_VPS_HOST           Default: vps-dragon@100.120.151.91
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --sync-password) SYNC_SUPABASE_PASSWORD=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ -z "${PESKIDS_ADMIN_PASSWORD:-}" ]]; then
  echo "FAIL: set PESKIDS_ADMIN_PASSWORD (Doppler or export)" >&2
  exit 1
fi

log() { echo "[sync-admin] $*"; }

verify_supabase_login() {
  log "Verifying Supabase login for ${EMAIL}"
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  PESKIDS_ADMIN_PASSWORD="$PESKIDS_ADMIN_PASSWORD" \
    npx tsx "$ROOT/scripts/peskids/test-admin-login.ts" || {
      echo "FAIL: Supabase login check failed. If you changed password via recovery UI, run with --sync-password after updating Doppler, or update Doppler to match the new password." >&2
      exit 1
    }
}

sync_doppler() {
  log "Updating Doppler canonical admin secrets"
  if [[ "$DRY_RUN" == true ]]; then
    log "dry-run: would set PESKIDS_ADMIN_EMAIL, PESKIDS_ADMIN_PASSWORD, N8N_PESKIDS_OWNER_PASSWORD, PESKIDS_UPTIME_KUMA_PASSWORD, TENANT_PESKIDS_N8N_PASS"
    return 0
  fi
  doppler secrets set --silent \
    "PESKIDS_ADMIN_EMAIL=${EMAIL}" \
    "PESKIDS_ADMIN_PASSWORD=${PESKIDS_ADMIN_PASSWORD}" \
    "N8N_PESKIDS_OWNER_PASSWORD=${PESKIDS_ADMIN_PASSWORD}" \
    "PESKIDS_UPTIME_KUMA_PASSWORD=${PESKIDS_ADMIN_PASSWORD}" \
    "TENANT_PESKIDS_N8N_PASS=${PESKIDS_ADMIN_PASSWORD}" \
    --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG"
}

sync_supabase() {
  if [[ "$SYNC_SUPABASE_PASSWORD" == true ]]; then
    log "Supabase auth password + membership for ${EMAIL} (--sync-password)"
    if [[ "$DRY_RUN" == true ]]; then
      return 0
    fi
    PESKIDS_ADMIN_PASSWORD="$PESKIDS_ADMIN_PASSWORD" \
      npx tsx "$ROOT/scripts/peskids/unblock-admin-access.ts" "$EMAIL" --set-password-from-env
    verify_supabase_login
    return 0
  fi

  log "Supabase metadata + membership only (password unchanged) for ${EMAIL}"
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  npx tsx "$ROOT/scripts/peskids/unblock-admin-access.ts" "$EMAIL"
}

sync_n8n_vps() {
  log "n8n owner email + password on VPS"
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  ssh -o BatchMode=yes "$VPS_HOST" "bash -s" <<EOF
set -euo pipefail
EMAIL=$(printf '%q' "$EMAIL")
PASS=$(printf '%q' "$PESKIDS_ADMIN_PASSWORD")
CONTAINER=$(printf '%q' "$N8N_CONTAINER")
VOLUME=$(printf '%q' "$N8N_VOLUME")
COMPOSE=/opt/opsly/runtime/tenants/docker-compose.peskids.yml

bcrypt_hash() {
  docker run --rm -e PW="\$1" python:3.12-slim bash -c 'pip install -q bcrypt >/dev/null 2>&1 && python -c "import bcrypt,os; print(bcrypt.hashpw(os.environ[\"PW\"].encode(), bcrypt.gensalt(10)).decode())"'
}

HASH=\$(bcrypt_hash "\$PASS")

docker stop "\$CONTAINER" >/dev/null 2>&1 || true

docker run --rm -v "\$VOLUME":/data \
  -e SQL_EMAIL="\$EMAIL" -e SQL_HASH="\$HASH" \
  python:3.12-slim python -c "
import os, sqlite3
conn = sqlite3.connect('/data/database.sqlite')
conn.execute('PRAGMA wal_checkpoint(FULL)')
conn.execute(
    \"\"\"UPDATE user SET email=?, password=?, roleSlug='global:owner', firstName='Peskids', lastName='Admin', updatedAt=datetime('now') WHERE roleSlug='global:owner' OR email LIKE '%@%'\"\"\",
    (os.environ['SQL_EMAIL'], os.environ['SQL_HASH']),
)
conn.commit()
"

if [[ -f "\$COMPOSE" ]]; then
  if grep -q 'N8N_BASIC_AUTH_ACTIVE' "\$COMPOSE"; then
    sed -i 's/N8N_BASIC_AUTH_ACTIVE: "true"/N8N_BASIC_AUTH_ACTIVE: "false"/' "\$COMPOSE" || true
  fi
  if grep -q 'N8N_BASIC_AUTH_ACTIVE: "false"' "\$COMPOSE"; then
    docker compose --env-file /opt/opsly/.env -f "\$COMPOSE" up -d n8n_peskids >/dev/null 2>&1 || docker start "\$CONTAINER"
  else
    docker start "\$CONTAINER"
  fi
else
  docker start "\$CONTAINER"
fi

sleep 5
docker exec "\$CONTAINER" n8n update:workflow --all --active=true >/dev/null 2>&1 || true
echo N8N_SYNC_OK
EOF
}

sync_uptime_vps() {
  log "Uptime Kuma password for ${UPTIME_USER}"
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  ssh -o BatchMode=yes "$VPS_HOST" "bash -s" <<EOF
set -euo pipefail
UPTIME_USER=$(printf '%q' "$UPTIME_USER")
NEW_PASS=$(printf '%q' "$PESKIDS_ADMIN_PASSWORD")
UPTIME_CONTAINER=uptime_peskids
UPTIME_VOLUME=tenants_uptime_data_peskids

bcrypt_hash() {
  docker run --rm -e PW="\$1" python:3.12-slim bash -c 'pip install -q bcrypt >/dev/null 2>&1 && python -c "import bcrypt,os; print(bcrypt.hashpw(os.environ[\"PW\"].encode(), bcrypt.gensalt(10)).decode())"'
}

HASH=\$(bcrypt_hash "\$NEW_PASS")

docker stop "\$UPTIME_CONTAINER" >/dev/null 2>&1 || true

docker run --rm -v "\$UPTIME_VOLUME":/data \
  -e SQL_USER="\$UPTIME_USER" -e SQL_HASH="\$HASH" \
  python:3.12-slim python -c "
import os, sqlite3
conn = sqlite3.connect('/data/kuma.db')
conn.execute('PRAGMA wal_checkpoint(FULL)')
conn.execute('UPDATE user SET username=?, password=? WHERE id=1', (os.environ['SQL_USER'], os.environ['SQL_HASH']))
conn.commit()
"

docker start "\$UPTIME_CONTAINER" >/dev/null
sleep 8

docker run --rm --network host \
  -e UPTIME_KUMA_URL=http://127.0.0.1:8003 \
  -e UPTIME_KUMA_USERNAME="\$UPTIME_USER" \
  -e UPTIME_KUMA_PASSWORD="\$NEW_PASS" \
  python:3.12-slim bash -c '
pip install -q "uptime-kuma-api>=1.2.1" >/dev/null
python -c "
from uptime_kuma_api import UptimeKumaApi
import os, sys
with UptimeKumaApi(os.environ[\"UPTIME_KUMA_URL\"], timeout=60, wait_events=1.0) as api:
    api.login(os.environ[\"UPTIME_KUMA_USERNAME\"], os.environ[\"UPTIME_KUMA_PASSWORD\"])
    print(\"UPTIME_SYNC_OK\")
"
'
EOF
}

main() {
  sync_doppler
  sync_supabase
  sync_n8n_vps
  sync_uptime_vps

  log "Done."
  if [[ "$SYNC_SUPABASE_PASSWORD" == true ]]; then
    log "  Supabase password aligned with PESKIDS_ADMIN_PASSWORD"
  else
    log "  Supabase password unchanged (use --sync-password to align)"
  fi
  log "  Login Peskids: https://peskids.op-sly.com/admin/login (${EMAIL})"
  log "  n8n:           https://n8n-peskids.op-sly.com (${EMAIL})"
  log "  Uptime:        https://uptime-peskids.op-sly.com (user: ${UPTIME_USER})"
  log "  Password:      PESKIDS_ADMIN_PASSWORD in Doppler prd (n8n/Uptime; Supabase only if --sync-password)"
}

main "$@"
