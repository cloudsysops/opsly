#!/usr/bin/env bash
# =============================================================================
# Instala y endurece Redis en Ubuntu 20.04/22.04 para medición Opsly (API/Vercel).
#
# Ejecutar EN el VPS (no desde tu Mac), preferiblemente como root:
#   sudo ./scripts/setup-redis-vps.sh
#   sudo ./scripts/setup-redis-vps.sh --dry-run
#
# Idempotente: re-ejecutar actualiza el snippet de configuración y reinicia Redis
# sin rotar la contraseña si ya existe /root/.redis-opsly-password
#
# REDIS_URL (tras el script, sustituye IP por la pública o DNS del VPS):
#   redis://:PASSWORD@IP_DEL_VPS:6379
#   Ejemplo: redis://:abc123...@203.0.113.10:6379
#
# Seguridad:
#   - requirepass + UFW 6379/tcp. Exponer 0.0.0.0 sigue siendo riesgoso en Internet;
#     restringe origen (IP de egress de Vercel, Tailscale, VPN) cuando puedas.
#   - maxmemory + allkeys-lru evitan consumir toda la RAM del VPS.
# =============================================================================
set -euo pipefail

DRY_RUN=false
# Límite de RAM para Redis (eviction LRU cuando se alcanza). Ajusta según VPS.
MAXMEMORY="${REDIS_MAXMEMORY:-256mb}"
# IP mostrada en el resumen final (por defecto primera IP local)
PUBLIC_IP_OVERRIDE="${PUBLIC_IP_OVERRIDE:-}"

PASS_FILE="/root/.redis-opsly-password"
OPS_CONF="/etc/redis/opsly-billing.conf"
REDIS_MAIN_CONF="/etc/redis/redis.conf"

usage() {
  cat <<'EOF'
Uso:
  sudo ./scripts/setup-redis-vps.sh [--dry-run] [--maxmemory 512mb]

Variables opcionales:
  REDIS_MAXMEMORY   Tamaño máximo en Redis (default: 256mb)
  PUBLIC_IP_OVERRIDE  IP o host para imprimir en REDIS_URL al final (ej. IP pública)

Notas:
  - Requiere Ubuntu/Debian con apt.
  - La contraseña se guarda en /root/.redis-opsly-password (600); no se rota en
    ejecuciones posteriores salvo que borres ese archivo.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --maxmemory)
      MAXMEMORY="${2:?}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[setup-redis-vps] argumento desconocido: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

if [[ "${EUID}" -ne 0 && "${DRY_RUN}" != true ]]; then
  echo "[setup-redis-vps] Ejecuta como root o con sudo (o usa --dry-run para simular sin privilegios)." >&2
  exit 1
fi

if [[ "${DRY_RUN}" != true ]] && ! command -v apt-get >/dev/null 2>&1; then
  echo "[setup-redis-vps] Se requiere apt-get (Ubuntu/Debian)." >&2
  exit 1
fi

if [[ "${DRY_RUN}" == true ]]; then
  echo "[setup-redis-vps] (dry-run) se omiten apt-get/dpkg; en el VPS real: apt update && apt install -y redis-server"
else
  echo "[setup-redis-vps] Actualizando índice de paquetes..."
  apt-get update -qq
  if ! dpkg -s redis-server >/dev/null 2>&1; then
    echo "[setup-redis-vps] Instalando redis-server..."
    apt-get install -y redis-server
  else
    echo "[setup-redis-vps] redis-server ya instalado; continuando configuración."
  fi
fi

if [[ ! -f "${PASS_FILE}" ]]; then
  echo "[setup-redis-vps] Generando contraseña y guardándola en ${PASS_FILE}..."
  if [[ "${DRY_RUN}" == true ]]; then
    PASSWORD="dry-run-password-placeholder"
  else
    openssl rand -hex 24 >"${PASS_FILE}"
    chmod 600 "${PASS_FILE}"
    PASSWORD="$(cat "${PASS_FILE}")"
  fi
else
  echo "[setup-redis-vps] Reutilizando contraseña existente (${PASS_FILE})."
  if [[ "${DRY_RUN}" == true ]]; then
    PASSWORD="(existente, dry-run)"
  else
    PASSWORD="$(cat "${PASS_FILE}")"
  fi
fi

# Snippet dedicado: últimas directivas ganan respecto a líneas anteriores en redis.conf
# cuando el include está al final del archivo principal.
write_ops_conf() {
  local pass="$1"
  cat <<EOF
# --- Opsly billing / metering (scripts/setup-redis-vps.sh) ---
# bind explícito para que Vercel u otros clientes remotos puedan conectar con AUTH.
bind 0.0.0.0
requirepass ${pass}
# Con contraseña configurada, permitir acceso autenticado desde fuera de loopback.
protected-mode no
# Evitar que Redis consuma toda la RAM del VPS; eviction LRU en claves.
maxmemory ${MAXMEMORY}
maxmemory-policy allkeys-lru
EOF
}

if [[ "${DRY_RUN}" == true ]]; then
  echo "[dry-run] escribiría ${OPS_CONF} con bind, requirepass, maxmemory ${MAXMEMORY}, allkeys-lru"
else
  write_ops_conf "${PASSWORD}" >"${OPS_CONF}"
  chmod 640 "${OPS_CONF}" || true
fi

if [[ -f "${REDIS_MAIN_CONF}" ]]; then
  if ! grep -qF "include ${OPS_CONF}" "${REDIS_MAIN_CONF}" 2>/dev/null; then
    echo "[setup-redis-vps] Añadiendo include al final de ${REDIS_MAIN_CONF}..."
    if [[ "${DRY_RUN}" == true ]]; then
      echo "[dry-run] printf 'include ${OPS_CONF}' >> ${REDIS_MAIN_CONF}"
    else
      printf '\ninclude %s\n' "${OPS_CONF}" >>"${REDIS_MAIN_CONF}"
    fi
  else
    echo "[setup-redis-vps] include de Opsly ya presente en ${REDIS_MAIN_CONF}."
  fi
elif [[ "${DRY_RUN}" == true ]]; then
  echo "[setup-redis-vps] (dry-run) ${REDIS_MAIN_CONF} no existe en este host; en Ubuntu aparece tras instalar redis-server."
else
  echo "[setup-redis-vps] No se encontró ${REDIS_MAIN_CONF}; revisa el paquete redis-server." >&2
  exit 1
fi

echo "[setup-redis-vps] Configurando firewall (UFW) para 6379/tcp si UFW está disponible..."
if command -v ufw >/dev/null 2>&1; then
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[dry-run] ufw allow 6379/tcp && ufw reload (si aplica)"
  else
    if ufw status 2>/dev/null | grep -qE '6379/tcp|6379 '; then
      echo "[setup-redis-vps] UFW ya tiene regla para 6379; omitiendo."
    else
      ufw allow 6379/tcp
    fi
    # Idempotente: habilitar UFW solo si no está activo (no forzar en hosts sin UFW previo)
    if ufw status 2>/dev/null | grep -q "Status: inactive"; then
      echo "[setup-redis-vps] UFW inactivo; para activar: sudo ufw enable (revisa SSH antes)."
    fi
  fi
else
  echo "[setup-redis-vps] ufw no instalado; abre el puerto 6379 manualmente si usas otro firewall."
fi

echo "[setup-redis-vps] Reiniciando redis-server..."
run systemctl enable redis-server >/dev/null 2>&1 || true
run systemctl restart redis-server
run systemctl is-active --quiet redis-server

if [[ "${DRY_RUN}" != true ]]; then
  export REDISCLI_AUTH="${PASSWORD}"
  if ! redis-cli --no-auth-warning ping 2>/dev/null | grep -q PONG; then
    echo "[setup-redis-vps] Advertencia: redis-cli ping no devolvió PONG; revisa logs: journalctl -u redis-server -n 50" >&2
  else
    echo "[setup-redis-vps] Redis responde PONG con autenticación."
  fi
  unset REDISCLI_AUTH
fi

DISPLAY_IP="${PUBLIC_IP_OVERRIDE}"
if [[ -z "${DISPLAY_IP}" && "${DRY_RUN}" != true ]]; then
  DISPLAY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
if [[ -z "${DISPLAY_IP}" ]]; then
  DISPLAY_IP="IP_DEL_VPS"
fi

echo ""
echo "============================================================================="
echo "  Configuración Opsly Redis — resumen"
echo "============================================================================="
echo "  Archivo de contraseña (root): ${PASS_FILE}"
echo "  Snippet de config:             ${OPS_CONF}"
echo "  maxmemory:                     ${MAXMEMORY} (maxmemory-policy allkeys-lru)"
echo ""
echo "  REDIS_URL para Vercel / Doppler (sustituye host si DISPLAY_IP no es público):"
if [[ "${DRY_RUN}" == true ]]; then
  echo "    redis://:PASSWORD@${DISPLAY_IP}:6379"
else
  # Formato estándar: redis://:password@host:6379 (user vacío, auth en path)
  echo "    redis://:${PASSWORD}@${DISPLAY_IP}:6379"
fi
echo ""
echo "  Si conectas desde fuera del VPS, usa la IP/DNS público del servidor en lugar de"
echo "  la IP privada mostrada arriba."
echo "============================================================================="
