#!/usr/bin/env bash
# import-google-doc.sh — Exporta un Google Doc a un archivo local vía Drive API
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/google-auth.sh"

usage() {
  cat <<'USAGE' >&2
Uso:
  scripts/import-google-doc.sh --file-id <ID> --out <ruta> [--mime <mime>] [--strategy <user_first|service_account_first>]

Mime recomendados:
  - text/plain (default)
  - text/html
  - application/pdf
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document

Notas:
  - Para Service Account, normalmente necesitas scope amplio de lectura:
      export GOOGLE_DRIVE_IMPORT_SCOPE="https://www.googleapis.com/auth/drive.readonly"
    y compartir el documento con el client_email de la SA.
  - Si el export sale vacío, revisa en Google Docs que el contenido esté en el cuerpo (no solo título) y aceptado (no solo sugerencias).
USAGE
}

FILE_ID=""
OUT_PATH=""
MIME="text/plain"
STRATEGY="${GOOGLE_AUTH_STRATEGY:-service_account_first}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file-id)
      FILE_ID="${2:-}"
      shift 2
      ;;
    --out)
      OUT_PATH="${2:-}"
      shift 2
      ;;
    --mime)
      MIME="${2:-}"
      shift 2
      ;;
    --strategy)
      STRATEGY="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[import-google-doc] argumento desconocido: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$FILE_ID" || -z "$OUT_PATH" ]]; then
  usage
  exit 2
fi

REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_ABS="$OUT_PATH"
if [[ "$OUT_ABS" != /* ]]; then
  OUT_ABS="$REPO_ROOT/$OUT_ABS"
fi

mkdir -p "$(dirname "$OUT_ABS")"

export GOOGLE_AUTH_STRATEGY="$STRATEGY"

scope_override="${GOOGLE_DRIVE_IMPORT_SCOPE:-}"
TOKEN=""
if [[ -n "$scope_override" ]]; then
  sa_json=""
  if [[ -n "${GOOGLE_SERVICE_ACCOUNT_JSON:-}" ]]; then
    sa_json="${GOOGLE_SERVICE_ACCOUNT_JSON}"
  elif [[ -n "${GOOGLE_SERVICE_ACCOUNT_JSON_FILE:-}" && -f "${GOOGLE_SERVICE_ACCOUNT_JSON_FILE}" ]]; then
    sa_json="$(python3 -c 'import pathlib,sys; sys.stdout.write(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' "${GOOGLE_SERVICE_ACCOUNT_JSON_FILE}" 2>/dev/null || true)"
  fi
  if [[ -z "$sa_json" ]] && command -v doppler >/dev/null 2>&1; then
    sa_json="$(doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
  fi
  if [[ -z "$sa_json" ]]; then
    echo "[import-google-doc] GOOGLE_DRIVE_IMPORT_SCOPE está seteado pero no hay GOOGLE_SERVICE_ACCOUNT_JSON usable." >&2
    exit 1
  fi
  sa_json="$(normalize_google_sa_json "$sa_json")"
  TOKEN="$(google_sa_access_token_from_json "$sa_json" "$scope_override")"
else
  TOKEN="$(get_google_token || true)"
fi

if [[ -z "$TOKEN" ]]; then
  echo "[import-google-doc] No se pudo obtener access token." >&2
  exit 1
fi

mime_enc="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$MIME")"
tmp_err="$(mktemp)"
http="$(curl -sS -L -H "Authorization: Bearer $TOKEN" -o "$OUT_ABS" -w "%{http_code}" \
  "https://www.googleapis.com/drive/v3/files/${FILE_ID}/export?mimeType=${mime_enc}&supportsAllDrives=true" \
  2> "$tmp_err" || true)"

if [[ "$http" != "200" ]]; then
  echo "[import-google-doc] export falló HTTP $http" >&2
  if [[ -s "$tmp_err" ]]; then
    head -c 800 "$tmp_err" >&2 || true
    echo >&2
  fi
  rm -f "$tmp_err"
  exit 1
fi
rm -f "$tmp_err"

bytes="$(wc -c <"$OUT_ABS" | tr -d ' ')"
echo "[import-google-doc] OK file_id=$FILE_ID mime=$MIME bytes=$bytes out=$OUT_ABS"
