#!/usr/bin/env bash
# skill-autoload.sh — Auto-detecta y carga skills según contexto
# Fuente este script o ejecútalo para obtener la cadena de skills

SKILL_FINDER="node $(dirname "${BASH_SOURCE[0]}")/skill-finder.js"

get_skill_chain() {
  local query="${1:-}"
  if [ -z "$query" ]; then
    echo "Usage: get_skill_chain '<query>'"
    return 1
  fi

  $SKILL_FINDER "$query" --autonomous --json 2>/dev/null | \
    jq -r '.chain[]' 2>/dev/null || echo "opsly-bootstrap"
}

load_skill() {
  local skill_name="$1"
  local skill_path="skills/user/${skill_name}/SKILL.md"

  if [ -f "$skill_path" ]; then
    echo -e "\n=== $skill_name ==="
    head -50 "$skill_path"
  else
    echo "Skill not found: $skill_name" >&2
    return 1
  fi
}

autonomous_mode() {
  local query="${1:-}"
  local chain

  echo "🤖 Autonomous Mode"
  echo "   Query: $query"

  chain=$(get_skill_chain "$query")
  echo "   Chain: ${chain//$'\n'/ → }"

  for skill in $chain; do
    load_skill "$skill"
  done
}

case "${1:-}" in
  --chain)
    get_skill_chain "${2:-}"
    ;;
  --load)
    load_skill "${2:-}"
    ;;
  --auto)
    autonomous_mode "${2:-}"
    ;;
  --help|*)
    echo "Skill Autoload Helper"
    echo ""
    echo "Usage:"
    echo "  source scripts/skill-autoload.sh    # Import functions"
    echo "  ./scripts/skill-autoload.sh --chain '<query>'"
    echo "  ./scripts/skill-autoload.sh --load <skill-name>"
    echo "  ./scripts/skill-autoload.sh --auto '<query>'"
    ;;
esac
