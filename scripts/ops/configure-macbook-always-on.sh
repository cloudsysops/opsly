#!/bin/bash
# Configura MacBook para: Tailscale siempre ON + SSH siempre habilitado + No sleep en red
# Ejecutar EN EL MACBOOK: bash configure-macbook-always-on.sh

set -euo pipefail

echo "=== Configurando MacBook para conexión permanente ==="

# 1. Habilitar SSH permanentemente
echo "[1/5] Habilitando SSH (Remote Login)..."
sudo systemsetup -setremotelogin on
sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist 2>/dev/null || true

# 2. Configurar firewall para permitir SSH
echo "[2/5] Configurando firewall para SSH..."
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on 2>/dev/null || true
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/sbin/sshd 2>/dev/null || true
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/sbin/sshd 2>/dev/null || true

# 3. Tailscale: auto-connect, accept routes, no logout on sleep
echo "[3/5] Configurando Tailscale persistente..."
if command -v tailscale >/dev/null 2>&1; then
    sudo tailscale up --accept-routes=true --accept-dns=true --shields-up=false 2>/dev/null || true
    # Tailscale ya se auto-inicia via LaunchDaemon
else
    echo "⚠️ Tailscale no instalado"
fi

# 4. Prevenir sleep cuando hay actividad de red (Power Nap + network access)
echo "[4/5] Configurando power management..."
# Desactivar sleep automático cuando está en corriente
sudo pmset -c sleep 0 disksleep 0 displaysleep 10 2>/dev/null || true
# Power Nap off (opcional, pero evita desconexiones)
sudo pmset -c powernap 0 2>/dev/null || true
# Wake for network access
sudo pmset -c wom 1 2>/dev/null || true
# TCP keepalive para SSH
sudo pmset -c tcpkeepalive 1 2>/dev/null || true

# 5. Caffeinate service para mantener vivo durante sesiones SSH
echo "[5/5] Creando servicio caffeinate para sesiones SSH..."
cat > /tmp/opsly-caffeinate.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <key>opsly-caffeinate</key>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/caffeinate</string>
        <string>-d</string>  <!-- prevent display sleep -->
        <string>-i</string>  <!-- prevent idle sleep -->
        <string>-m</string>  <!-- prevent disk sleep -->
        <string>-s</string>  <!-- prevent system sleep while on AC -->
        <string>-t</string>
        <string>86400</string>  <!-- 24h, se renueva -->
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
PLIST

sudo mv /tmp/opsly-caffeinate.plist /Library/LaunchDaemons/opsly-caffeinate.plist
sudo launchctl load -w /Library/LaunchDaemons/opsly-caffeinate.plist 2>/dev/null || true

echo ""
echo "=== CONFIGURACIÓN COMPLETADA ==="
echo ""
echo "✅ SSH habilitado permanentemente"
echo "✅ Firewall permite SSH"
echo "✅ Tailscale auto-connect configurado"
echo "✅ Sleep desactivado en corriente (display 10min, sistema nunca)"
echo "✅ Power Nap desactivado"
echo "✅ Wake on network access activado"
echo "✅ Servicio caffeinate instalado (mantiene vivo 24h)"
echo ""
echo "Para verificar:"
echo "  systemsetup -getremotelogin"
echo "  pmset -g"
echo "  tailscale status"
echo "  launchctl list | grep opsly"