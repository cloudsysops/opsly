#!/bin/bash
# .agents/health-checks.sh
# Monitor agent health on VPS
# Run via: while true; do bash .agents/health-checks.sh; sleep 30; done

set -euo pipefail

LOG_FILE="/var/log/opsly-health.log"
WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Services to check
declare -A SERVICES=(
  ["mcp"]="http://localhost:3003/health"
  ["llm-gateway"]="https://llm-gateway.op-sly.com/health"
  ["orchestrator"]="http://localhost:3011/health"
  ["api"]="https://api.op-sly.com/api/health"
  ["hermes"]="systemctl is-active hermes"
  ["ollama"]="http://localhost:11434/api/health"
)

# Health status file
STATUS_FILE="/tmp/opsly-health.json"

function check_http() {
  local url=$1
  local timeout=10

  if timeout $timeout curl -s -f -k "$url" > /dev/null 2>&1; then
    echo "UP"
  else
    echo "DOWN"
  fi
}

function check_systemd() {
  local service=$1

  if systemctl is-active --quiet "$service" 2>/dev/null; then
    echo "UP"
  else
    echo "DOWN"
  fi
}

function check_service() {
  local service=$1
  local check=$2

  if [[ $check == systemctl* ]]; then
    local svc=${check#systemctl is-active }
    check_systemd "$svc"
  else
    check_http "$check"
  fi
}

function notify_failure() {
  local service=$1
  local status=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')

  echo "[$timestamp] ❌ $service is $status" >> "$LOG_FILE"

  # Try to restart
  if [[ "$service" == "hermes" ]]; then
    systemctl restart hermes --quiet 2>/dev/null || true
    echo "[$timestamp] 🔄 Attempted hermes restart" >> "$LOG_FILE"
  fi

  # Discord notification
  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{
        \"embeds\": [{
          \"color\": 16711680,
          \"title\": \"❌ Service Down: $service\",
          \"fields\": [
            {\"name\": \"Service\", \"value\": \"$service\", \"inline\": true},
            {\"name\": \"Status\", \"value\": \"$status\", \"inline\": true},
            {\"name\": \"Time\", \"value\": \"$timestamp\", \"inline\": true},
            {\"name\": \"Action\", \"value\": \"Auto-restart attempted\", \"inline\": false}
          ]
        }]
      }" 2>/dev/null || true
  fi
}

function notify_recovery() {
  local service=$1
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')

  echo "[$timestamp] ✅ $service recovered" >> "$LOG_FILE"

  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{
        \"embeds\": [{
          \"color\": 5763719,
          \"title\": \"✅ Service Recovered\",
          \"fields\": [
            {\"name\": \"Service\", \"value\": \"$service\", \"inline\": true},
            {\"name\": \"Status\", \"value\": \"UP\", \"inline\": true},
            {\"name\": \"Time\", \"value\": \"$timestamp\", \"inline\": true}
          ]
        }]
      }" 2>/dev/null || true
  fi
}

# Initialize status file
if [ ! -f "$STATUS_FILE" ]; then
  echo "{}" > "$STATUS_FILE"
fi

# Check all services
CURRENT_STATUS="{}"
ANY_CHANGED=false

for service in "${!SERVICES[@]}"; do
  check="${SERVICES[$service]}"
  status=$(check_service "$service" "$check")

  # Get previous status
  prev_status=$(jq -r ".\"$service\" // \"UNKNOWN\"" "$STATUS_FILE" 2>/dev/null || echo "UNKNOWN")

  # Update status
  CURRENT_STATUS=$(jq ".\"$service\" = \"$status\"" <<< "$CURRENT_STATUS")

  # Detect changes
  if [ "$prev_status" != "$status" ]; then
    ANY_CHANGED=true

    if [ "$status" = "UP" ] && [ "$prev_status" != "UNKNOWN" ]; then
      notify_recovery "$service"
    elif [ "$status" = "DOWN" ]; then
      notify_failure "$service" "DOWN"
    fi
  fi
done

# Save status
echo "$CURRENT_STATUS" > "$STATUS_FILE"

# Summary log
if [ "$ANY_CHANGED" = true ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Status changes detected:" >> "$LOG_FILE"
  for service in "${!SERVICES[@]}"; do
    status=$(jq -r ".\"$service\"" <<< "$CURRENT_STATUS")
    echo "  - $service: $status" >> "$LOG_FILE"
  done
fi

# Keep log file size reasonable
if [ -f "$LOG_FILE" ]; then
  lines=$(wc -l < "$LOG_FILE")
  if [ "$lines" -gt 10000 ]; then
    tail -n 5000 "$LOG_FILE" > "$LOG_FILE.tmp"
    mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
fi

exit 0
