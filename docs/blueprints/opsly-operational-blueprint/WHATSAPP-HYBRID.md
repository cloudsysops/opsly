---
status: draft
owner: architecture
last_review: 2026-07-02
---

# Opsly Operational Blueprint - WhatsApp Hybrid

Contrato mínimo para tenants WhatsApp-first donde la conversación vive aparte del CRM.

## Objetivo

Permitir que un tenant opere con alta intensidad por WhatsApp sin duplicar la verdad comercial.

## Reparto de responsabilidades

| Capa | Qué guarda | Qué no guarda |
|------|------------|---------------|
| OpenWA / WACRM | Conversaciones, inbox, mensajes entrantes, estado de atención | Pipeline comercial, oportunidades, estado del negocio |
| Twenty CRM | People, companies, opportunities, stages, relaciones comerciales | Historial completo de conversación como fuente de verdad |
| Supabase | Leads, estado operativo, membresías, registros del tenant | UI de conversación o duplicación manual del CRM |
| n8n | Automatizaciones, recordatorios, aprobaciones, digestos | Fuente primaria de datos |

## Regla de oro

Un solo dato de verdad por dominio:

- Conversación: OpenWA / WACRM
- CRM: Twenty
- Operación: Supabase
- Automatización: n8n

## Uso por tenant

### Peskids

- WhatsApp es canal principal para familias y soporte.
- Twenty conserva el CRM comercial.
- Supabase conserva los datos operativos del tenant.

### ICSO

- Paquete reusable para tenants WhatsApp-first.
- Puede activarse por flag/patrón sin obligar a todos los clientes a usar WhatsApp.

## Activación

El contrato híbrido se expresa con patrones de tenant:

- `incubator-app`
- `crm-starter-stack`
- `whatsapp-crm-hybrid`

## Bootstrap mínimo

1. Definir el tenant en `config/tenants/<slug>.json`.
2. Seleccionar el patrón `whatsapp-crm-hybrid` si WhatsApp es el canal principal.
3. Ejecutar scripts idempotentes de setup.
4. Crear una sola vez el workspace/admin de Twenty.
5. Activar flags del tenant.

## Qué no hacer

- No usar WhatsApp como CRM.
- No duplicar oportunidades entre OpenWA y Twenty.
- No mantener dos fuentes de verdad para pipeline.
- No convertir la conversación en el control plane.

---

## Enlaces relacionados

- [[blueprints/opsly-operational-blueprint/README|opsly-operational-blueprint]]
- [[blueprints/opsly-operational-blueprint/NICHE-PLAYBOOKS|niche-playbooks]]
- [[tenants/peskids/README|peskids]]
