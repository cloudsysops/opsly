---
status: active
owner: operations
updated: 2026-07-08
---

# Blueprints — Índice

Documentos de referencia para lanzar y operar tenants en Opsly. Todos son "ready to use" — no requieren interpretación adicional.

---

## Por dónde empezar

| Situación | Blueprint |
|-----------|-----------|
| **Nuevo tenant desde cero** | `TENANT-ONBOARDING-TEMPLATE.md` |
| **Segundo+ tenant (acelerar)** | `TENANT-REPEAT-PLAYBOOK.md` |
| **Configurar IA para cualquier tenant** | `AI-TENANT-SETUP-BLUEPRINT.md` ⭐ |
| **Academia / escuela reproducible** | `academy/README.md` |
| **Go-live (checklist ejecutivo)** | `GO-LIVE-COMMAND.md` |
| **Hardening / enterprise security** | `OPSLY-ENTERPRISE-HARDENING-BLUEPRINT.md` |
| **Automatizaciones n8n críticas** | `N8N-AUTOMATION-GUARANTEES.md` |

---

## Blueprints por categoría

### Tenant Operations

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `TENANT-ONBOARDING-TEMPLATE.md` | Template completo para nuevo tenant | ✅ active |
| `TENANT-REPEAT-PLAYBOOK.md` | Flujo acelerado segundo+ tenant | ✅ active |
| `AI-TENANT-SETUP-BLUEPRINT.md` | Stack AI + playbook generation | ✅ active |
| `TWENTY-CRM-CUTOVER-CHECKLIST.md` | Migración CRM paso a paso | ✅ active |
| `WACRM-TWENTY-HYBRID-CONTRACT.md` | wacrm inbox + Twenty pipeline | ✅ active |

### Go-Live & Execution

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `GO-LIVE-COMMAND.md` | Checklist ejecutivo Phase 1 | ✅ active |
| `PHASE1-EXECUTION-CHECKLIST.md` | Paso a paso detallado | ✅ active |
| `PHASE1-IMPLEMENTATION-GUIDE.md` | Guía técnica Phase 1 | ✅ active |
| `N8N-AUTOMATION-GUARANTEES.md` | Automatizaciones críticas n8n | ✅ active |

### Security & Architecture

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `OPSLY-ENTERPRISE-HARDENING-BLUEPRINT.md` | Security hardening + AI guardrails | 🟡 draft |
| `WOMPI-PAYMENT-GATEWAY-CONTRACT.md` | Wompi integration contract | ✅ active |

### Vertical contracts

| Directorio | Propósito | Estado |
|------------|-----------|--------|
| `academy/` | Contratos mínimos Academy + baseline Executive Agent | 🟡 draft |

### Customer-Specific

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `PESKIDS-GHL-DISABLE-RUNBOOK.md` | Desactivar GHL legacy en Peskids | ✅ active |
| `ICSO-CRM-READINESS.md` | ICSO CRM readiness | ✅ active |

### Historical / Analysis

| Archivo | Propósito |
|---------|-----------|
| `CUSTOMER-ANALYSIS-ICSO-PESKIDS.md` | Análisis clientes (referencia) |
| `PESKIDS-ICSO-CUTOVER-STATUS.md` | Status histórico de cutover |
| `PHASE1-PHASE2-STATUS.md` | Status histórico fases |
| `OPERATIONAL-CLOSURE-SUMMARY.md` | Resumen operacional fase inicial |
| `BRANCH-CLEANUP-AUDIT.md` | Auditoría de ramas git |

---

## AI Stack (rápido)

```
Fable 5  → onboarding, ADRs, decisiones  (una vez)
Sonnet   → respuestas producción, digest  (diario)
Haiku    → clasificación, routing         (alta frecuencia)
```

Ver `AI-TENANT-SETUP-BLUEPRINT.md` para setup completo.

---

## Documentos relacionados

- `docs/brain/AI-STRATEGY.md` — Estrategia AI maestra
- `docs/brain/TENANT-AI-PLAYBOOK.md` — Config AI por tipo de tenant
- `docs/brain/skills/fable5-manual.md` — Manual completo Fable 5
- `docs/adr/ADR-047-fable5-model-strategy.md` — Decisión formal de modelo
- `docs/brain/modules/llm-gateway.md` — Módulo LLM Gateway
