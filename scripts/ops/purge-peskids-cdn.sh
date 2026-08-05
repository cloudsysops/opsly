#!/usr/bin/env bash
# Purge Cloudflare cache for Peskids public site (www.peskids.com).
# Uses Doppler CF_DNS_API_TOKEN (must allow Zone.Cache Purge on peskids.com).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY_RUN=false
EVERYTHING=true
ZONE_NAME="${CF_ZONE_NAME:-peskids.com}"

usage() {
  cat <<EOF
Usage: ./scripts/ops/purge-peskids-cdn.sh [--dry-run] [--urls-only]

Purges Cloudflare cache for zone ${ZONE_NAME} (default peskids.com).
Requires: doppler CLI + CF_DNS_API_TOKEN in ops-intcloudsysops/prd
  (token needs Zone → Cache Purge on that zone).

  --dry-run     Resolve zone and print plan; no purge
  --urls-only   Purge listed URLs only (no purge_everything)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --urls-only) EVERYTHING=false ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI required" >&2
  exit 1
fi

TOKEN="$(doppler secrets get CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd --plain)"
if [[ -z "${TOKEN}" ]]; then
  echo "CF_DNS_API_TOKEN empty" >&2
  exit 1
fi

ZONE_JSON="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}&per_page=5")"
ZONE_ID="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); r=d.get("result") or [];
print(r[0]["id"] if r else "")' "$ZONE_JSON")"
if [[ -z "$ZONE_ID" ]]; then
  echo "Zone not found: ${ZONE_NAME}" >&2
  exit 1
fi

URLS=(
  "https://www.peskids.com/"
  "https://peskids.com/"
  "https://www.peskids.com/admin/login"
  "https://www.peskids.com/familias/login"
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

curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
  --data "$FILES_JSON" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("ok purge_files")'

if [[ "$EVERYTHING" == "true" ]]; then
  curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
    --data '{"purge_everything":true}' \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("ok purge_everything")'
fi

echo "Done. Hard-refresh the browser (Cmd+Shift+R). HTML still follows Next image build — redeploy if copy/code is stale."
echo "Health: https://www.peskids.com/api/health"
