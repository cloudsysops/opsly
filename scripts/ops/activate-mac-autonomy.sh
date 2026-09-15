#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ENABLE_BACKGROUND=1
for arg in "$@"; do
  case "$arg" in
    --no-background) ENABLE_BACKGROUND=0 ;;
    -h|--help)
      cat <<'EOF'
usage: npm run opsly:mac:activate -- [--no-background]

Runs:
  1. Mac runtime bootstrap
  2. physical GO LIVE E2E
  3. optional 10-minute governed background scheduler enable

No production deploy is performed.
EOF
      exit 0
      ;;
  esac
done

log(){ printf '[mac-activate] %s\n' "$*"; }
fail(){ log "FAIL: $*"; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "macOS/Darwin required"

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[[ "$branch" == "main" ]] || fail "checkout must be main"

[[ -z "$(git status --porcelain 2>/dev/null)" ]] || fail "working tree must be clean"

log "1/3 bootstrap canonical Mac runtime"
npm run opsly:mac:bootstrap

log "2/3 run physical GO LIVE smoke"
doppler run --project ops-intcloudsysops --config prd -- npm run opsly:mac:go-live

if [[ "$ENABLE_BACKGROUND" == "1" ]]; then
  log "3/3 enable governed 10-minute background scheduler"
  npm run opsly:background:launchd:enable
  log "AUTONOMY ENABLED"
else
  log "3/3 background scheduler left disabled (--no-background)"
  log "RUNTIME READY"
fi

log "status:"
npm run opsly:mac:doctor || true
