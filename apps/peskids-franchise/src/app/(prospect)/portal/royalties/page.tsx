'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  ChartPieIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import InvoiceHistory from '@/components/franchisee/InvoiceHistory';

// Dynamic import for charts
const RevenueBreakdownChart = dynamic(
  () => import('@/components/franchisee/RevenueBreakdownChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    ),
  }
);

interface Invoice {
  id: string;
  invoiceNumber: string;
  year: number;
  month: number;
  grossRevenue: number;
  royaltyAmount: number;
  brandFund: number;
  systemsFee: number;
  totalAmount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
  franchiseeApproved: boolean | null;
  payments?: Array<{
    amount: number;
    method: string;
    processedAt: string;
  }>;
}

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

interface BreakdownData {
  year: number;
  breakdown: RevenueBreakdown;
  percentages: RevenueBreakdown;
  total: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

interface HistorySummary {
  totalRoyalties: number;
  totalPaid: number;
  outstanding: number;
  totalDisputed: number;
  currentYearRevenue: number;
  previousYearRevenue: number;
  yoyGrowth: number;
  momGrowth: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  PENDING_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Your Review' },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
  DISPUTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Disputed' },
  PAYMENT_PENDING: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Payment Due' },
  PROCESSING: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Processing' },
  PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type ActiveTab = 'overview' | 'invoices' | 'breakdown';

export default function FranchiseeRoyaltiesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [invoicesRes, breakdownRes, historyRes] = await Promise.all([
        fetch('/api/franchisee/invoices'),
        fetch(`/api/franchisee/royalties/breakdown?year=${new Date().getFullYear()}`),
        fetch('/api/franchisee/royalties/history'),
      ]);

      const [invoicesJson, breakdownJson, historyJson] = await Promise.all([
        invoicesRes.json(),
        breakdownRes.json(),
        historyRes.json(),
      ]);

      if (!invoicesJson.error) {
        setInvoices(invoicesJson.invoices);
        setOutstandingBalance(invoicesJson.summary.outstandingBalance);
      }

      if (!breakdownJson.error) {
        setBreakdownData(breakdownJson);
      }

      if (!historyJson.error) {
        setHistorySummary(historyJson.summary);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = useCallback(async () => {
    try {
      const [invoicesRes, breakdownRes, historyRes] = await Promise.all([
        fetch('/api/franchisee/invoices'),
        fetch(`/api/franchisee/royalties/breakdown?year=${new Date().getFullYear()}`),
        fetch('/api/franchisee/royalties/history'),
      ]);

      const [invoicesJson, breakdownJson, historyJson] = await Promise.all([
        invoicesRes.json(),
        breakdownRes.json(),
        historyRes.json(),
      ]);

      if (!invoicesJson.error) {
        setInvoices(invoicesJson.invoices);
        setOutstandingBalance(invoicesJson.summary.outstandingBalance);
      }

      if (!breakdownJson.error) {
        setBreakdownData(breakdownJson);
      }

      if (!historyJson.error) {
        setHistorySummary(historyJson.summary);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, []);

  const pendingReview = invoices.filter((i) => i.status === 'PENDING_REVIEW');
  const paymentDue = invoices.filter((i) => ['PAYMENT_PENDING', 'APPROVED', 'OVERDUE'].includes(i.status));

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
            <BanknotesIcon className="h-8 w-8 text-brand-purple" />
            Royalty Center
          </h1>
          <p className="mt-1 text-gray-600">
            View your revenue, invoices, and payment history
          </p>
        </div>
        <Link
          href="/portal/payments"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors"
        >
          <BanknotesIcon className="h-5 w-5" />
          Payment Settings
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={outstandingBalance > 0 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <BanknotesIcon className={`h-5 w-5 ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`} />
              <span className="text-sm text-gray-500">Outstanding Balance</span>
            </div>
            <p className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(outstandingBalance)}
            </p>
          </CardContent>
        </Card>

        <Card className={pendingReview.length > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className={`h-5 w-5 ${pendingReview.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500">Pending Review</span>
            </div>
            <p className={`text-2xl font-bold ${pendingReview.length > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
              {pendingReview.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              {historySummary && historySummary.yoyGrowth >= 0 ? (
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm text-gray-500">YoY Growth</span>
            </div>
            <p className={`text-2xl font-bold ${(historySummary?.yoyGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {historySummary ? `${historySummary.yoyGrowth >= 0 ? '+' : ''}${historySummary.yoyGrowth.toFixed(1)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ChartPieIcon className="h-5 w-5 text-brand-purple" />
              <span className="text-sm text-gray-500">YTD Revenue</span>
            </div>
            <p className="text-2xl font-bold text-brand-navy">
              {historySummary ? formatCurrency(historySummary.currentYearRevenue) : '$0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Section */}
      {pendingReview.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-800">Action Required</h2>
            </div>
            <p className="text-sm text-yellow-700">Please review and approve these invoices</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingReview.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/portal/royalties/${invoice.id}`}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {MONTHS[invoice.month - 1]} {invoice.year}
                    </p>
                    <p className="text-sm text-gray-500">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-brand-purple">
                      {formatCurrency(invoice.totalAmount)}
                    </p>
                    <p className="text-sm text-yellow-600 font-medium">Review →</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-brand-navy shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ChartPieIcon className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'invoices'
              ? 'bg-white text-brand-navy shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'breakdown'
              ? 'bg-white text-brand-navy shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BanknotesIcon className="w-4 h-4" />
          Revenue Breakdown
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* YTD Financial Summary */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Year-to-Date Summary</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50">
                <span className="font-body text-gray-700">Gross Revenue</span>
                <span className="font-display text-xl font-bold text-blue-700">
                  {formatCurrency(historySummary?.currentYearRevenue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100/50">
                <span className="font-body text-gray-700">Royalties Paid</span>
                <span className="font-display text-xl font-bold text-green-700">
                  {formatCurrency(historySummary?.totalPaid || 0)}
                </span>
              </div>
              {(historySummary?.outstanding || 0) > 0 && (
                <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/50">
                  <span className="font-body text-gray-700">Outstanding</span>
                  <span className="font-display text-xl font-bold text-orange-700">
                    {formatCurrency(historySummary?.outstanding || 0)}
                  </span>
                </div>
              )}
              {historySummary?.previousYearRevenue !== undefined && historySummary.previousYearRevenue > 0 && (
                <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <span className="font-body text-gray-700">Last Year Revenue</span>
                  <span className="font-display text-xl font-bold text-gray-600">
                    {formatCurrency(historySummary.previousYearRevenue)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Growth Metrics */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Growth Metrics</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 text-center">
                  <p className="text-sm text-gray-500 mb-1">Month-over-Month</p>
                  <p className={`text-3xl font-bold ${(historySummary?.momGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {historySummary?.momGrowth !== undefined
                      ? `${historySummary.momGrowth >= 0 ? '+' : ''}${historySummary.momGrowth.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 text-center">
                  <p className="text-sm text-gray-500 mb-1">Year-over-Year</p>
                  <p className={`text-3xl font-bold ${(historySummary?.yoyGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {historySummary?.yoyGrowth !== undefined
                      ? `${historySummary.yoyGrowth >= 0 ? '+' : ''}${historySummary.yoyGrowth.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Quick Revenue Breakdown */}
              {breakdownData && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Revenue by Category</h3>
                  <div className="space-y-2">
                    {Object.entries(breakdownData.breakdown)
                      .filter(([, value]) => value > 0)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([key, value]) => {
                        const percent = breakdownData.percentages[key as keyof RevenueBreakdown];
                        const labels: Record<string, string> = {
                          home: 'Home Lessons',
                          online: 'Online Lessons',
                          retail: 'Retail/Club',
                          schools: 'School Programs',
                          other: 'Other',
                        };
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{labels[key]}</span>
                                <span className="font-medium">{formatCurrency(value)}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-purple rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">
                              {percent.toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'invoices' && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Invoice History</h2>
          </CardHeader>
          <CardContent>
            <InvoiceHistory invoices={invoices} showPayments={true} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'breakdown' && breakdownData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-brand-navy">
                  Revenue Breakdown - {breakdownData.year}
                </h2>
                <p className="text-sm text-gray-500">
                  Detailed breakdown of your revenue by category
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueBreakdownChart
              breakdown={breakdownData.breakdown}
              percentages={breakdownData.percentages}
              monthlyBreakdown={breakdownData.monthlyBreakdown}
              total={breakdownData.total}
              height={350}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment Info Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Payment Information</h2>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Royalty payments are due by the 15th of each month for the previous month&apos;s revenue.
            You can pay online via your connected Stripe account.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-2">Online Payment</h4>
              <p className="text-sm text-blue-700 mb-3">
                Pay securely via ACH bank transfer through your Stripe dashboard.
              </p>
              <Link
                href="/portal/payments"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Manage Payment Settings →
              </Link>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-2">Questions?</h4>
              <p className="text-sm text-gray-600 mb-3">
                Contact us if you have questions about your invoices or payments.
              </p>
              <a
                href="mailto:franchising@acmefranchise.com"
                className="inline-flex items-center text-sm font-medium text-brand-purple hover:underline"
              >
                franchising@acmefranchise.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </WideContainer>
    </PullToRefresh>
  );
}
