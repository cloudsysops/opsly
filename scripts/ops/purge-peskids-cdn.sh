#!/usr/bin/env bash
# Purge Cloudflare cache for Peskids public site (www.peskids.com).
# Token: CF_DNS_API_TOKEN env, or Doppler ops-intcloudsysops/prd (Zone.Cache Purge).
# Called automatically after peskids-deploy-vps.sh / Deploy Peskids workflow.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY_RUN=false
EVERYTHING=true
SOFT=false
ZONE_NAME="${CF_ZONE_NAME:-peskids.com}"

usage() {
  cat <<EOF
Usage: ./scripts/ops/purge-peskids-cdn.sh [--dry-run] [--urls-only] [--soft]

Purges Cloudflare cache for zone ${ZONE_NAME} (default peskids.com).

Token resolution (first match):
  1) CF_DNS_API_TOKEN env
  2) doppler secrets get CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd

  --dry-run     Resolve zone and print plan; no purge
  --urls-only   Purge listed URLs only (no purge_everything)
  --soft        On failure: warn + exit 0 (for post-deploy hooks)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --urls-only) EVERYTHING=false ;;
    --soft) SOFT=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

fail() {
  echo "$*" >&2
  if [[ "$SOFT" == "true" ]]; then
    echo "warn soft: CDN purge skipped/failed (deploy still OK)" >&2
    exit 0
  fi
  exit 1
}

resolve_token() {
  if [[ -n "${CF_DNS_API_TOKEN:-}" ]]; then
    printf '%s' "$CF_DNS_API_TOKEN"
    return 0
  fi
  if command -v doppler >/dev/null 2>&1; then
    doppler secrets get CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd --plain 2>/dev/null || true
    return 0
  fi
  printf ''
}

TOKEN="$(resolve_token)"
if [[ -z "${TOKEN}" ]]; then
  fail "CF_DNS_API_TOKEN empty (set env or Doppler prd)"
fi

ZONE_JSON="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}&per_page=5")" || fail "Cloudflare zones API failed"
ZONE_ID="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); r=d.get("result") or [];
print(r[0]["id"] if r else "")' "$ZONE_JSON")"
if [[ -z "$ZONE_ID" ]]; then
  fail "Zone not found: ${ZONE_NAME}"
fi

URLS=(
  "https://www.peskids.com/"
  "https://peskids.com/"
  "https://www.peskids.com/admin/login"
  "https://www.peskids.com/familias/login"
  "https://www.peskids.com/teacher/login"
  "https://www.peskids.com/reserva-clase-gratuita"
  "https://www.peskids.com/api/health"
)

echo "zone=${ZONE_NAME} id=${ZONE_ID}"
echo "urls=${#URLS[@]} everything=${EVERYTHING}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] would purge URLs:"
  printf '  %s\n' "${URLS[@]}"
  [[ "$EVERYTHING" == "true" ]] && echo "[dry-run] would purge_everything=true"
  exit 0
fi

FILES_JSON="$(python3 -c 'import json,sys; print(json.dumps({"files": json.loads(sys.argv[1])}))' "$(printf '%s\n' "${URLS[@]}" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')")"

if ! curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
  --data "$FILES_JSON" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("ok purge_files")'; then
  fail "purge_files failed"
fi

if [[ "$EVERYTHING" == "true" ]]; then
  if ! curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
    --data '{"purge_everything":true}' \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("ok purge_everything")'; then
    fail "purge_everything failed"
  fi
fi

echo "ok   peskids CDN purge (Cloudflare ${ZONE_NAME})"
echo "Hint: hard-refresh browser once (Cmd+Shift+R) if you still see a local cache."
