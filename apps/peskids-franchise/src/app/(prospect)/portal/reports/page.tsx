'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import { formatCurrency } from '@/lib/utils';
import {
  CurrencyDollarIcon,
  AcademicCapIcon,
  UsersIcon,
  UserGroupIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowDownTrayIcon,
  TableCellsIcon,
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
  DocumentChartBarIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer as RechartsContainer,
} from 'recharts';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  metrics: string[];
  metricLabels: Record<string, string>;
  currencyFields: Set<string>;
  percentFields: Set<string>;
  chartColors: string[];
}

interface MonthData {
  year: number;
  month: number;
  label: string;
  [key: string]: string | number;
}

interface ReportData {
  months: MonthData[];
  totals: Record<string, number>;
  averages: Record<string, number>;
  reportType: string;
}

type ChartView = 'bar' | 'line' | 'table';
type SortDirection = 'asc' | 'desc';

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const BRAND_COLORS = ['#2D2F8E', '#6A469D', '#50C8DF', '#34B256', '#FACC29', '#F79A30'];

const REPORT_TYPES: ReportType[] = [
  {
    id: 'revenue',
    name: 'Revenue Report',
    description: 'Monthly revenue breakdown by category',
    icon: CurrencyDollarIcon,
    metrics: ['grossRevenue', 'homeRevenue', 'onlineRevenue', 'retailRevenue', 'schoolRevenue', 'otherRevenue'],
    metricLabels: {
      grossRevenue: 'Gross Revenue',
      homeRevenue: 'Home',
      onlineRevenue: 'Online',
      retailRevenue: 'Retail',
      schoolRevenue: 'Schools',
      otherRevenue: 'Other',
    },
    currencyFields: new Set(['grossRevenue', 'homeRevenue', 'onlineRevenue', 'retailRevenue', 'schoolRevenue', 'otherRevenue']),
    percentFields: new Set(),
    chartColors: BRAND_COLORS,
  },
  {
    id: 'lessons',
    name: 'Lessons Report',
    description: 'Lessons delivered over time',
    icon: AcademicCapIcon,
    metrics: ['totalLessons', 'activeStudents', 'activeTutors', 'totalHours'],
    metricLabels: {
      totalLessons: 'Total Lessons',
      activeStudents: 'Active Students',
      activeTutors: 'Active Tutors',
      totalHours: 'Total Hours',
    },
    currencyFields: new Set(),
    percentFields: new Set(),
    chartColors: BRAND_COLORS,
  },
  {
    id: 'students',
    name: 'Student Report',
    description: 'Student count trends and engagement',
    icon: UsersIcon,
    metrics: ['activeStudents', 'totalLessons', 'lessonsPerStudent'],
    metricLabels: {
      activeStudents: 'Active Students',
      totalLessons: 'Total Lessons',
      lessonsPerStudent: 'Lessons/Student',
    },
    currencyFields: new Set(),
    percentFields: new Set(),
    chartColors: ['#2D2F8E', '#50C8DF', '#34B256'],
  },
  {
    id: 'tutors',
    name: 'Tutor Report',
    description: 'Tutor utilization and productivity',
    icon: UserGroupIcon,
    metrics: ['activeTutors', 'totalLessons', 'totalHours', 'lessonsPerTutor', 'hoursPerTutor'],
    metricLabels: {
      activeTutors: 'Active Tutors',
      totalLessons: 'Total Lessons',
      totalHours: 'Total Hours',
      lessonsPerTutor: 'Lessons/Tutor',
      hoursPerTutor: 'Hours/Tutor',
    },
    currencyFields: new Set(),
    percentFields: new Set(),
    chartColors: ['#6A469D', '#2D2F8E', '#50C8DF', '#34B256', '#F79A30'],
  },
  {
    id: 'financial',
    name: 'Financial Summary',
    description: 'P&L overview with profit margins',
    icon: ChartBarIcon,
    metrics: ['grossRevenue', 'tutorPay', 'adHocPay', 'totalCOGS', 'grossProfit', 'profitMargin'],
    metricLabels: {
      grossRevenue: 'Gross Revenue',
      tutorPay: 'Tutor Pay',
      adHocPay: 'Ad Hoc Pay',
      totalCOGS: 'Total COGS',
      grossProfit: 'Gross Profit',
      profitMargin: 'Margin %',
    },
    currencyFields: new Set(['grossRevenue', 'tutorPay', 'adHocPay', 'totalCOGS', 'grossProfit']),
    percentFields: new Set(['profitMargin']),
    chartColors: ['#2D2F8E', '#F79A30', '#FACC29', '#dc2626', '#34B256', '#6A469D'],
  },
  {
    id: 'performance',
    name: 'Performance Report',
    description: 'Health score trends over time',
    icon: TrophyIcon,
    metrics: ['overallScore', 'financialScore', 'operationalScore', 'complianceScore', 'engagementScore', 'growthScore'],
    metricLabels: {
      overallScore: 'Overall',
      financialScore: 'Financial',
      operationalScore: 'Operational',
      complianceScore: 'Compliance',
      engagementScore: 'Engagement',
      growthScore: 'Growth',
    },
    currencyFields: new Set(),
    percentFields: new Set(),
    chartColors: BRAND_COLORS,
  },
];

function getDefaultDateRange() {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  // Go back 11 months for a 12-month window
  let startMonth = endMonth - 11;
  let startYear = endYear;
  if (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }
  return { startYear, startMonth, endYear, endMonth };
}

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 3; y <= current + 1; y++) {
    years.push(y);
  }
  return years;
})();

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatValue(value: number, field: string, reportConfig: ReportType): string {
  if (reportConfig.currencyFields.has(field)) {
    return formatCurrency(value);
  }
  if (reportConfig.percentFields.has(field)) {
    return `${value.toFixed(1)}%`;
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toFixed(1);
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function FranchiseeReportBuilderPage() {
  const defaultRange = getDefaultDateRange();

  const [selectedReport, setSelectedReport] = useState<string>('revenue');
  const [startYear, setStartYear] = useState(defaultRange.startYear);
  const [startMonth, setStartMonth] = useState(defaultRange.startMonth);
  const [endYear, setEndYear] = useState(defaultRange.endYear);
  const [endMonth, setEndMonth] = useState(defaultRange.endMonth);
  const [chartView, setChartView] = useState<ChartView>('bar');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [error, setError] = useState<string | null>(null);

  const reportConfig = REPORT_TYPES.find((r) => r.id === selectedReport)!;

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const res = await fetch('/api/franchisee/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedReport,
          startYear,
          startMonth,
          endYear,
          endMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate report');
        return;
      }

      setReportData(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedReport, startYear, startMonth, endYear, endMonth]);

  // Auto-generate when report type or date range changes
  useEffect(() => {
    generateReport();
  }, [generateReport]);

  async function handleExportCSV() {
    if (!reportData) return;
    setExporting(true);

    try {
      const res = await fetch('/api/franchisee/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          months: reportData.months,
          totals: reportData.totals,
          averages: reportData.averages,
          reportType: reportData.reportType,
        }),
      });

      if (!res.ok) {
        setError('Failed to export report');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download CSV');
    } finally {
      setExporting(false);
    }
  }

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }

  function getSortedData(): MonthData[] {
    if (!reportData) return [];
    if (!sortColumn) return reportData.months;

    return [...reportData.months].sort((a, b) => {
      const aVal = Number(a[sortColumn]) || 0;
      const bVal = Number(b[sortColumn]) || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <WideContainer className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
            <DocumentChartBarIcon className="h-8 w-8 text-brand-purple" />
            Report Builder
          </h1>
          <p className="mt-1 text-gray-600">
            Build custom reports from your franchise data
          </p>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Select Report Type</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedReport === type.id
                    ? 'border-brand-navy bg-brand-navy/5 shadow-md'
                    : 'border-gray-200 hover:border-brand-cyan hover:shadow-sm'
                }`}
              >
                <type.icon
                  className={`h-8 w-8 mb-2 ${
                    selectedReport === type.id ? 'text-brand-navy' : 'text-gray-400'
                  }`}
                />
                <h3
                  className={`font-semibold ${
                    selectedReport === type.id ? 'text-brand-navy' : 'text-gray-800'
                  }`}
                >
                  {type.name}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controls Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Date Range */}
            <div className="flex flex-wrap items-end gap-3 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Month</label>
                <div className="flex gap-1">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <span className="text-gray-400 pb-2 hidden sm:inline">to</span>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Month</label>
                <div className="flex gap-1">
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Chart View Toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">View</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setChartView('bar')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    chartView === 'bar'
                      ? 'bg-brand-navy text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Bar Chart"
                >
                  <ChartBarSquareIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Bar</span>
                </button>
                <button
                  onClick={() => setChartView('line')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-x border-gray-300 transition-colors ${
                    chartView === 'line'
                      ? 'bg-brand-navy text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Line Chart"
                >
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Line</span>
                </button>
                <button
                  onClick={() => setChartView('table')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    chartView === 'table'
                      ? 'bg-brand-navy text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Data Table"
                >
                  <TableCellsIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            </div>

            {/* Export */}
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                disabled={!reportData || reportData.months.length === 0 || exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'CSV'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <InformationCircleIcon className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-20">
            <div className="flex flex-col items-center justify-center gap-3">
              <ArrowPathIcon className="h-8 w-8 text-brand-navy animate-spin" />
              <p className="text-gray-500 font-medium">Generating report...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart / Table Area */}
      {!loading && reportData && (
        <>
          {reportData.months.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-1">No Data Available</h3>
                  <p className="text-gray-400 text-sm">
                    No data found for the selected date range. Try adjusting the dates.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {reportConfig.metrics.slice(0, 4).map((metric, idx) => {
                  const latestMonth = reportData.months[reportData.months.length - 1];
                  const prevMonth = reportData.months.length > 1
                    ? reportData.months[reportData.months.length - 2]
                    : null;
                  const currentVal = Number(latestMonth[metric]) || 0;
                  const prevVal = prevMonth ? Number(prevMonth[metric]) || 0 : 0;
                  const change = prevVal > 0
                    ? ((currentVal - prevVal) / prevVal) * 100
                    : 0;

                  return (
                    <Card key={metric}>
                      <CardContent className="pt-5">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {reportConfig.metricLabels[metric]}
                        </p>
                        <p className="text-2xl font-bold text-brand-navy">
                          {formatValue(currentVal, metric, reportConfig)}
                        </p>
                        {prevMonth && change !== 0 && (
                          <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs prev month
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {latestMonth.label}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Chart View */}
              {chartView !== 'table' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-brand-navy">
                        {reportConfig.name}
                      </h2>
                      <span className="text-sm text-gray-400">
                        {reportData.months[0]?.label} &mdash; {reportData.months[reportData.months.length - 1]?.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 400 }}>
                      <RechartsContainer>
                        {chartView === 'bar' ? (
                          <BarChart data={reportData.months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              tickLine={false}
                              tickFormatter={(val: number) =>
                                reportConfig.currencyFields.has(reportConfig.metrics[0])
                                  ? `$${(val / 1000).toFixed(0)}k`
                                  : val.toLocaleString()
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                              }}
                              formatter={((value: number | undefined, name: string) => {
                                const v = value ?? 0;
                                const field = reportConfig.metrics.find(
                                  (m) => reportConfig.metricLabels[m] === name
                                ) || '';
                                return [formatValue(v, field, reportConfig), name];
                              }) as any}
                            />
                            <Legend />
                            {reportConfig.metrics.map((metric, idx) => (
                              <Bar
                                key={metric}
                                dataKey={metric}
                                name={reportConfig.metricLabels[metric]}
                                fill={reportConfig.chartColors[idx % reportConfig.chartColors.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        ) : (
                          <LineChart data={reportData.months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              tickLine={false}
                              tickFormatter={(val: number) =>
                                reportConfig.currencyFields.has(reportConfig.metrics[0])
                                  ? `$${(val / 1000).toFixed(0)}k`
                                  : val.toLocaleString()
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                              }}
                              formatter={((value: number | undefined, name: string) => {
                                const v = value ?? 0;
                                const field = reportConfig.metrics.find(
                                  (m) => reportConfig.metricLabels[m] === name
                                ) || '';
                                return [formatValue(v, field, reportConfig), name];
                              }) as any}
                            />
                            <Legend />
                            {reportConfig.metrics.map((metric, idx) => (
                              <Line
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                name={reportConfig.metricLabels[metric]}
                                stroke={reportConfig.chartColors[idx % reportConfig.chartColors.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        )}
                      </RechartsContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-brand-navy">
                      {chartView === 'table' ? reportConfig.name : 'Detailed Data'}
                    </h2>
                    <span className="text-sm text-gray-400">
                      {reportData.months.length} month{reportData.months.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-navy transition-colors"
                            onClick={() => handleSort('month')}
                          >
                            <div className="flex items-center gap-1">
                              Period
                              {sortColumn === 'month' && (
                                <span className="text-brand-navy">{sortDirection === 'asc' ? ' ^' : ' v'}</span>
                              )}
                            </div>
                          </th>
                          {reportConfig.metrics.map((metric) => (
                            <th
                              key={metric}
                              className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-navy transition-colors"
                              onClick={() => handleSort(metric)}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {reportConfig.metricLabels[metric]}
                                {sortColumn === metric && (
                                  <span className="text-brand-navy">{sortDirection === 'asc' ? ' ^' : ' v'}</span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {getSortedData().map((row, idx) => (
                          <tr key={`${row.year}-${row.month}`} className={idx % 2 === 0 ? '' : 'bg-gray-50/50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.label}
                            </td>
                            {reportConfig.metrics.map((metric) => (
                              <td key={metric} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                                {formatValue(Number(row[metric]) || 0, metric, reportConfig)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals / Averages */}
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                            TOTALS
                          </td>
                          {reportConfig.metrics.map((metric) => (
                            <td key={metric} className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-brand-navy">
                              {formatValue(reportData.totals[metric] || 0, metric, reportConfig)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">
                            AVERAGES
                          </td>
                          {reportConfig.metrics.map((metric) => (
                            <td key={metric} className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-500">
                              {formatValue(reportData.averages[metric] || 0, metric, reportConfig)}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </WideContainer>
  );
}
