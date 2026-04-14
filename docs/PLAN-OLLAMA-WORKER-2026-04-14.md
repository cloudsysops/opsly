# Plan: OpenClaw Orchestrator + Ollama Local en Worker Mac 2011

**Fecha:** 2026-04-14  
**ADR:** `docs/adr/ADR-024-ollama-local-worker-primary.md`

---

## Objetivo

Dejar operativo:
- **VPS** = control plane (API, LLM Gateway, orchestrator `queue-only`)
- **Mac 2011** (`opslyquantum`) = worker plane (Ollama local, BullMQ workers)
- **LLM Gateway** = routing centralizado con `llama_local` como provider primary (costo $0)

---

## FASE 1: Configuración Doppler

### 1.1 Variables en Doppler `prd`

```bash
# desde Mac principal (opsly-admin)
doppler secrets set OLLAMA_URL=http://100.80.41.29:11434 \
  --project ops-intcloudsysops --config prd

# Modelo recomendado para coding:
doppler secrets set OLLAMA_MODEL=qwen2.5-coder \
  --project ops-intcloudsysops --config prd

# Alternativa general:
# doppler secrets set OLLAMA_MODEL=llama3.2 \
#   --project ops-intcloudsysops --config prd
```

### 1.2 Routing bias por defecto

El LLM Gateway ya tiene `routing_bias` en `routing-hints.ts`. Por defecto:
- Tareas simples (complexity 1) → `cheap` → `llama_local` primary
- Tareas complejas (complexity 3) → `sonnet` → Claude

**No requiere cambios de código** si `complexityLevel` se infiere correctamente.

---

## FASE 2: Setup Worker Mac 2011

### 2.1 Verificar acceso SSH

```bash
ssh opsly-worker "hostname && uptime"
```

### 2.2 Verificar Ollama corriendo

```bash
ssh opsly-worker "curl -sf http://127.0.0.1:11434/api/tags | jq '.[\"models\"] | length'"
```

Si no está corriendo:

```bash
ssh opsly-worker "docker ps | grep ollama || echo 'NO_OLLAMA'"
```

Si Docker no tiene Ollama, iniciar con compose:

```bash
ssh opsly-worker "cd ~/opsly && \
  OLLAMA_ORIGINS='*' docker compose -f infra/docker-compose.opslyquantum.yml up -d ollama"
```

### 2.3 Descargar modelo (si no existe)

```bash
ssh opsly-worker "docker exec opslyquantum-ollama ollama list | grep qwen2.5-coder || \
  docker exec opslyquantum-ollama ollama pull qwen2.5-coder"
```

### 2.4 Configurar orchestrator en modo worker

En el worker Mac 2011, crear `.env.local` o usar Doppler:

```bash
ssh opsly-worker "cd ~/opsly && \
  echo 'OPSLY_ORCHESTRATOR_MODE=worker-enabled' >> .env.local && \
  echo 'REDIS_URL=redis://100.120.151.91:6379' >> .env.local && \
  echo 'LLM_GATEWAY_URL=http://100.120.151.91:3010' >> .env.local"
```

### 2.5 Arrancar orchestrator worker

```bash
ssh opsly-worker "cd ~/opsly && \
  OPSLY_ORCHESTRATOR_MODE=worker-enabled \
  REDIS_URL=redis://100.120.151.91:6379 \
  LLM_GATEWAY_URL=http://100.120.151.91:3010 \
  npm run start --workspace=@intcloudsysops/orchestrator"
```

O usar el script existente:

```bash
ssh opsly-worker "cd ~/opsly && \
  OPSLY_ORCHESTRATOR_MODE=worker-enabled \
  ./scripts/start-workers-mac2011.sh"
```

---

## FASE 3: Configurar VPS (control plane)

### 3.1 Verificar LLM Gateway tiene OLLAMA_URL

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  source .env && echo \$OLLAMA_URL"
```

Si no está, actualizar en Doppler y regenerar .env:

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  ./scripts/vps-bootstrap.sh"
```

### 3.2 Configurar orchestrator VPS en modo queue-only

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  grep -q OPSLY_ORCHESTRATOR_MODE .env && \
  sed -i 's/^OPSLY_ORCHESTRATOR_MODE=.*/OPSLY_ORCHESTRATOR_MODE=queue-only/' .env || \
  echo 'OPSLY_ORCHESTRATOR_MODE=queue-only' >> .env"
```

### 3.3 Reiniciar servicios

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly/infra && \
  docker compose -f docker-compose.platform.yml restart llm-gateway orchestrator"
```

---

## FASE 4: Validación

### 4.1 Health Ollama desde VPS

```bash
ssh vps-dragon@100.120.151.91 "curl -sf --max-time 5 http://100.80.41.29:11434/api/tags"
```

### 4.2 Health daemon en LLM Gateway

```bash
ssh vps-dragon@100.120.151.91 "curl -sf http://127.0.0.1:3010/health | jq '.providers.llama_local'"
```

### 4.3 Type-check y tests

```bash
cd /opt/opsly && npm run type-check
npm run test --workspace=@intcloudsysops/llm-gateway
npm run test --workspace=@intcloudsysops/orchestrator
```

### 4.4 Demo ollama job

```bash
API_URL=https://api.ops.smiletripcare.com \
ADMIN_TOKEN=$(doppler secrets get PLATFORM_ADMIN_TOKEN --project ops-intcloudsysops --config prd --plain) \
TENANT=localrank \
./scripts/demo-ollama-workers.sh
```

### 4.5 Verificar worker health endpoint

```bash
ssh opsly-worker "curl -sf http://127.0.0.1:3011/health | jq '{mode, role}'"
```

---

## FASE 5: Actualizar AGENTS.md

Al cerrar sesión, agregar en sección **🔄 Decisiones tomadas**:

```
| 2026-04-14 | ADR-024: Ollama Local como provider primary en worker Mac 2011 | Routing $0 para tareas simples; VPS alivia CPU |
```

---

## Comandos de verificación rápida

```bash
# Todo el stack
./scripts/validate-ai-health-all.sh

# Solo Ollama
curl -sf http://100.80.41.29:11434/api/tags | jq

# Solo LLM Gateway
curl -sf http://100.120.151.91:3010/health

# Solo orchestrator worker
curl -sf http://127.0.0.1:3011/health

# Jobs en cola
ssh vps-dragon@100.120.151.91 "redis-cli -n 0 LLEN openclaw"
```

---

## Rollback (si algo falla)

```bash
# 1. Volver orchestrator VPS a full
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  sed -i 's/^OPSLY_ORCHESTRATOR_MODE=queue-only/#OPSLY_ORCHESTRATOR_MODE=queue-only/' .env"

# 2. Reiniciar
ssh vps-dragon@100.120.151.91 "cd /opt/opsly/infra && \
  docker compose -f docker-compose.platform.yml restart orchestrator"

# 3. Detener worker Mac 2011
ssh opsly-worker "tmux kill-session -t opsly-orchestrator 2>/dev/null || true"
```
