# ADR-022 — Dependency Injection sobre vi.mock para módulos con singletons

**Fecha:** 2026-04-10  
**Estado:** Aceptada  
**Contexto:** Sprint 3 — `apps/api/lib/stripe/usage-sync.ts`

---

## Contexto

Al escribir tests para `syncAllTenantsUsage`, el patrón habitual `vi.mock("../path/to/module")` falló
de forma no determinista:

1. **Resolución de rutas inconsistente:** desde `lib/stripe/__tests__/`, la ruta
   `"../../../supabase/client"` resolvía a `apps/api/supabase/client`, pero el módulo fuente
   (`usage-sync.ts`) resolvía a `apps/api/lib/supabase/client`. Las dos cadenas referenciaban
   módulos distintos en el grafo de Vitest.

2. **Singleton de cliente:** `supabase/client.ts` usa un patrón `let serviceClient = null`
   (singleton en memoria). Aunque `vi.mock` hubiera interceptado la función, el cliente cacheado
   de un test anterior se devolvía al siguiente test.

3. **`tsconfig` `moduleResolution: "bundler"`** difiere de la resolución Node que Vitest usa
   por defecto para mocks, generando diferencias sutiles en el grafo de módulos.

---

## Decisión

Usar **Dependency Injection (DI) explícita** en módulos con efectos secundarios costosos o
singletons, en lugar de `vi.mock`.

```ts
// Interfaz pública del módulo
export interface SyncDeps {
  db?: ReturnType<typeof getServiceClient>;
  stripe?: Stripe;
}

// Función acepta deps opcionales; produce defaults en producción
export async function syncAllTenantsUsage(deps?: SyncDeps): Promise<UsageSyncResult> {
  const db = deps?.db ?? getServiceClient();
  const stripe = deps?.stripe ?? getStripe();
  // ...
}
```

Los tests pasan mocks directamente:

```ts
const result = await syncAllTenantsUsage({
  db: makeSupabase([...tenantsData]),
  stripe: makeStripe({ retrieveExpanded: mockSub }),
});
```

---

## Consecuencias

**Positivas:**

- Tests **100% deterministas** — no dependen de la resolución de rutas de Vitest
- **Cero acoplamiento** entre el sistema de módulos y la testabilidad
- El código de producción sin `deps` funciona exactamente igual (defaults intactos)
- Patrón reutilizable para cualquier módulo con cliente Supabase, Stripe, Redis o HTTP

**Negativas:**

- Firma de la función pública cambia (es `backward-compatible` — `deps` es opcional)
- Requiere definir la interfaz `SyncDeps` explícitamente

**Regla establecida:**  
Cualquier módulo en `apps/api/lib/` que use `getServiceClient()`, `getStripe()`, `redis.get()`,
o similares singletons **debe** aceptar un parámetro `deps?: XxxDeps` con ese cliente como
campo opcional para ser testeable sin `vi.mock`.

---

## Alternativas descartadas

| Alternativa                 | Razón de descarte                                       |
| --------------------------- | ------------------------------------------------------- |
| Corregir paths de `vi.mock` | Frágil ante cambios de tsconfig o reorganización        |
| `vi.doMock` dinámico        | Requiere `await import()` especial en cada test         |
| Extraer a barrel re-export  | No resuelve el singleton; solo mueve el problema        |
| Jest en vez de Vitest       | Cambio de herramienta desproporcionado para el problema |
