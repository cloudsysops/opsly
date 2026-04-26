'use client';

import Link from 'next/link';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  total_cents: number;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-neutral-400 bg-neutral-800',
  sent: 'text-blue-400 bg-blue-900/30',
  paid: 'text-green-400 bg-green-900/30',
  overdue: 'text-red-400 bg-red-900/30',
  cancelled: 'text-neutral-500 bg-neutral-800/50',
  void: 'text-neutral-500 bg-neutral-800/50',
};

function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'text-neutral-400 bg-neutral-800';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}

export function InvoiceTable({ invoices, tenant }: { invoices: Invoice[]; tenant: string }) {
  if (invoices.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-ops-gray">
        No hay facturas todavía. Crea tu primera factura.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ops-border text-xs uppercase tracking-wider text-ops-gray">
            <th className="px-4 py-3 font-medium">N°</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-ops-border/50 transition-colors hover:bg-ops-surface/50"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/${tenant}/invoices/${inv.id}`}
                  className="font-mono text-ops-green hover:underline"
                >
                  {inv.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="text-neutral-200">{inv.customer_name ?? inv.customer_email}</div>
                {inv.customer_name ? (
                  <div className="text-xs text-ops-gray">{inv.customer_email}</div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 text-right font-mono text-neutral-100">
                {formatMoney(inv.total_cents, inv.currency)}
              </td>
              <td className="px-4 py-3 text-ops-gray">{inv.due_date ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
