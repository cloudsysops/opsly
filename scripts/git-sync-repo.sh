#!/usr/bin/env bash
# Wrapper canónico (docs referencian esta ruta). Implementación: scripts/utils/git-sync.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/scripts/utils/git-sync.sh" "$@"
