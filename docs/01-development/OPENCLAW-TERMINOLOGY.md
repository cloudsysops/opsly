# Terminología — OpenClaw CLI vs Orquestador Opsly

Evita usar **«OpenClaw»** solo para referirte al servicio Docker de colas: en conversación interna genera colisión con el **CLI** que instalás con npm.

## Nombres canónicos

| Nombre corto | Qué es | Dónde / cómo |
| -------------- | ------ | -------------- |
| **OpenClaw CLI** | Binario **`openclaw`** (OpenClaw 2026.x), Node **≥ 22.12**. Gateway WebSocket, `tui`, `agent`, `onboard`, canales, etc. | Máquina operador o VPS; **no** es el contenedor `opsly_orchestrator`. |
| **Orquestador Opsly** (o **BullMQ Orchestrator**) | Servicio **`apps/orchestrator`**: colas BullMQ, workers, `processIntent`, health típico **3011**. Incluye **módulos TypeScript** bajo `src/openclaw/` (router/control layer) — es código de **rutado Opsly**, no el binario npm. | Docker `opsly_orchestrator` + Redis. |
| **Capa OpenClaw (código)** | Reglas `applyOpenClawControlLayer`, `registry`, `runOpenClawController` dentro del **Orquestador Opsly**. | Repo: `apps/orchestrator/src/openclaw/`. |
| **MCP Opsly** | Servidor de herramientas para agentes externos. | Docker `opsly_mcp`, puerto **3003**. |
| **Cola Redis `openclaw`** | Nombre de **cola BullMQ** (historial); no implica que el CLI esté corriendo. | Redis compartido. |

## Límite de responsabilidades (importante)

**El Orquestador Opsly (`apps/orchestrator`) no es un «orquestador de procesos del CLI OpenClaw».** No levanta, no vigila y no multiplexa los binarios `openclaw` en el VPS.

- **Varios agentes / varias instancias OpenClaw CLI** (gateway, TUI, varios canales, etc.) → eso lo resolvés con **el propio CLI**, systemd, tmux o el patrón que documentamos para VPS (`docs/04-infrastructure/OPENCLAW-CLI-VPS-META-ORCHESTRATOR.md`). Ahí los binarios ya están en el host; Opsly no sustituye esa capa.
- **Orquestador Opsly** → colas BullMQ, workers TypeScript (Cursor, n8n, Discord, `local_*`, etc.), rutado de **intents** y políticas en código. Convive con el CLI; **no lo reemplaza** ni centraliza su ciclo de vida.

Si alguien dice «orquestador» sin calificar, en Opsly lo por defecto es **Orquestador Opsly (BullMQ)** salvo que el contexto sea explícitamente **CLI / tmux / varios openclaw en el VPS**.

## Regla de lenguaje

- Decís **«levantá el OpenClaw CLI»** o **`openclaw gateway`** → el npm global.  
- Decís **«el orquestador no encola»** o **«revisá BullMQ»** → **Orquestador Opsly** (`apps/orchestrator`).  
- Decís **«el router OpenClaw eligió local_claude»** → **capa TS** dentro del orquestador.

## Comandos útiles

```bash
# OpenClaw CLI (wrapper Node 22 del repo si hace falta)
npm run opsly:openclaw-cli -- --version

# Orquestador Opsly (desarrollo local)
npm run dev --workspace=@intcloudsysops/orchestrator
```

## Referencias

- `docs/01-development/AGENT-SERVICE-NAMING.md` — ids Opsly `local_*` vs `external_cli` (binario vendor).  
- `docs/01-development/.openclaw.md` — Node 22 y stack.  
- `docs/00-architecture/OPENCLAW-ARCHITECTURE.md` — arquitectura de colas y decisión.  
- `docs/04-infrastructure/OPENCLAW-CLI-VPS-META-ORCHESTRATOR.md` — CLI en VPS + tmux.  
- `apps/orchestrator/README.md` — rol del paquete **Orquestador Opsly**.
