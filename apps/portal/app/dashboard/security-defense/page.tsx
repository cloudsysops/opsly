import type { ReactElement } from 'react';
import { DashboardShell, PageLead } from '@/components/dashboard/premium-dashboard';
import { ShieldDashboardClient } from '@/components/shield/shield-dashboard-client';
import { PortalShell } from '@/components/layout/portal-shell';
import { requirePortalPayloadWithShield } from '@/lib/portal-server';

export default async function SecurityDefenseDashboardPage(): Promise<ReactElement> {
  const { payload, shieldScore } = await requirePortalPayloadWithShield();

  return (
    <PortalShell title={`Security Defense — ${payload.slug}`} showModeLink>
      <DashboardShell>
        <PageLead>
          Guardian Grid: puntuación de seguridad, tendencia y hallazgos de secretos en tiempo real
          para {payload.slug}.
        </PageLead>
        <ShieldDashboardClient tenantSlug={payload.slug} initialScore={shieldScore} />
      </DashboardShell>
    </PortalShell>
  );
}
