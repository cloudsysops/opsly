'use client';

import { TrendingUp } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
};

export function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-500">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className={`w-4 h-4 ${change >= 0 ? 'text-green-500' : 'text-red-500'} mr-1`} />
              <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(change)}% vs mes anterior
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

interface DashboardStatsGridProps {
  stats: {
    totalAccounts?: number;
    monthlyRevenue?: number;
    pipelineDeals?: number;
    pendingFollowups?: number;
  };
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard title="Total Cuentas" value={stats.totalAccounts || 0} change={12} icon={<span>👥</span>} color="blue" />
      <StatCard title="Revenue" value={`$${(stats.monthlyRevenue || 0).toLocaleString()}`} change={8} icon={<span>💰</span>} color="green" />
      <StatCard title="Deals" value={stats.pipelineDeals || 0} change={5} icon={<span>🎯</span>} color="purple" />
      <StatCard title="Seguimientos" value={stats.pendingFollowups || 0} change={-3} icon={<span>⚠️</span>} color="red" />
    </div>
  );
}
