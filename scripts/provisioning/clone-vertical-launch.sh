#!/usr/bin/env bash
# Clone a vertical blueprint into clients/<slug>.launch.json (merge base + vertical + CLI overrides).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERTICAL=""
SLUG=""
BUSINESS_NAME=""
DOMAIN=""
EMAIL=""
DRY_RUN=false
FORCE=false

usage() {
  cat <<'EOF'
Usage: ./scripts/provisioning/clone-vertical-launch.sh \
  --vertical swim-school|barberia|restaurante|hotel|ventas|marketplace|whatsapp-first \
  --slug <tenant-slug> \
  --business-name "Name" \
  --domain slug.op-sly.com \
  --email owner@example.com \
  [--dry-run] [--force]

Merges config/vertical-blueprints/_base.json + <vertical>.json + required CLI fields.
Output: clients/<slug>.launch.json

Next: npm run client:plan -- --tenant-slug <slug>
      ./scripts/provisioning/bootstrap-tenant.sh --launch clients/<slug>.launch.json --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vertical)
      shift
      VERTICAL="${1:-}"
      ;;
    --slug)
      shift
      SLUG="${1:-}"
      ;;
    --business-name)
      shift
      BUSINESS_NAME="${1:-}"
      ;;
    --domain)
      shift
      DOMAIN="${1:-}"
      ;;
    --email)
      shift
      EMAIL="${1:-}"
      ;;
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

for req in VERTICAL SLUG BUSINESS_NAME DOMAIN EMAIL; do
  if [[ -z "${!req}" ]]; then
    echo "Missing required: --vertical --slug --business-name --domain --email" >&2
    usage
    exit 1
  fi
done

BASE="${ROOT}/config/vertical-blueprints/_base.json"
VERT_FILE="${ROOT}/config/vertical-blueprints/${VERTICAL}.json"
OUT="${ROOT}/clients/${SLUG}.launch.json"

if [[ ! -f "$VERT_FILE" ]]; then
  echo "Unknown vertical: $VERTICAL (expected file $VERT_FILE)" >&2
  echo "Available:" >&2
  jq -r '.verticals[] | "  \(.id)"' "${ROOT}/config/vertical-blueprints/index.json" >&2
  exit 1
fi

if [[ -f "$OUT" && "$FORCE" != true ]]; then
  echo "Refusing to overwrite $OUT (use --force)" >&2
  exit 1
fi

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}
require_command jq

MERGED="$(
  jq -n \
    --slurpfile base "$BASE" \
    --slurpfile vert "$VERT_FILE" \
    --arg slug "$SLUG" \
    --arg name "$BUSINESS_NAME" \
    --arg domain "$DOMAIN" \
    --arg email "$EMAIL" \
    '$base[0] * $vert[0] | . + {
      tenant_slug: $slug,
      business_name: $name,
      domain: $domain,
      primary_email: $email
    } | walk(
      if type == "string" then gsub("\\{tenant_slug\\}"; $slug) else . end
    )'
)"

if [[ "$DRY_RUN" == true ]]; then
  echo "$MERGED" | jq .
  echo ""
  echo "DRY RUN: would write $OUT"
  exit 0
fi

mkdir -p "${ROOT}/clients"
echo "$MERGED" | jq . >"$OUT"
echo "Wrote $OUT"
echo ""
echo "Next:"
echo "  npm run client:plan -- --tenant-slug $SLUG"
echo "  ./scripts/provisioning/bootstrap-tenant.sh --launch $OUT --dry-run"
