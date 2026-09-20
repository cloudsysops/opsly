#!/usr/bin/env bash
# Instala el watchdog de PC Gamer en el VPS
# Ejecutar en VPS: bash install-pc-gamer-watchdog.sh

set -euo pipefail

echo "=== Instalando PC Gamer Watchdog en VPS ==="

# 1. Copiar scripts
echo "[1/5] Copiando scripts..."
sudo cp /home/opsly/opsly/scripts/ops/pc-gamer-watchdog.sh /usr/local/bin/pc-gamer-watchdog.sh
sudo chmod +x /usr/local/bin/pc-gamer-watchdog.sh

sudo mkdir -p /usr/local/lib/opsly/pc-gamer-tasks
sudo cp /home/opsly/opsly/scripts/ops/pc-gamer-tasks/*.sh /usr/local/lib/opsly/pc-gamer-tasks/
sudo chmod +x /usr/local/lib/opsly/pc-gamer-tasks/*.sh

# 2. Instalar systemd service + timer
echo "[2/5] Instalando systemd service + timer..."
sudo cp /home/opsly/opsly/scripts/ops/pc-gamer-watchdog.service /etc/systemd/system/
sudo cp /home/opsly/opsly/scripts/ops/pc-gamer-watchdog.timer /etc/systemd/system/

# 3. Crear directorios de logs/state
echo "[3/5] Creando directorios..."
sudo mkdir -p /var/log/opsly /var/lib/opsly
sudo chown opsly:opsly /var/log/opsly /var/lib/opsly

# 4. Recargar systemd y habilitar
echo "[4/5] Recargando systemd..."
sudo systemctl daemon-reload
sudo systemctl enable pc-gamer-watchdog.timer
sudo systemctl start pc-gamer-watchdog.timer

# 5. Verificar
echo "[5/5] Verificando instalación..."
systemctl status pc-gamer-watchdog.timer --no-pager
echo ""
echo "=== INSTALACIÓN COMPLETA ==="
echo ""
echo "Comandos útiles:"
echo "  systemctl status pc-gamer-watchdog.timer"
echo "  journalctl -u pc-gamer-watchdog -f"
echo "  cat /var/log/opsly/pc-gamer-watchdog.log"
echo "  systemctl stop pc-gamer-watchdog.timer  # para desactivar"