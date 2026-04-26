/**
 * Unified Memory: Redis (working context) + Supabase (episodic logs + pgvector RAG).
 *
 * @see apps/orchestrator/src/runtime/interfaces/memory.interface.ts
 */

import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from 'ioredis';

import type { MemoryFragment, MemoryInterface } from '../interfaces/memory.interface.js';

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1536;

export interface SupabaseMemoryAdapterOptions {
  /** Umbral de similitud para `public.match_tenant_embeddings`. */
  matchThreshold?: number;
  /** Límite por defecto de fragmentos en `querySemantic`. */
  defaultSemanticLimit?: number;
  /** API key OpenAI; por defecto `process.env.OPENAI_API_KEY`. */
  openaiApiKey?: string;
}

type MatchTenantEmbeddingRow = {
  id: string;
  content: string;
  similarity: number;
};

/**
 * - `getWorkingContext`: Hash Redis `opsly:oar:working:{tenantSlug}:{sessionId}` (campos string; valores JSON cuando aplica).
 * - `appendObservation`: inserta en `platform.agent_episode_logs`.
 * - `querySemantic`: embeddings con AI SDK + RPC `match_tenant_embeddings` sobre `platform.tenant_embeddings`.
 */
export class SupabaseMemoryAdapter implements MemoryInterface {
  private readonly matchThreshold: number;
  private readonly defaultSemanticLimit: number;
  private readonly openaiApiKey: string | undefined;

  constructor(
    private readonly redis: Redis,
    private readonly supabase: SupabaseClient,
    options: SupabaseMemoryAdapterOptions = {}
  ) {
    this.matchThreshold = options.matchThreshold ?? 0.72;
    this.defaultSemanticLimit = options.defaultSemanticLimit ?? 5;
    this.openaiApiKey = options.openaiApiKey?.trim() ?? process.env.OPENAI_API_KEY?.trim();
  }

  private static workingContextKey(tenantSlug: string, sessionId: string): string {
    return `opsly:oar:working:${tenantSlug}:${sessionId}`;
  }

  async getWorkingContext(tenantSlug: string, sessionId: string): Promise<Record<string, unknown>> {
    const key = SupabaseMemoryAdapter.workingContextKey(tenantSlug, sessionId);
    const flat = await this.redis.hgetall(key);
    if (flat === null || Object.keys(flat).length === 0) {
      return {};
    }
    const out: Record<string, unknown> = {};
    for (const [field, raw] of Object.entries(flat)) {
      try {
        const parsed: unknown = JSON.parse(raw) as unknown;
        out[field] = parsed;
      } catch {
        out[field] = raw;
      }
    }
    return out;
  }

  async appendObservation(
    tenantSlug: string,
    sessionId: string,
    step: number,
    content: string
  ): Promise<void> {
    const { error } = await this.supabase.schema('platform').from('agent_episode_logs').insert({
      tenant_slug: tenantSlug,
      session_id: sessionId,
      step_index: step,
      content,
      metadata: {},
    });
    if (error) {
      throw new Error(`agent_episode_logs: ${error.message}`);
    }
  }

  async querySemantic(
    tenantSlug: string,
    query: string,
    limit?: number
  ): Promise<MemoryFragment[]> {
    const apiKey = this.openaiApiKey;
    if (!apiKey || query.trim().length === 0) {
      return [];
    }

    const openai = createOpenAI({ apiKey });
    const text = query.length > 8000 ? query.slice(0, 8000) : query;
    const { embedding } = await embed({
      model: openai.embedding(EMBED_MODEL),
      value: text,
    });

    if (!Array.isArray(embedding) || embedding.length !== EMBED_DIM) {
      return [];
    }

    const matchCount =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.min(50, Math.floor(limit))
        : this.defaultSemanticLimit;

    const { data, error } = await this.supabase.rpc('match_tenant_embeddings', {
      query_embedding: embedding,
      match_threshold: this.matchThreshold,
      match_count: matchCount,
      p_tenant_slug: tenantSlug,
    });

    if (error) {
      throw new Error(`match_tenant_embeddings: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map((row: MatchTenantEmbeddingRow) => ({
      source: String(row.id),
      content: row.content,
      relevanceScore: typeof row.similarity === 'number' ? row.similarity : 0,
    }));
  }
}

/**
 * Cliente Supabase service-role para el orchestrator (sin sesión de usuario).
 */
export function createSupabaseServiceClientFromEnv(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
