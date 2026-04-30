# Claude Context — Opsly

## Stack (detalle en `AGENTS.md` → "Stack (fijo)")

Next.js 15 · TypeScript strict · Tailwind · shadcn/ui · Supabase · Stripe ·
Docker Compose · Traefik v3 · Redis/BullMQ · Doppler · Resend · Discord

## Reglas de Código

### TypeScript
- **NUNCA** `any` — tipos explícitos
- Funciones >50 líneas → dividir
- Usar `lib/constants.ts` para números mágicos

### Patrones
- **Repository**: queries Supabase → `lib/repositories/`
- **Factory**: crear recursos → `lib/factories/`
- **Strategy**: routing LLM → `apps/llm-gateway/src/providers/`

## Multi-Tenancy (CRÍTICO)

**NUNCA mezclar datos de tenants.**

1. Rutas `[slug]` → SIEMPRE `tenantSlugMatchesSession(session, slug)` primero
2. Jobs BullMQ → SIEMPRE `tenant_slug` + `request_id` en payload
3. Queries → `platform.` (global) vs `tenant_{slug}` (aislado)
4. RLS activo en `platform.tenants`

## Convenciones Commit

`type(scope): description` — ver `docs/QUICK-REFERENCE.md` para detalles.

Ejemplos: `feat(api): add GET /api/portal/usage`, `fix(hooks): prevent main commit`

## Antes de Escribir Código

1. Leer `AGENTS.md` → entender estado actual
2. Buscar en `lib/` → reutilizar lógica
3. Ver `docs/adr/` → alinear con arquitectura
4. Rutas API → revisar `apps/api/lib/` primero

## Variables (Placeholders)

**NUNCA** commitear secretos. Usar Doppler:
```bash
doppler run --project ops-intcloudsysops --config prd -- <command>
```

## Referencias Cruzadas
- **Estado**: `AGENTS.md` (raíz) — fuente de verdad
- **Visión**: `VISION.md`
- **Roadmap**: `ROADMAP.md`
- **Arquitectura**: `docs/adr/`, `docs/OPENCLAW-ARCHITECTURE.md`
- **Skills**: `skills/README.md`, `skills/user/`
