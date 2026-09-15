#!/usr/bin/env bash
# Fail CI if Peskids Docker image build reintroduces flags that break Next 15.5.
# Regression: 2026-09-10 Deploy Peskids failed on `next build --webpack` (Next 16+ only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOCKERFILE="${ROOT}/apps/peskids/Dockerfile"

if [[ ! -f "${DOCKERFILE}" ]]; then
  echo "ERROR: missing ${DOCKERFILE}" >&2
  exit 1
fi

if grep -E 'next[[:space:]]+build[[:space:]]+--webpack|--turbopack' "${DOCKERFILE}" >/dev/null; then
  echo "ERROR: apps/peskids/Dockerfile must not pass --webpack/--turbopack to next build on Next 15.5." >&2
  echo "Use: NEXT_TELEMETRY_DISABLED=1 npx next build" >&2
  echo "See: docs/runbooks/PRODUCTION-CHANGE-WINDOW.md (Peskids Docker gotcha)" >&2
  exit 1
fi

if ! grep -E 'NEXT_TELEMETRY_DISABLED=1[[:space:]]+npx[[:space:]]+next[[:space:]]+build' "${DOCKERFILE}" >/dev/null; then
  echo "ERROR: expected plain 'npx next build' in apps/peskids/Dockerfile" >&2
  exit 1
fi

echo "OK: Peskids Dockerfile next build flags are Next-15.5-safe"
