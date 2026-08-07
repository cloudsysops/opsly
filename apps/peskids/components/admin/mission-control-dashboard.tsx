'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { MissionControlChrome } from '@/components/mission-control/mission-control-chrome';
import { MissionControlKpiStrip } from '@/components/admin/mission-control-kpi-strip';
import { MissionControlPipelineBoard } from '@/components/admin/mission-control-pipeline-board';
import { MissionControlActivityPanel } from '@/components/admin/mission-control-activity-panel';
import { MissionControlAgentsPanel } from '@/components/admin/mission-control-agents-panel';
import { MissionControlPerformance } from '@/components/admin/mission-control-performance';
import { Button } from '@/components/ui/button';
import { RoleSwitcher } from '@/components/admin/role-switcher';
import { FranchiseFilterSelect } from '@/components/admin/franchise-filter-select';

const POLL_MS = 5000;

export type StaffMissionControlSurface = 'admin' | 'support';

interface MissionControlDashboardProps {
  surface?: StaffMissionControlSurface;
}

/** Ops Mission Control for admin + support (same data, role-aware login/chrome). */
export function MissionControlDashboard({
  surface = 'admin',
}: MissionControlDashboardProps): React.ReactElement {
  const router = useRouter();
  const loginPath = surface === 'support' ? '/support/login' : '/admin/login';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [franchiseId, setFranchiseId] = useState('');

  const fetchDashboard = useCallback(
    async (isPoll = false): Promise<void> => {
      if (isPoll) setRefreshing(true);
      try {
        const params = new URLSearchParams({ range: 'week' });
        if (franchiseId) params.set('franchise_id', franchiseId);
        const response = await fetch(`/api/dashboard?${params.toString()}`, {
          credentials: 'include',
        });
        if (response.status === 401 || response.status === 403) {
          router.replace(loginPath);
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        const dashboardData: DashboardData = await response.json();
        setData(dashboardData);
        setLastUpdated(new Date());
        setError('');
      } catch (err) {
        setError('No se pudo cargar Mission Control. Intenta refrescar.');
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, loginPath, franchiseId]
  );

  useEffect(() => {
    void fetchDashboard();
    const interval = setInterval(() => void fetchDashboard(true), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pk-bg">
        <Loader2 className="h-10 w-10 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">
          {surface === 'support'
            ? 'Cargando Mission Control de soporte…'
            : 'Cargando Mission Control…'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-card dark:border-red-400/30 dark:bg-red-400/10">
          <p className="text-sm text-red-800 dark:text-red-300">{error || 'Sin datos'}</p>
          <Button className="mt-4" onClick={() => void fetchDashboard()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const body = (
    <MissionControlChrome
      audience={surface}
      title={`${data.executive.greeting}. Aquí está lo que requiere atención hoy.`}
      summary={data.executive.summary_line}
      actions={
        surface === 'support' ? (
          <>
            <FranchiseFilterSelect
              className="min-w-[200px]"
              value={franchiseId}
              onChange={setFranchiseId}
            />
            <RoleSwitcher />
          </>
        ) : undefined
      }
    >
      <MissionControlKpiStrip data={data} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0 rounded-3xl border border-pk-border bg-pk-surface p-4 shadow-sm sm:p-5">
          <MissionControlPipelineBoard />
        </section>
        <aside className="min-w-0">
          <MissionControlActivityPanel data={data} />
        </aside>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <MissionControlPerformance data={data} />
        {surface === 'admin' ? <MissionControlAgentsPanel /> : (
          <section className="rounded-3xl border border-pk-border bg-pk-surface p-5 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
              Accesos rápidos
            </p>
            <ul className="mt-3 space-y-2 text-sm text-pk-ink">
              <li>
                <a className="text-pk-primary underline-offset-2 hover:underline" href="/admin/messages">
                  Mensajes
                </a>
              </li>
              <li>
                <a className="text-pk-primary underline-offset-2 hover:underline" href="/admin/pipeline">
                  Pipeline completo
                </a>
              </li>
              <li>
                <a className="text-pk-primary underline-offset-2 hover:underline" href="/admin">
                  Dashboard clásico
                </a>
              </li>
            </ul>
          </section>
        )}
      </div>
    </MissionControlChrome>
  );

  if (surface === 'support') {
    return (
      <div className="min-h-screen bg-pk-bg px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl">{body}</div>
        {lastUpdated ? (
          <p className="mx-auto mt-4 max-w-7xl text-xs text-pk-mutedText">
            Actualizado {lastUpdated.toLocaleTimeString('es-CO')}
            {refreshing ? ' · refrescando…' : ''}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <AdminShell lastUpdated={lastUpdated} onRefresh={() => void fetchDashboard(true)} refreshing={refreshing}>
      {body}
    </AdminShell>
  );
}
