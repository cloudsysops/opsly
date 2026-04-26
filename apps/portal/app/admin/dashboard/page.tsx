import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/layout/portal-shell';
import { SuperAdminDashboard } from '@/components/super-admin-dashboard';
import { fetchSuperAdminMetrics, fetchSuperAdminTenants } from '@/lib/admin-api';
import { getApiBaseUrlServer } from '@/lib/api-server';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function SuperAdminDashboardPage(): Promise<ReactElement> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect('/login');
  }

  const apiBase = await getApiBaseUrlServer();
  const token = session.access_token;

  const [metrics, tenants] = await Promise.all([
    fetchSuperAdminMetrics(token, apiBase),
    fetchSuperAdminTenants(token, 25, 0, apiBase),
  ]);

  return (
    <PortalShell title="Super Admin">
      <div className="mb-6">
        <h1 className="font-mono text-xl text-white">Panel ejecutivo</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Visión global de tenants, ingresos y cola de orquestación.
        </p>
      </div>
      <SuperAdminDashboard
        initialMetrics={metrics}
        initialTenants={tenants}
        accessToken={token}
        apiBase={apiBase}
      />
    </PortalShell>
  );
}
