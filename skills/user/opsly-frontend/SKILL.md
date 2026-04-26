# Opsly Frontend Skill

> **Triggers:** `componente`, `página`, `portal`, `admin`, `UI`, `frontend`, `react`, `tailwind`, `dashboard`, `formulario`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-api`, `opsly-supabase`, `opsly-tenant`

## Cuándo usar

Al crear o modificar componentes, páginas o lógica client-side en `apps/portal`, `apps/admin`, o `apps/web`. Incluye: componentes React, páginas Next.js, fetching de datos, estilos Tailwind, y patrones de autenticación.

## Stack frontend

- **Next.js 15.1** con App Router (`/app`)
- **React 19** — server components por defecto, `"use client"` solo cuando hay estado/efectos
- **TypeScript 5.7** strict
- **Tailwind 3.4** con tokens custom: `ops-green`, `ops-surface`, `ops-border`, `ops-red`
- **Radix UI** para primitivos (Slot, Dialog, etc.)
- **Lucide React** para iconos
- **CVA** (class-variance-authority) + `cn()` para composición de clases
- **Supabase Auth** — `createServerSupabase()` en server, `createClient()` en client

## Patrón de página (server component)

```tsx
// apps/portal/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { PortalShell } from '@/components/portal-shell';

export default async function DashboardPage(): Promise<ReactElement> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <PortalShell>{/* contenido */}</PortalShell>;
}
```

## Patrón de componente client

```tsx
// apps/portal/components/mi-componente.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MiTipo } from '@/types';

interface Props {
  dato: MiTipo;
  onAction?: () => void;
}

export function MiComponente({ dato, onAction }: Props): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // lógica async
      onAction?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {error && <p className="text-ops-red text-sm">{error}</p>}
      <Button onClick={handleAction} disabled={loading}>
        {loading ? 'Procesando...' : 'Acción'}
      </Button>
    </div>
  );
}
```

## API Client (Admin)

El admin usa un wrapper centralizado en `apps/admin/lib/api-client.ts`:

```tsx
// Siempre usar las funciones exportadas, nunca fetch directo
import { getTenants, getMetrics } from '@/lib/api-client';

// El client agrega automáticamente:
// - Content-Type: application/json
// - Authorization: Bearer <session-auth-token>
```

Para portal, las llamadas van directo a Supabase con `createClient()`.

## Componentes UI disponibles

Ubicación: `apps/{portal,admin}/components/ui/`

| Componente | Variantes                                                           | Uso                    |
| ---------- | ------------------------------------------------------------------- | ---------------------- |
| `Button`   | `primary`, `default`, `ghost`, `link` + sizes `sm`, `default`, `lg` | Acciones               |
| `Card`     | —                                                                   | Contenedores con borde |
| `Input`    | —                                                                   | Formularios            |
| `Badge`    | `default`, `success`, `warning`, `error`                            | Estados                |
| `Dialog`   | —                                                                   | Modales (Radix)        |

## Prevenir errores React comunes

### Hydration mismatch (#418)

- No usar `Date.now()`, `Math.random()`, o `window` en el render inicial de client components
- Si necesitas datos dinámicos, usar `useEffect` para setearlos después del mount

### Hooks violation (#310)

- **NUNCA** retornar antes de un hook. Todos los `useState`, `useMemo`, `useEffect` deben ejecutarse siempre, en el mismo orden
- Si necesitas condicionar, usa el hook y condiciona el valor:

  ```tsx
  // MAL
  if (!data) return null;
  const processed = useMemo(() => transform(data), [data]);

  // BIEN
  const processed = useMemo(() => (data ? transform(data) : null), [data]);
  if (!processed) return null;
  ```

### Auth token en Admin

- Siempre usar `api-client.ts` que inyecta `Authorization: Bearer` automáticamente
- Si creas un endpoint admin nuevo, verificar que el client pasa el token

## Reglas

- Server components por defecto; `"use client"` solo cuando hay hooks o eventos.
- Props con interfaces explícitas, nunca `any`.
- Estilos con Tailwind tokens (`ops-*`), no hex hardcodeados.
- Importaciones con `@/` (alias configurado en cada app).
- Validación de inputs con Zod, sincronizada con schemas del API.
- Toda página autenticada verifica `supabase.auth.getUser()` y redirige si no hay sesión.

## Errores comunes

| Error         | Causa                              | Solución                                |
| ------------- | ---------------------------------- | --------------------------------------- |
| React #418    | Hydration mismatch                 | Mover datos dinámicos a `useEffect`     |
| React #310    | Hook después de return condicional | Mover hooks antes de cualquier return   |
| 401 en Admin  | Token no enviado                   | Usar `api-client.ts`, no fetch directo  |
| Estilos rotos | Clase Tailwind inexistente         | Usar tokens `ops-*` definidos en config |
| FOUC          | Client component pesado            | Considerar server component + streaming |
