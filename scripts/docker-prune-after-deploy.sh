#!/usr/bin/env bash
# Remove unused Docker images after deploy (running containers keep their images).
# Safe to run from CI SSH, cron, or manually on the VPS.
set -euo pipefail

DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      echo "Usage: $0 [--dry-run]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not in PATH" >&2
  exit 1
fi

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] docker $*"
    return 0
  fi
  docker "$@"
}

echo "docker-prune-after-deploy: removing unused images..."
run image prune -af
run builder prune -af 2>/dev/null || true
run container prune -f
echo "docker-prune-after-deploy: done"
run system df
