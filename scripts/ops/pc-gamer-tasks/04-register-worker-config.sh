#!/usr/bin/env bash
# Tarea 4: Registrar PC Gamer como worker en Opsly (config agent-services)
# Args: $1 = PC_GAMER_IP

set -euo pipefail
PC_IP="$1"

echo "[04] Registrando PC Gamer como worker en config..."

# Actualizar config/agent-services.yaml con IP del PC Gamer
CONFIG_FILE="/home/opsly/opsly/apps/orchestrator/config/agent-services.yaml"
TMP_FILE="${CONFIG_FILE}.tmp"

# Backup
cp "$CONFIG_FILE" "${CONFIG_FILE}.bak.$(date +%s)"

# Usar yq o sed para actualizar la IP del pc-gamer
# Estructura esperada: pc-gamer: url: http://IP:PORT
if command -v yq >/dev/null 2>&1; then
    yq eval ".agents.\"pc-gamer\".url = \"http://${PC_IP}:5011\"" -i "$CONFIG_FILE"
    echo "[04] ✅ Config actualizado con yq: pc-gamer -> http://${PC_IP}:5011"
elif sed --version >/dev/null 2>&1; then
    sed -i "s|pc-gamer:.*url:.*|pc-gamer:\n  url: \"http://${PC_IP}:5011\"|" "$CONFIG_FILE"
    echo "[04] ✅ Config actualizado con sed"
else
    echo "⚠️ yq/sed no disponible, actualiza manualmente:"
    echo "  pc-gamer:"
    echo "    url: \"http://${PC_IP}:5011\""
fi

# Commit y push si hay cambios
cd /home/opsly/opsly
if git diff --quiet "$CONFIG_FILE"; then
    echo "[04] Sin cambios en config"
else
    git add "$CONFIG_FILE"
    git commit -m "ops: update pc-gamer worker IP to ${PC_IP}"
    git push origin main
    echo "[04] ✅ Config commitido y pusheado"
fi