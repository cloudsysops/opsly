#!/bin/bash
# sync-docs-to-drive.sh — Sube docs a Google Drive Opsly
# Requiere: GOOGLE_SERVICE_ACCOUNT_JSON en Doppler (prd)

set -euo pipefail

FOLDER_ID="1r8fFtPnYRCjH1OEzLmXe7u-vcpWGqnWf"
OUTPUT_DIR="/tmp/opsly-drive-sync"
mkdir -p "$OUTPUT_DIR"

echo "📦 Preparando archivos para Drive..."

# Copy docs clave
cp AGENTS.md "$OUTPUT_DIR/"
cp VISION.md "$OUTPUT_DIR/"
cp context/system_state.json "$OUTPUT_DIR/"
cp docs/KNOWLEDGE-SYSTEM.md "$OUTPUT_DIR/"
cp docs/NOTEBOOKLM-SETUP.md "$OUTPUT_DIR/"
cp docs/OPSLY-KNOWLEDGE-BASE.md "$OUTPUT_DIR/"

# Skills merged
echo "# Opsly Skills" > "$OUTPUT_DIR/opsly-skills.md"
for skill in skills/user/*/; do
  echo "## $(basename $skill)" >> "$OUTPUT_DIR/opsly-skills.md"
  cat "$skill/SKILL.md" >> "$OUTPUT_DIR/opsly-skills.md"
  echo "" >> "$OUTPUT_DIR/opsly-skills.md"
done

echo "✅ Archivos preparados:"
ls -lh "$OUTPUT_DIR/"

echo ""
echo "📤 A SUBIR A DRIVE:"
echo "1. Abre: https://drive.google.com/drive/folders/$FOLDER_ID"
echo "2. Sube los archivos de: $OUTPUT_DIR"
echo ""
echo "📝 Archivos a subir:"
ls "$OUTPUT_DIR/"