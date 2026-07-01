'use client';

import { useEffect, useState } from 'react';
import { DashboardStatsGrid } from '@/components/dashboard/stats-cards';
import { DealPipelineChart, DealStageDistribution } from '@/components/charts/deal-pipeline-chart';
import { AccountGrowthChart, RevenueChart } from '@/components/charts/account-metrics';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalAccounts: 0,
    monthlyRevenue: 0,
    pipelineDeals: 0,
    pendingFollowups: 0,
  });
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetch data from API
        const [accountsRes, dealsRes, followupsRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/deals'),
          fetch('/api/followups?status=pending'),
        ]);

        const accounts = await accountsRes.json();
        const dealsData = await dealsRes.json();
        const followups = await followupsRes.json();

        // Calculate won deals in current month for revenue
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthlyWonDeals = dealsData.data?.filter((d: any) => {
          const closeDate = new Date(d.close_date);
          return d.stage === 'won' && closeDate >= currentMonth && closeDate < nextMonth;
        }) || [];
        const monthlyRevenue = monthlyWonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

        setDeals(dealsData.data || []);
        setStats({
          totalAccounts: accounts.data?.length || 0,
          monthlyRevenue,
          pipelineDeals: dealsData.data?.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost').length || 0,
          pendingFollowups: followups.data?.length || 0,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Derive chart data from actual deals
  const dealChartData = deals.reduce((acc: any[], deal: any) => {
    const existing = acc.find(d => d.stage === deal.stage);
    if (existing) {
      existing.count += 1;
      existing.value += deal.value || 0;
    } else {
      acc.push({ stage: deal.stage, count: 1, value: deal.value || 0 });
    }
    return acc;
  }, []);

  const stageDistribution = dealChartData.map(d => ({ name: d.stage, value: d.count }));

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <p className="text-sm text-gray-600 mt-2">Intenta recargando la página</p>
        </div>
      </div>
    );
  }

  // Placeholder growth data (shown if no historical analytics)
  const accountGrowthData = [
    { month: 'Ene', active: stats.totalAccounts * 0.3, prospects: stats.totalAccounts * 0.2, revenue: stats.monthlyRevenue * 0.2 },
    { month: 'Feb', active: stats.totalAccounts * 0.5, prospects: stats.totalAccounts * 0.25, revenue: stats.monthlyRevenue * 0.4 },
    { month: 'Mar', active: stats.totalAccounts * 0.7, prospects: stats.totalAccounts * 0.3, revenue: stats.monthlyRevenue * 0.7 },
    { month: 'Abr', active: stats.totalAccounts * 0.9, prospects: stats.totalAccounts * 0.35, revenue: stats.monthlyRevenue },
  ];

  const revenueData = [
    { month: 'Ene', revenue: stats.monthlyRevenue * 0.2, target: stats.monthlyRevenue * 0.3 },
    { month: 'Feb', revenue: stats.monthlyRevenue * 0.4, target: stats.monthlyRevenue * 0.3 },
    { month: 'Mar', revenue: stats.monthlyRevenue * 0.7, target: stats.monthlyRevenue * 0.6 },
    { month: 'Abr', revenue: stats.monthlyRevenue, target: stats.monthlyRevenue * 0.8 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Dashboard CRM</h1>
        <p className="text-gray-600 mb-8">Visión general de tu negocio en tiempo real</p>

        <DashboardStatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {dealChartData.length > 0 ? (
            <>
              <DealPipelineChart data={dealChartData} />
              <DealStageDistribution data={stageDistribution} />
            </>
          ) : (
            <div className="col-span-2 text-center text-gray-500 py-12">
              Sin datos de deals para mostrar
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AccountGrowthChart data={accountGrowthData} />
          <RevenueChart data={revenueData} />
        </div>
      </div>
    </div>
  );
}
