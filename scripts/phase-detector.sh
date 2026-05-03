#!/usr/bin/env bash
set -euo pipefail

# Phase Detector — Automatically detects Opsly Local Services phase completion
# and notifies internal channels (Discord/Slack)

ROOT="$(git rev-parse --show-toplevel)"
PHASE_STATE_FILE="$ROOT/.github/phase-state.json"

# ─── Phase Detection ────────────────────────────────────────────

detect_phase() {
  local phase="none"

  # Phase 0: Documentation complete
  if [ -f "$ROOT/docs/adr/ADR-037-opsly-local-services-multi-tenant.md" ] && \
     [ -f "$ROOT/.cursor/prompts/local-services-tech-builder.md" ] && \
     [ -f "$ROOT/docs/PHASE-1-EXECUTION.md" ]; then
    phase="0"
  fi

  # Phase 1: API infrastructure complete
  if [ -f "$ROOT/supabase/migrations/0046_local_services_core.sql" ] && \
     [ -f "$ROOT/apps/api/lib/local-services-dal.ts" ] && \
     [ -d "$ROOT/apps/local-services" ] && \
     [ -f "$ROOT/apps/api/app/api/local-services/tenants/\[slug\]/bookings/route.ts" ]; then
    phase="1"
  fi

  # Phase 2: Automation workflows complete
  if [ -f "$ROOT/.n8n/1-workflows/local-services-booking-confirmation.json" ] && \
     [ -f "$ROOT/.n8n/1-workflows/local-services-post-service-report.json" ] && \
     [ -f "$ROOT/apps/api/app/api/local-services/webhooks/booking-created/route.ts" ]; then
    phase="2"
  fi

  echo "$phase"
}

# ─── State Management ────────────────────────────────────────────

load_phase_state() {
  if [ -f "$PHASE_STATE_FILE" ]; then
    jq -r '.current_phase // "none"' "$PHASE_STATE_FILE"
  else
    echo "none"
  fi
}

save_phase_state() {
  local phase="$1"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$ROOT/.github"

  cat > "$PHASE_STATE_FILE" <<EOF
{
  "current_phase": "$phase",
  "last_updated": "$timestamp",
  "branch": "$(git branch --show-current)",
  "commit": "$(git rev-parse HEAD)"
}
EOF
}

# ─── Notifications ────────────────────────────────────────────

notify_phase_completion() {
  local phase="$1"
  local branch=$(git branch --show-current)
  local commit=$(git rev-parse --short HEAD)
  local author=$(git log -1 --pretty="%an")

  case "$phase" in
    0)
      title="✅ Phase 0 Complete: Documentation & Architecture"
      description="ADRs, Cursor prompts, and implementation plan ready for Phase 1 development."
      next="→ Phase 1: Cursor builds API infrastructure"
      ;;
    1)
      title="✅ Phase 1 Complete: API Infrastructure"
      description="Database migrations, tenant isolation, booking endpoints, and Next.js UI deployed."
      next="→ Phase 2: Cursor builds automation workflows (n8n, webhooks, integrations)"
      ;;
    2)
      title="✅ Phase 2 Complete: Automation & Integrations"
      description="n8n workflows, webhook listeners, SendGrid/Twilio/Stripe integration complete."
      next="→ Phase 3: Technician portal, auto-assignment, analytics"
      ;;
    *)
      return
      ;;
  esac

  # Discord notification
  if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
    curl -X POST "$DISCORD_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d @- <<DISCORD_PAYLOAD
{
  "embeds": [{
    "title": "$title",
    "description": "$description\n\n**Next:** $next",
    "color": 3066993,
    "fields": [
      {"name": "Branch", "value": "\`$branch\`", "inline": true},
      {"name": "Commit", "value": "\`$commit\`", "inline": true},
      {"name": "Author", "value": "$author", "inline": true}
    ],
    "footer": {"text": "Opsly Local Services — Multi-agent development"}
  }]
}
DISCORD_PAYLOAD
  fi

  # Slack notification
  if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d @- <<SLACK_PAYLOAD
{
  "text": "$title",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*$title*\n$description"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Branch: \`$branch\` • Commit: \`$commit\` • Author: $author"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Next:* $next"
      }
    }
  ]
}
SLACK_PAYLOAD
  fi
}

# ─── Main ────────────────────────────────────────────────────────────

main() {
  local current_phase=$(detect_phase)
  local last_phase=$(load_phase_state)

  # Phase transition detected
  if [ "$current_phase" != "$last_phase" ] && [ "$current_phase" != "none" ]; then
    echo "🚀 Phase transition detected: $last_phase → $current_phase"
    save_phase_state "$current_phase"
    notify_phase_completion "$current_phase"
  fi
}

main "$@"
