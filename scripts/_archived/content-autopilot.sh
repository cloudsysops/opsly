#!/usr/bin/env bash
# Content autopilot — orquesta el flujo "crear → render (pc-gamer) → publicar".
#
# Consolida las piezas del pipeline sobre main:
#   1. Gates: schedule (modo heavy) + nodo gamer online.
#   2. Enqueue de render: encola batch-*/drafts de un canal en la cola BullMQ
#      `content-video` (job `render`) para que ContentVideoWorker del gamer lo
#      renderice vía moneyprinter-bridge.
#   3. Publicación: por defecto approval-first (kit en
#      runtime/content-studio/youtube-upload-kit/<channel>). Solo sube a YouTube
#      con --auto-publish (requiere OAuth YOUTUBE_* vía Doppler).
#
# Zero secrets: YOUTUBE_* / PLATFORM_ADMIN_TOKEN / MONEY_PRINTER_TURBO_API_KEY se
# proveen vía Doppler (`doppler run …`), nunca desde el repo.
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/content-autopilot.sh --channel splashitos
#   ./scripts/ops/content-autopilot.sh --channel splashitos --dry-run
#   ./scripts/ops/content-autopilot.sh --channel splashitos --kit         # force approval-first
#   ./scripts/ops/content-autopilot.sh --channel splashitos --auto-publish # requiere OAuth + AUTO_PUBLISH
#   ./scripts/ops/content-autopilot.sh --list
set -euo pipefail

AUTO_PUBLISH=false
CHANNEL=""
DRY_RUN=false
LIST=false
KIT_ONLY=false
FORCE_MODE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --list) LIST=true; shift ;;
    --auto-publish) AUTO_PUBLISH=true; shift ;;
    --kit) KIT_ONLY=true; shift ;;
    --force-mode) FORCE_MODE="${2:-}"; shift 2 ;;
    --channel) CHANNEL="${2:-}"; shift 2 ;;
    --channel=*) CHANNEL="${1#*=}"; shift ;;
    -h|--help)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    *) shift ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

# ── Var helpers del pipeline (mismo layout que PC-GAMER-WORKER.md) ──────────
OPSLY_PC_GAMER_MODE_FILE="${OPSLY_PC_GAMER_MODE_FILE:-runtime/pc-gamer-mode.json}"
CHANNEL="${CHANNEL:-splashitos}"
STATE_DIR="${OPSLY_CONTENT_STATE:-runtime/content-autopilot}"
STATE_FILE="${STATE_DIR}/state.json"
LOG_FILE="${HOME}/Library/Logs/opsly/content-autopilot.log"

mkdir -p "${STATE_DIR}" "$(dirname "${LOG_FILE}")"
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"${LOG_FILE}"; }

if [[ "$LIST" == true ]]; then
  echo "Channels con batch disponibles:"
  for f in config/content-studio/channels/*/batch-*.json; do
    [[ -e "$f" ]] || continue
    channel_slug="$(basename "$(dirname "$f")")"
    count="$(node -e "const b=require('./$f');console.log(b.drafts?.length||0)" 2>/dev/null || echo 0)"
    echo "- ${channel_slug}: ${count} drafts (${f})"
  done
  exit 0
fi

channel_dir="$ROOT/config/content-studio/channels/${CHANNEL}"
if [[ ! -d "$channel_dir" ]]; then
  echo "Missing channel dir: ${channel_dir} (use --list)" >&2
  exit 1
fi

# ── Gate 1: modo schedule (solo heavy permite opencode/contenido) ────────────
schedule_out="$(cd "$ROOT" && bash scripts/ops/pc-gamer-schedule.sh 2>/dev/null || true)"
mode="$(printf '%s\n' "$schedule_out" | sed -n 's/.*mode=\([^ ]*\).*/\1/p' | head -1)"
if [[ "$FORCE_MODE" != "" ]]; then
  mode="$FORCE_MODE"
fi
if [[ -z "$mode" || "$mode" != "heavy" ]]; then
  echo "gate: modo actual '${mode:-unknown}' != heavy → no autopublish/enqueue discrecional" >&2
  log "gate=schedule mode=${mode} → skip"
  exit 2
fi

# ── Gate 2: nodo gamer online ────────────────────────────────────────────────
if [[ -x "$ROOT/scripts/ops/check-pc-gamer-online.sh" ]]; then
  if ! "$ROOT/scripts/ops/check-pc-gamer-online.sh" --quiet 2>/dev/null; then
    echo "gate: pc-gamer offline → jobs esperarán en cola (ok, asíncrono)" >&2
    log "gate=online offline → enqueue pasivo"
  else
    log "gate=online ok"
  fi
fi

# ── Enqueue render (content-video) ───────────────────────────────────────────
enqueue_args=()
[[ "$DRY_RUN" == true ]] && enqueue_args+=(--dry-run)
if [[ "${REDIS_URL:-}" != "" ]]; then
  echo "enqueue render for channel=${CHANNEL}"
  "$ROOT/scripts/content-studio-enqueue.sh" --channel "$CHANNEL" "${enqueue_args[@]}"
else
  echo "REDIS_URL unset → solo dry-run de enqueue"
  "$ROOT/scripts/content-studio-enqueue.sh" --channel "$CHANNEL" --dry-run
fi

# ── Publicación ──────────────────────────────────────────────────────────────
publish_args=(--channel "$CHANNEL")
if [[ "$AUTO_PUBLISH" == true ]] && [[ "${AUTO_PUBLISH_YOUTUBE:-}" == "true" ]]; then
  publish_args+=(--upload)
  echo "auto-publish ACTIVO (AUTO_PUBLISH_YOUTUBE=true + OAuth presente)"
  log "publish=upload channel=${CHANNEL}"
else
  publish_args+=(--kit)
  echo "approval-first: generando kit de subida (sin upload) — usar --auto-publish con AUTO_PUBLISH_YOUTUBE=true para subir"
  log "publish=kit channel=${CHANNEL}"
fi
"$ROOT/scripts/content-studio-publish-youtube.sh" "${publish_args[@]}"

echo "autopilot done channel=${CHANNEL}"
exit 0