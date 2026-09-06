#!/usr/bin/env bash
# Idempotent QA Auth users + storage buckets on opsly-QA only.
# Never prints passwords or keys.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/peskids-data-safety-guard.sh
source "${ROOT}/scripts/lib/peskids-data-safety-guard.sh"

peskids_refuse_production_data_mutation "staging auth seed" || exit 1

PROD_REF="${PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF:-jkwykpldnitavhmtuzmo}"
QA_REF="${PESKIDS_STAGING_SUPABASE_PROJECT_REF:-hljetbbgiphpjbldebpo}"
TARGET_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SITE_URL="${NEXT_PUBLIC_PESKIDS_SITE_URL:-https://peskids-staging.op-sly.com}"

if [[ "$TARGET_URL" == *"${PROD_REF}"* ]]; then
  echo "Refusing seed: target URL uses the production Supabase project." >&2
  exit 1
fi
if [[ -z "$TARGET_URL" || "$TARGET_URL" != *"${QA_REF}"* ]]; then
  echo "Refusing seed: target URL is not the isolated opsly-QA project." >&2
  exit 1
fi
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is required (not printed)." >&2
  exit 3
fi
if [[ -z "${PESKIDS_STAGING_SEED_PASSWORD:-}" ]]; then
  echo "PESKIDS_STAGING_SEED_PASSWORD is required in Doppler stg_peskids (not printed)." >&2
  exit 3
fi

python3 - <<'PY'
import json, os, sys, urllib.error, urllib.request

url = os.environ["SUPABASE_URL"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
password = os.environ["PESKIDS_STAGING_SEED_PASSWORD"]
site_url = os.environ.get("NEXT_PUBLIC_PESKIDS_SITE_URL", "https://peskids-staging.op-sly.com")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
}

USERS = (
    ("qa-admin@example.com", "admin", "QA Admin"),
    ("qa-teacher@example.com", "teacher", "QA Teacher"),
    ("qa-support@example.com", "support", "QA Support"),
    ("qa-franchise-admin@example.com", "admin", "QA Franchise Admin"),
    ("qa-auditor@example.com", "support", "QA Auditor"),
)
BUCKETS = ("peskids-staging", "peskids-qa")

def request(method: str, path: str, body: dict | None = None, extra: dict | None = None) -> tuple[int, str]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{url}{path}",
        data=data,
        headers={**headers, **(extra or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")

def list_users() -> list[dict]:
    code, raw = request("GET", "/auth/v1/admin/users?page=1&per_page=200")
    if code >= 400:
        print(f"auth list failed http {code}", file=sys.stderr)
        raise SystemExit(1)
    payload = json.loads(raw or "{}")
    users = payload.get("users") if isinstance(payload, dict) else payload
    return users if isinstance(users, list) else []

existing = {str(user.get("email") or "").lower(): user for user in list_users()}
created = 0
updated = 0
for email, role, name in USERS:
    meta = {
        "role": role,
        "tenant_slug": "peskids",
        "full_name": name,
        "environment": "staging",
    }
    body = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": meta,
        "app_metadata": {"role": role, "tenant_slug": "peskids", "environment": "staging"},
    }
    current = existing.get(email)
    if current and current.get("id"):
        code, _ = request("PUT", f"/auth/v1/admin/users/{current['id']}", body)
        if code >= 400:
            print(f"auth update failed for {email} http {code}", file=sys.stderr)
            raise SystemExit(1)
        updated += 1
        continue
    code, raw = request("POST", "/auth/v1/admin/users", body)
    if code in {200, 201}:
        created += 1
        continue
    if code == 422 and "already" in raw.lower():
        updated += 1
        continue
    print(f"auth create failed for {email} http {code}", file=sys.stderr)
    raise SystemExit(1)

print(f"[peskids-staging-auth] users created={created} updated={updated} site={site_url}")

for bucket in BUCKETS:
    code, raw = request("POST", "/storage/v1/bucket", {"id": bucket, "name": bucket, "public": False})
    if code in {200, 201}:
        print(f"[peskids-staging-auth] bucket created={bucket}")
    elif code in {409} or "already" in raw.lower() or "duplicate" in raw.lower():
        print(f"[peskids-staging-auth] bucket exists={bucket}")
    else:
        print(f"[peskids-staging-auth] bucket {bucket} http {code}", file=sys.stderr)
PY
