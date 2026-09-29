#!/usr/bin/env bash
set -euo pipefail
export PATH="${HOME}/.npm-global/bin:${PATH}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-twitch}"

if [[ "${1:-}" == "--" ]]; then
  shift
fi
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 -- <command...>" >&2
  exit 1
fi

exec doppler run --project "$PROJECT" --config "$CONFIG" -- "$@"
