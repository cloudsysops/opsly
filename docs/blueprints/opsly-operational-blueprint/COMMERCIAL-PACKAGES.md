---
status: draft
owner: product
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Commercial Packages

Paquetes **simples** para PyMEs. Rangos orientativos; ajustar por mercado y scope. Sin hype.

> **No garantizamos** resultados de ventas, posicionamiento SEO ni uptime de terceros. Entregamos organización operativa y herramientas configuradas según alcance acordado.

## Resumen

Fuente machine-readable (ICSO + agentes): [`config/commercial-catalog.json`](../../../config/commercial-catalog.json).  
Sitio público: paquetes/módulos/verticales en `apps/icso` (home + `/services`).

| Paquete | Ideal para | Setup (único) | Ops mensual |
|---------|------------|---------------|-------------|
| Basic Setup | Negocio que empieza digital | Bajo | Opcional mínimo |
| Hybrid Recommended | Piloto incubado en Opsly | Medio | Medio |
| Custom Platform | Nicho con flujos propios | Alto | Medio–alto |
| Managed Operations | Dueño sin tiempo técnico | Medio | Alto |

*Precios en USD orientativos LATAM; facturar en COP/USD según cliente.*

---

## Basic Setup

**Incluye**

- Discovery 1–2 sesiones
- Mapa de flujo actual (diagrama)
- Landing o formulario de captación
- 1 workflow n8n (lead → notificación)
- Guía de uso en español
- Checklist ownership cuentas

**No incluye**

- Dashboard Next a medida
- WhatsApp API
- IA autónoma
- Extracción a repo propio

**Cliente ideal:** barbería, consultor solo, restaurante pequeño.

**Rango setup:** $400 – $900  
**Suscripción Opsly:** $0 – $49/mes (soporte email limitado)  
**Herramientas (pass-through):** dominio, Supabase free, Resend según uso.

---

## Hybrid Recommended (incubación Opsly)

**Incluye**

- Todo Basic +
- Tenant incubado en Opsly (n8n + uptime)
- Módulos MVP: Lead, Feedback, Follow-up, Weekly report
- Cola de aprobación documentada
- 4 workflows CRM tipo catálogo (adaptados)
- Runbook operativo
- Camino a extracción documentado

**No incluye**

- App móvil nativa
- Integración pagos compleja
- SLA 24/7
- Personal dedicado full-time

**Cliente ideal:** escuela deportiva, clínica pequeña, agencia local.

**Rango setup:** $1,200 – $2,500  
**Suscripción Opsly:** $79 – $199/mes  
**Pass-through:** VPS share, APIs IA según uso, Meta fees.

---

## Custom Platform

**Incluye**

- Hybrid +
- Dashboard Next (portal padres/clientes)
- DATA-MODEL dedicado
- 2–3 integraciones (ej. calendario, pagos link)
- Política IA por escrito
- Plan de extracción + repo semilla

**No incluye**

- Marketplace multi-tenant
- Equipo dev ilimitado
- Compliance certificado

**Cliente ideal:** Peskids-scale, BIM constructor mediano, franquicia local.

**Rango setup:** $3,500 – $8,000+  
**Suscripción:** $199 – $499/mes  
**Pass-through:** Vercel, Supabase Pro, volumen IA.

---

## Managed Operations

**Incluye**

- Operación mensual: revisar workflows, reportes, cola aprobación
- Ajustes menores n8n (horas cap/mes)
- Monitoreo uptime + respuesta en horario laboral
- Reuniones quincenales

**No incluye**

- Desarrollo de features grandes sin change order
- Soporte fines de semana 24/7 (salvo add-on)
- Gestión legal/contable

**Cliente ideal:** dueño ocupado con negocio ya validado.

**Rango setup:** según estado actual  
**Suscripción:** $299 – $799/mes + horas extra documentadas  
**Pass-through:** todas las herramientas facturadas aparte o reembolso.

---

## Suscripciones y facturación

- **Fee Opsly:** servicio configuración/operación/consultoría.
- **Pass-through:** dominio, hosting, APIs, WhatsApp — a nombre del cliente cuando sea posible.
- **Stripe/Wompi:** suscripciones recurrentes del cliente final son **del cliente**, no de Opsly, salvo acuerdo white-label explícito.

## Qué no prometemos

- “Duplicar ingresos en 30 días”
- “IA que reemplaza al staff”
- Uptime 99.99% sin contrato infra dedicado
- Número ilimitado de cambios sin límite de horas

## Siguiente paso comercial

1. Discovery → elegir paquete.  
2. SOW 1 página con módulos de [MODULES.md](./MODULES.md).  
3. Incubación o extracción según [TENANT-INCUBATION.md](./TENANT-INCUBATION.md).

---

## Enlaces relacionados

- [[blueprints/opsly-operational-blueprint/README|opsly-operational-blueprint]]
- [[brain/README|Brain Central]]
