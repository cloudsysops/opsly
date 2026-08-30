"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import DOMPurify from "dompurify";
import {
  EnvelopeIcon,
  MegaphoneIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InboxIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Email {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyPreview: string;
  sentBy: string;
  sentAt: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  isPinned: boolean;
  publishedAt: string;
  createdBy: string;
  isRead: boolean;
  readAt: string | null;
}

type TabKey = "all" | "emails" | "announcements";

// ─── Config ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  GENERAL: { bg: "bg-blue-100", text: "text-blue-800" },
  POLICY: { bg: "bg-purple-100", text: "text-purple-800" },
  TRAINING: { bg: "bg-amber-100", text: "text-amber-800" },
  EVENT: { bg: "bg-green-100", text: "text-green-800" },
  SYSTEM: { bg: "bg-gray-100", text: "text-gray-700" },
  MARKETING: { bg: "bg-orange-100", text: "text-orange-800" },
};

const PRIORITY_DOTS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  NORMAL: "bg-blue-500",
  LOW: "bg-gray-400",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "...";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FranchiseeMessagesPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/franchisee/messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setEmails(data.emails || []);
      setAnnouncements(data.announcements || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetch("/api/franchisee/messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setEmails(data.emails || []);
      setAnnouncements(data.announcements || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Error refreshing messages:", error);
    }
  }, []);

  // Mark announcement as read
  async function markAnnouncementRead(announcementId: string) {
    try {
      const res = await fetch(`/api/franchisee/messages/${announcementId}/read`, {
        method: "POST",
      });
      if (res.ok) {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === announcementId
              ? { ...a, isRead: true, readAt: new Date().toISOString() }
              : a
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking announcement as read:", error);
    }
  }

  // Toggle expand/collapse and mark announcements as read
  function handleToggleExpand(id: string, type: string, announcement?: Announcement) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (type === "announcement" && announcement && !announcement.isRead) {
        markAnnouncementRead(announcement.id);
      }
    }
  }

  // ─── Build unified timeline ───────────────────────────────────────────────

  type TimelineItem =
    | { type: "email"; date: string; data: Email }
    | { type: "announcement"; date: string; data: Announcement };

  const timeline: TimelineItem[] = [
    ...emails.map((e): TimelineItem => ({ type: "email", date: e.sentAt, data: e })),
    ...announcements.map((a): TimelineItem => ({ type: "announcement", date: a.publishedAt, data: a })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ─── Tab Config ───────────────────────────────────────────────────────────

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Messages", count: timeline.length },
    { key: "emails", label: "Emails", count: emails.length },
    { key: "announcements", label: "Announcements", count: announcements.length },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-indigo-600" />
          Message Center
        </h1>
        <p className="mt-1 text-gray-600">
          All your emails and announcements in one place
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={unreadCount > 0 ? "border-purple-300 bg-purple-50" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <BellIcon className={`h-5 w-5 ${unreadCount > 0 ? "text-purple-600" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500">Unread Announcements</span>
            </div>
            <p className={`text-2xl font-bold ${unreadCount > 0 ? "text-purple-600" : "text-gray-600"}`}>
              {unreadCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">Total Emails</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{emails.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <MegaphoneIcon className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-gray-500">Announcements</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(null);
              }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.key
                  ? "bg-brand-navy/10 text-brand-navy"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
        </div>
      ) : (
        <>
          {activeTab === "all" && <AllTab timeline={timeline} expandedId={expandedId} onToggle={handleToggleExpand} />}
          {activeTab === "emails" && <EmailsTab emails={emails} expandedId={expandedId} onToggle={handleToggleExpand} />}
          {activeTab === "announcements" && (
            <AnnouncementsTab
              announcements={announcements}
              expandedId={expandedId}
              onToggle={handleToggleExpand}
            />
          )}
        </>
      )}
    </WideContainer>
    </PullToRefresh>
  );
}

// ─── All Tab ────────────────────────────────────────────────────────────────

function AllTab({
  timeline,
  expandedId,
  onToggle,
}: {
  timeline: Array<
    | { type: "email"; date: string; data: Email }
    | { type: "announcement"; date: string; data: Announcement }
  >;
  expandedId: string | null;
  onToggle: (id: string, type: string, announcement?: Announcement) => void;
}) {
  if (timeline.length === 0) {
    return <EmptyState icon={InboxIcon} title="No messages yet" description="Your emails and announcements will appear here." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {timeline.map((item) => {
            const id = item.data.id;
            const isExpanded = expandedId === id;

            if (item.type === "email") {
              const email = item.data as Email;
              return (
                <div key={`email-${id}`}>
                  <button
                    onClick={() => onToggle(id, "email")}
                    className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 uppercase tracking-wide">
                            Email
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(email.sentAt)}</span>
                        </div>
                        <p className="mt-1 font-semibold text-gray-900 truncate">{email.subject}</p>
                        <p className="mt-0.5 text-sm text-gray-500 truncate">
                          {truncate(email.bodyPreview || stripHtml(email.bodyHtml), 100)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 pl-[4.5rem]">
                      <div className="text-xs text-gray-500 mb-3">
                        From: <span className="font-medium text-gray-700">{email.sentBy}</span>
                      </div>
                      {/* Email HTML content from our own system - trusted source */}
                      <div
                        className="prose prose-sm max-w-none bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-auto max-h-96"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.bodyHtml) }}
                      />
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === "announcement") {
              const ann = item.data as Announcement;
              const catStyle = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.GENERAL;
              const priorityDot = PRIORITY_DOTS[ann.priority] || PRIORITY_DOTS.NORMAL;
              return (
                <div key={`ann-${id}`}>
                  <button
                    onClick={() => onToggle(id, "announcement", ann)}
                    className={`w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors ${
                      !ann.isRead ? "bg-purple-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center relative">
                        <MegaphoneIcon className="h-5 w-5 text-amber-600" />
                        {!ann.isRead && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 uppercase tracking-wide">
                            Announcement
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${catStyle.bg} ${catStyle.text}`}>
                            {ann.category}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${priorityDot}`} title={ann.priority} />
                          {ann.isPinned && (
                            <span className="text-[10px] font-semibold text-brand-orange">PINNED</span>
                          )}
                          <span className="text-xs text-gray-500">{formatDate(ann.publishedAt)}</span>
                        </div>
                        <p className={`mt-1 font-semibold truncate ${ann.isRead ? "text-gray-900" : "text-brand-navy"}`}>
                          {ann.title}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500 truncate">
                          {truncate(stripHtml(ann.content), 100)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!ann.isRead && (
                          <span className="w-2.5 h-2.5 bg-purple-500 rounded-full" title="Unread" />
                        )}
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 pl-[4.5rem]">
                      {/* Announcement HTML content from admin - trusted source */}
                      <div
                        className="prose prose-sm max-w-none bg-gray-50 rounded-xl p-4 border border-gray-200"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ann.content) }}
                      />
                      <div className="mt-2 text-xs text-gray-400">
                        Posted by {ann.createdBy}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Emails Tab ─────────────────────────────────────────────────────────────

function EmailsTab({
  emails,
  expandedId,
  onToggle,
}: {
  emails: Email[];
  expandedId: string | null;
  onToggle: (id: string, type: string) => void;
}) {
  if (emails.length === 0) {
    return <EmptyState icon={EnvelopeIcon} title="No emails yet" description="Emails sent to you will appear here." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {emails.map((email) => {
            const isExpanded = expandedId === email.id;
            return (
              <div key={email.id}>
                <button
                  onClick={() => onToggle(email.id, "email")}
                  className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate">{email.subject}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(email.sentAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        From: <span className="font-medium text-gray-700">{email.sentBy}</span>
                      </p>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {email.bodyPreview || truncate(stripHtml(email.bodyHtml), 150)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 pt-1">
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="ml-14">
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              From: {email.sentBy} &middot; {formatDate(email.sentAt)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggle(email.id, "email");
                            }}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                        {/* Email HTML content from our own system - trusted source */}
                        <div
                          className="p-4 prose prose-sm max-w-none overflow-auto max-h-[500px]"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.bodyHtml) }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Announcements Tab ──────────────────────────────────────────────────────

function AnnouncementsTab({
  announcements,
  expandedId,
  onToggle,
}: {
  announcements: Announcement[];
  expandedId: string | null;
  onToggle: (id: string, type: string, announcement?: Announcement) => void;
}) {
  if (announcements.length === 0) {
    return <EmptyState icon={MegaphoneIcon} title="No announcements" description="System announcements and updates will appear here." />;
  }

  // Pinned at the top, then sorted by date
  const pinned = announcements.filter((a) => a.isPinned);
  const unpinned = announcements.filter((a) => !a.isPinned);

  return (
    <div className="space-y-4">
      {/* Pinned section */}
      {pinned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
            Pinned
          </p>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {pinned.map((ann) => (
                  <AnnouncementItem
                    key={ann.id}
                    announcement={ann}
                    isExpanded={expandedId === ann.id}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All other announcements */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
              Recent
            </p>
          )}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {unpinned.map((ann) => (
                  <AnnouncementItem
                    key={ann.id}
                    announcement={ann}
                    isExpanded={expandedId === ann.id}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function AnnouncementItem({
  announcement: ann,
  isExpanded,
  onToggle,
}: {
  announcement: Announcement;
  isExpanded: boolean;
  onToggle: (id: string, type: string, announcement?: Announcement) => void;
}) {
  const catStyle = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.GENERAL;
  const priorityDot = PRIORITY_DOTS[ann.priority] || PRIORITY_DOTS.NORMAL;

  return (
    <div>
      <button
        onClick={() => onToggle(ann.id, "announcement", ann)}
        className={`w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors ${
          !ann.isRead ? "bg-purple-50/40" : ""
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center relative">
            <MegaphoneIcon className="h-5 w-5 text-amber-600" />
            {!ann.isRead && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${catStyle.bg} ${catStyle.text}`}>
                {ann.category}
              </span>
              <span className={`w-2 h-2 rounded-full ${priorityDot}`} title={`Priority: ${ann.priority}`} />
              {ann.isPinned && (
                <span className="text-[10px] font-bold text-brand-orange tracking-wide">PINNED</span>
              )}
              {!ann.isRead && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                  NEW
                </span>
              )}
              <span className="text-xs text-gray-500">{formatDate(ann.publishedAt)}</span>
            </div>
            <p className={`mt-1 font-semibold truncate ${ann.isRead ? "text-gray-900" : "text-brand-navy"}`}>
              {ann.title}
            </p>
            {!isExpanded && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                {truncate(stripHtml(ann.content), 150)}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            {!ann.isRead && (
              <span className="w-2.5 h-2.5 bg-purple-500 rounded-full flex-shrink-0" />
            )}
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 pt-0">
          <div className="ml-14">
            {/* Announcement HTML content from admin - trusted source */}
            <div
              className="prose prose-sm max-w-none bg-gray-50 rounded-xl p-4 border border-gray-200"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ann.content) }}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>Posted by {ann.createdBy}</span>
              {ann.isRead && ann.readAt && (
                <span>Read {formatDate(ann.readAt)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="text-center py-16">
          <Icon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-base font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
