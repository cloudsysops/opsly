#!/usr/bin/env bash
# Valida JSON en config/tenants/*.json: campos mínimos y coherencia subcliente (parent + client_slug).
# Idempotente; solo lectura. Uso: ./scripts/validate-subclient-config.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TENANTS_DIR="${ROOT}/config/tenants"

if [[ ! -d "$TENANTS_DIR" ]]; then
  echo "Missing directory: $TENANTS_DIR" >&2
  exit 1
fi

shopt -s nullglob
files=("${TENANTS_DIR}"/*.json)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No JSON files in $TENANTS_DIR" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

validated=0
for f in "${files[@]}"; do
  base="$(basename "$f")"
  [[ "${base}" =~ ^schema\. ]] && continue
  [[ "${base}" =~ ^_ ]] && continue
  if ! jq -e '.tenant_slug and (.tenant_slug | type == "string" and length > 0)' "$f" >/dev/null; then
    echo "Invalid or missing tenant_slug in $base" >&2
    exit 1
  fi
  if ! jq -e '.schema_name and (.schema_name | type == "string" and length > 0)' "$f" >/dev/null; then
    echo "Invalid or missing schema_name in $base" >&2
    exit 1
  fi
  if jq -e 'has("parent_tenant_slug") and .parent_tenant_slug != null and (.parent_tenant_slug | type == "string") and (.parent_tenant_slug | length > 0)' "$f" >/dev/null; then
    if ! jq -e '.client_slug and (.client_slug | type == "string" and length > 0)' "$f" >/dev/null; then
      echo "Subclient $base has parent_tenant_slug but missing client_slug" >&2
      exit 1
    fi
  fi
  validated=$((validated + 1))
done

echo "OK — validated ${validated} tenant config(s) in config/tenants/"
