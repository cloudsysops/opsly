# Frontend Audit (Portal/Admin/Web)

Fecha: 2026-04-07

## Hallazgos y estado

| Ruta/Componente                                      | Hallazgo                                                                 | Impacto | Estado    |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ------- | --------- |
| `apps/portal/app/invite/[token]/invite-activate.tsx` | Falta `catch` global en submit; errores inesperados quedaban silenciosos | Alto    | Corregido |
| `apps/portal/app/invite/[token]/invite-activate.tsx` | Boton sin estado de carga visible al activar cuenta                      | Medio   | Corregido |
| `apps/admin/app/invitations/page.tsx`                | Copiar enlace falla silenciosamente si Clipboard API no disponible       | Medio   | Corregido |
| `apps/admin/app/settings/page.tsx`                   | Parseo JSON de backup puede lanzar excepción si responde texto no JSON   | Alto    | Corregido |
| `apps/admin/components/tenants/TenantActions.tsx`    | Dialog de delete permite cancelar durante delete activo                  | Medio   | Corregido |

## Pendientes recomendados (siguiente iteración)

- Agregar tests UI/unit para `portal` y `admin` (actualmente sin suite dedicada).
- Estandarizar feedback de acciones con componente compartido de `toast/alert`.
- Revisar accesibilidad en formularios (`aria-live` para errores, foco tras fallo).
- Consolidar estados de carga de botones en componentes reutilizables.
