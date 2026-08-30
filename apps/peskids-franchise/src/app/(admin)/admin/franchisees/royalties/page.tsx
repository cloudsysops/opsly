'use client';

import { useState, useEffect } from 'react';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  XMarkIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Franchisee {
  id: string;
  prospectId: string;
  name: string;
  email: string;
  territory: string | null;
  selectedAt: string | null;
  currentMonthRevenue: number | null;
  ytdRevenue: number | null;
  stripeOnboarded: boolean;
  tutorCruncherConnected: boolean;
  lastSyncAt: string | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    month: number;
    year: number;
    grossRevenue: number;
    totalAmount: number;
    status: string;
    dueDate: string;
    paidAt: string | null;
  }>;
}

interface Summary {
  totalFranchisees: number;
  totalRevenue: number;
  totalCollected: number;
  byStatus: Array<{
    status: string;
    count: number;
    total: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  DISPUTED: 'bg-red-100 text-red-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface GenerateResult {
  success: boolean;
  generated?: number;
  skipped?: number;
  failed?: number;
  errors?: string[];
  error?: string;
}

export default function RoyaltiesDashboardPage() {
  const [data, setData] = useState<{ franchisees: Franchisee[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(undefined);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: year.toString() });
      if (month) params.set('month', month.toString());

      const res = await fetch(`/api/admin/royalties?${params}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching royalty data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openGenerateModal() {
    if (!month) {
      // Show inline error instead of alert
      return;
    }
    setShowConfirmModal(true);
  }

  async function handleGenerateInvoices() {
    setShowConfirmModal(false);
    setGenerating(true);

    try {
      const res = await fetch('/api/admin/royalties/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, syncFirst: true }),
      });
      const json = await res.json();

      setGenerateResult(json);
      setShowResultModal(true);

      if (json.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      setGenerateResult({ success: false, error: 'Failed to connect to server' });
      setShowResultModal(true);
    } finally {
      setGenerating(false);
    }
  }

  if (loading && !data) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Royalty Management</h1>
          <p className="mt-1 text-gray-600">
            Track franchisee revenue and royalty payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 text-sm"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month || ''}
            onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : undefined)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <button
            onClick={openGenerateModal}
            disabled={generating || !month}
            className="px-4 py-2 bg-brand-purple text-white rounded-md text-sm font-medium hover:bg-brand-purple/90 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Invoices'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Franchisees</p>
            <p className="text-2xl font-bold text-brand-navy">
              {data?.summary.totalFranchisees || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Gross Revenue</p>
            <p className="text-2xl font-bold text-brand-green">
              {formatCurrency(data?.summary.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Royalties Collected</p>
            <p className="text-2xl font-bold text-brand-purple">
              {formatCurrency(data?.summary.totalCollected || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className="text-2xl font-bold text-brand-orange">
              {formatCurrency(
                (data?.summary.byStatus.find((s) => s.status !== 'PAID')?.total || 0) -
                (data?.summary.totalCollected || 0)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Summary */}
      {data?.summary.byStatus && data.summary.byStatus.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.summary.byStatus.map((status) => (
            <span
              key={status.status}
              className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status.status] || 'bg-gray-100'}`}
            >
              {status.status.replace(/_/g, ' ')}: {status.count} ({formatCurrency(status.total)})
            </span>
          ))}
        </div>
      )}

      {/* Franchisee List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Franchisees</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Franchisee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Territory</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Month</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">YTD Revenue</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">TC</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stripe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latest Invoice</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.franchisees.map((franchisee) => {
                  const latestInvoice = franchisee.invoices[0];
                  return (
                    <tr key={franchisee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{franchisee.name}</p>
                          <p className="text-sm text-gray-500">{franchisee.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {franchisee.territory || '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        {franchisee.currentMonthRevenue
                          ? formatCurrency(franchisee.currentMonthRevenue)
                          : '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-brand-green">
                        {franchisee.ytdRevenue
                          ? formatCurrency(franchisee.ytdRevenue)
                          : '—'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${franchisee.tutorCruncherConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${franchisee.stripeOnboarded ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                      <td className="px-4 py-4">
                        {latestInvoice ? (
                          <Link
                            href={`/admin/royalties/invoices/${latestInvoice.id}`}
                            className="text-sm hover:underline"
                          >
                            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[latestInvoice.status]}`}>
                              {latestInvoice.status.replace(/_/g, ' ')}
                            </span>
                            <span className="ml-2 text-gray-600">
                              {formatCurrency(latestInvoice.totalAmount)}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">No invoices</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/royalties/franchisee/${franchisee.id}`}
                          className="text-brand-purple hover:underline text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {(!data?.franchisees || data.franchisees.length === 0) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No franchisees found. Franchisee accounts are created when prospects are marked as SELECTED.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link
          href="/admin/royalties/invoices"
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          View All Invoices
        </Link>
        <Link
          href="/admin/royalties/config"
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Royalty Configuration
        </Link>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && month && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowConfirmModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-purple/10 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-brand-purple" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">
                  Generate Invoices
                </h3>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  You are about to generate royalty invoices for{' '}
                  <span className="font-semibold text-brand-navy">
                    {MONTHS[month - 1]} {year}
                  </span>
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">This process will:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Sync revenue data from AcmeFranchise databases (Westside/Eastside)</li>
                        <li>Calculate royalty fees (7% royalty + 2% brand fund + 1% systems fee)</li>
                        <li>Create draft invoices for each franchisee</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {data?.franchisees.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">No franchisees found</p>
                        <p className="text-amber-700">
                          Franchisee accounts are created when prospects are marked as SELECTED.
                          Currently there are no franchisees to generate invoices for.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateInvoices}
                    className="px-4 py-2 bg-brand-purple text-white rounded-md text-sm font-medium hover:bg-brand-purple/90 flex items-center gap-2"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Generate Invoices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && generateResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowResultModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <button
                onClick={() => setShowResultModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              {generateResult.success ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-brand-navy">
                      Invoice Generation Complete
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {generateResult.generated || 0}
                        </p>
                        <p className="text-sm text-green-700">Generated</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-600">
                          {generateResult.skipped || 0}
                        </p>
                        <p className="text-sm text-gray-500">Skipped</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {generateResult.failed || 0}
                        </p>
                        <p className="text-sm text-red-700">Failed</p>
                      </div>
                    </div>

                    {generateResult.generated === 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800">
                            No invoices were generated. This may be because there are no franchisee
                            accounts with revenue data for this period. Make sure prospects are
                            marked as SELECTED to create franchisee accounts.
                          </p>
                        </div>
                      </div>
                    )}

                    {generateResult.errors && generateResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside">
                          {generateResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setShowResultModal(false)}
                        className="px-4 py-2 bg-brand-purple text-white rounded-md text-sm font-medium hover:bg-brand-purple/90"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-brand-navy">
                      Generation Failed
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">
                        {generateResult.error || 'An unexpected error occurred'}
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setShowResultModal(false)}
                        className="px-4 py-2 bg-brand-purple text-white rounded-md text-sm font-medium hover:bg-brand-purple/90"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
