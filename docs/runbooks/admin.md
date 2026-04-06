# Runbook — Administración de plataforma (Opsly)

**Audiencia:** operador con token `PLATFORM_ADMIN_TOKEN` y acceso a Doppler `prd`.  
**Alcance:** control plane (API, admin), DNS/Terraform, secretos, despliegue VPS.

## Checklist diario (staging/producción)

1. Health API: `curl -sf https://api.<PLATFORM_DOMAIN>/api/health`
2. Último workflow Deploy en GitHub Actions en verde (build GHCR + pull en VPS)
3. Revisar `docker compose ps` en el VPS bajo `infra/` si hay incidencias

## Rotación de secretos

1. Generar nuevo valor en el proveedor (Stripe, Supabase, Resend, etc.)
2. `doppler secrets set CLAVE=… --project ops-intcloudsysops --config prd` (sin volcar valor en logs compartidos)
3. En VPS: `./scripts/vps-bootstrap.sh` o `doppler secrets download` según procedimiento vigente
4. Reiniciar servicios afectados (`docker compose up -d` en `infra/`)

## Alta de tenant (vía API)

- `POST /api/tenants` con Bearer admin y cuerpo válido (`slug`, `owner_email`, `plan`)
- Errores 409: slug duplicado; 401: token ausente o incorrecto
- Orquestación puede tardar; consultar `GET /api/tenants/:ref` para estado y `stack_status`

## Referencias

- `AGENTS.md` — estado y próximo paso
- `docs/adr/` — decisiones de arquitectura
- `docs/runbooks/incident.md` — respuesta a incidentes
