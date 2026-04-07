#!/usr/bin/env bash
# notify-discord.sh — Notificaciones Discord para Opsly
set -euo pipefail

TITLE="${1:-Opsly}"
MESSAGE="${2:-Sin mensaje}"
TYPE="${3:-info}"
DRY_RUN=false
if [[ "${4:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

case "$TYPE" in
  success) COLOR=3066993 ;;
  error) COLOR=15158332 ;;
  warning) COLOR=16776960 ;;
  *) COLOR=3447003 ;;
esac

WEBHOOK="${DISCORD_WEBHOOK_URL:-}"
if [[ -z "$WEBHOOK" ]] && command -v doppler >/dev/null 2>&1; then
  WEBHOOK="$(cd /opt/opsly 2>/dev/null && doppler secrets get DISCORD_WEBHOOK_URL --plain 2>/dev/null || echo "")"
fi

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
HOST_SHORT="$(hostname -s 2>/dev/null || echo "vps")"
BRANCH="$(git branch --show-current 2>/dev/null || echo "unknown")"

MESSAGE_ESCAPED="$(echo "$MESSAGE" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n' | sed 's/\\n$//')"

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

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$PAYLOAD"
  exit 0
fi

if [[ -z "$WEBHOOK" ]]; then
  echo "[notify-discord] WARNING: DISCORD_WEBHOOK_URL vacia — notificacion omitida" >&2
  exit 0
fi

HTTP_STATUS="$(curl -s -o /tmp/discord-response.txt -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$WEBHOOK" 2>/dev/null || echo "000")"

if [[ "$HTTP_STATUS" != "204" ]]; then
  echo "[notify-discord] ERROR: HTTP $HTTP_STATUS" >&2
  if [[ -f /tmp/discord-response.txt ]]; then
    cat /tmp/discord-response.txt >&2 || true
  fi
  exit 1
fi

echo "[notify-discord] OK ($TYPE): $TITLE"
