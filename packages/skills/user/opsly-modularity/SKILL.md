---
name: opsly-modularity
description: >
  Contrato de modularidad Opsly: core-first, lib compartida, tenant delgado,
  activación por tenant_slug, extracción sin rewrite. Evita duplicar código entre
  tenants y ahorra tokens buscando lib/ antes de implementar.
status: canon
owner: architecture
last_review: 2026-05-30
type: skill
tags:
  - opsly/modularity
  - opsly/architecture
---

# Opsly Modularity Skill

> **Triggers:** `modular`, `desacoplado`, `reutilizar`, `lib/`, `incubar`, `extraer`, `tenant`, `duplicar`, `fork`, `whatsapp`, `integración`, `no construir dos veces`  
> **Priority:** CRITICAL — aplicar **antes** de escribir código en cualquier sesión  
> **Relacionados:** `opsly-context`, `opsly-architect-senior`, `opsly-tenant`, `opsly-api`

## Cuándo usar

- Al iniciar sesión (junto con `opsly-context`).
- Antes de crear archivos en `apps/peskids`, `apps/panini-lab` u otro tenant.
- Antes de integrar APIs externas (WhatsApp, CRM, pagos, email).
- Cuando el usuario pide «modular», «desacoplado» o «reutilizable».

## Protocolo (60 segundos)

```bash
# 1. Contrato (leer una vez por sesión de implementación)
# docs/01-development/MODULARITY-CONTRACT.md

# 2. ¿Ya existe módulo?
node scripts/load-skills.js search modular
grep -r "nombre-capability" lib/ config/modules.json 2>/dev/null | head

# 3. Registro de módulos
cat config/modules.json | head -80
```

## Árbol de decisión

1. ¿Existe en `lib/`? → Importar `@intcloudsysops/*`.
2. ¿Reusable cross-tenant? → Crear/extend `lib/<name>/` + `config/modules.json`.
3. ¿Solo UI/copy del vertical? → `apps/<tenant>/`.
4. ¿Operación Opsly cross-tenant? → `apps/api/app/api/admin/...`.

## Plantilla lib + tenant

**Lib** (`lib/foo/src/config.ts`):

```typescript
export function getConfigForTenant(slug: string): FooConfig | null {
  const prefix = slug.toUpperCase().replace(/-/g, '_');
  const apiUrl = process.env[`FOO_${prefix}_API_URL`] ?? process.env.FOO_API_URL;
  // ...
}
```

**Tenant route** (delgada):

```typescript
import { parseFooWebhook, getConfigForTenant } from '@intcloudsysops/foo';

export async function POST(req: Request) {
  const parsed = await parseFooWebhook(req, getConfigForTenant('peskids'));
  // solo lógica de dominio peskids aquí
}
```

## Ejemplo vivo: OpenWA

| Capa | Path |
|------|------|
| Lib | `lib/openwa` → `@intcloudsysops/openwa` |
| Admin | `apps/api/.../admin/channels/openwa/[slug]/status` |
| Tenant | `apps/*/app/api/webhooks/openwa`, `setup/openwa` |
| Ops | `scripts/setup-openwa-tenant.sh` |

## Anti-patrones

- Dos `openwa-client.ts` con lógica distinta en apps distintas.
- Webhook verify copiado en cada tenant.
- Feature en peskids que panini necesitará mañana — mover a lib **hoy**.

## Checklist cierre

- [ ] Sin duplicación detectable entre tenants
- [ ] Módulo en `config/modules.json` si es nuevo
- [ ] type-check workspaces tocados
- [ ] ADR-044 respetado

## Docs

- `docs/01-development/MODULARITY-CONTRACT.md`
- `docs/adr/ADR-044-core-first-tenant-slug-extraction.md`
- `docs/01-development/LIBRARY-MODULES.md`
