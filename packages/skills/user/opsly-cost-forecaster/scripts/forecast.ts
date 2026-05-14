import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import { aggregateTokensByModel, projectTokenCost } from './token-counter.js';
import {
  generateRecommendations,
  prioritizeRecommendations,
  generateExecutiveSummary,
} from './recommendations.js';
import type {
  ForecastResult,
  HistoricalData,
  RecommendationContext,
  PricingData,
} from '../types.js';

/**
 * Main cost forecaster orchestrator
 * Fetches historical data, calculates projections, generates recommendations
 */

const logger = pino();

interface PrometheusResponse {
  data: {
    result: Array<{
      metric: { [key: string]: string };
      values: Array<[number, string]>;
    }>;
  };
}

/**
 * Fetch historical token consumption from Prometheus
 */
async function fetchPrometheusMetrics(
  prometheusUrl: string,
  days: number = 90,
): Promise<HistoricalData> {
  logger.info(`Fetching Prometheus metrics for last ${days} days`);

  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - days * 24 * 60 * 60;
    const query = `sum(rate(openclaw_llm_tokens_consumed_total[1d])) by (model)`;

    const response = await axios.get<PrometheusResponse>(
      `${prometheusUrl}/api/v1/query_range`,
      {
        params: {
          query,
          start: startTime,
          end: endTime,
          step: '1d',
        },
      },
    );

    const tokenStream = response.data.data.result.flatMap((series) => {
      const model = series.metric.model || 'unknown';
      return series.values.map(([timestamp, value]) => ({
        model,
        inputTokens: Math.round(Number(value) * 0.8 * 1_000_000), // Estimate 80% input
        outputTokens: Math.round(Number(value) * 0.2 * 1_000_000),
        timestamp: new Date(Number(timestamp) * 1000),
      }));
    });

    const dailyAverageTokens =
      tokenStream.reduce((sum, t) => sum + t.inputTokens + t.outputTokens, 0) / Math.max(days, 1);

    return {
      tokenStream,
      dailyAverageTokens,
      dataQualityScore: 0.85, // Prometheus is reliable
    };
  } catch (error) {
    logger.error({ error }, 'Failed to fetch Prometheus metrics');
    throw error;
  }
}

/**
 * Fetch current pricing from Doppler configuration
 */
async function fetchPricingData(dopplerToken: string): Promise<PricingData> {
  logger.info('Fetching LLM pricing data from Doppler');

  try {
    const response = await axios.get('https://api.doppler.com/v3/configs/config/secrets', {
      headers: {
        Authorization: `Bearer ${dopplerToken}`,
      },
      params: {
        project: 'ops-intcloudsysops',
        config: 'prd',
      },
    });

    const pricingData: PricingData = {};

    // Extract model pricing from Doppler secrets (if available)
    // Fallback to hardcoded defaults in token-counter.ts
    if (response.data.secrets.LLM_PRICING_JSON) {
      try {
        const pricing = JSON.parse(
          response.data.secrets.LLM_PRICING_JSON.computed_value,
        );
        Object.assign(pricingData, pricing);
      } catch {
        logger.warn('Failed to parse LLM_PRICING_JSON from Doppler');
      }
    }

    return pricingData;
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch Doppler pricing, using defaults');
    return {}; // Fallback to defaults in token-counter
  }
}

/**
 * Fetch recent invoices from Stripe
 */
async function fetchStripeInvoices(stripeApiKey: string): Promise<{
  totalSpent30d: number;
  totalSpent90d: number;
  invoices: Array<{ date: Date; amount: number }>;
}> {
  logger.info('Fetching Stripe invoices');

  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

    const response = await axios.get('https://api.stripe.com/v1/invoices', {
      auth: {
        username: stripeApiKey,
        password: '',
      },
      params: {
        limit: 100,
        status: 'paid',
      },
    });

    const invoices = response.data.data
      .filter((inv: any) => inv.created >= ninetyDaysAgo)
      .map((inv: any) => ({
        date: new Date(inv.created * 1000),
        amount: inv.amount_paid / 100, // Convert cents to dollars
      }));

    const totalSpent30d = invoices
      .filter((inv) => inv.date.getTime() > thirtyDaysAgo * 1000)
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalSpent90d = invoices.reduce((sum, inv) => sum + inv.amount, 0);

    return { totalSpent30d, totalSpent90d, invoices };
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch Stripe invoices');
    return {
      totalSpent30d: 0,
      totalSpent90d: 0,
      invoices: [],
    };
  }
}

/**
 * Fetch tenant and agent data from Supabase
 */
async function fetchTenantData(supabaseUrl: string, supabaseKey: string) {
  logger.info('Fetching tenant and agent data from Supabase');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('deleted_at', null);

    if (tenantError) throw tenantError;

    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, tenant_id, status, usage_tokens_30d')
      .eq('deleted_at', null);

    if (agentError) throw agentError;

    return {
      tenantCount: tenants?.length || 0,
      agentCount: agents?.length || 0,
      avgTokensPerAgent:
        agents && agents.length > 0
          ? agents.reduce((sum, a) => sum + (a.usage_tokens_30d || 0), 0) /
            agents.length
          : 0,
    };
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch Supabase data');
    return {
      tenantCount: 0,
      agentCount: 0,
      avgTokensPerAgent: 0,
    };
  }
}

/**
 * Main forecast orchestrator
 */
export async function runForecast(
  budget: number = 10_000,
  options?: {
    prometheusUrl?: string;
    dopplerToken?: string;
    stripeApiKey?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    growthRate?: number;
    confidenceThreshold?: number;
  },
): Promise<ForecastResult> {
  const prometheusUrl =
    options?.prometheusUrl || process.env.PROMETHEUS_URL || 'http://localhost:9090';
  const dopplerToken =
    options?.dopplerToken || process.env.DOPPLER_TOKEN || '';
  const stripeApiKey =
    options?.stripeApiKey || process.env.STRIPE_API_KEY || '';
  const supabaseUrl =
    options?.supabaseUrl || process.env.SUPABASE_URL || '';
  const supabaseKey =
    options?.supabaseKey || process.env.SUPABASE_KEY || '';
  const growthRate = options?.growthRate ?? 0.075;
  const confidenceThreshold = options?.confidenceThreshold ?? 0.65;

  logger.info('Starting cost forecast');

  // Step 1: Collect historical data
  const [historicalData, pricingData, stripeData, tenantData] = await Promise.all(
    [
      fetchPrometheusMetrics(prometheusUrl),
      fetchPricingData(dopplerToken),
      fetchStripeInvoices(stripeApiKey),
      fetchTenantData(supabaseUrl, supabaseKey),
    ],
  );

  // Step 2: Calculate current monthly spend
  const tokenBreakdown = aggregateTokensByModel(
    historicalData.tokenStream,
    pricingData,
  );
  const currentMonthlySpend = tokenBreakdown.totalCost;

  logger.info(
    {
      currentMonthlySpend,
      totalTokens: historicalData.dailyAverageTokens * 30,
    },
    'Current spend calculated',
  );

  // Step 3: Project 30/60/90 days
  const dailySpend = currentMonthlySpend / 30;
  const forecast_30d = dailySpend * 30 * Math.pow(1 + growthRate, 1 / 12);
  const forecast_60d =
    dailySpend * 30 * Math.pow(1 + growthRate, 2 / 12);
  const forecast_90d =
    dailySpend * 30 * Math.pow(1 + growthRate, 3 / 12);

  // Confidence based on data quality and forecast accuracy vs. actual
  const actualSpend30d = stripeData.totalSpent30d || 0;
  const mape = actualSpend30d
    ? Math.abs(forecast_30d - actualSpend30d) / actualSpend30d
    : 0;
  const confidence = Math.max(
    confidenceThreshold,
    Math.min(1, 1 - mape),
  );

  // Step 4: Generate alerts
  const alerts: string[] = [];
  const monthlyGrowth = ((forecast_30d - currentMonthlySpend) / currentMonthlySpend) * 100;

  if (monthlyGrowth > 15) {
    alerts.push(
      `⚠️ Token spend +${monthlyGrowth.toFixed(0)}% MoM — if trend continues, will exceed annual budget by Q4`,
    );
  }

  if (forecast_30d > budget * 0.8) {
    alerts.push(
      `⚠️ Forecast ($${forecast_30d.toFixed(0)}) exceeds 80% of budget ($${budget}) — cost optimization required`,
    );
  }

  // Step 5: Generate recommendations context
  const recommendationContext: RecommendationContext = {
    currentModelMix: tokenBreakdown.costByModel,
    pricingData,
    tenantCount: tenantData.tenantCount,
    agentCount: tenantData.agentCount,
    cacheHitRate: 0.25, // Default, would fetch from observability
    averageQuerySize: 2500, // Default, would fetch from LLM Gateway metrics
  };

  const recommendations = generateRecommendations(
    {
      forecast_period: `${new Date().toISOString().split('T')[0]} to ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
      current_monthly_spend: currentMonthlySpend,
      forecast_30d,
      forecast_60d,
      forecast_90d,
      confidence,
      breakdown: {
        llm_tokens: tokenBreakdown.totalCost,
        compute: 400, // Placeholder, would fetch from infra monitoring
        storage: 200, // Placeholder, would fetch from infra monitoring
      },
      alerts,
      recommendations: [],
      next_review: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0],
    },
    budget,
    recommendationContext,
  );

  const prioritizedRecommendations = prioritizeRecommendations(recommendations);

  const result: ForecastResult = {
    forecast_period: `${new Date().toISOString().split('T')[0]} to ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
    current_monthly_spend: Math.round(currentMonthlySpend),
    forecast_30d: Math.round(forecast_30d),
    forecast_60d: Math.round(forecast_60d),
    forecast_90d: Math.round(forecast_90d),
    confidence: Math.round(confidence * 100) / 100,
    breakdown: {
      llm_tokens: Math.round(tokenBreakdown.totalCost),
      compute: 400,
      storage: 200,
    },
    alerts,
    recommendations: prioritizedRecommendations,
    next_review: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split('T')[0],
  };

  logger.info(result, 'Forecast complete');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n## Executive Summary');
  console.log(generateExecutiveSummary(prioritizedRecommendations));

  return result;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const budget = parseInt(process.env.COST_FORECAST_BUDGET || '10000');
  runForecast(budget).catch((error) => {
    logger.error(error, 'Forecast failed');
    process.exit(1);
  });
}
