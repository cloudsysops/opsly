"use client";

import {
  Gauge,
  LayoutDashboard,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactElement } from "react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

const navigation: Array<{ name: string; href: string; icon: typeof LayoutDashboard }> = [
  { name: "Resumen", href: "/dashboard/overview", icon: LayoutDashboard },
  { name: "Modo de trabajo", href: "/dashboard", icon: SlidersHorizontal },
  { name: "Developer", href: "/dashboard/developer", icon: Terminal },
  { name: "Managed", href: "/dashboard/managed", icon: Sparkles },
  { name: "Mission Control", href: "/mission-control", icon: Orbit },
];

export function Sidebar(): ReactElement {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const [userLabel, setUserLabel] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email?.trim();
      setUserLabel(email !== undefined && email.length > 0 ? email : "Sesión activa");
    });
  }, []);

  const initials = userLabel.includes("@")
    ? userLabel
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase()
    : "OP";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border-default)] bg-[var(--bg-sidebar)] transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Navegación principal"
    >
      <div className="flex h-16 items-center justify-between border-b border-[var(--border-default)] px-3">
        {!collapsed ? (
          <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text font-mono text-lg font-bold text-transparent">
            OPSLY
          </span>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-secondary)] font-mono text-xs font-bold text-[var(--text-accent)]">
            O
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            toggle();
          }}
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" aria-hidden />
          ) : (
            <PanelLeftClose className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-24">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                isActive
                  ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-blue-500/20"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed ? <span className="font-medium">{item.name}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border-default)] p-4">
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{userLabel}</p>
              <p className="flex items-center gap-1 truncate text-xs text-[var(--text-muted)]">
                <Gauge className="h-3 w-3 shrink-0" aria-hidden />
                Portal
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={userLabel}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
