#!/usr/bin/env bash
# PC Gamer Watchdog - Detecta cuando PC Gamer se conecta a Tailscale y ejecuta tareas
# Ejecutar en VPS (siempre online) como systemd service o cron cada 1-5 min

set -euo pipefail

PC_GAMER_HOSTNAME="pc-gamer-openclaw-01-wsl"
PC_GAMER_IP="100.71.164.56"
LOG_FILE="/home/opsly/opsly/runtime/logs/pc-gamer-watchdog.log"
STATE_FILE="/home/opsly/opsly/runtime/state/pc-gamer-watchdog.state"
TASKS_DIR="/home/opsly/opsly/scripts/ops/pc-gamer-tasks"

mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$STATE_FILE")" "$TASKS_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Leer estado anterior
WAS_ONLINE=false
if [[ -f "$STATE_FILE" ]]; then
    WAS_ONLINE=$(cat "$STATE_FILE" 2>/dev/null || echo "false")
fi

# Verificar estado actual
CURRENT_ONLINE=false
if tailscale status --json 2>/dev/null | jq -e ".Peer[] | select(.HostName==\"$PC_GAMER_HOSTNAME\") | .Online" >/dev/null 2>&1; then
    CURRENT_ONLINE=true
fi

log "Watchdog check: $PC_GAMER_HOSTNAME online=$CURRENT_ONLINE (prev=$WAS_ONLINE)"

# Transición OFFLINE -> ONLINE: EJECUTAR TAREAS
if [[ "$WAS_ONLINE" == "false" && "$CURRENT_ONLINE" == "true" ]]; then
    log "🎉 PC Gamer CONECTADO! Ejecutando tareas de onboarding..."
    
    # 1. Esperar a que SSH esté listo (puerto 22)
    log "Esperando SSH en $PC_GAMER_IP:22..."
    for i in {1..30}; do
        if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$PC_GAMER_IP/22" 2>/dev/null; then
            log "✅ SSH listo en $PC_GAMER_IP"
            break
        fi
        sleep 2
    done
    
    # 2. Ejecutar tareas definidas en $TASKS_DIR/*.sh (orden alfabético)
    if [[ -d "$TASKS_DIR" ]]; then
        for task in "$TASKS_DIR"/*.sh; do
            [[ -f "$task" ]] || continue
            log "🔧 Ejecutando tarea: $(basename "$task")"
            if bash "$task" "$PC_GAMER_IP" 2>&1 | tee -a "$LOG_FILE"; then
                log "✅ Tarea completada: $(basename "$task")"
            else
                log "❌ Tarea FALLÓ: $(basename "$task")"
            fi
        done
    else
        log "⚠️ No hay directorio de tareas: $TASKS_DIR"
    fi
    
    # 3. Notificar Discord si webhook configurado
    if [[ -n "${DISCORD_WEBHOOK_OPSLY:-}" ]] || doppler secrets get DISCORD_WEBHOOK_OPSLY --plain --project ops-intcloudsysops --config prd >/dev/null 2>&1; then
        WEBHOOK="${DISCORD_WEBHOOK_OPSLY:-$(doppler secrets get DISCORD_WEBHOOK_OPSLY --plain --project ops-intcloudsysops --config prd 2>/dev/null)}"
        if [[ -n "$WEBHOOK" ]]; then
            curl -sf -X POST "$WEBHOOK" -H "Content-Type: application/json" \
                -d "{\"content\":\"🟢 **PC Gamer ONLINE**\n🖥️ Host: $PC_GAMER_HOSTNAME\n🌐 IP: $PC_GAMER_IP\n⏰ $(date '+%Y-%m-%d %H:%M:%S')\n✅ Tareas de onboarding ejecutadas\"}" 2>/dev/null || log "Discord notify failed"
        fi
    fi
    
    log "=== Onboarding PC Gamer COMPLETADO ==="
fi

# Transición ONLINE -> OFFLINE: Log only
if [[ "$WAS_ONLINE" == "true" && "$CURRENT_ONLINE" == "false" ]]; then
    log "🔴 PC Gamer DESCONECTADO"
    
    if [[ -n "${DISCORD_WEBHOOK_OPSLY:-}" ]] || doppler secrets get DISCORD_WEBHOOK_OPSLY --plain --project ops-intcloudsysops --config prd >/dev/null 2>&1; then
        WEBHOOK="${DISCORD_WEBHOOK_OPSLY:-$(doppler secrets get DISCORD_WEBHOOK_OPSLY --plain --project ops-intcloudsysops --config prd 2>/dev/null)}"
        if [[ -n "$WEBHOOK" ]]; then
            curl -sf -X POST "$WEBHOOK" -H "Content-Type: application/json" \
                -d "{\"content\":\"🔴 **PC Gamer OFFLINE**\n🖥️ Host: $PC_GAMER_HOSTNAME\n⏰ $(date '+%Y-%m-%d %H:%M:%S')\"}" 2>/dev/null || true
        fi
    fi
fi

# Actualizar estado
echo "$CURRENT_ONLINE" > "$STATE_FILE"

log "Watchdog check completado"