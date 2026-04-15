import { z } from "zod";

/** ADR resumido para inyección en prompts (OpenClaw / orchestrator). */
export const ContextPackAdrSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  summary: z.string(),
});

export type ContextPackAdr = z.infer<typeof ContextPackAdrSchema>;

/** Fragmento recuperado (embeddings / RAG); opcional si aún no hay índice vectorial. */
export const ContextPackEmbeddingRefSchema = z.object({
  source: z.string(),
  content_snippet: z.string(),
  similarity: z.number(),
});

export type ContextPackEmbeddingRef = z.infer<typeof ContextPackEmbeddingRefSchema>;

/**
 * Paquete de contexto Opsly para sesiones OpenClaw (system prompt + anexos).
 * Validar con ContextPackSchema antes de servir por HTTP.
 */
export const ContextPackSchema = z.object({
  tenant_id: z.string().uuid(),
  tenant_slug: z.string(),
  generated_at: z.string(),
  warnings: z.array(z.string()).optional(),

  identity: z.object({
    name: z.string(),
    plan: z.string().optional(),
    domain: z.string().optional(),
    tech_stack: z.record(z.string()).optional(),
    coding_standards: z.string().optional(),
    business_domain: z.string().optional(),
    /** Namespace lógico para filtrar embeddings (pgvector); ver ADR-026. */
    vector_namespace: z.string().optional(),
  }),

  knowledge: z.object({
    vision: z.string().optional(),
    agents_manifest: z.string().optional(),
    adrs: z.array(ContextPackAdrSchema).optional(),
  }),

  state: z.object({
    knowledge_index_generated_at: z.string().optional(),
    knowledge_index_stale: z.boolean().optional(),
    last_commit: z.string().optional(),
    active_branch: z.string().optional(),
    recent_errors: z.array(z.string()).optional(),
    relevant_embeddings: z.array(ContextPackEmbeddingRefSchema).optional(),
  }),

  system_instructions: z.string().optional(),
});

export type ContextPack = z.infer<typeof ContextPackSchema>;
