#!/usr/bin/env bash
# Idempotent: VPS (vps-dragon) → Mac principal (Tailscale) sin contraseña.
# Ejecutar desde la Mac donde ya funciona: ssh vps-dragon
#
# Env (opcional):
#   SSH_VPS              Host SSH del VPS (default: vps-dragon, ver ~/.ssh/config)
#   OPSLY_ADMIN_USER     Usuario SSH en la Mac (default: dragon)
#   OPSLY_ADMIN_HOST     IP o FQDN Tailscale de la Mac (default: 100.89.38.3)
#
# Uso:
#   ./scripts/setup-vps-ssh-to-opsly-admin.sh --dry-run
#   ./scripts/setup-vps-ssh-to-opsly-admin.sh

set -euo pipefail

KEY_NAME="vps_to_opsly_admin"
SSH_VPS="${SSH_VPS:-vps-dragon}"
OPSLY_ADMIN_USER="${OPSLY_ADMIN_USER:-dragon}"
OPSLY_ADMIN_HOST="${OPSLY_ADMIN_HOST:-100.89.38.3}"
SSH_CONFIG_BLOCK_HOST="opsly-admin-from-vps"

usage() {
  sed -n '1,18p' "$0" | tail -n +2
}

DRY_RUN=0
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

log() {
  printf '%s\n' "$*" >&2
}

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "=== Dry-run (no se ejecuta SSH ni se modifican archivos) ==="
  log "1) En $SSH_VPS: crear si falta ~/.ssh/${KEY_NAME} y mostrar .pub"
  log "2) En esta Mac: añadir esa línea a ~/.ssh/authorized_keys del usuario que ejecute el script (ahora: $(id -un)); debe ser la misma cuenta que OPSLY_ADMIN_USER=$OPSLY_ADMIN_USER para que el SSH remoto funcione."
  log "3) En $SSH_VPS: añadir Host ${SSH_CONFIG_BLOCK_HOST} → ${OPSLY_ADMIN_USER}@${OPSLY_ADMIN_HOST}"
  log ""
  log "Variables: SSH_VPS=$SSH_VPS OPSLY_ADMIN_USER=$OPSLY_ADMIN_USER OPSLY_ADMIN_HOST=$OPSLY_ADMIN_HOST"
  log "Quitar --dry-run para ejecutar."
  exit 0
fi

log "=== Opsly: VPS → Mac (SSH) ==="
log "VPS host: $SSH_VPS"
log "Mac destino: ${OPSLY_ADMIN_USER}@${OPSLY_ADMIN_HOST}"
log "Usuario local (quien recibe la clave en authorized_keys): $(id -un)"
log ""

if [[ "$(id -un)" != "$OPSLY_ADMIN_USER" ]]; then
  log "Advertencia: usuario actual ≠ OPSLY_ADMIN_USER. Instala la clave en la cuenta que use SSH en el Mac ($OPSLY_ADMIN_USER), p. ej. sudo -u $OPSLY_ADMIN_USER $0 (sin --dry-run) o mueve la línea a mano."
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_VPS" /bin/true; then
  log "Error: no se pudo conectar a $SSH_VPS (¿Tailscale y clave SSH?)"
  exit 1
fi

PUB_LINE=$(
  ssh "$SSH_VPS" env KEY_NAME="$KEY_NAME" bash -s <<'REMOTE_KEY'
set -euo pipefail
install -d -m 700 "$HOME/.ssh"
if [[ ! -f "$HOME/.ssh/$KEY_NAME" ]]; then
  ssh-keygen -t ed25519 -f "$HOME/.ssh/$KEY_NAME" -N "" -C "vps-dragon@opsly-admin-tailnet"
  chmod 600 "$HOME/.ssh/$KEY_NAME"
fi
cat "$HOME/.ssh/$KEY_NAME.pub"
REMOTE_KEY
)

if [[ -z "$PUB_LINE" || "$PUB_LINE" != ssh-ed25519\ * ]]; then
  log "Error: no se obtuvo una clave pública válida del VPS."
  exit 1
fi

AUTH_KEYS="${HOME}/.ssh/authorized_keys"
install -d -m 700 "${HOME}/.ssh"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS" 2>/dev/null || true

if grep -Fxq "$PUB_LINE" "$AUTH_KEYS" 2>/dev/null; then
  log "La pública del VPS ya está en $AUTH_KEYS (sin cambios)."
else
  printf '\n%s\n' "$PUB_LINE" >>"$AUTH_KEYS"
  log "Añadida clave pública del VPS a $AUTH_KEYS"
fi

CONFIG_SNIPPET="Host ${SSH_CONFIG_BLOCK_HOST}
    HostName ${OPSLY_ADMIN_HOST}
    User ${OPSLY_ADMIN_USER}
    IdentityFile ~/.ssh/${KEY_NAME}
    IdentitiesOnly yes"

REMOTE_HAS=$(
  ssh "$SSH_VPS" env H="$SSH_CONFIG_BLOCK_HOST" bash -s <<'REMOTE_GREP'
if grep -q "^Host $H$" "$HOME/.ssh/config" 2>/dev/null; then echo yes; else echo no; fi
REMOTE_GREP
)

if [[ "$REMOTE_HAS" == "yes" ]]; then
  log "En el VPS ya existe Host ${SSH_CONFIG_BLOCK_HOST} en ~/.ssh/config."
else
  ssh "$SSH_VPS" 'mkdir -p -m 700 "$HOME/.ssh" && touch "$HOME/.ssh/config" && chmod 600 "$HOME/.ssh/config"'
  printf '%s\n\n' "$CONFIG_SNIPPET" | ssh "$SSH_VPS" 'cat >> "$HOME/.ssh/config"'
  log "Añadido Host ${SSH_CONFIG_BLOCK_HOST} en el VPS."
fi

log ""
log "Prueba desde el VPS:"
log "  ssh ${SSH_CONFIG_BLOCK_HOST} hostname"
