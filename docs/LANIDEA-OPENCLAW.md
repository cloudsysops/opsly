# Lanidea OpenClaw - Equipos de Agentes en Docker

## Resumen

Stack Docker Compose para ejecutar equipos de **agentes Lanidea** con Ollama local, orchestrator worker y auto-gestión (commit/pull automáticos).

## Estructura del equipo

| Rol          | Persona           | Descripción                                 |
| ------------ | ----------------- | ------------------------------------------- |
| **Desayuno** | planner-desayuno  | Planifica y analiza el objetivo             |
| **Desayuno** | executor-desayuno | Ejecuta las tareas asignadas                |
| **Desayuno** | notifier-desayuno | Resume estado y siguiente acción            |
| **Líder**    | lider-arquitecto  | Evalúa, identifica riesgos, toma decisiones |

## Archivos creados

| Archivo                            | Descripción                                         |
| ---------------------------------- | --------------------------------------------------- |
| `infra/docker-compose.lanidea.yml` | Compose con Ollama + Orchestrator + Mission Control |
| `scripts/create-lanidea-agents.sh` | Script para encolar equipos de trabajo              |

## Uso rápido

### 1. Iniciar stack Docker

```bash
docker compose -f infra/docker-compose.lanidea.yml up -d
```

### 2. Verificar Ollama

```bash
curl -sf http://localhost:11434/api/tags
```

### 3. Encolar equipo Lanidea

```bash
PLATFORM_ADMIN_TOKEN=... ./scripts/create-lanidea-agents.sh \
  --tenant smiletripcare \
  --goal "Optimizar costos cloud y mejorar rendimiento"
```

### 4. Ver logs

```bash
docker compose -f infra/docker-compose.lanidea.yml logs -f ollama
```

## Variables de entorno requeridas

| Variable               | Descripción               | Ejemplo                                   |
| ---------------------- | ------------------------- | ----------------------------------------- |
| `REDIS_URL`            | Redis del VPS (Tailscale) | `redis://:password@100.120.151.91:6379/0` |
| `LLM_GATEWAY_URL`      | LLM Gateway del VPS       | `http://100.120.151.91:3010`              |
| `PLATFORM_ADMIN_TOKEN` | Token para encolar jobs   | Desde Doppler                             |

## Auto-gestión (commit/pull)

Los agentes tienen flag `auto_commit` en sus metadatos. Al completar:

1. El worker de Ollama registra el resultado en Redis
2. El script de monitoring detecta completion y ejecuta:
   - `git add -A && git commit` si hay cambios
   - `git pull origin main` para sincronizar

## Mission Control

Dashboard en `http://localhost:3015` para ver:

- Equipos activos
- Jobs en cola
- Resultados de agentes

## Troubleshooting

```bash
# Ver estado de servicios
docker compose -f infra/docker-compose.lanidea.yml ps

# Ver logs Ollama
docker logs lanidea-ollama

# Ver logs Orchestrator
docker logs lanidea-orchestrator

# Reiniciar servicios
docker compose -f infra/docker-compose.lanidea.yml restart
```
