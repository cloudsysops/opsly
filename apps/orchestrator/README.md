# Orquestador Opsly (`@intcloudsysops/orchestrator`)

**Nombre recomendado en runbooks y chat interno:** **Orquestador Opsly** o **BullMQ Orchestrator** — no confundir con el **OpenClaw CLI** (`openclaw` npm), que es otra pieza.

## Qué hace este paquete

- Consume **Redis / BullMQ** y ejecuta **workers** (Cursor, n8n, Ollama, jobs `local_*`, Hive, etc.).
- Expone **HTTP** (health, rutas internas) en el puerto configurado (`ORCHESTRATOR_HEALTH_PORT`, típico **3011**).
- Implementa la **capa de rutado OpenClaw en TypeScript** (`src/openclaw/`: control layer, registry) — es **lógica de decisión** previa a encolar; **no** incluye el binario `openclaw gateway`.

## Qué **no** es

- **No** es el **OpenClaw CLI** (gateway WebSocket, TUI, canales). Ese CLI se instala aparte: `npm install -g openclaw` y se documenta en `docs/01-development/OPENCLAW-TERMINOLOGY.md`.
- **No** orquesta procesos del CLI en el VPS (no arranca N instancias `openclaw`, no las supervisa). Eso queda fuera de este servicio: tmux, systemd u operación manual según `docs/04-infrastructure/OPENCLAW-CLI-VPS-META-ORCHESTRATOR.md`.

## Docs

- `docs/ORCHESTRATOR.md`
- `docs/01-development/OPENCLAW-TERMINOLOGY.md`
- `docs/00-architecture/OPENCLAW-ARCHITECTURE.md`
