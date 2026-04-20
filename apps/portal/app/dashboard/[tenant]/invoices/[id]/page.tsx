import type { ReactElement } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getApiBaseUrl } from '@/lib/api';
import { PortalShell } from '@/components/layout/portal-shell';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusActions } from './invoice-actions';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  category: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  subtotal_cents: number;
  tax_rate_percent: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  line_items: LineItem[];
  created_at: string;
}

function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

async function fetchInvoice(
  token: string,
  invoiceId: string,
): Promise<Invoice | null> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/billing/invoices/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as Invoice;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}): Promise<ReactElement> {
  const { tenant, id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token ?? '';
  const invoice = await fetchInvoice(token, id);

  if (!invoice) {
    notFound();
  }

  return (
    <PortalShell title={invoice.invoice_number} showModeLink>
      <DashboardShell>
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/${tenant}/invoices`}>
                ← Facturas
              </Link>
            </Button>
          </div>
          <InvoiceStatusActions
            invoiceId={invoice.id}
            currentStatus={invoice.status}
            tenant={tenant}
          />
        </div>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono text-lg">
                {invoice.invoice_number}
              </CardTitle>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  invoice.status === 'paid'
                    ? 'bg-green-900/30 text-green-400'
                    : invoice.status === 'overdue'
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
              <div>
                <div className="text-ops-gray">Cliente</div>
                <div className="mt-1 text-neutral-200">
                  {invoice.customer_name ?? invoice.customer_email}
                </div>
                {invoice.customer_name ? (
                  <div className="text-xs text-ops-gray">
                    {invoice.customer_email}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-ops-gray">Fecha emisión</div>
                <div className="mt-1 text-neutral-200">
                  {invoice.issue_date ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-ops-gray">Vencimiento</div>
                <div className="mt-1 text-neutral-200">
                  {invoice.due_date ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-ops-gray">Moneda</div>
                <div className="mt-1 text-neutral-200">{invoice.currency}</div>
              </div>
            </div>

            {/* Line items table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ops-border text-xs uppercase tracking-wider text-ops-gray">
                    <th className="pb-2 pr-4 font-medium">Descripción</th>
                    <th className="pb-2 pr-4 font-medium text-right">Cant</th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Precio Unit
                    </th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((li) => (
                    <tr
                      key={li.id}
                      className="border-b border-ops-border/30"
                    >
                      <td className="py-2 pr-4 text-neutral-200">
                        {li.description}
                        {li.category ? (
                          <span className="ml-2 text-xs text-ops-gray">
                            [{li.category}]
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-neutral-300">
                        {li.quantity}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-neutral-300">
                        {formatMoney(li.unit_price_cents, invoice.currency)}
                      </td>
                      <td className="py-2 text-right font-mono text-neutral-100">
                        {formatMoney(li.total_cents, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div className="flex w-48 justify-between">
                <span className="text-ops-gray">Subtotal</span>
                <span className="font-mono text-neutral-200">
                  {formatMoney(invoice.subtotal_cents, invoice.currency)}
                </span>
              </div>
              {invoice.tax_cents > 0 ? (
                <div className="flex w-48 justify-between">
                  <span className="text-ops-gray">
                    IVA ({invoice.tax_rate_percent}%)
                  </span>
                  <span className="font-mono text-neutral-200">
                    {formatMoney(invoice.tax_cents, invoice.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex w-48 justify-between border-t border-ops-border pt-1">
                <span className="font-semibold text-neutral-100">Total</span>
                <span className="font-mono font-semibold text-ops-green">
                  {formatMoney(invoice.total_cents, invoice.currency)}
                </span>
              </div>
            </div>

            {invoice.notes ? (
              <div className="mt-6 rounded-lg border border-ops-border/50 bg-ops-surface/50 p-3 text-sm text-ops-gray">
                <div className="mb-1 text-xs uppercase tracking-wider">
                  Notas
                </div>
                {invoice.notes}
              </div>
            ) : null}

            {invoice.paid_date ? (
              <div className="mt-4 text-xs text-green-400">
                Pagada el {invoice.paid_date}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </DashboardShell>
    </PortalShell>
  );
}
