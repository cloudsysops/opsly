"use client";

import type { ReactElement, ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

function MainLayoutInner({ children }: { children: ReactNode }): ReactElement {
  const { collapsed } = useSidebar();

  return (
    <div className="enterprise-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen transition-[margin,padding] duration-300",
          collapsed ? "ml-16" : "ml-64",
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export function MainLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <SidebarProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </SidebarProvider>
  );
}
