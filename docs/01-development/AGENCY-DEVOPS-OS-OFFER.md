---
status: ready
owner: product
last_review: 2026-05-08
---

# Opsly Managed Agent Delivery Desk

## Posicionamiento

Opsly es un servicio gestionado para agencias y consultoras que ya trabajan con Cursor, VS Code, GitHub, n8n y sus propias suscripciones de IA. No reemplaza el IDE del cliente: coordina agentes, terminales, contexto, PRs, deploys y auditoria para cerrar tareas mas rapido con supervision humana.

## Cliente Ideal

Agencias y consultoras de 3 a 20 personas que entregan webs, SaaS internos, automatizaciones, integraciones, n8n, soporte mensual o DevOps ligero, y que tienen backlog constante de cambios pequenos que consumen senior time.

## Problema

- El contexto queda repartido entre issues, chats, terminales, IDEs, repos y documentos.
- Los seniors pierden horas en tareas repetitivas, soporte y validaciones.
- Los agentes locales del equipo trabajan sin gobierno, sin trazabilidad y sin medicion de costo.
- Los PRs tardan porque cada cambio necesita reconstruir contexto y validacion manual.

## Promesa

Reducir tiempo de entrega y soporte operativo usando agentes supervisados con trazabilidad. Opsly convierte una solicitud de cambio en un flujo controlado: intake, asignacion de agente, ejecucion en IDE/terminal, diff, PR, validacion y reporte al cliente.

## Alcance Inicial

- Onboarding del repo GitHub y canales de comunicacion.
- Configuracion de agentes locales/remotos segun permisos del cliente.
- Runbook por cliente con limites de acceso, ramas, validaciones y cierre.
- Dashboard operativo sobre capacidades actuales de `apps/admin`, `apps/portal`, `apps/api`, `apps/orchestrator`, Hive e IDE Octopus.
- Flujo demo vendible: issue -> agente -> terminal/IDE -> PR -> reporte.
- Reporte semanal: tareas cerradas, PRs, horas estimadas ahorradas, costo LLM y bloqueantes.

## Limites

- No se ofrece autonomia total sin supervision humana.
- No se toma control de credenciales personales ni se comparten secrets fuera de Doppler o del mecanismo acordado.
- No se hacen deploys a produccion sin regla explicita de aprobacion.
- No se prometen correcciones ilimitadas: cada piloto tiene alcance, repos, tareas y ventanas definidos.
- No se reemplaza el stack del cliente; se integra con su IDE, GitHub y suscripciones.

## Paquetes

### Pilot Desk

- Setup: USD 1,000-1,500.
- Duracion: 14 dias.
- Incluye 1 repo, hasta 5 tareas acotadas, 1 demo grabable y reporte final.
- Objetivo: demostrar ahorro real y cerrar un retainer.

### Managed Delivery Desk

- Retainer: USD 750-2,500/mes.
- Incluye supervision semanal, agentes configurados, PRs asistidos, reporte operativo y soporte de backlog.
- Add-ons: tenants adicionales, seguridad avanzada, agentes dedicados, auditoria n8n/DevOps, soporte 24/7.

## Evidencia de Valor

- Horas ahorradas por tarea.
- Tiempo de issue a PR.
- PRs generados o asistidos.
- Tareas cerradas por agente.
- Costo LLM por cliente.
- Incidentes evitados por validaciones y runbooks.

## CTA

"Dame un repo, 5 tareas repetitivas y 14 dias. Te entrego evidencia de cuanto puede acelerar tu agencia sin cambiar tu IDE ni contratar mas developers."

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
