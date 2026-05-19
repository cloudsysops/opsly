---
status: draft
owner: security
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Security and Trust

Modelo de confianza para PyMEs: **transparencia** sobre “seguridad de cartel”.

## Client ownership model

| Activo | Dueño |
|--------|-------|
| Dominio | Cliente |
| Cuenta Supabase (post-extracción) | Cliente |
| Meta / WhatsApp Business | Cliente |
| Contenido y datos de negocio | Cliente |
| Código custom post-extracción | Cliente (licencia acordada) |

Opsly **no** reclama propiedad de datos del negocio del cliente.

## Account ownership

- Invitar al cliente como **owner** en cada herramienta desde el día 1 cuando sea posible.
- Opsly usa acceso **delegado** documentado (rol admin temporal), no cuenta compartida permanente.
- Al extraer: revocar accesos Opsly en checklist.

## Credential handling

- Secretos solo en **Doppler / vault del cliente** post-extracción.
- Nunca en repo, chat, ni docs.
- Rotación tras cualquier exposición en logs.
- Sin “cuenta mágica” que el cliente no conoce.

## No hidden access

- Listar qué puede ver Opsly (logs, DB, n8n).
- Sin backdoors en producción del cliente.
- Cambios en producción: PR + humano (ver `docs/03-agents/AGENT-GUARDRAILS.md`).

## No auto-send

La IA y los workflows **no** envían mensajes al cliente final sin aprobación:

- Email masivo
- WhatsApp
- Publicación redes
- Cobros

Estados: `draft` → `approved` → `sent`.

## No auto-delete

- Sin purgas automáticas de leads, feedback o facturación.
- Retención documentada; borrado solo con confirmación explícita.

## Approval-first AI

| Permitido sin aprobación | Requiere aprobación |
|--------------------------|---------------------|
| Resumir datos internos | Mensaje a cliente |
| Sugerir borrador | Enviar borrador |
| Clasificar feedback (etiqueta) | Responder automático |
| Reporte interno borrador | Reporte al cliente |

## Data exportability

- Export CSV/SQL on-demand documentado.
- Sin formatos propietarios para datos core.
- Cliente puede irse con sus datos.

## Audit trail

Mínimo viable:

- Quién aprobó qué y cuándo (`approval_events`).
- Origen del lead (`source`).
- Cambios de estado CRM (`status_history` opcional).

No hace falta SIEM enterprise en MVP.

## Minimal permissions

- n8n: credenciales scoped por workflow.
- Supabase: RLS; service role solo en backend controlado.
- API keys IA: límites de gasto en proveedor.

## Transparent subscriptions

- Separar **fee Opsly** vs **coste herramientas** (pass-through).
- Sin cargos ocultos en renovación.
- Ver [COMMERCIAL-PACKAGES.md](./COMMERCIAL-PACKAGES.md).

## Alineación Opsly platform

Para portal/API Zero-Trust en el monorepo Opsly (no confundir con este blueprint PyME):

- `docs/SECURITY_CHECKLIST.md`
- `resolveTrustedPortalSession` en rutas portal

Este documento aplica al **blueprint operativo cliente**; la plataforma Opsly tiene reglas adicionales.

## Advertencias

- No prometer “cumplimiento HIPAA/SOC2” sin contrato y arquitectura dedicada.
- No almacenar tarjetas; usar Stripe/Wompi hosted checkout.
- Menores (ej. escuelas): minimizar PII; consentimiento parental documentado.
