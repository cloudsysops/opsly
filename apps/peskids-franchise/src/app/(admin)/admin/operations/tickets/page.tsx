"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { formatDate } from "@/lib/utils";
import { TicketIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  assignedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  firstResponseAt: string | null;
  slaDeadline: string | null;
  prospect: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  open: number;
  inProgress: number;
  resolvedToday: number;
  overdueSla: number;
}

const PRIORITY_BADGES: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-600",
};

const STATUS_BADGES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_ON_FRANCHISEE: "bg-purple-100 text-purple-800",
  WAITING_ON_ADMIN: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_FRANCHISEE: "Waiting on Franchisee",
  WAITING_ON_ADMIN: "Waiting on Admin",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: "Technical",
  BILLING: "Billing",
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  TRAINING: "Training",
  COMPLIANCE: "Compliance",
  OTHER: "Other",
};

function getSlaDisplay(ticket: Ticket): { text: string; className: string } {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    if (ticket.resolvedAt && ticket.slaDeadline) {
      const resolved = new Date(ticket.resolvedAt);
      const deadline = new Date(ticket.slaDeadline);
      if (resolved <= deadline) {
        return { text: "Met", className: "text-green-600 font-medium" };
      }
      return { text: "Missed", className: "text-red-600 font-medium" };
    }
    return { text: "Met", className: "text-green-600 font-medium" };
  }

  if (!ticket.slaDeadline) {
    return { text: "--", className: "text-gray-400" };
  }

  const now = new Date();
  const deadline = new Date(ticket.slaDeadline);
  const diff = deadline.getTime() - now.getTime();

  if (diff < 0) {
    return { text: "Overdue", className: "text-red-600 font-semibold" };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return {
      text: `${days}d ${hours % 24}h`,
      className: "text-green-600 font-medium",
    };
  }

  if (hours > 4) {
    return {
      text: `${hours}h ${minutes}m`,
      className: "text-green-600 font-medium",
    };
  }

  return {
    text: `${hours}h ${minutes}m`,
    className: "text-amber-600 font-medium",
  };
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({
    open: 0,
    inProgress: 0,
    resolvedToday: 0,
    overdueSla: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
    assignedTo: "",
  });

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.category) params.set("category", filters.category);
      if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);

      const res = await fetch(
        `/api/admin/operations/tickets?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickets(data.tickets);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <WideContainer className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TicketIcon className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Support Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage franchisee help desk requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Open</p>
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
              <span className="text-sm font-bold text-blue-700">
                {stats.open}
              </span>
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-700">{stats.open}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">In Progress</p>
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100">
              <span className="text-sm font-bold text-amber-700">
                {stats.inProgress}
              </span>
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {stats.inProgress}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Resolved Today</p>
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
              <span className="text-sm font-bold text-green-700">
                {stats.resolvedToday}
              </span>
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {stats.resolvedToday}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Overdue SLA</p>
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100">
              <span className="text-sm font-bold text-red-700">
                {stats.overdueSla}
              </span>
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {stats.overdueSla}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priority: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={filters.assignedTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, assignedTo: e.target.value }))
              }
              placeholder="Filter by assignee..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <TicketIcon className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-medium text-slate-900">
              No tickets found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {filters.status || filters.priority || filters.category || filters.assignedTo
                ? "Try adjusting your filters."
                : "No support tickets have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ticket #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Submitter
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    SLA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => {
                  const sla = getSlaDisplay(ticket);
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/admin/operations/tickets/${ticket.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {ticket.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/operations/tickets/${ticket.id}`}
                          className="text-sm text-slate-900 hover:text-indigo-600 line-clamp-1 max-w-xs block"
                        >
                          {ticket.subject}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {ticket.prospect.firstName} {ticket.prospect.lastName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            PRIORITY_BADGES[ticket.priority] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_BADGES[ticket.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm ${sla.className}`}>
                          {sla.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {ticket.assignedTo || (
                          <span className="text-slate-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WideContainer>
  );
}
