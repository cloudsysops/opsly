"use client";

import React from "react";
import Link from "next/link";
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Snapshot {
  id: string;
  year: number;
  month: number;
  grossRevenue: string | number;
  homeRevenue?: string | number | null;
  onlineRevenue?: string | number | null;
  retailRevenue?: string | number | null;
  schoolRevenue?: string | number | null;
  otherRevenue?: string | number | null;
  totalLessons?: number | null;
  activeStudents?: number | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  year: number;
  month: number;
  grossRevenue: string | number;
  totalAmount: string | number;
  status: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  paidAt?: string | Date | null;
}

interface FinancialsTabProps {
  franchisee: {
    id: string;
    franchiseeAccount?: {
      currentMonthRevenue?: string | number | null;
      ytdRevenue?: string | number | null;
      lastSyncAt?: string | Date | null;
      tcSnapshots?: Snapshot[];
      invoices?: Invoice[];
    } | null;
  };
}

export default function FinancialsTab({ franchisee }: FinancialsTabProps) {
  const account = franchisee.franchiseeAccount;
  const snapshots = account?.tcSnapshots || [];
  const invoices = account?.invoices || [];

  // Calculate MoM growth
  const currentMonth = snapshots[0];
  const previousMonth = snapshots[1];
  const momGrowth =
    currentMonth && previousMonth
      ? ((Number(currentMonth.grossRevenue) - Number(previousMonth.grossRevenue)) /
          Number(previousMonth.grossRevenue)) *
        100
      : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PENDING_REVIEW":
      case "APPROVED":
      case "PAYMENT_PENDING":
        return "bg-amber-100 text-amber-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "DISPUTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString("default", { month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CurrencyDollarIcon className="h-4 w-4" />
            Current Month Revenue
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {account?.currentMonthRevenue
              ? formatCurrency(Number(account.currentMonthRevenue))
              : "$0.00"}
          </p>
          {momGrowth !== null && (
            <div
              className={`flex items-center gap-1 mt-1 text-sm ${
                momGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {momGrowth >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              {Math.abs(momGrowth).toFixed(1)}% vs last month
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CurrencyDollarIcon className="h-4 w-4" />
            YTD Revenue
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {account?.ytdRevenue ? formatCurrency(Number(account.ytdRevenue)) : "$0.00"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DocumentTextIcon className="h-4 w-4" />
            Last Sync
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {account?.lastSyncAt ? formatDate(account.lastSyncAt) : "Never"}
          </p>
        </div>
      </div>

      {/* Revenue History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue History</h3>
        {snapshots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Period</th>
                  <th className="pb-3 pr-4">Gross Revenue</th>
                  <th className="pb-3 pr-4">Home</th>
                  <th className="pb-3 pr-4">Online</th>
                  <th className="pb-3 pr-4">Retail</th>
                  <th className="pb-3 pr-4">School</th>
                  <th className="pb-3 pr-4">Lessons</th>
                  <th className="pb-3">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="text-sm text-gray-900">
                    <td className="py-3 pr-4 font-medium">
                      {getMonthName(snapshot.month)} {snapshot.year}
                    </td>
                    <td className="py-3 pr-4">
                      {formatCurrency(Number(snapshot.grossRevenue))}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {snapshot.homeRevenue ? formatCurrency(Number(snapshot.homeRevenue)) : "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {snapshot.onlineRevenue ? formatCurrency(Number(snapshot.onlineRevenue)) : "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {snapshot.retailRevenue ? formatCurrency(Number(snapshot.retailRevenue)) : "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {snapshot.schoolRevenue ? formatCurrency(Number(snapshot.schoolRevenue)) : "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {snapshot.totalLessons ?? "-"}
                    </td>
                    <td className="py-3 text-gray-600">{snapshot.activeStudents ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No revenue data available yet.</p>
        )}
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
          <Link
            href={`/admin/franchisees/invoices?franchiseeId=${franchisee.id}`}
            className="text-sm text-brand-navy hover:underline"
          >
            View All
          </Link>
        </div>
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Invoice #</th>
                  <th className="pb-3 pr-4">Period</th>
                  <th className="pb-3 pr-4">Revenue</th>
                  <th className="pb-3 pr-4">Amount Due</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="text-sm text-gray-900">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/franchisees/invoices/${invoice.id}`}
                        className="text-brand-navy hover:underline font-medium"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      {getMonthName(invoice.month)} {invoice.year}
                    </td>
                    <td className="py-3 pr-4">
                      {formatCurrency(Number(invoice.grossRevenue))}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {formatCurrency(Number(invoice.totalAmount))}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{formatDate(invoice.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No invoices generated yet.</p>
        )}
      </div>
    </div>
  );
}
