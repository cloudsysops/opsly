#!/usr/bin/env bash
# Loop automático: espera OAuth client (opslyquantum) → Doppler → upload Bitsitos.
# No usa JSON de SmileTripCare. Idempotente. Ctrl+C para parar.
#
# Uso:
#   ./scripts/youtube-oauth-auto-loop.sh              # OAuth + Doppler; NO upload
#   ./scripts/youtube-oauth-auto-loop.sh --upload --upload-limit 1
#   ./scripts/youtube-oauth-auto-loop.sh --dry-run
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"
TARGET="${YOUTUBE_OAUTH_JSON:-${HOME}/Downloads/youtube-oauth-client.json}"
DOWNLOADS="${HOME}/Downloads"
LOG="${ROOT}/runtime/content-studio/oauth-auto-loop.log"
STATE="${ROOT}/runtime/content-studio/oauth-auto-loop.state"
POLL_SEC="${POLL_SEC:-8}"
UPLOAD_LIMIT="${UPLOAD_LIMIT:-0}" # 0 = all kit
DRY_RUN=0
SKIP_UPLOAD=1

mkdir -p "$(dirname "$LOG")"
exec > >(tee -a "$LOG") 2>&1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --skip-upload) SKIP_UPLOAD=1; shift ;;
    --upload) SKIP_UPLOAD=0; shift ;;
    --upload-limit)
      UPLOAD_LIMIT="${2:-0}"
      shift 2
      ;;
    --poll)
      POLL_SEC="${2:-8}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }

doppler_has() {
  local name="$1"
  doppler secrets get "$name" --plain --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" >/dev/null 2>&1
}

oauth_ready() {
  doppler_has YOUTUBE_CLIENT_ID \
    && doppler_has YOUTUBE_CLIENT_SECRET \
    && doppler_has YOUTUBE_REFRESH_TOKEN
}

# Reject SmileTripCare / other projects. Accept opslyquantum (or empty project_id on Desktop).
json_is_opslyquantum() {
  local path="$1"
  [[ -f "$path" ]] || return 1
  python3 - "$path" <<'PY'
import json, sys
path = sys.argv[1]
try:
    raw = json.load(open(path, encoding="utf-8"))
except Exception:
    sys.exit(1)
block = raw.get("installed") or raw.get("web") or {}
project = (block.get("project_id") or raw.get("project_id") or "").strip().lower()
cid = (block.get("client_id") or "").strip()
sec = (block.get("client_secret") or "").strip()
if not cid or not sec:
    sys.exit(1)
# Explicit reject known bad projects
bad = ("smiletripcare", "smile-trip", "stc-")
if any(b in project for b in bad):
    sys.exit(2)
# Prefer opslyquantum; allow Desktop JSON without project_id if not smile*
if project and project != "opslyquantum":
    sys.exit(3)
sys.exit(0)
PY
}

find_candidate_json() {
  if [[ -f "$TARGET" ]] && json_is_opslyquantum "$TARGET"; then
    echo "$TARGET"
    return 0
  fi
  local f
  # Newest client_secret / oauth json that validates
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if json_is_opslyquantum "$f"; then
      echo "$f"
      return 0
    fi
  done < <(ls -t "$DOWNLOADS"/client_secret*.json "$DOWNLOADS"/*oauth*.json "$DOWNLOADS"/youtube*.json 2>/dev/null || true)
  return 1
}

promote_json() {
  local src="$1"
  if [[ "$src" == "$TARGET" ]]; then
    return 0
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "[dry-run] cp $src → $TARGET"
    return 0
  fi
  cp "$src" "$TARGET"
  log "Promoted OAuth JSON → $TARGET"
}

run_oauth_setup() {
  local json="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "[dry-run] ./scripts/youtube-oauth-doppler-setup.sh --client-json $json"
    return 0
  fi
  log "Running youtube-oauth-doppler-setup.sh (browser consent required once)…"
  ./scripts/youtube-oauth-doppler-setup.sh --client-json "$json"
}

run_upload() {
  if [[ "$SKIP_UPLOAD" -eq 1 ]]; then
    log "Skip upload (--skip-upload)"
    return 0
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "[dry-run] npm run content:bitsitos:upload"
    return 0
  fi
  log "Uploading Bitsitos kit via API…"
  if [[ "$UPLOAD_LIMIT" -gt 0 ]]; then
    doppler run --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" -- \
      bash scripts/content-studio-publish-youtube.sh --channel bitsitos --upload --limit "$UPLOAD_LIMIT"
  else
    npm run content:bitsitos:upload
  fi
}

open_gcp_hints() {
  # Best-effort: open Console tabs for human if still blocked
  open "https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=opslyquantum" 2>/dev/null || true
  open "https://console.cloud.google.com/apis/credentials?project=opslyquantum" 2>/dev/null || true
}

log "=== YouTube OAuth auto-loop START ==="
log "Target JSON: $TARGET"
log "Doppler: $DOPPLER_PROJECT/$DOPPLER_CONFIG"
log "Poll every ${POLL_SEC}s until CLIENT_ID+SECRET+REFRESH_TOKEN exist"

iteration=0
last_hint=0

while true; do
  iteration=$((iteration + 1))

  if oauth_ready; then
    log "Doppler OAuth completo ✓"
    echo "configured $(ts)" >"$STATE"
    run_upload
    log "=== DONE — factory upload path active ==="
    exit 0
  fi

  candidate=""
  if candidate="$(find_candidate_json)"; then
    log "Found valid OAuth JSON: $candidate"
    promote_json "$candidate"
    if run_oauth_setup "$TARGET"; then
      if oauth_ready; then
        log "OAuth setup OK"
        continue
      fi
      log "Setup finished but Doppler still missing secrets — retrying…"
    else
      log "OAuth setup failed (consent timeout or error). Will retry when JSON present…"
    fi
  else
    if (( iteration == 1 || iteration % 15 == 0 )); then
      now=$(date +%s)
      if (( now - last_hint > 120 )); then
        log "WAITING: descarga Desktop OAuth de opslyquantum como:"
        log "  $TARGET"
        log "  Checklist: docs/brand/icso/OPSLYQUANTUM-YOUTUBE-SETUP.md"
        log "  (ignorando client_secret SmileTripCare si existe)"
        open_gcp_hints
        last_hint=$now
      fi
    fi
  fi

  sleep "$POLL_SEC"
done
