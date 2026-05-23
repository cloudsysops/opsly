#!/usr/bin/env bash
# Audit URL-like secrets for localhost / 127.0.0.1 in Doppler (and optionally VPS peskids).
# Does not print secret values — only names and PASS/FAIL/WARN.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
CHECK_VPS=false
SSH_HOST="${SSH_HOST:-vps-dragon@100.120.151.91}"

usage() {
  cat <<'EOF'
Usage: ./scripts/validate-production-urls.sh [--vps]

Scans Doppler secrets whose names look URL-related for localhost/127.0.0.1.
With --vps, also checks the running "peskids" container env on the VPS.

Exit 0 if no FAIL; exit 1 if any FAIL (localhost in a client-facing secret).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vps) CHECK_VPS=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "FAIL: doppler CLI not found" >&2
  exit 1
fi

FAIL=0
WARN=0

echo "=== Doppler ${PROJECT}/${CONFIG} — URL secrets (localhost check) ==="
echo ""

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  value="$(doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
  if [[ -z "$value" ]]; then
    continue
  fi
  if [[ "$value" =~ localhost|127\.0\.0\.1 ]]; then
    # Internal Docker names are OK for server-side only
    if [[ "$name" == LLM_GATEWAY_URL ]] && [[ "$value" == http://172.17.0.1:* ]]; then
      echo "WARN  $name (Docker host gateway — OK for VPS container, not for browsers)"
      WARN=$((WARN + 1))
    elif [[ "$name" == OPSLY_EVENT_BUS_URL ]] || [[ "$name" == REDIS_URL ]] || [[ "$name" == OLLAMA_URL ]]; then
      echo "WARN  $name (verify intent — contains loopback/host IP)"
      WARN=$((WARN + 1))
    else
      echo "FAIL  $name (contains localhost/127.0.0.1 — fix before clients use it)"
      FAIL=$((FAIL + 1))
    fi
  fi
done < <(doppler secrets --only-names --project "$PROJECT" --config "$CONFIG" 2>/dev/null \
  | rg -i 'URL|SITE|REDIRECT|WEBHOOK|GATEWAY|PORTAL|API_BASE|SUPABASE' || true)

check_public_url_secret() {
  local name="$1"
  local value
  value="$(doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
  [[ -z "$value" ]] && return 0
  if [[ "$value" =~ smiletripcare|localhost|127\.0\.0\.1 ]]; then
    echo "FAIL  $name (wrong domain or loopback — use https://api.\${PLATFORM_DOMAIN})"
    FAIL=$((FAIL + 1))
  elif [[ "$name" == NEXT_PUBLIC_OPSLY_EVENT_BUS_URL ]]; then
    echo "FAIL  $name (remove from Doppler — use server-only OPSLY_EVENT_BUS_URL)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Client-facing NEXT_PUBLIC URL secrets ==="
for key in NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_OPSLY_EVENT_BUS_URL; do
  check_public_url_secret "$key"
done

echo ""
echo "=== Required Peskids production secrets (presence only) ==="
for key in \
  PESKIDS_INBOUND_WEBHOOK_URL \
  N8N_WEBHOOK_BASE_URL \
  OPSLY_API_BASE_URL \
  OPSLY_EVENT_BUS_URL \
  LLM_GATEWAY_URL \
  NEXT_PUBLIC_SUPABASE_URL \
  DASHBOARD_ADMIN_SECRET; do
  if doppler secrets get "$key" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
    echo "  ok   $key"
  else
    echo "  FAIL $key (missing)"
    FAIL=$((FAIL + 1))
  fi
done

if [[ "$CHECK_VPS" == true ]]; then
  echo ""
  echo "=== VPS container peskids (URL env) ==="
  VPS_ENV="$(ssh -o BatchMode=yes -o ConnectTimeout=12 "$SSH_HOST" \
    'docker inspect peskids --format "{{range .Config.Env}}{{println .}}{{end}}" 2>/dev/null' || true)"
  if [[ -z "$VPS_ENV" ]]; then
    echo "WARN  could not read peskids container on VPS"
    WARN=$((WARN + 1))
  else
    echo "$VPS_ENV" | rg -i 'URL|WEBHOOK|GATEWAY|localhost|127\.' \
      | sed 's/=.*$/=***redacted***/' | sort || true
  fi
  if ssh -o BatchMode=yes -o ConnectTimeout=12 "$SSH_HOST" \
    'docker inspect peskids --format "{{range .Config.Env}}{{println .}}{{end}}" 2>/dev/null' \
    | rg -q '^LLM_GATEWAY_URL='; then
    echo "  ok   LLM_GATEWAY_URL present in container"
  else
    echo "  FAIL LLM_GATEWAY_URL missing in peskids container (chat AI will use code fallback)"
    FAIL=$((FAIL + 1))
  fi
  for bad in NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_OPSLY_EVENT_BUS_URL; do
    if ssh -o BatchMode=yes -o ConnectTimeout=12 "$SSH_HOST" \
      "docker inspect peskids --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null" \
      | rg -q "^${bad}="; then
      echo "  FAIL ${bad} still in peskids container (redeploy with env filter)"
      FAIL=$((FAIL + 1))
    fi
  done
fi

echo ""
echo "Summary: fail=$FAIL warn=$WARN"
if [[ "$FAIL" -gt 0 ]]; then
  echo "Fix: ./scripts/doppler-configure-peskids-prd.sh --force && redeploy peskids"
  exit 1
fi
exit 0
