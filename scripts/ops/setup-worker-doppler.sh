#!/usr/bin/env bash
# Prepara Doppler en un compute-worker (PC gamer / WSL) para inyectar secretos
# en tiempo de ejecucion, sin escribirlos nunca en disco.
#
# Por que: los workers corren con env EFIMERO (scripts/ops/assert-ephemeral-worker-env.sh
# prohibe claves maestras en .env.worker). Los secretos maestros viven solo en Doppler
# y se proyectan con 'doppler run' en el momento de usarlos.
#
# Uso:
#   ./scripts/ops/setup-worker-doppler.sh --check     # solo diagnostico (default)
#   ./scripts/ops/setup-worker-doppler.sh --ensure    # instala CLI si falta y verifica
#   ./scripts/ops/setup-worker-doppler.sh --install-hint
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG="${SCRIPT_DIR}/config/opsly.config.json"

MODE="check"
case "${1:-}" in
  --check) MODE="check" ;;
  --ensure) MODE="ensure" ;;
  --install-hint) MODE="hint" ;;
  "") MODE="check" ;;
  *) echo "Uso: $0 [--check|--ensure|--install-hint]" >&2; exit 2 ;;
esac

command -v jq >/dev/null || { echo "ERROR: jq missing" >&2; exit 1; }
[[ -f "$CONFIG" ]] || { echo "ERROR: no existe $CONFIG" >&2; exit 1; }

PROJECT="$(jq -r '.project.doppler_project // empty' "$CONFIG")"
DCFG="$(jq -r '.project.doppler_config // empty' "$CONFIG")"
[[ -n "$PROJECT" && "$PROJECT" != "null" ]] || { echo "ERROR: config: project.doppler_project" >&2; exit 1; }
[[ -n "$DCFG" && "$DCFG" != "null" ]] || { echo "ERROR: config: project.doppler_config" >&2; exit 1; }

# Vars de streaming que el worker necesita proyectar bajo demanda.
STREAM_VARS=(TWITCH_STREAM_KEY TWITCH_CHANNEL OBS_WEBSOCKET_PASSWORD)

install_hint() {
  cat <<'EOF'
Instalar Doppler CLI en este worker (WSL/Ubuntu o macOS):

  # Debian/Ubuntu/WSL (requiere sudo)
  sudo apt-get update && sudo apt-get install -y doppler

  # Alternativa oficial (sin sudo, en $HOME)
  curl -fsSL https://cli.doppler.com/install.sh | sh

Autenticacion (interactiva, hazlo una vez por maquina):

  doppler login
  doppler configure set token <SERVICE_TOKEN> --scope /opt/opsly   # workers sin sesion

Nunca escribas el token en .env.worker: assert-ephemeral-worker-env.sh lo prohibe.
EOF
}

if [[ "$MODE" == "hint" ]]; then install_hint; exit 0; fi

# --- ensure: instalar si falta -----------------------------------------------
if [[ "$MODE" == "ensure" ]]; then
  if ! command -v doppler >/dev/null; then
    echo "[doppler] CLI ausente; intentos de instalacion…"
    if command -v apt-get >/dev/null && [[ "$(id -u)" == "0" ]]; then
      apt-get update -qq && apt-get install -y doppler || true
    elif command -v apt-get >/dev/null && command -v sudo >/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y doppler || true
    else
      curl -fsSL https://cli.doppler.com/install.sh | sh || true
    fi
  fi
  if ! command -v doppler >/dev/null; then
    install_hint
    echo "[doppler] ERROR: no se pudo instalar la CLI." >&2
    exit 1
  fi
  echo "[doppler] CLI: $(doppler --version 2>/dev/null | head -1)"
fi

# --- check: diagnostico (solo nombres, nunca valores) ------------------------
if ! command -v doppler >/dev/null; then
  echo "[doppler] CLI: AUSENTE"
  install_hint
  exit 1
fi

echo "[doppler] CLI: $(doppler --version 2>/dev/null | head -1)"

if ! doppler me >/dev/null 2>&1; then
  echo "[doppler] auth: NO AUTENTICADO (usa 'doppler login' o un service token con scope)"
  exit 1
fi
echo "[doppler] auth: ok"
echo "[doppler] project=${PROJECT} config=${DCFG}"

names="$(doppler secrets --project "$PROJECT" --config "$DCFG" --only-names 2>/dev/null || true)"
if [[ -z "$names" ]]; then
  echo "[doppler] vars: no se pudieron listar (revisa permisos del token)."
  exit 0
fi

missing=0
for v in "${STREAM_VARS[@]}"; do
  if grep -qxF "$v" <<<"$names"; then
    echo "[doppler] var ${v}: presente"
  else
    echo "[doppler] var ${v}: FALTA"
    missing=$((missing + 1))
  fi
done

if (( missing > 0 )); then
  echo "[doppler] Faltan ${missing} var(s) de streaming."
  echo "  Importa el stream key (pegar por stdin, nunca en argv):"
  echo "    pbpaste | ${SCRIPT_DIR}/scripts/doppler-import-twitch-stream-key.sh --with-channel"
  exit 1
fi

echo "[doppler] vars de streaming: completas"
cat <<EOF

  Proyectar los secretos solo en el momento de usarlos (nada a disco):

    doppler run --project ${PROJECT} --config ${DCFG} -- \\
      ./scripts/ops-write-obs-service-config.sh

  En OBS, escribe service.json con permisos 600. Cierra OBS antes de correrlo.
EOF
