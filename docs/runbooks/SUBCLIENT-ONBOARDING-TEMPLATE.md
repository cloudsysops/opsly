# Plantilla — onboarding de subcliente (tenant bajo tenant padre)

Reutilizable para LegalVial y futuros subclientes. Ajustar nombres y dominios.

## Entradas obligatorias

| Campo | Ejemplo | Notas |
|-------|---------|--------|
| `tenant_slug` | `legalvial` | 3–30 chars, `a-z0-9-`, único en `platform.tenants` |
| `parent_tenant_slug` | `localrank` | Tenant comercial “padre”; solo metadato/contractual si aplica |
| `client_slug` | `legalvial` | Alineado a producto; puede coincidir con `tenant_slug` |
| `owner_email` | `owner@…` | Debe coincidir con política Resend/dominio |
| `plan` | `startup` \| `business` \| `enterprise` | |
| `schema_name` | `legalvial` | Convención `tenant_{slug}` o la que use el proyecto |

## Artefactos en repo

1. Añadir `config/tenants/<slug>.json` con `parent_tenant_slug` y `client_slug` si es subcliente.
2. Ejecutar `./scripts/validate-subclient-config.sh`.
3. Enlazar ADR o decisión en `docs/adr/` si el modelo es nuevo.

## Pasos operativos

1. Verificar pre-requisitos: [ONBOARDING-NEW-CLIENT.md](./ONBOARDING-NEW-CLIENT.md).
2. Onboarding técnico: `./scripts/onboard-tenant.sh --slug <slug> --email … --plan … --name "…"`.
3. Secretos en Doppler por tenant; cero hardcode en código.
4. Completar [LEGALVIAL-GOLIVE-CHECKLIST.md](./LEGALVIAL-GOLIVE-CHECKLIST.md) (o copia renombrada para otro subcliente).
5. Smoke E2E y soft-launch según [LEGALVIAL-E2E-SOFTLAUNCH.md](./LEGALVIAL-E2E-SOFTLAUNCH.md) (adaptar slug).

## Criterios de aceptación

- Portal y API con zero-trust en rutas `[slug]`.
- Jobs con `tenant_slug` + `request_id` donde aplique.
- n8n + Uptime accesibles y estables tras ventana de prueba.
- Documentación y checklist archivados para auditoría.

## Indicadores base (mejora continua)

- Tiempo de alta (desde kickoff hasta Go-Live).
- Errores de provisión en primera semana.
- Incidentes P1/P2 primera quincena.
