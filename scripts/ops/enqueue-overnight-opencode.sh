#!/usr/bin/env bash
# Desde Mac: encolar jobs OpenCode overnight hacia BullMQ (Redis VPS).
# El PC-gamer (worker + bridge :5004) debe estar online.
# Requiere PLATFORM_ADMIN_TOKEN en el entorno (Doppler) — NUNCA en el gamer.
#
# Usage:
#   ./scripts/ops/enqueue-overnight-opencode.sh --dry-run
#   ./scripts/ops/enqueue-overnight-opencode.sh --file .cursor/prompts/queue/task.md
#   ./scripts/ops/enqueue-overnight-opencode.sh --prompt "Add unit tests for X; do not touch apps/peskids"
#   ./scripts/ops/enqueue-overnight-opencode.sh --queue-dir .cursor/prompts/queue
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/enqueue-overnight-opencode.sh --prompt "…"
#
set -euo pipefail

DRY_RUN=false
PROMPT=""
FILE=""
QUEUE_DIR=""
AGENT="${OPSLY_OVERNIGHT_AGENT:-opencode}"
TENANT="${OPSLY_OVERNIGHT_TENANT:-local}"
ORCH_URL="${ORCHESTRATOR_URL:-http://100.120.151.91:3011}"
REQUIRE_ONLINE=true
MAX_STEPS="${OPSLY_OVERNIGHT_MAX_STEPS:-12}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --prompt)
      PROMPT="${2:-}"
      shift 2
      ;;
    --file)
      FILE="${2:-}"
      shift 2
      ;;
    --queue-dir)
      QUEUE_DIR="${2:-}"
      shift 2
      ;;
    --agent)
      AGENT="${2:-}"
      shift 2
      ;;
    --orchestrator-url)
      ORCH_URL="${2:-}"
      shift 2
      ;;
    --skip-online-check)
      REQUIRE_ONLINE=false
      shift
      ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

if [[ "$REQUIRE_ONLINE" == "true" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ./scripts/ops/check-pc-gamer-online.sh --json"
  else
    if ! ./scripts/ops/check-pc-gamer-online.sh >/dev/null 2>&1; then
      echo "[enqueue] ERROR: PC-gamer offline — no encolar overnight. Enciende + reconnect." >&2
      ./scripts/ops/check-pc-gamer-online.sh --json || true
      exit 1
    fi
  fi
fi

TOKEN="${PLATFORM_ADMIN_TOKEN:-}"
if [[ -z "$TOKEN" && "$DRY_RUN" != "true" ]]; then
  echo "[enqueue] ERROR: PLATFORM_ADMIN_TOKEN missing. Use: doppler run --project ops-intcloudsysops --config prd -- $0 …" >&2
  exit 1
fi

submit_one() {
  local content="$1"
  local label="${2:-adhoc}"
  if [[ -z "${content// }" ]]; then
    echo "[enqueue] skip empty: $label" >&2
    return 0
  fi
  # Guardrails baked into every overnight job
  local wrapped
  wrapped="$(cat <<EOF
## Overnight OpenCode (PC-gamer)

Constraints (non-negotiable):
- Work only in the overnight worktree / current cwd of the bridge.
- Do NOT deploy, merge to main, or touch production Peskids secrets.
- Prefer tests + small PRs. No force-push. No Doppler master secrets.
- If blocked, write a short STATUS in the response and stop.

Task:
${content}
EOF
)"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] POST ${ORCH_URL}/api/local/prompt-submit agent=${AGENT} label=${label} chars=${#wrapped}"
    return 0
  fi

  local body
  body="$(jq -n \
    --arg agent "$AGENT" \
    --arg prompt "$wrapped" \
    --arg tenant "$TENANT" \
    --argjson max "$MAX_STEPS" \
    '{agent: $agent, prompt_content: $prompt, tenant_slug: $tenant, max_steps: $max, agent_role: "executor"}')"

  local resp
  resp="$(curl -sfS --max-time 30 \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -H "x-autonomy-approved: true" \
    -d "$body" \
    "${ORCH_URL%/}/api/local/prompt-submit")"
  echo "[enqueue] ${label}: ${resp}"
}

if [[ -n "$FILE" ]]; then
  submit_one "$(cat "$FILE")" "$(basename "$FILE")"
elif [[ -n "$QUEUE_DIR" ]]; then
  shopt -s nullglob
  files=("${QUEUE_DIR}"/*.md)
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "[enqueue] no *.md in $QUEUE_DIR" >&2
    exit 1
  fi
  for f in "${files[@]}"; do
    submit_one "$(cat "$f")" "$(basename "$f")"
  done
elif [[ -n "$PROMPT" ]]; then
  submit_one "$PROMPT" "prompt"
else
  echo "Provide --prompt, --file, or --queue-dir" >&2
  exit 1
fi

echo "[enqueue] done — gamer worker consumes queue local-agents when online"
