#!/usr/bin/env bash
# Auto-sync with opsly GitHub when network becomes available
# Triggered by Windows Task Scheduler on network connect event

set -euo pipefail

REPO_ROOT="/home/opsly/opsly"
LOG_FILE="/home/opsly/opsly/runtime/logs/auto-sync.log"
LOCK_FILE="/tmp/opsly-auto-sync.lock"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Prevent concurrent runs
exec 200>"$LOCK_FILE"
flock -n 200 || { log "Otra sincronización en curso, saliendo"; exit 0; }

log "=== Iniciando auto-sync opsly ==="

# Wait for network (Tailscale + internet)
for i in {1..30}; do
  if tailscale status --json 2>/dev/null | jq -e '.BackendState == "Running"' >/dev/null; then
    log "Tailscale conectado"
    break
  fi
  sleep 2
done

# Verify internet/GitHub reachable
for i in {1..10}; do
  if curl -sf --max-time 5 "https://github.com" >/dev/null; then
    log "GitHub alcanzable"
    break
  fi
  sleep 3
done

cd "$REPO_ROOT"

# Fetch latest
log "Fetching origin..."
if git fetch origin 2>&1 | tee -a "$LOG_FILE"; then
  log "Fetch OK"
else
  log "Fetch falló"
fi

# Check if behind
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
if [[ "$BEHIND" -gt 0 ]]; then
  log "Repo $BEHIND commits detrás de origin/main, haciendo pull..."
  if git pull --ff-only origin main 2>&1 | tee -a "$LOG_FILE"; then
    log "Pull OK, repo actualizado"
    # Trigger any post-pull hooks (docker compose reload, etc.)
    if [[ -f "scripts/vps-deploy.sh" ]]; then
      log "Ejecutando vps-deploy.sh..."
      ./scripts/vps-deploy.sh 2>&1 | tee -a "$LOG_FILE" || log "vps-deploy.sh falló (puede ser esperado si no en VPS)"
    fi
  else
    log "Pull falló (conflictos?), requiere intervención manual"
  fi
else
  log "Repo ya actualizado (HEAD = origin/main)"
fi

# Also sync any submodules if present
if [[ -f .gitmodules ]]; then
  git submodule update --init --recursive 2>&1 | tee -a "$LOG_FILE"
fi

log "=== Auto-sync completado ==="