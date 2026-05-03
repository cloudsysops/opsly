import type { ReactElement } from 'react';
import { DashboardShell, PageLead } from '@/components/dashboard/premium-dashboard';
import { ShieldDashboardClient } from '@/components/shield/shield-dashboard-client';
import { PortalShell } from '@/components/layout/portal-shell';
import { requirePortalPayloadWithShield } from '@/lib/portal-server';

export default async function ShieldDashboardPage(): Promise<ReactElement> {
  const { payload, shieldScore } = await requirePortalPayloadWithShield();

  return (
    <PortalShell title={`Opsly Shield — ${payload.slug}`} showModeLink>
      <DashboardShell>
        <PageLead>
          Guardian Grid: puntuación de seguridad, tendencia y hallazgos de secretos. Las alertas
          Discord se configuran vía API (`POST /api/shield/alerts/config`).
        </PageLead>
        <ShieldDashboardClient tenantSlug={payload.slug} initialScore={shieldScore} />
      </DashboardShell>
    </PortalShell>
  );
}
