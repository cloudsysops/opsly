#!/usr/bin/env bash
# Claude Code SessionStart hook — inyecta sugerencia de skills (skill-finder) + sincroniza Obsidian.
# Entrada: JSON en stdin (source, model, cwd, …). Salida stdout → contexto para Claude.
set -euo pipefail

INPUT="$(cat || true)"
ROOT="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "$ROOT" ]] || [[ ! -d "$ROOT" ]]; then
  exit 0
fi
cd "$ROOT" || exit 0

# 1. OBSIDIAN SYNC — Mantener knowledge-index y brain actualizado automáticamente
if [[ -f "${ROOT}/scripts/obsidian-ide-sync.sh" ]]; then
  printf '%s\n' "🧠 Opsly Brain Sync..."
  if bash "${ROOT}/scripts/obsidian-ide-sync.sh" >/dev/null 2>&1; then
    printf '%s\n' "✅ Knowledge index actualizado (560 docs, MCP ready)"
  else
    printf '%s\n' "⚠️  Obsidian sync skipped (dependencies not ready)"
  fi
else
  printf '%s\n' "⚠️  Obsidian sync script not found"
fi

printf '\n'

# 2. SKILLS FINDER — Recomendaciones contextuales de skills
QUERY="opsly bootstrap context skills"
if command -v jq >/dev/null 2>&1 && [[ -n "${INPUT// }" ]]; then
  SRC="$(echo "$INPUT" | jq -r '.source // empty' 2>/dev/null || true)"
  case "$SRC" in
    resume) QUERY="opsly continuidad sesión resume" ;;
    clear) QUERY="opsly context tras clear" ;;
    compact) QUERY="opsly context tras compact" ;;
  esac
fi

if [[ ! -f "${ROOT}/scripts/skill-finder.js" ]]; then
  exit 0
fi

OUT="$(node "${ROOT}/scripts/skill-finder.js" "$QUERY" --autonomous --json 2>&1)" || exit 0

if command -v jq >/dev/null 2>&1; then
  OUT="$(printf '%s' "$OUT" | jq -c '
    {
      status,
      query,
      chain: (if (.chain | type) == "array" then .chain[0:12] else .chain end),
      primary,
      confidence,
      decision,
      skills: (if (.skills | type) == "array" then .skills[0:8] else .skills end)
    }
  ' 2>/dev/null)" || true
fi

printf '%s\n' "## Opsly — skill-finder (SessionStart)"
printf '%s\n' "$OUT"
exit 0
