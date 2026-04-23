# Opsly — Tenant onboarding (plantilla genérica, Opción B)

## Inputs (no hardcodear)

Completa un archivo JSON de tenant (ver `config/tenants/<tenant_slug>.json`) y úsalo como fuente de verdad para sustituir variables.

Variables mínimas:

- `{tenant_name}`: nombre comercial
- `{tenant_slug}`: slug (3–30, regex del producto)
- `{schema_name}`: schema Postgres dedicado (normalmente igual a `{tenant_slug}`)
- `{platform_domain}`: dominio base Opsly (p.ej. `ops.smiletripcare.com`)
- `{portal_domain}`: (opcional) host público específico; muchos despliegues usan portal compartido + aislamiento por sesión/tenant_slug
- `{workflows_count}`: número de workflows n8n a provisionar/validar
- `{pricing_per_unit}`: precio unitario (si aplica)
- `{currency}`: moneda (ISO)

## Principios (Opsly)

- **Extender, no re-arquitectar**: todo vive en el monorepo actual (`apps/*`, `infra/*`, `scripts/*`, `supabase/*`).
- **Compatibilidad hacia atrás**: defaults deben preservar comportamiento actual.
- **Trazabilidad**: todo job/handlers deben incluir `tenant_slug` + `request_id` cuando exista pipeline OpenClaw.

## Fase 0 — Pre-flight (siempre)

1. Confirmar `tenant_slug` y `owner_email` alineados a `platform.tenants`.
2. Confirmar DNS/TLS (Traefik) y secretos (Doppler `prd`) para el entorno objetivo.
3. Confirmar acceso GHCR en VPS/worker según runbook de deploy.

## Fase 1 — Base de datos (días 1–2)

1. Definir/validar schema `{schema_name}` (aislamiento lógico).
2. Migraciones Supabase: idempotentes, con RLS acorde a política Opsly.
3. Smoke SQL: tablas críticas + permisos mínimos.

## Fase 2 — App tenant (días 3–4)

1. Scaffold en `apps/<tenant_slug>` o ruta acordada por el repo (mantener convención existente).
2. Integración API: rutas internas y límites de plan (si aplica).
3. Type-check del workspace del tenant.

## Fase 3 — Workflows (días 5–9)

1. Import/plantillas n8n versionadas (sin secretos en JSON).
2. Webhooks: rotación de secretos + verificación de firma.
3. Pruebas: smoke + checklist manual mínimo.

## Fase 4 — Deploy + validación (días 10–14)

1. Compose por tenant (`tenant_<slug>`) sin `--remove-orphans` en `up`.
2. Healthchecks: API/plataforma + endpoints del tenant.
3. Observabilidad: logs estructurados + alertas (Discord opcional).

## Salida esperada (artefactos)

- Carpeta `EXECUTIONS/<tenant_slug>/` en Drive con logs por día (texto/markdown).
- PR(s) en GitHub con commits pequeños y verificables (`npm run type-check`).
