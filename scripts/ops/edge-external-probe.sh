#!/usr/bin/env bash
# External edge probe — runs OFF the VPS (Mac operador / worker).
# If public health fails, SSH to VPS and run edge-watchdog (no human).
#
# Usage:
#   ./scripts/ops/edge-external-probe.sh
#   ./scripts/ops/edge-external-probe.sh --dry-run
#
# Env:
#   SSH_HOST   default vps-dragon@100.120.151.91
#   OPSLY_ROOT default /opt/opsly
#   PROBE_URLS space-separated (default peskids + api health)
#
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
  esac
done

SSH_HOST="${SSH_HOST:-vps-dragon@100.120.151.91}"
OPSLY_ROOT="${OPSLY_ROOT:-/opt/opsly}"
PROBE_URLS="${PROBE_URLS:-https://www.peskids.com/api/health https://api.op-sly.com/api/health}"

log() { printf '[edge-external-probe] %s\n' "$*"; }

fail=0
for url in $PROBE_URLS; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 12 "$url" 2>/dev/null || echo 000)"
  if [[ "$code" == "200" ]]; then
    log "OK ${url} (${code})"
  else
    log "FAIL ${url} (${code})"
    fail=1
  fi
done

if [[ "$fail" -eq 0 ]]; then
  exit 0
fi

log "Public health failed — invoking edge-watchdog on VPS via SSH"
cmd="OPSLY_ROOT=${OPSLY_ROOT} NOTIFY=1 ${OPSLY_ROOT}/scripts/ops/edge-watchdog.sh"
if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN: ssh ${SSH_HOST} ${cmd}"
  exit 0
fi

ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" "$cmd"
exit $?
