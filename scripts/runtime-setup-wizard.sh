#!/usr/bin/env bash
# Interactive local-first runtime setup wizard (Phase 1 Week 2).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<'EOF'
Usage: ./scripts/runtime-setup-wizard.sh [--dry-run]

Interactive setup for Opsly local-first runtime.
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage ;;
    *) log_err "Unknown option: $1"; exit 1 ;;
  esac
done

command_exists() { command -v "$1" >/dev/null 2>&1; }

read_yn() {
  local prompt="$1"
  local default="${2:-y}"
  local answer=""
  if [[ "$default" == "y" ]]; then
    read -r -p "${prompt} [Y/n]: " answer || true
    answer="${answer:-y}"
  else
    read -r -p "${prompt} [y/N]: " answer || true
    answer="${answer:-n}"
  fi
  [[ "$answer" =~ ^[Yy] ]]
}

run_cmd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] $*"
    return 0
  fi
  "$@"
}

detect_os() {
  case "$(uname -s)" in
    Darwin*) echo "macos" ;;
    Linux*) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

install_container_engine() {
  local os="$1"
  local engine="$2"
  case "$engine" in
    colima)
      if [[ "$os" != "macos" ]]; then
        log_warn "Colima is macOS-only; skipping"
        return 0
      fi
      if command_exists colima; then
        log_ok "colima already installed"
      else
        log_info "Installing colima via Homebrew..."
        run_cmd brew install colima docker
      fi
      run_cmd colima start --cpu 2 --memory 4 || log_warn "colima start failed (may already run)"
      ;;
    docker-desktop|docker)
      if [[ "$os" == "macos" ]] && command_exists brew; then
        run_cmd brew install --cask docker || run_cmd brew install docker
      elif [[ "$os" == "linux" ]] && command_exists apt-get; then
        run_cmd sudo apt-get update
        run_cmd sudo apt-get install -y docker.io docker-compose-plugin
      else
        log_warn "Install Docker Desktop manually for $os"
      fi
      ;;
    podman)
      if command_exists apt-get; then
        run_cmd sudo apt-get install -y podman
      elif command_exists brew; then
        run_cmd brew install podman
      fi
      ;;
  esac
}

ensure_tmux_session() {
  local name="$1"
  local start_cmd="$2"
  if ! command_exists tmux; then
    log_warn "tmux not installed; skip session $name"
    return 0
  fi
  if tmux has-session -t "$name" 2>/dev/null; then
    log_ok "tmux session '$name' already exists"
    return 0
  fi
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] tmux new-session -d -s $name -- $start_cmd"
    return 0
  fi
  tmux new-session -d -s "$name" -- bash -lc "$start_cmd"
  log_ok "started tmux session: $name"
}

main() {
  log_info "=== Opsly Local-First Runtime Setup ==="

  if ! command_exists node || ! command_exists npm; then
    log_err "Node.js and npm are required"
    exit 1
  fi

  log_info "Detecting environment..."
  profile_json="$(npm run runtime:detect --silent)"
  echo "$profile_json" | node -e "
const p = JSON.parse(require('fs').readFileSync(0,'utf8'));
const s = p.system;
const r = p.recommendation;
console.log('');
console.log('System:', s.os, '|', s.cpuCores, 'cores |', s.ramGb, 'GB RAM |', s.diskFreeGb, 'GB free');
console.log('Tools: docker='+s.dockerAvailable+' colima='+s.colimaAvailable+' ollama='+s.ollamaAvailable+' redis='+s.redisAvailable+' tmux='+s.tmuxAvailable);
console.log('Recommendation:', r.topologyType, '| workers:', r.maxLocalWorkers, '|', r.estimatedSetupMinutes, 'min');
if (r.warnings.length) console.log('Warnings:', r.warnings.join('; '));
"

  os="$(detect_os)"
  max_workers="$(echo "$profile_json" | node -e "const p=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(p.recommendation.maxLocalWorkers)")"
  docker_engine="$(echo "$profile_json" | node -e "const p=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(p.recommendation.dockerEngine)")"

  if [[ "$docker_engine" != "none" ]]; then
    if read_yn "Install/start container engine ($docker_engine)?" "y"; then
      install_container_engine "$os" "$docker_engine"
    fi
  else
    log_warn "No container engine detected"
  fi

  worker_count="$max_workers"
  read -r -p "How many BullMQ workers to configure? [1-${max_workers}] (default ${max_workers}): " worker_input || true
  if [[ -n "${worker_input:-}" ]] && [[ "$worker_input" =~ ^[0-9]+$ ]]; then
    worker_count="$worker_input"
  fi

  use_local_redis=true
  if read_yn "Use local Redis (vs external REDIS_URL)?" "y"; then
    use_local_redis=true
  else
    use_local_redis=false
  fi

  enable_ollama=false
  if read_yn "Enable Ollama for local inference?" "n"; then
    enable_ollama=true
    if ! command_exists ollama; then
      if [[ "$os" == "macos" ]] && command_exists brew; then
        run_cmd brew install ollama
      elif [[ "$os" == "linux" ]]; then
        log_info "Install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
      fi
    fi
    run_cmd ollama serve >/dev/null 2>&1 &
  fi

  env_file="$ROOT/.env.local"
  if [[ ! -f "$env_file" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[DRY-RUN] Would create $env_file"
    else
      cat >"$env_file" <<EOF
# Generated by runtime-setup-wizard.sh
OPSLY_LOCAL_AGENTS_ENABLED=true
OPSLY_ORCHESTRATOR_MODE=worker-enabled
OPSLY_LOCAL_WORKER_COUNT=${worker_count}
OPSLY_LOCAL_OLLAMA_URL=http://localhost:11434
OPSLY_LOCAL_OLLAMA_MODEL=llama3.2
EOF
      if [[ "$use_local_redis" == "true" ]]; then
        echo "REDIS_URL=redis://127.0.0.1:6379" >>"$env_file"
      fi
      if [[ "$enable_ollama" == "true" ]]; then
        echo "OPSLY_LOCAL_OLLAMA_ENABLED=true" >>"$env_file"
      fi
      log_ok "Created $env_file"
    fi
  else
    log_warn "$env_file already exists (not overwritten)"
  fi

  redis_cmd="redis-server --port 6379"
  if [[ "$use_local_redis" == "true" ]]; then
    ensure_tmux_session "opsly-redis" "$redis_cmd"
  fi

  worker_cmd="cd '$ROOT' && OPSLY_ROOT='$ROOT' npm run start --workspace=@intcloudsysops/orchestrator"
  ensure_tmux_session "opsly-workers" "$worker_cmd"

  dev_cmd="cd '$ROOT' && npm run dev"
  ensure_tmux_session "opsly-dev" "$dev_cmd"

  log_info "Validating local runtime (dry-run)..."
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] npm run validate-local-runtime"
  else
    npm run validate-local-runtime || log_warn "validate-local-runtime reported issues (review above)"
  fi

  log_ok "=== Setup complete ==="
  log_info "tmux attach -t opsly-workers | opsly-redis | opsly-dev"
  log_info "Detect: npm run runtime:detect"
  log_info "Mission Control: admin /mission-control (Local Nodes panel)"
}

main "$@"
