#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_PATH="${ROOT_DIR}/infra/nodes-registry.json"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/manage-cluster-nodes.sh list
  ./scripts/manage-cluster-nodes.sh add --name <node> --host <ip|dns> --user <ssh-user> [--role worker|control|full]
  ./scripts/manage-cluster-nodes.sh remove --name <node>
  ./scripts/manage-cluster-nodes.sh get --name <node>
EOF
}

ensure_registry() {
  if [[ -f "${REGISTRY_PATH}" ]]; then
    return
  fi
  mkdir -p "$(dirname "${REGISTRY_PATH}")"
  cat > "${REGISTRY_PATH}" <<'EOF'
{
  "version": 1,
  "updated_at": "",
  "nodes": []
}
EOF
}

check_dependencies() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Falta dependencia: python3" >&2
    exit 1
  fi
}

list_nodes() {
  python3 - "$REGISTRY_PATH" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
nodes = data.get("nodes", [])
if not nodes:
    print("No hay nodos registrados.")
    raise SystemExit(0)
print(f"{'NAME':<24} {'ROLE':<10} {'HOST':<20} {'USER':<16} {'STATUS'}")
for n in nodes:
    print(f"{n.get('name',''):<24} {n.get('role',''):<10} {n.get('host',''):<20} {n.get('user',''):<16} {n.get('status','')}")
PY
}

add_node() {
  local name="$1" host="$2" user="$3" role="$4"
  python3 - "$REGISTRY_PATH" "$name" "$host" "$user" "$role" <<'PY'
import json, sys
from datetime import datetime, timezone

path, name, host, user, role = sys.argv[1:6]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
nodes = data.setdefault("nodes", [])
if any(n.get("name") == name for n in nodes):
    raise SystemExit(f"Nodo ya existe: {name}")
node = {
    "name": name,
    "host": host,
    "user": user,
    "role": role,
    "status": "active",
    "created_at": datetime.now(timezone.utc).isoformat(),
}
nodes.append(node)
data["updated_at"] = datetime.now(timezone.utc).isoformat()
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"Nodo agregado: {name}")
PY
}

remove_node() {
  local name="$1"
  python3 - "$REGISTRY_PATH" "$name" <<'PY'
import json, sys
from datetime import datetime, timezone

path, name = sys.argv[1:3]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
nodes = data.get("nodes", [])
new_nodes = [n for n in nodes if n.get("name") != name]
if len(new_nodes) == len(nodes):
    raise SystemExit(f"Nodo no encontrado: {name}")
data["nodes"] = new_nodes
data["updated_at"] = datetime.now(timezone.utc).isoformat()
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"Nodo removido: {name}")
PY
}

get_node() {
  local name="$1"
  python3 - "$REGISTRY_PATH" "$name" <<'PY'
import json, sys

path, name = sys.argv[1:3]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
for node in data.get("nodes", []):
    if node.get("name") == name:
        print(json.dumps(node, indent=2))
        raise SystemExit(0)
raise SystemExit(f"Nodo no encontrado: {name}")
PY
}

parse_arg() {
  local key="$1"; shift
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "$key" ]]; then
      echo "${2:-}"
      return 0
    fi
    shift
  done
  echo ""
}

check_dependencies
ensure_registry

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

ACTION="$1"
shift || true

case "$ACTION" in
  list)
    list_nodes
    ;;
  add)
    NAME="$(parse_arg --name "$@")"
    HOST="$(parse_arg --host "$@")"
    USER_NAME="$(parse_arg --user "$@")"
    ROLE="$(parse_arg --role "$@")"
    ROLE="${ROLE:-worker}"
    if [[ -z "$NAME" || -z "$HOST" || -z "$USER_NAME" ]]; then
      echo "Faltan argumentos obligatorios en add." >&2
      usage
      exit 1
    fi
    case "$ROLE" in
      worker|control|full) ;;
      *)
        echo "Rol inválido: $ROLE" >&2
        exit 1
        ;;
    esac
    add_node "$NAME" "$HOST" "$USER_NAME" "$ROLE"
    ;;
  remove)
    NAME="$(parse_arg --name "$@")"
    if [[ -z "$NAME" ]]; then
      echo "Falta --name en remove." >&2
      exit 1
    fi
    remove_node "$NAME"
    ;;
  get)
    NAME="$(parse_arg --name "$@")"
    if [[ -z "$NAME" ]]; then
      echo "Falta --name en get." >&2
      exit 1
    fi
    get_node "$NAME"
    ;;
  *)
    echo "Acción no soportada: $ACTION" >&2
    usage
    exit 1
    ;;
esac
