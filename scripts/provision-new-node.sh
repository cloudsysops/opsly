#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_PATH="${ROOT_DIR}/infra/nodes-registry.json"
MANAGER_SCRIPT="${ROOT_DIR}/scripts/manage-cluster-nodes.sh"

NODE_NAME=""
NODE_HOST=""
NODE_USER=""
NODE_ROLE="worker"
DRY_RUN="false"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/provision-new-node.sh --name <node> --host <ip|dns> --user <ssh-user> [--role worker|control|full] [--dry-run]

Ejemplo:
  ./scripts/provision-new-node.sh --name opsly-worker-02 --host 100.70.20.10 --user opslyquantum --role worker --dry-run
EOF
}

check_dependencies() {
  local missing=0
  for cmd in ssh python3; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "Falta dependencia: $cmd" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NODE_NAME="${2:-}"; shift 2 ;;
    --host) NODE_HOST="${2:-}"; shift 2 ;;
    --user) NODE_USER="${2:-}"; shift 2 ;;
    --role) NODE_ROLE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "Argumento no soportado: $1" >&2
      usage
      exit 1
      ;;
  esac
done

validate_inputs() {
  if [[ -z "$NODE_NAME" || -z "$NODE_HOST" || -z "$NODE_USER" ]]; then
    echo "Faltan parámetros obligatorios (--name, --host, --user)." >&2
    usage
    exit 1
  fi

  case "$NODE_ROLE" in
    worker|control|full) ;;
    *)
      echo "Rol inválido: $NODE_ROLE. Usa worker|control|full." >&2
      exit 1
      ;;
  esac
}

run_remote() {
  local target="$1"
  local command="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run][$target] $command"
    return 0
  fi
  ssh -o BatchMode=yes -o ConnectTimeout=12 "$target" "$command"
}

bootstrap_remote_node() {
  local target="${NODE_USER}@${NODE_HOST}"
  echo "==> Conectando a ${target}"
  run_remote "$target" "echo OK && hostname"

  echo "==> Detectando OS en ${target}"
  run_remote "$target" "bash -s" <<'EOF'
set -euo pipefail
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  echo "OS=${NAME:-unknown} VERSION=${VERSION_ID:-unknown}"
else
  echo "OS=$(uname -s)"
fi
EOF

  echo "==> Validando herramientas base en ${target}"
  run_remote "$target" "command -v git >/dev/null && command -v bash >/dev/null && echo tools-ok"
}

register_node() {
  echo "==> Registrando nodo en ${REGISTRY_PATH}"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ${MANAGER_SCRIPT} add --name ${NODE_NAME} --host ${NODE_HOST} --user ${NODE_USER} --role ${NODE_ROLE}"
    return 0
  fi
  "${MANAGER_SCRIPT}" add --name "${NODE_NAME}" --host "${NODE_HOST}" --user "${NODE_USER}" --role "${NODE_ROLE}"
}

check_dependencies
validate_inputs
bootstrap_remote_node
register_node

echo "Provisioning completado para ${NODE_NAME} (${NODE_ROLE})"
