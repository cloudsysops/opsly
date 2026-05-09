#!/usr/bin/env bash
# Ejecuta 3 research-run consecutivos y deja informes en docs/research/ (evidencia Fase 1 autonomía).
# Opcional: AUTONOMY_E2E_EXECUTE=true para encolar sandbox real (requiere orchestrator + gateway).
#
# Uso:
#   ./scripts/autonomy-phase1-e2e-record.sh
#   ./scripts/autonomy-phase1-e2e-record.sh --dry-run
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

DRY_RUN=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=true ;;
  esac
done

RUN_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "[dry-run] 3x python3 -m tools.cli.main research-run ... (AUTONOMY_E2E_EXECUTE=${AUTONOMY_E2E_EXECUTE:-false})"
  exit 0
fi

for i in 1 2 3; do
  if [[ "${AUTONOMY_E2E_EXECUTE:-false}" == "true" ]]; then
    python3 -m tools.cli.main research-run \
      -q "Opsly autonomy phase1 sealed run ${i} ${RUN_TS}" \
      -t platform \
      -d 2 \
      --save-artifacts \
      --execute
  else
    python3 -m tools.cli.main research-run \
      -q "Opsly autonomy phase1 sealed run ${i} ${RUN_TS}" \
      -t platform \
      -d 2 \
      --save-artifacts
  fi
done

echo "[ok] Tres informes bajo docs/research/ (ver docs/reports/AUTONOMY-PHASE1-E2E-EVIDENCE.md)"
