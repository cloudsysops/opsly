# 🚀 OpenClaw Team — Plan de Nivel Superior

> **Misión:** Convertir Opsly en la plataforma de agentes autónomos más inteligente y autónoma dela industria.

---

## 📊 Estado Actual (2026-04-15)

### ✅ Ya Operando

| Componente      | Estado           | Notas                             |
| --------------- | ---------------- | --------------------------------- |
| OpenClaw MCP    | ✅ 14 tools      | tenants, metrics, notebooklm, etc |
| Orchestrator    | ✅ BullMQ        | Jobs encolados                    |
| LLM Gateway     | ✅ Cache+Routing | Redis cache                       |
| ML Workspace    | ✅ Compila       | classifier, RAG, insights         |
| NotebookLM      | ✅ Configurado   | Knowledge layer                   |
| Skills Obsidian | ✅ 23 docs       | Organizados                       |
| Docker Compose  | ✅ 9 servicios   | Todos healthy                     |

### ⏳ Pendiente

| Componente    | Estado       | Owner           |
| ------------- | ------------ | --------------- |
| GCP ML        | ⏳ Config    | Vars en Doppler |
| BigQuery Sync | ⏳ Setup     | Scripts listos  |
| SSH Keys      | ❌ Tailscale | Config keys     |

---

## 🎯 Plan a 30 Días

### Semana 1: Fundamentos (2026-04-15 → 2026-04-22)

#### Objetivo: Sistema 100% Autónomo

- [ ] **1.1** GCP config completa (Vertex AI + BigQuery)
  - `doppler secrets set GCLOUD_PROJECT_ID=opslyquantum`
  - `doppler secrets set VERTEX_AI_REGION=us-central1`
  - `doppler secrets set BIGQUERY_DATASET=opsly_ml`
  - `doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON=<json>`

- [ ] **1.2** BigQuery sync automatizado
  - `./scripts/sync-to-gcp.sh` → cron hourly
  - Tablas: `usage_events`, `llm_decisions`, `predictions`

- [ ] **1.3** SSH keys configuradas
  - Generar keys: `ssh-keygen -t ed25519`
  - Copiar a VPS: `ssh-copy-id vps-dragon@100.120.151.91`

- [ ] **1.4** Dashboard ML operativo
  - `/api/admin/ml-insights`
  - `/api/admin/costs` con GCP tracking

---

### Semana 2: Agentes Inteligentes (2026-04-22 → 2026-04-29)

#### Objetivo: Agentes con Contexto Profundo

- [ ] **2.1** NotebookLM → todos los agentes
  - Query startup obligatorio
  - Cache 5 min
  - Fallback local

- [ ] **2.2** RAG pipeline completo
  - Embeddings desde Supabase
  - Búsqueda semántica
  - Context enrichment

- [ ] **2.3** Hermes Orchestrator inteligente
  - Decisiones automáticas
  - Cost optimization
  - Auto-failover

- [ ] **2.4** MCP Tools enhanced
  - `execute_prompt` con contexto
  - `get_insights` desde BigQuery
  - `analyze_cost` con ML

---

### Semana 3: Autonomía Completa (2026-04-29 → 2026-05-06)

#### Objetivo: Zero-Touch Operation

- [ ] **3.1** Self-healing agentes
  - Circuit breaker
  - Auto-retry
  - Fallback automático

- [ ] **3.2** Cost optimization auto
  - Budget alerts
  - Model routing inteligente
  - Cache optimization

- [ ] **3.3** Monitoring completo
  - Grafana dashboards
  - Alertas automáticas
  - Slack/Discord notifications

- [ ] **3.4** Cronjobs operativos
  - Sync BigQuery hourly
  - NotebookLM sync daily
  - Cost reports daily

---

### Semana 4: Escala (2026-05-06 → 2026-05-13)

#### Objetivo: Multi-Tenant Scale

- [ ] **4.1** Workers adicionales
  - GCP compute (fallover)
  - Mac 2011 (primary)
  - VPS queue-only mode

- [ ] **4.2** Load balancing
  - Multi-instance API
  - Redis clustering
  - Traefik optimization

- [ ] **4.3** Backup automation
  - Supabase backups
  - Docker images
  - Config versionado

- [ ] **4.4** Documentación completa
  - Runbooks
  - ADRs actualizados
  - SOPs

---

## 📋 KPI s Semanales

| KPI          | Semana 1 | Semana 2 | Semana 3 | Semana 4 |
| ------------ | -------- | -------- | -------- | -------- |
| Uptime       | 99%      | 99.5%    | 99.9%    | 99.9%    |
| ML Cost      | $0       | $5       | $10      | $20      |
| Agents Ready | 14       | 20       | 30       | 40       |
| Tenants      | 5        | 10       | 20       | 50       |
| Auto-heal    | No       | Partial  | Full     | Full     |

---

## 🛠️ Tech Stack Objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPENCLAW FINAL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Claude    │  │ Cursor    │  │ OpenCode  │        │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘        │
│        │             │             │                 │
│        └─────────────┼─────────────┘                │
│                      ▼                              │
│              ┌──────────────┐                       │
│              │  MCP Layer  │  ←14 tools            │
│              └──────┬───────┘                       │
│                     │                               │
│        ┌────────────┼────────────┐                │
│        ▼           ▼           ▼                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Orchestr. │ │LLM Gatewy │ │Context   │       │
│  │BullMQ   │ │Cache+RT  │ │Builder  │       │
│  └────┬────┘ └────┬────┘ └────┬────┘       │
│       │          │          │                        │
│       └──────────┼──────────┘                        │
│                  ▼                               │
│           ┌─────────────┐                        │
│           │ ML Engine  │ ← pgvector             │
│           │ RAG        │ ← embeddings           │
│           │ Insights   │ ← BigQuery              │
│           └─────┬──────┘                        │
│                 │                                │
│       ┌────────┼────────┐                       │
│       ▼        ▼        ▼                       │
│  ┌────────┐ ┌────────┐ ┌────────┐            │
│  │Supabas│ │Redis  │ │GCP    │            │
│  │      │ │Cache  │ │ML     │            │
│  └──────┘ └───────┘ └───────┘            │
│                                                          │
│  ☁️ Autonomy Layer:                                    │
│  • Auto-healing (circuit breaker)                       │
│  • Cost optimization (budget alerts)                │
│  • Self-scaling (load-based)                       │
│  • Zero-touch monitoring                           │
│                                                          │
└───────────────────────────────────────────────────────
```

---

## 🎖️ Milestones

### Milestone 1: 🌱 germination (Día 7)

- [ ] GCP configurado
- [ ] BigQuery sync working
- [ ] SSH operativos

### Milestone 2: 🌿 growth (Día 14)

- [ ] NotebookLM → todos agentes
- [ ] RAG pipeline completo
- [ ] Dashboard ML

### Milestone 3: 🌳 thriving (Día 21)

- [ ] Self-healing activo
- [ ] Cost optimization
- [ ] Monitoring full

### Milestone 4: 🌲 takeover (Día 30)

- [ ] 50 tenants
- [ ] 99.9% uptime
- [ ] Zero human touch

---

## 📞 Commands de Emergencia

```bash
# Ver estado
./scripts/opsly-status.sh

# Restart todo
docker compose -f infra/docker-compose.platform.yml restart

# Ver logs
docker compose -f infra/docker-compose.platform.yml logs -f

# TypeCheck
npm run type-check

# Rebuild ML
npm run build --workspace=@intcloudsysops/ml

# NotebookLM query
node scripts/query-notebooklm.mjs "¿Estado de Opsly?"

# GCP verify
./scripts/verify-gcp-setup.sh
```

---

## 🤝 Team Roles

| Rol            | Responsable | Herramientas         |
| -------------- | ----------- | -------------------- |
| Architect      | Senior      | AGENTS.md, VISION.md |
| ML Engineer    | System      | apps/ml, Vertex AI   |
| Infrastructure | Ops         | VPS, Docker, Traefik |
| API Developer  | Routes      | apps/api, Supabase   |
| Agent Dev      | MCP         | apps/mcp, tools      |

---

## 🔥 Day Commands

```bash
# Daily standup
./scripts/opsly-status.sh

# Deploy (si cambios)
git add . && git commit -m "chore: actualizo" && git push
# → CI corre → deploy a VPS

# Cerrar sesión
node scripts/update-state.js
bash scripts/update-agents.sh
```

---

**Estado:** 🟢 **EJECUTANDO** — No nos detemos

**URL:** https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
