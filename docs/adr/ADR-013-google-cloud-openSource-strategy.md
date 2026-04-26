# ADR-013: Google Cloud + Open Source Integration Strategy

## Estado: ACEPTADO

## Fecha: 2026-04-09

## Contexto

Opsly necesita expandirse horizontalmente usando servicios de bajo costo. Google Cloud ofrece un tier gratuito generoso y el proyecto ya tiene un Service Account configurado.

El token OAuth personal expira con frecuencia. El Service Account permite generar access tokens automáticamente (sin intervención humana), alineado al objetivo de automatización.

## Decisión

Integrar Google Cloud y open source en 4 fases alineadas con el crecimiento de tenants:

- **Fase 0 (ahora)**: Drive + Ollama local
- **Fase 1 (3+ tenants)**: BigQuery + Cloud Run
- **Fase 2 (10+ tenants)**: Vertex AI + LangGraph
- **Fase 3 (escala)**: GKE + Spark + Ray

## Principios

1. Gratis antes que pago
2. Open source antes que SaaS
3. VPS vertical antes que cloud horizontal
4. Datos siempre — son el activo del futuro LLM

## Servicios Google habilitados en proyecto opsly-platform

- Drive API ✅
- Sheets API (habilitar en fase 1)
- BigQuery (habilitar en fase 1)
- Cloud Run (habilitar en fase 1)
- Vertex AI (habilitar en fase 2)
- Speech-to-Text (habilitar en fase 2)

## Consecuencias

- **Service Account**: opsly-drive-sync
- **Secret en Doppler**: `GOOGLE_SERVICE_ACCOUNT_JSON`
- **Proyecto GCP**: opsly-platform (sin organización)
- **Billing alert**: $10/mes como límite de seguridad

## NO hacer

- No migrar toda la infra a GCP (VPS sigue siendo primario)
- No usar Kubernetes hasta 10+ tenants
- No pagar Vertex AI sin datos suficientes para fine-tuning
- No abandonar Supabase por Cloud Spanner prematuramente
