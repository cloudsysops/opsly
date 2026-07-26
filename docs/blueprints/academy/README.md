---
status: draft
owner: architecture
last_review: 2026-07-26
type: blueprint
---

# Academy Blueprint — ICSO platform + Peskids pilot

## Roles

| Actor | Qué es | Qué no es |
|-------|--------|-----------|
| **ICSO / Opsly** | Plataforma madre: tenants, módulos, owners/admins, dominios, secrets (Doppler), deploys, smokes, billing futuro, blueprints | No es un tenant “cliente” más |
| **Peskids** | Tenant piloto/canónico del vertical **Academy** | No es el control plane; no se forkea para features reutilizables |

Contrato machine-readable (módulos, seed, smokes): [`blueprints/academy/`](../../../blueprints/academy/).

Contratos legacy de este directorio (`blueprint.yaml`, `capabilities.yaml`, …) siguen válidos vía `npm run validate:academy-blueprint`.

## Módulos reutilizables

| Módulo | Rol |
|--------|-----|
| `auth` | admin, staff, teacher, family/parent, recovery, invites, roles |
| `crm` | lead capture, Supabase SoT, Twenty sync, pipeline, follow-ups |
| `franchises` | franquicias, sedes, staff por franquicia, leads por sede |
| `classes` | agenda, grupos, profesores, asistencia |
| `families` | acudientes/responsables, alumnos, portal familia |
| `teachers` | profesores, agenda, feedback, applicants |
| `automation` | n8n workflows, digest, reminders |
| `messaging` | WACRM/WhatsApp opcional, approval-first |
| `payments` | Wompi apagado por defecto |
| `analytics` | dashboard, fuentes, conversión, operación diaria |

Detalle YAML: `blueprints/academy/modules/*.yaml`.

## Cómo crear el próximo tenant tipo academia

1. Partir de `blueprints/academy/seed/tenant-settings.json`.
2. Nuevo `tenant.slug`; `owner_platform: icso`; `business_type: academy`.
3. Onboard con scripts Opsly existentes (`onboard-tenant.sh`, compose tenant).
4. Activar módulos por contrato; **extraer** a `lib/` lo que Peskids ya resolvió si un segundo tenant lo necesita.
5. CRM = Twenty; GHL = disabled.
6. Franquicias **dentro** del mismo `tenant_slug` (ver `docs/tenants/peskids/FRANCHISE-OPERATING-MODEL.md`).

Ejemplo de contrato:

```yaml
tenant:
  slug: peskids
  business_type: academy
  owner_platform: icso
  canonical_domain: https://www.peskids.com
  locale: es-CO
  timezone: America/Bogota

modules:
  auth: true
  crm: twenty
  franchises: true
  classes: true
  families: true
  teachers: true
  automation: n8n
  messaging: manual_then_wacrm
  payments: disabled
  analytics: true

policies:
  ghl_runtime: disabled
  whatsapp_outbound: approval_first
  payments_live: disabled_by_default
```

## Qué queda manual

- Primer admin / API key Twenty por tenant.
- Apply de migraciones Supabase en prod.
- Autorización humana para WACRM outbound y payments live.
- DNS / dominio canónico del tenant.

## Qué está apagado por defecto

- GHL runtime (legacy archived/off).
- WhatsApp auto-send (approval-first).
- Payments live / Wompi.
- Provisioning automático desde este blueprint (`provisioning.enabled: false`).

## Validación

```bash
npm run validate:academy-blueprint
bash blueprints/academy/smoke/tenant-smoke.sh
```

## Archivos en este directorio

- `blueprint.yaml`, `tenant.schema.json`, `capabilities.yaml`, `integrations.yaml`, `roles.yaml`, `agent-policy.yaml`
- `ACADEMY-BLUEPRINT-AGENT-BASELINE.md` — inventario basado en código

## Próximos gaps

1. Merge franchise model (#841) + dynamic intake (#842) y aplicar migraciones.
2. Reconciliar `blueprints/academy/tenant.schema.json` con `config/tenants/schema.tenant-config.json`.
3. Extraer módulos compartidos a `lib/` al segundo Academy tenant.
4. Generador `--dry-run` de tenant desde blueprint (sin mutar prod).
