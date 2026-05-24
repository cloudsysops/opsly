#!/usr/bin/env bash
# Configure Make.com secrets in Doppler (ops-intcloudsysops / prd).
# Discovers org/zone/team via Make API v2 using MAKE_API_TOKEN already in Doppler.
# Creates per-tenant ingress hooks when missing (same team until Make license allows more).
# Never prints secret values or full webhook URLs.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
FORCE=false
MAKE_ZONE="${MAKE_ZONE:-us2}"

# Production tenants (slug). Hooks: opsly-<slug>-ingress
TENANT_SLUGS=(
  peskids
  smiletripcare
  localrank
  jkboterolabs
  intcloudsysops
)

usage() {
  cat <<'EOF'
Usage: ./scripts/doppler-configure-make-prd.sh [--dry-run] [--force] [--zone us2]

  --dry-run  Plan only; no Doppler writes or Make hook creation
  --force    Overwrite MAKE_ORG_ID, MAKE_ZONE, MAKE_TEAM_ID, MAKE_WEBHOOK_URL and tenant hooks

Requires MAKE_API_TOKEN in Doppler prd. Sets:
  MAKE_ZONE, MAKE_ORG_ID, MAKE_TEAM_ID, MAKE_WEBHOOK_URL (platform default hook)
  TENANT_<SLUG>_MAKE_TEAM_ID, TENANT_<SLUG>_MAKE_WEBHOOK_URL per tenant

Make license note: one team per org on current plan — tenants share teamId;
isolation is via dedicated webhook URLs (one hook per tenant scenario).

After success: cd /opt/opsly && ./scripts/vps-bootstrap.sh (VPS)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --zone)
      shift
      MAKE_ZONE="${1:-us2}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI not found" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "curl required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required" >&2
  exit 1
fi

secret_exists() {
  local name="$1"
  doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1
}

get_secret_plain() {
  local name="$1"
  doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true
}

set_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "  skip $name (empty)" >&2
    return 0
  fi
  if secret_exists "$name" && [[ "$FORCE" != true ]]; then
    echo "  ok   $name (already set)"
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "  plan set $name"
    return 0
  fi
  printf '%s' "$value" | doppler secrets set "$name" --project "$PROJECT" --config "$CONFIG" >/dev/null
  echo "  set  $name"
}

slug_to_env_key() {
  local slug="$1"
  echo "$slug" | tr '[:lower:]-' '[:upper:]_'
}

make_api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local tmp
  tmp="$(mktemp)"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" \
      -H "Authorization: Token ${MAKE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      "${MAKE_BASE}${path}" \
      -d "$body" \
      -o "$tmp"
  else
    curl -sS -X "$method" \
      -H "Authorization: Token ${MAKE_API_TOKEN}" \
      -H "Accept: application/json" \
      "${MAKE_BASE}${path}" \
      -o "$tmp"
  fi
  printf '%s' "$tmp"
}

discover_org_id() {
  python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
orgs = d.get('organizations', [])
if not orgs:
    raise SystemExit('no organizations in Make API response')
# Prefer ops-ly name if present
for o in orgs:
    if str(o.get('name','')).lower() in ('ops-ly', 'opsly'):
        print(o['id'])
        break
else:
    print(orgs[0]['id'])
" "$1"
}

discover_team_id() {
  python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
teams = d.get('teams', [])
if not teams:
    raise SystemExit('no teams in organization')
print(teams[0]['id'])
" "$1"
}

find_hook_url() {
  local hooks_json="$1"
  local hook_name="$2"
  python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
for h in d.get('hooks', []):
    if h.get('name') == sys.argv[2] and h.get('url'):
        print(h['url'])
        break
" "$hooks_json" "$hook_name"
}

create_hook_if_missing() {
  local team_id="$1"
  local hook_name="$2"
  local hooks_file
  hooks_file="$(make_api GET "/hooks?teamId=${team_id}")"
  local url
  url="$(find_hook_url "$hooks_file" "$hook_name" || true)"
  if [[ -n "$url" ]]; then
    rm -f "$hooks_file"
    printf '%s' "$url"
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "  plan create Make hook ${hook_name}" >&2
    rm -f "$hooks_file"
    printf '%s' "https://hook.${MAKE_ZONE}.make.com/dry-run/${hook_name}"
    return 0
  fi
  local body
  body="$(python3 -c "import json; print(json.dumps({'name': '$hook_name', 'teamId': '$team_id', 'typeName': 'gateway-webhook', 'method': True, 'headers': True, 'stringify': False}))")"
  local created
  created="$(make_api POST "/hooks" "$body")"
  url="$(python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
h = d.get('hook', {})
if not h.get('url'):
    raise SystemExit(d.get('message', 'hook create failed'))
print(h['url'])
" "$created")"
  hook_id="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('hook',{}).get('id',''))" "$created")"
  echo "  make hook ${hook_name} id=${hook_id}" >&2
  rm -f "$hooks_file" "$created"
  printf '%s' "$url"
}

echo "Make → Doppler ${PROJECT}/${CONFIG}"
echo "dry_run=${DRY_RUN} force=${FORCE} zone=${MAKE_ZONE}"
echo ""

MAKE_API_TOKEN="$(get_secret_plain MAKE_API_TOKEN)"
if [[ -z "$MAKE_API_TOKEN" ]]; then
  echo "MAKE_API_TOKEN missing in Doppler ${PROJECT}/${CONFIG}" >&2
  exit 1
fi
echo "  ok   MAKE_API_TOKEN (present, not shown)"

MAKE_BASE="https://${MAKE_ZONE}.make.com/api/v2"

orgs_file="$(make_api GET "/organizations")"
MAKE_ORG_ID="$(discover_org_id "$orgs_file")"
org_name="$(python3 -c "import json,sys; orgs=json.load(open(sys.argv[1])).get('organizations',[]); print(next((o.get('name','') for o in orgs if o.get('id')==int(sys.argv[2])), ''))" "$orgs_file" "$MAKE_ORG_ID")"
rm -f "$orgs_file"
echo "  discovered org id=${MAKE_ORG_ID} name=${org_name}"

teams_file="$(make_api GET "/teams?organizationId=${MAKE_ORG_ID}")"
MAKE_TEAM_ID="$(discover_team_id "$teams_file")"
team_name="$(python3 -c "import json,sys; teams=json.load(open(sys.argv[1])).get('teams',[]); print(teams[0].get('name','') if teams else '')" "$teams_file")"
rm -f "$teams_file"
echo "  discovered team id=${MAKE_TEAM_ID} name=${team_name}"

set_secret MAKE_ZONE "$MAKE_ZONE"
set_secret MAKE_ORG_ID "$MAKE_ORG_ID"
set_secret MAKE_TEAM_ID "$MAKE_TEAM_ID"

# Platform default: first gateway-webhook or create opsly-platform-ingress
PLATFORM_HOOK_NAME="opsly-platform-ingress"
PLATFORM_URL="$(create_hook_if_missing "$MAKE_TEAM_ID" "$PLATFORM_HOOK_NAME")"
set_secret MAKE_WEBHOOK_URL "$PLATFORM_URL"
unset PLATFORM_URL

echo ""
echo "Tenant hooks (shared team ${MAKE_TEAM_ID} until Make license allows more teams):"
for slug in "${TENANT_SLUGS[@]}"; do
  env_key="$(slug_to_env_key "$slug")"
  hook_name="opsly-${slug}-ingress"
  tenant_url="$(create_hook_if_missing "$MAKE_TEAM_ID" "$hook_name")"
  set_secret "TENANT_${env_key}_MAKE_TEAM_ID" "$MAKE_TEAM_ID"
  set_secret "TENANT_${env_key}_MAKE_WEBHOOK_URL" "$tenant_url"
  unset tenant_url
done

echo ""
echo "Done. Verify names (no values):"
echo "  doppler secrets --only-names --project ${PROJECT} --config ${CONFIG} | rg -i 'MAKE|TENANT_.*_MAKE'"
echo ""
echo "Architecture: docs/01-development/MAKE-SETUP.md"
echo "VPS refresh: ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ./scripts/vps-bootstrap.sh'"
