/**
 * Hermes InsightGenerator Worker
 * Capa 2: Predictive Business Intelligence Engine
 *
 * Genera predicciones automáticas:
 * - Churn Prediction (riesgo de fuga)
 * - Revenue Forecast (proyección de ingresos)
 * - Anomaly Detection (detección de anomalías)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { z } from 'zod';

// ============================================
// TYPES & INTERFACES
// ============================================

export enum InsightType {
  CHURN_RISK = 'churn_risk',
  REVENUE_FORECAST = 'revenue_forecast',
  ANOMALY_DETECTION = 'anomaly_detection',
  USAGE_PATTERN = 'usage_pattern',
  COST_OPTIMIZATION = 'cost_optimization',
  GROWTH_OPPORTUNITY = 'growth_opportunity',
}

export enum InsightStatus {
  ACTIVE = 'active',
  READ = 'read',
  ACTIONED = 'actioned',
  DISMISSED = 'dismissed',
}

export interface TenantInsight {
  id?: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  confidence: number; // 0-1
  impact_score: number; // 1-10
  status: InsightStatus;
  expires_at?: Date;
}

export interface TenantEventData {
  tenant_id: string;
  event_type: string;
  amount?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface TenantMetrics {
  tenant_id: string;
  plan: string;
  total_transactions: number;
  total_revenue: number;
  avg_transaction_value: number;
  last_activity: Date;
  days_since_last_activity: number;
  transaction_trend: number; // percentage
  message_count_30d: number;
  message_count_90d: number;
  churn_risk_score: number;
  predicted_revenue_30d: number;
  anomaly_score: number;
}

// ============================================
// SUPABASE CLIENT
// ============================================

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdmin;
}

// ============================================
// REDIS CONNECTION
// ============================================

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
    });
  }
  return redis;
}

// ============================================
// INSIGHT GENERATORS (HEURISTIC/MATHEMATICAL)
// ============================================

/**
 * CHURN PREDICTION
 * Heuristic: Si no hay actividad en 7+ días y plan activo = riesgo
 * Si hay actividad declining en 30 días = riesgo moderado
 */
export function calculateChurnRisk(metrics: TenantMetrics): {
  score: number;
  confidence: number;
  factors: string[];
} {
  const factors: string[] = [];
  let riskScore = 0;

  // Factor 1: Días sin actividad
  if (metrics.days_since_last_activity >= 30) {
    riskScore += 0.5;
    factors.push(`Sin actividad hace ${metrics.days_since_last_activity} días`);
  } else if (metrics.days_since_last_activity >= 14) {
    riskScore += 0.3;
    factors.push(`Sin actividad hace ${metrics.days_since_last_activity} días`);
  } else if (metrics.days_since_last_activity >= 7) {
    riskScore += 0.15;
    factors.push(`Actividad reciente baja`);
  }

  // Factor 2: Tendencia de transacciones
  if (metrics.transaction_trend < -30) {
    riskScore += 0.3;
    factors.push(`Transacciones bajaron ${Math.abs(metrics.transaction_trend)}%`);
  } else if (metrics.transaction_trend < -10) {
    riskScore += 0.1;
    factors.push(`Transacciones en declive`);
  }

  // Factor 3: Engagement de mensajes
  const messageDecline =
    ((metrics.message_count_90d - metrics.message_count_30d * 3) /
      Math.max(metrics.message_count_90d, 1)) *
    100;
  if (messageDecline > 50) {
    riskScore += 0.2;
    factors.push(`Uso de mensajes bajó ${messageDecline.toFixed(0)}%`);
  }

  // Normalizar a 0-1
  const normalizedScore = Math.min(1, riskScore);

  // Calcular confianza basada en cantidad de datos
  const confidence = Math.min(0.95, 0.6 + (metrics.total_transactions / 100) * 0.2);

  return {
    score: normalizedScore,
    confidence,
    factors,
  };
}

/**
 * REVENUE FORECAST
 * Proyección lineal basada en histórico de Stripe
 */
export function calculateRevenueForecast(metrics: TenantMetrics): {
  forecast_30d: number;
  confidence: number;
  trend: 'up' | 'stable' | 'down';
  change_percent: number;
} {
  const avgMonthly = metrics.total_revenue / 3; // Asumiendo 90 días de datos
  const trendMultiplier = 1 + metrics.transaction_trend / 100;

  const forecast_30d = avgMonthly * trendMultiplier;
  const change_percent = ((forecast_30d - avgMonthly) / avgMonthly) * 100;

  let trend: 'up' | 'stable' | 'down' = 'stable';
  if (change_percent > 5) trend = 'up';
  else if (change_percent < -5) trend = 'down';

  const confidence = Math.min(0.9, 0.5 + (metrics.total_transactions / 50) * 0.3);

  return {
    forecast_30d,
    confidence,
    trend,
    change_percent,
  };
}

/**
 * ANOMALY DETECTION
 * Z-Score para detectar picos inusuales
 */
export function detectAnomalies(historicalValues: number[]): {
  anomalies: { index: number; value: number; zScore: number }[];
  overall_anomaly_score: number;
} {
  if (historicalValues.length < 5) {
    return { anomalies: [], overall_anomaly_score: 0 };
  }

  const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
  const stdDev = Math.sqrt(
    historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      historicalValues.length
  );

  if (stdDev === 0) {
    return { anomalies: [], overall_anomaly_score: 0 };
  }

  const anomalies: { index: number; value: number; zScore: number }[] = [];

  historicalValues.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > 2) {
      // Umbral: 2 desviaciones estándar
      anomalies.push({ index, value, zScore });
    }
  });

  const overall_anomaly_score = Math.min(1, anomalies.length / historicalValues.length);

  return { anomalies, overall_anomaly_score };
}

// ============================================
// INSIGHT GENERATOR ENGINE
// ============================================

export class InsightGenerator {
  private supabase: SupabaseClient;
  private redis: Redis;
  private processingLockTTL = 3600; // 1 hour

  constructor() {
    this.supabase = getSupabaseAdmin();
    this.redis = getRedis();
  }

  /**
   * Obtener métricas agregadas del tenant
   */
  private async getTenantMetrics(tenantId: string, days = 90): Promise<TenantMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener datos del tenant
    const { data: tenant, error: tenantError } = await this.supabase
      .from('platform.tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Obtener transacciones Stripe (últimos 90 días)
    const { data: transactions } = await this.supabase
      .from('stripe_transactions')
      .select('amount, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Obtener eventos de uso (últimos 30 y 90 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events30d } = await this.supabase
      .from('platform.usage_events')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: events90d } = await this.supabase
      .from('platform.usage_events')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString());

    // Calcular métricas
    const txList = transactions || [];
    const totalRevenue = txList.reduce(
      (sum: number, tx: { amount: number }) => sum + (tx.amount || 0),
      0
    );

    // Calcular tendencia (comparar última tercera parte con primera tercera parte)
    const thirdLen = Math.floor(txList.length / 3);
    const firstThird = txList.slice(0, thirdLen);
    const lastThird = txList.slice(-thirdLen);

    const firstThirdAvg =
      firstThird.length > 0
        ? firstThird.reduce((s: number, t: { amount: number }) => s + (t.amount || 0), 0) /
          firstThird.length
        : 0;
    const lastThirdAvg =
      lastThird.length > 0
        ? lastThird.reduce((s: number, t: { amount: number }) => s + (t.amount || 0), 0) /
          lastThird.length
        : 0;

    const transactionTrend =
      firstThirdAvg > 0 ? ((lastThirdAvg - firstThirdAvg) / firstThirdAvg) * 100 : 0;

    // Última actividad
    const allEvents = [...(events90d || [])];
    const lastActivity =
      allEvents.length > 0
        ? new Date(
            Math.max(
              ...allEvents.map((e: { created_at: string }) => new Date(e.created_at).getTime())
            )
          )
        : new Date(0);

    const churnRisk = calculateChurnRisk({
      tenant_id: tenantId,
      plan: tenant.plan || 'startup',
      total_transactions: txList.length,
      total_revenue: totalRevenue,
      avg_transaction_value: txList.length > 0 ? totalRevenue / txList.length : 0,
      last_activity: lastActivity,
      days_since_last_activity: Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      ),
      transaction_trend: transactionTrend,
      message_count_30d: (events30d || []).length,
      message_count_90d: (events90d || []).length,
      churn_risk_score: 0,
      predicted_revenue_30d: 0,
      anomaly_score: 0,
    });

    const revenueForecast = calculateRevenueForecast({
      tenant_id: tenantId,
      plan: tenant.plan || 'startup',
      total_transactions: txList.length,
      total_revenue: totalRevenue,
      avg_transaction_value: txList.length > 0 ? totalRevenue / txList.length : 0,
      last_activity: lastActivity,
      days_since_last_activity: Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      ),
      transaction_trend: transactionTrend,
      message_count_30d: (events30d || []).length,
      message_count_90d: (events90d || []).length,
      churn_risk_score: 0,
      predicted_revenue_30d: 0,
      anomaly_score: 0,
    });

    // Detectar anomalías en transacciones
    const txAmounts = txList.map((t: { amount: number }) => t.amount || 0);
    const anomalyDetection = detectAnomalies(txAmounts);

    return {
      tenant_id: tenantId,
      plan: tenant.plan || 'startup',
      total_transactions: txList.length,
      total_revenue: totalRevenue,
      avg_transaction_value: txList.length > 0 ? totalRevenue / txList.length : 0,
      last_activity: lastActivity,
      days_since_last_activity: Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      ),
      transaction_trend: transactionTrend,
      message_count_30d: (events30d || []).length,
      message_count_90d: (events90d || []).length,
      churn_risk_score: churnRisk.score,
      predicted_revenue_30d: revenueForecast.forecast_30d,
      anomaly_score: anomalyDetection.overall_anomaly_score,
    };
  }

  /**
   * Generar y guardar insights para un tenant
   */
  async generateInsights(tenantId: string): Promise<TenantInsight[]> {
    const lockKey = `insight:lock:${tenantId}`;
    const redis = this.redis;

    // Intentar adquirir lock para evitar procesamiento concurrente
    const lock = await redis.set(lockKey, '1', 'EX', this.processingLockTTL, 'NX');
    if (!lock) {
      console.log(`Insight generation already in progress for tenant ${tenantId}`);
      return [];
    }

    try {
      const metrics = await this.getTenantMetrics(tenantId);
      const insights: TenantInsight[] = [];

      // 1. CHURN RISK INSIGHT
      if (metrics.churn_risk_score > 0.2) {
        const churnInsight = await this.createInsight(tenantId, {
          type: InsightType.CHURN_RISK,
          metrics,
          threshold: 0.3,
          riskScore: metrics.churn_risk_score,
        });
        insights.push(churnInsight);
      }

      // 2. REVENUE FORECAST INSIGHT
      const revenueInsight = await this.createRevenueInsight(tenantId, metrics);
      if (revenueInsight) insights.push(revenueInsight);

      // 3. ANOMALY DETECTION INSIGHT
      if (metrics.anomaly_score > 0.1) {
        const anomalyInsight = await this.createAnomalyInsight(tenantId, metrics);
        insights.push(anomalyInsight);
      }

      // 4. GROWTH OPPORTUNITY INSIGHT
      if (metrics.transaction_trend > 20 && metrics.plan === 'startup') {
        const growthInsight = await this.createGrowthInsight(tenantId, metrics);
        insights.push(growthInsight);
      }

      console.log(`Generated ${insights.length} insights for tenant ${tenantId}`);
      return insights;
    } finally {
      await redis.del(lockKey);
    }
  }

  private async createInsight(
    tenantId: string,
    data: { type: InsightType; metrics: TenantMetrics; threshold: number; riskScore: number }
  ): Promise<TenantInsight> {
    const { type, metrics, threshold, riskScore } = data;

    let title = '';
    let description = '';
    let impact_score = 5;

    if (type === InsightType.CHURN_RISK) {
      title = 'Riesgo de fuga detectado';
      if (riskScore >= 0.7) {
        description = `Alto riesgo de cancelación. El tenant no ha tenido actividad en ${metrics.days_since_last_activity} días y las transacciones han disminuido.`;
        impact_score = 9;
      } else if (riskScore >= 0.4) {
        description = `Riesgo moderado de fuga. Considera contactar al cliente para ofrecer soporte.`;
        impact_score = 6;
      } else {
        description = `Señal temprana de desconexión. Monitorear en las próximas semanas.`;
        impact_score = 4;
      }
    }

    const insight: TenantInsight = {
      tenant_id: tenantId,
      insight_type: type,
      title,
      description,
      payload: {
        metrics,
        threshold,
        riskScore,
        generated_at: new Date().toISOString(),
      },
      confidence: Math.min(0.9, 0.5 + riskScore * 0.3),
      impact_score,
      status: InsightStatus.ACTIVE,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    };

    // Guardar en Supabase
    const { data: saved, error } = await this.supabase
      .from('platform.tenant_insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      console.error(`Error saving insight: ${error.message}`);
      throw error;
    }

    // Log event
    await this.logInsightEvent(tenantId, (saved as { id: string }).id, 'generated');

    return saved as TenantInsight;
  }

  private async createRevenueInsight(
    tenantId: string,
    metrics: TenantMetrics
  ): Promise<TenantInsight | null> {
    const { forecast_30d, confidence, trend, change_percent } = calculateRevenueForecast(metrics);

    let title = '';
    let description = '';
    let impact_score = 5;

    if (trend === 'up') {
      title = 'Crecimiento proyectado';
      description = `Se proyecta un aumento del ${change_percent.toFixed(1)}% en ingresos para los próximos 30 días, llegando a $${forecast_30d.toFixed(2)}.`;
      impact_score = 7;
    } else if (trend === 'down') {
      title = 'Declive en ingresos proyectado';
      description = `Se espera una disminución del ${Math.abs(change_percent).toFixed(1)}% en ingresos. Revisa las métricas de conversión.`;
      impact_score = 8;
    } else {
      title = 'Ingresos estables';
      description = `Los ingresos se mantienen estables. Proyección: $${forecast_30d.toFixed(2)} para los próximos 30 días.`;
      impact_score = 3;
    }

    const insight: TenantInsight = {
      tenant_id: tenantId,
      insight_type: InsightType.REVENUE_FORECAST,
      title,
      description,
      payload: {
        current_revenue: metrics.total_revenue,
        forecast_30d,
        confidence,
        trend,
        change_percent,
        generated_at: new Date().toISOString(),
      },
      confidence,
      impact_score,
      status: InsightStatus.ACTIVE,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    };

    const { data: saved, error } = await this.supabase
      .from('platform.tenant_insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      console.error(`Error saving revenue insight: ${error.message}`);
      return null;
    }

    await this.logInsightEvent(tenantId, (saved as { id: string }).id, 'generated');
    return saved as TenantInsight;
  }

  private async createAnomalyInsight(
    tenantId: string,
    metrics: TenantMetrics
  ): Promise<TenantInsight> {
    const title = 'Anomalía detectada';
    const description = `Se detectó un pico inusual en la actividad del tenant (score: ${(metrics.anomaly_score * 100).toFixed(0)}%). Esto podría indicar un ataque, un bug, o una oportunidad de viralidad.`;

    const insight: TenantInsight = {
      tenant_id: tenantId,
      insight_type: InsightType.ANOMALY_DETECTION,
      title,
      description,
      payload: {
        anomaly_score: metrics.anomaly_score,
        transaction_trend: metrics.transaction_trend,
        generated_at: new Date().toISOString(),
      },
      confidence: 0.75,
      impact_score: 7,
      status: InsightStatus.ACTIVE,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
    };

    const { data: saved, error } = await this.supabase
      .from('platform.tenant_insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      console.error(`Error saving anomaly insight: ${error.message}`);
      throw error;
    }

    await this.logInsightEvent(tenantId, (saved as { id: string }).id, 'generated');
    return saved as TenantInsight;
  }

  private async createGrowthInsight(
    tenantId: string,
    metrics: TenantMetrics
  ): Promise<TenantInsight> {
    const title = '¡Momento de crecimiento!';
    const description = `El tenant está creciendo un ${metrics.transaction_trend.toFixed(0)}%. Es el momento ideal para ofrecer upgrade a plan superior o servicios adicionales.`;

    const insight: TenantInsight = {
      tenant_id: tenantId,
      insight_type: InsightType.GROWTH_OPPORTUNITY,
      title,
      description,
      payload: {
        current_plan: metrics.plan,
        growth_rate: metrics.transaction_trend,
        avg_transaction: metrics.avg_transaction_value,
        generated_at: new Date().toISOString(),
      },
      confidence: 0.8,
      impact_score: 6,
      status: InsightStatus.ACTIVE,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
    };

    const { data: saved, error } = await this.supabase
      .from('platform.tenant_insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      console.error(`Error saving growth insight: ${error.message}`);
      throw error;
    }

    await this.logInsightEvent(tenantId, (saved as { id: string }).id, 'generated');
    return saved as TenantInsight;
  }

  private async logInsightEvent(
    tenantId: string,
    insightId: string,
    eventType: string
  ): Promise<void> {
    await this.supabase.from('platform.insight_events').insert({
      tenant_id: tenantId,
      insight_id: insightId,
      event_type: eventType,
      metadata: { source: 'hermes_insight_generator' },
    });
  }
}

// ============================================
// BULLMQ WORKER
// ============================================

const insightQueue = new Queue('insight-generation', {
  connection: getRedis(),
});

export async function enqueueInsightGeneration(tenantId: string): Promise<void> {
  await insightQueue.add(
    'generate',
    { tenantId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}

export async function enqueueAllTenantInsights(): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Obtener todos los tenants activos
  const { data: tenants } = await supabase
    .from('platform.tenants')
    .select('id')
    .eq('status', 'active');

  if (!tenants || tenants.length === 0) return 0;

  // Encolar para cada tenant
  for (const tenant of tenants) {
    await enqueueInsightGeneration(tenant.id);
  }

  return tenants.length;
}

const insightWorker = new Worker(
  'insight-generation',
  async (job: Job) => {
    const { tenantId } = job.data;
    const generator = new InsightGenerator();
    const insights = await generator.generateInsights(tenantId);
    return { tenantId, insightsGenerated: insights.length };
  },
  { connection: getRedis(), concurrency: 5 }
);

insightWorker.on('completed', (job, result) => {
  console.log(
    `Insight generation completed for tenant ${result.tenantId}: ${result.insightsGenerated} insights`
  );
});

insightWorker.on('failed', (job, err) => {
  console.error(`Insight generation failed for job ${job?.id}: ${err.message}`);
});

// ============================================
// CLI FOR TESTING
// ============================================

if (require.main === module) {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.log('Usage: npx ts-node insight-generator.ts <tenant_id>');
    process.exit(1);
  }

  const generator = new InsightGenerator();
  generator
    .generateInsights(tenantId)
    .then((insights) => {
      console.log(`Generated ${insights.length} insights:`);
      insights.forEach((i) => console.log(`  - [${i.insight_type}] ${i.title}`));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}

export { insightWorker, insightQueue };
