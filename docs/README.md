# Opsly — Wiki de Documentación

> **Para agentes (Claude, Cursor, Copilot):** lee primero `QUICK-REFERENCE.md`, luego el doc de la categoría relevante.  
> **Regla de oro:** si algo no está aquí, la fuente de verdad es `AGENTS.md` en la raíz.

---

## 🚀 Inicio rápido para agentes

```
AGENTS.md          ← estado de sesión, decisiones fijas, bloqueantes
VISION.md          ← norte del producto, límites, fases
docs/QUICK-REFERENCE.md  ← SSH, comandos, env vars, URLs — LEER PRIMERO
docs/SPRINT-ROADMAP.md   ← sprints 1-8, qué está hecho, qué sigue
```

---

## 📂 Categorías

### 1. Estado y roadmap
| Doc | Cuándo usarlo |
|-----|---------------|
| [`SPRINT-ROADMAP.md`](SPRINT-ROADMAP.md) | Ver qué sprint está activo, entregables, estado |
| [`MASTER-PLAN-STATUS.md`](MASTER-PLAN-STATUS.md) | Métricas consolidadas: tests, type-check, fases |
| [`MASTER-PLAN.md`](MASTER-PLAN.md) | Stack inventario, reglas de dependencias |
| [`ACTIVE-PROMPT.md`](ACTIVE-PROMPT.md) | Prompt activo ejecutado por cursor-prompt-monitor |

### 2. Arquitectura
| Doc | Cuándo usarlo |
|-----|---------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Control plane vs data plane, Traefik, redes |
| [`OPENCLAW-ARCHITECTURE.md`](OPENCLAW-ARCHITECTURE.md) | MCP + Orchestrator + LLM Gateway + Context Builder |
| [`ORCHESTRATOR.md`](ORCHESTRATOR.md) | BullMQ jobs, workers, circuit breaker, prioridades |
| [`LLM-GATEWAY.md`](LLM-GATEWAY.md) | Cache Redis, routing bias, cost tracking |
| [`CONTEXT-BUILDER.md`](CONTEXT-BUILDER.md) | Sesiones de agentes, TTL por plan, persistencia |
| [`AGENTS-GUIDE.md`](AGENTS-GUIDE.md) | Agentes paralelos, roles, límites por plan |

### 3. Decisiones de arquitectura (ADRs)
| ADR | Decisión clave |
|-----|----------------|
| [ADR-001](adr/ADR-001-docker-compose-por-tenant.md) | Docker Compose por tenant (no Swarm/K8s) |
| [ADR-002](adr/ADR-002-traefik-sobre-nginx.md) | Traefik v3 como reverse proxy |
| [ADR-003](adr/ADR-003-doppler-secrets.md) | Doppler para todos los secretos |
| [ADR-004](adr/ADR-004-supabase-schema-por-tenant.md) | Schema `tenant_{slug}` en Supabase |
| [ADR-009](adr/ADR-009-openclaw-mcp-architecture.md) | OpenClaw MCP como capa de herramientas |
| [ADR-010](adr/ADR-010-llm-gateway.md) | LLM Gateway como proxy unificado |
| [ADR-011](adr/ADR-011-event-driven-orchestrator.md) | Orchestrator event-driven con BullMQ |
| [ADR-012](adr/ADR-012-observability.md) | Observabilidad: logs JSON + métricas |
| [ADR-015](adr/ADR-015-di-pattern-testability.md) | DI sobre vi.mock para módulos singleton |

### 4. Infra y deploy
| Doc | Cuándo usarlo |
|-----|---------------|
| [`VPS-ARCHITECTURE.md`](VPS-ARCHITECTURE.md) | Topología VPS, Traefik, IPs, puertos |
| [`DOPPLER-VARS.md`](DOPPLER-VARS.md) | Variables por entorno (`prd`, `stg`) |
| [`CLOUDFLARE-PROXY-ACTIVATION.md`](CLOUDFLARE-PROXY-ACTIVATION.md) | Activar proxy CF naranja |
| [`DEPLOY-VPS-AND-INDEX.md`](DEPLOY-VPS-AND-INDEX.md) | Deploy completo en VPS paso a paso |
| [`AUTO-PUSH-WATCHER.md`](AUTO-PUSH-WATCHER.md) | Servicio cursor-prompt-monitor en VPS |
| [`infra/terraform/README.md`](../infra/terraform/README.md) | IaC Terraform DigitalOcean |

### 5. Billing y Stripe
| Doc | Cuándo usarlo |
|-----|---------------|
| [`BILLING-FLUSH-VERCEL.md`](BILLING-FLUSH-VERCEL.md) | Cron metered billing, flush Redis → Stripe |
| [`REFACTOR-CHECKLIST.md`](REFACTOR-CHECKLIST.md) | Checklist de variables manuales (Stripe price IDs) |

### 6. Seguridad
| Doc | Cuándo usarlo |
|-----|---------------|
| [`SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md) | Zero-Trust por ruta API — revisar antes de merge |
| [`SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md) | Auditoría de seguridad completa |
| [`ARCHITECT-SECURITY-REVIEW.md`](ARCHITECT-SECURITY-REVIEW.md) | Review arquitectónica de seguridad |
| [`SECURITY-MITIGATIONS-2026-04-09.md`](SECURITY-MITIGATIONS-2026-04-09.md) | UFW + Tailscale + Cloudflare paso a paso |

### 7. Operación y runbooks
| Doc | Cuándo usarlo |
|-----|---------------|
| [`runbooks/admin.md`](runbooks/admin.md) | Ops día a día del administrador |
| [`runbooks/dev.md`](runbooks/dev.md) | Setup y workflows del desarrollador |
| [`runbooks/incident.md`](runbooks/incident.md) | Respuesta a incidentes paso a paso |
| [`runbooks/managed.md`](runbooks/managed.md) | Runbook para tenants managed |
| [`INVITATIONS_RUNBOOK.md`](INVITATIONS_RUNBOOK.md) | Flujo completo de invitaciones |
| [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) | Diagnóstico: Traefik, Docker, Supabase, Doppler |
| [`FAQ.md`](FAQ.md) | Preguntas frecuentes con respuestas directas |
| [`FAILOVER-RUNBOOK.md`](FAILOVER-RUNBOOK.md) | Detección, alertas y failover (segundo origen + LB; manual por defecto) |
| [`FAILOVER-GCP-ARCHITECTURE.md`](FAILOVER-GCP-ARCHITECTURE.md) | Standby GCP (e2-micro) vs segundo VPS; diagramas y límites |
| [`GCP-STANDBY-CONFIG.md`](GCP-STANDBY-CONFIG.md) | Redis 1 GB, health ligero, orden de despliegue |
| [`GCP-ACTIVATION-CHECKLIST.md`](GCP-ACTIVATION-CHECKLIST.md) | Checklist activación proyecto opslyquantum + LB |

### 8. Automatización y IA
| Doc | Cuándo usarlo |
|-----|---------------|
| [`AUTOMATION-PLAN.md`](AUTOMATION-PLAN.md) | Loop Discord → GitHub → Cursor |
| [`N8N-SETUP.md`](N8N-SETUP.md) | Configuración n8n y secretos requeridos |
| [`N8N-IMPORT-GUIDE.md`](N8N-IMPORT-GUIDE.md) | Importar workflows n8n |
| [`OBSERVABILITY.md`](OBSERVABILITY.md) | Métricas, logs, alertas, Prometheus |
| [`PERFORMANCE_BASELINE.md`](PERFORMANCE_BASELINE.md) | Baselines de performance por endpoint |
| [`CLAUDE-WORKFLOW-OPTIMIZATION.md`](CLAUDE-WORKFLOW-OPTIMIZATION.md) | Optimización de sesiones con Claude |

### 9. Google Cloud y Drive
| Doc | Cuándo usarlo |
|-----|---------------|
| [`GOOGLE-CLOUD-SETUP.md`](GOOGLE-CLOUD-SETUP.md) | Setup inicial GCP + service account |
| [`GOOGLE-CLOUD-ACTIVATION.md`](GOOGLE-CLOUD-ACTIVATION.md) | Activación BigQuery + Vertex AI |
| [`GOOGLE-DRIVE-SYNC.md`](GOOGLE-DRIVE-SYNC.md) | Sync Drive: SA vs OAuth usuario |

### 10. Tenants y portal
| Doc | Cuándo usarlo |
|-----|---------------|
| [`LOCALRANK-TESTER-GUIDE.md`](LOCALRANK-TESTER-GUIDE.md) | Onboarding del tenant LocalRank |
| [`SSH-COMMANDS-LOCALRANK.md`](SSH-COMMANDS-LOCALRANK.md) | Comandos SSH específicos para LocalRank |
| [`EXECUTION-PLAN-LOCALRANK-NOTEBOOKLM.md`](EXECUTION-PLAN-LOCALRANK-NOTEBOOKLM.md) | Plan ejecución NotebookLM + LocalRank |
| [`ADMIN-ECOSYSTEM.md`](ADMIN-ECOSYSTEM.md) | Ecosistema panel admin completo |

### 11. Testing y calidad
| Doc | Cuándo usarlo |
|-----|---------------|
| [`TEST_PLAN.md`](TEST_PLAN.md) | Plan de pruebas por componente |
| [`QA-REVIEW-COMPLETE.md`](QA-REVIEW-COMPLETE.md) | QA review completa del sistema |
| [`LIBRARIES-INSTALLED.md`](LIBRARIES-INSTALLED.md) | Librerías instaladas y justificación |

### 12. Skills y agentes Claude
| Doc | Cuándo usarlo |
|-----|---------------|
| [`../skills/README.md`](../skills/README.md) | Índice de skills, cómo usar manifests |

---

## 🔗 Relaciones entre docs clave

```
AGENTS.md ─────────────────────────────────────────────────┐
    │                                                       │
    ├── VISION.md (qué somos, límites)                      │
    ├── docs/QUICK-REFERENCE.md (comandos rápidos)          │
    ├── docs/SPRINT-ROADMAP.md (qué construimos)            │
    │                                                       │
    ├── Arquitectura                                        │
    │   ├── ARCHITECTURE.md                                 │
    │   ├── OPENCLAW-ARCHITECTURE.md                        │
    │   └── adr/ (decisiones fijas)                         │
    │                                                       │
    ├── Operación                                           │
    │   ├── VPS-ARCHITECTURE.md                             │
    │   ├── DOPPLER-VARS.md                                  │
    │   └── runbooks/                                       │
    │                                                       │
    └── Seguridad                                           │
        ├── SECURITY_CHECKLIST.md                           │
        └── SECURITY-MITIGATIONS-2026-04-09.md              │
                                                            │
config/opsly.config.json ──── dominios, IPs, planes ────────┘
```

---

## ❌ Docs para archivar (no usar en nuevas sesiones)

Estos archivos son históricos — válidos como referencia pero **no deben guiar trabajo activo**:

- `docs/reports/audit-2026-04-07.md` — snapshot puntual
- `docs/CODE-REVIEW-ORCHESTRATOR-2026-04-09.md` — review puntual
- `docs/ORCHESTRATOR-FIXES-EXECUTION.md` — historial de fixes

---

*Actualizado: Sprint 3 ✅ | Próximo: Sprint 4 (Self-Healing + Context Persistence + CVE Scanning)*
