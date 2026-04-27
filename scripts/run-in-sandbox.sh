#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/run-in-sandbox.sh --cmd "<command>" [--image alpine:latest] [--allow-network] [--dry-run]

Description:
  Ejecuta un comando en un contenedor efimero aislado.
  - Por defecto corre SIN red (network none).
  - El filesystem es temporal y se elimina al terminar.
EOF
}

IMAGE="alpine:latest"
CMD=""
ALLOW_NETWORK=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cmd)
      CMD="${2:-}"
      shift 2
      ;;
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --allow-network)
      ALLOW_NETWORK=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$CMD" ]]; then
  echo "--cmd is required" >&2
  usage
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in PATH" >&2
  exit 1
fi

NETWORK_FLAG="--network none"
if [[ $ALLOW_NETWORK -eq 1 ]]; then
  NETWORK_FLAG="--network bridge"
fi

RUN_CMD=(docker run --rm $NETWORK_FLAG "$IMAGE" sh -lc "$CMD")

if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] ${RUN_CMD[*]}"
  exit 0
fi

echo "Running in sandbox image=$IMAGE network=$([[ $ALLOW_NETWORK -eq 1 ]] && echo bridge || echo none)"
"${RUN_CMD[@]}"
