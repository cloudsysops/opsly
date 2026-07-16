---
status: draft
owner: architecture
last_review: 2026-07-02
---

# Opsly Operational Blueprint - Vertical Blueprints

Mapa corto para convertir un nicho en un tenant operativo sin inventar una plataforma nueva.

## Regla base

Por defecto, cada vertical arranca con:

- `full-tenant-stack` para el stack base de tenant
- `crm-starter-stack` para capturar leads y follow-up
- `docs/tenants/<slug>/` para la guía operativa
- Un único paso manual irreducible: primer admin/API key de Twenty

Si el vertical necesita app propia además de CRM, usar `incubator-app` solo como capa extra, no como reemplazo del tenant base.

## Mapa por vertical

| Vertical | Problema inicial | Primer workflow | Primer dashboard | Notas |
|----------|-------------------|-----------------|------------------|-------|
| Barbería | Citas por DM y no-shows | Formulario o link → lead → aviso al staff | Citas de hoy, leads nuevos, no-shows | Mantener recordatorios simples y aprobación humana |
| Restaurante | Reservas dispersas y reseñas sin control | Reserva → notificación manager → seguimiento | Reservas, feedback semanal, pendientes | No meter POS en el MVP |
| Hotel | Consultas, reservas y seguimiento de post-estancia | Consulta → lead → seguimiento de reserva | Leads, reservas, reseñas recientes | Priorizar respuesta rápida y plantilla de mensajes |
| Ventas / agencia | Pipeline lento y reporting manual | Lead → CRM → follow-up | Pipeline, tareas, cuentas sin respuesta | Mantener approval-first para mensajes |
| Marketplace | Alta de vendedores y soporte disperso | Alta → calificación → onboarding | Vendedores nuevos, tickets, conversión | La base debe permitir nuevos catálogos sin rehacer core |

## Cómo copiar un vertical

1. Elegir el vertical y confirmar que el dolor es repetible.
2. Copiar la estructura de `docs/tenants/peskids/` solo como forma, no como negocio.
3. Crear `config/tenants/<slug>.json` a partir de `config/tenants/_template.tenant.json`.
4. Añadir el slug al patrón adecuado en `config/patterns/tenant/`.
5. Generar el bootstrap con `scripts/generate-tenant-config.sh` y el skeleton con `scripts/provisioning/tenant-bootstrap-skeleton.sh`.
6. Si quieres una sugerencia rápida por vertical, usar `scripts/tenants/suggest-vertical-blueprint.sh --vertical <name>`.
7. Documentar el único paso manual real: admin/API key de Twenty.

## Qué no hacer

- No crear una rama especial por vertical si el problema es común.
- No duplicar workflow CRM por tenant.
- No convertir la UI manual de Twenty en una dependencia permanente.
- No abrir un segundo control plane para un nicho.

---

## Enlaces relacionados

- [[blueprints/opsly-operational-blueprint/README|opsly-operational-blueprint]]
- [[blueprints/opsly-operational-blueprint/NICHE-PLAYBOOKS|niche-playbooks]]
- [[tenants/peskids/README|peskids]]
