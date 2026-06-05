---
status: canon
owner: architecture
last_review: 2026-05-30
type: development
tags:
  - opsly/modularity
  - opsly/agents
---

# Modularity Contract — Core-first, tenant-ready, extraction-safe

> **Obligatorio para todo agente y todo PR de producto.**  
> Fuente normativa: [ADR-044](../adr/ADR-044-core-first-tenant-slug-extraction.md).  
> Skill operativa: `skills/user/opsly-modularity/SKILL.md`.

## Regla de oro

**Implementa una vez en core/lib → activa por `tenant_slug` → el tenant app solo adapta dominio/branding.**

No forks permanentes. No duplicar integraciones (WhatsApp, Stripe, auth, webhooks) por cliente.

## Tres capas

| Capa | Dónde | Qué va aquí |
|------|--------|-------------|
| **Core / lib** | `lib/*`, `apps/api`, `apps/orchestrator`, `apps/mcp` | Lógica reutilizable, contratos HTTP, clientes externos, metering, Zero-Trust |
| **Tenant app** | `apps/peskids`, `apps/panini-lab`, futuros `apps/<slug>` | UI, copy, rutas delgadas, reglas de negocio **solo** de ese vertical |
| **Config** | Doppler, `config/tenants/*.json`, env `TENANT_*` / `OPENWA_{SLUG}_*` | Activación por tenant sin tocar código |

## Árbol de decisión (antes de escribir código)

1. **¿Ya existe en `lib/` o `config/modules.json`?** → Reutilizar. No copiar.
2. **¿Lo usará otro tenant en 12 meses?** → `lib/<capability>/` + registro en `config/modules.json`.
3. **¿Es solo branding/copy/URLs?** → Queda en `apps/<tenant>/`.
4. **¿Es regla de negocio única del vertical?** → Handler delgado en tenant; llama lib/core.
5. **¿Integración externa (WhatsApp, CRM, pagos)?** → Cliente + verify + config en **lib**; webhook route **delgada** por app.

Si respondes **sí** a (2) y escribes solo en un tenant → **STOP** y mover a lib.

## Patrones obligatorios

### Paquete lib

```
lib/<name>/
├── package.json          # @intcloudsysops/<name>
├── src/
│   ├── client.ts         # API externa / IO
│   ├── config.ts         # getConfigForTenant(slug), env por slug
│   ├── types.ts
│   └── index.ts          # exports públicos
└── __tests__/
```

Registrar en `config/modules.json`. Consumir desde apps vía workspace dependency.

### Rutas tenant (delgadas)

```typescript
// apps/<tenant>/app/api/webhooks/foo/route.ts
import { parseFooWebhook } from '@intcloudsysops/foo';
// Solo: validar firma (lib) + mapear a dominio del tenant + persistir
```

### Opsly admin (control plane)

Rutas bajo `apps/api/app/api/admin/**` para operación cross-tenant (status, provisioning, métricas).

### Env multi-tenant

```
CAPABILITY_{SLUG_UPPER}_*   # ej. OPENWA_PESKIDS_API_URL
CAPABILITY_*                # fallback global documentado
```

## Anti-patrones (prohibidos)

| Mal | Bien |
|-----|------|
| Copiar `client.ts` en dos `apps/*` | Un `@intcloudsysops/*` en `lib/` |
| `if (slug === 'peskids')` como arquitectura | Capability flag + config por slug |
| Feature reusable solo en un tenant app | Mover a lib + thin route |
| Secretos o URLs hardcodeadas | Doppler + env |
| Segundo control plane / orchestrator | Extender OpenClaw existente |

## Ejemplo canónico: OpenWA (WhatsApp)

| Pieza | Ubicación |
|-------|-----------|
| Cliente API, HMAC, config por slug | `lib/openwa` |
| Admin status | `GET /api/admin/channels/openwa/[slug]/status` |
| Setup + webhook | `apps/<tenant>/app/api/{setup,webhooks}/openwa` (delgado) |
| Sidecar deploy | `scripts/setup-openwa-tenant.sh` |

## Checklist de PR (agente)

- [ ] Busqué en `lib/` y `config/modules.json` antes de crear archivos
- [ ] Lógica compartida vive en `@intcloudsysops/*`, no duplicada
- [ ] Tenant app: rutas delgadas + dominio; sin cliente HTTP duplicado
- [ ] Config por `tenant_slug` / env prefix, no ramas hardcodeadas
- [ ] `npm run type-check` en workspaces tocados
- [ ] Extracción futura: tenant puede llevarse el app sin orchestrator/MCP

## Referencias

- [ADR-044 — Core-first](../adr/ADR-044-core-first-tenant-slug-extraction.md)
- [Tenant incubation lifecycle](../00-architecture/TENANT-INCUBATION-LIFECYCLE.md)
- [Library modules](./LIBRARY-MODULES.md)
- [Agent Brain Contract](../03-agents/AGENT-BRAIN-CONTRACT.md)
