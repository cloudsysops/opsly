import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQueryNotebook = vi.fn();
const mockListDocuments = vi.fn();

vi.mock('../../lib/notebooklm-client.js', () => ({
  NotebookLMClient: vi.fn(() => ({
    isAvailable: vi.fn(() => true),
    queryNotebook: mockQueryNotebook,
    listDocuments: mockListDocuments,
  })),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => '# AGENTS.md\nmock agents content'),
}));

import { ContextEnricher, enrichTaskLocalOnly } from '../ContextEnricher.js';
import type { HermesTask } from '@intcloudsysops/types';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('ContextEnricher — plan limiting', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let enricher: ContextEnricher;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      schema: vi.fn(function () {
        return {
          from: vi.fn(function () {
            return {
              select: vi.fn(function () {
                return {
                  eq: vi.fn(function () {
                    return {
                      is: vi.fn(function () {
                        return {
                          maybeSingle: vi.fn(),
                        };
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        };
      }),
    } as any;

    enricher = new ContextEnricher(
      {
        isAvailable: () => true,
        queryNotebook: mockQueryNotebook,
        listDocuments: mockListDocuments,
      } as any,
      mockSupabase as SupabaseClient
    );

    mockQueryNotebook.mockResolvedValue({
      answer: 'Sigue los patrones de BullMQ y DecisionEngine.',
      sources: ['AGENTS.md'],
      confidence: 0.8,
      cached: false,
    });
  });

  it('permite NotebookLM para plan business', async () => {
    // Mock plan query response
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { plan: 'business' } });
    (mockSupabase.schema as any).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: maybeSingleFn,
            })),
          })),
        })),
      })),
    });

    const task: HermesTask = {
      id: 'task-1',
      name: 'Test task',
      type: 'feature',
      state: 'PENDING',
      tenant_id: 'tenant-uuid-123',
      effort: 'M',
    };

    const enriched = await enricher.enrichTaskContext(task);

    expect(enriched?.notebooklm?.answer).toContain('patrones');
    expect(enriched?.notebooklm?.sources).not.toContain('plan-restricted');
    expect(mockQueryNotebook).toHaveBeenCalled();
  });

  it('permite NotebookLM para plan enterprise', async () => {
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { plan: 'enterprise' } });
    (mockSupabase.schema as any).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: maybeSingleFn,
            })),
          })),
        })),
      })),
    });

    const task: HermesTask = {
      id: 'task-1',
      name: 'Test task',
      type: 'feature',
      state: 'PENDING',
      tenant_id: 'tenant-uuid-123',
      effort: 'M',
    };

    const enriched = await enricher.enrichTaskContext(task);

    expect(enriched?.notebooklm?.answer).toContain('patrones');
    expect(enriched?.notebooklm?.sources).not.toContain('plan-restricted');
    expect(mockQueryNotebook).toHaveBeenCalled();
  });

  it('bloquea NotebookLM para plan startup', async () => {
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { plan: 'startup' } });
    (mockSupabase.schema as any).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: maybeSingleFn,
            })),
          })),
        })),
      })),
    });

    const task: HermesTask = {
      id: 'task-1',
      name: 'Test task',
      type: 'feature',
      state: 'PENDING',
      tenant_id: 'tenant-uuid-123',
      effort: 'M',
    };

    const enriched = await enricher.enrichTaskContext(task);

    expect(enriched?.notebooklm?.sources).toContain('plan-restricted');
    expect(enriched?.notebooklm?.answer).toContain('startup');
    expect(mockQueryNotebook).not.toHaveBeenCalled();
  });

  it('fallback a startup si tenant_id no puede resolverse', async () => {
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: 'Not found' });
    (mockSupabase.schema as any).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: maybeSingleFn,
            })),
          })),
        })),
      })),
    });

    const task: HermesTask = {
      id: 'task-1',
      name: 'Test task',
      type: 'feature',
      state: 'PENDING',
      tenant_id: 'invalid-tenant-id',
      effort: 'M',
    };

    const enriched = await enricher.enrichTaskContext(task);

    // Fallback a startup = bloquea NotebookLM
    expect(enriched?.notebooklm?.sources).toContain('plan-restricted');
    expect(mockQueryNotebook).not.toHaveBeenCalled();
  });

  it('enrichTaskLocalOnly no usa NotebookLM sin cliente', async () => {
    const task: HermesTask = {
      id: 'task-1',
      name: 'Test task',
      type: 'feature',
      state: 'PENDING',
      tenant_id: 'tenant-uuid-123',
      effort: 'M',
    };

    const enriched = await enrichTaskLocalOnly(task);

    expect(enriched?.notebooklm?.answer).toBe('');
    expect(enriched?.notebooklm?.confidence).toBe(0);
    expect(mockQueryNotebook).not.toHaveBeenCalled();
  });
});
