#!/bin/bash
# upload-to-notebooklm.sh — Sube docs a NotebookLM
# Usage: ./scripts/upload-to-notebooklm.sh

NOTEBOOK_ID="8447967c-f375-47d6-a920-c3100efd7e7b"
OUTPUT_DIR="/tmp/opsly-notebooklm-upload"

mkdir -p "$OUTPUT_DIR"

echo "📦 Preparando archivos..."

# Copy key docs
cp AGENTS.md "$OUTPUT_DIR/"
cp VISION.md "$OUTPUT_DIR/"
cp context/system_state.json "$OUTPUT_DIR/"
cp docs/KNOWLEDGE-SYSTEM.md "$OUTPUT_DIR/"
cp docs/NOTEBOOKLM-SETUP.md "$OUTPUT_DIR/"

# Merge all skills
echo "# Opsly Skills" > "$OUTPUT_DIR/opsly-skills.md"
for skill in skills/user/*/; do
  echo "## $(basename $skill)" >> "$OUTPUT_DIR/opsly-skills.md"
  cat "$skill/SKILL.md" >> "$OUTPUT_DIR/opsly-skills.md"
  echo "" >> "$OUTPUT_DIR/opsly-skills.md"
done

# Copy skills
cp docs/OPSLY-KNOWLEDGE-BASE.md "$OUTPUT_DIR/" 2>/dev/null

echo "✅ Archivos preparados en: $OUTPUT_DIR"
echo ""
echo "📤 Para subir a NotebookLM:"
echo "1. Ve a: https://notebooklm.google.com/notebook/$NOTEBOOK_ID"
echo "2. Click 'Add source'"
echo "3. Arrastra los archivos de: $OUTPUT_DIR"
echo ""
ls -lh "$OUTPUT_DIR/"