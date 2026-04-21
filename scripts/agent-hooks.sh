#!/usr/bin/env bash
# agent-hooks.sh — Hooks unificados para agentes internos y externos.
# Integra: Skills catalog, Obsidian inbox, NotebookLM sync y n8n webhook.
#
# Uso:
#   ./scripts/agent-hooks.sh bootstrap --mode internal
#   ./scripts/agent-hooks.sh bootstrap --mode external
#   ./scripts/agent-hooks.sh post-commit
#   ./scripts/agent-hooks.sh n8n-notify --event "custom_event"
#   ./scripts/agent-hooks.sh obsidian-note --title "Agente X" --message "Resumen"
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="internal"
EVENT="agent_event"
TITLE="Opsly Agent Event"
MESSAGE=""
DRY_RUN=false
COMMAND="${1:-}"
if [[ -n "$COMMAND" ]]; then
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-internal}"
      shift 2
      ;;
    --event)
      EVENT="${2:-agent_event}"
      shift 2
      ;;
    --title)
      TITLE="${2:-Opsly Agent Event}"
      shift 2
      ;;
    --message)
      MESSAGE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

append_obsidian_note() {
  local note_title="$1"
  local note_message="$2"
  local note_dir="$REPO_ROOT/docs/obsidian/inbox"
  local note_file="$note_dir/$(date '+%Y-%m-%d').md"

  if [[ -z "$note_message" ]]; then
    return 0
  fi

  if $DRY_RUN; then
    log "DRY-RUN: append Obsidian note -> $note_file"
    return 0
  fi

  mkdir -p "$note_dir"
  {
    echo ""
    echo "## ${note_title}"
    echo "- timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "- mode: ${MODE}"
    echo "- message: ${note_message}"
    echo "- tags: #opsly #agents #hooks"
  } >> "$note_file"
}

sync_skills_catalog() {
  if $DRY_RUN; then
    log "DRY-RUN: sync skills catalog to /mnt/skills"
    return 0
  fi
  (cd "$REPO_ROOT" && bash scripts/sync-skills-external.sh) || true
}

sync_notebooklm_if_enabled() {
  if [[ "${NOTEBOOKLM_ENABLED:-false}" != "true" ]]; then
    return 0
  fi
  if $DRY_RUN; then
    log "DRY-RUN: notebooklm sync"
    return 0
  fi
  (cd "$REPO_ROOT" && npm run notebooklm:sync) || true
}

sync_archive_if_enabled() {
  if [[ "${ARCHIVE_INGEST_ENABLED:-true}" != "true" ]]; then
    return 0
  fi
  if $DRY_RUN; then
    log "DRY-RUN: archive ingest to Obsidian"
    return 0
  fi
  local query="${ARCHIVE_INGEST_QUERY:-programming OR software design OR marketing OR defensive cybersecurity}"
  local rows="${ARCHIVE_INGEST_ROWS:-8}"
  (cd "$REPO_ROOT" && node scripts/archive-to-obsidian.mjs --query "$query" --rows "$rows") || true
}

n8n_notify() {
  local event_name="$1"
  if [[ -z "${N8N_WEBHOOK_URL:-}" ]]; then
    log "n8n webhook not configured; skipping."
    return 0
  fi

  local payload
  payload="$(cat <<EOF
{
  "event": "${event_name}",
  "mode": "${MODE}",
  "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "repo": "intcloudsysops"
}
EOF
)"

  if $DRY_RUN; then
    log "DRY-RUN: POST n8n webhook for event=${event_name}"
    return 0
  fi

  curl -sS -X POST "${N8N_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "${payload}" >/dev/null || true
}

bootstrap() {
  log "agent bootstrap mode=${MODE}"
  sync_skills_catalog
  sync_archive_if_enabled
  sync_notebooklm_if_enabled
  append_obsidian_note "Agent Bootstrap" "Bootstrap executed for ${MODE} agent."
  n8n_notify "agent_bootstrap_${MODE}"
}

post_commit() {
  log "agent post-commit hooks"
  sync_skills_catalog
  sync_archive_if_enabled
  sync_notebooklm_if_enabled
  append_obsidian_note "Post Commit Sync" "Post-commit sync executed."
  n8n_notify "agent_post_commit"
}

case "$COMMAND" in
  bootstrap)
    bootstrap
    ;;
  post-commit)
    post_commit
    ;;
  n8n-notify)
    n8n_notify "$EVENT"
    ;;
  obsidian-note)
    append_obsidian_note "$TITLE" "$MESSAGE"
    ;;
  *)
    cat <<EOF
Usage:
  $0 bootstrap --mode <internal|external> [--dry-run]
  $0 post-commit [--dry-run]
  $0 n8n-notify --event <name> [--mode internal|external] [--dry-run]
  $0 obsidian-note --title "<title>" --message "<message>" [--mode internal|external] [--dry-run]
EOF
    exit 1
    ;;
esac
