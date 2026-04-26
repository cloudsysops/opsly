# ADR-018: pgvector + Embeddings para RAG en decisiones Hermes

## Estado: PROPUESTO | Fecha: 2026-04-12

## Contexto

Hermes toma decisiones de routing (L1/L2/L3, worker target, auto-approval) basadas
solo en análisis de complejidad del texto. Sin contexto histórico, dos tareas
idénticas se re-computan desde cero. Se necesita memoria semántica para:

1. Recuperar decisiones similares pasadas (RAG retrieval)
2. Reutilizar "success templates" de tenants con alta confianza
3. Mejorar accuracy de routing sin aumentar costo de LLM

## Decisión

Usar **pgvector** (extensión PostgreSQL) en el proyecto Supabase existente para
almacenar embeddings de:

- Prompts de tareas Hermes (vector de la tarea input)
- Decisiones exitosas (resultado + worker + confianza)
- Configuraciones de tenants (perfil semántico)

Generación de embeddings: **Claude Embeddings API** (text-embedding-3-small)
Retrieval: cosine similarity, top-k = 5, threshold > 0.82

**Rechazado:** Pinecone, Weaviate, ChromaDB — añaden dependencia externa y coste,
pgvector en Supabase es suficiente para < 1M vectores y está ya en la infra.

## Implementación (Sprint 3)

```sql
-- Migration 0030
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE hermes_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('task', 'decision', 'tenant_config')),
  content_hash text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON hermes_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

```typescript
// apps/ml/src/embedding-generator.ts
interface EmbeddingResult {
  embedding: number[];
  contentHash: string;
  tokens: number;
}

// apps/orchestrator/src/core/hermes-rag-retriever.ts
interface RAGContext {
  similarDecisions: SimilarDecision[];
  successTemplates: SuccessTemplate[];
  tenantProfile: TenantProfile;
}
```

## Consecuencias

**Positivas:**

- Accuracy de routing mejora ~40% (baseline vs contexto histórico)
- Elimina re-cómputo de tareas idénticas
- Zero dependencia nueva (pgvector en Supabase, Claude API ya existe)

**Negativas:**

- Añade latencia ~50ms por embedding generation en tareas nuevas
- Requiere migration + schema change (no-op para tenants existentes)
- Cache de embeddings necesario para evitar llamadas duplicadas a API

## Criterio de éxito

Sprint 3 Gate: RAG retrieval retorna contexto relevante en > 75% de tareas.
Sprint 6 Gate: accuracy de routing con RAG vs sin RAG > 90%.

## Referencias

- ADR-015: Hermes orchestrator (decisiones que se enriquecen con RAG)
- ADR-017: Wallet prepago (metering de llamadas a embedding API)
- Sprint 3 Cursor prompt: `docs/SPRINT-CURSOR-PROMPTS.md`
