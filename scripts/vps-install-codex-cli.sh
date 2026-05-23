#!/usr/bin/env bash
# Instala OpenAI Codex CLI en el VPS (usuario SSH) vía Tailscale.
#
# Método preferido: binario nativo Linux desde GitHub Releases (musl).
# Fallback: npm install -g @openai/codex@latest
#
# Requisitos: acceso SSH sin contraseña (BatchMode), curl, tar.
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

MARK="# opsly codex cli PATH"
INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "${INSTALL_DIR}"

path_snippet() {
  printf '%s\nexport PATH="%s:$HOME/.npm-global/bin:$PATH"\n' "${MARK}" "${INSTALL_DIR}"
}
for rc in "${HOME}/.bashrc" "${HOME}/.zshrc" "${HOME}/.zprofile"; do
  if [[ ! -f "${rc}" ]]; then
    continue
  fi
  if grep -qF "${MARK}" "${rc}" 2>/dev/null; then
    echo "PATH marker ya presente en ${rc}"
  else
    path_snippet >>"${rc}"
    echo "PATH actualizado en ${rc}"
  fi
done

arch_asset() {
  case "$(uname -m)" in
    x86_64|amd64) echo "codex-x86_64-unknown-linux-musl.tar.gz" ;;
    aarch64|arm64) echo "codex-aarch64-unknown-linux-musl.tar.gz" ;;
    *)
      echo "ERROR: arquitectura no soportada: $(uname -m)" >&2
      return 1
      ;;
  esac
}

install_native_binary() {
  command -v curl >/dev/null 2>&1 || { echo "ERROR: curl no está en PATH" >&2; return 1; }
  command -v tar >/dev/null 2>&1 || { echo "ERROR: tar no está en PATH" >&2; return 1; }
  local asset tag url tmp extracted bin
  asset="$(arch_asset)"
  tag="$(curl -sfL https://api.github.com/repos/openai/codex/releases/latest \
    | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -z "${tag}" ]]; then
    echo "ERROR: no se pudo leer tag de release GitHub" >&2
    return 1
  fi
  url="https://github.com/openai/codex/releases/download/${tag}/${asset}"
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' RETURN
  echo "Descargando ${url} ..."
  curl -sfL -o "${tmp}/${asset}" "${url}"
  tar -xzf "${tmp}/${asset}" -C "${tmp}"
  extracted="$(find "${tmp}" -maxdepth 2 -type f \( -name 'codex' -o -name 'codex-*-linux-musl' \) ! -name '*.tar.gz' | head -1)"
  if [[ -z "${extracted}" || ! -f "${extracted}" ]]; then
    echo "ERROR: binario no encontrado tras extraer ${asset}" >&2
    find "${tmp}" -type f | head -20 >&2
    return 1
  fi
  bin="${INSTALL_DIR}/codex"
  cp -f "${extracted}" "${bin}"
  chmod +x "${bin}"
  echo "Binario nativo instalado: ${bin}"
  "${bin}" --version
}

install_npm_fallback() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "WARN: npm no disponible; omitiendo fallback npm" >&2
    return 0
  fi
  npm install -g @openai/codex@latest
  local npm_bin
  npm_bin="$(npm prefix -g)/bin/codex"
  if [[ -x "${npm_bin}" ]]; then
    ln -sf "${npm_bin}" "${INSTALL_DIR}/codex-npm"
    echo "Fallback npm: ${npm_bin} → ${INSTALL_DIR}/codex-npm"
    "${npm_bin}" --version
  fi
}

if install_native_binary; then
  echo "OK: Codex CLI nativo Linux"
else
  echo "WARN: binario nativo falló; intentando npm ..." >&2
  install_npm_fallback
  if [[ ! -x "${INSTALL_DIR}/codex" ]] && [[ -x "${INSTALL_DIR}/codex-npm" ]]; then
    ln -sf "${INSTALL_DIR}/codex-npm" "${INSTALL_DIR}/codex"
  fi
fi

if [[ ! -x "${INSTALL_DIR}/codex" ]]; then
  echo "ERROR: ${INSTALL_DIR}/codex no ejecutable" >&2
  exit 1
fi
export PATH="${INSTALL_DIR}:${HOME}/.npm-global/bin:${PATH}"
command -v codex
codex --version
EOS
}

log_info "SSH target: ${SSH_TARGET}"

if [[ "${APPLY}" != "true" ]]; then
  log_info "[dry-run] Instalaría binario musl en ~/.local/bin/codex + PATH (bash/zsh/zprofile)"
  exit 0
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_TARGET}" /bin/bash -s <<<"$(remote_block)"; then
  die "SSH o instalación remota falló (¿Tailscale y clave SSH?)." 1
fi

log_ok "Codex Linux en ${SSH_TARGET}: ~/.local/bin/codex — nueva SSH: codex --version"
