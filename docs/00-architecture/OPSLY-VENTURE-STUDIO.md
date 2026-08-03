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
