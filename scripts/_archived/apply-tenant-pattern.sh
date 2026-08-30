#!/usr/bin/env bash
# Resolve tenant capabilities from pattern catalog (read-only planning helper).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TENANT_SLUG=""
EXTRA_PATTERNS=""
JSON_ONLY=false

usage() {
  cat <<'EOF'
Usage: ./scripts/apply-tenant-pattern.sh --slug SLUG [--pattern ID] [--json]

Loads config/tenants/SLUG.json (if present) and merges pattern_ids via pattern catalog.
Does not write files — use output to update tenant JSON manually or in automation.

Examples:
  ./scripts/apply-tenant-pattern.sh --slug peskids
  ./scripts/apply-tenant-pattern.sh --slug panini-lab --pattern incubator-app --json
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      TENANT_SLUG="${2:?missing slug}"
      shift 2
      ;;
    --pattern)
      EXTRA_PATTERNS="${EXTRA_PATTERNS}${EXTRA_PATTERNS:+,}${2:?missing pattern id}"
      shift 2
      ;;
    --json)
      JSON_ONLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TENANT_SLUG" ]]; then
  echo "Missing --slug" >&2
  usage
  exit 1
fi

CONFIG_PATH="$REPO_ROOT/config/tenants/${TENANT_SLUG}.json"
if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Tenant config not found: $CONFIG_PATH" >&2
  exit 1
fi

cd "$REPO_ROOT"

export TENANT_SLUG CONFIG_PATH EXTRA_PATTERNS JSON_ONLY
node --import tsx <<'NODE'
import { readFileSync } from 'node:fs';
import {
  enrichTenantProfile,
  suggestTenantPatternsForStack,
} from './lib/pattern-catalog/src/index.ts';

const slug = process.env.TENANT_SLUG ?? '';
const configPath = process.env.CONFIG_PATH ?? '';
const extra = (process.env.EXTRA_PATTERNS ?? '').split(',').filter(Boolean);
const jsonOnly = process.env.JSON_ONLY === 'true';

const raw = readFileSync(configPath, 'utf8');
const base = JSON.parse(raw) as {
  stack_type?: string;
  pattern_ids?: string[];
};
const stackPatterns = base.stack_type
  ? suggestTenantPatternsForStack(base.stack_type).map((p) => p.id)
  : [];
const pattern_ids = [...new Set([...(base.pattern_ids ?? []), ...stackPatterns, ...extra])];
const enriched = enrichTenantProfile({ ...base, tenant_slug: slug, pattern_ids });

if (jsonOnly) {
  console.log(JSON.stringify(enriched, null, 2));
} else {
  console.log('Tenant:', slug);
  console.log('pattern_ids:', enriched.pattern_ids.join(', ') || '(none)');
  console.log('capabilities:', enriched.capabilities.join(', ') || '(none)');
  console.log('modules:', enriched.modules.join(', ') || '(none)');
  console.log('harness_patterns:', enriched.harness_patterns.join(', ') || '(none)');
  console.log('scripts:', enriched.scripts.join(', ') || '(none)');
}
NODE
