#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔄 Sincronizando referencias de estructura..."

safe_replace() {
  local old_pattern="$1"
  local new_pattern="$2"
  local description="$3"
  echo "  📝 $description"

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    perl -0pi -e "s|$old_pattern|$new_pattern|g" "$file"
  done < <(
    rg -l --hidden \
      --glob '*.{ts,tsx,js,mjs,cjs,sh,yml,yaml,json,md}' \
      --glob '!node_modules/**' \
      --glob '!dist/**' \
      --glob '!.next/**' \
      --glob '!.git/**' \
      --glob '!.turbo/**' \
      "$old_pattern" .
  )
}

safe_replace '\./runtime/logs/' './runtime/logs/' 'Actualizando referencias ./runtime/logs/'
safe_replace '\./runtime/tenants/' './runtime/tenants/' 'Actualizando referencias ./runtime/tenants/'
safe_replace '\./runtime/letsencrypt/' './runtime/letsencrypt/' 'Actualizando referencias ./runtime/letsencrypt/'
safe_replace 'tools/agents/prompts' 'tools/agents/prompts' 'Actualizando referencias tools/agents/prompts'
safe_replace '/opt/opsly/runtime/logs/' '/opt/opsly/runtime/logs/' 'Actualizando rutas absolutas de logs'
safe_replace '/opt/opsly/runtime/tenants/' '/opt/opsly/runtime/tenants/' 'Actualizando rutas absolutas de tenants'
safe_replace 'apps/experimental/context-builder-v2-archive/' 'apps/experimental/context-builder-v2-archive/' 'Actualizando referencias context-builder-v2'

echo ""
echo "✅ Sincronización completada"
echo "📋 Próximos pasos:"
echo "   1. Revisa: git diff"
echo "   2. Ejecuta: npm run validate-structure"
echo "   3. Ejecuta: npm run test-structure"
