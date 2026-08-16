'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from '@/lib/api';
import { PORTAL_DEMO_COOKIE } from '@/lib/demo-tenant';

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price_cents: number;
  category: string;
}

function emptyLineItem(): LineItemInput {
  return { description: '', quantity: 1, unit_price_cents: 0, category: '' };
}

export function CreateInvoiceForm({ tenant }: { tenant: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([emptyLineItem()]);

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItemInput, value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price_cents, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;

  function formatDisplay(cents: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validLineItems = lineItems.filter(
      (li) => li.description.trim().length > 0 && li.unit_price_cents > 0
    );

    if (validLineItems.length === 0) {
      setError('Agrega al menos un item con descripción y precio.');
      setLoading(false);
      return;
    }

    try {
      const hasDemoSession =
        document.cookie.includes(`${PORTAL_DEMO_COOKIE}=1`) &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (hasDemoSession) {
        router.push(`/dashboard/${tenant}/invoices/inv_demo_001`);
        return;
      }
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/billing/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: customerEmail,
          customer_name: customerName || undefined,
          line_items: validLineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unit_price_cents: li.unit_price_cents,
            category: li.category || undefined,
          })),
          due_date: dueDate || undefined,
          currency,
          tax_rate_percent: taxRate,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Error al crear factura');
        return;
      }

      const invoice = (await res.json()) as { id: string };
      router.push(`/dashboard/${tenant}/invoices/${invoice.id}`);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded border border-ops-border bg-ops-bg px-3 py-2 text-sm text-neutral-100 placeholder:text-ops-gray transition-all focus:border-ops-green focus-visible:border-ops-green focus-visible:ring-2 focus-visible:ring-ops-green/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </div>
      ) : null}

      {/* Customer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerEmail" className="mb-1 block text-xs text-ops-gray">
            Email del cliente *
          </label>
          <Input
            id="customerEmail"
            type="email"
            required
            placeholder="cliente@empresa.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="customerName" className="mb-1 block text-xs text-ops-gray">
            Nombre del cliente
          </label>
          <Input
            id="customerName"
            type="text"
            placeholder="TechCorp S.A.S"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
      </div>

      {/* Dates & currency */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="dueDate" className="mb-1 block text-xs text-ops-gray">
            Fecha vencimiento
          </label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="currency" className="mb-1 block text-xs text-ops-gray">
            Moneda
          </label>
          <select
            id="currency"
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label htmlFor="taxRate" className="mb-1 block text-xs text-ops-gray">
            IVA (%)
          </label>
          <Input
            id="taxRate"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-ops-gray">Items</label>
          <Button type="button" variant="ghost" size="sm" onClick={addLineItem}>
            <Plus className="mr-1 h-3 w-3" /> Agregar item
          </Button>
        </div>
        <div className="space-y-3">
          {lineItems.map((li, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded border border-ops-border/50 p-3 sm:grid-cols-[1fr_80px_120px_100px_40px]"
            >
              <Input
                type="text"
                required
                placeholder="Descripción"
                aria-label="Descripción del item"
                value={li.description}
                onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
              />
              <Input
                type="number"
                min={1}
                placeholder="Cant"
                aria-label="Cantidad"
                value={li.quantity}
                onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
              />
              <Input
                type="number"
                min={0}
                placeholder="Precio (centavos)"
                aria-label="Precio unitario (centavos)"
                value={li.unit_price_cents || ''}
                onChange={(e) => updateLineItem(idx, 'unit_price_cents', Number(e.target.value))}
              />
              <Input
                type="text"
                placeholder="Categoría"
                aria-label="Categoría"
                value={li.category}
                onChange={(e) => updateLineItem(idx, 'category', e.target.value)}
              />
              {lineItems.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLineItem(idx)}
                  className="text-red-400 hover:bg-red-950/30 hover:text-red-300"
                  aria-label="Eliminar item"
                  title="Eliminar"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="mb-1 block text-xs text-ops-gray">
          Notas
        </label>
        <textarea
          id="notes"
          className={`${inputClass} h-20 resize-none`}
          placeholder="Notas adicionales..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Totals preview */}
      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex w-48 justify-between">
          <span className="text-ops-gray">Subtotal</span>
          <span className="font-mono text-neutral-200">{formatDisplay(subtotal)}</span>
        </div>
        {tax > 0 ? (
          <div className="flex w-48 justify-between">
            <span className="text-ops-gray">IVA ({taxRate}%)</span>
            <span className="font-mono text-neutral-200">{formatDisplay(tax)}</span>
          </div>
        ) : null}
        <div className="flex w-48 justify-between border-t border-ops-border pt-1">
          <span className="font-semibold text-neutral-100">Total</span>
          <span className="font-mono font-semibold text-ops-green">{formatDisplay(total)}</span>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Creando...
            </>
          ) : (
            'Crear Factura'
          )}
        </Button>
      </div>
    </form>
  );
}
