#!/usr/bin/env bash
# Import + publish a single Peskids n8n workflow (fast recovery for one webhook).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.n8n/1-workflows/peskids"
CONTAINER="${N8N_CONTAINER:-n8n_peskids}"
WORKFLOW_ID=""
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/peskids/republish-n8n-workflow.sh <workflow-id> [--dry-run] [--container n8n_peskids]

Example (restore wacrm webhook after n8n restart):
  ./scripts/peskids/republish-n8n-workflow.sh peskids-wacrm-inbound

VPS:
  ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ./scripts/peskids/republish-n8n-workflow.sh peskids-wacrm-inbound'
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --container) CONTAINER="${2:-}"; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *)
      if [[ -z "$WORKFLOW_ID" ]]; then
        WORKFLOW_ID="$1"
      else
        echo "Unexpected argument: $1" >&2
        usage
        exit 1
      fi
      ;;
  esac
  shift
done

if [[ -z "$WORKFLOW_ID" ]]; then
  usage
  exit 1
fi

WORKFLOW_FILE="$SOURCE_DIR/${WORKFLOW_ID}.json"
if [[ ! -f "$WORKFLOW_FILE" ]]; then
  WORKFLOW_FILE="$(find "$SOURCE_DIR" -maxdepth 1 -name '*.json' -type f -exec grep -l "\"id\": \"${WORKFLOW_ID}\"" {} + | head -1)"
fi

if [[ ! -f "$WORKFLOW_FILE" ]]; then
  echo "Workflow not found: $WORKFLOW_ID under $SOURCE_DIR" >&2
  exit 1
fi

workflow_is_active() {
  node -e "const w=JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); process.stdout.write(w.active === false ? 'false' : 'true')" "$1"
}

n8n_volume() {
  docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/home/node/.n8n"}}{{.Name}}{{end}}{{end}}'
}

n8n_image() {
  docker inspect "$CONTAINER" --format '{{.Config.Image}}'
}

n8n_offline() {
  local volume image network db_type db_postgresdb_host db_postgresdb_port db_postgresdb_database db_postgresdb_user db_postgresdb_password
  volume="$(n8n_volume)"
  image="$(n8n_image)"
  if [[ -z "$volume" || -z "$image" ]]; then
    echo "Could not resolve n8n volume/image for $CONTAINER" >&2
    return 1
  fi
  network="$(docker inspect "$CONTAINER" --format='{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null | head -1)"
  db_type="$(docker exec "$CONTAINER" sh -c 'echo "$DB_TYPE"' 2>/dev/null || echo '')"
  db_postgresdb_host="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_HOST"' 2>/dev/null || echo '')"
  db_postgresdb_port="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_PORT"' 2>/dev/null || echo '')"
  db_postgresdb_database="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_DATABASE"' 2>/dev/null || echo '')"
  db_postgresdb_user="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_USER"' 2>/dev/null || echo '')"
  db_postgresdb_password="$(docker exec "$CONTAINER" sh -c 'echo "$DB_POSTGRESDB_PASSWORD"' 2>/dev/null || echo '')"

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

should_be_active="$(workflow_is_active "$WORKFLOW_FILE")"
base="$(basename "$WORKFLOW_FILE")"

echo "Container: $CONTAINER"
echo "Workflow:  $WORKFLOW_ID ($base)"
echo "Active:    $should_be_active"

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN — would import + publish $WORKFLOW_ID"
  exit 0
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Container not found: $CONTAINER" >&2
  exit 1
fi

docker exec "$CONTAINER" mkdir -p /tmp/opsly-peskids-workflows
docker cp "$WORKFLOW_FILE" "$CONTAINER:/tmp/opsly-peskids-workflows/$base"
docker exec "$CONTAINER" n8n import:workflow --input="/tmp/opsly-peskids-workflows/$base"
echo "Imported $base"

if [[ "$should_be_active" != "true" ]]; then
  echo "Workflow marked active:false — skip publish"
  exit 0
fi

echo "Stopping $CONTAINER to publish production webhook (n8n 2.x)..."
docker stop "$CONTAINER" >/dev/null
n8n_offline unpublish:workflow --id="$WORKFLOW_ID" 2>/dev/null || true
n8n_offline publish:workflow --id="$WORKFLOW_ID"
echo "Starting $CONTAINER..."
docker start "$CONTAINER" >/dev/null
sleep 15
echo "Done. Test:"
echo "  curl -X POST https://n8n-peskids.op-sly.com/webhook/wacrm-peskids-inbound -H 'Content-Type: application/json' -d '{\"phone\":\"+573001112233\",\"body\":\"test\",\"external_message_id\":\"smoke-1\",\"direction\":\"inbound\"}'"
