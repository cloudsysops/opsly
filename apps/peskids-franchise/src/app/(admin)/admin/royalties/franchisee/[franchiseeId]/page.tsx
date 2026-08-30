'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  invoiceNumber: string;
  year: number;
  month: number;
  grossRevenue: number;
  royaltyAmount: number;
  brandFundAmount: number;
  systemsFeeAmount: number;
  totalAmount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
}

interface Snapshot {
  year: number;
  month: number;
  grossRevenue: number;
  totalLessons: number;
  totalHours: number;
  activeStudents: number;
  homeRevenue: number;
  onlineRevenue: number;
  retailRevenue: number;
  schoolRevenue: number;
  otherRevenue: number;
}

interface FranchiseeDetail {
  id: string;
  prospectId: string;
  name: string;
  email: string;
  phone: string | null;
  territory: string | null;
  selectedAt: string | null;
  currentMonthRevenue: number | null;
  ytdRevenue: number | null;
  stripeOnboarded: boolean;
  stripeAccountId: string | null;
  tutorCruncherConnected: boolean;
  lastSyncAt: string | null;
  invoices: Invoice[];
  snapshots: Snapshot[];
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
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function FranchiseeDetailPage() {
  const params = useParams();
  const franchiseeId = params.franchiseeId as string;

  const [data, setData] = useState<FranchiseeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Stripe modal state
  const [stripeModal, setStripeModal] = useState<{
    show: boolean;
    type: 'success' | 'already_onboarded' | 'error';
    onboardingUrl?: string;
    dashboardUrl?: string;
    message?: string;
    linkCopied?: boolean;
  }>({ show: false, type: 'success' });

  useEffect(() => {
    fetchData();
  }, [franchiseeId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/franchisee/${franchiseeId}`);
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching franchisee:', err);
      setError('Failed to load franchisee data');
    } finally {
      setLoading(false);
    }
  }

  async function setupStripeConnect() {
    setStripeLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/franchisee/${franchiseeId}/stripe`, {
        method: 'POST',
      });
      const json = await res.json();

      if (json.error) {
        setStripeModal({
          show: true,
          type: 'error',
          message: json.error,
        });
        return;
      }

      if (json.alreadyOnboarded) {
        setStripeModal({
          show: true,
          type: 'already_onboarded',
          dashboardUrl: json.dashboardUrl,
        });
      } else if (json.onboardingUrl) {
        setStripeModal({
          show: true,
          type: 'success',
          onboardingUrl: json.onboardingUrl,
          linkCopied: false,
        });
      }

      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error setting up Stripe:', err);
      setStripeModal({
        show: true,
        type: 'error',
        message: 'Failed to set up Stripe Connect',
      });
    } finally {
      setStripeLoading(false);
    }
  }

  function copyOnboardingLink() {
    if (stripeModal.onboardingUrl) {
      navigator.clipboard.writeText(stripeModal.onboardingUrl);
      setStripeModal(prev => ({ ...prev, linkCopied: true }));
    }
  }

  function closeStripeModal() {
    setStripeModal({ show: false, type: 'success' });
  }

  if (loading) {
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

  if (error || !data) {
    return (
      <WideContainer className="space-y-6">
        <Link
          href="/admin/royalties"
          className="inline-flex items-center gap-2 text-brand-purple hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Royalties
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Franchisee not found'}</p>
          </CardContent>
        </Card>
      </WideContainer>
    );
  }

  const totalRoyalties = data.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidRoyalties = data.invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/royalties"
          className="inline-flex items-center gap-2 text-brand-purple hover:underline text-sm mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Royalties
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">{data.name}</h1>
            <p className="mt-1 text-gray-600">{data.territory || 'No territory assigned'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">TC:</span>
              {data.tutorCruncherConnected ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-300" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Stripe:</span>
              {data.stripeOnboarded ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-300" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Current Month</span>
            </div>
            <p className="text-2xl font-bold text-brand-navy">
              {data.currentMonthRevenue ? formatCurrency(data.currentMonthRevenue) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">YTD Revenue</span>
            </div>
            <p className="text-2xl font-bold text-brand-green">
              {data.ytdRevenue ? formatCurrency(data.ytdRevenue) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Total Royalties</span>
            </div>
            <p className="text-2xl font-bold text-brand-purple">
              {formatCurrency(totalRoyalties)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(paidRoyalties)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info & Payment Setup */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Contact Information</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{data.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{data.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Sync</p>
                <p className="font-medium">
                  {data.lastSyncAt ? formatDate(data.lastSyncAt) : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Payment Setup</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${data.stripeOnboarded ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <CreditCardIcon className={`h-5 w-5 ${data.stripeOnboarded ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Stripe Connect</p>
                    <p className="text-sm text-gray-500">
                      {data.stripeOnboarded
                        ? 'Ready for ACH payments'
                        : data.stripeAccountId
                        ? 'Onboarding incomplete'
                        : 'Not set up'}
                    </p>
                  </div>
                </div>
                {data.stripeOnboarded ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={setupStripeConnect}
                    disabled={stripeLoading}
                    className="px-4 py-2 bg-brand-purple text-white rounded-lg font-medium hover:bg-brand-purple/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {stripeLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Setting up...
                      </>
                    ) : (
                      <>Setup Stripe</>
                    )}
                  </button>
                )}
              </div>

              {data.stripeAccountId && !data.stripeOnboarded && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Onboarding incomplete.</strong> Click &quot;Setup Stripe&quot; to get a new onboarding link to send to the franchisee.
                  </p>
                </div>
              )}

              {!data.stripeAccountId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Set up Stripe Connect to collect royalty payments via ACH bank transfer.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue History */}
      {data.snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Revenue History</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lessons</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Students</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Home</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Online</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Retail</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">School</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.snapshots.map((snapshot) => (
                    <tr key={`${snapshot.year}-${snapshot.month}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {MONTHS[snapshot.month - 1]} {snapshot.year}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand-green">
                        {formatCurrency(snapshot.grossRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right">{snapshot.totalLessons}</td>
                      <td className="px-4 py-3 text-right">{snapshot.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{snapshot.activeStudents}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(snapshot.homeRevenue)}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(snapshot.onlineRevenue)}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(snapshot.retailRevenue)}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(snapshot.schoolRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Invoice History</h2>
        </CardHeader>
        <CardContent>
          {data.invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No invoices yet. Generate invoices from the Royalty Dashboard.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Royalty (7%)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brand (2%)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Systems (1%)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total (10%)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/royalties/invoices/${invoice.id}`}
                          className="text-brand-purple hover:underline font-medium"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {MONTHS[invoice.month - 1]} {invoice.year}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(invoice.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(invoice.royaltyAmount)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(invoice.brandFundAmount)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(invoice.systemsFeeAmount)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
                          {invoice.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.paidAt ? (
                          <span className="text-green-600">Paid {formatDate(invoice.paidAt)}</span>
                        ) : (
                          formatDate(invoice.dueDate)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Modal */}
      {stripeModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeStripeModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {stripeModal.type === 'error' ? (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-full">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Setup Error
                    </h3>
                  </div>
                  <p className="text-gray-600">{stripeModal.message}</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                  <button
                    onClick={closeStripeModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : stripeModal.type === 'already_onboarded' ? (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Already Onboarded
                    </h3>
                  </div>
                  <p className="text-gray-600">
                    This franchisee has already completed their Stripe onboarding.
                    You can view their Stripe dashboard.
                  </p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={closeStripeModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      if (stripeModal.dashboardUrl) {
                        window.open(stripeModal.dashboardUrl, '_blank');
                      }
                      closeStripeModal();
                    }}
                    className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    Open Dashboard
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Stripe Account Created!
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Send this onboarding link to the franchisee so they can complete
                    their payment setup.
                  </p>
                  <div className="bg-gray-100 rounded-lg p-3 break-all text-sm text-gray-700 font-mono">
                    {stripeModal.onboardingUrl}
                  </div>
                  {stripeModal.linkCopied && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      Link copied to clipboard!
                    </p>
                  )}
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={closeStripeModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={copyOnboardingLink}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => {
                      if (stripeModal.onboardingUrl) {
                        window.open(stripeModal.onboardingUrl, '_blank');
                      }
                    }}
                    className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    Open Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </WideContainer>
  );
}
