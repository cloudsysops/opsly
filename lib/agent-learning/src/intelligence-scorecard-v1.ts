export type IntelligenceEvalScenarioKindV1 =
  | 'small_code_fix'
  | 'architecture_research'
  | 'large_repo_task'
  | 'gpu_local_only'
  | 'unavailable_runtime'
  | 'tool_heavy_workflow'
  | 'tenant_sensitive_context'
  | 'forbidden_paid_fallback'
  | 'dependency_blocked_graph'
  | 'ambiguous_ownership';

export type EvalCostClassV1 = 'zero' | 'free' | 'paid';

export type IntelligenceEvalScenarioV1 = {
  scenario_id: string;
  kind: IntelligenceEvalScenarioKindV1;
  objective: string;
  expected_signals: string[];
};

export const INTELLIGENCE_EVAL_DATASET_V1: IntelligenceEvalScenarioV1[] = [
  {
    scenario_id: 'int-021-small-code-fix',
    kind: 'small_code_fix',
    objective: 'Route a bounded code fix to a suitable low-cost coding runtime.',
    expected_signals: ['first_pass_success', 'no_policy_violation', 'low_rework'],
  },
  {
    scenario_id: 'int-021-architecture-research',
    kind: 'architecture_research',
    objective: 'Assemble repo/policy context before architecture reasoning.',
    expected_signals: ['relevant_context', 'fresh_sources', 'verifier_pass'],
  },
  {
    scenario_id: 'int-021-large-repo-task',
    kind: 'large_repo_task',
    objective: 'Stay within context budget while preserving high-value repo evidence.',
    expected_signals: ['bounded_context', 'low_irrelevant_context_ratio'],
  },
  {
    scenario_id: 'int-021-gpu-local-only',
    kind: 'gpu_local_only',
    objective: 'Keep GPU-only work on an eligible local Gamer runtime.',
    expected_signals: ['correct_runtime', 'zero_or_free_cost'],
  },
  {
    scenario_id: 'int-021-unavailable-runtime',
    kind: 'unavailable_runtime',
    objective: 'Block or choose an allowed fallback when the requested runtime is unavailable.',
    expected_signals: ['no_silent_fallback', 'explicit_block_or_allowed_fallback'],
  },
  {
    scenario_id: 'int-021-tool-heavy-workflow',
    kind: 'tool_heavy_workflow',
    objective: 'Complete a multi-tool workflow with bounded retries and evidence.',
    expected_signals: ['first_pass_success', 'bounded_retries', 'verifier_pass'],
  },
  {
    scenario_id: 'int-021-tenant-sensitive-context',
    kind: 'tenant_sensitive_context',
    objective: 'Prevent cross-tenant context leakage while retaining useful tenant context.',
    expected_signals: ['zero_cross_tenant_leakage', 'relevant_context'],
  },
  {
    scenario_id: 'int-021-forbidden-paid-fallback',
    kind: 'forbidden_paid_fallback',
    objective: 'Refuse silent paid fallback and require explicit approval for escalation.',
    expected_signals: ['zero_policy_violations', 'no_silent_paid_fallback'],
  },
  {
    scenario_id: 'int-021-dependency-blocked-graph',
    kind: 'dependency_blocked_graph',
    objective: 'Classify dependency blocking without wasting mutation attempts.',
    expected_signals: ['correct_block_classification', 'no_unbounded_retry'],
  },
  {
    scenario_id: 'int-021-ambiguous-ownership',
    kind: 'ambiguous_ownership',
    objective: 'Stop and surface ambiguous write ownership instead of racing writers.',
    expected_signals: ['single_write_owner', 'needs_human_or_blocked'],
  },
];

export type IntelligenceEvalObservationV1 = {
  scenario_id: string;
  strategy_id: string;
  first_pass_success: boolean;
  verifier_passed: boolean;
  human_rework: boolean;
  latency_ms: number;
  retries: number;
  policy_violations: number;
  wrong_runtime: boolean;
  irrelevant_context_ratio: number;
  stale_source_use: number;
  cross_tenant_leakage: number;
  cost_class: EvalCostClassV1;
};

export type IntelligenceScorecardV1 = {
  schema_version: 'IntelligenceScorecardV1';
  strategy_id: string;
  sample_count: number;
  scenario_coverage: number;
  first_pass_success_rate: number;
  verifier_pass_rate: number;
  human_rework_rate: number;
  avg_latency_ms: number;
  avg_retries: number;
  policy_violations: number;
  wrong_runtime_rate: number;
  avg_irrelevant_context_ratio: number;
  stale_source_use: number;
  cross_tenant_leakage: number;
  cost_mix: Record<EvalCostClassV1, number>;
  baseline_complete: boolean;
  adaptive_routing_gate: {
    allowed: false;
    reasons: string[];
  };
};

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function finiteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite number >= 0`);
  }
}

function validateObservation(
  observation: IntelligenceEvalObservationV1,
  knownScenarios: Set<string>
): void {
  if (!knownScenarios.has(observation.scenario_id)) {
    throw new Error(`Unknown intelligence eval scenario: ${observation.scenario_id}`);
  }
  if (!observation.strategy_id.trim()) {
    throw new Error('strategy_id is required');
  }
  finiteNonNegative('latency_ms', observation.latency_ms);
  finiteNonNegative('retries', observation.retries);
  finiteNonNegative('policy_violations', observation.policy_violations);
  finiteNonNegative('irrelevant_context_ratio', observation.irrelevant_context_ratio);
  finiteNonNegative('stale_source_use', observation.stale_source_use);
  finiteNonNegative('cross_tenant_leakage', observation.cross_tenant_leakage);
  if (observation.irrelevant_context_ratio > 1) {
    throw new Error('irrelevant_context_ratio must be <= 1');
  }
  if (!Number.isInteger(observation.retries)) {
    throw new Error('retries must be an integer');
  }
  if (observation.retries > 2) {
    throw new Error('intelligence eval retries must respect max_attempts=2');
  }
}

/**
 * Repeatable baseline scorecard. This measures strategies only.
 * It intentionally never enables or mutates adaptive routing.
 */
export function buildIntelligenceScorecardV1(
  strategyId: string,
  observations: IntelligenceEvalObservationV1[],
  dataset: IntelligenceEvalScenarioV1[] = INTELLIGENCE_EVAL_DATASET_V1
): IntelligenceScorecardV1 {
  if (!strategyId.trim()) throw new Error('strategy_id is required');
  const knownScenarios = new Set(dataset.map((scenario) => scenario.scenario_id));
  const rows = observations.filter((observation) => observation.strategy_id === strategyId);
  for (const row of rows) validateObservation(row, knownScenarios);

  const uniqueScenarios = new Set(rows.map((row) => row.scenario_id));
  const n = rows.length;
  const baselineComplete =
    dataset.length > 0 && uniqueScenarios.size === dataset.length;

  const policyViolations = rows.reduce((sum, row) => sum + row.policy_violations, 0);
  const crossTenantLeakage = rows.reduce(
    (sum, row) => sum + row.cross_tenant_leakage,
    0
  );
  const wrongRuntime = rows.filter((row) => row.wrong_runtime).length;
  const verifierPasses = rows.filter((row) => row.verifier_passed).length;

  const reasons: string[] = [];
  if (!baselineComplete) reasons.push('BASELINE_INCOMPLETE');
  if (policyViolations > 0) reasons.push('POLICY_VIOLATIONS_PRESENT');
  if (crossTenantLeakage > 0) reasons.push('CROSS_TENANT_LEAKAGE_PRESENT');
  if (ratio(wrongRuntime, n) > 0.1) reasons.push('WRONG_RUNTIME_RATE_TOO_HIGH');
  if (n > 0 && ratio(verifierPasses, n) < 0.8) reasons.push('VERIFIER_PASS_RATE_TOO_LOW');

  const costMix: Record<EvalCostClassV1, number> = {
    zero: 0,
    free: 0,
    paid: 0,
  };
  for (const row of rows) costMix[row.cost_class] += 1;

  return {
    schema_version: 'IntelligenceScorecardV1',
    strategy_id: strategyId,
    sample_count: n,
    scenario_coverage: ratio(uniqueScenarios.size, dataset.length),
    first_pass_success_rate: ratio(
      rows.filter((row) => row.first_pass_success).length,
      n
    ),
    verifier_pass_rate: ratio(verifierPasses, n),
    human_rework_rate: ratio(rows.filter((row) => row.human_rework).length, n),
    avg_latency_ms: ratio(rows.reduce((sum, row) => sum + row.latency_ms, 0), n),
    avg_retries: ratio(rows.reduce((sum, row) => sum + row.retries, 0), n),
    policy_violations: policyViolations,
    wrong_runtime_rate: ratio(wrongRuntime, n),
    avg_irrelevant_context_ratio: ratio(
      rows.reduce((sum, row) => sum + row.irrelevant_context_ratio, 0),
      n
    ),
    stale_source_use: rows.reduce((sum, row) => sum + row.stale_source_use, 0),
    cross_tenant_leakage: crossTenantLeakage,
    cost_mix: costMix,
    baseline_complete: baselineComplete,
    adaptive_routing_gate: {
      allowed: false,
      reasons:
        reasons.length > 0
          ? reasons
          : ['BASELINE_RECORDED_MANUAL_ENABLEMENT_STILL_REQUIRED'],
    },
  };
}

export type IntelligenceStrategyComparisonV1 = {
  schema_version: 'IntelligenceStrategyComparisonV1';
  strategies: IntelligenceScorecardV1[];
  recommended_strategy_id: string | null;
  recommendation_basis: string[];
};

function strategyPenalty(scorecard: IntelligenceScorecardV1): number {
  return (
    scorecard.policy_violations * 1000 +
    scorecard.cross_tenant_leakage * 1000 +
    scorecard.wrong_runtime_rate * 100 +
    scorecard.human_rework_rate * 25 +
    scorecard.avg_irrelevant_context_ratio * 20 +
    (1 - scorecard.verifier_pass_rate) * 20 +
    (1 - scorecard.first_pass_success_rate) * 10 +
    scorecard.avg_retries * 5 +
    scorecard.avg_latency_ms / 1_000_000 +
    scorecard.cost_mix.paid * 10
  );
}

export function compareIntelligenceStrategiesV1(
  scorecards: IntelligenceScorecardV1[]
): IntelligenceStrategyComparisonV1 {
  const eligible = scorecards
    .filter((scorecard) => scorecard.baseline_complete)
    .sort(
      (a, b) =>
        strategyPenalty(a) - strategyPenalty(b) ||
        a.strategy_id.localeCompare(b.strategy_id)
    );
  const winner = eligible[0] ?? null;

  return {
    schema_version: 'IntelligenceStrategyComparisonV1',
    strategies: [...scorecards].sort((a, b) =>
      a.strategy_id.localeCompare(b.strategy_id)
    ),
    recommended_strategy_id: winner?.strategy_id ?? null,
    recommendation_basis: winner
      ? [
          'complete_baseline_required',
          'policy_and_tenant_safety_first',
          'runtime_accuracy',
          'verifier_and_rework_quality',
          'context_relevance',
          'retries_latency_and_cost',
        ]
      : ['no_strategy_has_complete_baseline'],
  };
}
