# Vertex AI Setup (embeddings)

Guía para habilitar **Vertex AI** (embeddings `text-embedding-004`) en Opsly: credenciales en Doppler, APIs en GCP y verificación local.

## 1. Crear o elegir proyecto GCP

- Consola: [Google Cloud Console](https://console.cloud.google.com)
- Crear proyecto (ej. `opsly-prod-123`) y activar facturación.

## 2. Habilitar APIs

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable logging.googleapis.com
```

## 3. Cuenta de servicio

```bash
gcloud iam service-accounts create opsly-vertex-ai \
  --display-name="Opsly Vertex AI"

# Email (sustituye PROJECT_ID)
gcloud iam service-accounts list --filter="displayName:Opsly Vertex AI"
```

## 4. Permisos (mínimo razonable)

```bash
PROJECT_ID="YOUR_PROJECT_ID"
SA_EMAIL="opsly-vertex-ai@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"
```

No hace falta `aiplatform.admin` para solo llamadas `:predict` de embeddings; si la consola o políticas de org lo exigen, revisar el error y ajustar.

## 5. Clave JSON

```bash
gcloud iam service-accounts keys create /tmp/opsly-vertex-sa.json \
  --iam-account="${SA_EMAIL}"
```

**No** subas la clave al repo. Rótala si se expone.

## 6. Doppler (`ops-intcloudsysops` / `prd`)

Variables soportadas por el orquestador (aliases incluidos):

| Variable | Descripción |
|----------|----------------|
| `GCLOUD_PROJECT_ID` o `GOOGLE_CLOUD_PROJECT_ID` | ID del proyecto |
| `GCLOUD_REGION` o `VERTEX_AI_REGION` | Región (ej. `us-central1`) |
| `GCLOUD_SERVICE_ACCOUNT_JSON` o `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON de la cuenta de servicio en una línea (`jq -c`) |
| `VERTEX_AI_EMBED_ENABLED` | `true` para generar embeddings en el worker |
| `VERTEX_AI_EMBEDDING_MODEL` | Opcional; default `text-embedding-004` |

Ejemplo:

```bash
doppler secrets set GCLOUD_PROJECT_ID "YOUR_PROJECT_ID" --project ops-intcloudsysops --config prd
doppler secrets set GCLOUD_REGION "us-central1" --project ops-intcloudsysops --config prd
doppler secrets set GCLOUD_SERVICE_ACCOUNT_JSON "$(jq -c . < /tmp/opsly-vertex-sa.json)" \
  --project ops-intcloudsysops --config prd
doppler secrets set VERTEX_AI_EMBED_ENABLED "true" --project ops-intcloudsysops --config prd
```

## 7. Supabase

Aplicar migraciones (`0026`, `0027`) para `platform.approval_gate_embeddings` y la función `public.search_similar_approval_metrics`. La extensión `vector` ya existe en migraciones previas.

## 8. Verificación

Desde la raíz del repo (con Doppler configurado):

```bash
doppler run --project ops-intcloudsysops --config prd -- bash scripts/test-vertex-ai.sh
```

## Referencias

- ADR: `docs/adr/ADR-023-approval-gate-phase1.md`
- Cliente: `apps/orchestrator/src/lib/vertex-ai-client.ts`
