#!/usr/bin/env bash
# Add wacrm + digest + followup env to n8n_peskids without printing secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="${N8N_CONTAINER:-n8n_peskids}"
COMPOSE_FILE="${PESKIDS_N8N_COMPOSE:-${ROOT}/runtime/tenants/docker-compose.peskids.yml}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/reconcile-peskids-n8n-wacrm-env.sh [--dry-run]

Ensures n8n_peskids has:
  PESKIDS_APP_URL, WACRM_PESKIDS_WEBHOOK_SECRET, PESKIDS_DIGEST_CRON_SECRET,
  PESKIDS_FOLLOWUP_CRON_SECRET
Values from Doppler; recreates container preserving existing compose settings.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI required" >&2
  exit 1
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Container not found: $CONTAINER" >&2
  exit 1
fi

get_secret() {
  doppler secrets get "$1" --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --plain 2>/dev/null || true
}

PESKIDS_APP_URL="$(get_secret PESKIDS_APP_URL)"
[[ -n "$PESKIDS_APP_URL" ]] || PESKIDS_APP_URL="https://peskids.op-sly.com"
WACRM_SECRET="$(get_secret WACRM_PESKIDS_WEBHOOK_SECRET)"
DIGEST_SECRET="$(get_secret PESKIDS_DIGEST_CRON_SECRET)"
FOLLOWUP_SECRET="$(get_secret PESKIDS_FOLLOWUP_CRON_SECRET)"

if [[ -z "$WACRM_SECRET" ]]; then
  echo "FAIL: WACRM_PESKIDS_WEBHOOK_SECRET missing in Doppler" >&2
  exit 1
fi

if [[ -z "$DIGEST_SECRET" ]]; then
  DIGEST_SECRET="$(openssl rand -hex 24)"
  if [[ "$DRY_RUN" == true ]]; then
    echo "plan set PESKIDS_DIGEST_CRON_SECRET (generated)"
  else
    doppler secrets set "PESKIDS_DIGEST_CRON_SECRET=${DIGEST_SECRET}" \
      --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" >/dev/null
    echo "set  PESKIDS_DIGEST_CRON_SECRET (generated)"
  fi
fi

if [[ -z "$FOLLOWUP_SECRET" ]]; then
  FOLLOWUP_SECRET="$(openssl rand -hex 24)"
  if [[ "$DRY_RUN" == true ]]; then
    echo "plan set PESKIDS_FOLLOWUP_CRON_SECRET (generated)"
  else
    doppler secrets set "PESKIDS_FOLLOWUP_CRON_SECRET=${FOLLOWUP_SECRET}" \
      --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" >/dev/null
    echo "set  PESKIDS_FOLLOWUP_CRON_SECRET (generated)"
  fi
fi

# Build env file from running container + new keys
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT

docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -vE '^(PESKIDS_APP_URL|WACRM_PESKIDS_WEBHOOK_SECRET|PESKIDS_DIGEST_CRON_SECRET|PESKIDS_FOLLOWUP_CRON_SECRET)=' >"$ENV_FILE" || true

{
  echo "PESKIDS_APP_URL=${PESKIDS_APP_URL}"
  echo "WACRM_PESKIDS_WEBHOOK_SECRET=${WACRM_SECRET}"
  echo "PESKIDS_DIGEST_CRON_SECRET=${DIGEST_SECRET}"
  echo "PESKIDS_FOLLOWUP_CRON_SECRET=${FOLLOWUP_SECRET}"
} >>"$ENV_FILE"

IMAGE="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')"
NETWORK="$(docker inspect "$CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)"
VOLUME="$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/home/node/.n8n"}}{{.Name}}{{end}}{{end}}')"

# Preserve traefik labels from compose if present
LABEL_ARGS=()
while IFS= read -r line; do
  key="${line%%=*}"
  val="${line#*=}"
  LABEL_ARGS+=(--label "${key}=${val}")
done < <(docker inspect "$CONTAINER" --format '{{json .Config.Labels}}' | node -e "
const o=JSON.parse(require('fs').readFileSync(0,'utf8'));
for (const [k,v] of Object.entries(o)) console.log(k+'='+v);
")

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: would recreate $CONTAINER with wacrm+digest+followup env"
  exit 0
fi

echo "Recreating $CONTAINER with wacrm+digest+followup env..."
docker stop "$CONTAINER" >/dev/null
docker rm "$CONTAINER" >/dev/null

docker run -d --name "$CONTAINER" --restart unless-stopped \
  --network "$NETWORK" \
  -v "${VOLUME}:/home/node/.n8n" \
  --env-file "$ENV_FILE" \
  "${LABEL_ARGS[@]}" \
  "$IMAGE"

echo "ok   $CONTAINER recreated (wacrm + digest + followup env)"
