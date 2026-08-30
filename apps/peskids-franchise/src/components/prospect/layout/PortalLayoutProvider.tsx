"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { PortalSection, getPortalSectionFromPath, getPortalSectionConfig, PortalSectionConfig } from "./portalSectionConfigs";

interface PortalLayoutContextValue {
  currentSection: PortalSection;
  sectionConfig: PortalSectionConfig;
  isActive: (href: string) => boolean;
}

const PortalLayoutContext = createContext<PortalLayoutContextValue | null>(null);

export function usePortalLayout() {
  const context = useContext(PortalLayoutContext);
  if (!context) {
    throw new Error("usePortalLayout must be used within PortalLayoutProvider");
  }
  return context;
}

export function PortalLayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const value = useMemo(() => {
    const currentSection = getPortalSectionFromPath(pathname);
    const sectionConfig = getPortalSectionConfig(currentSection);

    const isActive = (href: string): boolean => {
      if (href === pathname) return true;

      // My Franchise (dashboard) special case
      if (href === "/portal/my-franchise") {
        return pathname === "/portal" || pathname === "/portal/my-franchise" || pathname === "/portal/dashboard";
      }

      // Learning Center dashboard — exact match only (don't highlight for sub-pages)
      if (href === "/portal/learning") {
        return pathname === "/portal/learning";
      }

      // Prefix match for sub-pages
      return pathname.startsWith(href + "/") || pathname === href;
    };

    return { currentSection, sectionConfig, isActive };
  }, [pathname]);

  return (
    <PortalLayoutContext.Provider value={value}>
      {children}
    </PortalLayoutContext.Provider>
  );
}
