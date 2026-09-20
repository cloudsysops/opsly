#!/usr/bin/env bash
# Tarea 2: Ejecutar script de configuración automática en PC Gamer
# Args: $1 = PC_GAMER_IP

set -euo pipefail
PC_IP="$1"

echo "[02] Ejecutando auto-config en $PC_IP..."

# Copiar script de config si no existe
scp -o StrictHostKeyChecking=accept-new \
    /home/opsly/opsly/scripts/ops/configure-pc-gamer-auto-join.ps1 \
    "opsly@$PC_IP:/home/opsly/configure-pc-gamer-auto-join.ps1" 2>/dev/null || true

# Ejecutar config (requiere admin en Windows, esto es solo si ya está preparado)
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "opsly@$PC_IP" \
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File /home/opsly/configure-pc-gamer-auto-join.ps1 2>&1 | tail -20" || true

echo "[02] ✅ Config intentada"