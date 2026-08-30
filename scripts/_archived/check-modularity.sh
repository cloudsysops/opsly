#!/usr/bin/env bash
# Lightweight modularity guard — warns on common duplication anti-patterns.
# Usage: ./scripts/check-modularity.sh [--strict]
# Exit 0 = no warnings (or warnings only); exit 1 with --strict if any warning.
set -euo pipefail

STRICT=false
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=true
fi

WARN=0

warn() {
  echo "WARN(modularity): $*" >&2
  WARN=$((WARN + 1))
}

# Re-export-only client shims in tenant apps must stay thin (>15 lines → warn)
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  lines=$(wc -l < "$f" | tr -d ' ')
  if [[ "$lines" -gt 15 ]] && grep -qE 're-export|@intcloudsysops' "$f" 2>/dev/null; then
    warn "$f has $lines lines — move logic to lib/, keep tenant shim thin"
  fi
done < <(find apps/peskids apps/panini-lab apps/portal apps/admin -path '*/lib/*-client.ts' 2>/dev/null || true)

# Duplicate integration client filenames across tenant apps (same basename)
dupes=$(find apps -path '*/lib/*client*.ts' ! -path '*/node_modules/*' 2>/dev/null \
  | xargs -I{} basename {} \
  | sort | uniq -d || true)
if [[ -n "$dupes" ]]; then
  while IFS= read -r base; do
    [[ -z "$base" ]] && continue
    [[ "$base" == "openwa-client.ts" ]] && continue
    warn "duplicate client basename $base under apps/*/lib — consolidate to lib/"
  done <<< "$dupes"
fi

# Hardcoded tenant slug branches in product code (exclude tests and registry lookups)
if rg -l "slug === ['\"]peskids['\"]|tenant === ['\"]peskids['\"]" \
  apps/api/lib apps/peskids apps/panini-lab apps/admin/components \
  --glob '*.ts' --glob '*.tsx' \
  --glob '!**/__tests__/**' \
  --glob '!**/incubation-machine.ts' \
  2>/dev/null | head -5 | grep -q .; then
  warn "hardcoded peskids slug branch found — prefer config/tenants + @intcloudsysops/tenant-profile"
fi

if [[ "$WARN" -gt 0 ]]; then
  echo "Modularity check: $WARN warning(s). See docs/01-development/MODULARITY-CONTRACT.md" >&2
  [[ "$STRICT" == true ]] && exit 1
fi

echo "Modularity check: OK ($WARN warnings)"
exit 0
