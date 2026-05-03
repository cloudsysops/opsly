'use client';

import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { getLocalServicesTenantSlug } from '@/lib/tenant-slug';

export function BookingForm(): ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    const slug = getLocalServicesTenantSlug();
    const url = `${getApiBaseUrl()}/api/local-services/public/tenants/${encodeURIComponent(slug)}/bookings`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          customer_phone: phone || undefined,
          notes: notes || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; booking_id?: string };
      if (!res.ok) {
        setStatus('err');
        setMessage(data.error ?? `Error ${String(res.status)}`);
        return;
      }
      setStatus('ok');
      setMessage(`Reserva recibida. ID: ${data.booking_id ?? ''}`);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch {
      setStatus('err');
      setMessage('No se pudo conectar con la API.');
    }
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="mx-auto max-w-md space-y-4 rounded-lg border border-ops-border bg-neutral-950/80 p-6">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-neutral-400">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          className="w-full rounded border border-ops-border bg-ops-bg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-neutral-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="w-full rounded border border-ops-border bg-ops-bg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm text-neutral-400">
          Teléfono (opcional)
        </label>
        <input
          id="phone"
          name="phone"
          value={phone}
          onChange={(ev) => setPhone(ev.target.value)}
          className="w-full rounded border border-ops-border bg-ops-bg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-neutral-400">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          className="w-full rounded border border-ops-border bg-ops-bg px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded bg-ops-green px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {status === 'loading' ? 'Enviando…' : 'Solicitar reserva'}
      </button>
      {message.length > 0 ? (
        <p className={status === 'ok' ? 'text-sm text-ops-green' : 'text-sm text-red-400'}>{message}</p>
      ) : null}
    </form>
  );
}
