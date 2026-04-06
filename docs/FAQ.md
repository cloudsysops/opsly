# FAQ — Opsly (operaciones y desarrollo)

## ¿Dónde está el estado vivo del proyecto?

En `AGENTS.md` (fecha, bloqueantes, próximo paso). Visión de producto: `VISION.md`.

## ¿Cómo despliego a staging/producción?

Imágenes en GHCR vía workflow de deploy; en el VPS `git pull`, `docker compose pull` y `up` según `infra/` y scripts (`vps-bootstrap.sh`, `vps-first-run.sh`). Detalle: `AGENTS.md` y `docs/runbooks/admin.md`.

## ¿Por qué falla `terraform plan` con “401” o error de token?

`do_token` es un placeholder o inválido. Exportá un PAT real con `TF_VAR_do_token` o usá Doppler; no commitees tokens. Ver `infra/terraform/terraform.tfvars.example` y ADR-008.

## ¿Dónde documentamos un incidente?

Pasos iniciales en `docs/runbooks/incident.md`; decisiones de arquitectura que cambien el diseño van a `docs/adr/`.

## ¿Cómo ejecuto tests?

En la raíz: `npm run test` (Vitest en `apps/api` y otros workspaces que definan el script). Antes de PR: `npm run type-check`.

## ¿Qué es el portal “developer” vs “managed”?

Modos de experiencia portal derivados de metadata (`parsePortalMode` en `apps/api/lib/portal-me.ts`). Runbook de alto nivel: `docs/runbooks/managed.md`.
