"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  RocketLaunchIcon,
  PresentationChartBarIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  TicketIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  HeartIcon,
  SparklesIcon,
  DocumentChartBarIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  highlight?: boolean;
}

interface NavGroup {
  name: string;
  items: NavItem[];
  icon?: React.ComponentType<{ className?: string }>;
}

const prospectNavGroups: NavGroup[] = [
  {
    name: "YOUR JOURNEY",
    items: [
      { name: "Dashboard", href: "/portal", icon: HomeIcon },
      { name: "Pre-Work", href: "/portal/pre-work", icon: ClipboardDocumentListIcon },
      { name: "Documents", href: "/portal/documents", icon: DocumentTextIcon },
    ],
  },
  {
    name: "RESOURCES",
    items: [
      { name: "Status", href: "/portal/status", icon: ChartBarIcon },
    ],
  },
];

const franchiseeNavGroups: NavGroup[] = [
  {
    name: "DASHBOARD",
    icon: SparklesIcon,
    items: [
      { name: "Overview", href: "/portal/my-franchise", icon: PresentationChartBarIcon, highlight: true },
      { name: "Benchmarks", href: "/portal/benchmarks", icon: ChartBarIcon },
      { name: "Health Score", href: "/portal/my-franchise#health", icon: HeartIcon },
      { name: "Leaderboard", href: "/portal/my-franchise#leaderboard", icon: TrophyIcon },
    ],
  },
  {
    name: "ONBOARDING",
    icon: RocketLaunchIcon,
    items: [
      { name: "90-Day Journey", href: "/portal/journey", icon: RocketLaunchIcon },
      { name: "Learning Center", href: "/portal/learning", icon: AcademicCapIcon },
    ],
  },
  {
    name: "FINANCIALS",
    icon: BanknotesIcon,
    items: [
      { name: "Royalty Statements", href: "/portal/royalties", icon: CurrencyDollarIcon },
      { name: "Payment Setup", href: "/portal/payments", icon: BanknotesIcon },
      { name: "Report Builder", href: "/portal/reports", icon: DocumentChartBarIcon },
    ],
  },
  {
    name: "AGREEMENT",
    icon: DocumentTextIcon,
    items: [
      { name: "Franchise Agreement", href: "/portal/agreement", icon: DocumentTextIcon },
    ],
  },
  {
    name: "COMPLIANCE",
    icon: ShieldCheckIcon,
    items: [
      { name: "Certifications", href: "/portal/compliance", icon: ShieldCheckIcon },
      { name: "Audit Reports", href: "/portal/audits", icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    name: "RESOURCES",
    icon: BookOpenIcon,
    items: [
      { name: "Operations Manual", href: "/portal/learning/manual", icon: BookOpenIcon },
      { name: "Documents", href: "/portal/documents", icon: DocumentTextIcon },
      { name: "AI Coach", href: "/portal/learning/coach", icon: SparklesIcon },
    ],
  },
  {
    name: "SUPPORT",
    icon: TicketIcon,
    items: [
      { name: "Message Center", href: "/portal/messages", icon: ChatBubbleLeftRightIcon },
      { name: "Help Desk", href: "/portal/support", icon: TicketIcon },
    ],
  },
];

interface ProspectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isSelected?: boolean;
  preWorkProgress?: number;
  healthScore?: number;
}

export default function ProspectSidebar({
  isOpen,
  onClose,
  user,
  isSelected = false,
  preWorkProgress = 0,
  healthScore,
}: ProspectSidebarProps) {
  const pathname = usePathname();
  const navGroups = isSelected ? franchiseeNavGroups : prospectNavGroups;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Default all groups to expanded
    const defaults: Record<string, boolean> = {};
    navGroups.forEach(group => {
      defaults[group.name] = true;
    });
    return defaults;
  });

  // Initialize expanded state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("prospect-sidebar-expanded");
    if (stored) {
      setExpandedGroups(JSON.parse(stored));
    }
  }, []);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const updated = { ...prev, [groupName]: !prev[groupName] };
      localStorage.setItem("prospect-sidebar-expanded", JSON.stringify(updated));
      return updated;
    });
  };

  const isActive = (href: string) => {
    if (href === "/portal" || href === "/portal/my-franchise") {
      return pathname === "/portal" || pathname === "/portal/my-franchise" || pathname === "/portal/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section with Premium Gradient */}
      <div className="relative px-5 py-5 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-purple/50 to-brand-navy opacity-50" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <Image
              src="/logo/logo.svg"
              alt="Acme Franchise"
              width={44}
              height={44}
              className="rounded-xl shadow-lg"
            />
            {isSelected && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-brand-navy flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <span className="text-white font-display font-semibold text-lg tracking-tight">
              {isSelected ? "Franchisee" : "Franchise"}
            </span>
            <p className="text-white/60 text-xs font-body">
              {isSelected ? "Portal" : "Portal"}
            </p>
          </div>
        </div>
      </div>

      {/* Health Score Mini Widget (for franchisees) */}
      {isSelected && healthScore !== undefined && (
        <div className="px-4 py-4 border-b border-white/10">
          <Link
            href="/portal/my-franchise#health"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="relative">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={healthScore >= 70 ? '#059669' : healthScore >= 50 ? '#d97706' : '#dc2626'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 125.6} 125.6`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {healthScore}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-white/80 text-xs font-medium">Health Score</p>
              <p className={`text-sm font-semibold ${
                healthScore >= 70 ? 'text-emerald-400' :
                healthScore >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {healthScore >= 70 ? 'Excellent' : healthScore >= 50 ? 'Good' : 'Needs Attention'}
              </p>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
          </Link>
        </div>
      )}

      {/* Progress Bar (for prospects) */}
      {!isSelected && preWorkProgress > 0 && (
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between text-xs text-white/70 mb-2">
            <span className="font-body font-medium">Pre-Work Progress</span>
            <span className="font-display font-bold text-white">{preWorkProgress}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${preWorkProgress}%`,
                background: 'linear-gradient(90deg, #50C8DF 0%, #34B256 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.name] !== false;
          const GroupIcon = group.icon;

          return (
            <div key={group.name} className="pt-2">
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white/50 hover:text-white/70 transition-colors text-[11px] font-semibold tracking-widest uppercase"
              >
                <div className="flex items-center gap-2">
                  {GroupIcon && <GroupIcon className="w-3.5 h-3.5" />}
                  <span>{group.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`
                          relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                          ${active
                            ? "bg-white/15 text-white shadow-lg"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                          }
                          ${item.highlight ? "ring-1 ring-white/20" : ""}
                        `}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-brand-cyan to-brand-green rounded-r-full" />
                        )}
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-brand-cyan" : ""}`} />
                        <span className="font-body font-medium text-sm">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-orange text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "User"}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-white/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">
                {(user.name || "U")[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-semibold text-white truncate">
              {user.name || "Prospect"}
            </p>
            <p className="text-xs font-body text-white/50 truncate">
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-body text-sm"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-full max-w-[300px] z-50 lg:hidden transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: 'linear-gradient(180deg, #2D2F8E 0%, #1a1b5e 100%)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors z-10"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0"
        style={{
          background: 'linear-gradient(180deg, #2D2F8E 0%, #1a1b5e 100%)',
        }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
