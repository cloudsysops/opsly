#!/usr/bin/env bash
# Ops After Dark — Mission Control Live local preview for OBS.
# Runs the canonical admin app from the Mission Control Live branch without deploying production.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BRANCH="${MISSION_CONTROL_LIVE_BRANCH:-feat/mission-control-live-obs}"
URL="http://127.0.0.1:3001/mission-control/live"

echo "[mission-control-live] syncing $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ ! -d node_modules ]]; then
  echo "[mission-control-live] installing dependencies"
  npm ci
fi

echo
echo "OPS_AFTER_DARK_URL=$URL"
echo "OBS: use Window Capture on the authenticated browser window at this URL."
echo "Resolution target: 1920x1080."
echo

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.op-sly.com}"
exec npm run dev --workspace=@intcloudsysops/admin
