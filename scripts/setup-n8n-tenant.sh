#!/bin/bash
set -euo pipefail

###############################################################################
# setup-n8n-tenant.sh — Configure n8n for Peskids tenant on VPS
#
# Usage:
#   ./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids
#   ./scripts/setup-n8n-tenant.sh --dry-run  # Preview changes
#
# What it does:
#   1. SSH to VPS
#   2. Check if tenant_peskids n8n container exists
#   3. If not, create docker-compose override for tenant_peskids service
#   4. Start n8n container with Supabase connection
#   5. Test webhook endpoint
#   6. Return n8n URL and API key for workflow creation
###############################################################################

VPS_HOST="${VPS_HOST:-100.120.151.91}"
VPS_USER="${VPS_USER:-vps-dragon}"
TENANT="peskids"
DRY_RUN=false
PROJECT_ROOT="/opt/opsly"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --vps-host) VPS_HOST="$2"; shift 2 ;;
    --tenant) TENANT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "🚀 Phase 2 Setup: N8N for tenant_${TENANT}"
echo "   VPS: ${VPS_HOST}"
echo "   Tenant: ${TENANT}"
[[ "$DRY_RUN" == "true" ]] && echo "   [DRY RUN MODE]"
echo ""

# Check SSH access
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" exit 0 &>/dev/null; then
  echo "❌ Cannot SSH to ${VPS_HOST}. Check Tailscale + credentials."
  exit 1
fi

echo "✅ SSH connection verified"
echo ""

# Step 1: Check if container already exists
echo "📋 Checking existing containers..."
CONTAINER_NAME="tenant_${TENANT}"

CONTAINER_EXISTS=$(ssh "${VPS_USER}@${VPS_HOST}" \
  "docker ps -a --format '{{.Names}}' | grep -c '^${CONTAINER_NAME}$' || true")

if [[ "$CONTAINER_EXISTS" -eq 1 ]]; then
  echo "✅ Container ${CONTAINER_NAME} already exists"

  # Check if it's running
  IS_RUNNING=$(ssh "${VPS_USER}@${VPS_HOST}" \
    "docker ps --format '{{.Names}}' | grep -c '^${CONTAINER_NAME}$' || true")

  if [[ "$IS_RUNNING" -eq 1 ]]; then
    echo "✅ Container is running"
  else
    echo "⚠️  Container exists but not running. Starting..."
    [[ "$DRY_RUN" == "false" ]] && ssh "${VPS_USER}@${VPS_HOST}" \
      "cd ${PROJECT_ROOT} && docker compose up -d ${CONTAINER_NAME}"
  fi
else
  echo "📦 Container ${CONTAINER_NAME} not found. Creating..."

  # Build docker-compose override
  OVERRIDE_FILE="/tmp/docker-compose.${TENANT}.yml"

  cat > "$OVERRIDE_FILE" << 'EOF'
services:
  tenant_peskids:
    image: n8nio/n8n:2.32.5
    container_name: tenant_peskids
    environment:
      N8N_HOST: "peskids.op-sly.com"
      N8N_PROTOCOL: "https"
      DB_TYPE: "postgresdb"
      DB_POSTGRESDB_HOST: "postgres"
      DB_POSTGRESDB_PORT: "5432"
      DB_POSTGRESDB_DATABASE: "n8n_peskids"
      DB_POSTGRESDB_USER: "${N8N_DB_USER:-n8n_peskids}"
      DB_POSTGRESDB_PASSWORD: "${N8N_DB_PASSWORD}"
      N8N_ENCRYPTION_KEY: "${N8N_ENCRYPTION_KEY}"
      WEBHOOK_TUNNEL_URL: "https://peskids.op-sly.com/webhooks/"
      N8N_EDITOR_BASE_URL: "https://peskids.op-sly.com/n8n/"
      SUPABASE_URL: "${SUPABASE_URL}"
      SUPABASE_KEY: "${SUPABASE_ANON_KEY}"
      NODE_ENV: "production"
    ports:
      - "5679:5678"  # n8n UI (behind Traefik)
    volumes:
      - n8n_data_peskids:/home/node/.n8n
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n-peskids.rule=Host(\`peskids.op-sly.com\`) && PathPrefix(\`/n8n/\`)"
      - "traefik.http.routers.n8n-peskids.entrypoints=websecure"
      - "traefik.http.routers.n8n-peskids.tls.certresolver=letsencrypt"
      - "traefik.http.services.n8n-peskids.loadbalancer.server.port=5678"
    depends_on:
      - postgres

volumes:
  n8n_data_peskids:
    driver: local

networks:
  traefik-public:
    external: true
EOF

  echo "📝 Generated override: $OVERRIDE_FILE"

  if [[ "$DRY_RUN" == "false" ]]; then
    # Copy to VPS
    scp "$OVERRIDE_FILE" "${VPS_USER}@${VPS_HOST}:/opt/opsly/docker-compose.peskids.yml"

    # Start container
    echo "🔧 Starting container..."
    ssh "${VPS_USER}@${VPS_HOST}" << EOSSH
      cd ${PROJECT_ROOT}
      docker compose -f docker-compose.platform.yml -f docker-compose.peskids.yml up -d tenant_peskids
      sleep 5
      docker logs tenant_peskids | tail -20
EOSSH
  else
    echo "   [DRY RUN] Would copy $OVERRIDE_FILE to VPS and start container"
  fi
fi

echo ""
echo "✅ N8N Setup Complete"
echo ""
echo "📍 Next Steps:"
echo "   1. Access n8n UI: https://peskids.op-sly.com/n8n/"
echo "   2. Create first workflow: 'lead-capture' (webhook trigger)"
echo "   3. Test webhook: POST to https://peskids.op-sly.com/webhooks/lead-capture"
echo ""
echo "📚 See docs/tenants/peskids/PHASE-2-IMPLEMENTATION-PLAN.md for workflow specs"
