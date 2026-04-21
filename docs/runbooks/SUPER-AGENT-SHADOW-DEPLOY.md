# Super Agent Shadow Deploy Runbook

Este runbook permite probar un stack **v2** (`context-builder-v2`, `mcp-v2`, `llm-gateway-v2`, `orchestrator-v2`) con rollback seguro al stack actual.

## Archivos

- Compose shadow: `infra/docker-compose.super-agent.yml`
- Script swap/rollback: `scripts/rollback-super-agent.sh`
- Diseño v2: `apps/context-builder-v2/src/design/architecture.md`

## Modelo de despliegue

Se usa `docker-compose.platform.yml` como base + `docker-compose.super-agent.yml` como overlay:

- **Current stack:** `context-builder`, `mcp`, `llm-gateway`, `orchestrator`
- **Super stack:** `context-builder-v2`, `mcp-v2`, `llm-gateway-v2`, `orchestrator-v2`

Los servicios v2 exponen puertos locales (loopback) para comparación sin colisión:

| Servicio v2 | Puerto interno | Host loopback |
| --- | ---: | ---: |
| `context-builder-v2` | `3112` | `3212` |
| `mcp-v2` | `3103` | `3203` |
| `llm-gateway-v2` | `3110` | `3210` |
| `orchestrator-v2` | `3111` | `3211` |

## Requisitos

1. Acceso SSH al VPS (`VPS_HOST`, por defecto `vps-dragon`)
2. `/opt/opsly/.env` válido en VPS
3. `docker-compose.platform.yml` operativo

## Uso del script

### 1) Simular cambios (sin ejecutar)

```bash
MODE=super-agent VPS_HOST=vps-dragon ./scripts/rollback-super-agent.sh --dry-run
```

### 2) Activar super-agent (con confirmaciones)

```bash
MODE=super-agent VPS_HOST=vps-dragon ./scripts/rollback-super-agent.sh
```

### 3) Activar super-agent sin preguntas (pipeline)

```bash
MODE=super-agent VPS_HOST=vps-dragon ./scripts/rollback-super-agent.sh --force
```

### 4) Volver a current

```bash
MODE=current VPS_HOST=vps-dragon ./scripts/rollback-super-agent.sh
```

## Comportamiento del script

### Si `MODE=super-agent`

1. Levanta `context-builder-v2` para precheck
2. Verifica `GET /health` de v2
3. Pide confirmación para swap
4. Detiene servicios current: `context-builder mcp llm-gateway orchestrator`
5. Levanta servicios v2
6. Espera (`WAIT_SECONDS`, default `10`)
7. Valida salud plataforma (`https://api.<PLATFORM_DOMAIN>/api/health`)
8. Si falla, ejecuta rollback automático

### Si `MODE=current`

1. Detiene servicios v2
2. Levanta servicios current
3. (Opcional) limpia residuos v2 con `CLEAN_V2_VOLUMES=true`

## Rollback automático

Si el health check final falla en modo super-agent:

1. `down` de stack v2
2. `up` de servicios current
3. Mensaje de recuperación completada

## Variables útiles

- `MODE=current|super-agent`
- `VPS_HOST=vps-dragon`
- `WAIT_SECONDS=10`
- `DRY_RUN=true|false`
- `FORCE=true|false`
- `CLEAN_V2_VOLUMES=true|false`

## Seguridad

- Servicios v2 en loopback (`127.0.0.1`) por defecto
- Sin rutas Traefik públicas en v2
- Secretos solo en `.env`/Doppler
- Recomendado ejecutar primero en `--dry-run`

