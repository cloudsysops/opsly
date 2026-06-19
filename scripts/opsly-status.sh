#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${ROOT_DIR}/scripts/lib/common.sh"

PESKIDS_CONFIG="${ROOT_DIR}/config/tenants/peskids.json"
API_HEALTH_URL="${OPSLY_API_HEALTH_URL:-https://api.op-sly.com/api/health}"
PESKIDS_HEALTH_URL="${PESKIDS_HEALTH_URL:-https://peskids.op-sly.com/api/health}"
PESKIDS_GHL_HEALTH_URL="${PESKIDS_GHL_HEALTH_URL:-https://peskids.op-sly.com/api/health/ghl}"
LOCAL_LLM_HEALTH_URL="${LOCAL_LLM_HEALTH_URL:-http://127.0.0.1:3010/health}"
LOCAL_ORCHESTRATOR_HEALTH_URL="${LOCAL_ORCHESTRATOR_HEALTH_URL:-http://127.0.0.1:3011/health}"
LIVE=true

usage() {
  cat <<'EOF'
Usage: npm run opsly:status [-- --local-only]

Reads:
  - git branch / commit
  - latest deploy runs (GitHub Actions if gh is available)
  - health endpoints for API, Peskids, llm-gateway and orchestrator
  - GHL health summary for Peskids

Options:
  --local-only   Skip remote HTTP checks and GitHub Actions lookup
  -h, --help     Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local-only)
      LIVE=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

json_read() {
  local file="$1"
  local path="$2"
  python3 - "$file" "$path" <<'PY'
import json, sys
from pathlib import Path

file_path = Path(sys.argv[1])
path = sys.argv[2].split(".")
data = json.loads(file_path.read_text())
value = data
for key in path:
    if isinstance(value, dict):
        value = value.get(key)
    else:
        value = None
    if value is None:
        break
print("" if value is None else value)
PY
}

probe_http() {
  local label="$1"
  local url="$2"
  local field="${3:-}"
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(curl -ksS --max-time 8 -o "$tmp" -w '%{http_code}' "$url" || echo "000")"
  if [[ "$code" != "200" ]]; then
    printf "%-26s FAIL HTTP %s\n" "$label" "$code"
    rm -f "$tmp"
    return 1
  fi

  if [[ -n "$field" ]]; then
    value="$(python3 - "$tmp" "$field" <<'PY'
import json, sys
from pathlib import Path

body = Path(sys.argv[1]).read_text()
obj = json.loads(body)
field = sys.argv[2]
value = obj
for key in field.split("."):
    if isinstance(value, dict):
        value = value.get(key)
    else:
        value = None
    if value is None:
        break
print("" if value is None else value)
PY
)"
    printf "%-26s OK   %s: %s\n" "$label" "$field" "$value"
  else
    printf "%-26s OK   HTTP 200\n" "$label"
  fi

  rm -f "$tmp"
}

print_repo_status() {
  local branch head dirty upstream
  branch="$(git -C "$ROOT_DIR" branch --show-current 2>/dev/null || echo detached)"
  head="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo n/a)"
  dirty="$(git -C "$ROOT_DIR" status --short 2>/dev/null | wc -l | tr -d ' ')"
  upstream="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo n/a)"

  echo "=== Opsly status ==="
  echo "Repo:        ${branch} @ ${head}"
  echo "Upstream:    ${upstream}"
  echo "Dirty files: ${dirty}"
}

print_latest_deploy() {
  if [[ "$LIVE" != "true" ]]; then
    echo "Latest deploy: skipped (--local-only)"
    return 0
  fi

  if ! command -v gh >/dev/null 2>&1; then
    echo "Latest deploy: gh not installed"
    return 0
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "Latest deploy: gh not authenticated"
    return 0
  fi

  local deploy_json
  deploy_json="$(gh run list --workflow deploy-peskids.yml --branch main --limit 1 --json databaseId,displayTitle,status,conclusion,createdAt,headSha,url 2>/dev/null || true)"
  if [[ -z "$deploy_json" || "$deploy_json" == "[]" ]]; then
    deploy_json="$(gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId,displayTitle,status,conclusion,createdAt,headSha,url 2>/dev/null || true)"
  fi

  if [[ -z "$deploy_json" || "$deploy_json" == "[]" ]]; then
    echo "Latest deploy: no runs found"
    return 0
  fi

  python3 - "$deploy_json" <<'PY'
import json, sys

runs = json.loads(sys.argv[1])
run = runs[0] if runs else {}
title = run.get("displayTitle") or "n/a"
status = run.get("status") or "n/a"
conclusion = run.get("conclusion") or "n/a"
created_at = run.get("createdAt") or "n/a"
head_sha = (run.get("headSha") or "n/a")[:7]
url = run.get("url") or "n/a"
print(f"Latest deploy: {title} | {status}/{conclusion} | {created_at} | {head_sha}")
print(f"Run URL:      {url}")
PY
}

print_health() {
  if [[ "$LIVE" != "true" ]]; then
    echo "Health:       skipped (--local-only)"
    return 0
  fi

  echo "Health:"
  probe_http "API" "$API_HEALTH_URL" "status"
  probe_http "Peskids" "$PESKIDS_HEALTH_URL" "status"
  probe_http "Peskids GHL" "$PESKIDS_GHL_HEALTH_URL" "overall"
  probe_http "llm-gateway" "$LOCAL_LLM_HEALTH_URL" "status"
  probe_http "orchestrator" "$LOCAL_ORCHESTRATOR_HEALTH_URL" "status"
}

print_peskids_config() {
  if [[ -f "$PESKIDS_CONFIG" ]]; then
    local tenant_name tenant_slug ghl_location public_url
    tenant_name="$(json_read "$PESKIDS_CONFIG" "tenant_name")"
    tenant_slug="$(json_read "$PESKIDS_CONFIG" "tenant_slug")"
    ghl_location="$(json_read "$PESKIDS_CONFIG" "gohighlevel.location_name")"
    public_url="$(json_read "$PESKIDS_CONFIG" "public_url")"
    echo "Peskids:     ${tenant_name} (${tenant_slug})"
    echo "Public URL:  ${public_url}"
    echo "GHL location: ${ghl_location}"
  fi
}

print_demo_readiness() {
  if [[ "$LIVE" != "true" ]]; then
    echo "Demo ready:   unknown (--local-only)"
    return 0
  fi

  local checks=(
    "$API_HEALTH_URL"
    "$PESKIDS_HEALTH_URL"
    "$PESKIDS_GHL_HEALTH_URL"
  )
  local all_ok=1 url code
  for url in "${checks[@]}"; do
    code="$(curl -ksS --max-time 8 -o /dev/null -w '%{http_code}' "$url" || echo "000")"
    if [[ "$code" != "200" ]]; then
      all_ok=0
    fi
  done

  if [[ "$all_ok" == "1" && "$dirty" == "0" ]]; then
    echo "Demo ready:   yes"
  else
    echo "Demo ready:   no"
  fi
}

dirty="$(git -C "$ROOT_DIR" status --short 2>/dev/null | wc -l | tr -d ' ')"

print_repo_status
print_latest_deploy
print_peskids_config
print_health
print_demo_readiness
