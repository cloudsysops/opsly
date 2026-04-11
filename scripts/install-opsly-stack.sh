#!/usr/bin/env bash
# Instalación unificada del stack Opsly en Ubuntu (desarrollo / nodo local).
# Node (NVM), Docker, clon del repo y notas Tailscale.
#
# Uso:
#   ./scripts/install-opsly-stack.sh [--dry-run] [--skip-docker] [--skip-node] [--skip-clone] [--repo-dir PATH]
#
# Requisitos: usuario con sudo. No ejecutar como root completo para NVM (se usa el usuario actual).

set -euo pipefail

OPS_REPO_URL="${OPS_REPO_URL:-https://github.com/cloudsysops/opsly.git}"
NVM_VERSION="${NVM_VERSION:-v0.39.0}"
NODE_MAJOR="${NODE_MAJOR:-20}"
REPO_DIR="${HOME}/opsly"

DRY_RUN=false
SKIP_DOCKER=false
SKIP_NODE=false
SKIP_CLONE=false

log() { printf '%s\n' "$*"; }
info() { log "[install-opsly] $*"; }
warn() { log "[install-opsly] WARN: $*" >&2; }
err() { log "[install-opsly] ERROR: $*" >&2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --skip-docker) SKIP_DOCKER=true; shift ;;
    --skip-node) SKIP_NODE=true; shift ;;
    --skip-clone) SKIP_CLONE=true; shift ;;
    --repo-dir)
      REPO_DIR="${2:?}"
      shift 2
      ;;
    -h|--help)
      sed -n '1,12p' "$0"
      exit 0
      ;;
    *)
      err "Opción desconocida: $1"
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Linux" ]]; then
  warn "Este script está pensado para Linux (Ubuntu). Sistema: $(uname -s)"
fi

SUDO=()
if [[ "${EUID:-0}" -ne 0 ]]; then
  SUDO=(sudo)
elif [[ -z "${SUDO_USER:-}" ]]; then
  warn "Ejecutar como root no es recomendable para NVM. Mejor: usuario normal con sudo."
fi

run() {
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] $*"
    return 0
  fi
  bash -c "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# --- 1. Sistema ---
apt_basics() {
  info "Actualizando paquetes e instalando utilidades base..."
  local apt_get="apt-get"
  if [[ "${#SUDO[@]}" -gt 0 ]]; then
    apt_get="sudo apt-get"
  fi
  run "${apt_get} update -qq && DEBIAN_FRONTEND=noninteractive ${apt_get} upgrade -y -qq"
  run "DEBIAN_FRONTEND=noninteractive ${apt_get} install -y curl git build-essential ssl-cert ca-certificates gnupg"
}

# --- 2. NVM + Node LTS ---
install_node_via_nvm() {
  if [[ "$SKIP_NODE" == true ]]; then
    info "Omitiendo Node/NVM (--skip-node)."
    return 0
  fi
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    info "Instalando NVM ${NVM_VERSION}..."
    if [[ "$DRY_RUN" == true ]]; then
      info "[dry-run] curl nvm install.sh | bash"
    else
      curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
    fi
  else
    info "NVM ya presente en $NVM_DIR"
  fi

  # shellcheck source=/dev/null
  [[ -s "$NVM_DIR/nvm.sh" ]] && \. "$NVM_DIR/nvm.sh"

  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] nvm install ${NODE_MAJOR} && nvm alias default ${NODE_MAJOR}"
    return 0
  fi

  if ! command -v nvm >/dev/null 2>&1 && [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    \. "$NVM_DIR/nvm.sh"
  fi

  nvm install "${NODE_MAJOR}"
  nvm alias default "${NODE_MAJOR}"
  nvm use default
  info "Node activo: $(node -v 2>/dev/null || echo desconocido)"
}

# --- 3. Docker ---
install_docker_optional() {
  if [[ "$SKIP_DOCKER" == true ]]; then
    info "Omitiendo Docker (--skip-docker)."
    return 0
  fi
  info "Instalando Docker (get.docker.com)..."
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] curl get.docker.com | sh"
    return 0
  fi
  if curl -fsSL https://get.docker.com -o /tmp/get-docker.sh; then
    if "${SUDO[@]}" sh /tmp/get-docker.sh; then
      rm -f /tmp/get-docker.sh
      local user_to_add="${SUDO_USER:-$USER}"
      if [[ -n "$user_to_add" ]] && [[ "$user_to_add" != "root" ]]; then
        info "Añadiendo usuario ${user_to_add} al grupo docker..."
        "${SUDO[@]}" usermod -aG docker "$user_to_add" || warn "usermod docker falló"
      fi
      # Compose v2 (plugin)
      if ! docker compose version >/dev/null 2>&1; then
        info "Instalando plugin docker-compose..."
        "${SUDO[@]}" apt-get update -qq
        DEBIAN_FRONTEND=noninteractive "${SUDO[@]}" apt-get install -y docker-compose-plugin || warn "docker-compose-plugin no instalado; prueba: sudo apt-get install docker-compose-plugin"
      fi
      info "Docker instalado. Cierra sesión y vuelve a entrar para usar docker sin sudo."
    else
      warn "Instalación de Docker falló (kernel antiguo o dependencias). Continúa el resto del script."
    fi
  else
    warn "No se pudo descargar get.docker.com. Omite Docker o instálalo manualmente."
  fi
  rm -f /tmp/get-docker.sh
}

# --- 4. Repo Opsly ---
clone_and_env() {
  if [[ "$SKIP_CLONE" == true ]]; then
    info "Omitiendo clon (--skip-clone)."
    return 0
  fi
  if [[ -d "$REPO_DIR/.git" ]]; then
    info "Repositorio ya existe en $REPO_DIR (git pull opcional manual)."
  else
    info "Clonando Opsly en $REPO_DIR..."
    run "git clone \"$OPS_REPO_URL\" \"$REPO_DIR\""
  fi
  if [[ -f "$REPO_DIR/.env.example" ]]; then
    if [[ ! -f "$REPO_DIR/.env" ]]; then
      info "Copiando .env.example -> .env"
      run "cp \"$REPO_DIR/.env.example\" \"$REPO_DIR/.env\""
    else
      info ".env ya existe; no se sobrescribe."
    fi
  else
    warn "No hay .env.example en $REPO_DIR"
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] npm install workspaces api + orchestrator"
    return 0
  fi

  # shellcheck source=/dev/null
  [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]] && \. "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if require_cmd npm && [[ -f "$REPO_DIR/package.json" ]]; then
    info "Instalación opcional de dependencias (workspaces api y orchestrator)..."
    (cd "$REPO_DIR" && npm install --workspace=@intcloudsysops/api --workspace=@intcloudsysops/orchestrator) || warn "npm install workspaces falló; prueba desde el repo: npm install"
  else
    warn "npm no disponible u omitido; tras instalar Node: cd $REPO_DIR && npm install"
  fi
}

# --- 5. Tailscale (instrucciones) ---
print_tailscale() {
  log ""
  log "=== Tailscale (red privada) ==="
  log "Instalar en Ubuntu:"
  log "  curl -fsSL https://tailscale.com/install.sh | sh"
  log "Luego enlazar el nodo:"
  log "  sudo tailscale up"
  log "Autoriza el dispositivo en https://login.tailscale.com cuando el CLI lo indique."
  log ""
}

# --- Resumen ---
print_summary() {
  log ""
  log "=== Estado de la instalación ==="
  # Node
  # shellcheck source=/dev/null
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    \. "${NVM_DIR:-$HOME/.nvm}/nvm.sh" 2>/dev/null || true
  fi
  if require_cmd node; then
    log "Node:    $(node -v) ($(command -v node))"
  else
    log "Node:    (no en PATH; abre una nueva shell o: source ~/.nvm/nvm.sh)"
  fi
  # Docker
  if require_cmd docker; then
    log "Docker:  $(docker --version 2>/dev/null || echo presente)"
    if docker compose version >/dev/null 2>&1; then
      log "Compose: $(docker compose version 2>/dev/null | head -1)"
    elif require_cmd docker-compose; then
      log "Compose: $(docker-compose --version 2>/dev/null || echo legacy)"
    else
      log "Compose: (no detectado; apt install docker-compose-plugin)"
    fi
    if docker info >/dev/null 2>&1; then
      log "Docker daemon: accesible"
    else
      log "Docker daemon: no accesible sin sudo o tras cerrar sesión (grupo docker)"
    fi
  else
    log "Docker:  no instalado o no en PATH"
  fi
  # Git
  if require_cmd git; then
    log "Git:     $(git --version)"
  else
    log "Git:     no instalado"
  fi
  # Repo
  if [[ -d "${REPO_DIR}/.git" ]]; then
    log "Repo:    $REPO_DIR ($(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo sin commit))"
  else
    log "Repo:    (no clonado en $REPO_DIR)"
  fi
  log "==============================="
}

main() {
  info "Inicio (dry-run=$DRY_RUN)"
  if [[ "$DRY_RUN" != true ]]; then
    apt_basics
  else
    info "[dry-run] apt update/upgrade + curl git build-essential ssl-cert"
  fi
  install_node_via_nvm
  install_docker_optional
  clone_and_env
  print_tailscale
  print_summary
  info "Listo."
}

main "$@"
