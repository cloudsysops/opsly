'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { DashboardView } from '@/components/admin/dashboard-view';
import { Button } from '@/components/ui/button';

const POLL_MS = 5000;

export default function AdminDashboard(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [range, setRange] = useState<'week' | 'month'>('week');

  const fetchDashboard = useCallback(
    async (isPoll = false): Promise<void> => {
      if (isPoll) setRefreshing(true);
      try {
        const response = await fetch(`/api/dashboard?range=${range}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        const dashboardData: DashboardData = await response.json();
        setData(dashboardData);
        setLastUpdated(new Date());
        setError('');
      } catch (err) {
        setError('No se pudo cargar el panel. Revisa la API y Supabase.');
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range]
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
        <p className="text-sm text-pk-sub">Cargando panel operativo…</p>
      </div>
    );
  }

  if (error || !data || !lastUpdated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-card">
          <p className="text-sm text-red-800">{error || 'Sin datos'}</p>
          <Button className="mt-4" onClick={() => void fetchDashboard()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      data={data}
      lastUpdated={lastUpdated}
      range={range}
      onRangeChange={setRange}
      onRefresh={() => void fetchDashboard(true)}
      refreshing={refreshing}
    />
  );
}
