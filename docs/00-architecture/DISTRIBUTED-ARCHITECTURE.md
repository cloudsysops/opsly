# Arquitectura distribuida — guía de operación

> **Objetivo:** operar Opsly con **VPS** como control plane y **Mac 2011** (u otro worker) como nodo de **workers** y opcionalmente **Ollama / cargas pesadas**.  
> **Diseño detallado:** `docs/ARCHITECTURE-DISTRIBUTED-FINAL.md`.  
> **Dominios de ejemplo** (staging): ver `config/opsly.config.json` → `domains.base`, `api`, `admin`, `portal`.

## Estado deseado (resumen)

```
VPS (edge + datos de plataforma)
├── API, Admin, Portal (Traefik)
├── Redis (solo red privada / Tailscale hacia workers)
├── Orchestrator (opcional en VPS o solo “control” según OPSLY_ORCHESTRATOR_ROLE)
├── n8n / Uptime por tenant
└── Imágenes GHCR: api, admin, portal, …

Mac 2011 Worker (Tailscale)
├── Proceso orchestrator worker (BullMQ) — tmux / systemd
├── Ollama (opcional, :11434)
└── (Opcional futuro) contenedores movidos desde VPS
```

## URLs de acceso

### Públicas (vía Traefik)

Sustituye `BASE` por tu `domains.base` (ej. `ops.smiletripcare.com`):

| Uso                  | URL                   |
| -------------------- | --------------------- |
| API                  | `https://api.BASE`    |
| Admin                | `https://admin.BASE`  |
| Portal               | `https://portal.BASE` |
| MCP (si está en VPS) | `https://mcp.BASE`    |

Si **migras** servicios al worker y los expones por Traefik en el VPS, añade **DNS** y routers (no documentar rutas concretas hasta que existan en `infra/`).

### Tailscale (diagnóstico)

| Destino  | Ejemplo                                            |
| -------- | -------------------------------------------------- |
| VPS      | `100.120.151.91` (verificar en `tailscale status`) |
| Mac 2011 | `100.80.41.29` (`opsly-worker`)                    |

**Redis:** usar la URL completa con contraseña desde Doppler / `.env.worker` (no pegar en chat).

## Comandos de gestión

### Ver estado — VPS

```bash
ssh vps-dragon@100.120.151.91 "df -h / && docker ps --format '{{.Names}}\t{{.Status}}' | head -30"
```

### Ver estado — Mac 2011

```bash
ssh opsly-worker "df -h / && free -h && tmux list-sessions 2>/dev/null || true"
docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null | head -15
```

### Arranque worker (recomendado)

Desde el clon del repo en el worker:

```bash
cd ~/opsly   # o la ruta real
./scripts/start-workers-mac2011.sh
```

Con simulación:

```bash
./scripts/start-workers-mac2011.sh --dry-run
```

Requisitos: `.env.worker` con `REDIS_URL` válido (ver `docs/WORKER-SETUP-MAC2011.md`).

### Puertos del monorepo (recordatorio)

No usar **3001** para LLM Gateway: en compose, **LLM Gateway = 3010**, **MCP = 3003**, **Context Builder = 3012**, **Orchestrator health = 3011**.

## Migración de servicios pesados (checklist)

1. Ventana de mantenimiento y aviso.
2. **No** exponer Redis al mundo; validar conectividad worker → VPS solo por Tailscale.
3. Levantar en el worker la **misma versión** de imagen / build que en producción.
4. Actualizar **variables** (`OLLAMA_HOST`, `ORCHESTRATOR_LLM_GATEWAY_URL`, etc.) y **Traefik** si hay rutas públicas.
5. En el VPS: `docker compose stop` / `down` del servicio migrado, `docker image prune` cuando corresponda.
6. Smoke: `scripts/verify-platform-smoke.sh` y pruebas de cola BullMQ.

## Troubleshooting

### Worker no procesa jobs

1. `REDIS_URL` correcto y Redis en VPS accesible por Tailscale.
2. Firewall en Mac 2011: no bloquear salida a `100.120.151.91:6379` (o el puerto que uses).
3. Logs del proceso worker / tmux.

### VPS no alcanza al worker

1. `tailscale ping` entre nodos.
2. Servicios escuchando en `0.0.0.0` o en la IP Tailscale según diseño.

### Ollama lento o sin memoria

Reducir modelo, o mover inferencia a proveedor vía LLM Gateway.

## Mantenimiento

| Frecuencia   | Acción                                                         |
| ------------ | -------------------------------------------------------------- |
| Diaria       | `df` en VPS; revisar `docs/OPS-CLEANUP-PROCEDURES.md` si >90 % |
| Semanal      | Logs, `docker system df` en VPS                                |
| Tras cambios | `./scripts/verify-platform-smoke.sh`                           |

## Referencias cruzadas

- `docs/ARCHITECTURE-DISTRIBUTED-FINAL.md` — diagrama y puertos.
- `docs/WORKER-SETUP-MAC2011.md` — SSH, Tailscale, `.env.worker`.
- `docs/HEAVY-SERVICES-DECISION.md` — cuándo mover Ollama/OpenClaw.
- `docs/INCIDENT-2026-04-11-DISCO-LLENO.md` — incidente disco (contexto).
