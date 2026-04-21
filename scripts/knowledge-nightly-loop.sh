#!/usr/bin/env bash
# Knowledge Brain - Nightly Loop
# Ejecuta el ciclo completo de absorción de conocimiento cada noche
#
# Usage:
#   ./scripts/knowledge-nightly-loop.sh          # Modo ejecución
#   ./scripts/knowledge-nightly-loop.sh --dry-run  # Modo dry-run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Default query temas del cerebro
QUERY="${ARCHIVE_INGEST_QUERY:-programming OR software design OR marketing OR defensive cybersecurity}"
ROWS="${ARCHIVE_INGEST_ROWS:-15}"

# Flags
DRY_RUN=false
FORCE=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
  esac
done

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

echo "┌─────────────────────────────────────────────────────"
echo "│           KNOWLEDGE BRAIN - NIGHTLY LOOP            │"
echo "└─────────────────────────────────────────────────────"
log "Started: $(date)"
log "Query: $QUERY"
log "Rows: $ROWS"

if [ "$DRY_RUN" = true ]; then
  log "🟡 DRY-RUN MODE - No changes will be made"
  exit 0
fi

# ──────────────────────────────────────────────
# 1. Bootstrap agentes internos
# ──────────────────────────────────────────────
log "1️⃣ Bootstrap internal agents..."
cd "$REPO_ROOT"
bash "$SCRIPT_DIR/agent-hooks.sh" bootstrap --mode internal

# ──────────────────────────────────────────────
# 2. Bootstrap agentes externos
# ──────────────────────────────────────────────
log "2️⃣ Bootstrap external agents..."
bash "$SCRIPT_DIR/agent-hooks.sh" bootstrap --mode external

# ──────────────────────────────────────────────
# 3. Sync skills externas
# ──────────────────────────────────────────────
log "3️⃣ Sync skills external..."
bash "$SCRIPT_DIR/sync-skills-external.sh"

# ──────────────────────────────────────────────
# 4. Ingesta desde Internet Archive
# ──────────────────────────────────────────────
log "4️⃣ Ingest from Internet Archive..."
node "$SCRIPT_DIR/archive-to-obsidian.mjs" --query "$QUERY" --rows "$ROWS"

# ──────────────────────────────────────────────
# 5. Sync a NotebookLM (si configurado)
# ──────────────────────────────────────────────
if [ "${NOTEBOOKLM_ENABLED:-false}" = "true" ]; then
  log "5️⃣ Sync to NotebookLM..."
  node "$SCRIPT_DIR/docs-to-notebooklm.mjs" 2>/dev/null || log "⚠�� NotebookLM sync skipped"
else
  log "5️⃣ ⏭️ NotebookLM disabled (NOTEBOOKLM_ENABLED=false)"
fi

# ──────────────────────────────────────────────
# 6. Notificar a n8n (si configurado)
# ──────────────────────────────────────────────
if [ -n "${N8N_WEBHOOK_URL:-}" ]; then
  log "6️⃣ Notify n8n..."
  curl -s -X POST "${N8N_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"event\": \"knowledge-nightly-complete\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"query\": \"$QUERY\"}" \
    || log "⚠️ n8n notification failed"
else
  log "6️⃣ ⏭️ n8n webhook not configured"
fi

# ──────────────────────────────────────────────
# 7. Commit cambios
# ──────────────────────────────────────────────
log "7️⃣ Commit changes to git..."
cd "$REPO_ROOT"
git add docs/obsidian/sources/archive/ scripts/agents/ 2>/dev/null || true
git status --short docs/obsidian/ scripts/agents/ 2>/dev/null | grep -q . && {
  git config --local user.email "knowledge-brain@opsly.com"
  git config --local user.name "Knowledge Brain"
  git commit -m "brain: nightly knowledge sync $(date -u +%Y-%m-%d)" 2>/dev/null || log "No changes to commit"
} || log "No changes"

log "✅ Nightly loop completed"
log "Finished: $(date)"
echo "─────────────────────────────────────────────────────"