#!/usr/bin/env bash
# Content autopilot — crear → render (pc-gamer / Mac) → kit YouTube.
#
# Gates:
#   1. Schedule: mode day o heavy (gaming/offline bloquean enqueue discrecional).
#   2. Nodo gamer: si está offline, el enqueue queda en cola (asíncrono).
# Publicación: approval-first (kit). --auto-publish solo con AUTO_PUBLISH_YOUTUBE=true.
#
# Usage:
#   ./scripts/ops/content-autopilot.sh --channel bitsitos --dry-run
#   ./scripts/ops/content-autopilot.sh --channel bitsitos --kit
#   ./scripts/ops/content-autopilot.sh --list
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/content-autopilot.sh --channel bitsitos
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
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

CHANNEL="${CHANNEL:-bitsitos}"
STATE_DIR="${OPSLY_CONTENT_STATE:-runtime/content-autopilot}"
LOG_DIR="${HOME}/Library/Logs/opsly"
LOG_FILE="${LOG_DIR}/content-autopilot.log"
ALLOWED_MODES="${CONTENT_AUTOPILOT_MODES:-day,heavy}"

mkdir -p "${STATE_DIR}"
mkdir -p "${LOG_DIR}" 2>/dev/null || true
log() {
  if [[ -w "$(dirname "${LOG_FILE}")" ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"${LOG_FILE}"
  fi
}

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

schedule_out="$(cd "$ROOT" && bash scripts/ops/pc-gamer-schedule.sh 2>/dev/null || true)"
mode="$(printf '%s\n' "$schedule_out" | sed -n 's/.*mode=\([^ ]*\).*/\1/p' | head -1)"
if [[ "$FORCE_MODE" != "" ]]; then
  mode="$FORCE_MODE"
fi

mode_ok=false
IFS=',' read -r -a allowed <<<"$ALLOWED_MODES"
for allowed_mode in "${allowed[@]}"; do
  if [[ "$mode" == "$allowed_mode" ]]; then
    mode_ok=true
    break
  fi
done

if [[ "$mode_ok" != true ]]; then
  echo "gate: modo actual '${mode:-unknown}' no está en [${ALLOWED_MODES}] → skip enqueue" >&2
  log "gate=schedule mode=${mode} → skip"
  exit 2
fi

if [[ -x "$ROOT/scripts/ops/check-pc-gamer-online.sh" ]]; then
  if ! "$ROOT/scripts/ops/check-pc-gamer-online.sh" --quiet 2>/dev/null; then
    echo "gate: pc-gamer offline → jobs esperarán en cola (ok, asíncrono)" >&2
    log "gate=online offline → enqueue pasivo"
  else
    log "gate=online ok"
  fi
fi

enqueue_args=()
[[ "$DRY_RUN" == true ]] && enqueue_args+=(--dry-run)
if [[ "${REDIS_URL:-}" != "" || "$DRY_RUN" == true ]]; then
  echo "enqueue render for channel=${CHANNEL} mode=${mode}"
  "$ROOT/scripts/content-studio-enqueue.sh" --channel "$CHANNEL" "${enqueue_args[@]}"
else
  echo "REDIS_URL unset → solo dry-run de enqueue"
  "$ROOT/scripts/content-studio-enqueue.sh" --channel "$CHANNEL" --dry-run
fi

publish_args=(--channel "$CHANNEL")
if [[ "$AUTO_PUBLISH" == true && "${AUTO_PUBLISH_YOUTUBE:-}" == "true" && "$KIT_ONLY" != true ]]; then
  publish_args+=(--upload)
  echo "auto-publish ACTIVO (AUTO_PUBLISH_YOUTUBE=true + --auto-publish)"
  log "publish=upload channel=${CHANNEL}"
else
  publish_args+=(--kit)
  echo "approval-first: generando kit de subida (sin upload)"
  log "publish=kit channel=${CHANNEL}"
fi

if [[ "$DRY_RUN" == true ]]; then
  publish_args=(--channel "$CHANNEL" --dry-run)
fi
"$ROOT/scripts/content-studio-publish-youtube.sh" "${publish_args[@]}"

echo "autopilot done channel=${CHANNEL} mode=${mode}"
exit 0
