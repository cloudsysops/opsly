import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HermesTask } from '@intcloudsysops/types';
import { DecisionEngine } from '../src/hermes/DecisionEngine.js';
import { NotebookLMClient } from '../src/lib/notebooklm-client.js';

const executeNotebookLM = vi.hoisted(() => vi.fn());

vi.mock('@intcloudsysops/notebooklm-agent', () => ({
  executeNotebookLM,
}));

function baseTask(over: Partial<HermesTask>): HermesTask {
  return {
    id: 't-nb',
    name: 'NB test',
    type: 'feature',
    state: 'PENDING',
    effort: 'unknown',
    ...over,
  };
}

describe('NotebookLMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOTEBOOKLM_ENABLED = 'true';
    process.env.NOTEBOOKLM_NOTEBOOK_ID = 'nb-test';
    process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG = 'platform';
  });

  afterEach(() => {
    delete process.env.NOTEBOOKLM_ENABLED;
    delete process.env.NOTEBOOKLM_NOTEBOOK_ID;
    delete process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG;
  });

  it('queryNotebook returns answer on success', async () => {
    executeNotebookLM.mockResolvedValueOnce({ success: true, answer: 'respuesta' });
    const c = new NotebookLMClient();
    const r = await c.queryNotebook('¿test?');
    expect(r.answer).toBe('respuesta');
    expect(r.cached).toBe(false);
    expect(executeNotebookLM).toHaveBeenCalled();
  });

  it('queryNotebook retries then returns empty', async () => {
    executeNotebookLM.mockResolvedValue({ success: false, error: 'fail' });
    const c = new NotebookLMClient();
    const r = await c.queryNotebook('x');
    expect(r.answer).toBe('');
    expect(executeNotebookLM.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('DecisionEngine + enrichment', () => {
  const engine = new DecisionEngine();

  it('routeWithContext adds enrichment_summary when NotebookLM answered', () => {
    const task = baseTask({ type: 'feature' });
    const enriched = {
      task,
      localContext: '',
      relatedTasks: [],
      suggestedApproach: '',
      patterns: [],
      notebooklm: {
        answer: 'Contexto largo '.repeat(20),
        sources: [],
        confidence: 0.9,
      },
    };
    const r = engine.routeWithContext(task, enriched);
    expect(r.enrichment_summary).toBeDefined();
    expect(r.enrichment_summary?.length).toBeLessThanOrEqual(240);
  });

  it('routeWithContext ignores empty NotebookLM answer', () => {
    const task = baseTask({ type: 'feature', effort: 'M' });
    const enriched = {
      task,
      localContext: '',
      relatedTasks: [],
      suggestedApproach: '',
      patterns: [],
      notebooklm: { answer: '', sources: [], confidence: 0 },
    };
    const r = engine.routeWithContext(task, enriched);
    expect(r.enrichment_summary).toBeUndefined();
    expect(r.secondary_agent).toBe('claude');
  });

  it('applies enrichment for decision when confidence high (base priority already 0)', () => {
    const task = baseTask({ type: 'decision' });
    const enriched = {
      task,
      localContext: '',
      relatedTasks: [],
      suggestedApproach: '',
      patterns: [],
      notebooklm: {
        answer: 'precedente',
        sources: [],
        confidence: 0.8,
      },
    };
    const r = engine.routeWithContext(task, enriched);
    expect(r.priority).toBe(0);
    expect(r.enrichment_summary).toContain('precedente');
  });
});
