#!/usr/bin/env bash
# Resuelve el modo actual (gaming/light/day/heavy) del PC-gamer según config/pc-gamer-schedule.json.
#
# Usage:
#   ./scripts/ops/pc-gamer-schedule.sh
#   ./scripts/ops/pc-gamer-schedule.sh --json
#   ./scripts/ops/pc-gamer-schedule.sh --at 02:30 --day mon --json
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

CONFIG="${PC_GAMER_SCHEDULE_FILE:-config/pc-gamer-schedule.json}"
if [[ ! -f "$CONFIG" ]]; then
  echo "[pc-gamer-schedule] ERROR: missing $CONFIG" >&2
  exit 1
fi

exec node "${SCRIPT_DIR}/pc-gamer-schedule.mjs" --config "$CONFIG" "$@"
