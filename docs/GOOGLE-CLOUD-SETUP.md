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
- Compartir en Drive (Editor o **Content manager** en Shared Drive) con el **client_email** del JSON (ej. `opsly-drive-sync@opslyquantum.iam.gserviceaccount.com`).
- **Importante (cuota):** una _service account_ **no tiene cuota en “Mi unidad” personal**. Si la carpeta está solo en tu Drive personal, la API devuelve **403** con `storageQuotaExceeded`. Solución: crear o mover la carpeta **Opsly** dentro de un **[Shared Drive](https://developers.google.com/workspace/drive/api/guides/about-shareddrives)** (Drive compartido de Google Workspace) y dar acceso a la SA ahí; o subir con OAuth en nombre de un usuario en lugar de la SA.

## OAuth usuario (ADC) para `drive-sync` en Mi unidad

`gcloud` exige incluir el scope de Cloud Platform junto a `drive.file`:

```bash
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/drive.file
```

Luego subir el JSON a Doppler (sin pegar el valor en chat):

```bash
doppler secrets set GOOGLE_USER_CREDENTIALS_JSON \
  --project ops-intcloudsysops --config prd \
  < ~/.config/gcloud/application_default_credentials.json
```

`scripts/drive-sync.sh` usa por defecto `GOOGLE_AUTH_STRATEGY=user_first` (ver `scripts/lib/google-auth.sh`): intenta refrescar token de usuario antes que la SA.
