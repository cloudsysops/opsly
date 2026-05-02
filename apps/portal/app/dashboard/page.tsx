import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { DashboardShell, PageLead } from '@/components/dashboard/premium-dashboard';
import { ModeSelector } from '@/components/mode-selector';
import { PortalShell } from '@/components/layout/portal-shell';
import { createServerSupabase } from '@/lib/supabase/server';
import { isPortalDemoSession } from '@/lib/demo-session';

export default async function DashboardSelectorPage(): Promise<ReactElement> {
  if (await isPortalDemoSession()) {
    return (
      <PortalShell title="Elige cómo trabajar">
        <DashboardShell>
          <PageLead>
            Elige si administras la infraestructura (developer), prefieres vista guiada (managed) o
            activas defensa de seguridad (security defense).
          </PageLead>
          <ModeSelector />
        </DashboardShell>
      </PortalShell>
    );
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <PortalShell title="Elige cómo trabajar">
      <DashboardShell>
        <PageLead>
          Elige si administras la infraestructura (developer), prefieres vista guiada (managed) o
          activas defensa de seguridad (security defense).
        </PageLead>
        <ModeSelector />
      </DashboardShell>
    </PortalShell>
  );
}
