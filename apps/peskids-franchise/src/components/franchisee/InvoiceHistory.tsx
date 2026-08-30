'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Payment {
  amount: number;
  method: string;
  processedAt: string;
}

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
  payments?: Payment[];
}

interface InvoiceHistoryProps {
  invoices: Invoice[];
  showPayments?: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; label: string }> = {
  DRAFT: { icon: ClockIcon, bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  PENDING_REVIEW: { icon: ClockIcon, bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
  APPROVED: { icon: CheckCircleIcon, bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
  DISPUTED: { icon: ExclamationTriangleIcon, bg: 'bg-red-100', text: 'text-red-800', label: 'Disputed' },
  PAYMENT_PENDING: { icon: ClockIcon, bg: 'bg-orange-100', text: 'text-orange-800', label: 'Payment Due' },
  PROCESSING: { icon: ClockIcon, bg: 'bg-purple-100', text: 'text-purple-800', label: 'Processing' },
  PAID: { icon: CheckCircleIcon, bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  OVERDUE: { icon: XCircleIcon, bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
  CANCELLED: { icon: XCircleIcon, bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function InvoiceHistory({ invoices, showPayments = true }: InvoiceHistoryProps) {
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  // Get unique years for filter
  const years = [...new Set(invoices.map((i) => i.year))].sort((a, b) => b - a);

  // Filter invoices
  const filteredInvoices = yearFilter === 'all'
    ? invoices
    : invoices.filter((i) => i.year === yearFilter);

  // Group by year
  const groupedByYear = filteredInvoices.reduce((acc, invoice) => {
    if (!acc[invoice.year]) acc[invoice.year] = [];
    acc[invoice.year].push(invoice);
    return acc;
  }, {} as Record<number, Invoice[]>);

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      {years.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter by year:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setYearFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                yearFilter === 'all'
                  ? 'bg-brand-navy text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setYearFilter(year)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  yearFilter === year
                    ? 'bg-brand-navy text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Invoice List */}
      {Object.entries(groupedByYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, yearInvoices]) => (
          <div key={year}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {year}
            </h3>
            <div className="space-y-2">
              {yearInvoices.map((invoice) => {
                const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = status.icon;
                const isExpanded = expandedInvoice === invoice.id;

                return (
                  <div
                    key={invoice.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    {/* Main Row */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${status.bg}`}
                        >
                          <StatusIcon className={`h-5 w-5 ${status.text}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {MONTHS[invoice.month - 1]} {invoice.year}
                          </p>
                          <p className="text-sm text-gray-500">{invoice.invoiceNumber}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Revenue</p>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(invoice.grossRevenue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Royalty</p>
                          <p className="font-bold text-brand-navy">
                            {formatCurrency(invoice.totalAmount)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                        >
                          {status.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/portal/royalties/${invoice.id}`}
                            className="p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </Link>
                          {showPayments && invoice.payments && invoice.payments.length > 0 && (
                            <button
                              onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)}
                              className="p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Payments"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="h-5 w-5" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Payment Details */}
                    {isExpanded && invoice.payments && invoice.payments.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Payment History
                        </h4>
                        <div className="space-y-2">
                          {invoice.payments.map((payment, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {payment.method === 'ACH' ? 'ACH Bank Transfer' : payment.method}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(payment.processedAt)}
                                  </p>
                                </div>
                              </div>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(payment.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fee Breakdown (collapsed) */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Fee Breakdown
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">Royalty (7%)</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(invoice.royaltyAmount)}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">Brand Fund (1%)</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(invoice.brandFund)}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">Systems Fee (2%)</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(invoice.systemsFee)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <DocumentArrowDownIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No invoices found</p>
          <p className="text-sm">Invoices will appear here once generated.</p>
        </div>
      )}
    </div>
  );
}
