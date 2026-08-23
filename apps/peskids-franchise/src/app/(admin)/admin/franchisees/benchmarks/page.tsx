"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CalendarIcon,
  ChevronDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface Benchmark {
  year: number;
  month: number;
  networkMedianRevenue: number;
  networkAvgRevenue: number;
  networkTopQuartile: number;
  networkBottomQuartile: number;
  medianHomeRevenue: number | null;
  medianOnlineRevenue: number | null;
  medianRetailRevenue: number | null;
  medianSchoolRevenue: number | null;
  medianLessonsPerMonth: number | null;
  medianStudentsActive: number | null;
  medianTutorsActive: number | null;
  avgCustomerRetention: number | null;
  avgGrossMargin: number | null;
  avgCollectionRate: number | null;
  avgDaysToPayment: number | null;
  avgRevenueGrowthMoM: number | null;
  avgRevenueGrowthYoY: number | null;
  franchiseeCount: number;
}

interface FranchiseePerformance {
  id: string;
  name: string;
  email: string;
  revenue: number;
  percentile: number;
  vsMedian: number;
  trend: "up" | "down" | "stable";
  homeRevenue: number;
  onlineRevenue: number;
  retailRevenue: number;
  schoolRevenue: number;
  lessonsDelivered: number;
  activeStudents: number;
}

export default function BenchmarksPage() {
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [franchisees, setFranchisees] = useState<FranchiseePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchBenchmarks();
  }, [selectedYear, selectedMonth]);

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/benchmarks?year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await res.json();
      setBenchmark(data.benchmark);
      setFranchisees(data.franchisees || []);
    } catch (error) {
      console.error("Failed to fetch benchmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "-";
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return "text-green-600 bg-green-50";
    if (percentile >= 50) return "text-blue-600 bg-blue-50";
    if (percentile >= 25) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) {
    return (
      <WideContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Benchmarks</h1>
            <p className="mt-1 text-sm text-gray-500">
              Network-wide performance metrics and franchisee comparisons
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Network Summary Cards */}
        {benchmark ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Median Revenue</p>
                  <ChartBarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(Number(benchmark.networkMedianRevenue))}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Avg: {formatCurrency(Number(benchmark.networkAvgRevenue))}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Top Quartile</p>
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(Number(benchmark.networkTopQuartile))}
                </p>
                <p className="text-sm text-gray-500 mt-1">75th percentile</p>
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Bottom Quartile</p>
                  <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(Number(benchmark.networkBottomQuartile))}
                </p>
                <p className="text-sm text-gray-500 mt-1">25th percentile</p>
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Network Size</p>
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {benchmark.franchiseeCount}
                </p>
                <p className="text-sm text-gray-500 mt-1">Active franchisees</p>
              </div>
            </div>

            {/* Revenue by Category */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Revenue by Category (Network Median)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Home Tutoring</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(benchmark.medianHomeRevenue ? Number(benchmark.medianHomeRevenue) : null)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Online Tutoring</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(benchmark.medianOnlineRevenue ? Number(benchmark.medianOnlineRevenue) : null)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Retail/Club</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(benchmark.medianRetailRevenue ? Number(benchmark.medianRetailRevenue) : null)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">School Programs</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(benchmark.medianSchoolRevenue ? Number(benchmark.medianSchoolRevenue) : null)}
                  </p>
                </div>
              </div>
            </div>

            {/* Operational Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Operational Metrics (Network Averages)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Lessons/Month</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.medianLessonsPerMonth || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Students</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.medianStudentsActive || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Tutors</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.medianTutorsActive || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer Retention</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.avgCustomerRetention
                      ? `${benchmark.avgCustomerRetention.toFixed(0)}%`
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Ratios */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Financial Ratios
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Gross Margin</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.avgGrossMargin
                      ? `${benchmark.avgGrossMargin.toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Collection Rate</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.avgCollectionRate
                      ? `${benchmark.avgCollectionRate.toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days to Payment</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {benchmark.avgDaysToPayment
                      ? benchmark.avgDaysToPayment.toFixed(0)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">MoM Growth</p>
                  <p
                    className={`text-xl font-semibold ${
                      (benchmark.avgRevenueGrowthMoM || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {benchmark.avgRevenueGrowthMoM
                      ? formatPercent(benchmark.avgRevenueGrowthMoM)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">YoY Growth</p>
                  <p
                    className={`text-xl font-semibold ${
                      (benchmark.avgRevenueGrowthYoY || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {benchmark.avgRevenueGrowthYoY
                      ? formatPercent(benchmark.avgRevenueGrowthYoY)
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-yellow-500" />
            <p className="mt-2 text-yellow-800 font-medium">
              No benchmark data available for {months[selectedMonth - 1]} {selectedYear}
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              Benchmarks are calculated monthly when revenue data is synced.
            </p>
          </div>
        )}

        {/* Franchisee Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              Franchisee Performance Comparison
            </h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  vs Median
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lessons
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {franchisees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No franchisee data available for this period
                  </td>
                </tr>
              ) : (
                franchisees.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{f.name}</p>
                      <p className="text-sm text-gray-500">{f.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(f.revenue)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPercentileColor(
                          f.percentile
                        )}`}
                      >
                        {f.percentile}th
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={
                          f.vsMedian >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {formatPercent(f.vsMedian)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTrendIcon(f.trend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {f.lessonsDelivered}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {f.activeStudents}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WideContainer>
  );
}
