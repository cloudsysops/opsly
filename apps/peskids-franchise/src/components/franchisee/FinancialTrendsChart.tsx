'use client';

import { useEffect, useState, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MonthlyData {
  month: string;
  revenue: number;
  networkAverage: number;
  lessons?: number;
  students?: number;
}

interface FinancialTrendsChartProps {
  data: MonthlyData[];
  showNetworkComparison?: boolean;
  height?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((p) => p.dataKey === 'revenue')?.value || 0;
  const networkAvg = payload.find((p) => p.dataKey === 'networkAverage')?.value || 0;
  const diff = revenue - networkAvg;
  const percentDiff = networkAvg > 0 ? ((diff / networkAvg) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Your Revenue</span>
          <span className="text-sm font-bold text-brand-navy">
            {formatCurrencyFull(revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Network Avg</span>
          <span className="text-sm font-medium text-gray-500">
            {formatCurrencyFull(networkAvg)}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">vs. Network</span>
            <span
              className={`text-sm font-bold ${
                diff >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {diff >= 0 ? '+' : ''}{percentDiff}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinancialTrendsChart({
  data,
  showNetworkComparison = true,
  height = 300,
}: FinancialTrendsChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'lessons'>('revenue');
  const chartRef = useRef<HTMLDivElement>(null);

  // Animation trigger on visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Calculate summary stats
  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  const momGrowth = previousMonth
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
    : 0;

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const networkAverageTotal = data.reduce((sum, d) => sum + d.networkAverage, 0) / data.length;
  const vsNetworkPercent = ((avgRevenue - networkAverageTotal) / networkAverageTotal) * 100;

  return (
    <div ref={chartRef} className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fp-card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            This Month
          </p>
          <p className="text-2xl font-display font-bold text-brand-navy mt-1">
            {formatCurrency(currentMonth.revenue)}
          </p>
          {momGrowth !== 0 && (
            <p
              className={`text-xs font-semibold mt-1 ${
                momGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {momGrowth >= 0 ? '+' : ''}{momGrowth.toFixed(1)}% MoM
            </p>
          )}
        </div>

        <div className="fp-card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Period Total
          </p>
          <p className="text-2xl font-display font-bold text-gray-900 mt-1">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last {data.length} months
          </p>
        </div>

        <div className="fp-card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Monthly Avg
          </p>
          <p className="text-2xl font-display font-bold text-brand-cyan mt-1">
            {formatCurrency(avgRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your average
          </p>
        </div>

        <div className="fp-card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            vs. Network
          </p>
          <p
            className={`text-2xl font-display font-bold mt-1 ${
              vsNetworkPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {vsNetworkPercent >= 0 ? '+' : ''}{vsNetworkPercent.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {vsNetworkPercent >= 0 ? 'Above' : 'Below'} average
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        className="fp-card p-6"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-semibold text-gray-900">
            Revenue Trend
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-navy" />
              <span className="text-xs text-gray-600">Your Revenue</span>
            </div>
            {showNetworkComparison && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-600">Network Avg</span>
              </div>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2D2F8E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2D2F8E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="networkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9ca3af" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={formatCurrency}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            {showNetworkComparison && (
              <Area
                type="monotone"
                dataKey="networkAverage"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#networkGradient)"
                animationDuration={1500}
                animationBegin={300}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2D2F8E"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              animationDuration={1500}
              animationBegin={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
