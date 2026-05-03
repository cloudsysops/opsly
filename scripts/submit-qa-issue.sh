#!/usr/bin/env bash
set -euo pipefail

# Crea un issue en GitHub con etiquetas bug + qa-ui (plantilla QA).
# Requiere: GitHub CLI (`gh`) autenticado (`gh auth login`).
#
# Uso:
#   ./scripts/submit-qa-issue.sh hallazgos.md
#   ./scripts/submit-qa-issue.sh --dry-run hallazgos.md
#   ./scripts/submit-qa-issue.sh -t "[qa-ui] Sprint 6 smoke" hallazgos.md

usage() {
  echo "Uso: $0 [--dry-run] [-t TITULO] <archivo.md>"
  echo "  El archivo debe contener el cuerpo del issue (tablas de docs/qa/TESTER-CHECKLIST.md)."
  exit 1
}

DRY_RUN=false
TITLE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -t)
      TITLE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Opción desconocida: $1" >&2
      usage
      ;;
    *)
      break
      ;;
  esac
done

FILE="${1:-}"
if [ -z "${FILE}" ] || [ ! -f "${FILE}" ]; then
  usage
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Instala GitHub CLI: https://cli.github.com/ y ejecuta: gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh no está autenticado. Ejecuta: gh auth login" >&2
  exit 1
fi

if [ -z "${TITLE}" ]; then
  TITLE="[qa-ui] Hallazgos QA (manual)"
fi

if [ "${DRY_RUN}" = true ]; then
  echo "DRY-RUN (no se creó issue):"
  echo "  gh issue create --body-file <archivo> --label bug --label qa-ui"
  echo "  title: ${TITLE}"
  echo "  body-file: ${FILE}"
  exit 0
fi

gh issue create --title "${TITLE}" --body-file "${FILE}" --label bug --label qa-ui
