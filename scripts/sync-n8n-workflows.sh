#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.n8n/1-workflows"
DRY_RUN=false
TENANT_FILTER=""
FORCE=false
PLATFORM_DOMAIN="op-sly.com"
VPS_HOST=""
VPS_USER="vps-dragon"

DEFAULT_TENANTS=(
  smiletripcare
  localrank
  jkboterolabs
  peskids
  intcloudsysops
)

usage() {
  cat <<'EOF'
Usage:
  scripts/sync-n8n-workflows.sh [options]

Syncs workflow JSON files from .n8n/1-workflows/ to n8n containers on VPS.

Options:
  --tenant <slug>       Only sync to specified tenant (repeatable)
  --dry-run             Print actions without importing
  --force               Re-import workflows that already exist
  --domain <domain>     Platform domain (default: op-sly.com)
  --vps-host <host>     SSH host for docker exec fallback
  --vps-user <user>     SSH user (default: vps-dragon)
  -h, --help            Show this help
EOF
}

log() {
  echo "[$(date '+%H:%M:%S')] $*"
}

err() {
  echo "[$(date '+%H:%M:%S')] ERROR: $*" >&2
}

resolve_auth() {
  N8N_AUTH_USER="${N8N_BASIC_AUTH_USER:-}"
  N8N_AUTH_PASSWORD="${N8N_BASIC_AUTH_PASSWORD:-}"

  if [[ -z "$N8N_AUTH_USER" || -z "$N8N_AUTH_PASSWORD" ]]; then
    if command -v doppler &>/dev/null; then
      log "Attempting to fetch n8n credentials from Doppler..."
      N8N_AUTH_USER="$(doppler secrets get N8N_BASIC_AUTH_USER --plain 2>/dev/null || true)"
      N8N_AUTH_PASSWORD="$(doppler secrets get N8N_BASIC_AUTH_PASSWORD --plain 2>/dev/null || true)"
    fi
  fi
}

resolve_auth

if [[ -z "$N8N_AUTH_USER" || -z "$N8N_AUTH_PASSWORD" ]]; then
  err "N8N_BASIC_AUTH_USER and N8N_BASIC_AUTH_PASSWORD must be set in environment or Doppler."
  err "Run: doppler run -- ./scripts/sync-n8n-workflows.sh"
  exit 1
fi

N8N_AUTH_HEADER="Authorization: Basic $(printf '%s:%s' "$N8N_AUTH_USER" "$N8N_AUTH_PASSWORD" | base64)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant)
      TENANT_FILTER="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --domain)
      PLATFORM_DOMAIN="${2:-}"
      shift 2
      ;;
    --vps-host)
      VPS_HOST="${2:-}"
      shift 2
      ;;
    --vps-user)
      VPS_USER="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$SOURCE_DIR" ]]; then
  err "Workflow source directory not found: $SOURCE_DIR"
  exit 1
fi

WORKFLOW_FILES=()
while IFS= read -r file; do
  WORKFLOW_FILES+=("$file")
done < <(find "$SOURCE_DIR" -type f -name '*.json' ! -name '._*' | sort)

if [[ "${#WORKFLOW_FILES[@]}" -eq 0 ]]; then
  err "No workflow JSON files found in $SOURCE_DIR"
  exit 1
fi

log "Found ${#WORKFLOW_FILES[@]} workflow files in $SOURCE_DIR:"
for file in "${WORKFLOW_FILES[@]}"; do
  relative="${file#$SOURCE_DIR/}"
  log "  - $relative"
done
echo ""

WORKFLOW_NAMES=()
for file in "${WORKFLOW_FILES[@]}"; do
  name="$(node -e "const w=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(w.name||'');" "$file" 2>/dev/null || true)"
  if [[ -z "$name" ]]; then
    err "Workflow file $(basename "$file") is missing a 'name' field. Skipping."
    continue
  fi
  WORKFLOW_NAMES+=("$name")
done

echo ""

if [[ -n "$TENANT_FILTER" ]]; then
  TENANTS=("$TENANT_FILTER")
else
  TENANTS=("${DEFAULT_TENANTS[@]}")
fi

FAILED=0
SUCCESS=0
SKIPPED=0

for tenant in "${TENANTS[@]}"; do
  n8n_url="https://n8n-${tenant}.${PLATFORM_DOMAIN}"
  log "=== Tenant: $tenant ($n8n_url) ==="

  if [[ "$DRY_RUN" == "true" ]]; then
    for i in "${!WORKFLOW_FILES[@]}"; do
      relative="${WORKFLOW_FILES[$i]#$SOURCE_DIR/}"
      log "  [DRY-RUN] would import $relative (name: ${WORKFLOW_NAMES[$i]})"
    done
    continue
  fi

  existing_workflows=""
  http_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -H "$N8N_AUTH_HEADER" \
    "$n8n_url/rest/workflows" 2>/dev/null || true)"
  if [[ "$http_code" != "200" ]]; then
    err "Cannot reach $n8n_url/rest/workflows (HTTP $http_code). Skipping tenant."
    FAILED=$((FAILED + 1))
    continue
  fi

  existing_workflows="$(curl -s --max-time 10 \
    -H "$N8N_AUTH_HEADER" \
    "$n8n_url/rest/workflows" 2>/dev/null || true)"

  has_existing_workflows=false
  existing_names=()
  if echo "$existing_workflows" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(d.data&&d.data.length>0?0:1)" 2>/dev/null; then
    has_existing_workflows=true
    while IFS= read -r name; do
      existing_names+=("$name")
    done < <(echo "$existing_workflows" | node -e "
      const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      (d.data||[]).forEach(w => { if(w.name) console.log(w.name); });
    " 2>/dev/null)
  fi

  for i in "${!WORKFLOW_FILES[@]}"; do
    file="${WORKFLOW_FILES[$i]}"
    wf_name="${WORKFLOW_NAMES[$i]}"
    relative="${file#$SOURCE_DIR/}"

    already_exists=false
    for existing in "${existing_names[@]}"; do
      if [[ "$existing" == "$wf_name" ]]; then
        already_exists=true
        break
      fi
    done

    if [[ "$already_exists" == "true" && "$FORCE" != "true" ]]; then
      log "  skipped existing $wf_name ($relative)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    if [[ "$already_exists" == "true" && "$FORCE" == "true" ]]; then
      log "  re-importing $wf_name ($relative) (force)"
    else
      log "  importing $wf_name ($relative)"
    fi

    import_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
      -X POST \
      -H "$N8N_AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d@"$file" \
      "$n8n_url/rest/workflows" 2>/dev/null || true)"

    if [[ "$import_code" == "200" ]]; then
      log "    -> imported successfully"
      SUCCESS=$((SUCCESS + 1))
    else
      err "    -> failed (HTTP $import_code)"
      FAILED=$((FAILED + 1))
    fi
  done
  echo ""
done

log "=== Summary ==="
log "  Imported: $SUCCESS"
log "  Skipped:  $SKIPPED"
log "  Failed:   $FAILED"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
