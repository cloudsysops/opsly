#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  COMPOSE=()
fi

MODE="server"
MAC2011_IP=""
MAC2011_USER=""
SSH_KEY="${HOME}/.ssh/id_rsa"
HOSTS_MARKER_BEGIN="# BEGIN OPSLY LOCAL (tunnel-access.sh)"
HOSTS_MARKER_END="# END OPSLY LOCAL (tunnel-access.sh)"

usage() {
  cat <<'EOF'
Uso:
  Mac 2011 (servidor):  ./scripts/tunnel-access.sh [--mode server]
  Mac 2020 (cliente):   sudo ./scripts/tunnel-access.sh --mode client --mac2011-ip X.X.X.X [--mac2011-user USUARIO] [--ssh-key PATH]

Nota: /etc/hosts no incluye puertos. Supabase Studio sigue siendo http://<IP>:54321
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --mac2011-ip)
      MAC2011_IP="${2:-}"
      shift 2
      ;;
    --mac2011-user)
      MAC2011_USER="${2:-}"
      shift 2
      ;;
    --ssh-key)
      SSH_KEY="${2:-}"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      log_error "Argumento desconocido: $1"
      usage
      exit 1
      ;;
  esac
done

patch_hosts_client() {
  local ip="$1"
  if [[ -z "${ip}" ]]; then
    log_error "Falta --mac2011-ip en modo client."
    exit 1
  fi
  if [[ "${EUID}" -ne 0 ]]; then
    log_error "Modo client requiere sudo para editar /etc/hosts."
    exit 1
  fi
  local hosts="/etc/hosts"
  local tmp
  tmp="$(mktemp)"
  if [[ -f "${hosts}" ]]; then
    awk -v b="${HOSTS_MARKER_BEGIN}" -v e="${HOSTS_MARKER_END}" '
      $0==b {skip=1; next}
      $0==e {skip=0; next}
      !skip {print}
    ' "${hosts}" >"${tmp}"
  else
    : >"${tmp}"
  fi
  {
    echo "${HOSTS_MARKER_BEGIN}"
    echo "${ip} api.opsly.local admin.opsly.local traefik.opsly.local supabase.opsly.local"
    echo "${HOSTS_MARKER_END}"
  } >>"${tmp}"
  cp "${tmp}" "${hosts}"
  rm -f "${tmp}"
  log_info "/etc/hosts actualizado (bloque OPSLY LOCAL)."
}

client_mode() {
  local ip="${MAC2011_IP}"
  if [[ -z "${ip}" ]]; then
    if command -v arp-scan >/dev/null 2>&1; then
      log_info "arp-scan disponible; puedes ejecutar: sudo arp-scan --localnet"
    fi
    log_error "Indica --mac2011-ip (IP LAN de la Mac 2011)."
    exit 1
  fi
  patch_hosts_client "${ip}"
  if curl -sf --connect-timeout 5 "http://api.opsly.local/api/health" >/dev/null; then
    log_info "Health OK: http://api.opsly.local/api/health"
  else
    log_warn "No se pudo alcanzar api.opsly.local; revisa firewall o que el stack esté arriba en la 2011."
  fi
  if [[ -n "${SSH_KEY}" ]] && [[ ! -f "${SSH_KEY}" ]]; then
    log_warn "SSH key no existe: ${SSH_KEY} (si usarás túneles SSH, ajusta --ssh-key)"
  fi
  log_info "URLs (Mac 2020):"
  log_info "  http://admin.opsly.local"
  log_info "  http://api.opsly.local/api/health"
  log_info "  http://traefik.opsly.local:8080  (si enrutas el puerto 8080; si no, usa http://${ip}:8080)"
  log_info "  Supabase Studio: http://${ip}:54321"
}

server_mode() {
  if [[ ${#COMPOSE[@]} -eq 0 ]]; then
    log_warn "Docker Compose no encontrado; omite comprobación del stack."
  elif "${COMPOSE[@]}" -f "${REPO_ROOT}/infra/docker-compose.local.yml" ps 2>/dev/null | grep -qiE 'Up|running'; then
    log_info "Stack local detectado en ejecución."
  else
    log_warn "No parece haber contenedores arriba en docker-compose.local.yml (¿./scripts/local-setup.sh?)."
  fi
  local ip=""
  for _iface in en0 en1 en2; do
    if command -v ipconfig >/dev/null 2>&1; then
      ip="$(ipconfig getifaddr "${_iface}" 2>/dev/null || true)"
      [[ -n "${ip}" ]] && break
    fi
  done
  if [[ -z "${ip}" ]] && command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  log_info "IP sugerida de esta máquina (LAN): ${ip:-desconocida}"

  log_info "En la Mac 2020 ejecuta (ajusta IP y usuario):"
  echo ""
  echo "  sudo ${REPO_ROOT}/scripts/tunnel-access.sh --mode client --mac2011-ip ${ip:-192.168.x.x}"
  echo ""

  if [[ -n "${MAC2011_USER}" ]]; then
    log_info "SSH reverse tunnel (opcional, ejemplo):"
    echo "  ssh -N -R 8080:localhost:80 ${MAC2011_USER}@${ip:-MAC_2020_IP}"
  fi

  if command -v cloudflared >/dev/null 2>&1; then
    log_info "cloudflared instalado. Túnel rápido a puerto 80:"
    echo "  cloudflared tunnel --url http://localhost:80"
  else
    log_info "Opcional: brew install cloudflare/cloudflare/cloudflared para túnel público temporal."
  fi
}

case "${MODE}" in
  client) client_mode ;;
  server) server_mode ;;
  *)
    log_error "Modo inválido: ${MODE}"
    usage
    exit 1
    ;;
esac
