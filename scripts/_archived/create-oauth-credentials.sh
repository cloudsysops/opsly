#!/bin/bash
# create-oauth-credentials.sh — Crea credenciales OAuth para Drive automático
# Ejecución única en Mac del admin

set -euo pipefail

TOKEN_FILE="${HOME}/.config/gcloud/opsly-drive-token.json"

echo "🔐 Creando credenciales OAuth para Drive..."

# Create creds dir
mkdir -p "${HOME}/.config/gcloud"

# Run gcloud auth
echo "📋 Concede acceso a tu cuenta Google:"
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/drive.file

# Copy to our token file
if [[ -f "${HOME}/.config/gcloud/application_default_credentials.json" ]]; then
    cp "${HOME}/.config/gcloud/application_default_credentials.json" "$TOKEN_FILE"
    echo "✅ Token guardado en: $TOKEN_FILE"
else
    echo "❌ No se crearon credenciales"
    exit 1
fi

# Save to Doppler (opcional)
echo ""
echo "📤 Guardando en Doppler (opcional)..."
read -p "¿Subir a Doppler? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    doppler secrets set GOOGLE_USER_CREDENTIALS_JSON \
      --project ops-intcloudsysops --config prd \
      < "$TOKEN_FILE" 2>/dev/null && echo "✅ Guardado en Doppler" || echo "⚠️ Error en Doppler"
fi

echo ""
echo "🎉 Listo! Ahora los agentes pueden sincronizar automáticamente."
echo "   Token: $TOKEN_FILE"