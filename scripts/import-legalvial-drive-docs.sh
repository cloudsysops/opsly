#!/usr/bin/env bash
# import-legalvial-drive-docs.sh — Importa los 3 Google Docs de LegalVial desde Drive al repo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Requiere:
# - Compartir los 3 documentos con la Service Account usada por Opsly (ver salida de:
#     python3 -c "import json,os,subprocess; ..."
#   o el email en `GOOGLE_SERVICE_ACCOUNT_JSON`).
# - Scope amplio de lectura para import (recomendado):
export GOOGLE_DRIVE_IMPORT_SCOPE="${GOOGLE_DRIVE_IMPORT_SCOPE:-https://www.googleapis.com/auth/drive.readonly}"
export GOOGLE_AUTH_STRATEGY="${GOOGLE_AUTH_STRATEGY:-service_account_first}"

ADR016_ID="1CUr3SoHuCaK6bVi06xlx6aew9yXSNaw_80vKHfTBxpU"
PHASE2B_ID="1r2rCcsLZRG3gWYGq_IfS6pYn1Ub6853k4l4zoKRX2rY"
EXEC_SUMMARY_ID="1fg461BWfmpC6VH3CmV5B_eTddofm9T6grwZihT1W0SI"

echo "[import-legalvial] Exportando Google Docs → repo (mime=text/plain)…"

"$SCRIPT_DIR/import-google-doc.sh" \
  --strategy service_account_first \
  --file-id "$ADR016_ID" \
  --out "$REPO_ROOT/docs/adr/ADR-016-legalvial-multitenant-model.drive.txt"

"$SCRIPT_DIR/import-google-doc.sh" \
  --strategy service_account_first \
  --file-id "$PHASE2B_ID" \
  --out "$REPO_ROOT/.cursor/prompts/legalvial-phase2b-automation.drive.txt"

"$SCRIPT_DIR/import-google-doc.sh" \
  --strategy service_account_first \
  --file-id "$EXEC_SUMMARY_ID" \
  --out "$REPO_ROOT/docs/legalvial/LEGALVIAL-ARCHITECTURE-DECISION.drive.txt"

echo "[import-legalvial] OK. Siguiente paso: si los .drive.txt salen vacíos, el Google Doc no tiene cuerpo publicado (revisar contenido en Drive)."
