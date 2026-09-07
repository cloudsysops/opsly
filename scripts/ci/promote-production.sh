#!/usr/bin/env bash
# PROMOTE_PRODUCTION gate. Exit 0 = allow or skip; exit 1 = deny.
# This script never SSHs. The workflow performs retag + compose after a 0+allow.
set -euo pipefail

EVENT_NAME="${GITHUB_EVENT_NAME:-workflow_dispatch}"
DRY_RUN="${DRY_RUN:-0}"

log() { printf '[promote] %s\n' "$*"; }

tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

set +e
node scripts/ci/check-production-change-window.mjs --mode promote --event "${EVENT_NAME}" >"${tmp}"
gate=$?
set -e
cat "${tmp}"
if [[ "${gate}" -ne 0 ]]; then
  log "PROMOTE_PRODUCTION denied (fail closed)"
  exit 1
fi

action="$(node -e 'const fs=require("fs"); const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(d.action||"")' "${tmp}")"
if [[ "${action}" == "skip" ]]; then
  log "Skip — production untouched"
  exit 0
fi

log "PROMOTE_PRODUCTION allowed"
if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN: would retag ReleaseCandidate SHA to :latest, SSH /opt/opsly compose pull/up, smoke, rollback on failure"
  exit 0
fi

# Live SSH lives in .github/workflows/promote-production.yml only.
if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  log "Not GitHub Actions — refuse live promote"
  exit 0
fi
exit 0
