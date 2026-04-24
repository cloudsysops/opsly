#!/usr/bin/env bash
# Agent Training Sandbox — validación local + opcional SSH VPS + Discord.
# Uso (desde raíz del repo):
#   ./scripts/agent-training/full-auto.sh
#   ./scripts/agent-training/full-auto.sh --dry-run
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/agent-training/full-auto.sh
# Variables opcionales: DATABASE_URL | SUPABASE_DB_URL, REDIS_URL, DISCORD_WEBHOOK_URL,
#   OPSLY_CLASSIFIER_ALLOWED_TENANTS=intcloudsysops
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DRY_RUN=false
SKIP_TRAIN=false
SKIP_SSH=true
SKIP_DISCORD=false
SSH_USER="${SSH_USER:-vps-dragon}"
SSH_HOST="${SSH_HOST:-100.120.151.91}"

usage() {
  echo "Usage: $0 [--dry-run] [--skip-train] [--ssh] [--skip-discord]"
  echo "  --ssh          Comprobar Traefik/Redis en VPS por Tailscale (no modifica datos)."
  echo "  --skip-train   No ejecutar train.py (requiere venv + sklearn)."
  echo "  --skip-discord No llamar notify-discord.sh"
}

die_usage() {
  usage
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "${1:-}" in
    --dry-run) DRY_RUN=true ;;
    --skip-train) SKIP_TRAIN=true ;;
    --ssh) SKIP_SSH=false ;;
    --skip-discord) SKIP_DISCORD=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; die_usage ;;
  esac
  shift
done

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

echo "==> [1/6] Type-check monorepo"
run "npm run type-check"

echo "==> [2/6] Tests workspace @intcloudsysops/ml"
run "npm run test --workspace=@intcloudsysops/ml"

CLASSIFIER="$ROOT/apps/ml/agents/classifier"
if [[ "$SKIP_TRAIN" != "true" ]]; then
  echo "==> [3/6] Entrenar clasificador Python (opcional si falla: usar --skip-train)"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] python3 venv + pip + train.py"
  else
    if ! command -v python3 >/dev/null 2>&1; then
      echo "[WARN] python3 no encontrado — salta train (usa --skip-train para silenciar)"
    else
      cd "$CLASSIFIER"
      if [[ ! -d .venv ]]; then
        python3 -m venv .venv
      fi
      # shellcheck source=/dev/null
      source .venv/bin/activate
      pip install -q -r requirements.txt
      python3 train.py
      cd "$ROOT"
    fi
  fi
else
  echo "==> [3/6] Train omitido (--skip-train)"
fi

echo "==> [4/6] Verificar schema sandbox + artefactos (si hay DATABASE_URL)"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] ./scripts/agent-training/verify-sandbox.sh"
elif [[ -n "${DATABASE_URL:-${SUPABASE_DB_URL:-}}" ]]; then
  bash "$ROOT/scripts/agent-training/verify-sandbox.sh"
else
  echo "[SKIP] DATABASE_URL / SUPABASE_DB_URL no definidos — ejecuta supabase db push y exporta URL para verify"
fi

if [[ "$SKIP_SSH" != "true" ]]; then
  echo "==> [5/6] SSH VPS (solo lectura: docker + redis PING si redis-cli)"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ssh ${SSH_USER}@${SSH_HOST} docker ps ..."
  else
    ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_USER}@${SSH_HOST}" \
      "cd /opt/opsly 2>/dev/null || cd ~; hostname; docker ps --format '{{.Names}}\t{{.Status}}' 2>/dev/null | head -15" \
      || echo "[WARN] SSH no disponible (clave/red) — continúa en local"
  fi
else
  echo "==> [5/6] SSH omitido (usa --ssh para comprobar VPS)"
fi

echo "==> [6/6] Discord (éxito)"
if [[ "$SKIP_DISCORD" == "true" ]]; then
  echo "[SKIP] --skip-discord"
elif [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] ./scripts/utils/notify-discord.sh ..."
else
  MSG="Agent sandbox full-auto OK. Schema: sandbox. Redis namespace objetivo: opsly:sandbox:*. Tenant sandbox: intcloudsysops (OPSLY_CLASSIFIER_ALLOWED_TENANTS)."
  bash "$ROOT/scripts/utils/notify-discord.sh" \
    "Opsly · Agent training sandbox" \
    "$MSG" \
    success || echo "[WARN] Discord no enviado (webhook vacío o error)"
fi

echo ""
echo "✅ full-auto completado. Rollback DB: ./scripts/agent-training/rollback-sandbox.sh --confirm"
