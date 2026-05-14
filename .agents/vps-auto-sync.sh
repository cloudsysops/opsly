#!/bin/bash
# .agents/vps-auto-sync.sh
# Auto-sync agents config on VPS (production)
# Run via cron: */5 * * * * cd /opt/opsly && bash .agents/vps-auto-sync.sh >> /var/log/opsly-sync.log 2>&1

set -euo pipefail

REPO_PATH="/opt/opsly"
LOCK_FILE="/tmp/opsly-sync.lock"
LOG_FILE="/var/log/opsly-sync.log"
WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
  age=$(($(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || echo 0)))
  if [ "$age" -lt 300 ]; then  # 5 min timeout
    exit 0
  fi
  rm -f "$LOCK_FILE"
fi
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

cd "$REPO_PATH" || exit 1

# Log sync attempt
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for updates..." >> "$LOG_FILE"

# Fetch latest
git fetch origin main --quiet 2>/dev/null || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: git fetch failed" >> "$LOG_FILE"
  exit 1
}

# Check if behind
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Already in sync ($(echo $LOCAL_COMMIT | cut -c1-8))" >> "$LOG_FILE"
  exit 0
fi

# Pull changes
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Pulling updates..." >> "$LOG_FILE"
git pull origin main --quiet 2>/dev/null || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ PULL FAILED" >> "$LOG_FILE"
  # Rollback
  git reset --hard "$LOCAL_COMMIT" --quiet
  exit 1
}

# Validate new config
if [ -f ".agents/config.json" ]; then
  if ! jq empty .agents/config.json 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Invalid .agents/config.json, rolling back" >> "$LOG_FILE"
    git reset --hard "$LOCAL_COMMIT" --quiet
    exit 1
  fi
fi

# Reload agents
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Reloading agents..." >> "$LOG_FILE"
if command -v node &> /dev/null; then
  node .agents/verify-agents.js >> "$LOG_FILE" 2>&1 || {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Agent verification failed" >> "$LOG_FILE"
  }
fi

# Restart critical services (if systemd)
if systemctl is-active --quiet hermes 2>/dev/null; then
  systemctl restart hermes --quiet 2>/dev/null || true
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Hermes restarted" >> "$LOG_FILE"
fi

# Notify on success
NEW_COMMIT=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -1)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Sync complete: $LOCAL_COMMIT → $(echo $NEW_COMMIT | cut -c1-8)" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📝 Commit: $COMMIT_MSG" >> "$LOG_FILE"

# Discord notification
if [ -n "$WEBHOOK_URL" ]; then
  curl -s -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
      \"embeds\": [{
        \"color\": 5763719,
        \"title\": \"🔄 VPS Agents Synced\",
        \"fields\": [
          {\"name\": \"Previous\", \"value\": \"$(echo $LOCAL_COMMIT | cut -c1-8)\", \"inline\": true},
          {\"name\": \"Current\", \"value\": \"$(echo $NEW_COMMIT | cut -c1-8)\", \"inline\": true},
          {\"name\": \"Commit\", \"value\": \"$COMMIT_MSG\", \"inline\": false},
          {\"name\": \"Time\", \"value\": \"$(date '+%Y-%m-%d %H:%M:%S UTC')\", \"inline\": true}
        ]
      }]
    }" 2>/dev/null || true
fi

exit 0
