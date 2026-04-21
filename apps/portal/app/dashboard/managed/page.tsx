import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { InsightDashboard } from "@/components/dashboard/insight-dashboard";
import { DashboardShell, PageLead, ResponsiveGrid } from "@/components/dashboard/premium-dashboard";
import { PortalShell } from "@/components/layout/portal-shell";
import { LlmUsageCard } from "@/components/llm-usage-card";
import { ServiceCard } from "@/components/service-card";
import { healthFromReachable } from "@/components/status-badge";
import { requirePortalPayloadWithUsageAndInsights } from "@/lib/portal-server";

export default async function ManagedDashboardPage(): Promise<ReactElement> {
  const { payload: data, usage, insights } = await requirePortalPayloadWithUsageAndInsights();
  if (data.mode === null) {
    redirect("/dashboard");
  }
  if (data.mode !== "managed") {
    redirect("/dashboard/developer");
  }

  const allHealthy = data.health.n8n_reachable && data.health.uptime_reachable;
  const displayName = data.name || data.slug;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";

  return (
    <PortalShell title={`Tus Automatizaciones — ${displayName}`} showModeLink>
      <DashboardShell>
        <PageLead>
          Vista resumida: estado de servicios, uso de IA y canal de soporte cuando esté configurado.
        </PageLead>
        <div className="stagger-children space-y-8">
        <LlmUsageCard usage={usage} />

        {insights !== null && (
          <InsightDashboard
            tenantSlug={data.slug}
            insights={insights.insights}
          />
        )}

        <section className="rounded-lg border border-ops-border bg-ops-surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ops-gray">
            Estado general
          </h2>
          {allHealthy ? (
            <p className="text-sm text-ops-green">✅ Tus agentes están activos</p>
          ) : (
            <p className="text-sm text-ops-yellow">⚠️ Atención requerida</p>
          )}
        </section>

        <ResponsiveGrid preset="1-2-2" gap="lg">
          <ServiceCard
            title="Motor de Automatización"
            description="Procesa tus flujos de trabajo automáticamente"
            url={data.services.n8n_url}
            actionLabel="Ver mis flujos"
            showHealth
            health={healthFromReachable(data.health.n8n_reachable)}
            healthLabel={data.health.n8n_reachable ? "Activo" : "Inactivo"}
          />

          <ServiceCard
            title="Monitor de Disponibilidad"
            description="Vigila que todo funcione 24/7"
            url={data.services.uptime_url}
            actionLabel="Ver estado"
            showHealth
            health={healthFromReachable(data.health.uptime_reachable)}
            healthLabel={data.health.uptime_reachable ? "Activo" : "Inactivo"}
          />
        </ResponsiveGrid>

        <section className="rounded-lg border border-ops-border bg-ops-surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ops-gray">
            Soporte
          </h2>
          <p className="text-sm text-neutral-300">¿Necesitas ayuda?</p>
          <p className="mt-2 text-sm">
            {supportEmail.length > 0 ? (
              <a href={`mailto:${supportEmail}`} className="text-ops-green hover:underline">
                {supportEmail}
              </a>
            ) : (
              <span className="text-ops-gray">
                Configura NEXT_PUBLIC_SUPPORT_EMAIL en el despliegue para mostrar el correo de contacto.
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-ops-gray">Respondemos en menos de 24 horas</p>
        </section>
        </div>
      </DashboardShell>
    </PortalShell>
  );
}
