import { describe, expect, it } from 'vitest';
import {
  aggregateLlmCostsByFeature,
  aggregateLlmCostsByModel,
  parsePeriodToUtcRange,
} from '../admin-llm-cost-analytics';

describe('parsePeriodToUtcRange', () => {
  it('parses YYYY-MM to UTC month bounds', () => {
    const r = parsePeriodToUtcRange('2026-03');
    expect(r).not.toBeNull();
    expect(r?.start.startsWith('2026-03-01')).toBe(true);
    expect(r?.end.startsWith('2026-04-01')).toBe(true);
  });

  it('returns null for invalid period', () => {
    expect(parsePeriodToUtcRange('2026-13')).toBeNull();
    expect(parsePeriodToUtcRange('bad')).toBeNull();
  });
});

describe('aggregateLlmCostsByModel', () => {
  it('groups by model and computes pct_of_cost', () => {
    const rows = [
      { model: 'a', cost_usd: 1, tokens_input: 1, tokens_output: 1, feature: null },
      { model: 'a', cost_usd: 1, tokens_input: 1, tokens_output: 1, feature: null },
      { model: 'b', cost_usd: 2, tokens_input: 0, tokens_output: 0, feature: 'x' },
    ];
    const agg = aggregateLlmCostsByModel(rows);
    expect(agg).toHaveLength(2);
    const a = agg.find((x) => x.model === 'a');
    expect(a?.requests).toBe(2);
    expect(a?.cost_usd).toBe(2);
    expect(a?.pct_of_cost).toBe(50);
    const b = agg.find((x) => x.model === 'b');
    expect(b?.cost_usd).toBe(2);
    expect(b?.pct_of_cost).toBe(50);
  });
});

describe('aggregateLlmCostsByFeature', () => {
  it('uses unknown when feature is null', () => {
    const rows = [
      { model: 'm', cost_usd: 1, tokens_input: 0, tokens_output: 0, feature: null },
      { model: 'm', cost_usd: 1, tokens_input: 0, tokens_output: 0, feature: 'legal' },
    ];
    const agg = aggregateLlmCostsByFeature(rows);
    expect(agg.find((x) => x.feature === 'unknown')?.cost_usd).toBe(1);
    expect(agg.find((x) => x.feature === 'legal')?.cost_usd).toBe(1);
  });
});
