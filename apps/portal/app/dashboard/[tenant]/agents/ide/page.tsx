import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { PortalShell } from '@/components/layout/portal-shell';
import { requirePortalPayloadWithToken } from '@/lib/portal-server';
import { PortalAgentIdeConsole } from './portal-agent-ide-console';

export default async function PortalAgentIdePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  const { payload, accessToken } = await requirePortalPayloadWithToken();
  if (tenant !== payload.slug) {
    redirect(`/dashboard/${payload.slug}/agents/ide`);
  }

  return (
    <PortalShell title={`IDE Octopus - ${tenant}`} showModeLink tenantSlug={tenant}>
      <DashboardShell>
        <div className="space-y-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ops-green">
              Agent Operations
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-100">
              IDE Octopus para agentes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Consola tenant-aware para supervisar comandos, sesiones y tools MCP permitidas sin exponer
              endpoints internos del orchestrator al navegador.
            </p>
          </div>
          <PortalAgentIdeConsole accessToken={accessToken} tenantSlug={tenant} plan={payload.plan} />
        </div>
      </DashboardShell>
    </PortalShell>
  );
}
