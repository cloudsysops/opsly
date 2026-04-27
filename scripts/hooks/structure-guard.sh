#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "🔍 Validando integridad de estructura..."

errors=0

is_ignored_path() {
  local file="$1"
  [[ "$file" == node_modules/* ]] || [[ "$file" == dist/* ]] || [[ "$file" == .next/* ]] || [[ "$file" == .git/* ]] || [[ "$file" == scripts/hooks/structure-guard.sh ]] || [[ "$file" == scripts/sync-references.sh ]] || [[ "$file" == scripts/tests/structure-integrity.test.js ]] || [[ "$file" == scripts/hooks/structure-guard.sh ]] || [[ "$file" == scripts/sync-references.sh ]] || [[ "$file" == scripts/tests/structure-integrity.test.js ]]
}

check_forbidden_pattern() {
  local pattern="$1"
  local message="$2"
  local files=""

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if is_ignored_path "$file"; then
      continue
    fi
    if rg -n "$pattern" "$file" >/dev/null 2>&1; then
      files+="$file"$'\n'
    fi
  done < <(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

  if [[ -n "$files" ]]; then
    echo "❌ BLOQUEADO: $message"
    echo "   Archivos afectados:"
    printf "%s" "$files" | sed '/^$/d' | sort -u
    return 1
  fi
  return 0
}

check_forbidden_pattern '(^|[^A-Za-z0-9_./-])\./logs(/|$)' "Referencia a ./logs obsoleta. Use ./runtime/logs//" || ((errors++))
check_forbidden_pattern '(^|[^A-Za-z0-9_./-])\./tenants(/|$)' "Referencia a ./tenants obsoleta. Use ./runtime/tenants//" || ((errors++))
check_forbidden_pattern '(^|[^A-Za-z0-9_./-])\./letsencrypt(/|$)' "Referencia a ./letsencrypt obsoleta. Use ./runtime/letsencrypt//" || ((errors++))
check_forbidden_pattern '/opt/opsly/logs' "Ruta /opt/opsly/logs obsoleta. Use /opt/opsly/runtime/logs//" || ((errors++))
check_forbidden_pattern '/opt/opsly/tenants' "Ruta /opt/opsly/tenants obsoleta. Use /opt/opsly/runtime/tenants//" || ((errors++))
check_forbidden_pattern '(^|[^A-Za-z0-9_./-])agents/prompts' "Referencia agents/prompts obsoleta. Use tools/agents/prompts" || ((errors++))
check_forbidden_pattern '(^|[^A-Za-z0-9_./-])\./workspaces(/|$)|(^|[^A-Za-z0-9_./-])workspaces/' "Referencia workspaces obsoleta. Use tools/workspaces" || ((errors++))
check_forbidden_pattern '(^|[^A-Za-z0-9_./-])\./cli(/|$)|(^|[^A-Za-z0-9_./-])cli/' "Referencia cli obsoleta. Use tools/cli" || ((errors++))

for required in runtime tools/agents tools/workspaces tools/cli; do
  if [[ ! -d "$required" ]]; then
    echo "❌ ERROR: Directorio requerido no existe: $required"
    ((errors++))
  fi
done

for forbidden in logs tenants letsencrypt agents workspaces cli; do
  if [[ -d "$forbidden" ]]; then
    echo "❌ ERROR: Directorio prohibido en raíz: $forbidden"
    ((errors++))
  fi
done

if (( errors > 0 )); then
  echo ""
  echo "🚫 Commit bloqueado. Corrige los errores antes de continuar."
  exit 1
fi

echo "✅ Estructura validada correctamente"
