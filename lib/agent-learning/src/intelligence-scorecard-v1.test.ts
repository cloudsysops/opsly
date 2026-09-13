import { describe, expect, it } from 'vitest';
import {
  INTELLIGENCE_EVAL_DATASET_V1,
  buildIntelligenceScorecardV1,
  compareIntelligenceStrategiesV1,
} from './intelligence-scorecard-v1.js';

function complete(strategy: string, overrides: Record<string, unknown> = {}) {
  return INTELLIGENCE_EVAL_DATASET_V1.map((scenario, index) => ({
    scenario_id: scenario.scenario_id,
    strategy_id: strategy,
    first_pass_success: true,
    verifier_passed: true,
    human_rework: false,
    latency_ms: 100 + index,
    retries: 0,
    policy_violations: 0,
    wrong_runtime: false,
    irrelevant_context_ratio: 0.05,
    stale_source_use: 0,
    cross_tenant_leakage: 0,
    cost_class: 'zero' as const,
    ...overrides,
  }));
}

describe('IntelligenceScorecardV1', () => {
  it('defines the ten required INT-021 scenarios', () => {
    expect(INTELLIGENCE_EVAL_DATASET_V1).toHaveLength(10);
    expect(new Set(INTELLIGENCE_EVAL_DATASET_V1.map((x) => x.kind)).size).toBe(10);
  });

  it('records a complete baseline without enabling adaptive routing', () => {
    const scorecard = buildIntelligenceScorecardV1('local-first-v1', complete('local-first-v1'));
    expect(scorecard.baseline_complete).toBe(true);
    expect(scorecard.scenario_coverage).toBe(1);
    expect(scorecard.verifier_pass_rate).toBe(1);
    expect(scorecard.adaptive_routing_gate.allowed).toBe(false);
    expect(scorecard.adaptive_routing_gate.reasons).toContain(
      'BASELINE_RECORDED_MANUAL_ENABLEMENT_STILL_REQUIRED'
    );
  });

  it('surfaces safety failures prominently', () => {
    const rows = complete('unsafe-v1');
    rows[6]!.cross_tenant_leakage = 1;
    rows[7]!.policy_violations = 1;
    const scorecard = buildIntelligenceScorecardV1('unsafe-v1', rows);
    expect(scorecard.cross_tenant_leakage).toBe(1);
    expect(scorecard.policy_violations).toBe(1);
    expect(scorecard.adaptive_routing_gate.reasons).toContain(
      'CROSS_TENANT_LEAKAGE_PRESENT'
    );
    expect(scorecard.adaptive_routing_gate.reasons).toContain(
      'POLICY_VIOLATIONS_PRESENT'
    );
  });

  it('refuses more than two retries in an eval observation', () => {
    const rows = complete('retry-v1');
    rows[0]!.retries = 3;
    expect(() => buildIntelligenceScorecardV1('retry-v1', rows)).toThrow(
      /max_attempts=2/
    );
  });

  it('does not recommend an incomplete strategy over a complete one', () => {
    const completeScore = buildIntelligenceScorecardV1(
      'complete-v1',
      complete('complete-v1')
    );
    const partialScore = buildIntelligenceScorecardV1(
      'partial-v1',
      complete('partial-v1').slice(0, 2)
    );
    const comparison = compareIntelligenceStrategiesV1([
      partialScore,
      completeScore,
    ]);
    expect(comparison.recommended_strategy_id).toBe('complete-v1');
  });

  it('prefers zero-policy-violation strategy even when slower', () => {
    const safe = buildIntelligenceScorecardV1(
      'safe-v1',
      complete('safe-v1', { latency_ms: 500 })
    );
    const unsafeRows = complete('unsafe-fast-v1', { latency_ms: 10 });
    unsafeRows[0]!.policy_violations = 1;
    const unsafe = buildIntelligenceScorecardV1('unsafe-fast-v1', unsafeRows);
    const comparison = compareIntelligenceStrategiesV1([unsafe, safe]);
    expect(comparison.recommended_strategy_id).toBe('safe-v1');
  });
});
