"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AdminSection, getSectionFromPath, getSectionConfig, SectionConfig, isNavGroup } from "./sectionConfigs";

interface AdminLayoutContextValue {
  currentSection: AdminSection;
  sectionConfig: SectionConfig;
  isActive: (href: string) => boolean;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error("useAdminLayout must be used within AdminLayoutProvider");
  }
  return context;
}

export function AdminLayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const value = useMemo(() => {
    const currentSection = getSectionFromPath(pathname);
    const sectionConfig = getSectionConfig(currentSection);

    const isActive = (href: string): boolean => {
      // Exact match is always active
      if (href === pathname) return true;

      // For "All Franchisees" link, only highlight on exact match or individual franchisee pages,
      // but NOT sub-section pages (financials, royalties, etc.) that have their own sidebar items
      if (href === "/admin/franchisees") {
        if (pathname === "/admin/franchisees") return true;
        const allOtherHrefs = sectionConfig.sidebarItems.flatMap((item) => {
          if (isNavGroup(item)) {
            return item.items.map((i) => i.href);
          }
          return [item.href];
        }).filter(h => h !== href);
        const matchesOtherItem = allOtherHrefs.some(
          (otherHref) => pathname === otherHref || pathname.startsWith(otherHref + "/")
        );
        return !matchesOtherItem && /^\/admin\/franchisees\/[^/]+/.test(pathname);
      }

      // Section roots should only match on exact match
      const sectionRoots = ["/admin", "/admin/crm", "/admin/franchisees", "/admin/learning", "/admin/marketing", "/admin/settings", "/admin/bootcamp", "/admin/resources"];
      if (sectionRoots.includes(href)) {
        return false;
      }

      // For nested items, only highlight if there's no more specific match available
      // Check if the current path starts with this href
      if (pathname.startsWith(href + "/")) {
        // Get all sidebar items from current section config
        const allHrefs = sectionConfig.sidebarItems.flatMap((item) => {
          if (isNavGroup(item)) {
            return item.items.map((i) => i.href);
          }
          return [item.href];
        });

        // Check if there's a more specific match (a longer href that also matches)
        const hasMoreSpecificMatch = allHrefs.some(
          (otherHref) =>
            otherHref !== href &&
            otherHref.length > href.length &&
            (pathname === otherHref || pathname.startsWith(otherHref + "/"))
        );

        return !hasMoreSpecificMatch;
      }

      return false;
    };

    return { currentSection, sectionConfig, isActive };
  }, [pathname]);

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
    </AdminLayoutContext.Provider>
  );
}
