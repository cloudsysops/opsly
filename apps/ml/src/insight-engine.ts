/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

export type InsightType =
  | "churn_risk"
  | "revenue_forecast"
  | "anomaly_detection"
  | "usage_pattern"
  | "cost_optimization"
  | "growth_opportunity";

export interface TenantInsight {
  id?: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  confidence: number;
  impact_score: number;
  status?: "active" | "read" | "actioned" | "dismissed";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  expires_at?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChurnPrediction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RevenueForecast {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnomalyDetection {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface InsightEngineConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  idleDaysThreshold: number;
  churnConfidenceWeights: {
    idle_days: number;
    low_usage: number;
    support_tickets: number;
  };
  anomalyThresholds: {
    z_score_low: number;
    z_score_medium: number;
    z_score_high: number;
  };
  forecastHorizonDays: number;
}

const DEFAULT_CONFIG: InsightEngineConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  idleDaysThreshold: 7,
  churnConfidenceWeights: {
    idle_days: 0.4,
    low_usage: 0.35,
    support_tickets: 0.25,
  },
  anomalyThresholds: {
    z_score_low: 1.5,
    z_score_medium: 2.0,
    z_score_high: 3.0,
  },
  forecastHorizonDays: 30,
};

export class InsightEngine {
  private supabase: ReturnType<typeof createClient>;
  private config: InsightEngineConfig;

  constructor(config: Partial<InsightEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseServiceKey
    );
  }

  async generateChurnPrediction(tenantId: string): Promise<TenantInsight | null> {
    const weights = this.config.churnConfidenceWeights;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usageEvents, error } = await (this.supabase as any)
      .from("platform.usage_events")
      .select("created_at, event_type")
      .eq("tenant_id", tenantId)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    if (error || !usageEvents?.length) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastEvent = new Date((usageEvents as any[])[0]?.created_at || Date.now());
    const daysInactive = Math.floor(
      (Date.now() - lastEvent.getTime()) / (1000 * 60 * 60 * 24)
    );

    let riskScore = 0;
    const factors: string[] = [];

    if (daysInactive >= this.config.idleDaysThreshold) {
      riskScore += weights.idle_days;
      factors.push(`Inactivo por ${daysInactive} días`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentEvents = (usageEvents as any[]).filter(
      (e: any) =>
        new Date(e.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000
    );

    if (recentEvents.length < 5) {
      riskScore += weights.low_usage;
      factors.push("Uso bajo en últimos 14 días");
    }

    const normalizedRisk = Math.min(riskScore, 1);

    if (normalizedRisk < 0.3) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prediction: any = {
      risk_score: normalizedRisk,
      days_inactive: daysInactive,
      last_activity: (usageEvents as any[])[0]?.created_at,
      factors,
    };

    return {
      tenant_id: tenantId,
      insight_type: "churn_risk",
      title: `Riesgo de fuga: ${Math.round(normalizedRisk * 100)}%`,
      description:
        normalizedRisk > 0.7
          ? "Alta probabilidad de cancelación. Se recomienda intervención inmediata."
          : "Moderada probabilidad de fuga. Considera contactar al cliente.",
      payload: prediction,
      confidence: normalizedRisk,
      impact_score: normalizedRisk > 0.7 ? 9 : 6,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async generateRevenueForecast(
    tenantId: string
  ): Promise<TenantInsight | null> {
    const { data: subscriptions } = await this.supabase
      .from("platform.subscriptions")
      .select("id, status, current_period_end, plan_id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!subscriptions?.length) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscriptions[0] as any;
    const periodEnd = new Date(sub.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000);
    const daysUntilRenewal = Math.floor(
      (periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const estimatedMRR = 49;
    const forecastGrowth = daysUntilRenewal < 14 ? 0.05 : 0;

    const prediction: RevenueForecast = {
      current_mrr: estimatedMRR,
      forecast_mrr: estimatedMRR * (1 + forecastGrowth),
      growth_rate: forecastGrowth,
      trend: forecastGrowth > 0.02 ? "up" : forecastGrowth < -0.02 ? "down" : "stable",
      confidence: 0.7,
    };

    return {
      tenant_id: tenantId,
      insight_type: "revenue_forecast",
      title: `Pronóstico de ingresos: $${Math.round(prediction.forecast_mrr)}/mes`,
      description:
        prediction.trend === "up"
          ? "Tendencia positiva proyectada para los próximos 30 días."
          : prediction.trend === "down"
          ? "Riesgo de decremento detectado. Revisa las métricas."
          : "Ingresos estables proyectados.",
      payload: prediction,
      confidence: prediction.confidence,
      impact_score: prediction.trend === "down" ? 8 : 5,
      expires_at: new Date(
        Date.now() + this.config.forecastHorizonDays * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  async generateAnomalyDetection(
    tenantId: string,
    metric: string = "api_calls",
    lookbackDays: number = 7
  ): Promise<TenantInsight | null> {
    const { data: events } = await this.supabase
      .from("platform.usage_events")
      .select("created_at, tokens_used")
      .eq("tenant_id", tenantId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true });

    if (!events?.length || events.length < 10) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
const values = events.map((e: any) => (metric === "tokens" ? e.tokens_used || 0 : 1));
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / n
    );

    const recentValues = values.slice(-lookbackDays);
    const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const zScore = std > 0 ? Math.abs((recentMean - mean) / std) : 0;

    const thresholds = this.config.anomalyThresholds;
    let severity: "low" | "medium" | "high" = "low";
    let impactScore = 3;

    if (zScore >= thresholds.z_score_high) {
      severity = "high";
      impactScore = 9;
    } else if (zScore >= thresholds.z_score_medium) {
      severity = "medium";
      impactScore = 6;
    }

    if (zScore < thresholds.z_score_low) {
      return null;
    }

    const prediction: AnomalyDetection = {
      metric,
      current_value: recentMean,
      expected_value: mean,
      z_score: zScore,
      severity,
      threshold: thresholds.z_score_low,
    };

    return {
      tenant_id: tenantId,
      insight_type: "anomaly_detection",
      title: `Anomalía detectada en ${metric}`,
      description:
        severity === "high"
          ? `Pico significativo detectado (${zScore.toFixed(1)}σ). Requiere atención inmediata.`
          : `Variación detectada (${zScore.toFixed(1)}σ). Monitorear en próximos días.`,
      payload: prediction as Record<string, unknown>,
      confidence: Math.min(zScore / 3, 1),
      impact_score: impactScore,
      expires_at: new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  async generateAllInsights(tenantId: string): Promise<TenantInsight[]> {
    const insights: TenantInsight[] = [];

    const churn = await this.generateChurnPrediction(tenantId);
    if (churn) insights.push(churn);

    const revenue = await this.generateRevenueForecast(tenantId);
    if (revenue) insights.push(revenue);

    const anomaly = await this.generateAnomalyDetection(tenantId);
    if (anomaly) insights.push(anomaly);

    return insights;
  }

  async saveInsight(insight: TenantInsight): Promise<{ data: unknown; error: unknown }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.supabase as any).from("platform.tenant_insights").insert([insight]);
  }

  async saveInsights(insights: TenantInsight[]): Promise<{ data: unknown; error: unknown }> {
    if (!insights.length) return { data: null, error: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.supabase as any).from("platform.tenant_insights").insert(insights);
  }

  async logInsightEvent(
    tenantId: string,
    insightId: string,
    eventType: "generated" | "viewed" | "actioned" | "dismissed" | "feedback_positive" | "feedback_negative"
  ): Promise<{ data: unknown; error: unknown }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.supabase as any).from("platform.insight_events").insert([
      {
        tenant_id: tenantId,
        insight_id: insightId,
        event_type: eventType,
      },
    ]);
  }
}

export const createInsightEngine = (config?: Partial<InsightEngineConfig>) =>
  new InsightEngine(config);

export default InsightEngine;