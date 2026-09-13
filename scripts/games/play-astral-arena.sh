#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT="$ROOT/apps/game-astral-arena"

find_godot() {
  if [[ -n "${GODOT_BIN:-}" && -x "${GODOT_BIN}" ]]; then
    printf '%s\n' "$GODOT_BIN"
    return 0
  fi
  for candidate in godot godot4; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

GODOT="$(find_godot || true)"
if [[ -z "$GODOT" ]]; then
  echo "Godot was not found." >&2
  echo "Install Godot 4.7.2 or set GODOT_BIN=/absolute/path/to/godot." >&2
  exit 1
fi

echo "Astral Arena family demo"
echo "Godot: $("$GODOT" --version | head -n 1)"
echo "Project: $PROJECT"

cd "$ROOT"
node scripts/games/validate-astral-arena-game.mjs

"$GODOT" --headless --editor --path "$PROJECT" --quit

echo
echo "Starting Astral Arena..."
echo "Flow: JUGAR AHORA → 1 player or Sisters Co-op → companion → battle."
echo "Battle: click/tap powers. Use the on-screen button or TAB to switch 2D ↔ 3D."
echo
exec "$GODOT" --path "$PROJECT"
