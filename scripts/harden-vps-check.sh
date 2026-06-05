#!/usr/bin/env bash
# harden-vps-check.sh — Check VPS hardening status and report a score.
#
# Usage:
#   ./scripts/harden-vps-check.sh                # Check using config defaults
#   ./scripts/harden-vps-check.sh --ssh-host 100.120.151.91
#   ./scripts/harden-vps-check.sh --help
#
# Exit codes: 0 = hardened, 1 = issues found, 2 = VPS unreachable

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

# --- Args ---
SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-vps-dragon}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssh-host) SSH_HOST="${2:-}"; shift 2 ;;
    --ssh-user) SSH_USER="${2:-}"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --help|-h)
      sed -n '2,9p' "$0"
      exit 0 ;;
    *) die "Unknown arg: $1" 1 ;;
  esac
done

# --- Resolve SSH_HOST ---
if [[ -z "${SSH_HOST}" ]]; then
  CONFIG_FILE="${_SCRIPT_DIR}/../config/opsly.config.json"
  if [[ -f "${CONFIG_FILE}" ]]; then
    SSH_HOST=$(python3 -c "import json; print(json.load(open('${CONFIG_FILE}'))['infrastructure']['vps_tailscale_ip'])" 2>/dev/null || true)
  fi
fi
if [[ -z "${SSH_HOST}" ]]; then
  SSH_HOST="100.120.151.91"
fi

log_info "Target VPS: ${SSH_USER}@${SSH_HOST}"

# --- Helper: run remote command ---
remote() {
  ssh -o BatchMode=yes -o ConnectTimeout=10 "${SSH_USER}@${SSH_HOST}" "$@"
}

# --- Test connectivity ---
if ! remote "echo OK" 2>/dev/null; then
  log_error "Cannot reach ${SSH_USER}@${SSH_HOST} via SSH"
  exit 2
fi
log_ok "SSH connection to VPS OK"

# --- Run all remote checks in one SSH call ---
REMOTE_CHECKS=$(remote bash -s << 'REMOTESCRIPT'
set -euo pipefail

RESULTS=""

check() {
  local id="$1" status="$2" detail="$3"
  RESULTS="${RESULTS}${id}|${status}|${detail}\n"
}

# 1. UFW status
if command -v ufw >/dev/null 2>&1; then
  UFW_ACTIVE=$(sudo ufw status 2>/dev/null | head -1)
  if echo "${UFW_ACTIVE}" | grep -qi "active"; then
    check "UFW" "PASS" "${UFW_ACTIVE}"
  else
    check "UFW" "FAIL" "${UFW_ACTIVE:-not active}"
  fi
else
  check "UFW" "FAIL" "ufw command not found"
fi

# 2. UFW default deny
if sudo ufw status verbose 2>/dev/null | grep -q "Default: deny (incoming)"; then
  check "UFW default deny" "PASS" "Default incoming policy is deny"
else
  check "UFW default deny" "FAIL" "Default incoming policy is NOT deny"
fi

# 3. SSH restricted to Tailscale subnet
SSH_RULES=$(sudo ufw status 2>/dev/null | grep "22/tcp" || true)
if echo "${SSH_RULES}" | grep -q "100.64.0.0/10"; then
  check "SSH Tailscale only" "PASS" "SSH restricted to 100.64.0.0/10"
elif echo "${SSH_RULES}" | grep -qv "100.64.0.0/10"; then
  check "SSH Tailscale only" "WARN" "SSH has rules but not limited to Tailscale: ${SSH_RULES}"
else
  check "SSH Tailscale only" "FAIL" "No explicit SSH allow rule for Tailscale"
fi

# 4. Ports 80/443 open
PORTS_OK=true
for port in 80 443; do
  if ! sudo ufw status 2>/dev/null | grep -q "${port}/tcp"; then
    PORTS_OK=false
  fi
done
if [[ "${PORTS_OK}" == "true" ]]; then
  check "HTTP/HTTPS open" "PASS" "Ports 80 and 443 are open"
else
  check "HTTP/HTTPS open" "FAIL" "Port 80 or 443 not open"
fi

# 5. Docker containers running
CONTAINERS=$(docker ps -q 2>/dev/null | wc -l)
if [[ "${CONTAINERS}" -gt 0 ]]; then
  check "Docker containers" "PASS" "${CONTAINERS} containers running"
else
  check "Docker containers" "WARN" "No Docker containers running (expected on idle)"
fi

# 6. Docker socket permissions
SOCK_PERMS=$(stat -c "%a %G" /var/run/docker.sock 2>/dev/null || echo "not found")
check "Docker socket" "INFO" "perms=${SOCK_PERMS}"

# 7. Root login via SSH
if sudo grep -q "^PermitRootLogin yes" /etc/ssh/sshd_config 2>/dev/null; then
  check "SSH root login" "FAIL" "PermitRootLogin is set to yes"
elif sudo grep -q "^PermitRootLogin prohibit-password" /etc/ssh/sshd_config 2>/dev/null; then
  check "SSH root login" "PASS" "Root login with key only (prohibit-password)"
elif sudo grep -q "^PermitRootLogin no" /etc/ssh/sshd_config 2>/dev/null; then
  check "SSH root login" "PASS" "Root login disabled"
else
  check "SSH root login" "WARN" "PermitRootLogin not explicitly set (check config)"
fi

# 8. Password authentication
if sudo grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config 2>/dev/null; then
  check "SSH password auth" "PASS" "PasswordAuthentication disabled"
else
  check "SSH password auth" "WARN" "PasswordAuthentication not explicitly disabled"
fi

# 9. Tailscale status
if command -v tailscale >/dev/null 2>&1; then
  TS_STATUS=$(tailscale status 2>/dev/null | head -3 || echo "not connected")
  check "Tailscale" "PASS" "Tailscale is running"
else
  check "Tailscale" "FAIL" "tailscale command not found"
fi

# 10. System updates (check if unattended-upgrades is active)
if dpkg -l unattended-upgrades 2>/dev/null | grep -q "^ii"; then
  if sudo systemctl is-active unattended-upgrades 2>/dev/null | grep -q "active"; then
    check "Auto updates" "PASS" "unattended-upgrades is active"
  else
    check "Auto updates" "WARN" "unattended-upgrades installed but not active"
  fi
else
  check "Auto updates" "FAIL" "unattended-upgrades not installed"
fi

echo -e "${RESULTS}"
REMOTESCRIPT
)

# --- Check Cloudflare proxy ---
log_info "Checking Cloudflare Proxy (DNS resolution)..."
CF_CHECK="SKIP"
CLOUDFLARE_IPS=$(dig +short api.op-sly.com 2>/dev/null | head -1 || true)
if [[ -z "${CLOUDFLARE_IPS}" ]]; then
  CF_CHECK="SKIP (DNS lookup failed for api.op-sly.com)"
else
  # Cloudflare proxy IPs are in 104.16.0.0/12, 172.64.0.0/13, 173.245.48.0/20
  if echo "${CLOUDFLARE_IPS}" | grep -qE '^(104\.|172\.6[4-9]\.|172\.7[0-9]\.|173\.245\.)'; then
    CF_CHECK="PASS (Cloudflare Proxy ON — IP ${CLOUDFLARE_IPS} is Cloudflare)"
  elif echo "${CLOUDFLARE_IPS}" | grep -q '^157\.'; then
    CF_CHECK="FAIL (Cloudflare Proxy OFF — origin IP ${CLOUDFLARE_IPS} exposed)"
  else
    CF_CHECK="INFO (unexpected IP ${CLOUDFLARE_IPS})"
  fi
fi

# --- Parse and score ---
echo ""
echo "================================================"
echo "  VPS Hardening Verification Report"
echo "  Target: ${SSH_USER}@${SSH_HOST}"
echo "================================================"
echo ""

SCORE=0
MAX_SCORE=0
declare -A SEVERITY_VALUES
SEVERITY_VALUES=( ["FAIL"]=0 ["WARN"]=50 ["INFO"]=75 ["PASS"]=100 ["SKIP"]=0 )

while IFS='|' read -r id status detail; do
  [[ -z "${id}" ]] && continue
  MAX_SCORE=$((MAX_SCORE + 1))
  case "${status}" in
    PASS)
      log_ok "[${id}] ${detail}"
      SCORE=$((SCORE + 1))
      ;;
    WARN)
      log_warn "[${id}] ${detail}"
      ;;
    FAIL)
      log_error "[${id}] ${detail}"
      ;;
    *)
      log_info "[${id}] ${detail}"
      ;;
  esac
done <<< "${REMOTE_CHECKS}"

# Cloudflare check
MAX_SCORE=$((MAX_SCORE + 1))
case "${CF_CHECK}" in
  PASS*)
    log_ok "[Cloudflare Proxy] ${CF_CHECK#PASS }"
    SCORE=$((SCORE + 1))
    ;;
  FAIL*)
    log_error "[Cloudflare Proxy] ${CF_CHECK#FAIL }"
    ;;
  *)
    log_warn "[Cloudflare Proxy] ${CF_CHECK}"
    ;;
esac

# --- Calculate weighted score ---
TOTAL=$(echo "${REMOTE_CHECKS}" | grep -c '|' || true)
if [[ "${TOTAL}" -eq 0 ]]; then
  log_error "No check results received from VPS"
  exit 1
fi

HARDENING_SCORE=$((SCORE * 100 / MAX_SCORE))

echo ""
echo "================================================"
echo "  Hardening Score: ${HARDENING_SCORE}/100"
echo "  ${SCORE}/${MAX_SCORE} checks passing"
echo "================================================"

if [[ "${HARDENING_SCORE}" -ge 80 ]]; then
  echo "  Status: GOOD"
elif [[ "${HARDENING_SCORE}" -ge 50 ]]; then
  echo "  Status: NEEDS IMPROVEMENT"
else
  echo "  Status: CRITICAL"
fi
echo ""

# --- Recommendations ---
echo "=== Recommendations ==="
if echo "${REMOTE_CHECKS}" | grep -q "UFW.*FAIL"; then
  echo "  - Enable UFW: run ./scripts/vps-secure.sh or manually: sudo ufw --force enable"
fi
if echo "${REMOTE_CHECKS}" | grep -q "SSH Tailscale only.*FAIL\|SSH Tailscale only.*WARN"; then
  echo "  - Restrict SSH to Tailscale only: sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp; sudo ufw delete allow 22/tcp"
fi
if echo "${REMOTE_CHECKS}" | grep -q "SSH root login.*FAIL"; then
  echo "  - Disable root SSH login: sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl restart sshd"
fi
if echo "${REMOTE_CHECKS}" | grep -q "SSH password auth.*WARN"; then
  echo "  - Disable password auth: sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && sudo systemctl restart sshd"
fi
if echo "${REMOTE_CHECKS}" | grep -q "Auto updates.*FAIL\|Auto updates.*WARN"; then
  echo "  - Enable unattended-upgrades: sudo apt install unattended-upgrades && sudo dpkg-reconfigure --priority=low unattended-upgrades"
fi
if echo "${CF_CHECK}" | grep -q "FAIL"; then
  echo "  - Enable Cloudflare Proxy (orange cloud) for all *.op-sly.com DNS records in Cloudflare dashboard"
fi
if echo "${REMOTE_CHECKS}" | grep -q "Tailscale.*FAIL"; then
  echo "  - Install and start Tailscale on VPS: curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up"
fi
echo ""

if echo "${REMOTE_CHECKS}" | grep -q "FAIL"; then
  exit 1
fi
exit 0
