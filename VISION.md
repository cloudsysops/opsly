# Opsly — Visión y Objetivos

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

- dbaeumer.vscode-eslint
- esbenp.prettier-vscode
- bradlc.vscode-tailwindcss
- ms-vscode.vscode-typescript-next
- eamodio.gitlens
- usernamehw.errorlens
- Supabase.vscode-supabase-extension
- YoavBls.pretty-typescript-errors
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

---

## Stack de expansión — Google Cloud + Open Source

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
