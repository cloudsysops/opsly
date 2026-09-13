#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/cloudsysops/opsly}"
RUNNER_NAME="${RUNNER_NAME:-astral-fast-$(scutil --get ComputerName 2>/dev/null | tr ' ' '-' | tr '[:upper:]' '[:lower:]' || hostname -s)}"
RUNNER_ROOT="${RUNNER_ROOT:-$HOME/actions-runner-astral-fast}"
RUNNER_VERSION="${RUNNER_VERSION:-2.337.0}"
RUNNER_LABELS="${RUNNER_LABELS:-astral-fast,godot,mac-build}"
RUNNER_TOKEN="${RUNNER_TOKEN:-}"

if [[ -z "$RUNNER_TOKEN" ]]; then
  cat >&2 <<'EOF'
RUNNER_TOKEN is required.

Generate a short-lived repository runner registration token in:
GitHub → cloudsysops/opsly → Settings → Actions → Runners → New self-hosted runner

Then run:
  RUNNER_TOKEN='...' ./scripts/ops/install-mac-github-runner.sh

The token is used only by config.sh and is not written to this repository.
EOF
  exit 2
fi

case "$(uname -m)" in
  arm64)
    asset="actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz"
    sha256="5a2cd92908a93d7276a194e1de6008099f3e7946f3f8e14aa7a1a7b4a31fdec2"
    ;;
  x86_64)
    asset="actions-runner-osx-x64-${RUNNER_VERSION}.tar.gz"
    sha256="d383f505d7ed041b1873ab68c35dd766fc093f2252330f95bb427be8f2c6dcfc"
    ;;
  *)
    echo "Unsupported Mac architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

mkdir -p "$RUNNER_ROOT"
cd "$RUNNER_ROOT"

if [[ ! -x ./config.sh ]]; then
  url="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${asset}"
  tmp="/tmp/${asset}"
  echo "Downloading GitHub Actions Runner v${RUNNER_VERSION}..."
  curl --fail --location --retry 3 "$url" -o "$tmp"
  echo "${sha256}  ${tmp}" | shasum -a 256 -c -
  tar xzf "$tmp"
fi

if [[ -f .runner ]]; then
  echo "Runner is already configured at $RUNNER_ROOT"
else
  ./config.sh     --unattended     --url "$REPO_URL"     --token "$RUNNER_TOKEN"     --name "$RUNNER_NAME"     --labels "$RUNNER_LABELS"     --work "_work"     --replace
fi

echo "Installing runner service..."
./svc.sh install
./svc.sh start

echo
echo "Runner configured:"
echo "  name:   $RUNNER_NAME"
echo "  root:   $RUNNER_ROOT"
echo "  labels: self-hosted, macOS, $(uname -m), $RUNNER_LABELS"
echo
echo "Verify with:"
echo "  cd '$RUNNER_ROOT' && ./svc.sh status"
