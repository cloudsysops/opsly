'use client';

import { useEffect, useState, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RevenueBreakdown {
  home: number;
  online: number;
  retail: number;
  schools: number;
  other: number;
}

interface MonthlyBreakdown {
  month: number;
  home: number;
  online: number;
  retail: number;
  schools: number;
  other: number;
  total: number;
}

interface RevenueBreakdownChartProps {
  breakdown: RevenueBreakdown;
  percentages: RevenueBreakdown;
  monthlyBreakdown?: MonthlyBreakdown[];
  total: number;
  view?: 'pie' | 'bar';
  height?: number;
}

const CATEGORY_CONFIG = {
  home: { label: 'Home Lessons', color: '#2D2F8E' },
  online: { label: 'Online Lessons', color: '#6A469D' },
  retail: { label: 'Retail/Club', color: '#50C8DF' },
  schools: { label: 'School Programs', color: '#34B256' },
  other: { label: 'Other', color: '#F79A30' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    name: string;
    dataKey?: string;
    payload?: { month?: number };
  }>;
}

function PieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const config = CATEGORY_CONFIG[item.name as keyof typeof CATEGORY_CONFIG];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: config?.color || '#gray' }}
        />
        <span className="text-sm font-semibold text-gray-900">
          {config?.label || item.name}
        </span>
      </div>
      <p className="text-lg font-bold text-brand-navy">{formatCurrencyFull(item.value)}</p>
    </div>
  );
}

function BarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const monthIndex = payload[0]?.payload?.month;
  const monthName = monthIndex ? MONTHS[monthIndex - 1] : '';

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl p-4 min-w-[180px]">
      <p className="text-sm font-semibold text-gray-900 mb-3">{monthName}</p>
      <div className="space-y-2">
        {payload.map((item) => {
          const config = CATEGORY_CONFIG[item.dataKey as keyof typeof CATEGORY_CONFIG];
          if (!config || item.value === 0) return null;
          return (
            <div key={item.dataKey} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-xs text-gray-600">{config.label}</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {formatCurrencyFull(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RevenueBreakdownChart({
  breakdown,
  percentages,
  monthlyBreakdown = [],
  total,
  view = 'pie',
  height = 300,
}: RevenueBreakdownChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeView, setActiveView] = useState<'pie' | 'bar'>(view);
  const chartRef = useRef<HTMLDivElement>(null);

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

  // Prepare pie chart data
  const pieData = Object.entries(breakdown)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: key,
      value,
      label: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.label || key,
      color: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.color || '#gray',
    }));

  // Prepare bar chart data
  const barData = monthlyBreakdown.map((m) => ({
    month: m.month,
    name: MONTHS[m.month - 1],
    home: m.home,
    online: m.online,
    retail: m.retail,
    schools: m.schools,
    other: m.other,
  }));

  return (
    <div ref={chartRef} className="space-y-4">
      {/* View Toggle */}
      {monthlyBreakdown.length > 0 && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveView('pie')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeView === 'pie'
                  ? 'bg-white text-brand-navy shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveView('bar')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeView === 'bar'
                  ? 'bg-white text-brand-navy shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              By Month
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {activeView === 'pie' ? (
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Pie Chart */}
            <div className="w-full lg:w-1/2" style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={1200}
                    animationBegin={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend & Stats */}
            <div className="w-full lg:w-1/2 space-y-3">
              <div className="text-center lg:text-left mb-4">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-display font-bold text-brand-navy">
                  {formatCurrencyFull(total)}
                </p>
              </div>
              {pieData.map((item) => {
                const percent = percentages[item.name as keyof typeof percentages] || 0;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrencyFull(item.value)}</p>
                      <p className="text-xs text-gray-500">{percent.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height + 50}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<BarTooltip />} />
              <Legend
                formatter={(value) =>
                  CATEGORY_CONFIG[value as keyof typeof CATEGORY_CONFIG]?.label || value
                }
              />
              <Bar dataKey="home" stackId="a" fill={CATEGORY_CONFIG.home.color} />
              <Bar dataKey="online" stackId="a" fill={CATEGORY_CONFIG.online.color} />
              <Bar dataKey="retail" stackId="a" fill={CATEGORY_CONFIG.retail.color} />
              <Bar dataKey="schools" stackId="a" fill={CATEGORY_CONFIG.schools.color} />
              <Bar dataKey="other" stackId="a" fill={CATEGORY_CONFIG.other.color} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
