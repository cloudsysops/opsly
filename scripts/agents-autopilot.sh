#!/usr/bin/env bash
# Mantiene agentes trabajando en bucle:
# - Hermes tick
# - Enqueue Ollama squad
# - Smoke de worker
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TENANT_SLUG="${TENANT_SLUG:-smiletripcare}"
GOAL="${GOAL:-Mantener plataforma multi-agente estable y eficiente}"
PLAN="${PLAN:-business}"
PROFILE="${PROFILE:-production}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"
ITERATIONS="${ITERATIONS:-0}" # 0 = infinito
RUN_ID_PREFIX="${RUN_ID_PREFIX:-autopilot}"
ENABLE_WORKER_SMOKE="${ENABLE_WORKER_SMOKE:-true}"
ENABLE_HERMES_TICK="${ENABLE_HERMES_TICK:-true}"
USE_DOPPLER="${USE_DOPPLER:-true}"
AUTO_LOCAL_REDIS_FIX="${AUTO_LOCAL_REDIS_FIX:-true}"
LOCAL_REDIS_URL="${LOCAL_REDIS_URL:-redis://localhost:6379}"
LOCAL_REDIS_PASSWORD="${LOCAL_REDIS_PASSWORD:-}"

resolve_runtime_redis_url() {
  if [[ "${AUTO_LOCAL_REDIS_FIX}" != "true" ]]; then
    echo "${REDIS_URL:-}"
    return
  fi
  if command -v redis-cli >/dev/null 2>&1; then
    if [[ -n "${LOCAL_REDIS_PASSWORD}" ]]; then
      if redis-cli -h localhost -a "${LOCAL_REDIS_PASSWORD}" ping >/dev/null 2>&1; then
        echo "${LOCAL_REDIS_URL}"
        return
      fi
    elif redis-cli -h localhost ping >/dev/null 2>&1; then
      echo "${LOCAL_REDIS_URL}"
      return
    fi
  fi
  echo "${REDIS_URL:-}"
}

ensure_local_redis_policy() {
  if [[ "${AUTO_LOCAL_REDIS_FIX}" != "true" ]]; then
    return
  fi
  if ! command -v redis-cli >/dev/null 2>&1; then
    return
  fi
  local policy=""
  if [[ -n "${LOCAL_REDIS_PASSWORD}" ]]; then
    policy="$(redis-cli -h localhost -a "${LOCAL_REDIS_PASSWORD}" CONFIG GET maxmemory-policy 2>/dev/null | awk 'NR==2{print $0}' || true)"
  else
    policy="$(redis-cli -h localhost CONFIG GET maxmemory-policy 2>/dev/null | awk 'NR==2{print $0}' || true)"
  fi
  if [[ "${policy}" == "noeviction" ]]; then
    return
  fi
  if [[ -n "${LOCAL_REDIS_PASSWORD}" ]]; then
    redis-cli -h localhost -a "${LOCAL_REDIS_PASSWORD}" CONFIG SET maxmemory-policy noeviction >/dev/null 2>&1 || true
  else
    redis-cli -h localhost CONFIG SET maxmemory-policy noeviction >/dev/null 2>&1 || true
  fi
}

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "[dry-run] ROOT=$ROOT"
  echo "[dry-run] TENANT_SLUG=$TENANT_SLUG PLAN=$PLAN PROFILE=$PROFILE"
  echo "[dry-run] GOAL=$GOAL"
  echo "[dry-run] INTERVAL_SECONDS=$INTERVAL_SECONDS ITERATIONS=$ITERATIONS"
fi

run_in_env() {
  local redis_url_override
  redis_url_override="$(resolve_runtime_redis_url)"
  if [[ "$USE_DOPPLER" == "true" ]] && command -v doppler >/dev/null 2>&1; then
    if [[ -n "${redis_url_override}" ]]; then
      doppler run --project ops-intcloudsysops --config prd -- env REDIS_URL="${redis_url_override}" REDIS_PASSWORD="${LOCAL_REDIS_PASSWORD}" "$@"
    else
      doppler run --project ops-intcloudsysops --config prd -- "$@"
    fi
  else
    if [[ -n "${redis_url_override}" ]]; then
      env REDIS_URL="${redis_url_override}" REDIS_PASSWORD="${LOCAL_REDIS_PASSWORD}" "$@"
    else
      "$@"
    fi
  fi
}

assert_prereqs() {
  command -v npm >/dev/null 2>&1 || {
    echo "npm no disponible" >&2
    exit 1
  }
  command -v npx >/dev/null 2>&1 || {
    echo "npx no disponible" >&2
    exit 1
  }
}

run_cycle() {
  local cycle="$1"
  local ts_utc
  local run_id
  ts_utc="$(date -u +"%Y%m%d%H%M%S")"
  run_id="${RUN_ID_PREFIX}-${ts_utc}-c${cycle}"

  echo "=== [autopilot] ciclo=${cycle} run_id=${run_id} $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    if [[ "$ENABLE_HERMES_TICK" == "true" ]]; then
      echo "[dry-run] npx tsx apps/orchestrator/src/hermes/cli.ts tick"
    fi
    echo "[dry-run] npx tsx scripts/enqueue-ollama-squad.ts --tenant ${TENANT_SLUG} --goal \"${GOAL}\" --profile ${PROFILE} --plan ${PLAN} --run-id ${run_id}"
    if [[ "$ENABLE_WORKER_SMOKE" == "true" ]]; then
      echo "[dry-run] ./scripts/test-worker-e2e.sh ${TENANT_SLUG} --notify"
    fi
    return 0
  fi

  if [[ "$ENABLE_HERMES_TICK" == "true" ]]; then
    run_in_env npx tsx apps/orchestrator/src/hermes/cli.ts tick
  fi
  run_in_env npx tsx scripts/enqueue-ollama-squad.ts \
    --tenant "${TENANT_SLUG}" \
    --goal "${GOAL}" \
    --profile "${PROFILE}" \
    --plan "${PLAN}" \
    --run-id "${run_id}"

  if [[ "$ENABLE_WORKER_SMOKE" == "true" ]]; then
    run_in_env ./scripts/test-worker-e2e.sh "${TENANT_SLUG}" --notify
  fi
}

main() {
  assert_prereqs
  ensure_local_redis_policy
  local i=1
  while true; do
    run_cycle "$i"
    if [[ "$ITERATIONS" != "0" ]] && [[ "$i" -ge "$ITERATIONS" ]]; then
      break
    fi
    sleep "$INTERVAL_SECONDS"
    i=$((i + 1))
  done
  echo "[autopilot] finalizado"
}

main "$@"
