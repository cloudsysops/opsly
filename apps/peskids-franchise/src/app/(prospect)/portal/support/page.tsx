"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  TicketIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  firstResponseAt: string | null;
  slaDeadline: string | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  URGENT: { bg: "bg-red-100", text: "text-red-800", label: "Urgent", dot: "bg-red-500" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800", label: "High", dot: "bg-orange-500" },
  MEDIUM: { bg: "bg-blue-100", text: "text-blue-800", label: "Medium", dot: "bg-blue-500" },
  LOW: { bg: "bg-gray-100", text: "text-gray-600", label: "Low", dot: "bg-gray-400" },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  OPEN: { bg: "bg-blue-100", text: "text-blue-800", label: "Open", icon: InboxIcon },
  IN_PROGRESS: { bg: "bg-amber-100", text: "text-amber-800", label: "In Progress", icon: ClockIcon },
  WAITING_ON_FRANCHISEE: { bg: "bg-purple-100", text: "text-purple-800", label: "Waiting on You", icon: BellAlertIcon },
  WAITING_ON_ADMIN: { bg: "bg-orange-100", text: "text-orange-800", label: "Waiting on Support", icon: ClockIcon },
  RESOLVED: { bg: "bg-green-100", text: "text-green-800", label: "Resolved", icon: CheckCircleIcon },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-600", label: "Closed", icon: CheckCircleIcon },
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

const CATEGORY_ICONS: Record<string, string> = {
  TECHNICAL: "🔧",
  BILLING: "💳",
  OPERATIONS: "⚙️",
  MARKETING: "📢",
  TRAINING: "📚",
  COMPLIANCE: "✅",
  OTHER: "📋",
};

function getSLAStatus(ticket: Ticket): { label: string; className: string; urgent: boolean } {
  if (ticket.firstResponseAt) {
    return { label: "Responded", className: "text-green-600", urgent: false };
  }

  if (!ticket.slaDeadline) {
    return { label: "Pending", className: "text-gray-500", urgent: false };
  }

  const deadline = new Date(ticket.slaDeadline);
  const now = new Date();
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < 0) {
    return { label: "Overdue", className: "text-red-600 font-semibold", urgent: true };
  } else if (hoursRemaining < 4) {
    return { label: `${Math.ceil(hoursRemaining)}h left`, className: "text-amber-600 font-medium", urgent: true };
  } else if (hoursRemaining < 24) {
    return { label: `${Math.ceil(hoursRemaining)}h left`, className: "text-blue-600", urgent: false };
  }

  return { label: `${Math.ceil(hoursRemaining / 24)}d left`, className: "text-gray-500", urgent: false };
}

export default function FranchiseeSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/franchisee/operations/tickets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetch("/api/franchisee/operations/tickets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Error refreshing tickets:", error);
    }
  }, []);

  // Calculate summary stats
  const openTickets = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
  const waitingOnYou = tickets.filter((t) => t.status === "WAITING_ON_FRANCHISEE");
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");
  const urgentTickets = tickets.filter((t) =>
    (t.priority === "URGENT" || t.priority === "HIGH") &&
    !["RESOLVED", "CLOSED"].includes(t.status)
  );

  // Apply filters
  let filteredTickets = tickets;
  if (statusFilter) {
    filteredTickets = filteredTickets.filter((t) => t.status === statusFilter);
  }
  if (categoryFilter) {
    filteredTickets = filteredTickets.filter((t) => t.category === categoryFilter);
  }

  // Sort by priority and status
  filteredTickets = [...filteredTickets].sort((a, b) => {
    // Waiting on franchisee first
    if (a.status === "WAITING_ON_FRANCHISEE" && b.status !== "WAITING_ON_FRANCHISEE") return -1;
    if (b.status === "WAITING_ON_FRANCHISEE" && a.status !== "WAITING_ON_FRANCHISEE") return 1;

    // Then by priority
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                         (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
    if (priorityDiff !== 0) return priorityDiff;

    // Then by date
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
            <TicketIcon className="h-8 w-8 text-indigo-600" />
            Help Desk
          </h1>
          <p className="mt-1 text-gray-600">
            Submit and track your support requests
          </p>
        </div>
        <Link
          href="/portal/support/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white font-medium rounded-lg hover:bg-brand-purple/90 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          New Ticket
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={waitingOnYou.length > 0 ? "border-purple-300 bg-purple-50" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <BellAlertIcon className={`h-5 w-5 ${waitingOnYou.length > 0 ? "text-purple-600" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500">Needs Your Response</span>
            </div>
            <p className={`text-2xl font-bold ${waitingOnYou.length > 0 ? "text-purple-600" : "text-gray-600"}`}>
              {waitingOnYou.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <InboxIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">Open Tickets</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{openTickets.length}</p>
          </CardContent>
        </Card>

        <Card className={urgentTickets.length > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className={`h-5 w-5 ${urgentTickets.length > 0 ? "text-red-600" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500">High Priority</span>
            </div>
            <p className={`text-2xl font-bold ${urgentTickets.length > 0 ? "text-red-600" : "text-gray-600"}`}>
              {urgentTickets.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-500">Resolved</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{resolvedTickets.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Alert */}
      {waitingOnYou.length > 0 && (
        <Card className="border-purple-300 bg-purple-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <BellAlertIcon className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-800">Action Required</span>
            </div>
            <div className="space-y-2">
              {waitingOnYou.slice(0, 3).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/portal/support/${ticket.id}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">{ticket.ticketNumber}</span>
                    <span className="text-gray-500 mx-2">·</span>
                    <span className="text-gray-700 truncate">{ticket.subject}</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </Link>
              ))}
              {waitingOnYou.length > 3 && (
                <p className="text-sm text-purple-600 text-center pt-1">
                  +{waitingOnYou.length - 3} more tickets need your response
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Filter by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 text-base font-medium text-gray-900">
                {tickets.length === 0 ? "No support tickets yet" : "No tickets match your filters"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {tickets.length === 0 ? "Need help? Submit a new ticket." : "Try adjusting your filters."}
              </p>
              {tickets.length === 0 && (
                <Link
                  href="/portal/support/new"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-purple text-white text-sm font-medium rounded-lg hover:bg-brand-purple/90 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  New Ticket
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => {
                const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
                const StatusIcon = status.icon;
                const slaStatus = getSLAStatus(ticket);
                const needsAttention = ticket.status === "WAITING_ON_FRANCHISEE" || slaStatus.urgent;

                return (
                  <Link
                    key={ticket.id}
                    href={`/portal/support/${ticket.id}`}
                    className={`block hover:bg-gray-50 transition-colors ${needsAttention ? "bg-purple-50/50" : ""}`}
                  >
                    <div className="p-5 flex items-center gap-4">
                      {/* Priority Indicator */}
                      <div className={`w-1.5 h-12 rounded-full ${priority.dot}`} />

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-brand-purple">{ticket.ticketNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            <StatusIcon className="h-3 w-3 inline mr-1" />
                            {status.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                            {priority.label}
                          </span>
                          {ticket.commentCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                              {ticket.commentCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-gray-900 font-medium truncate">{ticket.subject}</p>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                          <span>{CATEGORY_ICONS[ticket.category]} {CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                          <span>Updated {formatDate(ticket.updatedAt)}</span>
                        </div>
                      </div>

                      {/* SLA Status */}
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className={`h-4 w-4 ${slaStatus.className}`} />
                          <span className={`text-sm ${slaStatus.className}`}>{slaStatus.label}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardContent className="py-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need Immediate Help?</h3>
          <p className="text-sm text-gray-600">
            For urgent issues affecting your operations, please contact us directly at{" "}
            <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
              franchising@acmefranchise.com
            </a>
            {" "}or call our support line. Regular tickets are typically responded to within 24 hours.
          </p>
        </CardContent>
      </Card>
    </WideContainer>
    </PullToRefresh>
  );
}
