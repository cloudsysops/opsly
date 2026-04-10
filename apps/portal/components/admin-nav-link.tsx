"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { isSuperAdminUser } from "@/lib/super-admin";

export function AdminNavLink(): ReactElement | null {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setShow(false);
      return;
    }
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        setShow(isSuperAdminUser(user));
      });
  }, [pathname]);

  if (!show) {
    return null;
  }

  return (
    <Link
      href="/admin/dashboard"
      className="font-mono text-sm text-ops-green hover:underline"
    >
      Super Admin
    </Link>
  );
}
