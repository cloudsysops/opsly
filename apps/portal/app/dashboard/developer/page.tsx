import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { CredentialReveal } from "@/components/credential-reveal";
import { DeveloperActions } from "@/components/developer-actions";
import { LlmUsageCard } from "@/components/llm-usage-card";
import { PortalShell } from "@/components/portal-shell";
import { ServiceCard } from "@/components/service-card";
import { healthFromReachable } from "@/components/status-badge";
import { requirePortalPayloadWithUsage } from "@/lib/portal-server";

const DEFAULT_N8N_USER = "admin";

export default async function DeveloperDashboardPage(): Promise<ReactElement> {
  const { payload: data, usage } = await requirePortalPayloadWithUsage();
  if (data.mode === "managed") {
    redirect("/dashboard/managed");
  }
  if (data.mode === null) {
    redirect("/dashboard");
  }

  const n8nUser = data.services.n8n_user ?? DEFAULT_N8N_USER;

  return (
    <PortalShell title={`Panel Developer — ${data.slug}`} showModeLink>
      <div className="space-y-8">
        <LlmUsageCard usage={usage} />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ops-gray">Servicios</h2>
          <div className="grid gap-4">
            <ServiceCard
              title="n8n"
              url={data.services.n8n_url}
              actionLabel="Abrir n8n"
              showHealth
              health={healthFromReachable(data.health.n8n_reachable)}
              healthLabel={data.health.n8n_reachable ? "Activo" : "Inactivo"}
            >
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-ops-gray">Usuario: </span>
                  <span className="font-mono">{n8nUser}</span>
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-ops-gray">Password: </span>
                  <CredentialReveal password={data.services.n8n_password} />
                </p>
              </div>
            </ServiceCard>

            <ServiceCard
              title="Uptime Kuma"
              url={data.services.uptime_url}
              actionLabel="Abrir Uptime"
              showHealth
              health={healthFromReachable(data.health.uptime_reachable)}
              healthLabel={data.health.uptime_reachable ? "healthy" : "unhealthy"}
            />
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-ops-border bg-ops-surface p-4">
          <h2 className="text-sm font-semibold text-ops-gray">Info técnica</h2>
          <ul className="space-y-1 text-sm text-neutral-300">
            <li>
              <span className="text-ops-gray">Plan: </span>
              {data.plan}
            </li>
            <li>
              <span className="text-ops-gray">Slug: </span>
              {data.slug}
            </li>
            <li>
              <span className="text-ops-gray">ID tenant: </span>
              <span className="font-mono text-xs">{data.tenant_id}</span>
            </li>
            <li>
              <span className="text-ops-gray">Creado: </span>
              {new Date(data.created_at).toLocaleString("es")}
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ops-gray">Acciones</h2>
          <DeveloperActions
            n8nUrl={data.services.n8n_url}
            n8nUser={data.services.n8n_user}
            n8nPassword={data.services.n8n_password}
          />
        </section>
      </div>
    </PortalShell>
  );
}
