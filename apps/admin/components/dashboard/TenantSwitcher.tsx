'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useTenants } from '@/hooks/useTenants';
import { TenantSurfaceLinks } from '@/components/tenants/TenantSurfaceLinks';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LAST_SELECTED_KEY = 'opsly-admin:selected-tenant';

function tenantLabel(slug: string, name: string, status: string): string {
  return `${name} · ${slug} · ${status}`;
}

export function TenantSwitcher(): React.ReactElement {
  const { data, error, isLoading } = useTenants({ page: 1, limit: 100 });
  const tenants = data?.data ?? [];
  const [selectedSlug, setSelectedSlug] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(LAST_SELECTED_KEY) ?? '';
    if (stored && tenants.some((tenant) => tenant.slug === stored)) {
      setSelectedSlug(stored);
      return;
    }
    if (tenants.length > 0) {
      const defaultSlug = process.env.NEXT_PUBLIC_OPSLY_DEFAULT_TENANT_SLUG?.trim();
      const matched = defaultSlug
        ? tenants.find((tenant) => tenant.slug === defaultSlug)
        : undefined;
      const preferred = matched ?? tenants[0];
      setSelectedSlug(preferred.slug);
      window.localStorage.setItem(LAST_SELECTED_KEY, preferred.slug);
    }
  }, [tenants]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.slug === selectedSlug) ?? tenants[0] ?? null,
    [selectedSlug, tenants]
  );

  return (
    <Card className="border-ops-border/80 bg-ops-bg/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-xs uppercase tracking-wide text-ops-gray">
          Switch tenant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 text-sm text-ops-red">
            {error.message}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-1">
            <label className="font-sans text-xs text-ops-gray" htmlFor="tenant-switcher">
              tenant
            </label>
            <Select
              value={selectedSlug}
              onValueChange={(value) => {
                setSelectedSlug(value);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(LAST_SELECTED_KEY, value);
                }
              }}
              disabled={isLoading || tenants.length === 0}
            >
              <SelectTrigger id="tenant-switcher">
                <SelectValue placeholder="Selecciona un tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.slug}>
                    {tenantLabel(tenant.slug, tenant.name, tenant.status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 rounded border border-ops-border bg-ops-surface px-3 py-2">
            <p className="font-sans text-[11px] uppercase tracking-wide text-ops-gray">
              acceso rápido
            </p>
            <p className="font-mono text-xs text-neutral-300">
              {selectedTenant ? selectedTenant.owner_email : '—'}
            </p>
            <p className="font-mono text-xs text-neutral-400">
              {selectedTenant ? selectedTenant.plan : '—'} · {selectedTenant ? selectedTenant.status : '—'}
            </p>
          </div>
        </div>

        {selectedTenant ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" asChild>
                <Link href={`/tenants/${selectedTenant.slug}`}>
                  Ficha en Opsly Admin
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`/tenants/${selectedTenant.slug}`}
                  className="inline-flex items-center gap-1"
                >
                  Abrir en esta pestaña
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>

            <TenantSurfaceLinks
              slug={selectedTenant.slug}
              services={selectedTenant.services}
              metadata={selectedTenant.metadata}
            />
          </div>
        ) : (
          <p className="text-sm text-ops-gray">
            {isLoading ? 'Cargando tenants…' : 'No hay tenants disponibles.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
