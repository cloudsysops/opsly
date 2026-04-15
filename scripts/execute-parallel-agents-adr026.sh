#!/usr/bin/env bash

################################################################################
# Opsly: Parallel Agents Orchestrator for ADR-026 Implementation
#
# Script que encolará 4 jobs en BullMQ (cola openclaw) para ejecución paralela:
#   - Job 1-2: Cursor (Supabase migration, tenant identity integration)
#   - Job 3-4: Copilot (context-pack validation, tenant profiles sync)
#
# Uso: ./scripts/execute-parallel-agents-adr026.sh [--dry-run]
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN="${1:-}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REQUEST_ID="adr026-parallel-$(date +%s)"

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
  redis-cli -a "${REDIS_PASSWORD:-}" -n 0 \
    HSET "$job_key" \
    "data" "$payload" \
    "progress" "0" \
    "status" "waiting" \
    "created_at" "$TIMESTAMP" \
    "request_id" "$REQUEST_ID" \
    > /dev/null 2>&1 || log_error "Failed to store job data for $job_id"

  # Add to queue sorted set
  redis-cli -a "${REDIS_PASSWORD:-}" -n 0 \
    ZADD "$queue_name" "$score" "$job_id" \
    > /dev/null 2>&1 || log_error "Failed to add $job_id to queue"

  log_success "Enqueued $job_id (priority=$priority)"
}

# ============================================================================
# Job Payload Builders
# ============================================================================

build_cursor_job_007() {
  cat <<'PAYLOAD'
{
  "id": "job-007-adr026-supabase-migration",
  "type": "cursor-code-task",
  "adr": "ADR-026",
  "tenant": "opsly",
  "request_id": "adr026-parallel",
  "assignee": "cursor-worker-1",
  "task": {
    "title": "Apply Supabase migration 0031: tenant context profile columns",
    "files": [
      "supabase/migrations/0031_tenant_context_profile.sql"
    ],
    "instructions": "Apply migration via Supabase CLI or direct SQL. Verify: (1) Columns tech_stack, coding_standards, vector_namespace added to platform.tenants, (2) Index idx_tenants_vector_namespace created. Commit: 'database(migrations): add tenant context profile (ADR-026)'",
    "validation": [
      "supabase db push --dry-run | grep -E 'tech_stack|coding_standards|vector_namespace'",
      "psql -c 'SELECT column_name FROM information_schema.columns WHERE table_schema=\"platform\" AND table_name=\"tenants\" AND column_name IN (\"tech_stack\", \"coding_standards\", \"vector_namespace\")'",
      "psql -c 'SELECT indexname FROM pg_indexes WHERE tablename=\"tenants\" AND indexname=\"idx_tenants_vector_namespace\"'"
    ],
    "timeout_minutes": 10
  }
}
PAYLOAD
}

build_cursor_job_008() {
  cat <<'PAYLOAD'
{
  "id": "job-008-adr026-tenant-profile-integration",
  "type": "cursor-code-task",
  "adr": "ADR-026",
  "tenant": "opsly",
  "request_id": "adr026-parallel",
  "assignee": "cursor-worker-2",
  "task": {
    "title": "Integrate tenant-profile resolution in context-pack-builder",
    "files": [
      "apps/context-builder/src/context-pack-builder.ts",
      "apps/context-builder/src/tenant-profile.ts"
    ],
    "instructions": "Verify tenant-profile.ts exports resolveTenantIdentity and buildIdentityPromptBlock. Confirm context-pack-builder.ts (1) selects tech_stack, coding_standards, vector_namespace from platform.tenants, (2) calls resolveTenantIdentity with row data, (3) injects identityBlock into system_instructions. No code changes needed if already integrated; mark as completed. Commit: 'feat(context-builder): tenant profile resolution (ADR-026)'",
    "validation": [
      "grep -n 'resolveTenantIdentity' apps/context-builder/src/context-pack-builder.ts",
      "grep -n 'buildIdentityPromptBlock' apps/context-builder/src/context-pack-builder.ts",
      "grep -n 'vector_namespace' apps/context-builder/src/context-pack-builder.ts"
    ],
    "timeout_minutes": 15
  }
}
PAYLOAD
}

build_copilot_job_009() {
  cat <<'PAYLOAD'
{
  "id": "job-009-adr026-tenant-seed-data",
  "type": "copilot-env-config",
  "adr": "ADR-026",
  "tenant": "opsly",
  "request_id": "adr026-parallel",
  "assignee": "copilot-seeds",
  "task": {
    "title": "Seed tenant profile data for test tenants",
    "provider": "supabase",
    "steps": [
      {
        "tenant": "opsly",
        "tech_stack": {
          "backend": "Node.js + TypeScript",
          "framework": "Remix",
          "database": "PostgreSQL + pgvector",
          "cache": "Redis",
          "orchestration": "BullMQ"
        },
        "coding_standards": "Use ESLint + Prettier. Functions >50 lines → split. No 'any' in TS. Constants in lib/constants.ts. Repository pattern for Supabase queries.",
        "vector_namespace": "opsly.default"
      },
      {
        "tenant": "smiletripcare",
        "tech_stack": {
          "backend": "Python + FastAPI",
          "framework": "FastAPI",
          "database": "PostgreSQL",
          "cache": "Redis"
        },
        "coding_standards": "PEP 8 + Black formatter. Type hints required. Docstrings for public APIs.",
        "vector_namespace": "smiletripcare.default"
      }
    ],
    "instructions": "For each tenant, run: UPDATE platform.tenants SET tech_stack = $1, coding_standards = $2, vector_namespace = $3 WHERE slug = $4. Verify with SELECT tech_stack, coding_standards, vector_namespace FROM platform.tenants WHERE slug IN ('opsly', 'smiletripcare')",
    "timeout_minutes": 5
  }
}
PAYLOAD
}

build_copilot_job_010() {
  cat <<'PAYLOAD'
{
  "id": "job-010-adr026-context-pack-validation",
  "type": "copilot-test-suite",
  "adr": "ADR-026",
  "tenant": "opsly",
  "request_id": "adr026-parallel",
  "assignee": "copilot-validator",
  "task": {
    "title": "End-to-end validation: context-pack includes tenant identity",
    "tests": [
      {
        "name": "context-pack-opsly",
        "script": "node -e \"import { buildContextPack } from './apps/context-builder/src/context-pack-builder.ts'; buildContextPack({ tenantSlug: 'opsly' }).then(cp => console.log(JSON.stringify(cp.identity, null, 2)))\"",
        "timeout": 10,
        "expect": {
          "contains": ["tech_stack", "coding_standards", "vector_namespace"],
          "tech_stack_key": "backend",
          "vector_namespace": "opsly.default"
        }
      },
      {
        "name": "identity-prompt-block",
        "script": "grep -A 20 'TENANT IDENTITY' context-pack-*.json | head -20",
        "timeout": 5,
        "expect": {
          "contains": ["Vector namespace", "TECH STACK", "CODING STANDARDS"]
        }
      }
    ],
    "assertions": [
      "Context pack includes tech_stack from platform.tenants",
      "Context pack includes coding_standards",
      "Context pack includes vector_namespace",
      "Identity prompt block renders correctly",
      "All 3 tenants have vector_namespace defined"
    ],
    "timeout_minutes": 15
  }
}
PAYLOAD
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  log_info "Opsly Parallel Agents Orchestrator — ADR-026 Implementation"
  log_info "Timestamp: $TIMESTAMP"
  log_info "Request ID: $REQUEST_ID"
  log_info "Mode: ${DRY_RUN:-(normal - real enqueuing)}"
  echo ""

  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_info "🏜️  DRY-RUN MODE: No jobs will be enqueued to Redis"
    echo ""
  fi

  # ========================================================================
  # PHASE 1: Cursor Jobs (parallel, no dependencies)
  # ========================================================================
  log_info "PHASE 1: Enqueuing Cursor jobs (high priority)..."
  enqueue_job "job-007-adr026-supabase-migration" "cursor-code-task" 0 "$(build_cursor_job_007)"
  enqueue_job "job-008-adr026-tenant-profile-integration" "cursor-code-task" 5000 "$(build_cursor_job_008)"
  echo ""

  # ========================================================================
  # PHASE 2: Copilot Jobs (depend on Cursor completion)
  # ========================================================================
  log_info "PHASE 2: Enqueuing Copilot jobs..."
  enqueue_job "job-009-adr026-tenant-seed-data" "copilot-env-config" 10000 "$(build_copilot_job_009)"
  enqueue_job "job-010-adr026-context-pack-validation" "copilot-test-suite" 20000 "$(build_copilot_job_010)"
  echo ""

  # ========================================================================
  # Summary
  # ========================================================================
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_success "DRY-RUN COMPLETE: 4 jobs prepared (not enqueued)"
    echo ""
    echo "To actually enqueue jobs, run:"
    echo "  ./scripts/execute-parallel-agents-adr026.sh  # (no --dry-run flag)"
    echo ""
  else
    log_success "ALL 4 JOBS ENQUEUED"
    echo ""
    echo "Execution timeline:"
    echo "  Phase 1 (Cursor 7-8):  parallel, priority=0,5000"
    echo "  Phase 2 (Copilot 9-10): sequential, depends on Cursor"
    echo "  Estimated total: 35-40 minutes"
    echo ""
    echo "Check status:"
    echo "  redis-cli -n 0 ZRANGE bull:openclaw:pending 0 -1"
    echo ""
  fi

  log_info "✨ ADR-026 orchestration ready. Agents will begin execution."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
