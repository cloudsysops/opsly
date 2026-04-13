#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="false"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
fi

SUDOERS_FILE="/etc/sudoers.d/opsly-cloudsysops-bootstrap"
SUDOERS_CONTENT="$(cat <<'EOF'
# Managed by setup-sudoers-cloudsysops.sh
dragon ALL=(root) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd, /usr/bin/dscl, /usr/sbin/createhomedir
opslyquantum ALL=(root) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd, /usr/bin/dscl, /usr/sbin/createhomedir
vps-dragon ALL=(root) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd, /usr/bin/dscl, /usr/sbin/createhomedir
EOF
)"

apply_local() {
  echo "==> [opsly-admin] aplicando sudoers local"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run][opsly-admin] escribir ${SUDOERS_FILE} y validar con visudo"
    return
  fi
  local group="root"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    group="wheel"
  fi
  printf '%s\n' "$SUDOERS_CONTENT" > /tmp/opsly-sudoers.local.tmp
  sudo install -o root -g "$group" -m 0440 /tmp/opsly-sudoers.local.tmp "$SUDOERS_FILE"
  rm -f /tmp/opsly-sudoers.local.tmp
  sudo visudo -cf "$SUDOERS_FILE"
}

apply_remote() {
  local host="$1"
  local label="$2"
  echo "==> [$label] aplicando sudoers remoto ($host)"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run][$label] escribir ${SUDOERS_FILE} y validar con visudo"
    return
  fi
  ssh -tt -o ConnectTimeout=12 "$host" "cat > /tmp/opsly-sudoers.tmp" <<EOF
$SUDOERS_CONTENT
EOF
  ssh -tt -o ConnectTimeout=12 "$host" '
set -euo pipefail
group="root"
if [ "$(uname -s)" = "Darwin" ]; then
  group="wheel"
fi
sudo install -o root -g "$group" -m 0440 /tmp/opsly-sudoers.tmp "'"$SUDOERS_FILE"'"
sudo rm -f /tmp/opsly-sudoers.tmp
sudo visudo -cf "'"$SUDOERS_FILE"'"
'
}

failures=0

if ! apply_local; then
  echo "[ERROR] falló opsly-admin"
  failures=$((failures + 1))
fi

if ! apply_remote "opslyquantum@opsly-mac2011" "opsly-worker"; then
  echo "[ERROR] falló opsly-worker"
  failures=$((failures + 1))
fi

if ! apply_remote "vps-dragon@vps-dragon" "vps-dragon"; then
  echo "[ERROR] falló vps-dragon"
  failures=$((failures + 1))
fi

if [[ "$failures" -gt 0 ]]; then
  echo "✗ setup sudoers incompleto: ${failures} host(s) con error"
  exit 1
fi

echo "✓ sudoers aplicado en todas las máquinas"
echo "Siguiente paso: ./scripts/setup-cloudsysops-user-all-hosts.sh"
