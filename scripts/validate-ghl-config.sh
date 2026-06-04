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
    location_response=\$(curl -sS \\
      -H \"Authorization: Bearer \${key}\" \\
      -H 'Accept: application/json' \\
      -H \"Version: \${version}\" \\
      -w '\\n%{http_code}' \\
      \"\${base%/}/locations/\${loc}\")
    loc_code=\$(printf '%s' \"\$location_response\" | tail -n1)
    loc_body=\$(printf '%s' \"\$location_response\" | sed '\$d')
    echo \"validate-ghl-config: GET /locations/\${loc} HTTP \${loc_code}\"
    if [[ \"\$loc_code\" != \"200\" ]]; then
      exit 1
    fi
  fi

  if [[ -n \"\$loc\" ]]; then
    contacts_code=\$(curl -sS -o /dev/null -w '%{http_code}' \\
      -X POST \\
      -H \"Authorization: Bearer \${key}\" \\
      -H 'Accept: application/json' \\
      -H 'Content-Type: application/json' \\
      -H \"Version: \${version}\" \\
      -d '{}' \\
      \"\${base%/}/contacts/search\")
    echo \"validate-ghl-config: contacts HTTP \${contacts_code}\"
    if [[ \"\$contacts_code\" == \"401\" || \"\$contacts_code\" == \"403\" ]]; then
      company_id=\$(printf '%s' \"\$loc_body\" | node -e '
        const fs = require(\"fs\");
        const input = fs.readFileSync(0, \"utf8\").trim();
        if (!input) process.exit(0);
        const json = JSON.parse(input);
        const companyId = json?.location?.companyId || json?.companyId || json?.data?.companyId || \"\";
        process.stdout.write(companyId);
      ')
      if [[ -z \"\$company_id\" ]]; then
        echo 'validate-ghl-config: WARN contacts denied — unable to derive companyId for location token exchange' >&2
        if [[ \"\$tenant\" == \"peskids\" ]]; then
          exit 1
        fi
      fi

      location_token_response=\$(curl -sS \\
        -H \"Authorization: Bearer \${key}\" \\
        -H 'Accept: application/json' \\
        -H 'Content-Type: application/x-www-form-urlencoded' \\
        -H \"Version: \${version}\" \\
        -w '\\n%{http_code}' \\
        --data-urlencode \"companyId=\${company_id}\" \\
        --data-urlencode \"locationId=\${loc}\" \\
        \"\${base%/}/oauth/locationToken\")
      location_token_code=\$(printf '%s' \"\$location_token_response\" | tail -n1)
      location_token_body=\$(printf '%s' \"\$location_token_response\" | sed '\$d')
      if [[ \"\$location_token_code\" != \"200\" ]]; then
        echo \"validate-ghl-config: WARN failed to derive location access token (HTTP \${location_token_code})\" >&2
        if [[ \"\$tenant\" == \"peskids\" ]]; then
          exit 1
        fi
      fi

      location_token=\$(printf '%s' \"\$location_token_body\" | node -e '
        const fs = require(\"fs\");
        const input = fs.readFileSync(0, \"utf8\").trim();
        if (!input) process.exit(0);
        const json = JSON.parse(input);
        process.stdout.write(json.access_token || json.accessToken || \"\");
      ')
      if [[ -n \"\$location_token\" ]]; then
        contacts_code=\$(curl -sS -o /dev/null -w '%{http_code}' \\
          -X POST \\
          -H \"Authorization: Bearer \${location_token}\" \\
          -H 'Accept: application/json' \\
          -H 'Content-Type: application/json' \\
          -H \"Version: \${version}\" \\
          -d '{}' \\
          \"\${base%/}/contacts/search\")
        echo \"validate-ghl-config: contacts retry HTTP \${contacts_code}\"
      fi

      if [[ \"\$contacts_code\" == \"401\" || \"\$contacts_code\" == \"403\" ]]; then
        echo 'validate-ghl-config: WARN contacts denied — enable contacts.readonly on the location token or confirm the app is installed for this sub-account' >&2
        if [[ \"\$tenant\" == \"peskids\" ]]; then
          exit 1
        fi
      fi
    elif [[ \"\$contacts_code\" != \"200\" ]]; then
      exit 1
    fi
  fi
"

echo "validate-ghl-config: done ($LABEL)"
