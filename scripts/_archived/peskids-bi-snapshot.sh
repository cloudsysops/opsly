#!/usr/bin/env bash
# Generate the Peskids BI snapshot with Python/pandas.
# Intended to run from cron/systemd on the VPS or locally from the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${OPS_ROOT}/apps/peskids"
SNAPSHOT_PATH="${PESKIDS_BI_SNAPSHOT_PATH:-${APP_DIR}/runtime/analytics/peskids-bi.json}"

mkdir -p "$(dirname "${SNAPSHOT_PATH}")"

if [[ -f "${OPS_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${OPS_ROOT}/.env"
  set +a
fi

cd "${APP_DIR}"
PESKIDS_BI_SNAPSHOT_PATH="${SNAPSHOT_PATH}" npm run bi:snapshot

