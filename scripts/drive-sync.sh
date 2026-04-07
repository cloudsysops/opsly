#!/usr/bin/env bash
# drive-sync.sh — Sincroniza docs clave de Opsly a Google Drive
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FOLDER_ID="1r8fFtPnYRCjH1OEzLmXe7u-vcpWGqnWf"
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

FILES=(
  "AGENTS.md"
  "VISION.md"
  "docs/OPENCLAW-ARCHITECTURE.md"
  "docs/CLAUDE-WORKFLOW-OPTIMIZATION.md"
  "docs/INVITATIONS_RUNBOOK.md"
  "docs/AUTOMATION-PLAN.md"
  "docs/FAQ.md"
  "docs/TROUBLESHOOTING.md"
)

log() { echo "[drive-sync] $*"; }
warn() { echo "[drive-sync] WARNING: $*" >&2; }

if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN — archivos que se subirian a Drive:"
  for f in "${FILES[@]}"; do
    fp="$REPO_ROOT/$f"
    if [[ -f "$fp" ]]; then
      SIZE=$(wc -c < "$fp")
      log "  OK $f ($SIZE bytes)"
    else
      log "  MISS $f (no existe en repo)"
    fi
  done
  log "Folder destino: $FOLDER_ID"
  exit 0
fi

TOKEN="${GOOGLE_DRIVE_TOKEN:-}"
if [[ -z "$TOKEN" ]] && command -v doppler >/dev/null 2>&1; then
  TOKEN="$(cd /opt/opsly 2>/dev/null && doppler secrets get GOOGLE_DRIVE_TOKEN --plain 2>/dev/null || echo "")"
fi

if [[ -z "$TOKEN" ]]; then
  warn "GOOGLE_DRIVE_TOKEN vacio — Drive sync omitido"
  warn "Para activar: doppler secrets set GOOGLE_DRIVE_TOKEN --project ops-intcloudsysops --config prd"
  exit 0
fi

upload_file() {
  local filepath="$1"
  local filename
  local existing
  local file_id
  local mime
  local http
  local metadata
  filename="$(basename "$filepath")"

  existing="$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "https://www.googleapis.com/drive/v3/files?q=name='$filename'+and+'$FOLDER_ID'+in+parents+and+trashed=false&fields=files(id,name)" \
    2>/dev/null || echo '{"files":[]}')"

  file_id="$(echo "$existing" | python3 -c "import sys,json; d=json.load(sys.stdin); f=d.get('files', []); print(f[0]['id'] if f else '')" 2>/dev/null || echo "")"
  mime="text/plain"
  if [[ "$filename" == *.md ]]; then
    mime="text/markdown"
  fi

  if [[ -n "$file_id" ]]; then
    http="$(curl -s -o /dev/null -w "%{http_code}" \
      -X PATCH \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: $mime" \
      --data-binary "@$filepath" \
      "https://www.googleapis.com/upload/drive/v3/files/$file_id?uploadType=media" \
      2>/dev/null || echo "000")"
    if [[ "$http" == "200" ]]; then
      log "  updated: $filename"
    else
      warn "  error actualizando $filename (HTTP $http)"
    fi
  else
    metadata="$(printf '{"name":"%s","parents":["%s"]}' "$filename" "$FOLDER_ID")"
    http="$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -F "metadata=$metadata;type=application/json" \
      -F "file=@$filepath;type=$mime" \
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart" \
      2>/dev/null || echo "000")"
    if [[ "$http" == "200" ]]; then
      log "  created: $filename"
    else
      warn "  error creando $filename (HTTP $http)"
    fi
  fi
}

log "Iniciando sync a Drive folder: $FOLDER_ID"
SYNCED=0
FAILED=0

for f in "${FILES[@]}"; do
  fp="$REPO_ROOT/$f"
  if [[ -f "$fp" ]]; then
    if upload_file "$fp"; then
      ((SYNCED++))
    else
      ((FAILED++))
    fi
  else
    warn "  no existe: $f"
  fi
done

log "Sync completo: $SYNCED subidos, $FAILED errores"

if [[ $FAILED -eq 0 ]]; then
  "$SCRIPT_DIR/notify-discord.sh" \
    "Drive Sync" \
    "$SYNCED archivos sincronizados a Google Drive" \
    "info" 2>/dev/null || true
else
  "$SCRIPT_DIR/notify-discord.sh" \
    "Drive Sync warning" \
    "$SYNCED OK | $FAILED errores" \
    "warning" 2>/dev/null || true
fi
