# Admin — Invitations UI (Fase 2)

Implementado: **`/invitations`** en `apps/admin` (formulario → `POST /api/invitations` vía `sendInvitation` en `lib/api-client.ts`). Tabla histórica / persistencia sigue pendiente (no hay `GET /api/invitations`).

## Pantalla: `/invitations`

### Tabla (solo lectura)

| Columna | Fuente propuesta                                                            |
| ------- | --------------------------------------------------------------------------- |
| Email   | Último invite enviado (requiere persistencia o API Supabase Admin)          |
| Tenant  | `slug`                                                                      |
| Modo    | `developer` \| `managed`                                                    |
| Enviado | `created_at` (si se registra)                                               |
| Estado  | `pending` \| `accepted` \| `expired` (heurística vía Auth o tabla auxiliar) |

**Filtros:** tenant, estado, rango de fechas.  
**Fetch:** hoy no existe `GET /api/invitations`; Fase 2 añadiría listado paginado o lectura desde Supabase con token admin.

### Formulario (crear invitación)

| Campo  | Tipo                                                    |
| ------ | ------------------------------------------------------- |
| Email  | Text (validar formato)                                  |
| Tenant | Select poblado desde `GET /api/tenants` (slugs activos) |
| Modo   | Select `developer` / `managed`                          |
| Acción | Botón «Enviar invitación» → `POST /api/invitations`     |

### Validaciones frontend

- Email formato RFC básico.
- Tenant existe (opción seleccionable solo de lista cargada).
- Evitar doble envío accidental: deshabilitar botón mientras `fetch` en curso; opcionalmente comprobar si el usuario ya aceptó invite (Auth).

### Éxito

- Toast: «Invitación enviada a …».
- Mostrar `link` con componente estilo **`CredentialReveal`** del portal (copiar al portapapeles, ocultar tras unos segundos).
- **No** mostrar `token` en claro en UI de producción; basta con el enlace completo.

### Componentes reutilizables

- `CredentialReveal` (portal) — patrón copiar + ocultar.
- Tabla shadcn + hooks de datos existentes en admin (`useTenants` para el select).
