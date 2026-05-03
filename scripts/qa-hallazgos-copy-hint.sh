#!/usr/bin/env bash
set -euo pipefail

# Ayuda operativa: el tester pega hallazgos en un archivo y este script intenta copiarlo al portapapeles.
# Uso:
#   ./scripts/qa-hallazgos-copy-hint.sh path/al/hallazgos.md
#   ./scripts/qa-hallazgos-copy-hint.sh   # sin args: imprime instrucciones

FILE="${1:-}"

if [[ -z "${FILE}" ]]; then
  echo "Uso: $0 <archivo-con-tablas-qa>"
  echo ""
  echo "1. Escribe los hallazgos (formato docs/qa/TESTER-CHECKLIST.md) en un archivo."
  echo "2. Ejecuta: $0 tu-archivo.md"
  echo "3. Pega en Claude/Cursor junto con el bloque de docs/qa/BACKLOG-IA-PROMPT.md"
  exit 0
fi

if [[ ! -f "${FILE}" ]]; then
  echo "No existe: ${FILE}" >&2
  exit 1
fi

if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"${FILE}"
  echo "OK: contenido copiado al portapapeles (macOS pbcopy)."
elif command -v xclip >/dev/null 2>&1; then
  xclip -selection clipboard <"${FILE}"
  echo "OK: contenido copiado al portapapeles (xclip)."
else
  echo "No hay pbcopy ni xclip; imprime primeras 40 líneas:" >&2
  head -n 40 "${FILE}"
  exit 0
fi

echo "Siguiente: abre docs/qa/BACKLOG-IA-PROMPT.md y pega el bloque «§ Prompt para la IA» + Enter, luego Cmd+V / Ctrl+V."
