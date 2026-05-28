#!/usr/bin/env bash
# register-skills.sh — Registers all skills/user/* as native Claude Code skills
# Run this manually: bash scripts/register-skills.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$REPO_ROOT/skills/user"
SKILLS_DST="$REPO_ROOT/.claude/skills"

mkdir -p "$SKILLS_DST"

count=0
for skill_dir in "$SKILLS_SRC"/*/; do
  skill="${skill_dir%/}"
  skill="${skill##*/}"
  target="$SKILLS_DST/$skill"
  relative_src="../../skills/user/$skill"

  if [ -L "$target" ]; then
    echo "⏭️  Already linked: $skill"
  elif [ -e "$target" ]; then
    echo "⚠️  Exists (not symlink): $skill — skipping"
  else
    ln -s "$relative_src" "$target"
    echo "✅ Linked: $skill"
    ((count++))
  fi
done

echo ""
echo "Done. Registered $count new skills from skills/user/ → .claude/skills/"
echo "Restart Claude Code session to pick up new skills."
