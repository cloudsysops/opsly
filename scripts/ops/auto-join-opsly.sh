#!/usr/bin/env bash
# Auto-join opsly system: Tailscale connect + GitHub sync + health verification
# Runs on network connect, startup, logon, and periodic via Windows Task Scheduler
# Called from Windows: wsl.exe -- bash -c '/home/opsly/opsly/scripts/ops/auto-join-opsly.sh'

set -euo pipefail

REPO_ROOT="/home/opsly/opsly"
LOG_FILE="/home/opsly/opsly/runtime/logs/auto-join.log"
LOCK_FILE="/tmp/opsly-auto-join.lock"
STATE_FILE="/home/opsly/opsly/runtime/state/auto-join-state.json"

mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$STATE_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

update_state() {
  local key="$1" value="$2"
  local tmp="${STATE_FILE}.tmp"
  if [[ -f "$STATE_FILE" ]]; then
    jq --arg k "$key" --arg v "$value" '.[$k] = $v' "$STATE_FILE" > "$tmp"
  else
    jq -n --arg k "$key" --arg v "$value" '{($k): $v}' > "$tmp"
  fi
  mv "$tmp" "$STATE_FILE"
}

# Prevent concurrent runs (but allow quick state checks)
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "Otra ejecución en curso, saliendo"
  exit 0
fi

log "=== Auto-join opsly iniciado ==="

# 1. Ensure Tailscale is running and connected
log "[1/6] Verificando Tailscale..."
TAILSCALE_UP=0
for i in {1..30}; do
  if tailscale status --json 2>/dev/null | jq -e '.BackendState == "Running"' >/dev/null; then
    TAILSCALE_UP=1
    TAILSCALE_IP=$(tailscale status --json | jq -r '.Self.TailscaleIPs[0]')
    log "Tailscale conectado: $TAILSCALE_IP"
    update_state "tailscale_ip" "$TAILSCALE_IP"
    update_state "tailscale_status" "connected"
    break
  fi
  log "Esperando Tailscale... ($i/30)"
  sleep 2
done

if [[ $TAILSCALE_UP -eq 0 ]]; then
  log "Tailscale no conectado tras 60s, intentando tailscale up..."
  tailscale up --accept-routes --accept-dns 2>&1 | tee -a "$LOG_FILE" || true
  sleep 10
  if tailscale status --json 2>/dev/null | jq -e '.BackendState == "Running"' >/dev/null; then
    TAILSCALE_UP=1
    TAILSCALE_IP=$(tailscale status --json | jq -r '.Self.TailscaleIPs[0]')
    log "Tailscale conectado tras up: $TAILSCALE_IP"
    update_state "tailscale_ip" "$TAILSCALE_IP"
    update_state "tailscale_status" "connected"
  else
    log "ERROR: Tailscale no logró conectar"
    update_state "tailscale_status" "failed"
    # No exit - continue to try other steps
  fi
fi

# 2. Verify internet + GitHub reachable
log "[2/6] Verificando conectividad a GitHub..."
GITHUB_OK=0
for i in {1..10}; do
  if curl -sf --max-time 10 "https://api.github.com" >/dev/null; then
    GITHUB_OK=1
    log "GitHub alcanzable"
    update_state "github_reachable" "true"
    break
  fi
  log "Esperando GitHub... ($i/10)"
  sleep 3
done
[[ $GITHUB_OK -eq 0 ]] && update_state "github_reachable" "false"

# 3. Sync GitHub repo
log "[3/6] Sincronizando repo opsly con GitHub..."
cd "$REPO_ROOT"
if git fetch origin 2>&1 | tee -a "$LOG_FILE"; then
  log "Fetch OK"
  BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
  if [[ "$BEHIND" -gt 0 ]]; then
    log "Repo $BEHIND commits detrás, haciendo pull..."
    if git pull --ff-only origin main 2>&1 | tee -a "$LOG_FILE"; then
      log "Pull OK, repo actualizado a $(git rev-parse --short HEAD)"
      update_state "git_sha" "$(git rev-parse --short HEAD)"
      update_state "git_synced_at" "$(date -Iseconds)"
      # Run post-pull hooks
      if [[ -f "scripts/vps-deploy.sh" ]]; then
        log "Ejecutando vps-deploy.sh..."
        ./scripts/vps-deploy.sh 2>&1 | tee -a "$LOG_FILE" || log "vps-deploy.sh falló (esperado si no en VPS)"
      fi
    else
      log "Pull falló (conflictos?), requiere intervención manual"
      update_state "git_sync_status" "failed"
    fi
  else
    log "Repo ya actualizado (HEAD = origin/main)"
    update_state "git_sync_status" "up_to_date"
  fi
else
  log "Fetch falló"
  update_state "git_sync_status" "fetch_failed"
fi

# 4. Verify core services (if running on VPS)
log "[4/6] Verificando servicios core..."
if [[ -f "/opt/opsly/.env" ]] || [[ "$(hostname)" == *"vps"* ]] || [[ -S /var/run/docker.sock ]]; then
  # Likely on VPS or has Docker
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    log "Docker disponible, verificando contenedores..."
    docker ps --format '{{.Names}}: {{.Status}}' 2>/dev/null | head -10 | while read line; do
      log "  $line"
    done
    update_state "docker_status" "running"
  else
    log "Docker no disponible o sin permisos"
    update_state "docker_status" "unavailable"
  fi
else
  log "No en VPS (entorno local), saltando verificación Docker"
  update_state "docker_status" "not_vps"
fi

# 5. Sync knowledge index (Obsidian brain)
log "[5/6] Sincronizando knowledge index (Obsidian)..."
if [[ -f "package.json" ]] && npm run obsidian:sync --if-present 2>&1 | tee -a "$LOG_FILE"; then
  log "Knowledge index sincronizado"
  update_state "knowledge_index_synced_at" "$(date -Iseconds)"
else
  log "Knowledge index sync omitido (script no disponible)"
fi

# 6. Notify Discord if webhook configured
log "[6/6] Notificando estado (si configurado)..."
if [[ -n "${DISCORD_WEBHOOK_OPSLY:-}" ]] || doppler secrets get DISCORD_WEBHOOK_OPSLY --plain --project ops-intcloudsysops --config prd >/dev/null 2>&1; then
  WEBHOOK="${DISCORD_WEBHOOK_OPSLY:-$(doppler secrets get DISCORD_WEBHOOK_OPSLY --plain --project ops-intcloudsysops --config prd 2>/dev/null)}"
  if [[ -n "$WEBHOOK" ]]; then
    HOSTNAME=$(hostname)
    TAIL_IP=$(tailscale status --json 2>/dev/null | jq -r '.Self.TailscaleIPs[0]' 2>/dev/null || echo "N/A")
    GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
    curl -sf -X POST "$WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"content\":\"✅ **Auto-join opsly completado**\n🖥️ Host: \`$HOSTNAME\`\n🌐 Tailscale: \`$TAIL_IP\`\n📦 Git: \`$GIT_SHA\`\n⏰ $(date '+%Y-%m-%d %H:%M:%S')\"}" 2>/dev/null || log "Discord webhook falló"
    log "Notificación Discord enviada"
  fi
fi

log "=== Auto-join opsly completado ==="
update_state "last_run" "$(date -Iseconds)"
update_state "status" "completed"