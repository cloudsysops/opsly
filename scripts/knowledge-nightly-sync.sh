#!/bin/bash

# Knowledge Nightly Sync Job
# Runs every night to:
# 1. Archive inbox captures to sources/
# 2. Regenerate knowledge index
# 3. Commit to GitHub

set -e

REPO_ROOT="${REPO_ROOT:-.}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="${REPO_ROOT}/runtime/logs/knowledge-sync-${TIMESTAMP}.log"

mkdir -p "${REPO_ROOT}/runtime/logs"

echo "[$(date)] Starting knowledge nightly sync..." | tee "${LOG_FILE}"

# 1. Archive inbox to sources
echo "[$(date)] Archiving inbox captures..." | tee -a "${LOG_FILE}"

INBOX_DIR="${REPO_ROOT}/docs/obsidian/inbox"
SOURCES_DIR="${REPO_ROOT}/docs/obsidian/sources"

if [ -d "${INBOX_DIR}" ]; then
  mkdir -p "${SOURCES_DIR}"
  
  # Find all .md files in inbox (except today's)
  TODAY=$(date +%Y-%m-%d)
  ARCHIVE_DIR="${SOURCES_DIR}/archive/$(date +%Y/%m)"
  mkdir -p "${ARCHIVE_DIR}"
  
  for file in "${INBOX_DIR}"/*.md; do
    if [ -f "$file" ]; then
      FILENAME=$(basename "$file")
      # Skip today's file
      if [[ ! "$FILENAME" == "${TODAY}.md" ]]; then
        echo "  Archiving $FILENAME" | tee -a "${LOG_FILE}"
        mv "$file" "${ARCHIVE_DIR}/${FILENAME}"
      fi
    fi
  done
  
  echo "  ✅ Inbox archived" | tee -a "${LOG_FILE}"
else
  echo "  ⚠️ Inbox directory not found" | tee -a "${LOG_FILE}"
fi

# 2. Regenerate knowledge index
echo "[$(date)] Regenerating knowledge index..." | tee -a "${LOG_FILE}"

cd "${REPO_ROOT}"

if bash scripts/index-knowledge.sh >> "${LOG_FILE}" 2>&1; then
  echo "  ✅ Knowledge index regenerated" | tee -a "${LOG_FILE}"
else
  echo "  ❌ Knowledge index regeneration failed" | tee -a "${LOG_FILE}"
  exit 1
fi

# 3. Commit to GitHub
echo "[$(date)] Committing to GitHub..." | tee -a "${LOG_FILE}"

if git diff --quiet config/knowledge-index.json; then
  echo "  ℹ️ No changes to knowledge index" | tee -a "${LOG_FILE}"
else
  echo "  Adding changes..." | tee -a "${LOG_FILE}"
  git add config/knowledge-index.json docs/obsidian/sources/ || true
  
  echo "  Committing..." | tee -a "${LOG_FILE}"
  git config user.name "Opsly Knowledge Bot" || true
  git config user.email "knowledge@opsly.io" || true
  
  if git commit -m "chore(knowledge): nightly sync - index updated + inbox archived" >> "${LOG_FILE}" 2>&1; then
    echo "  Pushing to remote..." | tee -a "${LOG_FILE}"
    
    if git push origin main >> "${LOG_FILE}" 2>&1; then
      echo "  ✅ Committed and pushed" | tee -a "${LOG_FILE}"
    else
      echo "  ⚠️ Push failed (network issue, will retry)" | tee -a "${LOG_FILE}"
    fi
  else
    echo "  ℹ️ No changes to commit" | tee -a "${LOG_FILE}"
  fi
fi

# 4. Notify
echo "[$(date)] Nightly sync completed ✅" | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"
echo "Summary:" | tee -a "${LOG_FILE}"
echo "  - Inbox archived: $(find "${SOURCES_DIR}/archive" -name '*.md' 2>/dev/null | wc -l) files" | tee -a "${LOG_FILE}"
echo "  - Index updated: $(date -r "${REPO_ROOT}/config/knowledge-index.json" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'N/A')" | tee -a "${LOG_FILE}"
echo "  - Log: ${LOG_FILE}" | tee -a "${LOG_FILE}"

exit 0
