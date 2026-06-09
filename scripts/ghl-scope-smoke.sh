#!/usr/bin/env bash
# Probe GHL API scopes for provisioning (tags, custom fields, calendars). No secrets printed.
set -euo pipefail

PROJECT="${PROJECT:-ops-intcloudsysops}"
CONFIG="${CONFIG:-prd}"
TENANT="${1:-agency}"

if [[ "$TENANT" == "--tenant" ]]; then
  TENANT="${2:-agency}"
fi

usage() {
  cat <<EOF
Usage: $(basename "$0") [--tenant peskids|intcloudsysops|agency]

Exits 0 when tags + customFields endpoints return HTTP 200.
Exits 1 with remediation hints when scope/token mismatch.
EOF
}

if [[ "$TENANT" == "-h" || "$TENANT" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$TENANT" == "peskids" ]]; then
  KEY_VAR=GOHIGHLEVEL_PESKIDS_API_KEY
  URL_VAR=GOHIGHLEVEL_PESKIDS_API_URL
  LOC_VAR=GOHIGHLEVEL_PESKIDS_LOCATION_ID
  VERSION_VAR=GOHIGHLEVEL_PESKIDS_API_VERSION
  LABEL="Peskids"
elif [[ "$TENANT" == "agency" || "$TENANT" == "intcloudsysops" ]]; then
  KEY_VAR=GOHIGHLEVEL_API_KEY
  URL_VAR=GOHIGHLEVEL_API_URL
  LOC_VAR=GOHIGHLEVEL_LOCATION_ID
  VERSION_VAR=GOHIGHLEVEL_API_VERSION
  LABEL="Intcloudsysops (agency)"
else
  echo "ghl-scope-smoke: unknown tenant: $TENANT" >&2
  usage >&2
  exit 1
fi

command -v doppler >/dev/null 2>&1 || {
  echo "ghl-scope-smoke: doppler CLI required" >&2
  exit 1
}

doppler run --project "$PROJECT" --config "$CONFIG" -- bash -c "
  set -euo pipefail
  base=\"\${${URL_VAR}:-https://services.leadconnectorhq.com}\"
  version=\"\${${VERSION_VAR}:-2021-07-28}\"
  key=\"\${${KEY_VAR}}\"
  loc=\"\${${LOC_VAR}}\"
  label=\"${LABEL}\"

  if [[ -z \"\$key\" || -z \"\$loc\" ]]; then
    echo \"ghl-scope-smoke: missing key or location for \$label\" >&2
    exit 1
  fi

  echo \"ghl-scope-smoke: tenant=${TENANT} (\$label) location=\$loc key_len=\${#key}\"

  failed=0
  for path in \"locations/\${loc}/tags\" \"locations/\${loc}/customFields\"; do
    code=\$(curl -sS -o /tmp/ghl-scope-body.json -w '%{http_code}' \\
      -H \"Authorization: Bearer \${key}\" \\
      -H 'Accept: application/json' \\
      -H \"Version: \${version}\" \\
      \"\${base%/}/\${path}\")
    echo \"ghl-scope-smoke: GET /\${path} HTTP \${code}\"
    if [[ \"\$code\" != \"200\" ]]; then
      failed=1
      head -c 240 /tmp/ghl-scope-body.json 2>/dev/null || true
      echo
    fi
  done

  if [[ \"\$failed\" -ne 0 ]]; then
    echo \"\" >&2
    echo \"ghl-scope-smoke: FAIL — token in Doppler lacks provisioning scopes or is stale.\" >&2
    echo \"  1. GHL → Settings → Private Integrations → open integration for this location\" >&2
    echo \"  2. Confirm tags + custom fields scopes enabled\" >&2
    echo \"  3. Regenerate Access Token → update Doppler ${KEY_VAR} (config ${CONFIG})\" >&2
    echo \"  4. Re-run: ./scripts/ghl-scope-smoke.sh --tenant ${TENANT}\" >&2
    echo \"  5. Then: ./scripts/ghl-provision-intcloudsysops.sh --execute\" >&2
    exit 1
  fi

  echo \"ghl-scope-smoke: OK — provisioning scopes ready for \$label\"
"
