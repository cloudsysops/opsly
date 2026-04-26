# Opsly Tenant Operations Skill

> **Triggers:** `onboard`, `tenant`, `suspend`, `resume`, `n8n`, `uptime`, `stack`, `cliente`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-api`, `opsly-supabase`, `opsly-discord`, `opsly-bash`

## Cuándo usar

Onboarding, suspensión, resume o diagnóstico de stacks por tenant.

## Onboarding

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/onboard-tenant.sh \
    --slug mi-cliente \
    --email owner@cliente.com \
    --plan startup
```

Usar `--dry-run` primero si el entorno no está validado. Variables Supabase/path/compose: ver salida de `--help` del script y `AGENTS.md`.

## Planes (CHECK SQL / producto)

- `startup` | `business` | `enterprise` — alineados a `BILLING_PLANS` / scripts del repo (no inventar `pro`).

## Reglas críticas

- **Nunca** `docker system prune --volumes` en producción sin procedimiento acordado.
- Stacks por tenant con compose aislado; nombres y paths según `scripts/onboard-tenant.sh` y plantillas en `infra/`.
- Credenciales generadas → **Doppler** `prd`, no en chat ni commit.

## URLs típicas (staging actual)

- n8n: `https://n8n-{slug}.{PLATFORM_DOMAIN}`
- Uptime: `https://uptime-{slug}.{PLATFORM_DOMAIN}`
- Portal: `https://portal.{PLATFORM_DOMAIN}`

Sustituir `PLATFORM_DOMAIN` por el dominio base del entorno (ej. `ops.smiletripcare.com`).

## Errores comunes

| Error         | Causa                     | Solución                      |
| ------------- | ------------------------- | ----------------------------- | --------- |
| Stack failed  | Credenciales no generadas | Revisar Doppler `prd`         |
| n8n 502       | Contenedor caído          | `docker ps                    | grep n8n` |
| Invite failed | Resend dominio            | Verificar `RESEND_FROM_EMAIL` |

## Testing

```bash
# Verificar stack corriendo
docker ps | grep tenant_micliente

# Health check tenant
curl -sf https://n8n-micliente.ops.smiletripcare.com/healthz

# Ver logs
docker logs n8n_micliente_1 --tail 50
```
