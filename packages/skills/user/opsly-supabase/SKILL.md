# Opsly Supabase Skill

> **Triggers:** `supabase`, `sql`, `migración`, `postgres`, `rls`, `database`, `schema`, `pgvector`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-api`, `opsly-tenant`, `opsly-feedback-ml`

## Cuándo usar

Al crear migraciones SQL o diseñar queries contra el schema `platform`.

## Migraciones — plantilla

Archivos bajo `supabase/migrations/00XX_nombre.sql`. **Postgres no admite `ADD CONSTRAINT IF NOT EXISTS`** en todas las versiones: usar bloques `DO $$ ... $$` con `pg_catalog` o comprobar existencia como en `0011_db_architecture_fix.sql`.

```sql
-- 00XX_nombre_descriptivo.sql
-- Descripción breve

CREATE TABLE IF NOT EXISTS platform.mi_tabla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mi_tabla_tenant_created
  ON platform.mi_tabla(tenant_slug, created_at DESC);

-- FK: preferir ON DELETE CASCADE; nombre explícito de constraint
-- FK: alinear con columnas reales de platform.tenants (slug, id, etc.)
ALTER TABLE platform.mi_tabla
  DROP CONSTRAINT IF EXISTS mi_tabla_tenant_fkey;
ALTER TABLE platform.mi_tabla
  ADD CONSTRAINT mi_tabla_tenant_fkey
  FOREIGN KEY (tenant_slug)
  REFERENCES platform.tenants(slug)
  ON DELETE CASCADE;

ALTER TABLE platform.mi_tabla ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.mi_tabla TO service_role;
```

(Ajusta la FK si la columna referenciada no es `tenants.slug`; algunas tablas referencian `id` uuid.)

## Reglas Opsly

- Schema **`platform`** para datos de control plane.
- Índices compuestos frecuentes: `(tenant_slug, created_at DESC)` cuando hay listados por tenant.
- RLS habilitado en tablas expuestas; la API usa `service_role` donde aplica.
- Versiones de migración **únicas** (sin duplicar `0003_*`, etc.).
- Validar en entorno linkeado: `npx supabase db push` o `--dry-run` si el CLI lo soporta y el proyecto está `supabase link`.

## Políticas RLS

Si anon/authenticated acceden por PostgREST, añadir políticas explícitas; si solo `service_role` vía backend, documentar en el ADR o en el comentario de la migración.

## Errores comunes

| Error                 | Causa                      | Solución                             |
| --------------------- | -------------------------- | ------------------------------------ |
| duplicate key version | Migración con mismo número | Renombrar a versión siguiente        |
| permission denied     | Schema no expuesto         | `GRANT USAGE ON SCHEMA platform`     |
| RLS blocked           | Políticas restrictivas     | Verificar policies para service_role |

## Testing

```bash
# Test migración dry-run
npx supabase db push --dry-run

# Ver tablas
npx supabase db query --linked "SELECT tablename FROM pg_tables WHERE schemaname='platform'"

# Test RLS
npx supabase db query --linked "SELECT * FROM platform.tenants LIMIT 1"
```
