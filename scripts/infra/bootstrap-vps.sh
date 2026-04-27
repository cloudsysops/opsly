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
# shellcheck source=scripts/lib/common.sh
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
run mkdir -p "${OPS_ROOT}/runtime/tenants" "${OPS_ROOT}/runtime/letsencrypt"
run chmod 700 "${OPS_ROOT}/runtime/letsencrypt"
run chmod 755 "${OPS_ROOT}/runtime/tenants"

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
# shellcheck disable=SC1090
set -a
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
if [[ ! -f "${OPS_ROOT}/runtime/letsencrypt/acme.json" ]]; then
  run touch "${OPS_ROOT}/runtime/letsencrypt/acme.json"
fi
run chmod 600 "${OPS_ROOT}/runtime/letsencrypt/acme.json"

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

log_info "[j] Docker Engine — daemon.json min-api-version (idempotente con merge JSON)"
# Traefik v3 cliente Go negocia API 1.24; Docker 29.3.1 exige mínimo 1.40.
# Solución: bajar el mínimo del daemon a 1.24 para permitir clientes legacy.
# Idempotente: si el archivo existe con otras claves, hace merge con python3.
# No reinicia dockerd: aplica cambios con sudo systemctl restart docker manual.
DAEMON_JSON="/etc/docker/daemon.json"
if ! command -v sudo >/dev/null 2>&1; then
  log_warn "sudo no disponible; no se puede configurar ${DAEMON_JSON}."
  echo "  Crea manualmente (si no existe): echo '{\"min-api-version\": \"1.24\"}' | sudo tee ${DAEMON_JSON}" >&2
elif ! sudo -n true 2>/dev/null; then
  log_warn "sudo sin contraseña (sudo -n) no disponible; no se puede configurar ${DAEMON_JSON}."
  echo "  Crea manualmente (si no existe): echo '{\"min-api-version\": \"1.24\"}' | sudo tee ${DAEMON_JSON}" >&2
else
  # Usa python3 para hacer merge JSON idempotente
  if sudo test ! -f "${DAEMON_JSON}"; then
    # Archivo no existe: crear con min-api-version
    printf '%s\n' '{"min-api-version": "1.24"}' | sudo tee "${DAEMON_JSON}" >/dev/null
    log_info "Creado ${DAEMON_JSON} con min-api-version: 1.24"
  else
    # Archivo existe: hacer merge con python3 (añadir min-api-version si no existe)
    if command -v python3 >/dev/null 2>&1; then
      sudo python3 << 'PYTHON'
import json
import sys
DAEMON_JSON = "/etc/docker/daemon.json"
try:
  with open(DAEMON_JSON, 'r') as f:
    cfg = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
  print(f"Error leyendo {DAEMON_JSON}: {e}", file=sys.stderr)
  cfg = {}
if "min-api-version" not in cfg:
  cfg["min-api-version"] = "1.24"
  with open(DAEMON_JSON, 'w') as f:
    json.dump(cfg, f, indent=2)
  print(f"Actualizado {DAEMON_JSON}: añadido min-api-version: 1.24")
else:
  print(f"{DAEMON_JSON}: min-api-version ya existe (idempotente)")
PYTHON
    else
      log_warn "python3 no disponible para merge JSON; intentando jq..."
      if command -v jq >/dev/null 2>&1; then
        TEMP="$(mktemp)"
        sudo jq '. + {"min-api-version": "1.24"}' "${DAEMON_JSON}" | sudo tee "${TEMP}" >/dev/null
        sudo mv "${TEMP}" "${DAEMON_JSON}"
        log_info "Actualizado ${DAEMON_JSON} con jq: añadido min-api-version: 1.24"
      else
        log_warn "Ni python3 ni jq disponibles; no se puede hacer merge JSON."
        echo "  Edita ${DAEMON_JSON} manualmente y añade: \"min-api-version\": \"1.24\"" >&2
      fi
    fi
  fi
fi
echo ""
echo "⚠️  Tras crear o editar ${DAEMON_JSON}, aplica con reinicio manual (afecta todos los contenedores):"
echo "    sudo systemctl restart docker"
echo ""

log_info "[h] Resumen"
echo ""
echo "--- Nombres de variables en .env (sin valores) ---"
run grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" | cut -d= -f1 | sort -u || true
echo ""
echo "--- Directorios ---"
echo "  ${OPS_ROOT}/runtime/tenants"
echo "  ${OPS_ROOT}/runtime/letsencrypt"
echo ""
echo "--- Red ---"
docker network inspect traefik-public --format '{{.Name}}' 2>/dev/null || true
echo ""
log_info "Siguiente paso en el VPS:"
echo "  cd ${OPS_ROOT} && ./scripts/vps-first-run.sh"
