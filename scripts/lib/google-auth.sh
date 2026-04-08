#!/usr/bin/env bash
set -euo pipefail

normalize_google_sa_json() {
  # Soporta:
  # 1) JSON normal {"type":"service_account",...}
  # 2) JSON stringificado "\"{...}\""
  # 3) JSON en base64/base64url
  local raw="${1:-}"
  python3 - <<'PY' "$raw"
import base64
import json
import sys

raw = sys.argv[1] if len(sys.argv) > 1 else ""
s = raw.strip().lstrip("\ufeff")
if not s:
    print("")
    raise SystemExit(0)

def try_json(text: str):
    try:
        parsed = json.loads(text)
    except Exception:
        return None
    if isinstance(parsed, str):
        try:
            parsed2 = json.loads(parsed)
            if isinstance(parsed2, dict):
                return parsed2
        except Exception:
            return None
        return None
    if isinstance(parsed, dict):
        return parsed
    return None

obj = try_json(s)
if obj is None:
    candidate = s.replace("-", "+").replace("_", "/")
    padding = "=" * ((4 - len(candidate) % 4) % 4)
    try:
        decoded = base64.b64decode(candidate + padding).decode("utf-8", errors="strict")
        obj = try_json(decoded.strip().lstrip("\ufeff"))
    except Exception:
        obj = None

if obj is None:
    print("")
else:
    print(json.dumps(obj, separators=(",", ":")))
PY
}

read_google_sa_json_file() {
  local path="${1:-}"
  if [[ -z "$path" ]]; then
    return 1
  fi
  if [[ ! -f "$path" ]]; then
    echo "[google-auth] WARNING: no existe GOOGLE_SERVICE_ACCOUNT_JSON_FILE: $path" >&2
    return 1
  fi
  if [[ ! -r "$path" ]]; then
    echo "[google-auth] WARNING: sin lectura en GOOGLE_SERVICE_ACCOUNT_JSON_FILE: $path" >&2
    return 1
  fi
  python3 -c 'import pathlib,sys; sys.stdout.write(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' "$path"
}

google_base64url_encode() {
  # Lee de stdin del caller (NO usar heredoc: roba stdin y rompe el pipe).
  python3 -c 'import base64,sys
data=sys.stdin.buffer.read()
sys.stdout.write(base64.urlsafe_b64encode(data).decode("ascii").rstrip("="))
'
}

load_google_user_credentials_raw() {
  # JSON tipo authorized_user (refresh_token + client_id + client_secret) o ADC de gcloud.
  local raw=""
  if [[ -n "${GOOGLE_USER_CREDENTIALS_JSON:-}" ]]; then
    raw="${GOOGLE_USER_CREDENTIALS_JSON}"
  elif [[ -n "${GOOGLE_USER_CREDENTIALS_JSON_FILE:-}" && -f "${GOOGLE_USER_CREDENTIALS_JSON_FILE}" ]]; then
    raw="$(python3 -c 'import pathlib,sys; sys.stdout.write(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' "${GOOGLE_USER_CREDENTIALS_JSON_FILE}" 2>/dev/null || true)"
  fi
  if [[ -z "$raw" ]] && command -v doppler >/dev/null 2>&1; then
    raw="$(doppler secrets get GOOGLE_USER_CREDENTIALS_JSON --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$raw" ]] && command -v doppler >/dev/null 2>&1; then
    raw="$(cd /opt/opsly 2>/dev/null && doppler secrets get GOOGLE_USER_CREDENTIALS_JSON --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$raw" ]]; then
    local adc="${GOOGLE_APPLICATION_CREDENTIALS:-}"
    if [[ -z "$adc" ]]; then
      adc="${HOME}/.config/gcloud/application_default_credentials.json"
    fi
    if [[ -f "$adc" ]]; then
      raw="$(python3 -c 'import pathlib,sys; sys.stdout.write(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' "$adc" 2>/dev/null || true)"
    fi
  fi
  printf '%s' "$raw"
}

get_google_user_access_token() {
  # OAuth usuario: refresh_token → access_token (escritura en Mi unidad vía cuota del usuario).
  local creds_raw
  creds_raw="$(load_google_user_credentials_raw)"
  if [[ -z "$creds_raw" ]]; then
    echo ""
    return 0
  fi

  local out
  out="$(printf '%s' "$creds_raw" | python3 -c '
import json, sys
raw = sys.stdin.read().strip().lstrip("\ufeff")
if not raw:
    raise SystemExit(2)
try:
    d = json.loads(raw)
except Exception:
    raise SystemExit(2)
if isinstance(d, str):
    try:
        d = json.loads(d)
    except Exception:
        raise SystemExit(2)
if not isinstance(d, dict):
    raise SystemExit(2)
if d.get("type") == "service_account":
    raise SystemExit(2)
rt = (d.get("refresh_token") or "").strip()
cid = (d.get("client_id") or "").strip()
cs = (d.get("client_secret") or "").strip()
if not rt:
    raise SystemExit(2)
print(json.dumps({"refresh_token": rt, "client_id": cid, "client_secret": cs}, separators=(",", ":")))
' 2>/dev/null || true)"

  if [[ -z "$out" ]]; then
    echo ""
    return 0
  fi

  local refresh_token client_id client_secret
  refresh_token="$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["refresh_token"])')"
  client_id="$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["client_id"])')"
  client_secret="$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["client_secret"])')"

  if [[ -z "$client_secret" ]]; then
    echo "[google-auth] WARNING: credenciales de usuario sin client_secret (no se puede refrescar token). Usa gcloud auth application-default login o JSON OAuth completo." >&2
    echo ""
    return 0
  fi

  local resp atok
  resp="$(curl -sS -X POST https://oauth2.googleapis.com/token \
    -d "client_id=${client_id}" \
    -d "client_secret=${client_secret}" \
    -d "refresh_token=${refresh_token}" \
    -d "grant_type=refresh_token" 2>/dev/null || true)"
  atok="$(printf '%s' "$resp" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("access_token",""))' 2>/dev/null || true)"
  if [[ -z "$atok" ]]; then
    err="$(printf '%s' "$resp" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("error",""))' 2>/dev/null || true)"
    if [[ -n "${err:-}" ]]; then
      echo "[google-auth] WARNING: refresh token usuario falló: ${err}" >&2
    fi
    echo ""
    return 0
  fi
  printf '%s' "$atok"
}

get_google_service_account_access_token() {
  local sa_json=""
  local json_file="${GOOGLE_SERVICE_ACCOUNT_JSON_FILE:-}"
  if [[ -n "${GOOGLE_SERVICE_ACCOUNT_JSON:-}" ]]; then
    sa_json="${GOOGLE_SERVICE_ACCOUNT_JSON}"
  elif [[ -n "$json_file" ]]; then
    sa_json="$(read_google_sa_json_file "$json_file" 2>/dev/null || true)"
  fi
  if [[ -z "$sa_json" ]] && command -v doppler >/dev/null 2>&1; then
    sa_json="$(doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$sa_json" ]] && command -v doppler >/dev/null 2>&1; then
    sa_json="$(cd /opt/opsly 2>/dev/null && doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$sa_json" ]]; then
    echo ""
    return 0
  fi

  sa_json="$(normalize_google_sa_json "$sa_json")"
  if [[ -z "$sa_json" && -n "$json_file" ]]; then
    sa_json="$(read_google_sa_json_file "$json_file" 2>/dev/null || true)"
    sa_json="$(normalize_google_sa_json "$sa_json")"
  fi
  if [[ -z "$sa_json" ]]; then
    echo ""
    return 0
  fi

  local token
  token="$(google_sa_access_token_from_json "$sa_json" "https://www.googleapis.com/auth/drive.file" 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    printf '%s' "$token"
    return 0
  fi
  google_sa_access_token_from_json "$sa_json" "https://www.googleapis.com/auth/drive" 2>/dev/null || true
}

get_google_token() {
  # google-auth.sh — access token para Google APIs (Drive, etc.)
  # Uso: source scripts/lib/google-auth.sh && get_google_token
  #
  # Variables:
  #   GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_FILE
  #   GOOGLE_USER_CREDENTIALS_JSON, GOOGLE_USER_CREDENTIALS_JSON_FILE, GOOGLE_USER_CREDENTIALS_JSON en Doppler
  #   GOOGLE_APPLICATION_CREDENTIALS o ~/.config/gcloud/application_default_credentials.json
  #
  # GOOGLE_AUTH_STRATEGY:
  #   service_account_first (default) — SA; si token vacío → usuario
  #   user_first — usuario; si vacío → SA (recomendado para drive-sync hacia Mi unidad)
  local strategy="${GOOGLE_AUTH_STRATEGY:-service_account_first}"
  local token=""

  if [[ "$strategy" == "user_first" ]]; then
    token="$(get_google_user_access_token 2>/dev/null || true)"
    if [[ -n "$token" ]]; then
      printf '%s' "$token"
      return 0
    fi
    token="$(get_google_service_account_access_token 2>/dev/null || true)"
    if [[ -n "$token" ]]; then
      printf '%s' "$token"
      return 0
    fi
    echo "[google-auth] WARNING: sin credencial usable (usuario ni SA)" >&2
    echo ""
    return 0
  fi

  token="$(get_google_service_account_access_token 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    printf '%s' "$token"
    return 0
  fi

  token="$(get_google_user_access_token 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    printf '%s' "$token"
    return 0
  fi

  echo "[google-auth] WARNING: sin credencial (GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_USER_CREDENTIALS_JSON/ADC o Doppler)" >&2
  echo ""
  return 0
}

google_sa_access_token_from_json() {
  # Usage: google_sa_access_token_from_json "$SERVICE_ACCOUNT_JSON" "$SCOPE"
  # Prints access token to stdout.
  local service_account_json="${1:-}"
  local scope="${2:-https://www.googleapis.com/auth/drive}"
  service_account_json="$(printf '%s' "$service_account_json" | sed 's/^\xEF\xBB\xBF//')"

  if [[ -z "$service_account_json" ]]; then
    echo "google-auth: service account JSON vacío" >&2
    return 1
  fi

  local client_email
  local sa_type
  local token_uri
  sa_type="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("type",""))' <<<"$service_account_json" 2>/dev/null || true)"
  client_email="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("client_email",""))' <<<"$service_account_json" 2>/dev/null || true)"
  token_uri="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("token_uri",""))' <<<"$service_account_json" 2>/dev/null || true)"

  if [[ "$sa_type" != "service_account" ]]; then
    echo "google-auth: JSON inválido (type debe ser service_account)" >&2
    return 1
  fi

  if [[ -z "$client_email" ]]; then
    echo "google-auth: JSON inválido (client_email faltante)" >&2
    return 1
  fi
  # Google exige aud fijo (no confundir con token_uri del JSON de la cuenta).
  token_uri="https://oauth2.googleapis.com/token"

  local header payload_json payload signing_input signature jwt
  header="$(printf '{"alg":"RS256","typ":"JWT"}' | google_base64url_encode)"
  # Payload sin interpolación shell. Sin claim "sub" salvo delegación de dominio (si no,
  # Google a veces responde invalid_request / Bad Request sin detalle).
  payload_json="$(printf '%s' "$service_account_json" | python3 -c '
import json, sys, time
sa = json.loads(sys.stdin.read())
scope = sys.argv[1]
email = sa["client_email"]
aud = "https://oauth2.googleapis.com/token"
now = int(time.time())
iat = now - 90
exp = iat + 3600
body = {"iss": email, "scope": scope, "aud": aud, "iat": iat, "exp": exp}
print(json.dumps(body, separators=(",", ":")))
' "$scope" 2>/dev/null || true)"
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
  # --data-urlencode evita invalid_request cuando el JWT rompe el body form (caracteres reservados).
  resp="$(curl -sS -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
    --data-urlencode "assertion=${jwt}" \
    "$token_uri" 2>/dev/null || true)"

  if [[ "${GOOGLE_OAUTH_DEBUG:-}" == "1" ]]; then
    echo "[google-auth] debug: token_uri=$token_uri resp_bytes=$(printf '%s' "$resp" | wc -c | tr -d ' ')" >&2
  fi
  if [[ "${GOOGLE_OAUTH_DEBUG:-}" == "2" ]]; then
    echo "[google-auth] debug: body=$(printf '%s' "$resp")" >&2
  fi

  token="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("access_token",""))' <<<"$resp" 2>/dev/null || true)"
  if [[ -z "$token" ]]; then
    err="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("error",""))' <<<"$resp" 2>/dev/null || true)"
    desc="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("error_description",""))' <<<"$resp" 2>/dev/null || true)"
    if [[ -n "${err:-}" || -n "${desc:-}" ]]; then
      echo "google-auth: token endpoint error: ${err:-unknown} ${desc:-}" >&2
      echo "google-auth: tip: IAM > Service accounts > Keys (key revocada o JSON de otra cuenta). Subir JSON nuevo: doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON ... < archivo.json" >&2
    else
      echo "google-auth: no se pudo obtener access_token (respuesta no JSON o vacía): $(printf '%.200s' "$resp")" >&2
    fi
    return 1
  fi

  printf '%s' "$token"
}

