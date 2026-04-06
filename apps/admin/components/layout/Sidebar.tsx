"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Server } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenants", label: "Tenants", icon: Server },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-ops-border bg-ops-surface">
      <div className="border-b border-ops-border px-4 py-4">
        <Link
          href="/dashboard"
          className="block font-mono text-lg font-semibold tracking-tight text-ops-green hover:text-ops-green/90"
        >
          Opsly
        </Link>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-ops-gray">
          Admin
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-2 font-sans text-sm transition-colors",
                active
                  ? "bg-ops-border/60 text-ops-green"
                  : "text-neutral-400 hover:bg-ops-border/40 hover:text-neutral-200",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
