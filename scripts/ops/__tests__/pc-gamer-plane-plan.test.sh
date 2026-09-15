#!/usr/bin/env bash
# Guard: PC-gamer plane is one compose project, reconnect defaults to main,
# autostart must not ExecStop --down.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PLANE="${ROOT}/scripts/ops/pc-gamer-docker-plane.sh"
RECONNECT="${ROOT}/scripts/ops/pc-gamer-reconnect.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

plan="$("${PLANE}" --dump-plan)"
echo "$plan" | grep -qx 'COMPOSE_IGNORE_ORPHANS=1' || fail "missing COMPOSE_IGNORE_ORPHANS=1"
echo "$plan" | grep -qx 'UNIFIED_UP=1' || fail "missing UNIFIED_UP=1"
echo "$plan" | grep -qx 'SECOND_COMPOSE_UP=0' || fail "second compose up still planned"
echo "$plan" | grep -qx 'EXEC_STOP_DOWN=0' || fail "ExecStop --down still planned"
echo "$plan" | grep -q 'infra/docker-compose.pc-gamer-workers.yml' || fail "workers compose missing"
echo "$plan" | grep -q 'infra/docker-compose.pc-gamer-moneyprinter.yml' || fail "moneyprinter file not attached (orphan risk)"
echo "$plan" | grep -q 'SERVICES=.*worker-openclaw' || fail "worker service missing"
echo "$plan" | grep -q 'moneyprinter-bridge' && fail "moneyprinter started without --with-content"

content="$("${PLANE}" --dump-plan --with-content)"
echo "$content" | grep -q 'SERVICES=.*moneyprinter-bridge' || fail "--with-content must start moneyprinter in the same up"
echo "$content" | grep -qx 'SECOND_COMPOSE_UP=0' || fail "--with-content must not use a second compose up"

host="$("${PLANE}" --dump-plan --use-host-ollama)"
echo "$host" | grep -q 'SERVICES=worker-openclaw' || fail "host ollama must start worker only"
echo "$host" | grep -qE 'SERVICES=.*\bollama\b' && fail "host ollama must not start compose ollama"

reconnect="$(env -u PC_GAMER_BRANCH "${RECONNECT}" --dump-plan)"
echo "$reconnect" | grep -qx 'DEFAULT_BRANCH=main' || fail "reconnect default must be main"
echo "$reconnect" | grep -qx 'RECONNECT_DEFAULT_IS_MAIN=1' || fail "reconnect default is not main"

if grep -q 'ExecStop=.*--down' "${PLANE}"; then
  fail "autostart template still has ExecStop --down"
fi
if grep -q 'feat/pc-gamer-worker-plane' "${RECONNECT}"; then
  fail "reconnect still hardcodes feat/pc-gamer-worker-plane"
fi

echo "pc-gamer-plane-plan: ok"
