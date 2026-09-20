#!/usr/bin/env bash
# Tarea 3: Verificar GPU, Docker y recursos en PC Gamer
# Args: $1 = PC_GAMER_IP

set -euo pipefail
PC_IP="$1"

echo "[03] Verificando GPU/Docker en $PC_IP..."

ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "opsly@$PC_IP" << 'ENDSSH'
echo "=== GPU ==="
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null || echo "nvidia-smi no disponible"

echo "=== Docker ==="
docker version --format '{{.Server.Version}}' 2>/dev/null || echo "Docker no disponible"
docker ps --format '{{.Names}}' 2>/dev/null | head -5 || echo "No containers"

echo "=== Recursos ==="
free -h
df -h / | tail-1
ENDSSH

echo "[03] ✅ Verificación GPU/Docker completada"