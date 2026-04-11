#!/usr/bin/env bash
# Sincroniza el árbol /opt/opsly desde el VPS primario hacia el host GCP (rsync por SSH).
# Redis / datos fuertemente consistentes: no automatizados aquí — ver docs/GCP-STANDBY-CONFIG.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$REPO_ROOT/config/gcp.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp.env" && set +a
elif [[ -f "$REPO_ROOT/config/gcp-opslyquantum.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp-opslyquantum.env" && set +a
fi

GCP_PROJECT_ID="${GCP_PROJECT_ID:-opslyquantum}"

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

SYNC_SSH_PRIMARY="${SYNC_SSH_PRIMARY:-}"
SYNC_SSH_GCP="${SYNC_SSH_GCP:-}"
REMOTE_PATH="${REMOTE_PATH:-/opt/opsly}"

if [[ -z "$SYNC_SSH_PRIMARY" || -z "$SYNC_SSH_GCP" ]]; then
  echo "Definir SYNC_SSH_PRIMARY y SYNC_SSH_GCP (p. ej. en config/gcp.env)." >&2
  echo "Proyecto GCP (referencia): $GCP_PROJECT_ID" >&2
  exit 1
fi

echo "Sync primario → GCP"
echo "  proyecto: $GCP_PROJECT_ID (referencia)"
echo "  primario: $SYNC_SSH_PRIMARY:$REMOTE_PATH"
echo "  destino:  $SYNC_SSH_GCP:$REMOTE_PATH"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] rsync -avz --delete --exclude=node_modules --exclude=.git --exclude=logs --exclude=.next \\"
  echo "  -e \"ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new\" \\"
  echo "  ${SYNC_SSH_PRIMARY}:${REMOTE_PATH}/ ${SYNC_SSH_GCP}:${REMOTE_PATH}/"
  exit 0
fi

rsync -avz --delete \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  --exclude=.next \
  -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" \
  "${SYNC_SSH_PRIMARY}:${REMOTE_PATH}/" \
  "${SYNC_SSH_GCP}:${REMOTE_PATH}/"

echo "Listo."
