#!/usr/bin/env bash

# Hermes Tenant Invitations Batch Script
# Send invitations to multiple tenants autonomously

set -euo pipefail

# Configuration
INVITATIONS_SERVICE_URL="${INVITATIONS_SERVICE_URL:-http://localhost:3003}"
PORTAL_URL="${PORTAL_URL:-https://portal.hermes.intcloudsysops.com}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Function to invite a single tenant
invite_tenant() {
  local tenant_slug=$1
  local tenant_name=$2
  local contact_email=$3
  local contact_name=$4
  local plan=${5:-pro}
  local billing_email=${6:-$contact_email}

  log_info "Inviting tenant: $tenant_name ($tenant_slug)"

  local response=$(curl -s -X POST "$INVITATIONS_SERVICE_URL/tenants/invite" \
    -H "Content-Type: application/json" \
    -d "{
      \"tenant_slug\": \"$tenant_slug\",
      \"tenant_name\": \"$tenant_name\",
      \"contact_email\": \"$contact_email\",
      \"contact_name\": \"$contact_name\",
      \"plan\": \"$plan\",
      \"features\": [\"agents\", \"music\", \"images\", \"videos\"],
      \"billing_contact_email\": \"$billing_email\"
    }")

  if echo "$response" | jq -e '.status == "INVITED"' > /dev/null 2>&1; then
    log_success "Invited $tenant_name — email sent to $contact_email"
    echo "$response" | jq '.'
  else
    log_error "Failed to invite $tenant_name"
    echo "$response" | jq '.'
  fi

  # Small delay to avoid rate limiting
  sleep 1
}

# Function to show pending invitations
show_pending() {
  log_info "Fetching pending invitations..."
  
  local response=$(curl -s "$INVITATIONS_SERVICE_URL/invitations/pending")
  
  echo "$response" | jq '.'
}

# Function to check invitation status
check_status() {
  local token=$1
  
  log_info "Checking invitation status..."
  
  local response=$(curl -s "$INVITATIONS_SERVICE_URL/invitations/status/$token")
  
  echo "$response" | jq '.'
}

# Main execution
case "${1:-}" in
  invite)
    # Invite single tenant
    if [ $# -lt 5 ]; then
      echo "Usage: $0 invite <slug> <name> <email> <contact_name> [plan] [billing_email]"
      exit 1
    fi
    invite_tenant "$2" "$3" "$4" "$5" "${6:-pro}" "${7:-$4}"
    ;;
  
  batch)
    # Batch invite from file
    local file="${2:-tenants-to-invite.csv}"
    if [ ! -f "$file" ]; then
      log_error "File not found: $file"
      exit 1
    fi

    log_info "Batch inviting tenants from $file"
    local count=0
    while IFS=',' read -r slug name email contact plan billing; do
      # Skip header line
      if [ "$slug" = "slug" ]; then
        continue
      fi
      invite_tenant "$slug" "$name" "$email" "$contact" "${plan:-pro}" "${billing:-$email}"
      ((count++))
    done < "$file"
    log_success "Batch invitation complete ($count tenants)"
    ;;
  
  pending)
    # Show pending invitations
    show_pending
    ;;
  
  status)
    # Check specific invitation
    if [ $# -lt 2 ]; then
      echo "Usage: $0 status <token>"
      exit 1
    fi
    check_status "$2"
    ;;
  
  *)
    cat << 'USAGE'

Hermes Tenant Invitations — Batch Invitation Script

Usage:
  ./hermes-tenant-invitations.sh invite <slug> <name> <email> <contact> [plan] [billing_email]
  ./hermes-tenant-invitations.sh batch [file.csv]
  ./hermes-tenant-invitations.sh pending
  ./hermes-tenant-invitations.sh status <token>

Examples:

  # Invite single tenant
  ./hermes-tenant-invitations.sh invite intcloudsysops "intcloudsysops" \
    contact@example.com "John Doe" pro billing@example.com

  # Batch invite from CSV
  ./hermes-tenant-invitations.sh batch tenants-to-invite.csv

  # Show pending invitations
  ./hermes-tenant-invitations.sh pending

  # Check invitation status
  ./hermes-tenant-invitations.sh status abc123def456

CSV Format (tenants-to-invite.csv):

  slug,name,email,contact_name,plan,billing_email
  acme-corp,"ACME Corporation",contact@acme.com,"Jane Smith",pro,billing@acme.com
  startupXYZ,"Startup XYZ",team@xyz.com,"Bob Johnson",starter,billing@xyz.com

Environment Variables:

  INVITATIONS_SERVICE_URL    URL of invitations service (default: http://localhost:3003)
  PORTAL_URL                 URL of Hermes portal (default: https://portal.hermes.intcloudsysops.com)

USAGE
    exit 0
    ;;
esac
