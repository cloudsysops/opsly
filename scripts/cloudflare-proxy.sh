#!/usr/bin/env bash
# Manage Cloudflare proxy mode for DNS records under a domain.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

DOMAIN="ops.smiletripcare.com"
ACTION=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --enable            Enable proxy (orange cloud) for matching records
  --disable           Disable proxy (gray cloud) for matching records
  --domain DOMAIN     Domain to manage (default: ops.smiletripcare.com)
  --list              List current DNS records and proxy status
  --dry-run           Show what would be done without changing records
  -h, --help          Show this help

Examples:
  $(basename "$0") --enable
  $(basename "$0") --disable --domain ops.smiletripcare.com
  $(basename "$0") --list
  $(basename "$0") --dry-run --enable
EOF
}

cloudflare_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  if [[ -n "$data" ]]; then
    curl -fsSL -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
    return 0
  fi

  curl -fsSL -X "$method" "https://api.cloudflare.com/client/v4$path" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json"
}

get_zone_id() {
  local zone_name="$1"
  cloudflare_api GET "/zones?name=$zone_name" \
    | jq -r '.result[0].id // empty'
}

resolve_zone_id() {
  local candidate="$1"
  local zone_id=""

  while [[ "$candidate" == *.* ]]; do
    zone_id="$(get_zone_id "$candidate")"
    if [[ -n "$zone_id" ]]; then
      printf '%s\n' "$zone_id"
      return 0
    fi
    candidate="${candidate#*.}"
  done

  return 1
}

list_records() {
  local zone_id="$1"
  log_info "DNS records for $DOMAIN"
  cloudflare_api GET "/zones/$zone_id/dns_records" \
    | jq -r --arg domain "$DOMAIN" '
        .result[]
        | select(.name | contains($domain))
        | "\(.type)\t\(.name)\t\(.content)\tproxied=\(.proxied)"'
}

update_proxy() {
  local zone_id="$1"
  local proxy_value="$2"

  mapfile -t records < <(
    cloudflare_api GET "/zones/$zone_id/dns_records" \
      | jq -r --arg domain "$DOMAIN" '
          .result[]
          | select(.name | contains($domain))
          | @base64'
  )

  if [[ "${#records[@]}" -eq 0 ]]; then
    log_warn "No DNS records found for $DOMAIN"
    return 1
  fi

  local encoded record_id record_type record_name record_content payload success
  for encoded in "${records[@]}"; do
    record_id="$(decode_base64_json_field "$encoded" '.id')"
    record_type="$(decode_base64_json_field "$encoded" '.type')"
    record_name="$(decode_base64_json_field "$encoded" '.name')"
    record_content="$(decode_base64_json_field "$encoded" '.content')"

    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "DRY-RUN: would set proxied=$proxy_value for $record_type $record_name -> $record_content"
      continue
    fi

    log_info "Updating $record_type $record_name -> $record_content"
    payload="$(jq -nc \
      --arg type "$record_type" \
      --arg name "$record_name" \
      --arg content "$record_content" \
      --argjson proxied "$proxy_value" \
      '{type: $type, name: $name, content: $content, proxied: $proxied}')"

    success="$(
      cloudflare_api PUT "/zones/$zone_id/dns_records/$record_id" "$payload" \
        | jq -r '.success'
    )"

    if [[ "$success" == "true" ]]; then
      log_ok "Updated $record_name [proxied=$proxy_value]"
    else
      log_error "Failed to update $record_name"
    fi
  done
}

decode_base64_json_field() {
  local encoded="$1"
  local field="$2"
  local decoded=""

  if decoded="$(printf '%s' "$encoded" | base64 --decode 2>/dev/null)"; then
    printf '%s' "$decoded" | jq -r "$field"
    return 0
  fi

  decoded="$(printf '%s' "$encoded" | base64 -d)"
  printf '%s' "$decoded" | jq -r "$field"
}

load_cloudflare_token() {
  local env_file
  for env_file in \
    "$SCRIPT_DIR/../config/.cloudflare.env" \
    "$SCRIPT_DIR/../.cloudflare.env"
  do
    if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -f "$env_file" ]]; then
      # shellcheck disable=SC1090
      source "$env_file"
    fi
  done

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && ! -t 0 ]]; then
    CLOUDFLARE_API_TOKEN="$(tr -d '\r\n' < /dev/stdin)"
  fi

  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    export CLOUDFLARE_API_TOKEN
    return 0
  fi

  log_error "CLOUDFLARE_API_TOKEN no configurado"
  echo ""
  echo "Opciones:"
  echo "  1. Exportar CLOUDFLARE_API_TOKEN en el entorno"
  echo "  2. Guardarlo en config/.cloudflare.env"
  echo "  3. Pasarlo por stdin: printf '%s' TOKEN | $(basename "$0") --list"
  exit 1
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --enable)
        ACTION="enable"
        ;;
      --disable)
        ACTION="disable"
        ;;
      --list)
        ACTION="list"
        ;;
      --domain)
        [[ $# -ge 2 ]] || die "--domain requiere un valor"
        DOMAIN="$2"
        shift
        ;;
      --dry-run)
        DRY_RUN="true"
        export DRY_RUN
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage
        exit 1
        ;;
    esac
    shift
  done

  [[ -n "$ACTION" ]] || die "Debes indicar --enable, --disable o --list"
}

main() {
  require_cmd curl jq base64
  parse_args "$@"
  load_cloudflare_token

  log_info "Domain: $DOMAIN"

  local zone_id=""
  if [[ -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
    zone_id="$CLOUDFLARE_ZONE_ID"
  else
    log_warn "Resolving Cloudflare zone ID..."
    zone_id="$(resolve_zone_id "$DOMAIN" || true)"
  fi

  [[ -n "$zone_id" ]] || die "Could not find Cloudflare zone for $DOMAIN"
  log_ok "Zone ID: $zone_id"

  case "$ACTION" in
    list)
      list_records "$zone_id"
      ;;
    enable)
      update_proxy "$zone_id" "true"
      ;;
    disable)
      update_proxy "$zone_id" "false"
      ;;
  esac
}

main "$@"
