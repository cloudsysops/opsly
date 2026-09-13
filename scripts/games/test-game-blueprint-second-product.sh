#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SLUG="guardian-lab"
TITLE="Guardian Lab"
APP="$ROOT/apps/game-$SLUG"
LAUNCH="$ROOT/config/games/$SLUG.launch.json"

cleanup_generated() {
  rm -rf "$APP"
  rm -f "$LAUNCH"
}
trap cleanup_generated EXIT

cd "$ROOT"
./scripts/provisioning/clone-game-launch.sh --blueprint godot-steam --slug "$SLUG" --title "$TITLE"

test -f "$APP/project.godot"
test -f "$LAUNCH"
grep -q 'Guardian Lab' "$APP/project.godot"
grep -q '"game_slug": "guardian-lab"' "$LAUNCH"

FORBIDDEN='Astral Arena|Brissa|Umbra|Señor Sombra|astral-arena|ASTRAL_ARENA'
if grep -R -E -n "$FORBIDDEN" "$APP" "$LAUNCH"; then
  echo "Blueprint leakage detected" >&2
  exit 1
fi

if jq -e '.steam.app_id != null or .steam.depot_id_windows != null' "$LAUNCH" >/dev/null; then
  echo "Generated product leaked Steam identifiers" >&2
  exit 1
fi

echo "GAME_BLUEPRINT_SECOND_PRODUCT_SMOKE=PASS"
