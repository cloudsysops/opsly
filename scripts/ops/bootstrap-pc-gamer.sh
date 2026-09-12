#!/usr/bin/env bash
# Conservative bootstrap for the Opsly PC Gamer compute node.
# Installs only baseline packages when explicitly requested.
set -euo pipefail

DRY_RUN=false
APPLY=false

usage() {
  cat <<'EOF'
Usage: ./scripts/ops/bootstrap-pc-gamer.sh [--dry-run] [--apply]

Default: print the required commands. --apply installs only safe baseline packages.
NVIDIA driver/CUDA/Ollama remain explicit operator-managed steps because versions are hardware/OS sensitive.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --apply) APPLY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "true" || "$APPLY" != "true" ]]; then
    printf '[plan] %q ' "$@"; echo
    return 0
  fi
  "$@"
}

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "bootstrap-pc-gamer.sh currently targets Linux. Use the capability doctor on other OSes." >&2
  exit 2
fi

if command -v apt-get >/dev/null 2>&1; then
  run sudo apt-get update
  run sudo apt-get install -y git curl jq python3 python3-venv ffmpeg ca-certificates
else
  echo "No supported package manager detected; install baseline tools manually." >&2
fi

cat <<'EOF'

Manual / version-sensitive prerequisites:
1. NVIDIA driver appropriate for the GPU/OS.
2. CUDA runtime only if required by the selected local model stack.
3. Ollama from the vendor-supported installer.
4. Tailscale + node enrollment.
5. Doppler CLI + scoped machine credentials.
6. Clone only https://github.com/cloudsysops/opsly.git and run npm ci.

Never put on this node:
- production database credentials
- unrestricted tenant/customer PII
- release/deploy authority
- public Redis or Ollama listeners

Validate:
  ./scripts/ops/node-capability-doctor.sh --role gamer --strict
  ./scripts/ops/pc-gamer-heartbeat.sh --dry-run
  npm run compute:gamer:media -- gpu-probe
EOF
