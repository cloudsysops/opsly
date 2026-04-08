# Google Cloud Setup — Opsly

## Proyecto
- ID: opsly-platform (o el que se creó)
- Cuenta: cboteros1@gmail.com
- Sin organización

## APIs habilitadas
- [x] Google Drive API
- [ ] Google Sheets API → habilitar en console
- [ ] BigQuery API → habilitar en fase 1
- [ ] Cloud Run API → habilitar en fase 1
- [ ] Vertex AI API → habilitar en fase 2

## Service Account
- Nombre: opsly-drive-sync
- Email: opsly-drive-sync@opsly-platform.iam.gserviceaccount.com
- Key: `GOOGLE_SERVICE_ACCOUNT_JSON` en Doppler `prd`

### Cargar el JSON completo (la UI suele truncar al pegar)

Usa la CLI para subir el archivo sin cortes:

```bash
doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON \
  --project ops-intcloudsysops --config prd \
  < /ruta/a/tu/opslyquantum-xxxx.json
```

En **local** (Mac): alternativa sin tocar Doppler — en `.env.local` define ruta absoluta:

- `GOOGLE_SERVICE_ACCOUNT_JSON_FILE=/Users/tuusuario/organizations/intcloudsysops/opslyquantum-b1e76ceb1934.json`

`scripts/lib/google-auth.sh` lee ese archivo con prioridad si no hay JSON inline válido.

## Billing
- Alert: $10/mes configurado
- Free tier cubre todo el uso actual

## Carpeta Drive compartida
- Nombre: Opsly
- ID: 1r8fFtPnYRCjH1OEzLmXe7u-vcpWGqnWf
- Compartir en Drive (Editor) con el **client_email** del JSON (ej. `opsly-drive-sync@opslyquantum.iam.gserviceaccount.com`). Si no, `./scripts/drive-sync.sh` obtiene token OK pero responde **HTTP 403**.

