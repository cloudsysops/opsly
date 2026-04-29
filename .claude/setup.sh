#!/usr/bin/env bash
set -euo pipefail

# setup.sh — Configuración automática del entorno Opsly
# Uso: ./claude/setup.sh

echo "🚀 Configurando entorno Opsly para Claude Code..."

# 1. Dar permisos de ejecución a hooks
echo "📝 Configurando permisos de hooks..."
chmod +x .claude/4-hooks/*.sh
echo "   ✅ Permisos otorgados a .claude/4-hooks/*.sh"

# 2. Configurar git hooksPath
echo "🔗 Configurando git hooks..."
git config core.hooksPath .claude/4-hooks
CURRENT_HOOKS_PATH=$(git config core.hooksPath)
if [[ "$CURRENT_HOOKS_PATH" == ".claude/4-hooks" ]]; then
  echo "   ✅ Git hooks configurado: $CURRENT_HOOKS_PATH"
else
  echo "   ❌ Error al configurar git hooks."
  exit 1
fi

# 3. Instalar dependencias del proyecto
echo "📦 Instalando dependencias (npm ci)..."
if [[ -f "package-lock.json" ]]; then
  npm ci
  echo "   ✅ Dependencias instaladas."
else
  echo "   ⚠️  No se encontró package-lock.json. Omitiendo npm ci."
fi

# 4. Validar entorno
echo "🔍 Validando entorno..."

# Type-check
if grep -q '"type-check"' package.json 2>/dev/null; then
  echo "   Ejecutando type-check..."
  npm run type-check
  if [[ $? -eq 0 ]]; then
    echo "   ✅ Type-check passed."
  else
    echo "   ❌ Type-check failed. Revisa errores de TypeScript."
  fi
fi

# 5. Verificar herramientas requeridas
echo "🛠️  Verificando herramientas..."
TOOLS=("node" "npm" "git" "docker")
for tool in "${TOOLS[@]}"; do
  if command -v "$tool" &>/dev/null; then
    VERSION=$($tool --version 2>/dev/null | head -1 || echo "unknown")
    echo "   ✅ $tool: $VERSION"
  else
    echo "   ❌ $tool no encontrado. Instálalo antes de continuar."
  fi
done

# 6. Verificar .gitignore tiene CLAUDE.local.md
echo "📝 Verificando .gitignore..."
if ! grep -q "CLAUDE.local.md" .gitignore 2>/dev/null; then
  echo "   ➕ Añadiendo CLAUDE.local.md a .gitignore..."
  echo "" >> .gitignore
  echo "# Claude local config (ignored)" >> .gitignore
  echo ".claude/2-context-management/CLAUDE.local.md" >> .gitignore
  echo "   ✅ .gitignore actualizado."
else
  echo "   ✅ CLAUDE.local.md ya está en .gitignore."
fi

# 7. Crear CLAUDE.local.md si no existe
if [[ ! -f ".claude/2-context-management/CLAUDE.local.md" ]]; then
  echo "📄 Creando ejemplo CLAUDE.local.md..."
  cp .claude/2-context-management/CLAUDE.local.md .claude/2-context-management/CLAUDE.local.md.example 2>/dev/null || true
  echo "   ✅ Revisa .claude/2-context-management/CLAUDE.local.md (gitignored)."
fi

echo ""
echo "✅ Configuración completada."
echo ""
echo "📚 Próximos pasos:"
echo "   1. Revisar .claude/README.md para entender la estructura"
echo "   2. Usar comandos slash: /deploy, /tenant, /ai-cost"
echo "   3. Verificar hooks: git config core.hooksPath"
echo "   4. Leer AGENTS.md al iniciar Claude"
echo ""
echo "🔗 Enlaces rápidos:"
echo "   - AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md"
echo "   - VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md"
