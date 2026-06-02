#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-ops-intcloudsysops}"
CONFIG="${CONFIG:-prd}"
TENANT="${1:-agency}"

if [[ "$TENANT" == "--tenant" ]]; then
  TENANT="${2:-agency}"
fi

fail() {
  echo "validate-ghl-config: $1" >&2
  exit 1
}

command -v doppler >/dev/null 2>&1 || fail "doppler CLI not found"

if [[ "$TENANT" == "peskids" ]]; then
  KEY_VAR=GOHIGHLEVEL_PESKIDS_API_KEY
  URL_VAR=GOHIGHLEVEL_PESKIDS_API_URL
  LOC_VAR=GOHIGHLEVEL_PESKIDS_LOCATION_ID
  VERSION_VAR=GOHIGHLEVEL_PESKIDS_API_VERSION
  LABEL="Peskids"
else
  KEY_VAR=GOHIGHLEVEL_API_KEY
  URL_VAR=GOHIGHLEVEL_API_URL
  LOC_VAR=GOHIGHLEVEL_LOCATION_ID
  VERSION_VAR=GOHIGHLEVEL_API_VERSION
  LABEL="agency (Intcloudsysops)"
fi

for name in "$KEY_VAR" "$URL_VAR" "$LOC_VAR"; do
  doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1 \
    || fail "missing Doppler secret: $name (project=$PROJECT config=$CONFIG)"
done

echo "validate-ghl-config: Doppler secrets OK ($PROJECT/$CONFIG) tenant=$TENANT ($LABEL)"

export VALIDATE_GHL_TENANT="$TENANT"
doppler run --project "$PROJECT" --config "$CONFIG" -- bash -c "
  set -euo pipefail
  tenant=\"\${VALIDATE_GHL_TENANT:-agency}\"
  base=\"\${${URL_VAR}:-https://services.leadconnectorhq.com}\"
  version=\"\${${VERSION_VAR}:-2021-07-28}\"
  key=\"\${${KEY_VAR}}\"
  loc=\"\${${LOC_VAR}:-}\"

  if [[ -n \"\$loc\" ]]; then
    loc_code=\$(curl -sS -o /dev/null -w '%{http_code}' \\
      -H \"Authorization: Bearer \${key}\" \\
      -H 'Accept: application/json' \\
      -H \"Version: \${version}\" \\
      \"\${base%/}/locations/\${loc}\")
    echo \"validate-ghl-config: GET /locations/\${loc} HTTP \${loc_code}\"
    if [[ \"\$loc_code\" != \"200\" ]]; then
      exit 1
    fi
  fi

  if [[ -n \"\$loc\" ]]; then
    contacts_code=\$(curl -sS -o /dev/null -w '%{http_code}' \\
      -H \"Authorization: Bearer \${key}\" \\
      -H 'Accept: application/json' \\
      -H \"Version: \${version}\" \\
      \"\${base%/}/contacts/?locationId=\${loc}&limit=1\")
    echo \"validate-ghl-config: contacts HTTP \${contacts_code}\"
    if [[ \"\$contacts_code\" == \"401\" || \"\$contacts_code\" == \"403\" ]]; then
      echo 'validate-ghl-config: WARN contacts denied — enable contacts.readonly on Private Integration in GHL' >&2
      if [[ \"\$tenant\" == \"peskids\" ]]; then
        exit 1
      fi
    elif [[ \"\$contacts_code\" != \"200\" ]]; then
      exit 1
    fi
  fi
"

echo "validate-ghl-config: done ($LABEL)"
