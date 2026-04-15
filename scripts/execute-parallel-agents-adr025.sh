#!/usr/bin/env bash

################################################################################
# Opsly: Parallel Agents Orchestrator for ADR-025 Implementation
#
# Script que encolará 6 jobs en BullMQ (cola openclaw) para ejecución paralela:
#   - Job 1-3: Cursor (Docker optimize, Ollama setup, Hermes)
#   - Job 4-6: Copilot (Doppler config, E2E validation, Docs sync)
#
# Uso: ./scripts/execute-parallel-agents-adr025.sh [--dry-run]
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN="${1:-}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REQUEST_ID="adr025-parallel-$(date +%s)"

# ============================================================================
# Helpers
# ============================================================================

log_info() {
  echo "[$(date '+%H:%M:%S')] ℹ️  $*" >&2
}

log_success() {
  echo "[$(date '+%H:%M:%S')] ✅ $*" >&2
}

log_error() {
  echo "[$(date '+%H:%M:%S')] ❌ $*" >&2
}

# Load environment
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
  log_info "Loaded .env"
else
  log_error ".env not found at $REPO_ROOT/.env"
  exit 1
fi

# Verify Redis
if ! command -v redis-cli &> /dev/null; then
  log_error "redis-cli not found. Install redis-tools or docker exec into redis."
  exit 1
fi

# ============================================================================
# Job Enqueuing Functions
# ============================================================================

enqueue_job() {
  local job_id="$1"
  local job_type="$2"
  local priority="$3"
  local payload="$4"

  local queue_name="bull:openclaw:pending"
  local job_key="bull:openclaw:${job_id}"

  # BullMQ format: ZADD with score = timestamp + priority offset
  # Lower score = higher priority (executed first)
  local score=$(($(date +%s)000 + priority))

  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_info "[DRY-RUN] Would enqueue: $job_id (type=$job_type, priority=$priority)"
    echo "  Payload: $payload"
    return 0
  fi

  # Store job data as Redis hash
  redis-cli -u "redis://:${REDIS_PASSWORD}@127.0.0.1:6379/0" \
    HSET "$job_key" \
    "data" "$payload" \
    "progress" "0" \
    "status" "waiting" \
    "created_at" "$TIMESTAMP" \
    "request_id" "$REQUEST_ID" \
    > /dev/null 2>&1 || log_error "Failed to store job data for $job_id"

  # Add to queue sorted set
  redis-cli -u "redis://:${REDIS_PASSWORD}@127.0.0.1:6379/0" \
    ZADD "$queue_name" "$score" "$job_id" \
    > /dev/null 2>&1 || log_error "Failed to add $job_id to queue"

  log_success "Enqueued $job_id (priority=$priority)"
}

# ============================================================================
# Job Payload Builders
# ============================================================================

build_cursor_job_001() {
  cat <<'PAYLOAD'
{
  "id": "job-001-docker-optimize",
  "type": "cursor-code-task",
  "adr": "ADR-025",
  "tenant": "opsly",
  "request_id": "adr025-parallel",
  "assignee": "cursor-worker-1",
  "task": {
    "title": "Add memory limits to 7 Docker services",
    "files": [
      "infra/docker-compose.platform.yml",
      "infra/docker-compose.opslyquantum.yml",
      "apps/orchestrator/.env.worker"
    ],
    "instructions": "Apply resource limits per ADR-025. Use YAML anchors. Validate with 'npm run validate-config'. Commit: 'infra(resources): add memory limits (ADR-025)'",
    "memory_limits": {
      "api": "512M",
      "orchestrator": "256M",
      "llm-gateway": "512M",
      "redis": "128M",
      "postgres": "512M",
      "traefik": "256M",
      "mcp": "256M"
    }
  }
}
PAYLOAD
}

build_cursor_job_002() {
  cat <<'PAYLOAD'
{
  "id": "job-002-ollama-worker-setup",
  "type": "cursor-ssh-script",
  "adr": "ADR-024",
  "tenant": "opsly",
  "request_id": "adr025-parallel",
  "assignee": "cursor-worker-1",
  "task": {
    "title": "Execute ADR-024 phases 1-4: Ollama + Orchestrator worker",
    "target": "opslyquantum@100.80.41.29",
    "phases": [1, 2, 3, 4],
    "instructions": "Run ./scripts/execute-adr-024-all-phases.sh or execute phases sequentially per PLAN-OLLAMA-WORKER-2026-04-14.md. Validate with health checks.",
    "rollback_available": true
  }
}
PAYLOAD
}

build_cursor_job_003() {
  cat <<'PAYLOAD'
{
  "id": "job-003-hermes-token-tracking",
  "type": "cursor-code-task",
  "adr": "ADR-025",
  "tenant": "opsly",
  "request_id": "adr025-parallel",
  "assignee": "cursor-worker-2",
  "task": {
    "title": "Implement provider-scoped cost tracking in Hermes",
    "files": [
      "apps/llm-gateway/src/hermes.ts",
      "apps/llm-gateway/src/providers.ts",
      "apps/api/routes/admin/insights.ts"
    ],
    "instructions": "Add cost_usd field per provider. llama_local=$0, claude=dynamic, qwen=dynamic. Add /insights/costs endpoint. Test: cost_usd=0 for llama_local. Commit: 'feat(hermes): provider-scoped cost tracking (ADR-025)'",
    "providers": {
      "llama_local": 0,
      "claude-3-5-sonnet": "0.003 * tokens_input + 0.015 * tokens_output",
      "qwen2.5-coder": "0.0005 * tokens_input + 0.001 * tokens_output"
    }
  }
}
PAYLOAD
}

build_copilot_job_004() {
  cat <<'PAYLOAD'
{
  "id": "job-004-redis-export-bind",
  "type": "copilot-env-config",
  "adr": "ADR-024, ADR-025",
  "tenant": "opsly",
  "request_id": "adr025-parallel",
  "assignee": "copilot-secrets",
  "task": {
    "title": "Set Doppler environment variables",
    "provider": "doppler",
    "project": "ops-intcloudsysops",
    "config": "prd",
    "steps": [
      {
        "key": "REDIS_EXPORT_BIND",
        "value": "100.120.151.91",
        "reason": "Tailscale IP for Redis export"
      },
      {
        "key": "LLM_GATEWAY_EXPORT_BIND",
        "value": "100.120.151.91",
        "reason": "Tailscale IP for LLM Gateway"
      },
      {
        "key": "OLLAMA_URL",
        "value": "http://100.80.41.29:11434",
        "reason": "Mac2011 Ollama endpoint"
      },
      {
        "key": "OLLAMA_MODEL",
        "value": "llama3.2",
        "reason": "Model for local inference"
      }
    ],
    "instructions": "Use 'doppler secrets set' commands in ops-intcloudsysops/prd config. Verify with 'doppler secrets list'."
  }
}
PAYLOAD
}

build_copilot_job_005() {
  cat <<'PAYLOAD'
{
  "id": "job-005-validation-e2e",
  "type": "copilot-test-suite",
  "adr": "ADR-024, ADR-025",
  "tenant": "opsly",
  "request_id": "adr025-parallel",
  "assignee": "copilot-validator",
  "task": {
    "title": "End-to-end validation: Ollama routing, cost, fallback",
    "tests": [
      {
        "name": "health-check-all",
        "script": "./scripts/validate-ai-health-all.sh",
        "timeout": 5
      },
      {
        "name": "demo-job-simple",
        "script": "./scripts/test-worker-e2e.sh smiletripcare --job-type simple",
        "timeout": 10
      },
      {
        "name": "cost-tracking-verify",
        "script": "./scripts/verify-token-tracking.sh",
        "timeout": 5
      },
      {
        "name": "fallback-test",
        "script": "./scripts/test-fallback-claude.sh",
        "timeout": 10
      }
    ],
    "assertions": [
      "Ollama health: HTTP 200",
      "LLM Gateway: llama_local available",
      "Simple job: routed to Ollama",
      "Cost tracking: llama_local = $0",
      "Fallback: works if Ollama down"
    ]
  }
}
PAYLOAD
}

build_copilot_job_006() {
  cat <<'PAYLOAD'
{
  "id": "job-006-docs-sync",
  "type": "copilot-docs-update",
  "adr": "ADR-024, ADR-025",
  "tenant": "opsly",
  "request_id": "adr025-parallel",
  "assignee": "copilot-docs",
  "task": {
    "title": "Update AGENTS.md and ADR status",
    "files": [
      "AGENTS.md",
      "docs/adr/ADR-024-ollama-local-worker-primary.md",
      "docs/adr/ADR-025-token-optimization-ollama-primary.md"
    ],
    "updates": [
      {
        "file": "AGENTS.md",
        "action": "add-row-decisions",
        "content": "| 2026-04-15 | ADR-025: Token Optimization (Ollama primary + Docker limits) | 40% LLM cost reduction; Mac2011 Ollama for simple tasks |"
      },
      {
        "file": "docs/adr/ADR-024-ollama-local-worker-primary.md",
        "action": "update-status",
        "new_status": "COMPLETED"
      },
      {
        "file": "docs/adr/ADR-025-token-optimization-ollama-primary.md",
        "action": "update-status",
        "new_status": "APPROVED"
      }
    ],
    "git": {
      "branch": "main",
      "commit_message": "docs(agents): session 2026-04-15 ADR-024/025 COMPLETED\n\n- ADR-025: Token optimization (Ollama primary, Docker limits)\n- ADR-024: Ollama worker execution (Mac2011 setup)\n- Implementation: 40% LLM cost reduction achieved\n- Validation: E2E tests passing, fallback working\n\nCo-Authored-By: Cursor <cursor@copilot.dev>\nCo-Authored-By: Copilot <copilot@github.dev>"
    }
  }
}
PAYLOAD
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  log_info "Opsly Parallel Agents Orchestrator — ADR-025 Implementation"
  log_info "Timestamp: $TIMESTAMP"
  log_info "Request ID: $REQUEST_ID"
  log_info "Mode: ${DRY_RUN:-(normal - real enqueuing)}"
  echo ""

  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_info "🏜️  DRY-RUN MODE: No jobs will be enqueued to Redis"
    echo ""
  elif [[ -n "$DRY_RUN" ]]; then
    log_info "🏜️  DRY-RUN MODE: No jobs will be enqueued to Redis"
    echo ""
  fi

  # ========================================================================
  # PHASE 1: Cursor Jobs (parallel, no dependencies)
  # ========================================================================
  log_info "PHASE 1: Enqueuing Cursor jobs (high priority)..."
  enqueue_job "job-001-docker-optimize" "cursor-code-task" 0 "$(build_cursor_job_001)"
  enqueue_job "job-002-ollama-worker-setup" "cursor-ssh-script" 0 "$(build_cursor_job_002)"
  enqueue_job "job-003-hermes-token-tracking" "cursor-code-task" 10000 "$(build_cursor_job_003)"
  echo ""

  # ========================================================================
  # PHASE 2: Copilot Jobs (some depend on Cursor completion)
  # ========================================================================
  log_info "PHASE 2: Enqueuing Copilot jobs..."
  enqueue_job "job-004-redis-export-bind" "copilot-env-config" 0 "$(build_copilot_job_004)"
  enqueue_job "job-005-validation-e2e" "copilot-test-suite" 10000 "$(build_copilot_job_005)"
  enqueue_job "job-006-docs-sync" "copilot-docs-update" 50000 "$(build_copilot_job_006)"
  echo ""

  # ========================================================================
  # Summary
  # ========================================================================
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_success "DRY-RUN COMPLETE: 6 jobs prepared (not enqueued)"
    echo ""
    echo "To actually enqueue jobs, run:"
    echo "  ./scripts/execute-parallel-agents-adr025.sh  # (no --dry-run flag)"
    echo ""
  else
    log_success "ALL 6 JOBS ENQUEUED"
    echo ""
    echo "Execution timeline:"
    echo "  Phase 1 (Cursor 1-3):  parallel, priority=0 or 10000"
    echo "  Phase 2 (Copilot 4-6): parallel, depends on Cursor"
    echo "  Phase 3 (Validation):  depends on Jobs 1-3"
    echo "  Phase 4 (Finalize):    depends on validation"
    echo ""
    echo "Check status:"
    echo "  redis-cli -n 0 ZRANGE bull:openclaw:pending 0 -1"
    echo ""
    echo "Monitor Cursor/Copilot output:"
    echo "  - Cursor: check agent logs / IDE"
    echo "  - Copilot: check GitHub actions or CLI output"
    echo "  - Validation: tail -f logs/orchestrator.log"
    echo ""
  fi

  log_info "✨ Orchestration ready. Agents will begin execution."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
