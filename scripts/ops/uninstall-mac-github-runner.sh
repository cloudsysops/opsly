#!/usr/bin/env bash
set -euo pipefail

RUNNER_ROOT="${RUNNER_ROOT:-$HOME/actions-runner-astral-fast}"
RUNNER_TOKEN="${RUNNER_TOKEN:-}"

if [[ ! -d "$RUNNER_ROOT" ]]; then
  echo "Runner directory does not exist: $RUNNER_ROOT"
  exit 0
fi

cd "$RUNNER_ROOT"
./svc.sh stop 2>/dev/null || true
./svc.sh uninstall 2>/dev/null || true

if [[ -f .runner ]]; then
  if [[ -z "$RUNNER_TOKEN" ]]; then
    echo "Service stopped, but RUNNER_TOKEN is required to remove runner registration." >&2
    exit 2
  fi
  ./config.sh remove --unattended --token "$RUNNER_TOKEN"
fi

echo "Mac Astral runner removed."
