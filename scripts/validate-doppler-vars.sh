#!/usr/bin/env bash
# Wrapper: mantiene ruta documentada en runbooks; implementación en scripts/ci/.
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci/validate-doppler-vars.sh" "$@"
