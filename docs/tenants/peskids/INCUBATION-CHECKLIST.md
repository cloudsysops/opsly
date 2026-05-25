---
status: draft
owner: product
last_review: 2026-05-18
tenant_slug: peskids
---

# Peskids — checklist de incubación

Marcar con fecha y responsable. Evidencia en notas o enlace a ticket — no secretos en repo.

## Identidad y contrato

- [ ] **Owner confirmado** — `sierrasantiago90@gmail.com` coincide con `platform.tenants.owner_email` y expectativa del cliente
- [ ] **Plan confirmado** — `startup` sigue siendo el plan comercial acordado
- [ ] **No es subcliente** — sin `parent_tenant_slug`; relación directa con Opsly documentada

## Dominio y marca

- [ ] **Decisión de dominio** — seguir en `*.op-sly.com` vs dominio Peskids propio (fecha: ___)
- [ ] **Nombre comercial** — “Peskids” en portal, emails y reportes
- [ ] **Redes sociales** — URLs inventariadas (IG, FB, web, etc.)

## Datos y fuentes

- [ ] **Fuente de datos actual** — hoja, CRM externo, WhatsApp manual, otro: ___
- [ ] **Export de base actual** — si existe, ubicación segura (fuera de repo): ___
- [ ] **Modelo v1** — [DATA-MODEL.md](./DATA-MODEL.md) revisado con owner
- [ ] **Supabase** — ¿schema dedicado futuro? decisión: ___

## Canales (futuro — inventario ahora)

- [ ] **WhatsApp / Jelou** — titular del número y proveedor; **no activar API en MVP**
- [ ] **Email transaccional** — Resend/dominio verificado para alertas
- [ ] **Discord/webhook** — si se usa para alertas ops

## Infra existente (validación humana)

- [ ] **Stack VPS** — `tenant_peskids` running (ver [OPS-RUNBOOK.md](./OPS-RUNBOOK.md))
- [ ] **n8n health** — URL responde
- [ ] **Uptime** — URL responde
- [ ] **CRM 4 workflows** — confirmado en UI n8n o `--dry-run` install script
- [ ] **Config JSON** — propuesta en [README.md](./README.md) aplicada o rechazada

## Producto MVP

- [ ] **MVP scope** — [MVP-PLAN.md](./MVP-PLAN.md) firmado por owner
- [ ] **Primeras métricas dashboard** — leads/semana, feedback abiertos, follow-ups pendientes
- [ ] **Criterios aceptación MVP** — todos los checkboxes en MVP-PLAN
- [ ] **CLIENT-PITCH** — leído y ajustado con lenguaje del cliente

## IA y cumplimiento

- [ ] **AI-APPROVAL-POLICY** — aceptada por owner
- [ ] **Sin auto-mensajería** — verificado en workflows diseño
- [ ] **LLM usage** — presupuesto `startup` entendido

## Integración Opsly

- [ ] **Invite tenant-scoped** — staff/owner recibe invitación propia de Peskids y aterriza en `/admin/login`; no debe caer al portal compartido por error
- [ ] **Portal invite** — ¿owner necesita además acceso al portal Opsly para operación compartida? sí / no / N/A
- [ ] **Eventos extracción** — lista en [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md) priorizada

## Extracción (trigger)

Disparar creación de `cloudsysops/peskids-platform` solo cuando:

- [ ] MVP en producción estable ≥ 4 semanas (acordado)
- [ ] Owner solicita dominio/marca propia
- [ ] Modelo datos estable y export probado
- [ ] Sin incidentes P1 abiertos en tenant
- [ ] [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md) revisado por arquitectura

**Fecha trigger extracción:** ___  
**Aprobado por:** ___

## Documentación

- [ ] Hub [README.md](./README.md) completo
- [ ] `docs/tenants/README.md` enlaza carpeta peskids
- [ ] `docs/brain/tenants/peskids.md` actualizado a `incubated` (opcional, post-review)

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
