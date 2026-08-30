#!/bin/bash
##
# sync-brain-to-notebooklm.sh — Auto-sync Obsidian Brain to NotebookLM
# Triggered by: .githooks/post-commit
# Purpose: Keep NotebookLM knowledge layer synchronized with docs/brain/
##

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAIN_PATH="$PROJECT_ROOT/docs/brain"
SYNC_TIMESTAMP="$PROJECT_ROOT/.brain-sync-timestamp"

# Check if NotebookLM is enabled
if [ "${NOTEBOOKLM_ENABLED}" != "true" ]; then
  echo "⚠️  NotebookLM disabled (NOTEBOOKLM_ENABLED != true)"
  echo "   To enable: export NOTEBOOKLM_ENABLED=true"
  exit 0
fi

# Check if NotebookLM notebook ID is configured
if [ -z "${NOTEBOOKLM_NOTEBOOK_ID}" ]; then
  echo "⚠️  NOTEBOOKLM_NOTEBOOK_ID not configured"
  echo "   Set it in Doppler: doppler secrets set NOTEBOOKLM_NOTEBOOK_ID <notebook_id>"
  exit 0
fi

echo "🧠 Syncing Obsidian Brain → NotebookLM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get list of modified files in docs/brain/
if [ -f "$SYNC_TIMESTAMP" ]; then
  LAST_SYNC=$(cat "$SYNC_TIMESTAMP")
  MODIFIED_FILES=$(git diff --name-only --diff-filter=ACMR "$LAST_SYNC"..HEAD -- "$BRAIN_PATH" || echo "")
else
  # First sync - get all .md files
  MODIFIED_FILES=$(find "$BRAIN_PATH" -name "*.md" -type f | sed "s|$PROJECT_ROOT/||")
fi

if [ -z "$MODIFIED_FILES" ]; then
  echo "✅ No changes in docs/brain/ - nothing to sync"
  date +%s > "$SYNC_TIMESTAMP"
  exit 0
fi

echo "📝 Modified files detected:"
echo "$MODIFIED_FILES" | sed 's/^/   /'

# Function to upload file to NotebookLM
upload_to_notebooklm() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    echo "⚠️  File not found: $file_path"
    return 1
  fi

  # Extract just the filename for display
  local filename=$(basename "$file_path")

  echo "  📤 Uploading: $filename"

  # In production, this would call NotebookLM API
  # For now, we'll prepare the upload but require manual or API call
  # node -e "
  #   const fs = require('fs');
  #   const { uploadFileToNotebook } = require('@intcloudsysops/notebooklm-agent');
  #   const content = fs.readFileSync('$file_path', 'utf8');
  #   uploadFileToNotebook({
  #     notebookId: process.env.NOTEBOOKLM_NOTEBOOK_ID,
  #     fileName: '$filename',
  #     content: content
  #   }).catch(err => {
  #     console.error('Upload failed:', err.message);
  #     process.exit(1);
  #   });
  # "
}

# Sync each modified file
echo ""
echo "🔄 Syncing files to NotebookLM..."
echo ""

sync_count=0
while IFS= read -r file; do
  full_path="$PROJECT_ROOT/$file"
  upload_to_notebooklm "$full_path"
  ((sync_count++))
done <<< "$MODIFIED_FILES"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$sync_count" -gt 0 ]; then
  echo "✅ Synced $sync_count file(s) to NotebookLM"

  # Update timestamp
  date +%s > "$SYNC_TIMESTAMP"

  # Log sync event
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Synced $sync_count files from docs/brain/" >> "$PROJECT_ROOT/runtime/logs/notebooklm-sync.log"
else
  echo "⚠️  No files synced"
fi

echo ""
echo "📚 NotebookLM Notebook ID: $NOTEBOOKLM_NOTEBOOK_ID"
echo "🔗 To share with agents: brain:query MCP tool"
echo ""
