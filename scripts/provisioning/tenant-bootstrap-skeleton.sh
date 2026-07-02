#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/provisioning/tenant-bootstrap-skeleton.sh --tenant <slug> [--stage <stage>] [--json]

Prints the provisioning skeleton for a tenant without making any changes.
This is read-only and idempotent by design.
EOF
}

tenant_slug=""
target_stage="mvp_validation"
json_output="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant)
      tenant_slug="${2:-}"
      shift 2
      ;;
    --stage)
      target_stage="${2:-}"
      shift 2
      ;;
    --json)
      json_output="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$tenant_slug" ]]; then
  echo "Missing required --tenant <slug>" >&2
  usage >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAUNCH="${ROOT}/clients/${tenant_slug}.launch.json"
VERTICAL="—"
CRM="—"
if [[ -f "$LAUNCH" ]] && command -v jq >/dev/null 2>&1; then
  VERTICAL="$(jq -r '.vertical_blueprint_id // "—"' "$LAUNCH")"
  CRM="$(jq -r '.crm_provider // "—"' "$LAUNCH")"
fi

if [[ "$json_output" == "true" ]]; then
  cat <<EOF
{
  "tenant_slug": "${tenant_slug}",
  "target_stage": "${target_stage}",
  "launch_contract": "clients/${tenant_slug}.launch.json",
  "vertical_blueprint_id": "${VERTICAL}",
  "crm_provider": "${CRM}",
  "extraction_ready": false,
  "steps": [
    {
      "id": "tenant-register",
      "label": "Tenant registration",
      "approval_required": false,
      "reversible": true,
      "owner": "opsly"
    },
    {
      "id": "template-deploy",
      "label": "Template deployment",
      "approval_required": true,
      "reversible": true,
      "owner": "opsly"
    },
    {
      "id": "workflow-bootstrap",
      "label": "Workflow bootstrap",
      "approval_required": true,
      "reversible": true,
      "owner": "tenant"
    },
    {
      "id": "extraction-prep",
      "label": "Extraction prep",
      "approval_required": true,
      "reversible": true,
      "owner": "operator"
    }
  ],
  "mode": "dry-run"
}
EOF
  exit 0
fi

cat <<EOF
Tenant provisioning skeleton
----------------------------
tenant: ${tenant_slug}
target stage: ${target_stage}
launch: clients/${tenant_slug}.launch.json (vertical=${VERTICAL}, crm=${CRM})
mode: dry-run

0. Review launch contract + vertical blueprint under config/vertical-blueprints/
1. Register tenant in canonical registry.
2. Prepare template deployment (no production tenant changes).
3. Bootstrap first workflow bundle and approval points.
4. Prepare extraction readiness without moving infrastructure.

No action is executed by this script.
EOF
