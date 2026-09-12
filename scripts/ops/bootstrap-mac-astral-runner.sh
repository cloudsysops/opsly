#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_SLUG="${REPO_SLUG:-cloudsysops/opsly}"

echo "== Astral Arena Mac runner bootstrap =="

echo "1/3 Installing/verifying Godot..."
"$ROOT/scripts/ops/install-mac-godot.sh"

if [[ -z "${RUNNER_TOKEN:-}" ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI is required when RUNNER_TOKEN is not provided." >&2
    echo "Install gh or provide RUNNER_TOKEN manually." >&2
    exit 2
  fi

  gh auth status >/dev/null
  echo "2/3 Requesting short-lived runner token using local gh authentication..."
  RUNNER_TOKEN="$(gh api     --method POST     "repos/$REPO_SLUG/actions/runners/registration-token"     --jq '.token')"
  export RUNNER_TOKEN
else
  echo "2/3 Using supplied RUNNER_TOKEN."
fi

echo "3/3 Registering self-hosted runner..."
"$ROOT/scripts/ops/install-mac-github-runner.sh"

echo
echo "Bootstrap complete."
echo "GitHub labels: self-hosted, macOS, astral-fast, godot, mac-build"
echo "Trusted workflows can now consume the Mac runner."
