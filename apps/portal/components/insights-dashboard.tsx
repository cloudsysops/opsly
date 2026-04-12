/**
 * InsightDashboard - Predictive BI for tenant dashboards
 * Capa 2: Business Intelligence Visualization
 * 
 * Displays:
 * - Churn Risk predictions
 * - Revenue forecasts  
 * - Anomaly alerts
 * 
 * Props:
 * - tenantId: UUID of the tenant
 * - insights: Pre-fetched insights data (optional)
 * - onAcknowledge: Callback when user acknowledges an insight
 */

import { useState } from 'react';

type InsightType = 'churn_risk' | 'revenue_forecast' | 'anomaly_detection' | 'usage_pattern';

interface Insight {
  id: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  confidence: number;
  impact_score: number;
  is_read?: boolean;
  is_actioned?: boolean;
  created_at: string;
}

interface InsightDashboardProps {
  tenantId: string;
  insights?: {
    churn_risk: Insight[];
    revenue_forecast: Insight[];
    anomaly_detection: Insight[];
    [key: string]: Insight[];
  };
  onAcknowledge?: (insightId: string, action: 'read' | 'actioned') => Promise<void>;
}

function InsightCard({ 
  insight, 
  onAction 
}: { 
  insight: Insight; 
  onAction: (id: string, action: 'read' | 'actioned') => void 
}) {
  const [loading, setLoading] = useState(false);
  
  const typeConfig = {
    churn_risk: { 
      color: insight.confidence > 70 ? 'border-red-500' : 'border-yellow-500',
      bg: 'bg-red-500/10',
      icon: '⚠️'
    },
    revenue_forecast: { 
      color: 'border-blue-500', 
      bg: 'bg-blue-500/10',
      icon: '📈'
    },
    anomaly_detection: { 
      color: 'border-orange-500', 
      bg: 'bg-orange-500/10',
      icon: '🔍'
    },
    usage_pattern: { 
      color: 'border-purple-500', 
      bg: 'bg-purple-500/10',
      icon: '📊'
    }
  };
  
  const config = typeConfig[insight.insight_type as InsightType] || typeConfig.usage_pattern;
  
  const handleAction = async () => {
    setLoading(true);
    try {
      await onAction(insight.id, insight.is_read ? 'actioned' : 'read');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`p-4 rounded-lg border ${config.color} ${config.bg} transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <h4 className="font-semibold text-white">{insight.title}</h4>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">
            {Math.round(insight.confidence)}%
          </span>
          <p className="text-xs text-ops-gray">confianza</p>
        </div>
      </div>
      
      <p className="mt-2 text-sm text-ops-gray-light">{insight.description}</p>
      
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-ops-gray">
          {new Date(insight.created_at).toLocaleDateString('es-CO')}
        </span>
        
        {!insight.is_actioned && (
          <button
            onClick={handleAction}
            disabled={loading}
            className="px-3 py-1 text-xs bg-ops-primary text-white rounded hover:bg-ops-primary/80 disabled:opacity-50"
          >
            {loading ? '...' : insight.is_read ? 'Marcar resuelto' : 'Marcar leído'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Main InsightDashboard component
 * 
 * @example
 * <InsightDashboard 
 *   tenantId="uuid"
 *   insights={fetchedInsights}
 *   onAcknowledge={handleAcknowledge}
 * />
 */
export function InsightDashboard({ 
  tenantId, 
  insights,
  onAcknowledge 
}: InsightDashboardProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (!insights) {
    return (
      <div className="p-4 rounded-lg bg-ops-surface border border-ops-border">
        <p className="text-ops-gray">Cargando insights...</p>
      </div>
    );
  }
  
  const allInsights = [
    ...insights.churn_risk,
    ...insights.revenue_forecast,
    ...insights.anomaly_detection
  ];
  
  if (allInsights.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-ops-surface border border-ops-border">
        <p className="text-ops-gray">📊 No hay insights predictivos disponibles</p>
        <p className="text-xs text-ops-gray mt-1">
          Los insights se generan automáticamente cuando hay suficientes datos.
        </p>
      </div>
    );
  }
  
  const displayInsights = showAll ? allInsights : allInsights.slice(0, 3);
  const hasMore = allInsights.length > 3;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          💡 Insights Predictivos
        </h3>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-ops-primary hover:underline"
          >
            {showAll ? 'Ver menos' : `Ver todos (${allInsights.length})`}
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {displayInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAction={onAcknowledge || (() => {})}
          />
        ))}
      </div>
      
      {!showAll && hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-ops-gray border border-dashed border-ops-border rounded hover:bg-ops-surface"
        >
          +{allInsights.length - 3} más insights disponibles
        </button>
      )}
      
      {/* Impact score visualization (simple bar) */}
      {insights.churn_risk.length > 0 && (
        <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30">
          <p className="text-xs text-red-400">
            💡 Los insights de fuga se regeneran diariamente usando análisis de actividad.
          </p>
        </div>
      )}
    </div>
  );
}

export type { Insight, InsightDashboardProps, InsightType };
export default InsightDashboard;