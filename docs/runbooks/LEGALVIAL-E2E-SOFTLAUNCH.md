# LegalVial — E2E, soft-launch y rollback

## Smoke E2E (pre-producción o ventana controlada)

Ejecutar en orden; anotar resultado (OK/KO) y captura mínima (sin secretos).

1. **API plataforma**
   ```bash
   curl -sf "https://api.${PLATFORM_DOMAIN}/api/health"
   ```
2. **Invite flow (requiere token admin y Resend configurado)**
   ```bash
   ./scripts/test-e2e-invite-flow.sh --tenant-ref legalvial
   ```
   Variante sin mutar: `--dry-run` donde el script lo permita.
3. **Portal autenticado** (manual o Playwright si hay credenciales CI): login → dashboard → comprobar datos tenant `legalvial`.
4. **n8n / Uptime:** abrir URLs del tenant; comprobar login y página principal.
5. **Orquestador (opcional):** job de prueba con `tenant_slug=legalvial` y `request_id` único; ver logs JSON.

Referencias: [`ONBOARDING-NEW-CLIENT.md`](./ONBOARDING-NEW-CLIENT.md), [`TENANT-ONBOARDING-TRIAGE.md`](./TENANT-ONBOARDING-TRIAGE.md).

## Soft-launch

- Ventana acotada (fecha/hora) y responsable en turno.
- Criterio **Go:** checklist [LEGALVIAL-GOLIVE-CHECKLIST.md](./LEGALVIAL-GOLIVE-CHECKLIST.md) en verde para ítems críticos (seguridad, login, stacks).
- Criterio **No-Go:** incidente de seguridad, imposibilidad de login masivo, caída prolongada API/redis sin mitigación.

## Rollback (orden sugerido)

1. **Degradar tráfico:** quitar DNS o pausar routers Traefik hacia servicios LegalVial si hace falta aislar.
2. **Stack tenant:** desde VPS, bajar solo el Compose del slug (no `docker-compose.platform.yml`):
   ```bash
   # TENANTS_PATH suele ser <repo>/tenants o /opt/opsly/runtime/tenants según despliegue
   export TENANTS_PATH="${TENANTS_PATH:-/opt/opsly/runtime/tenants}"
   docker compose -f "${TENANTS_PATH}/docker-compose.legalvial.yml" down
   ```
   Confirmar ruta del `-f` con `TENANTS_PATH` y el patrón `docker-compose.<slug>.yml` (ver `scripts/opsly.sh` / `scripts/deploy/rollout-tenant.sh`).
3. **Datos:** no borrar schema Supabase sin decisión explícita; preferir marcar tenant `suspended` vía API/procedimiento estándar.
4. **Secretos:** si hubo fuga, seguir [SECRET-ROTATION-AFTER-EXPOSURE.md](./SECRET-ROTATION-AFTER-EXPOSURE.md).
5. **Post-mortem:** actualizar AGENTS / runbook con lecciones.

## Métricas post-release (24–72 h)

- Errores 5xx en API, latencia cola BullMQ, costes LLM por `tenant_slug`, alertas Discord.
