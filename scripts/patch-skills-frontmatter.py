#!/usr/bin/env python3
"""
patch-skills-frontmatter.py — Adds 'name' and 'description' fields to Opsly
SKILL.md files so Claude Code's skill discovery system can find and load them.

Run: python3 scripts/patch-skills-frontmatter.py [--dry-run]
"""
import os
import re
import sys

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills", "user")
DRY_RUN = "--dry-run" in sys.argv

def extract_description(content: str, skill_name: str) -> str:
    """Extract a one-line description from SKILL.md content."""
    # Try to find the first # heading
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return skill_name.replace("-", " ").title()

def patch_skill(skill_dir: str, skill_name: str) -> bool:
    skill_md = os.path.join(skill_dir, "SKILL.md")
    if not os.path.exists(skill_md):
        print(f"  ⚠️  No SKILL.md: {skill_name}")
        return False

    with open(skill_md, "r") as f:
        content = f.read()

    # Check if already has 'name:' field
    if re.search(r"^name:\s*\S", content, re.MULTILINE):
        print(f"  ⏭️  Already patched: {skill_name}")
        return False

    description = extract_description(content, skill_name)
    # Truncate description to 120 chars
    if len(description) > 120:
        description = description[:117] + "..."

    # Insert name + description right after the opening ---
    patched = re.sub(
        r"^---\n",
        f"---\nname: {skill_name}\ndescription: >\n  {description}\n",
        content,
        count=1,
    )

    if patched == content:
        print(f"  ❌  Could not patch: {skill_name}")
        return False

    if DRY_RUN:
        print(f"  [dry-run] Would patch: {skill_name}")
        return True

    with open(skill_md, "w") as f:
        f.write(patched)
    print(f"  ✅  Patched: {skill_name}")
    return True


def main():
    if not os.path.isdir(SKILLS_DIR):
        print(f"Error: skills directory not found: {SKILLS_DIR}")
        sys.exit(1)

    if DRY_RUN:
        print("DRY RUN — no files will be written\n")

    count = 0
    for skill_name in sorted(os.listdir(SKILLS_DIR)):
        skill_dir = os.path.join(SKILLS_DIR, skill_name)
        if os.path.isdir(skill_dir):
            if patch_skill(skill_dir, skill_name):
                count += 1

    print(f"\nDone. {'Would patch' if DRY_RUN else 'Patched'} {count} skill(s).")
    if not DRY_RUN and count > 0:
        print("Run 'bash scripts/register-skills.sh' to create symlinks in .claude/skills/")


if __name__ == "__main__":
    main()
