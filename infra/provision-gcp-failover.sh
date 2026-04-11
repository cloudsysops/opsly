#!/usr/bin/env bash
# Provisiona una VM GCP para standby (e2-micro típico). Requiere gcloud autenticado.
# Uso: ./infra/provision-gcp-failover.sh [--dry-run]
# Por defecto PROJECT_ID/GCP_PROJECT_ID=opslyquantum; opcional: config/gcp.env
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  fi
done

if [[ -f "$REPO_ROOT/config/gcp.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp.env" && set +a
elif [[ -f "$REPO_ROOT/config/gcp-opslyquantum.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp-opslyquantum.env" && set +a
fi

PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:-opslyquantum}}"
INSTANCE_NAME="${GCP_INSTANCE_NAME:-${INSTANCE_NAME:-opsly-failover}}"
ZONE="${GCP_ZONE:-${ZONE:-us-central1-a}}"
MACHINE_TYPE="${GCP_MACHINE_TYPE:-${MACHINE_TYPE:-e2-micro}}"
STARTUP_SCRIPT="${STARTUP_SCRIPT:-$REPO_ROOT/infra/gcp-failover-startup.sh}"
OUTPUT_JSON="${OUTPUT_JSON:-$REPO_ROOT/infra/gcp-failover-info.json}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta comando: $1" >&2
    exit 1
  }
}

require_cmd gcloud
require_cmd jq

if [[ ! -f "$STARTUP_SCRIPT" ]]; then
  echo "No existe startup script: $STARTUP_SCRIPT" >&2
  exit 1
fi

run_gcloud() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] gcloud $*"
  else
    gcloud "$@"
  fi
}

echo "Provision GCP failover"
echo "  proyecto:     $PROJECT_ID"
echo "  instancia:    $INSTANCE_NAME"
echo "  zona:         $ZONE"
echo "  machine-type: $MACHINE_TYPE"
echo "  startup:      $STARTUP_SCRIPT"
echo "  salida JSON:  $OUTPUT_JSON"
echo ""

if [[ "$DRY_RUN" != "true" ]]; then
  if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
    echo "ERROR: el proyecto '$PROJECT_ID' no existe o no tienes acceso." >&2
    echo "Verifica con: gcloud projects describe $PROJECT_ID" >&2
    exit 1
  fi
  echo "Proyecto verificado: $PROJECT_ID"
fi

run_gcloud services enable compute.googleapis.com --project="$PROJECT_ID"

run_gcloud compute instances create "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server \
  --metadata-from-file=startup-script="$STARTUP_SCRIPT"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "[dry-run] No se escribió JSON. Tras crear la VM, guarda IPs con describe."
  exit 0
fi

EXTERNAL_IP="$(gcloud compute instances describe "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"

INTERNAL_IP="$(gcloud compute instances describe "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --format='get(networkInterfaces[0].networkIP)')"

CREATED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
jq -n \
  --arg pid "$PROJECT_ID" \
  --arg name "$INSTANCE_NAME" \
  --arg zone "$ZONE" \
  --arg mt "$MACHINE_TYPE" \
  --arg ext "$EXTERNAL_IP" \
  --arg in "$INTERNAL_IP" \
  --arg created "$CREATED" \
  '{
    project_id: $pid,
    instance_name: $name,
    zone: $zone,
    machine_type: $mt,
    external_ip: $ext,
    internal_ip: $in,
    created: $created
  }' >"$OUTPUT_JSON"

echo ""
echo "Instancia lista. JSON: $OUTPUT_JSON"
echo "  external_ip: $EXTERNAL_IP"
echo "SSH: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
echo "Siguiente: Tailscale en la VM y sync desde docs/GCP-STANDBY-CONFIG.md"
