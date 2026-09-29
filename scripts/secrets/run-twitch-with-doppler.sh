#!/usr/bin/env bash
set -euo pipefail
export PATH="${HOME}/.local/bin:${HOME}/.npm-global/bin:${PATH}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-dev_twitch}"
[[ "${1:-}" == "--" ]] && shift
[[ $# -ge 1 ]] || { echo "Usage: $0 -- <command...>" >&2; exit 1; }
exec doppler --no-check-version run --project "$PROJECT" --config "$CONFIG" -- "$@"
