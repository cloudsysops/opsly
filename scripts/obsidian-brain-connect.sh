#!/usr/bin/env bash
# Brain connectivity audit: escanea docs/ y reporta qué tan conectado está el vault.
# Uso: ./scripts/obsidian-brain-connect.sh [--json] [--report]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VAULT="${REPO_ROOT}/docs"
OUT_REPORT="${REPO_ROOT}/config/brain-connectivity.json"
MODE="${1:-plain}"

# Build array of full paths
declare -a paths
while IFS= read -r -d '' f; do
  paths+=("$f")
done < <(find "$VAULT" -name "*.md" -not -path "*/node_modules/*" -print0 2>/dev/null)

total=${#paths[@]}
total_links=0
files_with_tags=0
total_tags=0
broken_links=0
declare -a broken_link_list
declare -a orphan_list

for idx in "${!paths[@]}"; do
  f="${paths[$idx]}"
  content=$(<"$f")

  # Count wikilinks
  links=$(echo "$content" | grep -o '\[\[[^]]*\]\]' | sort -u 2>/dev/null || true)
  link_count=0
  if [ -n "$links" ]; then
    link_count=$(echo "$links" | grep -c . 2>/dev/null || echo 0)
  fi

  # Tags from frontmatter
  tags=$(echo "$content" | sed -n '/^---$/,/^---$/p' | grep -E '^\s+-\s+' | sed 's/^\s*-\s*//' || true)
  tag_count=$(echo "$tags" | grep -c . || true) || tag_count=0

  if [ "$link_count" -gt 0 ]; then
    total_links=$((total_links + link_count))
  else
    rel="${f#$VAULT/}"
    orphan_list+=("$rel")
  fi

  if [ "$tag_count" -gt 0 ]; then
    files_with_tags=$((files_with_tags + 1))
    total_tags=$((total_tags + tag_count))
  fi

  # Broken links: resolve [[target]] against filesystem ($VAULT/target.md)
  while IFS= read -r link; do
    target=$(echo "$link" | sed 's/\[\[//; s/\]\]//; s/|.*//' | tr -d ' ')
    if [ -n "$target" ]; then
      # Only flag as broken if it looks like a real doc link (not code snippet)
      if echo "$target" | grep -qE '^[a-zA-Z0-9_/-]+$'; then
        # Obsidian resolution order: 1) relative to file's directory, 2) vault-wide
        resolved=false
        dir=$(dirname "$f")
        if [ -f "$dir/$target.md" ]; then
          resolved=true
        elif [ -f "$VAULT/$target.md" ]; then
          resolved=true
        else
          # vault-wide search (Obsidian fallback)
          found=$(find "$VAULT" -maxdepth 10 -name "${target}.md" -not -path "*/node_modules/*" -print -quit 2>/dev/null)
          if [ -n "$found" ]; then
            resolved=true
          fi
        fi
        if [ "$resolved" = false ]; then
          broken_links=$((broken_links + 1))
          rel="${f#$VAULT/}"
          broken_link_list+=("$rel -> [[$target]]")
        fi
      fi
    fi
  done <<< "$links"
done

with_links=$((total - ${#orphan_list[@]}))
orphans=${#orphan_list[@]}
density=$(awk "BEGIN { if ($total > 0) printf \"%.2f\", $total_links / $total; else print \"0\" }" 2>/dev/null || echo "0")

if [ "$MODE" == "--json" ]; then
  cat > "$OUT_REPORT" <<EOF
{
  "version": 1,
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "vault": "$VAULT",
  "stats": {
    "total_files": $total,
    "files_with_wikilinks": $with_links,
    "orphans": $orphans,
    "total_wikilinks": $total_links,
    "files_with_tags": $files_with_tags,
    "total_tags": $total_tags,
    "broken_links": $broken_links,
    "link_density": $density
  },
  "health": $(if [ "$orphans" -lt "$((total / 2))" ] && [ "$broken_links" -lt 5 ]; then echo "\"good\""; elif [ "$orphans" -lt "$((total * 8 / 10))" ]; then echo "\"fair\""; else echo "\"poor\""; fi),
  "broken_links": $(if [ ${#broken_link_list[@]} -gt 0 ]; then printf '%s\n' "${broken_link_list[@]}" | jq -R -s -c 'split("\n") | map(select(length > 0))' 2>/dev/null || echo "[]"; else echo "[]"; fi)
}
EOF
  echo "[brain-connect] Reporte guardado en $OUT_REPORT"
else
  echo ""
  echo "========================================"
  echo "  Brain Connectivity Audit"
  echo "  Vault: docs/ ($total archivos .md)"
  echo "========================================"
  echo ""
  printf "  %-30s %5d\n" "Total archivos" "$total"
  printf "  %-30s %5d\n" "Con wikilinks" "$with_links"
  printf "  %-30s %5d\n" "Huérfanos (0 links)" "$orphans"
  printf "  %-30s %5d\n" "Total wikilinks" "$total_links"
  printf "  %-30s %5.2f\n" "Link density" "$density"
  printf "  %-30s %5d\n" "Archivos con tags" "$files_with_tags"
  printf "  %-30s %5d\n" "Tags totales" "$total_tags"
  printf "  %-30s %5d\n" "Links rotos" "$broken_links"
  echo ""
  if [ "$broken_links" -gt 0 ]; then
    echo "  Links rotos:"
    for bl in "${broken_link_list[@]}"; do
      echo "    ✗ $bl"
    done
    echo ""
  fi
  health=""
  if [ "$orphans" -lt "$((total / 2))" ] && [ "$broken_links" -lt 5 ]; then
    health="✅ SALUDABLE"
  elif [ "$orphans" -lt "$((total * 8 / 10))" ]; then
    health="⚠️ REGULAR — muchos huérfanos"
  else
    health="🔴 POBRE — la mayoria de docs no estan conectados"
  fi
  echo "  Salud del vault: $health"
  echo "========================================"
  echo ""
  echo "  Tip: abre docs/ como vault en Obsidian, filtra por path:brain"
  echo "  para ver el grafo del cerebro (28 nodos curados)."
  echo "========================================"
  echo ""
fi
