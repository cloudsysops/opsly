"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import {
  ArrowPathIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface Renewal {
  id: string;
  renewalNumber: number;
  status: string;
  initiatedAt: string;
  effectiveDate: string | null;
  responseDeadline: string | null;
  franchiseeIntent: string | null;
  franchisorDecision: string | null;
  agreement: {
    id: string;
    agreementNumber: string;
    endDate: string;
    franchiseeAccount: {
      id: string;
      prospect: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  };
}

const statusColors: Record<string, string> = {
  PENDING_NOTICE: "bg-gray-100 text-gray-800",
  NOTICE_SENT: "bg-blue-100 text-blue-800",
  AWAITING_RESPONSE: "bg-yellow-100 text-yellow-800",
  INTENT_RECEIVED: "bg-purple-100 text-purple-800",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-800",
  NEGOTIATING: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  NON_RENEWAL: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-red-100 text-red-800",
  TRANSFERRED: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  PENDING_NOTICE: "Pending Notice",
  NOTICE_SENT: "Notice Sent",
  AWAITING_RESPONSE: "Awaiting Response",
  INTENT_RECEIVED: "Intent Received",
  UNDER_REVIEW: "Under Review",
  NEGOTIATING: "Negotiating",
  APPROVED: "Approved",
  DECLINED: "Declined",
  NON_RENEWAL: "Non-Renewal",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
  TRANSFERRED: "Transferred",
};

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRenewals();
  }, [statusFilter]);

  const fetchRenewals = async () => {
    try {
      const res = await fetch(`/api/admin/renewals?status=${statusFilter}`);
      const data = await res.json();
      setRenewals(data.renewals || []);
    } catch (error) {
      console.error("Failed to fetch renewals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRenewals = renewals.filter((r) => {
    if (!searchQuery) return true;
    const fullName = `${r.agreement.franchiseeAccount.prospect.firstName} ${r.agreement.franchiseeAccount.prospect.lastName}`;
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.agreement.agreementNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Group by status for summary
  const actionRequired = renewals.filter((r) =>
    ["NOTICE_SENT", "INTENT_RECEIVED", "APPROVED"].includes(r.status)
  ).length;
  const awaitingResponse = renewals.filter((r) =>
    ["AWAITING_RESPONSE"].includes(r.status)
  ).length;
  const inProgress = renewals.filter((r) =>
    ["UNDER_REVIEW", "NEGOTIATING"].includes(r.status)
  ).length;

  function getDaysUntilDeadline(deadline: string | null) {
    if (!deadline) return null;
    const days = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  }

  function getUrgencyBadge(renewal: Renewal) {
    const deadline = renewal.responseDeadline;
    if (!deadline) return null;
    const days = getDaysUntilDeadline(deadline);
    if (days === null) return null;

    if (days < 0) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Overdue
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
          <ClockIcon className="h-3 w-3 mr-1" />
          {days} days
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <CalendarIcon className="h-3 w-3 mr-1" />
          {days} days
        </span>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <WideContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renewal Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage franchise agreement renewals
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Action Required</p>
                <p className="text-2xl font-bold text-gray-900">{actionRequired}</p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Awaiting Response</p>
                <p className="text-2xl font-bold text-gray-900">{awaitingResponse}</p>
              </div>
              <ClockIcon className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgress}</p>
              </div>
              <ArrowPathIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Active</p>
                <p className="text-2xl font-bold text-gray-900">{renewals.length}</p>
              </div>
              <CalendarIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by franchisee name or agreement number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-purple focus:border-brand-purple"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full sm:w-48 px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-brand-purple focus:border-brand-purple bg-white"
              >
                <option value="active">Active Renewals</option>
                <option value="all">All Renewals</option>
                <option value="NOTICE_SENT">Notice Sent</option>
                <option value="INTENT_RECEIVED">Intent Received</option>
                <option value="APPROVED">Approved</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Renewals Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agreement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Intent
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRenewals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {renewals.length === 0 ? (
                      <div>
                        <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 font-medium">No renewals found</p>
                        <p className="text-sm">
                          Renewals will appear here when agreements approach their end dates.
                        </p>
                      </div>
                    ) : (
                      <p>No renewals match your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRenewals.map((renewal) => (
                  <tr key={renewal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/franchisees/${renewal.agreement.franchiseeAccount.id}`}
                        className="text-gray-900 hover:text-brand-purple font-medium"
                      >
                        {renewal.agreement.franchiseeAccount.prospect.firstName}{" "}
                        {renewal.agreement.franchiseeAccount.prospect.lastName}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {renewal.agreement.franchiseeAccount.prospect.email}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/franchisees/agreements/${renewal.agreement.id}`}
                        className="text-brand-purple hover:text-brand-purple/80 font-medium"
                      >
                        {renewal.agreement.agreementNumber}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Expires: {new Date(renewal.agreement.endDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[renewal.status]
                        }`}
                      >
                        {statusLabels[renewal.status]}
                      </span>
                      {getUrgencyBadge(renewal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {renewal.responseDeadline
                        ? new Date(renewal.responseDeadline).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renewal.franchiseeIntent ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            renewal.franchiseeIntent === "RENEW"
                              ? "bg-green-100 text-green-800"
                              : renewal.franchiseeIntent === "NOT_RENEWING"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {renewal.franchiseeIntent === "RENEW" && (
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {renewal.franchiseeIntent === "NOT_RENEWING" && (
                            <XCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {renewal.franchiseeIntent.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/franchisees/agreements/${renewal.agreement.id}`}
                        className="text-brand-purple hover:text-brand-purple/80"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WideContainer>
  );
}
