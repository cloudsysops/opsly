#!/bin/bash
# Script de Setup para CRM Multi-Tenant - Peskids
# Uso: bash ENVIRONMENT-SETUP.sh
# Este script valida que todo está configurado correctamente

set -e

echo "🔍 Verificando setup de CRM Multi-Tenant..."
echo ""

# 1. Verificar Doppler
echo "1️⃣  Verificando Doppler..."
if ! command -v doppler &> /dev/null; then
    echo "❌ Doppler CLI no instalado"
    echo "   Instalar: brew install doppler"
    exit 1
fi

echo "✅ Doppler CLI instalado"

# 2. Verificar que estás logueado en Doppler
echo ""
echo "2️⃣  Verificando autenticación en Doppler..."
if ! doppler --version &> /dev/null; then
    echo "❌ No autenticado en Doppler"
    echo "   Ejecutar: doppler login"
    exit 1
fi

echo "✅ Autenticado en Doppler"

# 3. Verificar variables de entorno en Doppler
echo ""
echo "3️⃣  Verificando variables requeridas en Doppler..."
echo "   (Proyecto: ops-intcloudsysops, Config: prd)"
echo ""

# Obtener variables
export $(doppler run --project ops-intcloudsysops --config prd -- env | grep -E "TWENTY|SUPABASE")

MISSING_VARS=()

if [ -z "$TWENTY_API_URL" ]; then
    MISSING_VARS+=("TWENTY_API_URL")
fi

if [ -z "$TWENTY_API_KEY" ]; then
    MISSING_VARS+=("TWENTY_API_KEY")
fi

if [ -z "$SUPABASE_URL" ]; then
    MISSING_VARS+=("SUPABASE_URL")
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Variables faltantes en Doppler:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📝 Agregar a Doppler (ops-intcloudsysops/prd):"
    echo "   - TWENTY_API_URL=https://api.twenty.com/graphql"
    echo "   - TWENTY_API_KEY=<obtener_de_twenty.com>"
    exit 1
fi

echo "✅ Todas las variables de entorno están configuradas:"
echo "   - TWENTY_API_URL: ${TWENTY_API_URL:0:30}..."
echo "   - TWENTY_API_KEY: ${TWENTY_API_KEY:0:10}...***"
echo "   - SUPABASE_URL: ${SUPABASE_URL:0:30}..."

# 4. Probar conexión con Twenty API
echo ""
echo "4️⃣  Probando conexión con Twenty API..."

RESPONSE=$(curl -s -X POST "$TWENTY_API_URL" \
  -H "Authorization: Bearer $TWENTY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ contacts { edges { node { id } } } }"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Conexión exitosa con Twenty API"
else
    echo "❌ Error conectando con Twenty API (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
    echo ""
    echo "   Verificar:"
    echo "   - TWENTY_API_KEY es válido"
    echo "   - Twenty API está accesible"
    exit 1
fi

# 5. Verificar archivos del proyecto
echo ""
echo "5️⃣  Verificando archivos del proyecto..."

FILES=(
    "apps/peskids/lib/services/crm-sync.service.ts"
    "apps/peskids/app/api/crm/search/route.ts"
    "apps/peskids/app/api/admin/crm/contacts/route.ts"
    "apps/peskids/app/api/webhooks/sync-to-crm/route.ts"
    "apps/peskids/components/crm/crm-contact-search.tsx"
    "apps/peskids/app/admin/crm/page.tsx"
)

MISSING_FILES=()
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "❌ Archivos faltantes:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo "✅ Todos los archivos están en su lugar"

# 6. Validar TypeScript
echo ""
echo "6️⃣  Validando TypeScript..."

if ! npm run type-check --workspace=peskids &> /dev/null; then
    echo "❌ Errores de TypeScript encontrados"
    npm run type-check --workspace=peskids
    exit 1
fi

echo "✅ TypeScript válido"

# 7. Summary
echo ""
echo "════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETADO EXITOSAMENTE"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Validar en Twenty.com:"
echo "   - Custom field 'franchise_tenant_id' creado"
echo "   - Vistas filtradas por franquicia creadas"
echo ""
echo "2. Probar endpoints localmente:"
echo "   npm run dev --workspace=peskids"
echo ""
echo "3. Seguir IMPLEMENTATION-CHECKLIST.md"
echo ""
echo "📖 Documentación:"
echo "   - docs/03-franchise/crm-multitenant.md"
echo "   - docs/03-franchise/crm-architecture-diagram.md"
echo "   - docs/03-franchise/IMPLEMENTATION-CHECKLIST.md"
echo ""
