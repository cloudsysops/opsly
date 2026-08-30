'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCardIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface InvoiceDetail {
  invoice: {
    id: string;
    invoiceNumber: string;
    year: number;
    month: number;
    monthName: string;
    grossRevenue: number;
    royaltyAmount: number;
    royaltyPercent: number;
    brandFundAmount: number;
    brandFundPercent: number;
    systemsFeeAmount: number;
    systemsFeePercent: number;
    totalAmount: number;
    status: string;
    invoiceDate: string;
    dueDate: string;
    paidAt: string | null;
    franchiseeApproved: boolean | null;
    franchiseeNotes: string | null;
  };
  revenueBreakdown: {
    home: number;
    online: number;
    retail: number;
    school: number;
    other: number;
    total: number;
    totalLessons: number;
    totalHours: number;
    activeStudents: number;
    activeTutors: number;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    processedAt: string | null;
  }>;
  totalPaid: number;
}

const STATUS_INFO: Record<string, { color: string; label: string; canReview: boolean }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Draft', canReview: false },
  PENDING_REVIEW: { color: 'bg-yellow-100 text-yellow-800 border-yellow-400', label: 'Awaiting Your Review', canReview: true },
  APPROVED: { color: 'bg-blue-100 text-blue-800 border-blue-400', label: 'Approved', canReview: false },
  DISPUTED: { color: 'bg-red-100 text-red-800 border-red-400', label: 'Disputed', canReview: false },
  PAYMENT_PENDING: { color: 'bg-orange-100 text-orange-800 border-orange-400', label: 'Payment Due', canReview: false },
  PROCESSING: { color: 'bg-purple-100 text-purple-800 border-purple-400', label: 'Processing', canReview: false },
  PAID: { color: 'bg-green-100 text-green-800 border-green-400', label: 'Paid', canReview: false },
  OVERDUE: { color: 'bg-red-100 text-red-800 border-red-400', label: 'Overdue', canReview: false },
  CANCELLED: { color: 'bg-gray-100 text-gray-500 border-gray-300', label: 'Cancelled', canReview: false },
};

export default function FranchiseeInvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  async function fetchInvoice() {
    try {
      const res = await fetch(`/api/franchisee/invoices/${invoiceId}`);
      const json = await res.json();

      if (json.error) {
        console.error(json.error);
        return;
      }

      setData(json);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  }

  async function doApprove() {
    setShowApproveConfirm(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/franchisee/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const json = await res.json();

      if (json.success) {
        setAlertMsg(json.message);
        fetchInvoice();
      } else {
        setAlertMsg(`Error: ${json.error}`);
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
      setAlertMsg('Failed to approve invoice');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayNow() {
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/franchisee/invoices/${invoiceId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (json.error) {
        setAlertMsg(`Error: ${json.error}`);
        return;
      }

      // Redirect to Stripe Checkout
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setAlertMsg('Failed to start payment process');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleDispute() {
    if (!disputeNotes.trim()) {
      setAlertMsg('Please provide details about your dispute');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/franchisee/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispute', notes: disputeNotes }),
      });
      const json = await res.json();

      if (json.success) {
        setAlertMsg(json.message);
        setShowDisputeForm(false);
        fetchInvoice();
      } else {
        setAlertMsg(`Error: ${json.error}`);
      }
    } catch (error) {
      console.error('Error disputing invoice:', error);
      setAlertMsg('Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </WideContainer>
    );
  }

  if (!data) {
    return (
      <WideContainer className="space-y-6">
        <p className="text-red-500">Invoice not found</p>
        <Link href="/portal/royalties" className="text-brand-purple hover:underline">
          ← Back to Invoices
        </Link>
      </WideContainer>
    );
  }

  const { invoice, revenueBreakdown, payments, totalPaid } = data;
  const statusInfo = STATUS_INFO[invoice.status] || STATUS_INFO.DRAFT;
  const remaining = invoice.totalAmount - totalPaid;

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/portal/royalties" className="text-brand-purple hover:underline text-sm mb-2 block">
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            {invoice.monthName} {invoice.year}
          </h1>
          <p className="mt-1 text-gray-600">
            Invoice {invoice.invoiceNumber}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border-2 ${statusInfo.color}`}>
          <p className="text-xs font-medium opacity-75">Status</p>
          <p className="font-bold">{statusInfo.label}</p>
        </div>
      </div>

      {/* Payment Status Banner */}
      {paymentStatus === 'success' && (
        <Card className="border-2 border-green-400 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Payment Successful!</h3>
                <p className="text-sm text-green-700">
                  Thank you for your payment. It may take a few moments to reflect in your invoice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'cancelled' && (
        <Card className="border-2 border-orange-400 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Payment Cancelled</h3>
                <p className="text-sm text-orange-700">
                  Your payment was cancelled. You can try again when you&apos;re ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Required Banner */}
      {statusInfo.canReview && (
        <Card className="border-2 border-yellow-400 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-yellow-800">Action Required</h3>
                <p className="text-sm text-yellow-700">
                  Please review the revenue breakdown below and approve or dispute this invoice.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => setShowDisputeForm(!showDisputeForm)}
                  disabled={submitting}
                  className="px-6 py-2 bg-white border border-red-300 text-red-600 rounded-md font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Dispute
                </button>
              </div>
            </div>

            {/* Dispute Form */}
            {showDisputeForm && (
              <div className="mt-4 pt-4 border-t border-yellow-300">
                <label className="block text-sm font-medium text-yellow-800 mb-2">
                  Please describe the issue with this invoice:
                </label>
                <textarea
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-yellow-300 bg-white"
                  placeholder="Example: The total for online lessons seems incorrect. I only had 12 online lessons, not 15."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleDispute}
                    disabled={submitting || !disputeNotes.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Submit Dispute
                  </button>
                  <button
                    onClick={() => setShowDisputeForm(false)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Invoice Summary</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fee Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Gross Revenue</span>
                  <span className="font-medium">{formatCurrency(invoice.grossRevenue)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 text-sm">Royalty Fee ({invoice.royaltyPercent}%)</span>
                  <span className="text-sm">{formatCurrency(invoice.royaltyAmount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 text-sm">Brand Fund ({invoice.brandFundPercent}%)</span>
                  <span className="text-sm">{formatCurrency(invoice.brandFundAmount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 text-sm">Systems Fee ({invoice.systemsFeePercent}%)</span>
                  <span className="text-sm">{formatCurrency(invoice.systemsFeeAmount)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-b text-lg font-bold">
                  <span>Total Due</span>
                  <span className="text-brand-purple">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between py-1 text-green-600">
                      <span>Paid</span>
                      <span>-{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold">
                      <span>Remaining</span>
                      <span className={remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          {revenueBreakdown && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Revenue Breakdown</h2>
                <p className="text-xs text-gray-500">Data synced from TutorCruncher</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Home Lessons</p>
                    <p className="text-xl font-bold text-blue-800">{formatCurrency(revenueBreakdown.home)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Online Lessons</p>
                    <p className="text-xl font-bold text-purple-800">{formatCurrency(revenueBreakdown.online)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">School Programs</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(revenueBreakdown.school)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs text-orange-600 mb-1">Retail/Center</p>
                    <p className="text-xl font-bold text-orange-800">{formatCurrency(revenueBreakdown.retail)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Other</p>
                    <p className="text-xl font-bold text-gray-800">{formatCurrency(revenueBreakdown.other)}</p>
                  </div>
                  <div className="bg-brand-light p-4 rounded-lg border-2 border-brand-cyan">
                    <p className="text-xs text-brand-navy mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-brand-navy">{formatCurrency(revenueBreakdown.total)}</p>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{revenueBreakdown.totalLessons}</p>
                    <p className="text-xs text-gray-500">Lessons</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{revenueBreakdown.totalHours.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Hours</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{revenueBreakdown.activeStudents}</p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{revenueBreakdown.activeTutors}</p>
                    <p className="text-xs text-gray-500">Tutors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pay Now Card - Show for payable statuses with remaining balance */}
          {['APPROVED', 'PAYMENT_PENDING', 'OVERDUE'].includes(invoice.status) && remaining > 0 && (
            <Card className="border-2 border-green-500 bg-green-50">
              <CardContent className="py-5">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                  <p className="text-3xl font-bold text-brand-navy">{formatCurrency(remaining)}</p>
                  {invoice.status === 'OVERDUE' && (
                    <p className="text-sm text-red-600 font-medium mt-1">Payment Overdue</p>
                  )}
                </div>
                <button
                  onClick={handlePayNow}
                  disabled={paymentLoading}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {paymentLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="h-5 w-5" />
                      Pay Now
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Secure payment via Stripe
                </p>
              </CardContent>
            </Card>
          )}

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Key Dates</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Date</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date</span>
                <span className={invoice.paidAt ? '' : 'font-medium'}>{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between text-green-600">
                  <span>Paid</span>
                  <span className="font-medium">{formatDate(invoice.paidAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Payment History</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-gray-500">{payment.method.replace(/_/g, ' ')}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {payment.processedAt ? formatDate(payment.processedAt) : 'Processing'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Your Notes */}
          {invoice.franchiseeNotes && (
            <Card className={invoice.status === 'DISPUTED' ? 'border-red-300' : ''}>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Your Notes</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.franchiseeNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card className="bg-gray-50">
            <CardContent className="py-4">
              <h3 className="font-semibold text-brand-navy mb-2">Questions?</h3>
              <p className="text-sm text-gray-600 mb-3">
                If you have questions about this invoice or believe there&apos;s an error, please contact us.
              </p>
              <a
                href="mailto:franchising@acmefranchise.com"
                className="text-brand-purple hover:underline text-sm font-medium"
              >
                franchising@acmefranchise.com
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Approve Confirm Modal */}
      <ConfirmModal
        isOpen={showApproveConfirm}
        title="Approve Invoice"
        message="Approve this invoice? This confirms the revenue figures are accurate."
        confirmLabel="Approve"
        confirmVariant="primary"
        onConfirm={doApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={!!alertMsg}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />
    </WideContainer>
  );
}
