---
status: draft
owner: operations
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Implementation Checklist

Lista práctica de punta a punta. Marcar en Notion/issue; no sustituye SOW.

## Fase 0 — Discovery

- [ ] Problema semanal del dueño (1 frase)
- [ ] Nicho confirmado ([NICHE-PLAYBOOKS.md](./NICHE-PLAYBOOKS.md))
- [ ] Paquete comercial acordado ([COMMERCIAL-PACKAGES.md](./COMMERCIAL-PACKAGES.md))
- [ ] Dueño acepta: datos suyos, aprobación antes de envíos
- [ ] Lista herramientas actuales (WhatsApp, Excel, etc.)

## Fase 1 — Data source

- [ ] Origen de verdad definido (Supabase / sheet transitorio)
- [ ] Campos mínimos: lead, feedback, follow-up
- [ ] Sin PII innecesaria
- [ ] Export de prueba realizado
- [ ] Backup responsable asignado (cliente)

## Fase 2 — Landing / entry

- [ ] URL o form publicado
- [ ] Mensaje claro (qué pasa después de enviar)
- [ ] Prueba lead de punta a punta
- [ ] UTM/source documentado si aplica

## Fase 3 — Dashboard

- [ ] 4–6 métricas máximo (no 40)
- [ ] Dueño puede abrir sin soporte
- [ ] Datos actualizados al menos diario
- [ ] Mock vs real etiquetado

## Fase 4 — Workflow map

- [ ] Diagrama: lead → notify → follow-up → close
- [ ] Diagrama: feedback → review → acción
- [ ] Owner por paso humano
- [ ] n8n workflows nombrados y exportados JSON

## Fase 5 — Feedback form

- [ ] ≤ 5 preguntas
- [ ] Ruta a DB o sheet
- [ ] Alerta si score bajo
- [ ] Política respuesta humana

## Fase 6 — Automation review

- [ ] Cada workflow: ¿qué puede fallar?
- [ ] Sin auto-send ([SECURITY-AND-TRUST.md](./SECURITY-AND-TRUST.md))
- [ ] Rate limits / horarios sensatos
- [ ] Dry-run documentado

## Fase 7 — AI policy

- [ ] Qué puede hacer IA (borrador, clasificar)
- [ ] Qué no (enviar, borrar, cobrar)
- [ ] Cola aprobación activa
- [ ] Límite gasto API en proveedor

## Fase 8 — Ownership checklist

- [ ] Dominio → cliente
- [ ] Supabase → cliente (o plan migración)
- [ ] Meta/WhatsApp → cliente
- [ ] Email transaccional → cliente
- [ ] Opsly accesos documentados y con fecha revocación

## Fase 9 — Pilot run (2–4 semanas)

- [ ] Weekly report generado
- [ ] ≥ 10 leads o equivalente de volumen
- [ ] ≥ 5 feedbacks
- [ ] Incidencias registradas
- [ ] Sin impacto negativo a otros tenants Opsly

## Fase 10 — Extraction decision

| Pregunta | Sí → extraer |
|----------|----------------|
| ¿Dueño paga hosting propio? | |
| ¿Flujo estable sin cambios diarios? | |
| ¿Cuentas a su nombre? | |
| ¿Necesita marca propia dominio? | |

- [ ] Si sí: [EXTRACTION-PATTERN.md](./EXTRACTION-PATTERN.md)
- [ ] Si no: seguir incubación o pausar scope

## Fase 11 — Handoff

- [ ] Runbook español entregado
- [ ] Video o Loom 15 min (opcional)
- [ ] Contacto soporte y horarios
- [ ] Fecha revisión 30/60 días

## Anti-patterns (detener si ocurre)

- [ ] Más de 3 integraciones nuevas en semana 1
- [ ] “La IA responderá todo” prometido al cliente
- [ ] Migración Supabase platform sin humano
- [ ] Secretos en repo o WhatsApp
- [ ] Dashboard sin usuario real usándolo 1 semana

## Referencias Opsly repo

- Validar config tenant: `./scripts/validate-subclient-config.sh`
- Producción tenants: `docs/tenants/production/TENANT-PRODUCTION-CHECKLIST.md`
- Estructura docs: `npm run validate-structure`
