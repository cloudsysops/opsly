#!/usr/bin/env bash
# =============================================================================
# Production-guard tests
# =============================================================================
# Proves that every destructive / fixture-loading script refuses to run when the
# environment looks like production, by actually invoking each script with
# production-shaped environment variables and asserting a non-zero exit.
#
# The scripts under test all require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
# which are deliberately NOT set here: a guard that fires must fire before the
# script gets far enough to need credentials, so these tests can never reach a
# real database even if a guard regresses. Each case additionally asserts the
# refusal message, so "exited non-zero because credentials were missing" cannot
# masquerade as "exited non-zero because the guard held".
#
# Usage: bash scripts/test-prod-guards.sh   (npm run test:prod-guards)
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0

# Run a script with a scrubbed environment plus the given VAR=VALUE overrides,
# and assert it exits non-zero with a message matching `$expect_re`.
assert_refuses() {
  local label="$1"; shift
  local expect_re="$1"; shift
  local script="$1"; shift

  # Env overrides come first; anything after a literal `--` is passed to the
  # script itself as arguments.
  local -a envs=() args=()
  local seen_sep=0
  local tok
  for tok in "$@"; do
    if [[ $seen_sep -eq 0 && "$tok" == "--" ]]; then seen_sep=1; continue; fi
    if [[ $seen_sep -eq 0 ]]; then envs+=("$tok"); else args+=("$tok"); fi
  done

  local out rc
  out="$(env -i \
        PATH="$PATH" HOME="$HOME" \
        "${envs[@]}" \
        bash "$ROOT/$script" "${args[@]+"${args[@]}"}" 2>&1)"
  rc=$?

  if [[ $rc -eq 0 ]]; then
    echo "FAIL  $label — script exited 0; the guard did not fire"
    FAIL=$((FAIL + 1))
    return
  fi
  if ! grep -qE "$expect_re" <<<"$out"; then
    echo "FAIL  $label — exited $rc but for the wrong reason:"
    sed 's/^/        /' <<<"$out" | head -4
    FAIL=$((FAIL + 1))
    return
  fi
  echo "ok    $label (exit $rc)"
  PASS=$((PASS + 1))
}

# Assert a script DOES get past the guard (reaching the credential check),
# so the guard is not simply refusing unconditionally.
assert_allows_nonprod() {
  local label="$1"; shift
  local script="$1"; shift

  local out
  out="$(env -i PATH="$PATH" HOME="$HOME" "$@" bash "$ROOT/$script" 2>&1)"
  if grep -qE 'REFUSED' <<<"$out"; then
    echo "FAIL  $label — guard refused a non-production run:"
    sed 's/^/        /' <<<"$out" | head -4
    FAIL=$((FAIL + 1))
    return
  fi
  echo "ok    $label (guard allowed non-production)"
  PASS=$((PASS + 1))
}

SEEDS=(
  scripts/seed-peskids-demo-students.sh
  scripts/seed-peskids-demo-class.sh
  scripts/seed-peskids-pools.sh
)

echo "== Seed scripts must refuse production even WITH the opt-in flag =="
for s in "${SEEDS[@]}"; do
  [[ -f "$ROOT/$s" ]] || { echo "SKIP  $s (missing)"; continue; }
  assert_refuses "$(basename "$s") · DOPPLER_CONFIG=prd + opt-in" \
    'REFUSED.*will not run against a production environment' \
    "$s" PESKIDS_ALLOW_DEMO_SEED=1 DOPPLER_CONFIG=prd
  assert_refuses "$(basename "$s") · NODE_ENV=production + opt-in" \
    'REFUSED.*will not run against a production environment' \
    "$s" PESKIDS_ALLOW_DEMO_SEED=1 NODE_ENV=production
  assert_refuses "$(basename "$s") · ENVIRONMENT=production + opt-in" \
    'REFUSED.*will not run against a production environment' \
    "$s" PESKIDS_ALLOW_DEMO_SEED=1 ENVIRONMENT=production
  assert_refuses "$(basename "$s") · OPSLY_LAYER=prod + opt-in" \
    'REFUSED.*will not run against a production environment' \
    "$s" PESKIDS_ALLOW_DEMO_SEED=1 OPSLY_LAYER=prod
done

echo
echo "== Seed scripts must refuse anywhere without the opt-in flag =="
for s in "${SEEDS[@]}"; do
  [[ -f "$ROOT/$s" ]] || continue
  assert_refuses "$(basename "$s") · staging, no opt-in" \
    'REFUSED.*blocked by default' \
    "$s" DOPPLER_CONFIG=stg
done

echo
echo "== Seed scripts must still be usable on staging with the opt-in =="
for s in "${SEEDS[@]}"; do
  [[ -f "$ROOT/$s" ]] || continue
  assert_allows_nonprod "$(basename "$s") · staging + opt-in" \
    "$s" PESKIDS_ALLOW_DEMO_SEED=1 DOPPLER_CONFIG=stg
done

echo
echo "== Demo-data purge must refuse --execute without explicit confirmation =="
if [[ -f "$ROOT/scripts/purge-peskids-demo-data.sh" ]]; then
  assert_refuses "purge-peskids-demo-data.sh · --execute without confirm" \
    'REFUSED.*PESKIDS_PURGE_DEMO_CONFIRM' \
    scripts/purge-peskids-demo-data.sh DOPPLER_CONFIG=prd -- --execute
fi

echo
echo "== DB assurance harness must refuse non-loopback and production =="
assert_refuses "replay.sh · ENVIRONMENT=production" \
  'REFUSING.*production' \
  tools/db-assurance/replay.sh ENVIRONMENT=production
assert_refuses "replay.sh · non-loopback host" \
  'REFUSING.*loopback' \
  tools/db-assurance/replay.sh DBA_PGHOST=db.example.com
assert_refuses "rls-test.sh · ENVIRONMENT=production" \
  'REFUSING.*production' \
  tools/db-assurance/rls-test.sh ENVIRONMENT=production

echo
echo "== Summary: $PASS passed, $FAIL failed =="
[[ $FAIL -gt 0 ]] && exit 1
exit 0
