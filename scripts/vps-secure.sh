#!/bin/bash
# VPS Security Hardening: ufw Firewall + NOPASSWD sudo configuration
# Usage: ./scripts/vps-secure.sh --ssh-host 100.120.151.91

set -euo pipefail

SSH_HOST="${1#--ssh-host=}"
if [[ "$SSH_HOST" == "--ssh-host" ]]; then
  SSH_HOST="$2"
fi

if [[ -z "$SSH_HOST" ]]; then
  echo "Usage: $0 --ssh-host <tailscale-ip>"
  echo "Example: $0 --ssh-host 100.120.151.91"
  exit 1
fi

echo "🔐 Configuring UFW Firewall on VPS ($SSH_HOST)..."

ssh "vps-dragon@$SSH_HOST" << 'EOFSCRIPT'
set -euo pipefail

# Enable UFW
echo "📍 Enabling UFW..."
sudo ufw --force enable > /dev/null

# Set default policies
echo "📍 Setting default deny incoming..."
sudo ufw default deny incoming > /dev/null
sudo ufw default allow outgoing > /dev/null

# Allow SSH from Tailscale network (100.64.0.0/10)
echo "📍 Whitelisting SSH from Tailscale (100.64.0.0/10)..."
sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp > /dev/null

# Allow HTTP/HTTPS (public)
echo "📍 Allowing HTTP/HTTPS..."
sudo ufw allow 80/tcp > /dev/null
sudo ufw allow 443/tcp > /dev/null

# Configure NOPASSWD sudo for vps-dragon user
echo "📍 Configuring NOPASSWD sudo for vps-dragon..."
sudo tee /etc/sudoers.d/vps-dragon-nopasswd > /dev/null <<'EOFPASS'
vps-dragon ALL=(ALL) NOPASSWD: ALL
EOFPASS
sudo chmod 0440 /etc/sudoers.d/vps-dragon-nopasswd

# Verify firewall status
echo ""
echo "✅ UFW Firewall Status:"
sudo ufw status

echo ""
echo "✅ NOPASSWD sudo configured for vps-dragon"
EOFSCRIPT

echo ""
echo "✅ VPS Security Hardening Complete!"
echo ""
echo "Firewall Rules Configured:"
echo "  • SSH: Allowed from Tailscale network (100.64.0.0/10)"
echo "  • HTTP/HTTPS: Allowed from anywhere"
echo "  • Default: Deny incoming, Allow outgoing"
echo ""
echo "NOPASSWD sudo: Enabled for Docker Compose operations"
