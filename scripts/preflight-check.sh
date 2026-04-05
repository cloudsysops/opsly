#!/usr/bin/env bash
# Verificaciones antes de ./scripts/local-setup.sh (diagnóstico rápido).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

ERRORS=0
WARNINGS=0

ok_line() {
  printf '   ✅ %s\n' "$*"
}

warn_line() {
  printf '   ⚠️  %s\n' "$*"
  WARNINGS=$((WARNINGS + 1))
}

fail_line() {
  printf '   ❌ %s\n' "$*"
  ERRORS=$((ERRORS + 1))
}

cd "${REPO_ROOT}"

SYS_LINE=""
COL_LINE=""
DOC_LINE=""
NODE_LINE=""
SB_LINE=""
PORT_LINES=()
NET_LINE=""
FILES_LINE="todos presentes"
SYS_OK="✅"
COL_OK="✅"
DOC_OK="✅"
NODE_OK="✅"
SB_OK="✅"
PORT_OK="✅"
NET_OK="✅"
FILES_OK="✅"

# --- 1. SISTEMA ---
if [[ "$(uname -s)" == "Darwin" ]]; then
  mac_ver="$(sw_vers -productVersion 2>/dev/null || echo "0.0")"
  maj="${mac_ver%%.*}"
  if [[ "${maj}" =~ ^[0-9]+$ ]] && [[ "${maj}" -lt 12 ]]; then
    fail_line "macOS ${mac_ver} — se requiere >= 12 (Monterey o superior)"
    SYS_OK="❌"
  else
    ok_line "macOS ${mac_ver}"
  fi

  ram_bytes="$(sysctl -n hw.memsize 2>/dev/null || echo 0)"
  ram_gb=$((ram_bytes / 1024 / 1024 / 1024))
  if [[ "${ram_gb}" -lt 6 ]]; then
    fail_line "RAM ~${ram_gb}GB — se recomiendan >= 6 GB"
    SYS_OK="❌"
  else
    ok_line "RAM ~${ram_gb} GB"
  fi

  free_kb="$(df -k / 2>/dev/null | tail -1 | awk '{print $4}')"
  free_gb=$((free_kb / 1024 / 1024))
  if [[ "${free_gb}" -lt 10 ]]; then
    fail_line "Espacio libre en / ~${free_gb} GB — se recomiendan >= 10 GB"
    SYS_OK="❌"
  else
    ok_line "Disco / ~${free_gb} GB libres"
  fi
  SYS_LINE="macOS ${mac_ver}, ~${ram_gb} GB RAM, ~${free_gb} GB libres en /"
else
  warn_line "No es macOS: se omiten comprobaciones sw_vers/RAM específicas"
  SYS_LINE="$(uname -s) (sin checks macOS completos)"
fi

# --- 2. HERRAMIENTAS ---
check_cmd() {
  local cmd="$1" brew_hint="$2"
  if command -v "${cmd}" >/dev/null 2>&1; then
    local ver="—"
    case "${cmd}" in
      colima) ver="$(colima version 2>/dev/null | head -1 || echo "?")" ;;
      docker) ver="$(docker version --format '{{.Client.Version}}' 2>/dev/null || docker --version 2>/dev/null || echo "?")" ;;
      node)
        ver="$(node --version 2>/dev/null || echo "?")"
        if [[ ! "${ver}" =~ ^v20\. ]]; then
          fail_line "Node ${ver} — se requiere v20.x (brew install node@20)"
          NODE_OK="❌"
          return
        fi
        ;;
      npm) ver="$(npm --version 2>/dev/null || echo "?")" ;;
      supabase) ver="$(supabase --version 2>/dev/null || echo "?")" ;;
      jq) ver="$(jq --version 2>/dev/null || echo "?")" ;;
      git) ver="$(git --version 2>/dev/null | awk '{print $3}' || echo "?")" ;;
    esac
    ok_line "${cmd} ${ver}"
  else
    fail_line "${cmd} no encontrado — ${brew_hint}"
    case "${cmd}" in
      docker) DOC_OK="❌" ;;
      node) NODE_OK="❌" ;;
      supabase) SB_OK="❌" ;;
    esac
  fi
}

check_cmd colima "brew install colima"
check_cmd docker "brew install docker"
check_cmd node "brew install node@20"
check_cmd npm "viene con Node"
check_cmd supabase "brew install supabase/tap/supabase"
check_cmd jq "brew install jq"
check_cmd git "brew install git"

COL_LINE="$(colima version 2>/dev/null | head -1 || echo '?')"
DOC_LINE="?"
if command -v docker >/dev/null 2>&1; then
  DOC_LINE="$(docker version --format '{{.Client.Version}}' 2>/dev/null || echo '?')"
fi
NODE_LINE="$(command -v node >/dev/null && node --version 2>/dev/null || echo '?')"
SB_LINE="$(command -v supabase >/dev/null && supabase --version 2>/dev/null || echo '?')"

# --- 3. COLIMA + DOCKER ---
if command -v colima >/dev/null 2>&1; then
  if colima status 2>/dev/null | grep -qi running; then
    ok_line "Colima Running"
    COL_LINE="v0.x — Running"
  else
    warn_line "Colima no está Running — ejecuta: colima start --cpu 4 --memory 8"
    COL_LINE="no Running (ver arriba)"
    COL_OK="⚠️"
  fi
fi

if command -v docker >/dev/null 2>&1; then
  if docker ps >/dev/null 2>&1; then
    ok_line "docker ps (socket OK)"
  else
    fail_line "docker ps falló — inicia Colima o revisa DOCKER_HOST"
    DOC_OK="❌"
  fi
fi

# --- 4. RED (puertos) ---
check_port() {
  local port="$1" name="$2"
  local pids
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null | tail -n +2 || true)"
  else
    pids=""
  fi
  if [[ -n "${pids}" ]]; then
    local proc
    proc="$(echo "${pids}" | awk '{print $1" PID "$2}' | head -2 | tr '\n' ' ')"
    warn_line "Puerto ${port} (${name}) ocupado — ${proc}"
    PORT_LINES+=("${port} (${name}) ${proc}")
    PORT_OK="⚠️"
  else
    ok_line "Puerto ${port} (${name}) libre"
  fi
}

check_port 80 "HTTP / Traefik"
check_port 8080 "Traefik dashboard"
check_port 6379 "Redis"
check_port 54321 "Supabase API"
check_port 3000 "API (host directo)"
check_port 3001 "Admin (host directo)"

# --- 5. ARCHIVOS ---
if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  ok_line ".env.local existe"
else
  warn_line ".env.local no existe — local-setup creará desde .env.local.example"
fi

missing_file=0
for f in \
  infra/docker-compose.local.yml \
  infra/templates/docker-compose.tenant.yml.tpl \
  apps/api/Dockerfile \
  apps/admin/Dockerfile; do
  if [[ ! -f "${REPO_ROOT}/${f}" ]]; then
    fail_line "Falta archivo: ${f}"
    missing_file=1
    FILES_OK="❌"
  fi
done
if [[ "${missing_file}" -eq 0 ]]; then
  ok_line "Compose, template y Dockerfiles presentes"
fi

sql_n=0
if [[ -d "${REPO_ROOT}/supabase/migrations" ]]; then
  sql_n="$(find "${REPO_ROOT}/supabase/migrations" -maxdepth 1 -name '*.sql' -type f 2>/dev/null | wc -l | tr -d ' ')"
fi
if [[ "${sql_n}" -ge 4 ]]; then
  ok_line "supabase/migrations: ${sql_n} archivos .sql"
else
  fail_line "supabase/migrations: solo ${sql_n} .sql (se esperan >= 4)"
  FILES_LINE="faltan migraciones o directorio"
  FILES_OK="❌"
fi

# --- 6. DOCKER red + imagen ---
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
  if docker network inspect traefik-local >/dev/null 2>&1; then
    ok_line "Red traefik-local existe"
    NET_LINE="traefik-local existe"
  else
    warn_line "Red traefik-local no existe — crea con: docker network create traefik-local"
    NET_LINE="ausente — docker network create traefik-local"
    NET_OK="⚠️"
  fi

  if docker images -q node:20-alpine 2>/dev/null | grep -q .; then
    ok_line "Imagen node:20-alpine presente localmente"
  else
    warn_line "node:20-alpine no está en caché — el primer build descargará capas"
  fi
fi

# --- 7. SUPABASE ---
if command -v supabase >/dev/null 2>&1; then
  if supabase status >/dev/null 2>&1; then
    ok_line "Supabase local en ejecución (supabase status OK)"
  else
    warn_line "Supabase no está levantado — local-setup ejecutará supabase start"
    SB_OK="⚠️"
  fi
fi

# --- REPORTE FINAL ---
echo ""
echo "   ┌─────────────────────────────────────┐"
echo "   │  intcloudsysops — Pre-flight Check  │"
echo "   └─────────────────────────────────────┘"
echo "   ${SYS_OK} Sistema    ${SYS_LINE:-—}"
echo "   ${COL_OK} Colima     ${COL_LINE:-—}"
echo "   ${DOC_OK} Docker     ${DOC_LINE:-—}"
echo "   ${NODE_OK} Node       ${NODE_LINE:-—}"
echo "   ${SB_OK} Supabase   ${SB_LINE:-—}"
if [[ ${#PORT_LINES[@]} -gt 0 ]]; then
  for p in "${PORT_LINES[@]}"; do
    echo "   ⚠️  Puerto     ${p} ocupado"
  done
else
  echo "   ${PORT_OK} Puertos    80,8080,6379,54321,3000,3001 libres (LISTEN)"
fi
echo "   ${NET_OK} Red        ${NET_LINE:-—}"
echo "   ${FILES_OK} Archivos   ${FILES_LINE}"

echo ""
if [[ "${ERRORS}" -eq 0 ]]; then
  echo "   Resultado: LISTO PARA SETUP (o solo advertencias menores)"
  exit 0
fi

echo "   Resultado: RESOLVER ${ERRORS} ISSUE(S) ANTES — ${WARNINGS} advertencia(s)"
exit 1
