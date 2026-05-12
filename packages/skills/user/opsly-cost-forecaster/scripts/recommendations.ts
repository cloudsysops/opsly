import type { ForecastResult, CostRecommendation, RecommendationContext } from '../types.js';
import { compareCost } from './token-counter.js';

/**
 * Generate cost-saving recommendations based on forecast vs. budget
 */

export function generateRecommendations(
  forecast: ForecastResult,
  budget: number,
  context: RecommendationContext
): CostRecommendation[] {
  const recommendations: CostRecommendation[] = [];

  const forecast30d = forecast.forecast_30d;
  const budgetHeadroom = budget - forecast30d;
  const percentageOfBudget = (forecast30d / budget) * 100;

  // Case 1: Over budget or approaching threshold
  if (percentageOfBudget >= 80) {
    recommendations.push(...generateOverBudgetRecommendations(forecast, budget, context));
  }

  // Case 2: Under budget
  if (percentageOfBudget < 80) {
    recommendations.push(...generateUnderBudgetRecommendations(budgetHeadroom, context));
  }

  // Always include operational optimization suggestions
  recommendations.push(...generateOperationalRecommendations(forecast, context));

  return recommendations;
}

/**
 * Generate recommendations when approaching or exceeding budget
 */
function generateOverBudgetRecommendations(
  forecast: ForecastResult,
  budget: number,
  context: RecommendationContext
): CostRecommendation[] {
  const recommendations: CostRecommendation[] = [];
  const overageAmount = forecast.forecast_30d - budget;

  // 1. Model downgrade recommendation
  if (context.currentModelMix?.['claude-opus-4']) {
    const opusTokens =
      (context.currentModelMix['claude-opus-4'] / 100) * forecast.breakdown.llm_tokens;
    const savings = compareCost(
      'claude-opus-4',
      'claude-sonnet-4',
      opusTokens * 0.8,
      opusTokens * 0.2,
      context.pricingData
    );

    if (savings.savingsPct > 20) {
      recommendations.push({
        action: `Switch 30% of Opus queries to Sonnet`,
        estimated_savings: Math.round(savings.savingsPct * 30),
        effort: 'low',
        confidence: 'high',
        timeframe_days: 3,
        implementation: 'Update LLM router rules, A/B test quality impact on subset of queries',
      });
    }
  }

  // 2. Caching recommendation
  if (context.cacheHitRate && context.cacheHitRate < 0.3) {
    const cachingSavings = forecast.breakdown.llm_tokens * 0.15; // 15% typical savings
    recommendations.push({
      action: `Enable semantic caching in LLM Gateway`,
      estimated_savings: Math.round(cachingSavings),
      effort: 'medium',
      confidence: 'high',
      timeframe_days: 5,
      implementation: 'Enable Cache-Control headers in LLM Gateway, configure TTL per model',
    });
  }

  // 3. Batching recommendation
  if (context.averageQuerySize && context.averageQuerySize < 2000) {
    const batchingSavings = forecast.breakdown.llm_tokens * 0.08; // 8% savings
    recommendations.push({
      action: `Implement request batching for small queries`,
      estimated_savings: Math.round(batchingSavings),
      effort: 'medium',
      confidence: 'medium',
      timeframe_days: 7,
      implementation: 'Queue small requests, batch 5-10 per inference, apply token discount',
    });
  }

  // 4. Tenant feature throttling
  if (context.tenantCount && context.tenantCount > 50) {
    recommendations.push({
      action: `Audit low-value tenants for feature downgrade`,
      estimated_savings: overageAmount * 0.2,
      effort: 'high',
      confidence: 'medium',
      timeframe_days: 14,
      implementation: 'Identify tenants with <10% feature usage, offer tiered plan downgrade',
    });
  }

  return recommendations;
}

/**
 * Generate recommendations when under budget (capacity planning)
 */
function generateUnderBudgetRecommendations(
  budgetHeadroom: number,
  context: RecommendationContext
): CostRecommendation[] {
  const recommendations: CostRecommendation[] = [];

  if (budgetHeadroom > 500) {
    recommendations.push({
      action: `Headroom of $${Math.round(budgetHeadroom)} — can safely add new agents or tenants`,
      estimated_savings: 0,
      effort: 'low',
      confidence: 'high',
      timeframe_days: 1,
      implementation: `Current capacity allows ${Math.round(budgetHeadroom / 100)} new small tenants without exceeding budget`,
    });
  }

  // Premium model upgrade
  if (context.currentModelMix?.['claude-haiku-3'] && budgetHeadroom > 200) {
    recommendations.push({
      action: `Consider premium Opus for critical workflows`,
      estimated_savings: -Math.round(budgetHeadroom * 0.1),
      effort: 'low',
      confidence: 'medium',
      timeframe_days: 3,
      implementation:
        'Route high-stakes queries (customer support, compliance) to Opus, keep routine queries on Sonnet',
    });
  }

  return recommendations;
}

/**
 * Operational optimization suggestions (always applicable)
 */
function generateOperationalRecommendations(
  forecast: ForecastResult,
  context: RecommendationContext
): CostRecommendation[] {
  const recommendations: CostRecommendation[] = [];

  // 1. Monitoring and alerting
  recommendations.push({
    action: `Enable real-time cost monitoring and daily spend alerts`,
    estimated_savings: 0,
    effort: 'low',
    confidence: 'high',
    timeframe_days: 1,
    implementation:
      'Set up Prometheus alerts on token burn rate, Discord notifications on >20% daily variance',
  });

  // 2. Token usage audit
  if (forecast.confidence < 0.75) {
    recommendations.push({
      action: `Audit token counting accuracy — confidence is ${(forecast.confidence * 100).toFixed(0)}%`,
      estimated_savings: 0,
      effort: 'medium',
      confidence: 'high',
      timeframe_days: 5,
      implementation:
        'Compare Prometheus metrics vs. actual LLM provider API usage, recalibrate estimation model',
    });
  }

  // 3. Cost center allocation
  if (context.tenantCount && context.tenantCount > 20) {
    recommendations.push({
      action: `Implement per-tenant cost allocation for chargeback/accountability`,
      estimated_savings: 0,
      effort: 'high',
      confidence: 'medium',
      timeframe_days: 10,
      implementation:
        'Tag all token consumption by tenant_id, build cost breakdown dashboard, share insights with tenants',
    });
  }

  // 4. Model price monitoring
  recommendations.push({
    action: `Subscribe to provider price change notifications`,
    estimated_savings: 0,
    effort: 'low',
    confidence: 'high',
    timeframe_days: 1,
    implementation:
      'Set up email alerts from Anthropic, OpenAI pricing pages; re-run forecast quarterly',
  });

  return recommendations;
}

/**
 * Prioritize recommendations by ROI per effort ratio
 */
export function prioritizeRecommendations(
  recommendations: CostRecommendation[]
): CostRecommendation[] {
  const effortScore = { low: 1, medium: 5, high: 10 };

  return recommendations.sort((a, b) => {
    const roiA =
      (a.estimated_savings || 0) / (effortScore[a.effort] || 1) / (a.timeframe_days || 1);
    const roiB =
      (b.estimated_savings || 0) / (effortScore[b.effort] || 1) / (b.timeframe_days || 1);
    return roiB - roiA;
  });
}

/**
 * Calculate total potential savings from all recommendations
 */
export function calculateTotalSavingsPotential(recommendations: CostRecommendation[]): number {
  return recommendations.reduce((sum, r) => sum + (r.estimated_savings || 0), 0);
}

/**
 * Generate executive summary of top N recommendations
 */
export function generateExecutiveSummary(
  recommendations: CostRecommendation[],
  topN: number = 3
): string {
  const prioritized = prioritizeRecommendations(recommendations);
  const top = prioritized.slice(0, topN);
  const totalSavings = calculateTotalSavingsPotential(top);

  let summary = `## Top Cost Optimization Opportunities\n\n`;
  summary += `**Total Potential Savings (Top ${topN}): $${Math.round(totalSavings)}/month**\n\n`;

  top.forEach((rec, idx) => {
    summary += `### ${idx + 1}. ${rec.action}\n`;
    summary += `- **Est. Savings:** $${Math.round(rec.estimated_savings || 0)}/month\n`;
    summary += `- **Effort:** ${rec.effort} (${rec.timeframe_days} days)\n`;
    summary += `- **Confidence:** ${rec.confidence}\n`;
    summary += `- **How:** ${rec.implementation}\n\n`;
  });

  return summary;
}
