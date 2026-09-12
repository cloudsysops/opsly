#!/usr/bin/env bash
# Bootstrap external agent runtimes used by Opsly.
# - Clones trusted upstreams OUTSIDE the Opsly repo.
# - Does not write secrets.
# - Does not start production workloads.
# - Installation of binaries is explicit with --install.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AGENTS_HOME="${OPSLY_EXTERNAL_AGENTS_HOME:-$HOME/.opsly/external-agents}"
CLONE=false
INSTALL=false
START_BRIDGES=false
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/install-superagents-stack.sh [options]

Options:
  --clone          Clone/update trusted upstream repositories outside Opsly.
  --install        Install/upgrade supported local binaries with package managers.
  --start-bridges  Start Opsly local HTTP bridges after validation.
  --dry-run        Print actions only.
  --all            Equivalent to --clone --install --start-bridges.

Environment:
  OPSLY_EXTERNAL_AGENTS_HOME  Default: ~/.opsly/external-agents
EOF
}

for arg in "$@"; do
  case "$arg" in
    --clone) CLONE=true ;;
    --install) INSTALL=true ;;
    --start-bridges) START_BRIDGES=true ;;
    --dry-run) DRY_RUN=true ;;
    --all) CLONE=true; INSTALL=true; START_BRIDGES=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}

have() { command -v "$1" >/dev/null 2>&1; }
log() { printf '[superagents:install] %s\n' "$*"; }
warn() { printf '[superagents:install] WARN: %s\n' "$*" >&2; }

clone_or_update() {
  local name="$1"
  local url="$2"
  local dir="$AGENTS_HOME/$name"
  if [[ -d "$dir/.git" ]]; then
    log "update $name"
    run git -C "$dir" fetch --prune origin
    run git -C "$dir" pull --ff-only
  else
    log "clone $name -> $dir"
    run git clone --filter=blob:none --depth 1 "$url" "$dir"
  fi
}

install_binaries() {
  # Prefer package managers over curl|bash so installation is auditable.
  if [[ "$(uname -s)" == "Darwin" ]] && have brew; then
    have opencode || run brew install anomalyco/tap/opencode
    have node || warn "node missing; install Node 22+ before OpenClaw"
    if have npm && ! have openclaw; then
      run npm install -g openclaw@latest
    fi
    if ! have hermes; then
      warn "Hermes managed installer is intentionally not auto-executed."
      warn "Install from its official managed installer after source review, then rerun doctor."
    fi
    if ! have goose; then
      warn "Goose optional: install its official release CLI manually if desired."
    fi
  else
    warn "Automatic binary installation is currently limited to macOS/Homebrew."
    warn "Clone sources and follow each upstream's official install docs on this host."
  fi
}

start_bridge() {
  local id="$1"
  local cmd="$2"
  local npm_script="$3"
  local log_file="runtime/logs/${id}.bridge.log"
  local pid_file="runtime/logs/${id}.bridge.pid"

  if ! have "$cmd"; then
    warn "skip $id bridge: command '$cmd' not found"
    return 0
  fi

  if [[ -f "$pid_file" ]]; then
    local old_pid
    old_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
      log "$id bridge already running pid=$old_pid"
      return 0
    fi
    run rm -f "$pid_file"
  fi

  log "start $id bridge"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] npm run $npm_script >$log_file 2>&1 &"
    return 0
  fi
  nohup npm run "$npm_script" >"$log_file" 2>&1 &
  echo "$!" >"$pid_file"
}

mkdir -p "$AGENTS_HOME" runtime/logs

if [[ "$CLONE" == true ]]; then
  clone_or_update "hermes-agent" "https://github.com/NousResearch/Hermes-Agent.git"
  clone_or_update "openclaw" "https://github.com/openclaw/openclaw.git"
  clone_or_update "opencode" "https://github.com/anomalyco/opencode.git"
  clone_or_update "goose" "https://github.com/aaif-goose/goose.git"
fi

if [[ "$INSTALL" == true ]]; then
  install_binaries
fi

log "running doctor"
if [[ "$DRY_RUN" == true ]]; then
  run ./scripts/superagents-doctor.sh
else
  ./scripts/superagents-doctor.sh || true
fi

if [[ "$START_BRIDGES" == true ]]; then
  start_bridge "opencode" "opencode" "opsly:local-opencode-service"
  start_bridge "hermes" "hermes" "opsly:local-hermes-service"
  start_bridge "goose" "goose" "opsly:local-goose-service"
fi

log "bootstrap complete"
