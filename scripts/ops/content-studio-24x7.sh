#!/usr/bin/env bash
# Content Studio 24×7 tick — generate when the gamer can, publish from Mac always.
#
# Render: PC-gamer only, never during gaming, never if SSH/health are down.
# Publish: next unpublished MP4 (--limit 1). YouTube Data API default quota
# is ~6 uploads/day; this tick never dumps the kit.
#
# Usage:
#   ./scripts/ops/content-studio-24x7.sh --dry-run
#   ./scripts/ops/content-studio-24x7.sh --publish-only
#   ./scripts/ops/content-studio-24x7.sh --render-only
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/content-studio-24x7.sh
#
set -euo pipefail

DRY_RUN=false
PUBLISH_ONLY=false
RENDER_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --publish-only) PUBLISH_ONLY=true; shift ;;
    --render-only) RENDER_ONLY=true; shift ;;
    -h|--help)
      sed -n '2,18p' "$0"
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

# shellcheck disable=SC1091
source "$ROOT/scripts/ops/content-studio-gamer-env.sh"

STATE_DIR="${CONTENT_STUDIO_24X7_STATE:-$ROOT/runtime/content-studio}"
STATE_FILE="${STATE_DIR}/factory-24x7.json"
export CONTENT_STUDIO_PUBLISHED_FILE="${CONTENT_STUDIO_PUBLISHED_FILE:-$STATE_DIR/published.json}"
LOG_DIR="${HOME}/Library/Logs/opsly"
LOG_FILE="${LOG_DIR}/content-studio-24x7.log"
MAX_UPLOADS="${CONTENT_STUDIO_UPLOADS_PER_DAY:-6}"
INTERVAL_H="${CONTENT_STUDIO_PUBLISH_INTERVAL_HOURS:-4}"
ENQUEUE_H="${CONTENT_STUDIO_ENQUEUE_INTERVAL_HOURS:-6}"
PUBLISH_ON="${CONTENT_STUDIO_24X7_PUBLISH:-true}"

mkdir -p "$STATE_DIR" "$LOG_DIR" 2>/dev/null || true

log() {
  if [[ -w "$(dirname "$LOG_FILE")" ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"$LOG_FILE"
  fi
}

echo "content-studio-24x7 dry_run=${DRY_RUN} publish_only=${PUBLISH_ONLY} render_only=${RENDER_ONLY}"

schedule_out="$(bash scripts/ops/pc-gamer-schedule.sh 2>/dev/null || true)"
mode="$(printf '%s\n' "$schedule_out" | sed -n 's/.*mode=\([^ ]*\).*/\1/p' | head -1)"
allow="$(printf '%s\n' "$schedule_out" | sed -n 's/.*allow=\[\([^]]*\)\].*/\1/p' | head -1)"
echo "schedule mode=${mode:-unknown} allow=[${allow}]"
log "mode=${mode:-unknown} allow=[${allow}]"

cadence="$(
  CONTENT_STUDIO_UPLOADS_PER_DAY="$MAX_UPLOADS" \
  CONTENT_STUDIO_PUBLISH_INTERVAL_HOURS="$INTERVAL_H" \
  CONTENT_STUDIO_PUBLISHED_FILE="$CONTENT_STUDIO_PUBLISHED_FILE" \
  node --input-type=module <<'EOF'
import { existsSync, readFileSync } from 'node:fs';
const file = process.env.CONTENT_STUDIO_PUBLISHED_FILE || '';
const max = Number(process.env.CONTENT_STUDIO_UPLOADS_PER_DAY || 6);
const intervalH = Number(process.env.CONTENT_STUDIO_PUBLISH_INTERVAL_HOURS || 4);
let ledger = { days: {}, last_upload_at: '', last_channel: '' };
if (file && existsSync(file)) {
  try { ledger = JSON.parse(readFileSync(file, 'utf8')); } catch { /* empty */ }
}
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const count = Number(ledger.days?.[day]?.count || 0);
const last = ledger.last_upload_at ? Date.parse(ledger.last_upload_at) : 0;
const due = !last || Date.now() - last >= intervalH * 3600 * 1000;
process.stdout.write(JSON.stringify({
  day,
  count,
  max,
  due,
  can_upload: count < max && due,
  last_channel: ledger.last_channel || '',
  last_upload_at: ledger.last_upload_at || '',
}));
EOF
)"
echo "cadence ${cadence}"

can_upload="$(node -e "const c=JSON.parse(process.argv[1]);process.stdout.write(c.can_upload?'true':'false')" "$cadence")"
last_channel="$(node -e "const c=JSON.parse(process.argv[1]);process.stdout.write(c.last_channel||'')" "$cadence")"

gamer_ready=false
if content_studio_gamer_ready >/tmp/opsly-24x7-gamer.json 2>/dev/null; then
  gamer_ready=true
fi
echo "gamer_ready=${gamer_ready}"

content_allowed=false
if [[ ",${allow}," == *",content_video,"* ]]; then
  content_allowed=true
fi

maybe_enqueue() {
  local channel="$1"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] enqueue --channel ${channel}"
    ./scripts/content-studio-enqueue.sh --channel "$channel" --dry-run || true
    return 0
  fi
  if [[ -z "${REDIS_URL:-}" ]]; then
    echo "REDIS_URL unset → skip enqueue ${channel}"
    return 0
  fi
  echo "enqueue --channel ${channel}"
  ./scripts/content-studio-enqueue.sh --channel "$channel" || true
}

should_enqueue() {
  CONTENT_STUDIO_ENQUEUE_INTERVAL_HOURS="$ENQUEUE_H" \
  CONTENT_STUDIO_24X7_STATE="$STATE_FILE" \
  node --input-type=module <<'EOF'
import { existsSync, readFileSync } from 'node:fs';
const file = process.env.CONTENT_STUDIO_24X7_STATE || '';
const hours = Number(process.env.CONTENT_STUDIO_ENQUEUE_INTERVAL_HOURS || 6);
let state = { last_enqueue_at: '' };
if (file && existsSync(file)) {
  try { state = JSON.parse(readFileSync(file, 'utf8')); } catch { /* empty */ }
}
const last = state.last_enqueue_at ? Date.parse(state.last_enqueue_at) : 0;
process.exit(!last || Date.now() - last >= hours * 3600 * 1000 ? 0 : 1);
EOF
}

mark_enqueued() {
  CONTENT_STUDIO_24X7_STATE="$STATE_FILE" node --input-type=module <<'EOF'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const file = process.env.CONTENT_STUDIO_24X7_STATE;
if (!file) process.exit(0);
let state = {};
if (existsSync(file)) {
  try { state = JSON.parse(readFileSync(file, 'utf8')); } catch { state = {}; }
}
mkdirSync(dirname(file), { recursive: true });
state.last_enqueue_at = new Date().toISOString();
writeFileSync(file, JSON.stringify(state, null, 2));
EOF
}

oauth_cooling=false
if [[ -f "$STATE_FILE" ]]; then
  oauth_cooling="$(
    CONTENT_STUDIO_24X7_STATE="$STATE_FILE" node --input-type=module <<'EOF'
import { existsSync, readFileSync } from 'node:fs';
const file = process.env.CONTENT_STUDIO_24X7_STATE || '';
let state = {};
if (file && existsSync(file)) {
  try { state = JSON.parse(readFileSync(file, 'utf8')); } catch { state = {}; }
}
const last = state.last_oauth_error_at ? Date.parse(state.last_oauth_error_at) : 0;
process.stdout.write(last && Date.now() - last < 6 * 3600 * 1000 ? 'true' : 'false');
EOF
  )"
fi

if [[ "$RENDER_ONLY" != true && "$PUBLISH_ON" == true ]]; then
  if [[ "$oauth_cooling" == true ]]; then
    echo "publish skip: OAuth inválido (backoff 6h). Rehacer youtube-oauth-doppler-setup.sh"
    log "publish=skip oauth_backoff"
  elif [[ "$can_upload" != true ]]; then
    echo "publish skip: daily cap or interval (max=${MAX_UPLOADS}/day, every ${INTERVAL_H}h)"
    log "publish=skip cadence"
  else
    first="bitsitos"
    second="splashitos"
    if [[ "$last_channel" == "bitsitos" ]]; then
      first="splashitos"
      second="bitsitos"
    fi
    uploaded=false
    for channel in "$first" "$second"; do
      if [[ "$DRY_RUN" == true ]]; then
        echo "[dry-run] next unpublished --channel ${channel} --limit 1"
        ./scripts/content-studio-publish-youtube.sh --channel "$channel" --dry-run --limit 1 || true
        uploaded=true
        break
      fi
      oauth_ok=true
      if [[ -z "${YOUTUBE_CLIENT_ID:-}" || -z "${YOUTUBE_CLIENT_SECRET:-}" || -z "${YOUTUBE_REFRESH_TOKEN:-}" ]]; then
        oauth_ok=false
      fi
      if [[ "$oauth_ok" != true ]]; then
        echo "publish skip: YouTube OAuth env missing (Doppler)"
        log "publish=skip oauth"
        break
      fi
      echo "publish next --channel ${channel} --upload --limit 1"
      out="$(./scripts/content-studio-publish-youtube.sh --channel "$channel" --upload --limit 1 2>&1 || true)"
      printf '%s\n' "$out"
      if [[ "$out" == *"invalid_grant"* || "$out" == *"token refresh failed"* ]]; then
        echo "publish skip: YouTube OAuth refresh token inválido — rehacer youtube-oauth-doppler-setup.sh"
        log "publish=skip oauth_invalid"
        CONTENT_STUDIO_24X7_STATE="$STATE_FILE" node --input-type=module <<'EOF'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const file = process.env.CONTENT_STUDIO_24X7_STATE;
if (!file) process.exit(0);
let state = {};
if (existsSync(file)) {
  try { state = JSON.parse(readFileSync(file, 'utf8')); } catch { state = {}; }
}
mkdirSync(dirname(file), { recursive: true });
state.last_oauth_error_at = new Date().toISOString();
writeFileSync(file, JSON.stringify(state, null, 2));
EOF
        break
      fi
      if [[ "$out" == *"uploaded "* && "$out" != *"uploaded 0 videos"* ]]; then
        uploaded=true
        log "publish=ok channel=${channel}"
        break
      fi
    done
    if [[ "$uploaded" != true ]]; then
      echo "publish: no unpublished MP4 ready (or Splashitos channel id empty)"
      log "publish=none"
    fi
  fi
fi

if [[ "$PUBLISH_ONLY" != true ]]; then
  if [[ "$content_allowed" != true ]]; then
    echo "render skip: mode ${mode:-unknown} denies content_video (gaming ok to publish)"
    log "render=skip mode=${mode}"
  elif [[ "$gamer_ready" != true ]]; then
    echo "render skip: pc-gamer SSH/health down. Publish can still run from Mac kits."
    log "render=skip gamer_down"
  elif ! should_enqueue; then
    echo "render skip: enqueue interval ${ENQUEUE_H}h not elapsed"
    log "render=skip interval"
  else
    maybe_enqueue bitsitos
    maybe_enqueue splashitos
    if [[ "$DRY_RUN" != true ]]; then
      mark_enqueued
    fi
    if [[ "$DRY_RUN" != true && "$gamer_ready" == true ]]; then
      ./scripts/ops/content-studio-sync-renders.sh || echo "sync renders skipped"
    fi
  fi
fi

echo "24x7 tick done mode=${mode:-unknown} gamer_ready=${gamer_ready}"
log "done mode=${mode} gamer=${gamer_ready}"
exit 0
