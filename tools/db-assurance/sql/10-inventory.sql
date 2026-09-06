-- =============================================================================
-- Opsly DB Assurance — schema inventory queries
-- =============================================================================
-- Run against the EPHEMERAL replay database only. Emits one JSON document
-- describing the schema that the migration chain actually produces, which is
-- the ground-truth "EXPECTED schema" artifact for drift analysis.
--
-- Read-only: contains no DDL and no DML.
-- =============================================================================

\pset tuples_only on
\pset format unaligned

WITH app_tables AS (
  SELECT c.oid, n.nspname AS schema_name, c.relname AS table_name,
         c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast',
                          'auth','storage','extensions','vault','realtime')
),
cols AS (
  SELECT a.attrelid AS oid,
         json_agg(json_build_object(
           'name', a.attname,
           'type', format_type(a.atttypid, a.atttypmod),
           'not_null', a.attnotnull,
           'default', pg_get_expr(d.adbin, d.adrelid)
         ) ORDER BY a.attnum) AS columns
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
  GROUP BY a.attrelid
),
cons AS (
  SELECT co.conrelid AS oid,
         json_agg(json_build_object(
           'name', co.conname,
           'kind', co.contype,               -- p=PK f=FK u=UNIQUE c=CHECK
           'def',  pg_get_constraintdef(co.oid),
           'ref_schema', rn.nspname,
           'ref_table',  rc.relname
         ) ORDER BY co.contype, co.conname) AS constraints
  FROM pg_constraint co
  LEFT JOIN pg_class rc ON rc.oid = co.confrelid
  LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
  GROUP BY co.conrelid
),
pols AS (
  SELECT p.polrelid AS oid,
         json_agg(json_build_object(
           'name', p.polname,
           'cmd',  CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                                 WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
                                 ELSE 'ALL' END,
           'permissive', p.polpermissive,
           'roles', (SELECT COALESCE(array_agg(r.rolname ORDER BY r.rolname), ARRAY['PUBLIC'])
                     FROM pg_roles r WHERE r.oid = ANY(p.polroles)),
           'using', pg_get_expr(p.polqual, p.polrelid),
           'check', pg_get_expr(p.polwithcheck, p.polrelid)
         ) ORDER BY p.polname) AS policies
  FROM pg_policy p GROUP BY p.polrelid
),
idx AS (
  SELECT i.indrelid AS oid,
         json_agg(json_build_object(
           'name', ic.relname,
           'def',  pg_get_indexdef(i.indexrelid),
           'unique', i.indisunique
         ) ORDER BY ic.relname) AS indexes
  FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
  GROUP BY i.indrelid
),
grants AS (
  SELECT c.oid,
         json_agg(DISTINCT jsonb_build_object('grantee', g.grantee, 'priv', g.privilege_type)) AS grants
  FROM app_tables c
  JOIN information_schema.role_table_grants g
    ON g.table_schema = c.schema_name AND g.table_name = c.table_name
  WHERE g.grantee IN ('anon','authenticated','service_role','PUBLIC')
  GROUP BY c.oid
)
SELECT json_agg(json_build_object(
  'schema',      t.schema_name,
  'table',       t.table_name,
  'rls_enabled', t.rls_enabled,
  'rls_forced',  t.rls_forced,
  'columns',     COALESCE(cols.columns, '[]'::json),
  'constraints', COALESCE(cons.constraints, '[]'::json),
  'policies',    COALESCE(pols.policies, '[]'::json),
  'indexes',     COALESCE(idx.indexes, '[]'::json),
  'grants',      COALESCE(grants.grants, '[]'::json)
) ORDER BY t.schema_name, t.table_name)
FROM app_tables t
LEFT JOIN cols   ON cols.oid   = t.oid
LEFT JOIN cons   ON cons.oid   = t.oid
LEFT JOIN pols   ON pols.oid   = t.oid
LEFT JOIN idx    ON idx.oid    = t.oid
LEFT JOIN grants ON grants.oid = t.oid;
