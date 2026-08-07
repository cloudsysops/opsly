'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { MissionControlKpiStrip } from '@/components/admin/mission-control-kpi-strip';
import { MissionControlPipelineBoard } from '@/components/admin/mission-control-pipeline-board';
import { MissionControlActivityPanel } from '@/components/admin/mission-control-activity-panel';
import { MissionControlAgentsPanel } from '@/components/admin/mission-control-agents-panel';
import { MissionControlPerformance } from '@/components/admin/mission-control-performance';
import { Button } from '@/components/ui/button';

const POLL_MS = 5000;

/** Same fetch/poll/auth-redirect pattern as staff-dashboard.tsx — reuses
 * the existing /api/dashboard endpoint (data.executive already has
 * everything this view needs: kpis, agenda_today, recent_activity, funnel).
 * No new backend routes. */
export function MissionControlDashboard(): React.ReactElement {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(
    async (isPoll = false): Promise<void> => {
      if (isPoll) setRefreshing(true);
      try {
        const response = await fetch('/api/dashboard?range=week', { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          router.replace('/admin/login');
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
    [router]
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
        <p className="text-sm text-pk-sub">Cargando Mission Control…</p>
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

  return (
    <AdminShell lastUpdated={lastUpdated} onRefresh={() => void fetchDashboard(true)} refreshing={refreshing}>
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
          Peskids / Mission Control
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
          {data.executive.greeting}. Aquí está lo que requiere atención hoy.
        </h1>
        <p className="mt-1 text-sm text-pk-sub">{data.executive.summary_line}</p>
      </div>

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
        <MissionControlAgentsPanel />
      </div>
    </AdminShell>
  );
}
