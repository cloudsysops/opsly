import type { ModelTokenCost, TokenBreakdown, PricingData } from '../types.js';

/**
 * Token cost calculator — compute per-model token expenses
 * Supports Anthropic (Claude), OpenAI (GPT), and estimation-based models
 */

const DEFAULT_PRICING: Record<string, ModelTokenCost> = {
  'claude-opus-4': {
    input: 15.0 / 1_000_000,
    output: 75.0 / 1_000_000,
    contextWindow: 200_000,
  },
  'claude-sonnet-4': {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
    contextWindow: 200_000,
  },
  'claude-haiku-3': {
    input: 0.8 / 1_000_000,
    output: 4.0 / 1_000_000,
    contextWindow: 200_000,
  },
  'gpt-4-turbo': {
    input: 10.0 / 1_000,
    output: 30.0 / 1_000,
    contextWindow: 128_000,
  },
  'gpt-4': {
    input: 30.0 / 1_000,
    output: 60.0 / 1_000,
    contextWindow: 8_192,
  },
  'gpt-3.5-turbo': {
    input: 0.5 / 1_000,
    output: 1.5 / 1_000,
    contextWindow: 4_096,
  },
};

/**
 * Calculate total token cost for a model
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricingData?: PricingData,
): number {
  const pricing =
    pricingData?.[model] || DEFAULT_PRICING[model] || estimateTokenCost(model);

  if (!pricing) {
    console.warn(`Unknown model ${model}, using default estimation`);
    return estimateTokenCost(model)
      ? (inputTokens + outputTokens) * 0.0000015
      : 0;
  }

  return inputTokens * pricing.input + outputTokens * pricing.output;
}

/**
 * Estimate pricing for unknown models (fallback)
 */
function estimateTokenCost(model: string): ModelTokenCost | null {
  if (model.includes('gpt')) {
    return {
      input: 10.0 / 1_000,
      output: 30.0 / 1_000,
      contextWindow: 4_096,
    };
  }
  if (model.includes('claude')) {
    return {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      contextWindow: 200_000,
    };
  }
  return null;
}

/**
 * Aggregate token costs by model from a token stream
 */
export function aggregateTokensByModel(
  tokenStream: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    timestamp: Date;
  }>,
  pricingData?: PricingData,
): TokenBreakdown {
  const breakdown: TokenBreakdown = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    costByModel: {},
  };

  tokenStream.forEach(({ model, inputTokens, outputTokens }) => {
    breakdown.totalInputTokens += inputTokens;
    breakdown.totalOutputTokens += outputTokens;

    const cost = calculateTokenCost(
      model,
      inputTokens,
      outputTokens,
      pricingData,
    );
    breakdown.totalCost += cost;

    if (!breakdown.costByModel[model]) {
      breakdown.costByModel[model] = {
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      };
    }

    breakdown.costByModel[model].inputTokens += inputTokens;
    breakdown.costByModel[model].outputTokens += outputTokens;
    breakdown.costByModel[model].cost += cost;
  });

  return breakdown;
}

/**
 * Project daily token costs forward (simple exponential growth model)
 */
export function projectTokenCost(
  currentDailyCost: number,
  days: number,
  growthRatePerMonth: number = 0.075,
): number {
  // Convert monthly growth rate to daily
  const dailyGrowthRate = Math.pow(1 + growthRatePerMonth, 1 / 30) - 1;
  return currentDailyCost * Math.pow(1 + dailyGrowthRate, days);
}

/**
 * Benchmark token consumption per tenant (conservative estimate)
 */
export function benchmarkTokensPerTenant(
  tenantCount: number,
  agentFrequency: 'low' | 'medium' | 'high' = 'medium',
): number {
  const baseTokensPerTenant = 5_000;
  const frequencyMultiplier = {
    low: 0.5,
    medium: 1.0,
    high: 2.5,
  }[agentFrequency];

  return tenantCount * baseTokensPerTenant * frequencyMultiplier;
}

/**
 * Compare pricing between two models for the same workload
 */
export function compareCost(
  model1: string,
  model2: string,
  inputTokens: number,
  outputTokens: number,
  pricingData?: PricingData,
): {
  model1Cost: number;
  model2Cost: number;
  savingsPct: number;
  recommendation: string;
} {
  const cost1 = calculateTokenCost(model1, inputTokens, outputTokens, pricingData);
  const cost2 = calculateTokenCost(model2, inputTokens, outputTokens, pricingData);

  const savingsPct = ((cost1 - cost2) / cost1) * 100;

  let recommendation = '';
  if (savingsPct > 50) {
    recommendation = `${model2} saves >50% — strong recommendation`;
  } else if (savingsPct > 20) {
    recommendation = `${model2} saves ~${savingsPct.toFixed(0)}% — moderate savings`;
  } else if (savingsPct > 0) {
    recommendation = `${model2} saves ~${savingsPct.toFixed(0)}% — minimal improvement`;
  } else {
    recommendation = `${model1} is more cost-effective`;
  }

  return {
    model1Cost: cost1,
    model2Cost: cost2,
    savingsPct: Math.max(0, savingsPct),
    recommendation,
  };
}
