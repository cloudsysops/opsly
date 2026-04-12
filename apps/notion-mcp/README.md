# `@intcloudsysops/notion-mcp`

Servicio HTTP que expone tareas, standup y quality gates sobre **Notion** (misma base que ves en el navegador).

## Requisitos

- Secretos en **Doppler** `ops-intcloudsysops` / `prd`: `NOTION_TOKEN`, `NOTION_DATABASE_*` (cinco UUIDs). Ver `docs/DOPPLER-VARS.md` y `.env.example`.
- Integración de Notion conectada a cada base (Connections → tu integración).

## Arranque (recomendado)

Desde la raíz del monorepo:

```bash
npm run dev:notion-mcp
```

Equivale a `doppler run … npm run dev` en este workspace.

## Comprobar

Con el servidor en marcha:

```bash
./scripts/test-notion-mcp.sh
```

`GET /ready` llama a la API de Notion y devuelve los **títulos** de las cinco bases; si falla, revisa token, IDs y permisos de la integración.

## Documentación

- [docs/NOTION-MCP-SERVER.md](../../docs/NOTION-MCP-SERVER.md)
- [docs/SETUP-NOTION-MCP.md](../../docs/SETUP-NOTION-MCP.md)
