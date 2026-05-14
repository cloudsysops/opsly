#!/usr/bin/env bash
# Instala OpenAI Codex CLI en el VPS (usuario SSH) vía Tailscale.
#
# Requisitos: acceso SSH sin contraseña (BatchMode), Node/npm en el host remoto.
# Política Opsly: usar Tailscale (no IP pública). Por defecto vps-dragon@100.120.151.91.
#
# Uso:
#   ./scripts/vps-install-codex-cli.sh --dry-run
#   ./scripts/vps-install-codex-cli.sh --apply
#
# Variables:
#   VPS_USER  (default vps-dragon)
#   VPS_HOST  (default 100.120.151.91)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd ssh

VPS_USER="${VPS_USER:-vps-dragon}"
VPS_HOST="${VPS_HOST:-100.120.151.91}"
SSH_TARGET="${VPS_USER}@${VPS_HOST}"

APPLY=false
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=true
elif [[ "${1:-}" == "--dry-run" ]]; then
  APPLY=false
elif [[ -n "${1:-}" ]]; then
  die "Uso: $0 --dry-run | --apply" 1
else
  log_warn "Sin flag: asumiendo --dry-run (pasa --apply para ejecutar en el VPS)."
fi

remote_block() {
  cat <<'EOS'
set -euo pipefail
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm no está en PATH" >&2
  exit 1
fi
npm install -g @openai/codex@latest
MARK="# opsly npm-global bin (codex cli)"
if [[ -f "${HOME}/.bashrc" ]] && ! grep -qF "${MARK}" "${HOME}/.bashrc" 2>/dev/null; then
  printf '\n%s\nexport PATH="$HOME/.npm-global/bin:$PATH"\n' "${MARK}" >> "${HOME}/.bashrc"
  echo "PATH actualizado en ~/.bashrc"
elif grep -qF "${MARK}" "${HOME}/.bashrc" 2>/dev/null; then
  echo "PATH marker ya presente en ~/.bashrc"
fi
CODEX="$(npm prefix -g)/bin/codex"
if [[ ! -x "${CODEX}" ]]; then
  echo "ERROR: codex no encontrado en ${CODEX}" >&2
  exit 1
fi
"${CODEX}" --version
EOS
}

log_info "SSH target: ${SSH_TARGET}"

if [[ "${APPLY}" != "true" ]]; then
  log_info "[dry-run] Se ejecutaría: ssh ${SSH_TARGET} 'bash -s' <<'…' (instala @openai/codex + PATH en ~/.bashrc)"
  exit 0
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_TARGET}" /bin/bash -s <<<"$(remote_block)"; then
  die "SSH o instalación remota falló (¿Tailscale y clave SSH?)." 1
fi

log_ok "Codex instalado en ${SSH_TARGET}. Nueva shell SSH: codex --version (PATH desde ~/.bashrc)."
