#!/usr/bin/env bash
# Guard: block demo/fixture seeds from ever reaching a production database.
#
# Two independent gates, both of which must be satisfied:
#
#   1. Opt-in.        PESKIDS_ALLOW_DEMO_SEED=1 must be set. Without it the
#                     script refuses, whatever environment it is pointed at.
#   2. Not production. Even WITH the opt-in, the guard hard-refuses when the
#                     environment looks like production. The opt-in flag exists
#                     to stop accidents on staging; it is not a production
#                     override, and there is deliberately no flag that is.
#
# Production is detected from any of:
#   DOPPLER_CONFIG / OPSLY_LAYER / ENVIRONMENT / NODE_ENV / APP_ENV / OPSLY_ENVIRONMENT
#   ...matching prd | prod | production | live
#
# Callers:
#   source "${ROOT}/scripts/lib/peskids-demo-seed-guard.sh"
#   peskids_require_demo_seed_allow "./scripts/seed-foo.sh" || exit 1
#
# Covered by: scripts/test-prod-guards.sh (npm run test:prod-guards)
#
# shellcheck shell=bash

# Returns 0 when the current environment looks like production.
peskids_env_is_production() {
  local candidate
  for candidate in \
    "${DOPPLER_CONFIG:-}" \
    "${OPSLY_LAYER:-}" \
    "${OPSLY_ENVIRONMENT:-}" \
    "${ENVIRONMENT:-}" \
    "${APP_ENV:-}" \
    "${NODE_ENV:-}"
  do
    case "$(printf '%s' "$candidate" | tr 'A-Z' 'a-z')" in
      prd|prod|production|live) return 0 ;;
    esac
  done
  return 1
}

peskids_require_demo_seed_allow() {
  local script_name="${1:-seed-demo}"

  # Gate 2 is checked first, so that a production run reports the real reason
  # rather than telling the operator to set the opt-in flag and try again.
  if peskids_env_is_production; then
    cat >&2 <<EOF
REFUSED: ${script_name} will not run against a production environment.

Detected production from:
  DOPPLER_CONFIG=${DOPPLER_CONFIG:-<unset>} OPSLY_LAYER=${OPSLY_LAYER:-<unset>}
  OPSLY_ENVIRONMENT=${OPSLY_ENVIRONMENT:-<unset>} ENVIRONMENT=${ENVIRONMENT:-<unset>}
  APP_ENV=${APP_ENV:-<unset>} NODE_ENV=${NODE_ENV:-<unset>}

Peskids production holds real students' records. Demo seeds must never run
there, and PESKIDS_ALLOW_DEMO_SEED does NOT override this — it only unlocks
staging and local.

Run it against staging instead:
  PESKIDS_ALLOW_DEMO_SEED=1 doppler run --config stg -- ${script_name}

To remove demo rows that already reached production (dry-run first):
  doppler run --project ops-intcloudsysops --config prd -- \\
    ./scripts/purge-peskids-demo-data.sh --dry-run
EOF
    return 1
  fi

  if [[ "${PESKIDS_ALLOW_DEMO_SEED:-}" == "1" ]]; then
    echo "WARN: ${script_name} running with PESKIDS_ALLOW_DEMO_SEED=1 (env: ${DOPPLER_CONFIG:-${NODE_ENV:-local}})" >&2
    return 0
  fi

  cat >&2 <<EOF
REFUSED: ${script_name} is blocked by default (production-safe).

Peskids is taking real students — demo seeds must not run against prd.

To override intentionally (staging / local only):
  PESKIDS_ALLOW_DEMO_SEED=1 doppler run --config <stg|dev> -- ${script_name}

To remove existing demo rows (dry-run first):
  doppler run --project ops-intcloudsysops --config prd -- \\
    ./scripts/purge-peskids-demo-data.sh --dry-run
EOF
  return 1
}
