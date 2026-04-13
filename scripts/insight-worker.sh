#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPSLY_ROOT="${OPSLY_ROOT:-$(dirname "$SCRIPT_DIR")"

echo "🤖 Insight Worker: Generando insights para todos los tenants..."

export SUPABASE_URL="${SUPABASE_URL:-$(doppler secrets get NEXT_PUBLIC_SUPABASE_URL --plain 2>/dev/null || echo $NEXT_PUBLIC_SUPABASE_URL)}"
export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(doppler secrets get SUPABASE_SERVICE_ROLE_KEY --plain 2>/dev/null || echo $SUPABASE_SERVICE_ROLE_KEY)}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_KEY" ]]; then
    echo "❌ Error: Faltan variables SUPABASE_URL o SUPABASE_SERVICE_KEY"
    exit 1
fi

tenants=$(psql "$SUPABASE_URL" -c "SELECT id FROM platform.tenants WHERE status = 'active'" --tuples-only 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || echo "")

if [[ -z "$tenants" ]]; then
    echo "⚠️  No hay tenants activos"
    exit 0
fi

count=0
for tenant_id in $tenants; do
    echo "📊 Generando insights para tenant: $tenant_id"
    
    node --input-type=module <<EOF
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("$SUPABASE_URL", "$SUPABASE_SERVICE_KEY");

async function generateInsights(tenantId) {
    const { data: usageEvents } = await supabase
        .from("platform.usage_events")
        .select("created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

    if (!usageEvents?.length) return null;

    const lastEvent = new Date(usageEvents[0].created_at);
    const daysInactive = Math.floor((Date.now() - lastEvent.getTime()) / (1000 * 60 * 60 * 24));

    let riskScore = 0;
    const factors = [];

    if (daysInactive >= 7) {
        riskScore += 0.4;
        factors.push(\`Inactivo por \${daysInactive} días\`);
    }

    const recentEvents = usageEvents.filter(e => new Date(e.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000);
    if (recentEvents.length < 5) {
        riskScore += 0.35;
        factors.push("Uso bajo en últimos 14 días");
    }

    const normalizedRisk = Math.min(riskScore, 1);
    if (normalizedRisk < 0.3) return null;

    await supabase.from("platform.tenant_insights").insert([{
        tenant_id: tenantId,
        insight_type: "churn_risk",
        title: \`Riesgo de fuga: \${Math.round(normalizedRisk * 100)}%\`,
        description: normalizedRisk > 0.7 
            ? "Alta probabilidad de cancelación. Se recomienda intervención inmediata."
            : "Moderada probabilidad de fuga. Considera contactar al cliente.",
        payload: { risk_score: normalizedRisk, days_inactive: daysInactive, factors },
        confidence: normalizedRisk,
        impact_score: normalizedRisk > 0.7 ? 9 : 6,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }]);

    console.log(\`✅ Insight generado para \${tenantId}: \${normalizedRisk * 100}% riesgo\`);
}

await generateInsights("$tenant_id");
EOF
    
    ((count++)) || true
done

echo "✅ Insights workers completado para $count tenants"