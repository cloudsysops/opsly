#!/usr/bin/env bash
# SSH al VPS usando config/tailscale-routes.json (usuario@IP Tailscale).
# Uso: ./scripts/opsly-tailscale-vps.sh [--] <comando remoto...>
# Variables: OPSLY_ROOT, OPSLY_TAILSCALE_ROUTES_JSON
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || { cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd; })"
export OPSLY_ROOT="${OPSLY_ROOT:-$ROOT}"
export PYTHONPATH="${ROOT}/scripts${PYTHONPATH:+:${PYTHONPATH}}"

SPEC="$(python3 -c "import sys; sys.path.insert(0, '${ROOT}/scripts'); from opsly_tailscale_cli import ssh_spec; print(ssh_spec('vps'))")"
if [[ $# -ge 1 && "$1" == "--" ]]; then
  shift
fi
exec ssh -o BatchMode=yes -o ConnectTimeout=20 "${SPEC}" "$@"
