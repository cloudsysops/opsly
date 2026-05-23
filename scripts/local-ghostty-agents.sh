#!/usr/bin/env bash
# Open Ghostty directly into the Opsly agent tmux session.
#
# Usage:
#   ./scripts/local-ghostty-agents.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/opsly-agents-tmux.sh"
exec "${SCRIPT_DIR}/local-ghostty-open.sh" "tmux attach -t ${OPSLY_AGENTS_TMUX_SESSION:-opsly-agents}"
