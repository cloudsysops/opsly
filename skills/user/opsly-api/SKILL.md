# Opsly API Skill

## Cuándo usar

Al crear o modificar rutas en `apps/api/`.

## Plantilla para route handlers

En este monorepo las importaciones suelen ser **relativas** (`../../../lib/auth`), no `@/` (salvo que el paquete lo tenga configurado).

```typescript
// apps/api/app/api/[feature]/route.ts
import type { NextRequest } from "next/server";
import { requireAdminToken } from "../../../lib/auth";
import { HTTP_STATUS } from "../../../lib/constants";

export async function GET(req: NextRequest): Promise<Response> {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  try {
    // lógica
    return Response.json({ data: {} });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
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

- 200 con datos esperados (mocks Supabase/fetch).
- 401 sin token (cuando la ruta es protegida).
- 400 body inválido si aplica.
- 500 con error de DB mockeado si aplica.
