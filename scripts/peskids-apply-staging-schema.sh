#!/usr/bin/env bash
# Apply the approved Peskids/Opsly schema to an isolated staging project.
# Copies 0001-0097 only. Never applies 0098/0099/0100+.
#
# Usage:
#   ./scripts/peskids-apply-staging-schema.sh --dry-run
#   ./scripts/peskids-apply-staging-schema.sh --project-ref hljetbbgiphpjbldebpo
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_REF="${PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF:-jkwykpldnitavhmtuzmo}"
QA_REF="${PESKIDS_STAGING_SUPABASE_PROJECT_REF:-hljetbbgiphpjbldebpo}"
TARGET_REF="$QA_REF"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --project-ref) TARGET_REF="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET_REF" || "$TARGET_REF" == "$PROD_REF" ]]; then
  echo "Refusing schema apply: target is missing or is the production project." >&2
  exit 1
fi

WORKDIR="$(mktemp -d /tmp/opsly-qa-schema-XXXXXX)"
mkdir -p "$WORKDIR/supabase/migrations"
cp "$ROOT/supabase/config.toml" "$WORKDIR/supabase/config.toml"

copied=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  base="$(basename "$f")"
  ver="${base%%_*}"
  if [[ "$ver" =~ ^[0-9]{4}$ ]] && (( 10#$ver <= 97 )); then
    cp "$f" "$WORKDIR/supabase/migrations/"
    copied=$((copied + 1))
  fi
done

if [[ -e "$WORKDIR/supabase/migrations/0098_franchise_core.sql" || -e "$WORKDIR/supabase/migrations/0099_franchise_core_rls.sql" ]]; then
  echo "Refusing: franchise migrations leaked into the staging apply set." >&2
  exit 1
fi

echo "[peskids-schema] target_ref=${TARGET_REF}"
echo "[peskids-schema] copied=${copied} max=0097 excluded=0098+"
echo "[peskids-schema] workdir=${WORKDIR}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[peskids-schema] DRY-RUN: would link ${TARGET_REF} and db push 0001-0097"
  echo "[peskids-schema] DRY-RUN: would CREATE SCHEMA peskids if missing"
  echo "[peskids-schema] DRY-RUN: would skip apps/peskids franchise_core_rls"
  exit 0
fi

supabase --workdir "$WORKDIR" link --project-ref "$TARGET_REF" --yes
supabase --workdir "$WORKDIR" db push --linked --dry-run --yes
supabase --workdir "$WORKDIR" db query --linked --yes \
  "CREATE SCHEMA IF NOT EXISTS peskids; GRANT USAGE ON SCHEMA peskids TO anon, authenticated, service_role;"
supabase --workdir "$WORKDIR" db push --linked --yes
echo "[peskids-schema] applied 0001-0097 on ${TARGET_REF}"
