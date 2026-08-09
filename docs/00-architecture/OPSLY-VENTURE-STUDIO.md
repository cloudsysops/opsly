---
status: implemented_contract_only
owner: platform
last_review: 2026-08-02
---

# Opsly Venture Studio

## Modelo

```text
IntCloudSysOps = vende, implementa y opera
Opsly = plataforma tecnológica
Blueprint = composición de capacidades para una vertical
Tenant = negocio concreto y sus overrides
```

La dependencia permitida es:

```text
tenant → blueprint → canonical modules → adapters → existing services
```

El Core no importa Peskids, una clínica, un proveedor concreto, una ciudad ni
un dominio de tenant.

## Estado actual

La plataforma es `PARTIAL_MODULE_PLATFORM`. Hay código reusable para tenancy,
provisioning, CRM/adapters, automations, agents, billing, health y
observability. Providers, service catalog, quotes, cases, documents y venture
lifecycle todavía no son módulos comunes.

**No asumir heredado:** `AgentTaskEnvelopeV1` y el pipeline
`Router → Policies → Orchestrator → LLM Gateway` no existen en este repo, ni
en código ni en documentación (verificado por `grep` exhaustivo — ver
`docs/audits/OPSLY-VENTURE-STUDIO-FOUNDATION-AUDIT.md`). El LLM Gateway
tampoco es universalmente forzado hoy: hay llamadas directas al SDK de
Anthropic fuera de `apps/llm-gateway` en al menos 4 ubicaciones. Cualquier PR
de este programa que dependa de estos contratos debe construirlos
explícitamente, no asumirlos existentes.

**No duplicar:** `packages/opsly-core` ya es un intento previo de "core"
(tenancy + agent runtime + event builder + AI gateway) — es POC (providers
mock/gemini/stub, CLI de demo) con un único consumidor real y ese consumidor
es en sí mismo un app huérfano. El Core de este programa no debe extender
`packages/opsly-core` ni reinventarlo en paralelo sin decisión explícita.

## Target de dry-run

```text
opsly venture create \
  --blueprint <blueprint-id> \
  --slug <tenant-slug> \
  --name <display-name> \
  --modules <module-id,...> \
  --market <market-code> \
  --operating-country <country-code> \
  --locale <locale> \
  --currency <currency-code,...> \
  --dry-run
```

El comando producirá una propuesta, no efectos externos. `--write` será una
operación explícita y separada; no crea secretos, despliega, modifica DNS,
aplica migraciones productivas ni activa pagos/comunicaciones.

## Capas

1. **Core:** contratos, registry, entitlements, auth, tenancy, audit y runtime.
2. **Adapters:** Twenty, n8n, Stripe/Wompi, email, almacenamiento y agentes.
3. **Blueprints:** composición y defaults por vertical.
4. **Tenants:** branding, configuración, flags, permisos y datos propios.
5. **Operations:** dashboard, health, smoke, tareas humanas y approval gates.

## Primer sandbox

`medical-tourism-demo` será un fixture no productivo con datos, proveedores y
documentos sintéticos. `colombia-health-journey` solo se creará después de
validar el flujo provider → catalog → quote → case → booking.

## No objetivos

No se incluyen diagnóstico por IA, marketplace público, reservas clínicas
automáticas, Meta/WACRM/WhatsApp Cloud API, mobile, reconocimiento facial ni
integraciones complejas de aseguradoras.
