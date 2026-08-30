'use client';

import { useState, useEffect } from 'react';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Invoice {
  id: string;
  invoiceNumber: string;
  franchiseeId: string;
  franchiseeName: string;
  franchiseeEmail: string;
  territory: string | null;
  year: number;
  month: number;
  grossRevenue: number;
  totalAmount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
  sentToFranchiseeAt: string | null;
  franchiseeApproved: boolean | null;
  totalPaid: number;
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
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchInvoices();
  }, [filters, pagination.page]);

  async function fetchInvoices() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        year: filters.year.toString(),
      });
      if (filters.month) params.set('month', filters.month);
      if (filters.status) params.set('status', filters.status);

      const res = await fetch(`/api/admin/royalties/invoices?${params}`);
      const json = await res.json();
      setInvoices(json.invoices);
      setPagination(json.pagination);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">All Invoices</h1>
          <p className="mt-1 text-gray-600">
            View and manage royalty invoices
          </p>
        </div>
        <Link
          href="/admin/royalties"
          className="text-brand-purple hover:underline text-sm"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="rounded-md border-gray-300 text-sm"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value="">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_COLORS).map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Franchisee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Due</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="animate-pulse flex justify-center">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No invoices found matching your filters.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/royalties/invoices/${invoice.id}`}
                          className="font-mono text-sm text-brand-purple hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.franchiseeName}</p>
                          <p className="text-xs text-gray-500">{invoice.territory || 'No territory'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {MONTHS[invoice.month - 1]} {invoice.year}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {formatCurrency(invoice.grossRevenue)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
                          {invoice.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {invoice.paidAt ? (
                          <span className="text-green-600 text-sm font-medium">
                            {formatCurrency(invoice.totalPaid)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/royalties/invoices/${invoice.id}`}
                          className="text-brand-purple hover:underline text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </WideContainer>
  );
}
