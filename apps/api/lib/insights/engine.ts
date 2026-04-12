import { getServiceClient } from "../supabase";
import type { Database } from "../supabase/types";

export type InsightType = "churn_risk" | "revenue_forecast" | "anomaly" | "opportunity" | "recommendation";

export interface TenantInsight {
  id: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  confidence: number;
  impact_score: number;
  is_read: boolean;
  is_actioned: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface ChurnPrediction {
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  factors: string[];
  daysSinceLastActivity: number;
}

export interface RevenueForecast {
  currentMonthly: number;
  projectedMonthly: number;
  growthPercent: number;
  trend: "up" | "stable" | "down";
}

export interface AnomalyDetection {
  metric: string;
  zscore: number;
  expected: number;
  actual: number;
  severity: "info" | "warning" | "critical";
}

const DAYS_INACTIVE_THRESHOLD = 14;
const CHURN_RISK_DAYS = 7;

function calculateChurnRisk(lastActivityDays: number, isActive: boolean, plan: string): ChurnPrediction {
  let riskScore = 0;
  const factors: string[] = [];

  if (lastActivityDays === 0) {
    factors.push("Usuario activo hoy");
  } else if (lastActivityDays <= CHURN_RISK_DAYS) {
    riskScore += (lastActivityDays / CHURN_RISK_DAYS) * 40;
    factors.push(`${lastActivityDays} días sin actividad`);
  } else {
    riskScore += 40 + Math.min(40, ((lastActivityDays - CHURN_RISK_DAYS) / 7) * 10);
    factors.push(`${lastActivityDays} días sin actividad`);
  }

  if (!isActive) {
    riskScore = Math.min(100, riskScore + 30);
    factors.push("Plan no activo");
  }

  if (plan === "startup") {
    riskScore += 10;
    factors.push("Plan startup (mayor rotación)");
  }

  const riskLevel: "low" | "medium" | "high" | "critical" =
    riskScore >= 80 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";

  return {
    riskLevel,
    riskScore: Math.round(riskScore),
    factors,
    daysSinceLastActivity: lastActivityDays,
  };
}

function calculateRevenueForecast(historical: number[], plan: string): RevenueForecast {
  if (historical.length === 0) {
    return {
      currentMonthly: 0,
      projectedMonthly: 0,
      growthPercent: 0,
      trend: "stable",
    };
  }

  const currentMonthly = historical[historical.length - 1] || 0;
  const sum = historical.reduce((a, b) => a + b, 0);
  const avg = sum / historical.length;

  const growthPercent = avg > 0 ? ((currentMonthly - avg) / avg) * 100 : 0;

  let projectedMonthly = currentMonthly;
  if (historical.length >= 3) {
    const slope = (historical[historical.length - 1] - historical[0]) / historical.length;
    projectedMonthly = Math.max(0, currentMonthly + slope * 2);
  }

  const planMultiplier = plan === "enterprise" ? 1.1 : plan === "business" ? 1.05 : 1;
  projectedMonthly *= planMultiplier;

  const trend: "up" | "stable" | "down" =
    growthPercent > 5 ? "up" : growthPercent < -5 ? "down" : "stable";

  return {
    currentMonthly: Math.round(currentMonthly * 100) / 100,
    projectedMonthly: Math.round(projectedMonthly * 100) / 100,
    growthPercent: Math.round(growthPercent * 10) / 10,
    trend,
  };
}

function detectAnomaly(values: number[], threshold = 2): AnomalyDetection | null {
  if (values.length < 7) return null;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return null;

  const lastValue = values[values.length - 1];
  const zscore = (lastValue - mean) / stdDev;

  if (Math.abs(zscore) < threshold) return null;

  const severity: "info" | "warning" | "critical" =
    Math.abs(zscore) > 3 ? "critical" : Math.abs(zscore) > 2.5 ? "warning" : "info";

  return {
    metric: "volume",
    zscore: Math.round(zscore * 100) / 100,
    expected: Math.round(mean * 100) / 100,
    actual: lastValue,
    severity,
  };
}

export async function generateChurnInsight(tenantId: string): Promise<TenantInsight | null> {
  const db = getServiceClient();

  const { data: tenant } = await db
    .schema("platform")
    .from("tenants")
    .select("id, status, plan, created_at, updated_at")
    .eq("id", tenantId)
    .single();

  if (!tenant) return null;

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const churn = calculateChurnRisk(
    daysSinceCreated,
    tenant.status === "active",
    tenant.plan || "startup"
  );

  if (churn.riskLevel === "low") return null;

  const titleMap = {
    low: "Seguridad: Cliente activo",
    medium: "Alerta: Reducir actividad",
    high: "URGENTE: Riesgo de fuga",
    critical: "CRÍTICO: Fuga inminente",
  };

  return {
    id: "",
    tenant_id: tenantId,
    insight_type: "churn_risk",
    title: titleMap[churn.riskLevel],
    description:
      `Riesgo de fuga: ${churn.riskScore}%.\n` +
      `Factores: ${churn.factors.join(", ")}.\n` +
      `Recomendación: ${churn.riskLevel === "critical" ? "Contactar inmediatamente" : "Revisar engagement"}.`,
    payload: churn,
    confidence: 100 - (churn.riskScore * 0.3),
    impact_score: churn.riskScore / 100,
    is_read: false,
    is_actioned: false,
    created_at: new Date().toISOString(),
    expires_at: null,
  };
}

export async function generateRevenueInsight(
  tenantId: string
): Promise<TenantInsight | null> {
  const db = getServiceClient();

  const { data: subscription } = await db
    .schema("platform")
    .from("subscriptions")
    .select("amount, interval, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (!subscription) return null;

  const forecast = calculateRevenueForecast(
    [subscription.amount || 0],
    "startup"
  );

  if (forecast.trend === "stable") return null;

  const title =
    forecast.trend === "up"
      ? "📈 Crecimiento detectado"
      : "📉 тенденция упада";

  return {
    id: "",
    tenant_id: tenantId,
    insight_type: "revenue_forecast",
    title,
    description:
      `Ingresos actuales: $${forecast.currentMonthly}/mes.\n` +
      `Proyección: $${forecast.projectedMonthly}/mes (${forecast.growthPercent}%).\n` +
      `Tendencia: ${forecast.trend}`,
    payload: forecast,
    confidence: 75,
    impact_score: Math.abs(forecast.growthPercent) / 100,
    is_read: false,
    is_actioned: false,
    created_at: new Date().toISOString(),
    expires_at: null,
  };
}

export async function saveInsight(insight: TenantInsight): Promise<string> {
  const db = getServiceClient();

  const { data, error } = await db
    .schema("platform")
    .from("tenant_insights")
    .insert({
      tenant_id: insight.tenant_id,
      insight_type: insight.insight_type,
      title: insight.title,
      description: insight.description,
      payload: insight.payload,
      confidence: insight.confidence,
      impact_score: insight.impact_score,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id || "";
}

export async function getInsightsForTenant(
  tenantId: string,
  includeRead = false
): Promise<TenantInsight[]> {
  const db = getServiceClient();

  let query = db
    .schema("platform")
    .from("tenant_insights")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!includeRead) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as unknown as TenantInsight[];
}

export async function markInsightRead(insightId: string): Promise<void> {
  const db = getServiceClient();

  await db
    .schema("platform")
    .from("tenant_insights")
    .update({ is_read: true })
    .eq("id", insightId);
}

export async function markInsightActioned(insightId: string): Promise<void> {
  const db = getServiceClient();

  await db
    .schema("platform")
    .from("tenant_insights")
    .update({ is_actioned: true })
    .eq("id", insightId);
}