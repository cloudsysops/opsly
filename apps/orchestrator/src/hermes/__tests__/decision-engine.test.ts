import { describe, expect, it } from 'vitest';

import { DecisionEngine } from '../DecisionEngine.js';
import type { HermesTask } from '@intcloudsysops/types';

function task(type: HermesTask['type']): HermesTask {
  return {
    id: `task-${type}`,
    name: `Task ${type}`,
    type,
    state: 'PENDING',
    effort: 'M',
  };
}

describe('DecisionEngine — content-review routing', () => {
  const engine = new DecisionEngine();

  it('enruta content-review al worker ollama (local) en la cola openclaw', () => {
    const decision = engine.route(task('content-review'));
    expect(decision.agentType).toBe('ollama');
    expect(decision.queueName).toBe('openclaw');
    expect(decision.priority).toBe(0);
  });

  it('no depende de HERMES_LOCAL_LLM_FIRST para content-review (siempre local if available)', () => {
    const previous = process.env.HERMES_LOCAL_LLM_FIRST;
    delete process.env.HERMES_LOCAL_LLM_FIRST;
    try {
      const decision = engine.route(task('content-review'));
      expect(decision.agentType).toBe('ollama');
    } finally {
      if (previous !== undefined) process.env.HERMES_LOCAL_LLM_FIRST = previous;
    }
  });

  it('mantiene el routing existente de feature → cursor', () => {
    const decision = engine.route(task('feature'));
    expect(decision.agentType).toBe('cursor');
    expect(decision.queueName).toBe('openclaw');
  });
});