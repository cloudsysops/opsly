---
status: draft
owner: operations
last_review: 2026-05-24
type: package-doc
tags:
  - opsly/package
---

# Opsly Supabase (marketplace / oficial)

> **Triggers:** `supabase marketplace`, `supabase security`, `rls jwt`, `user_metadata unsafe`, `supabase mcp`, `supabase cli migration`, `security invoker view`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-supabase`, `opsly-api`, `opsly-tenant`
> **Origen:** adaptación de la skill *supabase* del marketplace Cursor (Supabase). Complementa `opsly-supabase` con trampas de seguridad y CLI que aplican a cualquier proyecto.

## Cuándo usar

- Cualquier migración, RLS, Auth, Storage o MCP Supabase en Opsly.
- Auditoría de políticas o de uso de JWT/metadata en rutas portal/admin.
- Depuración CLI (`supabase db`, `migration new`, versiones mínimas).

## Mapa Opsly

| Tema           | En Opsly                                                         |
| -------------- | ---------------------------------------------------------------- |
| Migraciones    | `supabase/migrations/`, schema **`platform`**, tenants           |
| Skill base     | `skills/user/opsly-supabase/SKILL.md`                            |
| API            | `service_role` en backend; nunca en cliente                      |
| Auth portal    | Zero-Trust en rutas `/api/portal/**` (`docs/SECURITY_CHECKLIST`) |

## Principios (oficial / marketplace)

1. **Verificar en docs actuales** — Supabase cambia; no asumir firmas de APIs de memoria.
2. **Verificar después de cambiar** — query de prueba o test; un cambio sin verificación está incompleto.
3. **RLS** en tablas de esquemas expuestos al Data API; políticas que reflejen el modelo real, no un patrón genérico ciego.
4. **Auth**
   - **No usar solo `user_metadata` en JWT para autorización sensible** — es editable por el usuario; datos de autorización en `app_metadata` donde aplique.
   - Borrar usuario **no invalida** tokens ya emitidos; considerar sesiones y expiración.
5. **Claves** — nunca `service_role` o secretos en código o `NEXT_PUBLIC_*`.
6. **Vistas** — en PG15+ preferir `SECURITY INVOKER` en vistas que deban respetar RLS; o restringir roles.
7. **UPDATE bajo RLS** — suele requerir política **SELECT** coherente o el UPDATE “no hace nada” sin error claro.
8. **Storage** — upsert suele requerir INSERT + SELECT + UPDATE según políticas.
9. **CLI** — descubrir flags con `supabase --help`; migraciones nuevas con `supabase migration new <name>` (no inventar nombres de archivo).
10. **MCP Supabase** — si el agente tiene MCP, seguir flujo OAuth del proveedor; troubleshooting: reachability de `mcp.supabase.com`, `.mcp.json`.

## Documentación

- [Product security](https://supabase.com/docs/guides/security/product-security)
- [CLI reference](https://supabase.com/docs/reference/cli/introduction)

## Conflicto a evitar

- No contradecir **ADR y AGENTS** del repo: schema `platform`, política de secretos Doppler, zonas rojas de migraciones en prod sin humano.

---

## Enlaces relacionados

- [[packages/skills/README|skills]]
- [[README|Inicio]]
