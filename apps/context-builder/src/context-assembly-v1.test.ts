import { describe, expect, it } from 'vitest';
import { assembleContextV1 } from './context-assembly-v1.js';

const NOW = '2026-09-13T15:00:00.000Z';

function source(
  source_id: string,
  source_class:
    | 'task'
    | 'hard_policy'
    | 'repo'
    | 'workstream_evidence'
    | 'durable_memory'
    | 'recent_conversation',
  content: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    source_id,
    source_class,
    title: source_id,
    content,
    estimated_tokens: Math.ceil(content.length / 4),
    tenant_slug: 'opsly-internal',
    retrieved_at: NOW,
    ...overrides,
  };
}

describe('ContextAssemblyV1', () => {
  it('orders task/policy/repo before memory and recent conversation', () => {
    const result = assembleContextV1({
      request_id: 'ctx-1',
      tenant_slug: 'opsly-internal',
      token_budget: 500,
      retrieval_performed: true,
      now: NOW,
      candidates: [
        source('conversation', 'recent_conversation', 'recent chat'),
        source('repo-arch', 'repo', 'architecture doc'),
        source('task', 'task', 'implement routing'),
        source('policy', 'hard_policy', 'no paid fallback'),
      ],
    });
    expect(result.sources.map((s) => s.source_id)).toEqual([
      'task',
      'policy',
      'repo-arch',
      'conversation',
    ]);
  });

  it('rejects cross-tenant durable memory', () => {
    const result = assembleContextV1({
      request_id: 'ctx-2',
      tenant_slug: 'tenant-a',
      token_budget: 100,
      retrieval_performed: true,
      now: NOW,
      candidates: [
        source('foreign', 'durable_memory', 'private memory', {
          tenant_slug: 'tenant-b',
          memory_tier: 'tenant',
        }),
      ],
    });
    expect(result.sources).toHaveLength(0);
    expect(result.excluded_sources).toContainEqual({
      source_id: 'foreign',
      reason: 'CROSS_TENANT',
    });
  });

  it('identifies stale sources without silently dropping them', () => {
    const result = assembleContextV1({
      request_id: 'ctx-3',
      tenant_slug: 'opsly-internal',
      token_budget: 100,
      retrieval_performed: true,
      now: NOW,
      candidates: [
        source('architecture', 'repo', 'canonical architecture', {
          source_updated_at: '2026-09-10T15:00:00.000Z',
          max_age_seconds: 3600,
        }),
      ],
    });
    expect(result.sources[0]?.stale).toBe(true);
  });

  it('enforces the token budget and marks truncation', () => {
    const result = assembleContextV1({
      request_id: 'ctx-4',
      tenant_slug: 'opsly-internal',
      token_budget: 10,
      retrieval_performed: true,
      now: NOW,
      candidates: [source('task', 'task', 'x'.repeat(200))],
    });
    expect(result.used_tokens).toBe(10);
    expect(result.sources[0]?.truncated).toBe(true);
    expect(result.context.length).toBeGreaterThan(0);
  });

  it('collapses duplicate sources', () => {
    const result = assembleContextV1({
      request_id: 'ctx-5',
      tenant_slug: 'opsly-internal',
      token_budget: 100,
      retrieval_performed: true,
      now: NOW,
      candidates: [
        source('doc-a', 'repo', 'same doc', { fingerprint: 'same' }),
        source('doc-b', 'repo', 'same doc', { fingerprint: 'same' }),
      ],
    });
    expect(result.sources).toHaveLength(1);
    expect(result.excluded_sources).toContainEqual({
      source_id: 'doc-b',
      reason: 'DUPLICATE',
    });
  });

  it('excludes secret and PII-bearing candidates', () => {
    const result = assembleContextV1({
      request_id: 'ctx-6',
      tenant_slug: 'opsly-internal',
      token_budget: 100,
      retrieval_performed: true,
      now: NOW,
      candidates: [
        source('secret', 'repo', 'secret value', { contains_secret: true }),
        source('pii', 'durable_memory', 'personal data', { contains_pii: true }),
      ],
    });
    expect(result.sources).toHaveLength(0);
    expect(result.excluded_sources.map((e) => e.reason)).toEqual(['SECRET', 'PII']);
  });

  it('requires retrieval before generation', () => {
    expect(() =>
      assembleContextV1({
        request_id: 'ctx-7',
        tenant_slug: 'opsly-internal',
        token_budget: 100,
        retrieval_performed: false,
        now: NOW,
        candidates: [],
      })
    ).toThrow(/retrieval_performed=true/i);
  });
});
