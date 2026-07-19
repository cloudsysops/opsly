---
status: draft
owner: architecture
last_review: 2026-07-19
type: blueprint
---

# Academy Blueprint

Contratos mínimos para convertir Peskids en un vertical Academy reproducible,
sin duplicar el control plane ni modificar su runtime actual.

## Archivos

- `blueprint.yaml`: manifiesto y referencias del vertical.
- `tenant.schema.json`: contrato de una instancia Academy.
- `capabilities.yaml`: capacidades de negocio y su fuente actual.
- `integrations.yaml`: proveedores y defaults seguros.
- `roles.yaml`: roles humanos y del agente.
- `agent-policy.yaml`: límites del futuro Opsly Executive Agent.
- `ACADEMY-BLUEPRINT-AGENT-BASELINE.md`: inventario basado en código.

## Estado

Este directorio es una base contractual. No provisiona infraestructura, no
crea tenants, no activa WACRM y no modifica datos. Peskids continúa como tenant
piloto y Twenty continúa como CRM primario.

## Validación

```bash
npm run validate:academy-blueprint
npm run guard:ghl-runtime
```

## Próxima integración

El siguiente PR debe reconciliar estos contratos con
`config/client-launch.schema.json`, `config/tenants/schema.tenant-config.json`
y `scripts/client-plan.ts`, manteniendo cualquier ejecución en `--dry-run`.
