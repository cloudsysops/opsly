"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Bars3Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  BellIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  TicketIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: "announcement" | "invoice" | "certification" | "journey_task" | "support_ticket";
  title: string;
  description: string;
  link: string;
  createdAt: string;
  isRead: boolean;
  sourceId: string;
}

interface ProspectHeaderProps {
  onMenuClick: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  preWorkProgress?: number;
  pageTitle?: string;
  isSelected?: boolean;
  healthScore?: number;
}

// ─── Relative Time Helper ──────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Notification Icon Helper ──────────────────────────────────────────────────

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  switch (type) {
    case "announcement":
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <MegaphoneIcon className="h-[18px] w-[18px] text-amber-600" />
        </div>
      );
    case "invoice":
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <DocumentTextIcon className="h-[18px] w-[18px] text-blue-600" />
        </div>
      );
    case "certification":
      return (
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <ShieldCheckIcon className="h-[18px] w-[18px] text-orange-600" />
        </div>
      );
    case "journey_task":
      return (
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <ClipboardDocumentCheckIcon className="h-[18px] w-[18px] text-red-600" />
        </div>
      );
    case "support_ticket":
      return (
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <TicketIcon className="h-[18px] w-[18px] text-purple-600" />
        </div>
      );
    default:
      return (
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <BellIcon className="h-[18px] w-[18px] text-slate-600" />
        </div>
      );
  }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ProspectHeader({
  onMenuClick,
  user,
  preWorkProgress = 0,
  pageTitle,
  isSelected = false,
  healthScore,
}: ProspectHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isSelected) return;
    setNotifLoading(true);
    try {
      const res = await fetch("/api/franchisee/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotifLoading(false);
    }
  }, [isSelected]);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all announcements as read
  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/franchisee/notifications", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.type === "announcement" ? { ...n, isRead: true } : n
          )
        );
        // Recalculate unread count
        setUnreadCount((prev) => {
          const announcementCount = notifications.filter(
            (n) => n.type === "announcement" && !n.isRead
          ).length;
          return Math.max(0, prev - announcementCount);
        });
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const handleNotifToggle = () => {
    setNotifOpen(!notifOpen);
    setDropdownOpen(false);
    if (!notifOpen) {
      fetchNotifications();
    }
  };

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
    setNotifOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left side: Menu button + page title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          {pageTitle && (
            <h1 className="font-display text-xl font-semibold text-slate-900 hidden sm:block">
              {pageTitle}
            </h1>
          )}
        </div>

        {/* Center: Progress or Health Score indicator */}
        {preWorkProgress > 0 && !isSelected && (
          <div className="hidden md:flex items-center gap-3 px-5 py-2 bg-slate-50 rounded-full border border-slate-200/50">
            <span className="text-xs font-body font-medium text-slate-500 uppercase tracking-wide">Pre-Work</span>
            <div className="w-28 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${preWorkProgress}%`,
                  background: 'linear-gradient(90deg, #50C8DF 0%, #34B256 100%)',
                }}
              />
            </div>
            <span className="text-xs font-display font-bold text-slate-700">{preWorkProgress}%</span>
          </div>
        )}

        {isSelected && healthScore !== undefined && (
          <Link
            href="/portal/my-franchise#health"
            className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/50 hover:border-slate-300 transition-all group"
          >
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke={healthScore >= 70 ? '#059669' : healthScore >= 50 ? '#d97706' : '#dc2626'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 81.7} 81.7`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                {healthScore}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-body text-slate-500 uppercase tracking-wide">Health</p>
              <p className={`text-xs font-display font-bold ${
                healthScore >= 70 ? 'text-emerald-600' :
                healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {healthScore >= 70 ? 'Excellent' : healthScore >= 50 ? 'Good' : 'Attention'}
              </p>
            </div>
            <SparklesIcon className="w-4 h-4 text-slate-400 group-hover:text-brand-purple transition-colors" />
          </Link>
        )}

        {/* Right side: Actions + User dropdown */}
        <div className="flex items-center gap-2">
          {/* Help Button */}
          <Link
            href="/portal/support"
            className="hidden sm:flex p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Get Help"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </Link>

          {/* Notification Bell */}
          {isSelected && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleNotifToggle}
                className="relative p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                title="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 animate-scale-in origin-top-right"
                  style={{ animationDuration: '0.2s' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="font-display font-semibold text-slate-900 text-sm">
                      Notifications
                    </h3>
                    {notifications.some((n) => n.type === "announcement" && !n.isRead) && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-brand-purple hover:text-brand-navy transition-colors"
                      >
                        <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[480px] overflow-y-auto">
                    {notifLoading && notifications.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-purple" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <BellIcon className="mx-auto h-10 w-10 text-slate-200" />
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          All caught up!
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          No new notifications right now
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href={notif.link}
                            onClick={() => setNotifOpen(false)}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                              !notif.isRead ? "bg-brand-purple/[0.03]" : ""
                            }`}
                          >
                            <NotificationIcon type={notif.type} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-tight truncate ${
                                  !notif.isRead
                                    ? "font-semibold text-slate-900"
                                    : "font-medium text-slate-700"
                                }`}>
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-brand-purple" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {notif.description}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {timeAgo(notif.createdAt)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-slate-100 px-4 py-2.5">
                    <Link
                      href="/portal/messages"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center gap-1.5 text-xs font-medium text-brand-purple hover:text-brand-navy transition-colors w-full py-1"
                    >
                      View all messages
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleDropdownToggle}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-all"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "User"}
                  width={36}
                  height={36}
                  className="rounded-full ring-2 ring-slate-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
                  <span className="text-white font-display font-bold text-sm">
                    {(user.name || "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-body font-medium text-slate-700 max-w-[120px] truncate">
                  {user.name || "Prospect"}
                </p>
                {isSelected && (
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                    Franchisee
                  </p>
                )}
              </div>
              <ChevronDownIcon className={`hidden sm:block h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in origin-top-right"
                style={{ animationDuration: '0.2s' }}
              >
                {/* User Info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
                        <span className="text-white font-display font-bold">
                          {(user.name || "U")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-slate-900 truncate">
                        {user.name || "Prospect"}
                      </p>
                      <p className="text-xs font-body text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">Active Franchisee</span>
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/portal/support"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-body text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <QuestionMarkCircleIcon className="h-5 w-5 text-slate-400" />
                    Help & Support
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 text-slate-400" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Progress Bar */}
      {preWorkProgress > 0 && !isSelected && (
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-body text-slate-500">Pre-Work</span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${preWorkProgress}%`,
                  background: 'linear-gradient(90deg, #50C8DF 0%, #34B256 100%)',
                }}
              />
            </div>
            <span className="text-xs font-display font-bold text-slate-700">{preWorkProgress}%</span>
          </div>
        </div>
      )}

      {/* Mobile Health Score */}
      {isSelected && healthScore !== undefined && (
        <div className="md:hidden px-4 pb-3">
          <Link
            href="/portal/my-franchise#health"
            className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200"
          >
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90">
                <circle cx="16" cy="16" r="13" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke={healthScore >= 70 ? '#059669' : healthScore >= 50 ? '#d97706' : '#dc2626'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 81.7} 81.7`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                {healthScore}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-body text-slate-500">Health Score</p>
              <p className={`text-sm font-display font-bold ${
                healthScore >= 70 ? 'text-emerald-600' :
                healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {healthScore >= 70 ? 'Excellent' : healthScore >= 50 ? 'Good' : 'Needs Attention'}
              </p>
            </div>
          </Link>
        </div>
      )}
    </header>
  );
}
