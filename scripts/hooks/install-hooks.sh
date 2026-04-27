#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "📦 Instalando hooks de protección..."

mkdir -p .githooks .husky

cat > .githooks/pre-push <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Validando antes de push..."
npm run validate-structure --silent
bash scripts/hooks/structure-guard.sh
echo "✅ Listo para push"
EOF

chmod +x scripts/hooks/structure-guard.sh scripts/hooks/install-hooks.sh .githooks/pre-push

if [[ -f .husky/pre-push ]]; then
  cp .husky/pre-push .husky/pre-push.bak
fi
cat > .husky/pre-push <<'EOF'
#!/usr/bin/env sh
set -e
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 1
if [ -x "$ROOT/.githooks/pre-push" ]; then
  exec "$ROOT/.githooks/pre-push" "$@"
fi
echo "husky pre-push: .githooks/pre-push no encontrado o sin permisos" >&2
exit 1
EOF
chmod +x .husky/pre-push

if [[ -f .husky/pre-commit ]]; then
  chmod +x .husky/pre-commit
fi

echo "✅ Hook pre-push instalado en .githooks y delegado desde Husky"
echo "ℹ️ Hook activo actual: $(git config --get core.hooksPath || echo '.git/hooks (default)')"
echo "🎉 Instalación completada"
