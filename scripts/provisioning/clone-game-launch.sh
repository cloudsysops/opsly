#!/usr/bin/env bash
# Scaffold a reusable game product from config/game-blueprints.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BLUEPRINT=""
SLUG=""
TITLE=""
DRY_RUN=false
FORCE=false

usage() {
  cat <<'EOF'
Usage: ./scripts/provisioning/clone-game-launch.sh \
  --blueprint godot-steam \
  --slug <game-slug> \
  --title "Game Title" \
  [--dry-run] [--force]

Creates:
  config/games/<slug>.launch.json
  apps/game-<slug>/            (from templates/game-products/<blueprint>/)

The generated game consumes canon/rules from Opsly content packs.
It does NOT copy another game's canon, save data, Steam IDs, or credentials.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --blueprint) shift; BLUEPRINT="${1:-}" ;;
    --slug) shift; SLUG="${1:-}" ;;
    --title) shift; TITLE="${1:-}" ;;
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ -z "$BLUEPRINT" || -z "$SLUG" || -z "$TITLE" ]]; then
  echo "Missing required: --blueprint --slug --title" >&2
  usage
  exit 1
fi

if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Invalid slug: $SLUG" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "Required command not found: jq" >&2; exit 1; }

BASE="$ROOT/config/game-blueprints/_base.json"
SPEC="$ROOT/config/game-blueprints/${BLUEPRINT}.json"
TEMPLATE="$ROOT/templates/game-products/${BLUEPRINT}"
OUT="$ROOT/config/games/${SLUG}.launch.json"
APP="$ROOT/apps/game-${SLUG}"

if [[ ! -f "$SPEC" || ! -d "$TEMPLATE" ]]; then
  echo "Unknown/incomplete game blueprint: $BLUEPRINT" >&2
  echo "Available:" >&2
  jq -r '.blueprints[] | "  \(.id)"' "$ROOT/config/game-blueprints/index.json" >&2
  exit 1
fi

if { [[ -f "$OUT" ]] || [[ -d "$APP" ]]; } && [[ "$FORCE" != true ]]; then
  echo "Refusing to overwrite existing game output (use --force)" >&2
  exit 1
fi

MERGED="$(
  jq -n \
    --slurpfile base "$BASE" \
    --slurpfile spec "$SPEC" \
    --arg slug "$SLUG" \
    --arg title "$TITLE" \
    '$base[0] * $spec[0] | . + {
      game_slug: $slug,
      title: $title,
      generated_app_path: ("apps/game-" + $slug)
    } | walk(
      if type == "string" then
        gsub("\\{game_slug\\}"; $slug) |
        gsub("\\{game_title\\}"; $title)
      else . end
    )'
)"

if [[ "$DRY_RUN" == true ]]; then
  echo "$MERGED" | jq .
  echo
  echo "DRY RUN: would write $OUT"
  echo "DRY RUN: would scaffold $APP from $TEMPLATE"
  exit 0
fi

mkdir -p "$ROOT/config/games"
rm -rf "$APP"
cp -R "$TEMPLATE" "$APP"
echo "$MERGED" | jq . > "$OUT"

find "$APP" -type f -print0 | while IFS= read -r -d '' file; do
  sed -i.bak \
    -e "s/{{GAME_SLUG}}/$SLUG/g" \
    -e "s/{{GAME_TITLE}}/$TITLE/g" \
    "$file" || true
  rm -f "${file}.bak"
done

echo "Created game product:"
echo "  launch: $OUT"
echo "  app:    $APP"
echo
echo "Next:"
echo "  1. Generate the game's canonical content pack from Opsly."
echo "  2. Open $APP/project.godot in Godot 4.7.2 stable."
echo "  3. Implement only game-specific scenes/assets; keep shared systems in the blueprint."
