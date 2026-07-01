'use client';

import { useEffect, useState } from 'react';
import { DashboardStatsGrid } from '@/components/dashboard/stats-cards';
import { DealPipelineChart, DealStageDistribution } from '@/components/charts/deal-pipeline-chart';
import { AccountGrowthChart, RevenueChart } from '@/components/charts/account-metrics';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        const deals = await dealsRes.json();
        const followups = await followupsRes.json();

        setStats({
          totalAccounts: accounts.data?.length || 0,
          monthlyRevenue: deals.data?.reduce((sum: number, d: any) => sum + (d.value || 0), 0) || 0,
          pipelineDeals: deals.data?.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost').length || 0,
          pendingFollowups: followups.data?.length || 0,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const dealChartData = [
    { stage: 'Lead', count: 12, value: 25000 },
    { stage: 'Qualified', count: 8, value: 40000 },
    { stage: 'Proposal', count: 5, value: 75000 },
    { stage: 'Negotiation', count: 3, value: 100000 },
  ];

  const stageDistribution = [
    { name: 'Lead', value: 12 },
    { name: 'Qualified', value: 8 },
    { name: 'Proposal', value: 5 },
    { name: 'Negotiation', value: 3 },
  ];

  const accountGrowthData = [
    { month: 'Ene', active: 20, prospects: 15, revenue: 50000 },
    { month: 'Feb', active: 25, prospects: 18, revenue: 65000 },
    { month: 'Mar', active: 30, prospects: 22, revenue: 85000 },
    { month: 'Abr', active: 32, prospects: 25, revenue: 95000 },
  ];

  const revenueData = [
    { month: 'Ene', revenue: 50000, target: 60000 },
    { month: 'Feb', revenue: 65000, target: 60000 },
    { month: 'Mar', revenue: 85000, target: 75000 },
    { month: 'Abr', revenue: 95000, target: 90000 },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Dashboard CRM</h1>
        <p className="text-gray-600 mb-8">Visión general de tu negocio en tiempo real</p>

        <DashboardStatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <DealPipelineChart data={dealChartData} />
          <DealStageDistribution data={stageDistribution} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AccountGrowthChart data={accountGrowthData} />
          <RevenueChart data={revenueData} />
        </div>
      </div>
    </div>
  );
}
