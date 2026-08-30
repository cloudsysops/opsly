#!/usr/bin/env bash
# Brain enhancement: adds frontmatter + wikilinks to orphan docs.
# Uso: ./scripts/obsidian-brain-enhance.sh [--vault <path>] [--dry-run|--apply]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VAULT="${REPO_ROOT}/docs"
MODE="--dry-run"

# Parse args
while [ $# -gt 0 ]; do
  case "$1" in
    --vault) VAULT="$2"; shift 2 ;;
    --apply) MODE="--apply"; shift ;;
    --dry-run) MODE="--dry-run"; shift ;;
    *) shift ;;
  esac
done

TODAY=$(date -u +%Y-%m-%d)

fm_added=0
links_added=0
orphans=0
total=0

echo ""
echo "========================================"
echo "  Brain Enhancement"
echo "  Vault: ${VAULT#$REPO_ROOT/}"
echo "  Mode: $MODE"
echo "========================================"
echo ""

# Build type/tag map based on vault root
VAULT_NAME="${VAULT#$REPO_ROOT/}"
if [ "$VAULT_NAME" = "docs" ] || [ "$VAULT_NAME" = "docs/" ]; then
  CATEGORIZE="docs"
else
  CATEGORIZE="full"
fi

while IFS= read -r -d '' f; do
  rel="${f#$VAULT/}"
  total=$((total + 1))

  # Skip internal Obsidian/cache dirs
  case "$rel" in brain/*|obsidian/inbox/*|obsidian/templates/*|obsidian/cache/*|obsidian/plugins/*) continue ;; esac

  first=$(head -1 "$f" 2>/dev/null || true)

  # --- Frontmatter ---
  if [ "$first" != "---" ]; then
    if [ "$CATEGORIZE" = "docs" ]; then
      tags="opsly/doc"
      type="doc"
      case "$rel" in
        00-architecture/*) tags="opsly/architecture"; type="architecture" ;;
        01-development/*)  tags="opsly/development";  type="guide" ;;
        02-tools/*)        tags="opsly/tools";        type="tool-doc" ;;
        03-agents/*)       tags="opsly/agents";       type="agent-doc" ;;
        04-infrastructure/*) tags="opsly/infrastructure"; type="infrastructure" ;;
        adr/*)             tags="opsly/adr";          type="adr" ;;
        tenants/*)         tags="opsly/tenant";       type="tenant" ;;
        runbooks/*)        tags="opsly/runbook";      type="runbook" ;;
        history/*)         tags="opsly/archive";      type="archive" ;;
        testing/*)         tags="opsly/testing";      type="test-doc" ;;
        obsidian/*)        tags="opsly/obsidian";     type="note" ;;
      esac
    else
      # Full-repo categorization by first directory
      topdir=$(echo "$rel" | cut -d/ -f1)
      tags="opsly/doc"
      type="doc"
      case "$topdir" in
        .agents)  tags="opsly/agent-skill";   type="skill" ;;
        .claude)  tags="opsly/claude-config"; type="config" ;;
        .cursor)  tags="opsly/cursor-config"; type="config" ;;
        .codex)   tags="opsly/codex-config";  type="config" ;;
        .github)  tags="opsly/github";        type="config" ;;
        .hermes)  tags="opsly/hermes";        type="config" ;;
        .n8n)     tags="opsly/n8n";           type="config" ;;
        .archived) tags="opsly/archived";     type="archive" ;;
        apps)     tags="opsly/app";           type="app-doc" ;;
        config)   tags="opsly/config";        type="config" ;;
        docs)     tags="opsly/opsly-docs";    type="doc" ;;
        infra)    tags="opsly/infra";         type="infrastructure" ;;
        lib)      tags="opsly/lib";           type="lib-doc" ;;
        packages) tags="opsly/package";       type="package-doc" ;;
        runtime)  tags="opsly/runtime";       type="state" ;;
        scripts)  tags="opsly/script";        type="script-doc" ;;
        tools)    tags="opsly/tool";          type="tool-doc" ;;
      esac
    fi

    if [ "$MODE" = "--apply" ]; then
      tmpf=$(mktemp)
      printf -- '---\nstatus: draft\nowner: operations\nlast_review: %s\ntype: %s\ntags:\n  - %s\n---\n\n' "$TODAY" "$type" "$tags" > "$tmpf"
      cat "$f" >> "$tmpf"
      mv "$tmpf" "$f"
    fi
    fm_added=$((fm_added + 1))
  fi

  # --- Detect existing wikilinks in body ---
  has_links=$(grep -o '\[\[[^]]*\]\]' "$f" 2>/dev/null | head -1 || true)
  if [ -n "$has_links" ]; then
    continue
  fi

  orphans=$((orphans + 1))

  # --- Find MOC for this orphan ---
  dir=$(dirname "$rel")
  parent="$dir"
  moc=""
  while [ "$parent" != "." ] && [ "$parent" != "/" ]; do
    if [ -f "$VAULT/$parent/README.md" ]; then
      moc="$parent/README"
      break
    fi
    if [ -f "$VAULT/$parent/index.md" ]; then
      moc="$parent/index"
      break
    fi
    parent=$(dirname "$parent")
  done
  if [ -z "$moc" ]; then
    # Fallback: use first directory component as MOC
    topdir=$(echo "$rel" | cut -d/ -f1)
    if [ -f "$VAULT/$topdir/README.md" ]; then
      moc="$topdir/README"
    elif [ -f "$VAULT/$topdir/index.md" ]; then
      moc="$topdir/index"
    fi
  fi
  if [ -z "$moc" ]; then
    moc="README"
  fi
  moc_label=$(basename "$(dirname "$moc")" 2>/dev/null || echo "$(echo "$moc" | sed 's/\/.*//')")

  # --- Apply links ---
  if [ "$MODE" = "--apply" ]; then
    cat >> "$f" << EOF

---

## Enlaces relacionados

- [[$moc|$moc_label]]
- [[README|Inicio]]
EOF
  fi
  links_added=$((links_added + 1))
done < <(find "$VAULT" -name "*.md" -not -path "*/node_modules/*" -not -path "*/vendor/*" \
  -not -path "*/.git/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/standalone/*" \
  -not -path "*/obsidian/cache/*" -not -path "*/obsidian/plugins/*" \
  -not -name "evergreen-claim.md" -not -name "moc-research.md" -not -name "source-note.md" \
  -print0 2>/dev/null)

echo ""
echo "========================================"
echo "  Results"
echo "========================================"
printf "  %-30s %5d\n" "Files scanned" "$total"
printf "  %-30s %5d\n" "Frontmatter added" "$fm_added"
printf "  %-30s %5d\n" "Orphans linked to MOC" "$links_added"
printf "  %-30s %5d\n" "Total orphans" "$orphans"
echo ""
if [ "$MODE" = "--dry-run" ]; then
  echo "  Run with --apply to apply changes."
fi
echo "========================================"
echo ""
