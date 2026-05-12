---
status: draft
owner: product
last_review: 2026-05-06
---

# Opsly Agency Division — Visión y Arquitectura

> División de servicios y productos basada en agentes SwarmOps
> Alineado con: `VISION.md`, `AGENTS.md`, `SWARM-OPS-ARCHITECTURE.md`

---

## Índice

1. [Qué es la Agency Division](#qué-es-la-agency-division)
2. [Líneas de Servicio](#líneas-de-servicio)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Go-to-Market](#go-to-market)
5. [Revenue Model](#revenue-model)
6. [ Roadmap](#roadmap)

---

## Qué es la Agency Division

Extensión de Opsly que transforma los agentes SwarmOps en **productos y servicios comercializables**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPSLY AGENCY DIVISION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  🛒 AGENCIA DE  │  │  🤖 AGENCIA DE  │  │  🔐 API FACTORY │            │
│  │    MARKETING   │  │     AGENTES     │  │    & SECURITY   │            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
│           │                     │                     │                     │
│           └─────────────────────┴─────────────────────┘                     │
│                                 │                                           │
│                    ┌────────────┴────────────┐                             │
│                    │   AGENT MANAGEMENT      │                             │
│                    │      PLATFORM            │                             │
│                    │   (Dashboard + Billing)  │                             │
│                    └─────────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Líneas de Servicio

### Línea 1: Agencia de Marketing como Servicio

**Objetivo:** Agentes de marketing automatizado para clientes externos.

| Servicio                    | Descripción                                       | pricing  |
| --------------------------- | ------------------------------------------------- | -------- |
| **Social Media Automation** | Posts, scheduling, analytics por plataforma       | $99/mes  |
| **Content Generation**      | Blog posts, emails, ads copy con AI               | $149/mes |
| **SEO Agent**               | Keyword research, on-page optimization, reporting | $199/mes |
| **Email Marketing**         | Campaigns, sequences, A/B testing automation      | $129/mes |
| **Analytics Dashboard**     | Multi-channel analytics con insights AI           | $79/mes  |

**Agentes relacionados:**

- `agent_social_media` ✅ existente
- `agent_marketing` ✅ existente
- `agent_creative` ✅ existente

---

### Línea 2: Agencia de Agentes (Agent-as-a-Service)

**Objetivo:** Vender enjambres de agentes como subscription.

| Producto             | Descripción                                          | pricing   |
| -------------------- | ---------------------------------------------------- | --------- |
| **Pentester Swarm**  | Security scans recurrentes, vulnerability assessment | $299/mes  |
| **Revenue Swarm**    | Trading automation + lead generation + sales         | $499/mes  |
| **Enterprise Swarm** | Operations + HR + Finance automation                 | $399/mes  |
| **Custom Agent**     | Agente especializado según necesidad                 | $199+/mes |

**Agentes relacionados:**

- `pentester_execute` ✅ existente
- `revenue_execute` ✅ existente
- `enterprise_execute` ✅ existente

---

### Línea 3: API Factory + Seguridad

**Objetivo:** Desarrollo autónomo de APIs seguras y monitoreadas.

| Servicio              | Descripción                              | pricing  |
| --------------------- | ---------------------------------------- | -------- |
| **API Generator**     | Genera API completa desde spec OpenAPI   | $149/mes |
| **API Security**      | Rate limiting, auth, penetration testing | $199/mes |
| **API Monitoring**    | 24/7 health, latency, error tracking     | $99/mes  |
| **API Documentation** | Auto-generates docs, postman collections | $79/mes  |
| **API Compliance**    | GDPR, SOC2, ISO27001 audit trails        | $249/mes |

**Arquitectura:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      API FACTORY PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SPEC          2. GENERATE       3. SECURE       4. DEPLOY  │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐│
│  │ OpenAPI │────▶│  Code   │────▶│ Security│────▶│ Docker  ││
│  │ Schema  │     │ Gen     │     │ Layer   │     │ + TLS   ││
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘│
│                                               │               │
│                                               ▼               │
│                      ┌───────────────────────────────────────┐│
│                      │      MONITORING 24/7                  ││
│                      │  - Latency p50/p95/p99                ││
│                      │  - Error rate by endpoint             ││
│                      │  - Rate limit consumption             ││
│                      │  - Security alerts (SQLi, XSS, etc)   ││
│                      └───────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Línea 4: Agent Management Platform

**Objetivo:** Dashboard centralizado para gestionar todos los agentes.

| Feature                 | Descripción                               |
| ----------------------- | ----------------------------------------- |
| **Agent Registry**      | Lista todos los agentes por tenant        |
| **Usage Metrics**       | Executions, tokens, costo por agente      |
| **Health Status**       | Uptime, errores, último heartbeat         |
| **Cost Allocation**     | Costo por agente, tendencias, forecasting |
| **Alerting**            | Thresholds configurables por cliente      |
| **Billing Integration** | Calcula billing por uso real              |

---

## Arquitectura Técnica

### Integración con Opsly Core

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OPSLY PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│  │  MCP Server │───▶│ Orchestrator │───▶│ BullMQ      │                │
│  │  (Tools)    │    │  (Workers)   │    │ (Queues)    │                │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                │
│        │                     │                     │                   │
│        │              ┌──────┴──────┐              │                   │
│        │              │  Super      │              │                   │
│        │              │  Orchestrator│◀─────────────┘                  │
│        │              │  Bridge      │                                 │
│        │              └──────┬──────┘                                 │
│        │                     │                                        │
│        ▼                     ▼                                        │
│  ┌─────────────────────────────────────────┐                         │
│  │         AGENCY DIVISION LAYER           │                         │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │                         │
│  │  │ Marketing│ │Agents   │ │API      │    │                         │
│  │  │ Swarm   │ │Swarm    │ │Factory  │    │                         │
│  │  └─────────┘ └─────────┘ └─────────┘    │                         │
│  └─────────────────────────────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### BullMQ Queue Structure

```typescript
// Nueva estructura de colas para Agency Division
const AGENCY_QUEUES = {
  // Marketing
  marketing_campaign: { priority: 10, concurrency: 5 },
  social_media_post: { priority: 8, concurrency: 10 },
  content_generation: { priority: 5, concurrency: 3 },

  // Agents (Pentester, Revenue, Enterprise)
  pentester_scan: { priority: 9, concurrency: 2 },
  revenue_task: { priority: 7, concurrency: 5 },
  enterprise_task: { priority: 6, concurrency: 3 },

  // API Factory
  api_generate: { priority: 8, concurrency: 3 },
  api_security_scan: { priority: 9, concurrency: 2 },
  api_monitor: { priority: 5, concurrency: 10 },

  // Agent Management
  agent_health_check: { priority: 3, concurrency: 20 },
  usage_aggregation: { priority: 2, concurrency: 1 },
};
```

### Redis State Keys

```typescript
// Keys para Agent Management
const AGENCY_REDIS_KEYS = {
  // Agentes por tenant
  'agency:{tenant}:agents' → Hash of agent_id → metadata

  // Métricas por agente
  'agency:{tenant}:metrics:{agent_id}:daily' → Sorted set by timestamp

  // Costos acumulados
  'agency:{tenant}:costs:{month}' → Hash of agent_id → total_cost

  // API Factory
  'api:{tenant}:apis' → Hash of api_id → spec + status
  'api:{tenant}:health:{api_id}' → Latest health snapshot
};
```

---

## Go-to-Market

### Fase 1: MVP (Mes 1-2)

**Objetivo:** Validar con 3-5 clientes piloto.

| Step | Acción                                             | Timeline   |
| ---- | -------------------------------------------------- | ---------- |
| 1    | Dashboard Agent Management básico                  | Semana 1-2 |
| 2    | Integrar agentes existentes (Marketing, Pentester) | Semana 3-4 |
| 3    | API Factory básico (generate + monitor)            | Semana 5-6 |
| 4    | Onboard 3 clientes piloto                          | Semana 7-8 |

### Fase 2: Producto (Mes 3-6)

**Objetivo:** Product-market fit, escalar a 20 clientes.

- Línea completa de Marketing como servicio
- Revenue Swarm en modo simulación (probar antes de live)
- API Factory con security suite completo
- Billing automático por uso

### Fase 3: Escala (Mes 7-12)

**Objetivo:** 50+ clientes, revenue recurrente sostenible.

- Agent Marketplace (clientes configuran sus propios agentes)
- API Marketplace (templates de APIs)
- Enterprise tier con SLA guarantees

---

## Revenue Model

### Pricing Tiers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRICING STRUCTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STARTER ($99/mo)                   PRO ($299/mo)                      │
│  ─────────────────                 ──────────────                      │
│  • 1 agente activo                 • 5 agentes activos                 │
│  • 1,000 executions/mes           • 10,000 executions/mes             │
│  • Basic monitoring               • Full monitoring                    │
│  • Email support                   • Priority support                  │
│                                    • API access                         │
│                                                                         │
│  BUSINESS ($599/mo)                ENTERPRISE (Custom)                  │
│  ──────────────────               ───────────────                      │
│  • 15 agentes activos             • Agentes ilimitados                 │
│  • 50,000 executions/mes          • Executions ilimitados             │
│  • All swarms included            • Custom agent development           │
│  • Dedicated dashboard            • SLA guarantee (99.9%)              │
│  • 24/7 support                   • Dedicated account manager          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Revenue Breakdown Proyectado

| Mes  | Clientes | MRR      | Líneas activas     |
| ---- | -------- | -------- | ------------------ |
| 1-2  | 3        | $297     | Pilot              |
| 3-4  | 10       | $2,990   | Marketing + Agents |
| 5-6  | 25       | $14,950  | Full suite         |
| 7-12 | 50+      | $35,000+ | Scale              |

---

## Roadmap

### Q2 2026 (Inmediato)

- [ ] Agent Management Dashboard v1
- [ ] MCP tools para API Factory (3 tools)
- [ ] APIFactoryWorker en BullMQ
- [ ] Integrar agentes existentes con billing
- [ ] 3 clientes piloto

### Q3 2026

- [ ] API Generator completo (OpenAPI → deploy)
- [ ] Security suite (rate limiting, auth, scanning)
- [ ] Marketplace de agentes
- [ ] Auto-scaling por uso

### Q4 2026

- [ ] Revenue Swarm en producción
- [ ] Enterprise tier con SLA
- [ ] Multi-tenant facturación avanzada
- [ ] 50+ clientes activos

---

## Métricas de Éxito

| Métrica          | Target Q2 | Target Q4 |
| ---------------- | --------- | --------- |
| Clientes activos | 3         | 50        |
| MRR              | $300      | $35,000   |
| Agents deployed  | 50        | 500       |
| API uptime       | 99.5%     | 99.9%     |
| Customer NPS     | 40+       | 60+       |

---

## Risks y Mitigaciones

| Risk                          | Impacto | Mitigación                                                 |
| ----------------------------- | ------- | ---------------------------------------------------------- |
| Dependencia de agentes Python | Alto    | Migrar a TypeScript gradualmente                           |
| Costos LLM se disparan        | Medio   | Budget caps por tenant, cache obligatorio                  |
| Clientes no adoptan           | Alto    | Onboarding asistido, templates pre-configurados            |
| Security liability            | Alto    | Insurance, Terms of Service claros, opt-in para pentesting |

---

## Documentos Relacionados

- [VISION.md](../VISION.md) — Norte del producto
- [AGENTS.md](../../AGENTS.md) — Estado operativo
- [SWARM-OPS-ARCHITECTURE.md](../../SWARM-OPS-ARCHITECTURE.md) — Arquitectura de enjambres
- [OAR.md](../../design/OAR.md) — Opsly Agentic Runtime
- [ROADMAP.md](../ROADMAP.md) — Planificación por sprint
