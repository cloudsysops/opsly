#!/usr/bin/env bash
# Synthetic Peskids QA fixtures only. Refuses production and the production project ref.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/peskids-data-safety-guard.sh
source "${ROOT}/scripts/lib/peskids-data-safety-guard.sh"

DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--dry-run]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

peskids_refuse_production_data_mutation "staging fixture seed" || exit 1

PROD_REF="${PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF:-jkwykpldnitavhmtuzmo}"
QA_REF="${PESKIDS_STAGING_SUPABASE_PROJECT_REF:-hljetbbgiphpjbldebpo}"
TARGET_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
if [[ "$TARGET_URL" == *"${PROD_REF}"* ]]; then
  echo "Refusing seed: target URL uses the production Supabase project." >&2
  exit 1
fi
if [[ -n "$TARGET_URL" && "$TARGET_URL" != *"${QA_REF}"* ]]; then
  echo "Refusing seed: target URL is not the isolated opsly-QA project." >&2
  exit 1
fi

echo "[peskids-seed] synthetic identities only:"
echo "  qa-lead@example.com / TEST Parent"
echo "  TEST Student / TEST Teacher"
echo "  staging admin, teacher, support, franchise admin, auditor"
echo "[peskids-seed] no production PII, no real child names"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[peskids-seed] DRY-RUN: would insert synthetic rows into isolated staging only"
  exit 0
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "$TARGET_URL" ]]; then
  echo "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for execute (not printed)." >&2
  exit 3
fi

python3 - <<'PY'
import json, os, sys, urllib.error, urllib.request

url = os.environ["SUPABASE_URL"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def post(path: str, body: dict) -> None:
    req = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        data=json.dumps(body).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        if exc.code in {409, 23505} or "duplicate" in detail.lower():
            return
        print(f"seed insert failed for {path} (http {exc.code})", file=sys.stderr)
        raise SystemExit(1) from exc

def exists(path: str, query: str) -> bool:
    req = urllib.request.Request(
        f"{url}/rest/v1/{path}?{query}&select=id",
        headers={**headers, "Accept": "application/json"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read().decode())
    return bool(rows)

if not exists("leads", "email=eq.qa-lead@example.com"):
    post("leads", {
        "tenant_id": "peskids",
        "name": "TEST Parent",
        "email": "qa-lead@example.com",
        "grade_interested": "3",
        "referral_source": "qa-seed",
        "status": "new",
    })
if not exists("students", "name=eq.TEST%20Student"):
    post("students", {
        "tenant_id": "peskids",
        "name": "TEST Student",
        "grade": "3",
        "status": "active",
        "parent_email": "qa-lead@example.com",
    })
print("[peskids-seed] synthetic tenant/lead/student upserted")
PY
