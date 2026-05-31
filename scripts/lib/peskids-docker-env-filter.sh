#!/usr/bin/env bash
# Filter Doppler docker env export before passing to peskids container.
# Strips client-facing secrets that must not reach browsers or wrong tenant domains.
# Usage: filter_peskids_docker_env <env-file>
set -euo pipefail

filter_peskids_docker_env() {
  local env_file="$1"
  local tmp
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' RETURN

  # Drop keys that are wrong for Peskids or leak Docker-internal hostnames to NEXT_PUBLIC_*.
  rg -v '^(NEXT_PUBLIC_API_URL|NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_OPSLY_EVENT_BUS_URL)=' "$env_file" >"$tmp" || true
  mv "$tmp" "$env_file"
  trap - RETURN

  # Ensure server-only bus URL (Doppler should set this; append if missing after filter).
  if ! rg -q '^OPSLY_EVENT_BUS_URL=' "$env_file" 2>/dev/null; then
    echo 'OPSLY_EVENT_BUS_URL=http://orchestrator:3011/events' >>"$env_file"
  fi
}

if [[ "${BASH_SOURCE[0]:-}" == "${0}" ]]; then
  [[ $# -eq 1 ]] || {
    echo "Usage: $0 <docker-env-file>" >&2
    exit 1
  }
  filter_peskids_docker_env "$1"
  echo "Filtered: $1"
fi
