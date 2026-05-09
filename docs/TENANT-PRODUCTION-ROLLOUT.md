# Rollout progresivo a producción — cohortes y rollback

## Principios

- Un **cohort** es un conjunto de tenants promovidos en la misma ventana con la misma versión de imágenes y configuración.
- Cada promoción tiene **criterios de salida** y **rollback** por tenant, no solo global.

## Fases sugeridas

### Cohort A — Control (bajo riesgo)

Tenants con tráfico interno o piloto, ya validados en staging.

- Criterios: checklist completo en [TENANT-PRODUCTION-CHECKLIST.md](./TENANT-PRODUCTION-CHECKLIST.md).
- Duración observación: mínimo 24 h.

### Cohort B — Producción general

Resto de tenants activos en `platform.tenants`.

- Solo después de A estable (sin incidentes P1/P2 sin root cause).
- Ventana de cambio preferible en horario acordado con owners.

### Cohort C — Deuda o tenants especiales

Subclientes managed, integraciones GCP/NotebookLM, o tenants con custom stacks.

- Requiere runbook específico (p. ej. LegalVial en `docs/runbooks/`).

## Gates antes de “promote”

1. CI verde en `main` para workspaces tocados (`api`, `web`, `orchestrator`, etc.).
2. Imágenes GHCR desplegadas en VPS (o plataforma activa) con misma digest que el commit etiquetado.
3. Smoke: `GET /api/health`, login portal (1 usuario), webhook Stripe (test o evento seguro).

## Rollback por tenant

| Acción | Cuándo | Pasos (alto nivel) |
| ------ | ------ | ------------------- |
| Revert imagen | Regresión en API/web | Volver tag/digest anterior en compose + `docker compose up -d` servicio afectado. |
| Suspender stack | Fallo aislado del tenant | `POST /api/tenants/{uuid}/suspend` con admin auth; notificar owner. |
| Feature flag | Fallo en feature opcional | Desactivar env (p. ej. NotebookLM) sin tumbar plataforma. |
| DB | Corrupción o migración mala | Restaurar backup Punto-en-tiempo; **solo** con runbook y acuerdo explícito. |

## Comunicación

- Avisar a owners de cohorte con: ventana, impacto esperado, contacto de rollback.
- Registrar resultado en `AGENTS.md` (sección estado) y fecha en checklist del tenant.

## Referencias

- [AUTONOMOUS-PRODUCTION-GO-LIVE-CHECKLIST.md](./runbooks/AUTONOMOUS-PRODUCTION-GO-LIVE-CHECKLIST.md)
- [DEPLOY-GITHUB-ACTIONS.md](./runbooks/DEPLOY-GITHUB-ACTIONS.md)
- [TENANT-PRODUCTION-BASELINE.md](./TENANT-PRODUCTION-BASELINE.md)
