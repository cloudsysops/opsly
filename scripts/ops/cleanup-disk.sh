#!/usr/bin/env bash
# Limpieza segura de disco en el VPS Opsly (Ubuntu + Docker).
# Ejecutar EN EL SERVIDOR:  ssh vps-dragon  →  bash /opt/opsly/scripts/cleanup-vps.sh
# Requiere: usuario en grupo `docker` o sudo para docker/journal/apt.
#
# Opciones:
#   --dry-run   Solo muestra comandos; no borra nada.
#   -h, --help  Esta ayuda.
#
# Riesgos documentados antes de cada paso interactivo.

set -euo pipefail

DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -22
      exit 0
      ;;
    *)
      echo "[cleanup-vps] Opción desconocida: $1 (usa --help)" >&2
      exit 1
      ;;
  esac
done

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

confirm() {
  local msg="$1"
  local ans
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] confirm: ${msg} → asumiría sí"
    return 0
  fi
  read -r -p "${msg} ¿Continuar? [s/N]: " ans || true
  case "${ans,,}" in
    s | sí | si | y | yes) return 0 ;;
    *) return 1 ;;
  esac
}

echo "═══════════════════════════════════════════════════════════════"
echo "  Opsly — cleanup-vps.sh  (dry-run=${DRY_RUN})"
echo "═══════════════════════════════════════════════════════════════"
echo "Estado inicial:"
df -h / | tail -1
echo ""
if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null || true
  echo ""
fi

# --- 1) Docker: solo imágenes huérfanas (NO usar `docker system prune -a` aquí: borra
#     contenedores PARADOS y luego puede tumbar stacks compose intencionalmente detenidos). ---
echo "----------------------------------------------------------------"
echo "PASO 1 — docker image prune -a"
echo "  Elimina imágenes no referenciadas por NINGÚN contenedor (ni siquiera parado)."
echo "  NO elimina contenedores parados (a diferencia de \`docker system prune -a\`)."
echo "  Libera capas GHCR antiguas con menos riesgo operativo."
echo "----------------------------------------------------------------"
if confirm "¿Ejecutar \`docker image prune -a -f\`?"; then
  run docker image prune -a -f
else
  echo "[cleanup-vps] Paso 1 omitido."
fi
echo ""

# --- 2) Docker: volúmenes huérfanos ---
echo "----------------------------------------------------------------"
echo "PASO 2 — docker volume prune"
echo "  RIESGO ALTO: Borra volúmenes Docker NO usados por ningún contenedor."
echo "  Si un stack tenant está parado y guardaba datos en un volumen nombrado,"
echo "  podría perderse al recrear. Revisa \`docker volume ls\` antes."
echo "----------------------------------------------------------------"
if confirm "¿Ejecutar \`docker volume prune -f\`?"; then
  run docker volume prune -f
else
  echo "[cleanup-vps] Paso 2 omitido."
fi
echo ""

# --- 3) Journald ---
echo "----------------------------------------------------------------"
echo "PASO 3 — journalctl --vacuum-time=7d"
echo "  Recorta logs del sistema a ~7 días (journald)."
echo "----------------------------------------------------------------"
if confirm "¿Reducir journal a 7 días?"; then
  run ${SUDO} journalctl --vacuum-time=7d
else
  echo "[cleanup-vps] Paso 3 omitido."
fi
echo ""

# --- 4) APT ---
echo "----------------------------------------------------------------"
echo "PASO 4 — apt clean + autoremove"
echo "  Elimina paquetes .deb en caché y dependencias huérfanas."
echo "----------------------------------------------------------------"
if confirm "¿Ejecutar apt clean y autoremove?"; then
  run ${SUDO} apt-get clean
  run ${SUDO} apt-get autoremove -y
else
  echo "[cleanup-vps] Paso 4 omitido."
fi
echo ""

# --- 5) Logs de aplicación en /opt/opsly/runtime/logs/ ---
OPS_LOG_DIR="/opt/opsly/runtime/logs/"
if [[ -d "${OPS_LOG_DIR}" ]]; then
  echo "----------------------------------------------------------------"
  echo "PASO 5 — Comprimir logs .log antiguos en ${OPS_LOG_DIR}"
  echo "  Solo archivos *.log mayores a 1M y con mtime >7 días (find)."
  echo "----------------------------------------------------------------"
  if confirm "¿Comprimir con gzip logs antiguos grandes?"; then
    if [[ "${DRY_RUN}" == "true" ]]; then
      echo "[dry-run] find ${OPS_LOG_DIR} -name '*.log' -size +1M -mtime +7 -exec gzip -k {} \\;"
    else
      find "${OPS_LOG_DIR}" -type f -name '*.log' -size +1M -mtime +7 -print 2>/dev/null | while read -r f; do
        [[ -f "$f" ]] || continue
        gzip -k -f -- "$f" && echo "[cleanup-vps] gzip: $f"
      done || true
    fi
  else
    echo "[cleanup-vps] Paso 5 omitido."
  fi
else
  echo "[cleanup-vps] No existe ${OPS_LOG_DIR}; paso 5 omitido."
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "Estado final:"
df -h / | tail -1
if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null || true
fi
echo "[cleanup-vps] Fin."
