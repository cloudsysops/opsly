#!/usr/bin/env bash
# notify-discord.sh — Notificaciones Discord para Opsly
set -euo pipefail

TITLE="Opsly"
MESSAGE="Sin mensaje"
TYPE="info"
DRY_RUN=false
FILE_PATH=""
WEBHOOK_OVERRIDE=""

usage() {
  cat <<'EOF'
Uso:
  notify-discord.sh "Titulo" "Mensaje" "info|success|warning|error" [--dry-run]
  notify-discord.sh --title "Titulo" --message "Mensaje" [--type info] [--dry-run]
  notify-discord.sh --title "Informe Diario" --file /ruta/reporte.md [--type success]
EOF
}

if [[ $# -ge 1 ]] && [[ "${1}" != --* ]]; then
  TITLE="${1:-$TITLE}"
  MESSAGE="${2:-$MESSAGE}"
  TYPE="${3:-$TYPE}"
  shift $(( $# > 3 ? 3 : $# ))
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="${2:-$TITLE}"
      shift 2
      ;;
    --message)
      MESSAGE="${2:-$MESSAGE}"
      shift 2
      ;;
    --type)
      TYPE="${2:-$TYPE}"
      shift 2
      ;;
    --file)
      FILE_PATH="${2:-}"
      shift 2
      ;;
    --webhook-url)
      WEBHOOK_OVERRIDE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[notify-discord] parametro no reconocido: $1" >&2
      usage
      exit 2
      ;;
  esac
done

case "$TYPE" in
  success) COLOR=3066993 ;;
  error) COLOR=15158332 ;;
  warning) COLOR=16776960 ;;
  *) COLOR=3447003 ;;
esac

WEBHOOK="${WEBHOOK_OVERRIDE:-${DISCORD_WEBHOOK_URL:-}}"
if [[ -z "$WEBHOOK" ]] && command -v doppler >/dev/null 2>&1; then
  WEBHOOK="$(cd /opt/opsly 2>/dev/null && doppler secrets get DISCORD_WEBHOOK_URL --plain 2>/dev/null || echo "")"
fi

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
HOST_SHORT="$(hostname -s 2>/dev/null || echo "vps")"
BRANCH="$(git branch --show-current 2>/dev/null || echo "unknown")"

escape_payload_text() {
  echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n' | sed 's/\\n$//'
}

send_payload() {
  local payload="$1"
  local http_status
  http_status="$(curl -s -o /tmp/discord-response.txt -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$WEBHOOK" 2>/dev/null || echo "000")"

  if [[ "$http_status" != "204" ]]; then
    echo "[notify-discord] ERROR: HTTP $http_status" >&2
    if [[ -f /tmp/discord-response.txt ]]; then
      cat /tmp/discord-response.txt >&2 || true
    fi
    exit 1
  fi
}

send_file_content() {
  local file_path="$1"
  local chunk_size=1800
  local content
  content="$(cat "$file_path")"
  local total_chars="${#content}"
  local chunks=$(( (total_chars + chunk_size - 1) / chunk_size ))
  local i

  for ((i=0; i<chunks; i++)); do
    local chunk="${content:$((i * chunk_size)):$chunk_size}"
    local escaped
    escaped="$(escape_payload_text "$chunk")"
    local footer="Parte $((i + 1)) de ${chunks}"
    local payload
    payload="$(printf '{
  "embeds": [{
    "title": "%s",
    "description": "```markdown\n%s\n```",
    "color": %d,
    "timestamp": "%s",
    "footer": {"text": "%s"}
  }]
}' "$TITLE" "$escaped" "$COLOR" "$TIMESTAMP" "$footer")"
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "$payload"
    else
      send_payload "$payload"
      sleep 1
    fi
  done
}

MESSAGE_ESCAPED="$(escape_payload_text "$MESSAGE")"

PAYLOAD="$(printf '{
  "embeds": [{
    "title": "%s",
    "description": "%s",
    "color": %d,
    "timestamp": "%s",
    "fields": [
      {"name": "Rama", "value": "%s", "inline": true},
      {"name": "Host", "value": "%s", "inline": true}
    ],
    "footer": {"text": "Opsly Platform · Automatizacion"}
  }]
}' "$TITLE" "$MESSAGE_ESCAPED" "$COLOR" "$TIMESTAMP" "$BRANCH" "$HOST_SHORT")"

if [[ -z "$WEBHOOK" ]]; then
  echo "[notify-discord] WARNING: DISCORD_WEBHOOK_URL vacia — notificacion omitida" >&2
  exit 0
fi

if [[ -n "$FILE_PATH" ]]; then
  if [[ ! -f "$FILE_PATH" ]]; then
    echo "[notify-discord] ERROR: archivo no encontrado: $FILE_PATH" >&2
    exit 2
  fi
  send_file_content "$FILE_PATH"
  echo "[notify-discord] OK ($TYPE): $TITLE (file)"
  exit 0
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$PAYLOAD"
  exit 0
fi

send_payload "$PAYLOAD"
echo "[notify-discord] OK ($TYPE): $TITLE"
