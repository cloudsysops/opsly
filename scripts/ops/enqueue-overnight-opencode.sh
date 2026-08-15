#!/usr/bin/env bash
# Desde Mac: encola un prompt para un agente local (OpenCode/Cursor/Claude) vía
# POST /api/local/prompt-submit del orchestrator (VPS).
# Requiere PLATFORM_ADMIN_TOKEN (Doppler) — nunca se ejecuta con eso en el gamer.
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/enqueue-overnight-opencode.sh --prompt "Revisa TODOs en apps/peskids"
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/enqueue-overnight-opencode.sh --agent cursor --prompt-file scripts/ops/prompts/overnight-backlog-triage.md --force
#   ./scripts/ops/enqueue-overnight-opencode.sh --prompt "…" --force
#
set -euo pipefail

PROMPT=""
PROMPT_FILE=""
FORCE=false
GOAL=""
AGENT="opencode"
ORCHESTRATOR_URL="${ORCHESTRATOR_HEALTH_URL:-http://100.120.151.91:3011}"

for arg in "$@"; do
  case "$arg" in
    --prompt=*) PROMPT="${arg#*=}" ;;
    --prompt-file=*) PROMPT_FILE="${arg#*=}" ;;
    --goal=*) GOAL="${arg#*=}" ;;
    --agent=*) AGENT="${arg#*=}" ;;
    --force) FORCE=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  case "${args[$i]}" in
    --prompt) PROMPT="${args[$((i + 1))]:-}" ;;
    --prompt-file) PROMPT_FILE="${args[$((i + 1))]:-}" ;;
    --goal) GOAL="${args[$((i + 1))]:-}" ;;
    --agent) AGENT="${args[$((i + 1))]:-}" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

AGENT="$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')"
case "$AGENT" in
  opencode|cursor|claude|copilot|codex) ;;
  *)
    echo "[enqueue-opencode] ERROR: agent no soportado: $AGENT" >&2
    exit 1
    ;;
esac

if [[ -n "$PROMPT_FILE" ]]; then
  [[ -f "$PROMPT_FILE" ]] || { echo "[enqueue-opencode] ERROR: prompt file not found: $PROMPT_FILE" >&2; exit 1; }
  PROMPT="$(cat "$PROMPT_FILE")"
fi

if [[ -z "$PROMPT" ]]; then
  echo "[enqueue-opencode] ERROR: --prompt or --prompt-file required" >&2
  exit 1
fi

if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
  echo "[enqueue-opencode] ERROR: PLATFORM_ADMIN_TOKEN not set — run via doppler run" >&2
  exit 1
fi

if [[ "$FORCE" != "true" ]]; then
  MODE_JSON="$(./scripts/ops/pc-gamer-schedule.sh --json)"
  MODE="$(echo "$MODE_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>console.log(JSON.parse(d).mode))')"
  NEEDLE="$AGENT"
  [[ "$AGENT" == "opencode" ]] || NEEDLE="opencode"
  ALLOWS="$(echo "$MODE_JSON" | NEEDLE="$NEEDLE" node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);console.log(j.allow_enqueue.includes(process.env.NEEDLE)?"true":"false")})')"
  if [[ "$ALLOWS" != "true" ]]; then
    echo "[enqueue-opencode] modo actual='$MODE' no permite '$NEEDLE' — usa --force para saltarte el gate" >&2
    exit 1
  fi
  echo "[enqueue-opencode] modo actual='$MODE' permite $NEEDLE, encolando agent=$AGENT…"
fi

if ! ./scripts/ops/check-pc-gamer-online.sh >/dev/null 2>&1; then
  echo "[enqueue-opencode] aviso: pc-gamer offline ahora mismo — el job queda en cola hasta que un worker local-agents lo tome" >&2
fi

BODY="$(PROMPT="$PROMPT" GOAL="$GOAL" AGENT="$AGENT" node -e '
  const body = {
    prompt_content: process.env.PROMPT,
    agent: process.env.AGENT,
    agent_role: "executor",
    tenant_slug: "local",
  };
  if (process.env.GOAL) body.goal = process.env.GOAL;
  process.stdout.write(JSON.stringify(body));
')"

tmp_body="$(mktemp)"
http_code="$(curl -sS -o "$tmp_body" -w "%{http_code}" --max-time 20 \
  -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  "${ORCHESTRATOR_URL}/api/local/prompt-submit" || true)"
if [[ "$http_code" != "200" && "$http_code" != "202" ]]; then
  echo "[enqueue-opencode] ERROR HTTP ${http_code}" >&2
  python3 -c 'import json,sys; p=sys.argv[1]
try:
  d=json.load(open(p))
  print(d.get("error") or d.get("message") or list(d.keys()), file=sys.stderr)
except Exception:
  print(open(p).read()[:300], file=sys.stderr)
' "$tmp_body" || true
  rm -f "$tmp_body"
  exit 1
fi
cat "$tmp_body"
echo
rm -f "$tmp_body"
