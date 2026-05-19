---
status: draft
owner: operations
last_review: 2026-05-19
audience: team
language: es
---

# Blueprint operativo Opsly (para el equipo)

## Qué estamos construyendo

Un **blueprint reutilizable** para PyMEs: documentación, módulos y patrones que repetimos en cada cliente sin reescribir la arquitectura desde cero.

**No** estamos terminando un SaaS multi-tenant listo para miles de usuarios. Estamos estandarizando **cómo incubamos, operamos y extraemos** clientes con herramientas prácticas.

## Qué NO construir

| No | Por qué |
|----|---------|
| Clonar blueprints enterprise de Google Cloud | Scope y costo incorrectos |
| Segundo orchestrator / motor de colas nuevo | Ya existe BullMQ + OpenClaw |
| CRM competidor de Salesforce | Los módulos son mínimos |
| IA autónoma que envía sin aprobar | Riesgo marca y confianza |
| Features en runtime sin ADR + PR | Zonas rojas en AGENT-GUARDRAILS |
| Código específico por cliente en `apps/*` | Extraer a repo cliente o config documental |

Si dudas: **documenta primero**, código solo si el patrón se repite 3+ veces y tiene owner.

## Cómo evitar sobre-ingeniería

1. **Workflow-first** — dibuja el flujo en papel antes del n8n.
2. **Tres módulos máximo** en semana 1 ([MODULES.md](./MODULES.md)).
3. **Dashboard mínimo** — 4 métricas, no 20 pantallas.
4. **Proveedor reemplazable** — anota en [PROVIDER-MATRIX.md](./PROVIDER-MATRIX.md) cómo salir.
5. **Incubar antes de extraer** — no repo nuevo el día 1 salvo excepción comercial.

Regla: si el cliente no usó el entregable 2 semanas, **no** agregar más automatización.

## Cómo elegir herramientas

1. ¿El cliente ya paga algo? → integrar eso primero.
2. ¿Dueño del activo? → cuenta del cliente.
3. ¿Lock-in? → ver matriz; evitar GoHighLevel si no es necesario.
4. ¿Costo fijo vs variable? → preferir fijo predecible en PyME.
5. ¿Opsly ya lo tiene? → n8n/uptime en tenant antes de inventar microservicio.

**Default incubación:** VPS tenant + Supabase + n8n + approval queue documental.

## Documentar antes de automatizar

Orden obligatorio:

1. Discovery + nicho ([NICHE-PLAYBOOKS.md](./NICHE-PLAYBOOKS.md))
2. DATA-MODEL en `docs/tenants/<slug>/`
3. WORKFLOWS + política IA
4. n8n JSON exportado al repo (sin secrets)
5. Smoke checklist
6. Solo entonces: más jobs, más IA, más UI

Commits de docs en PR; runtime solo con `type-check` y review.

## Cuándo extraer un tenant

Extraer cuando ([TENANT-INCUBATION.md](./TENANT-INCUBATION.md)):

- MVP validado con uso real
- Cuentas a nombre del cliente
- Dueño acepta costo hosting propio
- Marca/dominio propio requerido
- Opsly no debe estar en el camino crítico

**No** extraer por presión comercial sin checklist [EXTRACTION-PATTERN.md](./EXTRACTION-PATTERN.md).

Peskids es piloto de referencia; copiar **proceso**, no copiar 11 docs iguales para cada barbería.

## Roles en una implementación típica

| Rol | Hace |
|-----|------|
| Architect / lead | Scope, extracción, proveedores |
| Implementer | n8n, forms, DB |
| Client success | Training, weekly con dueño |
| Reviewer | Seguridad, no auto-send |

## Enlaces internos

- Blueprint hub: [README.md](./README.md)
- Principios: [PRINCIPLES.md](./PRINCIPLES.md)
- Arquitectura capas: [REFERENCE-ARCHITECTURE.md](./REFERENCE-ARCHITECTURE.md)
- Checklist: [IMPLEMENTATION-CHECKLIST.md](./IMPLEMENTATION-CHECKLIST.md)
- Guardrails agentes: `docs/03-agents/AGENT-GUARDRAILS.md`
- Git: `docs/01-development/GIT-WORKFLOW.md` — PR a `main`, no push directo en rojo/ámbar

## Mensaje al cliente (resumen)

Usar o adaptar [CLIENT-FACING-EXPLANATION.md](./CLIENT-FACING-EXPLANATION.md). No prometer magia IA.

## Siguiente acción del equipo

1. Leer blueprint completo una vez.  
2. Aplicar checklist al próximo piloto.  
3. Proponer mejoras al blueprint vía PR **solo docs** en `docs/blueprints/opsly-operational-blueprint/`.
