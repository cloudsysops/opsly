import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { ServiceCard } from "@/components/service-card";
import { healthFromReachable } from "@/components/status-badge";
import { requirePortalPayload } from "@/lib/portal-server";

export default async function ManagedDashboardPage(): Promise<ReactElement> {
  const data = await requirePortalPayload();
  if (data.mode === "developer") {
    redirect("/dashboard/developer");
  }
  if (data.mode === null) {
    redirect("/dashboard");
  }

  const allHealthy = data.health.n8n_reachable && data.health.uptime_reachable;
  const displayName = data.name || data.slug;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";

  return (
    <PortalShell title={`Tus Automatizaciones — ${displayName}`} showModeLink>
      <div className="space-y-8">
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

        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>

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
    </PortalShell>
  );
}
