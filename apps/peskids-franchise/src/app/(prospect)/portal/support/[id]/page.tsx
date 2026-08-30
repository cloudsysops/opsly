"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatDateTime, formatDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  TicketIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  InboxIcon,
  BellAlertIcon,
  TagIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

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
  resolvedAt: string | null;
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

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  OPEN: { bg: "bg-blue-100", text: "text-blue-800", label: "Open", icon: InboxIcon },
  IN_PROGRESS: { bg: "bg-amber-100", text: "text-amber-800", label: "In Progress", icon: ClockIcon },
  WAITING_ON_FRANCHISEE: { bg: "bg-purple-100", text: "text-purple-800", label: "Waiting on You", icon: BellAlertIcon },
  WAITING_ON_ADMIN: { bg: "bg-orange-100", text: "text-orange-800", label: "Waiting on Support", icon: ClockIcon },
  RESOLVED: { bg: "bg-green-100", text: "text-green-800", label: "Resolved", icon: CheckCircleIcon },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-600", label: "Closed", icon: CheckCircleIcon },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string; ring: string }> = {
  URGENT: { bg: "bg-red-100", text: "text-red-800", label: "Urgent", ring: "ring-red-300" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800", label: "High", ring: "ring-orange-300" },
  MEDIUM: { bg: "bg-blue-100", text: "text-blue-800", label: "Medium", ring: "ring-blue-300" },
  LOW: { bg: "bg-gray-100", text: "text-gray-600", label: "Low", ring: "ring-gray-300" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  TECHNICAL: { label: "Technical", icon: "🔧" },
  BILLING: { label: "Billing", icon: "💳" },
  OPERATIONS: { label: "Operations", icon: "⚙️" },
  MARKETING: { label: "Marketing", icon: "📢" },
  TRAINING: { label: "Training", icon: "📚" },
  COMPLIANCE: { label: "Compliance", icon: "✅" },
  OTHER: { label: "Other", icon: "📋" },
};

function getSLAInfo(ticket: TicketDetail): {
  status: string;
  className: string;
  description: string;
  isOverdue: boolean;
} {
  if (ticket.firstResponseAt) {
    const responseTime = new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime();
    const hours = Math.round(responseTime / (1000 * 60 * 60));
    return {
      status: "Responded",
      className: "text-green-600",
      description: `First response received in ${hours}h`,
      isOverdue: false,
    };
  }

  if (!ticket.slaDeadline) {
    return {
      status: "Pending",
      className: "text-gray-500",
      description: "Awaiting response from support team",
      isOverdue: false,
    };
  }

  const deadline = new Date(ticket.slaDeadline);
  const now = new Date();
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < 0) {
    return {
      status: "Overdue",
      className: "text-red-600 font-semibold",
      description: `Response overdue by ${Math.abs(Math.ceil(hoursRemaining))} hours`,
      isOverdue: true,
    };
  } else if (hoursRemaining < 4) {
    return {
      status: `${Math.ceil(hoursRemaining)}h remaining`,
      className: "text-amber-600 font-medium",
      description: `Response expected by ${formatDateTime(ticket.slaDeadline)}`,
      isOverdue: false,
    };
  } else if (hoursRemaining < 24) {
    return {
      status: `${Math.ceil(hoursRemaining)}h remaining`,
      className: "text-blue-600",
      description: `Response expected by ${formatDateTime(ticket.slaDeadline)}`,
      isOverdue: false,
    };
  }

  return {
    status: `${Math.ceil(hoursRemaining / 24)} days remaining`,
    className: "text-gray-600",
    description: `Response expected by ${formatDateTime(ticket.slaDeadline)}`,
    isOverdue: false,
  };
}

export default function FranchiseeTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/franchisee/operations/tickets/${ticketId}`);
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
      const res = await fetch(`/api/franchisee/operations/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setReplyContent("");
      await fetchTicket();
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </WideContainer>
    );
  }

  if (!ticket) {
    return (
      <WideContainer className="space-y-6">
        <div className="text-center py-20">
          <TicketIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-base font-medium text-gray-900">Ticket not found</h3>
          <Link href="/portal/support" className="mt-2 text-sm text-brand-purple hover:underline">
            Back to Help Desk
          </Link>
        </div>
      </WideContainer>
    );
  }

  const isResolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const needsResponse = ticket.status === "WAITING_ON_FRANCHISEE";
  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
  const category = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.OTHER;
  const StatusIcon = status.icon;
  const slaInfo = getSLAInfo(ticket);

  // Filter out internal comments (franchisees shouldn't see them)
  const visibleComments = ticket.comments.filter((c) => !c.isInternal);

  return (
    <WideContainer className="space-y-6">
      {/* Back link */}
      <Link
        href="/portal/support"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-purple transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Help Desk
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{ticket.ticketNumber}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${priority.bg} ${priority.text}`}>
              {priority.label}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-700">{ticket.subject}</h2>
        </div>
      </div>

      {/* Action Required Alert */}
      {needsResponse && (
        <Card className="border-purple-300 bg-purple-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <BellAlertIcon className="h-6 w-6 text-purple-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-purple-800">Your Response Needed</p>
                <p className="text-sm text-purple-700 mt-0.5">
                  The support team is waiting for your response to continue working on this ticket.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Description */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Original Request</h3>
                <span className="text-xs text-gray-500">{formatDateTime(ticket.createdAt)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {ticket.prospect.firstName[0]}{ticket.prospect.lastName[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {ticket.prospect.firstName} {ticket.prospect.lastName}
                  </p>
                  <div className="mt-3 text-gray-700 whitespace-pre-wrap">{ticket.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution */}
          {ticket.resolution && (
            <Card className="border-green-300 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-800">Resolution</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 whitespace-pre-wrap">{ticket.resolution}</p>
                {ticket.resolvedAt && (
                  <p className="text-sm text-green-600 mt-3">
                    Resolved on {formatDateTime(ticket.resolvedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          {visibleComments.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Conversation</h3>
                  <span className="text-xs text-gray-500">({visibleComments.length} messages)</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visibleComments.map((comment) => {
                    const isAdmin = comment.authorRole === "ADMIN";
                    return (
                      <div
                        key={comment.id}
                        className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 ${
                            isAdmin
                              ? "bg-blue-50 border border-blue-100"
                              : "bg-gray-100 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                isAdmin
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-600 text-white"
                              }`}
                            >
                              {comment.authorName[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {comment.authorName}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isAdmin
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {isAdmin ? "Support" : "You"}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reply Form */}
          {!isResolved && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-gray-700">Send a Reply</h3>
              </CardHeader>
              <CardContent>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyContent.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white font-medium rounded-lg hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    {sending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Closed Notice */}
          {isResolved && (
            <Card className="bg-gray-50">
              <CardContent className="py-5">
                <p className="text-sm text-gray-600 text-center">
                  This ticket has been {ticket.status.toLowerCase()}. If you need further assistance,
                  please <Link href="/portal/support/new" className="text-brand-purple hover:underline">create a new ticket</Link>.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700">Ticket Details</h3>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex items-start gap-3">
                  <TagIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-gray-500">Category</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {category.icon} {category.label}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-gray-500">Priority</dt>
                    <dd className="text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-gray-500">Created</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatDate(ticket.createdAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <dt className="text-xs text-gray-500">Last Updated</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatDateTime(ticket.updatedAt)}
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* SLA Status */}
          <Card className={slaInfo.isOverdue ? "border-red-300 bg-red-50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClockIcon className={`h-5 w-5 ${slaInfo.isOverdue ? "text-red-600" : "text-gray-400"}`} />
                <h3 className="text-sm font-semibold text-gray-700">Response Status</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-semibold ${slaInfo.className}`}>{slaInfo.status}</div>
              <p className="text-sm text-gray-600 mt-1">{slaInfo.description}</p>
              {ticket.firstResponseAt && (
                <p className="text-xs text-gray-500 mt-2">
                  First response: {formatDateTime(ticket.firstResponseAt)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Help Info */}
          <Card className="bg-gray-50">
            <CardContent className="py-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Need More Help?</h3>
              <p className="text-xs text-gray-600">
                For urgent issues, contact us at{" "}
                <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
                  franchising@acmefranchise.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </WideContainer>
  );
}
