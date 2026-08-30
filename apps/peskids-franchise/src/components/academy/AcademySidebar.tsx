"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  RocketLaunchIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    name: "JOURNEY",
    items: [
      { name: "Dashboard", href: "/bootcamp", icon: HomeIcon },
      {
        name: "90-Day Journey",
        href: "/bootcamp/journey",
        icon: RocketLaunchIcon,
        badge: "Active",
        badgeColor: "bg-emerald-500",
      },
    ],
  },
  {
    name: "LEARNING",
    items: [
      { name: "Resource Library", href: "/bootcamp/resources", icon: BookOpenIcon },
      {
        name: "AI Coach",
        href: "/bootcamp/coach",
        icon: ChatBubbleLeftRightIcon,
        badge: "Beta",
        badgeColor: "bg-purple-500",
      },
    ],
  },
  {
    name: "PROGRESS",
    items: [
      { name: "Achievements", href: "/bootcamp/achievements", icon: TrophyIcon },
    ],
  },
];

export default function AcademySidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    JOURNEY: true,
    LEARNING: true,
    PROGRESS: true,
  });

  // Load state from localStorage
  useEffect(() => {
    const collapsedState = localStorage.getItem("academy-sidebar-collapsed");
    if (collapsedState) {
      setIsCollapsed(JSON.parse(collapsedState));
    }
    const groupsState = localStorage.getItem("academy-sidebar-groups");
    if (groupsState) {
      setExpandedGroups(JSON.parse(groupsState));
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("academy-sidebar-collapsed", JSON.stringify(newValue));
      return newValue;
    });
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const updated = { ...prev, [groupName]: !prev[groupName] };
      localStorage.setItem("academy-sidebar-groups", JSON.stringify(updated));
      return updated;
    });
  };

  const isActive = (href: string) => {
    if (href === "/bootcamp") {
      return pathname === "/bootcamp";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={`flex flex-col h-full bg-white transition-all duration-300 ease-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.name];

          return (
            <div key={group.name}>
              {/* Group Header - Only when expanded */}
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                >
                  <span>{group.name}</span>
                  <ChevronDownIcon
                    className={`h-3 w-3 transition-transform ${
                      isExpanded ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              )}

              {/* Items */}
              {(isCollapsed || isExpanded) && (
                <div className={`space-y-0.5 ${isCollapsed ? "" : "ml-1"}`}>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          active
                            ? "bg-brand-navy/10 text-brand-navy font-medium"
                            : "text-slate-600 hover:bg-slate-100"
                        } ${isCollapsed ? "justify-center" : ""}`}
                      >
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 ${
                            active ? "text-brand-navy" : ""
                          }`}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-sm">{item.name}</span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded text-white ${item.badgeColor}`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Separator */}
        <div className="!my-4 border-t border-slate-200" />

        {/* Back to Portal */}
        <Link
          href="/portal"
          title={isCollapsed ? "Back to Portal" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <ArrowLeftIcon className="h-5 w-5" />
          {!isCollapsed && <span className="text-sm">Back to Portal</span>}
        </Link>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-200 p-2">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
