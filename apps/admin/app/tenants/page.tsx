'use client';

import { useMemo, useState } from 'react';
import { useTenants } from '@/hooks/useTenants';
import type { PlanKey, TenantStatus } from '@/lib/types';
import { TenantTable } from '@/components/tenants/TenantTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const PLANS: (PlanKey | 'all')[] = ['all', 'startup', 'business', 'enterprise', 'demo'];
const STATUSES: (TenantStatus | 'all')[] = [
  'all',
  'active',
  'suspended',
  'provisioning',
  'failed',
  'deleted',
];

export default function TenantsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<PlanKey | 'all'>('all');
  const [status, setStatus] = useState<TenantStatus | 'all'>('all');

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      plan: plan === 'all' ? undefined : plan,
      status: status === 'all' ? undefined : status,
    }),
    [page, plan, status]
  );

  const { data, error, isLoading } = useTenants(params);

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg text-ops-green">tenants</h1>

      {error ? (
        <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
          {error.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1 space-y-1">
          <label className="font-sans text-xs text-ops-gray">buscar</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="slug / nombre"
          />
        </div>
        <div className="w-40 space-y-1">
          <label className="font-sans text-xs text-ops-gray">plan</label>
          <Select
            value={plan}
            onValueChange={(v) => {
              setPlan(v as PlanKey | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44 space-y-1">
          <label className="font-sans text-xs text-ops-gray">status</label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as TenantStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <TenantTable tenants={data.data} search={search} />
      )}

      {data ? (
        <div className="flex items-center justify-between font-mono text-xs text-ops-gray">
          <span>
            page {data.page} / {Math.max(1, Math.ceil(data.total / data.limit))} — {data.total}{' '}
            total
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
