"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactElement, type ReactNode } from "react";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggle,
    }),
    [collapsed, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (ctx === null) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
