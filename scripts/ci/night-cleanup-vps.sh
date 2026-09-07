#!/usr/bin/env bash
# Limpieza ligera en el VPS: nunca sudo, nunca volume prune, nunca --volumes.
# Revisión anterior → prune imágenes unused >7d + build cache + contenedores parados → revisión posterior.
# Uso (en el host Docker): ./scripts/ci/night-cleanup-vps.sh [--dry-run] [--phase all|pre|cleanup|post]
set -euo pipefail

DRY_RUN=0
PHASE="all"
CRITICAL_CONTAINERS="${CRITICAL_CONTAINERS:-peskids}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --phase) PHASE="${2:?}"; shift 2 ;;
    -h | --help)
      grep '^#' "$0" | head -8
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
done

log() { printf '[night-cleanup-vps] %s\n' "$*"; }

run_docker() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "DRY-RUN: docker $*"
    return 0
  fi
  docker "$@"
}

snapshot() {
  local label="$1"
  log "=== ${label} ==="
  df -h / | tail -1 || true
  if command -v docker >/dev/null 2>&1; then
    docker system df || true
    docker ps --format '{{.Names}} {{.Status}}' || true
  else
    log "docker no está en PATH"
  fi
}

container_names() {
  docker ps --format '{{.Names}}' 2>/dev/null | sort || true
}

assert_critical_still_up() {
  local names missing=""
  names="$(container_names)"
  local c
  for c in ${CRITICAL_CONTAINERS}; do
    if ! grep -qx "${c}" <<<"${names}"; then
      missing="${missing} ${c}"
    fi
  done
  if [[ -n "${missing}" ]]; then
    log "ERROR: contenedores críticos ausentes:${missing}"
    return 1
  fi
  return 0
}

light_cleanup() {
  log "light prune (unused images >168h, stopped containers, builder cache)"
  run_docker image prune -a --filter "until=168h" -f
  run_docker builder prune -af || true
  run_docker container prune -f
}

case "${PHASE}" in
  pre)
    snapshot PRE
    ;;
  cleanup)
    light_cleanup
    ;;
  post)
    snapshot POST
    assert_critical_still_up
    ;;
  all)
    snapshot PRE
    light_cleanup
    snapshot POST
    assert_critical_still_up
    ;;
  *)
    echo "--phase debe ser all|pre|cleanup|post" >&2
    exit 1
    ;;
esac

log "ok phase=${PHASE} dry_run=${DRY_RUN}"
