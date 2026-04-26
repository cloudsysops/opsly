# Opsly API Skill

> **Triggers:** `ruta API`, `next.js`, `route handler`, `endpoint`, `api route`, `rest`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-supabase`, `opsly-mcp`, `opsly-tenant`

## Cuándo usar

Al crear o modificar rutas en `apps/api/`.

## Plantilla para route handlers

En este monorepo las importaciones suelen ser **relativas** (`../../../lib/auth`), no `@/` (salvo que el paquete lo tenga configurado).

```typescript
// apps/api/app/api/[feature]/route.ts
import type { NextRequest } from 'next/server';
import { requireAdminToken } from '../../../lib/auth';
import { HTTP_STATUS } from '../../../lib/constants';

export async function GET(req: NextRequest): Promise<Response> {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  try {
    // lógica
    return Response.json({ data: {} });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    return Response.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
```

Para lectura pública en demo admin, usar `requireAdminTokenUnlessDemoRead` donde ya exista el patrón.

## Reglas

- Tipo de retorno explícito `Promise<Response>` en handlers exportados.
- Rutas admin: `requireAdminToken` o patrón demo documentado en `AGENTS.md`.
- Errores: mensaje seguro; códigos desde `HTTP_STATUS` en `lib/constants.ts`.
- Sin `any`.
- Si la función crece: extraer lógica a `lib/<feature>/`.

## Tests por ruta (Vitest)

```typescript
// apps/api/__tests__/mi-feature.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('GET /api/mi-feature', () => {
  it('returns 200 with data', async () => {
    // mock Supabase
    // expect(status).toBe(200);
  });

  it('returns 401 without token', async () => {
    // expect(status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    // mock error
    // expect(status).toBe(500);
  });
});
```

## Errores comunes

| Error       | Causa                         | Solución                          |
| ----------- | ----------------------------- | --------------------------------- |
| TS2741      | `err.message` en objeto Error | `new Error(message)`              |
| 500 en ruta | Supabase sin schema           | Añadir `Accept-Profile: platform` |
| CORS        | Origen no permitido           | Verificar `lib/cors-origins.ts`   |
