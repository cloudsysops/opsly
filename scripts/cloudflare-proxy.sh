#!/bin/bash
# Cloudflare Proxy Manager - Enable/Disable proxy for domain records
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

DOMAIN="ops.smiletripcare.com"
ACTION=""
DRY_RUN=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --enable           Enable proxy (orange cloud) for all records
  --disable         Disable proxy (gray cloud) for all records  
  --domain DOMAIN   Domain to manage (default: ops.smiletripcare.com)
  --list           List current DNS records and proxy status
  --dry-run        Show what would be done without making changes
  -h, --help     Show this help

Examples:
  $(basename "$0") --enable
  $(basename "$0") --disable
  $(basename "$0") --list
  $(basename "$0") --dry-run --enable
EOF
}

get_zone_id() {
  local zone_name="$1"
  curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$zone_name" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result[0].id // empty'
}

list_records() {
  local zone_id="$1"
  echo "=== DNS Records for $DOMAIN ==="
  curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result[] | select(.name | contains("'$DOMAIN'")) | "\(.name) -> \(.content) [proxied: \(.proxied)]"'
}

update_proxy() {
  local zone_id="$1"
  local proxy_value="$2"
  
  local records
  records=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result[] | select(.name | contains("'$DOMAIN'")) | .id, .name, .content' 2>/dev/null || echo "")
  
  if [ -z "$records" ]; then
    log_warn "No DNS records found for $DOMAIN"
    return 1
  fi
  
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    id=$(echo "$line" | head -1)
    name=$(echo "$line" | sed -n '2p')
    content=$(echo "$line" | sed -n '3p')
    
    if [ "$DRY_RUN" = "1" ]; then
      log_info "[DRY-RUN] Would set proxied=$proxy_value for: $name -> $content"
    else
      log_info "Updating: $name -> $content"
      result=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records/$id" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"A\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":$proxy_value}" | jq -r '.success')
      
      if [ "$result" = "true" ]; then
        log_ok "Updated: $name [proxied: $proxy_value]"
      else
        log_error "Failed: $name"
      fi
    fi
  done <<< "$(echo "$records" | paste - - -)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --enable) ACTION="enable" ;;
    --disable) ACTION="disable" ;;
    --domain) DOMAIN="$2" && shift ;;
    --list) ACTION="list" ;;
    --dry-run) DRY_RUN="1" ;;
    -h|--help) usage && exit 0 ;;
    *) usage && exit 1 ;;
  esac
  shift
done

[ -z "$ACTION" ] && { usage; exit 1; }

log_info "Domain: $DOMAIN"

# Load token from various sources
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if [ -f "$SCRIPT_DIR/../.cloudflare.env" ]; then
    source "$SCRIPT_DIR/../.cloudflare.env"
  fi
fi

# Also accept from stdin (if piped)
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ ! -t 0 ]; then
  CLOUDFLARE_API_TOKEN=$(cat)
  CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN%"$'\n'}"
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  log_error "CF_API_TOKEN no configurado"
  echo ""
  echo "=== Opciones ==="
  echo ""
  echo "1. Añadir a Doppler (futuro):"
  echo "   doppler secrets set CLOUDFLARE_API_TOKEN=token --project ops-intcloudsysops --config prd"
  echo ""
  echo "2. Crear archivo config/.cloudflare.env:"
  echo "   echo 'CLOUDFLARE_API_TOKEN=tu_token' > config/.cloudflare.env"
  echo ""
  echo "3. Pegar token ahora:"
  read -r CF_TOKEN
  if [ -z "$CF_TOKEN" ]; then
    log_error "Token requerido"
    exit 1
  fi
  export CLOUDFLARE_API_TOKEN="$CF_TOKEN"
fi

# Get zone ID if not set
if [ -z "${CLOUDFLARE_ZONE_ID:-}" ]; then
  log_warn "Fetching zone ID..."
  CLOUDFLARE_ZONE_ID=$(get_zone_id "$DOMAIN")
fi

if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  log_error "Could not find zone: $DOMAIN"
  exit 1
fi

log_ok "Zone ID: $CLOUDFLARE_ZONE_ID"

# Execute action
case "$ACTION" in
  list) list_records "$CLOUDFLARE_ZONE_ID" ;;
  enable) update_proxy "$CLOUDFLARE_ZONE_ID" "true" ;;
  disable) update_proxy "$CLOUDFLARE_ZONE_ID" "false" ;;
esac