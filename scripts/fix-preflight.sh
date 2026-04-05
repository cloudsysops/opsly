#!/usr/bin/env bash
# Resuelve issues habituales detectados por preflight-check.sh.
# Ejecutar: ./scripts/fix-preflight.sh
# Requiere: Homebrew, zsh; sudo solo si matas un proceso en el puerto 3000 (confirm).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

F1="❌"
F2="❌"
F3="❌"
F4="❌"
F5="❌"
F1_DETAIL="—"
F2_DETAIL="—"
F3_DETAIL="—"
F4_DETAIL="—"
F5_DETAIL="—"
DOCKER_UP=0

if ! command -v brew >/dev/null 2>&1; then
  die "Homebrew no está en PATH. Instálalo desde https://brew.sh" 2
fi

BREW_PREFIX="$(brew --prefix)"

# ─── FIX 1 — Node v20 ─────────────────────────────────────
log_info "Fix 1: Node v20"
if run brew install node@20; then
  ZSHRC="${HOME}/.zshrc"
  PATH_LINE="export PATH=\"${BREW_PREFIX}/opt/node@20/bin:\$PATH\""
  if [[ -f "${ZSHRC}" ]] && grep -qF "opt/node@20/bin" "${ZSHRC}" 2>/dev/null; then
    log_info "${ZSHRC} ya referencia node@20"
  else
    {
      echo ""
      echo "# intcloudsysops fix-preflight (node@20)"
      echo "${PATH_LINE}"
    } >>"${ZSHRC}"
    log_info "Añadido node@20 al PATH en ~/.zshrc"
  fi

  brew unlink node 2>/dev/null || true
  if run brew link node@20 --force --overwrite; then
    export PATH="${BREW_PREFIX}/opt/node@20/bin:${PATH}"
    nv="$(node --version 2>/dev/null || echo "")"
    if [[ "${nv}" =~ ^v20\. ]]; then
      F1="✅"
      F1_DETAIL="${nv} activo"
    else
      die "node --version es '${nv}' (se esperaba v20.x). Cierra la terminal, abre una nueva, o ejecuta: export PATH=\"${BREW_PREFIX}/opt/node@20/bin:\$PATH\"" 1
    fi
  else
    log_warn "brew link node@20 falló"
    F1_DETAIL="link fallido"
  fi
else
  log_warn "brew install node@20 falló"
  F1_DETAIL="brew install fallido"
fi

# ─── FIX 2 — Docker Compose plugin ────────────────────────
log_info "Fix 2: Docker Compose (plugin CLI)"
if docker compose version >/dev/null 2>&1; then
  F2="✅"
  F2_DETAIL="ya configurado"
else
  if run brew install docker-compose; then
    DC_BIN="${BREW_PREFIX}/opt/docker-compose/bin/docker-compose"
    if [[ ! -x "${DC_BIN}" ]]; then
      DC_BIN="$(brew --prefix docker-compose 2>/dev/null)/bin/docker-compose"
    fi
    if [[ -x "${DC_BIN}" ]]; then
      run mkdir -p "${HOME}/.docker/cli-plugins"
      run ln -sfn "${DC_BIN}" "${HOME}/.docker/cli-plugins/docker-compose"
      if docker compose version >/dev/null 2>&1; then
        F2="✅"
        F2_DETAIL="docker compose version OK"
      else
        log_warn "docker compose version sigue fallando tras el symlink"
        F2_DETAIL="symlink hecho, compose no responde"
      fi
    else
      log_warn "No se encontró el binario docker-compose de Homebrew en ${DC_BIN}"
      F2_DETAIL="binario no encontrado"
    fi
  else
    log_warn "brew install docker-compose falló"
    F2_DETAIL="brew install fallido"
  fi
fi

# ─── FIX 3 — Colima ───────────────────────────────────────
log_info "Fix 3: Colima"
if ! command -v colima >/dev/null 2>&1; then
  log_warn "colima no instalado (brew install colima)"
  F3_DETAIL="colima ausente"
else
  if colima status 2>/dev/null | grep -qi running; then
    F3="✅"
    F3_DETAIL="ya Running"
  else
    if run colima start --cpu 4 --memory 8; then
      waited=0
      while [[ "${waited}" -lt 60 ]]; do
        if docker ps >/dev/null 2>&1; then
          break
        fi
        sleep 5
        waited=$((waited + 5))
      done
      if docker ps >/dev/null 2>&1; then
        F3="✅"
        F3_DETAIL="Running"
      else
        log_warn "docker ps no respondió en 60s tras colima start"
        F3_DETAIL="docker no listo"
      fi
    else
      log_warn "colima start falló"
      F3_DETAIL="start fallido"
    fi
  fi
fi

if docker ps >/dev/null 2>&1; then
  DOCKER_UP=1
else
  log_warn "Docker no disponible: se omite Fix 4 (red traefik-local)"
fi

# ─── FIX 4 — Red traefik-local ────────────────────────────
if [[ "${DOCKER_UP}" -eq 1 ]]; then
  log_info "Fix 4: red traefik-local"
  if docker network inspect traefik-local >/dev/null 2>&1; then
    F4="✅"
    F4_DETAIL="ya existía"
  else
    if run docker network create traefik-local && docker network inspect traefik-local >/dev/null 2>&1; then
      F4="✅"
      F4_DETAIL="creada"
    else
      log_warn "No se pudo crear o inspeccionar traefik-local"
      F4_DETAIL="fallo"
    fi
  fi
else
  F4_DETAIL="omitido (sin Docker)"
fi

# ─── FIX 5 — Puerto 3000 (host; no requiere Docker) ───────
log_info "Fix 5: puerto 3000"
PIDS="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"
if [[ -z "${PIDS}" ]]; then
  F5="✅"
  F5_DETAIL="ya libre"
else
  log_info "Proceso(s) en :3000:"
  lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true
  if confirm "¿Enviar señal TERM a PID(s): ${PIDS} ?"; then
    for pid in ${PIDS}; do
      run kill "${pid}" 2>/dev/null || log_warn "kill ${pid} falló (¿permisos? prueba sudo)"
    done
    sleep 3
    if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
      log_warn "Puerto 3000 sigue en uso"
      F5_DETAIL="aún ocupado"
    else
      F5="✅"
      F5_DETAIL="libre"
    fi
  else
    log_info "Sin cambios en el puerto 3000"
    F5_DETAIL="ocupado (sin matar)"
  fi
fi

# ─── REPORTE ───────────────────────────────────────────────
echo ""
echo "┌─────────────────────────────────────┐"
echo "│  intcloudsysops — Pre-flight Fixes  │"
echo "└─────────────────────────────────────┘"
echo "${F1} Fix 1  Node      → ${F1_DETAIL}"
echo "${F2} Fix 2  Compose   → ${F2_DETAIL}"
echo "${F3} Fix 3  Colima    → ${F3_DETAIL}"
echo "${F4} Fix 4  Red       → ${F4_DETAIL}"
echo "${F5} Fix 5  Puerto    → ${F5_DETAIL}"
echo ""
echo "Siguiente paso:"
echo "  ./scripts/preflight-check.sh   ← debe salir sin errores"
echo "  ./scripts/local-setup.sh         ← levanta el stack completo"
echo ""
