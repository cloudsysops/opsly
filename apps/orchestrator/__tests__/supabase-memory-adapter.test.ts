import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Redis from 'ioredis';

import { SupabaseMemoryAdapter } from '../src/runtime/adapters/supabase-memory-adapter.js';

function redisStub(hgetall: ReturnType<typeof vi.fn>): Redis {
  return { hgetall } as unknown as Redis;
}

const embedding1536 = (): number[] =>
  Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));

describe('SupabaseMemoryAdapter', () => {
  beforeEach(() => {
    vi.stubEnv('LLM_GATEWAY_URL', 'http://gateway.test');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('getWorkingContext devuelve objeto vacío si Redis no tiene hash', async () => {
    const hgetall = vi.fn().mockResolvedValue({});
    const adapter = new SupabaseMemoryAdapter(redisStub(hgetall), {} as SupabaseClient);
    await expect(adapter.getWorkingContext('acme', 'sess-1')).resolves.toEqual({});
    expect(hgetall).toHaveBeenCalledWith('opsly:oar:working:acme:sess-1');
  });

  it('getWorkingContext parsea campos JSON del hash', async () => {
    const hgetall = vi.fn().mockResolvedValue({
      n: '42',
      s: JSON.stringify('hola'),
    });
    const adapter = new SupabaseMemoryAdapter(redisStub(hgetall), {} as SupabaseClient);
    const ctx = await adapter.getWorkingContext('t', 's');
    expect(ctx).toEqual({ n: 42, s: 'hola' });
  });

  it('appendObservation inserta fila en platform.agent_episode_logs', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const sb = {
      schema: () => ({
        from: () => ({ insert }),
      }),
    } as unknown as SupabaseClient;
    const adapter = new SupabaseMemoryAdapter(redisStub(vi.fn()), sb);
    await adapter.appendObservation('acme', 's1', 2, 'obs text');
    expect(insert).toHaveBeenCalledWith({
      tenant_slug: 'acme',
      session_id: 's1',
      step_index: 2,
      content: 'obs text',
      metadata: {},
    });
  });

  it('querySemantic usa gateway /v1/embeddings y RPC match_tenant_embeddings', async () => {
    const emb = embedding1536();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [{ embedding: emb }] }),
      })) as unknown as typeof fetch
    );

    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'doc-1', content: 'hello', similarity: 0.91 }],
      error: null,
    });
    const sb = { rpc } as unknown as SupabaseClient;
    const adapter = new SupabaseMemoryAdapter(redisStub(vi.fn()), sb);
    const out = await adapter.querySemantic('acme', 'buscar algo', 3);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      source: 'doc-1',
      content: 'hello',
      relevanceScore: 0.91,
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://gateway.test/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(rpc).toHaveBeenCalledWith(
      'match_tenant_embeddings',
      expect.objectContaining({
        match_threshold: 0.72,
        match_count: 3,
        p_tenant_slug: 'acme',
      })
    );
    const call = rpc.mock.calls[0];
    const arg = call?.[1] as { query_embedding?: number[] };
    expect(arg?.query_embedding).toEqual(emb);
  });

  it('querySemantic devuelve [] si el gateway responde error HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      })) as unknown as typeof fetch
    );
    const adapter = new SupabaseMemoryAdapter(redisStub(vi.fn()), {} as SupabaseClient);
    await expect(adapter.querySemantic('acme', 'x')).resolves.toEqual([]);
  });
});
