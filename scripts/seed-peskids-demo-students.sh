#!/usr/bin/env bash
set -euo pipefail

# Seed demo dashboard data for Peskids (students, leads, follow-ups, settings). Idempotent.
# BLOCKED on production unless PESKIDS_ALLOW_DEMO_SEED=1.
# Usage:
#   PESKIDS_ALLOW_DEMO_SEED=1 doppler run --config stg -- ./scripts/seed-peskids-demo-students.sh [--dry-run]
# Optional env:
#   PESKIDS_ACADEMY_NAME (default: Peskids)
#   PESKIDS_SEDE_LABEL (default: Llanogrande · Medellín)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/peskids-demo-seed-guard.sh
source "${ROOT}/scripts/lib/peskids-demo-seed-guard.sh"
peskids_require_demo_seed_allow "./scripts/seed-peskids-demo-students.sh" || exit 1

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

PLATFORM_HEADERS=(
  "${REST_HEADERS[@]}"
  -H "Accept-Profile: platform"
  -H "Content-Profile: platform"
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

seed_demo_students() {
  local rows marked_count
  rows="$(existing_students || echo '[]')"
  if ! echo "$rows" | jq -e 'type == "array"' >/dev/null 2>&1; then
    echo "Unexpected students response:" >&2
    echo "$rows" >&2
    return 1
  fi

  marked_count="$(echo "$rows" | jq --arg m "$SEED_MARKER" '[.[] | select((.notes // "") | contains($m))] | length')"
  if [[ "$marked_count" -ge 3 ]]; then
    echo "Demo students already present (${marked_count} with ${SEED_MARKER}):"
    echo "$rows" | jq -r --arg m "$SEED_MARKER" '.[] | select((.notes // "") | contains($m)) | "- \(.name) · \(.grade) · \(.parent_email // "sin email")"'
    return 0
  fi

  insert_student_if_missing \
    "Mateo Restrepo" "Delfines" "familia.restrepo.demo@peskids.co" "+573001112233" \
    "Matrícula demo reunión. ${SEED_MARKER}"

  insert_student_if_missing \
    "Sofía García" "Tiburones" "familia.garcia.demo@peskids.co" "+573002223344" \
    "Matrícula demo reunión. ${SEED_MARKER}"

  insert_student_if_missing \
    "Valentina López" "Ballenas" "familia.lopez.demo@peskids.co" "+573003334455" \
    "Matrícula demo reunión. ${SEED_MARKER}"
}

insert_platform_lead_if_missing() {
  local name email phone grade status modality neighborhood notes
  name="$1"
  email="$2"
  phone="$3"
  grade="$4"
  status="$5"
  modality="$6"
  neighborhood="$7"
  notes="$8"

  local existing
  existing="$(curl -sS "${PLATFORM_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/peskids_leads?tenant_slug=eq.${TENANT_ID}&email=eq.$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$email'''))")&select=id,full_name&limit=1")"

  if echo "$existing" | jq -e '.[0].id' >/dev/null 2>&1; then
    echo "Lead already exists: $(echo "$existing" | jq -r '.[0].full_name') (${email})" >&2
    echo "$existing" | jq -r '.[0].id'
    return 0
  fi

  local payload
  payload="$(jq -n \
    --arg tenant "$TENANT_ID" \
    --arg name "$name" \
    --arg email "$email" \
    --arg phone "$phone" \
    --arg grade "$grade" \
    --arg status "$status" \
    --arg modality "$modality" \
    --arg neighborhood "$neighborhood" \
    --arg notes "$notes" \
    --arg source "instagram" \
    '{
      tenant_slug: $tenant,
      full_name: $name,
      email: $email,
      phone: $phone,
      grade_interested: $grade,
      status: $status,
      class_modality: $modality,
      neighborhood: $neighborhood,
      referral_source: $source,
      admin_notes: $notes
    }')"

  if $DRY_RUN; then
    echo "[dry-run] Would insert lead ${name}:" >&2
    echo "$payload" | jq . >&2
    echo "00000000-0000-0000-0000-000000000001"
    return 0
  fi

  local body code
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' \
    -X POST "${SUPABASE_URL}/rest/v1/peskids_leads" \
    "${PLATFORM_HEADERS[@]}" \
    -d "$payload")"

  if [[ "$code" -ge 400 ]]; then
    echo "Lead insert failed for ${name} (HTTP ${code}):" >&2
    cat "$body" >&2 || true
    rm -f "$body"
    return 1
  fi

  echo "Lead created: $(jq -r '.[0].full_name + " · " + .[0].status' "$body")" >&2
  jq -r '.[0].id' "$body"
  rm -f "$body"
}

insert_followup_if_missing() {
  local contact_id="$1"
  local notes="$2"
  local due_date
  due_date="$(date -u +%Y-%m-%d 2>/dev/null || python3 -c 'from datetime import date; print(date.today().isoformat())')"

  local existing
  existing="$(curl -sS "${REST_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/followups?tenant_id=eq.${TENANT_ID}&contact_id=eq.${contact_id}&select=id&limit=1")"

  if echo "$existing" | jq -e '.[0].id' >/dev/null 2>&1; then
    echo "Follow-up already exists for contact ${contact_id}"
    return 0
  fi

  local payload
  payload="$(jq -n \
    --arg tenant "$TENANT_ID" \
    --arg contact "$contact_id" \
    --arg due "$due_date" \
    --arg notes "$notes" \
    '{
      tenant_id: $tenant,
      contact_id: $contact,
      contact_type: "lead",
      type: "call",
      due_date: $due,
      status: "pending",
      notes: $notes
    }')"

  if $DRY_RUN; then
    echo "[dry-run] Would insert follow-up for ${contact_id}:"
    echo "$payload" | jq .
    return 0
  fi

  local body code
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' \
    -X POST "${SUPABASE_URL}/rest/v1/followups" \
    "${REST_HEADERS[@]}" \
    -d "$payload")"

  if [[ "$code" -ge 400 ]]; then
    echo "Follow-up insert failed (HTTP ${code}):" >&2
    cat "$body" >&2 || true
    rm -f "$body"
    return 1
  fi

  echo "Follow-up created for lead ${contact_id}"
  rm -f "$body"
}

insert_platform_feedback_if_missing() {
  local child_name="$1"
  local satisfaction="$2"
  local suggestion="$3"

  local existing
  existing="$(curl -sS "${PLATFORM_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/peskids_feedback?tenant_slug=eq.${TENANT_ID}&child_name=eq.$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$child_name'''))")&select=id&limit=1")"

  if echo "$existing" | jq -e '.[0].id' >/dev/null 2>&1; then
    echo "Feedback already exists for ${child_name}"
    return 0
  fi

  local payload
  payload="$(jq -n \
    --arg tenant "$TENANT_ID" \
    --arg child "$child_name" \
    --argjson rating "$satisfaction" \
    --arg suggestion "$suggestion" \
    '{
      tenant_slug: $tenant,
      child_name: $child,
      satisfaction: $rating,
      suggestion: $suggestion,
      status: "new"
    }')"

  if $DRY_RUN; then
    echo "[dry-run] Would insert feedback for ${child_name}:"
    echo "$payload" | jq .
    return 0
  fi

  local body code
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' \
    -X POST "${SUPABASE_URL}/rest/v1/peskids_feedback" \
    "${PLATFORM_HEADERS[@]}" \
    -d "$payload")"

  if [[ "$code" -ge 400 ]]; then
    echo "Feedback insert failed (HTTP ${code}):" >&2
    cat "$body" >&2 || true
    rm -f "$body"
    return 0
  fi

  echo "Feedback created: ${child_name} (${satisfaction}/5)"
  rm -f "$body"
}

seed_demo_leads_and_followups() {
  echo "--- Leads (platform.peskids_leads) ---"
  local lead1 lead2 lead3
  lead1="$(insert_platform_lead_if_missing \
    "Camila Mejía" "camila.mejia.demo@peskids.co" "+573014445566" "Delfines" "new" \
    "llanogrande" "El Tesoro" "Interesada en sábados. ${SEED_MARKER}" | tail -n 1)"
  lead2="$(insert_platform_lead_if_missing \
    "Andrés Montoya" "andres.montoya.demo@peskids.co" "+573015556677" "Tiburones" "contacted" \
    "domicilio" "Envigado" "Quiere clase en casa. ${SEED_MARKER}" | tail -n 1)"
  lead3="$(insert_platform_lead_if_missing \
    "Laura Henao" "laura.henao.demo@peskids.co" "+573016667788" "Ballenas" "qualified" \
    "llanogrande" "Llanogrande" "Clase de prueba agendada. ${SEED_MARKER}" | tail -n 1)"

  echo "--- Follow-ups ---"
  for lid in "$lead1" "$lead2" "$lead3"; do
    [[ -n "$lid" && "$lid" != "00000000-0000-0000-0000-000000000001" ]] || continue
    insert_followup_if_missing "$lid" "Seguimiento demo reunión. ${SEED_MARKER}"
  done

  echo "--- Feedback ---"
  insert_platform_feedback_if_missing "Mateo Restrepo" 5 "Excelente progreso en flotación. ${SEED_MARKER}"
  insert_platform_feedback_if_missing "Sofía García" 4 "Muy contenta con el profesor. ${SEED_MARKER}"
}

echo "=== Peskids demo seed (tenant=${TENANT_ID}) ==="

upsert_tenant_settings

echo "--- Students ---"
seed_demo_students

seed_demo_leads_and_followups

echo "=== Done ==="
existing_students | jq -r '.[] | "- \(.name) · \(.grade) (\(.parent_email // "sin email"))"'
