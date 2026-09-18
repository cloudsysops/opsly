#!/usr/bin/env bash
# Launch a Linux Ghostty surface into an Opsly tmux harness without cloning
# an already-attached tmux client. Concurrent Ghostty windows get independent
# sessions; detached harness sessions are reused on the next launch.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BASE_SESSION="opsly-harness"

if ! command -v tmux >/dev/null 2>&1; then
  echo "opsly-ghostty: tmux is required" >&2
  exec "${SHELL:-/bin/bash}" -l
fi

# Reuse a detached Opsly harness first. This preserves work after a terminal
# closes while avoiding the mirrored-window behavior of 'new-session -A'.
while IFS=: read -r session attached; do
  case "$session" in
    "$BASE_SESSION"|"$BASE_SESSION"-[0-9]*)
      if [[ "$attached" == "0" ]]; then
        exec tmux attach-session -t "$session"
      fi
      ;;
  esac
done < <(tmux list-sessions -F '#{session_name}:#{session_attached}' 2>/dev/null || true)

# Every currently known harness is attached, so create a separate session for
# this Ghostty window. Keep names predictable for operators and Mission Control.
session="$BASE_SESSION"
if tmux has-session -t "=$session" 2>/dev/null; then
  index=2
  while tmux has-session -t "=${BASE_SESSION}-${index}" 2>/dev/null; do
    index=$((index + 1))
  done
  session="${BASE_SESSION}-${index}"
fi

exec tmux new-session -s "$session" -c "$REPO_ROOT"
