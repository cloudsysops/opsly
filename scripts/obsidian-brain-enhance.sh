#!/usr/bin/env bash
# Brain enhancement: adds frontmatter + wikilinks to orphan docs.
# Uso: ./scripts/obsidian-brain-enhance.sh [--dry-run|--apply]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VAULT="${REPO_ROOT}/docs"
MODE="${1:---dry-run}"
TODAY=$(date -u +%Y-%m-%d)

fm_added=0
links_added=0
orphans=0
total=0

echo ""
echo "========================================"
echo "  Brain Enhancement"
echo "  Vault: docs/"
echo "  Mode: $MODE"
echo "========================================"
echo ""

while IFS= read -r -d '' f; do
  rel="${f#$VAULT/}"
  total=$((total + 1))

  # Skip brain/ and obsidian templates/inbox
  case "$rel" in brain/*|obsidian/inbox/*|obsidian/templates/*) continue ;; esac

  first=$(head -1 "$f" 2>/dev/null || true)

  # --- Frontmatter ---
  if [ "$first" != "---" ]; then
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
      history/*)         tags="opsly/history";      type="archive" ;;
      testing/*)         tags="opsly/testing";      type="test-doc" ;;
      obsidian/*)        tags="opsly/obsidian";     type="note" ;;
    esac

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
  while [ "$parent" != "." ]; do
    if [ -f "$VAULT/$parent/README.md" ]; then
      moc="$parent/README"
      break
    fi
    parent=$(dirname "$parent")
  done
  if [ -z "$moc" ]; then
    moc="brain/README"
  fi
  moc_label=$(basename "$(dirname "$moc")" 2>/dev/null || echo "hub")

  # --- Apply links ---
  if [ "$MODE" = "--apply" ]; then
    cat >> "$f" << EOF

---

## Enlaces relacionados

- [[$moc|$moc_label]]
- [[brain/README|Brain Central]]
EOF
  fi
  links_added=$((links_added + 1))
done < <(find "$VAULT" -name "*.md" -not -path "*/node_modules/*" -not -path "*/brain/*" -not -path "*/obsidian/inbox/*" -not -path "*/obsidian/templates/*" -not -name "evergreen-claim.md" -not -name "moc-research.md" -not -name "source-note.md" -print0 2>/dev/null)

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
