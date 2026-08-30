"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeftIcon,
  TicketIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Comment {
  id: string;
  authorEmail: string;
  authorName: string;
  authorRole: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

interface TicketDetail {
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
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_FRANCHISEE: "Waiting on Franchisee",
  WAITING_ON_ADMIN: "Waiting on Admin",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_BADGES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_ON_FRANCHISEE: "bg-purple-100 text-purple-800",
  WAITING_ON_ADMIN: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

const PRIORITY_BADGES: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-600",
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

function getSlaCountdown(deadline: string | null, status: string): { text: string; className: string } {
  if (status === "RESOLVED" || status === "CLOSED") {
    return { text: "Resolved", className: "text-green-600" };
  }
  if (!deadline) {
    return { text: "No SLA set", className: "text-slate-400" };
  }

  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();

  if (diff < 0) {
    const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    return { text: `Overdue by ${hours}h`, className: "text-red-600 font-semibold" };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d ${hours % 24}h remaining`, className: "text-green-600" };
  }

  if (hours > 4) {
    return { text: `${hours}h ${minutes}m remaining`, className: "text-green-600" };
  }

  return { text: `${hours}h ${minutes}m remaining`, className: "text-amber-600" };
}

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/operations/tickets/${ticketId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTicket(data.ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  async function handleSendReply() {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/admin/operations/tickets/${ticketId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: replyContent,
            isInternal,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to send");

      // If the ticket was WAITING_ON_ADMIN, move it to IN_PROGRESS
      if (ticket?.status === "WAITING_ON_ADMIN" && !isInternal) {
        await handleUpdateField("status", "IN_PROGRESS");
      }

      setReplyContent("");
      setIsInternal(false);
      await fetchTicket();
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateField(field: string, value: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/operations/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchTicket();
    } catch (error) {
      console.error("Error updating ticket:", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleResolve() {
    if (!resolution.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/operations/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          resolution,
        }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      setShowResolveModal(false);
      setResolution("");
      await fetchTicket();
    } catch (error) {
      console.error("Error resolving ticket:", error);
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="py-6">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </WideContainer>
    );
  }

  if (!ticket) {
    return (
      <WideContainer className="py-6">
        <div className="text-center py-20">
          <TicketIcon className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-medium text-slate-900">
            Ticket not found
          </h3>
          <Link
            href="/admin/operations/tickets"
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            Back to tickets
          </Link>
        </div>
      </WideContainer>
    );
  }

  const sla = getSlaCountdown(ticket.slaDeadline, ticket.status);

  return (
    <WideContainer className="py-6 space-y-6">
      {/* Back link */}
      <Link
        href="/admin/operations/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to tickets
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {ticket.ticketNumber}
        </h1>
        <span className="text-xl sm:text-2xl text-slate-400 hidden sm:inline">
          --
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-700">
          {ticket.subject}
        </h2>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original description */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserCircleIcon className="h-6 w-6 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">
                {ticket.prospect.firstName} {ticket.prospect.lastName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                Franchisee
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                {formatDateTime(ticket.createdAt)}
              </span>
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Comments thread */}
          {ticket.comments.map((comment) => {
            const isAdmin = comment.authorRole === "ADMIN";
            const isInternalNote = comment.isInternal;

            if (isInternalNote) {
              return (
                <div
                  key={comment.id}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCircleIcon className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-medium text-slate-900">
                        {comment.authorName}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                        Internal Note
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={comment.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl border p-4 ${
                    isAdmin
                      ? "bg-blue-50 border-blue-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircleIcon
                      className={`h-5 w-5 ${
                        isAdmin ? "text-blue-500" : "text-slate-400"
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {comment.authorName}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        isAdmin
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isAdmin ? "Admin" : "Franchisee"}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Reply form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Reply
            </h3>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-600">
                  Internal Note{" "}
                  <span className="text-xs text-slate-400">
                    (not visible to franchisee)
                  </span>
                </span>
              </label>
              <button
                onClick={handleSendReply}
                disabled={sending || !replyContent.trim()}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Metadata panel */}
        <div className="space-y-4">
          {/* Status & Priority */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Status
              </label>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateField("status", e.target.value)}
                disabled={updating}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
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
                value={ticket.priority}
                onChange={(e) => handleUpdateField("priority", e.target.value)}
                disabled={updating}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
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
                defaultValue={ticket.assignedTo || ""}
                onBlur={(e) => handleUpdateField("assignedTo", e.target.value)}
                placeholder="Enter assignee email..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Category
              </label>
              <p className="text-sm text-slate-700">
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </p>
            </div>
          </div>

          {/* Submitter info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-medium text-slate-500 mb-3">
              Submitter
            </h3>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">
                {ticket.prospect.firstName} {ticket.prospect.lastName}
              </p>
              <p className="text-sm text-slate-500">{ticket.prospect.email}</p>
              <Link
                href={`/admin/prospects/${ticket.prospect.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                View franchisee profile
              </Link>
            </div>
          </div>

          {/* SLA & Dates */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                SLA Deadline
              </label>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-slate-400" />
                <span className={`text-sm ${sla.className}`}>{sla.text}</span>
              </div>
              {ticket.slaDeadline && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateTime(ticket.slaDeadline)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Created
              </label>
              <p className="text-sm text-slate-700">
                {formatDateTime(ticket.createdAt)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Last Updated
              </label>
              <p className="text-sm text-slate-700">
                {formatDateTime(ticket.updatedAt)}
              </p>
            </div>
            {ticket.firstResponseAt && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  First Response
                </label>
                <p className="text-sm text-slate-700">
                  {formatDateTime(ticket.firstResponseAt)}
                </p>
              </div>
            )}
          </div>

          {/* Resolution */}
          {ticket.resolution && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-sm font-semibold text-green-800">
                  Resolution
                </h3>
              </div>
              <p className="text-sm text-green-700 whitespace-pre-wrap">
                {ticket.resolution}
              </p>
              {ticket.resolvedBy && (
                <p className="text-xs text-green-600 mt-2">
                  Resolved by {ticket.resolvedBy}
                  {ticket.resolvedAt && ` on ${formatDate(ticket.resolvedAt)}`}
                </p>
              )}
            </div>
          )}

          {/* Resolve button */}
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Resolve Ticket
            </button>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowResolveModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Resolve Ticket
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Provide a resolution summary for this ticket.
            </p>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this was resolved..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolution("");
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving || !resolution.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resolving ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
