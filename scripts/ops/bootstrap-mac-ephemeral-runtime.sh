#!/usr/bin/env bash
# Canonical physical-Mac bootstrap for Opsly ephemeral AI runtimes.
# Safe scope: local dependencies/build + launchd user services + validation.
# No production deploy. No secret printing.
set -euo pipefail

DRY_RUN=0
SKIP_CI=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-ci) SKIP_CI=1 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

log(){ printf '[mac-bootstrap] %s\n' "$*"; }
run(){
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}

[[ "$(uname -s)" == "Darwin" ]] || { echo "macOS/Darwin required" >&2; exit 2; }

for cmd in git node npm tmux doppler launchctl curl; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "required command missing: $cmd" >&2; exit 2; }
done

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "HEAD" || -z "$branch" ]]; then
  echo "detached HEAD not allowed" >&2
  exit 2
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "working tree must be clean before bootstrap" >&2
  exit 2
fi

log "repo=$ROOT branch=$branch"

if [[ ! -f /tmp/opsly-mac-redis.env ]]; then
  echo "missing /tmp/opsly-mac-redis.env; create the localhost Redis override before Mac bootstrap" >&2
  exit 78
fi
if ! (
  set -a
  # shellcheck disable=SC1091
  source /tmp/opsly-mac-redis.env
  set +a
  node -e '
    const raw = process.env.REDIS_URL;
    if (!raw) process.exit(1);
    const host = new URL(raw).hostname;
    process.exit(host === "127.0.0.1" || host === "localhost" ? 0 : 1);
  ' >/dev/null 2>&1
); then
  echo "/tmp/opsly-mac-redis.env must point REDIS_URL at localhost/127.0.0.1" >&2
  exit 78
fi

log "checking Doppler required secrets without printing values"
if [[ "$DRY_RUN" == "1" ]]; then
  log "[dry-run] would verify REDIS_URL, PLATFORM_ADMIN_TOKEN, OPSLY_CLI_AGENT_TOKEN"
else
  doppler run --project ops-intcloudsysops --config prd --     bash -lc 'test -n "$REDIS_URL" && test -n "$PLATFORM_ADMIN_TOKEN" && test -n "$OPSLY_CLI_AGENT_TOKEN"'     >/dev/null
fi

if [[ "$SKIP_CI" != "1" ]]; then
  log "installing exact workspace dependencies"
  run npm ci

  log "building execution boundary packages"
  run npm run build --workspace=@intcloudsysops/session-manager
  run npm run build --workspace=@intcloudsysops/agent-task-core
  run npm run build --workspace=@intcloudsysops/ai-board
  run npm run build --workspace=@intcloudsysops/orchestrator

  log "running focused canonical runtime tests"
  run npm run test:ephemeral-agents
  run npm run test:mac-ephemeral-runtime
fi

log "removing any legacy persistent autopilot"
run ./scripts/stop-agents-autopilot.sh
if [[ "$DRY_RUN" != "1" ]]; then
  rm -f runtime/logs/agents-autopilot.pid
fi

log "installing canonical launchd services"
run ./scripts/ops/install-mac-ephemeral-runtime-launchd.sh

if [[ "$DRY_RUN" == "1" ]]; then
  log "dry-run complete"
  exit 0
fi

log "waiting for bridges/orchestrator to report healthy (hard deadline: 30s)"
health_deadline=$((SECONDS + 30))
all_up=0

while (( SECONDS < health_deadline )); do
  all_up=1

  for port in 5002 5004 5005 5007 3011; do
    if (( SECONDS >= health_deadline )); then
      all_up=0
      break
    fi

    if ! curl -sf --connect-timeout 1 --max-time 1       "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      all_up=0
    fi
  done

  [[ "$all_up" == "1" ]] && break

  if (( SECONDS < health_deadline )); then
    sleep 1
  fi
done

if [[ "$all_up" != "1" ]]; then
  log "health deadline reached; readiness doctor will report the exact unhealthy endpoint(s)"
fi

log "running readiness doctor through Doppler (FAIL blocks; WARN remains visible)"
doppler run --project ops-intcloudsysops --config prd --   ./scripts/ops/mac-ephemeral-runtime-doctor.sh

log "note: use npm run opsly:mac:doctor:strict for an audit that escalates known WARN findings"

log "bootstrap complete"
log "healthy idle = bridges/worker/watcher alive; zero AI task sessions unless work is active"
