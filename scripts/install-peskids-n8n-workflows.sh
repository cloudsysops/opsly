#!/usr/bin/env bash
# Import Peskids n8n workflows (WhatsApp + optional Instagram) into tenant n8n container.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.n8n/1-workflows/peskids"
CONTAINER="${N8N_CONTAINER:-n8n_peskids}"
DRY_RUN=false
FORCE=false

usage() {
  cat <<'EOF'
Usage: ./scripts/install-peskids-n8n-workflows.sh [--dry-run] [--force] [--container n8n_peskids]

Imports JSON workflows from .n8n/1-workflows/peskids/ into the tenant n8n Docker container
and publishes them (production webhook URLs).

On VPS:
  ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ./scripts/install-peskids-n8n-workflows.sh'
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --container) CONTAINER="${2:-}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing directory: $SOURCE_DIR" >&2
  exit 1
fi

mapfile -t WORKFLOWS < <(find "$SOURCE_DIR" -maxdepth 1 -name '*.json' -type f | sort)
if [[ "${#WORKFLOWS[@]}" -eq 0 ]]; then
  echo "No workflow JSON files in $SOURCE_DIR" >&2
  exit 1
fi

workflow_field() {
  node -e "const w=JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); const v=w[process.argv[2]]; if (typeof v !== 'string' || v.length === 0) process.exit(1); process.stdout.write(v)" "$1" "$2"
}

workflow_exists() {
  local workflow_id="$1"
  local workflow_name="$2"
  docker exec "$CONTAINER" n8n list:workflow 2>/dev/null \
    | awk -F'|' -v id="$workflow_id" -v name="$workflow_name" '$1 == id || $2 == name { found = 1 } END { exit found ? 0 : 1 }'
}

echo "Target container: $CONTAINER"
echo "Workflows: ${#WORKFLOWS[@]}"

if [[ "$DRY_RUN" == true ]]; then
  for file in "${WORKFLOWS[@]}"; do
    echo "  [dry-run] would import $(basename "$file")"
  done
  exit 0
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Container not found: $CONTAINER" >&2
  exit 1
fi

docker exec "$CONTAINER" mkdir -p /tmp/opsly-peskids-workflows

for file in "${WORKFLOWS[@]}"; do
  base="$(basename "$file")"
  workflow_id="$(workflow_field "$file" "id")"
  workflow_name="$(workflow_field "$file" "name")"
  if [[ "$FORCE" != true ]] && workflow_exists "$workflow_id" "$workflow_name"; then
    echo "  skipped existing $base"
    docker exec "$CONTAINER" n8n publish:workflow --id="$workflow_id" 2>/dev/null || true
    continue
  fi
  docker cp "$file" "$CONTAINER:/tmp/opsly-peskids-workflows/$base"
  docker exec "$CONTAINER" n8n import:workflow --input="/tmp/opsly-peskids-workflows/$base"
  docker exec "$CONTAINER" n8n publish:workflow --id="$workflow_id"
  echo "  imported + published $base"
done

echo "Done. Test webhook:"
echo "  curl -X POST https://n8n-peskids.op-sly.com/webhook/peskids-whatsapp -H 'Content-Type: application/json' -d '{\"from\":\"573001112233\",\"name\":\"Demo\",\"text\":\"Hola\"}'"
