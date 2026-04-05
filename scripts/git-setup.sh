#!/usr/bin/env bash
# Configuración de Git para el equipo (Mac, Linux, VPS).
# Uso: GIT_EMAIL=tu@email.com ./scripts/git-setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd git
require_env GIT_EMAIL

log_info "[a] Git global (usuario Dragon Master, email desde GIT_EMAIL)"

run git config --global user.name "Dragon Master"
run git config --global user.email "${GIT_EMAIL}"
run git config --global core.autocrlf input
run git config --global pull.rebase false
run git config --global push.default current
run git config --global init.defaultBranch main

if command -v code >/dev/null 2>&1; then
  run git config --global core.editor "code --wait"
else
  log_info "VS Code (code) no en PATH; core.editor no cambiado"
fi

log_info "[b] Commitizen global (conventional commits)"

if command -v npm >/dev/null 2>&1; then
  if ! command -v cz >/dev/null 2>&1; then
    run npm install -g commitizen cz-conventional-changelog
  else
    log_info "commitizen (cz) ya instalado"
  fi
  if [[ "${DRY_RUN}" != "true" ]]; then
    printf '%s\n' '{ "path": "cz-conventional-changelog" }' >"${HOME}/.czrc"
    log_info "Escrito ~/.czrc"
  else
    log_info "DRY-RUN: escribiría ~/.czrc"
  fi
else
  log_warn "npm no encontrado; omite instalación de Commitizen"
fi

log_info "[c] Hooks del repositorio (core.hooksPath → .githooks)"

REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
if [[ -d "${REPO_ROOT}/.git" ]]; then
  run git -C "${REPO_ROOT}" config core.hooksPath .githooks
  log_info "Hooks activos desde ${REPO_ROOT}/.githooks (ver .githooks/README.md)"
  log_info "Nota: Husky no es obligatorio; si el equipo lo adopta: npx husky init && migrar scripts a .husky/"
else
  log_warn "No hay ${REPO_ROOT}/.git — clona el repo y vuelve a ejecutar este script para enlazar hooks"
fi

log_info "Listo. Verifica: git config --global --list | grep -E 'user\\.|core\\.|pull\\.|push\\.'"
