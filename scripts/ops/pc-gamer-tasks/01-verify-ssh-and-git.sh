#!/usr/bin/env bash
# Tarea 1: Verificar SSH y hacer git pull en PC Gamer
# Args: $1 = PC_GAMER_IP

set -euo pipefail
PC_IP="$1"

echo "[01] Verificando SSH y repo en $PC_IP..."

# Verificar SSH con key (asumiendo key autorizada)
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "opsly@$PC_IP" \
    "echo 'SSH OK' && cd /home/opsly/opsly && git pull origin main 2>&1 | tail -5"

echo "[01] ✅ SSH y git pull OK"