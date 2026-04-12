#!/usr/bin/env bash
# Genera un resumen textual de actividad git (y opcionalmente GitHub CLI).
# Uso (desde la raíz del repo):
#   ./scripts/weekly-sprint-report.sh
#   ./scripts/weekly-sprint-report.sh --dry-run
#   ./scripts/weekly-sprint-report.sh --since "2026-04-14" --until "2026-04-20"
#   ./scripts/weekly-sprint-report.sh --output reports/week-2026-W16.md
#
# No envía a Slack/Discord salvo que extendáis el script (evitar secretos en argv).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DRY_RUN=false
SINCE=""
UNTIL=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --since)
      if [[ $# -lt 2 || "${2:-}" == -* ]]; then
        echo "Error: --since requiere YYYY-MM-DD" >&2
        exit 1
      fi
      SINCE="$2"
      shift 2
      ;;
    --until)
      if [[ $# -lt 2 || "${2:-}" == -* ]]; then
        echo "Error: --until requiere YYYY-MM-DD" >&2
        exit 1
      fi
      UNTIL="$2"
      shift 2
      ;;
    --output|-o)
      if [[ $# -lt 2 || "${2:-}" == -* ]]; then
        echo "Error: --output requiere ruta" >&2
        exit 1
      fi
      OUTPUT="$2"
      shift 2
      ;;
    -h|--help)
      echo "Uso: $0 [--dry-run] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--output PATH]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
done

cd "${REPO_ROOT}"

if [[ -z "${SINCE}" ]]; then
  SINCE="$(python3 -c 'from datetime import date, timedelta; print((date.today()-timedelta(days=7)).isoformat())')"
fi
if [[ -z "${UNTIL}" ]]; then
  UNTIL="$(python3 -c 'from datetime import date; print(date.today().isoformat())')"
fi

if [[ "${DRY_RUN}" == true ]]; then
  lines="?"
else
  lines="$(git log --oneline --since="${SINCE}" --until="${UNTIL}" 2>/dev/null | wc -l | tr -d ' ')"
fi

{
  echo "# Opsly — reporte sprint (git)"
  echo ""
  echo "- **Ventana:** ${SINCE} → ${UNTIL}"
  echo "- **Commits en rango:** ${lines}"
  echo ""
  echo "## Commits"
  echo ""
  if [[ "${DRY_RUN}" == true ]]; then
    echo "(dry-run: no se ejecutó git log)"
  elif [[ "${lines}" != "0" ]]; then
    git log --oneline --since="${SINCE}" --until="${UNTIL}" || true
  else
    echo "(sin commits en el rango)"
  fi
  echo ""
  echo "## GitHub (opcional)"
  echo ""
  if command -v gh >/dev/null 2>&1 && [[ "${DRY_RUN}" != true ]]; then
    echo "### PRs fusionados"
    gh pr list --state merged --search "merged:${SINCE}..${UNTIL}" --limit 50 2>/dev/null || echo "(gh: sin resultados o sin permisos)"
  else
    echo "Instalar \`gh\` y autenticarse para listar PRs, o completar manualmente."
  fi
  echo ""
  echo "---"
  echo "Generado por \`scripts/weekly-sprint-report.sh\`. Actualizar **SPRINT-TRACKER.md** con el progreso cualitativo."
} | if [[ -n "${OUTPUT}" ]]; then
  mkdir -p "$(dirname "${OUTPUT}")"
  tee "${OUTPUT}"
else
  cat
fi
