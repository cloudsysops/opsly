#!/usr/bin/env bash
# skill-hooks.sh — Hooks para auto-activación de skills
# Incluir en .claude/CLAUDE.md o ejecutar en startup

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_INDEX="$SKILL_ROOT/skills/index.json"

# Detecta el tipo de query y sugiere skills
skill_detect() {
  local query="$1"
  local skill

  skill=$(grep -i "$query" "$SKILL_INDEX" 2>/dev/null | \
          jq -r '.skills[] | select(.triggers | map(tostring) | join(" ") | test("'"$query"'"; "i")) | .name' 2>/dev/null | \
          head -1)

  echo "$skill"
}

# Auto-carga skills según contexto
skill_autoload() {
  local query="${1:-}"

  if [ -z "$query" ]; then
    echo "Usage: skill_autoload '<query>'"
    return 1
  fi

  echo "🎯 Detecting skills for: $query"

  # Buscar skills que coincidan
  local matches
  matches=$(node "$SKILL_ROOT/scripts/skill-finder.js" "$query" --autonomous 2>/dev/null | \
            jq -r '.chain[]' 2>/dev/null)

  if [ -n "$matches" ]; then
    echo "📦 Chain: ${matches//$'\n'/ → }"

    for skill in $matches; do
      local md_file="$SKILL_ROOT/skills/user/$skill/SKILL.md"
      if [ -f "$md_file" ]; then
        echo -e "\n=== $skill ==="
        head -30 "$md_file"
      fi
    done
  else
    echo "⚠️ No skills found for: $query"
    echo "📚 Available skills:"
    jq -r '.skills[].name' "$SKILL_INDEX" 2>/dev/null
  fi
}

# Verifica que todos los skills tengan manifest
skill_validate() {
  echo "🔍 Validating skills..."

  local errors=0
  for dir in "$SKILL_ROOT/skills/user"/*/; do
    local name=$(basename "$dir")
    if [ ! -f "$dir/manifest.json" ]; then
      echo "❌ Missing manifest: $name"
      errors=$((errors + 1))
    else
      echo "✅ $name"
    fi
  done

  if [ $errors -eq 0 ]; then
    echo "✅ All skills validated"
  else
    echo "❌ $errors errors found"
    return 1
  fi
}

# Lista todos los skills disponibles
skill_list() {
  echo "📚 Available Skills"
  echo "─"$(printf '%.0s' {1..50})

  jq -r '.skills[] | "[\(.priority)] \(.name) - \(.description)"' "$SKILL_INDEX" 2>/dev/null | \
    while read -r line; do
      echo "$line"
    done
}

# Muestra ayuda
skill_help() {
  cat << 'EOF'
Skill Hooks - Auto-activation system for Opsly

Usage:
  source scripts/skill-hooks.sh        # Import functions
  skill_detect "<query>"              # Detect skill for query
  skill_autoload "<query>"            # Auto-load skills for query
  skill_validate                      # Validate all manifests
  skill_list                          # List all skills

Examples:
  skill_autoload "crear ruta api"
  skill_detect "mcp tool oauth"
  skill_validate

For Claude/Cursor integration, add to .claude/CLAUDE.md:
  Al inicio de sesión: source $REPO/scripts/skill-hooks.sh
  Query inicial: skill_autoload "<contexto de la sesión>"
EOF
}

case "${1:-}" in
  detect)
    skill_detect "${2:-}"
    ;;
  autoload)
    skill_autoload "${2:-}"
    ;;
  validate)
    skill_validate
    ;;
  list)
    skill_list
    ;;
  help|--help|"")
    skill_help
    ;;
  *)
    echo "Unknown command: $1"
    skill_help
    ;;
esac
