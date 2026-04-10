#!/usr/bin/env bash
# Blindaje de VPS: Tailscale + UFW. Ejecutar **en el servidor** (no desde Mac), con sudo.
#
# - Instala Tailscale si falta; NO ejecuta `tailscale up` (autenticación en navegador).
# - UFW: denegar entrada por defecto; permitir salida; permitir TODO desde 100.64.0.0/10
#   (rango CGNAT de Tailscale: administración SSH, Redis vía tailnet si aplica, etc.).
# - Opcional: 80/443 públicos para Traefik / webhooks (sin abrir 22 ni 6379 al mundo).
#
# Por qué 100.64.0.0/10: es el bloque que Tailscale usa para IPs de la overlay; solo nodos
# autenticados en tu tailnet obtienen direcciones ahí. No confundir con 10.0.0.0/8 privado RFC1918.
set -euo pipefail

readonly TS_CIDR="100.64.0.0/10"
DRY_RUN=false
FORCE=false
RESET_UFW=false
ALLOW_PUBLIC_WEB=true

usage() {
  cat <<'EOF'
Blindaje VPS: Tailscale + UFW (ejecutar en el servidor con sudo).

Uso:
  sudo ./scripts/secure-vps-with-tailscale.sh [opciones]

Opciones:
  --dry-run              Solo muestra comandos; no modifica el sistema.
  --force                Omite comprobaciones de Tailscale / origen SSH (riesgo de bloqueo).
  --reset-ufw            ufw --force reset antes de aplicar reglas.
  --no-public-web        No abre 80/tcp ni 443/tcp al público.
  -h, --help             Esta ayuda.

Requisitos:
  - VPS Ubuntu/Debian. Tras instalar Tailscale: sudo tailscale up (navegador).
  - Mejor tener consola del proveedor o SSH ya por IP Tailscale antes de activar UFW.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --reset-ufw)
      RESET_UFW=true
      shift
      ;;
    --no-public-web)
      ALLOW_PUBLIC_WEB=false
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "[secure-vps-with-tailscale] argumento desconocido: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

# IPv4 en 100.64.0.0/10 (Tailscale)
is_tailscale_ipv4() {
  local ip="$1"
  local a b _rest
  IFS=. read -r a b _rest <<<"${ip}" || return 1
  [[ "${a}" == "100" ]] || return 1
  [[ "${b}" =~ ^[0-9]+$ ]] || return 1
  ((b >= 64 && b <= 127))
}

ensure_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "[secure-vps-with-tailscale] Ejecuta con sudo o como root." >&2
    exit 1
  fi
}

install_tailscale_if_missing() {
  if command -v tailscale >/dev/null 2>&1; then
    echo "[secure-vps-with-tailscale] tailscale ya está instalado: $(command -v tailscale)"
    return 0
  fi
  echo "[secure-vps-with-tailscale] Instalando Tailscale (curl | sh oficial)..."
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo '[dry-run] curl -fsSL https://tailscale.com/install.sh | sh'
    return 0
  fi
  curl -fsSL https://tailscale.com/install.sh | sh
}

tailscale_ipv4() {
  tailscale ip -4 2>/dev/null | head -n1 | tr -d '[:space:]' || true
}

print_tailscale_up_instructions() {
  cat <<'EOF'

=== Tailscale: enlace manual (obligatorio la primera vez) ===
No se ejecuta `tailscale up` desde este script (debes autorizar en el navegador).

  sudo tailscale up

Copia la URL que muestre la CLI, ábrela en el navegador y completa el login.
Comprueba después:

  tailscale status
  tailscale ip -4

Usa la IPv4 de Tailscale del VPS en .env / SSH (ej. ssh usuario@100.x.y.z).

EOF
}

check_tailscale_connected() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] omitiendo comprobación de tailscale ip -4"
    return 0
  fi
  local ts_ip
  ts_ip="$(tailscale_ipv4)"
  if [[ -n "${ts_ip}" ]]; then
    echo "[secure-vps-with-tailscale] Tailscale IPv4 en este nodo: ${ts_ip}"
    return 0
  fi
  print_tailscale_up_instructions
  if [[ "${FORCE}" != "true" ]]; then
    echo "[secure-vps-with-tailscale] [BLOQUEO] Sin IPv4 de Tailscale no se aplicará UFW (evita cortar SSH)." >&2
    echo '[secure-vps-with-tailscale] Tras `sudo tailscale up`, vuelve a ejecutar este script, o usa --force si tienes consola del proveedor.' >&2
    exit 1
  fi
  echo "[secure-vps-with-tailscale] --force: continuando sin IPv4 de Tailscale (riesgo alto)." >&2
}

check_ssh_client_from_tailscale() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] omitiendo comprobación de origen SSH"
    return 0
  fi
  # SSH_CONNECTION: client_ip client_port server_ip server_port
  local client_ip="${SSH_CONNECTION%% *}"
  if [[ -z "${client_ip}" ]]; then
    echo "[secure-vps-with-tailscale] No hay SSH_CONNECTION (quizá no es sesión SSH); revisa manualmente el origen de tu acceso."
    return 0
  fi
  if is_tailscale_ipv4 "${client_ip}"; then
    echo "[secure-vps-with-tailscale] Sesión SSH desde Tailscale (${client_ip}). OK."
    return 0
  fi
  {
    echo ""
    echo "[ADVERTENCIA] Tu sesión SSH parece venir de ${client_ip} (no es 100.64.0.0/10)."
    echo "Tras activar UFW, el puerto 22 no estará abierto a Internet; solo desde Tailscale."
    echo "  - Conéctate primero por IP Tailscale del VPS (tailscale ip -4 en el servidor) o consola del proveedor."
    echo ""
  } >&2
  if [[ "${FORCE}" != "true" ]]; then
    echo "[secure-vps-with-tailscale] Abortando. Si estás seguro, ejecuta de nuevo con --force." >&2
    exit 1
  fi
  echo "[secure-vps-with-tailscale] --force: continuando pese a SSH desde IP no-Tailscale." >&2
}

configure_ufw() {
  command -v ufw >/dev/null 2>&1 || {
    echo "[secure-vps-with-tailscale] Instalando ufw..."
    export DEBIAN_FRONTEND=noninteractive
    run apt-get update -qq
    run apt-get install -y -qq ufw
  }

  if [[ "${RESET_UFW}" == "true" ]]; then
    echo "[secure-vps-with-tailscale] Reset UFW (--reset-ufw)"
    run ufw --force reset
  fi

  run ufw default deny incoming
  run ufw default allow outgoing

  # Quitar reglas típicas que exponen SSH o Redis a Internet (best-effort, ignora si no existen).
  for rule in "allow 22/tcp" "allow ssh" "allow 6379/tcp" "allow OpenSSH"; do
    run ufw --force delete "${rule}" || true
  done

  # Regla de oro: todo el tráfico desde la overlay Tailscale (SSH, Redis vía tailnet, etc.).
  # Sintaxis sin "comment" para compatibilidad con ufw antiguos.
  run ufw allow from "${TS_CIDR}"

  if [[ "${ALLOW_PUBLIC_WEB}" == "true" ]]; then
    run ufw allow 80/tcp
    run ufw allow 443/tcp
  fi

  # NO: ufw allow 22/tcp sin "from" (público)
  # NO: ufw allow 6379/tcp público

  echo "[secure-vps-with-tailscale] Habilitando UFW..."
  run ufw --force enable
}

main() {
  ensure_root
  install_tailscale_if_missing

  check_tailscale_connected
  check_ssh_client_from_tailscale

  configure_ufw

  echo ""
  echo "========== sudo ufw status =========="
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] ufw status verbose"
  else
    ufw status verbose || true
  fi

  echo ""
  echo "========== Tailscale IPv4 (usar en .env / SSH) =========="
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] tailscale ip -4"
  else
    tailscale ip -4 2>/dev/null || echo "(sin IPv4; ejecuta: sudo tailscale up)"
  fi

  echo ""
  echo "[secure-vps-with-tailscale] Listo. Redis y SSH no deben estar expuestos a 0.0.0.0/0; admin vía ${TS_CIDR}."
}

main "$@"
