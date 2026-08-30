"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  ViewColumnsIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  PlayCircleIcon,
  MegaphoneIcon,
  BeakerIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  FolderIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  RocketLaunchIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const standaloneNavItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: HomeIcon },
];

const navGroups: NavGroup[] = [
  {
    name: "Prospects",
    icon: UsersIcon,
    items: [
      { name: "All Prospects", href: "/admin/prospects", icon: UsersIcon },
      { name: "Pipeline Board", href: "/admin/pipeline", icon: ViewColumnsIcon },
      { name: "Warm Leads", href: "/admin/warm-leads", icon: FireIcon },
      { name: "Analytics", href: "/admin/analytics", icon: ChartBarIcon },
    ],
  },
  {
    name: "Content",
    icon: ClipboardDocumentListIcon,
    items: [
      { name: "Pre-Work CMS", href: "/admin/prework", icon: PencilSquareIcon },
      { name: "Email Templates", href: "/admin/email-templates", icon: EnvelopeIcon },
      { name: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon },
    ],
  },
  {
    name: "Engagement",
    icon: ChatBubbleLeftRightIcon,
    items: [
      { name: "Conversations", href: "/admin/conversations", icon: ChatBubbleLeftRightIcon },
      { name: "Replays", href: "/admin/replays", icon: PlayCircleIcon },
    ],
  },
  {
    name: "Marketing",
    icon: MegaphoneIcon,
    items: [
      { name: "Campaigns", href: "/admin/campaigns", icon: MegaphoneIcon },
      { name: "A/B Tests", href: "/admin/ab-tests", icon: BeakerIcon },
    ],
  },
  {
    name: "Financials",
    icon: BanknotesIcon,
    items: [
      { name: "Financial Overview", href: "/admin/financials", icon: ChartBarIcon },
      { name: "Leaderboard", href: "/admin/leaderboard", icon: TrophyIcon },
      { name: "Royalty Dashboard", href: "/admin/royalties", icon: CurrencyDollarIcon },
      { name: "All Invoices", href: "/admin/royalties/invoices", icon: DocumentCheckIcon },
      { name: "Compliance", href: "/admin/compliance", icon: ShieldCheckIcon },
    ],
  },
];

const bottomNavItems: NavItem[] = [];

const utilityNavItems: NavItem[] = [
  { name: "Help", href: "/admin/help", icon: QuestionMarkCircleIcon },
  { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon },
];

// Academy Admin navigation
const academyStandaloneNavItems: NavItem[] = [
  { name: "Dashboard", href: "/admin/learning", icon: AcademicCapIcon },
];

const academyNavGroups: NavGroup[] = [
  {
    name: "90-Day Journey",
    icon: RocketLaunchIcon,
    items: [
      { name: "Program Builder", href: "/admin/learning/program-builder", icon: DocumentTextIcon },
      { name: "Franchisee Progress", href: "/admin/learning/progress", icon: ChartBarIcon },
      { name: "Franchisor To-Dos", href: "/admin/learning/todos", icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    name: "Franchisees",
    icon: UsersIcon,
    items: [
      { name: "Progress Tracking", href: "/admin/learning/franchisees", icon: ChartBarIcon },
    ],
  },
  {
    name: "Content",
    icon: BookOpenIcon,
    items: [
      { name: "Program Builder", href: "/admin/learning/program-builder", icon: DocumentTextIcon },
      { name: "Resources", href: "/admin/learning/library", icon: FolderIcon },
      { name: "Badges", href: "/admin/learning/badges", icon: TrophyIcon },
    ],
  },
];

type AdminMode = "crm" | "academy";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Determine mode from URL - academy and journey paths trigger academy mode
  const isAcademyPath = pathname.startsWith("/admin/learning") || pathname.startsWith("/admin/bootcamp") || pathname.startsWith("/admin/journey");
  const [adminMode, setAdminMode] = useState<AdminMode>(isAcademyPath ? "academy" : "crm");

  // Sync mode with URL changes
  useEffect(() => {
    if (isAcademyPath && adminMode !== "academy") {
      setAdminMode("academy");
    } else if (!isAcademyPath && adminMode === "academy") {
      // Keep academy mode if manually selected, only reset on explicit CRM navigation
      const stored = localStorage.getItem("admin-mode");
      if (stored !== "academy") {
        setAdminMode("crm");
      }
    }
  }, [pathname, isAcademyPath]);

  // Persist mode choice to localStorage
  useEffect(() => {
    localStorage.setItem("admin-mode", adminMode);
  }, [adminMode]);

  // Initialize mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("admin-mode") as AdminMode | null;
    if (stored && !isAcademyPath) {
      setAdminMode(stored);
    }
  }, []);

  // Get current navigation items based on mode
  const currentStandaloneItems = adminMode === "academy" ? academyStandaloneNavItems : standaloneNavItems;
  const currentNavGroups = adminMode === "academy" ? academyNavGroups : navGroups;

  // Initialize expanded state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-expanded");
    if (stored) {
      setExpandedGroups(JSON.parse(stored));
    } else {
      // Default: expand group containing active path
      const initialExpanded: Record<string, boolean> = {};
      currentNavGroups.forEach((group) => {
        if (group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
          initialExpanded[group.name] = true;
        }
      });
      setExpandedGroups(initialExpanded);
    }
  }, [adminMode]);

  // Keep active group expanded when path changes
  useEffect(() => {
    currentNavGroups.forEach((group) => {
      if (group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        setExpandedGroups((prev) => {
          if (!prev[group.name]) {
            const updated = { ...prev, [group.name]: true };
            localStorage.setItem("admin-sidebar-expanded", JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    });
  }, [pathname, currentNavGroups]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const updated = { ...prev, [groupName]: !prev[groupName] };
      localStorage.setItem("admin-sidebar-expanded", JSON.stringify(updated));
      return updated;
    });
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <Image
          src="/logo/logo.svg"
          alt="Acme Franchise"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <span className="text-white font-semibold text-lg whitespace-nowrap">
          {adminMode === "academy" ? "Bootcamp Admin" : "Franchise CRM"}
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="px-3 py-3 border-b border-white/10">
        <div className="flex bg-white/10 rounded-lg p-1">
          <button
            onClick={() => {
              setAdminMode("crm");
              router.push("/admin");
              onClose();
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              adminMode === "crm"
                ? "bg-white text-brand-navy"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            CRM
          </button>
          <button
            onClick={() => {
              setAdminMode("academy");
              router.push("/admin/learning");
              onClose();
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              adminMode === "academy"
                ? "bg-white text-brand-navy"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <AcademicCapIcon className="h-4 w-4" />
            Bootcamp
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Standalone items */}
        {currentStandaloneItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.href)
                ? "bg-white/20 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}

        {/* Expandable Groups */}
        {currentNavGroups.map((group) => {
          const isExpanded = expandedGroups[group.name];
          const hasActiveChild = group.items.some((item) => isActive(item.href));

          return (
            <div key={group.name} className="pt-1">
              <button
                onClick={() => toggleGroup(group.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  hasActiveChild && !isExpanded
                    ? "bg-white/10 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <group.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{group.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-1 ml-4 pl-4 border-l border-white/20 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isActive(item.href)
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom standalone items (CRM mode only) */}
        {adminMode === "crm" && bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.href)
                ? "bg-white/20 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}

        {/* Separator */}
        <div className="!my-4 border-t border-white/20" />

        {/* Utility items */}
        {utilityNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.href)
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium text-sm">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-60 bg-brand-navy z-50 lg:hidden transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-brand-navy">
        <SidebarContent />
      </aside>
    </>
  );
}
