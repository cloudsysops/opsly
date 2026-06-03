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

workflow_is_active() {
  node -e "const w=JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); process.stdout.write(w.active === false ? 'false' : 'true')" "$1"
}

workflow_exists() {
  local workflow_id="$1"
  local workflow_name="$2"
  docker exec "$CONTAINER" n8n list:workflow 2>/dev/null \
    | awk -F'|' -v id="$workflow_id" -v name="$workflow_name" '$1 == id || $2 == name { found = 1 } END { exit found ? 0 : 1 }'
}

n8n_volume() {
  docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/home/node/.n8n"}}{{.Name}}{{end}}{{end}}'
}

n8n_image() {
  docker inspect "$CONTAINER" --format '{{.Config.Image}}'
}

# n8n 2.x applies publish/activate while the main process is stopped (see publish:workflow note).
# Pass live container's DB config + network + password so publish:workflow finds the production database.
n8n_offline() {
  local volume image network db_type db_postgresdb_host db_postgresdb_port db_postgresdb_database db_postgresdb_user db_postgresdb_password
  volume="$(n8n_volume)"
  image="$(n8n_image)"
  if [[ -z "$volume" || -z "$image" ]]; then
    echo "Could not resolve n8n volume/image for $CONTAINER" >&2
    return 1
  fi
  # Extract network and database config from live container
  network="$(docker inspect "$CONTAINER" --format='{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null | head -1)"
  db_type="$(docker exec "$CONTAINER" sh -c 'echo "$DB_TYPE"' 2>/dev/null || echo '')"
  db_postgresdb_host="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_HOST"' 2>/dev/null || echo '')"
  db_postgresdb_port="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_PORT"' 2>/dev/null || echo '')"
  db_postgresdb_database="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_DATABASE"' 2>/dev/null || echo '')"
  db_postgresdb_user="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_USER"' 2>/dev/null || echo '')"
  db_postgresdb_password="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_PASSWORD"' 2>/dev/null || echo '')"

  # Build docker run command with network + env passthrough
  local docker_args=(--rm -v "${volume}:/home/node/.n8n" --entrypoint n8n)
  [[ -n "$network" ]] && docker_args+=(--network "$network")
  [[ -n "$db_type" ]] && docker_args+=(-e "DB_TYPE=$db_type")
  [[ -n "$db_postgresdb_host" ]] && docker_args+=(-e "DB_POSTGRESDB_HOST=$db_postgresdb_host")
  [[ -n "$db_postgresdb_port" ]] && docker_args+=(-e "DB_POSTGRESDB_PORT=$db_postgresdb_port")
  [[ -n "$db_postgresdb_database" ]] && docker_args+=(-e "DB_POSTGRESDB_DATABASE=$db_postgresdb_database")
  [[ -n "$db_postgresdb_user" ]] && docker_args+=(-e "DB_POSTGRESDB_USER=$db_postgresdb_user")
  [[ -n "$db_postgresdb_password" ]] && docker_args+=(-e "DB_POSTGRESDB_PASSWORD=$db_postgresdb_password")

  docker run "${docker_args[@]}" "$image" "$@"
}

publish_and_activate_offline() {
  local workflow_id="$1"
  echo "  unpublish $workflow_id (if published)"
  n8n_offline unpublish:workflow --id="$workflow_id" 2>/dev/null || true
  echo "  publish $workflow_id"
  n8n_offline publish:workflow --id="$workflow_id"
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

declare -a PUBLISH_QUEUE=()
changed=0
for file in "${WORKFLOWS[@]}"; do
  base="$(basename "$file")"
  workflow_id="$(workflow_field "$file" "id")"
  workflow_name="$(workflow_field "$file" "name")"
  should_be_active="$(workflow_is_active "$file")"
  if [[ "$FORCE" != true ]] && workflow_exists "$workflow_id" "$workflow_name"; then
    echo "  skipped import $base (already present)"
    if [[ "$should_be_active" == "true" ]]; then
      PUBLISH_QUEUE+=("${workflow_id}|${should_be_active}")
    fi
    continue
  fi
  if [[ "$FORCE" == true ]] && workflow_exists "$workflow_id" "$workflow_name"; then
    echo "  force re-import $base"
  fi
  docker cp "$file" "$CONTAINER:/tmp/opsly-peskids-workflows/$base"
  docker exec "$CONTAINER" n8n import:workflow --input="/tmp/opsly-peskids-workflows/$base"
  PUBLISH_QUEUE+=("${workflow_id}|${should_be_active}")
  changed=1
  echo "  imported $base"
done

if [[ "${#PUBLISH_QUEUE[@]}" -gt 0 ]]; then
  echo "Stopping $CONTAINER to publish production webhook routes (n8n 2.x)..."
  docker stop "$CONTAINER" >/dev/null
  for entry in "${PUBLISH_QUEUE[@]}"; do
    workflow_id="${entry%%|*}"
    should_be_active="${entry#*|}"
    publish_and_activate_offline "$workflow_id"
  done
  echo "Starting $CONTAINER..."
  docker start "$CONTAINER" >/dev/null
  sleep 20
fi

echo "Done. Test webhooks:"
echo "  curl -X POST https://n8n-peskids.op-sly.com/webhook/peskids-lead-intake -H 'Content-Type: application/json' -d '{}'"
echo "  curl -X POST https://n8n-peskids.op-sly.com/webhook/peskids-whatsapp -H 'Content-Type: application/json' -d '{\"from\":\"573001112233\",\"name\":\"Demo\",\"text\":\"Hola\"}'"
