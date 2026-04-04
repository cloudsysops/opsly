"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Separator } from "@/components/ui/separator";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  tenants: "Tenants",
  settings: "Settings",
  login: "Login",
};

export function Topbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  const crumbs = segments.map((seg, i) => {
    const path = `/${segments.slice(0, i + 1).join("/")}`;
    const label = labels[seg] ?? seg;
    return { path, label };
  });

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-ops-border bg-ops-bg/95 px-6 backdrop-blur">
      <nav className="flex flex-1 items-center gap-2 font-sans text-xs text-ops-gray">
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-2">
            {i > 0 ? <span className="text-ops-border">/</span> : null}
            <span
              className={
                i === crumbs.length - 1 ? "text-neutral-200" : "text-ops-gray"
              }
            >
              {c.label}
            </span>
          </span>
        ))}
      </nav>
      <Separator orientation="vertical" className="h-6" />
      <div className="max-w-[200px] truncate font-mono text-xs text-ops-green">
        {email || "—"}
      </div>
    </header>
  );
}
