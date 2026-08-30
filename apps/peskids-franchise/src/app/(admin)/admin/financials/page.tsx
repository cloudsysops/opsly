export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Decimal } from '@prisma/client/runtime/library';
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface MonthlyData {
  month: string;
  revenue: number;
  collected: number;
  pending: number;
}

function formatCurrency(amount: number | Decimal): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default async function FinancialOverviewPage() {
  const session = await auth();
  if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
    redirect('/');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Get all franchisee accounts with their invoices and TC snapshots
  const franchisees = await db.franchiseeAccount.findMany({
    include: {
      prospect: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invoices: {
        where: {
          year: currentYear,
        },
        orderBy: { month: 'asc' },
      },
      tcSnapshots: {
        where: {
          year: currentYear,
        },
        orderBy: { month: 'asc' },
      },
    },
  });

  // Calculate totals
  let totalYtdRevenue = 0;
  let totalRoyaltiesCollected = 0;
  let totalRoyaltiesPending = 0;
  let totalOverdue = 0;
  let overdueCount = 0;

  // Monthly aggregates for chart
  const monthlyData: MonthlyData[] = [];
  for (let m = 1; m <= currentMonth; m++) {
    monthlyData.push({
      month: new Date(currentYear, m - 1, 1).toLocaleString('en-US', { month: 'short' }),
      revenue: 0,
      collected: 0,
      pending: 0,
    });
  }

  for (const franchisee of franchisees) {
    // Sum YTD revenue from snapshots
    for (const snapshot of franchisee.tcSnapshots) {
      const revenue = Number(snapshot.grossRevenue);
      totalYtdRevenue += revenue;

      const monthIndex = snapshot.month - 1;
      if (monthIndex < monthlyData.length) {
        monthlyData[monthIndex].revenue += revenue;
      }
    }

    // Sum invoice amounts
    for (const invoice of franchisee.invoices) {
      const amount = Number(invoice.totalAmount);
      const monthIndex = invoice.month - 1;

      if (invoice.status === 'PAID') {
        totalRoyaltiesCollected += amount;
        if (monthIndex < monthlyData.length) {
          monthlyData[monthIndex].collected += amount;
        }
      } else if (invoice.status === 'OVERDUE') {
        totalOverdue += amount;
        overdueCount++;
        if (monthIndex < monthlyData.length) {
          monthlyData[monthIndex].pending += amount;
        }
      } else if (['PAYMENT_PENDING', 'APPROVED', 'PENDING_REVIEW'].includes(invoice.status)) {
        totalRoyaltiesPending += amount;
        if (monthIndex < monthlyData.length) {
          monthlyData[monthIndex].pending += amount;
        }
      }
    }
  }

  // Calculate expected royalties (10% of revenue)
  const expectedRoyalties = totalYtdRevenue * 0.10;
  const collectionRate = expectedRoyalties > 0
    ? (totalRoyaltiesCollected / expectedRoyalties) * 100
    : 0;

  // Calculate MoM growth (compare last full month to previous)
  const lastMonth = currentMonth > 1 ? currentMonth - 2 : 0; // -2 because array is 0-indexed and we want last FULL month
  const prevMonth = lastMonth > 0 ? lastMonth - 1 : 0;

  const lastMonthRevenue = monthlyData[lastMonth]?.revenue || 0;
  const prevMonthRevenue = monthlyData[prevMonth]?.revenue || 0;
  const momGrowth = prevMonthRevenue > 0
    ? ((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
    : 0;

  // Get franchisee count
  const activeFranchisees = franchisees.filter(f => f.tcSnapshots.length > 0).length;

  // Recent invoices for activity feed
  const recentInvoices = await db.royaltyInvoice.findMany({
    where: {
      year: currentYear,
    },
    include: {
      franchiseeAccount: {
        include: {
          prospect: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  // Find max value for chart scaling
  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.collected + d.pending)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-slate-600 mt-1">
            {currentYear} YTD performance across {activeFranchisees} active franchisee{activeFranchisees !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClockIcon className="h-4 w-4" />
          Last updated: {now.toLocaleString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BanknotesIcon className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">YTD Gross Revenue</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalYtdRevenue)}
          </div>
          {momGrowth !== 0 && (
            <div className={`mt-2 text-sm ${momGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <ArrowTrendingUpIcon className={`h-4 w-4 inline-block mr-1 ${momGrowth < 0 ? 'rotate-180' : ''}`} />
              {formatPercent(momGrowth)} MoM
            </div>
          )}
        </div>

        {/* Royalties Collected */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Royalties Collected</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalRoyaltiesCollected)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {collectionRate.toFixed(0)}% collection rate
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Pending Collection</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalRoyaltiesPending)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Awaiting payment
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalOverdue)}
          </div>
          <div className="mt-2 text-sm text-red-600">
            {overdueCount} invoice{overdueCount !== 1 ? 's' : ''} past due
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Revenue vs Collections</h3>

          <div className="h-64 flex items-end gap-2">
            {monthlyData.map((data, i) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5" style={{ height: '200px' }}>
                  {/* Revenue bar */}
                  <div
                    className="w-full bg-blue-200 rounded-t"
                    style={{
                      height: maxValue > 0 ? `${(data.revenue / maxValue) * 100}%` : '0%',
                      minHeight: data.revenue > 0 ? '4px' : '0'
                    }}
                    title={`Revenue: ${formatCurrency(data.revenue)}`}
                  />
                  {/* Collections overlay */}
                  <div className="w-full flex flex-col -mt-full absolute bottom-0">
                    <div
                      className="w-full bg-green-500 rounded-t opacity-70"
                      style={{
                        height: maxValue > 0 ? `${(data.collected / maxValue) * 100}%` : '0%',
                        minHeight: data.collected > 0 ? '4px' : '0'
                      }}
                      title={`Collected: ${formatCurrency(data.collected)}`}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-500">{data.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded" />
              <span className="text-sm text-slate-600">Gross Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-slate-600">Royalties Collected</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Invoice Activity</h3>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity</p>
            ) : (
              recentInvoices.map((invoice) => (
                <a
                  key={invoice.id}
                  href={`/admin/royalties/invoices/${invoice.id}`}
                  className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {invoice.franchiseeAccount.prospect.firstName} {invoice.franchiseeAccount.prospect.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {invoice.invoiceNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                      <StatusBadge status={invoice.status} />
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Franchisee Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Franchisee Performance</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  YTD Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Royalties Paid
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {franchisees.map((franchisee) => {
                const ytdRevenue = franchisee.tcSnapshots.reduce(
                  (sum, s) => sum + Number(s.grossRevenue),
                  0
                );
                const paidAmount = franchisee.invoices
                  .filter(i => i.status === 'PAID')
                  .reduce((sum, i) => sum + Number(i.totalAmount), 0);
                const outstandingAmount = franchisee.invoices
                  .filter(i => !['PAID', 'DRAFT'].includes(i.status))
                  .reduce((sum, i) => sum + Number(i.totalAmount), 0);
                const hasOverdue = franchisee.invoices.some(i => i.status === 'OVERDUE');

                return (
                  <tr key={franchisee.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {franchisee.prospect.firstName} {franchisee.prospect.lastName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {franchisee.prospect.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                      {formatCurrency(ytdRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                      {formatCurrency(paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-amber-600 font-medium">
                      {outstandingAmount > 0 ? formatCurrency(outstandingAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {hasOverdue ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overdue
                        </span>
                      ) : outstandingAmount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {franchisees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No franchisee accounts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PENDING_REVIEW: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    DISPUTED: 'bg-red-100 text-red-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
