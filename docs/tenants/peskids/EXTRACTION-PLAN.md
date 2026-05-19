---
status: draft
owner: architecture
last_review: 2026-05-18
tenant_slug: peskids
---

# Peskids — plan de extracción a plataforma independiente

## Objetivo

Pasar de **tenant incubado en Opsly** a producto **`cloudsysops/peskids-platform`** (repo futuro) manteniendo:

- Continuidad operativa para el cliente
- Integración **opcional** con Opsly vía API/webhooks
- Sin dependencia permanente del orchestrator/BullMQ de Opsly

**No crear el repo en esta fase.**

## Fases de extracción

| Fase | Entregable | Opsly |
|------|------------|-------|
| E0 | Docs incubación (este folder) | Sin cambio runtime |
| E1 | Supabase + API mínima en repo nuevo | Webhooks opcionales |
| E2 | Next.js dashboard (Vercel) | Portal Peskids deja de ser solo Opsly portal |
| E3 | Migración datos leads/feedback | Export/import documentado |
| E4 | n8n: mantener en VPS o replicar selectivo | Reducir acoplamiento gradual |
| E5 | Dominio propio + DNS | Traefik tenant opcional legacy |

## Qué migrar

| Activo | Destino |
|--------|---------|
| `docs/tenants/peskids/*` | `peskids-platform/docs/` |
| DATA-MODEL | Migraciones Supabase en repo nuevo |
| WORKFLOWS (diseño) | n8n JSON exportados + versionado en nuevo repo |
| Branding / copy CLIENT-PITCH | `apps/web` marketing |
| Eventos | Contrato OpenAPI/webhooks en ambos lados |

## Qué permanece en Opsly (opcional)

- Facturación/plan si el cliente sigue en Opsly SaaS
- LLM Gateway metering con `tenant_slug: peskids` si usan IA vía Opsly
- Monitoreo uptime compartido hasta cutover

## Contrato de eventos (webhooks salientes)

Payload mínimo:

```json
{
  "event": "lead.created",
  "tenant_slug": "peskids",
  "occurred_at": "2026-05-18T12:00:00Z",
  "idempotency_key": "uuid",
  "payload": { }
}
```

### Eventos v1

| Evento | Cuándo |
|--------|--------|
| `lead.created` | Nuevo lead capturado |
| `feedback.created` | Feedback padre/docente registrado |
| `followup.pending` | Follow-up requiere acción (o digest) |
| `student.created` | Alta de estudiante en producto |
| `report.weekly.generated` | Informe semanal listo (post-revisión humana) |

### Seguridad eventos

- HTTPS + firma HMAC (`X-Peskids-Signature`) o mTLS — definir en repo nuevo
- Retry con backoff; consumidor idempotente
- Sin PII innecesaria en payload (IDs + resumen)

## Conexión Opsly API (entrante opcional)

El producto Peskids podría llamar:

- Health/metrics read-only
- Encolar job solo si existe contrato explícito post-extracción — **no** usar BullMQ interno sin ADR

## Criterios “go” para crear repo

Todos en [INCUBATION-CHECKLIST.md](./INCUBATION-CHECKLIST.md):

- MVP aceptado por owner
- Modelo de datos estable v1
- Dominio decidido
- Owner confirma extracción
- Sin deuda crítica en triage VPS

## Rollback

Si extracción falla: tenant `peskids` sigue en Opsly; reactivar workflows VPS; no borrar stack hasta ventana de migración cerrada.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Doble fuente de verdad leads | Cutover con freeze window |
| Webhooks duplicados | `idempotency_key` |
| Costos LLM duplicados | Un solo gateway o billing claro |

Ver también [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md).
