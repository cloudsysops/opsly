#!/usr/bin/env bash
# dispatch-discord-command.sh — dispara comandos al webhook n8n Discord->GitHub.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/dispatch-discord-command.sh --content "echo hello"
  ./scripts/dispatch-discord-command.sh --file ./tmp/prompt.sh
  ./scripts/dispatch-discord-command.sh --target claude --content "revisar deploy"
  ./scripts/dispatch-discord-command.sh --content "echo hello" --dry-run

Opciones:
  --content <texto>   Contenido a ejecutar en ACTIVE-PROMPT.
  --file <path>       Archivo con contenido shell (se envía completo).
  --author <nombre>   Autor del mensaje (default: Cristian).
  --target <agent>    cursor | claude | auto (default: auto).
  --dry-run           No envía webhook; solo imprime payload.
  -h, --help          Mostrar ayuda.

Variables de entorno:
  N8N_WEBHOOK_URL           URL del webhook n8n.
  N8N_WEBHOOK_SECRET_GH     Secreto compartido X-Opsly-Secret (canónico en Doppler).
  N8N_WEBHOOK_SECRET        Legado; se usa si GH está vacío.
EOF
}

CONTENT=""
FILE_PATH=""
AUTHOR="Cristian"
TARGET="auto"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --content)
      CONTENT="${2:-}"
      shift 2
      ;;
    --file)
      FILE_PATH="${2:-}"
      shift 2
      ;;
    --author)
      AUTHOR="${2:-}"
      shift 2
      ;;
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Argumento no reconocido: $1"
      ;;
  esac
done

if [[ -n "$CONTENT" && -n "$FILE_PATH" ]]; then
  die "Usa solo uno: --content o --file"
fi

if [[ -z "$CONTENT" && -z "$FILE_PATH" ]]; then
  die "Debes indicar --content o --file"
fi

if [[ -n "$FILE_PATH" ]]; then
  [[ -f "$FILE_PATH" ]] || die "Archivo no encontrado: $FILE_PATH"
  CONTENT="$(<"$FILE_PATH")"
fi

CONTENT="${CONTENT#"${CONTENT%%[![:space:]]*}"}"
CONTENT="${CONTENT%"${CONTENT##*[![:space:]]}"}"
[[ -n "$CONTENT" ]] || die "Contenido vacío tras trim"

case "$TARGET" in
  auto|cursor|claude) ;;
  *) die "Target inválido: $TARGET (usa cursor|claude|auto)" ;;
esac

if [[ "$TARGET" == "auto" ]]; then
  if [[ "$CONTENT" =~ ^[[:space:]]*@claude([[:space:]]|$) ]]; then
    TARGET="claude"
  elif [[ "$CONTENT" =~ ^[[:space:]]*@cursor([[:space:]]|$) ]]; then
    TARGET="cursor"
  else
    TARGET="cursor"
  fi
fi

WEBHOOK_URL="${N8N_WEBHOOK_URL:-}"
WEBHOOK_SECRET="${N8N_WEBHOOK_SECRET_GH:-${N8N_WEBHOOK_SECRET:-}}"

if [[ "$DRY_RUN" != "true" && -z "$WEBHOOK_URL" && -x "${SCRIPT_DIR}/check-tokens.sh" ]]; then
  WEBHOOK_URL="$(doppler secrets get N8N_WEBHOOK_URL --project ops-intcloudsysops --config prd --plain 2>/dev/null || true)"
fi
if [[ "$DRY_RUN" != "true" && -z "$WEBHOOK_SECRET" ]]; then
  WEBHOOK_SECRET="$(doppler secrets get N8N_WEBHOOK_SECRET_GH --project ops-intcloudsysops --config prd --plain 2>/dev/null || true)"
fi
if [[ "$DRY_RUN" != "true" && -z "$WEBHOOK_SECRET" ]]; then
  WEBHOOK_SECRET="$(doppler secrets get N8N_WEBHOOK_SECRET --project ops-intcloudsysops --config prd --plain 2>/dev/null || true)"
fi

require_cmd curl python3

PAYLOAD="$(python3 - <<'PY' "$CONTENT" "$AUTHOR" "$TARGET"
import json, sys
content = sys.argv[1]
author = sys.argv[2]
target = sys.argv[3]
print(json.dumps({
    "content": content,
    "author": {"username": author},
    "target": target,
    "source": "cursor-dispatch",
    "dry_run": False
}, ensure_ascii=False))
PY
)"

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "DRY-RUN habilitado; payload:"
  printf '%s\n' "$PAYLOAD"
  exit 0
fi

require_env WEBHOOK_URL WEBHOOK_SECRET

STATUS="$(curl -sS -o /tmp/n8n-dispatch-response.txt -w '%{http_code}' \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Secret: $WEBHOOK_SECRET" \
  -d "$PAYLOAD")"

if [[ ! "$STATUS" =~ ^2[0-9][0-9]$ ]]; then
  log_error "Webhook n8n falló (HTTP $STATUS)"
  [[ -f /tmp/n8n-dispatch-response.txt ]] && cat /tmp/n8n-dispatch-response.txt >&2 || true
  exit 1
fi

log_info "Webhook n8n OK (HTTP $STATUS)"
[[ -f /tmp/n8n-dispatch-response.txt ]] && cat /tmp/n8n-dispatch-response.txt || true
