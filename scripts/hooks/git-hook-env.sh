#!/usr/bin/env bash
# Compatibility shim — hooks should source hook-bootstrap.sh directly.
# Kept so existing shellcheck source paths keep working.

set -euo pipefail

_HOOK_ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/hooks/hook-bootstrap.sh
source "${_HOOK_ENV_DIR}/hook-bootstrap.sh"
