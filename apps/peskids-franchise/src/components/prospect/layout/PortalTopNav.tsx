"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { usePortalLayout } from "./PortalLayoutProvider";
import { portalSectionConfigs } from "./portalSectionConfigs";

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

interface PortalTopNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  healthScore?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  const iconMap: Record<string, { bg: string; icon: React.ReactNode }> = {
    announcement: {
      bg: "bg-amber-100",
      icon: <MegaphoneIcon className="h-[18px] w-[18px] text-amber-600" />,
    },
    invoice: {
      bg: "bg-blue-100",
      icon: <DocumentTextIcon className="h-[18px] w-[18px] text-blue-600" />,
    },
    certification: {
      bg: "bg-orange-100",
      icon: <ShieldCheckIcon className="h-[18px] w-[18px] text-orange-600" />,
    },
    journey_task: {
      bg: "bg-red-100",
      icon: <ClipboardDocumentCheckIcon className="h-[18px] w-[18px] text-red-600" />,
    },
    support_ticket: {
      bg: "bg-purple-100",
      icon: <TicketIcon className="h-[18px] w-[18px] text-purple-600" />,
    },
  };

  const config = iconMap[type] || {
    bg: "bg-slate-100",
    icon: <BellIcon className="h-[18px] w-[18px] text-slate-600" />,
  };

  return (
    <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
      {config.icon}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PortalTopNav({ user, healthScore }: PortalTopNavProps) {
  const { currentSection } = usePortalLayout();
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
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/franchisee/notifications", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.type === "announcement" ? { ...n, isRead: true } : n))
        );
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

  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 shadow-lg"
      style={{ background: "linear-gradient(135deg, #2D2F8E 0%, #1e2075 50%, #2D2F8E 100%)" }}
    >
      <div className="flex items-center h-14 px-4 lg:px-6">
        {/* Left: Logo + branding */}
        <Link href="/portal/my-franchise" className="flex items-center gap-2.5 flex-shrink-0">
          <Image
            src="/logo/logo.svg"
            alt="Acme Franchise"
            width={30}
            height={30}
            className="rounded-lg shadow-md"
          />
          <div className="hidden sm:flex flex-col">
            <span className="text-white font-display font-semibold text-sm leading-tight">
              Franchisee
            </span>
            <span className="text-[10px] text-white/50 leading-tight -mt-0.5">
              Portal
            </span>
          </div>
        </Link>

        {/* Divider */}
        <div className="hidden lg:block w-px h-6 bg-white/20 ml-4" />

        {/* Center: Section tabs (desktop) */}
        <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Main navigation">
          {portalSectionConfigs.map((section) => {
            const isActive = currentSection === section.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <section.icon className={`h-4 w-4 ${isActive ? "text-brand-cyan" : "text-white/40"}`} />
                <span>{section.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Health score + notifications + user */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Health Score Pill */}
          {healthScore !== undefined && (
            <Link
              href="/portal/my-franchise#health"
              className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 transition-all"
            >
              <div className="relative w-6 h-6">
                <svg className="w-6 h-6 -rotate-90">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <circle
                    cx="12" cy="12" r="10" fill="none"
                    stroke={healthScore >= 70 ? "#34d399" : healthScore >= 50 ? "#fbbf24" : "#f87171"}
                    strokeWidth="2" strokeLinecap="round"
                    strokeDasharray={`${(healthScore / 100) * 62.8} 62.8`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                  {healthScore}
                </span>
              </div>
              <span className={`text-xs font-semibold ${
                healthScore >= 70 ? "text-emerald-300" : healthScore >= 50 ? "text-amber-300" : "text-red-300"
              }`}>
                Health
              </span>
            </Link>
          )}

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setDropdownOpen(false);
                if (!notifOpen) fetchNotifications();
              }}
              className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-brand-navy">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 animate-scale-in origin-top-right" style={{ animationDuration: "0.2s" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-display font-semibold text-slate-900 text-sm">Notifications</h3>
                  {notifications.some((n) => n.type === "announcement" && !n.isRead) && (
                    <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-purple hover:text-brand-navy transition-colors">
                      <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto">
                  {notifLoading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-purple" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <BellIcon className="mx-auto h-10 w-10 text-slate-200" />
                      <p className="mt-2 text-sm font-medium text-slate-500">All caught up!</p>
                      <p className="mt-1 text-xs text-slate-400">No new notifications right now</p>
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
                                !notif.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                              }`}>
                                {notif.title}
                              </p>
                              {!notif.isRead && <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-brand-purple" />}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.description}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

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

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-white/20" />

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/10 transition-all"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-white/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
                  <span className="text-white font-display font-bold text-xs">
                    {(user.name || "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-white/90 max-w-[100px] truncate">
                  {user.name || "Franchisee"}
                </p>
              </div>
              <ChevronDownIcon className={`hidden sm:block h-3.5 w-3.5 text-white/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-scale-in origin-top-right" style={{ animationDuration: "0.2s" }}>
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-display font-semibold text-slate-900 text-sm truncate">
                    {user.name || "Franchisee"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-700">Active Franchisee</span>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    href="/portal/support"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <QuestionMarkCircleIcon className="h-4 w-4 text-slate-400" />
                    Help & Support
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 text-slate-400" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile section tabs (horizontally scrollable) */}
      <div className="lg:hidden overflow-x-auto scrollbar-hide border-t border-white/10 bg-white/5">
        <nav className="flex items-center gap-1 px-3 py-2 min-w-max" aria-label="Mobile navigation">
          {portalSectionConfigs.map((section) => {
            const isActive = currentSection === section.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10"
                }`}
              >
                <section.icon className={`h-3.5 w-3.5 ${isActive ? "text-brand-cyan" : ""}`} />
                <span>{section.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
