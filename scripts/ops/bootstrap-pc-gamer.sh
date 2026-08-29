#!/usr/bin/env bash
# bootstrap-pc-gamer.sh — Run ONCE on pc-gamer (WSL Ubuntu) to set up the Opsly worker.
# This script is self-contained: no SSH required from Mac.
#
# Usage (on pc-gamer):
#   1. Clone repo:  git clone https://github.com/cloudsysops/opsly.git /home/devops/opsly
#   2. Run:         cd /home/devops/opsly && sudo bash scripts/ops/bootstrap-pc-gamer.sh
#
# What it does:
#   - Creates devops user if missing
#   - Adds SSH key from Mac (opsly-quantum)
#   - Installs Docker + Docker Compose
#   - Copies .env.worker
#   - Sets up systemd services (heartbeat, docker plane, opencode)
#   - Validates connectivity (Redis, Ollama, Tailscale)
set -euo pipefail

DEVOPS_USER="${DEVOPS_USER:-devops}"
DEVOPS_HOME="/home/${DEVOPS_USER}"
OPSLY_ROOT="${OPSLY_ROOT:-${DEVOPS_HOME}/opsly}"
MAC_SSH_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKoGBiPDry5w/CzQLv30Q76g5REeWcEp1e9uIKghktzK dragon@astral-arena"
REDIS_IP="100.120.151.91"
OLLAMA_PORT="11434"

echo "=== Opsly pc-gamer bootstrap ==="
echo "User: ${DEVOPS_USER}"
echo "Root: ${OPSLY_ROOT}"
echo ""

# ── 1. Create devops user if missing ──
if ! id "${DEVOPS_USER}" &>/dev/null; then
  echo "[1] Creating user ${DEVOPS_USER}..."
  useradd -m -s /bin/bash "${DEVOPS_USER}"
  usermod -aG docker "${DEVOPS_USER}" 2>/dev/null || true
  echo "  ✓ User created"
else
  echo "[1] User ${DEVOPS_USER} exists"
fi

# ── 2. SSH key ──
echo "[2] Configuring SSH..."
mkdir -p "${DEVOPS_HOME}/.ssh"
chmod 700 "${DEVOPS_HOME}/.ssh"
if ! grep -qF "${MAC_SSH_KEY}" "${DEVOPS_HOME}/.ssh/authorized_keys" 2>/dev/null; then
  echo "${MAC_SSH_KEY}" >> "${DEVOPS_HOME}/.ssh/authorized_keys"
  chmod 600 "${DEVOPS_HOME}/.ssh/authorized_keys"
  echo "  ✓ Mac SSH key added"
else
  echo "  ✓ SSH key already present"
fi
chown -R "${DEVOPS_USER}:${DEVOPS_USER}" "${DEVOPS_HOME}/.ssh"

# ── 3. Docker ──
echo "[3] Installing Docker..."
if ! command -v docker &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq docker.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  usermod -aG docker "${DEVOPS_USER}"
  echo "  ✓ Docker installed"
else
  echo "  ✓ Docker already installed ($(docker --version))"
fi

# ── 4. Clone repo if missing ──
echo "[4] Checking repo..."
if [ ! -d "${OPSLY_ROOT}/.git" ]; then
  echo "  Cloning to ${OPSLY_ROOT}..."
  sudo -u "${DEVOPS_USER}" git clone --depth 1 https://github.com/cloudsysops/opsly.git "${OPSLY_ROOT}"
  echo "  ✓ Repo cloned"
else
  echo "  ✓ Repo exists at ${OPSLY_ROOT}"
  sudo -u "${DEVOPS_USER}" git -C "${OPSLY_ROOT}" pull --ff-only 2>/dev/null || true
fi

# ── 5. .env.worker ──
echo "[5] Configuring .env.worker..."
if [ -f "${OPSLY_ROOT}/.env.worker" ]; then
  # Verify REDIS_URL has real password, not CHANGE_ME
  if grep -q "CHANGE_ME" "${OPSLY_ROOT}/.env.worker"; then
    echo "  ⚠ .env.worker has CHANGE_ME — regenerating from template..."
    cp "${OPSLY_ROOT}/infra/pc-gamer.env.example" "${OPSLY_ROOT}/.env.worker"
  fi
  echo "  ✓ .env.worker present"
else
  cp "${OPSLY_ROOT}/infra/pc-gamer.env.example" "${OPSLY_ROOT}/.env.worker"
  echo "  ✓ .env.worker created from template (edit REDIS_URL password!)"
fi
chown "${DEVOPS_USER}:${DEVOPS_USER}" "${OPSLY_ROOT}/.env.worker"
chmod 600 "${OPSLY_ROOT}/.env.worker"

# ── 6. Ollama ──
echo "[6] Checking Ollama..."
if ! command -v ollama &>/dev/null; then
  echo "  ⚠ Ollama not installed. Install manually: https://ollama.com/download"
  echo "  Then: ollama pull llama3.2"
else
  echo "  ✓ Ollama installed ($(ollama --version 2>&1 || echo 'unknown version'))"
  # Ensure Ollama service is running
  if ! curl -sf "http://127.0.0.1:${OLLAMA_PORT}/api/tags" &>/dev/null; then
    echo "  ⚠ Ollama not running. Start with: systemctl start ollama"
  else
    MODEL_COUNT=$(curl -sf "http://127.0.0.1:${OLLAMA_PORT}/api/tags" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('models',[])))" 2>/dev/null || echo "?")
    echo "  ✓ Ollama running (${MODEL_COUNT} models)"
  fi
fi

# ── 7. Validate connectivity ──
echo "[7] Connectivity checks..."
# Redis
if timeout 3 bash -c "echo PING | nc -w2 ${REDIS_IP} 6379" 2>/dev/null | grep -qi pong; then
  echo "  ✓ Redis reachable (${REDIS_IP}:6379)"
else
  echo "  ⚠ Redis NOT reachable — check Tailscale to VPS"
fi

# Tailscale
if command -v tailscale &>/dev/null; then
  TS_STATUS=$(tailscale status --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('BackendState','?'))" 2>/dev/null || echo "?")
  echo "  ✓ Tailscale: ${TS_STATUS}"
else
  echo "  ⚠ Tailscale not installed"
fi

# ── 8. Docker Compose worker stack ──
echo "[8] Worker Docker stack..."
WORKER_COMPOSE="${OPSLY_ROOT}/infra/docker-compose.pc-gamer-workers.yml"
if [ -f "${WORKER_COMPOSE}" ]; then
  echo "  ✓ Worker compose found"
  echo "  To start: cd ${OPSLY_ROOT} && docker compose -f infra/docker-compose.pc-gamer-workers.yml up -d"
else
  echo "  ⚠ Worker compose not found at ${WORKER_COMPOSE}"
fi

# ── 9. Systemd services ──
echo "[9] Systemd services..."
# Heartbeat timer
cat > /etc/systemd/system/opsly-heartbeat.service << EOF
[Unit]
Description=Opsly Worker Heartbeat
After=network.target docker.service

[Service]
Type=oneshot
User=${DEVOPS_USER}
WorkingDirectory=${OPSLY_ROOT}
ExecStart=/bin/bash -c 'source .env.worker && ./scripts/ops/pc-gamer-heartbeat.sh'
EOF

cat > /etc/systemd/system/opsly-heartbeat.timer << EOF
[Unit]
Description=Opsly Heartbeat Timer (every 60s)

[Timer]
OnBootSec=30
OnUnitActiveSec=60

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable opsly-heartbeat.timer
systemctl start opsly-heartbeat.timer
echo "  ✓ Heartbeat timer enabled (every 60s)"

# Enable linger for devops user
loginctl enable-linger "${DEVOPS_USER}" 2>/dev/null || true

# ── 10. Summary ──
echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Next steps (manual):"
echo "  1. If Ollama not installed: curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.2"
echo "  2. Start worker: cd ${OPSLY_ROOT} && docker compose -f infra/docker-compose.pc-gamer-workers.yml up -d"
echo "  3. Verify from Mac: ./scripts/ops/check-pc-gamer-online.sh --json"
echo ""
echo "Or let the Mac handle it via SSH:"
echo "  ssh pc-gamer 'cd ~/opsly && docker compose -f infra/docker-compose.pc-gamer-workers.yml up -d'"
