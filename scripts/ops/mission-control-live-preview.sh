#!/usr/bin/env bash
# Ops After Dark — Mission Control Live local preview for OBS.
# Runs the canonical admin app from the Mission Control Live branch without deploying production.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BRANCH="${MISSION_CONTROL_LIVE_BRANCH:-feat/mission-control-live-obs}"
# Default 4001: on this workstation 3001 is already taken by the Uptime Kuma
# container, so a dev server bound to 3001 fails to start.
PORT="${MISSION_CONTROL_PREVIEW_PORT:-4001}"
URL="http://127.0.0.1:${PORT}/mission-control/live"

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

# The admin login gate is built on Supabase. In production the public config is
# baked into the image as a build ARG (see apps/admin/Dockerfile); `next dev`
# reads it from the environment instead, so without these two variables /login
# renders with no identity backend and no account can ever succeed.
if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  if command -v doppler >/dev/null 2>&1; then
    DOPPLER_PROJECT="${MISSION_CONTROL_DOPPLER_PROJECT:-ops-intcloudsysops}"
    DOPPLER_CONFIG="${MISSION_CONTROL_DOPPLER_CONFIG:-prd}"
    echo "[mission-control-live] loading Supabase public config from Doppler ($DOPPLER_PROJECT/$DOPPLER_CONFIG)"
    NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$(doppler secrets get NEXT_PUBLIC_SUPABASE_URL --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --plain)}"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$(doppler secrets get NEXT_PUBLIC_SUPABASE_ANON_KEY --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --plain)}"
    export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY
  else
    echo "[mission-control-live] WARNING: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY unset and doppler CLI not found." >&2
    echo "[mission-control-live] The /login gate cannot authenticate; the live board will stay STREAM_SAFE blocked." >&2
  fi
fi

cd "$ROOT/apps/admin"
exec npx next dev -p "$PORT"
