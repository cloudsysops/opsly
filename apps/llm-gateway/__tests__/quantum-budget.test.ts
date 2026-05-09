import { describe, expect, it } from 'vitest';

import { estimateQuantumEnsembleUsd } from '../src/quantum/budget.js';

describe('estimateQuantumEnsembleUsd', () => {
  it('returns positive total and per-provider breakdown', () => {
    const out = estimateQuantumEnsembleUsd(['claude_haiku', 'gpt4o_mini'], 400);
    expect(out.total_usd).toBeGreaterThan(0);
    expect(out.per_provider_usd.claude_haiku).toBeGreaterThan(0);
    expect(out.per_provider_usd.gpt4o_mini).toBeGreaterThan(0);
    expect(out.per_provider_usd.__synthesis__).toBeGreaterThan(0);
  });
});
