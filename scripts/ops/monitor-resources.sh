#!/usr/bin/env bash
# Monitoreo básico VPS Opsly
# Uso: ./scripts/vps-monitor.sh [--loop]
set -euo pipefail

VPS_HOST="vps-dragon@100.120.151.91"
SSH_OPTS=(-o ConnectTimeout=15 -o BatchMode=yes)

get_metrics() {
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="

  # CPU y Load
  echo -e "\n📊 CPU & LOAD"
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "uptime"

  # Memoria
  echo -e "\n💾 MEMORIA"
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "free -h | head -2"

  # Disco
  echo -e "\n💿 DISCO"
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "df -h / | tail -1"

  # Top procesos
  echo -e "\n🔥 TOP 5 CPU"
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "ps aux --sort=-%cpu | head -6"

  # Docker
  echo -e "\n🐳 DOCKER CONTAINERS"
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "docker ps --format '{{.Names}}\t{{.Status}}' | head -10"

  # Conexiones
  echo -e "\n🌐 CONEXIONES"
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "ss -s"
}

if [ "${1:-}" = "--loop" ]; then
  while true; do
    get_metrics
    echo -e "\n⏳ Esperando 30s..."
    sleep 30
  done
else
  get_metrics
fi
