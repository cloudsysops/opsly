#!/usr/bin/env bash
# Domain cutover helper: op-sly.com + Cloudflare DNS + Traefik ACME validation.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/../lib/common.sh"

DOMAIN="${DOMAIN:-op-sly.com}"
PROJECT="${PROJECT:-ops-intcloudsysops}"
CONFIG="${CONFIG:-prd}"
VPS_HOST="${VPS_HOST:-100.120.151.91}"
VPS_USER="${VPS_USER:-vps-dragon}"
VPS_PATH="${VPS_PATH:-/opt/opsly}"
EXPECTED_PUBLIC_IP="${EXPECTED_PUBLIC_IP:-157.245.223.7}"
APPLY_TRAEFIK_RECREATE="false"

usage() {
  cat <<'EOF'
Usage: domain-cutover-op-sly.sh [options]

Options:
  --domain <value>             Base domain (default: op-sly.com)
  --project <value>            Doppler project (default: ops-intcloudsysops)
  --config <value>             Doppler config (default: prd)
  --vps-host <value>           VPS SSH host (default: 100.120.151.91)
  --vps-user <value>           VPS SSH user (default: vps-dragon)
  --vps-path <value>           VPS repo path (default: /opt/opsly)
  --expected-public-ip <value> Public VPS IP for DNS A records
  --apply-traefik-recreate     Recreate traefik on VPS after checks
  --dry-run                    Print actions only
  --yes                        Non-interactive mode
  -h, --help                   Show this help

Notes:
  - Cloudflare "Proxied" records resolve to Cloudflare anycast IPs, not your VPS IP.
  - DNS public records must target the public VPS IP, not Tailscale 100.x addresses.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain)
        DOMAIN="${2:?missing value for --domain}"
        shift
        ;;
      --project)
        PROJECT="${2:?missing value for --project}"
        shift
        ;;
      --config)
        CONFIG="${2:?missing value for --config}"
        shift
        ;;
      --vps-host)
        VPS_HOST="${2:?missing value for --vps-host}"
        shift
        ;;
      --vps-user)
        VPS_USER="${2:?missing value for --vps-user}"
        shift
        ;;
      --vps-path)
        VPS_PATH="${2:?missing value for --vps-path}"
        shift
        ;;
      --expected-public-ip)
        EXPECTED_PUBLIC_IP="${2:?missing value for --expected-public-ip}"
        shift
        ;;
      --apply-traefik-recreate)
        APPLY_TRAEFIK_RECREATE="true"
        ;;
      --dry-run)
        DRY_RUN="true"
        export DRY_RUN
        ;;
      --yes)
        ASSUME_YES="true"
        export ASSUME_YES
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1" 1
        ;;
    esac
    shift
  done
}

check_doppler_secret_length() {
  local key="$1"
  local bytes
  bytes="$(doppler secrets get "$key" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null | wc -c | tr -d ' ')"
  if [[ "${bytes}" -gt 0 ]]; then
    log_ok "Doppler ${CONFIG} has ${key} (${bytes} bytes)"
  else
    die "Doppler ${CONFIG} has empty/missing ${key}" 1
  fi
}

check_platform_domain() {
  local value
  value="$(doppler secrets get PLATFORM_DOMAIN --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
  if [[ -z "${value}" ]]; then
    die "PLATFORM_DOMAIN missing in Doppler ${CONFIG}" 1
  fi
  if [[ "${value}" != "${DOMAIN}" ]]; then
    die "PLATFORM_DOMAIN is '${value}', expected '${DOMAIN}'" 1
  fi
  log_ok "PLATFORM_DOMAIN in Doppler matches ${DOMAIN}"
}

check_tenant_base_domain() {
  local value
  value="$(doppler secrets get TENANT_BASE_DOMAIN --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
  if [[ -z "${value}" ]]; then
    log_warn "TENANT_BASE_DOMAIN is empty in Doppler ${CONFIG} (tenants will use PLATFORM_DOMAIN)"
    return 0
  fi
  log_ok "TENANT_BASE_DOMAIN in Doppler: ${value}"
}

dns_lookup() {
  local host="$1"
  local output
  output="$(dig +short "$host" 2>/dev/null | tr '\n' ' ' | sed -E 's/[[:space:]]+$//' || true)"
  if [[ -z "${output}" ]]; then
    log_warn "DNS ${host}: no records yet"
  else
    log_info "DNS ${host}: ${output}"
  fi
}

verify_vps_env() {
  local cmd
  cmd="set -euo pipefail; \
if [[ ! -f \"${VPS_PATH}/.env\" ]]; then echo 'missing .env'; exit 1; fi; \
platform_line=\$(awk -F= '/^PLATFORM_DOMAIN=/{print \$2}' \"${VPS_PATH}/.env\" | tail -n1); \
token_line=\$(awk -F= '/^CF_DNS_API_TOKEN=/{print \$2}' \"${VPS_PATH}/.env\" | tail -n1); \
echo \"PLATFORM_DOMAIN=\${platform_line}\"; \
echo \"CF_DNS_API_TOKEN_BYTES=\${#token_line}\""
  run ssh -o BatchMode=yes -o ConnectTimeout=15 "${VPS_USER}@${VPS_HOST}" "${cmd}"
}

recreate_traefik() {
  local cmd
  cmd="set -euo pipefail; \
cd \"${VPS_PATH}/infra\"; \
docker compose --env-file \"${VPS_PATH}/.env\" -f docker-compose.platform.yml up -d --force-recreate traefik; \
docker compose --env-file \"${VPS_PATH}/.env\" -f docker-compose.platform.yml ps traefik"
  run ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_USER}@${VPS_HOST}" "${cmd}"
}

check_https() {
  local url="$1"
  if curl -fsS --max-time 20 "$url" >/dev/null; then
    log_ok "HTTPS OK: $url"
  else
    log_warn "HTTPS check failed: $url"
  fi
}

main() {
  require_cmd doppler dig curl ssh awk wc tr xargs
  parse_args "$@"

  log_info "Cutover checks for ${DOMAIN}"
  log_info "Expected public VPS IP for A records: ${EXPECTED_PUBLIC_IP}"

  check_doppler_secret_length CF_DNS_API_TOKEN
  check_platform_domain
  check_tenant_base_domain

  dns_lookup "${DOMAIN}"
  dns_lookup "api.${DOMAIN}"
  dns_lookup "admin.${DOMAIN}"
  dns_lookup "app.${DOMAIN}"

  log_warn "If records are proxied in Cloudflare, seeing non-${EXPECTED_PUBLIC_IP} IPs is expected."
  log_warn "Do NOT use 100.x Tailscale IPs for public DNS A records."

  verify_vps_env

  if [[ "${APPLY_TRAEFIK_RECREATE}" == "true" ]]; then
    if confirm "Recreate Traefik on ${VPS_HOST}?"; then
      recreate_traefik
    fi
  fi

  check_https "https://api.${DOMAIN}/api/health"
  check_https "https://admin.${DOMAIN}"

  log_ok "Domain cutover helper completed."
}

main "$@"
