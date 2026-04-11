#!/usr/bin/env bash
# Instalador unificado de Opsly para Ubuntu/Debian en modo workstation o nodo local.
set -euo pipefail

OPS_REPO_URL="${OPS_REPO_URL:-https://github.com/cloudsysops/opsly.git}"
NVM_VERSION="${NVM_VERSION:-v0.39.0}"
NODE_MAJOR="${NODE_MAJOR:-20}"
REPO_DIR="${REPO_DIR:-$HOME/opsly}"

DRY_RUN=false
INSTALL_WORKSPACES=false
SKIP_DOCKER=false
SKIP_NODE=false
SKIP_CLONE=false
SHOW_SUMMARY=true

DOCKER_STATUS="pending"
DOCKER_GROUP_STATUS="not checked"
TAILSCALE_STATUS="pending"
REPO_STATUS="pending"
ENV_STATUS="pending"
HOOKS_STATUS="pending"

declare -a WARNINGS=()

log() { printf '%s\n' "$*"; }
info() { log "[install-opsly] $*"; }
warn() { log "[install-opsly] WARN: $*" >&2; }
err() { log "[install-opsly] ERROR: $*" >&2; }

usage() {
  cat <<'EOF'
Uso:
  ./scripts/install-opsly-stack.sh [opciones]

Opciones:
  --dry-run               Simula acciones sin modificar el sistema
  --install-workspaces    Ejecuta npm install en api y orchestrator
  --skip-docker           Omite instalación de Docker
  --skip-node             Omite instalación de NVM/Node
  --skip-clone            Omite clonación/configuración del repo
  --repo-dir PATH         Directorio destino del repo (default: $HOME/opsly)
  -h, --help              Muestra esta ayuda
EOF
}

append_warning() {
  WARNINGS+=("$1")
  warn "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_cmd() {
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] $*"
    return 0
  fi
  "$@"
}

run_shell() {
  local command="${1:?}"
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] ${command}"
    return 0
  fi
  bash -lc "${command}"
}

run_privileged_shell() {
  local command="${1:?}"
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] ${command}"
    return 0
  fi
  if [[ "${EUID:-0}" -eq 0 ]]; then
    bash -lc "${command}"
  else
    sudo bash -lc "${command}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --install-workspaces) INSTALL_WORKSPACES=true; shift ;;
    --skip-docker) SKIP_DOCKER=true; shift ;;
    --skip-node) SKIP_NODE=true; shift ;;
    --skip-clone) SKIP_CLONE=true; shift ;;
    --repo-dir)
      REPO_DIR="${2:?}"
      shift 2
      ;;
    -h|--help)
      SHOW_SUMMARY=false
      usage
      exit 0
      ;;
    *)
      err "Opción desconocida: $1"
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Linux" ]]; then
  warn "Este script está pensado para Linux (Ubuntu/Debian). Sistema actual: $(uname -s)"
fi

if ! require_cmd apt-get && [[ "$DRY_RUN" != true ]]; then
  err "Se requiere apt-get. Usa Ubuntu o Debian."
  exit 1
fi

if [[ "${EUID:-0}" -ne 0 ]] && ! require_cmd sudo && [[ "$DRY_RUN" != true ]]; then
  err "Se requiere sudo para instalar paquetes del sistema."
  exit 1
fi

apt_basics() {
  info "Actualizando el sistema e instalando utilidades base..."
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] sudo apt-get update && sudo apt-get upgrade -y"
    info "[dry-run] sudo apt-get install -y curl git build-essential ssl-cert ca-certificates"
    return 0
  fi

  export DEBIAN_FRONTEND=noninteractive
  if [[ "${EUID:-0}" -eq 0 ]]; then
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl git build-essential ssl-cert ca-certificates
  else
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl git build-essential ssl-cert ca-certificates
  fi
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  return 1
}

install_node_via_nvm() {
  if [[ "$SKIP_NODE" == true ]]; then
    info "Omitiendo Node/NVM (--skip-node)."
    return 0
  fi

  info "Instalando Node.js ${NODE_MAJOR} con NVM..."
  if [[ "$DRY_RUN" == true ]] && ! load_nvm; then
    info "[dry-run] curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash"
    info "[dry-run] nvm install ${NODE_MAJOR}"
    info "[dry-run] nvm alias default ${NODE_MAJOR}"
    return 0
  fi

  if ! load_nvm; then
    run_shell "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash"
    load_nvm || {
      err "NVM no pudo cargarse tras la instalación."
      exit 1
    }
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] nvm install ${NODE_MAJOR}"
    info "[dry-run] nvm alias default ${NODE_MAJOR}"
    return 0
  fi

  nvm install "${NODE_MAJOR}"
  nvm alias default "${NODE_MAJOR}"
  nvm use default >/dev/null
  info "Node activo: $(node -v 2>/dev/null || echo desconocido)"
}

install_docker_optional() {
  if [[ "$SKIP_DOCKER" == true ]]; then
    DOCKER_STATUS="skipped"
    info "Omitiendo Docker (--skip-docker)."
    return 0
  fi

  info "Instalando Docker (tolerante a fallos)..."
  if require_cmd docker; then
    DOCKER_STATUS="already installed"
  elif run_privileged_shell "curl -fsSL https://get.docker.com | sh"; then
    DOCKER_STATUS="installed"
  else
    DOCKER_STATUS="install failed"
    append_warning "Docker no pudo instalarse automáticamente. Continúa el resto del script."
    return 0
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] añadir usuario actual al grupo docker"
    info "[dry-run] verificar/install docker compose"
    DOCKER_GROUP_STATUS="dry-run"
    return 0
  fi

  local user_to_add="${SUDO_USER:-$USER}"
  if getent group docker >/dev/null 2>&1 && [[ -n "$user_to_add" ]] && [[ "$user_to_add" != "root" ]]; then
    if id -nG "$user_to_add" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
      DOCKER_GROUP_STATUS="already in docker group"
    else
      if [[ "${EUID:-0}" -eq 0 ]]; then
        usermod -aG docker "$user_to_add" || append_warning "No se pudo añadir ${user_to_add} al grupo docker."
      else
        sudo usermod -aG docker "$user_to_add" || append_warning "No se pudo añadir ${user_to_add} al grupo docker."
      fi
      DOCKER_GROUP_STATUS="added to docker group"
    fi
  fi

  if docker compose version >/dev/null 2>&1; then
    return 0
  fi

  if [[ "${EUID:-0}" -eq 0 ]]; then
    apt-get install -y docker-compose-plugin || apt-get install -y docker-compose || append_warning "Docker Compose no pudo instalarse automáticamente."
  else
    sudo apt-get install -y docker-compose-plugin || sudo apt-get install -y docker-compose || append_warning "Docker Compose no pudo instalarse automáticamente."
  fi
}

clone_and_configure_repo() {
  if [[ "$SKIP_CLONE" == true ]]; then
    REPO_STATUS="skipped"
    ENV_STATUS="skipped"
    HOOKS_STATUS="skipped"
    info "Omitiendo clonación/configuración del repo (--skip-clone)."
    return 0
  fi

  if [[ -d "$REPO_DIR/.git" ]]; then
    REPO_STATUS="already present"
    info "Repositorio ya existe en $REPO_DIR."
  else
    info "Clonando Opsly en $REPO_DIR..."
    run_cmd git clone "$OPS_REPO_URL" "$REPO_DIR"
    REPO_STATUS="cloned"
  fi

  if [[ "$DRY_RUN" == true && ! -d "$REPO_DIR" ]]; then
    ENV_STATUS="dry-run"
    HOOKS_STATUS="dry-run"
    return 0
  fi

  if [[ -d "$REPO_DIR/.githooks" ]]; then
    if (cd "$REPO_DIR" && git config core.hooksPath .githooks); then
      HOOKS_STATUS="configured"
    else
      HOOKS_STATUS="failed"
      append_warning "No se pudo configurar core.hooksPath=.githooks."
    fi
  else
    HOOKS_STATUS="not present"
  fi

  if [[ -f "$REPO_DIR/.env" ]]; then
    ENV_STATUS="already present"
    info ".env ya existe; no se sobrescribe."
  elif [[ -f "$REPO_DIR/.env.example" ]]; then
    info "Copiando .env.example -> .env"
    run_cmd cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
    ENV_STATUS="created"
  else
    ENV_STATUS="missing template"
    append_warning "No se encontró .env.example en $REPO_DIR."
  fi
}

install_workspace_dependencies() {
  if [[ "$INSTALL_WORKSPACES" != true ]]; then
    info "Dependencias opcionales no solicitadas (--install-workspaces para activarlas)."
    return 0
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] cd \"$REPO_DIR\" && npm install --workspace=@intcloudsysops/api"
    info "[dry-run] cd \"$REPO_DIR\" && npm install --workspace=@intcloudsysops/orchestrator"
    return 0
  fi

  load_nvm || true
  if ! require_cmd npm; then
    append_warning "npm no está disponible para instalar workspaces opcionales."
    return 0
  fi

  if [[ ! -f "$REPO_DIR/package.json" ]]; then
    append_warning "No se encontró package.json en $REPO_DIR; se omiten workspaces opcionales."
    return 0
  fi

  info "Instalando dependencias opcionales de api y orchestrator..."
  (cd "$REPO_DIR" && npm install --workspace=@intcloudsysops/api) || append_warning "Falló npm install para @intcloudsysops/api."
  (cd "$REPO_DIR" && npm install --workspace=@intcloudsysops/orchestrator) || append_warning "Falló npm install para @intcloudsysops/orchestrator."
}

install_tailscale_optional() {
  info "Instalando Tailscale (tolerante a fallos)..."
  if require_cmd tailscale; then
    TAILSCALE_STATUS="already installed"
    return 0
  fi

  if run_privileged_shell "curl -fsSL https://tailscale.com/install.sh | sh"; then
    TAILSCALE_STATUS="installed"
  else
    TAILSCALE_STATUS="install failed"
    append_warning "Tailscale no pudo instalarse automáticamente."
  fi
}

print_summary() {
  if [[ "$SHOW_SUMMARY" != true ]]; then
    return 0
  fi

  log ""
  log "===============================================================================" 
  log "Estado de la Instalación"
  log "===============================================================================" 

  if load_nvm && require_cmd node; then
    log "Node version:    $(node -v)"
  elif require_cmd node; then
    log "Node version:    $(node -v)"
  else
    log "Node version:    no disponible en PATH"
  fi

  if require_cmd docker; then
    log "Docker status:   $(docker --version 2>/dev/null || echo instalado)"
    if docker compose version >/dev/null 2>&1; then
      log "Compose status:  $(docker compose version 2>/dev/null | head -1)"
    elif require_cmd docker-compose; then
      log "Compose status:  $(docker-compose --version 2>/dev/null || echo disponible)"
    else
      log "Compose status:  no detectado"
    fi
    if docker info >/dev/null 2>&1; then
      log "Docker daemon:   accesible"
    else
      log "Docker daemon:   no accesible aún (posible relog por grupo docker)"
    fi
  else
    log "Docker status:   no instalado o no disponible (${DOCKER_STATUS})"
  fi

  if [[ -d "$REPO_DIR/.git" ]]; then
    log "Repo status:     $REPO_DIR"
    log "Git status:"
    git -C "$REPO_DIR" status --short --branch 2>/dev/null || log "(no disponible)"
  else
    log "Repo status:     no clonado en $REPO_DIR (${REPO_STATUS})"
  fi

  log ""
  log "Detalles adicionales:"
  log "- Docker install: ${DOCKER_STATUS}"
  log "- Docker group:   ${DOCKER_GROUP_STATUS}"
  log "- Repo:           ${REPO_STATUS}"
  log "- .env:           ${ENV_STATUS}"
  log "- Git hooks:      ${HOOKS_STATUS}"
  log "- Tailscale:      ${TAILSCALE_STATUS}"

  if [[ "${#WARNINGS[@]}" -gt 0 ]]; then
    log ""
    log "Warnings:"
    local warning
    for warning in "${WARNINGS[@]}"; do
      log "- ${warning}"
    done
  fi

  log ""
  log "Acción pendiente para red privada:"
  log "  sudo tailscale up"
  log "Autoriza el dispositivo cuando Tailscale lo solicite."
  log "===============================================================================" 
}

main() {
  info "Inicio (dry-run=$DRY_RUN)"
  apt_basics
  install_node_via_nvm
  install_docker_optional
  clone_and_configure_repo
  install_workspace_dependencies
  install_tailscale_optional
  print_summary
  info "Listo."
}

main "$@"
