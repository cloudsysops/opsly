/**
 * Type definitions for opsly-cost-forecaster skill
 */

export interface ModelTokenCost {
  input: number; // $/token
  output: number; // $/token
  contextWindow: number; // tokens
}

export type PricingData = Record<string, ModelTokenCost>;

export interface TokenBreakdown {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  costByModel: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }
  >;
}

export interface HistoricalData {
  tokenStream: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    timestamp: Date;
  }>;
  dailyAverageTokens: number;
  dataQualityScore: number;
}

export interface ForecastResult {
  forecast_period: string;
  current_monthly_spend: number;
  forecast_30d: number;
  forecast_60d: number;
  forecast_90d: number;
  confidence: number;
  breakdown: {
    llm_tokens: number;
    compute: number;
    storage: number;
  };
  alerts: string[];
  recommendations: CostRecommendation[];
  next_review: string;
}

export interface CostRecommendation {
  action: string;
  estimated_savings: number; // $/month
  effort: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  timeframe_days: number;
  implementation: string;
}

export interface RecommendationContext {
  currentModelMix?: Record<string, number>; // Model → cost
  pricingData?: PricingData;
  tenantCount?: number;
  agentCount?: number;
  cacheHitRate?: number;
  averageQuerySize?: number; // tokens
}
