#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BASELINE_FILE="${SCRIPT_DIR}/ghl-runtime-baseline.txt"
PATTERN='GoHighLevel|gohighlevel|GHL_|PESKIDS_GHL'

cd "$ROOT"

collect_current() {
  local matches
  matches="$(
    git grep -I -n -E "$PATTERN" -- \
      ':!docs/**' \
      ':!AGENTS.md' \
      ':!.github/AGENTS.md' \
      ':!OPSLY_CONTEXT.md' \
      ':!AGENCY_CONTEXT.md' \
      ':!config/knowledge-index.json' \
      ':!context/**' \
      ':!runtime/context/**' \
      ':!output/**' \
      ':!**/__tests__/**' \
      ':!**/*.test.*' \
      ':!**/*.spec.*' \
      ':!**/migrations/**' \
      ':!supabase/migrations/**' \
      ':!apps/experimental/**' \
      ':!scripts/ci/check-no-new-ghl-runtime.sh' \
      ':!scripts/ci/ghl-runtime-baseline.txt' \
      ':!scripts/ci/test-ghl-runtime-guard.sh' \
      ':!scripts/ci/validate-academy-blueprint.mjs' \
      || true
  )"

  if [[ -z "$matches" ]]; then
    return 0
  fi

  printf '%s\n' "$matches" \
    | awk -F: '{ count[$1] += 1 } END { for (file in count) print count[file], file }' \
    | LC_ALL=C sort -k2
}

if [[ "${1:-}" == "--print-current" ]]; then
  collect_current
  exit 0
fi

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "GHL runtime guard: missing baseline ${BASELINE_FILE#$ROOT/}" >&2
  exit 1
fi

current_file="$(mktemp)"
trap 'rm -f "$current_file"' EXIT
collect_current >"$current_file"

if ! diff -u "$BASELINE_FILE" "$current_file"; then
  echo >&2
  echo "GHL runtime guard: active legacy CRM references changed." >&2
  echo "New references are forbidden. Reductions are allowed after updating the reviewed baseline." >&2
  echo "Historical docs, tests and migrations are explicitly outside this gate." >&2
  exit 1
fi

echo "GHL runtime guard: OK ($(wc -l <"$current_file" | tr -d ' ') grandfathered files)"
