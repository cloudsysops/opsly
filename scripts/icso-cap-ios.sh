#!/usr/bin/env bash
# ICSO iOS — wrapper around scripts/cap-mobile.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/scripts/cap-mobile.sh" icso ios "$@"