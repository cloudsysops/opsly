#!/usr/bin/env bash
# Guard: block accidental demo seeds against production Supabase.
# Opt-in: PESKIDS_ALLOW_DEMO_SEED=1
#
# shellcheck shell=bash

peskids_require_demo_seed_allow() {
  local script_name="${1:-seed-demo}"
  if [[ "${PESKIDS_ALLOW_DEMO_SEED:-}" == "1" ]]; then
    echo "WARN: ${script_name} running with PESKIDS_ALLOW_DEMO_SEED=1" >&2
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
