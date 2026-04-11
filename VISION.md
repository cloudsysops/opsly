# Opsly — Visión y Objetivos

> Última revisión: 2026-04-11

## Qué es Opsly

Plataforma multi-tenant SaaS que despliega y gestiona stacks de agentes
autónomos (n8n, Uptime Kuma) por cliente, con facturación Stripe,
backups automáticos y dashboard de administración global.

## Para quién

Agencias digitales y equipos de operaciones que necesitan:

- Automatización de procesos sin gestionar infraestructura
- Monitoreo de uptime para sus clientes
- Facturación recurrente con planes diferenciados
- Dashboard unificado para operar múltiples clientes

## Planes

| Plan | Precio | Incluye |
|------|--------|---------|
| Startup | $49/mes | n8n + Uptime Kuma, 1 dominio |
| Business | $149/mes | Todo Startup + backups diarios, soporte |
| Enterprise | Custom | Multi-región, SLA, onboarding dedicado |

## Primer cliente real

- Tenant: smiletripcare
- Plan: Startup
- Dominio: ops.smiletripcare.com
- Propósito: validar el stack completo en producción

## Stack transferible desde smiletripcare

(Extraído de `.vscode/extensions.json` y `package.json` del proyecto origen)

### Extensiones VS Code / Cursor

Fuente: `.vscode/extensions.json` (mismo orden).

- dbaeumer.vscode-eslint
- esbenp.prettier-vscode
- bradlc.vscode-tailwindcss
- ms-vscode.vscode-typescript-next
- eamodio.gitlens
- usernamehw.errorlens
- Supabase.vscode-supabase-extension (en Cursor, si `--install-extension` no lo encuentra, instalar el `.vsix` desde el Visual Studio Marketplace)
- yoavbls.pretty-ts-errors
- formulahendry.auto-rename-tag
- christian-kohler.path-intellisense
- rangav.vscode-thunder-client
- Gruntfuggly.todo-tree

### Paquetes npm core

- next, react, react-dom, typescript
- @supabase/supabase-js, @supabase/ssr
- zod, stripe
- @sentry/nextjs, @logtail/next
- tailwindcss, @tailwindcss/postcss
- eslint, prettier, husky, lint-staged
- vitest, @playwright/test

### Patrón middleware

Next.js + Supabase Auth = @supabase/ssr + `NEXT_PUBLIC_SUPABASE_*` en `.env`

## Objetivos por fase

### Fase 1 — Validación (AHORA)

- [ ] Deploy completo en staging (ops.smiletripcare.com)
- [ ] Primer tenant smiletripcare corriendo
- [ ] n8n accesible en n8n.smiletripcare.ops.smiletripcare.com
- [ ] Uptime Kuma accesible
- [ ] Stripe webhook funcionando
- [ ] Backup automático corriendo

### Fase 2 — Producto

- [ ] Onboarding self-service (cliente paga → tenant se despliega solo)
- [ ] Dashboard admin operativo
- [ ] Emails transaccionales (Resend)
- [ ] Alertas Discord funcionando

### Fase 3 — Escala

- [ ] Segundo cliente real
- [ ] Sistema de memoria Redis + n8n → MCP → Claude
- [ ] Multi-región
- [ ] Documentación pública

## Decisión de arquitectura central

Cada tenant es un docker-compose aislado.
No Kubernetes, no Swarm. Simplicidad operativa sobre escala teórica.
Escalar = más VPS, no más complejidad.

## Principios de Arquitectura

- Aislamiento por tenant con Docker Compose + Traefik por subdominio.
- Control plane único en `apps/api` y servicios OpenClaw.
- Escalamiento incremental: vertical primero, horizontal con demanda real.
- Seguridad Zero-Trust en rutas dinámicas y sesiones portal.
- **Gobernanza de costos de infra:** activar proveedores con cargo recurrente (p. ej. upgrade VPS, GCP Compute de pago, Cloudflare Load Balancer) requiere **aprobación explícita** del responsable; el dashboard admin en `/costs` y la API `GET /api/admin/costs` son **catálogo y registro operativo** — la facturación real sigue en cada panel (DO, GCP proyecto de referencia **opslyquantum**, etc.). Ver `AGENTS.md` (*Control de costos*) y `docs/COST-DASHBOARD.md`.
- **Workers remotos** (p. ej. Mac 2011 + Ubuntu): extienden el mismo orchestrator BullMQ contra Redis del control plane, sin segundo sistema de orquestación; guía `docs/WORKER-SETUP-MAC2011.md`, scripts `scripts/start-workers-mac2011.sh` / `start-worker.sh`.

## Principios del Ecosistema IA

- Todo tráfico LLM/agent pasa por **OpenClaw / LLM Gateway** como punto único de control.
- **Orchestrator** es el motor event-driven (BullMQ), con prioridad/costo por plan.
- Multi-tenancy Zero-Trust en capas IA: identidad, contexto, ejecución y observabilidad por tenant.
- Agentes premium (NotebookLM y similares) permanecen **EXPERIMENTALES** hasta planes superiores.
- Cost-aware routing y límites por tenant son obligatorios para sostenibilidad de margen.
- **Hermes (metering/billing IA)** es la fuente única para medir tokens, costo, latencia y cache-hit por `tenant_slug` y `request_id`.

## Lo que un agente NUNCA debe hacer

- Proponer migrar a Kubernetes o Swarm
- Hardcodear secrets (todo va a Doppler)
- Usar `any` en TypeScript
- Crear scripts no idempotentes
- Tomar decisiones de arquitectura sin documentarlas en AGENTS.md

## Roadmap por fases (revisado 2026-04-04)

### Fase 1 — Validación (AHORA, máx 1 semana)

Objetivo: un tenant real corriendo en producción.

- [ ] validate-config.sh verde
- [ ] vps-bootstrap.sh sin errores
- [ ] curl https://api.ops.smiletripcare.com/api/health → 200
- [ ] tenant smiletripcare: n8n + Uptime Kuma accesibles
- [ ] Stripe webhook recibiendo eventos
- [ ] Backup automático corriendo

### Fase 2 — Producto (post-validación)

Objetivo: onboarding sin intervención manual.

- [ ] Stripe → webhook → tenant desplegado automáticamente
- [ ] Dashboard admin operativo
- [ ] Redis memory layer para contexto de agentes
- [ ] Emails transaccionales (Resend)
- [ ] Segundo cliente real

### Fase 3 — Escala (cuando Fase 2 esté estable)

Objetivo: plataforma que vende sola.

- [ ] Self-service completo
- [ ] Observabilidad: métricas por tenant
- [ ] Vector DB para memoria semántica de agentes
- [ ] API docs públicas
- [ ] Multi-VPS si el primero no alcanza

### Fase 4 — Multi-agente con OpenClaw (actual)

Objetivo: unificar herramientas, orquestación y capa de costos IA bajo un control plane único.

- [ ] MCP como entrypoint estándar de herramientas para agentes.
- [ ] Orchestrator BullMQ con prioridad por plan (`startup|business|enterprise`).
- [ ] LLM Gateway como punto único de routing, cache y métricas de costo.
- [ ] Context Builder integrado para continuidad entre sesiones.
- [ ] NotebookLM disponible como EXPERIMENTAL con feature flag en planes superiores.
- [x] Planner externo (Chat.z): delegar planes de ejecución a LLMs remotos vía LLM Gateway (`/v1/chat/completions` / `/v1/planner`), con razonamiento complejo sin añadir infraestructura pesada fuera de Compose.

### Fase 5 — Ecosistema IA Madura

Objetivo: operaciones IA predecibles, auditables y eficientes por tenant.

- [ ] Routing inteligente multi-modelo con políticas por plan/tenant.
- [ ] Cost tracking por tenant en tiempo real (budget cap + alertas automáticas).
- [ ] Self-healing en orquestación (retry inteligente, fallback provider/modelo).
- [ ] Métricas avanzadas IA: latencia, éxito, costo, cache hit rate y trazas por `request_id`.
- [ ] Catálogo de agentes versionado (MCP tools/jobs con contratos estables).

### Fase 6+ — Multi-región y agentes autónomos completos

Objetivo: resiliencia enterprise y autonomía operativa avanzada.

- [ ] Multi-región activa-activa para control plane y workers críticos.
- [ ] Failover automático por tenant y plan.
- [ ] Workflows autónomos de remediación (incidentes, costos, degradación).
- [ ] Gobernanza global de prompts, políticas y auditoría por región.

### Nunca (decisiones fijas)

- Kubernetes
- Docker Swarm
- Migrar de Traefik
- Migrar de Supabase

## Regla para agentes

Antes de proponer cualquier feature nuevo, verificar:
¿Tenants en producción > 0? Si no → volver a Fase 1.

---

## Evolución arquitectónica — AI Platform

### Diagrama de Arquitectura High-Level

```mermaid
flowchart TB
  U[Users / Admin / Portal] --> TR[Traefik]
  A[Tailscale Admin SSH] --> TR
  TR --> API[Opsly API]
  API --> OC[OpenClaw]

  subgraph OPENCLAW[OpenClaw Core]
    MCP[MCP Server]
    ORCH[Orchestrator BullMQ]
    LLMG[LLM Gateway]
    CB[Context Builder]
  end

  OC --> MCP
  OC --> ORCH
  OC --> LLMG
  OC --> CB

  ORCH --> TEN[Tenants Docker Compose]
  TEN --> N8N[n8n per tenant]
  TEN --> UK[Uptime Kuma per tenant]
  MCP --> NB[NotebookLM EXPERIMENTAL]
  API --> SUP[(Supabase platform + tenant schemas)]
  LLMG --> MODELS[LLM Providers]
```

### Visión de escalonamiento

**Vertical (ahora → 6 meses):**
- Un VPS DigitalOcean escalado (CPU/RAM según carga)
- Redis como núcleo: sessions + cache LLM + job queues
- BullMQ con workers paralelos (concurrency por tenant)
- LLM Gateway con cache → ahorro 40-70% tokens

**Horizontal (6 → 18 meses):**
- Multi-VPS con Traefik como load balancer
- Redis Cluster o Redis Sentinel
- Tenant runtime portable (abstraído de n8n)
- Multi-región cuando haya clientes enterprise

**Agentes paralelos:**
- Cada tenant tiene su pool de workers BullMQ
- Workers especializados: CodeAgent, ResearchAgent, NotifyAgent
- Ejecución paralela con límites por plan (startup: 2, business: 5, enterprise: unlimited)
- Estado persistido en Redis con TTL por sesión

### Tabla de proveedores LLM (Gateway v2)

| Provider | Nivel | Costo/1k tokens (orientativo) | Cuándo usar |
|----------|-------|------------------------------|-------------|
| Llama local | 1 | $0 | Clasificación, extracción, formato |
| Claude Haiku | 2 | ~$0.001 combinado típico | Respuestas moderadas, RAG simple |
| OpenRouter Mistral | 2 | ~$0.0002 combinado típico | Alternativa económica nivel 2 |
| GPT-4o mini | 2 | ~$0.0004 combinado típico | Alternativa si Haiku no disponible |
| Claude Sonnet | 3 | ~$0.015 salida (referencia) | Arquitectura, código complejo |
| GPT-4o | 3 | ~$0.015 salida (referencia) | Fallback si Sonnet no disponible |

**Servicios nuevos en roadmap:**
1. LLM Gateway (cache + routing + cost control)
2. Context Builder (prompt optimization)
3. Orchestrator event-driven completo
4. Observabilidad por tenant (tokens, costo, éxito)
5. Tenant Runtime abstraction
6. Control Plane vs Data Plane separados

### Regla de escalonamiento

> Nunca añadir infra nueva sin cliente pagador que lo justifique.
> Escalar verticalmente primero. Horizontal solo con 10+ tenants activos.

### Plan maestro incremental (plataforma AI — Fase 4)

El desglose operativo (**extender sin re-arquitecturar**, mapa de `apps/*`, incrementos en orden, qué evitar, checklist de PR) vive en **`AGENTS.md`** → sección **«Fase 4 — Multi-agente Opsly (plan maestro de trabajo)»**. Aquí se mantienen la visión económica y el escalonamiento; allí, el trabajo ejecutable por sesiones.

---

## Stack de expansión — Google Cloud + Open Source

### Estado operativo (2026-04-09)
- Fase 9 (activación producción) validada: migraciones Supabase aplicadas y E2E de invitaciones en verde.
- Discord operativo con webhook válido en Doppler `prd`.
- Transición iniciada a Fase 10 con foco en variables GCP (`GOOGLE_CLOUD_PROJECT_ID`, `BIGQUERY_DATASET`, `VERTEX_AI_REGION`).
- Bloqueante vigente: `drive-sync` con service account aún devuelve `invalid_request` en OAuth token endpoint.

### Principio
Usar gratis lo que Google da gratis.
Integrar open source antes de pagar servicios.
Escalar verticalmente antes de horizontalmente.
Nunca añadir infra nueva sin cliente pagador que lo justifique.

### Google Cloud — roadmap por fase

#### AHORA (activo)
| Servicio | Uso | Costo | Estado |
|---------|-----|-------|--------|
| Drive API | Sync docs AGENTS.md | Gratis | ✅ implementado |
| Sheets API | Reportes tenants/billing | Gratis | ⏳ próximo |

#### PRÓXIMO MES (cuando haya 3+ tenants pagando)
| Servicio | Uso | Costo | Estado |
|---------|-----|-------|--------|
| BigQuery | Analytics usage_events | 1TB queries/mes gratis | ⏳ planificado |
| Cloud Run | Workers ML sin VPS dedicado | 2M requests/mes gratis | ⏳ planificado |

#### 6 MESES (cuando haya 10+ tenants)
| Servicio | Uso | Costo | Estado |
|---------|-----|-------|--------|
| Vertex AI | Fine-tuning Llama con datos Opsly | $300 créditos iniciales | ⏳ planificado |
| Speech-to-Text | Transcripción para tenants | 60 min/mes gratis | ⏳ planificado |
| Vision API | Análisis imágenes para clientes | 1000 unidades/mes gratis | ⏳ planificado |

#### 1 AÑO (cuando VPS no alcance)
| Servicio | Uso | Costo | Estado |
|---------|-----|-------|--------|
| GKE Autopilot | Escalado horizontal | Pago por uso | ⏳ planificado |
| Cloud Spanner | DB global multi-región | Pago por uso | ⏳ planificado |

### Open Source — roadmap por fase

#### AHORA (integrar en VPS existente)
| Tool | Uso | Por qué | Estado |
|------|-----|---------|--------|
| Ollama | LLMs locales gratis | Ya instalado | ✅ activo |
| Llama 3.2 3B | Clasificación, extracción | $0/token | ⏳ configurar |
| Llama 3.1 8B | Respuestas moderadas | $0/token | ⏳ configurar |
| Mistral 7B | Alternativa a Haiku | $0/token | ⏳ configurar |
| Phi-3 Mini | Muy liviano, rápido | $0/token | ⏳ configurar |
| DuckDB | Analytics local en VPS | Gratis, brutal velocidad | ⏳ planificado |
| Prometheus | Métricas VPS | Ya instalado | ✅ activo |

#### PRÓXIMO MES
| Tool | Uso | Por qué | Estado |
|------|-----|---------|--------|
| OpenTelemetry | Traces + métricas distribuidas | Estándar industria | ⏳ planificado |
| Grafana | Dashboards observabilidad | Gratis self-hosted | ⏳ planificado |
| Qdrant | Vector DB a escala | Mejor que pgvector > 1M docs | ⏳ planificado |

#### 6 MESES
| Tool | Uso | Por qué | Estado |
|------|-----|---------|--------|
| LangGraph | Orquestación agentes complejos | Open source, estable | ⏳ planificado |
| CrewAI | Multi-agent teams | Complementa OpenClaw | ⏳ planificado |
| AutoGen | Agentes conversacionales | Microsoft, activo | ⏳ planificado |

#### 1 AÑO
| Tool | Uso | Por qué | Estado |
|------|-----|---------|--------|
| Apache Spark | Procesamiento batch masivo | Cuando datos > 10TB | ⏳ planificado |
| Ray | Computación distribuida ML | Para fine-tuning serio | ⏳ planificado |

### Inventario de librerías (npm vs necesidad)

La fuente de verdad de qué paquetes **ya están** en el monorepo, qué falta **por fase** del roadmap y qué es **opcional / no ahora** está en **`docs/MASTER-PLAN.md`** (sección *STACK DE LIBRERÍAS — INVENTARIO vs NECESIDAD*). Evita duplicar frameworks o añadir dependencias masivas sin ADR.

### Reglas de integración

1. **Gratis primero**: siempre explorar tier gratuito antes de pagar
2. **Open source primero**: antes de SaaS de pago, buscar alternativa OS
3. **VPS primero**: agotar capacidad vertical antes de Cloud Run/GKE
4. **Datos primero**: recolectar datos HOY para ML de mañana
5. **Un servicio a la vez**: no añadir dos tecnologías nuevas en el mismo sprint

### El activo más valioso — datos

Los datos que recolectamos hoy son el cimiento del LLM propio de mañana:

```
platform.conversations     → historial de chats por tenant
platform.llm_feedback      → correcciones y ratings
platform.usage_events      → tokens, costos, latencias
platform.agent_executions  → qué funcionó, qué falló
platform.feedback_decisions → qué implementó el ML solo
```

Con 12 meses de datos + Vertex AI + Llama base:
→ Fine-tuning especializado en automatización de negocios
→ Modelo propio que corre en VPS ($0/token)
→ Ventaja competitiva real vs plataformas genéricas

### Sistema de Metering — Hermes

- **Fuente de eventos:** `platform.usage_events` como ledger por tenant para LLM Gateway, Orchestrator y agentes MCP.
- **Claves obligatorias por evento:** `tenant_slug`, `request_id`, `agent_role`, `model`, `tokens_in`, `tokens_out`, `cost_usd`, `latency_ms`, `cache_hit`.
- **Regla operativa:** ninguna llamada de agente/LLM entra a producción sin evento de metering trazable.
- **Objetivo Fase 5:** budget caps por tenant, alertas automáticas y reconciliación mensual de margen.
