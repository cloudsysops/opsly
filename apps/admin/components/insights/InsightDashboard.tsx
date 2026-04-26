/**
 * InsightDashboard Component
 * Capa 2: Predictive Business Intelligence Dashboard
 *
 * Muestra:
 * - Cards de insights por tipo
 * - Gráfico de tendencia vs predicción
 * - Acciones: leer, actuar, descartar
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Zap,
  RefreshCw,
  Check,
  X,
  Eye,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ============================================
// TYPES
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

export interface RevenueForecastPayload {
  current_revenue: number;
  forecast_30d: number;
  confidence: number;
  trend: 'up' | 'stable' | 'down';
  change_percent: number;
}

export interface ChurnRiskPayload {
  riskScore: number;
  days_since_last_activity: number;
  transaction_trend: number;
}

export interface TenantInsight {
  id: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  payload: RevenueForecastPayload | ChurnRiskPayload | Record<string, unknown>;
  confidence: number;
  impact_score: number;
  status: InsightStatus;
  created_at: string;
  expires_at?: string;
}

export interface InsightsResponse {
  data: TenantInsight[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  summary: {
    active_total: number;
    by_type: Record<string, number>;
  };
}

interface InsightDashboardProps {
  tenantId: string;
  accessToken: string;
  apiBaseUrl?: string;
  onInsightActioned?: (insight: TenantInsight) => void;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const insightTypeConfig: Record<
  InsightType,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  [InsightType.CHURN_RISK]: {
    label: 'Riesgo de Fuga',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: AlertTriangle,
  },
  [InsightType.REVENUE_FORECAST]: {
    label: 'Proyección de Ingresos',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: DollarSign,
  },
  [InsightType.ANOMALY_DETECTION]: {
    label: 'Anomalía Detectada',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Activity,
  },
  [InsightType.USAGE_PATTERN]: {
    label: 'Patrón de Uso',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: TrendingUp,
  },
  [InsightType.COST_OPTIMIZATION]: {
    label: 'Optimización de Costos',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: Zap,
  },
  [InsightType.GROWTH_OPPORTUNITY]: {
    label: 'Oportunidad de Crecimiento',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    icon: TrendingUp,
  },
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.6) return 'text-yellow-500';
  return 'text-red-500';
}

function getImpactBadgeClass(impact: number): string {
  if (impact >= 7) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (impact >= 4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

// ============================================
// API HOOK
// ============================================

async function fetchInsights(
  tenantId: string,
  accessToken: string,
  apiBaseUrl: string = '',
  params: { status?: string; type?: string; limit?: number } = {}
): Promise<InsightsResponse> {
  const url = new URL(`${apiBaseUrl}/api/tenants/${tenantId}/insights`);
  if (params.status) url.searchParams.set('status', params.status);
  if (params.type) url.searchParams.set('type', params.type);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch insights: ${response.statusText}`);
  }

  return response.json();
}

async function updateInsight(
  tenantId: string,
  insightId: string,
  action: 'mark_read' | 'action' | 'dismiss',
  accessToken: string,
  apiBaseUrl: string = ''
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/tenants/${tenantId}/insights`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, insight_id: insightId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update insight: ${response.statusText}`);
  }
}

async function regenerateInsights(
  tenantId: string,
  accessToken: string,
  apiBaseUrl: string = ''
): Promise<{ insights_generated: number }> {
  const response = await fetch(`${apiBaseUrl}/api/tenants/${tenantId}/insights`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'generate' }),
  });

  if (!response.ok) {
    throw new Error(`Failed to regenerate insights: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// COMPONENTS
// ============================================

function InsightCard({
  insight,
  onAction,
}: {
  insight: TenantInsight;
  onAction: (action: 'mark_read' | 'action' | 'dismiss', insightId: string) => void;
}) {
  const config =
    insightTypeConfig[insight.insight_type] || insightTypeConfig[InsightType.USAGE_PATTERN];
  const Icon = config.icon;
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'mark_read' | 'action' | 'dismiss') => {
    setLoading(action);
    try {
      await onAction(action, insight.id);
    } finally {
      setLoading(null);
    }
  };

  const confidencePercent = (insight.confidence * 100).toFixed(0);

  return (
    <div
      className={`
      relative overflow-hidden rounded-lg border p-4
      ${config.bgColor} border-white/10
      ${insight.status !== InsightStatus.ACTIVE ? 'opacity-60' : ''}
    `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h4 className="font-medium text-white">{insight.title}</h4>
            <p className="text-xs text-white/60">{config.label}</p>
          </div>
        </div>

        {/* Impact Badge */}
        <span
          className={`
          px-2 py-1 rounded-full text-xs font-medium border
          ${getImpactBadgeClass(insight.impact_score)}
        `}
        >
          Impacto {insight.impact_score}/10
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-white/80 mb-4 line-clamp-3">{insight.description}</p>

      {/* Payload visualization for revenue forecast */}
      {insight.insight_type === InsightType.REVENUE_FORECAST &&
        (insight.payload as RevenueForecastPayload).forecast_30d && (
          <div className="mb-4 p-3 rounded-lg bg-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Proyección 30 días</span>
              <span className="text-lg font-mono text-white">
                ${Number((insight.payload as RevenueForecastPayload).forecast_30d).toLocaleString()}
              </span>
            </div>
            {(insight.payload as RevenueForecastPayload).change_percent && (
              <div
                className={`
              flex items-center gap-1 mt-1 text-xs
              ${Number((insight.payload as RevenueForecastPayload).change_percent) > 0 ? 'text-green-400' : 'text-red-400'}
            `}
              >
                {Number((insight.payload as RevenueForecastPayload).change_percent) > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(
                  Number((insight.payload as RevenueForecastPayload).change_percent)
                ).toFixed(1)}
                %
              </div>
            )}
          </div>
        )}

      {/* Churn risk visualization */}
      {insight.insight_type === InsightType.CHURN_RISK &&
        (insight.payload as ChurnRiskPayload).riskScore && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/60">Nivel de riesgo</span>
              <span
                className={getConfidenceColor(
                  Number((insight.payload as ChurnRiskPayload).riskScore)
                )}
              >
                {(Number((insight.payload as ChurnRiskPayload).riskScore) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  Number((insight.payload as ChurnRiskPayload).riskScore) > 0.7
                    ? 'bg-red-500'
                    : Number((insight.payload as ChurnRiskPayload).riskScore) > 0.4
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{
                  width: `${Number((insight.payload as ChurnRiskPayload).riskScore) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-4 text-xs text-white/60">
          <span className={getConfidenceColor(insight.confidence)}>
            {confidencePercent}% confianza
          </span>
          <span>{new Date(insight.created_at).toLocaleDateString()}</span>
        </div>

        {/* Actions */}
        {insight.status === InsightStatus.ACTIVE && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('mark_read')}
              disabled={loading === 'mark_read'}
              className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Marcar como leído"
            >
              {loading === 'mark_read' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => handleAction('action')}
              disabled={loading === 'action'}
              className="p-1.5 rounded-md hover:bg-green-500/20 text-green-400 transition-colors"
              title="Tomar acción"
            >
              {loading === 'action' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => handleAction('dismiss')}
              disabled={loading === 'dismiss'}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
              title="Descartar"
            >
              {loading === 'dismiss' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCards({
  summary,
  onFilter,
}: {
  summary: Record<string, number>;
  onFilter: (type: string | null) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleClick = (type: string | null) => {
    setActiveFilter(type === activeFilter ? null : type);
    onFilter(type === activeFilter ? null : type);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <button
        onClick={() => handleClick(null)}
        className={`
          p-4 rounded-lg border text-left transition-all
          ${
            activeFilter === null
              ? 'bg-white/10 border-white/30'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }
        `}
      >
        <div className="text-2xl font-bold text-white">
          {Object.values(summary).reduce((a, b) => a + b, 0)}
        </div>
        <div className="text-xs text-white/60">Total Insights</div>
      </button>

      {Object.entries(summary).map(([type, count]) => {
        const config = insightTypeConfig[type as InsightType];
        if (!config) return null;
        const Icon = config.icon;

        return (
          <button
            key={type}
            onClick={() => handleClick(type)}
            className={`
              p-4 rounded-lg border text-left transition-all
              ${
                activeFilter === type
                  ? `${config.bgColor} border-${config.color.split('-')[1]}-500/50`
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className="text-xs text-white/60">{config.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{count}</div>
          </button>
        );
      })}
    </div>
  );
}

function RevenueForecastChart({ insights }: { insights: TenantInsight[] }) {
  const revenueInsight = insights.find((i) => i.insight_type === InsightType.REVENUE_FORECAST);

  if (!revenueInsight) return null;

  const payload = revenueInsight.payload as RevenueForecastPayload;
  const currentRevenue = Number(payload.current_revenue) || 0;
  const forecast = Number(payload.forecast_30d) || 0;

  const data = [
    { name: 'Mes -3', valor: currentRevenue * 0.85 },
    { name: 'Mes -2', valor: currentRevenue * 0.92 },
    { name: 'Mes -1', valor: currentRevenue },
    { name: 'Proyectado', valor: forecast, proyectado: true },
  ];

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-6">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-500" />
        Proyección de Ingresos
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} />
            <YAxis stroke="#ffffff60" fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #ffffff20',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Valor']}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorValor)"
              name="Real"
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="#60a5fa"
              strokeDasharray="5 5"
              fillOpacity={0}
              data={data.filter((d) => d.proyectado)}
              name="Proyectado"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function InsightDashboard({
  tenantId,
  accessToken,
  apiBaseUrl = '',
  onInsightActioned,
}: InsightDashboardProps) {
  const [insights, setInsights] = useState<TenantInsight[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchInsights(tenantId, accessToken, apiBaseUrl, {
        status: 'active',
        type: typeFilter || undefined,
        limit: 50,
      });
      setInsights(response.data);
      setSummary(response.summary.by_type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, apiBaseUrl, typeFilter]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleAction = async (action: 'mark_read' | 'action' | 'dismiss', insightId: string) => {
    try {
      await updateInsight(tenantId, insightId, action, accessToken, apiBaseUrl);

      if (action === 'action' && onInsightActioned) {
        const insight = insights.find((i) => i.id === insightId);
        if (insight) onInsightActioned(insight);
      }

      // Refresh insights
      await loadInsights();
    } catch (err) {
      console.error('Failed to update insight:', err);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      await regenerateInsights(tenantId, accessToken, apiBaseUrl);
      await loadInsights();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate insights');
    } finally {
      setRegenerating(false);
    }
  };

  const handleFilter = (type: string | null) => {
    setTypeFilter(type);
  };

  if (loading && insights.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
        <p className="font-medium">Error loading insights</p>
        <p className="text-sm text-red-400/80">{error}</p>
        <button
          onClick={loadInsights}
          className="mt-3 px-4 py-2 bg-red-500/20 rounded-md hover:bg-red-500/30 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Business Intelligence</h2>
          <p className="text-sm text-white/60">Insights predictivos generados por IA</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          {regenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Regenerar
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} onFilter={handleFilter} />

      {/* Revenue Chart */}
      <RevenueForecastChart insights={insights} />

      {/* Insights Grid */}
      {insights.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay insights activos</p>
          <p className="text-sm mt-1">Los insights se generan automáticamente cada día</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

export default InsightDashboard;
