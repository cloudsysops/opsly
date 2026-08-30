#!/usr/bin/env bash
# Maestro #3 — Plan de archivo/revisión de workflows (solo lectura por defecto).
# NO mueve ni borra ficheros salvo que se añada un modo explícito aprobado por humanos.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TSV="${ROOT}/docs/ops/workflows-catalog.tsv"
APPLY="${ARCHIVE_PLAN_APPLY:-0}"

usage() {
  echo "Uso: ARCHIVE_PLAN_APPLY=0 ${0##*/}   # listar candidatos (default)"
  echo "     Este script no implementa --apply: solo imprime el plan."
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$TSV" ]]; then
  echo "Falta $TSV — ejecuta scripts/generate-workflows-catalog.sh" >&2
  exit 1
fi

echo "=== Archive / review plan (Maestro #3) ==="
echo "Fuente: $TSV"
echo

# Skip header — awk evita ambigüedad con campos vacíos (last_success)
awk -F '\t' 'NR > 1 && $3 == "review_quarterly" {
  last = ($4 == "" ? "—" : $4)
  printf "[review_quarterly] %s  (%s)  last_success=%s  notes: %s\n", $1, $2, last, $6
}' "$TSV"

echo
echo "Recomendación: revisión trimestral o alinear triggers/secrets; no archivar"
echo "sin decisión explícita del owner (ver docs/03-agents/AGENT-GUARDRAILS.md)."
if [[ "$APPLY" != "0" ]]; then
  echo "ARCHIVE_PLAN_APPLY distinto de 0 ignorado: no hay mutación implementada." >&2
fi
