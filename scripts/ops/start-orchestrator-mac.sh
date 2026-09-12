#!/usr/bin/env bash
# Start Opsly orchestrator on Mac with localhost Redis override.
# Requires /tmp/opsly-mac-redis.env (REDIS_URL=127.0.0.1 + REDIS_PASSWORD).
# Doppler injects PLATFORM_ADMIN_TOKEN and other secrets; --preserve-env keeps Redis override.
# Usage: ./scripts/ops/start-orchestrator-mac.sh
# LaunchAgent: com.opsly.orchestrator-mac (optional KeepAlive)
set -euo pipefail

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" && -d "${HOME}/.nvm/versions/node" ]]; then
  NODE_BIN="$(
    find "${HOME}/.nvm/versions/node" -type f -path '*/bin/node' 2>/dev/null       | sort -V       | tail -n 1
  )"
fi
if [[ -z "$NODE_BIN" ]]; then
  echo "node executable not found" >&2
  exit 1
fi
NODE_DIR="$(dirname "$NODE_BIN")"
export PATH="${NODE_DIR}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT="${REPO_ROOT:-${ROOT}}"
cd "${ROOT}"

if [[ ! -f /tmp/opsly-mac-redis.env ]]; then
  echo "missing /tmp/opsly-mac-redis.env (REDIS_URL host must be 127.0.0.1 — Doppler uses Docker DNS 'redis')" >&2
  exit 78
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI not in PATH" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source /tmp/opsly-mac-redis.env
set +a

exec doppler run --project ops-intcloudsysops --config prd --preserve-env -- \
  npm run start --workspace=@intcloudsysops/orchestrator
