'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { parseServiceUrls } from '@/lib/service-urls';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlanBadge } from '@/components/tenants/PlanBadge';
import { TenantStatusBadge } from '@/components/tenants/TenantStatusBadge';

export function TenantTable({ tenants, search }: { tenants: Tenant[]; search: string }) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return tenants;
    }
    return tenants.filter(
      (t) => t.slug.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [tenants, q]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>slug</TableHead>
          <TableHead>plan</TableHead>
          <TableHead>status</TableHead>
          <TableHead>created_at</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((t) => {
          const open = expandedSlug === t.slug;
          const urls = parseServiceUrls(t.services);
          return (
            <Fragment key={t.id}>
              <TableRow
                className="cursor-pointer hover:bg-ops-border/30"
                onClick={() => setExpandedSlug(open ? null : t.slug)}
              >
                <TableCell className="align-middle">
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-ops-gray" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-ops-gray" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-ops-green">
                  <Link
                    href={`/tenants/${t.slug}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.slug}
                  </Link>
                </TableCell>
                <TableCell>
                  <PlanBadge plan={t.plan} />
                </TableCell>
                <TableCell>
                  <TenantStatusBadge status={t.status} />
                </TableCell>
                <TableCell className="font-mono text-xs text-ops-gray">
                  {new Date(t.created_at).toISOString().slice(0, 19).replace('T', ' ')}
                </TableCell>
              </TableRow>
              {open ? (
                <TableRow className="border-ops-border bg-ops-bg hover:bg-ops-bg">
                  <TableCell colSpan={5} className="p-4">
                    <div className="flex flex-col gap-3 font-sans text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                      <div>
                        <div className="text-xs text-ops-gray">owner_email</div>
                        <div className="font-mono text-neutral-200">{t.owner_email}</div>
                      </div>
                      <div>
                        <div className="text-xs text-ops-gray">creado</div>
                        <div className="font-mono text-xs text-neutral-300">
                          {new Date(t.created_at).toLocaleString('es')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {urls.n8n ? (
                          <Button variant="primary" size="sm" asChild>
                            <a
                              href={urls.n8n}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Abrir n8n
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : null}
                        {urls.uptime ? (
                          <Button variant="primary" size="sm" asChild>
                            <a
                              href={urls.uptime}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Abrir Uptime Kuma
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tenants/${t.slug}`} onClick={(e) => e.stopPropagation()}>
                            Ver detalle
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
