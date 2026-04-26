# Activación Google Cloud $300 — Guía para Cristian

## Cuándo activar

Solo cuando TODO lo siguiente esté verde:

- [ ] `./scripts/check-tokens.sh` → 0 faltantes
- [ ] `./scripts/activate-tokens.sh` → OK
- [ ] Deploy verde en GitHub Actions
- [ ] Workflow n8n importado
- [ ] Drive sync funcionando

## Qué activar primero con los $300

Orden de ROI máximo:

### Semana 1 — BigQuery ($0 en free tier)

- Migrar `usage_events` de Supabase a BigQuery
- Queries analíticas 100x más rápidas
- Costo: $0 (dentro del free tier)

### Semana 2 — Cloud Run para ML ($0-5/mes)

- Mover `apps/ml/` a Cloud Run
- Solo paga cuando hay requests
- Costo: centavos por tenant

### Semana 3 — Vertex AI (usa los $300)

- Fine-tuning de Llama 3.2 con datos de feedback
- 1 training run = ~$50-100 con los créditos
- Resultado: modelo propio especializado en Opsly

### Mes 2 — Speech-to-Text + Vision

- Transcripción de WhatsApp para tenants
- Análisis de imágenes para clientes
- Costo: dentro del free tier para volumen inicial

## Comandos para activar billing

```bash
gcloud billing accounts list
gcloud billing projects link PROJECT_ID \
  --billing-account=BILLING_ACCOUNT_ID
```

## Variables nuevas que necesitamos

- `GOOGLE_CLOUD_PROJECT_ID=opsly-platform-personal`
- `BIGQUERY_DATASET=opsly_analytics`
- `VERTEX_AI_REGION=us-central1`
