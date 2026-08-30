"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  HomeIcon as HomeIconOutline,
  AcademicCapIcon as AcademyIconOutline,
  BuildingOffice2Icon as BuildingIconOutline,
  ChatBubbleLeftRightIcon as ChatIconOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  AcademicCapIcon as AcademyIconSolid,
  BuildingOffice2Icon as BuildingIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
} from "@heroicons/react/24/solid";

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

interface NavItem {
  name: string;
  href: string;
  outlineIcon: React.ComponentType<{ className?: string }>;
  solidIcon: React.ComponentType<{ className?: string }>;
  matchPrefixes: string[];
  badge?: number;
}

export default function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/franchisee/messages");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      // Silently fail - badge just won't show
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const isActive = (item: NavItem) => {
    return item.matchPrefixes.some((prefix) => {
      if (prefix === "/portal/my-franchise") {
        return pathname === "/portal" || pathname === "/portal/my-franchise" || pathname === "/portal/dashboard";
      }
      return pathname === prefix || pathname.startsWith(prefix + "/");
    });
  };

  const navItems: NavItem[] = [
    {
      name: "My Franchise",
      href: "/portal/my-franchise",
      outlineIcon: HomeIconOutline,
      solidIcon: HomeIconSolid,
      matchPrefixes: ["/portal/my-franchise", "/portal/dashboard"],
    },
    {
      name: "Learning",
      href: "/portal/learning",
      outlineIcon: AcademyIconOutline,
      solidIcon: AcademyIconSolid,
      matchPrefixes: ["/portal/learning", "/portal/bootcamp", "/portal/resources", "/portal/journey"],
    },
    {
      name: "Business",
      href: "/portal/royalties",
      outlineIcon: BuildingIconOutline,
      solidIcon: BuildingIconSolid,
      matchPrefixes: ["/portal/royalties", "/portal/payments", "/portal/reports", "/portal/benchmarks", "/portal/agreement", "/portal/compliance", "/portal/audits", "/portal/documents"],
    },
    {
      name: "Support",
      href: "/portal/messages",
      outlineIcon: ChatIconOutline,
      solidIcon: ChatIconSolid,
      matchPrefixes: ["/portal/messages", "/portal/support"],
      badge: unreadCount,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = active ? item.solidIcon : item.outlineIcon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`
                relative flex flex-col items-center justify-center flex-1 h-full
                transition-colors duration-200
                ${active ? "text-brand-navy" : "text-gray-400"}
              `}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`mt-0.5 text-[9px] font-medium leading-none ${
                  active ? "font-semibold" : ""
                }`}
              >
                {item.name}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-brand-navy" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
