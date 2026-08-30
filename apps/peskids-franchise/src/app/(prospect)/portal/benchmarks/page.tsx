'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import dynamic_import from 'next/dynamic';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import {
  TrophyIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  HeartIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

// Dynamic import for Recharts to avoid SSR issues
const RechartsRadarChart = dynamic_import(
  () => import('recharts').then((mod) => {
    const { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } = mod;
    return {
      default: function RadarChartWrapper({ data, networkData }: { data: RadarDataPoint[]; networkData: RadarDataPoint[] }) {
        const chartData = data.map((d, i) => ({
          subject: d.subject,
          you: d.value,
          network: networkData[i]?.value || 0,
        }));
        return (
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
              />
              <Radar
                name="You"
                dataKey="you"
                stroke="#50C8DF"
                fill="#50C8DF"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Network Average"
                dataKey="network"
                stroke="#9ca3af"
                fill="#9ca3af"
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Legend
                wrapperStyle={{ paddingTop: '16px' }}
                iconType="circle"
              />
              <Tooltip
                formatter={(value: number | undefined) => `${Math.round(value || 0)}`}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );
      },
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan" />
      </div>
    ),
  }
);

const RechartsBarChart = dynamic_import(
  () => import('recharts').then((mod) => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = mod;
    return {
      default: function BarChartWrapper({ data }: { data: RevenueMonth[] }) {
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                  }).format(value || 0)
                }
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px' }} />
              <Bar
                dataKey="you"
                name="Your Revenue"
                fill="#50C8DF"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="networkMedian"
                name="Network Median"
                fill="#d1d5db"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="topPerformer"
                name="Top Performer"
                fill="#FACC29"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      },
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    ),
  }
);

// ============================================
// Types
// ============================================

interface RadarDataPoint {
  subject: string;
  value: number;
}

interface RevenueMonth {
  month: string;
  year: number;
  you: number;
  networkMedian: number;
  topPerformer: number;
}

interface CategoryItem {
  category: string;
  you: number;
  networkAverage: number;
  percentOfTotal: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  territory: string;
  revenue: number;
  lessons: number;
  students: number;
  growth: number;
  isYou: boolean;
}

interface GoalItem {
  name: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
}

interface BenchmarkData {
  period: { year: number; month: number };
  rank: { current: number; total: number; previousRank: number };
  percentile: number;
  growthRate: number;
  networkAvgGrowth: number;
  healthScore: {
    financial: number;
    operational: number;
    compliance: number;
    engagement: number;
    growth: number;
    overall: number;
    riskLevel: string;
    networkAverage: {
      financial: number;
      operational: number;
      compliance: number;
      engagement: number;
      growth: number;
      overall: number;
    };
  };
  revenueComparison: RevenueMonth[];
  categoryBreakdown: CategoryItem[];
  leaderboard: LeaderboardEntry[];
  goals: GoalItem[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ============================================
// Main Component
// ============================================

export default function BenchmarksPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/franchisee/benchmarks?year=${selectedYear}&month=${selectedMonth}`
      );
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setData(json);
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
      setError('Failed to load benchmark data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <WideContainer className="space-y-6 py-8">
        <LoadingSkeleton />
      </WideContainer>
    );
  }

  if (error || !data) {
    return (
      <WideContainer className="py-8">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">
              Unable to Load Benchmarks
            </h2>
            <p className="text-gray-600 mb-4">{error || 'Something went wrong.'}</p>
            <button
              onClick={() => fetchData()}
              className="fp-btn-primary inline-flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </WideContainer>
    );
  }

  const rankDelta = data.rank.previousRank - data.rank.current;
  const isRankUp = rankDelta > 0;
  const isRankDown = rankDelta < 0;

  const radarData: RadarDataPoint[] = [
    { subject: 'Financial', value: data.healthScore.financial },
    { subject: 'Operational', value: data.healthScore.operational },
    { subject: 'Compliance', value: data.healthScore.compliance },
    { subject: 'Engagement', value: data.healthScore.engagement },
    { subject: 'Growth', value: data.healthScore.growth },
  ];
  const radarNetworkData: RadarDataPoint[] = [
    { subject: 'Financial', value: data.healthScore.networkAverage.financial },
    { subject: 'Operational', value: data.healthScore.networkAverage.operational },
    { subject: 'Compliance', value: data.healthScore.networkAverage.compliance },
    { subject: 'Engagement', value: data.healthScore.networkAverage.engagement },
    { subject: 'Growth', value: data.healthScore.networkAverage.growth },
  ];

  return (
    <WideContainer className="space-y-8 py-8 pb-16">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div
        className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: 'linear-gradient(135deg, #2D2F8E 0%, #6A469D 50%, #50C8DF 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="bench-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100" height="100" fill="url(#bench-grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-white">
                Performance Benchmarks
              </h1>
            </div>
            <p className="text-white/80 font-body text-lg ml-14">
              See how you compare to the network
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer"
              style={{ backgroundImage: 'none' }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1} className="text-gray-900">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer"
              style={{ backgroundImage: 'none' }}
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y} className="text-gray-900">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SUMMARY CARDS */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up stagger-1">
        {/* Network Rank */}
        <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="h-5 w-5 text-emerald-600" />
              <span className="text-sm text-gray-500 font-medium">Network Rank</span>
            </div>
            <p className="text-3xl font-display font-bold text-emerald-700">
              #{data.rank.current}{' '}
              <span className="text-base font-normal text-gray-400">
                of {data.rank.total}
              </span>
            </p>
            {rankDelta !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${
                isRankUp ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {isRankUp ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
                <span>
                  {isRankUp ? '+' : ''}{rankDelta} from last month
                </span>
              </div>
            )}
            {rankDelta === 0 && (
              <p className="text-xs text-gray-400 mt-2">Same as last month</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue Percentile */}
        <Card className={`${
          data.percentile <= 25
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
            : data.percentile <= 50
            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
            : 'border-red-300 bg-gradient-to-br from-red-50 to-white'
        }`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <StarIcon className={`h-5 w-5 ${
                data.percentile <= 25 ? 'text-emerald-600'
                  : data.percentile <= 50 ? 'text-amber-600'
                  : 'text-red-500'
              }`} />
              <span className="text-sm text-gray-500 font-medium">Revenue Percentile</span>
            </div>
            <p className={`text-3xl font-display font-bold ${
              data.percentile <= 25 ? 'text-emerald-700'
                : data.percentile <= 50 ? 'text-amber-700'
                : 'text-red-600'
            }`}>
              Top {data.percentile}%
            </p>
            <p className="text-xs text-gray-400 mt-2">of all franchisees</p>
          </CardContent>
        </Card>

        {/* Growth Rate */}
        <Card className={`${
          data.growthRate >= 0
            ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-white'
            : 'border-orange-300 bg-gradient-to-br from-orange-50 to-white'
        }`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              {data.growthRate >= 0 ? (
                <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-5 w-5 text-orange-600" />
              )}
              <span className="text-sm text-gray-500 font-medium">Growth Rate</span>
            </div>
            <p className={`text-3xl font-display font-bold ${
              data.growthRate >= 0 ? 'text-blue-700' : 'text-orange-600'
            }`}>
              {data.growthRate >= 0 ? '+' : ''}{data.growthRate}%
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Network avg: {data.networkAvgGrowth >= 0 ? '+' : ''}{data.networkAvgGrowth}%
            </p>
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card className={`${
          data.healthScore.overall >= 70
            ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-white'
            : data.healthScore.overall >= 50
            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
            : 'border-red-300 bg-gradient-to-br from-red-50 to-white'
        }`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <HeartIcon className={`h-5 w-5 ${
                data.healthScore.overall >= 70 ? 'text-purple-600'
                  : data.healthScore.overall >= 50 ? 'text-amber-600'
                  : 'text-red-500'
              }`} />
              <span className="text-sm text-gray-500 font-medium">Health Score</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-display font-bold ${
                data.healthScore.overall >= 70 ? 'text-purple-700'
                  : data.healthScore.overall >= 50 ? 'text-amber-700'
                  : 'text-red-600'
              }`}>
                {Math.round(data.healthScore.overall)}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                getRiskBadgeClasses(data.healthScore.riskLevel)
              }`}>
                {data.healthScore.riskLevel}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Network avg: {Math.round(data.healthScore.networkAverage.overall)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* RADAR CHART - Health Score Components */}
      {/* ============================================ */}
      <Card className="animate-slide-up stagger-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50">
              <SparklesIcon className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">
                Performance Radar
              </h2>
              <p className="text-sm text-gray-500">
                Your scores vs. the network average across 5 key dimensions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RechartsRadarChart data={radarData} networkData={radarNetworkData} />

          {/* Score Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-gray-100">
            {radarData.map((d, i) => {
              const diff = d.value - radarNetworkData[i].value;
              const colors = ['#059669', '#0891b2', '#6A469D', '#d97706', '#34B256'];
              return (
                <div
                  key={d.subject}
                  className="text-center p-3 rounded-xl bg-gray-50"
                >
                  <p className="text-xs text-gray-500 font-medium mb-1">{d.subject}</p>
                  <p className="text-2xl font-display font-bold" style={{ color: colors[i] }}>
                    {Math.round(d.value)}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${
                    diff >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {diff >= 0 ? '+' : ''}{Math.round(diff)} vs avg
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* REVENUE COMPARISON BAR CHART */}
      {/* ============================================ */}
      <Card className="animate-slide-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">
                Revenue Comparison
              </h2>
              <p className="text-sm text-gray-500">
                Your revenue vs. network median and top performer (last 6 months)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RechartsBarChart data={data.revenueComparison} />
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* CATEGORY BREAKDOWN + GOAL TRACKING */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="animate-slide-up stagger-4">
          <CardHeader>
            <h2 className="font-display text-lg font-bold text-gray-900">
              Revenue by Category
            </h2>
            <p className="text-sm text-gray-500">
              Breakdown with network comparison
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.categoryBreakdown.map((cat) => {
              const maxVal = Math.max(cat.you, cat.networkAverage, 1);
              const youPercent = (cat.you / maxVal) * 100;
              const netPercent = (cat.networkAverage / maxVal) * 100;
              const isAbove = cat.you >= cat.networkAverage;

              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {cat.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({cat.percentOfTotal}% of total)
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${
                      isAbove ? 'text-emerald-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(cat.you)}
                    </span>
                  </div>
                  {/* Your bar */}
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                        isAbove
                          ? 'bg-gradient-to-r from-[#50C8DF] to-[#34B256]'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(youPercent, 100)}%` }}
                    />
                  </div>
                  {/* Network bar (thinner) */}
                  <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gray-300"
                      style={{ width: `${Math.min(netPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-400">
                      Network avg: {formatCurrency(cat.networkAverage)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Goal Tracking */}
        <Card className="animate-slide-up stagger-5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50">
                <SparklesIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Goal Tracking
                </h2>
                <p className="text-sm text-gray-500">
                  Targets based on reaching the 75th percentile
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.goals.map((goal) => (
              <GoalCard key={goal.name} goal={goal} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* LEADERBOARD TABLE */}
      {/* ============================================ */}
      <Card className="animate-slide-up stagger-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50">
              <TrophyIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">
                Network Leaderboard
              </h2>
              <p className="text-sm text-gray-500">
                {MONTHS[data.period.month - 1]} {data.period.year} rankings (anonymized)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                    Rank
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                    Franchisee
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                    Revenue
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3 hidden sm:table-cell">
                    Lessons
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3 hidden md:table-cell">
                    Students
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.name}`}
                    className={`border-b border-gray-50 transition-colors ${
                      entry.isYou
                        ? 'bg-[#50C8DF]/10 hover:bg-[#50C8DF]/15'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {entry.rank === 1 && (
                          <span className="text-xl" role="img" aria-label="gold medal">
                            {'\uD83E\uDD47'}
                          </span>
                        )}
                        {entry.rank === 2 && (
                          <span className="text-xl" role="img" aria-label="silver medal">
                            {'\uD83E\uDD48'}
                          </span>
                        )}
                        {entry.rank === 3 && (
                          <span className="text-xl" role="img" aria-label="bronze medal">
                            {'\uD83E\uDD49'}
                          </span>
                        )}
                        {entry.rank > 3 && (
                          <span className="text-sm font-bold text-gray-400 w-7 text-center">
                            {entry.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`text-sm font-semibold ${
                          entry.isYou ? 'text-brand-navy' : 'text-gray-800'
                        }`}>
                          {entry.name}
                          {entry.isYou && (
                            <span className="ml-2 text-xs font-bold text-[#50C8DF] bg-[#50C8DF]/10 px-2 py-0.5 rounded-full">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{entry.territory}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-bold ${
                        entry.isYou ? 'text-brand-navy' : 'text-gray-700'
                      }`}>
                        {formatCurrency(entry.revenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <span className="text-sm text-gray-600">
                        {formatNumber(entry.lessons)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      <span className="text-sm text-gray-600">
                        {formatNumber(entry.students)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-semibold ${
                        entry.growth >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {entry.growth >= 0 ? '+' : ''}{entry.growth}%
                      </span>
                    </td>
                  </tr>
                ))}

                {data.leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </WideContainer>
  );
}

// ============================================
// Sub-Components
// ============================================

function GoalCard({ goal }: { goal: GoalItem }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goal.progress / 100) * circumference;

  const progressColor = goal.progress >= 100
    ? '#059669'
    : goal.progress >= 75
    ? '#50C8DF'
    : goal.progress >= 50
    ? '#d97706'
    : '#9ca3af';

  return (
    <div className="flex items-center gap-5 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
      {/* Progress Ring */}
      <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
        <svg width={96} height={96} className="transform -rotate-90">
          <circle
            cx={48}
            cy={48}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={6}
          />
          <circle
            cx={48}
            cy={48}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-display font-bold" style={{ color: progressColor }}>
            {goal.progress}%
          </span>
        </div>
      </div>

      {/* Goal Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-display font-bold text-gray-900 mb-0.5">
          {goal.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{goal.description}</p>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400">Current</p>
            <p className="text-sm font-semibold text-gray-800">
              {goal.unit === 'currency' ? formatCurrency(goal.current) : formatNumber(goal.current)}
            </p>
          </div>
          <div className="text-gray-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Target</p>
            <p className="text-sm font-semibold text-gray-800">
              {goal.unit === 'currency' ? formatCurrency(goal.target) : formatNumber(goal.target)}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Badge */}
      {goal.progress >= 100 && (
        <div className="flex-shrink-0 p-2 rounded-full bg-emerald-100">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-36 bg-gray-200 rounded-3xl" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* Radar chart skeleton */}
      <div className="h-[450px] bg-gray-200 rounded-2xl" />

      {/* Bar chart skeleton */}
      <div className="h-[420px] bg-gray-200 rounded-2xl" />

      {/* Two columns skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-gray-200 rounded-2xl" />
        <div className="h-[400px] bg-gray-200 rounded-2xl" />
      </div>

      {/* Table skeleton */}
      <div className="h-[350px] bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function getRiskBadgeClasses(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW':
      return 'bg-emerald-100 text-emerald-700';
    case 'MODERATE':
      return 'bg-blue-100 text-blue-700';
    case 'ELEVATED':
      return 'bg-amber-100 text-amber-700';
    case 'HIGH':
      return 'bg-orange-100 text-orange-700';
    case 'CRITICAL':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
