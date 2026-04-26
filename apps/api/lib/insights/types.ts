/**
 * Predictive BI — tipos compartidos (API + cron). Sin LLM en el MVP heurístico.
 */
export type InsightType = 'churn_risk' | 'revenue_forecast' | 'usage_anomaly';

export type InsightStatus = 'active' | 'dismissed' | 'actioned';

export type TenantInsightRow = {
  id: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  confidence: number;
  impact_score: number;
  status: InsightStatus;
  read_at: string | null;
  actioned_at: string | null;
  created_at: string;
};

export type InsightPayloadChurn = {
  days_since_last_usage: number;
  last_usage_at: string | null;
  window_days: number;
};

export type InsightPayloadForecast = {
  currency: string;
  observed_daily_avg_usd: number;
  forecast_next_7d_usd: number;
  series_days: number;
};

export type InsightPayloadAnomaly = {
  metric: 'usage_events_daily_count';
  last_day_count: number;
  baseline_mean: number;
  baseline_std: number;
  z_score: number;
  window_days: number;
};
