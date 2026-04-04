"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { Tenant } from "@/lib/types";
import { mrrForPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanBadge } from "@/components/tenants/PlanBadge";
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge";

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);
}

export function TenantTable({
  tenants,
  search,
}: {
  tenants: Tenant[];
  search: string;
}) {
  const router = useRouter();
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return tenants;
    }
    return tenants.filter(
      (t) =>
        t.slug.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q),
    );
  }, [tenants, q]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>slug</TableHead>
          <TableHead>nombre</TableHead>
          <TableHead>plan</TableHead>
          <TableHead>status</TableHead>
          <TableHead>MRR</TableHead>
          <TableHead>created_at</TableHead>
          <TableHead className="text-right">acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((t) => (
          <TableRow
            key={t.id}
            className="cursor-pointer"
            onClick={() => router.push(`/tenants/${t.id}`)}
          >
            <TableCell className="font-mono text-xs text-ops-green">
              {t.slug}
            </TableCell>
            <TableCell className="font-sans">{t.name}</TableCell>
            <TableCell>
              <PlanBadge plan={t.plan} />
            </TableCell>
            <TableCell>
              <TenantStatusBadge status={t.status} />
            </TableCell>
            <TableCell className="font-mono text-xs">
              {formatUsd(mrrForPlan(t.plan, t.is_demo))}
            </TableCell>
            <TableCell className="font-mono text-xs text-ops-gray">
              {new Date(t.created_at).toISOString().slice(0, 19).replace("T", " ")}
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/tenants/${t.id}`}>Ver</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
