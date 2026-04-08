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

# Extrae mensaje corto del JSON de error de Drive API (p. ej. storageQuotaExceeded en Mi unidad).
drive_api_error_hint() {
  local body_file="$1"
  python3 -c '
import json, sys
try:
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    err = d.get("error") or {}
    msg = (err.get("message") or "")[:220]
    for e in err.get("errors") or []:
        r = e.get("reason") or ""
        if r == "storageQuotaExceeded":
            msg = ("Service accounts no tienen cuota en Mi unidad personal. Mueve la carpeta a un "
                   "Shared Drive (Drive compartido) y da Editor/Content manager a la SA, u oAuth de usuario. "
                   + msg)
            break
    print(msg)
except Exception:
    print("")
' "$body_file" 2>/dev/null || echo ""
}

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

source "$SCRIPT_DIR/lib/google-auth.sh"

# Mi unidad personal: OAuth usuario primero (cuota). Shared Drive con SA: export GOOGLE_AUTH_STRATEGY=service_account_first
export GOOGLE_AUTH_STRATEGY="${GOOGLE_AUTH_STRATEGY:-user_first}"

TOKEN="$(get_google_token || true)"
if [[ -z "$TOKEN" ]]; then
  warn "No se pudo obtener access token (usuario OAuth / SA / ADC) — Drive sync omitido"
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

  # supportsAllDrives/includeItemsFromAllDrives: obligatorio si la carpeta está en un Shared Drive (si no, 403 aunque seas Editor).
  existing="$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "https://www.googleapis.com/drive/v3/files?q=name='$filename'+and+'$FOLDER_ID'+in+parents+and+trashed=false&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true" \
    2>/dev/null || echo '{"files":[]}')"

  file_id="$(echo "$existing" | python3 -c "import sys,json; d=json.load(sys.stdin); f=d.get('files', []); print(f[0]['id'] if f else '')" 2>/dev/null || echo "")"
  mime="text/plain"
  if [[ "$filename" == *.md ]]; then
    mime="text/markdown"
  fi

  if [[ -n "$file_id" ]]; then
    err_body="$(mktemp)"
    http="$(curl -s -o "$err_body" -w "%{http_code}" \
      -X PATCH \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: $mime" \
      --data-binary "@$filepath" \
      "https://www.googleapis.com/upload/drive/v3/files/$file_id?uploadType=media&supportsAllDrives=true" \
      2>/dev/null || echo "000")"
    if [[ "$http" == "200" ]]; then
      rm -f "$err_body"
      log "  updated: $filename"
      return 0
    fi
    hint="$(drive_api_error_hint "$err_body")"
    rm -f "$err_body"
    warn "  error actualizando $filename (HTTP $http)${hint:+ — $hint}"
    return 1
  fi
  metadata="$(printf '{"name":"%s","parents":["%s"]}' "$filename" "$FOLDER_ID")"
  err_body="$(mktemp)"
  http="$(curl -s -o "$err_body" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "metadata=$metadata;type=application/json" \
    -F "file=@$filepath;type=$mime" \
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true" \
    2>/dev/null || echo "000")"
  if [[ "$http" == "200" ]]; then
    rm -f "$err_body"
    log "  created: $filename"
    return 0
  fi
  hint="$(drive_api_error_hint "$err_body")"
  rm -f "$err_body"
  warn "  error creando $filename (HTTP $http)${hint:+ — $hint}"
  return 1
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
