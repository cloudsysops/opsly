#!/bin/bash
# setup-oauth-drive.sh — Configura OAuth usuario para Drive automático
# Ejecutar UNA SOLA VEZ en el Mac del admin

set -euo pipefail

echo "🔐 Setup OAuth para Drive"
echo ""
echo "1. Abre el navegador y conectarte a tu cuenta Google (cboteros1@gmail.com)"
echo "2. Concede permisos"
echo ""

# Install dependencies
echo "📦 Instalando dependencias..."
pip3 install --quiet google-api-python-client google-auth-oauthlib 2>/dev/null || true

# Run OAuth flow
python3 << 'PYEOF'
import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata'
]

# Client secrets (crear en https://console.cloud.google.com/apis/credentials)
# Por ahora usamos installed app flow
CLIENT_CONFIG = {
    "installed": {
        "client_id": "TU_CLIENT_ID.apps.googleusercontent.com",
        "client_secret": "TU_CLIENT_SECRET",
        "redirect_uris": ["http://localhost"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
    }
}

# Check for existing token
TOKEN_FILE = os.path.expanduser("~/.config/gcloud/opsly-drive-token.json")
os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)

def get_drive_service():
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds and creds.valid:
            return build('drive', 'v3', credentials=creds)
    
    # Run OAuth flow
    flow = Flow.from_client_config(CLIENT_CONFIG, SCOPES)
    flow.redirect_uri = 'http://localhost'
    
    auth_url, _ = flow.authorization_url(prompt='consent')
    print(f"\n🌐 Abre esta URL en tu navegador:\n{auth_url}\n")
    
    code = input("📋 Pega el código de autorización aquí: ").strip()
    
    flow.fetch_token(code=code)
    creds = flow.credentials
    
    # Save token
    creds.to_json().to_file(TOKEN_FILE)
    print(f"✅ Token guardado en {TOKEN_FILE}")
    
    return build('drive', 'v3', credentials=creds)

print("ℹ️ Este script requiere crear OAuth Client ID en Google Cloud Console")
print("📝 Pasos:")
echo "1. Ve a: https://console.cloud.google.com/apis/credentials"
echo "2. Crea 'OAuth client ID' → 'Desktop app'"
echo "3. Descarga el JSON y reemplaza CLIENT_CONFIG arriba"
echo ""
echo "Una vez configurado, ejecuta: ./scripts/sync-to-drive-oauth.sh"
PYEOF

echo ""
echo "📋 Ejecuta los pasos de arriba y luego ejecuta:"
echo "   ./scripts/sync-to-drive-oauth.sh"
echo ""
echo "💡 Alternativamente, puedes configurar en Doppler:"
echo "   doppler secrets set GOOGLE_USER_CREDENTIALS_JSON" 
echo "   < ~/.config/gcloud/application_default_credentials.json"