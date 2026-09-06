#!/usr/bin/env bash
set -euo pipefail

# Purge Peskids *demo seed* rows so production can take real students.
# Default mode is inventory-only (--dry-run). Never truncates tables.
#
# Matching rules (ALL must look like demo — never owner/real emails):
#   - notes / admin_notes / suggestion contain marker demo-seed:v1
#   - OR email / parent_email matches *.demo@peskids.co
#   - optional Auth users: *.demo@peskids.co | peskids.*.demo@intcloudsysops.com
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/purge-peskids-demo-data.sh --dry-run
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/purge-peskids-demo-data.sh --execute
# Optional:
#   --purge-auth   also delete matching Auth users (still requires --execute)
#   --purge-class  also delete class titled "Delfines · sábado 9:00" if present
#
# Safety:
#   --execute requires PESKIDS_PURGE_DEMO_CONFIRM=yes
#   Never deletes emails containing sierrasantiago90@ or @gmail.com owner without marker

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/peskids-demo-seed-guard.sh
source "${ROOT}/scripts/lib/peskids-demo-seed-guard.sh" 2>/dev/null || true

MODE="dry-run"
PURGE_AUTH=false
PURGE_CLASS=false
SEED_MARKER="demo-seed:v1"
TENANT_ID="${NEXT_PUBLIC_TENANT_ID:-peskids}"
OWNER_GUARD_EMAIL="${PESKIDS_OWNER_EMAIL:-sierrasantiago90@gmail.com}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) MODE="dry-run" ;;
    --execute) MODE="execute" ;;
    --purge-auth) PURGE_AUTH=true ;;
    --purge-class) PURGE_CLASS=true ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

# The confirmation gate is checked BEFORE the credential check on purpose: a
# refusal must never depend on the operator happening to have credentials
# loaded, and it must be assertable in CI without any secret present.
# See scripts/test-prod-guards.sh.
if [[ "$MODE" == "execute" && "${PESKIDS_PURGE_DEMO_CONFIRM:-}" != "yes" ]]; then
  cat >&2 <<EOF
REFUSED: --execute requires PESKIDS_PURGE_DEMO_CONFIRM=yes

1) Inventory first:
   ./scripts/purge-peskids-demo-data.sh --dry-run
2) Review the ID list with the owner.
3) Then:
   PESKIDS_PURGE_DEMO_CONFIRM=yes ./scripts/purge-peskids-demo-data.sh --execute
EOF
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

REST=(
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Content-Type: application/json"
  -H "Prefer: return=representation"
)
PLATFORM=(
  "${REST[@]}"
  -H "Accept-Profile: platform"
  -H "Content-Profile: platform"
)
PESKIDS=(
  "${REST[@]}"
  -H "Accept-Profile: peskids"
  -H "Content-Profile: peskids"
)

is_demo_email() {
  local email owner
  email="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  owner="$(printf '%s' "$OWNER_GUARD_EMAIL" | tr '[:upper:]' '[:lower:]')"
  [[ -z "$email" ]] && return 1
  [[ "$email" == "$owner" ]] && return 1
  case "$email" in
    *.demo@peskids.co) return 0 ;;
    peskids.admin.demo@intcloudsysops.com) return 0 ;;
    peskids.teacher.demo@intcloudsysops.com) return 0 ;;
    *) return 1 ;;
  esac
}

echo "=== Peskids demo purge (${MODE}) · tenant=${TENANT_ID} · marker=${SEED_MARKER} ==="

# --- Inventory students ---
STUDENTS_JSON="$(curl -sS "${REST[@]}" \
  "${SUPABASE_URL}/rest/v1/students?tenant_id=eq.${TENANT_ID}&select=id,name,parent_email,notes&order=name.asc" || echo '[]')"
STUDENT_IDS="$(echo "$STUDENTS_JSON" | jq -r --arg m "$SEED_MARKER" '
  [.[]
    | select(
        ((.notes // "") | contains($m))
        or ((.parent_email // "") | test("\\.demo@peskids\\.co$"; "i"))
      )
    | .id
  ] | unique | .[]
')"

echo ""
echo "## students (demo candidates)"
echo "$STUDENTS_JSON" | jq -r --arg m "$SEED_MARKER" '
  .[]
  | select(
      ((.notes // "") | contains($m))
      or ((.parent_email // "") | test("\\.demo@peskids\\.co$"; "i"))
    )
  | "- \(.id) · \(.name) · \(.parent_email // "sin email")"
' || echo "(none)"

# --- Inventory leads ---
LEADS_JSON="$(curl -sS "${PLATFORM[@]}" \
  "${SUPABASE_URL}/rest/v1/peskids_leads?tenant_slug=eq.${TENANT_ID}&select=id,full_name,email,admin_notes&order=full_name.asc" || echo '[]')"
LEAD_IDS="$(echo "$LEADS_JSON" | jq -r --arg m "$SEED_MARKER" '
  [.[]
    | select(
        ((.admin_notes // "") | contains($m))
        or ((.email // "") | test("\\.demo@peskids\\.co$"; "i"))
      )
    | .id
  ] | unique | .[]
')"

echo ""
echo "## peskids_leads (demo candidates)"
echo "$LEADS_JSON" | jq -r --arg m "$SEED_MARKER" '
  .[]
  | select(
      ((.admin_notes // "") | contains($m))
      or ((.email // "") | test("\\.demo@peskids\\.co$"; "i"))
    )
  | "- \(.id) · \(.full_name) · \(.email // "sin email")"
' || echo "(none)"

# --- Inventory followups (marker in notes OR contact_id is a demo lead) ---
DEMO_LEAD_ID_JSON="$(echo "$LEADS_JSON" | jq -c --arg m "$SEED_MARKER" \
  '[.[] | select(((.admin_notes // "") | contains($m)) or ((.email // "") | test("\\.demo@peskids\\.co$"; "i"))) | .id]')"
FOLLOWUPS_JSON="$(curl -sS "${REST[@]}" \
  "${SUPABASE_URL}/rest/v1/followups?tenant_id=eq.${TENANT_ID}&select=id,contact_id,notes,status&order=due_date.asc" || echo '[]')"
FOLLOWUP_IDS="$(echo "$FOLLOWUPS_JSON" | jq -r --arg m "$SEED_MARKER" --argjson leads "$DEMO_LEAD_ID_JSON" '
  [.[]
    | select(
        ((.notes // "") | contains($m))
        or ((.contact_id as $c | ($leads | index($c))) != null)
      )
    | .id
  ] | unique | .[]
')"

echo ""
echo "## followups (demo candidates)"
if [[ -n "$FOLLOWUP_IDS" ]]; then
  echo "$FOLLOWUP_IDS" | while read -r id; do
    echo "$FOLLOWUPS_JSON" | jq -r --arg id "$id" '.[] | select(.id == $id) | "- \(.id) · contact=\(.contact_id) · \(.status)"'
  done
else
  echo "(none)"
fi

# --- Inventory feedback ---
FEEDBACK_JSON="$(curl -sS "${PLATFORM[@]}" \
  "${SUPABASE_URL}/rest/v1/peskids_feedback?tenant_slug=eq.${TENANT_ID}&select=id,child_name,suggestion&order=created_at.desc&limit=200" || echo '[]')"
FEEDBACK_IDS="$(echo "$FEEDBACK_JSON" | jq -r --arg m "$SEED_MARKER" '
  [.[]
    | select((.suggestion // "") | contains($m))
    | .id
  ] | unique | .[]
')"

echo ""
echo "## peskids_feedback (demo candidates)"
echo "$FEEDBACK_JSON" | jq -r --arg m "$SEED_MARKER" '
  .[]
  | select((.suggestion // "") | contains($m))
  | "- \(.id) · \(.child_name)"
' || echo "(none)"

DEMO_CLASS_ID=""
if $PURGE_CLASS; then
  CLASS_JSON="$(curl -sS "${PESKIDS[@]}" \
    "${SUPABASE_URL}/rest/v1/classes?tenant_slug=eq.${TENANT_ID}&title=eq.Delfines%20%C2%B7%20s%C3%A1bado%209%3A00&select=id,title,status&limit=5" || echo '[]')"
  DEMO_CLASS_ID="$(echo "$CLASS_JSON" | jq -r '.[0].id // empty')"
  echo ""
  echo "## demo class"
  if [[ -n "$DEMO_CLASS_ID" ]]; then
    echo "- ${DEMO_CLASS_ID} · $(echo "$CLASS_JSON" | jq -r '.[0].title')"
  else
    echo "(none matched title Delfines · sábado 9:00)"
  fi
fi

if [[ "$MODE" == "dry-run" ]]; then
  echo ""
  echo "Dry-run complete. No rows deleted."
  echo "When ready (after owner review):"
  echo "  PESKIDS_PURGE_DEMO_CONFIRM=yes $0 --execute [--purge-auth] [--purge-class]"
  exit 0
fi

delete_by_ids() {
  local profile_flag="$1"
  local table="$2"
  local ids="$3"
  local count=0
  [[ -z "$ids" ]] && return 0
  local headers=("${REST[@]}")
  if [[ "$profile_flag" == "platform" ]]; then
    headers=("${PLATFORM[@]}")
  elif [[ "$profile_flag" == "peskids" ]]; then
    headers=("${PESKIDS[@]}")
  fi
  while read -r id; do
    [[ -z "$id" ]] && continue
    local code
    code="$(curl -sS -o /tmp/peskids-purge-row.json -w '%{http_code}' \
      -X DELETE "${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}" \
      "${headers[@]}")"
    if [[ "$code" -ge 400 ]]; then
      echo "FAIL delete ${table}/${id} HTTP ${code}" >&2
      cat /tmp/peskids-purge-row.json >&2 || true
      exit 1
    fi
    echo "deleted ${table}/${id}"
    count=$((count + 1))
  done <<< "$ids"
  echo "→ ${count} row(s) from ${table}"
}

echo ""
echo "=== EXECUTING deletes (demo IDs only) ==="
delete_by_ids public followups "$FOLLOWUP_IDS"
delete_by_ids platform peskids_feedback "$FEEDBACK_IDS"
delete_by_ids platform peskids_leads "$LEAD_IDS"
delete_by_ids public students "$STUDENT_IDS"

if $PURGE_CLASS && [[ -n "$DEMO_CLASS_ID" ]]; then
  delete_by_ids peskids classes "$DEMO_CLASS_ID"
fi

if $PURGE_AUTH; then
  echo ""
  echo "## auth users (demo emails)"
  USERS_JSON="$(curl -sS \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    "${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000")"
  echo "$USERS_JSON" | jq -r '.users[]? | [.id, (.email // "")] | @tsv' | while IFS=$'\t' read -r uid email; do
    if is_demo_email "$email"; then
      code="$(curl -sS -o /tmp/peskids-purge-auth.json -w '%{http_code}' \
        -X DELETE "${SUPABASE_URL}/auth/v1/admin/users/${uid}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")"
      if [[ "$code" -ge 400 ]]; then
        echo "FAIL auth delete ${email} HTTP ${code}" >&2
        cat /tmp/peskids-purge-auth.json >&2 || true
        exit 1
      fi
      echo "deleted auth user ${email} (${uid})"
    fi
  done
fi

echo ""
echo "Purge complete. Re-check admin dashboards — empty queues are OK for real onboarding."
