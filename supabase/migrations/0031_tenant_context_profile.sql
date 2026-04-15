-- Perfil técnico y namespace lógico para embeddings por tenant (ADR-026).
-- Prioridad: columnas dedicadas; metadata JSONB sigue siendo compat hacia atrás.

ALTER TABLE platform.tenants
ADD COLUMN IF NOT EXISTS tech_stack jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS coding_standards text,
ADD COLUMN IF NOT EXISTS vector_namespace text;

COMMENT ON COLUMN platform.tenants.tech_stack IS 'Stack tecnológico del tenant inyectado al agente (JSONB).';
COMMENT ON COLUMN platform.tenants.coding_standards IS 'Reglas de estilo y arquitectura específicas del tenant.';
COMMENT ON COLUMN platform.tenants.vector_namespace IS 'Namespace lógico para aislar / filtrar embeddings en pgvector por tenant.';

CREATE INDEX IF NOT EXISTS idx_tenants_vector_namespace ON platform.tenants (vector_namespace)
WHERE
  vector_namespace IS NOT NULL;
