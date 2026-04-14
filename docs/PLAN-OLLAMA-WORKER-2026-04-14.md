# Plan: OpenClaw Orchestrator + Ollama Local en Worker Mac 2011

**Fecha:** 2026-04-14  
**ADR:** `docs/adr/ADR-024-ollama-local-worker-primary.md`

---

## Objetivo

Dejar operativo:
- **VPS** = control plane (API, Redis, LLM Gateway, orchestrator `queue-only`)
- **Mac 2011** (`opslyquantum` en `opsly-mac2011`) = worker plane (Ollama local, BullMQ workers)
- **LLM Gateway** = routing centralizado con `llama_local` como provider primary y fallback cloud siempre disponible

---

## FASE 1: Configuración Doppler

### 1.1 Variables en Doppler `prd`

```bash
# desde Mac principal (opsly-admin); IP actual del worker: 100.80.41.29
doppler secrets set OLLAMA_URL=http://100.80.41.29:11434 \
  --project ops-intcloudsysops --config prd

# Exportar Redis y gateway solo por Tailscale en el VPS:
doppler secrets set REDIS_EXPORT_BIND=100.120.151.91 \
  --project ops-intcloudsysops --config prd
doppler secrets set LLM_GATEWAY_EXPORT_BIND=100.120.151.91 \
  --project ops-intcloudsysops --config prd

# Modelo recomendado para levantar rápido en Mac 2011:
doppler secrets set OLLAMA_MODEL=llama3.2 \
  --project ops-intcloudsysops --config prd

# Alternativa orientada a coding:
# doppler secrets set OLLAMA_MODEL=qwen2.5-coder \
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
ssh opslyquantum@100.80.41.29 "hostname && uptime"
```

### 2.2 Verificar Ollama corriendo

```bash
ssh opslyquantum@100.80.41.29 "curl -sf http://127.0.0.1:11434/api/tags | jq '.[\"models\"] | length'"
```

Si no está corriendo:

```bash
ssh opslyquantum@100.80.41.29 "docker ps | grep ollama || echo 'NO_OLLAMA'"
```

Si Docker no tiene Ollama, iniciar con compose:

```bash
ssh opslyquantum@100.80.41.29 "cd ~/opsly && \
  OLLAMA_ORIGINS='*' docker compose -f infra/docker-compose.opslyquantum.yml up -d ollama"
```

### 2.3 Descargar modelo (si no existe)

```bash
ssh opslyquantum@100.80.41.29 "docker exec opslyquantum-ollama ollama list | grep llama3.2 || \
  docker exec opslyquantum-ollama ollama pull llama3.2"
```

### 2.4 Configurar orchestrator en modo worker

En el worker Mac 2011, crear `.env.local` o usar Doppler:

```bash
ssh opslyquantum@100.80.41.29 "cd ~/opsly && grep -E '^(REDIS_URL|LLM_GATEWAY_URL|OPSLY_ORCHESTRATOR_MODE)=' .env.worker .env.local 2>/dev/null || true"
```

Si faltan, completarlas sin hardcodear la password fuera del secreto:

```bash
ssh opslyquantum@100.80.41.29 "cd ~/opsly && cat >> .env.worker <<'EOF'
OPSLY_ORCHESTRATOR_MODE=worker-enabled
LLM_GATEWAY_URL=http://100.120.151.91:3010
ORCHESTRATOR_CURSOR_CONCURRENCY=1
ORCHESTRATOR_OLLAMA_CONCURRENCY=1
ORCHESTRATOR_N8N_CONCURRENCY=1
ORCHESTRATOR_DRIVE_CONCURRENCY=1
ORCHESTRATOR_NOTIFY_CONCURRENCY=2
EOF"
```

`REDIS_URL` debe quedar como `redis://:PASSWORD@100.120.151.91:6379/0`, leyendo la password desde Doppler/secret local del worker.

### 2.5 Arrancar orchestrator worker

```bash
ssh opslyquantum@100.80.41.29 "cd ~/opsly && \
  set -a && source .env.worker && set +a && \
  npm run start --workspace=@intcloudsysops/orchestrator"
```

O usar el script existente:

```bash
ssh opslyquantum@100.80.41.29 "cd ~/opsly && \
  set -a && source .env.worker && set +a && \
  ./scripts/start-workers-mac2011.sh"
```

---

## FASE 3: Configurar VPS (control plane)

### 3.1 Verificar LLM Gateway tiene OLLAMA_URL

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  source .env && printf 'OLLAMA_URL=%s\nREDIS_EXPORT_BIND=%s\nLLM_GATEWAY_EXPORT_BIND=%s\n' \"\$OLLAMA_URL\" \"\${REDIS_EXPORT_BIND:-}\" \"\${LLM_GATEWAY_EXPORT_BIND:-}\""
```

Si no está, actualizar en Doppler y regenerar .env:

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  ./scripts/vps-bootstrap.sh"
```

### 3.2 Configurar orchestrator VPS en modo queue-only

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  perl -0pi -e 's/^OPSLY_ORCHESTRATOR_MODE=.*\n//mg; s/\z/\nOPSLY_ORCHESTRATOR_MODE=queue-only\n/s unless /OPSLY_ORCHESTRATOR_MODE=/' .env"
```

### 3.3 Reiniciar servicios

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly/infra && \
  docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --force-recreate redis llm-gateway orchestrator"
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

### 4.3 Health gateway desde el worker

```bash
ssh opslyquantum@100.80.41.29 "curl -sf http://100.120.151.91:3010/health | jq '{status, providers}'"
```

### 4.4 Type-check y tests

```bash
cd ~/opsly && npm run type-check
npm run test --workspace=@intcloudsysops/llm-gateway
npm run test --workspace=@intcloudsysops/orchestrator
```

### 4.5 Demo ollama job

```bash
API_URL=https://api.ops.smiletripcare.com \
ADMIN_TOKEN=$(doppler secrets get PLATFORM_ADMIN_TOKEN --project ops-intcloudsysops --config prd --plain) \
TENANT=localrank \
./scripts/demo-ollama-workers.sh
```

### 4.6 Verificar worker health endpoint

```bash
ssh opslyquantum@100.80.41.29 "curl -sf http://127.0.0.1:3011/health | jq '{mode, role}'"
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
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && source .env && redis-cli -a \"\$REDIS_PASSWORD\" -n 0 LLEN bull:openclaw:wait"
```

---

## Rollback (si algo falla)

```bash
# 1. Volver orchestrator VPS a full
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  perl -0pi -e 's/^OPSLY_ORCHESTRATOR_MODE=queue-only\n//mg' .env"

# 2. Reiniciar
ssh vps-dragon@100.120.151.91 "cd /opt/opsly/infra && \
  docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --force-recreate orchestrator"

# 3. Detener worker Mac 2011
ssh opslyquantum@100.80.41.29 "tmux kill-session -t opsly-orchestrator 2>/dev/null || true"
```
