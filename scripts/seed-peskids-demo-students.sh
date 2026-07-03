#!/usr/bin/env bash
set -euo pipefail

# Seed demo families/students + tenant settings for Peskids admin dashboard (idempotent).
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/seed-peskids-demo-students.sh [--dry-run]
# Optional env:
#   PESKIDS_ACADEMY_NAME (default: Peskids)
#   PESKIDS_SEDE_LABEL (default: Llanogrande · Medellín)

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

TENANT_ID="${NEXT_PUBLIC_TENANT_ID:-peskids}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
ACADEMY_NAME="${PESKIDS_ACADEMY_NAME:-Peskids}"
SEDE_LABEL="${PESKIDS_SEDE_LABEL:-Llanogrande · Medellín}"
SUPPORT_EMAIL="${PESKIDS_SUPPORT_EMAIL:-sierrasantiago90@gmail.com}"
SUPPORT_PHONE="${PESKIDS_SUPPORT_PHONE:-+573006667788}"
SEED_MARKER="demo-seed:v1"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

REST_HEADERS=(
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Content-Type: application/json"
  -H "Prefer: return=representation"
)

existing_students() {
  curl -sS "${REST_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/students?tenant_id=eq.${TENANT_ID}&status=eq.active&select=id,name,grade,parent_email,notes&order=name.asc"
}

upsert_tenant_settings() {
  local payload
  payload="$(jq -n \
    --arg tenant "$TENANT_ID" \
    --arg academy "$ACADEMY_NAME" \
    --arg sede "$SEDE_LABEL" \
    --arg email "$SUPPORT_EMAIL" \
    --arg phone "$SUPPORT_PHONE" \
    '{
      tenant_id: $tenant,
      academy_name: $academy,
      sede_label: $sede,
      support_email: $email,
      support_phone: $phone,
      updated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }')"

  if $DRY_RUN; then
    echo "[dry-run] Would upsert tenant_settings:"
    echo "$payload" | jq .
    return 0
  fi

  local code body
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' \
    -X POST "${SUPABASE_URL}/rest/v1/tenant_settings" \
    "${REST_HEADERS[@]}" \
    -H "Prefer: resolution=merge-duplicates,return=representation" \
    -d "$payload")"

  if [[ "$code" -ge 400 ]]; then
    if grep -q 'tenant_settings' "$body" 2>/dev/null; then
      echo "WARN: tenant_settings not in Supabase yet — apply migration 20260624_add_tenant_settings.sql and set sede in /admin/settings manually." >&2
      return 0
    fi
    echo "tenant_settings upsert failed (HTTP ${code}):" >&2
    cat "$body" >&2 || true
    exit 1
  fi

  echo "tenant_settings updated:"
  jq -r '.[0] | "- academy: \(.academy_name) · sede: \(.sede_label)"' "$body"
  rm -f "$body"
}

insert_student_if_missing() {
  local name grade email phone notes
  name="$1"
  grade="$2"
  email="$3"
  phone="$4"
  notes="$5"

  local existing
  existing="$(curl -sS "${REST_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/students?tenant_id=eq.${TENANT_ID}&parent_email=eq.$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$email'''))")&select=id,name&limit=1")"

  if echo "$existing" | jq -e '.[0].id' >/dev/null 2>&1; then
    echo "Student already exists for ${email}: $(echo "$existing" | jq -r '.[0].name')"
    return 0
  fi

  local payload
  payload="$(jq -n \
    --arg tenant "$TENANT_ID" \
    --arg name "$name" \
    --arg grade "$grade" \
    --arg email "$email" \
    --arg phone "$phone" \
    --arg notes "$notes" \
    '{
      tenant_id: $tenant,
      name: $name,
      grade: $grade,
      status: "active",
      parent_email: $email,
      parent_phone: $phone,
      notes: $notes
    }')"

  if $DRY_RUN; then
    echo "[dry-run] Would insert student ${name}:"
    echo "$payload" | jq .
    return 0
  fi

  local code
  code="$(curl -sS -o /tmp/peskids-seed-student.json -w '%{http_code}' \
    -X POST "${SUPABASE_URL}/rest/v1/students" \
    "${REST_HEADERS[@]}" \
    -d "$payload")"

  if [[ "$code" -ge 400 ]]; then
    echo "Student insert failed for ${name} (HTTP ${code}):" >&2
    cat /tmp/peskids-seed-student.json >&2 || true
    exit 1
  fi

  echo "Student created: $(jq -r '.[0].name + " · " + .[0].grade' /tmp/peskids-seed-student.json)"
}

echo "=== Peskids demo seed (tenant=${TENANT_ID}) ==="

upsert_tenant_settings

ROWS="$(existing_students || echo '[]')"
if ! echo "$ROWS" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "Unexpected students response:" >&2
  echo "$ROWS" >&2
  exit 1
fi

MARKED_COUNT="$(echo "$ROWS" | jq --arg m "$SEED_MARKER" '[.[] | select((.notes // "") | contains($m))] | length')"
if [[ "$MARKED_COUNT" -ge 3 ]]; then
  echo "Demo students already present (${MARKED_COUNT} with ${SEED_MARKER}):"
  echo "$ROWS" | jq -r --arg m "$SEED_MARKER" '.[] | select((.notes // "") | contains($m)) | "- \(.name) · \(.grade) · \(.parent_email // "sin email")"'
  exit 0
fi

insert_student_if_missing \
  "Mateo Restrepo" \
  "Delfines" \
  "familia.restrepo.demo@peskids.co" \
  "+573001112233" \
  "Matrícula demo reunión. ${SEED_MARKER}"

insert_student_if_missing \
  "Sofía García" \
  "Tiburones" \
  "familia.garcia.demo@peskids.co" \
  "+573002223344" \
  "Matrícula demo reunión. ${SEED_MARKER}"

insert_student_if_missing \
  "Valentina López" \
  "Ballenas" \
  "familia.lopez.demo@peskids.co" \
  "+573003334455" \
  "Matrícula demo reunión. ${SEED_MARKER}"

echo "=== Done ==="
existing_students | jq -r '.[] | "- \(.name) · \(.grade) (\(.parent_email // "sin email"))"'
