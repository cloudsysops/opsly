#!/usr/bin/env bash
# Thin wrapper — see sync-peskids-secrets-to-github.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/scripts/sync-peskids-secrets-to-github.sh" --group firebase "$@"
