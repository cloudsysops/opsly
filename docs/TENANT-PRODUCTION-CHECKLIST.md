# Checklist — Tenant listo para producción (Opsly)

Usar **una fila por tenant** antes de promover cohorte o de declarar go-live. Marcar evidencia (enlace a PR, ticket o fecha de verificación).

## Identidad y gobernanza

- [ ] `tenant_slug` estable (3–30, kebab-case); sin colisión en `platform.tenants`.
- [ ] `owner_email` correcto y verificado (invitación portal / Resend).
- [ ] Plan de facturación acordado (`startup` | `business` | `enterprise` | `demo`) alineado a Stripe/Doppler.
- [ ] Responsable humano nombrado (on-call / owner producto).
- [ ] Runbook de incidente enlazado (mínimo: [runbooks/incident.md](./runbooks/incident.md) + triage [TENANT-ONBOARDING-TRIAGE.md](./runbooks/TENANT-ONBOARDING-TRIAGE.md)).

## Datos y ciclo de vida

- [ ] Fila en `platform.tenants` con `status` coherente (`active` o transición documentada).
- [ ] `deleted_at` nulo salvo baja formal.
- [ ] Stacks Docker por tenant (`tenant_<slug>`) alineados a scripts (`onboard-tenant.sh`, compose plantilla).
- [ ] Suspend/resume solo vía API autenticada (`requireAdminAccess` en plano canónico).

## API y contratos

- [ ] Consumidores migrados a `https://api.<dominio>/api/*` donde sea posible.
- [ ] Si aún se usa host `web`, comprobar proxy y cabeceras (`Authorization`, `x-admin-token`, `stripe-signature`).
- [ ] OpenAPI / documentación de rutas críticas revisada para el tenant (portal, webhooks, métricas).

## Seguridad

- [ ] Cumplir [runbooks/PRODUCTION-SECURITY-BASELINE.md](./runbooks/PRODUCTION-SECURITY-BASELINE.md) y [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) (secciones Zero-Trust portal y admin).
- [ ] SSH administrativo solo Tailscale; Cloudflare proxy según política.
- [ ] Sin secretos en repo; Doppler `prd` completo para servicios que use el tenant.

## Observabilidad y continuidad

- [ ] Health: `GET /api/health` OK desde el edge (Traefik).
- [ ] Uptime/n8n URLs accesibles según contrato; credenciales en Doppler, no en código.
- [ ] Backup/restauración: política conocida (retención, S3/prefix si aplica).

## Subclientes / managed clients

Si aplica modelo padre + subcliente (p. ej. LegalVial bajo LocalRank):

- [ ] `tenant_slug` (padre) y `client_slug` (managed) definidos en DB/migraciones.
- [ ] Seguir [runbooks/SUBCLIENT-ONBOARDING-TEMPLATE.md](./runbooks/SUBCLIENT-ONBOARDING-TEMPLATE.md) y runbooks LegalVial si están activos.

## Firma de salida

- **Verificado por:** _______________  
- **Fecha:** _______________  
- **Cohort / release:** _______________
