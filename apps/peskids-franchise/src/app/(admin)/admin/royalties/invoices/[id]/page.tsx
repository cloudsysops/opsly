'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowDownTrayIcon,
  XMarkIcon,
  EnvelopeIcon,
  PaperClipIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface InvoiceDetail {
  invoice: {
    id: string;
    invoiceNumber: string;
    franchiseeId: string;
    franchiseeName: string;
    franchiseeEmail: string;
    franchiseePhone: string | null;
    year: number;
    month: number;
    grossRevenue: number;
    royaltyAmount: number;
    royaltyPercent: number;
    brandFundAmount: number;
    brandFundPercent: number;
    systemsFeeAmount: number;
    systemsFeePercent: number;
    adjustmentAmount: number | null;
    adjustmentReason: string | null;
    totalAmount: number;
    status: string;
    invoiceDate: string;
    dueDate: string;
    paidAt: string | null;
    sentToFranchiseeAt: string | null;
    franchiseeReviewedAt: string | null;
    franchiseeApproved: boolean | null;
    franchiseeNotes: string | null;
    createdAt: string;
  };
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    processedAt: string | null;
    failureReason: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  snapshot: {
    grossRevenue: number;
    homeRevenue: number | null;
    onlineRevenue: number | null;
    retailRevenue: number | null;
    schoolRevenue: number | null;
    otherRevenue: number | null;
    totalLessons: number | null;
    totalHours: number | null;
    activeStudents: number | null;
    activeTutors: number | null;
    syncedAt: string;
  } | null;
  ledgerEntries: Array<{
    id: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-blue-50 text-blue-800 border-blue-300',
  DISPUTED: 'bg-red-50 text-red-800 border-red-300',
  PAYMENT_PENDING: 'bg-orange-50 text-orange-800 border-orange-300',
  PROCESSING: 'bg-purple-50 text-purple-800 border-purple-300',
  PAID: 'bg-green-50 text-green-800 border-green-300',
  OVERDUE: 'bg-red-50 text-red-800 border-red-300',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-300',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, method: 'MANUAL', notes: '' });
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{
    to: string;
    subject: string;
    html: string;
    attachments: Array<{ name: string; type: string }>;
  } | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: string; extraData?: Record<string, unknown> } | null>(null);
  const [showCollectConfirm, setShowCollectConfirm] = useState(false);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  async function fetchInvoice() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}`);
      const json = await res.json();
      setData(json);
      setPaymentData({ ...paymentData, amount: json.invoice.totalAmount });
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action: string, extraData?: Record<string, unknown>) {
    setPendingAction({ action, extraData });
  }

  async function doHandleAction() {
    if (!pendingAction) return;
    const { action, extraData } = pendingAction;
    setPendingAction(null);

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      });
      const json = await res.json();

      if (json.success) {
        setAlertMsg(json.message);
        fetchInvoice();
      } else {
        setAlertMsg(`Error: ${json.error}`);
      }
    } catch (error) {
      console.error('Error performing action:', error);
      setAlertMsg('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  }

  async function openEmailPreview() {
    setEmailPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}/email-preview`);
      const json = await res.json();
      if (json.error) {
        setAlertMsg(`Error: ${json.error}`);
        return;
      }
      setEmailPreview(json);
      setEditedSubject(json.subject);
      setPersonalNote('');
      setShowEmailPreview(true);
    } catch (error) {
      console.error('Error fetching email preview:', error);
      setAlertMsg('Failed to load email preview');
    } finally {
      setEmailPreviewLoading(false);
    }
  }

  async function handleSendInvoice() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          customSubject: editedSubject !== emailPreview?.subject ? editedSubject : undefined,
          personalNote: personalNote.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setShowEmailPreview(false);
        setAlertMsg(json.message);
        fetchInvoice();
      } else {
        setAlertMsg(`Error: ${json.error}`);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      setAlertMsg('Failed to send invoice');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecordPayment() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          ...paymentData,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setAlertMsg(json.message);
        setShowPaymentForm(false);
        fetchInvoice();
      } else {
        setAlertMsg(`Error: ${json.error}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      setAlertMsg('Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        setAlertMsg(json.message);
        router.push('/admin/royalties/invoices');
      } else {
        setAlertMsg(`Error: ${json.error}`);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setAlertMsg('Failed to delete invoice');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  }

  function collectPayment() {
    setShowCollectConfirm(true);
  }

  async function doCollectPayment() {
    setShowCollectConfirm(false);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/royalties/invoices/${id}/collect`, {
        method: 'POST',
      });
      const json = await res.json();

      if (json.error) {
        setAlertMsg(`Error: ${json.error}`);
        return;
      }

      if (json.checkoutUrl) {
        // Copy checkout URL to clipboard
        await navigator.clipboard.writeText(json.checkoutUrl);
        setPendingCheckoutUrl(json.checkoutUrl);
        setAlertMsg('Payment link created and copied to clipboard!\n\nSend this link to the franchisee to complete the ACH payment.');
      }

      fetchInvoice();
    } catch (error) {
      console.error('Error collecting payment:', error);
      setAlertMsg('Failed to initiate payment collection');
    } finally {
      setActionLoading(false);
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
        <Link href="/admin/royalties/invoices" className="text-brand-purple hover:underline">
          ← Back to Invoices
        </Link>
      </WideContainer>
    );
  }

  const { invoice, payments, snapshot, ledgerEntries } = data;
  const totalPaid = payments.reduce((sum, p) => p.status === 'SUCCEEDED' ? sum + p.amount : sum, 0);
  const remaining = invoice.totalAmount - totalPaid;

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/admin/royalties/invoices" className="text-brand-purple hover:underline text-sm mb-2 block">
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            Invoice {invoice.invoiceNumber}
          </h1>
          <p className="mt-1 text-gray-600">
            {MONTHS[invoice.month - 1]} {invoice.year} • {invoice.franchiseeName}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border-2 ${STATUS_COLORS[invoice.status]}`}>
          <p className="text-xs font-medium opacity-75">Status</p>
          <p className="font-bold">{invoice.status.replace(/_/g, ' ')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Invoice Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Franchisee</p>
                  <p className="font-medium">{invoice.franchiseeName}</p>
                  <p className="text-sm text-gray-600">{invoice.franchiseeEmail}</p>
                  {invoice.franchiseePhone && (
                    <p className="text-sm text-gray-600">{invoice.franchiseePhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-medium">{MONTHS[invoice.month - 1]} {invoice.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>

              <hr />

              {/* Fee Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Revenue</span>
                  <span className="font-medium">{formatCurrency(invoice.grossRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Royalty Fee ({invoice.royaltyPercent}%)</span>
                  <span>{formatCurrency(invoice.royaltyAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Brand Fund ({invoice.brandFundPercent}%)</span>
                  <span>{formatCurrency(invoice.brandFundAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Systems Fee ({invoice.systemsFeePercent}%)</span>
                  <span>{formatCurrency(invoice.systemsFeeAmount)}</span>
                </div>
                {invoice.adjustmentAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Adjustment</span>
                    <span className={invoice.adjustmentAmount < 0 ? 'text-green-600' : ''}>
                      {formatCurrency(invoice.adjustmentAmount)}
                    </span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Due</span>
                  <span className="text-brand-purple">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid</span>
                      <span>-{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
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

          {/* Revenue Breakdown (from TC Snapshot) */}
          {snapshot && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Revenue Breakdown</h2>
                <p className="text-xs text-gray-500">From TutorCruncher • Synced {formatDate(snapshot.syncedAt)}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600">Home Lessons</p>
                    <p className="text-lg font-bold text-blue-800">{formatCurrency(snapshot.homeRevenue || 0)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600">Online Lessons</p>
                    <p className="text-lg font-bold text-purple-800">{formatCurrency(snapshot.onlineRevenue || 0)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600">School Programs</p>
                    <p className="text-lg font-bold text-green-800">{formatCurrency(snapshot.schoolRevenue || 0)}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-orange-600">Retail/Center</p>
                    <p className="text-lg font-bold text-orange-800">{formatCurrency(snapshot.retailRevenue || 0)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Other</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(snapshot.otherRevenue || 0)}</p>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{snapshot.totalLessons || 0}</p>
                    <p className="text-xs text-gray-500">Lessons</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{snapshot.totalHours?.toFixed(1) || 0}</p>
                    <p className="text-xs text-gray-500">Hours</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{snapshot.activeStudents || 0}</p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{snapshot.activeTutors || 0}</p>
                    <p className="text-xs text-gray-500">Tutors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Franchisee Notes */}
          {(invoice.franchiseeNotes || invoice.status === 'DISPUTED') && (
            <Card className={invoice.status === 'DISPUTED' ? 'border-red-300 bg-red-50' : ''}>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Franchisee Response</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-1">
                  {invoice.franchiseeApproved ? 'Approved' : 'Disputed'} on {formatDate(invoice.franchiseeReviewedAt || '')}
                </p>
                <p className="whitespace-pre-wrap">{invoice.franchiseeNotes || 'No notes provided'}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Actions</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={openEmailPreview}
                  disabled={actionLoading || emailPreviewLoading}
                  className="w-full px-4 py-2 bg-brand-purple text-white rounded-md font-medium hover:bg-brand-purple/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  {emailPreviewLoading ? 'Loading...' : 'Send to Franchisee'}
                </button>
              )}

              {invoice.status === 'DISPUTED' && (
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Override & Approve
                </button>
              )}

              {invoice.status === 'APPROVED' && (
                <button
                  onClick={() => handleAction('mark_payment_pending')}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  Mark Payment Pending
                </button>
              )}

              {['PAYMENT_PENDING', 'APPROVED', 'OVERDUE'].includes(invoice.status) && (
                <>
                  <button
                    onClick={collectPayment}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <BanknotesIcon className="h-5 w-5" />
                    Collect via ACH
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
                  >
                    Record Manual Payment
                  </button>
                </>
              )}

              {['DRAFT', 'PENDING_REVIEW'].includes(invoice.status) && (
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel Invoice
                </button>
              )}

              {['DRAFT', 'PENDING_REVIEW', 'CANCELLED'].includes(invoice.status) && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md font-medium hover:bg-red-100 flex items-center justify-center gap-2"
                >
                  <TrashIcon className="h-5 w-5" />
                  Delete Invoice
                </button>
              )}

              <hr className="my-2" />

              <a
                href={`/api/admin/royalties/invoices/${id}/pdf?download=true`}
                className="w-full px-4 py-2 bg-brand-navy text-white rounded-md font-medium hover:bg-brand-navy/90 flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download PDF
              </a>
            </CardContent>
          </Card>

          {/* Record Payment Form */}
          {showPaymentForm && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Record Payment</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                    className="w-full rounded-md border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={paymentData.method}
                    onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                    className="w-full rounded-md border-gray-300"
                  >
                    <option value="MANUAL">Manual Entry</option>
                    <option value="ACH_DIRECT">ACH Direct</option>
                    <option value="CHECK">Check</option>
                    <option value="WIRE">Wire Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300"
                    placeholder="Check #, reference number, etc."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRecordPayment}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Save Payment
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy">Payment History</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-500">{payment.method.replace(/_/g, ' ')}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          payment.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                          payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      {payment.processedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(payment.processedAt)}
                        </p>
                      )}
                      {payment.failureReason && (
                        <p className="text-xs text-red-600 mt-1">{payment.failureReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Timeline</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDate(invoice.createdAt)}</span>
                </div>
                {invoice.sentToFranchiseeAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sent</span>
                    <span>{formatDate(invoice.sentToFranchiseeAt)}</span>
                  </div>
                )}
                {invoice.franchiseeReviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reviewed</span>
                    <span>{formatDate(invoice.franchiseeReviewedAt)}</span>
                  </div>
                )}
                {invoice.paidAt && (
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showEmailPreview && emailPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  Email Preview
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Review the email before sending to franchisee
                </p>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Email Details */}
            <div className="px-6 py-4 border-b bg-gray-50 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-16">To:</span>
                <span className="font-medium">{emailPreview.to}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-500 w-16">Subject:</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-purple focus:border-brand-purple"
                />
              </div>
              {emailPreview.attachments.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 w-16">Attach:</span>
                  <div className="flex flex-wrap gap-2">
                    {emailPreview.attachments.map((att, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        <PaperClipIcon className="h-3 w-3" />
                        {att.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Personal Note */}
            <div className="px-6 py-4 border-b bg-yellow-50">
              <label className="block text-sm font-medium text-yellow-800 mb-2">
                Add a Personal Note (optional)
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="e.g., Great job this month! Keep up the excellent work..."
                rows={2}
                className="w-full px-3 py-2 border border-yellow-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              />
              <p className="text-xs text-yellow-700 mt-1">
                This note will appear at the beginning of the email, before the invoice details.
              </p>
            </div>

            {/* Email Body Preview */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              <div className="bg-white rounded-lg shadow border">
                <iframe
                  srcDoc={personalNote ? emailPreview.html.replace(
                    '<p>Hi ',
                    `<div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin-bottom: 20px;"><p style="margin: 0; color: #92400E; font-style: italic;">${personalNote.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p></div><p>Hi `
                  ) : emailPreview.html}
                  className="w-full h-[350px] border-0"
                  title="Email Preview"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowEmailPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvoice}
                disabled={actionLoading}
                className="px-6 py-2 bg-brand-purple text-white rounded-lg font-medium hover:bg-brand-purple/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {actionLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-red-50 rounded-t-xl">
              <div className="p-2 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-800">
                  Delete Invoice
                </h2>
                <p className="text-sm text-red-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> You are about to permanently delete invoice{' '}
                  <span className="font-mono font-bold">{invoice.invoiceNumber}</span>.
                </p>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>All payment records will be deleted</li>
                  <li>All ledger entries will be removed</li>
                  <li>This invoice cannot be recovered</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!alertMsg && !pendingCheckoutUrl}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />

      <ConfirmModal
        isOpen={!!alertMsg && !!pendingCheckoutUrl}
        title="Payment Link Created"
        message={alertMsg || ""}
        confirmLabel="Open Payment Page"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={() => {
          if (pendingCheckoutUrl) {
            window.open(pendingCheckoutUrl, '_blank');
          }
          setPendingCheckoutUrl(null);
          setAlertMsg(null);
        }}
        onCancel={() => {
          setPendingCheckoutUrl(null);
          setAlertMsg(null);
        }}
      />

      <ConfirmModal
        isOpen={!!pendingAction}
        title="Confirm Action"
        message={pendingAction ? `Are you sure you want to ${pendingAction.action.replace(/_/g, ' ').toLowerCase()} this invoice?` : ""}
        confirmLabel="Confirm"
        confirmVariant="danger"
        onConfirm={doHandleAction}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmModal
        isOpen={showCollectConfirm}
        title="Collect Payment"
        message="This will create a Stripe Checkout session for ACH payment. The franchisee will need to enter their bank details. Continue?"
        confirmLabel="Continue"
        confirmVariant="primary"
        onConfirm={doCollectPayment}
        onCancel={() => setShowCollectConfirm(false)}
      />
    </WideContainer>
  );
}
