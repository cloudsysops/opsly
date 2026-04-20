'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api';

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

  function updateLineItem(
    index: number,
    field: keyof LineItemInput,
    value: string | number,
  ) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unit_price_cents,
    0,
  );
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
      (li) => li.description.trim().length > 0 && li.unit_price_cents > 0,
    );

    if (validLineItems.length === 0) {
      setError('Agrega al menos un item con descripción y precio.');
      setLoading(false);
      return;
    }

    try {
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
    'w-full rounded border border-ops-border bg-ops-bg px-3 py-2 text-sm text-neutral-100 placeholder:text-ops-gray focus:border-ops-green focus:outline-none';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error ? (
        <div className="rounded border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Customer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ops-gray">
            Email del cliente *
          </label>
          <input
            type="email"
            required
            className={inputClass}
            placeholder="cliente@empresa.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ops-gray">
            Nombre del cliente
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="TechCorp S.A.S"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
      </div>

      {/* Dates & currency */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-ops-gray">
            Fecha vencimiento
          </label>
          <input
            type="date"
            className={inputClass}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ops-gray">Moneda</label>
          <select
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ops-gray">
            IVA (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className={inputClass}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-ops-gray">
            Items
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={addLineItem}>
            + Agregar item
          </Button>
        </div>
        <div className="space-y-3">
          {lineItems.map((li, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded border border-ops-border/50 p-3 sm:grid-cols-[1fr_80px_120px_100px_40px]"
            >
              <input
                type="text"
                required
                className={inputClass}
                placeholder="Descripción"
                value={li.description}
                onChange={(e) =>
                  updateLineItem(idx, 'description', e.target.value)
                }
              />
              <input
                type="number"
                min={1}
                className={inputClass}
                placeholder="Cant"
                value={li.quantity}
                onChange={(e) =>
                  updateLineItem(idx, 'quantity', Number(e.target.value))
                }
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="Precio (centavos)"
                value={li.unit_price_cents || ''}
                onChange={(e) =>
                  updateLineItem(
                    idx,
                    'unit_price_cents',
                    Number(e.target.value),
                  )
                }
              />
              <input
                type="text"
                className={inputClass}
                placeholder="Categoría"
                value={li.category}
                onChange={(e) =>
                  updateLineItem(idx, 'category', e.target.value)
                }
              />
              {lineItems.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLineItem(idx)}
                  className="text-red-400 hover:text-red-300"
                  title="Eliminar"
                >
                  ×
                </button>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-xs text-ops-gray">Notas</label>
        <textarea
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
          <span className="font-mono text-neutral-200">
            {formatDisplay(subtotal)}
          </span>
        </div>
        {tax > 0 ? (
          <div className="flex w-48 justify-between">
            <span className="text-ops-gray">IVA ({taxRate}%)</span>
            <span className="font-mono text-neutral-200">
              {formatDisplay(tax)}
            </span>
          </div>
        ) : null}
        <div className="flex w-48 justify-between border-t border-ops-border pt-1">
          <span className="font-semibold text-neutral-100">Total</span>
          <span className="font-mono font-semibold text-ops-green">
            {formatDisplay(total)}
          </span>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Factura'}
        </Button>
      </div>
    </form>
  );
}
