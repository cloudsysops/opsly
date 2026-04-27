#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
WHITELIST_FILE="$ROOT_DIR/config/root-whitelist.json"
cd "$ROOT_DIR"

echo "🔍 Validando integridad de estructura..."

errors=0

is_ignored_path() {
  local file="$1"
  [[ "$file" == node_modules/* ]] || [[ "$file" == dist/* ]] || [[ "$file" == .next/* ]] || [[ "$file" == .git/* ]]
}

is_rule_definition_file() {
  local file="$1"
  [[ "$file" == "scripts/hooks/structure-guard.sh" ]] || \
    [[ "$file" == "scripts/tests/structure-integrity.test.js" ]] || \
    [[ "$file" == "scripts/tests/whitelist.test.js" ]] || \
    [[ "$file" == "scripts/sync-references.sh" ]] || \
    [[ "$file" == "docs/00-architecture/hooks-system.md" ]]
}

check_forbidden_path() {
  local pattern="$1"
  local message="$2"
  local files=""

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if is_ignored_path "$file" || is_rule_definition_file "$file"; then
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

check_root_whitelist() {
  echo ""
  echo "📋 Verificando whitelist de archivos en raíz..."

  if [[ ! -f "$WHITELIST_FILE" ]]; then
    echo "⚠️ Archivo de whitelist no encontrado: $WHITELIST_FILE"
    return 0
  fi

  local root_files
  root_files="$(git diff --cached --name-only --diff-filter=AC 2>/dev/null | rg '^[^/]+$' || true)"
  if [[ -z "$root_files" ]]; then
    echo "  ✅ No hay archivos nuevos en raíz"
    return 0
  fi

  local allowed_files blocked_patterns
  allowed_files="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('$WHITELIST_FILE','utf8'));console.log((d.allowed_files||[]).join('\n'))")"
  blocked_patterns="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('$WHITELIST_FILE','utf8'));console.log((d.blocked_patterns||[]).join('\n'))")"

  local whitelist_errors=0
  local blocked_files=""

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if echo "$allowed_files" | rg -x "$file" >/dev/null 2>&1; then
      echo "  ✅ $file (permitido)"
      continue
    fi

    local is_blocked=false
    while IFS= read -r pattern; do
      [[ -z "$pattern" ]] && continue
      if [[ "$file" == $pattern ]]; then
        is_blocked=true
        break
      fi
    done <<< "$blocked_patterns"

    if [[ "$is_blocked" == true ]]; then
      blocked_files="$blocked_files"$'\n'"  ❌ $file (patrón bloqueado)"
    else
      blocked_files="$blocked_files"$'\n'"  ⚠️ $file (no está en whitelist)"
    fi
    ((whitelist_errors++))
  done <<< "$root_files"

  if (( whitelist_errors > 0 )); then
    echo ""
    echo "🚫 ARCHIVOS BLOQUEADOS EN RAÍZ:"
    echo "$blocked_files"
    echo ""
    echo "💡 Para permitir estos archivos:"
    echo "   1. Edita config/root-whitelist.json"
    echo "   2. Añade el nombre a allowed_files"
    return 1
  fi

  return 0
}

check_root_folders_whitelist() {
  echo ""
  echo "📁 Verificando carpetas nuevas en raíz..."

  if [[ ! -f "$WHITELIST_FILE" ]]; then
    echo "⚠️ Archivo de whitelist no encontrado: $WHITELIST_FILE"
    return 0
  fi

  local root_folders
  root_folders="$(git diff --cached --name-only --diff-filter=A 2>/dev/null | rg '/' | cut -d'/' -f1 | sort -u || true)"

  if [[ -z "$root_folders" ]]; then
    echo "  ✅ No hay carpetas nuevas en raíz"
    return 0
  fi

  local allowed_folders
  allowed_folders="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('$WHITELIST_FILE','utf8'));console.log((d.allowed_folders||[]).join('\n'))")"

  local folder_errors=0
  local blocked_folders=""

  while IFS= read -r folder; do
    [[ -z "$folder" ]] && continue
    if echo "$allowed_folders" | rg -x "$folder" >/dev/null 2>&1; then
      echo "  ✅ $folder/ (permitido)"
    else
      blocked_folders="$blocked_folders"$'\n'"  ❌ $folder/ (no está en allowed_folders)"
      ((folder_errors++))
    fi
  done <<< "$root_folders"

  if (( folder_errors > 0 )); then
    echo ""
    echo "🚫 CARPETAS BLOQUEADAS EN RAÍZ:"
    echo "$blocked_folders"
    echo ""
    echo "💡 Para permitir estas carpetas:"
    echo "   1. Edita config/root-whitelist.json"
    echo "   2. Añade el nombre a allowed_folders"
    return 1
  fi

  return 0
}

check_hidden_folders_whitelist() {
  echo ""
  echo "🔒 Verificando carpetas ocultas en raíz..."

  if [[ ! -f "$WHITELIST_FILE" ]]; then
    echo "⚠️ Archivo de whitelist no encontrado: $WHITELIST_FILE"
    return 0
  fi

  local staged_hidden existing_hidden all_hidden
  staged_hidden="$(git diff --cached --name-only --diff-filter=A 2>/dev/null | rg '^\\.' | rg '/' | cut -d'/' -f1 | sort -u || true)"
  existing_hidden="$(ls -la "$ROOT_DIR" 2>/dev/null | rg '^d' | awk '{print $NF}' | rg '^\\.' | rg -v '^\\.$|^\\.\\.$' || true)"
  all_hidden="$(printf "%s\n%s\n" "$staged_hidden" "$existing_hidden" | sort -u | rg -v '^$' || true)"

  if [[ -z "$all_hidden" ]]; then
    echo "  ✅ No hay carpetas ocultas para validar"
    return 0
  fi

  local allowed_hidden blocked_hidden_patterns
  allowed_hidden="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('$WHITELIST_FILE','utf8'));console.log((d.allowed_hidden_folders||[]).join('\n'))")"
  blocked_hidden_patterns="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('$WHITELIST_FILE','utf8'));console.log((d.blocked_hidden_patterns||[]).join('\n'))")"

  local hidden_errors=0
  local blocked_folders=""

  while IFS= read -r folder; do
    [[ -z "$folder" ]] && continue

    if echo "$allowed_hidden" | rg -x "$folder" >/dev/null 2>&1; then
      echo "  ✅ $folder/ (permitido)"
      continue
    fi

    local is_blocked=false
    while IFS= read -r pattern; do
      [[ -z "$pattern" ]] && continue
      if [[ "$folder" == $pattern ]]; then
        is_blocked=true
        break
      fi
    done <<< "$blocked_hidden_patterns"

    if [[ "$is_blocked" == true ]]; then
      blocked_folders="$blocked_folders"$'\n'"  ❌ $folder/ (patrón bloqueado)"
    else
      blocked_folders="$blocked_folders"$'\n'"  ⚠️ $folder/ (no está en allowed_hidden_folders)"
    fi
    ((hidden_errors++))
  done <<< "$all_hidden"

  if (( hidden_errors > 0 )); then
    echo ""
    echo "🚫 CARPETAS OCULTAS NO AUTORIZADAS:"
    echo "$blocked_folders"
    echo ""
    echo "💡 Para permitir estas carpetas:"
    echo "   1. Edita config/root-whitelist.json"
    echo "   2. Añade el nombre a allowed_hidden_folders"
    return 1
  fi

  return 0
}

check_forbidden_path '(^|[^A-Za-z0-9_./-])\./logs(/|$)' "Referencia a ./logs obsoleta. Use ./runtime/logs/" || ((errors++))
check_forbidden_path '(^|[^A-Za-z0-9_./-])\./tenants(/|$)' "Referencia a ./tenants obsoleta. Use ./runtime/tenants/" || ((errors++))
check_forbidden_path '(^|[^A-Za-z0-9_./-])\./letsencrypt(/|$)' "Referencia a ./letsencrypt obsoleta. Use ./runtime/letsencrypt/" || ((errors++))
check_forbidden_path '/opt/opsly/logs' "Ruta /opt/opsly/logs obsoleta. Use /opt/opsly/runtime/logs/" || ((errors++))
check_forbidden_path '/opt/opsly/tenants' "Ruta /opt/opsly/tenants obsoleta. Use /opt/opsly/runtime/tenants/" || ((errors++))
check_forbidden_path '(^|[^A-Za-z0-9_./-])agents/prompts([^A-Za-z0-9_./-]|$)' "Referencia agents/prompts en raíz. Use tools/agents/prompts/" || ((errors++))
check_forbidden_path '(^|[^A-Za-z0-9_./-])\./workspaces(/|$)' "Referencia ./workspaces obsoleta. Use ./tools/workspaces/" || ((errors++))
check_forbidden_path '(^|[^A-Za-z0-9_./-])\./cli(/|$)' "Referencia ./cli obsoleta. Use ./tools/cli/" || ((errors++))

for required in runtime runtime/logs runtime/tenants runtime/letsencrypt tools/agents tools/workspaces tools/cli; do
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

check_root_whitelist || ((errors++))
check_root_folders_whitelist || ((errors++))
check_hidden_folders_whitelist || ((errors++))

if (( errors > 0 )); then
  echo ""
  echo "🚫 Commit bloqueado. Corrige los errores antes de continuar."
  exit 1
fi

echo ""
echo "✅ Estructura validada correctamente"
