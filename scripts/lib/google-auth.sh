#!/usr/bin/env bash
set -euo pipefail

google_base64url_encode() {
  # Reads from stdin, writes base64url without padding.
  python3 - <<'PY'
import base64, sys
data = sys.stdin.buffer.read()
enc = base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")
sys.stdout.write(enc)
PY
}

get_google_token() {
  # google-auth.sh — obtener access token desde service account JSON
  # Uso: source scripts/lib/google-auth.sh && get_google_token
  #
  # Variables:
  #   GOOGLE_SERVICE_ACCOUNT_JSON — JSON completo del service account
  local sa_json="${GOOGLE_SERVICE_ACCOUNT_JSON:-}"
  if [[ -z "$sa_json" ]] && command -v doppler >/dev/null 2>&1; then
    sa_json="$(doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$sa_json" ]] && command -v doppler >/dev/null 2>&1; then
    sa_json="$(cd /opt/opsly 2>/dev/null && doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$sa_json" ]]; then
    echo "[google-auth] WARNING: GOOGLE_SERVICE_ACCOUNT_JSON vacío" >&2
    echo ""
    return 0
  fi

  # drive.file (solo archivos creados/abiertos por la app) es suficiente para sync de docs.
  google_sa_access_token_from_json "$sa_json" "https://www.googleapis.com/auth/drive.file" || true
}

google_sa_access_token_from_json() {
  # Usage: google_sa_access_token_from_json "$SERVICE_ACCOUNT_JSON" "$SCOPE"
  # Prints access token to stdout.
  local service_account_json="${1:-}"
  local scope="${2:-https://www.googleapis.com/auth/drive}"

  if [[ -z "$service_account_json" ]]; then
    echo "google-auth: service account JSON vacío" >&2
    return 1
  fi

  local client_email
  local token_uri
  client_email="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("client_email",""))' <<<"$service_account_json" 2>/dev/null || true)"
  token_uri="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("token_uri",""))' <<<"$service_account_json" 2>/dev/null || true)"

  if [[ -z "$client_email" ]]; then
    echo "google-auth: JSON inválido (client_email faltante)" >&2
    return 1
  fi
  # Google recomienda este endpoint; evitar divergencias de JSON.
  token_uri="https://oauth2.googleapis.com/token"

  local iat
  local exp
  iat="$(python3 -c 'import time; print(int(time.time()))')"
  exp="$((iat + 3600))"

  local header payload_json payload signing_input signature jwt
  header="$(printf '{"alg":"RS256","typ":"JWT"}' | google_base64url_encode)"
  payload_json="$(python3 -c "import json; print(json.dumps({'iss': '${client_email}','scope': '${scope}','aud': '${token_uri}','iat': int(${iat}),'exp': int(${exp})}, separators=(',',':')))" 2>/dev/null || true)"
  if [[ -z "${payload_json:-}" ]]; then
    echo "google-auth: no se pudo construir JWT payload" >&2
    return 1
  fi
  payload="$(printf '%s' "$payload_json" | google_base64url_encode)"

  signing_input="${header}.${payload}"

  local keyfile
  keyfile="$(mktemp)"
  chmod 600 "$keyfile"
  # private_key debe conservar saltos de línea PEM; no usar command substitution.
  if ! python3 -c 'import json,sys; sa=json.loads(sys.argv[1]); pk=sa.get("private_key",""); assert pk; open(sys.argv[2],"w",encoding="utf-8").write(pk)' "$service_account_json" "$keyfile" 2>/dev/null; then
    rm -f "$keyfile"
    echo "google-auth: JSON inválido (private_key faltante)" >&2
    return 1
  fi

  if ! openssl pkey -in "$keyfile" -noout >/dev/null 2>&1; then
    rm -f "$keyfile"
    echo "google-auth: private_key no es una clave PEM válida (openssl pkey)" >&2
    return 1
  fi

  signature="$(printf '%s' "$signing_input" | openssl dgst -sha256 -sign "$keyfile" 2>/dev/null | python3 -c 'import base64,sys; print(base64.urlsafe_b64encode(sys.stdin.buffer.read()).decode("ascii").rstrip("="))' 2>/dev/null || true)"
  rm -f "$keyfile"

  if [[ -z "$signature" ]]; then
    echo "google-auth: no se pudo firmar JWT (openssl)" >&2
    return 1
  fi

  jwt="${signing_input}.${signature}"

  local resp token
  resp="$(curl -sS -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
    --data "assertion=$jwt" \
    "$token_uri" 2>/dev/null || true)"

  token="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("access_token",""))' <<<"$resp" 2>/dev/null || true)"
  if [[ -z "$token" ]]; then
    err="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("error",""))' <<<"$resp" 2>/dev/null || true)"
    desc="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("error_description",""))' <<<"$resp" 2>/dev/null || true)"
    if [[ -n "${err:-}" || -n "${desc:-}" ]]; then
      echo "google-auth: token endpoint error: ${err:-unknown} ${desc:-}" >&2
    else
      echo "google-auth: no se pudo obtener access_token (respuesta no contiene access_token)" >&2
    fi
    return 1
  fi

  printf '%s' "$token"
}

