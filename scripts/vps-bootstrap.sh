#!/usr/bin/env bash
# PRIMER DEPLOY — ejecutar en orden:
#
# 0. El repo debe existir en ${OPS_ROOT:-/opt/opsly} (con scripts/lib/common.sh).
#    Si aún no está:
#      sudo mkdir -p /opt/opsly && sudo chown -R vps-dragon:vps-dragon /opt/opsly
#      git clone git@github.com:cloudsysops/opsly.git /opt/opsly   # ajusta URL
#
# 1. Desde tu máquina (requiere repo clonado en el VPS con scripts/lib/common.sh):
#    ssh vps-dragon@TU_HOST 'bash /opt/opsly/scripts/vps-bootstrap.sh'
#
#    No uses `ssh … 'bash -s' < scripts/vps-bootstrap.sh` sin tener también common.sh
#    en el servidor; el pipe solo envía este archivo.
#
# 2. En el VPS:
#    cd /opt/opsly && ./scripts/vps-first-run.sh
#
# 3. Verificar:
#    curl https://api.TU_DOMINIO/api/health
#
# DEPLOYS SIGUIENTES (CI o manual):
#    cd /opt/opsly && ./scripts/vps-deploy.sh
#
set -euo pipefail

OPS_ROOT="${OPS_ROOT:-/opt/opsly}"

_resolve_common_sh() {
  local src="${BASH_SOURCE[0]:-}"
  if [[ -n "$src" ]] && [[ "$src" != "-" ]] && [[ "$src" != *"/dev/fd/"* ]]; then
    local d
    d="$(cd "$(dirname "$src")" && pwd)"
    if [[ -f "${d}/lib/common.sh" ]]; then
      echo "${d}/lib/common.sh"
      return 0
    fi
  fi
  if [[ -f "${OPS_ROOT}/scripts/lib/common.sh" ]]; then
    echo "${OPS_ROOT}/scripts/lib/common.sh"
    return 0
  fi
  return 1
}

COMMON_SH="$(_resolve_common_sh)" || {
  echo "ERROR: No se encuentra scripts/lib/common.sh. Clona el repo en ${OPS_ROOT} y ejecuta:" >&2
  echo "  bash ${OPS_ROOT}/scripts/vps-bootstrap.sh" >&2
  exit 1
}
# shellcheck source=lib/common.sh
# shellcheck disable=SC1091
source "${COMMON_SH}"

require_cmd docker git doppler jq

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose (plugin) no disponible" 2
fi

log_info "[a] Usuario (debe ser vps-dragon, no root)"
if [[ "$(id -un)" != "vps-dragon" ]]; then
  die "Ejecuta como vps-dragon (actual: $(id -un))" 1
fi
if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  die "No ejecutes como root" 1
fi

log_info "[b] Dependencias ya verificadas (docker, compose, git, doppler, jq)"

log_info "[c] Directorios bajo ${OPS_ROOT}"
if [[ ! -d "${OPS_ROOT}" ]]; then
  die "Crea ${OPS_ROOT} y clona el repo (p. ej. sudo mkdir -p ${OPS_ROOT} && sudo chown -R vps-dragon:vps-dragon ${OPS_ROOT})" 1
fi
run mkdir -p "${OPS_ROOT}/tenants" "${OPS_ROOT}/letsencrypt"
run chmod 700 "${OPS_ROOT}/letsencrypt"
run chmod 755 "${OPS_ROOT}/tenants"

DOPPLER_PROJECT="${DOPPLER_PROJECT:-}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-}"
if [[ -z "${DOPPLER_PROJECT}" || -z "${DOPPLER_CONFIG}" ]] && [[ -f "${OPS_ROOT}/config/opsly.config.json" ]] && command -v jq >/dev/null 2>&1; then
  [[ -z "${DOPPLER_PROJECT}" ]] && DOPPLER_PROJECT="$(jq -r '.project.doppler_project // empty' "${OPS_ROOT}/config/opsly.config.json")"
  [[ -z "${DOPPLER_CONFIG}" ]] && DOPPLER_CONFIG="$(jq -r '.project.doppler_config // empty' "${OPS_ROOT}/config/opsly.config.json")"
fi
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"

ENV_FILE="${OPS_ROOT}/.env"

log_info "[d] Red Docker traefik-public"
if docker network inspect traefik-public >/dev/null 2>&1; then
  log_info "traefik-public ya existe"
else
  run docker network create traefik-public
fi

log_info "[e] Descargar secrets Doppler → ${ENV_FILE}"
run doppler secrets download \
  --project "${DOPPLER_PROJECT}" \
  --config "${DOPPLER_CONFIG}" \
  --no-file \
  --format env >"${ENV_FILE}.tmp"
run mv "${ENV_FILE}.tmp" "${ENV_FILE}"
run chmod 600 "${ENV_FILE}"

log_info "[f] Variables críticas en .env"
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

CRITICAL_VARS=(
  PLATFORM_DOMAIN
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  PLATFORM_ADMIN_TOKEN
  REDIS_PASSWORD
  ACME_EMAIL
  PLATFORM_TENANTS_HOST_PATH
)
missing=()
for k in "${CRITICAL_VARS[@]}"; do
  if [[ -z "${!k:-}" ]]; then
    missing+=("$k")
  fi
done
if (( ${#missing[@]} > 0 )); then
  die "Faltan o están vacías en ${ENV_FILE}: ${missing[*]}" 1
fi

log_info "[g] acme.json (host, permisos; Traefik usa volumen nombrado en compose)"
if [[ ! -f "${OPS_ROOT}/letsencrypt/acme.json" ]]; then
  run touch "${OPS_ROOT}/letsencrypt/acme.json"
fi
run chmod 600 "${OPS_ROOT}/letsencrypt/acme.json"

log_info "[i] DOCKER_GID — GID del socket Docker para Traefik (group_add en compose)"
# Traefik necesita el mismo GID numérico que el grupo propietario de /var/run/docker.sock en el host.
if [[ -S /var/run/docker.sock ]]; then
  DOCKER_GID="$(stat -c %g /var/run/docker.sock)"
  if ! grep -q '^DOCKER_GID=' "${ENV_FILE}" 2>/dev/null; then
    echo "DOCKER_GID=${DOCKER_GID}" >>"${ENV_FILE}"
    log_info "Añadido DOCKER_GID=${DOCKER_GID} a ${ENV_FILE}"
  else
    log_info "DOCKER_GID ya definido en ${ENV_FILE} (no se sobrescribe)"
  fi
  echo "Docker socket GID: ${DOCKER_GID}"
else
  echo "⚠️  /var/run/docker.sock no es un socket; no se pudo obtener DOCKER_GID" >&2
fi

log_info "[j] Docker Engine — min-api-version (clientes API legacy; Traefik con Docker 29)"
# Traefik 3.1 usa un cliente Docker que negocia API 1.24; Docker Engine 29 puede exigir mínimo ≥1.40.
# Bajar el mínimo en el daemon permite el provider Docker de Traefik sin exponer TCP ni cambiar Traefik.
# No reiniciamos dockerd desde este script (afecta todos los contenedores).
DAEMON_JSON="/etc/docker/daemon.json"
if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  dj_status="$(sudo python3 <<'PY'
import json
import os
import sys

path = "/etc/docker/daemon.json"
cfg = {}
if os.path.isfile(path):
    try:
        with open(path, encoding="utf-8") as f:
            cfg = json.load(f)
    except json.JSONDecodeError:
        print("ERR_JSON")
        sys.exit(0)

before = json.dumps(cfg, sort_keys=True)
cfg["min-api-version"] = "1.24"
after = json.dumps(cfg, sort_keys=True)
if before == after:
    print("UNCHANGED")
else:
    d = os.path.dirname(path) or "."
    os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")
    print("UPDATED")
PY
)"
  case "${dj_status}" in
    UPDATED)
      log_info "Fusionado ${DAEMON_JSON} con min-api-version=1.24."
      ;;
    UNCHANGED)
      log_info "${DAEMON_JSON} ya tenía min-api-version=1.24."
      ;;
    ERR_JSON)
      log_warn "${DAEMON_JSON} existe pero no es JSON válido; corrígelo a mano y vuelve a ejecutar."
      ;;
    *)
      log_warn "Resultado inesperado al actualizar daemon.json: ${dj_status:-vacío}"
      ;;
  esac
else
  log_warn "Sin sudo sin contraseña (sudo -n); no se modificó ${DAEMON_JSON}."
  echo "  Fusiona manualmente con sudo (editor o tee) para incluir en el JSON raíz:"
  echo '    "min-api-version": "1.24"'
fi
echo ""
echo "  Tras cambiar ${DAEMON_JSON}, reinicia Docker en el VPS (afecta todos los contenedores):"
echo "    sudo systemctl restart docker"
echo ""

log_info "[h] Resumen"
echo ""
echo "--- Nombres de variables en .env (sin valores) ---"
run grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" | cut -d= -f1 | sort -u || true
echo ""
echo "--- Directorios ---"
echo "  ${OPS_ROOT}/tenants"
echo "  ${OPS_ROOT}/letsencrypt"
echo ""
echo "--- Red ---"
docker network inspect traefik-public --format '{{.Name}}' 2>/dev/null || true
echo ""
log_info "Siguiente paso en el VPS:"
echo "  cd ${OPS_ROOT} && ./scripts/vps-first-run.sh"
