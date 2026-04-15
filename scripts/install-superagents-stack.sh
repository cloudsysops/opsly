#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
WITH_NOTEBOOKLM=false
WITH_OLLAMA_PULL=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --with-notebooklm) WITH_NOTEBOOKLM=true ;;
    --with-ollama-pull) WITH_OLLAMA_PULL=true ;;
    *)
      echo "Unknown flag: $arg" >&2
      echo "Usage: $0 [--dry-run] [--with-notebooklm] [--with-ollama-pull]" >&2
      exit 1
      ;;
  esac
done

log() { echo "[superagents:install] $*"; }

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need_optional_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_vscode_extensions() {
  if ! need_optional_cmd code; then
    log "VSCode CLI (code) no disponible; se omite instalación de extensiones."
    return 0
  fi

  local ext
  local exts
  exts="$(node -e "const fs=require('fs');const p='.vscode/extensions.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));for (const e of (j.recommendations||[])) console.log(e);")"
  while IFS= read -r ext; do
    [[ -z "$ext" ]] && continue
    run code --install-extension "$ext" --force
  done <<<"$exts"
}

write_superagents_profile() {
  local profile_path="$ROOT/.env.superagents.example"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] write $profile_path"
    return 0
  fi

  cat >"$profile_path" <<'EOF'
# Superagents runtime profile (copy to .env.superagents local and edit).
# No secrets here; values by default are safe placeholders.

# MCP (SDK stdio transport for AI agent clients)
MCP_TRANSPORT=stdio

# Hermes / local-first policy
HERMES_ENABLED=true
HERMES_DISPATCH_OPENCLAW=true
HERMES_LOCAL_LLM_FIRST=true
HERMES_FALLBACK_TENANT_SLUG=platform

# Worker mode defaults
OPSLY_ORCHESTRATOR_MODE=worker-enabled
ORCHESTRATOR_OLLAMA_CONCURRENCY=1
ORCHESTRATOR_CURSOR_CONCURRENCY=1

# LLM local
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=nemotron-3-nano:4b
EOF
}

main() {
  log "Preparando stack de superagentes (preinstalado + preconfigurado)."

  need_cmd node
  need_cmd npm
  need_cmd npx
  need_cmd jq
  need_cmd rg

  run npm ci

  run npm run validate-skills
  run npm run type-check

  # Build crítico para agentes runtime.
  run npm run build --workspace=@intcloudsysops/types
  run npm run build --workspace=@intcloudsysops/llm-gateway
  run npm run build --workspace=@intcloudsysops/orchestrator
  run npm run build --workspace=@intcloudsysops/mcp

  # Conocimiento secuencial (repo-first).
  run npm run index-knowledge
  if [[ "$WITH_NOTEBOOKLM" == "true" ]]; then
    run npm run notebooklm:full-sync
  fi

  # Superpowers bootstrap chain para consumo de agentes.
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] node scripts/load-skills.js bootstrap > .opsly/superagents/bootstrap-chain.txt"
  else
    mkdir -p .opsly/superagents
    node scripts/load-skills.js bootstrap > .opsly/superagents/bootstrap-chain.txt
  fi

  # IDE extensions (best effort).
  install_vscode_extensions

  # Opcional: asegurar modelo local.
  if [[ "$WITH_OLLAMA_PULL" == "true" ]]; then
    run npm run opsly:ensure-ollama -- --ensure
  fi

  write_superagents_profile
  log "OK: stack superagentes instalado. Usa docs/SUPERAGENTS-BOOTSTRAP.md"
}

main "$@"
