#!/bin/bash
# sync-to-drive-oauth.sh — Sube docs a Drive usando OAuth usuario (cuenta personal)
# Automatiza sync post-commit o manual

set -euo pipefail

FOLDER_ID="1r8fFtPnYRCjH1OEzLmXe7u-vcpWGqnWf"
OUTPUT_DIR="/tmp/opsly-drive-sync"

# Check for OAuth credentials
TOKEN_FILE="${HOME}/.config/gcloud/opsly-drive-token.json"

if [[ ! -f "$TOKEN_FILE" ]]; then
    echo "❌ No hay credenciales OAuth"
    echo "📋 Ejecuta primero: ./scripts/setup-oauth-drive.sh"
    exit 1
fi

echo "📤 Sincronizando con Drive OAuth (tu cuenta)..."

python3 << PYEOF
import os
import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

TOKEN_FILE = os.environ['HOME'] + '/.config/gcloud/opsly-drive-token.json'
FOLDER_ID = "$FOLDER_ID"
UPLOAD_DIR = "$OUTPUT_DIR"

creds = Credentials.from_authorized_user_file(TOKEN_FILE, [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata'
])

service = build('drive', 'v3', credentials=creds)

files = os.listdir(UPLOAD_DIR)
print(f"📦 {len(files)} archivos para subir...")

for filename in files:
    filepath = os.path.join(UPLOAD_DIR, filename)
    query = f"name='{filename}' and '{FOLDER_ID}' in parents and trashed=false"
    existing = service.files().list(q=query, fields="files(id,name)").execute()
    
    media = MediaFileUpload(filepath, resumable=True)
    if existing.get('files'):
        file_id = existing['files'][0]['id']
        service.files().update(fileId=file_id, media_body=media).execute()
        print(f"🔄 {filename}")
    else:
        service.files().create(
            body={'name': filename, 'parents': [FOLDER_ID]},
            media_body=media
        ).execute()
        print(f"✅ {filename}")

print("🎉 Sync completo!")
PYEOF