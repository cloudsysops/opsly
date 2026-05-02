'use client';

import { useCallback, useMemo, useState } from 'react';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

const SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'visit', label: 'Visita técnica' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'consultation', label: 'Consultoría' },
  { value: 'other', label: 'Otro' },
];

export default function BookPage(): React.ReactElement {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('visit');
  const [preferredAt, setPreferredAt] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      email.trim().length > 0 &&
      preferredAt.trim().length > 0 &&
      status !== 'submitting'
    );
  }, [email, fullName, preferredAt, status]);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMessage(null);
      setStatus('submitting');
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone: phone.trim().length > 0 ? phone : undefined,
            service_type: serviceType,
            preferred_at: preferredAt,
            notes,
          }),
        });
        const body: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const errText =
            body !== null &&
            typeof body === 'object' &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'string'
              ? (body as { error: string }).error
              : 'No se pudo enviar la solicitud.';
          setMessage(errText);
          setStatus('error');
          return;
        }
        setMessage('Solicitud enviada correctamente. Te contactaremos pronto.');
        setStatus('success');
        setFullName('');
        setEmail('');
        setPhone('');
        setServiceType('visit');
        setPreferredAt('');
        setNotes('');
      } catch {
        setMessage('Error de red. Comprueba tu conexión e inténtalo de nuevo.');
        setStatus('error');
      }
    },
    [email, fullName, notes, phone, preferredAt, serviceType]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-12">
      <header className="mb-8">
        <p className="text-sm text-ops-muted">Servicios locales</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Solicitar reserva</h1>
        <p className="mt-2 text-sm text-ops-muted">
          Completa el formulario. Los datos se envían de forma segura al servicio de recepción de
          esta aplicación.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-ops-border bg-ops-surface p-6 shadow-lg"
        noValidate
      >
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-ops-muted">
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={fullName}
            onChange={(ev) => setFullName(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-ops-border bg-ops-bg px-3 py-2 text-sm outline-none ring-ops-accent focus:ring-2"
            aria-invalid={status === 'error' && fullName.trim().length < 2}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ops-muted">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-ops-border bg-ops-bg px-3 py-2 text-sm outline-none ring-ops-accent focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-ops-muted">
            Teléfono <span className="text-ops-muted">(opcional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-ops-border bg-ops-bg px-3 py-2 text-sm outline-none ring-ops-accent focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="service_type" className="block text-sm font-medium text-ops-muted">
            Tipo de servicio
          </label>
          <select
            id="service_type"
            name="service_type"
            value={serviceType}
            onChange={(ev) => setServiceType(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-ops-border bg-ops-bg px-3 py-2 text-sm outline-none ring-ops-accent focus:ring-2"
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="preferred_at" className="block text-sm font-medium text-ops-muted">
            Fecha y hora preferida
          </label>
          <input
            id="preferred_at"
            name="preferred_at"
            type="datetime-local"
            required
            value={preferredAt}
            onChange={(ev) => setPreferredAt(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-ops-border bg-ops-bg px-3 py-2 text-sm outline-none ring-ops-accent focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-ops-muted">
            Notas <span className="text-ops-muted">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
            className="mt-1 w-full resize-y rounded-lg border border-ops-border bg-ops-bg px-3 py-2 text-sm outline-none ring-ops-accent focus:ring-2"
          />
        </div>

        {message !== null ? (
          <p
            role="status"
            className={
              status === 'success'
                ? 'rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-100'
                : 'rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-100'
            }
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-ops-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-ops-accentHover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'submitting' ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </main>
  );
}
