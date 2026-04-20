import type { ReactElement } from 'react';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { getApiBaseUrl } from '@/lib/api';
import { PortalShell } from '@/components/layout/portal-shell';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceTable } from './invoice-table';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  total_cents: number;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  created_at: string;
}

interface InvoiceListResponse {
  data: InvoiceRow[];
  total: number;
  page: number;
  limit: number;
}

async function fetchInvoices(
  token: string,
  tenantId: string,
): Promise<InvoiceListResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/billing/invoices?tenant_id=${tenantId}&limit=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return { data: [], total: 0, page: 1, limit: 50 };
  }

  return (await res.json()) as InvoiceListResponse;
}

async function resolveTenantId(
  token: string,
  slug: string,
): Promise<string | null> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/tenants?status=active&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: { id: string; slug: string }[] };
  const tenant = body.data.find((t) => t.slug === slug);
  return tenant?.id ?? null;
}

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token ?? '';

  // We need admin token for billing API — for now use session token
  // The billing API accepts portal session for tenant-scoped reads
  const tenantId = await resolveTenantId(token, tenant);

  const invoices = tenantId
    ? await fetchInvoices(token, tenantId)
    : { data: [], total: 0, page: 1, limit: 50 };

  return (
    <PortalShell title={`Facturación — ${tenant}`} showModeLink>
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h1 className="font-sans text-xl font-semibold text-neutral-100">
            Facturas
          </h1>
          <Button variant="primary" size="sm" asChild>
            <Link href={`/dashboard/${tenant}/invoices/new`}>
              + Nueva Factura
            </Link>
          </Button>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {invoices.total} factura{invoices.total !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <InvoiceTable invoices={invoices.data} tenant={tenant} />
          </CardContent>
        </Card>
      </DashboardShell>
    </PortalShell>
  );
}
