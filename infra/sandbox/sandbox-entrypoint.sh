#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Sandbox ready (idle mode)."
  tail -f /dev/null
else
  echo "Running sandbox command: $*"
  exec "$@"
fi
