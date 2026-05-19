---
status: draft
owner: architecture
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Principles

Principios no negociables. Ante conflicto con un feature, **gana el principio**.

## 1. Workflow-first

Automatizar **procesos que ya existen**, no inventar procesos porque n8n lo permite. Primero mapa en papel o checklist; luego workflow.

## 2. Simple-first

Menos componentes que resuelvan el 80%. Una base de datos, un orquestador de tareas, un dashboard. Añadir capas solo con justificación escrita.

## 3. Human approval-first

Nada que envíe mensajes, publique contenido o modifique datos de clientes finales sin aprobación humana explícita. La IA **asiste**; las personas **deciden**.

## 4. Client owns data, accounts, and domain

- Cuentas de Supabase, Vercel, Meta/WhatsApp, email: **a nombre del cliente** cuando sea posible.
- Opsly opera con permisos mínimos documentados.
- Exportación de datos siempre posible.

## 5. Providers are replaceable

Cada integración debe tener alternativa documentada (ver [PROVIDER-MATRIX.md](./PROVIDER-MATRIX.md)). Evitar APIs propietarias sin escape hatch.

## 6. No vendor lock-in

Contratos por eventos estándar (webhooks, CSV, SQL). Evitar que el negocio del cliente dependa del runtime BullMQ/orchestrator de Opsly para operar día a día.

## 7. Document before automating

Runbook + diagrama + criterios de hecho **antes** de activar cron o webhooks en producción.

## 8. Incubate before extracting

Validar MVP **dentro** de Opsly (tenant aislado) antes de crear repo `*-platform` independiente.

## 9. Dashboards before autonomy

Visibilidad (leads, feedback, pendientes) **antes** de agentes autónomos o mensajería masiva.

## 10. AI assists, humans decide

Usos permitidos: resumir, sugerir borrador, clasificar con revisión. Usos prohibidos en MVP: auto-send, auto-publish, auto-delete.

## Aplicación práctica

| Situación | Aplicar |
|-----------|---------|
| Cliente pide “bot que responda WhatsApp solo” | Rechazar MVP; proponer borradores + aprobación |
| Equipo quiere microservicio nuevo | Usar módulo existente o n8n |
| Tenant listo para marca propia | [EXTRACTION-PATTERN.md](./EXTRACTION-PATTERN.md) |
| Duda de proveedor | [PROVIDER-MATRIX.md](./PROVIDER-MATRIX.md) |

## Anti-patrones

- Big-bang rewrite
- Duplicar orchestrator por cliente
- Secretos en repo o chat
- Terraform para un negocio de 3 personas
- Prometer SLA enterprise sin equipo 24/7
