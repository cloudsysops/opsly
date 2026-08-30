#!/usr/bin/env bash
# Smoke público de URLs para agentes (sin credenciales).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${ROOT}/config/agent-url-audit.json"
FAIL=0

usage() {
  cat <<'EOF'
Usage: ./scripts/agent-url-audit.sh [--json-config]

HTTP GET/HEAD a URLs públicas listadas en config/agent-url-audit.json.
No imprime secretos. Exit 1 si alguna URL pública falla.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ ! -f "$CONFIG" ]]; then
  echo "FAIL: missing $CONFIG" >&2
  exit 1
fi

check_url() {
  local id="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -L "$url" || echo "000")"
  if [[ "$code" =~ ^(200|204|301|302|307|308)$ ]]; then
    echo "  ok   [$id] $url → $code"
  else
    echo "  FAIL [$id] $url → $code"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Agent URL audit (public only) ==="
echo ""

while IFS= read -r row; do
  id="$(echo "$row" | jq -r '.id')"
  url="$(echo "$row" | jq -r '.url')"
  auth="$(echo "$row" | jq -r '.auth')"
  if [[ "$auth" == "none" ]]; then
    check_url "$id" "$url"
  else
    echo "  skip [$id] $url (auth=$auth — login manual)"
  fi
done < <(jq -c '.surfaces[]' "$CONFIG")

echo ""
echo "=== Tenant edge URLs (no auth) ==="
while IFS= read -r slug; do
  n8n="$(jq -r --arg s "$slug" '.tenants[] | select(.slug==$s) | .n8n' "$CONFIG")"
  up="$(jq -r --arg s "$slug" '.tenants[] | select(.slug==$s) | .uptime' "$CONFIG")"
  check_url "${slug}-n8n" "$n8n"
  check_url "${slug}-uptime" "$up"
done < <(jq -r '.tenants[].slug' "$CONFIG")

echo ""
if [[ "$FAIL" -gt 0 ]]; then
  echo "Summary: FAIL=$FAIL"
  exit 1
fi
echo "Summary: all public checks passed"
exit 0
