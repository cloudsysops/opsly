#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.n8n/1-workflows/crm"
DRY_RUN=false
TENANT_SLUG=""
CONTAINER_NAME=""
ALL_RUNNING=false
FORCE=false

usage() {
  cat <<'EOF'
Usage:
  scripts/install-crm-workflows.sh --tenant <slug> [--dry-run] [--force]
  scripts/install-crm-workflows.sh --container <name> [--dry-run] [--force]
  scripts/install-crm-workflows.sh --all-running [--dry-run] [--force]

Imports Opsly CRM Starter Pack workflows into tenant n8n containers.

Options:
  --tenant <slug>       Use container n8n_<slug>
  --container <name>    Use explicit n8n container name
  --all-running         Import into all running containers named n8n_*
  --source-dir <path>   Override workflow source directory
  --dry-run             Validate and print actions without importing
  --force               Re-import workflows that already exist; required with --all-running
EOF
}

validate_slug() {
  local slug="$1"
  if [[ ! "$slug" =~ ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$ ]]; then
    echo "Invalid tenant slug: $slug" >&2
    exit 1
  fi
}

validate_container_name() {
  local name="$1"
  if [[ ! "$name" =~ ^n8n_[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$ ]]; then
    echo "Invalid n8n container name: $name" >&2
    exit 1
  fi
}

workflow_field() {
  local file="$1"
  local field="$2"
  node -e "const w=JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); const v=w[process.argv[2]]; if (typeof v !== 'string' || v.length === 0) process.exit(1); process.stdout.write(v)" "$file" "$field"
}

workflow_exists() {
  local container="$1"
  local workflow_id="$2"
  local workflow_name="$3"

  docker exec "$container" n8n list:workflow 2>/dev/null \
    | awk -F'|' -v id="$workflow_id" -v name="$workflow_name" '$1 == id || $2 == name { found = 1 } END { exit found ? 0 : 1 }'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant)
      TENANT_SLUG="${2:-}"
      shift 2
      ;;
    --container)
      CONTAINER_NAME="${2:-}"
      shift 2
      ;;
    --all-running)
      ALL_RUNNING=true
      shift
      ;;
    --source-dir)
      SOURCE_DIR="${2:-}"
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
  echo "Workflow source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

WORKFLOWS=()
while IFS= read -r file; do
  WORKFLOWS+=("$file")
done < <(find "$SOURCE_DIR" -maxdepth 1 -type f -name '*.json' ! -name '._*' | sort)
if [[ "${#WORKFLOWS[@]}" -eq 0 ]]; then
  echo "No workflow JSON files found in $SOURCE_DIR" >&2
  exit 1
fi

echo "Validating ${#WORKFLOWS[@]} CRM workflows..."
for file in "${WORKFLOWS[@]}"; do
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$file"
  workflow_field "$file" "id" >/dev/null
  workflow_field "$file" "name" >/dev/null
  echo "  ok $(basename "$file")"
done

containers=()
if [[ "$ALL_RUNNING" == "true" ]]; then
  if [[ "$DRY_RUN" != "true" && "$FORCE" != "true" ]]; then
    echo "--all-running requires --force for non-dry-run imports." >&2
    exit 1
  fi
  while IFS= read -r container; do
    validate_container_name "$container"
    containers+=("$container")
  done < <(docker ps --format '{{.Names}}' | awk '/^n8n_/ { print }')
elif [[ -n "$CONTAINER_NAME" ]]; then
  validate_container_name "$CONTAINER_NAME"
  containers=("$CONTAINER_NAME")
elif [[ -n "$TENANT_SLUG" ]]; then
  validate_slug "$TENANT_SLUG"
  containers=("n8n_${TENANT_SLUG}")
else
  echo "Choose --tenant, --container, or --all-running." >&2
  usage >&2
  exit 1
fi

if [[ "${#containers[@]}" -eq 0 ]]; then
  echo "No target n8n containers found." >&2
  exit 1
fi

for container in "${containers[@]}"; do
  echo "Target: $container"
  if [[ "$DRY_RUN" == "true" ]]; then
    for file in "${WORKFLOWS[@]}"; do
      echo "  [DRY-RUN] would import $(basename "$file") into $container"
    done
    continue
  fi

  if ! docker inspect "$container" >/dev/null 2>&1; then
    echo "Container not found: $container" >&2
    exit 1
  fi

  docker exec "$container" mkdir -p /tmp/opsly-crm-workflows
  for file in "${WORKFLOWS[@]}"; do
    base="$(basename "$file")"
    workflow_id="$(workflow_field "$file" "id")"
    workflow_name="$(workflow_field "$file" "name")"
    if [[ "$FORCE" != "true" ]] && workflow_exists "$container" "$workflow_id" "$workflow_name"; then
      echo "  skipped existing $base"
      continue
    fi
    docker cp "$file" "$container:/tmp/opsly-crm-workflows/$base"
    docker exec "$container" n8n import:workflow --input="/tmp/opsly-crm-workflows/$base"
    echo "  imported $base"
  done
done

echo "CRM workflow install complete."
