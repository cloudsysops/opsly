# OPSLY MASTER PLAN — Plan de trabajo completo
# =============================================
# Este archivo es la fuente de verdad del roadmap.
# Cursor ejecuta. Claude coordina. Cristian decide.
#
# CÓMO USAR:
# Cuando Claude tenga límites → Cursor continúa solo
# Cuando Claude vuelva → lee este archivo + AGENTS.md
# y continúa desde donde quedó
#
# REGLA: Nunca saltar fases. Nunca adivinar.
# Documentar todo en AGENTS.md al terminar cada fase.

═══════════════════════════════════════════════════════════════
STACK DE LIBRERÍAS — INVENTARIO vs NECESIDAD (2026-04)
═══════════════════════════════════════════════════════════════
# Referencia cruzada con la lista “stack sugerido” externa. No añadir dependencias
# masivas sin ADR + fase del plan; aquí solo se documenta qué ya existe, qué falta
# por fase y qué es opcional / fuera de alcance actual.

## Ya integrado en el monorepo (no duplicar)
| Capa | Librería / herramienta | Dónde |
|------|------------------------|--------|
| Framework API/UI | Next.js 15 | apps/api, admin, portal, web |
| Monorepo | turbo + npm workspaces | raíz |
| Validación | zod | apps/api (y rutas que validan body) |
| Colas | bullmq | apps/orchestrator |
| Redis (cliente) | redis (node-redis v4) | apps/orchestrator, apps/llm-gateway; ioredis solo en apps/web |
| DB / Auth | @supabase/supabase-js, @supabase/ssr | api (service), admin, portal |
| Email | resend | apps/api |
| Billing | stripe | apps/api |
| LLM (Anthropic) | @anthropic-ai/sdk | apps/llm-gateway |
| Paquetes internos | @intcloudsysops/llm-gateway, @intcloudsysops/ml | api → ml; ml → llm-gateway |
| Procesos / CLI | execa | api, orchestrator |
| Tests | vitest | api, orchestrator, ml, llm-gateway |
| Reverse proxy / deploy | Traefik, Docker Compose, GitHub Actions | infra, .github |

## Necesario para el sistema Opsly (core actual) — ya cubierto o cubierto por diseño
- **API + validación:** Next + Zod — no añadir Joi/Yup salvo caso concreto (ADR).
- **Colas:** BullMQ + Redis — coherente; no migrar a otro motor de colas sin ADR.
- **Orquestación tenant:** Docker Compose por tenant (no K8s/Swarm; ya en reglas del plan).
- **Auth:** Supabase Auth + tokens admin (PLATFORM_ADMIN_TOKEN); no next-auth salvo producto lo exija.
- **Métricas host:** API ya consulta Prometheus vía HTTP (métricas sistema); no exige prom-client en package.json hoy.

## Falta por fase del MASTER PLAN (añadir solo cuando toque la fase)
| Fase | Librería / herramienta | Motivo |
|------|------------------------|--------|
| 8–9 | bull-board (opcional) | UI colas BullMQ en staging; no obligatorio en prod |
| 9+ | @sentry/nextjs (u otro) | Error tracking unificado API/admin/portal — evaluar coste y DSN en Doppler |
| 9+ | pino (o logger estructurado) | Sustituir gradualmente console.* en servicios largos (orchestrator, gateway) |
| 10 | @google-cloud/bigquery (+ cliente GCP) | apps/analytics según PASO 10.1 del plan |
| 10–11 | pgvector / embeddings | RAG y Fase 11 — migración Supabase + diseño índices |
| 11 | OpenAI SDK (opcional) | Si fine-tuning o modelo OpenAI entra en pipeline además de Anthropic |
| 11 | gray-matter | Si se formaliza parseo de SKILL.md en runtime (skills ya existen como docs) |
| 12 | (sin cambio de stack masivo) | Stripe webhooks ya con zod donde aplique |

## Opcionales / “útil más adelante” — no integrar por defecto
- **Fastify / Express** junto a Next API: duplicaría superficie HTTP; Next basta salvo microservicio extra aislado (ADR).
- **Prisma / Drizzle** además de Supabase client: duplicación de modelo; usar solo si hay query muy pesada fuera de PostgREST.
- **LangChain / LangGraph:** solo si un flujo de agentes lo exige; hoy el gateway + orchestrator cubren el camino “Opsly”.
- **LiteLLM / OpenRouter:** evaluar si multi-proveedor se vuelve requisito; hoy LLM Gateway propio.
- **next-auth:** no alineado con “Supabase Auth + portal por invitación” sin rediseño.
- **casl (RBAC):** valor si roles multi-tenant complejos; hoy policies en API + metadata.
- **Twilio / FCM / nodemailer:** Resend cubre email; otros canales = nueva fase producto.
- **Terraform:** ya en cultura del repo para infra; no mezclar con dependencias npm del app layer.
- **Playwright E2E:** recomendable en CI; añadir workspace devDependency cuando haya suite E2E estable (no bloquea Fase 8).
- **OpenTelemetry:** cuando SLOs y trazas distribuidas sean requisito; no sustituir logs básicos antes de tiempo.
- **tiktoken / lodash:** solo si ML/context engine lo requiere medible (tokens, chunks); evitar lodash global si TS + utilidades nativas bastan.

## Reglas para no romper nada
1. Ninguna dependencia nueva en `apps/api` sin pasar `npm run type-check` y revisión de bundle (Next).
2. Redis: orchestrator ya usa `redis` v4; antes de introducir **ioredis** en orchestrator, verificar compatibilidad BullMQ y una sola abstracción de conexión (evitar dos clientes distintos al mismo host sin motivo).
3. AI: mantener regla **“no Anthropic directo desde producto; LLM Gateway”** salvo scripts internos documentados.
4. Cualquier SDK de terceros con secretos → solo Doppler / env, nunca commit.

## Resumen ejecutivo
- **No hace falta** clonar el “stack completo” de la lista externa: gran parte ya está o está cubierta por diseño (Next, Zod, BullMQ, Redis, Supabase, Stripe, Resend, Vitest, Anthropic vía gateway).
- **Sí hace falta planificar** (sin instalar aún): observabilidad producto (Sentry o similar), logger estructurado, E2E Playwright, BigQuery/analytics en Fase 10, vector/RAG en Fase 11 — según tablas anteriores.
- **Evitar** añadir frameworks paralelos (Fastify, ORM duplicado, LangChain) hasta que una fase del plan o un ADR lo justifique.

═══════════════════════════════════════════════════════════════
FASE 0: PROTOCOLO OBLIGATORIO ANTES DE EMPEZAR
═══════════════════════════════════════════════════════════════

Ejecutar siempre antes de cualquier fase:

# 1. Leer contexto completo
cat AGENTS.md
cat VISION.md
cat docs/MASTER-PLAN.md  # este archivo

# 2. Leer skills disponibles
ls skills/user/
cat skills/user/opsly-context/SKILL.md

# 3. Estado VPS
ssh vps-dragon@100.120.151.91 "
  echo '=== Servicios ===' &&
  systemctl is-active \
    cursor-prompt-monitor \
    opsly-watcher &&
  echo '=== Contenedores ===' &&
  docker ps --format 'table {{.Names}}\t{{.Status}}'
" 2>/dev/null || echo "VPS no accesible desde este entorno"

# 4. Tokens
./scripts/check-tokens.sh

# 5. Tests actuales
npm run type-check 2>&1 | tail -5

# 6. Último estado del plan
grep -A 5 "FASE ACTUAL" docs/MASTER-PLAN-STATUS.md \
  2>/dev/null || echo "Primera ejecución"

Reportar estado antes de continuar.
Actualizar docs/MASTER-PLAN-STATUS.md con la fase actual.

═══════════════════════════════════════════════════════════════
MASTER PLAN — 12 FASES
═══════════════════════════════════════════════════════════════

FASE 1:  Infraestructura base ✅ (completada)
FASE 2:  Portal + invitaciones ✅ (completada)
FASE 3:  OpenClaw MCP ✅ (completada)
FASE 4:  LLM Gateway Beast Mode ✅ (completada)
FASE 5:  Feedback + ML Decision Engine ✅ (completada)
FASE 6:  OAuth 2.0 + PKCE ✅ (completada)
FASE 7:  Skills Claude Modo Supremo ✅ (completada)
FASE 8:  Sprint nocturno (en progreso 🔄)
FASE 9:  Activación producción completa ⏳
FASE 10: Google Cloud + BigQuery ⏳
FASE 11: Fine-tuning ML + Agentes verticales ⏳
FASE 12: Monetización + primer cliente pagador ⏳

═══════════════════════════════════════════════════════════════
FASE 8: SPRINT NOCTURNO (EN PROGRESO)
═══════════════════════════════════════════════════════════════

Ver prompt de sprint nocturno ya enviado.
Si no está completo → terminarlo primero.

Checklist fase 8:
- [ ] Deuda técnica cerrada (Redis auth codes)
- [ ] Drive sync con service account JSON
- [ ] n8n workflow JSON exportado
- [ ] Admin: páginas LLM metrics + agents + feedback
- [ ] Skills completos en skills/user/
- [ ] Google Cloud guía $300
- [ ] Supabase migraciones aplicadas
- [ ] AGENTS.md actualizado

NO avanzar a fase 9 hasta completar fase 8.

═══════════════════════════════════════════════════════════════
FASE 9: ACTIVACIÓN PRODUCCIÓN COMPLETA
═══════════════════════════════════════════════════════════════

PREREQUISITOS:
- [ ] ./scripts/check-tokens.sh → 0 faltantes
- [ ] npm run type-check → verde
- [ ] Fase 8 completa

PASO 9.1: Activar todos los tokens
./scripts/activate-tokens.sh

Verificar cada servicio:
curl -sf https://api.ops.smiletripcare.com/api/health
curl -sf https://admin.ops.smiletripcare.com
curl -sf https://portal.ops.smiletripcare.com/login

PASO 9.2: Importar workflow n8n
URL: https://n8n-intcloudsysops.ops.smiletripcare.com
→ Credentials → New → Crear estas credenciales:
  - GitHub API: `GITHUB_TOKEN` (legado en docs viejos: `GITHUB_TOKEN_N8N`)
  - Discord Webhook: DISCORD_WEBHOOK_URL
→ Workflows → Import from file
→ Seleccionar: docs/n8n-workflows/discord-to-github.json
→ Activate workflow

PASO 9.3: Test flujo completo Discord→Cursor
Enviar mensaje en Discord #opsly-tareas:
"echo 'test flujo Discord Cursor' >> /tmp/test-discord.txt"
Esperar 30s → verificar que cursor-prompt-monitor lo detectó.

PASO 9.4: Test flujo invitación completo
export ADMIN_TOKEN=$(doppler secrets get PLATFORM_ADMIN_TOKEN \
  --project ops-intcloudsysops --config prd --plain)
export OWNER_EMAIL="cboteros1@gmail.com"
export TENANT_SLUG="intcloudsysops"
./scripts/test-e2e-invite-flow.sh
→ Verificar email en cboteros1@gmail.com
→ Abrir link de invitación
→ Poner password
→ Ver dashboard portal

PASO 9.5: Test feedback chat
curl -sf -X POST \
  https://api.ops.smiletripcare.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "intcloudsysops",
    "user_email": "cboteros1@gmail.com",
    "message": "El botón de copiar credenciales no funciona en móvil"
  }'
→ Verificar respuesta del chat IA
→ Verificar notificación en Discord

PASO 9.6: Test drive sync
./scripts/drive-sync.sh
→ Verificar archivos en Drive carpeta "Opsly"
→ Verificar que AGENTS.md está actualizado

PASO 9.7: Verificar MCP server
curl -sf \
  https://mcp.ops.smiletripcare.com/.well-known/oauth-authorization-server
→ Debe retornar JSON con endpoints OAuth

PASO 9.8: Deploy CI verde
gh run list --repo cloudsysops/opsly \
  --workflow Deploy --limit 3
→ Todos deben ser success

Notificar al terminar:
./scripts/notify-discord.sh \
  "🚀 Opsly 100% en producción" \
  "Todos los servicios activos y verificados." \
  "success"

Commit fase 9:
git add -A
git commit -m "chore(prod): phase 9 complete — full production activation verified"
git push origin main

═══════════════════════════════════════════════════════════════
FASE 10: GOOGLE CLOUD + BIGQUERY
═══════════════════════════════════════════════════════════════

PREREQUISITOS:
- [ ] Fase 9 completa
- [ ] Billing activado en Google Cloud (los $300)
- [ ] GOOGLE_CLOUD_PROJECT_ID en Doppler prd
- [ ] GOOGLE_SERVICE_ACCOUNT_JSON en Doppler prd

PASO 10.1: Setup BigQuery
Crear apps/analytics/ en el monorepo:

apps/analytics/
├── package.json
├── src/
│   ├── bigquery.ts      ← cliente BigQuery
│   ├── sync.ts          ← sync Supabase → BigQuery
│   ├── queries.ts       ← queries analíticas
│   └── types.ts
└── __tests__/

Dataset en BigQuery: opsly_analytics
Tablas a migrar:
- usage_events → opsly_analytics.usage_events
- feedback_conversations → opsly_analytics.feedback
- agent_executions → opsly_analytics.executions

PASO 10.2: Sync automático
Crear job BullMQ que sincroniza cada hora:
apps/orchestrator/src/jobs/BigQuerySyncJob.ts

PASO 10.3: Queries analíticas
Implementar en apps/analytics/src/queries.ts:
- costByTenant(period): costo total por tenant
- topModels(period): modelos más usados
- cacheHitRate(period): eficiencia del cache
- feedbackByType(period): distribución de decisiones ML
- agentSuccessRate(team): tasa de éxito por team

PASO 10.4: Dashboard analytics en admin
Nueva página /analytics en apps/admin/:
- Gráficos de costo por tenant (recharts)
- Cache hit rate over time
- Feedback resolution rate
- Agent team performance
- Proyección de costos mensual

PASO 10.5: Cloud Run para ML
Mover apps/ml/ a Cloud Run:
- Crear Dockerfile optimizado para Cloud Run
- CI/CD: build → push GCR → deploy Cloud Run
- Variable: CLOUD_RUN_ML_URL en Doppler
- LLM Gateway llama a Cloud Run para inferencia pesada

Commit fase 10:
git add -A
git commit -m "feat(analytics): BigQuery integration + Cloud Run ML + admin dashboard"
git push origin main

═══════════════════════════════════════════════════════════════
FASE 11: FINE-TUNING ML + AGENTES VERTICALES
═══════════════════════════════════════════════════════════════

PREREQUISITOS:
- [ ] Fase 10 completa
- [ ] 1000+ conversaciones en platform.conversations
- [ ] 500+ feedbacks con rating en platform.llm_feedback
- [ ] pgvector activo en Supabase

PASO 11.1: Pipeline de datos para fine-tuning
Crear apps/ml/src/training-pipeline.ts:

Exportar datos en formato JSONL para fine-tuning:
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}

Solo incluir conversaciones con rating >= 4.
Filtrar por outcome = "resolved".

PASO 11.2: Fine-tuning en Google Colab (gratuito)
Crear docs/FINE-TUNING-GUIDE.md con:
- Cómo exportar datos desde Supabase
- Cómo subir a Google Colab
- Script de fine-tuning sobre Llama 3.2 3B
- Cómo subir modelo a Hugging Face
- Cómo servir con Ollama en VPS

PASO 11.3: Agentes verticales por industria
Crear en apps/ml/src/agents/:

agents/
├── WhatsAppAgent.ts      ← automatización mensajes
├── SchedulingAgent.ts    ← recordatorios y citas
├── PaymentAgent.ts       ← notificaciones de pago
├── LeadAgent.ts          ← clasificación y seguimiento
└── SupportAgent.ts       ← respuestas automáticas

Cada agente:
- Usa LLM Gateway
- Contexto por tenant via Context Builder
- Se registra en n8n como workflow
- Métricas en BigQuery

PASO 11.4: RAG por tenant
Implementar completamente apps/ml/src/rag.ts:
- Embeddings de documentos del tenant en pgvector
- Búsqueda semántica antes de cada respuesta
- Cache de embeddings en Redis (TTL 24h)
- Re-indexar cuando llegan documentos nuevos

PASO 11.5: Marketplace de agentes
Nueva sección en apps/admin/:
/agents/marketplace → catálogo de agentes disponibles
/agents/install/:slug → instalar agente en tenant

Cada agente tiene:
- Descripción y casos de uso
- Plan mínimo requerido
- Workflow n8n asociado
- Precio adicional (si aplica)

Commit fase 11:
git add -A
git commit -m "feat(ml): fine-tuning pipeline + vertical agents + RAG + marketplace"
git push origin main

═══════════════════════════════════════════════════════════════
FASE 12: MONETIZACIÓN + PRIMER CLIENTE PAGADOR
═══════════════════════════════════════════════════════════════

PREREQUISITOS:
- [ ] Fase 11 completa
- [ ] Al menos 1 agente vertical funcionando
- [ ] Portal estable con 0 bugs críticos
- [ ] Stripe configurado y probado

PASO 12.1: Pricing finalizado
Actualizar config/opsly.config.json:

Plans:
- startup ($49/mes):
  * 2 agentes paralelos
  * 10k tokens/mes incluidos
  * n8n + Uptime Kuma
  * 1 agente vertical

- business ($149/mes):
  * 5 agentes paralelos
  * 50k tokens/mes incluidos
  * Todo lo anterior
  * 3 agentes verticales
  * Analytics básico

- enterprise ($499/mes):
  * Ilimitado
  * Tokens ilimitados
  * Todo lo anterior
  * Agentes custom
  * BigQuery analytics
  * SLA 99.9%
  * Soporte prioritario

PASO 12.2: Stripe webhooks completos
Implementar todos los eventos:
- customer.subscription.created → activar tenant
- customer.subscription.updated → cambiar plan
- customer.subscription.deleted → suspender tenant
- invoice.payment_failed → notificar + grace period
- invoice.payment_succeeded → confirmar activo

PASO 12.3: Portal de billing para clientes
Nueva sección en apps/portal/:
/billing → ver plan actual, uso, facturas
/billing/upgrade → cambiar de plan
/billing/invoices → historial de pagos

PASO 12.4: Onboarding automatizado completo
Cuando llega pago exitoso:
1. Crear tenant automáticamente
2. Enviar invitación por email
3. n8n configura workflows del plan
4. Discord notifica a Cristian
5. Uptime Kuma monitorea nuevos servicios

PASO 12.5: Landing page
Actualizar apps/web/ con:
- Hero: "Tu negocio automatizado en 5 minutos"
- Demo en video o GIF
- Pricing con los 3 planes
- CTA: "Empezar gratis 14 días"
- Casos de uso: WhatsApp, citas, pagos
- Testimonios: smiletripcare, peskids

PASO 12.6: Primer cliente pagador
Objetivo: cobrarle a smiletripcare o peskids.

Script de conversión:
- Email personalizado con lo que ya tiene gratis
- Mostrar el valor: N workflows activos,
  X automaciones corriendo, ahorro de Y horas/mes
- Oferta de lanzamiento: 50% off primer mes

Commit fase 12:
git add -A
git commit -m "feat(monetization): complete billing, landing page, first paying customer"
git push origin main

═══════════════════════════════════════════════════════════════
ARCHIVO DE ESTADO — ACTUALIZAR SIEMPRE
═══════════════════════════════════════════════════════════════

Crear y mantener docs/MASTER-PLAN-STATUS.md:

# MASTER PLAN — Estado actual
## Última actualización: [fecha]
## FASE ACTUAL: [número y nombre]

## Progreso por fase
| Fase | Nombre | Estado | Commit |
|------|--------|--------|--------|
| 1 | Infraestructura base | ✅ Completa | abc1234 |
| 2 | Portal + invitaciones | ✅ Completa | def5678 |
| 3 | OpenClaw MCP | ✅ Completa | ghi9012 |
| 4 | LLM Gateway Beast Mode | ✅ Completa | jkl3456 |
| 5 | Feedback + ML | ✅ Completa | mno7890 |
| 6 | OAuth 2.0 + PKCE | ✅ Completa | pqr1234 |
| 7 | Skills Claude Supremo | ✅ Completa | stu5678 |
| 8 | Sprint nocturno | 🔄 En progreso | — |
| 9 | Activación producción | ⏳ Pendiente | — |
| 10 | Google Cloud + BigQuery | ⏳ Pendiente | — |
| 11 | Fine-tuning + Agentes | ⏳ Pendiente | — |
| 12 | Monetización | ⏳ Pendiente | — |

## Próximo paso inmediato
[descripción de la siguiente acción concreta]

## Bloqueantes activos
[lista de lo que requiere a Cristian]

## Métricas del proyecto
- Tenants activos: [N]
- Tests pasando: [N/N]
- Cobertura: [%]
- Último deploy: [fecha]
- MRR actual: $[N]

═══════════════════════════════════════════════════════════════
INSTRUCCIONES PARA CLAUDE AL VOLVER
═══════════════════════════════════════════════════════════════

Cuando Claude regrese con límites renovados,
Cristian le dice:

"Continúa con el plan de trabajo.
Aquí está el avance: [pegar reporte de Cursor]"

Claude entonces:
1. Lee docs/MASTER-PLAN-STATUS.md
2. Lee AGENTS.md
3. Verifica en qué fase está
4. Genera el siguiente prompt para Cursor
5. Coordina la siguiente fase

═══════════════════════════════════════════════════════════════
REGLAS PERMANENTES DEL PROYECTO
═══════════════════════════════════════════════════════════════

NUNCA:
- Proponer K8s, Swarm, nginx
- Secretos en código
- any en TypeScript
- Saltarse validate-config
- terraform apply sin plan
- docker system prune --volumes
- Escalar horizontal antes de 10 tenants pagadores
- Comprar dominios antes del primer cliente pagador
- Usar Sonnet si Haiku alcanza
- Llamar Anthropic API directo (siempre LLM Gateway)

SIEMPRE:
- Leer AGENTS.md primero
- TDD: tests antes de implementar
- set -euo pipefail en bash
- --dry-run en scripts
- Notificar Discord al completar
- Sincronizar Drive al hacer commit
- Actualizar MASTER-PLAN-STATUS.md
- Documentar decisiones como ADR
- Vertical antes de horizontal

CUANDO CRISTIAN DICE "continúa":
1. Leer MASTER-PLAN-STATUS.md
2. Identificar fase actual
3. Ejecutar siguiente bloque sin preguntar
4. Reportar solo bloqueantes humanos

---

## Related Documents
[[MASTER-PLAN]] | [[ARCHITECTURE]] | [[HERMES-SPRINT-PLAN]] | [[NOTEBOOKLM-INTEGRATION]]
