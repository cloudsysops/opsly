# Agent Enhancements — Características Adicionales para .claude/

## 1. State Compartido Entre Máquinas

**Problema:** Agent en Local no sabe qué hizo Agent en VPS.

**Solución:** Usar Redis de VPS como state backend.

```json
{
  "agents": {
    "sharedState": {
      "enabled": true,
      "backend": "redis",
      "url": "redis://:PASSWORD@100.120.151.91:6379/0",
      "keyPrefix": "opsly:agent:",
      "ttl": 3600,
      "syncInterval": "10s"
    }
  }
}
```

**En settings.local.json (Local):**
```json
{
  "agents": {
    "sharedState": {
      "enabled": true,
      "backend": "redis",
      "url": "redis://:PASSWORD@100.120.151.91:6379/0"
    }
  }
}
```

**En settings.local.json (VPS):**
```json
{
  "agents": {
    "sharedState": {
      "enabled": true,
      "backend": "redis",
      "url": "redis://localhost:6379/0"
    }
  }
}
```

---

## 2. Distributed Logging + Telemetría

**Problema:** No sabemos qué tokens gastó cada agent en cada máquina.

**Solución:** Logs centralizados + CloudWatch/Loki.

```json
{
  "telemetry": {
    "enabled": true,
    "provider": "supabase",
    "table": "agent_logs",
    "track": [
      "model",
      "tokens_input",
      "tokens_output",
      "cost_usd",
      "duration_ms",
      "machine_name",
      "agent_name",
      "status"
    ],
    "batchSize": 50,
    "flushInterval": "30s",
    "sampleRate": 1.0
  }
}
```

**En settings.json:**
```bash
# Agregar tabla en Supabase
create table agent_logs (
  id uuid primary key,
  machine_name text,
  agent_name text,
  model text,
  tokens_input int,
  tokens_output int,
  cost_usd decimal,
  duration_ms int,
  status text,
  created_at timestamp default now()
);
```

---

## 3. Health Checks + Alertas Discord

**Problema:** Si MCP o LLM Gateway caen, no nos enteramos.

**Solución:** Healthchecks + webhook Discord.

```json
{
  "healthChecks": {
    "enabled": true,
    "interval": "30s",
    "services": [
      {
        "name": "mcp-server",
        "url": "http://localhost:3003/health",
        "timeout": 5000,
        "alertOn": ["down", "slow"]
      },
      {
        "name": "llm-gateway",
        "url": "https://llm-gateway.op-sly.com/health",
        "timeout": 10000,
        "alertOn": ["down"]
      },
      {
        "name": "api",
        "url": "https://api.op-sly.com/health",
        "timeout": 10000,
        "alertOn": ["down"]
      },
      {
        "name": "orchestrator",
        "url": "http://localhost:3011/health",
        "timeout": 5000,
        "alertOn": ["down"]
      }
    ],
    "alerting": {
      "discord": {
        "enabled": true,
        "webhook": "${DISCORD_WEBHOOK_URL}",
        "channel": "#agent-alerts"
      },
      "slack": {
        "enabled": false,
        "webhook": "${SLACK_WEBHOOK_URL}"
      }
    }
  }
}
```

---

## 4. Model Fallback + Cost Optimization

**Problema:** Si Opus está saturado, el agent se bloquea.

**Solución:** Fallback inteligente (Opus → Sonnet → Haiku).

```json
{
  "models": {
    "primary": "claude-opus-4-7",
    "fallback": [
      "claude-sonnet-4-6",
      "claude-haiku-4-5"
    ],
    "routing": {
      "strategy": "cost-aware",
      "rules": [
        {
          "condition": "tokens_estimated > 100000",
          "model": "claude-sonnet-4-6",
          "reason": "Use Sonnet for large contexts to save costs"
        },
        {
          "condition": "latency_required < 2000",
          "model": "claude-haiku-4-5",
          "reason": "Use Haiku for fast responses"
        },
        {
          "condition": "complexity = 'high'",
          "model": "claude-opus-4-7",
          "reason": "Use Opus for complex tasks"
        }
      ]
    },
    "costTracking": {
      "enabled": true,
      "currencies": ["USD"],
      "alertAt": { "daily": 100, "weekly": 500 }
    }
  }
}
```

---

## 5. Caché Distribuido (Query Results)

**Problema:** Mismo query en ambas máquinas = tokens dobles.

**Solución:** Redis cache con TTL inteligente.

```json
{
  "cache": {
    "enabled": true,
    "backend": "redis",
    "url": "redis://:PASSWORD@100.120.151.91:6379/1",
    "ttl": {
      "fileRead": 3600,
      "gitQuery": 1800,
      "webFetch": 7200,
      "apiCall": 600
    },
    "keyStrategy": "hash(query+params)",
    "compression": true
  }
}
```

---

## 6. Autonomy Levels + Rate Limiting

**Problema:** Un agent puede correr 1000 tareas accidentalmente.

**Solución:** Límites de autonomía configurables.

```json
{
  "autonomy": {
    "levels": {
      "0": { "name": "supervised", "requires_approval": "all", "max_concurrency": 1 },
      "1": { "name": "semi-autonomous", "requires_approval": "risky", "max_concurrency": 3 },
      "2": { "name": "autonomous", "requires_approval": "none", "max_concurrency": 5 }
    },
    "currentLevel": 1,
    "rateLimit": {
      "global": "100 tasks/minute",
      "perAgent": "20 tasks/minute",
      "risky_operations": "1 per minute"
    },
    "costLimit": {
      "perDay": 50,
      "perWeek": 300,
      "alertAt": 0.8
    }
  }
}
```

---

## 7. n8n Integration — Workflows Compartidos

**Problema:** Workflows definidos en n8n pero agentes no saben acceder.

**Solución:** MCP tool en .claude/ que expone n8n workflows.

```json
{
  "n8n": {
    "enabled": true,
    "url": "http://localhost:5678",
    "apiKey": "${N8N_API_KEY}",
    "workflows": {
      "auto-discover": true,
      "tags": ["opsly", "shared"],
      "expose": ["billing-sync", "tenant-onboarding", "health-monitor"]
    },
    "execution": {
      "timeout": 30000,
      "retryPolicy": "exponential",
      "maxRetries": 3
    }
  }
}
```

---

## 8. Session Tracking + Continuity

**Problema:** Si Claude crashea, pierde contexto.

**Solución:** Guardar estado de sesión en Supabase.

```json
{
  "sessions": {
    "enabled": true,
    "backend": "supabase",
    "table": "claude_sessions",
    "track": [
      "session_id",
      "machine_name",
      "agent_name",
      "context_size",
      "prompt_tokens",
      "completion_tokens",
      "intent_last",
      "task_id",
      "started_at",
      "ended_at",
      "status"
    ],
    "autoRestore": true,
    "maxSessions": 10
  }
}
```

---

## 9. Prompt Registry + Versioning

**Problema:** Prompts están en el código, difícil de versionar.

**Solución:** Prompts en DB, versionados como @intcloudsysops/prompts.

```json
{
  "prompts": {
    "enabled": true,
    "backend": "supabase",
    "table": "prompt_templates",
    "registry": {
      "auto-discover": true,
      "paths": ["lib/prompts/", "skills/templates/"]
    },
    "versioning": {
      "enabled": true,
      "strategy": "semantic"
    }
  }
}
```

**Estructura en DB:**
```sql
create table prompt_templates (
  id uuid primary key,
  name text unique,
  category text,
  version text,
  template text,
  variables jsonb,
  created_at timestamp,
  updated_at timestamp
);
```

---

## 10. Security + Multi-Tenant Isolation

**Problema:** Agent en Local podría acceder datos de otro tenant.

**Solución:** Policy engine + Row-Level Security.

```json
{
  "security": {
    "multiTenant": {
      "enabled": true,
      "enforcement": "strict",
      "isolation": {
        "dataLevel": "row",
        "cacheLevel": true,
        "auditLevel": true
      }
    },
    "tokenVault": {
      "enabled": true,
      "backend": "doppler",
      "rotationInterval": 86400,
      "audit": true
    },
    "accessControl": {
      "strategy": "rbac",
      "roles": ["admin", "developer", "observer"],
      "permissions": "config/permissions.json"
    }
  }
}
```

---

## Implementation Checklist

- [ ] **Phase 1** — Shared State (Redis) + Health Checks
  - Redis connection pool
  - Health check loop
  - Discord alerting

- [ ] **Phase 2** — Telemetría + Logging
  - Supabase table schema
  - Log aggregation
  - Cost dashboard

- [ ] **Phase 3** — Model Routing + Fallback
  - Model selector logic
  - Cost calculation
  - Automatic downgrade

- [ ] **Phase 4** — Caché + n8n Integration
  - Redis cache layer
  - n8n MCP tool
  - Workflow discovery

- [ ] **Phase 5** — Session Tracking + Prompt Registry
  - Session state persistence
  - Prompt versioning
  - Auto-restore on crash

---

## Files to Create

```
.claude/
├── 5-infrastructure/
│   ├── redis-config.md
│   ├── supabase-schema.sql
│   └── health-checks.sh
├── 6-security/
│   ├── rls-policies.sql
│   └── token-vault.md
├── 7-integration/
│   ├── n8n-mcp-tool.ts
│   └── workflow-executor.ts
└── agents-config.json         # Master config
```

---

**Prioridad de implementación:**
1. **Crítico:** Shared State + Health Checks
2. **Alto:** Telemetría + Cost Tracking
3. **Medio:** Model Routing + Caché
4. **Bajo:** Session Tracking + Prompt Registry
