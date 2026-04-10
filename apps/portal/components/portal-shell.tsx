"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminNavLink } from "@/components/admin-nav-link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export function PortalShell({
  title,
  children,
  showModeLink,
}: {
  title: string;
  children: ReactNode;
  showModeLink?: boolean;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ops-bg">
      <header className="border-b border-ops-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="font-mono text-lg font-semibold text-ops-green"
            >
              Opsly
            </Link>
            <span className="font-sans text-sm text-neutral-300">{title}</span>
            <AdminNavLink />
          </div>
          <div className="flex items-center gap-2">
            {showModeLink === true ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Cambiar modo</Link>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" type="button" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      <footer className="border-t border-ops-border px-6 py-4 text-center font-mono text-[11px] text-ops-gray">
        {(() => {
          const d = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim();
          return d && d.length > 0 ? `Opsly · ${d}` : "Opsly";
        })()}
      </footer>
    </div>
  );
}
