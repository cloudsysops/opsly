import { createClient } from '@supabase/supabase-js';
import { embedText } from './embeddings.js';
import { hashPrompt } from './hash.js';
import { platformSchema, supabaseRpc } from './supabase-helpers.js';
import type { LLMMessage } from './types.js';

function client() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}

export interface SemanticCacheHit {
  response: string;
  model_used: string | null;
  quality_score: number | null;
  similarity?: number;
}

export async function semanticCacheGetExact(
  tenant_slug: string,
  promptHash: string
): Promise<SemanticCacheHit | null> {
  const sb = client();
  if (!sb) {
    return null;
  }
  const { data, error } = await platformSchema(sb)
    .from('llm_cache')
    .select('response, model_used, quality_score')
    .eq('tenant_slug', tenant_slug)
    .eq('prompt_hash', promptHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as {
    response: string;
    model_used: string | null;
    quality_score: number | null;
  };

  return {
    response: row.response,
    model_used: row.model_used,
    quality_score: row.quality_score,
  };
}

export async function semanticCacheGetSimilar(
  tenant_slug: string,
  promptText: string,
  threshold = 0.88
): Promise<SemanticCacheHit | null> {
  const vec = await embedText(promptText);
  if (!vec) {
    return null;
  }
  const sb = client();
  if (!sb) {
    return null;
  }
  const { data, error } = await supabaseRpc<
    Array<{ id: string; response: string; similarity: number }>
  >(sb, 'match_cached_responses', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: 1,
    p_tenant_slug: tenant_slug,
  });
  if (error || !data?.length) {
    return null;
  }
  const row = data[0] as { id: string; response: string; similarity: number };
  return {
    response: row.response,
    model_used: null,
    quality_score: null,
    similarity: row.similarity,
  };
}

export async function semanticCacheSet(params: {
  tenant_slug: string;
  messages: LLMMessage[];
  system?: string;
  promptText: string;
  response: string;
  model_used: string;
  quality_score?: number;
}): Promise<void> {
  const sb = client();
  if (!sb) {
    return;
  }
  const promptHash = hashPrompt(params.messages, params.system);
  const emb = await embedText(params.promptText);

  await platformSchema(sb)
    .from('llm_cache')
    .upsert(
      {
        tenant_slug: params.tenant_slug,
        prompt_hash: promptHash,
        prompt_embedding: emb,
        prompt_text: params.promptText.slice(0, 32000),
        response: params.response.slice(0, 500000),
        model_used: params.model_used,
        quality_score: params.quality_score ?? null,
      },
      { onConflict: 'tenant_slug,prompt_hash' }
    );
}
