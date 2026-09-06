#!/usr/bin/env bash
# Fail closed if a Peskids staging deploy would use the production Supabase project.
# Prints project refs only — never keys, JWTs, or full URLs.
set -euo pipefail

PROD_REF="${PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF:-jkwykpldnitavhmtuzmo}"
QA_REF="${PESKIDS_STAGING_SUPABASE_PROJECT_REF:-hljetbbgiphpjbldebpo}"

extract_ref() {
  python3 -c '
import re, sys
value = sys.stdin.read().strip()
match = re.search(r"https://([a-z0-9]+)\.supabase\.(?:co|in)", value, re.I)
print(match.group(1).lower() if match else "")
'
}

STAGING_URL="${STAGING_NEXT_PUBLIC_SUPABASE_URL:-${PESKIDS_STAGING_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
if [[ -z "$STAGING_URL" ]]; then
  echo "PESKIDS_STAGING_ISOLATION: missing staging Supabase URL" >&2
  exit 2
fi

STAGING_REF="$(printf '%s' "$STAGING_URL" | extract_ref)"
if [[ -z "$STAGING_REF" ]]; then
  echo "PESKIDS_STAGING_ISOLATION: could not parse staging project ref" >&2
  exit 2
fi

echo "PESKIDS_STAGING_ISOLATION: staging_ref=${STAGING_REF}"
echo "PESKIDS_STAGING_ISOLATION: production_ref=${PROD_REF}"
echo "PESKIDS_STAGING_ISOLATION: expected_qa_ref=${QA_REF}"

if [[ "$STAGING_REF" == "$PROD_REF" ]]; then
  echo "PESKIDS_STAGING_ISOLATION: refuse deploy — staging points at production Supabase" >&2
  exit 1
fi
