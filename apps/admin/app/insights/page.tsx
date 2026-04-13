/**
 * Insights Admin Page
 * Capa 2: Predictive Business Intelligence Dashboard (Admin)
 */

import { createServerSupabase } from '@/lib/supabase/server';

type InsightType = 'churn_risk' | 'revenue_forecast' | 'anomaly_detection' | 'usage_pattern' | 'cost_optimization' | 'growth_opportunity';

interface TenantInsight {
  id: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  confidence: number;
  impact_score: number;
  status: string;
  created_at: string;
}

const typeStyles: Record<string, { bg: string; icon: string; label: string }> = {
  churn_risk: { bg: 'bg-red-900/50 border-red-500', icon: '⚠️', label: 'Riesgo de Fuga' },
  revenue_forecast: { bg: 'bg-emerald-900/50 border-emerald-500', icon: '📈', label: 'Proyección' },
  anomaly_detection: { bg: 'bg-yellow-900/50 border-yellow-500', icon: '🔔', label: 'Anomalía' },
  usage_pattern: { bg: 'bg-blue-900/50 border-blue-500', icon: '📊', label: 'Patrón' },
  cost_optimization: { bg: 'bg-purple-900/50 border-purple-500', icon: '💰', label: 'Optimización' },
  growth_opportunity: { bg: 'bg-cyan-900/50 border-cyan-500', icon: '🚀', label: 'Crecimiento' },
};

interface InsightCardProps {
  insight: TenantInsight;
  tenantSlug: string;
}

function InsightCard({ insight, tenantSlug }: InsightCardProps) {
  const style = typeStyles[insight.insight_type] || typeStyles.usage_pattern;

  return (
    <div className={`p-4 rounded-lg border ${style.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <span className="text-xs text-white/60">{style.label}</span>
            <h3 className="font-semibold mt-0.5">{insight.title}</h3>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{Math.round(insight.confidence * 100)}%</span>
          <p className="text-xs text-muted">confianza</p>
        </div>
      </div>
      <p className="text-sm mt-3 opacity-80">{insight.description}</p>
      <div className="flex gap-2 mt-4">
        <form action={`/api/tenants/${tenantSlug}/insights`} method="POST">
          <input type="hidden" name="action" value="mark_read" />
          <input type="hidden" name="insight_id" value={insight.id} />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors"
          >
            Marcar leído
          </button>
        </form>
        <form action={`/api/tenants/${tenantSlug}/insights`} method="POST">
          <input type="hidden" name="action" value="action" />
          <input type="hidden" name="insight_id" value={insight.id} />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
          >
            Accionar
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { tenant: tenantSlug } = await searchParams;
  const supabase = await createServerSupabase();

  let insights: TenantInsight[] = [];
  let tenantName = '';

  if (tenantSlug) {
    const { data: tenant } = await supabase
      .from('platform.tenants')
      .select('id, slug, name')
      .eq('slug', tenantSlug)
      .single();

    if (tenant) {
      tenantName = tenant.name || tenant.slug;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tenants/${tenantSlug}/insights?status=active&limit=50`,
        { 
          headers: { 
            Authorization: `Bearer ${process.env.ADMIN_SESSION_TOKEN || ''}` 
          },
          cache: 'no-store'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        insights = data.data || [];
      }
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📊 Insights Predictivos</h1>
          {tenantName && (
            <p className="text-sm text-white/60 mt-1">{tenantName}</p>
          )}
        </div>
        <a
          href="/tenants"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          ← Ver Tenants
        </a>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-16 opacity-50">
          <span className="text-5xl">🤖</span>
          <p className="mt-4 text-lg">No hay insights activos</p>
          <p className="text-sm mt-1">Los insights se generan automáticamente cada día</p>
          {tenantSlug && (
            <form action={`/api/tenants/${tenantSlug}/insights`} method="POST" className="mt-4">
              <input type="hidden" name="action" value="generate" />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Generar Insights Ahora
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} tenantSlug={tenantSlug || ''} />
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg">
        <h2 className="font-semibold mb-2">Acerca de Predictive BI</h2>
        <p className="text-sm opacity-70">
          Los insights se generan automáticamente usando análisis heurístico y estadístico:
        </p>
        <ul className="text-sm opacity-70 mt-2 space-y-1">
          <li>• <strong>Churn Risk</strong>: Basado en días sin actividad + tendencia de transacciones</li>
          <li>• <strong>Revenue Forecast</strong>: Proyección lineal basada en histórico de Stripe</li>
          <li>• <strong>Anomaly Detection</strong>: Z-Score para detectar picos inusuales</li>
          <li>• <strong>Growth Opportunity</strong>: Detecta momento óptimo para upgrade de plan</li>
        </ul>
      </div>
    </div>
  );
}
