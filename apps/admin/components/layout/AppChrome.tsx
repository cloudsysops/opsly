"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <div className="min-h-screen bg-ops-bg">{children}</div>;
  }
  return (
    <div className="min-h-screen bg-ops-bg">
      <Sidebar />
      <div className="ml-[240px] flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
        <footer className="border-t border-ops-border px-6 py-3 font-mono text-[11px] text-ops-gray">
          Opsly Platform v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0"}{" "}
          &middot;{" "}
          {process.env.NEXT_PUBLIC_ENV ?? "staging"}{" "}
          &middot;{" "}
          {process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ops.smiletripcare.com"}
        </footer>
      </div>
    </div>
  );
}
