'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/shared/PullToRefresh';
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  TrophyIcon,
  HeartIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowRightIcon,
  CalendarIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  MegaphoneIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  DocumentChartBarIcon,
  BookOpenIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import HealthScoreRing from '@/components/franchisee/HealthScoreRing';
import FeedbackSummaryCard from '@/components/prospect/FeedbackSummaryCard';

// Dynamic imports for charts
const FinancialTrendsChart = dynamic(
  () => import('@/components/franchisee/FinancialTrendsChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy" />
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthFactor {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  color: string;
  description: string;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  networkAverage: number;
  lessons: number;
  students: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface InsightItem {
  id: string;
  type: string;
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
  priority: 'critical' | 'warning' | 'info' | 'success';
  icon: string;
}

interface DeadlineItem {
  id: string;
  title: string;
  description: string;
  link: string;
  urgent: boolean;
  soon: boolean;
  timeLabel: string;
}

interface InsuranceData {
  carrier: string | null;
  policyNumber: string | null;
  coverageType: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  coiUrl: string | null;
}

interface DashboardData {
  franchisee: {
    name: string;
    email: string;
    monthsActive: number;
    stripeOnboarded: boolean;
  };
  insurance: InsuranceData;
  currentMonth: {
    revenue: number;
    lessons: number;
    students: number;
    tutors: number;
  };
  ytd: {
    revenue: number;
    lessons: number;
    royaltiesPaid: number;
    royaltiesOutstanding: number;
  };
  growth: number;
  network: {
    averageRevenue: number;
    averageLessons: number;
    averageStudents: number;
    percentile: number;
  };
  pendingInvoices: number;
  pendingTasks: number;
  upcomingCertifications: Array<{
    name: string;
    expiresAt: string;
    daysUntil: number;
  }>;
  healthScore: {
    overall: number;
    factors: HealthFactor[];
    previousScore: number;
  };
  monthlyTrends: MonthlyTrend[];
  leaderboard: Array<{
    id: string;
    rank: number;
    previousRank?: number;
    name: string;
    territory: string;
    revenue: number;
    growth: number;
    lessons: number;
    isYou?: boolean;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    email_received: 'bg-blue-100',
    sms_sent: 'bg-green-100',
    sms_received: 'bg-green-100',
    task_completed: 'bg-emerald-100',
    invoice_update: 'bg-amber-100',
    ticket_update: 'bg-purple-100',
    announcement_read: 'bg-cyan-100',
    activity: 'bg-gray-100',
  };
  return colors[type] || 'bg-gray-100';
}

function ActivityIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4';
  switch (type) {
    case 'email_received': return <EnvelopeIcon className={`${cls} text-blue-600`} />;
    case 'sms_sent':
    case 'sms_received': return <ChatBubbleLeftRightIcon className={`${cls} text-green-600`} />;
    case 'task_completed': return <CheckCircleIcon className={`${cls} text-emerald-600`} />;
    case 'invoice_update': return <DocumentTextIcon className={`${cls} text-amber-600`} />;
    case 'ticket_update': return <TicketIcon className={`${cls} text-purple-600`} />;
    case 'announcement_read': return <MegaphoneIcon className={`${cls} text-cyan-600`} />;
    default: return <ClockIcon className={`${cls} text-gray-500`} />;
  }
}

function InsightIcon({ priority }: { priority: string }) {
  const base = 'h-5 w-5 flex-shrink-0 mt-0.5';
  switch (priority) {
    case 'critical': return <ExclamationTriangleIcon className={`${base} text-red-600`} />;
    case 'warning': return <ExclamationTriangleIcon className={`${base} text-amber-600`} />;
    case 'success': return <TrophyIcon className={`${base} text-emerald-600`} />;
    default: return <LightBulbIcon className={`${base} text-blue-600`} />;
  }
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function FranchiseeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchWidgetData();
  }, []);

  async function fetchWidgetData() {
    try {
      const [activityRes, insightsRes, notifRes] = await Promise.all([
        fetch('/api/franchisee/activity-feed?limit=5').then((r) => r.json()),
        fetch('/api/franchisee/insights').then((r) => r.json()),
        fetch('/api/franchisee/notifications').then((r) => r.json()),
      ]);

      setActivities(activityRes.activities || []);
      setInsights(insightsRes.insights || []);

      const notifItems = notifRes.items || [];
      const deadlineItems: DeadlineItem[] = notifItems
        .filter((item: any) => ['invoice', 'certification', 'journey_task'].includes(item.type))
        .map((item: any) => {
          const isCert = item.type === 'certification';
          const isTask = item.type === 'journey_task';
          const isInvoice = item.type === 'invoice';

          let urgent = false;
          let soon = false;
          if (isCert) {
            const daysMatch = item.description.match(/(\d+)\s+day/);
            const days = daysMatch ? parseInt(daysMatch[1], 10) : 30;
            urgent = days <= 7;
            soon = days <= 14 && !urgent;
          } else if (isTask) {
            urgent = true;
          } else if (isInvoice) {
            soon = true;
          }

          let timeLabel = '';
          if (isCert) {
            const daysMatch = item.description.match(/(\d+)\s+day/);
            timeLabel = daysMatch ? `${daysMatch[1]}d left` : 'Expiring';
          } else if (isTask) {
            const daysMatch = item.description.match(/(\d+)\s+day/);
            timeLabel = daysMatch ? `${daysMatch[1]}d overdue` : 'Overdue';
          } else if (isInvoice) {
            timeLabel = 'Review now';
          }

          return { id: item.id, title: item.title, description: item.description, link: item.link, urgent, soon, timeLabel };
        })
        .slice(0, 5);

      setDeadlines(deadlineItems);
    } catch (err) {
      console.error('Error fetching widget data:', err);
    }
  }

  async function fetchDashboardData() {
    try {
      const res = await fetch('/api/franchisee/dashboard');
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = useCallback(async () => {
    try {
      const [dashRes] = await Promise.all([
        fetch('/api/franchisee/dashboard').then((r) => r.json()),
        fetchWidgetData(),
      ]);
      if (!dashRes.error) setData(dashRes);
    } catch (err) {
      console.error('Error refreshing:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-brand-navy border-t-transparent animate-spin" />
          </div>
          <p className="font-body text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error || 'Something went wrong. Please try again.'}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchDashboardData(); }}
            className="fp-btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const firstName = data.franchisee.name.split(' ')[0];
  const hasActionItems =
    data.pendingInvoices > 0 ||
    data.pendingTasks > 0 ||
    data.upcomingCertifications.length > 0 ||
    !data.franchisee.stripeOnboarded;

  const journeyPercent = data.pendingTasks > 0
    ? Math.max(5, Math.round(((63 - data.pendingTasks) / 63) * 100))
    : 100;

  const openItems =
    data.pendingInvoices +
    data.upcomingCertifications.length +
    (data.pendingTasks > 0 ? 1 : 0);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-8 pb-12 px-4 sm:px-6 lg:px-8">

      {/* ── Row 0: Hero Greeting ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm font-body text-slate-500">
            Good {getTimeOfDay()},
          </p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900">
            {firstName}
          </h1>
        </div>
        {data.franchisee.monthsActive > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-body w-fit">
            <ClockIcon className="w-4 h-4" />
            {data.franchisee.monthsActive} months active
          </div>
        )}
      </div>

      {/* (Action Items and KPI cards hidden for now) */}

      {/* ── Row 2: Quick Navigation Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SectionCard
          href="/portal/royalties"
          icon={BanknotesIcon}
          name="Financials"
          color="blue"
          stats={[
            { label: 'Revenue', value: formatCurrency(data.currentMonth.revenue) },
            { label: 'YTD', value: formatCurrency(data.ytd.revenue) },
          ]}
        />
        <SectionCard
          href="/portal/learning/knowledge-base"
          icon={BookOpenIcon}
          name="Resources"
          color="purple"
          stats={[
            { label: 'Journey', value: `${journeyPercent}%` },
            { label: 'Lessons', value: formatNumber(data.currentMonth.lessons) },
          ]}
        />
        <SectionCard
          href="/portal/agreement"
          icon={BuildingOffice2Icon}
          name="My Franchise"
          color="indigo"
          stats={[
            { label: 'Certifications', value: `${data.upcomingCertifications.length} expiring` },
            { label: 'Percentile', value: `Top ${100 - data.network.percentile}%` },
          ]}
        />
        <SectionCard
          href="/portal/messages"
          icon={ChatBubbleLeftRightIcon}
          name="Support"
          color="green"
          stats={[
            { label: 'Messages', value: 'View all' },
            { label: 'Help desk', value: 'Open tickets' },
          ]}
        />
        <SectionCard
          href="/portal/benchmarks"
          icon={ChartBarIcon}
          name="Benchmarks"
          color="amber"
          stats={[
            { label: 'Percentile', value: `${data.network.percentile}th` },
            { label: 'Network avg', value: formatCurrency(data.network.averageRevenue) },
          ]}
        />
      </div>

      {/* ── Row 3: Leaderboard + Deadlines ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="fp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100">
                <TrophyIcon className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900">Leaderboard</h3>
            </div>
            <Link href="/portal/benchmarks" className="text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors">
              View All →
            </Link>
          </div>

          <div className="text-center mb-4 p-3 rounded-xl bg-gradient-to-br from-brand-navy/5 to-brand-purple/5">
            <p className="text-xs font-medium text-gray-600 mb-1">Your Percentile</p>
            <p className={`font-display text-3xl font-bold ${
              data.network.percentile >= 75 ? 'text-emerald-600' :
              data.network.percentile >= 50 ? 'text-blue-600' :
              data.network.percentile >= 25 ? 'text-amber-600' : 'text-gray-600'
            }`}>
              Top {100 - data.network.percentile}%
            </p>
            <p className="text-xs text-gray-500 mt-0.5">of all franchisees</p>
          </div>

          <div className="space-y-3">
            <CompactCompareBar label="Revenue" yours={data.currentMonth.revenue} network={data.network.averageRevenue} format="currency" />
            <CompactCompareBar label="Students" yours={data.currentMonth.students} network={data.network.averageStudents} format="number" />
            <CompactCompareBar label="Lessons" yours={data.currentMonth.lessons} network={data.network.averageLessons} format="number" />
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="fp-card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-red-100">
              <CalendarIcon className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="font-display text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          </div>
          <div className="space-y-2">
            {deadlines.length > 0 ? (
              deadlines.map((d) => (
                <Link key={d.id} href={d.link} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${d.urgent ? 'bg-red-500' : d.soon ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{d.title}</p>
                    <p className="text-xs text-gray-500 truncate">{d.description}</p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${d.urgent ? 'text-red-600' : d.soon ? 'text-amber-600' : 'text-gray-500'}`}>
                    {d.timeLabel}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No upcoming deadlines</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Insurance Information ──────────────────────────────────────── */}
      <InsuranceCard insurance={data.insurance} />

      {/* ── Row 4: Insights & Alerts ───────────────────────────────────── */}
      <div className="fp-card overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-brand-navy/5 to-brand-purple/5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-navy">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-gray-900">Insights & Recommendations</h3>
              <p className="text-sm text-gray-500">Based on your performance data</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          {insights.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.map((insight) => (
                <div key={insight.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                  insight.priority === 'critical' ? 'border-red-200 bg-red-50' :
                  insight.priority === 'warning' ? 'border-amber-200 bg-amber-50' :
                  insight.priority === 'success' ? 'border-emerald-200 bg-emerald-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <InsightIcon priority={insight.priority} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                    {insight.actionLink && (
                      <Link href={insight.actionLink} className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors">
                        {insight.action} <ArrowRightIcon className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <SparklesIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No insights at this time</p>
              <p className="text-xs mt-1">Check back as more data becomes available</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Revenue Trend + Recent Activity ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 fp-card p-6" id="health">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900">Revenue Trend</h3>
            </div>
            <Link href="/portal/reports" className="text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors">
              Full Reports →
            </Link>
          </div>
          <FinancialTrendsChart data={data.monthlyTrends} showNetworkComparison={true} height={200} />
        </div>

        {/* Recent Activity */}
        <div className="fp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100">
                <ClockIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <Link href="/portal/messages" className="text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors">
              View All →
            </Link>
          </div>
          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    <ActivityIcon type={activity.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(activity.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ClockIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 6: Feedback Summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FeedbackSummaryCard />
      </div>

    </div>
    </PullToRefresh>
  );
}

// ─── Insurance Card ───────────────────────────────────────────────────────────

function getInsuranceStatus(insurance: InsuranceData): {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
} {
  if (!insurance.carrier && !insurance.policyNumber) {
    return { label: 'No Policy', color: 'text-gray-600', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' };
  }
  if (!insurance.expiryDate) {
    return { label: 'Active', color: 'text-emerald-700', bgColor: 'bg-emerald-100', dotColor: 'bg-emerald-500' };
  }
  const now = new Date();
  const expiry = new Date(insurance.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) {
    return { label: 'Expired', color: 'text-red-700', bgColor: 'bg-red-100', dotColor: 'bg-red-500' };
  }
  if (daysUntilExpiry <= 30) {
    return { label: `Expires in ${daysUntilExpiry}d`, color: 'text-amber-700', bgColor: 'bg-amber-100', dotColor: 'bg-amber-500' };
  }
  return { label: 'Active', color: 'text-emerald-700', bgColor: 'bg-emerald-100', dotColor: 'bg-emerald-500' };
}

function formatInsuranceDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

function InsuranceCard({ insurance }: { insurance: InsuranceData }) {
  const status = getInsuranceStatus(insurance);
  const hasInsurance = insurance.carrier || insurance.policyNumber;

  return (
    <div className="fp-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-100">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-gray-900">Insurance Information</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
          {status.label}
        </span>
      </div>

      {hasInsurance ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Insurance Carrier</p>
            <p className="text-sm font-semibold text-gray-900">{insurance.carrier || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Policy Number</p>
            <p className="text-sm font-semibold text-gray-900">{insurance.policyNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Coverage Type</p>
            <p className="text-sm font-semibold text-gray-900">{insurance.coverageType || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Coverage Period</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatInsuranceDate(insurance.effectiveDate)} — {formatInsuranceDate(insurance.expiryDate)}
            </p>
          </div>
          {insurance.coiUrl && (
            <div className="sm:col-span-2">
              <a
                href={insurance.coiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                View Certificate of Insurance
                <ArrowRightIcon className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">No insurance information on file.</p>
          <p className="text-xs text-gray-400 mt-1">Please contact your franchise administrator.</p>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function SectionCard({
  href,
  icon: Icon,
  name,
  color,
  stats,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  color: 'blue' | 'purple' | 'indigo' | 'green' | 'amber';
  stats: Array<{ label: string; value: string }>;
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:border-blue-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:border-purple-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'hover:border-indigo-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:border-green-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'hover:border-amber-200' },
  };
  const c = colorMap[color];

  return (
    <Link href={href} className={`fp-card p-4 ${c.hover} hover:shadow-md transition-all group`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`p-2 rounded-xl ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
        <span className="font-display font-semibold text-gray-900 text-sm">{name}</span>
      </div>
      <div className="space-y-1.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{stat.label}</span>
            <span className="text-xs font-semibold text-gray-700">{stat.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-purple group-hover:text-brand-navy transition-colors">
        Go to {name} <ArrowRightIcon className="w-3 h-3" />
      </div>
    </Link>
  );
}

function CompactCompareBar({
  label,
  yours,
  network,
  format,
}: {
  label: string;
  yours: number;
  network: number;
  format: 'currency' | 'number';
}) {
  const percentage = network > 0 ? Math.min((yours / network) * 100, 150) : 0;
  const isAbove = yours >= network;

  const formatValue = (value: number) => {
    if (format === 'currency') return formatCurrency(value);
    return formatNumber(Math.round(value));
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={`font-semibold ${isAbove ? 'text-emerald-600' : 'text-gray-700'}`}>
          {formatValue(yours)}
        </span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
            isAbove ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gray-400'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-600 rounded-full"
          style={{ left: '66.67%' }}
          title={`Network average: ${formatValue(network)}`}
        />
      </div>
    </div>
  );
}
